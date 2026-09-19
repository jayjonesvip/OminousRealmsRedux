'use strict';
OR.village=(()=>{
  const C=OR.content,S=OR.state;
  const destinations=['tavern','wizard-sanctuary','herbalist-cottage'];
  const names={'wizard-sanctuary':'The Wizard',tavern:'The Barkeep','village-forge':'Eldric','herbalist-cottage':'The Herbalist'};
  const words={
    'wizard-sanctuary':'Strongwood deserves a quieter age. Let me bind Realmfire to your weapon. A Magic Crystal will awaken it for one strike; the enchantment itself will remain. Take this crystal, and use that power to bring peace home.',
    tavern:'Take these ingots for the road: one metal, one steel. Metal reinforces armor; steel improves weapons. Find a wayfarer’s forge while exploring to put them to use. Your map marks discovered forges with crossed weapons, so you can find your way back. No smith works here; I only keep a little iron for those defending Strongwood.',
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
  function migrateVillage(s){
    const v=s.village;if(v.version>=3)return false;
    const routes=v.routes||[],old=routes.find(r=>r.destination==='village-forge');
    if(old){
      const i=routes.findIndex(r=>r.destination==='tavern');
      if(i>=0){const next=routes[i+1];if(next)next.nodes=routes[i].nodes.concat(next.nodes.slice(1));routes.splice(i,1);}
      old.destination='tavern';v.visits.tavern=!!v.visits['village-forge'];delete v.visits['village-forge'];
      const home=old.nodes.at(-1);
      for(const b of s.blocks){if(b.subtype==='village-forge'){b.subtype='tavern';delete b.dialogue;}else if(b.subtype==='tavern'&&(b.x!==home.x||b.y!==home.y)){b.elementType='Path';b.subtype='forest-path';b.resolved=false;delete b.dialogue;}}
    }
    v.version=3;
    for(const b of s.blocks)if(b.elementType==='Landmark'&&destinations.includes(b.subtype)&&b.dialogue&&!completed(b.subtype))updateSpeech(b);
    return true;
  }
  function setup(legacy=false){
    const s=S.data;if(!s)return false;if(s.village){return migrateVillage(s);}
    if(legacy){s.village={version:3,legacy:true,routes:[],visits:{}};s.enchanted=true;return true;}
    s.village={version:3,routes:makeRoutes(),visits:{}};
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
  const repeatWords={
    tavern:['The fire is still warm. Sit a moment; even defenders need somewhere to rest their feet.','Your map remembers every forge you discover. Look for the crossed weapons when your pack grows heavy with ingots.','Metal for armor, steel for weapons. I keep confusing them with soup ingredients, which is why I am no smith.','Some nights the village is quiet enough to hear the shutters of your own cottage. I would like more nights like that.','Save a potion for the long way home. There is no sense winning an argument with a monster and losing the walk back.','I have heard enough boasts for one evening. Tell me something small that went well.','The kettle has outlived three tables. I try not to ask what it knows.','No more free iron, I am afraid. But you are welcome at this hearth.'],
    'wizard-sanctuary':['Realmfire remains bound to your weapon. Each use needs a Magic Crystal to awaken it.','An enchantment is a promise. The difficult part is deciding when to keep it.','Peace is not a silence imposed on everyone else. Remember whom you came to protect.','I spend most mornings correcting yesterday’s brilliant ideas.','Crystals are rare. Save their power for a moment that deserves it.','The runes are behaving today. I distrust this generosity.','You need not understand every shadow before choosing to help someone standing in it.','The village is still here. That gives us another day to work.'],
    'herbalist-cottage':['Your hearth can heal what haste makes worse. Rest at home when the road allows it.','A potion works at once. Do not wait until pride has made the choice for you.','I cannot promise which wild mushrooms will be kind to you. Some promises would be lies.','The rosemary survived the frost. I have decided to take that personally as encouragement.','A clean cloth and a patient hand do more good than most impressive speeches.','You smell of wet leaves. Good. It means you are still coming home.','I am drying herbs, not collecting opinions. Close the gate behind you.','I gave you what I could for the journey. The rest of my stock has village work to do.']
  };
  function speak(){
    const s=S.data,b=OR.world.current();if(!s.village||s.battle||s.outcome||s.foundLoot||b.elementType!=='Landmark'||!destinations.includes(b.subtype))return false;
    if(completed(b.subtype)){const text=C.pick(repeatWords[b.subtype].filter(line=>line!==b.lastVisitLine));b.lastVisitLine=text;b.dialogue={text:'“'+text+'”',speaker:names[b.subtype],spoken:true,dismissed:false};b.resolved=true;S.save();return true;}
    updateSpeech(b);b.resolved=true;S.log(names[b.subtype]+': '+words[b.subtype]+' '+guidance(b.subtype));S.save();return true;
  }
  function claim(){
    const s=S.data,b=OR.world.current();if(!s.village||s.battle||s.outcome||s.foundLoot||b.elementType!=='Landmark'||!destinations.includes(b.subtype)||!b.dialogue||b.dialogue.dismissed||completed(b.subtype))return false;
    const rewards=b.subtype==='wizard-sanctuary'?[{type:'MagicCrystal',qty:1}]:b.subtype==='tavern'?[{type:'MetalIngot',qty:1},{type:'SteelIngot',qty:1}]:[{type:'Potion',qty:1}];
    s.village.visits[b.subtype]=true;if(b.subtype==='wizard-sanctuary')s.enchanted=true;
    for(const r of rewards)S.add(r.type,r.qty);
    if(allVisited()){updateSpeech(b);S.log(names[b.subtype]+': '+farewell);}
    S.log((b.subtype==='wizard-sanctuary'?'Realmfire enchanted. ':'')+'Received: '+rewards.map(r=>r.qty+' '+C.items[r.type].name).join(', ')+'.');S.save();return rewards;
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
  function pendingGift(){const b=OR.world.current();return b.elementType==='Landmark'&&destinations.includes(b.subtype)&&!completed(b.subtype);}
  function empty(b){return false;}
  function description(b){
    if(b.elementType==='Home'&&allVisited())return 'Your hearth is here whenever you need it. The path you choose from here is your own.';
    if(b.elementType==='Home')return S.data.village?.legacy?'Your hearth is warm. Find wayfarer forges while exploring; your map remembers them.':'Follow the cobblestone path north to the Lantern Tavern. The people of Strongwood will help prepare you for the road.';
    if(b.elementType==='Path')return 'Weathered cobblestones wind through Strongwood. Follow the trail on your map; no wandering encounters disturb this path.';
    if(b.elementType!=='Landmark')return null;
    if(b.subtype==='village-forge')return 'Eldric’s forge burns beside the village path. Bring metal for armor and steel for weapons.';
    if(!empty(b))return C.entities[b.subtype].village;
    return {'wizard-sanctuary':'The wizard has departed. The sanctuary is quiet; his enchantment remains.',tavern:'The tavern is quiet. The barkeep is away.','herbalist-cottage':'The herbalist is gathering beyond the village. Her cottage stands quiet.'}[b.subtype];
  }
  return {setup,template,connections,completed,speak,claim,empty,description,destinations,reminder,allVisited,pendingGift,visionWords,visionActive,triggerVision,dismissVision,trailHint};
})();
