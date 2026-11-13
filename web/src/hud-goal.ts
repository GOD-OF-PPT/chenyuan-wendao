import { contentForGame } from '../../src/full/rule-content.ts';
import type { Game } from '../../src/full/types.ts';
import type { getTrackedGoal } from '../../src/full/goals.ts';
import * as C from '../../src/full/content.ts';
export type HudGoalContext = {
  runId: string;
  revision: number;
  goal: ReturnType<typeof getTrackedGoal>;
};
/** Current readonly goal snapshot; never infers a goal from its displayed title. */
export function hudGoalObject(
  game: Game,
  context: HudGoalContext | null | undefined,
) {
  const ruleContent = contentForGame(game);

  if (
    !context ||
    game.status !== 'active' ||
    context.runId !== game.core.runId ||
    context.revision !== game.core.revision ||
    game.core.activeEvent ||
    game.battle ||
    game.trial
  )
    return null;
  const g = context.goal;
  if (
    g.target.kind !== 'breakthrough' ||
    g.completed ||
    !g.action ||
    !['BREAKTHROUGH', 'START_TRIAL'].includes(g.action.type) ||
    g.deficits.some((d) => ['hp', 'mp', 'months'].includes(d.kind))
  )
    return null;
  const d = g.deficits.find(
    (d) => d.kind === 'item' && d.id && Object.hasOwn(ruleContent.items, d.id),
  );
  if (
    !d?.id ||
    d.required !== g.requiredItems[d.id] ||
    d.have !== game.core.inventory[d.id] ||
    d.missing !== Math.max(0, d.required - d.have) ||
    d.missing <= 0
  )
    return null;
  const other = g.deficits.filter((x) => x !== d),
    xp = other.some((x) => x.kind === 'xp'),
    extra = other.filter((x) => x.kind !== 'xp').length;
  return {
    id: d.id,
    name: ruleContent.items[d.id].name,
    missing: d.missing,
    have: d.have,
    required: d.required,
    xp,
    extra,
  };
}
