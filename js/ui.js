'use strict';
OR.ui=(()=>{
  const S=OR.state,C=OR.content,W=OR.world,A=OR.actions,B=OR.combat;
  const $=id=>document.getElementById(id);
  let vitalitySnapshot=null,damageTimer=null,roundPhase=null,roundStartHealth=null,forgeFocus='armor';
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
  function asset(b){const paired=['Home','Nature','NPC','Food','Animal','Thing','Dragon','LockedItem','BuriedItems','Craft'].includes(b.elementType);return b.subtype+(paired?(W.local(b.x,b.y)?'-village':'-outer'):'');}
  const playerArt=()=>`warrior-${S.data.weapon.type.toLowerCase()}`;
  function hpBar(current,max,cls=''){const p=Math.max(0,Math.min(100,current/max*100));return `<div class="hp-track ${p<=25?'critical':p<=50?'wounded':''} ${cls}" role="progressbar" aria-label="Health" aria-valuenow="${num(current)}" aria-valuemin="0" aria-valuemax="${num(max)}"><span style="width:${p}%"></span></div>`;}
  function hud(){const s=S.data;if(!s){vitalitySnapshot=null;$('hud').hidden=true;$('nav').hidden=true;return;}const hp=visibleHealth();const lost=vitalitySnapshot?.data===s?Math.max(0,vitalitySnapshot.hp-hp.current):0,previousPercent=vitalitySnapshot?Math.min(100,100*vitalitySnapshot.hp/vitalitySnapshot.max):0;vitalitySnapshot={data:s,hp:hp.current,max:hp.max};const local=W.local(s.x,s.y),pack=s.inventory.reduce((n,i)=>n+i.qty,0);$('hud').hidden=false;$('nav').hidden=false;
    $('hud').innerHTML=`<div class="hud-place"><span class="realm-chip ${local?'':'outer'}">${icon('explore')}${local?'STRONGWOOD':'OUTER REALM'}</span><button class="coords" data-action="route:map" aria-label="Open map">${W.coords(s.x,s.y)} ${icon('map')}</button></div><div class="hud-stats"><div class="health-cell ${lost?'vitality-damaged':''}" style="--hp-before:${previousPercent}%">${lost?`<span class="vitality-loss" role="status" aria-live="polite">−${num(lost)} HP</span>`:''}<div class="micro">VITALITY ${S.qty('Potion')&&hp.current<hp.max?`<button class="quick-heal" data-action="potion" aria-label="Heal with potion">HEAL +</button>`:''}</div><strong>${num(hp.current)}<small> / ${num(hp.max)}</small></strong>${hpBar(hp.current,hp.max)}</div><button data-action="route:hero" class="stat-cell"><span>LVL</span><strong>${s.level}</strong><small>WARRIOR</small></button><button data-action="forge:weapon" aria-label="Enhance weapon" class="stat-cell ${S.qty('SteelIngot')>=A.weaponCost()?'ready':''}"><span>WPN</span><strong>${s.weapon.basePower}</strong><small>POWER</small></button><button data-action="forge:armor" aria-label="Enhance armor" class="stat-cell ${S.qty('MetalIngot')>=A.armorCost()&&s.armor.resistance<95?'ready':''}"><span>ARM</span><strong>${s.armor.resistance}</strong><small>RESIST %</small></button><button data-action="route:pack" class="stat-cell"><span>PACK</span><strong>${pack}</strong><small>ITEMS</small></button></div>${S.error?`<p class="storage-error">${escape(S.error)}</p>`:''}`;
    if(lost)damageFeedback();
    $('nav').innerHTML=['explore','battle','pack','map','hero'].map(id=>`<button data-action="route:${id}" class="nav-item ${screen===id||(id==='explore'&&screen==='encounter')?'active':''}" ${id==='battle'&&!s.battle?'disabled':''} ${screen===id?'aria-current="page"':''}>${icon(id)}<span>${id.toUpperCase()}</span></button>`).join('');
  }
  function title(){return `<section class="title-screen"><div class="title-brand"><span class="brand-rune">${icon('shield')}</span><span>OMINOUS <b>REALMS</b><small>THE STRONGWOOD CHRONICLES</small></span></div><div class="title-hero">${art(S.data?playerArt():'warrior-sword','Strongwood warrior wearing ancestral iron armor','cover eager','fetchpriority="high"')}<div class="title-shade"></div><div class="title-copy">${eyebrow('A DARK FANTASY ADVENTURE')}<h1>EXPLORE.<br>FIGHT.<br><em>DEFEND.</em></h1></div><span class="vertical-mark">IRON IN YOUR BLOOD. HOME AT YOUR BACK.</span></div><div class="title-bottom"><p class="tagline">YOUR NAME. YOUR REALM. YOUR LEGEND.</p>${S.data?btn('CONTINUE JOURNEY '+icon('arrow'),'route:explore')+btn('NEW JOURNEY','reset','outline'):btn(`START YOUR JOURNEY ${icon('arrow')}`,'embark')}<div class="title-foot">FREE TO PLAY <i>·</i> NO DOWNLOAD <i>·</i> PLAY INSTANTLY</div>${S.error?`<p class="storage-error">${escape(S.error)}</p>`:''}<div class="chapter-mark"><span></span> I <span></span></div></div></section>`;}
  function embark(){const progress=`<div class="onboard-top"><button class="text-button" data-action="back-embark">${icon('west')} BACK</button><span>THE FIRST CHAPTER</span><span>${step+1} / 3</span></div><div class="step-bars">${[0,1,2].map(n=>`<span class="${n<=step?'filled':''}"></span>`).join('')}</div>`;
    if(step===0)return `${progress}<section class="onboard">${sectionHead('01 / YOUR INHERITANCE','BLOOD & IRON.')}<div class="portrait-plate father">${art('eldric','Father Eldric at the forge','cover')}<div class="plate-caption">${eyebrow('FATHER · BLACKSMITH · STRONGWOOD')}<h2>ELDRIC STRONGWOOD</h2></div></div><blockquote>“This iron guarded our family.<br>Now let it guard you.”</blockquote><div class="gear-strip">${art('armor','Ancestral iron armor')}<div><strong>ANCESTRAL IRON</strong><span>10% damage resistance · Family crest</span></div></div>${btn('ACCEPT ARMOR '+icon('arrow'),'accept-armor')}</section>`;
    if(step===1)return `${progress}<section class="onboard">${sectionHead('02 / YOUR WEAPON','CHOOSE YOUR EDGE.','Four paths. One defender.')}<div class="weapons">${Object.entries(C.weapons).map(([type,w])=>`<button class="weapon-option ${chosen===type?'selected':''}" data-action="choose:${type}" aria-pressed="${chosen===type}">${art('weapon-'+type.toLowerCase(),type)}<span class="weapon-info"><strong>${type.toUpperCase()}</strong><span>${w.pitch}</span><small>${w.moves[0].name.toUpperCase()} · +${w.moves[0].power} PWR · ${w.moves[0].accuracy}% ACC</small></span><span class="selection-dot"></span></button>`).join('')}</div>${btn('TAKE THE '+chosen.toUpperCase()+' '+icon('arrow'),'accept-weapon')}<p class="fine">Every weapon includes Tackle and crystal-powered Realmfire.</p></section>`;
    return `${progress}<section class="onboard">${sectionHead('03 / YOUR LEGEND','A NAME TO REMEMBER.')}<div class="portrait-plate name-portrait">${art('warrior-'+chosen.toLowerCase(),'Your chosen warrior','cover')}<div class="plate-caption">${eyebrow('STRONGWOOD’S NEW DEFENDER')}<h2>YOUR STORY BEGINS.</h2></div></div><form id="name-form"><label for="warrior-name" class="eyebrow">WARRIOR NAME <span>OPTIONAL</span></label><input id="warrior-name" name="name" autocomplete="off" maxlength="24" placeholder="Warrior"><p class="fine">Iron armor. ${chosen}. A village worth defending.</p><button class="btn primary" type="submit">NEXT · ENTER STRONGWOOD ${icon('arrow')}</button></form><p class="fine centered">Your name and weapon are sealed when you embark.</p></section>`;
  }
  function compass(){return `<div class="compass-block"><div class="section-label"><span>CHOOSE YOUR PATH</span><span>${S.data.steps} STEPS</span></div><div class="compass">${['W','N','S','E'].map(d=>`<button class="direction dir-${d} ${S.data.direction===d?'last':''}" data-action="move:${d}" ${S.data.hp.current<=1?'disabled':''} aria-label="Move ${ {N:'north',S:'south',E:'east',W:'west'}[d]}">${icon({N:'north',S:'south',E:'east',W:'west'}[d])}<span>${{N:'NORTH',S:'SOUTH',E:'EAST',W:'WEST'}[d]}</span></button>`).join('')}</div></div>`;}
  const activeDialogue=b=>b.elementType==='NPC'&&b.resolved&&b.dialogue&&!b.dialogue.dismissed;
  function speechBubble(b){
    const d=b.dialogue,speaker=C.entities[b.subtype].name;
    return '<div class="speech-bubble '+(d.spoken?'':'silent')+'" data-dialogue>'+
      '<div class="speech-speaker">'+escape(speaker.toUpperCase())+' <span>· '+(d.spoken?'SPEAKING':'NO REPLY')+'</span></div>'+
      (d.narration?'<div class="speech-narration">'+escape(d.narration)+'</div>':'')+
      '<p class="speech-text" '+(d.spoken?'data-typewriter aria-hidden="true"':'')+'>'+escape(d.text)+'</p>'+
      (d.spoken?'<span class="sr-only" role="status" aria-live="polite">'+escape(speaker+' says: '+d.text)+'</span><button class="speech-skip" data-action="skip-dialogue">TAP TO REVEAL REPLY</button>':'')+'</div>';
  }
  function scene(b,encounter=false){
    const e=C.entities[b.subtype],local=W.local(b.x,b.y),talking=activeDialogue(b),s=S.data;
    const recent=b.resolved&&!b.dialogue&&!s.homecoming&&!s.battle&&!s.outcome&&!s.foundLoot&&s.message?'<p class="recent-message" role="status">'+escape(s.message)+'</p>':'';
    return '<div class="scene '+(encounter?'encounter-scene ':'')+(talking?'has-dialogue ':'')+(local?'village':'outer')+'">'+art(asset(b),e.name,'cover eager','fetchpriority="high"')+
      '<div class="scene-shade"></div><div class="scene-top"><span class="scene-label">'+(talking?'IN CONVERSATION':encounter?'ENCOUNTER':b.elementType==='Home'?'THE PLACE YOU DEFEND':W.border(b.x,b.y)?'BEYOND THE VEIL':'THE JOURNEY CONTINUES')+'</span><span class="region-badge">'+(local?'VILLAGE':'OUTER REALM')+'</span>'+recent+'</div><div class="scene-copy">'+
      eyebrow(b.elementType==='Nature'?'WILDERNESS':b.elementType.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase())+'<h1>'+escape(e.name.toUpperCase())+'</h1>'+
      (talking?speechBubble(b):'<p>'+escape(W.description(b))+'</p>')+'</div></div>';
  }
  function tileActions(b){switch(b.elementType){
    case 'NPC':return btn('SPEAK','talk')+`<div class="button-pair">${btn('ATTACK','npc-attack','outline')}${btn('KEEP WALKING','ignore','outline')}</div>`;
    case 'Danger':
    case 'Enemy':return btn('ENTER BATTLE '+icon('battle'),'fight','danger')+btn('KEEP WALKING','ignore','outline');
    case 'Dragon':return `<div class="warning">ANCIENT THREAT · ${num(b.dragonHp)} HP REMAINING</div>`+btn('ENTER BATTLE '+icon('battle'),'fight','danger')+btn('KEEP WALKING','ignore','outline');
    case 'Food':return btn('EAT MUSHROOMS','eat')+btn('IGNORE','ignore','outline');
    case 'BuriedItems':return `${b.digDepth?`<p class="dig-progress">${b.dug} / ${b.digDepth} FEET · 1–2 HP PER FOOT</p>`:'<p class="fine">Buried 3–6 feet deep. Each foot costs 1–2 health.</p>'}`+btn(b.digDepth?'DIG ANOTHER FOOT':'BREAK GROUND','dig','primary',S.data.hp.current<=1?'disabled':'')+btn('IGNORE','ignore','outline');
    case 'LockedItem':return btn(`UNLOCK · ${S.qty('Key')?'USE 1 KEY':'KEY REQUIRED'}`,'unlock','primary',!S.qty('Key')?'disabled':'')+btn('IGNORE','ignore','outline');
    case 'Craft':return btn('ENHANCE ARMOR '+icon('shield'),'forge:armor')+btn('ENHANCE WEAPON '+icon('battle'),'forge:weapon','outline')+btn('KEEP WALKING','ignore','outline');
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
  function explore(encounter=false){const s=S.data,b=W.current(),interactive=['NPC','Danger','Enemy','Dragon','Food','BuriedItems','LockedItem','Craft'].includes(b.elementType)&&!b.resolved;
    const suspended=s.battle?`<div class="resume-banner">${eyebrow('UNFINISHED BUSINESS')}<h2>THE FIGHT ISN’T OVER.</h2>${btn('RESUME BATTLE '+icon('battle'),'route:battle','danger')}</div>`:s.outcome?`<div class="resume-banner">${eyebrow('THE DUST HAS SETTLED')}<h2>${s.outcome.win?'VICTORY IS YOURS.':'YOU STILL BREATHE.'}</h2>${btn(s.outcome.win?'VIEW REWARDS':'RECOVER','route:aftermath',s.outcome.win?'primary':'outline')}</div>`:s.foundLoot?discoveryLoot():'';
    const walking=!interactive&&!activeDialogue(b)&&!suspended&&!S.restStatus()&&!healingFind();
    return `<section class="exploration-view${walking?' walking-view':''}">${scene(b,encounter)}<div class="explore-body">${healingFind()}${homeRecovery()}${suspended||`${activeDialogue(b)?`<div class="tile-actions">${btn('END CONVERSATION '+icon('arrow'),'end-conversation','outline')}</div>`:interactive?`<div class="tile-actions">${encounter||['NPC','Danger','Enemy','Dragon'].includes(b.elementType)?tileActions(b):btn('INVESTIGATE '+icon('arrow'),'route:encounter')+btn('KEEP WALKING','ignore','outline')}</div>`:compass()}`}<div class="utility-row"><button class="text-button" data-action="route:journal">${icon('journal')} JOURNAL</button><span>${s.blocks.length} PLACES DISCOVERED</span></div></div></section>`;
  }
  function roundFeedback(r,pending=false){
    if(!r)return '';
    const outgoing=r.dealt>0?(r.magic?'magic-hit':'hit'):'miss';
    return '<div class="round-feedback" role="status" aria-live="polite">'+
      '<div class="round-event '+outgoing+'"><span><b>'+(r.dealt>0?'YOU HIT':'YOU MISSED')+'</b><small>'+escape(r.move)+'</small></span><strong>'+(r.dealt>0?num(r.dealt)+' DMG':'MISS')+'</strong></div>'+
      (pending?'<div class="round-event pending"><span><b>ENEMY PREPARING</b><small>The enemy readies a response…</small></span><strong>…</strong></div>':r.received===null?'<div class="round-event hit"><span><b>ENEMY DEFEATED</b><small>No counterattack</small></span><strong>KO</strong></div>':'<div class="round-event '+(r.received>0?'hurt':'miss')+'"><span><b>'+(r.received>0?'YOU TOOK DAMAGE':'ENEMY MISSED')+'</b><small>'+escape(r.reply)+'</small></span><strong>'+(r.received>0?'−'+num(r.received)+' HP':'MISS')+'</strong></div>')+'</div>';
  }
  function impactBadge(amount,enemy,magic=false){
    if(amount===null||amount===undefined)return '';
    const kind=amount>0?(enemy?(magic?'magic-hit':'hit'):'hurt'):'miss';
    return '<div class="impact-badge '+kind+'"><strong>'+(amount>0?'−'+num(amount):'MISS')+'</strong><span>'+(amount>0?(enemy?'HIT LANDED':'DAMAGE TAKEN'):(enemy?'ATTACK MISSED':'DODGED'))+'</span></div>';
  }
  function battle(){
    const s=S.data,b=s.battle||roundPlayback;if(!b)return explore();
    const e=b.enemy,outer=!W.local(b.x,b.y),r=b.lastRound,hp=visibleHealth(),playerBeat=roundPhase==='player',pending=combatBusy&&playerBeat&&r?.received!==null;
    const shake=combatBusy&&r&&(playerBeat?r.dealt>0:r.received>0);
    const actor=(enemy)=>{
      const amount=enemy?(playerBeat?r?.dealt:null):(playerBeat?null:r?.received);
      const hitClass=combatBusy&&amount>0?(enemy?'struck-enemy':'struck-player'):'';
      return '<div class="fighter '+(enemy?'enemy':'player')+'"><div class="fighter-art '+hitClass+'">'+
        art(enemy?(e.id==='dragon'?'dragon-'+(outer?'outer':'village'):e.id):playerArt(),enemy?e.name:s.name,'cover')+
        (combatBusy?impactBadge(amount,enemy,r?.magic):'')+'</div><div class="fighter-info">'+
        eyebrow((enemy?'ENEMY':'YOU')+' · LVL '+(enemy?e.level:s.level))+'<h2>'+escape(enemy?e.name:s.name)+'</h2><span>'+
        (enemy?e.weapon:s.weapon.type)+' · '+(enemy?e.resistance:s.armor.resistance)+'% ARM</span>'+
        hpBar(enemy?e.hp:hp.current,enemy?e.maxHp:hp.max)+'<b>'+num(enemy?e.hp:hp.current)+' <small>/ '+num(enemy?e.maxHp:hp.max)+' HP</small></b></div></div>';
    };
    return '<section class="battle-screen '+(shake?'combat-impact':'')+'"><div class="battle-head">'+eyebrow('DEFEND YOUR REALM')+
      '<h1>STEEL MEETS SHADOW.</h1><div class="round-label"><span></span> ROUND '+String(combatBusy&&r?r.round:b.round).padStart(2,'0')+' <span></span></div></div>'+
      '<div class="arena">'+actor(false)+'<span class="vs">VS</span>'+actor(true)+'</div><div class="battle-body">'+
      (r?roundFeedback(r,pending):'<p class="combat-log" aria-live="polite">'+escape(b.log)+'</p>')+
      '<div class="section-label"><span>'+(combatBusy?(playerBeat?'YOUR ATTACK':'ENEMY RESPONSE'):'MAKE YOUR MOVE')+'</span>'+(S.qty('LuckyCoin')?'<span class="gold">LUCK +5% ACC</span>':'<span>'+(combatBusy?'STEEL IN MOTION':'YOUR TURN')+'</span>')+'</div><div class="moves">'+
      s.weapon.moves.map((m,i)=>'<button class="move '+(m.magic?'magic':'')+'" data-action="attack:'+i+'" '+(combatBusy||(m.magic&&!S.qty('MagicCrystal'))?'disabled':'')+'><span><strong>'+m.name.toUpperCase()+'</strong><small>'+(m.magic?(S.qty('MagicCrystal')?'CONSUMES 1 CRYSTAL':'MAGIC CRYSTAL REQUIRED'):m.description)+'</small></span><span class="move-stats"><b>'+(s.weapon.basePower+m.power)+'<small>PWR</small></b><b>'+Math.min(100,m.accuracy+(S.qty('LuckyCoin')?5:0))+'%<small>ACC</small></b></span></button>').join('')+
      '</div><div class="button-pair">'+btn('FLEE','flee','outline',combatBusy?'disabled':'')+btn('BRIBE · 1 GEM','bribe','outline',combatBusy||!S.qty('Gem')?'disabled':'')+'</div><p class="fine centered">Fall, and rise again. Your health never falls below 1.</p></div></section>';
  }
  function rewardList(rewards){
    const totals=new Map();for(const r of rewards||[])if(C.items[r.type])totals.set(r.type,(totals.get(r.type)||0)+r.qty);
    return [...totals].map(([type,qty])=>({type,qty}));
  }
  function discoveryLoot(){
    const rewards=rewardList(S.data.foundLoot.rewards);
    return '<div class="discovery-loot" role="region" aria-label="Unearthed treasure">'+eyebrow('THE EARTH GIVES WAY')+'<h2>TREASURE UNEARTHED.</h2><p>Brush off the soil. Here is what you found.</p><div class="reward-list">'+rewards.map(r=>'<div class="reward-item">'+art(C.items[r.type].art,C.items[r.type].name)+'<span>'+C.items[r.type].name+'</span><strong>+'+r.qty+'</strong></div>').join('')+'</div>'+btn('GATHER LOOT '+icon('pack'),'gather-loot')+'</div>';
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
      (o.win?'<div class="result-stat"><strong>'+s.victories+'</strong><span>VICTORIES<br><small>'+Math.ceil(C.required(s.level))+' TO NEXT LEVEL</small></span></div>':'')+
      btn((o.win?'CLAIM REWARDS':'WAKE AT HOME')+' '+icon('arrow'),o.win?'claim':'recover',o.win?'primary':'danger')+'</div></section>';
  }
  function pack(){const s=S.data;return `<section class="page">${sectionHead('WHAT YOU CARRY','YOUR PACK.','Iron for the forge. A little luck for the road.')}<div class="pack-top">${art('warrior-bust','Strongwood warrior')}<div><span class="eyebrow">${s.inventory.reduce((n,i)=>n+i.qty,0)} ITEMS HELD</span><strong>TRAVEL LIGHT.<br>HIT HARD.</strong></div></div>${['CRAFTING','SUPPLIES','RELICS','REMNANTS'].map(group=>`<div class="section-label"><span>${group}</span></div><div class="inventory-list">${Object.entries(C.items).filter(([,i])=>i.group===group).map(([type,i])=>`<div class="inventory-item ${!S.qty(type)?'empty':''}">${art(i.art,i.name,'item-art','loading="lazy"')}<div><h2>${i.name}</h2><p>${i.note}</p>${(type==='MetalIngot'&&S.qty(type)>=A.armorCost()&&s.armor.resistance<95)||(type==='SteelIngot'&&S.qty(type)>=A.weaponCost())?'<span class="craft-badge">UPGRADE READY</span>':''}</div><b>×${S.qty(type)}</b></div>`).join('')}</div>`).join('')}${btn(s.hp.current>=s.hp.max?'HEALTH IS FULL':'USE POTION · FULL HEAL','potion','primary',(!S.qty('Potion')||s.hp.current>=s.hp.max)?'disabled':'')}${btn('UPGRADE GEAR '+icon('forge'),'route:forge','outline')}</section>`;}
  function forge(){const s=S.data,here=!s.battle&&!s.outcome,atForge=W.current().elementType==='Craft';return `<section class="page">${sectionHead('TEMPER YOUR LEGEND','UPGRADE YOUR GEAR.')}<div class="forge-art">${art('forge-'+(W.local(s.x,s.y)?'village':'outer'),'A glowing wayfarer forge','cover')}</div>${!here?'<p class="notice">Finish your battle and collect its result before upgrading.</p>':'<p class="notice">Upgrade wherever the road takes you. Metal for armor, steel for weapons.</p>'}${['armor','weapon'].map(type=>{const ar=type==='armor',cost=ar?A.armorCost():A.weaponCost(),ingot=ar?'MetalIngot':'SteelIngot',available=S.qty(ingot);return `<div class="forge-card" id="forge-${type}">${art(ar?'armor':'weapon-'+s.weapon.type.toLowerCase(),ar?'Ancestral iron armor':s.weapon.type)}<div>${eyebrow(ar?'ANCESTRAL IRON':s.weapon.type.toUpperCase())}<h2>${ar?'REINFORCE.':'RESHARPEN.'}</h2><p>${ar?s.armor.resistance+'% → '+Math.min(95,s.armor.resistance+1)+'% RESIST':s.weapon.basePower+' → '+(s.weapon.basePower+1)+' POWER'}</p><span class="fine">${available} / ${cost} ${ar?'Metal':'Steel'} Ingots</span></div>${btn(ar&&s.armor.resistance>=95?'ARMOR MASTERED':'ENHANCE '+type.toUpperCase(),'craft:'+type,'primary',!here||available<cost||(ar&&s.armor.resistance>=95)?'disabled':'')}</div>`;}).join('')}${here?btn('ENHANCE '+(forgeFocus==='armor'?'WEAPON':'ARMOR'),'forge:'+(forgeFocus==='armor'?'weapon':'armor'),'outline')+btn('KEEP WALKING',atForge?'ignore':'route:explore','outline'):btn('BACK TO EXPLORING','route:explore','outline')}</section>`;}
  function map(){const s=S.data,colors={Home:'home',NPC:'npc',Nature:'nature',Animal:'nature',Food:'food',Danger:'danger',Thing:'thing',Enemy:'danger',Dragon:'dragon',LockedItem:'treasure',BuriedItems:'treasure',Craft:'craft'};let grid='';for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){const x=s.x+dx,y=s.y+dy,b=W.at(x,y),self=dx===0&&dy===0;grid+=`<button role="gridcell" class="map-cell ${b?colors[b.elementType]:'fog'} ${self?'you':''} ${W.border(x,y)?'border-cell':''} ${!W.local(x,y)?'outer-cell':''}" data-action="tile:${x},${y}" aria-label="${x}, ${y}: ${b?escape(C.entities[b.subtype].name):'Unexplored'}${self?', your location':''}">${self?'◆':b?.elementType==='Home'?'⌂':b?.elementType==='Craft'?'+':''}</button>`;}
    return `<section class="page">${sectionHead('KNOW YOUR GROUND','THE REALMS.')}<div class="map-heading"><span>NORTH ↑</span><span>11 × 11 · LOCAL VIEW</span></div><div class="world-map" role="grid" aria-label="Discovered world map">${grid}</div><p id="map-detail" class="map-detail" aria-live="polite">${escape(C.entities[W.current().subtype].name)} · ${W.coords(s.x,s.y)}</p><div class="map-legend"><span><i class="nature"></i>Wilds</span><span><i class="npc"></i>People</span><span><i class="danger"></i>Threat</span><span><i class="treasure"></i>Finds</span><span><i class="fog"></i>Fog</span><span><i class="border-cell"></i>Border</span></div><div class="map-summary"><div><strong>${s.blocks.length}</strong><span>DISCOVERED</span></div><div><strong>${Math.max(Math.abs(s.x),Math.abs(s.y))}</strong><span>TILES FROM HOME</span></div></div><p class="fine">Strongwood ends at ±25. The Outer Realm begins at ±26. Gold borders mark the crossing.</p><div class="map-landscape">${art('forest-'+(W.local(s.x,s.y)?'village':'outer'),'The realm around you','cover')}<span>${W.realm(s.x,s.y)}</span></div>${btn('KEEP EXPLORING '+icon('arrow'),'route:explore')}</section>`;
  }
  function hero(){const s=S.data,target=Math.ceil(C.required(s.level));return `<section class="hero-page"><div class="hero-portrait">${art(playerArt(),s.name,'cover')}<div class="scene-shade"></div><div class="hero-name">${eyebrow('STRONGWOOD’S DEFENDER · LEVEL '+s.level)}<h1>${escape(s.name.toUpperCase())}</h1><span>YOUR NAME. YOUR REALM. YOUR LEGEND.</span></div></div><div class="page hero-details"><div class="career-stats"><div><strong>${s.victories}</strong><span>VICTORIES</span></div><div><strong>${s.level}</strong><span>LEVEL</span></div><div><strong>${s.steps}</strong><span>STEPS TAKEN</span></div></div><div class="section-label"><span>NEXT LEVEL</span><span>${s.victories} / ${target} WINS</span></div><div class="xp-track"><span style="width:${Math.min(100,s.victories/C.required(s.level)*100)}%"></span></div><div class="hero-gear"><div>${art('weapon-'+s.weapon.type.toLowerCase(),s.weapon.type)}<strong>${s.weapon.type}</strong><span>${s.weapon.basePower} BASE POWER</span></div><div>${art('armor','Ancestral iron armor')}<strong>Ancestral Iron</strong><span>${s.armor.resistance}% RESISTANCE</span></div></div><div class="section-label">YOUR MOVESET</div><div class="move-summary">${s.weapon.moves.map(m=>`<div><span>${m.name}${m.magic?' · MAGIC':''}</span><b>+${m.power} / ${m.accuracy}%</b></div>`).join('')}</div><dl class="hero-facts"><div><dt>HEALTH</dt><dd>${num(s.hp.current)} / ${num(s.hp.max)}</dd></div><div><dt>REALM</dt><dd>${W.realm(s.x,s.y)}</dd></div><div><dt>POSITION</dt><dd>X ${s.x} · Y ${s.y}</dd></div><div><dt>HEADING</dt><dd>${{N:'North',S:'South',E:'East',W:'West'}[s.direction]||'North'}</dd></div></dl>${btn('READ YOUR JOURNAL '+icon('journal'),'route:journal','outline')}<div class="retire">${eyebrow('PERMANENT DECISION')}<h2>LAY DOWN YOUR IRON.</h2><p>Erase this warrior, their world, and their legend.</p>${btn('RESET JOURNEY','reset','danger-outline')}</div></div></section>`;}
  function journal(){return `<section class="page">${sectionHead('REMEMBER THE ROAD','YOUR JOURNAL.','The last 50 moments of your legend.')}<div class="journal-banner">${art('scroll-'+(W.local(S.data.x,S.data.y)?'village':'outer'),'An ancient scroll','cover')}</div><ol class="journal-list">${[...S.data.journal].reverse().map((line,i)=>`<li><span>${String(S.data.journal.length-i).padStart(2,'0')}</span><p>${escape(line)}</p></li>`).join('')}</ol>${btn('BACK TO THE ROAD','route:explore','outline')}</section>`;}
  function typewriter(){
    const el=document.querySelector('[data-typewriter]');if(!el)return;
    const bubble=el.closest('[data-dialogue]'),skip=bubble.querySelector('.speech-skip'),full=el.textContent;
    el.textContent='';let pos=0;bubble.classList.add('is-speaking');
    const finish=()=>{clearInterval(typing);typing=null;el.textContent=full;typeFinish=null;bubble.classList.remove('is-speaking');bubble.removeEventListener('click',finish);const label=bubble.querySelector('.speech-speaker span');if(label)label.textContent='· SAID';if(skip){skip.textContent='REPLY COMPLETE';skip.disabled=true;}};
    typeFinish=finish;bubble.addEventListener('click',finish,{once:true});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
    typing=setInterval(()=>{el.textContent=full.slice(0,++pos);if(pos>=full.length)finish();},12);
  }
  function render(keepScroll=false){if(S.syncRest().changed)S.save();if(typeFinish)typeFinish();const pos=window.scrollY;document.body.classList.toggle('in-game',!!S.data);document.body.classList.toggle('outer-world',!!S.data&&!W.local(S.data.x,S.data.y));const views={title,embark,explore,encounter:()=>explore(true),battle,aftermath,pack,forge,map,hero,journal};$('stage').innerHTML=(views[screen]||explore)()+(screen==='hero'?`<div class="page">${btn('RETURN TO TITLE','route:title','text')}</div>`:'');hud();typewriter();if(!keepScroll)window.scrollTo(0,0);else window.scrollTo(0,pos);}
  function route(id,replace=false){clearTimeout(roundTimer);roundPlayback=null;combatBusy=false;roundPhase=null;roundStartHealth=null;const allowed=['title','embark','explore','encounter','battle','aftermath','pack','forge','map','hero','journal'];if(!allowed.includes(id))id=S.data?'explore':'title';if(!S.data&&!['title','embark'].includes(id))id='title';if(S.data&&id==='embark')id='explore';if(id==='battle'&&!S.data?.battle)id='explore';if(id==='aftermath'&&!S.data?.outcome)id='explore';screen=id;if(S.data){S.data.state=S.data.battle?'Battle':id==='encounter'?'Interacting':'Explore';S.save();}history[replace?'replaceState':'pushState'](null,'','#'+id);render();$('stage').focus({preventScroll:true});}
  function toast(text,kind='notice',detail=''){$('toast').className='toast-'+kind;$('toast').innerHTML='<strong>'+escape(text)+'</strong>'+(detail?'<span>'+escape(detail)+'</span>':'');$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),detail?5500:3300);}
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
    if(key==='tile'){const [x,y]=value.split(',').map(Number),b=W.at(x,y);$('map-detail').textContent=(b?C.entities[b.subtype].name:'Unexplored ground')+' · '+W.coords(x,y)+(W.border(x,y)?' · THE VEIL':'');return;}
    if(key==='rest'){if(A.rest()){route('explore');toast('RESTING AT HOME','reward','Health returns gradually, even while the game is closed.');}return;}
    if(key==='potion'){if(A.potion())toast('HEALTH RESTORED','reward');render(true);return;}
    if(S.data.outcome&&!['claim','recover'].includes(key)){route('aftermath');return;}
    if(S.data.battle&&!['attack','flee','bribe'].includes(key)){route('battle');return;}
    if(S.data.foundLoot&&key!=='gather-loot'){route('explore');return;}
    switch(key){
      case 'move':if(W.move(value)){route('explore');if(S.data.lastFind)toast('POTION FOUND','reward','+1 Potion in your pack · Use HEAL to recover.');}break;
      case 'talk':if(A.talk())route('encounter');break;
      case 'npc-attack':if(A.talk(true))route('encounter');break;
      case 'skip-dialogue':if(typeFinish)typeFinish();break;
      case 'end-conversation':if(activeDialogue(W.current())){W.current().dialogue.dismissed=true;S.save();route('explore');}break;
      case 'ignore':A.ignore();route('explore');break;
      case 'eat':{const before=S.data.hp.current;const eaten=A.eat();route('explore');const lost=before-S.data.hp.current;if(eaten&&lost>0)toast('POISONED · −'+num(lost)+' HP','danger','The mushrooms were poisonous. Your vitality has dropped.');else if(eaten)toast('HEALTH RESTORED','reward','The mushrooms mend your wounds.');break;}
      case 'dig':A.dig();if(S.data.foundLoot){clearTimeout(toastTimer);$('toast').classList.remove('show');}if(W.current().elementType!=='BuriedItems'||W.current().resolved)route('explore');else{toast(S.data.message);render(true);}break;
      case 'gather-loot':{const rewards=A.gatherLoot();if(rewards){route('explore');toast('LOOT GATHERED','reward',rewardList(rewards).map(r=>'+'+r.qty+' '+C.items[r.type].name).join(' · ')+' · Added to your pack.');}break;}
      case 'unlock':if(A.unlock())route('explore');break;
      case 'forge':forgeFocus=value==='weapon'?'weapon':'armor';route('forge');document.getElementById('forge-'+value)?.scrollIntoView({block:'center',behavior:'smooth'});break;
      case 'craft':if(A.craft(value)){forgeFocus=value;toast(value==='armor'?'ARMOR REINFORCED':'WEAPON ENHANCED');render(true);}break;
      case 'fight':if(B.start())route('battle');break;
      case 'attack':{
        const previous=S.data.battle,before={...S.data.hp};
        if(!B.attack(Number(value)))break;
        roundPlayback=previous;roundStartHealth=before;roundPhase='player';combatBusy=true;render(true);
        const finish=()=>{roundPlayback=null;roundStartHealth=null;roundPhase=null;combatBusy=false;if(S.data.outcome)route('aftermath');else{render(true);document.querySelector('[data-action="attack:'+Number(value)+'"]:not(:disabled)')?.focus({preventScroll:true});}};
        roundTimer=setTimeout(()=>{
          if(previous.lastRound.received===null){finish();return;}
          roundPhase='enemy';render(true);
          roundTimer=setTimeout(finish,950);
        },950);
        break;
      }
      case 'flee':if(B.flee())route('explore');break;
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
  function init(){W.rescueIfNeeded();clearInterval(restTimer);restTimer=setInterval(updateRest,1000);window.addEventListener('pagehide',()=>{if(S.data){S.syncRest();S.save();}});document.addEventListener('visibilitychange',updateRest);document.addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(target&&!target.disabled)dispatch(target.dataset.action);});document.addEventListener('submit',e=>{if(e.target.id!=='name-form')return;e.preventDefault();S.create(new FormData(e.target).get('name'),chosen);W.current();S.save();route('explore',true);});window.addEventListener('popstate',()=>route(location.hash.slice(1),true));$('modal').addEventListener('close',()=>focusBefore?.focus());route(S.data?'explore':'title',true);}
  return {init,route,render,dispatch,icon,escape,get screen(){return screen;}};
})();
