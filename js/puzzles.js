'use strict';
OR.puzzles=(()=>{
  const C=OR.content,S=OR.state,W=OR.world;
  const patterns={
    'puzzle-plate':[
      {name:'The Shieldbearer',clue:'One bar for the shield, none for the blade. Metal alone shall lift the stone.',item:'MetalIngot',qty:1},
      {name:'The Swordkeeper',clue:'One bar for the blade, none for the shield. Steel alone shall wake the lock.',item:'SteelIngot',qty:1},
      {name:'The Twin Shields',clue:'Two shields guard this hollow. Give each its bar of metal; bring no steel.',item:'MetalIngot',qty:2},
      {name:'The Twin Blades',clue:'Two blades cross the threshold. Give each its bar of steel; bring no metal.',item:'SteelIngot',qty:2}
    ],
    'puzzle-runes':[
      {name:'Nightfall',clue:'Read left to right: the moon watches the flame, and the flame warms the root.',order:[0,1,2]},
      {name:'The Old Cycle',clue:'Read left to right: from root comes flame; after flame comes the moon.',order:[2,1,0]},
      {name:'The Watchfire',clue:'The flame stands left, the moon stands right, and the root sleeps between them.',order:[1,2,0]},
      {name:'The Hidden Ember',clue:'The root stands left, the flame stands right, and the moon hangs between them.',order:[2,0,1]}
    ],
    'puzzle-levers':[
      {name:'The Procession',order:[0,1,2],village:'The wolf wakes the stag. The stag startles the raven. Follow their passage.',outer:'The raven wakes the wolf. The wolf startles the serpent. Follow their passage.'},
      {name:'The Return',order:[2,0,1],village:'First the raven calls, then the wolf answers, then the stag rises.',outer:'First the serpent stirs, then the raven calls, then the wolf answers.'},
      {name:'The Echo',order:[1,2,1,0],village:'The stag calls to the raven. The stag calls again. At last, the wolf replies.',outer:'The wolf calls to the serpent. The wolf calls again. At last, the raven replies.'},
      {name:'The Double Watch',order:[0,2,0,1],village:'Wolf, then raven. Wolf once more. The stag takes the final watch.',outer:'Raven, then serpent. Raven once more. The wolf takes the final watch.'}
    ]
  };
  const runes=[{name:'Moon',symbol:'○'},{name:'Flame',symbol:'△'},{name:'Root',symbol:'◇'}];
  const levers=b=>W.local(b.x,b.y)?['Wolf','Stag','Raven']:['Raven','Wolf','Serpent'];
  const create=id=>patterns[id]?{variant:C.random(0,patterns[id].length-1),wheels:[0,0,0],progress:0,offered:0,solved:false,entered:false,claimed:false,rewards:null}:null;
  function migrateUnique(){const seen=new Set(),history=new Set(S.data.puzzleHistory||[]),find=S.data.foundLoot;const priority=b=>b.questId?3:find?.source==='puzzle'&&find.x===b.x&&find.y===b.y?2:b.puzzle?.claimed?1:0;
    for(const b of [...S.data.blocks].sort((a,b)=>priority(b)-priority(a))){if(!b.puzzle||!patterns[b.subtype])continue;const key=b.subtype+':'+b.puzzle.variant;history.add(key);if(seen.has(key)&&!b.questId&&!(find?.source==='puzzle'&&find.x===b.x&&find.y===b.y)){if(b.subtype==='puzzle-plate'&&b.puzzle.offered&&!b.puzzle.solved)S.add(patterns[b.subtype][b.puzzle.variant].item,b.puzzle.offered);Object.assign(b,{elementType:'Nature',subtype:'clearing',resolved:true});delete b.puzzle;}else seen.add(key);}
    S.data.puzzleHistory=[...history];
  }
  function unused(){const used=new Set(S.data.puzzleHistory||[]);for(const b of S.data.blocks)if(b.puzzle&&patterns[b.subtype])used.add(b.subtype+':'+b.puzzle.variant);return Object.keys(patterns).flatMap(id=>patterns[id].map((_,variant)=>({id,variant}))).filter(p=>!used.has(p.id+':'+p.variant));}
  function unique(quest=false){const pool=unused();const reserve=!S.data.quests?.completed?.includes('watchpost')&&!S.data.blocks.some(b=>b.questId==='watchpost');if(!pool.length||!quest&&reserve&&pool.length<=1)return null;const p=C.pick(pool);S.data.puzzleHistory=[...new Set([...(S.data.puzzleHistory||[]),...S.data.blocks.filter(b=>b.puzzle&&patterns[b.subtype]).map(b=>b.subtype+':'+b.puzzle.variant),p.id+':'+p.variant])];return {subtype:p.id,puzzle:{...create(p.id),variant:p.variant}};}
  function ensure(b=W.current()){
    if(b.elementType!=='Puzzle'||!patterns[b.subtype])return null;
    if(!b.puzzle){b.puzzle=create(b.subtype);if(S.data.blocks.includes(b))S.save();}
    return b.puzzle;
  }
  const pattern=b=>patterns[b.subtype][ensure(b).variant];
  const clue=b=>{const p=pattern(b);return p.clue||p[W.local(b.x,b.y)?'village':'outer'];};
  function solve(b,p){
    p.solved=true;p.offered=0;
    p.rewards=[{type:C.pick(['MetalIngot','SteelIngot']),qty:C.random(3,5)},
      {type:C.pick(['Potion','Gem','SteelIngot']),qty:1}];
    S.log(C.entities[b.subtype].name+': the seal opens. A hidden chamber awaits.');S.save();
    return {title:'SEAL OPENED',detail:'The passage stays open. Enter to gather its treasure.',kind:'reward'};
  }
  function act(action,value){
    const s=S.data;if(!s||s.battle||s.outcome||s.foundLoot||s.hp.current<=1)return false;
    const b=W.current(),p=ensure(b);if(!p)return false;
    if(action==='enter'){
      if(!p.solved||p.entered||p.claimed)return false;
      p.entered=true;s.foundLoot={source:'puzzle',x:b.x,y:b.y,rewards:p.rewards.map(r=>({...r}))};
      S.log('Inside the hidden chamber, a sealed cache waits.');S.save();return {entered:true};
    }
    if(p.solved)return false;
    const rule=pattern(b);let result;
    if(b.subtype==='puzzle-plate'&&action==='offer'){
      if(!['MetalIngot','SteelIngot'].includes(value)||!S.qty(value))return false;
      if(value!==rule.item)return {title:'THE PLATE REJECTS IT',detail:'The ingot slides back into your hand. Nothing spent.',kind:'notice'};
      S.add(value,-1);p.offered++;
      if(p.offered===rule.qty)return solve(b,p);
      result={title:'THE PLATE SINKS',detail:p.offered+' ingot rests on the plate. The seal needs more weight.',kind:'notice'};
    }else if(b.subtype==='puzzle-plate'&&action==='recover'){
      if(!p.offered)return false;const n=p.offered;S.add(rule.item,n);p.offered=0;
      result={title:'OFFERING RECOVERED',detail:'+'+n+' '+C.items[rule.item].name+' returned to your pack.',kind:'reward'};
    }else if(b.subtype==='puzzle-runes'&&action==='turn'){
      const index=Number(value);if(!Number.isInteger(index)||index<0||index>2)return false;
      p.wheels[index]=(p.wheels[index]+1)%runes.length;S.save();return {quiet:true};
    }else if(b.subtype==='puzzle-runes'&&action==='check'){
      if(p.wheels.every((v,i)=>v===rule.order[i]))return solve(b,p);
      result={title:'THE SEAL HOLDS',detail:'The stones do not agree. Read the inscription and turn them again.',kind:'notice'};
    }else if(b.subtype==='puzzle-levers'&&action==='pull'){
      const index=Number(value);if(!Number.isInteger(index)||index<0||index>2)return false;
      if(rule.order[p.progress]!==index){p.progress=0;result={title:'THE LEVERS RESET',detail:'A dull clang. Begin the sequence again; nothing lost.',kind:'notice'};}
      else{p.progress++;if(p.progress===rule.order.length)return solve(b,p);result={title:'A LOCK RELEASES',detail:p.progress+' / '+rule.order.length+' pulls in sequence.',kind:'notice'};}
    }else if(action==='reset'&&b.subtype!=='puzzle-plate'){
      p.wheels=[0,0,0];p.progress=0;result={title:'MECHANISM RESET',detail:'The inscription remains your guide.',kind:'notice'};
    }else return false;
    S.save();return result;
  }
  return {patterns,runes,levers,create,migrateUnique,unused,unique,ensure,pattern,clue,act};
})();
