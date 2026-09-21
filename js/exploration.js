'use strict';
OR.exploration=(()=>{
  const S=OR.state,W=OR.world,C=OR.content;
  const titles=[{id:'wayfarer',name:'Wayfarer',count:100},{id:'far-wanderer',name:'Far Wanderer',count:500},{id:'last-road',name:'Beyond the Last Road',count:1000}];
  const landmarks=['landmark-giant','landmark-bell','landmark-stone-host'];
  const ordinaryEnemy=b=>!!b&&!b.questId&&!b.finaleTile&&['snake','spider','bat','rabid-rabbit','mud-biter','large-rat','skeleton','undead-knight','troll','gargoyle','ogre','dragon'].includes(b.subtype)&&['Danger','Enemy','Dragon'].includes(b.elementType);
  const count=()=>new Set(S.data.blocks.filter(b=>b.visited).map(b=>b.x+','+b.y)).size;
  function valid(s){
    if(s.discoveryTitles!==undefined&&(!Array.isArray(s.discoveryTitles)||new Set(s.discoveryTitles).size!==s.discoveryTitles.length||!s.discoveryTitles.every(id=>titles.some(t=>t.id===id))))return false;
    return Array.isArray(s.blocks)&&s.blocks.every(b=>{
      if(!b||b.visited!==undefined&&typeof b.visited!=='boolean'||b.enemyLevel!==undefined&&(!Number.isSafeInteger(b.enemyLevel)||b.enemyLevel<1))return false;
      const e=b.enemyProfile;if(e===undefined)return true;
      return ordinaryEnemy(b)&&e&&e.id===b.subtype&&e.level===b.enemyLevel&&typeof e.name==='string'&&['hp','maxHp','basePower','resistance'].every(k=>Number.isFinite(e[k]))&&e.hp>0&&e.hp<=e.maxHp&&e.basePower>=1&&e.resistance>=0&&e.resistance<=95&&Array.isArray(e.moves)&&e.moves.length>0&&e.moves.every(m=>m&&typeof m.name==='string'&&Number.isFinite(m.power)&&m.power>=0&&Number.isFinite(m.accuracy)&&m.accuracy>=0&&m.accuracy<=100);
    });
  }
  function award(){const s=S.data,n=count();s.discoveryTitles=s.discoveryTitles||[];for(const t of titles)if(n>=t.count&&!s.discoveryTitles.includes(t.id)){s.discoveryTitles.push(t.id);S.log('Discovery title earned: '+t.name+' · '+t.count+' places visited.');}return titles.filter(t=>s.discoveryTitles.includes(t.id)).at(-1)||null;}
  function visit(b){if(!b||b.x!==S.data.x||b.y!==S.data.y||b.visited)return false;b.visited=true;
    if(landmarks.includes(b.subtype))S.log('Discovered '+C.entities[b.subtype].name+' at '+W.coords(b.x,b.y)+'. '+C.entities[b.subtype].outer);
    award();return true;
  }
  function migrate(){const s=S.data;
    // Old saves did not distinguish reserved objectives from visited terrain.
    const pending=[s.quests?.active,s.pursuit,s.siren,s.traveler].filter(Boolean);
    for(const b of s.blocks)if(b.visited===undefined)b.visited=b.x===s.x&&b.y===s.y||!b.finaleTile&&!pending.some(p=>p.x===b.x&&p.y===b.y);
    // Preserve an already-running ordinary battle when adopting fixed profiles.
    const battle=s.battle,b=battle&&W.at(battle.x,battle.y);if(ordinaryEnemy(b)&&!b.enemyProfile&&battle.enemy){b.enemyLevel=battle.enemy.level;b.enemyProfile=JSON.parse(JSON.stringify(battle.enemy));b.enemyProfile.hp=b.enemyProfile.maxHp;}
    award();
  }
  function prepareEnemy(b){if(!ordinaryEnemy(b)||b.enemyProfile)return b;
    if(b.enemyLevel===undefined){b.enemyLevel=W.local(b.x,b.y)&&b.elementType==='Danger'?1:S.data.level;
      const busy=S.data.pursuit||S.data.siren||S.data.traveler||S.data.quests?.active||S.data.quests?.offer||OR.finale?.active();
      if(!busy&&b.elementType==='Enemy'&&Math.max(Math.abs(b.x),Math.abs(b.y))>=W.radius()+11&&Math.random()<.08)b.enemyLevel+=C.random(2,4);
    }
    OR.combat.enemy(b);return b;
  }
  function rollLandmark(x,y){if(W.local(x,y)||W.border(x,y))return null;const available=landmarks.filter(id=>!S.data.blocks.some(b=>b.subtype===id));if(!available.length||Math.random()>=.01)return null;return {x,y,elementType:'Thing',subtype:C.pick(available),resolved:true};}
  function warning(b){if(!['Danger','Enemy','Dragon'].includes(b.elementType)||b.cleared)return null;
    if(ordinaryEnemy(b)&&!b.enemyProfile)OR.combat.enemy(b);
    const level=b.enemyProfile?.level??b.enemyLevel??(['bandit-hideout','traveler-ambush'].includes(b.subtype)?1:S.data.level),gap=level-S.data.level;
    return {level,label:gap>=3?'OVERWHELMING THREAT':gap>0?'STRONGER FOE':'LEVEL '+level,danger:gap>0,detail:'Enemy level '+level+' · Your level '+S.data.level+(!W.local(b.x,b.y)&&['Enemy','Dragon'].includes(b.elementType)?' · Strikes first.':'')+' Walking past is safe.'};
  }
  function summary(){const n=count(),earned=titles.filter(t=>(S.data.discoveryTitles||[]).includes(t.id));return {count:n,title:earned.at(-1)?.name||'New Roads',earned,next:titles.find(t=>n<t.count),landmarks:S.data.blocks.filter(b=>b.visited&&landmarks.includes(b.subtype))};}
  return {titles,landmarks,ordinaryEnemy,count,valid,visit,migrate,prepareEnemy,rollLandmark,warning,summary};
})();
