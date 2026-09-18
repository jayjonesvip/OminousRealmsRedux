'use strict';
OR.combat=(()=>{
  const S=OR.state,C=OR.content,W=OR.world;
  const damage=(base,move,resistance,lucky=false)=>Math.random()<Math.min(100,move.accuracy+(lucky?5:0))/100?(base+move.power)*(1-Math.min(95,Math.max(0,resistance))/100):0;
  function enemy(block){
    const natural=C.creature(block.subtype,S.data.level),type={ogre:'Axe',troll:'Hammer',skeleton:'Sword'}[block.subtype]||'Sword';
    let max=block.elementType==='Danger'?C.random(20,30):50,base=5,armor=C.random(1,15);
    for(let l=2;l<=S.data.level;l++){max+=1.2*Math.ceil(C.required(l-1))+l;base++;armor=Math.min(95,armor+1);}
    if(block.elementType==='Dragon')max=block.dragonMaxHp||block.dragonHp;
    const moves=C.weapon(type).moves.filter(m=>!m.magic);
    return {id:block.subtype,name:C.entities[block.subtype].name,level:S.data.level,hp:block.dragonHp||max,maxHp:max,basePower:base,resistance:armor,weapon:type,moves,...natural};
  }
  function start(){const s=S.data,b=W.current();if(s.battle||s.outcome||s.foundLoot||b.cleared||!['Danger','Enemy','Dragon'].includes(b.elementType))return false;const e=enemy(b);if(b.elementType==='Dragon')b.dragonMaxHp=e.maxHp;s.battle={enemyId:b.subtype,enemy:e,x:s.x,y:s.y,round:1,log:`${e.name} confronts you. Choose your opening.`};s.state='Battle';S.save();return true;}
  function levelUp(){const s=S.data,old=s.level;while(S.levelProgress().remaining===0){const cost=C.required(s.level);s.levelStartVictories+=cost;s.level++;s.hp.max+=1.2*cost+s.level;s.hp.current=s.hp.max;s.weapon.basePower++;s.armor.resistance=Math.min(95,s.armor.resistance+1);s.armor.craftCost=s.armor.resistance;}return s.level-old;}
  function finish(win,bribed=false){
    const s=S.data,b=W.current(),isDragon=b.elementType==='Dragon',e=s.battle.enemy;
    let levels=0,rewards=[];
    if(win){s.victories++;levels=levelUp();rewards=S.grantLoot(isDragon?2:1,isDragon);W.clear(true);}
    s.outcome={win,bribed,dragon:isDragon&&win&&!bribed,rewards,levels,enemy:e.name,lastRound:s.battle.lastRound||null,art:win?`warrior-${s.weapon.type.toLowerCase()}`:'warrior-wounded'};
    S.log(win?(bribed?`A gem spent. ${e.name} withdraws. This ground is now clear.`:`${e.name} falls. This ground is now clear.`):'You fall unconscious. The realm leaves you one breath.');
    if(levels)S.log(`LEVEL ${s.level}. Your gear improves and your health is restored.`);
    s.battle=null;s.state='Explore';
    if(!win)W.returnHome('You fall unconscious. You wake at Strongwood Cottage with 1 HP.');
    S.save();return s.outcome;
  }
  const fmt=n=>Number(n.toFixed(1));
  function attack(index){
    const s=S.data;if(!s?.battle)return false;const move=s.weapon.moves[index];if(!move||(move.magic&&!S.qty('MagicCrystal')))return false;
    if(move.magic)S.add('MagicCrystal',-1);
    const b=s.battle,e=b.enemy,hit=damage(s.weapon.basePower,move,e.resistance,S.qty('LuckyCoin')>0);
    e.hp=Math.max(0,e.hp-hit);let line=hit?`${move.name} lands for ${fmt(hit)}.`:`${move.name} misses.`;
    b.lastRound={round:b.round,move:move.name,magic:!!move.magic,dealt:hit,received:null,reply:null,stagger:false};
    if(W.current().elementType==='Dragon')W.current().dragonHp=e.hp;
    if(e.hp<=0){b.log=line;S.log(line);return finish(true);}
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
  function flee(){if(!S.data?.battle)return false;S.log(`You break off the fight. ${S.data.battle.enemy.name} still threatens this ground.`);S.data.battle=null;S.data.state='Explore';W.current().resolved=true;S.save();return true;}
  function bribe(){if(!S.data?.battle||!S.qty('Gem'))return false;S.add('Gem',-1);return finish(true,true);}
  function claim(){if(!S.data?.outcome)return false;if(!S.data.outcome.win)W.current().resolved=true;S.data.outcome=null;S.save();return true;}
  return {damage,enemy,start,attack,flee,bribe,claim,levelUp};
})();
