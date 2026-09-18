'use strict';
OR.ui=(()=>{
  const S=OR.state,C=OR.content,W=OR.world,A=OR.actions,B=OR.combat,P=OR.puzzles,V=OR.village;
  const $=id=>document.getElementById(id);
  let vitalitySnapshot=null,damageTimer=null,roundPhase=null,roundStartHealth=null,forgeFocus='armor',forgeSingle=false,hudObserver=null;
  function syncHudHeight(){const height=$('hud').getBoundingClientRect?.().height;if(height>0)for(const id of ['stage','toast','combat-toasts'])$(id).style?.setProperty('--hud-height',height+'px');}
  const visibleHealth=()=>combatBusy&&roundPhase==='player'&&roundStartHealth?roundStartHealth:S.data.hp;
  function damageFeedback(){
    const stage=$('stage');clearTimeout(damageTimer);stage.classList.remove('damage-taken');void stage.offsetWidth;stage.classList.add('damage-taken');
    damageTimer=setTimeout(()=>{stage.classList.remove('damage-taken');document.querySelector('.health-cell')?.classList.remove('vitality-damaged');document.querySelector('.vitality-loss')?.remove();},1400);
  }
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>Number(Number(n).toFixed(1));
  let screen='title',step=0,chosen='Sword',typing=null,typeFinish=null,toastTimer=null,focusBefore=null,roundPlayback=null,roundTimer=null,combatBusy=false,restTimer=null;
  const paths={explore:'M12 2 4 21l8-5 8 5-8-19Zm0 4v10',battle:'m4 3 13 13M3 3l1 5 4-4-5-1Zm17 0L7 16m14-13-1 5-4-4 5-1ZM3 16l5 5m8-5 5 5M5 18l-3 3m17-3 3 3',pack:'M7 7V5a5 5 0 0 1 10 0v2M5 7h14l2 14H3L5 7Zm3 5h8v5H8z',map:'m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5Zm6-3v17m8-14v17',hero:'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM4 22v-3a8 8 0 0 1 16 0v3',arrow:'M4 12h16m-7-7 7 7-7 7',forge:'m5 3 8 8-4 4-8-8 4-4Zm6 10 9 9m-4-8 5-5 2 2-5 5',journal:'M5 2h15v20H5a3 3 0 0 1 0-6h15M5 2v14m4-9h7m-7 4h7',heart:'M12 21 3 12C-3 4 7-2 12 6c5-8 15-2 9 6l-9 9Z',close:'m5 5 14 14M19 5 5 19',shield:'M12 2 3 6v7c0 5 9 9 9 9s9-4 9-9V6l-9-4Z',north:'m5 15 7-7 7 7',south:'m5 9 7 7 7-7',east:'m9 5 7 7-7 7',west:'m15 5-7 7 7 7'};
  const icon=(id,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]||paths.shield}"/></svg>`;
  const art=(id,alt,cls='',extra='')=>`<img class="${cls}" src="assets/${id}.png" alt="${escape(alt)}" ${extra}>`;
  const btn=(label,action,kind='primary',extra='')=>`<button class="btn ${kind}" data-action="${action}" ${extra}>${label}</button>`;
  const eyebrow=text=>`<div class="eyebrow">${text}</div>`;
  const sectionHead=(small,big,sub='')=>`<div class="section-head">${eyebrow(small)}<h1>${big}</h1>${sub?`<p>${sub}</p>`:''}</div>`;
  function asset(b){if(b.elementType==='Landmark')return b.subtype==='village-forge'?'forge-village':b.subtype+'-village'+(V.empty(b)?'-empty':'');const paired=['Home','Nature','NPC','Food','Animal','Thing','Dragon','LockedItem','BuriedItems','Craft','Puzzle','Path'].includes(b.elementType);return b.subtype+(paired?(W.local(b.x,b.y)?'-village':'-outer'):'');}
  const playerArt=()=>`warrior-${S.data.weapon.type.toLowerCase()}`;
  function hpBar(current,max,cls=''){const p=Math.max(0,Math.min(100,current/max*100));return `<div class="hp-track ${p<=25?'critical':p<=50?'wounded':''} ${cls}" role="progressbar" aria-label="Health" aria-valuenow="${num(current)}" aria-valuemin="0" aria-valuemax="${num(max)}"><span style="width:${p}%"></span></div>`;}
  function hud(){const s=S.data;if(!s){vitalitySnapshot=null;$('hud').hidden=true;$('nav').hidden=true;return;}const hp=visibleHealth();const lost=vitalitySnapshot?.data===s?Math.max(0,vitalitySnapshot.hp-hp.current):0,previousPercent=vitalitySnapshot?Math.min(100,100*vitalitySnapshot.hp/vitalitySnapshot.max):0;vitalitySnapshot={data:s,hp:hp.current,max:hp.max};const local=W.local(s.x,s.y),pack=s.inventory.reduce((n,i)=>n+i.qty,0);$('hud').hidden=false;$('nav').hidden=false;
    $('hud').innerHTML=`<div class="hud-place"><span class="realm-chip ${local?'':'outer'}">${icon('explore')}${local?'STRONGWOOD':'OUTER REALM'}</span><button class="coords" data-action="route:map" aria-label="Open map">${W.coords(s.x,s.y)} ${icon('map')}</button></div><div class="hud-stats"><div class="health-cell ${lost?'vitality-damaged':''}" style="--hp-before:${previousPercent}%">${lost?`<span class="vitality-loss" role="status" aria-live="polite">−${num(lost)} HP</span>`:''}<div class="micro">VITALITY ${S.qty('Potion')&&hp.current<hp.max?`<button class="quick-heal" data-action="potion" aria-label="Heal with potion">HEAL +</button>`:''}</div><strong>${num(hp.current)}<small> / ${num(hp.max)}</small></strong>${hpBar(hp.current,hp.max)}</div><button data-action="route:hero" class="stat-cell"><span>LVL</span><strong>${s.level}</strong><small>WARRIOR</small></button><button data-action="equipment:weapon" aria-label="${A.canCraft()?'Enhance weapon':'Weapon details'}" class="stat-cell ${S.qty('SteelIngot')>=A.weaponCost()?'ready':''}"><span>WPN</span><strong>${s.weapon.basePower}</strong><small>POWER</small></button><button data-action="equipment:armor" aria-label="${A.canCraft()?'Enhance armor':'Armor details'}" class="stat-cell ${S.qty('MetalIngot')>=A.armorCost()&&s.armor.resistance<95?'ready':''}"><span>ARM</span><strong>${s.armor.resistance}</strong><small>RESIST %</small></button><button data-action="route:pack" class="stat-cell"><span>PACK</span><strong>${pack}</strong><small>ITEMS</small></button></div>${S.error?`<p class="storage-error">${escape(S.error)}</p>`:''}`;
    if(lost)damageFeedback();
    $('nav').innerHTML=['explore','battle','pack','map','hero'].map(id=>`<button data-action="route:${id}" class="nav-item ${screen===id||(id==='explore'&&screen==='encounter')?'active':''}" ${id==='battle'&&!s.battle?'disabled':''} ${screen===id?'aria-current="page"':''}>${icon(id)}<span>${id.toUpperCase()}</span></button>`).join('');
  }
  function title(){return `<section class="title-screen"><div class="title-brand"><span class="brand-rune">${icon('shield')}</span><span>OMINOUS <b>REALMS</b><small>THE STRONGWOOD CHRONICLES</small></span></div><div class="title-hero">${art(S.data?playerArt():'warrior-sword','Strongwood warrior wearing ancestral iron armor','cover eager','fetchpriority="high"')}<div class="title-shade"></div><div class="title-copy">${eyebrow('A DARK FANTASY ADVENTURE')}<h1>EXPLORE.<br>FIGHT.<br><em>DEFEND.</em></h1></div><span class="vertical-mark">IRON IN YOUR BLOOD. HOME AT YOUR BACK.</span></div><div class="title-bottom"><p class="tagline">YOUR NAME. YOUR REALM. YOUR LEGEND.</p><p class="game-intro">Ominous Realms is a free dark fantasy browser RPG. Explore a persistent world, fight turn-based battles and uncover ancient puzzles.</p>${S.data?btn('CONTINUE JOURNEY '+icon('arrow'),'route:explore')+btn('NEW JOURNEY','reset','outline'):btn(`START YOUR JOURNEY ${icon('arrow')}`,'embark')}<div class="title-foot">FREE TO PLAY <i>·</i> NO DOWNLOAD <i>·</i> PLAY INSTANTLY</div>${S.error?`<p class="storage-error">${escape(S.error)}</p>`:''}<p class="game-links"><a href="how-to-play.html">How to play</a> · <a href="https://www.alterworldenterprises.com/">AlterWorld Enterprises</a></p><div class="chapter-mark"><span></span> I <span></span></div></div></section>`;}
  function embark(){const progress=`<div class="onboard-top"><button class="text-button" data-action="back-embark">${icon('west')} BACK</button><span>THE FIRST CHAPTER</span><span>${step+1} / 3</span></div><div class="step-bars">${[0,1,2].map(n=>`<span class="${n<=step?'filled':''}"></span>`).join('')}</div>`;
    if(step===0)return `${progress}<section class="onboard">${sectionHead('01 / YOUR INHERITANCE','BLOOD & IRON.')}<div class="portrait-plate father">${art('eldric','Father Eldric at the forge','cover')}<div class="plate-caption">${eyebrow('FATHER · BLACKSMITH · STRONGWOOD')}<h2>ELDRIC STRONGWOOD</h2></div></div><blockquote>“This iron guarded our family.<br>Now let it guard you.”</blockquote><div class="gear-strip">${art('armor','Ancestral iron armor')}<div><strong>ANCESTRAL IRON</strong><span>10% damage resistance · Family crest</span></div></div>${btn('ACCEPT ARMOR '+icon('arrow'),'accept-armor')}</section>`;
    if(step===1)return `${progress}<section class="onboard">${sectionHead('02 / YOUR WEAPON','CHOOSE YOUR EDGE.','Four paths. One defender.')}<div class="weapons">${Object.entries(C.weapons).map(([type,w])=>`<button class="weapon-option ${chosen===type?'selected':''}" data-action="choose:${type}" aria-pressed="${chosen===type}">${art('weapon-'+type.toLowerCase(),type)}<span class="weapon-info"><strong>${type.toUpperCase()}</strong><span>${w.pitch}</span><small>${w.moves[0].name.toUpperCase()} · +${w.moves[0].power} PWR · ${w.moves[0].accuracy}% ACC</small></span><span class="selection-dot"></span></button>`).join('')}</div>${btn('TAKE THE '+chosen.toUpperCase()+' '+icon('arrow'),'accept-weapon')}<p class="fine">Every weapon includes Tackle. Seek the village wizard to awaken crystal-powered Realmfire.</p></section>`;
    return `${progress}<section class="onboard">${sectionHead('03 / YOUR LEGEND','A NAME TO REMEMBER.')}<div class="portrait-plate name-portrait">${art('warrior-'+chosen.toLowerCase(),'Your chosen warrior','cover')}<div class="plate-caption">${eyebrow('STRONGWOOD’S NEW DEFENDER')}<h2>YOUR STORY BEGINS.</h2></div></div><form id="name-form"><label for="warrior-name" class="eyebrow">WARRIOR NAME <span>OPTIONAL</span></label><input id="warrior-name" name="name" autocomplete="off" maxlength="24" placeholder="Warrior"><p class="fine">Iron armor. ${chosen}. A village worth defending.</p><button class="btn primary" type="submit">NEXT · ENTER STRONGWOOD ${icon('arrow')}</button></form><p class="fine centered">Your name and weapon are sealed when you embark.</p></section>`;
  }
  function compass(actions=''){if(V.pendingGift())return actions?'<div class="tile-actions">'+actions+'</div>':'';return `<div class="compass-block"><div class="section-label"><span>CHOOSE YOUR PATH</span><span>${S.data.steps} STEPS</span></div><div class="compass">${['W','N','S','E'].map(d=>`<button class="direction dir-${d} ${S.data.direction===d?'last':''}" data-action="move:${d}" ${S.data.hp.current<=1?'disabled':''} aria-label="Move ${ {N:'north',S:'south',E:'east',W:'west'}[d]}">${icon({N:'north',S:'south',E:'east',W:'west'}[d])}<span>${{N:'NORTH',S:'SOUTH',E:'EAST',W:'WEST'}[d]}</span></button>`).join('')}</div>${actions?`<div class="tile-actions">${actions}</div>`:''}</div>`;}
  const activeDialogue=b=>['NPC','Landmark'].includes(b.elementType)&&b.resolved&&b.dialogue&&!b.dialogue.dismissed;
  function speechBubble(b){
    const d=b.dialogue,speaker=d.speaker||C.entities[b.subtype].name;
    return '<div class="speech-bubble '+(d.spoken?'':'silent')+'" data-dialogue>'+
      '<div class="speech-speaker">'+escape(speaker.toUpperCase())+' <span>· '+(d.spoken?'SPEAKING':'NO REPLY')+'</span></div>'+
      (d.narration?'<div class="speech-narration">'+escape(d.narration)+'</div>':'')+
      '<p class="speech-text" '+(d.spoken?'data-typewriter aria-hidden="true"':'')+'>'+escape(d.text)+'</p>'+
      (d.spoken?'<span class="sr-only" role="status" aria-live="polite">'+escape(speaker+' says: '+d.text)+'</span><button class="speech-skip" data-action="skip-dialogue">TAP TO REVEAL REPLY</button>':'')+'</div>';
  }
  function scene(b,encounter=false){
    const e=C.entities[b.subtype],local=W.local(b.x,b.y),talking=activeDialogue(b);
    return '<div class="scene '+(encounter?'encounter-scene ':'')+(talking?'has-dialogue ':'')+(local?'village':'outer')+'">'+art(asset(b),e.name,'cover eager','fetchpriority="high"')+
      '<div class="scene-shade"></div><div class="scene-top"><span class="scene-label">'+(talking?'IN CONVERSATION':encounter?'ENCOUNTER':b.elementType==='Home'?'THE PLACE YOU DEFEND':W.border(b.x,b.y)?'BEYOND THE VEIL':'THE JOURNEY CONTINUES')+'</span><span class="region-badge">'+(local?'VILLAGE':'OUTER REALM')+'</span></div><div class="scene-copy">'+
      eyebrow(b.elementType==='Nature'?'WILDERNESS':b.elementType.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase())+'<h1>'+escape(e.name.toUpperCase())+'</h1>'+
      (talking?speechBubble(b):'<p>'+escape(W.description(b))+'</p>')+'</div></div>';
  }
  function puzzleActions(b){
    const p=P.ensure(b),rule=P.pattern(b);
    if(p.claimed)return '<div class="puzzle-panel"><div class="eyebrow">CHAMBER SEARCHED</div><p>The passage remains open. Its treasure has already been gathered.</p></div>';
    if(p.solved)return '<div class="puzzle-panel"><div class="eyebrow">SEAL OPENED</div><p>A small chamber waits beyond the stone.</p>'+btn(b.subtype==='puzzle-plate'?'ENTER CAVE':'ENTER CHAMBER','puzzle:enter')+'</div>';
    let controls='';
    if(b.subtype==='puzzle-plate')controls='<p class="puzzle-status">ON THE PLATE: '+p.offered+' INGOT'+(p.offered===1?'':'S')+'</p><div class="button-pair">'+['MetalIngot','SteelIngot'].map(type=>btn('PLACE 1 '+(type==='MetalIngot'?'METAL':'STEEL'),'puzzle:offer-'+type,'outline',S.qty(type)?'':'disabled')).join('')+'</div><p class="fine">Pack: '+S.qty('MetalIngot')+' Metal · '+S.qty('SteelIngot')+' Steel. Opening consumes the offering. Until then, you can recover it.</p>'+(p.offered?btn('RECOVER OFFERING','puzzle:recover','outline'):'');
    if(b.subtype==='puzzle-runes')controls='<p class="fine">Left → right. Tap a stone to turn it, then test the seal.</p><div class="puzzle-controls">'+p.wheels.map((n,i)=>'<button class="puzzle-choice" data-action="puzzle:turn-'+i+'" aria-label="Turn '+['left','middle','right'][i]+' rune, currently '+P.runes[n].name+'"><span class="rune-symbol" aria-hidden="true">'+P.runes[n].symbol+'</span><strong>'+P.runes[n].name.toUpperCase()+'</strong><small>'+['LEFT','MIDDLE','RIGHT'][i]+'</small></button>').join('')+'</div>'+btn('TEST THE SEAL','puzzle:check')+'<p class="fine">○ Moon · △ Flame · ◇ Root. Wrong alignments cost nothing.</p>';
    if(b.subtype==='puzzle-levers')controls='<p class="puzzle-status">'+p.progress+' / '+rule.order.length+' PULLS IN SEQUENCE</p><div class="puzzle-controls">'+P.levers(b).map((name,i)=>btn(name.toUpperCase(),'puzzle:pull-'+i,'outline')).join('')+'</div><p class="fine">Follow the inscription. A wrong pull resets the sequence, without harm.</p>'+(p.progress?btn('RESET LEVERS','puzzle:reset','outline'):'');
    return '<div class="puzzle-panel">'+eyebrow('INSCRIPTION · '+rule.name.toUpperCase())+'<p class="puzzle-clue">“'+escape(P.clue(b))+'”</p>'+controls+'</div>';
  }
  function landmarkActions(b){
    if(b.subtype==='village-forge')return btn('ENTER THE FORGE '+icon('forge'),'forge:armor');
    if(V.completed(b.subtype))return '';
    if(activeDialogue(b))return btn(b.subtype==='wizard-sanctuary'?'ACCEPT ENCHANTMENT':'ACCEPT POTION','village:claim');
    return btn('SPEAK','village:speak');
  }
  function tileActions(b){switch(b.elementType){
    case 'Puzzle':return puzzleActions(b);
    case 'Home':return V.allVisited()?'<p class="fine">Strongwood has helped you prepare. The path ahead is yours to choose.</p>':S.data.village?.legacy?btn('ELDRIC’S FORGE '+icon('forge'),'forge:armor'):'<p class="fine">Start north. Follow the cobblestones to Eldric’s forge, then onward to the tavern, wizard and herbalist.</p>';
    case 'Landmark':return landmarkActions(b);
    case 'NPC':return '<div class="button-pair">'+btn('SPEAK','talk')+btn('ATTACK','npc-attack','outline')+'</div>';
    case 'Danger':
    case 'Enemy':return btn('ENTER BATTLE '+icon('battle'),'fight','danger');
    case 'Dragon':return '<div class="warning">ANCIENT THREAT · '+num(b.dragonHp)+' HP REMAINING</div>'+btn('ENTER BATTLE '+icon('battle'),'fight','danger');
    case 'Food':return btn('EAT MUSHROOMS','eat');
    case 'BuriedItems':return (b.digDepth?'<p class="dig-progress">'+b.dug+' '+(b.dug===1?'FOOT':'FEET')+' DUG · 1–2 HP PER FOOT</p>':'<p class="fine">The depth is unknown. Each foot costs 1–2 health.</p>')+btn(b.digDepth?'DIG ANOTHER FOOT':'BREAK GROUND','dig','primary',S.data.hp.current<=1?'disabled':'');
    case 'LockedItem':return btn('UNLOCK · '+(S.qty('Key')?'USE 1 KEY':'KEY REQUIRED'),'unlock','primary',!S.qty('Key')?'disabled':'');
    case 'Craft':return btn('ENTER THE FORGE '+icon('forge'),'forge:armor');
    default:return '';
  }}
  function restCountdown(){
    const seconds=Math.ceil((S.restStatus()?.remainingMs||0)/1000);
    return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  }
  function homeRecovery(){
    const s=S.data,status=S.restStatus();if(!status||s.outcome)return '';
    return '<div class="home-recovery" data-home-recovery>'+eyebrow('STRONGWOOD COTTAGE · RESTING')+'<h2>LET THE HEARTH HEAL.</h2>'+
      '<p>You recover automatically while at home—even with the game closed.</p>'+
      '<div class="rest-status"><span>FULL HEALTH IN</span><strong id="rest-countdown" aria-label="Time until fully healed">'+restCountdown()+'</strong></div>'+
      hpBar(s.hp.current,s.hp.max,'rest-progress')+
      '<p class="rest-note">'+num(s.hp.current)+' / '+num(s.hp.max)+' HP · '+(s.hp.current<=1?'Recover above 1 HP before leaving.':'Leave whenever you like; healing stops outside.')+'</p>'+
      (S.qty('Potion')?btn('USE POTION · HEAL INSTANTLY','potion','outline'):'')+'</div>';
  }
  function healingFind(){
    const s=S.data;
    if(!s.lastFind||s.lastFind.x!==s.x||s.lastFind.y!==s.y||!S.qty('Potion')||s.hp.current>=s.hp.max)return '';
    return '<div class="healing-find">'+art('item-potion','A crimson healing potion')+'<div>'+eyebrow('HEALING FOUND')+'<h2>ONE MORE CHANCE.</h2><p>+1 Potion in your pack. Restore all your health.</p></div>'+btn('DRINK POTION · FULL HEAL','potion')+'</div>';
  }
  function explore(encounter=false){const s=S.data,b=W.current(),interactive=['NPC','Danger','Enemy','Dragon','Food','BuriedItems','LockedItem','Craft','Puzzle','Landmark'].includes(b.elementType)&&!b.resolved;
    const suspended=s.battle?`<div class="resume-banner">${eyebrow('UNFINISHED BUSINESS')}<h2>THE FIGHT ISN’T OVER.</h2>${btn('RESUME BATTLE '+icon('battle'),'route:battle','danger')}</div>`:s.outcome?`<div class="resume-banner">${eyebrow('THE DUST HAS SETTLED')}<h2>${s.outcome.win?'VICTORY IS YOURS.':'YOU STILL BREATHE.'}</h2>${btn(s.outcome.win?'VIEW REWARDS':'RECOVER','route:aftermath',s.outcome.win?'primary':'outline')}</div>`:s.foundLoot?discoveryLoot():'';
    const walking=!interactive&&!activeDialogue(b)&&!suspended&&!S.restStatus()&&!healingFind();
    const prompts=['Home','Landmark'].includes(b.elementType)?tileActions(b):interactive?tileActions(b):'';
    return `<section class="exploration-view${walking?' walking-view':''}${prompts?' has-encounter-actions':''}${['Dragon','BuriedItems','Puzzle'].includes(b.elementType)?' extended-actions':''}">${scene(b,encounter)}<div class="explore-body">${healingFind()}${homeRecovery()}${suspended||compass(prompts)}<div class="utility-row"><button class="text-button" data-action="route:journal">${icon('journal')} JOURNAL</button><span>${s.blocks.length} PLACES DISCOVERED</span></div></div></section>`;
  }
  let combatToasts=[];
  function clearCombatToasts(){for(const entry of combatToasts){clearTimeout(entry.timer);entry.node.remove();}combatToasts=[];}
  function combatToast(kind,title,detail,value=''){
    clearTimeout(toastTimer);$('toast').classList.remove('show');
    // Keep the latest pair stacked below the HUD; notices never take page space.
    while(combatToasts.length>=2){const oldest=combatToasts.shift();clearTimeout(oldest.timer);oldest.node.remove();}
    const node=document.createElement('div');node.className='round-event '+kind+' combat-toast';
    node.innerHTML='<span><b>'+escape(title)+'</b><small>'+escape(detail)+'</small></span>'+(value?'<strong>'+escape(value)+'</strong>':'');
    $('combat-toasts').appendChild(node);
    const entry={node,timer:null};combatToasts.push(entry);
    entry.timer=setTimeout(()=>{node.remove();combatToasts=combatToasts.filter(item=>item!==entry);},5000);
  }
  function roundToast(r,enemy=false){
    if(r.received===null){
      if(!enemy){
        if(r.stagger)combatToast('hit','STAGGERED',r.move+' staggered '+(S.data.battle?.enemy.name||'the enemy')+' · ROUND '+r.round+' · NO COUNTER',num(r.dealt)+' DMG');
        else combatToast(r.magic?'magic-hit':'hit','ENEMY VANQUISHED',r.move+' vanquished '+S.data.outcome.enemy+' · ROUND '+r.round,num(r.dealt)+' DMG');
      }
      return;
    }
    const amount=enemy?r.received:r.dealt,kind=amount>0?(enemy?'hurt':r.magic?'magic-hit':'hit'):'miss';
    combatToast(kind,enemy?(amount>0?'YOU TOOK DAMAGE':'ENEMY MISSED'):(amount>0?'YOU HIT':'YOU MISSED'),
      (enemy?r.reply:r.move)+' · ROUND '+r.round,amount>0?(enemy?'−'+num(amount)+' HP':num(amount)+' DMG'):'MISS');
  }
  function battle(){
    const s=S.data,b=s.battle||roundPlayback;if(!b)return explore();
    const e=b.enemy,outer=!W.local(b.x,b.y),r=b.lastRound,hp=visibleHealth(),playerBeat=roundPhase==='player';
    const shake=combatBusy&&r&&(playerBeat?r.dealt>0:r.received>0);
    const actor=(enemy,portrait=false)=>{
      const amount=playerBeat?r?.dealt:r?.received,attacking=enemy?!playerBeat:playerBeat;
      const borderClass=combatBusy&&amount!==null&&amount!==undefined&&(amount>0||attacking)?' fighter-pulse '+(amount>0?(attacking?'border-hit':'border-hurt'):'border-miss'):'';
      const wrapper='<div class="fighter '+(enemy?'enemy':'player')+borderClass+'">';
      if(portrait)return wrapper+'<div class="fighter-art">'+
        art(enemy?(e.id==='dragon'?'dragon-'+(outer?'outer':'village'):e.id):playerArt(),enemy?e.name:s.name,'cover')+
        '</div></div>';
      return wrapper+'<div class="fighter-info">'+
        eyebrow((enemy?'ENEMY':'YOU')+' · LVL '+(enemy?e.level:s.level))+'<h2>'+escape(enemy?e.name:s.name)+'</h2><span>'+
        (enemy?(e.attackStyle?escape(e.attackStyle)+(e.defense?' · '+escape(e.defense)+' '+e.resistance+'%':''):e.weapon+' · '+e.resistance+'% ARM'):s.weapon.type+' · '+s.armor.resistance+'% ARM')+'</span>'+
        hpBar(enemy?e.hp:hp.current,enemy?e.maxHp:hp.max)+'<b>'+num(enemy?e.hp:hp.current)+' <small>/ '+num(enemy?e.maxHp:hp.max)+' HP</small></b></div></div>';
    };
    return '<section class="battle-screen '+(shake?'combat-impact':'')+'">'+
      '<div class="arena">'+actor(false,true)+'<span class="vs">VS</span>'+actor(true,true)+'</div><div class="battle-status" role="region" aria-label="Fighter health">'+actor(false)+actor(true)+'</div><div class="battle-body">'+
      '<div class="section-label"><span>'+(combatBusy?(playerBeat?'YOUR ATTACK':'ENEMY RESPONSE'):'MAKE YOUR MOVE')+'</span>'+(S.qty('LuckyCoin')?'<span class="gold">LUCK +5% ACC</span>':'<span>'+(combatBusy?'STEEL IN MOTION':'YOUR TURN')+'</span>')+'</div><div class="moves">'+
      s.weapon.moves.map((m,i)=>'<button class="move '+(m.magic?'magic':'')+'" data-action="attack:'+i+'" '+(combatBusy||(m.magic&&(!s.enchanted||!S.qty('MagicCrystal')))?'disabled':'')+'><span><strong>'+m.name.toUpperCase()+'</strong><small>'+(m.magic?(!s.enchanted?'SEEK THE VILLAGE WIZARD':S.qty('MagicCrystal')?'CONSUMES 1 CRYSTAL':'MAGIC CRYSTAL REQUIRED'):m.description)+'</small></span><span class="move-stats"><b>'+(s.weapon.basePower+m.power)+'<small>PWR</small></b><b>'+Math.min(100,m.accuracy+(S.qty('LuckyCoin')?5:0))+'%<small>ACC</small></b></span></button>').join('')+
      '</div><div class="button-pair">'+btn('FLEE','flee','outline',combatBusy?'disabled':'')+btn('BRIBE · 1 GEM','bribe','outline',combatBusy||!S.qty('Gem')?'disabled':'')+'</div><p class="fine centered">Fall, and rise again. Your health never falls below 1.</p></div></section>';
  }
  function rewardList(rewards){
    const totals=new Map();for(const r of rewards||[])if(C.items[r.type])totals.set(r.type,(totals.get(r.type)||0)+r.qty);
    return [...totals].map(([type,qty])=>({type,qty}));
  }
  function discoveryLoot(){
    const rewards=rewardList(S.data.foundLoot.rewards),puzzle=S.data.foundLoot.source==='puzzle';
    return '<div class="discovery-loot" role="region" aria-label="Discovered treasure">'+eyebrow(puzzle?'BEYOND THE SEAL':'THE EARTH GIVES WAY')+'<h2>'+(puzzle?'HIDDEN CHAMBER.':'TREASURE UNEARTHED.')+'</h2><p>'+(puzzle?'A forgotten cache rests inside. Gather your treasure.':'Brush off the soil. Here is what you found.')+'</p><div class="reward-list">'+rewards.map(r=>'<div class="reward-item">'+art(C.items[r.type].art,C.items[r.type].name)+'<span>'+C.items[r.type].name+'</span><strong>+'+r.qty+'</strong></div>').join('')+'</div>'+btn('GATHER LOOT '+icon('pack'),'gather-loot')+'</div>';
  }
  function aftermath(){
    const s=S.data,o=s.outcome;if(!o)return explore();
    const rewards=rewardList(o.rewards);
    return '<section class="aftermath '+(o.win?'victory':'defeat')+'"><div class="result-art">'+art(o.art,o.win?'Victorious Strongwood warrior':'Wounded warrior','cover')+
      '<div class="scene-shade"></div><div class="result-title">'+eyebrow(o.bribed?'A VICTORY BOUGHT':o.win?'STRONGWOOD STANDS':'DEFEATED · STILL ALIVE')+
      '<h1>'+(o.dragon?'DRAGON<br>SLAIN.':o.win?'YOU WIN.':'YOU FALL.')+'</h1></div></div><div class="result-body"><p>'+
      (o.win?escape(o.enemy)+' is no longer a threat.':s.hp.current<=1?'You wake at Strongwood Cottage with 1 HP.':'Your wounds are mending. '+num(s.hp.current)+' HP remaining.')+'</p>'+
      (o.win?'<div class="rewards-panel"><div class="section-label">YOUR REWARDS · ADDED TO YOUR PACK</div><div class="reward-list">'+rewards.map(r=>'<div class="reward-item">'+art(C.items[r.type].art,C.items[r.type].name)+'<span>'+C.items[r.type].name+'</span><strong>+'+r.qty+'</strong></div>').join('')+'</div></div>':'<div class="defeat-notice"><strong>NO LOOT THIS TIME.</strong><p>Carried home to (0,0). The cottage hearth will gradually heal you, even while away. Your pack is safe.</p></div>')+
      (o.levels?'<div class="level-banner">'+eyebrow('YOUR LEGEND GROWS')+'<strong>LEVEL '+s.level+'</strong><span>Full health · +'+o.levels+' weapon · +'+o.levels+' armor</span></div>':'')+
      (o.win?'<div class="result-stat"><strong>'+s.victories+'</strong><span>VICTORIES<br><small>'+S.levelProgress().remaining+' MORE WINS TO LEVEL '+(s.level+1)+'</small></span></div>':'')+
      btn((o.win?'CLAIM REWARDS':'WAKE AT HOME')+' '+icon('arrow'),o.win?'claim':'recover',o.win?'primary':'danger')+'</div></section>';
  }
  function pack(){
    const s=S.data;
    return '<section class="page">'+sectionHead('WHAT YOU CARRY','YOUR PACK.','Iron for the forge. A little luck for the road.')+
      '<div class="pack-top">'+art('warrior-bust','Strongwood warrior')+'<div><span class="eyebrow">'+s.inventory.reduce((n,i)=>n+i.qty,0)+' ITEMS HELD</span><strong>TRAVEL LIGHT.<br>HIT HARD.</strong></div></div>'+
      ['CRAFTING','SUPPLIES','RELICS','REMNANTS'].map(group=>'<div class="section-label"><span>'+group+'</span></div><div class="inventory-list">'+
        Object.entries(C.items).filter(([,i])=>i.group===group).map(([type,i])=>'<div class="inventory-entry"><div class="inventory-item '+(!S.qty(type)?'empty':'')+'">'+art(i.art,i.name,'item-art','loading="lazy"')+
          '<div><h2>'+i.name+'</h2><p>'+i.note+'</p>'+((type==='MetalIngot'&&S.qty(type)>=A.armorCost()&&s.armor.resistance<95)||(type==='SteelIngot'&&S.qty(type)>=A.weaponCost())?'<span class="craft-badge">INGOTS READY · FORGE REQUIRED</span>':'')+'</div><b>×'+S.qty(type)+'</b></div>'+
          (type==='Potion'?btn(s.hp.current>=s.hp.max?'HEALTH IS FULL':'USE POTION · FULL HEAL','potion','primary',(!S.qty('Potion')||s.hp.current>=s.hp.max)?'disabled':''):'')+'</div>').join('')+'</div>').join('')+'</section>';
  }
  function forge(){
    const s=S.data,atForge=A.atForge(),ready=A.canCraft(),home=W.current().subtype==='village-forge'||S.data.village?.legacy&&s.x===0&&s.y===0;
    const other=forgeFocus==='armor'?'weapon':'armor';
    const introduction=W.current().subtype==='village-forge'&&activeDialogue(W.current());
    const notice=!atForge?'Visit a forge to enhance. Follow a village path to Eldric’s forge.':!ready?'Finish your battle or gather your rewards before upgrading.':'Metal ingots reinforce armor. Steel ingots enhance weapons.';
    return '<section class="page">'+sectionHead(atForge?'TEMPER YOUR LEGEND':'KNOW YOUR EQUIPMENT',atForge?(home?'ELDRIC’S FORGE.':'WAYFARER’S FORGE.'):'YOUR EQUIPMENT.')+
      (atForge?'<div class="forge-art">'+art(home?'forge-village':'forge-'+(W.local(s.x,s.y)?'village':'outer'),home?'Eldric at his home forge':'A permanent wayfarer forge','cover')+'</div>':'')+
      '<p class="notice">'+notice+'</p>'+(home&&activeDialogue(W.current())?speechBubble(W.current())+(!V.completed('village-forge')?btn('ACCEPT INGOTS','village:claim'):''):'')+(introduction&&V.completed('village-forge')?compass():'')+(introduction?[]:forgeSingle?[forgeFocus]:[forgeFocus,other]).map(type=>{
        const ar=type==='armor',cost=ar?A.armorCost():A.weaponCost(),ingot=ar?'MetalIngot':'SteelIngot',available=S.qty(ingot),mastered=ar&&s.armor.resistance>=95;
        const current=ar?s.armor.resistance+'% RESISTANCE':s.weapon.basePower+' BASE POWER';
        const next=ar?Math.min(95,s.armor.resistance+1)+'% RESISTANCE':s.weapon.basePower+1+' BASE POWER';
        return '<div class="forge-card" id="forge-'+type+'">'+art(ar?'armor':'weapon-'+s.weapon.type.toLowerCase(),ar?'Ancestral iron armor':s.weapon.type)+
          '<div>'+eyebrow(ar?'ANCESTRAL IRON':s.weapon.type.toUpperCase())+'<h2>'+(atForge?(ar?'REINFORCE.':s.weapon.type==='Hammer'?'REFORGE.':'RESHARPEN.'):(ar?'YOUR ARMOR.':'YOUR WEAPON.'))+'</h2><p>'+current+'</p>'+
          '<span class="fine">'+(mastered?'Maximum resistance reached.':'Next: '+next+'<br>'+available+' / '+cost+' '+(ar?'Metal':'Steel')+' Ingots')+'</span></div>'+
          (atForge?btn(mastered?'ARMOR MASTERED':'ENHANCE '+type.toUpperCase(),'craft:'+type,'primary',!ready||available<cost||mastered?'disabled':''):'<p class="equipment-hint">Visit a forge to enhance.</p>')+'</div>';
      }).join('')+
      (s.battle?btn('BACK TO BATTLE','route:battle','outline'):s.outcome?btn('VIEW BATTLE RESULT','route:aftermath','outline'):'')+'</section>';
  }
  function trailMarkup(x,y){const dirs=V.connections(x,y);return dirs.length?'<span class="map-trail" aria-hidden="true">'+dirs.map(d=>'<i class="trail-'+d+'"></i>').join('')+'</span>':'';}
  function map(){const s=S.data,colors={Home:'home',NPC:'npc',Nature:'nature',Animal:'nature',Food:'food',Danger:'danger',Thing:'thing',Enemy:'danger',Dragon:'dragon',LockedItem:'treasure',BuriedItems:'treasure',Craft:'craft',Puzzle:'puzzle',Path:'path',Landmark:'landmark'};let grid='';for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){const x=s.x+dx,y=s.y+dy,b=W.at(x,y)||V.template(x,y),self=dx===0&&dy===0;grid+=`<button role="gridcell" class="map-cell ${b?colors[b.elementType]:'fog'} ${self?'you':''} ${W.border(x,y)?'border-cell':''} ${!W.local(x,y)?'outer-cell':''}" data-action="tile:${x},${y}" aria-label="${x}, ${y}: ${b?escape(b.elementType==='Home'?'Strongwood Cottage':C.entities[b.subtype].name):'Unexplored'}${self?', your location':''}">${trailMarkup(x,y)}${b&&(b.elementType==='Craft'||b.subtype==='village-forge')?icon('battle','forge-marker'):b?.elementType==='Landmark'?(self?'◆':({'wizard-sanctuary':'✦',tavern:'⌂','herbalist-cottage':'✚'}[b.subtype])):b?.elementType==='Puzzle'?(b.puzzle?.solved?'◇':'?'):self?'◆':''}</button>`;}
    return `<section class="page">${sectionHead('KNOW YOUR GROUND','THE REALMS.')}<div class="map-heading"><span>NORTH ↑</span><span>11 × 11 · LOCAL VIEW</span></div><div class="world-map" role="grid" aria-label="Discovered world map">${grid}</div><p id="map-detail" class="map-detail" aria-live="polite">${escape(C.entities[W.current().subtype].name)} · ${W.coords(s.x,s.y)}</p><div class="map-legend"><span><i class="nature"></i>Wilds</span><span><i class="npc"></i>People</span><span><i class="danger"></i>Threat</span><span><i class="treasure"></i>Finds</span><span>${icon('battle','forge-marker')}Forge</span><span><i class="home"></i>Home</span><span><i class="path"></i>Village paths</span><span><i class="landmark"></i>Village places</span><span><i class="puzzle"></i>Puzzle (?)</span><span><i class="outer-realm"></i>Outer Realm</span><span><i class="fog"></i>Fog</span><span><i class="border-cell"></i>Border</span></div><div class="map-summary"><div><strong>${s.blocks.length}</strong><span>DISCOVERED</span></div><div><strong>${Math.max(Math.abs(s.x),Math.abs(s.y))}</strong><span>TILES FROM HOME</span></div></div><p class="fine">Strongwood ends at ±25. The Outer Realm begins at ±26. Gold borders mark the crossing.</p><div class="map-landscape">${art('forest-'+(W.local(s.x,s.y)?'village':'outer'),'The realm around you','cover')}<span>${W.realm(s.x,s.y)}</span></div></section>`;
  }
  function hero(){const s=S.data,progress=S.levelProgress();return `<section class="hero-page"><div class="hero-portrait">${art(playerArt(),s.name,'cover')}<div class="scene-shade"></div><div class="hero-name">${eyebrow('STRONGWOOD’S DEFENDER · LEVEL '+s.level)}<h1>${escape(s.name.toUpperCase())}</h1><span>YOUR NAME. YOUR REALM. YOUR LEGEND.</span></div></div><div class="page hero-details"><div class="career-stats"><div><strong>${s.victories}</strong><span>VICTORIES</span></div><div><strong>${s.level}</strong><span>LEVEL</span></div><div><strong>${s.steps}</strong><span>STEPS TAKEN</span></div></div><div class="section-label"><span>LEVEL ${s.level+1}</span><span>${progress.earned} / ${progress.required} WINS</span></div><div class="xp-track"><span style="width:${progress.percent}%"></span></div><div class="hero-gear"><div>${art('weapon-'+s.weapon.type.toLowerCase(),s.weapon.type)}<strong>${s.weapon.type}</strong><span>${s.weapon.basePower} BASE POWER</span></div><div>${art('armor','Ancestral iron armor')}<strong>Ancestral Iron</strong><span>${s.armor.resistance}% RESISTANCE</span></div></div><div class="section-label">YOUR MOVESET</div><div class="move-summary">${s.weapon.moves.map(m=>`<div><span>${m.name}${m.magic?' · MAGIC':''}</span><b>+${m.power} / ${m.accuracy}%</b></div>`).join('')}</div><dl class="hero-facts"><div><dt>HEALTH</dt><dd>${num(s.hp.current)} / ${num(s.hp.max)}</dd></div><div><dt>REALM</dt><dd>${W.realm(s.x,s.y)}</dd></div><div><dt>POSITION</dt><dd>X ${s.x} · Y ${s.y}</dd></div><div><dt>HEADING</dt><dd>${{N:'North',S:'South',E:'East',W:'West'}[s.direction]||'North'}</dd></div></dl>${btn('READ YOUR JOURNAL '+icon('journal'),'route:journal','outline')}<div class="retire">${eyebrow('PERMANENT DECISION')}<h2>LAY DOWN YOUR IRON.</h2><p>Erase this warrior, their world, and their legend.</p>${btn('RESET JOURNEY','reset','danger-outline')}</div></div></section>`;}
  function journal(){return `<section class="page">${sectionHead('REMEMBER THE ROAD','YOUR JOURNAL.','The last 50 moments of your legend.')}<div class="journal-banner">${art('scroll-'+(W.local(S.data.x,S.data.y)?'village':'outer'),'An ancient scroll','cover')}</div><ol class="journal-list">${[...S.data.journal].reverse().map((line,i)=>`<li><span>${String(S.data.journal.length-i).padStart(2,'0')}</span><p>${escape(line)}</p></li>`).join('')}</ol></section>`;}
  function typewriter(){
    const el=document.querySelector('[data-typewriter]');if(!el)return;
    const bubble=el.closest('[data-dialogue]'),skip=bubble.querySelector('.speech-skip'),full=el.textContent;
    el.textContent='';let pos=0;bubble.classList.add('is-speaking');
    const finish=()=>{clearInterval(typing);typing=null;el.textContent=full;typeFinish=null;bubble.classList.remove('is-speaking');bubble.removeEventListener('click',finish);const label=bubble.querySelector('.speech-speaker span');if(label)label.textContent='· SAID';if(skip){skip.textContent='REPLY COMPLETE';skip.disabled=true;}};
    typeFinish=finish;bubble.addEventListener('click',finish,{once:true});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
    typing=setInterval(()=>{el.textContent=full.slice(0,++pos);if(pos>=full.length)finish();},12);
  }
  function render(keepScroll=false){if(S.syncRest().changed)S.save();if(typeFinish)typeFinish();const pos=window.scrollY;document.body.classList.toggle('in-game',!!S.data);document.body.classList.toggle('outer-world',!!S.data&&!W.local(S.data.x,S.data.y));const views={title,embark,explore,encounter:()=>explore(true),battle,aftermath,pack,forge,map,hero,journal};$('stage').innerHTML=(views[screen]||explore)()+(screen==='hero'?`<div class="page">${btn('RETURN TO TITLE','route:title','text')}</div>`:'');hud();syncHudHeight();typewriter();if(!keepScroll)window.scrollTo(0,0);else window.scrollTo(0,pos);}
  function route(id,replace=false,keepCombatToasts=false){if(!keepCombatToasts)clearCombatToasts();clearTimeout(roundTimer);roundPlayback=null;combatBusy=false;roundPhase=null;roundStartHealth=null;const allowed=['title','embark','explore','encounter','battle','aftermath','pack','forge','map','hero','journal'];if(!allowed.includes(id))id=S.data?'explore':'title';if(!S.data&&!['title','embark'].includes(id))id='title';if(S.data&&id==='embark')id='explore';if(id==='battle'&&!S.data?.battle)id='explore';if(id==='aftermath'&&!S.data?.outcome)id='explore';screen=id;if(S.data){S.data.state=S.data.battle?'Battle':id==='encounter'?'Interacting':'Explore';S.save();}history[replace?'replaceState':'pushState'](null,'','#'+id);render();$('stage').focus({preventScroll:true});if(id==='battle'&&S.data.battle&&!S.data.battle.lastRound)combatToast('opening','CHOOSE YOUR OPENING',S.data.battle.enemy.name+' awaits your move. · ROUND '+S.data.battle.round);}
  function toast(text,kind='notice',detail=''){clearCombatToasts();$('toast').className='toast-'+kind;$('toast').innerHTML='<strong>'+escape(text)+'</strong>'+(detail?'<span>'+escape(detail)+'</span>':'');$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),detail?5500:3300);}
  function confirmReset(){focusBefore=document.activeElement;$('modal').innerHTML=`${eyebrow('IRREVERSIBLE DECISION')}<h2 id="modal-title">RETIRE THIS WARRIOR?</h2><p>Your warrior, discovered world, pack, and journal will be erased.</p><p class="warning">THIS CANNOT BE UNDONE.</p>${btn('KEEP DEFENDING','cancel-modal','outline')}${btn('ERASE MY JOURNEY','confirm-reset','danger')}`;$('modal').showModal();$('modal').querySelector('button').focus();}
  function dispatch(action){if(combatBusy)return;const [key,value]=action.split(':');
    if(key==='route'){route(value);return;}
    if(key==='embark'){step=0;chosen='Sword';route('embark');return;}
    if(key==='back-embark'){if(step){step--;render();}else route('title');return;}
    if(key==='accept-armor'){step=1;render();return;}
    if(key==='choose'){if(C.weapons[value])chosen=value;render(true);return;}
    if(key==='accept-weapon'){step=2;render();return;}
    if(!S.data)return;
    if(key==='reset'){confirmReset();return;}
    if(key==='cancel-modal'){$('modal').close();focusBefore?.focus();return;}
    if(key==='confirm-reset'){if(S.reset()){$('modal').close();route('title',true);}else toast(S.error);return;}
    if(key==='tile'){const [x,y]=value.split(',').map(Number),b=W.at(x,y)||V.template(x,y);$('map-detail').textContent=(b?(b.elementType==='Home'?'Strongwood Cottage':C.entities[b.subtype].name):'Unexplored ground')+' · '+W.coords(x,y)+(W.border(x,y)?' · THE VEIL':'');return;}
    if(key==='rest'){if(A.rest()){route('explore');toast('RESTING AT HOME','reward','Health returns gradually, even while the game is closed.');}return;}
    if(key==='potion'){if(A.potion()){const remaining=S.qty('Potion');toast('HEALTH RESTORED','reward',remaining+' potion'+(remaining===1?'':'s')+' remaining.');}render(true);return;}
    if(key==='forge'||key==='equipment'){forgeSingle=key==='equipment';forgeFocus=value==='weapon'?'weapon':'armor';if(!forgeSingle&&W.current().subtype==='village-forge'&&!V.completed('village-forge'))V.speak();route('forge');return;}
    if(S.data.outcome&&!['claim','recover'].includes(key)){route('aftermath');return;}
    if(S.data.battle&&!['attack','flee','bribe'].includes(key)){route('battle');return;}
    if(S.data.foundLoot&&key!=='gather-loot'){route('explore');return;}
    switch(key){
      case 'move':{
        if(V.pendingGift())break;
        const b=W.current();let notice='';
        if(['N','S','E','W'].includes(value)&&S.data.hp.current>1&&['NPC','Danger','Enemy','Dragon','Food','BuriedItems','LockedItem','Craft','Puzzle','Landmark'].includes(b.elementType)&&(!b.resolved||activeDialogue(b))){
          if(A.ignore())notice=S.data.message;
        }
        if(W.move(value)){route('explore');if(S.data.lastFind)toast('POTION FOUND','reward','+1 Potion in your pack · Use HEAL to recover.');else if(notice)toast(notice);}
        break;
      }
      case 'village':{if(value==='speak'){if(V.speak())route('encounter');}else if(value==='claim'){const rewards=V.claim();if(rewards){render(true);toast(W.current().subtype==='wizard-sanctuary'?'WEAPON ENCHANTED':'GIFT RECEIVED','reward',rewardList(rewards).map(r=>'+'+r.qty+' '+C.items[r.type].name).join(' · '));}}break;}
      case 'puzzle':{
        const [verb,arg]=value.split('-'),result=P.act(verb,arg);if(!result)break;
        render(true);if(!result.quiet&&!result.entered)toast(result.title,result.kind,result.detail);
        if(/^(turn|pull)-[012]$/.test(value))document.querySelector('[data-action="puzzle:'+value+'"]')?.focus({preventScroll:true});
        break;
      }
      case 'talk':if(A.talk())route('encounter');break;
      case 'npc-attack':if(A.talk(true))route('encounter');break;
      case 'skip-dialogue':if(typeFinish)typeFinish();break;
      case 'ignore':{const ignored=A.ignore(),notice=S.data.message;route('explore');if(ignored&&notice)toast(notice);break;}
      case 'eat':{const before=S.data.hp.current;const eaten=A.eat();route('explore');const lost=before-S.data.hp.current;if(eaten&&lost>0)toast('POISONED · −'+num(lost)+' HP','danger','The mushrooms were poisonous. Your vitality has dropped.');else if(eaten)toast('HEALTH RESTORED','reward','The mushrooms mend your wounds.');break;}
      case 'dig':A.dig();if(S.data.foundLoot){clearTimeout(toastTimer);$('toast').classList.remove('show');}if(W.current().elementType!=='BuriedItems'||W.current().resolved){route('explore');if(!S.data.foundLoot)toast(S.data.message,'danger');}else{toast(S.data.message);render(true);}break;
      case 'gather-loot':{const rewards=A.gatherLoot();if(rewards){route('explore');toast('LOOT GATHERED','reward',rewardList(rewards).map(r=>'+'+r.qty+' '+C.items[r.type].name).join(' · ')+' · Added to your pack.');}break;}
      case 'unlock':if(A.unlock()){route('explore');toast('CHEST OPENED','reward',S.data.message);}break;
      case 'craft':if(A.craft(value)){forgeFocus=value;toast(value==='armor'?'ARMOR REINFORCED':'WEAPON ENHANCED');render(true);}break;
      case 'fight':if(B.start())route('battle');break;
      case 'attack':{
        const previous=S.data.battle,before={...S.data.hp};
        if(!B.attack(Number(value)))break;
        roundPlayback=previous;roundStartHealth=before;roundPhase='player';combatBusy=true;clearCombatToasts();render(true);roundToast(previous.lastRound);
        const finish=()=>{roundPlayback=null;roundStartHealth=null;roundPhase=null;combatBusy=false;if(S.data.outcome)route('aftermath',false,true);else{render(true);document.querySelector('[data-action="attack:'+Number(value)+'"]:not(:disabled)')?.focus({preventScroll:true});}};
        roundTimer=setTimeout(()=>{
          if(previous.lastRound.received===null){finish();return;}
          roundPhase='enemy';render(true);roundToast(previous.lastRound,true);
          roundTimer=setTimeout(finish,950);
        },950);
        break;
      }
      case 'flee':if(B.flee()){route('explore');toast(S.data.message);}break;
      case 'bribe':if(B.bribe())route('aftermath');break;
      case 'claim':case 'recover':{
        const result=S.data.outcome;if(!result)break;
        const loot=rewardList(result.rewards).map(r=>'+'+r.qty+' '+C.items[r.type].name).join(' · ');
        if(B.claim()){route('explore');toast(result.win?'LOOT SECURED':'SAFELY HOME',result.win?'reward':'danger',result.win?(loot||'Victory recorded.'):'Strongwood Cottage · '+num(S.data.hp.current)+' HP'+(S.data.hp.current<S.data.hp.max?' · Rest at home to heal.':' · Ready for the road.'));}
        break;
      }
    }
  }
  function updateRest(){
    if(!S.data)return;
    const result=S.syncRest();
    if(result.changed){S.save();if(!combatBusy)render(true);}
    const timer=$('rest-countdown');if(timer)timer.textContent=restCountdown();
    if(result.completed)toast('FULLY RESTED','reward','Your health is full. The road awaits.');
  }
  function init(){
    if(!hudObserver&&typeof ResizeObserver!=='undefined'){hudObserver=new ResizeObserver(syncHudHeight);hudObserver.observe($('hud'));}
    window.addEventListener('resize',syncHudHeight);
    W.rescueIfNeeded();clearInterval(restTimer);restTimer=setInterval(updateRest,1000);window.addEventListener('pagehide',()=>{if(S.data){S.syncRest();S.save();}});document.addEventListener('visibilitychange',updateRest);document.addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(target&&!target.disabled)dispatch(target.dataset.action);});document.addEventListener('submit',e=>{if(e.target.id!=='name-form')return;e.preventDefault();S.create(new FormData(e.target).get('name'),chosen);W.current();S.save();route('explore',true);});window.addEventListener('popstate',()=>route(location.hash.slice(1),true));$('modal').addEventListener('close',()=>focusBefore?.focus());route(S.data?'explore':'title',true);}
  return {init,route,render,dispatch,icon,escape,get screen(){return screen;}};
})();
