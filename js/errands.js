'use strict';
// One retrieval at a time. The saved `pursuit` slot also supports NPC requests.
OR.errands=(()=>{
  const S=OR.state,W=OR.world,C=OR.content,definitions={};
  function register(id,definition){
    const d={quantity:1,realm:'same',completion:'gather',returnToGiver:false,steal:false,guide:'gold',rewards:[],...definition};
    if(!id||definitions[id]||typeof d.title!=='string'||!d.title.trim()||!['same','outer'].includes(d.realm)||!['red','gold'].includes(d.guide)||typeof d.returnToGiver!=='boolean'||typeof d.steal!=='boolean'||d.after&&C.entities[d.after.subtype]?.type!==d.after.elementType||!C.items[d.item]||!Number.isSafeInteger(d.quantity)||d.quantity<1||!C.entities[d.target?.subtype]||C.entities[d.target.subtype].type!==d.target.elementType||!['gather','slay'].includes(d.completion)||d.completion==='gather'&&d.target.elementType!=='Thing'||d.completion==='slay'&&!['Danger','Enemy','Dragon'].includes(d.target.elementType)||d.rewards.some(r=>!C.items[r.type]||!Number.isSafeInteger(r.qty)||r.qty<1))throw Error('Invalid retrieval definition: '+id);
    definitions[id]=d;return d;
  }
  const active=()=>S.data?.pursuit||null;
  const definition=()=>active()?definitions[active().kind||'bandit']:null;
  const blocked=()=>{const s=S.data,q=OR.quests.data();return !!(active()||q.active||q.offer||s.battle||s.outcome||s.foundLoot||OR.village.visionActive());};
  function destination(x,y,d){
    const candidates=[];
    for(let dx=-9;dx<=9;dx++)for(let dy=-9;dy<=9;dy++){
      const distance=Math.abs(dx)+Math.abs(dy),tx=x+dx,ty=y+dy;
      if(distance>=5&&distance<=9&&!W.border(tx,ty)&&(d.realm==='outer'?!W.local(tx,ty):W.local(tx,ty)===W.local(x,y))&&!W.at(tx,ty)&&!OR.village.template(tx,ty))candidates.push({x:tx,y:ty});
    }
    return candidates.length?C.pick(candidates):null;
  }
  function start(kind,giver=W.current()){
    const d=definitions[kind],s=S.data;if(!d||blocked()||d.steal&&S.qty(d.item)<d.quantity)return false;
    const target=destination(giver.x,giver.y,d);if(!target)return false;
    if(d.steal)S.add(d.item,-d.quantity);
    s.pursuit={kind,phase:'retrieve',...target,originX:giver.x,originY:giver.y};
    s.blocks.push({...d.target,...target,resolved:false});
    S.log(d.startText||d.title+' accepted. Follow the compass light.');S.save();return true;
  }
  function roll(x,y){
    if(W.local(x,y)||W.border(x,y)||blocked()||S.qty('Gem')<1||Math.random()>=.02)return null;
    if(!start('bandit',{x,y}))return null;
    return {x,y,elementType:'Bandit',subtype:'bandit-fleeing',resolved:false};
  }
  const atTarget=b=>!!active()&&(active().phase||'retrieve')==='retrieve'&&b?.subtype===definition().target.subtype&&b.x===active().x&&b.y===active().y;
  function recover(b,event='slay'){
    const d=definition();if(!d||!atTarget(b)||d.completion!==event)return null;
    active().phase='collect';S.log(C.items[d.item].name+' is within reach. Collect it before leaving.');
    return {rewards:[],after:d.after||null};
  }
  const atCollection=b=>!!active()&&active().phase==='collect'&&b?.x===active().x&&b.y===active().y;
  const pendingRewards=()=>active()?.phase==='collect'?[{type:definition().item,qty:definition().quantity},...(definition().returnToGiver?[]:definition().rewards)]:[];
  function collect(){
    const s=S.data,d=definition();if(!d||s.battle||s.foundLoot||s.outcome&&!s.outcome.retrieval||!atCollection(W.current()))return false;
    const rewards=pendingRewards();for(const r of rewards)S.add(r.type,r.qty);
    if(d.returnToGiver){const p=active();p.phase='return';p.x=p.originX;p.y=p.originY;S.log(C.items[d.item].name+' collected. Return it to the person who asked.');}
    else {s.pursuit=null;S.log(d.doneText||d.title+' complete.');}
    if(s.outcome?.retrieval){s.outcome.retrieval=false;s.outcome.rewards=rewards;}S.save();return {rewards};
  }
  function retrieve(){
    const s=S.data;if(s.battle||s.outcome||s.foundLoot)return false;
    const b=W.current(),result=recover(b,'gather');if(!result)return false;
    W.clear(true);if(result.after)Object.assign(b,result.after);S.save();return result;
  }
  const atGiver=b=>!!active()&&active().phase==='return'&&b?.x===active().originX&&b.y===active().originY;
  function deliver(){
    const s=S.data,d=definition();if(!d||s.battle||s.outcome||s.foundLoot||!atGiver(W.current())||S.qty(d.item)<d.quantity)return false;
    S.add(d.item,-d.quantity);for(const r of d.rewards)S.add(r.type,r.qty);s.pursuit=null;S.log(d.doneText||'You return '+C.items[d.item].name+'. A small part of their world is whole again.');S.save();return {rewards:d.rewards};
  }
  function hints(){const p=active(),s=S.data;if(!p)return [];return [...(p.x<s.x?['W']:p.x>s.x?['E']:[]),...(p.y<s.y?['N']:p.y>s.y?['S']:[])];}
  function prompt(b){const d=definition();if(!d)return null;if(atCollection(b))return {action:'errand:collect',label:'COLLECT '+C.items[d.item].name.toUpperCase(),disabled:false};if(atGiver(b))return {action:'errand:deliver',label:'RETURN '+C.items[d.item].name.toUpperCase(),disabled:S.qty(d.item)<d.quantity};if(atTarget(b)&&d.completion==='gather')return {action:'errand:retrieve',label:'RETRIEVE '+C.items[d.item].name.toUpperCase(),disabled:false};return null;}
  const guideClass=()=>definition()?.guide==='red'?'pursuit-hint':'trail-hint';
  const status=()=>active()?definition().title+' · '+(active().phase==='return'?'RETURN TO GIVER':active().phase==='collect'?'COLLECT ITEM':'DESTINATION')+' · '+W.coords(active().x,active().y):'';
  register('bandit',{title:'STOLEN GEM',item:'Gem',steal:true,realm:'outer',completion:'slay',guide:'red',target:{elementType:'Enemy',subtype:'bandit-hideout'},after:{elementType:'Thing',subtype:'empty-hideout'},startText:'A bandit steals one gem. Follow the red compass light to the hideout.',doneText:'The stolen gem is back in your pack. The red trail fades.'});
  return {register,definitions,start,active,definition,roll,atTarget,recover,retrieve,collect,pendingRewards,deliver,atGiver,hints,prompt,guideClass,status};
})();

