# Ominous Realms

A complete, self-contained dark fantasy browser game. No framework, build step, account, or backend.

## Play

Open **index.html** in a modern browser. Keep the entire folder together so its local artwork and fonts load. You can also serve this folder with any static web server.

Start your journey, accept Eldric’s armor, choose a weapon, and name your warrior. Explore with the compass. Encounter actions appear beneath the directional compass; choosing a direction passes the encounter and moves in one tap. Bring ingots to Eldric’s forge at home or a discovered wilderness forge to strengthen your gear. Travel beyond coordinate ±25 to enter the Outer Realm.

Progress saves automatically in this browser under **ominousrealms.save**. Returning visits open Explore; an unfinished fight has a Resume Battle button. Rewards are recorded when a fight ends, so reloading or claiming twice cannot duplicate or lose them. Hero → Reset Journey permanently removes the save after confirmation.

Browser storage belongs to the current browser and origin. A file opened directly and a copy served over HTTP have separate saves. If local file storage is restricted by your browser, use a static server. Storage failures are shown in the HUD.

## What’s included

- Eleven screens: Title, Embark, Explore, Encounter, Battle, Aftermath, Pack, Forge, Map, Hero, Journal.
- Sticky two-row HUD and five-button navigation; centered 430px mobile layout. Exploration uses a compact row of four equal direction buttons, with scene height adapting to the viewport. Conversations, rewards, and longer messages retain room to scroll.
- Four weapons, armor, accuracy, magic crystals, lucky coins, bribes, fleeing, and unconsciousness at 1 HP.
- Screen shake and portrait impacts; gold hits, purple magic, red incoming damage, and blue misses. Reduced-motion preferences disable shake.
- Combat reveals your result first, pauses for 950 ms, then reveals the enemy response for 950 ms. A finishing blow immediately announces Enemy Vanquished in the attack toast, with damage and round number; it never queues an enemy response toast. Vitality updates with the enemy response; actions stay locked until the sequence finishes. Both sides roll accuracy independently.
- All toasts enter from the top just below the measured HUD, with 80% background opacity. Battle introductions and results use temporary stacked toasts, with at most two visible. Each expires after five seconds. Results never occupy the battle page or replay on rerender; fighter health remains pinned. Leaving battle clears pending notices, while automatic victory/defeat transitions keep the final result visible briefly.
- Upgrades require standing at a forge and spending the displayed ingots. Eldric’s forge is always available at home (0, 0), including existing saves. Discovered wilderness forges remain permanent, reusable stops. The map marks home and wilderness forges with crossed weapons; the current-location outline remains visible. WPN and ARM open the matching upgrade at a forge and equipment details elsewhere, with “Visit a forge to enhance.” Battles, pending results and ungathered loot block upgrades. Returning from equipment details preserves the current encounter.
- All health loss animates Vitality with a red pulse, an HP-loss label, and a draining bar. Poisoned mushrooms add a red screen flash, shake, and explicit Poisoned toast; reduced-motion preferences disable animation.
- Completed digs show an illustrated Treasure Unearthed result with item quantities and a Gather Loot button. Finds persist across reloads; gathering adds them to the pack once and shows an itemized toast. Exhaustion grants no treasure.
- Visible item rewards and an itemized claim toast. Defeats show a separate Wake at Home flow with no loot or collection button.
- Five NPC types each have 25 Strongwood lines, 25 Outer Realm lines, and 10 attack responses: 300 unique messages. Every realm pool mixes everyday life, gameplay tips, ramblings, and irritated replies. Each encounter represents a different person. Random selection excludes the previous line for that type/context across saves, and the Elder always replies.
- NPC replies type inside speech bubbles beneath the speaker’s name; tap to reveal and choose a compass direction to leave. Terrain descriptions appear immediately.
- Subscreens use the bottom navigation without duplicate exploration buttons. Equipment switching buttons appear only at forges. Pack healing sits directly under Potion in Supplies; potion healing toasts report the remaining potion count. Battle rounds appear in the opening and result toasts instead of a permanent heading.
- Strongwood Villagers appear only inside Strongwood (including its ±25 boundary). Outer Realm NPCs are farmers, woodcutters, hunters or elders; the total NPC encounter rate stays 5%. Existing Outer Realm villager sightings become hunters when loaded, with the old villager conversation cleared.
- The compass stays available during encounters and conversations; movement automatically passes the current encounter. Passing an NPC is silent. Other action messages use transient toasts instead of a permanent recent-message banner: a threat remains, mushrooms are untouched, a chest stays locked, or a partial dig remains. Upgrade and combat narration works with every weapon and creature type. Active battles, aftermath and ungathered loot must still be resolved before moving.
- Walking at 50% health or lower without a potion gives a 35% find chance per step, guaranteed by the third step. At 25% or lower, the next step guarantees a potion. Existing encounters stay intact. A pickup card and toast show the find, with a full-heal button. Mushrooms can now appear in both realms.
- Defeat or dropping to 1 HP returns you to Strongwood Cottage at (0,0). Your pack and discovered world remain intact, including wounded dragons. Existing saves at 1 HP away from home are rescued on load. Walking potion finds apply above 1 HP.
- Resting at home automatically restores health gradually, taking 10 minutes from 1 HP to full; lighter wounds take less time. A countdown shows the remaining time. Saved timestamps credit time with the game closed. Leaving home stops recovery, and time away or in battle never grants passive healing. You can leave once above 1 HP. Potions still heal fully and instantly anywhere, including battle. Older saves begin tracking rest when first opened with this update.
- Weighted persistent world, discovered 11×11 map, village/outer descriptions and artwork, NPC encounters, mushrooms, excavation, chests, and forges.
- New random coordinates have a 40% wilderness chance in both realms. NPCs appear at 10% in Strongwood and 5% outside. Outer Realm threats share 20% (Danger and Enemy each 8.889%, Dragon 2.222%); the remaining 35% uses the original relative weights for supplies, animals, things, chests, digs and forges. Strongwood distributes its remaining 50% proportionally among eligible types. Home and its eight NPC neighbors are fixed. Discovered coordinates keep their saved encounter on every revisit; walking back never rolls a new threat.
- Forest Path, Dense Woodland, Leafy Clearing and Grassy Rise add everyday wilderness variety. Wild Boar, Hedgehog, River Otter and Pine Marten are peaceful animal sightings. Unmarked Grave is a scenery object. Each has separate Strongwood and Outer Realm artwork and descriptions.
- Persistent dragon wounds, dual dragon rewards, victory thresholds, automatic leveling, and a 50-entry journal.
- Each level requires its own increasing victory count: 5, 8, 12, 17, 26, 38, and so on (5 × 1.5^(level − 1), rounded up). Lifetime victories remain a career statistic; Hero shows wins earned within the current level, and the victory result shows wins remaining. Older saves keep their earned level, gear, health, and wins since their last level-up. Level bonuses retain the existing per-level strength curve.
- Winning or bribing a threat permanently clears its coordinate, including after revisiting or reloading. Fleeing does not clear it. Legacy resolved clearings are preserved as safe ground; older saves did not distinguish combat clearings from consumed resources.
- Bats, snakes, and spiders use natural attacks with zero armor. Gargoyles use talons and stone hide; dragons use claws, fire, and scales. Skeletons, ogres, and trolls retain equipment. Existing saved creature battles receive the corrected attack profiles without losing their health or round progress.
- Generated portraits, equipment, items, animals, scenery, dragon variants, logo, compass, and app icon, indexed in **assets/manifest.json**.
- Local fonts and a web app manifest. The manifest is a foundation for a future PWA; offline installation and service-worker caching are not implemented.

