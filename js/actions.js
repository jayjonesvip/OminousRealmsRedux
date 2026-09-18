'use strict';
OR.actions=(()=>{
  const S=OR.state,C=OR.content,W=OR.world;
  function resolve(line,clear=false){if(line)S.log(line);else S.data.message='';delete W.current().dialogue;if(clear)W.clear();else W.current().resolved=true;S.data.state='Explore';W.rescueIfNeeded();S.save();return line||true;}
  function ignore(){
    if(S.data.battle||S.data.outcome||S.data.foundLoot)return false;
    const b=W.current(),name=C.entities[b.subtype].name;
    const lines={NPC:'',Puzzle:'',Food:'You leave the mushrooms untouched.',
      BuriedItems:b.dug?'You stop digging. The unfinished hole remains.':'You leave the disturbed earth untouched.',
      LockedItem:'You leave the chest locked.',Craft:'You step away from the forge.'};
    const line=b.cleared?W.description(b):['Danger','Enemy','Dragon'].includes(b.elementType)?
      `You avoid ${name}. The threat remains here.`:lines[b.elementType]??'You turn your attention back to the path.';
    return resolve(line);
  }
  function talk(attack=false){
    const b=W.current();if(b.elementType!=='NPC')return false;
    const context=attack?'attacked':W.local(S.data.x,S.data.y)?'strongwood':'outer',key=b.subtype+'.'+context;
    const s=S.data;if(!s.dialogueLast||typeof s.dialogueLast!=='object'||Array.isArray(s.dialogueLast))s.dialogueLast={};
    const line=OR.dialogue.choose(b.subtype,context,s.dialogueLast[key]);
    s.dialogueLast[key]=line.id;
    const text='“'+line.text+'”',narration=attack?'They move beyond your reach.':'',spoken=true;
    resolve([narration,text].filter(Boolean).join(' '));
    b.dialogue={text,narration,spoken,dismissed:false,id:line.id};S.save();return S.data.message;
  }
  function eat(){if(W.current().elementType!=='Food')return false;const s=S.data;if(s.hp.current<s.hp.max){s.hp.current=s.hp.max;return resolve('Bitter as winter. Your wounds close. Health restored.',true);}const n=Math.min(s.hp.current-1,C.random(1,3)*s.level);s.hp.current-=n;return resolve(`The caps turn poisonous in your blood. ${n} health lost.`,true);}
  function dig(){const b=W.current();if(S.data.battle||S.data.outcome||S.data.foundLoot||b.elementType!=='BuriedItems')return false;if(!b.digDepth){b.digDepth=C.random(3,6);b.dug=0;}if(S.data.hp.current<=1){S.log('Too weak to dig. Find healing before returning.');S.save();return false;}const cost=C.random(1,2);S.data.hp.current=Math.max(1,S.data.hp.current-cost);b.dug++;if(S.data.hp.current<=1)return resolve('Your strength gives out. The earth keeps its secret.');if(b.dug>=b.digDepth){const reward={type:S.loot(),qty:1};S.data.foundLoot={source:'dig',rewards:[reward]};return resolve(`Unearthed: ${C.items[reward.type].name}. Gather your find before moving on.`,true);}S.log(`${b.dug} ${b.dug===1?'foot':'feet'} dug. ${cost} health spent. Still no treasure.`);S.save();return true;}
  function gatherLoot(){const s=S.data;if(!s.foundLoot||s.battle||s.outcome)return false;if(s.foundLoot.source==='puzzle'){const b=W.at(s.foundLoot.x,s.foundLoot.y),p=b?.puzzle;if(!p?.solved||!p.entered||p.claimed)return false;p.claimed=true;}const rewards=s.foundLoot.rewards;for(const r of rewards)S.add(r.type,r.qty);s.foundLoot=null;S.log('Gathered: '+rewards.map(r=>r.qty+' '+C.items[r.type].name).join(', ')+'. Added to your pack.');S.save();return rewards;}
  function unlock(){if(W.current().elementType!=='LockedItem'||!S.qty('Key'))return false;S.add('Key',-1);const r=S.grantLoot()[0];return resolve(`You unlock the chest. +${r.qty} ${C.items[r.type].name} added to your pack.`,true);}
  function potion(){const s=S.data;if(!s)return false;const rest=S.syncRest();if(!S.qty('Potion')||s.hp.current>=s.hp.max){if(rest.changed)S.save();return false;}S.add('Potion',-1);s.hp.current=s.hp.max;s.rest=null;s.homecoming=null;s.lastFind=null;s.healingSearchSteps=0;S.log('One crimson draught. Every wound closes.');S.save();return true;}
  function rest(){const s=S.data;if(s.battle||s.outcome||s.x!==0||s.y!==0||s.hp.current>=s.hp.max)return false;S.syncRest();S.save();return true;}
  const armorCost=()=>Math.max(1,S.data.armor.craftCost||S.data.armor.resistance);
  const weaponCost=()=>S.data.weapon.basePower+1;
  const atForge=()=>!!S.data&&((S.data.x===0&&S.data.y===0)||W.current().elementType==='Craft');
  const canCraft=()=>atForge()&&!S.data.battle&&!S.data.outcome&&!S.data.foundLoot;
  function craft(which){const s=S.data;if(!canCraft())return false;const isArmor=which==='armor';if(!isArmor&&which!=='weapon')return false;if(isArmor&&s.armor.resistance>=95)return false;const cost=isArmor?armorCost():weaponCost(),type=isArmor?'MetalIngot':'SteelIngot';if(S.qty(type)<cost)return false;S.add(type,-cost);if(isArmor){s.armor.resistance++;s.armor.craftCost=s.armor.resistance;}else s.weapon.basePower++;S.log(isArmor?'Your ancestral iron grows stronger. +1% damage resistance.':`Your ${s.weapon.type.toLowerCase()} is reinforced. +1 weapon power.`);S.save();return true;}
  return {resolve,ignore,talk,eat,dig,gatherLoot,unlock,potion,rest,craft,armorCost,weaponCost,atForge,canCraft};
})();
