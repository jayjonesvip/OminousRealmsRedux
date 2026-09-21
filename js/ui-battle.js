'use strict';
// Combat presentation owns its timers and action lock; combat.js owns game rules.
OR.createBattleUI=({$,escape,num,art,enemyArt,playerArt,eyebrow,hpBar,btn,visibleHealth,render,route,explore,hideNotice})=>{
  const S=OR.state,W=OR.world,B=OR.combat;
  let roundPlayback=null,roundTimer=null,combatBusy=false,roundPhase=null,roundStartHealth=null;
  let combatToasts=[];
  function clearCombatToasts(){for(const entry of combatToasts){clearTimeout(entry.timer);entry.node.remove();}combatToasts=[];}
  function combatToast(kind,title,detail,value=''){
    hideNotice();
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
        if(r.stagger){const first=!S.data.heavyStaggerSeen;if(first){S.data.heavyStaggerSeen=true;S.save();}combatToast('hit','STAGGERED',r.move+' staggered '+(S.data.battle?.enemy.name||'the enemy')+' · ROUND '+r.round+' · NO COUNTER'+(first?' · A landed heavy strike denies the counter.':'')+(r.phaseChanged?' · MALREC UNBOUND':''),num(r.dealt)+' DMG');}
        else combatToast(r.magic?'magic-hit':'hit','ENEMY VANQUISHED',r.move+' vanquished '+S.data.outcome.enemy+' · ROUND '+r.round,num(r.dealt)+' DMG');
      }
      return;
    }
    const amount=enemy?r.received:r.dealt,kind=amount>0?(enemy?'hurt':r.magic?'magic-hit':'hit'):'miss';
    combatToast(kind,enemy?(amount>0?'YOU TOOK DAMAGE':'ENEMY MISSED'):(amount>0?'YOU HIT':'YOU MISSED'),
      (enemy?r.reply:r.move)+' · ROUND '+r.round+(!enemy&&r.phaseChanged?' · ARMOR BROKEN — MALREC UNBOUND':''),amount>0?(enemy?'−'+num(amount)+' HP':num(amount)+' DMG'):'MISS');
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
        art(enemy?enemyArt(e.id,b.x,b.y):playerArt(),enemy?e.name:s.name,'cover')+
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
      '</div><div class="button-pair">'+btn('FLEE','flee','outline',combatBusy?'disabled':'')+(B.canBribe()?btn('BRIBE · 1 GEM','bribe','outline',combatBusy||!S.qty('Gem')?'disabled':''):'')+'</div><p class="fine centered">Fall, and rise again. Your health never falls below 1.</p></div></section>';
  }
  function showAmbush(){const b=S.data.battle;if(!b||b.ambushPresented)return;b.ambushPresented=true;S.save();combatBusy=true;roundPhase='enemy';render();roundToast(b.lastRound,true);roundTimer=setTimeout(()=>{combatBusy=false;roundPhase=null;render(true);},950);}
  function playAttack(value){
        const previous=S.data.battle,before={...S.data.hp};
        if(combatBusy||!B.attack(Number(value)))return;
        roundPlayback=previous;roundStartHealth=before;roundPhase='player';combatBusy=true;clearCombatToasts();render(true);roundToast(previous.lastRound);
        const finish=()=>{roundPlayback=null;roundStartHealth=null;roundPhase=null;combatBusy=false;if(S.data.outcome)route('aftermath',false,true);else{render(true);document.querySelector('[data-action="attack:'+Number(value)+'"]:not(:disabled)')?.focus({preventScroll:true});}};
        roundTimer=setTimeout(()=>{
          if(previous.lastRound.received===null){finish();return;}
          roundPhase='enemy';render(true);roundToast(previous.lastRound,true);
          roundTimer=setTimeout(finish,950);
        },950);
  }

  function reset(){clearTimeout(roundTimer);roundPlayback=null;combatBusy=false;roundPhase=null;roundStartHealth=null;}
  return {battle,clearCombatToasts,combatToast,roundToast,showAmbush,playAttack,reset,get busy(){return combatBusy;},get phase(){return roundPhase;},get startHealth(){return roundStartHealth;}};
};
