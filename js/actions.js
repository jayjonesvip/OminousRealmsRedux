'use strict';
OR.actions=(()=>{
  const S=OR.state,C=OR.content,W=OR.world;
  function resolve(line,clear=false){if(line)S.log(line);else S.data.message='';delete W.current().dialogue;if(clear)W.clear();else W.current().resolved=true;S.data.state='Explore';W.rescueIfNeeded();S.save();return line||true;}
  function ignore(){
    if(S.data.battle||S.data.outcome||S.data.foundLoot)return false;
    const b=W.current(),name=C.entities[b.subtype].name;
    const lines={NPC:'',Puzzle:'',Landmark:'',Food:b.subtype==='wild-berries'?'You leave the berries untouched.':'You leave the mushrooms untouched.',Shrine:'',
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
    const hint=attack?'':OR.village.reminder(b.subtype);
    const text='“'+line.text+(hint?' '+hint:'')+'”',narration=attack?'They move beyond your reach.':'',spoken=true;
    resolve([narration,text].filter(Boolean).join(' '));
    b.dialogue={text,narration,spoken,dismissed:false,id:line.id};S.save();return S.data.message;
  }
  function eat(){const b=W.current(),s=S.data;if(b.elementType!=='Food'||s.battle||s.outcome||s.foundLoot)return false;if(b.subtype==='wild-berries'){if((Math.abs(b.x)>25||Math.abs(b.y)>25)||s.hp.current>=s.hp.max)return false;const healed=Math.min(10,s.hp.max-s.hp.current);s.hp.current+=healed;return resolve('The berries restore '+healed+' HP.',true);}if(b.subtype!=='mushrooms')return false;if(s.hp.current<s.hp.max){s.hp.current=s.hp.max;return resolve('Bitter as winter. Your wounds close. Health restored.',true);}const n=Math.min(s.hp.current-1,C.random(1,3)*s.level);s.hp.current-=n;return resolve(`The caps turn poisonous in your blood. ${n} health lost.`,true);}
  function shrine(){const s=S.data,b=W.current();if(s.battle||s.outcome||s.foundLoot||b.elementType!=='Shrine'||b.subtype!=='wayside-shrine'||W.local(b.x,b.y)||b.healingUsed||s.hp.current>=s.hp.max||S.qty('MetalIngot')<1)return false;const healed=s.hp.max-s.hp.current;S.add('MetalIngot',-1);s.hp.current=s.hp.max;b.healingUsed=true;resolve('You offer one metal ingot. The shrine restores '+Number(healed.toFixed(1))+' HP.');return healed;}
  function dig(){const b=W.current();if(S.data.battle||S.data.outcome||S.data.foundLoot||b.elementType!=='BuriedItems')return false;if(!b.digDepth){b.digDepth=C.random(3,6);b.dug=0;}if(S.data.hp.current<=1){S.log('Too weak to dig. Find healing before returning.');S.save();return false;}const cost=C.random(1,2);S.data.hp.current=Math.max(1,S.data.hp.current-cost);b.dug++;if(S.data.hp.current<=1)return resolve('Your strength gives out. The earth keeps its secret.');if(b.dug>=b.digDepth){const reward={type:b.questId==='keepsake'?'Keepsake':S.loot(),qty:1};S.data.foundLoot={source:'dig',x:b.x,y:b.y,rewards:[reward]};return resolve(`Unearthed: ${C.items[reward.type].name}. Gather your find before moving on.`,true);}S.log(`${b.dug} ${b.dug===1?'foot':'feet'} dug. ${cost} health spent. Still no treasure.`);S.save();return true;}
  function gatherLoot(){const s=S.data;if(!s.foundLoot||s.battle||s.outcome)return false;if(s.foundLoot.source==='puzzle'){const b=W.at(s.foundLoot.x,s.foundLoot.y),p=b?.puzzle;if(!p?.solved||!p.entered||p.claimed)return false;p.claimed=true;}const find=s.foundLoot,rewards=find.rewards;for(const r of rewards)S.add(r.type,r.qty);s.foundLoot=null;W.migratePuzzles();OR.quests?.complete(find.source,W.at(find.x,find.y));S.log('Gathered: '+rewards.map(r=>r.qty+' '+C.items[r.type].name).join(', ')+'. Added to your pack.');S.save();return rewards;}
  function unlock(){if(W.current().elementType!=='LockedItem'||!S.qty('Key'))return false;S.add('Key',-1);const r=S.grantLoot()[0];OR.quests?.complete('chest',W.current());return resolve(`You unlock the chest. +${r.qty} ${C.items[r.type].name} added to your pack.`,true);}
  function potion(){const s=S.data;if(!s)return false;const rest=S.syncRest();if(!S.qty('Potion')||s.hp.current>=s.hp.max){if(rest.changed)S.save();return false;}S.add('Potion',-1);s.hp.current=s.hp.max;s.rest=null;s.homecoming=null;s.lastFind=null;s.healingSearchSteps=0;S.log('One crimson draught. Every wound closes.');S.save();return true;}
  function rest(){const s=S.data;if(s.battle||s.outcome||s.x!==0||s.y!==0||s.hp.current>=s.hp.max)return false;S.syncRest();S.save();return true;}
  const armorCost=()=>Math.max(1,S.data.armor.craftCost||S.data.armor.resistance);
  const weaponCost=()=>S.data.weapon.basePower+1;
  const atForge=()=>!!S.data&&W.current().elementType==='Craft';
  const canCraft=()=>atForge()&&!S.data.battle&&!S.data.outcome&&!S.data.foundLoot;
  function craft(which){const s=S.data;if(!canCraft())return false;const isArmor=which==='armor';if(!isArmor&&which!=='weapon')return false;if(isArmor&&s.armor.resistance>=95)return false;const cost=isArmor?armorCost():weaponCost(),type=isArmor?'MetalIngot':'SteelIngot';if(S.qty(type)<cost)return false;S.add(type,-cost);if(isArmor){s.armor.resistance++;s.armor.craftCost=s.armor.resistance;}else s.weapon.basePower++;S.log(isArmor?'Your ancestral iron grows stronger. +1% damage resistance.':`Your ${s.weapon.type.toLowerCase()} is reinforced. +1 weapon power.`);S.save();return true;}
  return {resolve,ignore,talk,eat,shrine,dig,gatherLoot,unlock,potion,rest,craft,armorCost,weaponCost,atForge,canCraft};
})();
