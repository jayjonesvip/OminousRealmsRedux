# Exploration rewards and roaming threats

Discovery titles count distinct visited coordinates, including home. Reserved, unvisited objectives do not count. Hero shows all earned titles, the next threshold and discovered landmarks. Each title journals once and grants no combat power:

- 100: Wayfarer
- 500: Far Wanderer
- 1,000: Beyond the Last Road

Missing visit markers in legacy saves are inferred from existing terrain, excluding reserved active destinations and unvisited finale tiles. Titles and enemy snapshots use the existing version-1 validator and export/import flow.

## Rare landmarks

On an eligible Outer Realm Nature roll, after side-encounter checks, there is a 1% chance of a remaining landmark. This is not 1% of every step. Forced quiet steps, known coordinates, border and Strongwood do not roll. Each landmark exists once, stays at its coordinate, journals on first visit, and has no interaction or reward to farm.

- Giant’s Remains: enormous weathered ribs arch above a path in a scorched valley.
- Silent Bell Tower: an abandoned stone tower and tarnished bell above black woodland.
- Petrified Battlefield: cracked stone warriors stand in the ash.

Original illustrations generated for these entries are assets/landmark-giant.png, landmark-bell.png and landmark-stone-host.png. All use the Outer Realm’s muted crimson sky, ruined stone and scorched woodland. Original generated files are retained separately.

## Stronger roaming enemies

At least ten cells past the current border (max coordinate magnitude >= village radius + 11), 8% of new ordinary Enemy spawns gain 2–4 levels. The bonus is chosen once. Wildlife and dragons are excluded, as are quest/finale objectives and travel during an active or offered grandfather quest, retrieval, siren, traveler or final act.

Ordinary enemies snapshot health, power, armor and moves when discovered. Returning after leveling does not rescale them. Wounded dragons retain both wounds and their snapshot if they move. Cleared enemies discard the snapshot. Required quest and finale combat retains its existing behavior.

Explore shows enemy level before combat. Above-player enemies show STRONGER FOE, or OVERWHELMING THREAT at three or more levels above. Walking past costs no health or hope. Starting Outer Enemy/Dragon combat still triggers the existing first strike; the warning says so.
