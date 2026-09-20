# Reusable retrieval encounters

`js/errands.js` owns the shared flow:

**Encounter → tracking guidance → battle → collect.**

An optional return-to-giver phase supports people requesting something they value. This is separate from the five grandfather quests. Only one retrieval may run at once, and it cannot overlap a grandfather quest or offer.

The bandit is the first registered definition. On an eligible Outer Realm wilderness roll, a thief can take one carried gem. An undiscovered hideout 5–9 cardinal steps away is reserved; red guidance reduces Manhattan distance. Victory makes the gem available to collect. Collect Gem restores it and clears the guidance. The hideout stays empty afterward. No repeat loot or theft occurs on revisits.

## Add another encounter

Register definitions in a classic deferred script after `errands.js` and before `app.js`, so save validation can recognize them during load. Call `OR.errands.start(id, giverTile)` when the player accepts that encounter. The giver's coordinate is retained; existing tiles are never used as new targets.

Example configuration only—this request is not installed or randomly spawned:

```js
OR.errands.register('lost-iron', {
  title: 'THE LOST IRON',
  item: 'SteelIngot',
  quantity: 1,
  realm: 'same',                  // or 'outer'
  completion: 'slay',
  target: { elementType: 'Danger', subtype: 'snake' },
  guide: 'gold',                  // 'red' for the bandit
  returnToGiver: true,
  rewards: [{ type: 'Potion', qty: 1 }],
  startText: 'Recover my iron. Follow the light.',
  doneText: 'The smith has their iron back.'
});
// After accepting the encounter:
OR.errands.start('lost-iron', OR.world.current());
```

The combat screen automatically offers Collect after winning at the objective. Items enter the pack only upon collection. With `returnToGiver: true`, guidance switches to the giver, the encounter displays Return Item, and delivery consumes the requested quantity before paying the configured reward. Givers are not harmed or rewritten.

Optional `after: {elementType, subtype}` chooses the cleared destination's appearance, as with the bandit's empty hideout. Otherwise it becomes a cleared wilderness cell. `completion: 'gather'` supports a Thing target through Retrieve then Collect without a fight. This uses the same saved stages and UI actions.

## Persistence and invariants

The existing version-one `pursuit` save slot contains the definition `kind`, `phase` (`retrieve`, `collect`, `return`), destination, and giver coordinates. Old bandit records without kind/phase default to bandit/retrieve. Unknown definitions and invalid stages are rejected by the same save/import validator.

- No quest overlap, duplicate collection, or duplicate delivery.
- Existing encounters are never replaced to place a target.
- The guide has a static reduced-motion variant.
- NPCs cannot be registered as combat targets.
- New content should decide when its offer is repeatable before calling start.

## Poison vines

A wilderness variant that stings for 1 HP on every entry, then drains 1 HP per elapsed minute, including time away. Poison does not stack and cannot lower HP below 1. A full heal clears it; home rest outpaces its damage and eventually cures it. While infected, new wilderness cannot roll another vine. Known vines remain fixed. Forced quiet discoveries exclude vines.
