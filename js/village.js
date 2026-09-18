'use strict';
OR.village=(()=>{
  const C=OR.content,S=OR.state;
  const destinations=['village-forge','tavern','wizard-sanctuary','herbalist-cottage'];
  const names={'wizard-sanctuary':'The Wizard',tavern:'The Barkeep','village-forge':'Eldric','herbalist-cottage':'The Herbalist'};
  const words={
    'wizard-sanctuary':'Strongwood deserves a quieter age. Let me bind Realmfire to your weapon. A Magic Crystal will awaken it for one strike; the enchantment itself will remain. Take this crystal, and use that power to bring peace home.',
    tavern:'Sit a moment. Heavy blows can stagger a foe, but a missed swing leaves you open. Keep a potion for the road and return home when your strength runs thin. A living defender does more good than a brave memory.',
    'village-forge':'Look for ingots on your travels. Metal strengthens your armor; steel strengthens your weapon. Here is one of each to start your stock. Bring enough back here, and we will put them to work.',
    'herbalist-cottage':'Take a potion for the road. It will mend your wounds at once. Rest at your own hearth when you can; time at home restores your strength, even while you are away. As for wild mushrooms, their promise is never certain.'
  };
  function makeRoutes(){
    const routes=[];let x=0,y=0;
    for(const destination of destinations){
      const turn=C.pick([-1,1]);
      const nodes=[{x,y},{x,y:y-1},{x,y:y-2},{x,y:y-3},{x:x+turn,y:y-3},{x:x+turn,y:y-4}];
      routes.push({direction:'N',destination,nodes});x+=turn;y-=4;
    }
    return routes;
  }
  function setup(legacy=false){
    const s=S.data;if(!s||s.village)return false;
    if(legacy){s.village={version:1,legacy:true,routes:[],visits:{}};s.enchanted=true;return true;}
    s.village={version:1,routes:makeRoutes(),visits:{}};
    return true;
  }
  function template(x,y){
    if(!S.data?.village||x===0&&y===0)return null;
    for(const route of S.data.village.routes){const index=route.nodes.findIndex(n=>n.x===x&&n.y===y);if(index>0)return {x,y,elementType:index===5?'Landmark':'Path',subtype:index===5?route.destination:'forest-path',resolved:false};}
    return null;
  }
  function connections(x,y){
    const dirs=new Set();
    for(const r of S.data?.village?.routes||[]){const i=r.nodes.findIndex(n=>n.x===x&&n.y===y);if(i<0)continue;for(const n of [r.nodes[i-1],r.nodes[i+1]])if(n)dirs.add(n.x>x?'E':n.x<x?'W':n.y>y?'S':'N');}
    return [...dirs];
  }
  function guidance(id){
    return {'village-forge':'Keep following the cobblestone path north to the tavern. The barkeep has wisdom for the road.',tavern:'Keep following the cobblestone path north. The wizard at the sanctuary may help you bring peace to Strongwood.','wizard-sanctuary':'Keep following the cobblestone path north to the herbalist’s cottage. She has something for your travels.','herbalist-cottage':'You have reached the end of the village trail. Follow the cobblestones south to return home, or step off the path to explore Strongwood.'}[id]||'';
  }
  const completed=id=>!!S.data?.village?.visits[id];
  function speak(){
    const s=S.data,b=OR.world.current();if(!s.village||s.battle||s.outcome||s.foundLoot||b.elementType!=='Landmark'||completed(b.subtype))return false;
    b.dialogue={text:'“'+words[b.subtype]+' '+guidance(b.subtype)+'”',spoken:true,speaker:names[b.subtype],dismissed:false};b.resolved=true;
    if(b.subtype==='tavern')s.village.visits.tavern=true;
    S.log(names[b.subtype]+': '+words[b.subtype]+' '+guidance(b.subtype));S.save();return true;
  }
  function claim(){
    const s=S.data,b=OR.world.current();if(!s.village||s.battle||s.outcome||s.foundLoot||b.elementType!=='Landmark'||!b.dialogue||b.dialogue.dismissed||completed(b.subtype)||b.subtype==='tavern')return false;
    const rewards=b.subtype==='wizard-sanctuary'?[{type:'MagicCrystal',qty:1}]:b.subtype==='village-forge'?[{type:'MetalIngot',qty:1},{type:'SteelIngot',qty:1}]:[{type:'Potion',qty:1}];
    s.village.visits[b.subtype]=true;if(b.subtype==='wizard-sanctuary')s.enchanted=true;
    for(const r of rewards)S.add(r.type,r.qty);
    S.log((b.subtype==='wizard-sanctuary'?'Realmfire enchanted. ':'')+'Received: '+rewards.map(r=>r.qty+' '+C.items[r.type].name).join(', ')+'.');S.save();return rewards;
  }
  function empty(b){return completed(b.subtype)&&!(b.resolved&&b.dialogue&&!b.dialogue.dismissed);}
  function description(b){
    if(b.elementType==='Home')return S.data.village?.legacy?'Smoke curls above the roof. Eldric’s forge burns beside your cottage.':'Follow the cobblestone path north to Eldric’s forge. The people of Strongwood will help prepare you for the road.';
    if(b.elementType==='Path')return 'Weathered cobblestones wind through Strongwood. Follow the trail on your map; no wandering encounters disturb this path.';
    if(b.elementType!=='Landmark')return null;
    if(b.subtype==='village-forge')return 'Eldric’s forge burns beside the village path. Bring metal for armor and steel for weapons.';
    if(!empty(b))return C.entities[b.subtype].village;
    return {'wizard-sanctuary':'The wizard has departed. The sanctuary is quiet; his enchantment remains.',tavern:'The tavern is quiet. The barkeep is away.','herbalist-cottage':'The herbalist is gathering beyond the village. Her cottage stands quiet.'}[b.subtype];
  }
  return {setup,template,connections,completed,speak,claim,empty,description,destinations};
})();
