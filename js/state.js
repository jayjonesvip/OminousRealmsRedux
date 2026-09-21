'use strict';
OR.state = (() => {
  const KEY = 'ominousrealms.save';
  const REST_DURATION = 10 * 60 * 1000;
  let data = null;
  let storageError = '';
  let staging=false;
  const deedLines={watchpostRecovered:'Strongwood: the watchpost stores are recovered.',provisionsReturned:'Strongwood: the missing provisions have come home.',ogreDefeated:'Strongwood: the Roadkeeper’s Bane is dead.',roadCleared:'Strongwood: travelers can use the old road again.',hollowflameDead:'Strongwood: Rauthkell’s smoke no longer hangs over the village.'};
  const flags=()=>Object.fromEntries(Object.keys(deedLines).map(key=>[key,false]));
  const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const validDeeds=s=>(s.worldFlags===undefined||record(s.worldFlags)&&Object.entries(s.worldFlags).every(([k,v])=>Object.hasOwn(deedLines,k)&&typeof v==='boolean'))&&(s.reactionSeen===undefined||record(s.reactionSeen)&&Object.values(s.reactionSeen).every(v=>Array.isArray(v)&&v.every(k=>Object.hasOwn(deedLines,k))));
  const validHazards=s=>(s.poisoned===undefined||s.poisoned===null||record(s.poisoned)&&Number.isSafeInteger(s.poisoned.lastTick)&&s.poisoned.lastTick>=0)&&validRetrieval(s);
  function validRetrieval(s){const p=s.pursuit;if(p===undefined||p===null)return true;if(p.kind==='cage-rescue'&&p.phase==='meet')return !s.rescueDone&&record(p)&&['x','y','originX','originY'].every(k=>Number.isSafeInteger(p[k]))&&p.x===p.originX&&p.y===p.originY&&!s.quests?.active&&!s.quests?.offer&&Array.isArray(s.blocks)&&s.blocks.some(b=>b.x===p.x&&b.y===p.y&&b.subtype==='hanging-cage');if(p.kind==='cage-rescue'&&s.rescueDone)return false;const d=OR.errands?.definitions[p.kind||'bandit'];if(!record(p)||!d||!['x','y','originX','originY'].every(k=>Number.isSafeInteger(p[k]))||!['retrieve','collect','return'].includes(p.phase||'retrieve')||s.quests?.active||s.quests?.offer||!Array.isArray(s.blocks))return false;if(p.phase==='return')return d.returnToGiver&&p.x===p.originX&&p.y===p.originY&&s.blocks.some(b=>b&&b.x===p.x&&b.y===p.y);if(p.phase==='collect'){const after=d.after||{elementType:'Nature',subtype:'clearing'};return s.blocks.some(b=>b&&b.x===p.x&&b.y===p.y&&b.elementType===after.elementType&&b.subtype===after.subtype&&b.cleared);}return (d.realm!=='outer'||Math.max(Math.abs(p.x),Math.abs(p.y))>=27-(s.borderLoss||0))&&s.blocks.some(b=>b&&b.x===p.x&&b.y===p.y&&b.elementType===d.target.elementType&&b.subtype===d.target.subtype);}
  function remember(){if(!data)return;data.worldFlags={...flags(),...data.worldFlags};data.reactionSeen=data.reactionSeen||{};const done=data.quests?.completed||[];for(const [quest,keys] of Object.entries({watchpost:['watchpostRecovered'],provisions:['provisionsReturned'],roadkeeper:['ogreDefeated','roadCleared'],hollowflame:['hollowflameDead']}))if(done.includes(quest))for(const key of keys)if(!data.worldFlags[key]){data.worldFlags[key]=true;log(deedLines[key]);}}

  function changeHope(amount){if(!data)return;data.hope=Math.max(0,Math.min(100,(data.hope??50)+amount));}
  function hopeStatus(){const value=data.hope??50,index=Math.min(4,Math.floor(value/20));return {value,label:['Fading','Uneasy','Steady','Hopeful','Resolute'][index],words:['Shutters stay barred. The roads lie empty.','Doors close earlier. Few villagers travel alone.','Hearths burn through the evening. The village holds on.','Travelers return to the road. Lamps burn in open windows.','Neighbors stand watch together. Strongwood will not yield.'][index]};}
  const fresh = (name='Warrior',type='Sword')=>({version:1,traveler:null,travelerDone:false,siren:null,sirenDone:false,finale:null,rescueDone:false,hope:50,borderLoss:0,borderNotice:false,poisoned:null,pursuit:null,heavyStaggerSeen:false,worldFlags:flags(),reactionSeen:{},enchanted:false,name:name.trim().slice(0,24)||'Warrior',x:0,y:0,direction:'N',state:'Explore',hp:{current:50,max:50},level:1,victories:0,levelStartVictories:0,armor:{resistance:10,craftCost:10},weapon:OR.content.weapon(type),inventory:[],message:'Your father’s iron. Your own legend.',journal:[],blocks:[],battle:null,outcome:null,foundLoot:null,steps:0,healingSearchSteps:0,lastFind:null,rest:null});
  const valid = s=>s && s.version===1 && (OR.traveler?.valid(s)??(s.traveler==null&&s.travelerDone===undefined)) && (OR.siren?.valid(s)??(s.siren==null&&s.sirenDone===undefined)) && (s.quests?.searchSteps===undefined||Number.isInteger(s.quests.searchSteps)&&s.quests.searchSteps>=0&&s.quests.searchSteps<100) && (OR.finale?.valid(s)??(s.finale===undefined||s.finale===null)) && (s.rescueDone===undefined||typeof s.rescueDone==='boolean') && (s.hope===undefined||Number.isInteger(s.hope)&&s.hope>=0&&s.hope<=100) && (s.borderLoss===undefined||Number.isInteger(s.borderLoss)&&s.borderLoss>=0&&s.borderLoss<=5) && (s.borderNotice===undefined||typeof s.borderNotice==='boolean') && validHazards(s) && (s.heavyStaggerSeen===undefined||typeof s.heavyStaggerSeen==='boolean') && validDeeds(s) && typeof s.name==='string' && Number.isInteger(s.x) && Number.isInteger(s.y) && s.hp && Number.isFinite(s.hp.current) && Number.isFinite(s.hp.max) && s.hp.max>=1 && s.hp.current>=1 && s.hp.current<=s.hp.max && Number.isInteger(s.level) && s.level>=1 && Number.isFinite(s.victories) && s.victories>=0 && s.armor && Number.isFinite(s.armor.resistance) && s.armor.resistance>=0 && s.armor.resistance<=95 && s.weapon && OR.content.weapons[s.weapon.type] && Number.isFinite(s.weapon.basePower) && s.weapon.basePower>=1 && Array.isArray(s.inventory) && s.inventory.every(i=>OR.content.items[i.type] && Number.isInteger(i.qty) && i.qty>=0) && Array.isArray(s.blocks) && s.blocks.every(b=>b&&(b.healingUsed===undefined||typeof b.healingUsed==='boolean')&&Number.isInteger(b.x)&&Number.isInteger(b.y)&&OR.content.entities[b.subtype]&&OR.content.weights[b.elementType]) && Array.isArray(s.journal) && s.journal.every(j=>typeof j==='string');

  // Display-only migration: save IDs, discovered coordinates and player names stay intact.
  const formerNames=[["Veilbound Grimoire","Cinderseam Grimoire"],["Veilbreaker","Strongwood’s Oath"],["Earthshaker","Gravesoil Blow"],["Thornback Spider","Needleleg Spider"],["Oldwood Forest","Rafterroot Forest"],["Ashwood Forest","Coalstump Forest"],["Veilfall","Hushrill Falls"],["Forsaken Glade","Cinderhush Glade"],["Verdant Dragon","Sootveil Dragon"],["Briar Snake","Ditchscale Snake"],["Eldric","Dornik Harth"],["Elara","Mara Thenn"],["Vaelric","Sereth Venn"],["Malrec","Ordrath"],["Hollowflame","Rauthkell"],["Gravewing Gargoyle","Ruinperch Gargoyle"],["Ember Fox","Russetbrush Fox"],["Silverrun Stream","Sparrowbend Stream"],["Whispering Glade","Stillbough Glade"],["Sunlit Clearing","Warmfern Clearing"],["Reedwater Marsh","Sedgepool Marsh"],["Lantern Tavern","Crooked Kettle"],["Elder Grove","Bentroot Grove"],["Witchcap","Duskfrill"],["Writhing Briars","Hookthorn Tangle"],["Ironjaw Ogre","Kilnmaw Ogre"],["The Weighted Gate","The Ingot Balance"],["The Turning Stones","The Rune Bearings"],["The Missing Provisions","The Stolen Winter Stores"],["Veil","Cinderseam"]];
  const nameChanges=formerNames.flatMap(([oldName,newName])=>[[oldName,newName],[oldName.toUpperCase(),newName.toUpperCase()]]).concat([['the veil','the Cinderseam']]);
  function currentWording(text){return typeof text!=='string'?text:nameChanges.reduce((line,[oldName,newName])=>line.replace(new RegExp('\\b'+oldName+'\\b','g'),newName),text);}
  function refreshWording(){
    data.message=currentWording(data.message);
    data.journal=data.journal.map(currentWording);
    const textKeys=new Set(['name','speaker','text','description','log','move','reply','enemy','defense']);
    function visit(value){if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(textKeys.has(key)&&typeof value[key]==='string')value[key]=currentWording(value[key]);else if(typeof value[key]==='object')visit(value[key]);}}
    for(const block of data.blocks)visit(block.dialogue);
    visit(data.battle);visit(data.outcome);visit(data.finale?.dialogue);
  }
  function load(rawOverride) {
    try {
      const raw=rawOverride===undefined?localStorage.getItem(KEY):rawOverride;
      if (!raw) return null;
      const parsed=JSON.parse(raw);
      if (!valid(parsed)) {storageError='This save cannot be read. Starting a new journey will replace it.';return null;}
      data={...fresh(parsed.name,parsed.weapon.type),...parsed};
      refreshWording();
      // Legacy levels started at the previous lifetime threshold. Keep that
      // level and its earned wins when adopting the per-level progression.
      if(!Number.isInteger(parsed.levelStartVictories)||parsed.levelStartVictories<0||parsed.levelStartVictories>data.victories)
        data.levelStartVictories=Math.min(data.victories,data.level>1?OR.content.required(data.level-1):0);
      data.enchanted=typeof parsed.enchanted==='boolean'?parsed.enchanted:true;
      OR.village?.setup(true);
      for(const b of data.blocks)if(b.elementType==='Nature'&&b.subtype==='forest-path'){b.subtype='forest';}
      // Unmarked graves belong beyond the Strongwood boundary.
      for(const b of data.blocks)if(b.subtype==='grave'&&OR.world.local(b.x,b.y)){b.elementType='Thing';b.subtype='figurine';}
      if(data.pursuit?.kind!=='cage-rescue')data.inventory=data.inventory.filter(i=>i.type!=='RustyNail');
      data.weapon.moves=OR.content.weapon(data.weapon.type).moves;
      data.armor.craftCost=data.armor.craftCost||data.armor.resistance;
      data.journal=data.journal.slice(-50);
      OR.world?.migrateBorders();
      OR.world?.migratePuzzles();
      OR.world?.migrateThreats();
      OR.world?.migrateNpcs();
      OR.quests?.migrate();
      remember();
      OR.puzzles?.migrateUnique();
      // Retire ambiguous legacy banners without rewriting the journal history.
      if(['Not every shadow needs your steel.','You leave it to the forest.','Another day. Another fight.'].includes(data.message))data.message='';
      // Older saves kept cleared encounters as resolved clearings without a flag.
      // Preserve that ground rather than allowing another threat to spawn there.
      for(const b of data.blocks)if(b.cleared===undefined&&b.elementType==='Nature'&&b.subtype==='clearing'&&b.resolved)b.cleared=true;
      if(data.foundLoot&&(!['dig','puzzle'].includes(data.foundLoot.source)||!Array.isArray(data.foundLoot.rewards)||!data.foundLoot.rewards.length||!data.foundLoot.rewards.every(r=>r&&OR.content.items[r.type]&&Number.isSafeInteger(r.qty)&&r.qty>0)))data.foundLoot=null;
      if (data.battle && (!data.battle.enemy || !Number.isFinite(data.battle.enemy.hp) || !Array.isArray(data.battle.enemy.moves))) data.battle=null;
      if(data.battle&&data.battle.enemyId!=='malrec'){const e=data.battle.enemy;Object.assign(e,OR.content.creature(e.id,e.level||data.level));}
      OR.combat?.migrateWildlife();
      syncRest();
      return data;
    } catch (_) {storageError='Device storage is unavailable or the save is damaged. Progress may not persist.';return null;}
  }
  function save() {
    if (!data) return false;
    if(data.hp.current>=data.hp.max)data.poisoned=null;
    if(staging)return true;
    try {localStorage.setItem(KEY,JSON.stringify(data));storageError='';return true;}
    catch (_) {storageError='Storage is full or blocked. Keep this tab open; progress is not saved.';return false;}
  }
  function exportSave(){if(!data)throw Error('No journey to export.');syncRest();save();return JSON.stringify(data,null,2);}
  function prepareImport(raw){const previous=data,error=storageError;try{if(typeof raw!=='string'||raw.length>10000000)throw Error('Choose a save file smaller than 10 MB.');const candidate=JSON.parse(raw);if(!valid(candidate))throw Error('This is not a valid Ominous Realms save.');staging=true;data=null;const loaded=load(raw);if(!loaded)throw Error('This save could not be restored.');return JSON.parse(JSON.stringify(loaded));}catch(e){throw Error(e instanceof SyntaxError?'The file is not valid JSON.':e.message);}finally{data=previous;storageError=error;staging=false;}}
  function importSave(raw){const previous=data;try{const candidate=prepareImport(raw);data=candidate;if(!save()){data=previous;return false;}return true;}catch(e){storageError=e.message;data=previous;return false;}}
  function create(name,type) {data=fresh(name,type);OR.village?.setup();log('Dornik Harth placed ancestral iron in your hands. Strongwood has a defender.');save();return data;}
  function reset() {try {localStorage.removeItem(KEY);}catch (_){storageError='Could not erase the save. Enable device storage and try again.';return false;}data=null;return true;}
  function qty(type) {return data?.inventory.find(i=>i.type===type)?.qty||0;}
  function levelProgress() {const required=OR.content.required(data.level),earned=Math.max(0,data.victories-data.levelStartVictories);return {required,earned,remaining:Math.max(0,required-earned),percent:Math.min(100,earned/required*100)};}
  function add(type,n=1) {if(!OR.content.items[type]||!Number.isInteger(n))return false;const item=data.inventory.find(i=>i.type===type);if(qty(type)+n<0)return false;if(item)item.qty+=n;else if(n>0)data.inventory.push({type,qty:n});data.inventory=data.inventory.filter(i=>i.qty>0);return true;}
  function log(line) {data.message=line;data.journal.push(line);data.journal=data.journal.slice(-50);}
  function poison(now=Date.now()){
    if(!data)return false;syncRest(now);
    data.hp.current=Math.max(1,data.hp.current-1);
    data.poisoned=data.poisoned||{lastTick:now};
    log('Poison vines sting. Lose 1 HP each minute until fully healed.');return true;
  }
  function syncRest(now=Date.now()) {
    const s=data;if(!s)return {changed:false,completed:false};
    let changed=false,ticks=0;
    if(s.poisoned&&OR.siren?.trapped()){s.poisoned.lastTick=now;return {changed:true,completed:false};}
    if(s.poisoned){
      if(s.hp.current>=s.hp.max){s.poisoned=null;changed=true;}
      else if(s.poisoned.lastTick>now){s.poisoned.lastTick=now;changed=true;}
      else {ticks=Math.floor((now-s.poisoned.lastTick)/60000);if(ticks){s.poisoned.lastTick+=ticks*60000;changed=true;}}
    }
    if(s.x!==0||s.y!==0||s.battle||s.hp.current>=s.hp.max){
      if(ticks)s.hp.current=Math.max(1,s.hp.current-ticks);
      changed=changed||!!s.rest;s.rest=null;return {changed,completed:false};
    }
    let r=s.rest;
    if(!r||!Number.isFinite(r.startedAt)||r.startedAt<0||r.startedAt>now||!Number.isFinite(r.hpAtStart)||r.hpAtStart<1||r.hpAtStart>s.hp.max||r.maxHp!==s.hp.max){
      s.hp.current=Math.max(1,s.hp.current-ticks);s.rest={startedAt:now,hpAtStart:s.hp.current,maxHp:s.hp.max,poisonDamage:0};
      return {changed:true,completed:false};
    }
    r.poisonDamage=(Number.isFinite(r.poisonDamage)&&r.poisonDamage>=0?r.poisonDamage:0)+ticks;
    const rate=(s.hp.max-1)/REST_DURATION,elapsed=Math.max(0,now-r.startedAt),recovered=r.hpAtStart+Math.floor(elapsed*rate)-r.poisonDamage;
    const complete=elapsed*rate>=s.hp.max-r.hpAtStart+r.poisonDamage;
    const next=complete?s.hp.max:Math.max(1,Math.min(s.hp.max,recovered));
    changed=changed||next!==s.hp.current;s.hp.current=next;
    if(complete){s.rest=null;s.poisoned=null;s.homecoming=null;s.healingSearchSteps=0;log('The cottage hearth has mended your wounds. Fully rested.');}
    return {changed:changed||complete,completed:complete};
  }
  function restStatus(now=Date.now()) {
    const s=data,r=s?.rest;
    if(!r||s.x!==0||s.y!==0||s.battle||s.hp.current>=s.hp.max)return null;
    return {remainingMs:Math.max(0,(s.poisoned?now+(s.hp.max-s.hp.current)/Math.max(.000001,(s.hp.max-1)/REST_DURATION-1/60000):r.startedAt+(s.hp.max-r.hpAtStart+(r.poisonDamage||0))*REST_DURATION/(s.hp.max-1))-now),percent:Math.min(100,s.hp.current/s.hp.max*100)};
  }
  function loot() {
    if(data.hp.current<data.hp.max && !qty('Potion') && Math.random()<0.6)return 'Potion';
    return OR.content.pick(['MetalIngot','MetalIngot','SteelIngot','SteelIngot','Potion','Gem','MagicCrystal','LuckyCoin','BrokenPottery'].filter(t=>!(['LuckyCoin','MagicCrystal'].includes(t)&&qty(t)>0)));
  }
  function grantLoot(count=1,big=false) {const rewards=[];for(let i=0;i<count;i++){const type=loot(),n=big?OR.content.random(3,6):1;add(type,['LuckyCoin','MagicCrystal'].includes(type)?1:n);rewards.push({type,qty:['LuckyCoin','MagicCrystal'].includes(type)?1:n});}return rewards;}
  return {KEY,REST_DURATION,changeHope,hopeStatus,remember,valid,exportSave,prepareImport,importSave,fresh,load,save,create,reset,qty,levelProgress,add,log,loot,grantLoot,poison,syncRest,restStatus,get data(){return data;},get error(){return storageError;}};
})();
