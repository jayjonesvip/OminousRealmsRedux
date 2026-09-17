'use strict';
OR.actions=(()=>{
  const S=OR.state,C=OR.content,W=OR.world;
  function resolve(line,clear=false){S.log(line);delete W.current().dialogue;if(clear)W.clear();else W.current().resolved=true;S.data.state='Explore';W.rescueIfNeeded();S.save();return line;}
  function ignore(){if(S.data.battle||S.data.outcome)return false;return resolve(C.pick(['Not every shadow needs your steel.','You leave it to the forest.','Another day. Another fight.']));}
  function talk(attack=false){
    const b=W.current();if(b.elementType!=='NPC')return false;
    let text,narration='',spoken=true;
    if(attack){narration='They sidestep your blade.';text='“Save that iron for the enemy, fool.”';}
    else if(b.subtype==='elder'&&Math.random()<0.5){text='The elder looks through you. Some wisdom stays unspoken.';spoken=false;}
    else text=W.local(S.data.x,S.data.y)?C.pick(['“A coin in your pocket steadies the hand. Remember that.”','“Beyond the twenty-fifth stone, even the trees turn against you.”','“Come home with your shield. We can mend the rest.”']):C.pick(['“The village will burn. You cannot guard every door.”','“Keep walking, little warrior. The dark is hungry.”']);
    resolve([narration,text].filter(Boolean).join(' '));
    b.dialogue={text,narration,spoken,dismissed:false};S.save();return S.data.message;
  }
  function eat(){if(W.current().elementType!=='Food')return false;const s=S.data;if(s.hp.current<s.hp.max){s.hp.current=s.hp.max;return resolve('Bitter as winter. Your wounds close. Health restored.',true);}const n=Math.min(s.hp.current-1,C.random(1,3)*s.level);s.hp.current-=n;return resolve(`The caps turn poisonous in your blood. ${n} health lost.`,true);}
  function dig(){const b=W.current();if(b.elementType!=='BuriedItems')return false;if(!b.digDepth){b.digDepth=C.random(3,6);b.dug=0;}if(S.data.hp.current<=1){S.log('Too weak to dig. Find healing before returning.');S.save();return false;}const cost=C.random(1,2);S.data.hp.current=Math.max(1,S.data.hp.current-cost);b.dug++;if(S.data.hp.current<=1)return resolve('Your strength gives out. The earth keeps its secret.');if(b.dug>=b.digDepth){const reward=S.grantLoot()[0];return resolve(`Unearthed: ${C.items[reward.type].name}. The soil surrenders.`,true);}S.log(`${b.dug} / ${b.digDepth} feet. ${cost} health spent. Keep digging.`);S.save();return true;}
  function unlock(){if(W.current().elementType!=='LockedItem'||!S.qty('Key'))return false;S.add('Key',-1);const r=S.grantLoot()[0];return resolve(`The old lock breaks. Found ${C.items[r.type].name}.`,true);}
  function potion(){const s=S.data;if(!s)return false;const rest=S.syncRest();if(!S.qty('Potion')||s.hp.current>=s.hp.max){if(rest.changed)S.save();return false;}S.add('Potion',-1);s.hp.current=s.hp.max;s.rest=null;s.homecoming=null;s.lastFind=null;s.healingSearchSteps=0;S.log('One crimson draught. Every wound closes.');S.save();return true;}
  function rest(){const s=S.data;if(s.battle||s.outcome||s.x!==0||s.y!==0||s.hp.current>=s.hp.max)return false;S.syncRest();S.save();return true;}
  const armorCost=()=>Math.max(1,S.data.armor.craftCost||S.data.armor.resistance);
  const weaponCost=()=>S.data.weapon.basePower+1;
  function craft(which){const s=S.data;if(s.battle||s.outcome||W.current().elementType!=='Craft')return false;const isArmor=which==='armor';if(!isArmor&&which!=='weapon')return false;if(isArmor&&s.armor.resistance>=95)return false;const cost=isArmor?armorCost():weaponCost(),type=isArmor?'MetalIngot':'SteelIngot';if(S.qty(type)<cost)return false;S.add(type,-cost);if(isArmor){s.armor.resistance++;s.armor.craftCost=s.armor.resistance;}else s.weapon.basePower++;S.log(isArmor?'Your ancestral iron grows stronger. +1 armor.':'The edge catches the firelight. +1 weapon power.');S.save();return true;}
  return {resolve,ignore,talk,eat,dig,unlock,potion,rest,craft,armorCost,weaponCost};
})();
