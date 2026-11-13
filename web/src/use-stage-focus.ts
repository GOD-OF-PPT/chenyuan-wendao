import { nextTick, onMounted, onScopeDispose, watch } from 'vue';
import type { useGame } from './store';
import type { useFocus } from './focus';
import { visibleFocusTarget } from './focus';
import type { PreparedMilestone } from './milestone-view';
import type { Observation } from './local-events';
export interface StageFocusNavigation {
  owner(): number;
  advance(): number;
  content(): HTMLElement | null;
  element(): HTMLElement | undefined;
  life(): Promise<unknown>;
}
/** One owner for accepted milestone, initial journey and deferred content focus. */
export function useStageFocus(
  store: ReturnType<typeof useGame>,
  focus: ReturnType<typeof useFocus>,
  navigation: StageFocusNavigation,
) {
  let alive = true;
  onScopeDispose(() => {
    alive = false;
  });
  let pendingContentFocus: { owner: number; opener: Element | null } | null =
    null;
  let beginningJourney: {
    owner: number;
    run: string;
    anchor: Element | null;
  } | null = null;
  type StageFocus = {
    owner: number;
    sync: number;
    id: string;
    run: string;
    generation: number;
    ownerId: string;
    command: string;
    revision: number;
    action: string;
    target: 'stage' | 'life';
    anchor: Element | null;
    ready: boolean;
  };
  let pendingStageFocus: StageFocus | null = null;
  function focusStillOwned(anchor: Element | null) {
    const active = document.activeElement;
    return (
      active === document.body ||
      active === anchor ||
      !visibleFocusTarget(active)
    );
  }
  function armStageFocus(
    review: PreparedMilestone,
    owner: number,
    sync: number,
    target: StageFocus['target'],
  ) {
    const a = store.activity,
      m = review.intent.mutation;
    if (
      !alive ||
      owner !== navigation.owner() ||
      sync !== store.syncEpoch ||
      store.error ||
      !store.wasConfirmedFor(m.commandId, m.runId) ||
      a?.version !== 7 ||
      a.status !== 'running' ||
      a.runId !== m.runId ||
      a.gameRevision !== m.expectedRevision ||
      a.ownerId !== m.ownerId ||
      !a.nextCommand ||
      JSON.stringify(a.plan) !== JSON.stringify(review.intent.plan)
    )
      return;
    const request: StageFocus = {
      owner,
      sync,
      id: a.id,
      run: a.runId,
      generation: a.generation,
      ownerId: a.ownerId,
      command: a.nextCommand.commandId,
      revision: a.gameRevision,
      action: a.plan.action.type,
      target,
      anchor: focus.capture(),
      ready: false,
    };
    pendingStageFocus = request;
    void nextTick(() => {
      if (pendingStageFocus === request) request.anchor = focus.capture();
    });
  }
  function focusObserved(value: Observation, observedNavigation: number) {
    const create = beginningJourney,
      g = store.game,
      a = store.activity,
      r = store.lastResult,
      p = pendingStageFocus;
    if (
      create &&
      create.owner === observedNavigation &&
      value.kind === 'new_game' &&
      !value.replayed &&
      value.commandId &&
      value.runId === g?.core.runId &&
      store.wasConfirmedFor(value.commandId, value.runId)
    )
      create.run = value.runId;
    if (
      p &&
      p.owner === observedNavigation &&
      value.kind === 'action' &&
      !value.replayed &&
      !store.lastReplayed &&
      store.lastFromActivity &&
      store.activityOwned &&
      a?.version === 7 &&
      a.id === p.id &&
      a.generation === p.generation &&
      a.ownerId === p.ownerId &&
      a.runId === p.run &&
      a.completedCycles === 1 &&
      a.status === 'stopped' &&
      r?.commandId === p.command &&
      r.runId === p.run &&
      r.type === p.action &&
      value.operation === p.action &&
      r.revisionBefore === p.revision &&
      r.revisionAfter === g?.core.revision &&
      g.core.revision === p.revision + 1
    ) {
      p.ready = true;
      p.owner = navigation.owner();
      void deliverStageFocus();
    }
  }
  function ownsStageFocus(p: StageFocus) {
    const a = store.activity,
      g = store.game;
    return (
      alive &&
      !document.hidden &&
      p.owner === navigation.owner() &&
      p.sync === store.syncEpoch &&
      g?.core.runId === p.run &&
      a?.id === p.id &&
      a.generation === p.generation &&
      a.ownerId === p.ownerId &&
      !store.error &&
      !store.lastReplayed &&
      !store.activityPausing &&
      a.status !== 'paused' &&
      (!p.ready ||
        (g.core.revision === p.revision + 1 &&
          a.status === 'stopped' &&
          a.completedCycles === 1))
    );
  }
  async function deliverStageFocus() {
    const p = pendingStageFocus;
    if (!p) return;
    if (!ownsStageFocus(p)) {
      pendingStageFocus = null;
      return;
    }
    if (!p.ready || store.busy || !store.saved || !store.available) return;
    pendingStageFocus = null;
    await nextTick();
    if (
      !ownsStageFocus(p) ||
      store.busy ||
      !store.saved ||
      !store.available ||
      document.querySelector('dialog[open]')
    )
      return;
    const returnedToContent =
      p.target === 'life' &&
      !visibleFocusTarget(p.anchor) &&
      document.activeElement === navigation.content();
    if (!focusStillOwned(p.anchor) && !returnedToContent) return;
    if (p.target === 'life') {
      const title = [
        ...document.querySelectorAll<HTMLElement>('[data-testid=life-title]'),
      ].find(visibleFocusTarget);
      if (title) focus.target(title);
      else await navigation.life();
    } else focusContent();
  }
  watch(
    () =>
      [
        store.activity,
        store.game,
        store.busy,
        store.error,
        store.syncEpoch,
        store.activityPausing,
        store.lastReplayed,
      ] as const,
    deliverStageFocus,
    { flush: 'post' },
  );
  function focusContent() {
    const target =
      navigation.content() ?? document.getElementById('welcome-content');
    if (target) {
      pendingContentFocus = null;
      focus.target(target);
    } else
      pendingContentFocus = {
        owner: navigation.owner(),
        opener: document.activeElement,
      };
  }
  function cancelPendingContentFocus() {
    pendingContentFocus = null;
    pendingStageFocus = null;
    beginningJourney = null;
    navigation.advance();
  }
  onMounted(() => {
    document.addEventListener('pointerdown', cancelPendingContentFocus, true);
    document.addEventListener('keydown', cancelPendingContentFocus, true);
  });
  onScopeDispose(() => {
    document.removeEventListener(
      'pointerdown',
      cancelPendingContentFocus,
      true,
    );
    document.removeEventListener('keydown', cancelPendingContentFocus, true);
    pendingContentFocus = null;
    pendingStageFocus = null;
    beginningJourney = null;
  });
  watch(
    [() => store.ready, () => navigation.element()],
    async () => {
      if (!pendingContentFocus) return;
      await nextTick();
      const request = pendingContentFocus,
        target =
          navigation.content() ?? document.getElementById('welcome-content');
      if (!request || !target) return;
      pendingContentFocus = null;
      if (
        alive &&
        request.owner === navigation.owner() &&
        document.activeElement === request.opener
      )
        focus.target(target);
    },
    { flush: 'post' },
  );
  async function startJourney(name: string) {
    if (!alive) return;
    const request = {
      owner: navigation.advance(),
      run: '',
      anchor: focus.capture(),
    };
    beginningJourney = request;
    await store.start(name);
    if (beginningJourney !== request) return;
    beginningJourney = null;
    if (
      store.error ||
      !store.game ||
      request.run !== store.game.core.runId ||
      request.owner !== navigation.owner()
    )
      return;
    await nextTick();
    if (
      alive &&
      request.owner === navigation.owner() &&
      !document.querySelector('dialog[open]') &&
      focusStillOwned(request.anchor)
    )
      focus.target(document.getElementById('opening-actions'));
  }
  function lifeChanged() {
    if (
      beginningJourney &&
      !beginningJourney.run &&
      beginningJourney.owner === navigation.owner()
    )
      beginningJourney.owner++;
    pendingStageFocus = null;
  }
  return {
    armStageFocus,
    focusObserved,
    focusContent,
    startJourney,
    lifeChanged,
  };
}
