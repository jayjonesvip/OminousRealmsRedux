'use strict';
window.OR = window.OR || {};
OR.content = (() => {
  const move = (name, power, accuracy, description, magic = false) => ({name,power,accuracy,description,magic});
  const weapons = {
    Sword: {pitch:'Balanced steel. Unbroken resolve.',moves:[move('Slash',6,92,'A clean cut through the dark.'),move('Cleave',12,72,'Commit your weight to the blade.')]},
    Axe: {pitch:'Heavy blows. Nothing left standing.',moves:[move('Chop',9,83,'Let the edge do the talking.'),move('Execution',17,58,'One swing. Everything behind it.')]},
    Hammer: {pitch:'Break armor. Shatter the silence.',moves:[move('Crush',11,78,'Iron answers iron.'),move('Earthshaker',20,50,'A blow that shakes the ground.')]},
    Knife: {pitch:'Quick hands. A thousand small endings.',moves:[move('Stab',4,99,'Find the gap.'),move('Backstab',10,85,'Strike before the shadow moves.')]}
  };
  const weapon = type => ({type,basePower:5,moves:[move('Tackle',0,99,'Shoulder first. No hesitation.'),...weapons[type].moves.map(m=>({...m})),move('Realmfire',25,100,'Burn a magic crystal. Scorch the veil.',true)]});
  const creatures = {
    bat:{attackStyle:'Fangs & wings',moves:[move('Wing Bash',0,99,''),move('Bite',4,99,''),move('Diving Bite',10,85,'')]},
    snake:{attackStyle:'Fangs & coils',moves:[move('Tail Lash',0,99,''),move('Fang Strike',4,99,''),move('Lunge',10,85,'')]},
    spider:{attackStyle:'Fangs & legs',moves:[move('Leg Strike',0,99,''),move('Bite',4,99,''),move('Pounce',10,85,'')]},
    gargoyle:{attackStyle:'Talons',defense:'Stone hide',moves:[move('Talon Strike',0,99,''),move('Stone Claw',6,92,''),move('Wing Slam',12,72,'')]},
    dragon:{attackStyle:'Claws & fire',defense:'Scales',moves:[move('Tail Sweep',0,99,''),move('Claw Rake',11,78,''),move('Crushing Bite',20,50,''),move('Cinder Breath',15,75,'')]}
  };
  const creature=(id,level=1)=>{const c=creatures[id];return c?{weapon:null,attackStyle:c.attackStyle,defense:c.defense||null,resistance:c.defense?Math.min(95,14+level):0,moves:c.moves.map(m=>({...m}))}:null;};
  const items = {
    MetalIngot:{name:'Metal Ingot',art:'item-metal',group:'CRAFTING',note:'Reinforce your ancestral armor.'},
    SteelIngot:{name:'Steel Ingot',art:'item-steel',group:'CRAFTING',note:'Put a sharper edge on your weapon.'},
    Potion:{name:'Potion',art:'item-potion',group:'SUPPLIES',note:'Restore all missing health.'},
    Gem:{name:'Gem',art:'item-gem',group:'SUPPLIES',note:'Buy a victory. Bribe an enemy.'},
    Key:{name:'Key',art:'item-key',group:'SUPPLIES',note:'Open a locked chest.'},
    MagicCrystal:{name:'Magic Crystal',art:'item-crystal',group:'RELICS',note:'Consumed by one Realmfire attack.'},
    LuckyCoin:{name:'Lucky Coin',art:'item-coin',group:'RELICS',note:'+5% accuracy on every attack.'},
    BrokenPottery:{name:'Broken Pottery',art:'item-pottery',group:'REMNANTS',note:'A small piece of a forgotten life.'},
    RustyNail:{name:'Rusty Nail',art:'item-nail',group:'REMNANTS',note:'Even the old world had loose ends.'}
  };
  const entries = [
    ['Home','home','Strongwood Cottage','Smoke curls above the roof. Eldric’s forge burns beside your cottage.','The hearth is cold. Something remembers you.'],
    ['Nature','forest','Oldwood Forest','Sunlight cuts through the trees like ancestral steel.','Dead branches claw at a blood-red sky.'],
    ['Nature','mossy','Mossbound Stones','Green velvet softens the bones of the earth.','Black moss drinks from the cracks in the stone.'],
    ['Nature','rocks','Sentinel Rocks','Old stones keep a watch no warrior could outlast.','The stones lean inward, listening for your breath.'],
    ['Nature','stream','Silverrun Stream','Clear water carries the whispers of the village.','Ash floats downstream. Nothing drinks here.'],
    ['Nature','clearing','Sunlit Clearing','For a moment, the forest lets you breathe.','The clearing is quiet in all the wrong ways.'],
    ['Nature','grove','Elder Grove','Roots hold fast beneath the oldest trees.','The roots twist around things best left buried.'],
    ['Nature','meadow','Goldleaf Meadow','Long grass bends beneath a warm wind.','Pale grass parts around bones and broken iron.'],
    ['Nature','thicket','Briar Thicket','Thorns tug at your cloak. Keep moving.','The briars twitch before you touch them.'],
    ['Nature','waterfall','Veilfall','Falling water drowns the distant clang of the forge.','Red mist rises where the black water breaks.'],
    ['Nature','glade','Whispering Glade','A shaft of light finds a place the world forgot.','A shaft of crimson finds a place the world abandoned.'],
    ['Nature','marshland','Reedwater Marsh','Reeds rustle around the slow, dark water.','Bubbles rise from a pool with no bottom.'],
    ['Nature','forest-path','Forest Path','A narrow trail winds between familiar trees.','A narrow trail winds between blackened trees.'],
    ['Nature','dense-woodland','Dense Woodland','Closely packed trunks crowd the path.','Bare trunks stand close together in the red mist.'],
    ['Nature','leafy-clearing','Leafy Clearing','Fallen leaves carpet a small opening in the woods.','Brittle leaves gather beneath a thin layer of ash.'],
    ['Nature','grassy-rise','Grassy Rise','A gentle slope breaks through the trees.','Dry grass clings to a low rise in the ashen ground.'],
    ['NPC','villager','Strongwood Villager','A familiar face pauses on the forest road.','A hollow-eyed traveler blocks the ashen road.'],
    ['NPC','farmer','The Farmer','Earth-stained hands lift in greeting.','A farmer tills a field where nothing should grow.'],
    ['NPC','woodcutter','The Woodcutter','An axe rests against a freshly cut stump.','The woodcutter swings at a tree that bleeds.'],
    ['NPC','hunter','The Hunter','A watchful hunter reads tracks in the soft earth.','A hunter watches you instead of the tracks.'],
    ['NPC','elder','The Elder','An old soul has stories the forest still remembers.','The elder speaks to someone you cannot see.'],
    ['Food','mushrooms','Witchcap Mushrooms','Tiny caps shine beneath a fallen branch.','Pale caps cluster in the ash beneath a blackened branch.'],
    ['Animal','rabbit','Wild Rabbit','A rabbit freezes, then vanishes into the ferns.','A pale rabbit watches without blinking.'],
    ['Animal','squirrel','Red Squirrel','A flash of russet darts up the ancient oak.','Ash clings to a squirrel with far too still a gaze.'],
    ['Animal','deer','Woodland Deer','A deer steps between the sunlit trees.','A stag stands in the fog, antlers tangled with bone.'],
    ['Animal','fox','Ember Fox','A red fox slips between gold and green.','A fox moves like a coal through the dying woods.'],
    ['Animal','owl','Mystical Owl','An owl keeps the secrets of the elder grove.','An owl calls your name without a voice.'],
    ['Animal','hawk','Wild Hawk','High above, a hawk rides the warm air.','A hawk circles a sky that never turns blue.'],
    ['Animal','frog','Marsh Frog','A small frog guards its kingdom of moss.','A frog croaks beside water dark as iron.'],
    ['Animal','badger','Forest Badger','A badger digs with stubborn, honest purpose.','A badger claws at a shallow grave.'],
    ['Animal','lynx','Silent Lynx','Two bright eyes study you from the undergrowth.','A lynx melts into the smoke between dead trees.'],
    ['Animal','boar','Wild Boar','A boar roots through fallen leaves, snorting at your approach.','An ash-dusted boar noses through the roots of a dead tree.'],
    ['Animal','hedgehog','Hedgehog','A hedgehog rustles beside a rotting log, then draws into its spines.','A small hedgehog huddles beside a blackened log.'],
    ['Animal','otter','River Otter','An otter slips over wet stones with a silver fish in its jaws.','An otter carries a pale fish along the dark water.'],
    ['Animal','marten','Pine Marten','A marten watches from a low branch, its golden throat bright against the bark.','A marten grips a bare branch, its golden throat dulled with ash.'],
    ['Danger','snake','Briar Snake','A coiled serpent claims the path ahead.','A scaled shadow uncoils in the ash.'],
    ['Danger','skeleton','Restless Skeleton','Old bones rise where no grave should be.','Rusted iron hangs from a soldier long past death.'],
    ['Danger','spider','Thornback Spider','Silken threads shiver across the path.','A many-legged shape descends through red fog.'],
    ['Danger','bat','Angry Bat','A shriek breaks the stillness above you.','Leather wings tear across the crimson sky.'],
    ['Thing','pottery','Broken Pottery','A shattered vessel marks a forgotten camp.','Something scratched warnings inside the shards.'],
    ['Thing','signpost','Old Signpost','The weathered arrow still points toward home.','Every arrow points farther into the dark.'],
    ['Thing','scroll','Ancient Scroll','Faded ink remembers an older Strongwood.','The writing shifts when you look away.'],
    ['Thing','lantern','Rusted Lantern','A lantern waits for a flame and a traveler.','The empty lantern glows without a wick.'],
    ['Thing','figurine','Wooden Figurine','A small wooden guardian has lost its owner.','A carved face bears a freshly cut smile.'],
    ['Thing','grave','Unmarked Grave','A crooked wooden marker stands over settled earth.','A nameless wooden marker leans above an ash-covered mound.'],
    ['Enemy','ogre','Ironjaw Ogre','The trees shake under a heavy tread.','A crude axe drags a long scar through the ash.'],
    ['Enemy','troll','Angry Troll','A hulking shape stirs beyond the trees.','The troll lifts its hammer. The ground goes still.'],
    ['Enemy','gargoyle','Gravewing Gargoyle','Stone wings stir in the fading light.','A stone sentinel unfolds its broken wings.'],
    ['Dragon','dragon','Verdant Dragon','The forest itself seems to draw breath.','A green scale mountain rises through the crimson fog.'],
    ['LockedItem','chest','Ironbound Chest','Old iron guards a forgotten promise.','A locked chest waits among the bones.'],
    ['BuriedItems','dig','Disturbed Earth','Something lies below the freshly turned soil.','The ash has been moved. Someone left in a hurry.'],
    ['Craft','forge','Wayfarer’s Forge','Warm iron. A steady flame. Make yourself stronger.','A lonely forge still burns against the dark.'],
    ['Puzzle','puzzle-plate','The Weighted Gate','An empty plate guards a cave sealed in old stone.','A cold offering plate waits before a sealed hollow.'],
    ['Puzzle','puzzle-runes','The Turning Stones','Three carved wheels bar a forgotten woodland chamber.','Three stone wheels hold a vault against the dark.'],
    ['Puzzle','puzzle-levers','The Silent Mechanism','Three levers stand watch over an ancient vault.','Three rusted levers wait beneath watchful stone beasts.']
  ];
  const entities = Object.fromEntries(entries.map(([type,id,name,village,outer])=>[id,{type,id,name,village,outer}]));
  const weights = {Home:1,Nature:12,NPC:8,Food:4,Animal:8,Danger:4,Thing:8,Enemy:4,Dragon:1,LockedItem:1,BuriedItems:2,Craft:2,Puzzle:1};
  const outerOnly = ['Enemy','Dragon','LockedItem'];
  // New coordinates: quiet terrain and scarce travelers in both realms.
  // Outside, reserve 20% for threats; preserve relative weights within each pool.
  const encounterRates=isLocal=>{
    const eligible=Object.entries(weights).filter(([type])=>type!=='Home'&&(!isLocal||!outerOnly.includes(type)));
    const threats=['Danger','Enemy','Dragon'];
    const inPool=type=>type!=='Nature'&&type!=='NPC'&&type!=='Puzzle'&&(isLocal||!threats.includes(type));
    const poolWeight=eligible.reduce((total,[type,weight])=>total+(inPool(type)?weight:0),0);
    const threatWeight=threats.reduce((total,type)=>total+weights[type],0);
    return Object.fromEntries(eligible.map(([type,weight])=>[type,
      type==='Nature'?40:type==='NPC'?(isLocal?10:5):type==='Puzzle'?1.5:
      !isLocal&&threats.includes(type)?20*weight/threatWeight:(isLocal?48.5:33.5)*weight/poolWeight
    ]));
  };
  const random = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
  const pick = arr=>arr[random(0,arr.length-1)];
  // Victories earned within this level, not a lifetime victory threshold.
  const required = level=>Math.ceil(5*Math.pow(1.5,level-1));
  return {weapons,weapon,creatures,creature,items,entities,weights,outerOnly,encounterRates,random,pick,required};
})();
