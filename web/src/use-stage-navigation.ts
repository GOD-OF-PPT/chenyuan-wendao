import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from 'vue';
import type { useGame } from './store';
import type { useFocus } from './focus';
import { visibleFocusTarget } from './focus';
import { useStageReturns } from './use-stage-returns';
import { useRuleContent } from './rule-content';
import { gamePhase } from '../../src/full/contracts.ts';
import { narrativeFor } from './story-pages';
import { trialGuidance } from './trial-goal';
export interface StageNavigationHooks {
  singleScreen(): boolean;
  immersive(): boolean;
  narrativeContext(): number;
  content(): HTMLElement | null;
  lifeElement(): HTMLDetailsElement | undefined;
  settings(): HTMLDialogElement | undefined;
  settingsButton(): HTMLButtonElement | undefined;
  help(): Promise<void>;
  browse(): void;
  clearInspections(): void;
  dismissResume(): void;
}
/** Own navigation identity, nested return sources and route-local reading state. */
export function useStageNavigation(
  store: ReturnType<typeof useGame>,
  focus: ReturnType<typeof useFocus>,
  hooks: StageNavigationHooks,
) {
  let alive = true;
  onScopeDispose(() => {
    alive = false;
  });
  const revision = ref(0),
    tab = ref('修行'),
    hubView = ref('home'),
    equipmentOpen = ref(false),
    lifeOpen = ref(false),
    game = computed(() => store.game),
    core = computed(() => store.game?.core),
    phase = computed(() => (store.game ? gamePhase(store.game) : null)),
    ruleContent = useRuleContent(() => store.game),
    trialView = computed(() => (store.game ? trialGuidance(store.game) : null));
  function advance() {
    return ++revision.value;
  }
  const detailViews = new Set([
    'cultivation',
    'goal',
    'character',
    'receipt',
    'activity',
    'journey',
    'tradeoffs',
    'recovery',
    'market',
    'trial-preparation',
  ]);
  const stageReturns = useStageReturns(
    () => ({ view: hubView.value, tab: tab.value }),
    () => focus.capture(),
  );
  const { detailParent, readingReturn } = stageReturns;
  const clearFlowReturns = stageReturns.clearFlow;
  const rememberHubOrigin = stageReturns.remember;
  const captureStageReturn = stageReturns.captureDetail;
  const equipmentReading = shallowRef({ runId: '', section: '' });
  const equipmentEntry = ref(0);
  const equipmentSection = computed(() =>
    equipmentReading.value.runId === game.value?.core.runId
      ? equipmentReading.value.section
      : '',
  );
  const hubTitle = computed(() =>
    ['skills', 'relics'].includes(hubView.value) && equipmentSection.value
      ? (
          {
            school: '修法 · 剑符择道',
            skills: '功法 · 研习与配装',
            relics: '法宝 · 炼制与装备',
            manual: '剑简 · 参悟与研习',
            summary: '配装 · 三法一器',
          } as Record<string, string>
        )[equipmentSection.value]
      : ((
          {
            tradeoffs: '行前取舍 · 当前一段',
            activity: '本段活动 · 成果与停止',
            market: '坊市 · 货架与取舍',
            recovery: '药匣 · 恢复与疗养',
            journey: '突破筹备 · 下一步',
            explore: '历练 · 云岚山海',
            inventory: '行囊 · 随身物资',
            forge: '丹炉 · 择方温炉',
            skills: '功法 · 研习与配装',
            relics: '法宝 · 炼制与装备',
            life: '修仙生平',
            goal: '目标与筹备',
            fate: '仙缘 · 人物与手记',
            cultivation:
              ruleContent.value.realms[
                game.value?.core.player.realm ?? 'mortal'
              ].name + '修行',
            'trial-preparation': '登仙 · 行前核对',
            current:
              (game.value ? narrativeFor(game.value)?.title : null) ??
              (game.value?.battle
                ? ruleContent.value.enemies[game.value.battle.enemy].name
                : (trialView.value?.title ?? '仙缘 · 人物与手记')),
            trial: '渡劫行程与续行',
            battle: '术法说明与战报',
            receipt: '本次行动结算',
            character: '道者 · 寿元与配装',
          } as Record<string, string>
        )[hubView.value] ?? '行道详情'),
  );
  function selectTab(next: string) {
    stageReturns.reset();
    hooks.clearInspections();
    advance();
    hooks.dismissResume();
    tab.value = next;
    hubView.value =
      (
        {
          修行: 'home',
          历练: 'explore',
          行囊: 'inventory',
          仙缘: 'fate',
        } as Record<string, string>
      )[next] ?? 'home';
    return revision.value;
  }
  const preferHomeNavigation = ref(false);
  watch(
    () => store.activity?.id,
    () => (preferHomeNavigation.value = false),
  );
  function selectPrimaryTab(next: string) {
    hooks.browse();
    preferHomeNavigation.value = next === '修行';
    return selectTab(next);
  }
  function openPrimaryFeature(view: string, event?: Event) {
    hooks.browse();
    if (view === 'skills' || view === 'relics') equipmentEntry.value++;
    return openHub(view, event);
  }
  const navigationView = computed(() => {
    const view = detailViews.has(hubView.value)
      ? (detailParent.value?.view ?? hubView.value)
      : hubView.value;
    if (view === 'current')
      return game.value?.battle || game.value?.trial ? 'explore' : 'fate';
    if (view === 'home' && (game.value?.battle || game.value?.trial))
      return 'explore';
    const activity = store.activity;
    if (
      view === 'home' &&
      !preferHomeNavigation.value &&
      activity?.version === 6 &&
      activity.runId === game.value?.core.runId &&
      activity.gameRevision === game.value?.core.revision &&
      activity.plan.kind !== 'travel'
    )
      return 'explore';
    if (view === 'home' && phase.value === 'event') return 'fate';
    return ['skills', 'relics'].includes(view)
      ? equipmentSection.value === 'relics'
        ? 'relics'
        : 'skills'
      : view;
  });
  const receiptAll = ref(false);
  const trialReadMode = ref<'required' | 'checkpoint'>('required');
  async function openHub(
    view: string,
    event?: Event,
    trialMode: 'required' | 'checkpoint' = 'required',
  ) {
    trialReadMode.value = trialMode;
    if (view === 'receipt')
      receiptAll.value =
        !!store.activity &&
        store.activity.completedCycles > 0 &&
        !store.lastResult;
    if (view === 'help') {
      await hooks.help();
      return null;
    }
    const detail = hooks.immersive() && detailViews.has(view);
    stageReturns.enter(view, detail, event);
    const independent = ['goal', 'receipt', 'character'].includes(view);
    const owner = detail
      ? advance()
      : selectTab(
          independent
            ? tab.value
            : view === 'inventory' || view === 'forge'
              ? '行囊'
              : view === 'life' || view === 'fate'
                ? '仙缘'
                : view === 'explore'
                  ? '历练'
                  : '修行',
        );
    hubView.value = view;
    if (view === 'skills' || view === 'relics') equipmentOpen.value = true;
    if (view === 'life') lifeOpen.value = true;
    await nextTick();
    if (owner !== revision.value) return null;
    if (!document.querySelector('dialog[open]'))
      focus.target(document.getElementById('feature-title'));
    return owner;
  }
  async function closeHub() {
    const { back, opener, id } = stageReturns.consume(
      game.value?.core.runId,
      hooks.narrativeContext(),
    );
    if (back) {
      advance();
      hubView.value = back.view;
      tab.value = back.tab;
    } else selectTab('修行');
    await nextTick();
    if (document.querySelector('dialog[open]')) return;
    const candidate = visibleFocusTarget(opener)
      ? opener
      : id
        ? document.querySelector<HTMLElement>(
            `[data-testid="${CSS.escape(id)}"]`,
          )
        : null;
    focus.target(
      visibleFocusTarget(candidate)
        ? candidate
        : document.querySelector<HTMLElement>('[data-testid=hub-current]'),
    );
  }
  function featureKey(event: KeyboardEvent) {
    if (
      event.key === 'Escape' &&
      hooks.singleScreen() &&
      hubView.value !== 'home' &&
      !document.querySelector('dialog[open]')
    ) {
      event.preventDefault();
      void closeHub();
    }
  }
  onMounted(() => document.addEventListener('keydown', featureKey));
  onScopeDispose(() => document.removeEventListener('keydown', featureKey));
  async function showLife(event?: Event) {
    const run = game.value?.core.runId,
      context = hooks.narrativeContext();
    let owner: number;
    if (hooks.singleScreen() && game.value) {
      stageReturns.enterReading(
        game.value.core.runId,
        context,
        event,
        hooks.settings()?.open ? (hooks.settingsButton() ?? null) : undefined,
      );
      owner = advance();
      tab.value = '仙缘';
      hubView.value = 'life';
    } else {
      rememberHubOrigin(event);
      owner = selectTab('仙缘');
    }
    hooks.settings()?.close();
    lifeOpen.value = true;
    await nextTick();
    if (
      !alive ||
      owner !== revision.value ||
      run !== game.value?.core.runId ||
      context !== hooks.narrativeContext()
    )
      return;
    const title = document.querySelector<HTMLElement>(
      '[data-testid=life-title]',
    );
    focus.target(title ?? hooks.lifeElement() ?? hooks.content());
    return owner;
  }
  async function showTrialPreparation() {
    if (core.value?.player.realm !== 'spirit') return;
    selectTab('修行');
    if (hooks.singleScreen()) hubView.value = 'trial-preparation';
    await nextTick();
    const heading = document.querySelector<HTMLElement>(
      '[data-testid="trial-preparation-title"]',
    );
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }

  return {
    owner: revision,
    advance,
    tab,
    hubView,
    equipmentOpen,
    lifeOpen,
    equipmentReading,
    equipmentEntry,
    equipmentSection,
    detailViews,
    stageReturns,
    detailParent,
    readingReturn,
    clearFlowReturns,
    rememberHubOrigin,
    captureStageReturn,
    selectTab,
    selectPrimaryTab,
    openPrimaryFeature,
    navigationView,
    receiptAll,
    trialReadMode,
    openHub,
    closeHub,
    showLife,
    showTrialPreparation,
    hubTitle,
  };
}
