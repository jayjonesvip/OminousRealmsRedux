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
      const nodes=[{x,y},{x,y:y-1},{x:x+turn,y:y-1},{x:x+turn,y:y-2}];
      routes.push({direction:'N',destination,nodes});x+=turn;y-=2;
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
    for(const route of S.data.village.routes){const index=route.nodes.findIndex(n=>n.x===x&&n.y===y);if(index>0)return {x,y,elementType:index===route.nodes.length-1?'Landmark':'Path',subtype:index===route.nodes.length-1?route.destination:'forest-path',resolved:false};}
    return null;
  }
  function connections(x,y){
    const dirs=new Set();
    for(const r of S.data?.village?.routes||[]){const i=r.nodes.findIndex(n=>n.x===x&&n.y===y);if(i<0)continue;for(const n of [r.nodes[i-1],r.nodes[i+1]])if(n)dirs.add(n.x>x?'E':n.x<x?'W':n.y>y?'S':'N');}
    return [...dirs];
  }
  const completed=id=>!!S.data?.village?.visits[id];
  const active=()=>!!S.data?.village&&!S.data.village.legacy&&S.data.village.routes.length>0;
  const allVisited=()=>active()&&destinations.every(completed);
  const farewell='You have met everyone along the village trail. We have shared what we can. The path you choose from here is your own.';
  const nextStop=()=>destinations.find(id=>!completed(id));
  function guidance(id){
    if(allVisited())return farewell;
    const next=destinations.find(d=>d!==id&&!completed(d));
    if(!next)return 'Take these words with you when you are ready. You have reached the last of your village introductions.';
    const direction=destinations.indexOf(next)>destinations.indexOf(id)?'north':'south';
    return 'Keep following the cobblestone path '+direction+' to '+C.entities[next].name+'. '+{'village-forge':'The road is easier with good iron at your side.',tavern:'There are still folk along that trail worth listening to.','wizard-sanctuary':'Peace begins with the help we offer one another.','herbalist-cottage':'Let the others prepare you before you wander farther.'}[id];
  }
  function reminder(type){
    if(!active()||allVisited())return '';
    const voices={villager:'Before you wander too far, follow our cobblestone path. There are folk there who want to help you.',farmer:'Even a long furrow starts with a straight step. Find the cobblestone path and finish calling on our neighbors.',woodcutter:'Do not lose the trail for the trees. Get back to the cobblestones; you have not met everyone along them yet.',hunter:'A wise traveler prepares before leaving tracks in unknown country. Follow the cobblestone path and hear the village folk out.',elder:'The road will wait. Follow the old cobblestones while there are still people along them with something to give you.'};
    return voices[type]?voices[type]+' '+C.entities[nextStop()].name+' still awaits you. The map shows the trail.':'';
  }
  function updateSpeech(b){
    b.dialogue={text:'“'+words[b.subtype]+' '+guidance(b.subtype)+'”',spoken:true,speaker:names[b.subtype],dismissed:false};
  }
  function speak(){
    const s=S.data,b=OR.world.current();if(!s.village||s.battle||s.outcome||s.foundLoot||b.elementType!=='Landmark'||completed(b.subtype))return false;

    updateSpeech(b);b.resolved=true;
    S.log(names[b.subtype]+': '+words[b.subtype]+' '+guidance(b.subtype));S.save();return true;
  }
  function claim(){
    const s=S.data,b=OR.world.current();if(!s.village||s.battle||s.outcome||s.foundLoot||b.elementType!=='Landmark'||!b.dialogue||b.dialogue.dismissed||completed(b.subtype))return false;
    const rewards=b.subtype==='tavern'?[]:b.subtype==='wizard-sanctuary'?[{type:'MagicCrystal',qty:1}]:b.subtype==='village-forge'?[{type:'MetalIngot',qty:1},{type:'SteelIngot',qty:1}]:[{type:'Potion',qty:1}];
    s.village.visits[b.subtype]=true;if(b.subtype==='wizard-sanctuary')s.enchanted=true;
    for(const r of rewards)S.add(r.type,r.qty);
    if(allVisited()){updateSpeech(b);S.log(names[b.subtype]+': '+farewell);}
    S.log(b.subtype==='tavern'?'The barkeep’s wisdom stays with you.':(b.subtype==='wizard-sanctuary'?'Realmfire enchanted. ':'')+'Received: '+rewards.map(r=>r.qty+' '+C.items[r.type].name).join(', ')+'.');S.save();return rewards;
  }
  const visionWords='That gentle golden light upon your compass was me, my child. I have been watching over you, guiding you to those who could help. I will watch over you still. When that light returns, know that I am pointing the way—but the choice is always yours. Trust your instincts. Protect the people who believe in you. Save Strongwood from the shadow. You never walk alone.';
  const visionActive=()=>!!S.data?.village?.visionPending;
  function triggerVision(b){
    const v=S.data?.village;if(!allVisited()||v.visionSeen||['Home','Path','Landmark'].includes(b.elementType))return false;
    v.visionSeen=true;v.visionPending=true;S.log('A vision of your grandfather appears. “'+visionWords+'”');return true;
  }
  function dismissVision(){if(!visionActive())return false;S.data.village.visionPending=false;S.save();return true;}
  function trailHint(){
    if(!active()||allVisited()||pendingGift())return '';
    const nodes=S.data.village.routes.flatMap((r,i)=>i?r.nodes.slice(1):r.nodes);
    const current=nodes.findIndex(n=>n.x===S.data.x&&n.y===S.data.y),end=S.data.village.routes.find(r=>r.destination===nextStop())?.nodes.at(-1);
    if(current<0||!end)return '';
    const target=nodes.findIndex(n=>n.x===end.x&&n.y===end.y);if(current===target)return '';
    const next=nodes[current+(target>current?1:-1)];return next.x>S.data.x?'E':next.x<S.data.x?'W':next.y>S.data.y?'S':'N';
  }
  function pendingGift(){const b=OR.world.current();return destinations.includes(b.subtype)&&!!b.dialogue&&!b.dialogue.dismissed&&!completed(b.subtype);}
  function empty(b){return completed(b.subtype)&&!(b.resolved&&b.dialogue&&!b.dialogue.dismissed);}
  function description(b){
    if(b.elementType==='Home'&&allVisited())return 'Your hearth is here whenever you need it. The path you choose from here is your own.';
    if(b.elementType==='Home')return S.data.village?.legacy?'Smoke curls above the roof. Eldric’s forge burns beside your cottage.':'Follow the cobblestone path north to Eldric’s forge. The people of Strongwood will help prepare you for the road.';
    if(b.elementType==='Path')return 'Weathered cobblestones wind through Strongwood. Follow the trail on your map; no wandering encounters disturb this path.';
    if(b.elementType!=='Landmark')return null;
    if(b.subtype==='village-forge')return 'Eldric’s forge burns beside the village path. Bring metal for armor and steel for weapons.';
    if(!empty(b))return C.entities[b.subtype].village;
    return {'wizard-sanctuary':'The wizard has departed. The sanctuary is quiet; his enchantment remains.',tavern:'The tavern is quiet. The barkeep is away.','herbalist-cottage':'The herbalist is gathering beyond the village. Her cottage stands quiet.'}[b.subtype];
  }
  return {setup,template,connections,completed,speak,claim,empty,description,destinations,reminder,allVisited,pendingGift,visionWords,visionActive,triggerVision,dismissVision,trailHint};
})();
