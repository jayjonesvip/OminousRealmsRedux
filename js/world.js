'use strict';
OR.world=(()=>{
  const C=OR.content,S=OR.state;
  const local=(x,y)=>Math.abs(x)<=25&&Math.abs(y)<=25;
  const border=(x,y)=>Math.max(Math.abs(x),Math.abs(y))===26;
  const realm=(x,y)=>local(x,y)?'Strongwood Village':'The Outer Realm';
  const at=(x,y)=>S.data.blocks.find(b=>b.x===x&&b.y===y);
  const outerPeople=['hunter','exile','gravekeeper','hermit'];
  const npcAllowed=(id,x,y)=>id==='villager'?local(x,y):!outerPeople.includes(id)||!local(x,y);
  const npcCandidates=(x,y)=>Object.values(C.entities).filter(e=>e.type==='NPC'&&npcAllowed(e.id,x,y)&&!S.data.blocks.some(b=>b.elementType==='NPC'&&b.subtype===e.id));
  const nearBorder=(x,y)=>Math.max(Math.abs(x),Math.abs(y))>=21;
  function migrateThreats(){for(const b of S.data.blocks)if(local(b.x,b.y)&&b.elementType==='Danger'&&(b.subtype==='skeleton'||b.subtype==='bat'&&!nearBorder(b.x,b.y)))b.subtype='rabid-rabbit';}
  function migratePuzzles(){
    const find=S.data.foundLoot;
    for(const b of S.data.blocks)if(b.elementType==='Puzzle'&&local(b.x,b.y)&&!(find?.source==='puzzle'&&find.x===b.x&&find.y===b.y)){
      if(b.puzzle?.solved&&!b.puzzle.claimed&&!b.puzzle.entered){for(const r of b.puzzle.rewards||[])S.add(r.type,r.qty);}
      else if(b.subtype==='puzzle-plate'&&b.puzzle?.offered&&!b.puzzle.solved)S.add(OR.puzzles.pattern(b).item,b.puzzle.offered);
      Object.assign(b,{elementType:'Nature',subtype:'clearing',resolved:true});delete b.puzzle;
    }
  }
  function migrateNpcs(){
    const seen=new Set(),blocks=[...S.data.blocks].sort((a,b)=>Number(b.x===S.data.x&&b.y===S.data.y)-Number(a.x===S.data.x&&a.y===S.data.y));
    for(const b of blocks)if(b.elementType==='NPC'){
      if(!npcAllowed(b.subtype,b.x,b.y)||seen.has(b.subtype)){Object.assign(b,{elementType:'Nature',subtype:'clearing',resolved:false});delete b.dialogue;if(b.x===S.data.x&&b.y===S.data.y)S.data.message='';}
      else seen.add(b.subtype);
    }
  }
  function spawn(type,x,y){if(border(x,y))return borderBlock(x,y);let candidates=type==='NPC'?npcCandidates(x,y):Object.values(C.entities).filter(e=>e.type===type&&(e.id!=='grave'||!local(x,y))&&(!local(x,y)||type!=='Danger'||['rabid-rabbit','snake','spider'].includes(e.id)||e.id==='bat'&&nearBorder(x,y)));if(!candidates.length&&type==='NPC'){type='Nature';candidates=Object.values(C.entities).filter(e=>e.type==='Nature');}const e=C.pick(candidates);const b={x,y,elementType:type,subtype:e.id,dragonHp:type==='Dragon'?C.random(250,1000):null,resolved:false};if(type==='Puzzle')b.puzzle=OR.puzzles.create(e.id);return b;}
  function borderBlock(x,y,b){
    if(!b)b={x,y};
    for(const key of Object.keys(b))if(!['x','y'].includes(key))delete b[key];
    return Object.assign(b,{elementType:'Border',subtype:'outer-realm-border',resolved:true});
  }
  function migrateBorders(){for(const b of S.data.blocks)if(border(b.x,b.y))borderBlock(b.x,b.y,b);}
  function getOrCreateBlock(x,y){
    let b=at(x,y);
    if(border(x,y)){if(b?.elementType==='Border')return b;const crossing=borderBlock(x,y,b);if(!b)S.data.blocks.push(crossing);return crossing;}
    if(b)return b;
    const village=OR.village?.template(x,y);if(village){S.data.blocks.push(village);return village;}
    const quest=OR.quests?.roll(x,y);if(quest){S.data.blocks.push(quest);return quest;}
    let type;
    if(x===0&&y===0)type='Home';
    else{
      const rates=C.encounterRates(local(x,y)),types=Object.keys(rates);
      let roll=Math.random()*100;
      type=types.find(t=>(roll-=rates[t])<0)||types[types.length-1];
    }
    b=spawn(type,x,y);S.data.blocks.push(b);return b;
  }
  const current=()=>getOrCreateBlock(S.data.x,S.data.y);
  function clear(permanent=false){const b=current();Object.assign(b,{elementType:'Nature',subtype:'clearing',dragonHp:null,resolved:true,cleared:permanent||b.cleared===true});}
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
    const s=S.data;s.lastFind=null;if(!local(s.x,s.y)){s.healingSearchSteps=0;return;}
    if(s.hp.current>s.hp.max/2||S.qty('Potion')>0){s.healingSearchSteps=0;return;}
    s.healingSearchSteps=Math.min(3,(Number.isInteger(s.healingSearchSteps)?s.healingSearchSteps:0)+1);
    if(s.hp.current<=s.hp.max/4||s.healingSearchSteps>=3||Math.random()<0.35){
      S.add('Potion');s.healingSearchSteps=0;s.lastFind={type:'Potion',qty:1,x:s.x,y:s.y};
      S.log('A crimson potion lies beside the path. Added to your pack.');
    }
  }
  function move(direction){
    const s=S.data;if(!s||s.battle||s.outcome||s.foundLoot)return false;
    if(OR.village?.pendingGift()||OR.village?.visionActive())return false;
    const delta={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[direction];if(!delta)return false;
    S.syncRest();
    if(s.hp.current<=1)return rescueIfNeeded()||false;
    s.homecoming=null;
    const wasLocal=local(s.x,s.y);s.x+=delta[0];s.y+=delta[1];s.direction=direction;s.steps++;s.state='Explore';
    const b=getOrCreateBlock(s.x,s.y);b.resolved=false;
    if(wasLocal&&!local(s.x,s.y))S.log('THE VEIL BREAKS. Strongwood’s warmth dies behind you.');
    S.log(description(b));findHealing();OR.village?.triggerVision(b);S.syncRest();S.save();return b;
  }
  function description(b=current()){const quest=OR.quests?.description(b);if(quest)return quest;const village=OR.village?.description(b);if(village)return village;return b.elementType==='Puzzle'&&b.puzzle?.solved?(b.puzzle.claimed?'The seal stays open. This chamber has already been searched.':'The seal stands open. A hidden chamber awaits.') : b.cleared?'This ground is cleared. No threat remains here.':C.entities[b.subtype][local(b.x,b.y)?'village':'outer'];}
  const coords=(x,y)=>x===0&&y===0?'HOME · 0 / 0':`${Math.abs(x)}${x<0?'W':'E'} ${Math.abs(y)}${y<0?'N':'S'}`;
  return {local,border,realm,at,spawn,npcCandidates,migrateNpcs,migrateThreats,migratePuzzles,migrateBorders,getOrCreateBlock,current,clear,move,description,coords,returnHome,rescueIfNeeded};
})();
