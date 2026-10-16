import * as C from './content.ts';
import { remainingMonths } from './costs.ts';
import { costDeficits, getBreakthroughGoal, getItemSources, previewAction } from './queries.ts';
import type { Game } from './types.ts';

/** Context for the current realm, separate from the player's pinned display goal. */
export function getGrowthStage(game: Game) {
  const goal = getBreakthroughGoal(game), realm = game.core.player.realm;
  const pill = goal.action ? C.realms[realm].pill : null;
  const quantity = pill ? goal.preview?.costs?.items[pill] ?? 0 : 0;
  const missingPill = pill && quantity ? costDeficits(game, { stones: 0, mp: 0, months: 0, items: { [pill]: quantity } })[0] : null;
  const recipes = pill && missingPill ? Object.entries(C.recipes).filter(([, recipe]) => recipe.output === pill).map(([id, recipe]) => {
    const preview = previewAction(game, { type: 'CRAFT', recipeId: id });
    const inputs = Object.entries(preview.costs?.items ?? {}).filter(([item]) => C.items[item].kind === 'material');
    const tier = Math.max(...inputs.map(([item]) => C.rank(C.items[item].min)));
    const materials = inputs.filter(([item]) => C.rank(C.items[item].min) === tier).map(([item, required]) => {
      const gap = costDeficits(game, { stones: 0, mp: 0, months: 0, items: { [item]: required } })[0];
      return { id: item, required, have: game.core.inventory[item], missing: gap?.missing ?? 0,
        sources: getItemSources(game, item, gap?.missing ?? 1, ['source', 'purchase']) };
    });
    return { id, label: recipe.name, preview, materials };
  }) : [];
  return { realm, title: C.realms[realm].name, goal, pill, quantity,
    pillHave: pill ? game.core.inventory[pill] : 0, pillReady: !!pill && !missingPill,
    reachedAt: game.milestones[realm] ?? null, remainingMonths: remainingMonths(game), recipes,
    locations: Object.entries(C.locations).filter(([, location]) => location.min === realm).map(([id, location]) => ({ id: id as C.LocationId, name: location.name })) };
}
