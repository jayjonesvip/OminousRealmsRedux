'use strict';
// A single deceptive request; the ambush uses ordinary combat and reward collection.
OR.traveler=(()=>{
  const S=OR.state,W=OR.world;
  const active=()=>S.data?.traveler||null;
  const here=()=>!!active()&&active().x===S.data.x&&active().y===S.data.y;
  const locked=()=>['ambush','declined'].includes(active()?.phase);
  const isBattle=b=>active()?.phase==='battle'&&b?.subtype==='traveler-ambush'&&b.x===active().x&&b.y===active().y;
  function valid(s){
    if(s.travelerDone!==undefined&&typeof s.travelerDone!=='boolean')return false;
    const p=s.traveler;if(p==null)return true;
    if(s.travelerDone||!['offer','trail','ambush','battle','declined'].includes(p.phase)||s.siren||s.pursuit||s.quests?.active||s.quests?.offer||s.finale&&s.finale.stage!=='done')return false;
    if(!['x','y','originX','originY'].every(k=>Number.isSafeInteger(p[k])))return false;
    const origin=s.blocks?.find(b=>b.x===p.originX&&b.y===p.originY);
    if(origin?.subtype!=='traveler-lure'||origin.elementType!=='Thing'||Math.max(Math.abs(p.originX),Math.abs(p.originY))<27-(s.borderLoss||0))return false;
    if(['ambush','battle','declined'].includes(p.phase)&&(s.x!==p.x||s.y!==p.y||s.outcome||s.foundLoot))return false;
    if(['ambush','declined'].includes(p.phase)&&s.battle)return false;
    if(['offer','declined'].includes(p.phase))return p.x===p.originX&&p.y===p.originY;
    const tile=s.blocks.find(b=>b.x===p.x&&b.y===p.y);
    if(p.x===p.originX&&p.y===p.originY||Math.max(Math.abs(p.x),Math.abs(p.y))<27-(s.borderLoss||0))return false;
    if(p.phase==='battle')return tile?.subtype==='traveler-ambush'&&tile.elementType==='Enemy'&&s.battle?.enemyId==='traveler-ambush'&&s.battle.enemy?.id==='traveler-ambush'&&s.battle.x===p.x&&s.battle.y===p.y;
    return tile?.subtype==='traveler-cart'&&tile.elementType==='Thing';
  }
  function roll(x,y){const s=S.data;
    if(s.travelerDone||active()||s.siren||s.pursuit||s.quests?.active||s.quests?.offer||OR.finale?.active()||s.quests?.completed?.includes('hollowflame')&&!s.finale||W.local(x,y)||W.border(x,y)||s.battle||s.outcome||s.foundLoot||OR.village.visionActive()||Math.random()>=.02)return null;
    s.traveler={phase:'offer',x,y,originX:x,originY:y};return {x,y,elementType:'Thing',subtype:'traveler-lure',resolved:false};
  }
  function idle(){return !S.data.battle&&!S.data.outcome&&!S.data.foundLoot;}
  function accept(){const p=active();if(!p||p.phase!=='offer'||!here()||!idle())return false;
    const choices=[];for(let dx=-9;dx<=9;dx++)for(let dy=-9;dy<=9;dy++){const d=Math.abs(dx)+Math.abs(dy),x=p.x+dx,y=p.y+dy;if(d>=5&&d<=9&&!W.local(x,y)&&!W.border(x,y)&&!W.at(x,y)&&!OR.village.template(x,y))choices.push({x,y});}
    if(!choices.length)return false;Object.assign(p,OR.content.pick(choices),{phase:'trail'});S.data.blocks.push({x:p.x,y:p.y,elementType:'Thing',subtype:'traveler-cart',resolved:false});S.log('Find the ruined cart. A pale light follows the track he pointed out.');S.save();return true;
  }
  function finish(){const p=active();if(!p)return;
    const origin=W.at(p.originX,p.originY);if(origin?.subtype==='traveler-lure')Object.assign(origin,{elementType:'Nature',subtype:'forest',resolved:true,cleared:false});
    if(p.x!==p.originX||p.y!==p.originY){const cart=W.at(p.x,p.y);if(cart)Object.assign(cart,{elementType:'Thing',subtype:'traveler-cart-empty',resolved:true,cleared:false});}
    S.data.traveler=null;S.data.travelerDone=true;
  }
  function escape(){const s=S.data,before=s.hp.current;s.hp.current=Math.max(1,before-3);finish();S.log('You break through the brush. A knife catches you: −'+Number((before-s.hp.current).toFixed(1))+' HP. The bandits abandon the cart.');if(s.hp.current<=1)W.returnHome('You escape the bandits, then collapse. You are carried home to Strongwood Cottage.');S.save();return true;}
  function act(action){const p=active();if(!p||!here()||!idle())return false;
    if(action==='decline'&&p.phase==='offer'){p.phase='declined';S.log('He rises without a wince. By the second step he has forgotten his limp.');S.save();return true;}
    if(action==='leave'&&p.phase==='declined'){finish();S.save();return true;}
    if(action==='investigate'&&p.phase==='trail'){p.phase='ambush';S.log('Two knives flash beside the cart. Behind you, the wounded man stands straight. “One gem. Or we take it from you.”');S.save();return true;}
    if(p.phase!=='ambush')return false;
    if(action==='pay'){if(!S.add('Gem',-1))return false;finish();S.log('One gem buys your passage. They take the medicine and leave the cart empty.');S.save();return true;}
    if(action==='escape')return escape();
    if(action==='fight'){const b=W.current();p.phase='battle';Object.assign(b,{elementType:'Enemy',subtype:'traveler-ambush',resolved:false});if(OR.combat.start())return true;p.phase='ambush';Object.assign(b,{elementType:'Thing',subtype:'traveler-cart'});return false;}
    return false;
  }
  function reward(){S.add('Potion');return [{type:'Potion',qty:1}];}
  function fleeBattle(){if(!isBattle(W.current())||!S.data.battle)return false;S.data.battle=null;S.data.state='Explore';S.changeHope(-2);return escape();}
  function hints(){const p=active(),s=S.data;if(p?.phase!=='trail')return [];return [...(p.x<s.x?['W']:p.x>s.x?['E']:[]),...(p.y<s.y?['N']:p.y>s.y?['S']:[])];}
  const prompt=b=>here()&&active()?.phase==='offer'&&b.subtype==='traveler-lure'?{label:'HEAR HIS REQUEST',action:'traveler:open'}:here()&&active()?.phase==='trail'&&b.subtype==='traveler-cart'?{label:'INVESTIGATE THE CART',action:'traveler:investigate'}:null;
  const status=()=>active()?((active().phase==='offer'?'A TRAVELER WAITS':'THE TRAVELER’S MEDICINE')+' · '+W.coords(active().x,active().y)):'';
  return {active,here,locked,isBattle,valid,roll,accept,act,finish,reward,fleeBattle,hints,prompt,status};
})();
