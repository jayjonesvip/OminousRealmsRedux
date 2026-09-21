# Balance and progression tuning — 2026-09-21

Based on the 80-run full-progression audit.

- Mushrooms now have a 75% full-heal / 25% immediate-poison roll while injured. Eating at full health still harms. Either result consumes the patch. The explore button warns of risk; the guide states the odds.
- A staggered enemy braces for the following player turn. Another heavy hit still deals normal damage, but cannot deny a second consecutive counter. Finishing blows still end the battle immediately. Bracing follows the saved last-round result, so reloads cannot reset it. The move description and top toast explain the rule.
- Grandfather offers keep their 1% eligible-discovery chance, with an offer guaranteed on the 100th eligible roll. Known tiles, forced quiet terrain, ineligible locations/levels, and overlapping missions do not advance the counter. Missing save counters default to zero; invalid values are rejected.
- Strongwood wildlife, encounter distributions, ordinary damage, potion strength, and rewards remain unchanged.

## Validation

- 214 game tests pass (215 with asset audit enabled).
- Added tests cover injured mushroom odds and consumption, consecutive stagger prevention and reloads, finishing-blow priority, search cap persistence/migration/validation, and excluded search steps.
- 32 new full-engine fresh-save playthroughs, across all four weapons, completed successfully with no boosted stats or inventory. Ordinary-attack runs consumed 7–10 potions; stagger-focused runs consumed 3–8. This is careful automated play, not a human success-rate forecast.
- Mobile browser checks cover stagger, reload, the next counter, mushroom-risk CTA and poison toast.
- Full mobile finale regression passes.

Name collisions are documented separately in NAMING-AUDIT.md. No naming changes are included in this balance patch.
