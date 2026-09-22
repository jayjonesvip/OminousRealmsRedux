'use strict';
window.OR=window.OR||{};
OR.analytics=(()=>{
  // Keep disk-based games, previews and automated tests out of production reports.
  const enabled=location.protocol==='https:'&&['ominousrealms.com','www.ominousrealms.com'].includes(location.hostname);
  const events=new Set(['new_game','enemy_defeated','battle_lost','quest_started','quest_finished','game_completed','level_up','screen_view']);
  const fields=new Set(['weapon_type','enemy_id','enemy_level','quest_id','quest_type','level','realm','screen_name']);
  let lastScreen;
  if(enabled){
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config','G-1NQNTF6JMB',{page_location:location.origin+location.pathname});
    const tag=document.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id=G-1NQNTF6JMB';document.head.appendChild(tag);
  }
  function track(name,params={}){if(!enabled||!events.has(name))return false;
    try{const s=OR.state?.data,p={};if(s){p.level=s.level;p.realm=OR.world?.local(s.x,s.y)?'strongwood':'outer_realm';}
      for(const [key,value] of Object.entries(params))if(fields.has(key)&&(typeof value==='string'||typeof value==='number'))p[key]=value;
      window.gtag('event',name,p);return true;
    }catch(_){return false;} // Analytics must never interrupt gameplay.
  }
  function screen(name){if(lastScreen===name)return;lastScreen=name;track('screen_view',{screen_name:name});}
  return {track,screen};
})();
