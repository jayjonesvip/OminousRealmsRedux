# The wounded traveler

Rare, one-time Outer Realm deception using the existing exploration, interaction, combat and reward screens. A 2% roll on eligible new Nature discoveries runs after the thief and siren checks. Quiet steps, borders, known coordinates and occupied mission slots are excluded.

Offer → accept → pale compass guidance to a fresh cart 5–9 cardinal steps away → investigate → pay, fight or escape. The traveler, siren, retrievals, grandfather offers/quests and finale cannot overlap. Declining reveals his false limp with no penalty.

Pay consumes exactly one Gem, with no victory or reward. Escape costs up to 3 HP and ends the encounter; reaching 1 HP returns the player home. Combat uses one Cart Bandits group with 32 HP, no armor, base power 3 and knife moves: Knife Jab +1 / 95%, Flanking Cut +3 / 90%. They strike first under the existing Outer Realm rule. Victory grants one Potion instead of random loot, with normal victory/level/Hope progression and reward collection. Fleeing from battle costs 3 HP plus the normal 2 Hope; losing uses normal defeat and homecoming rules. All resolutions are permanent: the original site becomes wilderness and the cart remains empty, harmless and nonfarmable.

New version-1 fields: traveler (null default) and travelerDone (false default). Validation checks phase, coordinates, origin/target tiles, mission exclusion and linked battle. Saves retain stage and battle health. Missing fields migrate safely.

## Artwork

Three illustrations generated with the built-in imagegen tool and copied into assets. Exact prompts:

### assets/traveler-lure.png

Vertical 2:3 realistic painted dark fantasy game encounter artwork. An adult male traveler around forty sits beside broken milestones in scorched woodland, one leg held stiff as if injured. Weathered face clearly visible high in frame, short dark hair and stubble, patched charcoal wool cloak and practical medieval leather clothes, suspiciously pristine white bandage around calf, no visible wounds. He reaches toward the viewer asking for help. Black leafless trees, ruined arches, muted crimson sky, gritty detailed medieval textures, restrained cinematic painting. No typography, no UI, no gore.

### assets/traveler-ambush.png

Vertical 2:3 realistic painted dark fantasy game encounter artwork. A broken wooden cart with one split wheel on a scorched woodland road, a tiny red medicine bottle inside. Two ragged adult bandits emerge on either side with short knives; a third adult male traveler around forty with short dark hair, stubble, charcoal cloak and clean white calf bandage stands confidently behind the cart, revealing his false limp. Three figures fully clothed in practical medieval clothes; faces high enough for mobile framing. Black leafless trees, ruined arch, muted crimson sky, gritty weathered materials, cinematic realistic painting, no gore, no typography, no UI.

### assets/traveler-cart-empty.png

Vertical 2:3 realistic painted dark fantasy game environment artwork. An abandoned broken wooden cart with one split wheel on a scorched woodland road beside a ruined arch. Cart stands picked clean, open empty wooden boxes, torn empty cloth sacks, no medicine, no treasure, no people anywhere. Black leafless trees and ruined fortress in muted crimson mist, gritty medieval textures, restrained cinematic realistic painting. Cart central and clearly visible, complete cart framed with surrounding terrain. No typography, no UI, no gore.

