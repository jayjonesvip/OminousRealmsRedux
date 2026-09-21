'use strict';
OR.combat=(()=>{
  const S=OR.state,C=OR.content,W=OR.world;
  const damage=(base,move,resistance,lucky=false)=>Math.random()<Math.min(100,move.accuracy+(lucky?5:0))/100?(base+move.power)*(1-Math.min(95,Math.max(0,resistance))/100):0;
  const wildlife={
    'mud-biter':{min:6,max:10,base:1,extra:2},
    'large-rat':{min:12,max:18,base:2,extra:2},
    'rabid-rabbit':{min:10,max:14,base:2,extra:2},
    snake:{min:14,max:20,base:3,extra:3},
    spider:{min:14,max:20,base:3,extra:3},
    bat:{min:12,max:18,base:2,extra:3}
  };
  function lightCreature(id,hp,base,extra){const natural=C.creature(id,1);return {id,name:C.entities[id].name,level:1,hp,maxHp:hp,...natural,basePower:base,resistance:0,moves:natural.moves.map(m=>({...m,power:Math.min(extra,m.power),accuracy:Math.min(90,m.accuracy)}))};}
  function migrateWildlife(){const b=S.data?.battle;if(!b)return;const id=b.enemyId,local=W.local(b.x,b.y);if(!wildlife[id]&&id!=='mud-biter')return;const p=local?{max:10,base:1,extra:2}:wildlife[id];if(!p)return;const e=b.enemy,max=Math.min(e.maxHp||p.max,p.max),hp=Math.min(e.hp,max);Object.assign(e,lightCreature(id,max,p.base,p.extra),{hp});}
  function enemy(block){
    if(block.subtype==='malrec'){const level=S.data.level,hp=110+8*level;return {id:'malrec',name:'Malrec, Lord of the Veil',level,hp,maxHp:hp,basePower:6+Math.floor(level/2),resistance:S.data.finale?.veilbreaker?12:85,attackStyle:'Crowned blade',defense:'Veil armor',weapon:null,phase:1,moves:[{name:'Black Edge',power:3,accuracy:86},{name:'Crownfall',power:7,accuracy:70}]};}
    if(block.subtype==='undead-knight'){const level=S.data.level,hp=30+4*(level-1);return {id:block.subtype,name:C.entities[block.subtype].name,level,hp,maxHp:hp,basePower:4+Math.floor((level-1)/2),...C.creature(block.subtype,level),resistance:Math.min(20,8+level)};}
    if(block.subtype==='bandit-hideout')return {id:block.subtype,name:OR.errands?.atTarget(block)?OR.errands.definition().enemyName||'Bandit':'Gem Thief',level:1,hp:18,maxHp:18,basePower:2,...C.creature(block.subtype,1)};
    const profile=wildlife[block.subtype];if(profile&&!W.local(block.x,block.y))return lightCreature(block.subtype,C.random(profile.min,profile.max),profile.base,profile.extra);
    if(block.elementType==='Danger'&&W.local(block.x,block.y)){
      const natural=C.creature(block.subtype,1),hp=C.random(6,10);
      return {id:block.subtype,name:C.entities[block.subtype].name,level:1,hp,maxHp:hp,basePower:1,weapon:null,attackStyle:natural?.attackStyle||'Claws',defense:null,resistance:0,moves:(natural?.moves||[{name:'Bite',power:0,accuracy:80}]).map(m=>({...m,power:Math.min(2,m.power),accuracy:Math.min(85,m.accuracy)}))};
    }
    const natural=C.creature(block.subtype,S.data.level),type={ogre:'Axe',troll:'Hammer',skeleton:'Sword'}[block.subtype]||'Sword';
    let max=block.elementType==='Danger'?C.random(20,30):50,base=5,armor=C.random(1,15);
    for(let l=2;l<=S.data.level;l++){max+=1.2*Math.ceil(C.required(l-1))+l;base++;armor=Math.min(95,armor+1);}
    if(block.elementType==='Dragon')max=block.dragonMaxHp||block.dragonHp;
    const moves=C.weapon(type).moves.filter(m=>!m.magic);
    return {id:block.subtype,name:OR.quests?.name(block)||C.entities[block.subtype].name,level:S.data.level,hp:block.dragonHp||max,maxHp:max,basePower:base,resistance:armor,weapon:type,moves,...natural};
  }
  function start(){const s=S.data,b=W.current();if(b.subtype==='malrec'&&(!s.finale?.veilbreaker||s.finale.stage!=='gate'))return false;if(b.finaleTile&&s.finale&&!['hunt','gate'].includes(s.finale.stage))return false;if(s.battle||s.outcome||s.foundLoot||b.cleared||!['Danger','Enemy','Dragon'].includes(b.elementType))return false;const e=enemy(b);if(b.elementType==='Dragon')b.dragonMaxHp=e.maxHp;s.battle={enemyId:b.subtype,enemy:e,x:s.x,y:s.y,round:1,log:`${e.name} confronts you. Choose your opening.`};s.state='Battle';if(!W.local(s.x,s.y)&&['Enemy','Dragon'].includes(b.elementType))ambush();S.save();return true;}
  function ambush(){
    const s=S.data,b=s.battle,e=b.enemy,move=C.pick(e.moves),hurt=damage(e.basePower,move,s.armor.resistance);
    b.ambushed=true;b.ambushPresented=false;
    b.lastRound={round:1,ambush:true,dealt:null,received:hurt,reply:move.name};
    s.hp.current=Math.max(1,s.hp.current-hurt);
    S.log(hurt?e.name+' strikes first: '+move.name+', '+Number(hurt.toFixed(1))+' damage.':e.name+' strikes first but misses.');
    if(s.hp.current<=1)finish(false);
  }
  function levelUp(){const s=S.data,old=s.level;while(S.levelProgress().remaining===0){const cost=C.required(s.level);s.levelStartVictories+=cost;s.level++;s.hp.max+=1.2*cost+s.level;s.hp.current=s.hp.max;s.weapon.basePower++;s.armor.resistance=Math.min(95,s.armor.resistance+1);s.armor.craftCost=s.armor.resistance;}return s.level-old;}
  function finish(win,bribed=false){
    const s=S.data,b=W.current(),isDragon=b.elementType==='Dragon',e=s.battle.enemy;
    let levels=0,rewards=[],retrieval=null;
    S.changeHope(win?(bribed?0:2):-8);
    if(win){s.victories++;levels=levelUp();retrieval=OR.errands?.recover(b,'slay');rewards=retrieval?retrieval.rewards:S.grantLoot(isDragon?2:1,isDragon);OR.quests?.complete('slay',b);OR.finale?.won(b);W.clear(true);if(retrieval?.after)Object.assign(b,retrieval.after);}
    s.outcome={retrieval:!!retrieval,win,bribed,dragon:isDragon&&win&&!bribed,rewards,levels,enemy:e.name,lastRound:s.battle.lastRound||null,art:win?`warrior-${s.weapon.type.toLowerCase()}`:'warrior-wounded'};
    S.log(win?(bribed?`A gem spent. ${e.name} withdraws. This ground is now clear.`:`${e.name} falls. This ground is now clear.`):'You fall unconscious. The realm leaves you one breath.');
    if(levels)S.log(`LEVEL ${s.level}. Your gear improves and your health is restored.`);
    s.battle=null;s.state='Explore';
    if(!win){W.weakenBorder();W.returnHome('You fall unconscious. You wake at Strongwood Cottage with 1 HP.');}
    S.save();return s.outcome;
  }
  const fmt=n=>Number(n.toFixed(1));
  function attack(index){
    const s=S.data;if(!s?.battle)return false;const move=s.weapon.moves[index];if(!move||(move.magic&&(!s.enchanted||!S.qty('MagicCrystal'))))return false;
    if(move.magic)S.add('MagicCrystal',-1);
    const b=s.battle,e=b.enemy,hit=damage(s.weapon.basePower,move,e.resistance,S.qty('LuckyCoin')>0);
    e.hp=Math.max(0,e.hp-hit);let line=hit?`${move.name} lands for ${fmt(hit)}.`:`${move.name} misses.`;
    b.lastRound={round:b.round,move:move.name,magic:!!move.magic,dealt:hit,received:null,reply:null,stagger:false};
    if(W.current().elementType==='Dragon')W.current().dragonHp=e.hp;
    if(e.hp<=0){b.log=line;S.log(line);return finish(true);}
    if(e.id==='malrec'&&e.phase===1&&e.hp<=e.maxHp/2){e.phase=2;e.resistance=0;e.basePower+=2;e.attackStyle='Unbound shadow';e.moves=[{name:'Veil Lash',power:5,accuracy:92},{name:'Last Dominion',power:10,accuracy:68}];b.lastRound.phaseChanged=true;line+=' His armor breaks. Malrec fights as unbound shadow.';}
    if(hit&&move.stagger){
      line+=` ${e.name} staggers. No counter.`;
      b.lastRound.stagger=true;b.log=line;b.round++;S.log(line);S.save();return true;
    }
    const response=C.pick(e.moves),hurt=damage(e.basePower,response,s.armor.resistance);
    s.hp.current=Math.max(1,s.hp.current-hurt);line+=hurt?` ${e.name}: ${response.name}, ${fmt(hurt)} damage.`:` ${e.name} misses ${response.name}.`;
    b.lastRound.received=hurt;b.lastRound.reply=response.name;
    b.log=line;b.round++;S.log(line);
    if(s.hp.current<=1)return finish(false);
    S.save();return true;
  }
  function advanceDragon(battle){
    if(battle.enemyId!=='dragon'||battle.enemy.hp<=0||battle.enemy.hp>=battle.enemy.maxHp||W.local(battle.x,battle.y))return false;
    let x=battle.x,y=battle.y;if(Math.abs(x)>=Math.abs(y))x-=Math.sign(x);else y-=Math.sign(y);
    if(W.local(x,y)||W.border(x,y)||battle.enemyId==='dragon'&&OR.quests?.atTarget(W.at(battle.x,battle.y))&&!OR.quests.deep(x,y))return false;
    const target=W.at(x,y),reserved=OR.village?.template(x,y);
    if(reserved||target?.subtype==='poison-vine'||target&&target.elementType!=='Nature')return false;
    const origin=W.at(battle.x,battle.y);if(!origin||origin.elementType!=='Dragon')return false;
    const moved={...(origin.questId?{questId:origin.questId}:{}),x,y,elementType:'Dragon',subtype:'dragon',dragonHp:battle.enemy.hp,dragonMaxHp:battle.enemy.maxHp,resolved:false};
    OR.quests?.relocate(origin,x,y);delete origin.questId;
    if(target){for(const key of Object.keys(target))delete target[key];Object.assign(target,moved);}else S.data.blocks.push(moved);
    Object.assign(origin,{elementType:'Nature',subtype:'clearing',dragonHp:null,dragonMaxHp:null,resolved:true,cleared:true});return true;
  }
  function flee(){if(!S.data?.battle)return false;const b=S.data.battle,moved=advanceDragon(b);S.changeHope(-2);S.log(moved?'The wounded dragon moves toward Strongwood.':('You break off the fight. '+b.enemy.name+' still threatens this ground.'));S.data.battle=null;S.data.state='Explore';W.current().resolved=true;S.save();return true;}
  const canBribe=()=>!!S.data?.battle&&['ogre','gargoyle','troll'].includes(S.data.battle.enemyId)&&!W.current().finaleTile&&!OR.quests?.atTarget(W.current());
  function bribe(){if(!canBribe()||!S.qty('Gem'))return false;S.add('Gem',-1);return finish(true,true);}
  function claim(){if(!S.data?.outcome)return false;if(S.data.outcome.retrieval&&!OR.errands.collect())return false;if(!S.data.outcome.win)W.current().resolved=true;S.data.outcome=null;S.save();return true;}
  return {damage,migrateWildlife,enemy,start,attack,flee,canBribe,bribe,claim,levelUp};
})();
