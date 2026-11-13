import type { Ref } from 'vue';
import type { Action, Move } from '../../src/full/types.ts';
import type { AscensionEnding } from '../../src/full/ascension.ts';
import type { ConfigurationAction } from '../../src/full/configuration.ts';
import type { MilestoneAction } from '../../src/full/milestones.ts';
import { isMilestoneAction } from '../../src/full/milestones.ts';
import { singleBattlePlan } from '../../src/full/adventure.ts';
import type { useGame } from './store';
import type { useFocus } from './focus';
import type { useActivityPlans } from './use-activity-plans';
import { useRuleContent } from './rule-content';
import { useActionView } from './use-action-view';
export interface ActionNavigation {
  owner(): number;
  dismissResume(): void;
  trial(): unknown;
  ending(ending: AscensionEnding): unknown;
  configuration(action: ConfigurationAction): unknown;
  milestone(action: MilestoneAction): unknown;
}
/** Dispatch the existing action to its explicit plan or confirmation owner. */
export function usePlayerActions(
  store: ReturnType<typeof useGame>,
  focus: ReturnType<typeof useFocus>,
  plans: ReturnType<typeof useActivityPlans>,
  navigation: ActionNavigation,
  selection: { batch: Ref<number | 'target'> },
) {
  const ruleContent = useRuleContent(() => store.game),
    { quote } = useActionView(store);
  function act(action: Action) {
    navigation.dismissResume();
    if (action.type === 'TRAVEL') return plans.travel(action.location);
    if (action.type === 'BATTLE') return battle(action.move);
    if (action.type === 'ENCOUNTER')
      return plans.inspectAdventure(action.enemy);
    if (action.type === 'CULTIVATE') {
      const n = action.count ?? 1;
      return plans.startTraining({
        kind: 'cultivation',
        method: action.method,
        maxCycles: n,
        until: 'cycles',
        stoneBudget:
          action.method === 'natural'
            ? 0
            : Math.min(
                store.game?.core?.player.stones ?? 0,
                (quote({ ...action, count: 1 })?.costs?.stones ?? 0) * n,
              ),
        stoneReserve: 0,
      });
    }
    if (action.type === 'SOURCE') {
      const n = action.count ?? 1,
        source = ruleContent.value.sources[action.sourceId],
        target = action.target
          ? {
              kind: 'item' as const,
              id: action.target.item,
              quantity: action.target.quantity,
            }
          : selection.batch.value === 'target'
            ? plans.collectionTarget.value
            : null;
      return plans.startSource({
        kind: 'source',
        sourceId: action.sourceId,
        maxCycles: n,
        until: target ? 'target' : 'cycles',
        target,
        monthBudget: n * source.months,
        remainingMonthsReserve: 1,
      });
    }
    if (action.type === 'CRAFT' || action.type === 'FORGE')
      return plans.inspectProduction(action);
    if (['BUY', 'SELL', 'USE', 'REST', 'LEARN', 'STUDY'].includes(action.type))
      return plans.inspectPreparation(action);
    if (
      action.type === 'SCHOOL' ||
      action.type === 'EQUIP' ||
      action.type === 'EQUIP_RELIC'
    )
      return navigation.configuration(action);
    if (store.activityRunning) {
      store.activityNotice = '当前活动进行中，请先暂停再行动。';
      return;
    }
    if (action.type === 'START_TRIAL') return navigation.trial();
    if (action.type === 'END') return navigation.ending(action.ending);
    if (isMilestoneAction(action)) return navigation.milestone(action);
    const owner = navigation.owner();
    return focus.afterAction(
      async () => {
        await store.act(action);
      },
      () => owner === navigation.owner(),
    );
  }
  function battle(move: Move) {
    if (!store.game?.battle || store.activityRunning) return;
    return plans.startAdventure(singleBattlePlan(store.game, move));
  }

  return { act, battle };
}
