import { computed, nextTick, onScopeDispose, shallowRef, watch } from 'vue';
import type { useGame } from './store';
import type { useFocus } from './focus';
import { visibleFocusTarget } from './focus';
import type { useActivityPlans } from './use-activity-plans';
import { practiceLesson, type PracticeKind } from './first-practice';
import type { NavigationRequest } from './navigation';

export interface PracticeIntent {
  kind: PracticeKind;
  source: { runId: string; revision: number };
}
export function useFirstPractice(
  store: ReturnType<typeof useGame>,
  focus: ReturnType<typeof useFocus>,
  plans: ReturnType<typeof useActivityPlans>,
  navigation: {
    owner(): number;
    context(): string;
    dialog(): HTMLDialogElement | undefined;
    closeHelp(): void;
    fallback(): HTMLElement | null;
    inspect(request: NavigationRequest): unknown;
    battle(): unknown;
  },
) {
  let alive = true;
  const origin = shallowRef<{
    runId: string;
    revision: number;
    owner: number;
    context: string;
    activityId: string | null;
    activityRevision: number | null;
    sync: number;
    opener: HTMLElement | null;
  }>();
  const sourceIssue = computed(() => {
    // Reading clicks advance the focus cancellation counter; the actual page
    // context and saved Game/Activity identities bind the book across reading.
    const from = origin.value,
      game = store.game;
    if (!from) return '练手册尚未核对来源，请合上后重新打开。';
    if (!game || from.runId !== game.core.runId)
      return '人生已变化，请合上练手册，重新打开核对。';
    if (from.revision !== game.core.revision)
      return '此生进度已变化，请合上练手册，重新打开核对。';
    if (from.context !== navigation.context())
      return '已离开原入口，请合上练手册，重新打开核对。';
    if (
      from.activityId !== (store.activity?.id ?? null) ||
      from.activityRevision !== (store.activity?.revision ?? null)
    )
      return '原活动已变化，请合上练手册，重新打开核对。';
    if (from.sync !== store.syncEpoch)
      return '进度已重新读取，请合上练手册，重新打开核对。';
    return '';
  });
  const blocked = computed(
    () =>
      sourceIssue.value ||
      (!store.available
        ? '进度尚未就绪，请先核对存档。'
        : store.busy
          ? '正在保存，请稍候。'
          : store.unresolved
            ? '请先重试或取消原安排；进度待同步时重新读取。'
            : store.activityRunning
              ? '当前活动进行中，请先暂停，再确认这一项练手。'
              : ''),
  );
  function close() {
    navigation.dialog()?.close();
    const opener = origin.value?.opener ?? null;
    focus.target(visibleFocusTarget(opener) ? opener : navigation.fallback());
  }
  async function open() {
    const game = store.game;
    if (!alive || !game) return;
    const from = {
      runId: game.core.runId,
      revision: game.core.revision,
      owner: navigation.owner(),
      context: navigation.context(),
      activityId: store.activity?.id ?? null,
      activityRevision: store.activity?.revision ?? null,
      sync: store.syncEpoch,
      opener: focus.capture(),
    };
    navigation.closeHelp();
    await nextTick();
    if (
      !alive ||
      store.game?.core.runId !== from.runId ||
      store.game.core.revision !== from.revision ||
      navigation.owner() !== from.owner ||
      navigation.context() !== from.context
    )
      return;
    origin.value = from;
    focus.open(navigation.dialog(), from.opener);
  }
  function matches(intent: PracticeIntent) {
    return (
      alive &&
      navigation.dialog()?.open &&
      !sourceIssue.value &&
      intent.source.runId === store.game?.core.runId &&
      intent.source.revision === store.game.core.revision
    );
  }
  async function inspect(intent: PracticeIntent) {
    if (!matches(intent) || !store.game) return;
    const lesson = practiceLesson(store.game, intent.kind),
      owner = origin.value,
      interaction = navigation.owner();
    close();
    await nextTick();
    if (
      !alive ||
      owner !== origin.value ||
      interaction !== navigation.owner() ||
      sourceIssue.value
    )
      return;
    return navigation.inspect({
      location: lesson.location,
      tab: lesson.location === 'cave' ? '修行' : '历练',
      focusId: 'travel-' + lesson.location,
    });
  }
  async function start(intent: PracticeIntent) {
    if (!matches(intent) || blocked.value || !store.game) return;
    const lesson = practiceLesson(store.game, intent.kind),
      owner = origin.value,
      interaction = navigation.owner();
    if (!lesson.quote.allowed) return;
    close();
    await nextTick();
    if (
      !alive ||
      owner !== origin.value ||
      interaction !== navigation.owner() ||
      blocked.value
    )
      return;
    return lesson.plan.kind === 'source'
      ? plans.startSource(lesson.plan)
      : lesson.plan.kind === 'cultivation'
        ? plans.startTraining(lesson.plan)
        : plans.startAdventure(lesson.plan);
  }
  function battle() {
    if (
      !alive ||
      !navigation.dialog()?.open ||
      sourceIssue.value ||
      !store.game?.battle
    )
      return;
    close();
    return navigation.battle();
  }
  watch(
    () => store.game?.core.runId,
    () => {
      navigation.dialog()?.close();
      origin.value = undefined;
    },
  );
  onScopeDispose(() => {
    alive = false;
    focus.release(navigation.dialog());
  });
  return { open, inspect, start, battle, blocked, sourceIssue };
}
