# Ominous Realms

A complete, self-contained dark fantasy browser game. No framework, build step, account, or backend.

## Play

Open **index.html** in a modern browser. Keep the entire folder together so its local artwork and fonts load. You can also serve this folder with any static web server.

Start your journey, accept Eldric’s armor, choose a weapon, and name your warrior. Explore with the compass. Investigate encounters, gather supplies, and tap WPN or ARM in the HUD to strengthen your gear anywhere outside combat. Travel beyond coordinate ±25 to enter the Outer Realm.

Progress saves automatically in this browser under **ominousrealms.save**. Returning visits open Explore; an unfinished fight has a Resume Battle button. Rewards are recorded when a fight ends, so reloading or claiming twice cannot duplicate or lose them. Hero → Reset Journey permanently removes the save after confirmation.

Browser storage belongs to the current browser and origin. A file opened directly and a copy served over HTTP have separate saves. If local file storage is restricted by your browser, use a static server. Storage failures are shown in the HUD.

## What’s included

- Eleven screens: Title, Embark, Explore, Encounter, Battle, Aftermath, Pack, Forge, Map, Hero, Journal.
- Sticky two-row HUD and five-button navigation; centered 430px mobile layout.
- Four weapons, armor, accuracy, magic crystals, lucky coins, bribes, fleeing, and unconsciousness at 1 HP.
- Screen shake and portrait impacts; gold hits, purple magic, red incoming damage, and blue misses. Reduced-motion preferences disable shake.
- Combat reveals your result first, pauses for 950 ms, then reveals the enemy response for 950 ms. Vitality updates with the enemy response; actions stay locked until the sequence finishes. Both sides roll accuracy independently.
- WPN and ARM in the HUD open the matching gear upgrade anywhere outside combat, using the same ingot costs. Forge locations are optional stops. Upgrade screens offer a direct switch to the other upgrade and a Keep Walking button; returning preserves the current encounter.
- All health loss animates Vitality with a red pulse, an HP-loss label, and a draining bar. Poisoned mushrooms add a red screen flash, shake, and explicit Poisoned toast; reduced-motion preferences disable animation.
- Visible item rewards and an itemized claim toast. Defeats show a separate Wake at Home flow with no loot or collection button.
- Five NPC types each have 25 Strongwood lines, 25 Outer Realm lines, and 10 attack responses: 300 unique messages. Every realm pool mixes everyday life, gameplay tips, ramblings, and irritated replies. Each encounter represents a different person. Random selection excludes the previous line for that type/context across saves, and the Elder always replies.
- NPC replies type inside speech bubbles beneath the speaker’s name; tap to reveal, then End Conversation to resume walking. Terrain descriptions appear immediately.
- Walking at 50% health or lower without a potion gives a 35% find chance per step, guaranteed by the third step. At 25% or lower, the next step guarantees a potion. Existing encounters stay intact. A pickup card and toast show the find, with a full-heal button. Mushrooms can now appear in both realms.
- Defeat or dropping to 1 HP returns you to Strongwood Cottage at (0,0). Your pack and discovered world remain intact, including wounded dragons. Existing saves at 1 HP away from home are rescued on load. Walking potion finds apply above 1 HP.
- Resting at home automatically restores health gradually, taking 10 minutes from 1 HP to full; lighter wounds take less time. A countdown shows the remaining time. Saved timestamps credit time with the game closed. Leaving home stops recovery, and time away or in battle never grants passive healing. You can leave once above 1 HP. Potions still heal fully and instantly anywhere, including battle. Older saves begin tracking rest when first opened with this update.
- Weighted persistent world, discovered 11×11 map, village/outer descriptions and artwork, NPC encounters, mushrooms, excavation, chests, and forges.
- Persistent dragon wounds, dual dragon rewards, victory thresholds, automatic leveling, and a 50-entry journal.
- Generated portraits, equipment, items, animals, scenery, dragon variants, logo, compass, and app icon, indexed in **assets/manifest.json**.
- Local fonts and a web app manifest. The manifest is a foundation for a future PWA; offline installation and service-worker caching are not implemented.

## Source

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

The supplied brief is the rules source; no original C# source was attached. Unspecified rarity values are assigned in `content.js`. Armor craft cost starts at resistance and advances with each upgrade. Resistance is capped at 95% to keep high-level damage positive. NPCs cannot be harmed. Rewards enter the pack immediately when awarded; Claim Rewards dismisses the persistent result.

## Artwork and typography

Raster artwork was generated with the built-in image generation tool. Full prompts are preserved in **assets/prompts.json**. Village and outer variants share compositions and subjects. Small functional navigation icons and UI chrome are scalable SVG/CSS; illustrated entities use generated raster art.

Oswald and Barlow are bundled locally under the SIL Open Font License. See `assets/fonts/OFL-Oswald.txt` and `assets/fonts/OFL-Barlow.txt`.

The interface takes its requested career-screen inspiration from [Cage Grind](https://cagegrind.com/); all game art and fantasy copy in this package are newly created.

## Validation

Automated logic and rendered-template checks cover character setup, local generation, realm borders, damage and accuracy, crystal consumption, unconsciousness, loot uniqueness, leveling, dragon persistence, bribes, potions, digging, chests, forging, saving, recovery, and all eleven screens. These tests do not substitute for a real-device browser playtest.

To rerun the included checks, use Node.js: `node --test tests/game.test.cjs`. Set `ASSET_AUDIT=1` to include the full rendered-image reference audit. No test dependencies need installing.
