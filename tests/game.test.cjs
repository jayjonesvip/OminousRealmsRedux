function finishDialogue(g){for(let i=0;i<12&&g.nodes.stage.innerHTML.includes('data-action="next-dialogue"');i++)g.ui.dispatch('next-dialogue');}
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=fs.existsSync(path.resolve(__dirname,'../index.html'))?path.resolve(__dirname,'..'):path.resolve(__dirname,'../outputs/ominous-realms');
function game(storage=new Map(),ui=false){
  function mockNode(){let html='';return {children:[],className:'',hidden:false,classList:{add(){},remove(){}},
    get innerHTML(){return html+this.children.map(n=>'<div class="'+n.className+'">'+n.innerHTML+'</div>').join('');},
    set innerHTML(value){html=value;this.children=[];},appendChild(node){node.parent=this;this.children.push(node);},
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);},
    focus(){},addEventListener(){},showModal(){},close(){},querySelector(){return {focus(){}};}};}
  const nodes=Object.fromEntries(['hud','stage','nav','modal','toast','combat-toasts'].map(id=>[id,mockNode()]));
  const ctx={console,Math:Object.create(Math),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout,matchMedia:()=>({matches:true}),scrollY:0,scrollTo(){},history:{pushState(){},replaceState(){}},location:{hash:''},addEventListener(){},document:{createElement:mockNode,getElementById:id=>nodes[id],querySelector:()=>null,addEventListener(){},body:{classList:{toggle(){}}}}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const file of ['content','dialogue','state','world','village','puzzles','combat','actions',...(ui?['ui']:[])])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
  const g=ctx.OR;g.state.create('Rowan','Sword');g.world.current();g.state.save();
  return {...g,storage,ctx,nodes,rng:n=>ctx.Math.random=()=>n,place:(type,subtype,x=3,y=3)=>{g.state.data.x=x;g.state.data.y=y;let b=g.world.at(x,y);if(!b){b={x,y};g.state.data.blocks.push(b);}Object.assign(b,{elementType:type,subtype,resolved:false});return b;}};
}
test('encounter prompts sit below directions, which leave in one tap without consuming the encounter',()=>{
  for(const [type,id,action] of [['NPC','elder','talk'],['Food','mushrooms','eat'],['Danger','snake','fight'],['Enemy','ogre','fight'],['Dragon','dragon','fight'],['BuriedItems','dig','dig'],['LockedItem','chest','unlock'],['Craft','forge','forge:armor']]){
    const g=game(new Map(),true),b=g.place(type,id,27,3);if(type==='Dragon')b.dragonHp=500;
    g.ui.route('explore');const html=g.nodes.stage.innerHTML;
    assert.ok(html.indexOf('CHOOSE YOUR PATH')<html.indexOf('data-action="'+action+'"'),type);
    assert.ok(html.indexOf('class="compass"')<html.indexOf('data-action="'+action+'"'),type);
    assert.doesNotMatch(html,/INVESTIGATE|KEEP WALKING|data-action="ignore"|recent-message/);
    g.ui.dispatch('move:N');assert.equal(g.state.data.x,27);assert.equal(g.state.data.y,2);assert.equal(g.state.data.steps,1);
    assert.equal(b.elementType,type);assert.equal(b.subtype,id);assert.equal(g.state.data.battle,null);assert.equal(g.state.data.victories,0);assert.equal(g.state.qty('Key'),0);
    if(type==='NPC')assert.equal(g.nodes.toast.innerHTML,'');else assert.ok(g.nodes.toast.innerHTML.length>0);
    g.ui.dispatch('move:S');assert.equal(g.world.current(),b);assert.match(g.nodes.stage.innerHTML,new RegExp('data-action="'+action+'"'));
  }
});
test('directions dismiss NPC speech and retain partially dug ground across reloads',()=>{
  const g=game(new Map(),true);g.place('NPC','elder');g.ui.dispatch('talk');assert.match(g.nodes.stage.innerHTML,/speech-bubble/);
  g.ui.dispatch('move:N');assert.doesNotMatch(g.nodes.stage.innerHTML,/speech-bubble/);assert.equal(g.nodes.toast.innerHTML,'');
  g.ui.dispatch('move:S');assert.match(g.nodes.stage.innerHTML,/data-action="talk"/);assert.doesNotMatch(g.nodes.stage.innerHTML,/speech-bubble/);
  const b=g.place('BuriedItems','dig',8,8);g.rng(0);g.ui.dispatch('dig');assert.equal(b.dug,1);
  g.ui.dispatch('move:N');assert.match(g.nodes.toast.innerHTML,/unfinished hole remains/);g.state.load();g.ui.dispatch('move:S');
  assert.equal(g.world.current().dug,1);assert.equal(g.world.current().digDepth,3);assert.match(g.nodes.stage.innerHTML,/DIG ANOTHER FOOT/);
});
test('pending battle, aftermath, and loot prevent compass movement and automatic ignoring',()=>{
  for(const pending of ['battle','outcome','foundLoot']){
    const g=game(new Map(),true),b=g.place('Enemy','ogre',27,3);
    if(pending==='battle')g.combat.start();
    else if(pending==='outcome')g.state.data.outcome={win:true,rewards:[],levels:0,enemy:'Ogre',art:'ogre'};
    else g.state.data.foundLoot={source:'dig',rewards:[{type:'Potion',qty:1}]};
    g.ui.route('explore');assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="move:/);
    g.ui.dispatch('move:N');assert.equal(g.state.data.y,3);assert.equal(b.resolved,false);assert.ok(g.state.data[pending]);
  }
});
test('chest rewards use a transient toast and both toast hosts follow measured HUD height',()=>{
  const g=game(new Map(),true);g.nodes.hud.getBoundingClientRect=()=>({height:137});
  const heights={};for(const id of ['stage','toast','combat-toasts'])g.nodes[id].style={setProperty:(key,value)=>{heights[id]=[key,value];}};
  g.place('LockedItem','chest');g.state.add('Key');g.rng(0);g.ui.route('explore');g.ui.dispatch('unlock');
  assert.match(g.nodes.toast.innerHTML,/CHEST OPENED/);assert.match(g.nodes.toast.innerHTML,/added to your pack/);
  assert.doesNotMatch(g.nodes.stage.innerHTML,/recent-message|CHEST OPENED|You unlock the chest/);
  for(const id of ['stage','toast','combat-toasts'])assert.deepEqual(heights[id],['--hud-height','137px']);
});
test('home remains a recovery point while Eldric upgrades only at his village forge',()=>{
  const g=game(new Map(),true);g.state.add('SteelIngot',20);g.state.add('MetalIngot',30);g.state.data.hp.current=10;g.state.save();g.state.load();g.ui.init();
  assert.equal(g.world.current().elementType,'Home');assert.equal(g.actions.atForge(),false);assert.match(g.nodes.stage.innerHTML,/LET THE HEARTH HEAL/);assert.equal(g.actions.craft('weapon'),false);assert.ok(g.state.data.rest);
  const route=g.state.data.village.routes.find(r=>r.destination==='village-forge'),end=route.nodes.at(-1);g.state.data.x=end.x;g.state.data.y=end.y;g.ui.dispatch('forge:weapon');assert.match(g.nodes.stage.innerHTML,/ELDRIC’S FORGE/);assert.match(g.nodes.stage.innerHTML,/assets\/forge-village.png/);
  g.ui.dispatch('craft:weapon');g.ui.dispatch('craft:armor');assert.equal(g.state.data.weapon.basePower,6);assert.equal(g.state.data.armor.resistance,11);assert.equal(g.state.qty('SteelIngot'),14);assert.equal(g.state.qty('MetalIngot'),20);
});
test('wilderness forges stay usable after upgrades, departure, revisits and reloads in both realms',()=>{
  for(const x of [5,30]){
    const g=game(new Map(),true);g.place('Craft','forge',x,5);g.state.add('SteelIngot',100);g.state.add('MetalIngot',100);
    for(let trip=0;trip<3;trip++){
      assert.equal(g.actions.craft('weapon'),true);assert.equal(g.actions.craft('armor'),true);
      g.ui.dispatch('move:N');assert.equal(g.world.at(x,5).elementType,'Craft');
      g.state.load();g.ui.dispatch('move:S');assert.equal(g.world.current().subtype,'forge');assert.match(g.nodes.stage.innerHTML,/ENTER THE FORGE/);
    }
    assert.equal(g.state.data.weapon.basePower,8);assert.equal(g.state.data.armor.resistance,13);
  }
});
test('forge restrictions cover pending results, found loot, insufficient ingots and mastered armor',()=>{
  const g=game();g.state.add('MetalIngot',100);g.state.add('SteelIngot',100);
  for(const [key,value] of [['battle',{}],['outcome',{win:true,rewards:[]}],['foundLoot',{rewards:[]}]]){
    g.state.data[key]=value;assert.equal(g.actions.craft('armor'),false);assert.equal(g.actions.craft('weapon'),false);g.state.data[key]=null;
  }
  assert.equal(g.state.qty('MetalIngot'),100);assert.equal(g.state.qty('SteelIngot'),100);
  g.state.data.armor.resistance=95;assert.equal(g.actions.craft('armor'),false);assert.equal(g.actions.craft('invalid'),false);
  g.state.add('SteelIngot',-100);assert.equal(g.actions.craft('weapon'),false);
});
test('map marks the village routes and wilderness forges with weapons',()=>{
  const g=game(new Map(),true);g.place('Craft','forge',2,0);g.ui.route('map');
  const html=g.nodes.stage.innerHTML;
  assert.match(html,/aria-label="0, 0: Strongwood Cottage"/);assert.match(html,/Village paths/);
  assert.match(html,/aria-label="2, 0: Wayfarer’s Forge, your location">[\s\S]*?forge-marker/);
  assert.match(html,/map-cell craft[^\"]*you/);assert.match(html,/forge-marker[\s\S]*Forge<\/span>/);
  g.nodes['map-detail']={textContent:''};g.ui.dispatch('tile:0,0');assert.match(g.nodes['map-detail'].textContent,/Strongwood Cottage/);
});
test('subscreens use bottom navigation and forges show both equipment cards',()=>{
  const g=game(new Map(),true);g.place('Nature','forest');
  for(const screen of ['pack','forge','map','journal']){g.ui.route(screen);assert.doesNotMatch(g.nodes.stage.innerHTML,/KEEP EXPLORING|BACK TO EXPLORING|BACK TO THE ROAD|VIEW ARMOR|VIEW WEAPON|EQUIPMENT DETAILS/);assert.match(g.nodes.nav.innerHTML,/data-action="route:explore"/);}
  g.place('Craft','forge');g.ui.dispatch('forge:weapon');assert.match(g.nodes.stage.innerHTML,/id="forge-armor"/);g.ui.dispatch('forge:armor');assert.match(g.nodes.stage.innerHTML,/id="forge-weapon"/);
});
test('pack potion action belongs to its supplies entry and healing toasts report remaining stock',()=>{
  const g=game(new Map(),true);g.place('Nature','forest');g.state.add('Potion',3);g.state.data.hp.current=10;g.ui.route('pack');
  const html=g.nodes.stage.innerHTML,button=html.indexOf('data-action="potion"');assert.ok(html.indexOf('SUPPLIES')<button);assert.ok(html.indexOf('<h2>Potion</h2>')<button);assert.ok(button<html.indexOf('<h2>Gem</h2>'));assert.equal((html.match(/data-action="potion"/g)||[]).length,1);
  for(const remaining of [2,1,0]){g.state.data.hp.current=10;g.ui.dispatch('potion');assert.equal(g.state.data.hp.current,50);assert.equal(g.state.qty('Potion'),remaining);assert.match(g.nodes.toast.innerHTML,new RegExp(remaining+' potion'+(remaining===1?'':'s')+' remaining'));}
  g.state.data.hp.current=10;g.ui.dispatch('potion');assert.equal(g.state.data.hp.current,10);assert.equal(g.state.qty('Potion'),0);assert.match(g.nodes.stage.innerHTML,/data-action="potion" disabled/);
});
test('embark defaults and save schema',()=>{const g=game();const s=g.state.data;assert.equal(s.name,'Rowan');assert.equal(s.hp.current,50);assert.equal(s.armor.resistance,10);assert.equal(s.weapon.moves.length,4);assert.equal(s.weapon.moves[0].accuracy,99);assert.equal(JSON.parse(g.storage.get(g.state.KEY)).version,1);});
test('home and nearby paths and neighbors are stable',()=>{const g=game();const b=g.world.current();assert.equal(b.elementType,'Home');for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)if(x||y)assert.equal(g.world.getOrCreateBlock(x,y).elementType,g.village.template(x,y)?.elementType||'NPC');assert.equal(g.world.current(),b);assert.equal(g.state.data.blocks.length,9);});
test('compass uses correct axes and last heading',()=>{const g=game();for(const d of ['N','E','S','W'])assert.ok(g.world.move(d));assert.equal(g.state.data.x,0);assert.equal(g.state.data.y,0);assert.equal(g.state.data.direction,'W');assert.equal(g.state.data.steps,4);});
test('realm and border include negative coordinates',()=>{const g=game();assert.ok(g.world.local(25,-25));assert.ok(!g.world.local(26,0));assert.ok(!g.world.local(0,-26));assert.ok(g.world.border(-26,50));assert.ok(!g.world.border(27,27));});
test('Strongwood Villagers are excluded beyond every realm boundary',()=>{
  const g=game();
  for(const [x,y] of [[26,0],[-26,0],[0,26],[0,-26],[30,-40]]){
    const found=new Set();
    for(let i=0;i<100;i++){g.rng((i+.5)/100);found.add(g.world.spawn('NPC',x,y).subtype);}
    assert.deepEqual([...found].sort(),['elder','farmer','hunter','woodcutter']);
  }
  g.rng(0);for(const [x,y] of [[25,0],[-25,0],[0,25],[0,-25],[25,-25]])assert.equal(g.world.spawn('NPC',x,y).subtype,'villager');
  assert.equal(g.content.encounterRates(false).NPC,5);assert.equal(g.content.encounterRates(true).NPC,10);
});
test('saved outer villagers become stable hunters without carrying their old dialogue',()=>{
  const g=game(new Map(),true);
  for(const [x,y] of [[26,0],[-26,0],[0,26],[0,-26],[25,-25]]){
    const b=g.place('NPC','villager',x,y);b.resolved=true;b.dialogue={text:'An old villager reply.',spoken:true,dismissed:false};
  }
  g.state.data.x=26;g.state.data.y=0;g.state.log('An old villager reply.');g.state.save();g.state.load();
  for(const b of g.state.data.blocks.filter(b=>b.elementType==='NPC')){
    if(g.world.local(b.x,b.y)){assert.equal(b.subtype,'villager');assert.ok(b.dialogue);}
    else{assert.equal(b.subtype,'hunter');assert.equal(b.dialogue,undefined);assert.equal(b.resolved,true);}
  }
  assert.equal(g.state.data.message,'');g.ui.init();assert.match(g.nodes.stage.innerHTML,/THE HUNTER/);
  assert.doesNotMatch(g.nodes.stage.innerHTML,/STRONGWOOD VILLAGER|An old villager reply/);
  g.state.save();g.state.load();assert.equal(g.world.current().subtype,'hunter');
});
test('local generation excludes outer-only elements',()=>{const g=game();for(let x=-25;x<=25;x++)for(let y=-25;y<=25;y++){const b=g.world.getOrCreateBlock(x,y);assert.ok(!g.content.outerOnly.includes(b.elementType));}});
test('critical health finds a potion on the next step without replacing the tile',()=>{const g=game();g.state.data.hp.current=10;g.rng(.99);g.world.move('N');assert.equal(g.state.qty('Potion'),1);assert.equal(g.world.current().elementType,'Path');assert.equal(g.state.data.hp.current,10);assert.equal(g.state.data.lastFind.type,'Potion');g.state.load();assert.equal(g.state.qty('Potion'),1);assert.equal(g.state.data.lastFind.y,-1);});
test('low-health healing is guaranteed by three steps even on previously explored paths',()=>{const g=game();g.state.data.hp.current=25;g.rng(.99);g.world.move('N');assert.equal(g.state.qty('Potion'),0);g.state.load();g.world.move('S');assert.equal(g.state.qty('Potion'),0);g.world.move('N');assert.equal(g.state.qty('Potion'),1);assert.equal(g.state.data.healingSearchSteps,0);assert.equal(g.world.current().elementType,'Path');});
test('walking never grants extra potions when healthy or already carrying one',()=>{const g=game();g.rng(0);for(let i=0;i<8;i++)g.world.move('N');assert.equal(g.state.qty('Potion'),0);g.state.data.hp.current=10;g.state.add('Potion');for(let i=0;i<8;i++)g.world.move('S');assert.equal(g.state.qty('Potion'),1);assert.equal(g.state.data.lastFind,null);});
test('walking cannot grant healing during battle and does not erase a dragon',()=>{const g=game();const b=g.place('Dragon','dragon',27,0);b.dragonHp=600;g.combat.start();g.state.data.hp.current=10;assert.equal(g.world.move('N'),false);assert.equal(g.state.qty('Potion'),0);g.combat.flee();g.place('Nature','forest',27,1);g.rng(.99);g.world.move('N');assert.equal(g.world.current().elementType,'Dragon');assert.equal(g.world.current().dragonHp,600);assert.equal(g.state.qty('Potion'),1);});
test('mushrooms spawn in Strongwood and heal without leaving the village',()=>{const g=game();g.rng(.5);const b=g.world.getOrCreateBlock(5,5);assert.equal(b.elementType,'Food');assert.equal(b.subtype,'mushrooms');g.state.data.x=5;g.state.data.y=5;g.state.data.hp.current=1;g.actions.eat();assert.equal(g.state.data.hp.current,50);});
test('walking pickup shows potion card and toast, then full healing clears the find',()=>{const g=game(new Map(),true);g.state.data.hp.current=10;g.ui.dispatch('move:N');assert.match(g.nodes.stage.innerHTML,/HEALING FOUND/);assert.match(g.nodes.stage.innerHTML,/DRINK POTION/);assert.match(g.nodes.toast.innerHTML,/POTION FOUND/);g.ui.dispatch('potion');assert.equal(g.state.data.hp.current,50);assert.equal(g.state.qty('Potion'),0);assert.equal(g.state.data.lastFind,null);assert.ok(!g.nodes.stage.innerHTML.includes('HEALING FOUND'));});
test('walking north then south preserves every discovered encounter across reloads without rerolling',()=>{
  const content=game().content;
  for(const e of Object.values(content.entities))for(const x of [3,30,-30]){
    if(e.type==='Home'||(e.id==='villager'&&Math.abs(x)>25))continue;
    const g=game(),b=g.place(e.type,e.id,x,3);
    if(e.type==='Landmark')g.state.data.village.visits[e.id]=true;
    if(e.type==='Dragon'){b.dragonHp=321;b.dragonMaxHp=500;}
    if(e.type==='BuriedItems'){b.digDepth=5;b.dug=2;}
    const original={type:b.elementType,id:b.subtype,dragonHp:b.dragonHp,dug:b.dug};
    g.place('Nature','dense-woodland',x,2);g.state.data.y=3;
    g.ctx.Math.random=()=>{throw Error('Revisiting discovered ground must not roll a new encounter');};
    for(let i=0;i<3;i++){
      assert.ok(g.world.move('N'));assert.equal(g.world.current().subtype,'dense-woodland');
      g.state.load();assert.ok(g.world.move('S'));g.state.load();
      const current=g.world.current();assert.deepEqual({type:current.elementType,id:current.subtype,dragonHp:current.dragonHp,dug:current.dug},original);
    }
  }
});
test('damage honors power, armor, misses and Lucky Coin accuracy',()=>{const g=game();g.rng(.91);const m={power:5,accuracy:90};assert.equal(g.combat.damage(5,m,10),0);assert.equal(g.combat.damage(5,m,10,true),9);g.rng(.9999);assert.equal(g.combat.damage(5,{power:0,accuracy:100},0),5);});
test('win clears coordinate, rewards once, and persists outcome',()=>{const g=game();g.rng(0);g.place('Danger','snake');g.combat.start();g.state.data.battle.enemy.hp=1;g.combat.attack(1);assert.equal(g.state.data.victories,1);assert.equal(g.world.current().elementType,'Nature');assert.equal(g.state.data.battle,null);assert.ok(g.state.data.outcome.win);const count=g.state.data.inventory.reduce((n,i)=>n+i.qty,0);assert.equal(count,1);g.state.load();assert.ok(g.state.data.outcome);g.combat.claim();g.combat.claim();assert.equal(g.state.data.inventory.reduce((n,i)=>n+i.qty,0),count);});
test('unconsciousness floors health at 1 without erasing the warrior',()=>{const g=game();g.place('Enemy','ogre',27,0);g.combat.start();g.state.data.battle.enemy.basePower=1000;g.state.data.battle.enemy.hp=1000;g.rng(0);g.combat.attack(0);assert.equal(g.state.data.hp.current,1);assert.equal(g.state.data.outcome.win,false);assert.equal(g.state.data.victories,0);assert.equal(g.world.current().elementType,'Home');assert.equal(g.world.at(27,0).elementType,'Enemy');assert.equal(g.state.data.x,0);assert.equal(g.state.data.y,0);});
test('magic is locked without crystal and consumed on use',()=>{const g=game();g.place('Danger','skeleton');g.combat.start();assert.equal(g.combat.attack(3),false);g.state.data.enchanted=true;g.state.add('MagicCrystal');g.rng(0);assert.ok(g.combat.attack(3));assert.equal(g.state.qty('MagicCrystal'),0);});
test('level five-win threshold improves gear, max health, and heals',()=>{const g=game();g.state.data.victories=5;g.state.data.hp.current=12;assert.equal(g.combat.levelUp(),1);assert.equal(g.state.data.level,2);assert.equal(g.state.data.hp.max,58);assert.equal(g.state.data.hp.current,58);assert.equal(g.state.data.weapon.basePower,6);assert.equal(g.state.data.armor.resistance,11);assert.equal(g.combat.levelUp(),0);});
test('each level consumes more new victories and carries excess wins forward once',()=>{
  const g=game(),costs=[5,8,12,17,26,38];let total=0;
  for(const [index,cost] of costs.entries()){
    assert.equal(g.content.required(index+1),cost);
    g.state.data.victories=total+cost-1;assert.equal(g.combat.levelUp(),0);assert.equal(g.state.levelProgress().remaining,1);
    g.state.data.victories++;assert.equal(g.combat.levelUp(),1);total+=cost;
    assert.equal(g.state.data.level,index+2);assert.equal(g.state.data.levelStartVictories,total);
    assert.equal(g.state.levelProgress().earned,0);assert.equal(g.combat.levelUp(),0);
    g.state.save();g.state.load();assert.equal(g.state.data.levelStartVictories,total);
  }
  const catchup=game();catchup.state.data.victories=15;assert.equal(catchup.combat.levelUp(),2);
  assert.equal(catchup.state.data.level,3);assert.equal(catchup.state.levelProgress().earned,2);
  assert.equal(catchup.state.levelProgress().remaining,10);assert.equal(catchup.state.data.victories,15);
  assert.equal(catchup.combat.levelUp(),0);
});
test('legacy progression preserves level and earned wins across repeated loads',()=>{
  const storage=new Map(),g=game(storage);g.state.data.level=3;g.state.data.victories=10;
  g.state.data.hp={current:40,max:70.6};g.state.data.weapon.basePower=7;g.state.data.armor.resistance=12;
  delete g.state.data.levelStartVictories;g.state.save();g.state.load();
  assert.equal(g.state.data.level,3);assert.equal(g.state.data.levelStartVictories,8);
  assert.equal(g.state.levelProgress().earned,2);assert.equal(g.state.levelProgress().remaining,10);
  assert.equal(g.state.data.hp.max,70.6);assert.equal(g.state.data.weapon.basePower,7);assert.equal(g.state.data.armor.resistance,12);
  assert.equal(g.combat.levelUp(),0);g.state.save();g.state.load();assert.equal(g.state.levelProgress().earned,2);
  g.state.data.victories=20;assert.equal(g.combat.levelUp(),1);assert.equal(g.state.data.level,4);
  assert.equal(g.state.data.levelStartVictories,20);assert.equal(g.state.levelProgress().remaining,17);
});
test('Hero progress and victory copy use current-level wins while keeping career victories',()=>{
  const g=game(new Map(),true);g.state.data.victories=7;g.combat.levelUp();g.ui.init();g.ui.route('hero');
  assert.match(g.nodes.stage.innerHTML,/2 \/ 8 WINS/);assert.match(g.nodes.stage.innerHTML,/width:25%/);
  assert.match(g.nodes.stage.innerHTML,/<strong>7<\/strong><span>VICTORIES/);
  g.place('Danger','snake');g.rng(0);g.combat.start();g.state.data.battle.enemy.hp=1;g.combat.attack(0);g.ui.route('aftermath');
  assert.match(g.nodes.stage.innerHTML,/5 MORE WINS TO LEVEL 3/);
  const e=g.combat.enemy(g.place('Enemy','ogre',27,0));assert.equal(e.maxHp,58);
});
test('dragon damage survives flee, revisits, and reload',()=>{const g=game();g.rng(0);const b=g.place('Dragon','dragon',27,0);b.dragonHp=500;g.combat.start();g.combat.attack(1);const hp=b.dragonHp;assert.ok(hp<500);g.combat.flee();g.state.load();g.combat.start();assert.equal(g.state.data.battle.enemy.hp,hp);assert.equal(g.state.data.battle.enemy.maxHp,500);});
test('bribe costs one gem, wins and removes enemy',()=>{const g=game();g.place('Enemy','troll',27,0);g.combat.start();assert.equal(g.combat.bribe(),false);g.state.add('Gem');g.rng(0);assert.ok(g.combat.bribe());assert.equal(g.state.qty('Gem'),0);assert.equal(g.state.data.victories,1);assert.equal(g.world.current().elementType,'Nature');});
test('dragon slain produces two large rewards and remains removed',()=>{const g=game();g.rng(0);const b=g.place('Dragon','dragon',27,0);b.dragonHp=1;g.combat.start();g.combat.attack(1);assert.equal(g.state.data.outcome.dragon,true);assert.equal(g.state.data.outcome.rewards.length,2);assert.ok(g.state.data.outcome.rewards.every(r=>r.qty>=3));assert.equal(g.world.current().dragonHp,null);});
test('active battle is serialized and movement is blocked',()=>{const g=game();g.place('Enemy','gargoyle',27,0);g.combat.start();const hp=g.state.data.battle.enemy.hp;assert.equal(g.world.move('N'),false);g.state.load();assert.equal(g.state.data.battle.enemy.hp,hp);assert.equal(g.state.data.x,27);});
test('food heals wounded warrior but poisons a full warrior',()=>{const g=game();g.rng(.99);g.place('Food','mushrooms',27,0);g.state.data.hp.current=3;g.actions.eat();assert.equal(g.state.data.hp.current,50);g.place('Food','mushrooms',28,0);g.actions.eat();assert.equal(g.state.data.hp.current,47);assert.equal(g.world.current().elementType,'Nature');});
test('digging spends health per foot and rewards only a completed dig',()=>{const g=game();g.rng(0);g.place('BuriedItems','dig');g.actions.dig();assert.equal(g.world.current().digDepth,3);assert.equal(g.state.data.hp.current,49);assert.equal(g.state.data.inventory.length,0);g.actions.dig();g.actions.dig();assert.equal(g.state.data.hp.current,47);assert.equal(g.world.current().elementType,'Nature');assert.equal(g.state.data.inventory.length,0);assert.equal(g.state.data.foundLoot.rewards.length,1);g.actions.gatherLoot();assert.equal(g.state.data.inventory.length,1);});
test('failed dig never rewards or kills',()=>{const g=game();g.place('BuriedItems','dig');g.rng(.99);g.state.data.hp.current=2;g.actions.dig();assert.equal(g.state.data.hp.current,1);assert.equal(g.state.data.inventory.length,0);assert.equal(g.actions.dig(),false);});
test('chest requires and consumes key once',()=>{const g=game();g.place('LockedItem','chest',27,0);assert.equal(g.actions.unlock(),false);g.state.add('Key');g.rng(0);g.actions.unlock();assert.equal(g.state.qty('Key'),0);assert.equal(g.world.current().elementType,'Nature');assert.equal(g.actions.unlock(),false);});
test('NPC attacks are dodged; talk resolves without damage',()=>{const g=game();g.place('NPC','villager');g.actions.talk(true);assert.equal(g.state.data.hp.current,50);assert.match(g.state.data.message,/move beyond your reach/);assert.equal(g.world.current().resolved,true);});
test('upgrades require a forge and charge exact increasing material costs',()=>{
  const g=game();g.state.add('MetalIngot',25);g.state.add('SteelIngot',20);g.place('Nature','forest');
  assert.equal(g.actions.atForge(),false);assert.equal(g.actions.craft('armor'),false);assert.equal(g.actions.craft('weapon'),false);
  assert.equal(g.state.qty('MetalIngot'),25);assert.equal(g.state.qty('SteelIngot'),20);
  g.place('Craft','forge');assert.equal(g.actions.craft('armor'),true);assert.equal(g.state.qty('MetalIngot'),15);assert.equal(g.actions.armorCost(),11);
  assert.equal(g.actions.craft('weapon'),true);assert.equal(g.state.qty('SteelIngot'),14);assert.equal(g.actions.weaponCost(),7);
});
test('potions heal fully and cannot be wasted at full health',()=>{const g=game();g.state.add('Potion',2);assert.equal(g.actions.potion(),false);g.state.data.hp.current=1;assert.equal(g.actions.potion(),true);assert.equal(g.state.data.hp.current,50);assert.equal(g.state.qty('Potion'),1);});
test('injury biases Potion and unique relics never duplicate',()=>{const g=game();g.state.data.hp.current=20;g.rng(.2);assert.equal(g.state.loot(),'Potion');g.state.data.enchanted=true;g.state.add('MagicCrystal');g.state.add('LuckyCoin');for(let i=0;i<101;i++){g.rng(i/101);assert.ok(!['MagicCrystal','LuckyCoin'].includes(g.state.loot()));}});
test('journal retains last 50 and reset removes only game save',()=>{const g=game();for(let i=0;i<70;i++)g.state.log('line '+i);assert.equal(g.state.data.journal.length,50);assert.equal(g.state.data.journal[0],'line 20');g.storage.set('unrelated','keep');g.state.reset();assert.equal(g.storage.get('unrelated'),'keep');assert.equal(g.storage.has(g.state.KEY),false);});
test('bad saves are preserved and reported without crashing',()=>{const g=game();g.storage.set(g.state.KEY,'{bad');assert.equal(g.state.load(),null);assert.ok(g.state.error);assert.equal(g.storage.get(g.state.KEY),'{bad');g.storage.set(g.state.KEY,JSON.stringify({version:99}));assert.equal(g.state.load(),null);});
test('storage errors return false and expose a warning',()=>{const g=game();g.ctx.localStorage.setItem=()=>{throw Error('quota');};assert.equal(g.state.save(),false);assert.match(g.state.error,/not saved/);});
test('all player screens render; HUD and navigation remain after embark',()=>{const g=game(new Map(),true);g.ui.init();assert.equal(g.ui.screen,'explore');for(const page of ['title','explore','encounter','pack','forge','map','hero','journal']){g.ui.route(page);assert.ok(g.nodes.stage.innerHTML.length>100,page);assert.ok(!g.nodes.stage.innerHTML.includes('undefined'),page);assert.equal(g.nodes.hud.hidden,false,page);assert.equal(g.nodes.nav.hidden,false,page);}assert.equal((g.nodes.stage.innerHTML.match(/journal-list/g)||[]).length,1);g.ui.route('title');assert.match(g.nodes.stage.innerHTML,/CONTINUE JOURNEY/);});
test('battle and aftermath screens preserve HUD; reload lands on Explore',()=>{const g=game(new Map(),true);g.place('Danger','snake');g.combat.start();g.ui.route('battle');assert.doesNotMatch(g.nodes.stage.innerHTML,/DEFEND YOUR REALM|STEEL MEETS SHADOW|round-label/);assert.match(g.nodes['combat-toasts'].innerHTML,/ROUND 1/);g.ui.init();assert.equal(g.ui.screen,'explore');assert.match(g.nodes.stage.innerHTML,/RESUME BATTLE/);g.state.data.battle.enemy.hp=1;g.rng(0);g.combat.attack(0);g.ui.route('aftermath');assert.match(g.nodes.stage.innerHTML,/YOU WIN/);assert.equal(g.nodes.hud.hidden,false);});
test('new player onboarding supports every weapon and name screen',()=>{const g=game(new Map(),true);g.state.reset();g.ui.init();assert.equal(g.ui.screen,'title');assert.equal(g.nodes.hud.hidden,true);g.ui.dispatch('embark');assert.match(g.nodes.stage.innerHTML,/ACCEPT ARMOR/);g.ui.dispatch('accept-armor');for(const type of Object.keys(g.content.weapons)){g.ui.dispatch('choose:'+type);assert.match(g.nodes.stage.innerHTML,new RegExp('TAKE THE '+type.toUpperCase()));}g.ui.dispatch('accept-weapon');assert.match(g.nodes.stage.innerHTML,/name-form/);assert.match(g.nodes.stage.innerHTML,/warrior-knife/);});
test('map renders exactly 121 cells and every entity selects realm-specific art',()=>{const g=game(new Map(),true);g.ui.route('map');assert.equal((g.nodes.stage.innerHTML.match(/role="gridcell"/g)||[]).length,121);for(const e of Object.values(g.content.entities)){for(const outer of [false,true]){g.place(e.type,e.id,outer?27:3,3);g.ui.route('encounter');assert.ok(!g.nodes.stage.innerHTML.includes('undefined'),e.id);const desc=g.world.description();assert.ok(g.nodes.stage.innerHTML.includes(g.ui.escape(desc)),e.id);}}});
test('user-controlled names are escaped in rendered HTML',()=>{const g=game(new Map(),true);g.state.data.name='<img onerror=alert(1)>';g.ui.route('hero');assert.ok(!g.nodes.stage.innerHTML.includes('<img onerror'));assert.match(g.nodes.stage.innerHTML,/&lt;IMG/);});
test('NPC reply replaces scenery in a named speech bubble until conversation ends',()=>{const g=game(new Map(),true);g.place('NPC','woodcutter');g.rng(0);g.ui.route('encounter');assert.match(g.nodes.stage.innerHTML,/freshly cut stump/);assert.ok(!g.nodes.stage.innerHTML.includes('data-typewriter'));g.ui.dispatch('talk');assert.equal(g.ui.screen,'encounter');assert.match(g.nodes.stage.innerHTML,/IN CONVERSATION/);assert.match(g.nodes.stage.innerHTML,/speech-bubble/);assert.match(g.nodes.stage.innerHTML,/THE WOODCUTTER/);assert.match(g.nodes.stage.innerHTML,/data-typewriter/);assert.ok(!g.nodes.stage.innerHTML.includes('freshly cut stump'));assert.ok(g.nodes.stage.innerHTML.includes('CHOOSE YOUR PATH'));assert.ok(!g.nodes.stage.innerHTML.includes('recent-message'));g.state.load();g.ui.init();assert.doesNotMatch(g.nodes.stage.innerHTML,/END CONVERSATION/);g.ui.dispatch('move:N');assert.equal(g.ui.screen,'explore');assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);assert.ok(!g.nodes.stage.innerHTML.includes('speech-bubble'));});
test('elder draws a spoken reply from the new dialogue pool',()=>{const g=game(new Map(),true);g.place('NPC','elder');g.rng(0);g.ui.dispatch('talk');assert.match(g.nodes.stage.innerHTML,/SPEAKING/);assert.match(g.nodes.stage.innerHTML,/Memory has its priorities/);assert.ok(g.nodes.stage.innerHTML.includes('data-typewriter'));});
test('ignoring a revisited NPC does not repeat an earlier conversation',()=>{const g=game(new Map(),true);g.place('NPC','villager');g.actions.talk();g.world.current().resolved=false;g.ui.dispatch('ignore');assert.ok(!g.nodes.stage.innerHTML.includes('speech-bubble'));assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);});
test('speech text types character by character and can be revealed immediately',()=>{const g=game(new Map(),true);g.place('NPC','villager');g.rng(0);let tick,cleared=false,el;const skip={disabled:false},label={textContent:''};const bubble={classList:{add(){},remove(){}},querySelector:s=>s==='.speech-skip'?skip:label,addEventListener(){},removeEventListener(){}};g.ctx.matchMedia=()=>({matches:false});g.ctx.setInterval=(fn,ms)=>{assert.equal(ms,12);tick=fn;return 123;};g.ctx.clearInterval=()=>{cleared=true;};g.ctx.document.querySelector=s=>{if(s!=='[data-typewriter]')return null;el={textContent:g.world.current().dialogue.text,closest:()=>bubble};return el;};g.ui.dispatch('talk');const full=g.world.current().dialogue.text;assert.equal(el.textContent,'');tick();assert.equal(el.textContent,full.slice(0,1));g.ui.dispatch('skip-dialogue');assert.equal(el.textContent,full);assert.equal(cleared,true);assert.equal(skip.disabled,true);assert.equal(label.textContent,'· SAID');});
test('exhaustion while digging returns home without erasing the dig site or granting loot',()=>{const g=game();g.place('BuriedItems','dig',-28,4);g.state.data.hp.current=2;g.rng(.99);g.actions.dig();assert.equal(g.state.data.x,0);assert.equal(g.state.data.y,0);assert.equal(g.state.data.hp.current,1);assert.equal(g.world.current().elementType,'Home');assert.equal(g.world.at(-28,4).elementType,'BuriedItems');assert.equal(g.world.at(-28,4).dug,1);assert.equal(g.state.data.inventory.length,0);});
test('poison sends the player home after consuming mushrooms at the original coordinate',()=>{const g=game();g.place('Food','mushrooms',27,6);g.state.data.level=20;g.rng(.99);g.actions.eat();assert.equal(g.state.data.hp.current,1);assert.equal(g.state.data.x,0);assert.equal(g.state.data.y,0);assert.equal(g.world.at(27,6).elementType,'Nature');assert.equal(g.world.at(0,0).elementType,'Home');});
test('losing to a dragon preserves its wounds, inventory and discoveries across reload',()=>{const g=game();const b=g.place('Dragon','dragon',30,-8);b.dragonHp=500;g.state.add('Gem',3);g.combat.start();g.state.data.battle.enemy.basePower=1000;g.rng(0);g.combat.attack(1);assert.equal(g.state.data.hp.current,1);assert.ok(b.dragonHp<500);const hp=b.dragonHp;assert.equal(g.state.data.outcome.win,false);assert.equal(g.state.data.x,0);assert.equal(g.state.data.y,0);g.state.load();assert.equal(g.world.at(30,-8).dragonHp,hp);assert.equal(g.state.qty('Gem'),3);assert.equal(g.state.data.victories,0);assert.equal(g.state.data.battle,null);});
function gameClock(g,start=1000000){let now=start;g.ctx.Date={now:()=>now};return {advance:ms=>now+=ms,set:ms=>now=ms,get now(){return now;}};}
test('old saves stranded at 1 HP are rescued on boot and recover gradually at home',()=>{const g=game(new Map(),true),clock=gameClock(g);g.place('Danger','snake',-27,2);g.state.data.hp.current=1;g.state.save();g.state.load();g.ui.init();assert.equal(g.state.data.x,0);assert.equal(g.state.data.y,0);assert.equal(g.ui.screen,'explore');assert.match(g.nodes.stage.innerHTML,/10:00/);assert.equal(g.world.move('N'),false);const journalLength=g.state.data.journal.length;g.ui.init();assert.equal(g.state.data.journal.length,journalLength);g.ui.dispatch('rest');assert.equal(g.state.data.hp.current,1);assert.equal(g.state.qty('Potion'),0);clock.advance(600000);g.state.load();assert.equal(g.state.data.hp.current,50);assert.ok(g.world.move('N'));assert.equal(g.state.data.y,-1);});
test('rest cannot be triggered away from home or through an unresolved battle result',()=>{const g=game(),clock=gameClock(g);g.place('Nature','forest',2,2);g.state.data.hp.current=10;assert.equal(g.actions.rest(),false);g.world.returnHome();g.state.data.outcome={win:false,rewards:[]};assert.equal(g.actions.rest(),false);g.combat.claim();assert.ok(g.actions.rest());assert.equal(g.state.data.hp.current,10);clock.advance(600000);g.state.syncRest();assert.equal(g.state.data.hp.current,50);assert.equal(g.actions.rest(),false);});
test('offline home healing is gradual, capped, and cannot be double-counted on reload',()=>{const g=game(),clock=gameClock(g);g.state.data.hp.current=1;g.actions.rest();clock.advance(300000);g.state.load();assert.equal(g.state.data.hp.current,25);g.state.save();g.state.load();assert.equal(g.state.data.hp.current,25);clock.advance(150000);g.state.load();assert.equal(g.state.data.hp.current,37);clock.advance(150000);g.state.load();assert.equal(g.state.data.hp.current,50);assert.equal(g.state.data.rest,null);g.state.save();const lines=g.state.data.journal.length;clock.advance(86400000);g.state.load();assert.equal(g.state.data.hp.current,50);assert.equal(g.state.data.journal.length,lines);});
test('leaving home stops rest and a later return starts a fresh clock',()=>{const g=game(),clock=gameClock(g);g.rng(.99);g.state.data.hp.current=1;g.actions.rest();clock.advance(60000);g.world.move('N');assert.equal(g.state.data.hp.current,5);assert.equal(g.state.data.rest,null);clock.advance(3600000);g.state.load();assert.equal(g.state.data.hp.current,5);g.world.move('S');assert.equal(g.state.data.hp.current,5);assert.equal(g.state.data.rest.startedAt,clock.now);clock.advance(60000);g.state.syncRest();assert.equal(g.state.data.hp.current,9);});
test('time away during battle grants no health and preserves the encounter',()=>{const g=game(),clock=gameClock(g);g.place('Enemy','ogre',27,0);g.state.data.hp.current=10;g.combat.start();const hp=g.state.data.battle.enemy.hp;clock.advance(3600000);g.state.load();assert.equal(g.state.data.hp.current,10);assert.equal(g.state.data.battle.enemy.hp,hp);assert.equal(g.state.data.rest,null);assert.equal(g.state.data.x,27);});
test('potions heal instantly during rest and are not wasted after offline recovery',()=>{const g=game(),clock=gameClock(g);g.state.data.hp.current=1;g.state.add('Potion',2);g.actions.rest();clock.advance(10000);assert.equal(g.actions.potion(),true);assert.equal(g.state.data.hp.current,50);assert.equal(g.state.qty('Potion'),1);assert.equal(g.state.data.rest,null);g.state.data.hp.current=1;g.actions.rest();clock.advance(600000);assert.equal(g.actions.potion(),false);assert.equal(g.state.qty('Potion'),1);assert.equal(JSON.parse(g.storage.get(g.state.KEY)).hp.current,50);});
test('rest scales with maximum health and handles clock rollback without granting health',()=>{const g=game(),clock=gameClock(g);g.state.data.hp.max=200;g.state.data.hp.current=1;g.actions.rest();clock.advance(300000);g.state.syncRest();assert.equal(g.state.data.hp.current,100);clock.advance(300000);g.state.syncRest();assert.equal(g.state.data.hp.current,200);g.state.data.hp.current=10;g.actions.rest();clock.set(100);g.state.syncRest();assert.equal(g.state.data.hp.current,10);assert.equal(g.state.data.rest.startedAt,100);});
test('live home countdown updates and leaving becomes available after the first recovered HP',()=>{const g=game(new Map(),true),clock=gameClock(g);let tick;g.ctx.setInterval=(fn,ms)=>{if(ms===1000)tick=fn;return 1;};g.state.data.hp.current=1;g.ui.init();g.nodes['rest-countdown']={textContent:'10:00'};clock.advance(10000);tick();assert.equal(g.nodes['rest-countdown'].textContent,'9:50');assert.equal(g.state.data.hp.current,1);clock.advance(3000);tick();assert.equal(g.state.data.hp.current,2);assert.match(g.nodes.stage.innerHTML,/Leave whenever you like/);assert.ok(!g.nodes.stage.innerHTML.includes('data-action="move:N" disabled'));clock.advance(600000);tick();assert.equal(g.state.data.hp.current,50);assert.match(g.nodes.toast.innerHTML,/FULLY RESTED/);});
test('hostile tiles offer battle or walking directly without an investigation step',()=>{for(const [type,id] of [['Danger','snake'],['Enemy','ogre'],['Dragon','dragon']]){const g=game(new Map(),true),b=g.place(type,id,27,0);if(type==='Dragon')b.dragonHp=500;g.ui.route('explore');assert.match(g.nodes.stage.innerHTML,/ENTER BATTLE/);assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);assert.doesNotMatch(g.nodes.stage.innerHTML,/KEEP WALKING|INVESTIGATE|data-action="ignore"/);g.ui.dispatch('ignore');assert.equal(g.state.data.battle,null);assert.equal(g.state.data.victories,0);assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);b.resolved=false;g.ui.route('explore');g.ui.dispatch('fight');assert.equal(g.ui.screen,'battle');assert.equal(g.state.data.battle.enemyId,id);}});
function roundTimers(g){let next=0;const pending=new Map();g.ctx.setTimeout=(fn,ms)=>{const id=++next;pending.set(id,{fn,ms});return id;};g.ctx.clearTimeout=id=>pending.delete(id);return {beat(){const entry=[...pending].find(([,t])=>t.ms===950);if(entry){pending.delete(entry[0]);entry[1].fn();}},flush(){while([...pending.values()].some(t=>t.ms===950))this.beat();},pending};}
test('completed dig shows saved loot to gather, then announces it exactly once',()=>{const g=game(new Map(),true);g.place('BuriedItems','dig',3,3);g.rng(0);g.ui.route('encounter');g.ui.dispatch('dig');g.ui.dispatch('dig');assert.equal(g.state.data.foundLoot,null);g.ui.dispatch('dig');assert.match(g.nodes.stage.innerHTML,/TREASURE UNEARTHED/);assert.match(g.nodes.stage.innerHTML,/GATHER LOOT/);assert.match(g.nodes.stage.innerHTML,/>Potion</);assert.match(g.nodes.stage.innerHTML,/>\+1</);assert.doesNotMatch(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);assert.equal(g.state.qty('Potion'),0);assert.equal(g.world.move('N'),false);const pending=JSON.stringify(g.state.data.foundLoot);g.state.load();g.ui.init();assert.equal(JSON.stringify(g.state.data.foundLoot),pending);assert.match(g.nodes.stage.innerHTML,/GATHER LOOT/);assert.equal(g.actions.dig(),false);g.ui.dispatch('gather-loot');assert.equal(g.state.qty('Potion'),1);assert.equal(g.state.data.foundLoot,null);assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);assert.match(g.nodes.toast.innerHTML,/LOOT GATHERED/);assert.match(g.nodes.toast.innerHTML,/\+1 Potion/);assert.equal(g.nodes.toast.className,'toast-reward');g.ui.dispatch('gather-loot');g.state.load();assert.equal(g.state.qty('Potion'),1);assert.equal(g.state.data.foundLoot,null);});
test('a dig ending in exhaustion never offers treasure or a gather action',()=>{const g=game(new Map(),true);g.place('BuriedItems','dig',3,3);g.state.data.hp.current=2;g.rng(0);g.ui.dispatch('dig');assert.equal(g.world.current().elementType,'Home');assert.equal(g.state.data.foundLoot,null);assert.equal(g.actions.gatherLoot(),false);assert.equal(g.state.data.inventory.length,0);assert.doesNotMatch(g.nodes.stage.innerHTML,/GATHER LOOT|TREASURE UNEARTHED/);});
test('all five NPCs have 25 Strongwood, 25 Outer Realm and 10 attacked lines with unique text',()=>{const g=game(),seen=new Set(),ids=new Set();const types=Object.values(g.content.entities).filter(e=>e.type==='NPC').map(e=>e.id);assert.equal(types.length,5);for(const type of types)for(const [context,count] of [['strongwood',25],['outer',25],['attacked',10]]){const lines=g.dialogue.pools[type][context];assert.equal(lines.length,count,type+'.'+context);for(const line of lines){assert.ok(line.text.trim());assert.ok(!seen.has(line.text),line.text);assert.ok(!ids.has(line.id),line.id);seen.add(line.text);ids.add(line.id);}if(context!=='attacked')for(const [tone,count] of [['life',8],['tip',7],['rambling',5],['gruff',5]])assert.equal(lines.filter(l=>l.tone===tone).length,count);}assert.equal(seen.size,300);});
test('NPC dialogue selects by role and realm, reaches every line, and saves without consecutive repeats',()=>{for(const type of ['villager','farmer','woodcutter','hunter','elder'])for(const context of ['strongwood','outer','attacked']){const g=game();const x=context==='outer'?27:3;const pool=g.dialogue.pools[type][context];for(let i=0;i<pool.length;i++){g.state.data.dialogueLast={};g.place('NPC',type,x,3);g.rng((i+.5)/pool.length);g.actions.talk(context==='attacked');assert.equal(g.world.current().dialogue.id,pool[i].id);assert.equal(g.world.current().dialogue.text,'“'+pool[i].text+(context==='attacked'?'':' '+g.village.reminder(type))+'”');assert.equal(g.state.data.hp.current,50);}g.rng(0);g.state.data.dialogueLast={};g.actions.talk(context==='attacked');const first=g.world.current().dialogue.id;g.state.load();g.actions.talk(context==='attacked');assert.notEqual(g.world.current().dialogue.id,first);assert.ok(g.world.current().dialogue.spoken);}});
test('HUD equipment details preserve encounters and cannot enhance away from a forge',()=>{
  const g=game(new Map(),true),b=g.place('Enemy','ogre',27,0);g.state.add('SteelIngot',60);g.ui.route('explore');
  assert.match(g.nodes.hud.innerHTML,/aria-label="Weapon details"/);assert.match(g.nodes.hud.innerHTML,/aria-label="Armor details"/);
  assert.match(g.nodes.hud.innerHTML,/stat-cell ready/);
  for(const type of ['weapon','armor']){g.ui.dispatch('forge:'+type);assert.equal(g.ui.screen,'forge');assert.match(g.nodes.stage.innerHTML,/Visit a forge to enhance/);assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="craft:/);}
  g.ui.dispatch('craft:weapon');assert.equal(g.state.data.weapon.basePower,5);assert.equal(g.state.qty('SteelIngot'),60);
  g.ui.dispatch('route:explore');assert.equal(b.resolved,false);assert.match(g.nodes.stage.innerHTML,/ENTER BATTLE/);
  g.combat.start();g.ui.dispatch('forge:weapon');assert.match(g.nodes.stage.innerHTML,/BACK TO BATTLE/);assert.equal(g.actions.craft('weapon'),false);assert.ok(g.state.data.battle);
});
test('forge retains the other upgrade while bottom navigation returns to exploring',()=>{const g=game(new Map(),true);g.place('Craft','forge');g.state.add('MetalIngot',10);g.state.add('SteelIngot',6);g.ui.dispatch('forge:armor');assert.match(g.nodes.stage.innerHTML,/id="forge-weapon"/);g.ui.dispatch('craft:armor');assert.equal(g.state.data.armor.resistance,11);assert.match(g.nodes.stage.innerHTML,/id="forge-weapon"/);g.ui.dispatch('forge:weapon');assert.equal(g.state.qty('SteelIngot'),6);assert.match(g.nodes.stage.innerHTML,/id="forge-armor"/);g.ui.dispatch('craft:weapon');assert.equal(g.state.data.weapon.basePower,6);assert.doesNotMatch(g.nodes.stage.innerHTML,/BACK TO EXPLORING/);assert.match(g.nodes.nav.innerHTML,/data-action="route:explore"/);g.ui.dispatch('route:explore');assert.equal(g.ui.screen,'explore');assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);});
test('combat reveals independent hit and miss rolls on separate beats with matching vitality',()=>{for(const playerMiss of [true,false]){const g=game(new Map(),true),timers=roundTimers(g);g.place('Enemy','ogre',27,0);g.combat.start();g.ui.route('battle');const rolls=playerMiss?[.9999,0,0]:[0,0,.9999];g.ctx.Math.random=()=>rolls.shift()??0;g.ui.dispatch('attack:1');const health=g.state.data.hp.current;assert.match(g.nodes['combat-toasts'].innerHTML,playerMiss?/YOU MISSED/:/YOU HIT/);assert.doesNotMatch(g.nodes.stage.innerHTML,/round-feedback|combat-log/);assert.doesNotMatch(g.nodes['combat-toasts'].innerHTML,/YOU TOOK DAMAGE|ENEMY MISSED/);assert.doesNotMatch(g.nodes.stage.innerHTML,/YOU TOOK DAMAGE|ENEMY MISSED|struck-player/);assert.doesNotMatch(g.nodes.stage.innerHTML,/impact-badge|HIT LANDED|DAMAGE TAKEN|ATTACK MISSED|DODGED/);assert.match(g.nodes.stage.innerHTML,new RegExp('fighter player fighter-pulse '+(playerMiss?'border-miss':'border-hit')));if(!playerMiss)assert.match(g.nodes.stage.innerHTML,/fighter enemy fighter-pulse border-hurt/);assert.match(g.nodes.hud.innerHTML,/aria-valuenow="50"/);assert.equal(JSON.parse(g.storage.get(g.state.KEY)).hp.current,health);g.ui.dispatch('attack:1');assert.equal(g.state.data.battle.round,2);timers.beat();assert.match(g.nodes['combat-toasts'].innerHTML,playerMiss?/YOU TOOK DAMAGE/:/ENEMY MISSED/);assert.doesNotMatch(g.nodes.stage.innerHTML,/ENEMY PREPARING|struck-enemy/);assert.match(g.nodes.stage.innerHTML,new RegExp('fighter enemy fighter-pulse '+(playerMiss?'border-hit':'border-miss')));assert.doesNotMatch(g.nodes.stage.innerHTML,/impact-badge/);if(playerMiss)assert.match(g.nodes.stage.innerHTML,/fighter player fighter-pulse border-hurt/);assert.equal(g.nodes.hud.innerHTML.includes('vitality-damaged'),playerMiss);g.ui.dispatch('attack:1');assert.equal(g.state.data.battle.round,2);timers.beat();assert.match(g.nodes.stage.innerHTML,/MAKE YOUR MOVE/);assert.equal(g.state.data.hp.current,health);}});
test('poison announces actual health loss and animates vitality without replay on navigation',()=>{const g=game(new Map(),true);g.place('Food','mushrooms',3,3);g.ui.route('encounter');g.rng(.99);const effects=[];g.nodes.stage.classList.add=name=>effects.push(name);g.ui.dispatch('eat');assert.equal(g.state.data.hp.current,47);assert.match(g.nodes.toast.innerHTML,/POISONED · −3 HP/);assert.equal(g.nodes.toast.className,'toast-danger');assert.match(g.nodes.hud.innerHTML,/vitality-damaged/);assert.match(g.nodes.hud.innerHTML,/−3 HP/);assert.match(g.nodes.hud.innerHTML,/--hp-before:100%/);assert.ok(effects.includes('damage-taken'));g.ui.route('pack');assert.doesNotMatch(g.nodes.hud.innerHTML,/vitality-damaged/);assert.equal(effects.length,1);});
test('digging and combat losses animate vitality while healing and loading do not',()=>{const g=game(new Map(),true),timers=roundTimers(g);g.place('BuriedItems','dig',3,3);g.ui.route('encounter');g.rng(0);g.ui.dispatch('dig');assert.match(g.nodes.hud.innerHTML,/−1 HP/);g.state.add('Potion');g.ui.dispatch('potion');assert.doesNotMatch(g.nodes.hud.innerHTML,/vitality-damaged/);g.place('Enemy','ogre',27,0);g.combat.start();g.ui.route('battle');g.ui.dispatch('attack:0');assert.doesNotMatch(g.nodes.hud.innerHTML,/vitality-damaged/);timers.beat();assert.match(g.nodes.hud.innerHTML,/vitality-damaged/);g.state.save();g.state.load();g.ui.route('explore');assert.doesNotMatch(g.nodes.hud.innerHTML,/vitality-damaged/);});
test('poison rescue reports only HP actually lost and healthy mushrooms show no damage',()=>{const g=game(new Map(),true);g.place('Food','mushrooms',27,0);g.state.data.level=100;g.ui.route('encounter');g.rng(.99);g.ui.dispatch('eat');assert.equal(g.state.data.hp.current,1);assert.equal(g.world.current().elementType,'Home');assert.match(g.nodes.toast.innerHTML,/−49 HP/);assert.match(g.nodes.hud.innerHTML,/−49 HP/);g.place('Food','mushrooms',3,3);g.ui.route('encounter');g.ui.dispatch('eat');assert.equal(g.state.data.hp.current,50);assert.match(g.nodes.toast.innerHTML,/HEALTH RESTORED/);assert.doesNotMatch(g.nodes.hud.innerHTML,/vitality-damaged/);});
test('winning blows announce defeat immediately with no delayed enemy toast or duplicate victory',()=>{
  for(const magic of [false,true]){
    const g=game(new Map(),true),timers=roundTimers(g);g.place('Danger','snake');g.rng(0);g.combat.start();g.state.data.battle.enemy.hp=1;if(magic){g.state.data.enchanted=true;g.state.add('MagicCrystal');}g.ui.route('battle');
    g.ui.dispatch('attack:'+(magic?3:1));assert.equal(g.ui.screen,'battle');assert.match(g.nodes.stage.innerHTML,/combat-impact/);
    const stack=g.nodes['combat-toasts'];assert.equal(stack.children.length,1);assert.match(stack.innerHTML,/ENEMY VANQUISHED/);assert.match(stack.innerHTML,/vanquished Briar Snake · ROUND 1/);assert.match(stack.innerHTML,magic?/magic-hit/:/round-event hit/);assert.doesNotMatch(stack.innerHTML,/No counterattack|KO|YOU TOOK DAMAGE/);
    const immediate=stack.innerHTML;g.ui.dispatch('attack:1');assert.equal(g.state.data.victories,1);timers.flush();assert.equal(g.ui.screen,'aftermath');assert.equal(stack.children.length,1);assert.equal(stack.innerHTML,immediate);assert.match(g.nodes.stage.innerHTML,/YOUR REWARDS/);assert.match(g.nodes.stage.innerHTML,/Metal Ingot/);
  }
});
test('double misses stay blue/neutral with explicit labels and no screen shake',()=>{const g=game(new Map(),true),timers=roundTimers(g);g.place('Enemy','ogre',27,0);g.combat.start();g.rng(.9999);g.ui.route('battle');g.ui.dispatch('attack:1');assert.equal(g.state.data.battle.lastRound.dealt,0);assert.equal(g.state.data.battle.lastRound.received,0);assert.match(g.nodes['combat-toasts'].innerHTML,/YOU MISSED/);assert.doesNotMatch(g.nodes.stage.innerHTML,/ENEMY MISSED/);timers.beat();assert.match(g.nodes['combat-toasts'].innerHTML,/ENEMY MISSED/);assert.match(g.nodes['combat-toasts'].innerHTML,/round-event miss/);assert.ok(!g.nodes.stage.innerHTML.includes('combat-impact'));timers.flush();assert.match(g.nodes.stage.innerHTML,/MAKE YOUR MOVE/);});
test('defeat shows red damage and recovery, never reward collection',()=>{const g=game(new Map(),true),timers=roundTimers(g);g.place('Enemy','ogre',27,0);g.combat.start();g.state.data.battle.enemy.hp=1000;g.state.data.battle.enemy.basePower=1000;g.rng(0);g.ui.route('battle');g.ui.dispatch('attack:0');assert.doesNotMatch(g.nodes.stage.innerHTML,/round-event hurt/);timers.beat();assert.match(g.nodes['combat-toasts'].innerHTML,/round-event hurt/);assert.match(g.nodes['combat-toasts'].innerHTML,/YOU TOOK DAMAGE/);timers.flush();assert.match(g.nodes.stage.innerHTML,/WAKE AT HOME/);assert.match(g.nodes.stage.innerHTML,/NO LOOT THIS TIME/);assert.ok(!g.nodes.stage.innerHTML.includes('CLAIM REWARDS'));assert.ok(!g.nodes.stage.innerHTML.includes('result-stat'));g.state.load();g.ui.init();assert.match(g.nodes.stage.innerHTML,/>RECOVER</);assert.ok(!g.nodes.stage.innerHTML.includes('CLAIM REWARDS'));g.ui.route('aftermath');g.ui.dispatch('recover');assert.equal(g.ui.screen,'explore');assert.equal(g.state.data.hp.current,1);assert.equal(g.world.current().resolved,true);assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);assert.match(g.nodes.toast.innerHTML,/SAFELY HOME/);assert.equal(g.state.data.inventory.length,0);});
test('claim toast identifies quantities, merges duplicate loot and never re-awards it',()=>{const g=game(new Map(),true);g.state.add('MetalIngot',5);g.state.add('Gem',1);g.state.data.outcome={win:true,rewards:[{type:'MetalIngot',qty:2},{type:'MetalIngot',qty:3},{type:'Gem',qty:1}],levels:0,enemy:'Ogre',art:'warrior-sword'};g.ui.route('aftermath');assert.equal((g.nodes.stage.innerHTML.match(/class="reward-item"/g)||[]).length,2);assert.match(g.nodes.stage.innerHTML,/>\+5</);g.ui.dispatch('claim');assert.match(g.nodes.toast.innerHTML,/LOOT SECURED/);assert.match(g.nodes.toast.innerHTML,/\+5 Metal Ingot · \+1 Gem/);assert.equal(g.nodes.toast.className,'toast-reward');g.ui.dispatch('claim');assert.equal(g.state.qty('MetalIngot'),5);assert.equal(g.state.qty('Gem'),1);});
test('leaving battle cancels the pending presentation timer without discarding its outcome',()=>{const g=game(new Map(),true),timers=roundTimers(g);g.place('Danger','snake');g.combat.start();g.state.data.battle.enemy.hp=1;g.rng(0);g.ui.route('battle');g.ui.dispatch('attack:1');g.ui.route('pack');timers.flush();assert.equal(g.ui.screen,'pack');assert.equal(g.state.data.outcome.win,true);g.ui.route('explore');assert.match(g.nodes.stage.innerHTML,/VIEW REWARDS/);});
test('magic has its own outcome color and consumes a crystal exactly once',()=>{const g=game(new Map(),true);roundTimers(g);g.place('Enemy','ogre',27,0);g.combat.start();g.state.data.battle.enemy.hp=1000;g.state.data.enchanted=true;g.state.add('MagicCrystal');g.rng(0);g.ui.route('battle');g.ui.dispatch('attack:3');assert.match(g.nodes['combat-toasts'].innerHTML,/round-event magic-hit/);assert.match(g.nodes['combat-toasts'].innerHTML,/Realmfire/);assert.equal(g.state.qty('MagicCrystal'),0);g.ui.dispatch('attack:3');assert.equal(g.state.data.battle.round,2);});
test('each weapon has exactly one stagger move on its heavy strike',()=>{
  const heavy={Sword:'Cleave',Axe:'Execution',Hammer:'Earthshaker',Knife:'Backstab'};
  for(const [type,name] of Object.entries(heavy)){
    const moves=game().content.weapon(type).moves;
    assert.equal(moves.filter(m=>m.stagger).length,1,type);
    assert.equal(moves.find(m=>m.name===name).stagger,true);
    assert.ok(moves.filter(m=>['Tackle',type==='Sword'?'Slash':type==='Axe'?'Chop':type==='Hammer'?'Crush':'Stab','Realmfire'].includes(m.name)).every(m=>!m.stagger));
  }
});
test('a landed heavy hit skips the enemy response; misses and light hits do not',()=>{
  const g=game();g.place('Enemy','ogre',27,0);g.combat.start();
  const hp=g.state.data.hp.current,enemyHp=g.state.data.battle.enemy.hp;
  g.rng(0);assert.ok(g.combat.attack(2));
  assert.equal(g.state.data.battle.lastRound.stagger,true);
  assert.equal(g.state.data.battle.lastRound.received,null);
  assert.equal(g.state.data.hp.current,hp);
  assert.ok(g.state.data.battle.enemy.hp<enemyHp);
  assert.equal(g.state.data.battle.round,2);
  assert.equal(g.state.data.outcome,null);
  g.rng(.9999);g.combat.attack(2);
  assert.equal(g.state.data.battle.lastRound.stagger,false);
  assert.notEqual(g.state.data.battle.lastRound.received,null);
  assert.ok(g.state.data.battle.lastRound.reply);
  const light=game();light.place('Enemy','ogre',27,0);light.combat.start();
  light.rng(0);light.combat.attack(1);
  assert.equal(light.state.data.battle.lastRound.stagger,false);
  assert.notEqual(light.state.data.battle.lastRound.received,null);
  assert.ok(light.state.data.hp.current<50);
  const kill=game();kill.place('Danger','snake');kill.combat.start();
  kill.state.data.battle.enemy.hp=1;kill.rng(0);kill.combat.attack(2);
  assert.equal(kill.state.data.outcome.win,true);
  assert.equal(kill.state.data.outcome.lastRound.stagger,false);
  assert.equal(kill.state.data.battle,null);
});
test('staggered heavy hits announce immediately with no enemy counter toast',()=>{
  const g=game(new Map(),true),timers=roundTimers(g);g.place('Enemy','ogre',27,0);g.combat.start();g.rng(0);g.ui.route('battle');
  g.ui.dispatch('attack:2');assert.equal(g.ui.screen,'battle');
  const stack=g.nodes['combat-toasts'];
  assert.match(stack.innerHTML,/STAGGERED/);assert.match(stack.innerHTML,/NO COUNTER/);assert.match(stack.innerHTML,/round-event hit/);
  assert.doesNotMatch(stack.innerHTML,/ENEMY VANQUISHED|YOU TOOK DAMAGE|ENEMY MISSED/);
  assert.equal(g.state.data.hp.current,50);assert.equal(g.state.data.battle.round,2);
  g.ui.dispatch('attack:2');assert.equal(g.state.data.battle.round,2);
  timers.flush();assert.equal(g.ui.screen,'battle');assert.equal(g.state.data.outcome,null);
  assert.match(g.nodes.stage.innerHTML,/MAKE YOUR MOVE/);
});
if(process.env.ASSET_AUDIT){test('every rendered image, manifest entry and stylesheet reference exists',()=>{const g=game(new Map(),true);const refs=new Set();const collect=()=>{for(const html of [g.nodes.stage.innerHTML,g.nodes.hud.innerHTML])for(const m of html.matchAll(/(?:src|href)="(assets\/[^"#]+)"/g))refs.add(m[1]);};g.ui.init();for(const page of ['title','explore','pack','forge','map','hero','journal']){g.ui.route(page);collect();}for(const e of Object.values(g.content.entities))for(const outer of [false,true]){g.place(e.type,e.id,outer?27:3,3);g.ui.route('encounter');collect();}for(const type of Object.keys(g.content.weapons)){g.state.data.weapon=g.content.weapon(type);g.ui.route('hero');collect();}for(const m of fs.readFileSync(path.join(root,'css/game.css'),'utf8').matchAll(/url\(['"]?\.\.\/(assets\/[^)'";]+)['"]?\)/g))refs.add(m[1]);const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8'));for(const entry of Object.values(manifest))for(const k of ['file','village','outer'])if(entry[k])refs.add('assets/'+entry[k]);for(const ref of refs)assert.ok(fs.existsSync(path.join(root,ref)),ref);console.log('Verified '+refs.size+' distinct referenced assets.');});}


test('defeated coordinates stay safe across repeated walks and reloads without farmable rewards',()=>{
  for(const [type,id,x] of [['Danger','bat',3],['Enemy','ogre',27],['Dragon','dragon',27]]){
    const g=game(new Map(),true);g.rng(0);const tile=g.place(type,id,x,3);
    if(type==='Dragon')tile.dragonHp=300;
    g.combat.start();g.state.data.battle.enemy.hp=1;g.combat.attack(0);g.combat.claim();
    const loot=JSON.stringify(g.state.data.inventory);
    for(let i=0;i<4;i++){
      assert.ok(g.world.move('E'));assert.ok(g.world.move('W'));g.state.load();
      assert.equal(g.world.current().elementType,'Nature');assert.equal(g.world.current().cleared,true);
      assert.equal(g.combat.start(),false);assert.equal(g.state.data.victories,1);
      assert.equal(JSON.stringify(g.state.data.inventory),loot);
    }
    g.ui.route('explore');assert.match(g.nodes.stage.innerHTML,/No threat remains here/);
    assert.doesNotMatch(g.nodes.stage.innerHTML,/ENTER BATTLE/);
  }
});

test('bribed threats stay cleared while fleeing leaves an undefeated threat behind',()=>{
  const g=game();g.place('Enemy','ogre',27,3);g.state.add('Gem');g.combat.start();g.combat.bribe();g.combat.claim();
  g.world.move('E');g.world.move('W');assert.equal(g.world.current().cleared,true);assert.equal(g.combat.start(),false);
  const h=game();h.place('Danger','bat');h.combat.start();h.combat.flee();h.world.move('E');h.world.move('W');
  assert.equal(h.world.current().elementType,'Danger');assert.ok(!h.world.current().cleared);assert.ok(h.combat.start());
});

test('legacy resolved clearings migrate safely without marking new resource clearings as victories',()=>{
  const g=game();g.place('Danger','skeleton');g.world.clear();delete g.world.current().cleared;
  g.state.save();g.state.load();assert.equal(g.world.current().cleared,true);
  g.world.move('E');g.world.move('W');assert.equal(g.world.current().elementType,'Nature');
  const h=game();h.place('Food','mushrooms');h.state.data.hp.current=25;h.actions.eat();h.state.load();
  assert.equal(h.world.current().cleared,false);
});

test('creatures use natural attacks and small creatures have no armor at any level',()=>{
  for(const id of ['bat','snake','spider','gargoyle','dragon'])for(const level of [1,20]){
    const g=game(new Map(),true);g.state.data.level=level;
    const type=g.content.entities[id].type,b=g.place(type,id,27,3);if(id==='dragon')b.dragonHp=500;
    g.combat.start();const e=g.state.data.battle.enemy;
    assert.equal(e.weapon,null);assert.ok(e.attackStyle);assert.ok(e.moves.every(m=>m.accuracy>0&&m.accuracy<=100));
    assert.ok(e.moves.every(m=>!['Stab','Backstab','Slash','Cleave','Crush','Earthshaker','Chop','Execution'].includes(m.name)));
    if(['bat','snake','spider'].includes(id)){assert.equal(e.resistance,0);assert.equal(e.defense,null);}
    else{assert.ok(e.resistance>0);assert.ok(['Scales','Stone hide'].includes(e.defense));}
    g.ui.route('battle');const enemyCard=g.nodes.stage.innerHTML.match(/class="fighter enemy"><div class="fighter-info">([\s\S]*?)<\/div><\/div>/)[1];
    assert.doesNotMatch(enemyCard,/% ARM|Knife|Sword|Hammer/);assert.match(enemyCard,/Fangs|Talons|Claws/);
  }
  for(const [id,weapon] of [['skeleton','Sword'],['ogre','Axe'],['troll','Hammer']]){
    const g=game();g.place(g.content.entities[id].type,id,27,3);g.combat.start();
    assert.equal(g.state.data.battle.enemy.weapon,weapon);assert.ok(g.state.data.battle.enemy.resistance>0);
  }
});

test('an existing creature battle sheds old equipment without losing health or progress',()=>{
  const g=game();g.place('Danger','bat');g.combat.start();const e=g.state.data.battle.enemy;
  Object.assign(e,{hp:12,weapon:'Knife',resistance:15,moves:g.content.weapon('Knife').moves.filter(m=>!m.magic)});
  delete e.attackStyle;delete e.defense;g.state.data.battle.round=4;g.state.save();g.state.load();
  const saved=g.state.data.battle;assert.equal(saved.round,4);assert.equal(saved.enemy.hp,12);
  assert.equal(saved.enemy.weapon,null);assert.equal(saved.enemy.resistance,0);
  assert.deepEqual(Array.from(saved.enemy.moves,m=>m.name),['Wing Bash','Bite','Diving Bite']);
});


test('passing any NPC silently clears old narration and returns to directions without journal noise',()=>{
  for(const id of ['villager','farmer','woodcutter','hunter','elder'])for(const x of [3,27]){
    const g=game(new Map(),true);g.place('NPC',id,x,3);g.state.log('An earlier event.');
    const count=g.state.data.journal.length;g.ui.dispatch('ignore');
    assert.equal(g.state.data.message,'');assert.equal(g.state.data.journal.length,count);
    assert.equal(g.world.current().resolved,true);assert.match(g.nodes.stage.innerHTML,/CHOOSE YOUR PATH/);
    assert.doesNotMatch(g.nodes.stage.innerHTML,/recent-message|An earlier event|Another fight/);
    g.state.load();g.ui.route('explore');assert.doesNotMatch(g.nodes.stage.innerHTML,/recent-message/);
  }
});

test('old generic walking-away banners disappear on load while journal history stays intact',()=>{
  for(const line of ['Not every shadow needs your steel.','You leave it to the forest.','Another day. Another fight.']){
    const g=game(new Map(),true);g.place('NPC','elder');g.world.current().resolved=true;
    g.state.log(line);g.state.save();g.state.load();g.ui.route('explore');
    assert.equal(g.state.data.message,'');assert.equal(g.state.data.journal.at(-1),line);
    assert.doesNotMatch(g.nodes.stage.innerHTML,/recent-message/);
  }
});

test('walking-away narration reflects threats, untouched items, used forges and partial digs',()=>{
  for(const [type,id,pattern] of [
    ['Danger','bat',/You avoid Angry Bat. The threat remains here/],
    ['Enemy','ogre',/You avoid Ironjaw Ogre. The threat remains here/],
    ['Dragon','dragon',/You avoid Verdant Dragon. The threat remains here/],
    ['Food','mushrooms',/mushrooms untouched/],['LockedItem','chest',/chest locked/],
    ['BuriedItems','dig',/disturbed earth untouched/],['Craft','forge',/step away from the forge/]
  ]){
    const g=game();const b=g.place(type,id,27,3);g.actions.ignore();
    assert.match(g.state.data.message,pattern);assert.equal(b.elementType,type);
    assert.doesNotMatch(g.state.data.message,/Another day|Another fight|leave it to the forest|poison/i);
  }
  const g=game();g.place('BuriedItems','dig');g.rng(0);g.actions.dig();g.actions.ignore();
  assert.match(g.state.data.message,/stop digging.*unfinished hole/);assert.equal(g.world.current().dug,1);
  g.place('Craft','forge');g.state.add('SteelIngot',6);g.actions.craft('weapon');g.actions.ignore();
  assert.match(g.state.data.message,/step away from the forge/);assert.equal(g.state.data.weapon.basePower,6);
});

test('weapon narration fits hammers and chest narration identifies the actual collected loot',()=>{
  const g=game(new Map(),true);g.state.data.weapon=g.content.weapon('Hammer');g.place('NPC','elder');
  g.actions.talk(true);assert.match(g.world.current().dialogue.narration,/beyond your reach/);
  g.place('Craft','forge');g.state.add('SteelIngot',6);g.actions.craft('weapon');assert.match(g.state.data.message,/hammer is reinforced/);
  g.ui.route('forge');assert.match(g.nodes.stage.innerHTML,/REFORGE/);assert.doesNotMatch(g.nodes.stage.innerHTML,/RESHARPEN/);
  g.place('LockedItem','chest',27,3);g.state.add('Key');g.rng(0);g.actions.unlock();
  assert.equal(g.state.qty('Key'),0);assert.match(g.state.data.message,/unlock the chest.*Metal Ingot added to your pack/);
  assert.equal(g.state.qty('MetalIngot'),1);
});


test('battle notices stack outside the page, expire independently, and never replay on a rerender',()=>{
  const g=game(new Map(),true),timers=roundTimers(g);g.place('Enemy','ogre',27,0);g.rng(0);g.combat.start();g.ui.route('battle');
  const stack=g.nodes['combat-toasts'];assert.match(stack.innerHTML,/CHOOSE YOUR OPENING/);assert.doesNotMatch(g.nodes.stage.innerHTML,/CHOOSE YOUR OPENING|combat-log|round-feedback/);
  g.ui.dispatch('attack:0');assert.equal(stack.children.length,1);assert.match(stack.innerHTML,/YOU HIT/);assert.doesNotMatch(stack.innerHTML,/CHOOSE YOUR OPENING|YOU TOOK DAMAGE/);
  const first=stack.children[0];timers.beat();assert.equal(stack.children.length,2);assert.equal(stack.children[0],first);assert.match(stack.innerHTML,/YOU HIT[\s\S]*YOU TOOK DAMAGE/);
  timers.flush();g.ui.render(true);assert.equal(stack.children.length,2);assert.doesNotMatch(g.nodes.stage.innerHTML,/round-event|combat-log|round-feedback/);
  const expiring=[...timers.pending].filter(([,t])=>t.ms===5000);assert.equal(expiring.length,2);
  expiring[0][1].fn();assert.equal(stack.children.length,1);assert.doesNotMatch(stack.innerHTML,/YOU HIT/);
  expiring[1][1].fn();assert.equal(stack.children.length,0);g.ui.render(true);assert.equal(stack.children.length,0);
  g.state.load();g.ui.init();g.ui.route('battle');assert.equal(stack.children.length,0);
});

test('new rounds replace old notices and leaving battle cancels the pending enemy toast',()=>{
  const g=game(new Map(),true),timers=roundTimers(g);g.place('Enemy','ogre',27,0);g.rng(.9999);g.combat.start();g.ui.route('battle');
  g.ui.dispatch('attack:0');timers.flush();assert.equal(g.nodes['combat-toasts'].children.length,2);
  g.ui.dispatch('attack:0');assert.equal(g.nodes['combat-toasts'].children.length,1);assert.match(g.nodes['combat-toasts'].innerHTML,/ROUND 2/);
  g.ui.route('pack');timers.flush();assert.equal(g.nodes['combat-toasts'].children.length,0);
  assert.equal([...timers.pending.values()].filter(t=>t.ms===5000).length,0);
});


test('new-coordinate rates reserve quiet terrain, scarce NPCs and increased outer threats',()=>{
  for(const local of [true,false]){
    const g=game(),rates=g.content.encounterRates(local);
    assert.equal(rates.Nature,40);assert.equal(rates.NPC,local?10:5);
    assert.ok(Math.abs(Object.values(rates).reduce((a,b)=>a+b,0)-100)<1e-10);
    const threats=['Danger','Enemy','Dragon'];
    if(!local){assert.ok(Math.abs(threats.reduce((sum,type)=>sum+rates[type],0)-20)<1e-10);assert.equal(rates.Danger,rates.Enemy);assert.equal(rates.Danger,4*rates.Dragon);}
    const others=Object.entries(rates).filter(([type])=>type!=='Nature'&&type!=='NPC'&&type!=='Puzzle'&&(local||!threats.includes(type)));
    const totalWeight=others.reduce((sum,[type])=>sum+g.content.weights[type],0);
    for(const [type,rate] of others)assert.ok(Math.abs(rate-(local?48.5:33.5)*g.content.weights[type]/totalWeight)<1e-10,type);
    assert.equal(Object.hasOwn(rates,'Home'),false);
    for(const type of g.content.outerOnly)assert.equal(Object.hasOwn(rates,type),!local);
    let start=0,i=0;
    for(const [type,rate] of Object.entries(rates)){
      g.rng((start+rate/2)/100);assert.equal(g.world.getOrCreateBlock(local?3:27,3+i++).elementType,type);start+=rate;
    }
    g.rng(.399999);assert.equal(g.world.getOrCreateBlock(local?4:28,3).elementType,'Nature');
    g.rng(.4);assert.equal(g.world.getOrCreateBlock(local?4:28,4).elementType,'NPC');
    g.rng(local?.5:.45);assert.equal(g.world.getOrCreateBlock(local?4:28,5).elementType,'Food');
  }
});

test('new scenery, animals and grave can spawn, render in both realms and survive a save',()=>{
  const added={Nature:['dense-woodland','leafy-clearing','grassy-rise'],Animal:['boar','hedgehog','otter','marten'],Thing:['grave']};
  const g=game(new Map(),true);g.ui.init();
  for(const [type,ids] of Object.entries(added))for(const id of ids)for(const local of [true,false]){
    const pool=Object.values(g.content.entities).filter(e=>e.type===type);
    g.rng((pool.findIndex(e=>e.id===id)+.5)/pool.length);
    assert.equal(g.world.spawn(type,local?6:29,6).subtype,id);
    g.place(type,id,local?6:29,6);g.ui.route('explore');
    assert.match(g.nodes.stage.innerHTML,new RegExp('assets/'+id+'-'+(local?'village':'outer')+'\\.png'));
    g.state.save();g.state.load();assert.equal(g.world.current().subtype,id);
    assert.equal(g.world.current().elementType,type);
  }
});

test('puzzles are 1.5 percent of new coordinates and have stable realm artwork and patterns',()=>{
  for(const local of [true,false]){
    const g=game(new Map(),true),rates=g.content.encounterRates(local);assert.equal(rates.Puzzle,1.5);
    assert.equal(rates.Nature,40);assert.equal(rates.NPC,local?10:5);
    for(const [n,id] of ['puzzle-plate','puzzle-runes','puzzle-levers'].entries()){
      g.rng((n+.5)/3);const b=g.world.spawn('Puzzle',local?5:30,5+n);assert.equal(b.subtype,id);assert.ok(Number.isInteger(b.puzzle.variant));
      g.state.data.blocks.push(b);g.state.data.x=b.x;g.state.data.y=b.y;g.ui.route('explore');
      assert.match(g.nodes.stage.innerHTML,new RegExp(id+'-'+(local?'village':'outer')+'\\.png'));assert.match(g.nodes.stage.innerHTML,/INSCRIPTION/);assert.match(g.nodes.stage.innerHTML,/data-action="move:N"/);
      const before=JSON.stringify(b.puzzle);g.state.save();g.state.load();assert.equal(JSON.stringify(g.world.current().puzzle),before);
    }
  }
});
test('all twelve puzzle patterns solve in both realms and grant their cached treasure only once',()=>{
  const answers={'puzzle-plate':[['MetalIngot',1],['SteelIngot',1],['MetalIngot',2],['SteelIngot',2]],'puzzle-runes':[[0,1,2],[2,1,0],[1,2,0],[2,0,1]],'puzzle-levers':[[0,1,2],[2,0,1],[1,2,1,0],[0,2,0,1]]};
  for(const local of [true,false])for(const [id,variants] of Object.entries(answers))for(const [variant,answer] of variants.entries()){
    const g=game(new Map(),true),b=g.place('Puzzle',id,local?5:30,5);b.puzzle=g.puzzles.create(id);b.puzzle.variant=variant;g.state.add('MetalIngot',10);g.state.add('SteelIngot',10);g.ui.route('explore');
    if(id==='puzzle-plate'){for(let n=0;n<answer[1];n++)g.ui.dispatch('puzzle:offer-'+answer[0]);assert.equal(g.state.qty(answer[0]),10-answer[1]);}
    if(id==='puzzle-runes'){for(const [i,turns] of answer.entries())for(let n=0;n<turns;n++)g.ui.dispatch('puzzle:turn-'+i);g.ui.dispatch('puzzle:check');}
    if(id==='puzzle-levers')for(const index of answer)g.ui.dispatch('puzzle:pull-'+index);
    assert.equal(b.puzzle.solved,true,id+' '+variant);assert.equal(g.state.data.foundLoot,null);assert.match(g.nodes.toast.innerHTML,/SEAL OPENED/);assert.match(g.nodes.stage.innerHTML,/ENTER CAVE|ENTER CHAMBER/);
    const rewards=JSON.stringify(b.puzzle.rewards),inventory=JSON.stringify(g.state.data.inventory);g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');
    assert.equal(g.world.current().puzzle.solved,true);assert.equal(JSON.stringify(g.world.current().puzzle.rewards),rewards);assert.equal(JSON.stringify(g.state.data.inventory),inventory);
    g.ui.dispatch('puzzle:enter');assert.match(g.nodes.stage.innerHTML,/HIDDEN CHAMBER/);assert.match(g.nodes.stage.innerHTML,/GATHER LOOT/);assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="move:/);assert.equal(g.world.move('N'),false);
    g.state.load();g.ui.init();assert.equal(JSON.stringify(g.state.data.foundLoot.rewards),rewards);assert.match(g.nodes.stage.innerHTML,/HIDDEN CHAMBER/);
    const before=Object.fromEntries(JSON.parse(rewards).map(r=>[r.type,g.state.qty(r.type)]));g.ui.dispatch('gather-loot');
    for(const r of JSON.parse(rewards))assert.equal(g.state.qty(r.type),before[r.type]+r.qty);
    assert.equal(g.world.current().puzzle.claimed,true);assert.equal(g.state.data.foundLoot,null);assert.match(g.nodes.toast.innerHTML,/LOOT GATHERED/);assert.match(g.nodes.stage.innerHTML,/CHAMBER SEARCHED/);
    const final=JSON.stringify(g.state.data.inventory);g.ui.dispatch('puzzle:enter');g.ui.dispatch('gather-loot');g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');g.ui.dispatch('puzzle:enter');
    assert.equal(JSON.stringify(g.state.data.inventory),final);assert.equal(g.state.data.foundLoot,null);assert.match(g.world.description(),/already been searched/);
  }
});
test('plate rejects wrong ingots without spending them and preserves recoverable partial offerings',()=>{
  const g=game(new Map(),true),b=g.place('Puzzle','puzzle-plate',5,5);b.puzzle=g.puzzles.create(b.subtype);b.puzzle.variant=2;
  assert.equal(g.puzzles.act('offer','MetalIngot'),false);g.state.add('MetalIngot',2);g.state.add('SteelIngot',1);
  g.ui.dispatch('puzzle:offer-SteelIngot');assert.equal(g.state.qty('SteelIngot'),1);assert.equal(b.puzzle.offered,0);assert.match(g.nodes.toast.innerHTML,/Nothing spent/);
  g.ui.dispatch('puzzle:offer-MetalIngot');assert.equal(b.puzzle.offered,1);assert.equal(g.state.qty('MetalIngot'),1);g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');
  assert.equal(g.world.current().puzzle.offered,1);g.ui.dispatch('puzzle:recover');assert.equal(g.state.qty('MetalIngot'),2);assert.equal(g.world.current().puzzle.offered,0);
  g.ui.dispatch('puzzle:recover');assert.equal(g.state.qty('MetalIngot'),2);g.ui.dispatch('puzzle:offer-MetalIngot');g.ui.dispatch('puzzle:offer-MetalIngot');g.ui.dispatch('puzzle:recover');assert.equal(g.state.qty('MetalIngot'),0);
});
test('rune and lever progress survives departure while mistakes never damage or charge the player',()=>{
  const g=game(new Map(),true),b=g.place('Puzzle','puzzle-runes',5,5);b.puzzle=g.puzzles.create(b.subtype);b.puzzle.variant=0;
  g.ui.dispatch('puzzle:turn-1');g.ui.dispatch('puzzle:check');assert.equal(b.puzzle.solved,false);assert.equal(g.state.data.hp.current,50);assert.match(g.nodes.toast.innerHTML,/SEAL HOLDS/);
  g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');assert.equal(JSON.stringify(g.world.current().puzzle.wheels),'[0,1,0]');
  const lever=g.place('Puzzle','puzzle-levers',8,8);lever.puzzle=g.puzzles.create(lever.subtype);lever.puzzle.variant=2;
  g.ui.dispatch('puzzle:pull-1');g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');assert.equal(g.world.current().puzzle.progress,1);
  g.ui.dispatch('puzzle:pull-0');assert.equal(g.world.current().puzzle.progress,0);assert.equal(g.state.data.hp.current,50);assert.match(g.nodes.toast.innerHTML,/LEVERS RESET/);assert.equal(g.state.data.inventory.length,0);
  assert.equal(g.puzzles.act('pull','-1'),false);assert.equal(g.puzzles.act('pull','3'),false);assert.equal(g.puzzles.act('turn','0'),false);
});
test('puzzles respect battle, result, found-loot and recovery guards without changing resources',()=>{
  const g=game(),b=g.place('Puzzle','puzzle-plate',5,5);b.puzzle=g.puzzles.create(b.subtype);b.puzzle.variant=0;g.state.add('MetalIngot',2);
  for(const key of ['battle','outcome','foundLoot']){g.state.data[key]={};assert.equal(g.puzzles.act('offer','MetalIngot'),false);g.state.data[key]=null;}
  g.state.data.hp.current=1;assert.equal(g.puzzles.act('offer','MetalIngot'),false);assert.equal(g.state.qty('MetalIngot'),2);assert.equal(b.puzzle.offered,0);
  g.state.data.hp.current=50;g.place('Nature','forest');assert.equal(g.puzzles.act('enter'),false);
});

test('HUD opens one equipment card while the forge keeps both and affordability glow tracks ingots',()=>{const g=game(new Map(),true);g.place('Craft','forge');g.state.add('MetalIngot',10);g.state.add('SteelIngot',6);g.ui.route('explore');assert.equal((g.nodes.hud.innerHTML.match(/stat-cell ready/g)||[]).length,2);for(const type of ['armor','weapon']){g.ui.dispatch('equipment:'+type);assert.match(g.nodes.stage.innerHTML,new RegExp('id="forge-'+type+'"'));assert.doesNotMatch(g.nodes.stage.innerHTML,new RegExp('id="forge-'+(type==='armor'?'weapon':'armor')+'"'));assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="forge:/);}g.ui.dispatch('craft:weapon');assert.equal((g.nodes.hud.innerHTML.match(/stat-cell ready/g)||[]).length,1);g.ui.dispatch('forge:armor');assert.match(g.nodes.stage.innerHTML,/id="forge-armor"/);assert.match(g.nodes.stage.innerHTML,/id="forge-weapon"/);g.state.data.armor.resistance=95;g.ui.render();assert.doesNotMatch(g.nodes.hud.innerHTML,/stat-cell ready/);});

test('four exclusive village routes have three cardinal steps and persist their destinations',()=>{
  const g=game(new Map(),true),routes=g.state.data.village.routes,seen=new Set();
  assert.equal(routes.length,4);assert.equal(new Set(routes.map(r=>r.destination)).size,4);
  assert.equal(JSON.stringify(routes.map(r=>r.destination)),JSON.stringify(['village-forge','tavern','wizard-sanctuary','herbalist-cottage']));
  assert.equal(JSON.stringify(routes[0].nodes.slice(0,2)),JSON.stringify([{x:0,y:0},{x:0,y:-1}]));
  for(let i=1;i<routes.length;i++)assert.deepEqual(routes[i].nodes[0],routes[i-1].nodes.at(-1));
  for(const r of routes){assert.equal(r.nodes.length,4);const deltas=r.nodes.slice(1).map((n,i)=>[n.x-r.nodes[i].x,n.y-r.nodes[i].y]);for(const d of deltas)assert.equal(Math.abs(d[0])+Math.abs(d[1]),1);assert.deepEqual(deltas[0],deltas[2]);assert.equal(Math.abs(deltas[0][0]*deltas[1][0]+deltas[0][1]*deltas[1][1]),0);
    for(let i=1;i<4;i++){const n=r.nodes[i],key=n.x+','+n.y;assert.ok(!seen.has(key));seen.add(key);const b=g.world.getOrCreateBlock(n.x,n.y);assert.equal(b.elementType,i===3?'Landmark':'Path');assert.equal(b.subtype,i===3?r.destination:'forest-path');}
  }
  const before=JSON.stringify(routes);g.state.save();g.state.load();assert.equal(JSON.stringify(g.state.data.village.routes),before);
  for(const local of [true,false]){const rates=g.content.encounterRates(local);assert.equal(rates.Path,undefined);assert.equal(rates.Landmark,undefined);assert.equal(rates.Nature,40);}
  for(let i=0;i<100;i++){g.rng(i/100);assert.notEqual(g.world.spawn('Nature',40,i).subtype,'forest-path');}
  g.ui.route('map');assert.match(g.nodes.stage.innerHTML,/map-trail/);assert.match(g.nodes.stage.innerHTML,/Village paths/);
});
test('the wizard unlocks magic once and changes to empty artwork after departure',()=>{
  const g=game(new Map(),true);assert.equal(g.state.data.enchanted,false);g.state.add('MagicCrystal');g.place('Danger','snake',20,20);g.combat.start();assert.equal(g.combat.attack(3),false);assert.equal(g.state.qty('MagicCrystal'),1);g.ui.route('battle');assert.match(g.nodes.stage.innerHTML,/SEEK THE VILLAGE WIZARD/);g.state.data.battle=null;
  const end=g.state.data.village.routes.find(r=>r.destination==='wizard-sanctuary').nodes.at(-1);g.state.data.x=end.x;g.state.data.y=end.y;g.ui.route('explore');assert.match(g.nodes.stage.innerHTML,/wizard-sanctuary-village.png/);g.ui.dispatch('village:speak');finishDialogue(g);assert.match(g.nodes.stage.innerHTML,/ACCEPT ENCHANTMENT/);assert.match(g.nodes.stage.innerHTML,/speech-bubble/);g.ui.dispatch('village:claim');assert.equal(g.state.data.enchanted,true);assert.equal(g.state.qty('MagicCrystal'),2);assert.match(g.nodes.toast.innerHTML,/WEAPON ENCHANTED/);g.ui.dispatch('village:claim');assert.equal(g.state.qty('MagicCrystal'),2);
  g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');assert.match(g.nodes.stage.innerHTML,/wizard-sanctuary-village-empty.png/);assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="village:/);assert.equal(g.village.claim(),false);assert.equal(g.state.data.enchanted,true);
  g.place('Danger','snake',20,20);g.combat.start();g.rng(0);assert.ok(g.combat.attack(3));assert.equal(g.state.qty('MagicCrystal'),1);
});
test('the barkeep gives wisdom once and herbalist gifts one potion across revisits',()=>{
  for(const id of ['tavern','herbalist-cottage']){const g=game(new Map(),true),end=g.state.data.village.routes.find(r=>r.destination===id).nodes.at(-1);g.state.data.x=end.x;g.state.data.y=end.y;g.ui.route('explore');assert.equal(g.village.claim(),false);g.ui.dispatch('village:speak');finishDialogue(g);assert.match(g.nodes.stage.innerHTML,/SPEAKING/);if(id==='herbalist-cottage'){assert.match(g.nodes.stage.innerHTML,/ACCEPT POTION/);g.ui.dispatch('village:claim');assert.equal(g.state.qty('Potion'),1);assert.match(g.nodes.toast.innerHTML,/GIFT RECEIVED/);}else {assert.match(g.nodes.stage.innerHTML,/ACCEPT WISDOM/);g.ui.dispatch('village:claim');assert.equal(g.state.data.inventory.length,0);}
    g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');assert.match(g.nodes.stage.innerHTML,new RegExp(id+'-village-empty.png'));assert.equal(g.village.speak(),false);assert.equal(g.village.claim(),false);assert.equal(g.state.qty('Potion'),id==='tavern'?0:1);
  }
});
test('Eldric offers one ingot of each type and his forge stays active after the gift',()=>{
  const g=game(new Map(),true),end=g.state.data.village.routes.find(r=>r.destination==='village-forge').nodes.at(-1);g.state.data.x=end.x;g.state.data.y=end.y;g.ui.route('explore');assert.match(g.nodes.stage.innerHTML,/ENTER THE FORGE/);g.ui.dispatch('forge:armor');finishDialogue(g);assert.match(g.nodes.stage.innerHTML,/ACCEPT INGOTS/);assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="craft:/);g.ui.dispatch('village:claim');assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="craft:/);assert.equal(g.state.qty('MetalIngot'),1);assert.equal(g.state.qty('SteelIngot'),1);assert.match(g.nodes.toast.innerHTML,/Metal Ingot.*Steel Ingot/);assert.doesNotMatch(g.nodes.stage.innerHTML,/ACCEPT INGOTS/);g.ui.dispatch('village:claim');assert.equal(g.state.qty('SteelIngot'),1);
  g.ui.dispatch('route:explore');g.ui.dispatch('move:N');g.state.load();g.ui.dispatch('move:S');assert.match(g.nodes.stage.innerHTML,/forge-village.png/);assert.match(g.nodes.stage.innerHTML,/ENTER THE FORGE/);g.ui.dispatch('forge:armor');assert.match(g.nodes.stage.innerHTML,/data-action="craft:armor"/);assert.match(g.nodes.stage.innerHTML,/data-action="craft:weapon"/);g.state.add('SteelIngot',10);assert.equal(g.actions.craft('weapon'),true);assert.equal(g.state.data.weapon.basePower,6);
});
test('landmark interactions cannot grant gifts during pending combat or loot',()=>{
  const g=game(),end=g.state.data.village.routes.find(r=>r.destination==='herbalist-cottage').nodes.at(-1);g.state.data.x=end.x;g.state.data.y=end.y;g.village.speak();for(const key of ['battle','outcome','foundLoot']){g.state.data[key]={};assert.equal(g.village.speak(),false);assert.equal(g.village.claim(),false);g.state.data[key]=null;}assert.equal(g.state.qty('Potion'),0);
});
test('legacy saves preserve discoveries and magic and retire orphan wilderness path artwork',()=>{
  const g=game();g.place('Enemy','ogre',3,0);g.place('Nature','forest-path',30,30);g.state.add('Gem',3);delete g.state.data.village;delete g.state.data.enchanted;g.state.save();g.state.load();assert.equal(g.state.data.enchanted,true);assert.equal(g.state.data.village.legacy,true);assert.equal(g.state.data.village.routes.length,0);assert.equal(g.world.at(3,0).subtype,'ogre');assert.equal(g.world.at(30,30).subtype,'forest');assert.equal(g.state.qty('Gem'),3);assert.equal(g.state.data.x,30);const before=JSON.stringify(g.state.data.village);g.state.save();g.state.load();assert.equal(JSON.stringify(g.state.data.village),before);
});
test('trail reminders are unique and stop after all introductions, with no reminders on attack or legacy saves',()=>{
  const g=game(),types=['villager','farmer','woodcutter','hunter','elder'];
  assert.equal(new Set(types.map(t=>g.village.reminder(t))).size,5);
  for(const type of types){g.place('NPC',type,10,10);g.actions.talk();assert.match(g.world.current().dialogue.text,/cobblestone|cobblestones/);g.actions.talk(true);assert.doesNotMatch(g.world.current().dialogue.text,/still awaits you/);}
  for(const id of g.village.destinations)g.state.data.village.visits[id]=true;
  assert.ok(g.village.allVisited());for(const type of types)assert.equal(g.village.reminder(type),'');
  g.state.data.village={legacy:true,routes:[],visits:{}};assert.equal(g.village.reminder('elder'),'');
});
test('the last introduction gives a farewell in any order and persists completion',()=>{
  for(const last of ['village-forge','tavern','wizard-sanctuary','herbalist-cottage']){
    const g=game(new Map(),true);for(const id of g.village.destinations)if(id!==last)g.state.data.village.visits[id]=true;
    const n=g.state.data.village.routes.find(r=>r.destination===last).nodes.at(-1);g.state.data.x=n.x;g.state.data.y=n.y;g.village.speak();
    assert.equal(g.village.allVisited(),false);g.village.claim();
    assert.ok(g.village.allVisited());assert.match(g.world.current().dialogue.text,/path you choose from here is your own/);
    g.ui.route(last==='village-forge'?'forge':'explore');finishDialogue(g);assert.match(g.nodes.stage.innerHTML,/your own/);
    g.state.save();g.state.load();assert.ok(g.village.allVisited());assert.equal(g.village.reminder('elder'),'');
  }
});
test('out of order landmark visits point toward remaining people rather than beyond the trail',()=>{
  const g=game(),n=g.state.data.village.routes.at(-1).nodes.at(-1);g.state.data.x=n.x;g.state.data.y=n.y;g.village.speak();assert.match(g.world.current().dialogue.text,/south to Eldric/);g.village.claim();assert.equal(g.village.allVisited(),false);
});
test('gift acceptance reveals the compass for wizard herbalist and forge',()=>{
  for(const id of ['wizard-sanctuary','herbalist-cottage','village-forge']){
    const g=game(new Map(),true),n=g.state.data.village.routes.find(r=>r.destination===id).nodes.at(-1);g.state.data.x=n.x;g.state.data.y=n.y;
    g.ui.dispatch(id==='village-forge'?'forge:armor':'village:speak');assert.equal(g.village.pendingGift(),true);assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="move:/);
    g.ui.dispatch('move:N');assert.equal(g.state.data.y,n.y);g.ui.dispatch('village:claim');assert.equal(g.village.pendingGift(),false);assert.match(g.nodes.stage.innerHTML,/data-action="move:N"/);g.ui.dispatch('move:N');assert.equal(g.state.data.y,n.y-1);
  }
});
test('grandfather appears once after all offerings on the next off-trail move, preserving the encounter',()=>{
  const g=game(new Map(),true);g.state.data.x=10;g.state.data.y=10;g.world.move('N');assert.equal(g.village.visionActive(),false);
  for(const id of g.village.destinations)g.state.data.village.visits[id]=true;
  g.state.data.x=0;g.state.data.y=0;g.world.move('N');assert.equal(g.village.visionActive(),false);
  g.state.data.x=10;g.state.data.y=10;const enemy=g.world.getOrCreateBlock(11,10);Object.assign(enemy,{elementType:'Enemy',subtype:'ogre'});g.world.move('E');assert.equal(g.village.visionActive(),true);assert.equal(g.world.current(),enemy);g.ui.route('explore');assert.match(g.nodes.stage.innerHTML,/grandfather-vision.png/);assert.doesNotMatch(g.nodes.stage.innerHTML,/ENTER BATTLE/);
  g.state.save();g.state.load();assert.equal(g.village.visionActive(),true);assert.equal(g.world.move('N'),false);g.ui.dispatch('village:vision');assert.match(g.nodes.stage.innerHTML,/ENTER BATTLE/);assert.equal(g.world.current().subtype,'ogre');g.ui.dispatch('move:N');assert.equal(g.village.visionActive(),false);g.state.load();assert.equal(g.state.data.village.visionSeen,true);g.world.move('S');assert.equal(g.village.visionActive(),false);
});
test('gold compass hint follows bends and revisits unfinished stops then disappears',()=>{
 const g=game(new Map(),true);assert.equal(g.village.trailHint(),'N');const r=g.state.data.village.routes[0];g.state.data.x=r.nodes[1].x;g.state.data.y=r.nodes[1].y;assert.equal(g.village.trailHint(),r.nodes[2].x>r.nodes[1].x?'E':'W');g.ui.route('explore');assert.match(g.nodes.stage.innerHTML,/trail-hint/);
 const last=g.state.data.village.routes.at(-1).nodes.at(-1);g.state.data.x=last.x;g.state.data.y=last.y;assert.equal(g.village.trailHint(),'');g.state.data.village.visits['herbalist-cottage']=true;assert.equal(g.village.trailHint(),'S');for(const id of g.village.destinations)g.state.data.village.visits[id]=true;assert.equal(g.village.trailHint(),'');
});
test('unvisited landmarks require entry and acceptance before movement',()=>{
 for(const id of ['village-forge','tavern','wizard-sanctuary','herbalist-cottage']){
  const g=game(new Map(),true),n=g.state.data.village.routes.find(r=>r.destination===id).nodes.at(-1);g.state.data.x=n.x;g.state.data.y=n.y;g.ui.route('explore');assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="move:/);assert.match(g.nodes.stage.innerHTML,/ENTER THE/);assert.equal(g.world.move('N'),false);g.ui.dispatch('move:N');assert.equal(g.state.data.y,n.y);
  g.ui.dispatch(id==='village-forge'?'forge:armor':'village:speak');assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="move:/);g.ui.dispatch('village:claim');assert.match(g.nodes.stage.innerHTML,/data-action="move:N"/);assert.ok(g.world.move('N'));
 }
});
test('long dialogue pages before acceptance and preserves progress on reload',()=>{
 const g=game(new Map(),true),n=g.state.data.village.routes.find(r=>r.destination==='wizard-sanctuary').nodes.at(-1);g.state.data.x=n.x;g.state.data.y=n.y;g.ui.dispatch('village:speak');assert.match(g.nodes.stage.innerHTML,/data-action="next-dialogue"/);assert.doesNotMatch(g.nodes.stage.innerHTML,/ACCEPT ENCHANTMENT/);assert.match(g.nodes.stage.innerHTML,/dialogue-dock/);g.ui.dispatch('next-dialogue');assert.equal(g.world.current().dialogue.page,1);g.state.load();g.ui.route('explore');assert.equal(g.world.current().dialogue.page,1);finishDialogue(g);assert.doesNotMatch(g.nodes.stage.innerHTML,/data-action="next-dialogue"/);assert.match(g.nodes.stage.innerHTML,/ACCEPT ENCHANTMENT/);assert.equal(g.state.data.enchanted,false);g.ui.dispatch('village:claim');assert.equal(g.state.data.enchanted,true);
});
