'use strict';
OR.state = (() => {
  const KEY = 'ominousrealms.save';
  const REST_DURATION = 10 * 60 * 1000;
  let data = null;
  let storageError = '';
  const fresh = (name='Warrior',type='Sword')=>({version:1,enchanted:false,name:name.trim().slice(0,24)||'Warrior',x:0,y:0,direction:'N',state:'Explore',hp:{current:50,max:50},level:1,victories:0,levelStartVictories:0,armor:{resistance:10,craftCost:10},weapon:OR.content.weapon(type),inventory:[],message:'Your father’s iron. Your own legend.',journal:[],blocks:[],battle:null,outcome:null,foundLoot:null,steps:0,healingSearchSteps:0,lastFind:null,rest:null});
  const valid = s=>s && s.version===1 && typeof s.name==='string' && Number.isInteger(s.x) && Number.isInteger(s.y) && s.hp && Number.isFinite(s.hp.current) && Number.isFinite(s.hp.max) && s.hp.max>=1 && s.hp.current>=1 && s.hp.current<=s.hp.max && Number.isInteger(s.level) && s.level>=1 && Number.isFinite(s.victories) && s.victories>=0 && s.armor && Number.isFinite(s.armor.resistance) && s.armor.resistance>=0 && s.armor.resistance<=95 && s.weapon && OR.content.weapons[s.weapon.type] && Number.isFinite(s.weapon.basePower) && s.weapon.basePower>=1 && Array.isArray(s.inventory) && s.inventory.every(i=>OR.content.items[i.type] && Number.isInteger(i.qty) && i.qty>=0) && Array.isArray(s.blocks) && s.blocks.every(b=>Number.isInteger(b.x)&&Number.isInteger(b.y)&&OR.content.entities[b.subtype]&&OR.content.weights[b.elementType]) && Array.isArray(s.journal) && s.journal.every(j=>typeof j==='string');
  function load() {
    try {
      const raw=localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed=JSON.parse(raw);
      if (!valid(parsed)) {storageError='This save cannot be read. Starting a new journey will replace it.';return null;}
      data={...fresh(parsed.name,parsed.weapon.type),...parsed};
      // Legacy levels started at the previous lifetime threshold. Keep that
      // level and its earned wins when adopting the per-level progression.
      if(!Number.isInteger(parsed.levelStartVictories)||parsed.levelStartVictories<0||parsed.levelStartVictories>data.victories)
        data.levelStartVictories=Math.min(data.victories,data.level>1?OR.content.required(data.level-1):0);
      data.enchanted=typeof parsed.enchanted==='boolean'?parsed.enchanted:true;
      OR.village?.setup(true);
      for(const b of data.blocks)if(b.elementType==='Nature'&&b.subtype==='forest-path'){b.subtype='forest';}
      // Unmarked graves belong beyond the Strongwood boundary.
      for(const b of data.blocks)if(b.subtype==='grave'&&Math.abs(b.x)<=25&&Math.abs(b.y)<=25){b.elementType='Thing';b.subtype='figurine';}
      data.weapon.moves=OR.content.weapon(data.weapon.type).moves;
      data.armor.craftCost=data.armor.craftCost||data.armor.resistance;
      data.journal=data.journal.slice(-50);
      OR.world?.migrateNpcs();
      // Retire ambiguous legacy banners without rewriting the journal history.
      if(['Not every shadow needs your steel.','You leave it to the forest.','Another day. Another fight.'].includes(data.message))data.message='';
      // Older saves kept cleared encounters as resolved clearings without a flag.
      // Preserve that ground rather than allowing another threat to spawn there.
      for(const b of data.blocks)if(b.cleared===undefined&&b.elementType==='Nature'&&b.subtype==='clearing'&&b.resolved)b.cleared=true;
      if(data.foundLoot&&(!['dig','puzzle'].includes(data.foundLoot.source)||!Array.isArray(data.foundLoot.rewards)||!data.foundLoot.rewards.length||!data.foundLoot.rewards.every(r=>r&&OR.content.items[r.type]&&Number.isSafeInteger(r.qty)&&r.qty>0)))data.foundLoot=null;
      if (data.battle && (!data.battle.enemy || !Number.isFinite(data.battle.enemy.hp) || !Array.isArray(data.battle.enemy.moves))) data.battle=null;
      if(data.battle){const e=data.battle.enemy;Object.assign(e,OR.content.creature(e.id,e.level||data.level));}
      syncRest();
      return data;
    } catch (_) {storageError='Device storage is unavailable or the save is damaged. Progress may not persist.';return null;}
  }
  function save() {
    if (!data) return false;
    try {localStorage.setItem(KEY,JSON.stringify(data));storageError='';return true;}
    catch (_) {storageError='Storage is full or blocked. Keep this tab open; progress is not saved.';return false;}
  }
  function create(name,type) {data=fresh(name,type);OR.village?.setup();log('Eldric placed ancestral iron in your hands. Strongwood has a defender.');save();return data;}
  function reset() {try {localStorage.removeItem(KEY);}catch (_){storageError='Could not erase the save. Enable device storage and try again.';return false;}data=null;return true;}
  function qty(type) {return data?.inventory.find(i=>i.type===type)?.qty||0;}
  function levelProgress() {const required=OR.content.required(data.level),earned=Math.max(0,data.victories-data.levelStartVictories);return {required,earned,remaining:Math.max(0,required-earned),percent:Math.min(100,earned/required*100)};}
  function add(type,n=1) {if(!OR.content.items[type]||!Number.isInteger(n))return false;const item=data.inventory.find(i=>i.type===type);if(qty(type)+n<0)return false;if(item)item.qty+=n;else if(n>0)data.inventory.push({type,qty:n});data.inventory=data.inventory.filter(i=>i.qty>0);return true;}
  function log(line) {data.message=line;data.journal.push(line);data.journal=data.journal.slice(-50);}
  function syncRest(now=Date.now()) {
    const s=data;if(!s)return {changed:false,completed:false};
    if(s.x!==0||s.y!==0||s.battle||s.hp.current>=s.hp.max){const changed=!!s.rest;s.rest=null;return {changed,completed:false};}
    const r=s.rest;
    if(!r||!Number.isFinite(r.startedAt)||r.startedAt<0||r.startedAt>now||!Number.isFinite(r.hpAtStart)||r.hpAtStart<1||r.hpAtStart>s.hp.current||r.maxHp!==s.hp.max){
      s.rest={startedAt:now,hpAtStart:s.hp.current,maxHp:s.hp.max};
      return {changed:true,completed:false};
    }
    const rate=(s.hp.max-1)/REST_DURATION,elapsed=Math.max(0,now-r.startedAt);
    const complete=elapsed*rate>=s.hp.max-r.hpAtStart;
    const next=complete?s.hp.max:Math.min(s.hp.max,Math.max(s.hp.current,r.hpAtStart+Math.floor(elapsed*rate)));
    const changed=next!==s.hp.current;s.hp.current=next;
    if(complete){s.rest=null;s.homecoming=null;s.healingSearchSteps=0;log('The cottage hearth has mended your wounds. Fully rested.');}
    return {changed:changed||complete,completed:complete};
  }
  function restStatus(now=Date.now()) {
    const s=data,r=s?.rest;
    if(!r||s.x!==0||s.y!==0||s.battle||s.hp.current>=s.hp.max)return null;
    return {remainingMs:Math.max(0,r.startedAt+(s.hp.max-r.hpAtStart)*REST_DURATION/(s.hp.max-1)-now),percent:Math.min(100,s.hp.current/s.hp.max*100)};
  }
  function loot() {
    if(data.hp.current<data.hp.max && !qty('Potion') && Math.random()<0.6)return 'Potion';
    return OR.content.pick(['MetalIngot','MetalIngot','SteelIngot','SteelIngot','Potion','Gem','Key','MagicCrystal','LuckyCoin','BrokenPottery','RustyNail'].filter(t=>!(['LuckyCoin','MagicCrystal'].includes(t)&&qty(t)>0)));
  }
  function grantLoot(count=1,big=false) {const rewards=[];for(let i=0;i<count;i++){const type=loot(),n=big?OR.content.random(3,6):1;add(type,['LuckyCoin','MagicCrystal'].includes(type)?1:n);rewards.push({type,qty:['LuckyCoin','MagicCrystal'].includes(type)?1:n});}return rewards;}
  return {KEY,REST_DURATION,fresh,load,save,create,reset,qty,levelProgress,add,log,loot,grantLoot,syncRest,restStatus,get data(){return data;},get error(){return storageError;}};
})();