## Source

Before publishing code or style changes, run `node scripts/version-assets.cjs`, then `node scripts/version-assets.cjs --check`. This stamps the stylesheet and all game scripts with a shared content version so browsers request the matching release instead of cached files. It does not change saved games.

The scripts use a small `OR` namespace and deferred classic scripts so `index.html` works directly without ES-module file-origin restrictions. Each responsibility is separate:

| File | Responsibility |
| --- | --- |
| js/state.js | Version 1 save validation, storage, inventory and journal |
| js/content.js | Entities, dual descriptions, item tables, moves and weights |
| js/dialogue.js | NPC dialogue pools, tones, stable line IDs and random selection |
| js/world.js | Coordinates, discovery, revisits and realm boundaries |
| js/combat.js | Damage, enemy response, victory, leveling and dragon wounds |
| js/actions.js | Talk, eat, dig, unlock, healing and crafting |
| js/ui.js | Screens, HUD, navigation, typewriter and reset dialog |
| js/app.js | Load and boot |
| css/game.css | Responsive layout, typography, palettes and controls |

The supplied brief is the rules source; no original C# source was attached. Unspecified rarity values are assigned in `content.js`. Armor craft cost starts at resistance and advances with each upgrade. Resistance is capped at 95% to keep high-level damage positive. NPCs cannot be harmed. Battle rewards enter the pack immediately when awarded; Claim Rewards dismisses the persistent result. Digging rewards remain in a saved find until Gather Loot adds them to the pack.

## Artwork and typography

Raster artwork was generated with the built-in image generation tool. Full prompts are preserved in **assets/prompts.json**. Village and outer variants share compositions and subjects. Small functional navigation icons and UI chrome are scalable SVG/CSS; illustrated entities use generated raster art.

Oswald and Barlow are bundled locally under the SIL Open Font License. See `assets/fonts/OFL-Oswald.txt` and `assets/fonts/OFL-Barlow.txt`.

The interface takes its requested career-screen inspiration from [Cage Grind](https://cagegrind.com/); all game art and fantasy copy in this package are newly created.

## Validation

Automated logic and rendered-template checks cover character setup, local generation, realm borders, damage and accuracy, crystal consumption, unconsciousness, loot uniqueness, leveling, dragon persistence, bribes, potions, digging, chests, forging, saving, recovery, and all eleven screens. These tests do not substitute for a real-device browser playtest.

To rerun the included checks, use Node.js: `node --test tests/game.test.cjs`. Set `ASSET_AUDIT=1` to include the full rendered-image reference audit. No test dependencies need installing.
