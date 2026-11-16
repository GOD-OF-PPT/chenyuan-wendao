import { computed } from 'vue';
import type { useGame } from './store';
import { getTrackedGoal, type TrackingTarget } from '../../src/full/goals.ts';
import { lifespanGuidance } from './lifespan-guidance';
import { trialGuidance } from './trial-goal';
import { useRuleContent } from './rule-content';
/** Project one committed goal and lifespan context; reading never authorizes work. */
export function useGoalStatus(
  store: ReturnType<typeof useGame>,
  target: () => TrackingTarget,
) {
  const game = computed(() => store.game),
    ruleContent = useRuleContent(() => store.game),
    trialView = computed(() => (store.game ? trialGuidance(store.game) : null));
  const lifeState = computed(() =>
    game.value ? lifespanGuidance(game.value) : null,
  );
  const hubGoal = computed(() =>
    game.value ? getTrackedGoal(game.value, target()) : null,
  );
  const hudGoalContext = computed(() => {
    const g = game.value,
      o = hubGoal.value;
    return g && o && !lifeState.value?.hint
      ? { runId: g.core.runId, revision: g.core.revision, goal: o }
      : null;
  });
  const hubGoalHint = computed(() => {
    if (target().kind === 'breakthrough' && trialView.value)
      return trialView.value.state;
    const g = hubGoal.value;
    if (!g) return '';
    if (g.completed) return '目标已达成';
    const d =
      g.deficits.find((d) => d.kind === 'xp') ??
      g.deficits.find((d) => d.kind === 'item') ??
      g.deficits[0];
    if (!d) return g.preview?.failure?.message ?? '准备已齐，可核对行动。';
    const label =
      d.kind === 'item'
        ? ruleContent.value.items[d.id!].name
        : (
            {
              stones: '灵石',
              mp: '灵力',
              months: '余寿游戏月',
              xp: '修为',
              hp: '气血',
            } as const
          )[d.kind];
    return `尚缺${label} ${d.missing}${g.deficits.length > 1 ? '（另 ' + (g.deficits.length - 1) + ' 项）' : ''}`;
  });

  return { lifeState, hubGoal, hudGoalContext, hubGoalHint };
}
