'use strict';
OR.world=(()=>{
  const C=OR.content,S=OR.state;
  const local=(x,y)=>Math.abs(x)<=25&&Math.abs(y)<=25;
  const border=(x,y)=>Math.abs(x)===26||Math.abs(y)===26;
  const realm=(x,y)=>local(x,y)?'Strongwood Village':'The Outer Realm';
  const at=(x,y)=>S.data.blocks.find(b=>b.x===x&&b.y===y);
  function spawn(type,x,y){const candidates=Object.values(C.entities).filter(e=>e.type===type);const e=C.pick(candidates);return {x,y,elementType:type,subtype:e.id,dragonHp:type==='Dragon'?C.random(250,1000):null,resolved:false};}
  function getOrCreateBlock(x,y,revisit=false){
    let b=at(x,y);
    if(b){if(revisit&&b.elementType==='Nature'){const type=Math.random()<0.5?'Danger':local(x,y)?'Danger':'Enemy';Object.assign(b,spawn(type,x,y));}return b;}
    let type;
    if(x===0&&y===0)type='Home';
    else if(Math.max(Math.abs(x),Math.abs(y))===1)type='NPC';
    else{
      const types=Object.keys(C.weights).filter(t=>t!=='Home'&&(!local(x,y)||!C.outerOnly.includes(t)));
      let roll=Math.random()*types.reduce((n,t)=>n+C.weights[t],0);
      type=types.find(t=>(roll-=C.weights[t])<0)||'Nature';
    }
    b=spawn(type,x,y);S.data.blocks.push(b);return b;
  }
  const current=()=>getOrCreateBlock(S.data.x,S.data.y);
  function clear(){const b=current();Object.assign(b,{elementType:'Nature',subtype:'clearing',dragonHp:null,resolved:true});}
  function returnHome(reason='Your strength gives out. You are carried home to Strongwood Cottage.'){
    const s=S.data;
    if(s.battle?.enemyId==='dragon'){
      const origin=at(s.battle.x,s.battle.y);
      if(origin?.elementType==='Dragon')origin.dragonHp=s.battle.enemy.hp;
    }
    s.x=0;s.y=0;s.battle=null;s.state='Explore';s.lastFind=null;s.healingSearchSteps=0;
    const home=getOrCreateBlock(0,0);Object.assign(home,{elementType:'Home',subtype:'home',resolved:true});
    s.homecoming=reason;if(s.outcome&&!s.outcome.win)s.outcome.returnedHome=true;
    S.log(reason);S.syncRest();S.save();return home;
  }
  function rescueIfNeeded(){
    const s=S.data;
    if(s?.outcome&&!s.outcome.win&&!s.outcome.returnedHome)return returnHome('After the battle, you are carried home to Strongwood Cottage.');
    if(s&&s.hp.current<=1&&(s.x!==0||s.y!==0||s.battle))return returnHome();
    return false;
  }
  function findHealing(){
    const s=S.data;s.lastFind=null;
    if(s.hp.current>s.hp.max/2||S.qty('Potion')>0){s.healingSearchSteps=0;return;}
    s.healingSearchSteps=Math.min(3,(Number.isInteger(s.healingSearchSteps)?s.healingSearchSteps:0)+1);
    if(s.hp.current<=s.hp.max/4||s.healingSearchSteps>=3||Math.random()<0.35){
      S.add('Potion');s.healingSearchSteps=0;s.lastFind={type:'Potion',qty:1,x:s.x,y:s.y};
      S.log('A crimson potion lies beside the path. Added to your pack.');
    }
  }
  function move(direction){
    const s=S.data;if(!s||s.battle||s.outcome)return false;
    const delta={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[direction];if(!delta)return false;
    S.syncRest();
    if(s.hp.current<=1)return rescueIfNeeded()||false;
    s.homecoming=null;
    const wasLocal=local(s.x,s.y);s.x+=delta[0];s.y+=delta[1];s.direction=direction;s.steps++;s.state='Explore';
    const b=getOrCreateBlock(s.x,s.y,true);b.resolved=false;
    if(wasLocal&&!local(s.x,s.y))S.log('THE VEIL BREAKS. Strongwood’s warmth dies behind you.');
    S.log(description(b));findHealing();S.syncRest();S.save();return b;
  }
  function description(b=current()){return C.entities[b.subtype][local(b.x,b.y)?'village':'outer'];}
  const coords=(x,y)=>x===0&&y===0?'HOME · 0 / 0':`${Math.abs(x)}${x<0?'W':'E'} ${Math.abs(y)}${y<0?'N':'S'}`;
  return {local,border,realm,at,spawn,getOrCreateBlock,current,clear,move,description,coords,returnHome,rescueIfNeeded};
})();
