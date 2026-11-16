import type { Game } from '../../src/full/types.ts';
import { previewAction } from '../../src/full/queries.ts';
import {
  previewActivity,
  type CultivationPlan,
} from '../../src/full/activity.ts';
/** Read-only alternative for this explicit draft; never a new activity or authorization. */
export function cultivationFallback(game: Game, plan: CultivationPlan) {
  if (plan.method !== 'assisted') return null;
  const paid = previewAction(game, {
    type: 'CULTIVATE',
    method: 'assisted',
    count: 1,
  });
  if (paid.failure && paid.failure.code !== 'INSUFFICIENT_STONES') return null;
  const original = previewActivity(game, plan);
  if (
    original.allowed ||
    !original.failure ||
    !['ACTIVITY_BUDGET', 'ACTIVITY_RESERVE', 'INSUFFICIENT_STONES'].includes(
      original.failure.code,
    )
  )
    return null;
  const natural = { ...plan, method: 'natural' as const, stoneBudget: 0 },
    quote = previewActivity(game, natural),
    unit = previewAction(game, {
      type: 'CULTIVATE',
      method: 'natural',
      count: 1,
    });
  if (
    !quote.allowed ||
    !unit.allowed ||
    !unit.costs ||
    unit.costs.stones !== 0 ||
    !unit.delta ||
    unit.delta.xp <= 0
  )
    return null;
  const need = paid.costs?.stones ?? 0;
  return {
    reason:
      game.core.player.stones < need
        ? `现有 ${game.core.player.stones} 灵石，辅助每轮需 ${need}。`
        : '本段灵石额度或保留线不足以支持辅助修炼。',
    failure: original.failure,
    cycleMs: quote.cycleMs,
    xp: unit.delta.xp,
    months: unit.costs.months,
    maxCycles: natural.maxCycles,
    goal: natural.until === 'xp-cap' ? '修为圆满即停' : '完成所选轮数即停',
  };
}
