'use strict';
// A one-time deception occupies the same exclusive mission window as retrievals.
OR.siren=(()=>{
  const S=OR.state,W=OR.world;
  const active=()=>S.data?.siren||null;
  const trapped=()=>active()?.phase==='pit';
  const locked=()=>['pit','reveal'].includes(active()?.phase);
  function valid(s){
    if(s.sirenDone!==undefined&&typeof s.sirenDone!=='boolean')return false;
    const p=s.siren;if(p===undefined||p===null)return true;
    if(s.sirenDone||s.traveler||!p||!['offer','trail','pit','reveal'].includes(p.phase)||s.pursuit||s.quests?.active||s.quests?.offer||s.finale&&s.finale.stage!=='done')return false;
    if(!['x','y','originX','originY'].every(k=>Number.isSafeInteger(p[k]))||!Number.isInteger(p.attempts)||p.attempts<0||p.attempts>3)return false;
    const origin=s.blocks?.find(b=>b.x===p.originX&&b.y===p.originY);
    if(origin?.subtype!=='siren-disguise'||origin.elementType!=='Thing'||Math.max(Math.abs(p.originX),Math.abs(p.originY))<27-(s.borderLoss||0))return false;
    if(p.phase!=='pit'&&p.attempts!==0||['pit','reveal'].includes(p.phase)&&(s.battle||s.outcome||s.foundLoot))return false;
    if(['offer','reveal'].includes(p.phase))return p.x===p.originX&&p.y===p.originY&&(p.phase!=='reveal'||s.x===p.x&&s.y===p.y);
    return Math.max(Math.abs(p.x),Math.abs(p.y))>=27-(s.borderLoss||0)&&s.blocks.some(b=>b.x===p.x&&b.y===p.y&&b.subtype==='siren-pit')&&(p.phase!=='pit'||s.x===p.x&&s.y===p.y)&&!(p.x===p.originX&&p.y===p.originY);
  }
  function roll(x,y){const s=S.data;if(s.sirenDone||s.traveler||active()||W.local(x,y)||W.border(x,y)||s.pursuit||s.quests?.active||s.quests?.offer||OR.finale?.active()||s.quests?.completed?.includes('hollowflame')&&!s.finale||s.battle||s.outcome||s.foundLoot||OR.village.visionActive()||Math.random()>=.02)return null;
    s.siren={phase:'offer',x,y,originX:x,originY:y,attempts:0};return {x,y,elementType:'Thing',subtype:'siren-disguise',resolved:false};
  }
  const here=()=>{const p=active(),s=S.data;return !!p&&s.x===p.x&&s.y===p.y;};
  function accept(){const p=active();if(!p||p.phase!=='offer'||!here()||S.data.battle||S.data.outcome||S.data.foundLoot)return false;
    const choices=[];for(let dx=-9;dx<=9;dx++)for(let dy=-9;dy<=9;dy++){const x=p.x+dx,y=p.y+dy,d=Math.abs(dx)+Math.abs(dy);if(d>=5&&d<=9&&!W.local(x,y)&&!W.border(x,y)&&!W.at(x,y)&&!OR.village.template(x,y))choices.push({x,y});}
    if(!choices.length)return false;Object.assign(p,OR.content.pick(choices),{phase:'trail'});S.data.blocks.push({x:p.x,y:p.y,elementType:'Thing',subtype:'siren-pit',resolved:false});S.log('A pale light follows the stranger’s footsteps. Someone is waiting beyond the broken stones.');S.save();return true;
  }
  function decline(){const p=active();if(!p||p.phase!=='offer'||!here()||S.data.battle||S.data.outcome||S.data.foundLoot)return false;p.phase='reveal';S.log('Her smile splits into a hiss. Scales rise beneath her skin. She flees between the dead trees.');S.save();return true;}
  function finish(){const p=active();if(!p)return;for(const [x,y] of [[p.originX,p.originY],[p.x,p.y]]){const b=W.at(x,y);if(b&&['siren-disguise','siren-pit'].includes(b.subtype))Object.assign(b,{elementType:'Nature',subtype:'forest',resolved:true,cleared:false});}S.data.sirenDone=true;S.data.siren=null;}
  function escape(cost=0){const s=S.data;s.hp.current=Math.max(1,s.hp.current-cost);finish();if(s.hp.current<s.hp.max)s.poisoned={lastTick:Date.now()};S.log((cost?'You pull free of the snakes. −'+cost+' HP.':'You find firm stone and climb free.')+(s.poisoned?' Venom remains; a full heal will cure it.':' You leave the pit behind.'));if(s.hp.current<=1)W.returnHome('You crawl clear of the pit, then collapse. You are carried home. Rest or fully heal to clear the venom.');S.save();return true;}
  function arrive(){if(active()?.phase!=='trail'||!here())return false;active().phase='pit';S.data.hp.current=Math.max(1,S.data.hp.current-4);S.log('The ground gives way. Her face twists above you. Snakes strike: −4 HP. Find a way out.');if(S.data.hp.current<=1)escape();S.save();return true;}
  function act(action){const p=active();if(!p||!here())return false;if(action==='leave'&&p.phase==='reveal'){finish();S.save();return true;}if(p.phase!=='pit')return false;if(action==='climb')return escape(3);if(action!=='search')return false;if(p.attempts>=3||Math.random()<.5)return escape();p.attempts++;S.data.hp.current=Math.max(1,S.data.hp.current-2);S.log('The stone crumbles. Another bite: −2 HP. The roots are still within reach.');if(S.data.hp.current<=1)escape();S.save();return true;}
  function hints(){const p=active(),s=S.data;if(p?.phase!=='trail')return [];return [...(p.x<s.x?['W']:p.x>s.x?['E']:[]),...(p.y<s.y?['N']:p.y>s.y?['S']:[])];}
  const prompt=b=>active()?.phase==='offer'&&b.x===active().x&&b.y===active().y?{label:'HEAR HER REQUEST',action:'siren:open'}:null;
  const status=()=>active()?.phase==='trail'?'THE STRANGER’S REQUEST · '+W.coords(active().x,active().y):active()?.phase==='offer'?'A STRANGER WAITS · '+W.coords(active().x,active().y):'';
  return {active,trapped,locked,valid,roll,here,accept,decline,arrive,act,hints,prompt,status,finish};
})();
