import { computed, nextTick, onScopeDispose, type Ref } from 'vue';
import type { useGame } from './store';
import type { useFocus } from './focus';
import type { useStageNavigation } from './use-stage-navigation';
import type { useActivityPlans } from './use-activity-plans';
import type { NavigationRequest } from './navigation';
type DestinationNavigation = Pick<
  ReturnType<typeof useStageNavigation>,
  | 'advance'
  | 'owner'
  | 'selectTab'
  | 'hubView'
  | 'equipmentOpen'
  | 'rememberHubOrigin'
  | 'openHub'
>;
/** A source inspection stays readonly; an explicit trip alone may change location. */
export function useDestinations(
  store: ReturnType<typeof useGame>,
  focus: ReturnType<typeof useFocus>,
  navigation: DestinationNavigation,
  plans: ReturnType<typeof useActivityPlans>,
  input: {
    singleScreen(): boolean;
    nextKind(): string | undefined;
    quantity: Ref<number>;
    batch: Ref<number | 'target'>;
  },
) {
  const game = computed(() => store.game);
  let alive = true;
  onScopeDispose(() => {
    alive = false;
  });
  async function navigate(
    request: NavigationRequest,
    arrived?: () => void,
  ): Promise<void> {
    if (!alive || !game.value || store.busy || !store.available) return;
    if (game.value.core.world.location !== request.location)
      return plans.arrangeTravel(request.location, () =>
        navigate(request, arrived),
      );
    navigation.advance();
    const focusRevision = navigation.selectTab(request.tab);
    plans.highlight.value = request.focusId ?? '';
    if (
      request.focusId &&
      /^(equipment-panel|school-|learn-|equip-|forge-|study-manual)/.test(
        request.focusId,
      )
    ) {
      navigation.equipmentOpen.value = true;
      if (input.singleScreen())
        navigation.hubView.value = request.focusId.startsWith('forge-')
          ? 'relics'
          : 'skills';
    }
    if (input.singleScreen() && request.focusId?.startsWith('craft-'))
      navigation.hubView.value = 'forge';
    if (
      input.singleScreen() &&
      request.tab === '修行' &&
      request.focusId?.startsWith('trial-')
    )
      navigation.hubView.value = 'trial-preparation';
    if (input.singleScreen() && /^(buy-|sell-)/.test(request.focusId ?? ''))
      navigation.hubView.value = 'market';
    if (input.singleScreen() && request.focusId === 'rest') {
      navigation.hubView.value = 'recovery';
      plans.preparationInspectionPlan.value = {
        kind: 'rest',
        maxCycles: 1,
        remainingMonthsReserve: 1,
      };
    }
    if (
      input.singleScreen() &&
      request.focusId === 'cultivation-actions' &&
      input.nextKind() === 'recover'
    )
      navigation.hubView.value = 'recovery';
    if (request.quantity) input.quantity.value = request.quantity;
    if (request.collection) {
      plans.collectionTarget.value = request.collection;
      input.batch.value = 'target';
    }
    await nextTick();
    if (!alive || navigation.owner.value !== focusRevision) return;
    arrived?.();
    const element = request.focusId
      ? document.querySelector<HTMLElement>(
          `[data-testid="${request.focusId}"]`,
        )
      : null;
    if (element) {
      const target = element.matches(':disabled')
        ? (element.closest<HTMLElement>('article,.recipe,.market-row') ??
          element.parentElement)
        : element;
      if (target) {
        if (target !== element) target.tabIndex = -1;
        target.scrollIntoView({ block: 'center' });
        focus.target(target);
      }
    }
  }
  function inspectCaveDestination(request: NavigationRequest) {
    if (!alive) return;
    navigation.rememberHubOrigin();
    return inspectTradeoffDestination(request);
  }
  async function inspectTradeoffDestination(request: NavigationRequest) {
    if (!alive || !game.value) return;
    if (
      game.value.core.world.location !== request.location ||
      request.focusId?.startsWith('travel-')
    ) {
      const owns = plans.inspectionOwner();
      const owner = await navigation.openHub('explore');
      if (alive && owns(owner)) {
        plans.adventureInspectionPlan.value = null;
        plans.adventureInspectionSaved.value = false;
        plans.highlight.value = 'travel-' + request.location;
      }
      return;
    }
    return navigate(request);
  }

  return { navigate, inspectCaveDestination, inspectTradeoffDestination };
}
