<script setup lang="ts">
import { useRuleContent } from './rule-content';
import { useGoalStatus } from './use-goal-status';
import ClosureDecisions from './ClosureDecisions.vue';
import MainStage from './MainStage.vue';
import type { ClosureNavigation } from './closure-navigation';
import { useSaveControls } from './use-save-controls';
import { useActionView } from './use-action-view';
import { useStageNavigation } from './use-stage-navigation';
import { useStageFocus } from './use-stage-focus';
import { useDestinations } from './use-destinations';
import { useConfigurationReview } from './use-configuration-review';

import { useDirectActions } from './use-direct-actions';
import { usePlayerActions } from './use-player-actions';
import { useActivityPlans, activityPlansKey } from './use-activity-plans';
import GameSettings from './GameSettings.vue';
import DemoMenu from './DemoMenu.vue';
import GameplayHelp from './GameplayHelp.vue';
import GameWorkspace from './GameWorkspace.vue';
import {
  stageNavigationKey,
  destinationsKey,
  playerActionsKey,
  directActionsKey,
  saveControlsKey,
  trackingKey,
  milestoneReviewKey,
  closureCommandsKey,
} from './game-owners';

import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { useGame } from './store';
import { useFocus, visibleFocusTarget, gameFocusKey } from './focus';
import { primaryActivityControls } from './activity-controls';

import * as C from '../../src/full/content.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import { getTrialJourney } from '../../src/full/queries.ts';
import type { Action } from '../../src/full/types.ts';

import { createConsumptionPreview } from '../../src/full/goals.ts';
import { useTracking } from './use-tracking';

import CharacterPanel from './CharacterPanel.vue';

import StatusSurfaces from './StatusSurfaces.vue';

import SealedLifeNav from './SealedLifeNav.vue';

import PrimaryNav from './PrimaryNav.vue';
import AssetImage from './AssetImage.vue';

import ActionEffects from './ActionEffects.vue';

import CultivationStageHost from './CultivationStageHost.vue';

import ActionExecution from './ActionExecution.vue';
import StageOutcome from './StageOutcome.vue';

import type {
  ProgressionKind,
  ProgressionVariant,
} from '../../src/full/progression.ts';
import TrainingActivity from './TrainingActivity.vue';

import ConfigurationDialog from './ConfigurationDialog.vue';

import { narrativeFor } from './story-pages';

import { nextStep } from './play-flow';

import { SCENE_ASSETS, sceneAssetPath } from './assets';
import { scenePresentation } from './scene-presentation';

import type { AscensionEnding } from '../../src/full/ascension.ts';
import { useLocalExperience } from './use-local-experience';

import { useSession } from './session';
import MilestoneReview from './MilestoneReview.vue';
import { useMilestoneReview } from './milestone-view';

import { demoSpec } from '../../src/demo.ts';
import { normalLink } from './demo-loader';
import { guidanceFor } from './guidance';
import GuidancePanel from './GuidancePanel.vue';

import GameConfirmDialog from './GameConfirmDialog.vue';
import { useGameConfirmation } from './use-game-confirmation';
import {
  journalAnchors,
  type JournalLedger,
  type JournalWrite,
} from './journal-anchors';

const session = useSession(),
  demoMenuView = ref<InstanceType<typeof DemoMenu>>();
const demoMenu = computed(() => demoMenuView.value?.element);
const demoNode =
  session.kind === 'demo' ? demoSpec(session.node!.nodeId) : null;
const ruleContent = useRuleContent(() => store.game);
const store = useGame(),
  name = ref('顾长青'),
  batch = ref<number | 'target'>(1),
  quantity = ref(1);
provide('game-scene', store);
const milestoneOwner = useMilestoneReview(store);
const {
  milestoneReview,
  milestoneStale,
  milestoneRetry,
  selectMilestone,
  inspectMilestone,
  closeMilestone,
  confirmMilestone: confirmMilestoneAction,
} = milestoneOwner;
const uiLocked = computed(() => store.busy || !store.available);
const pendingStoryError = computed(() => store.unresolved);

const saveDisplayLabel = computed(() =>
  store.saveLabel === '本次未保存' ? '保存待确认' : store.saveLabel,
);
const experience = useLocalExperience();
let appActive = true;
const stopObserving = store.observe((value) => {
  const observedNavigation = navigationOwner.value;
  if (['import', 'restore', 'restart', 'new_game'].includes(value.kind)) {
    readingGeneration.value++;
    narrativeContext.value++;
    stageReturns.reset();
    journalWrites.value = [];
  }
  if (
    value.kind === 'action' &&
    value.result &&
    value.operation &&
    store.game?.core.revision === value.result.revisionAfter
  ) {
    const run = store.game.core.runId,
      revision = value.result.revisionAfter,
      added =
        value.operation === 'EVENT'
          ? 0
          : value.operation === 'BATTLE' && value.flags.includes('battle_won')
            ? 2
            : 1;
    journalWrites.value = [
      ...journalWrites.value.filter(
        (w) => w.run !== run || w.revision !== revision,
      ),
      { run, revision, added },
    ].slice(-100);
  }
  if (
    value.kind === 'action' &&
    value.result &&
    store.game &&
    !value.replayed &&
    store.lastFromActivity &&
    store.activityOwned &&
    store.activity?.version === 7 &&
    store.activity.plan.action.type === value.operation &&
    store.activity.runId === store.game?.core.runId &&
    value.result.revisionAfter === store.game.core.revision &&
    ((hubView.value === 'current' &&
      value.operation === 'CHOOSE' &&
      value.result.phaseBefore === 'opening' &&
      value.result.phaseAfter === 'idle') ||
      (hubView.value === 'cultivation' &&
        value.operation === 'BREAKTHROUGH' &&
        value.result.delta.realm.before !== value.result.delta.realm.after) ||
      (hubView.value === 'trial-preparation' &&
        value.operation === 'START_TRIAL' &&
        value.result.phaseBefore === 'idle' &&
        value.result.phaseAfter === 'trial-question'))
  )
    selectTab('修行');
  focusObserved(value, observedNavigation);
  experience.record(value);
}, experience.fault);
onScopeDispose(() => {
  appActive = false;
  stopObserving();
});
const producing = computed(
  () =>
    !!store.activity &&
    store.activity.status !== 'stopped' &&
    (store.activity.plan.kind === 'craft' ||
      store.activity.plan.kind === 'forge'),
);
const resumeVisible = ref(false);
const tradeoffKind = ref<ProgressionKind>('cultivation'),
  tradeoffSeed = ref<ProgressionVariant>('natural'),
  tradeoffEntry = ref(0);
const narrativeContext = ref(0),
  readingGeneration = ref(0);
const journalWrites = shallowRef<JournalWrite[]>([]);
const preparation = shallowRef<Action | null>(null);
const fontScale = computed({
    get: () => experience.preferences.value.fontScale,
    set: (value: 1 | 1.5 | 2) => {
      void experience.setPreferences({ fontScale: value });
    },
  }),
  reduceMotion = computed({
    get: () => experience.preferences.value.reduceMotion,
    set: (value: boolean) => {
      void experience.setPreferences({ reduceMotion: value });
    },
  }),
  settingsView = ref<InstanceType<typeof GameSettings>>();
const settings = computed(() => settingsView.value?.element);
const workspace = ref<InstanceType<typeof GameWorkspace>>(),
  navHeight = ref(0);
const mainStage = ref<InstanceType<typeof MainStage>>(),
  statusView = ref<InstanceType<typeof StatusSurfaces>>();
const settingsButton = computed(() => statusView.value?.settingsButton);
const contentPanel = computed(
  () => mainStage.value?.element ?? workspace.value?.element,
);
const importButton = computed(() => settingsView.value?.importButton);
const noticeHeight = ref(0);
const desktopMedia = window.matchMedia('(min-width:480px)'),
  wideScreen = ref(desktopMedia.matches);
function desktopChanged() {
  wideScreen.value = desktopMedia.matches;
}
onMounted(() => desktopMedia.addEventListener('change', desktopChanged));
onScopeDispose(() =>
  desktopMedia.removeEventListener('change', desktopChanged),
);
const singleScreen = computed(() => wideScreen.value && fontScale.value === 1),
  hubMain = computed(() => singleScreen.value && hubView.value === 'home');
const immersive = computed(() => singleScreen.value && !!game.value);
const activityRailVisible = computed(
  () =>
    store.ready &&
    immersive.value &&
    game.value?.status === 'active' &&
    !!store.activity &&
    (hubView.value !== 'activity' || activityPlanVisible.value) &&
    store.activity.stopReason?.code !== 'STATE_CHANGED',
);
provide(primaryActivityControls, activityRailVisible);
const storyView = computed(
  () =>
    singleScreen.value &&
    (['fate', 'life', 'trial', 'battle'].includes(hubView.value) ||
      (hubView.value === 'current' && phase.value !== 'opening') ||
      hubView.value === 'trial-preparation'),
);
const catalogueView = computed(
  () =>
    storyView.value ||
    (singleScreen.value &&
      ([
        'journey',
        'tradeoffs',
        'explore',
        'inventory',
        'forge',
        'skills',
        'relics',
        'goal',
        'market',
        'recovery',
        'receipt',
        'activity',
      ].includes(hubView.value) ||
        hubView.value === 'cultivation')),
);
function currentContent() {
  return (
    [
      ...document.querySelectorAll<HTMLElement>(
        '.catalogue-view .play-catalogue',
      ),
    ].find(visibleFocusTarget) ??
    (visibleFocusTarget(contentPanel.value ?? null)
      ? (contentPanel.value ?? null)
      : null)
  );
}
const focus = useFocus(() => currentContent() ?? settingsButton.value ?? null);
provide(gameFocusKey, focus);
const stageNavigation = useStageNavigation(store, focus, {
  singleScreen: () => singleScreen.value,
  immersive: () => immersive.value,
  narrativeContext: () => narrativeContext.value,
  content: currentContent,
  lifeElement: () => workspace.value?.lifeElement,
  settings: () => settings.value,
  settingsButton: () => settingsButton.value,
  help: showGameplayHelp,
  browse: () => browseDirect(),
  clearInspections: () => clearInspections(),
  dismissResume: () => (resumeVisible.value = false),
});
const {
  owner: navigationOwner,
  tab,
  hubView,
  equipmentOpen,
  detailViews,
  stageReturns,
  detailParent,
  clearFlowReturns,
  rememberHubOrigin,
  captureStageReturn,
  selectTab,
  selectPrimaryTab,
  openPrimaryFeature,
  navigationView,
  openHub,
  closeHub,
  showLife,
  showTrialPreparation,
} = stageNavigation;
const stageFocus = useStageFocus(store, focus, {
  owner: () => navigationOwner.value,
  advance: () => stageNavigation.advance(),
  content: currentContent,
  element: () => contentPanel.value,
  life: () => showLife(),
});
const { armStageFocus, focusObserved, focusContent } = stageFocus;
const activityPlans = useActivityPlans(store, focus, {
  owner: () => navigationOwner.value,
  advance: () => stageNavigation.advance(),
  select: selectTab,
  open: openHub,
  current: () => ({ singleScreen: singleScreen.value, view: hubView.value }),
  dismissResume: () => (resumeVisible.value = false),
  navigate: (...args) => destinations.navigate(...args),
  inspectMilestone,
});
provide(activityPlansKey, activityPlans);
const destinations = useDestinations(
  store,
  focus,
  stageNavigation,
  activityPlans,
  {
    singleScreen: () => singleScreen.value,
    nextKind: () => step.value?.kind,
    quantity,
    batch,
  },
);
const { navigate, inspectCaveDestination } = destinations;
const {
  collectionTarget,
  highlight,
  adventureInspectionPlan,
  adventureInspectionSaved,
  activityPlanVisible,
  hubTrainingMethod,
  clearInspections,
  inspectionOwner,
  travel,
  startAdventure,
  startTraining,
  viewActivityPlan,
} = activityPlans;

const confirmation = useGameConfirmation({
  focus,
  appearance: () => ({
    fontScale: fontScale.value,
    reduceMotion: reduceMotion.value,
  }),
});
function confirmationSource() {
  const key = () =>
    JSON.stringify([
      core.value?.runId ?? null,
      core.value?.revision ?? 0,
      store.activity?.id ?? null,
      store.activity?.revision ?? null,
      store.activity?.ownerId ?? null,
      store.syncEpoch,
    ]);
  // navigationOwner.value also advances on ordinary input; modal return tracks the actual view.
  const viewKey = () =>
    JSON.stringify([
      hubView.value,
      tab.value,
      detailParent.value?.view ?? null,
      detailParent.value?.tab ?? null,
    ]);
  const original = key(),
    view = viewKey(),
    run = core.value?.runId ?? null;
  return {
    current: () => appActive && key() === original && viewKey() === view,
    mayReturn: () =>
      appActive && (core.value?.runId ?? null) === run && viewKey() === view,
  };
}
function confirmationBlocked() {
  return store.busy
    ? '当前行动正在保存，请先等保存落定。'
    : !store.available
      ? '存档当前不可写，请先重新读取。'
      : store.unresolved
        ? '上次行动尚未落定，请先重试或核对原结果。'
        : '';
}
const saveOwner = useSaveControls(store, session, confirmation, name, {
  source: confirmationSource,
  blocked: confirmationBlocked,
  settings: () => settings.value,
  importOpener: () => importButton.value,
  completed: () => {
    selectTab('修行');
    settings.value?.close();
  },
});
const {
  importNotice,
  exportError,
  importFile,
  exportSave,
  exportRaw,
  reset,
  restore,
} = saveOwner;
async function confirmMilestone(retrying = false) {
  const review = milestoneReview.value,
    owner = navigationOwner.value,
    sync = store.syncEpoch;
  await confirmMilestoneAction(retrying);
  if (
    !retrying &&
    review?.prepared &&
    review.plan.action.type === 'CHOOSE' &&
    !milestoneReview.value
  )
    armStageFocus(review.prepared, owner, sync, 'stage');
}
function showSettings(event?: Event) {
  const records = settings.value?.querySelector<HTMLDetailsElement>(
    '[data-testid=local-records-panel]',
  );
  if (records) records.open = false;
  focus.open(
    settings.value,
    event?.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : (settingsButton.value ?? focus.capture()),
  );
}
async function showDemoMenu(event?: Event) {
  const opener = settings.value?.open
    ? (settingsButton.value ?? null)
    : event?.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : focus.capture();
  settings.value?.close();
  await nextTick();
  focus.open(demoMenu.value, opener);
}
async function initialiseGame() {
  if (store.busy) return;
  await store.init();
  if (appActive)
    resumeVisible.value =
      session.kind === 'normal' && !!store.game && store.available;
  if (
    appActive &&
    session.kind === 'demo' &&
    store.available &&
    !store.game &&
    !store.busy
  )
    await store.importText(JSON.stringify(session.node!.game));
}
function focusRegion(id: string) {
  if (id === 'goal-panel' && singleScreen.value && hubView.value !== 'goal') {
    void openHub('goal');
    return;
  }
  focus.target(document.getElementById(id));
}
function focusPrimary() {
  stageNavigation.advance();
  focus.target(
    currentContent()?.querySelector<HTMLElement>('[data-primary-region]') ??
      currentContent(),
  );
}
const game = computed(() => store.game),
  core = computed(() => game.value?.core);
let journalLedger: JournalLedger | undefined,
  journalGeneration = -1;
const journalKeys = computed(() => {
  const g = game.value,
    generation = readingGeneration.value;
  if (!g) return [];
  if (generation !== journalGeneration) {
    journalLedger = undefined;
    journalGeneration = generation;
  }
  journalLedger = journalAnchors(
    journalLedger,
    g.journal,
    g.core.runId,
    g.core.revision,
    journalWrites.value,
  );
  return journalLedger.keys;
});
function journalKey(index: number) {
  return (
    journalKeys.value[(game.value?.journal.length ?? 0) - 1 - index] ??
    'missing-reading'
  );
}
const tracking = useTracking(game);

const step = computed(() => (game.value ? nextStep(game.value) : null));
function openPreparation(event?: Event) {
  return openHub('journey', event);
}
function openTradeoffs(kind: ProgressionKind, seed: ProgressionVariant) {
  stageReturns.captureTradeoff();
  tradeoffKind.value = kind;
  tradeoffSeed.value = seed;
  tradeoffEntry.value++;
  return openHub('tradeoffs');
}
async function inspectNext(event?: Event) {
  const kind = step.value?.kind;
  if (kind === 'prepare') return openPreparation(event);
  if (kind === 'school') return showEquipment(event);
  if (kind === 'record') return showLife();
  if (kind === 'encounter' && !game.value?.battle && phase.value !== 'opening')
    return openHub('current', event);
  const owner = navigationOwner.value;
  await closeHub();
  await nextTick();
  if (!appActive || navigationOwner.value !== owner + 1) return;
  const stage = document.querySelector<HTMLElement>(
    '[data-testid=hub-current]',
  );
  focus.target(
    stage?.querySelector<HTMLElement>(
      'button.primary:not(:disabled),button.cultivate-primary:not(:disabled)',
    ) ?? stage,
  );
}

async function inspectLifespan(event: Event) {
  const owns = inspectionOwner();
  const owner = await showLife(event);
  if (owns(owner ?? null)) workspace.value?.manage();
}
const { hubGoalHint } = useGoalStatus(store, () => tracking.target.value);
function selectTracking(target: Parameters<typeof tracking.select>[0]) {
  stageNavigation.advance();
  tracking.select(target);
}
watch([() => tracking.target.value, () => game.value?.core.runId], () => {
  collectionTarget.value = null;
  highlight.value = '';
});
watch(
  () => game.value?.core.player.realm,
  () => {
    if (tracking.target.value.kind === 'breakthrough') {
      collectionTarget.value = null;
      highlight.value = '';
    }
  },
);
const realm = computed(
  () => ruleContent.value.realms[core.value?.player.realm ?? 'mortal'],
);
const location = computed(
  () => C.locations[core.value?.world.location ?? 'wilderness'],
);
const phase = computed(() => (game.value ? gamePhase(game.value) : null));
watch(
  [
    () => game.value?.core.runId,
    () => phase.value,
    () => game.value?.core.activeEvent?.instanceId,
    () => store.syncEpoch,
  ],
  () => {
    narrativeContext.value++;
    stageReturns.clearReading();
  },
  { flush: 'sync' },
);
const needsSchool = computed(
  () =>
    !!game.value &&
    phase.value === 'idle' &&
    C.rank(game.value.core.player.realm) >= C.rank('qi') &&
    !game.value.school,
);
watch(
  () => game.value?.core.runId,
  () => {
    stageFocus.lifeChanged();
    stageNavigation.advance();
    clearFlowReturns();
    clearInspections();
    collectionTarget.value = null;
    highlight.value = '';
    stageReturns.reset();
    equipmentOpen.value = needsSchool.value;
    resumeVisible.value = false;
  },
  { flush: 'sync' },
);
watch(() => store.syncEpoch, clearFlowReturns, { flush: 'sync' });
// Read-only inspection belongs to a life/navigation, and to the selected activity when saved.
// Do not fence on revisions: a normal cycle or pause must preserve the draft.

watch(
  needsSchool,
  (value) => {
    if (value) equipmentOpen.value = true;
  },
  { immediate: true },
);
const startJourney = () => stageFocus.startJourney(name.value);
async function showEquipment(event?: Event) {
  rememberHubOrigin(event);
  const opener = stageReturns.opener,
    owner = selectTab('修行');
  if (singleScreen.value) hubView.value = 'skills';
  equipmentOpen.value = true;
  await nextTick();
  if (
    appActive &&
    owner === navigationOwner.value &&
    !document.querySelector('dialog[open]') &&
    (document.activeElement === opener ||
      document.activeElement === document.body)
  )
    focus.target(
      document.querySelector<HTMLElement>('[data-testid="equipment-panel"]'),
    );
}
async function showBreakthroughGoal() {
  captureStageReturn('goal');
  const opener = focus.capture();
  selectTracking({ kind: 'breakthrough' });
  if (singleScreen.value) hubView.value = 'goal';
  const owner = navigationOwner.value;
  await nextTick();
  if (
    appActive &&
    owner === navigationOwner.value &&
    !document.querySelector('dialog[open]') &&
    (document.activeElement === opener ||
      document.activeElement === document.body)
  )
    focusRegion('goal-panel');
}

async function resumeEncounter() {
  if (game.value && narrativeFor(game.value)) {
    await openHub('current');
    return;
  }
  selectTab('修行');
  await nextTick();
  focusContent();
}
const catalogueGuide = ref<HTMLDialogElement>();
function showCatalogueGuide(event?: Event) {
  focus.open(
    catalogueGuide.value,
    event?.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : focus.capture(),
  );
}
async function skipCatalogueGuide() {
  catalogueGuide.value?.close();
  await skipGuidance();
}
const helpBook = ref<InstanceType<typeof GameplayHelp>>(),
  guidanceEnabled = ref(true),
  skippedGuides = ref<string[]>([]);
const gameplayHelp = computed(() => helpBook.value?.element);
const guidance = computed(() =>
  guidanceFor(game.value, store.lastReplayed ? null : store.lastResult),
);
watch(
  () => game.value?.core.runId,
  () => (skippedGuides.value = []),
);
async function skipGuidance() {
  skippedGuides.value = [...skippedGuides.value, guidance.value.id];
  await nextTick();
  focusContent();
}
async function showGameplayHelp() {
  const opener = settings.value?.open
    ? (settingsButton.value ?? null)
    : focus.capture();
  settings.value?.close();
  await nextTick();
  focus.open(gameplayHelp.value, opener);
}
const journey = computed(() =>
  game.value ? getTrialJourney(game.value) : null,
);

const { can } = useActionView(store);
function viewReceipt() {
  if (
    store.activity?.version === 7 &&
    store.activity.stopReason?.code !== 'STATE_CHANGED'
  )
    return inspectMilestone(store.activity);
  return openHub('receipt');
}
const stoppedTraining = computed(
  () =>
    store.activity?.status === 'stopped' &&
    store.activity.stopReason?.code !== 'STATE_CHANGED',
);
const playerOwner = usePlayerActions(
  store,
  activityPlans,
  {
    dismissResume: () => (resumeVisible.value = false),
    trial: showTrialPreparation,
    ending: (ending) => reviewAscension(ending),
    configuration: (action) => inspectConfiguration(action),
    milestone: selectMilestone,
  },
  { batch },
);
const { act, battle } = playerOwner;
const directOwner = useDirectActions(store, focus, confirmation, {
  owner: () => navigationOwner.value,
  viewIdentity: () => [
    hubView.value,
    tab.value,
    detailParent.value?.view,
    detailParent.value?.tab,
  ],
  source: confirmationSource,
  blocked: confirmationBlocked,
  openCurrent: () => openHub('current'),
  regular: act,
});
const { browse: browseDirect } = directOwner;

function retryOperation() {
  const owner = navigationOwner.value;
  return focus.afterAction(
    () => store.retry(),
    () => owner === navigationOwner.value,
  );
}

const {
  configurationError,
  configurationIntent,
  configurationSnapshot,
  configurationStale,
  configurationRetry,
  inspectConfiguration,
  closeConfiguration,
  refreshConfiguration,
  confirmConfiguration,
} = useConfigurationReview(store);
const cultivationHome = computed(
  () =>
    !!game.value &&
    phase.value === 'idle' &&
    tab.value === '修行' &&
    core.value?.world.location === 'cave',
);
const worldArt = computed(() =>
  game.value
    ? sceneAssetPath(
        scenePresentation(game.value),
        cultivationHome.value &&
          !producing.value &&
          !['home', 'cultivation', 'goal', 'journey'].includes(hubView.value),
      )
    : undefined,
);
function focusCultivation() {
  focus.target(document.getElementById('cultivation-actions'));
}

const consumptionPreview = computed(() =>
  game.value
    ? createConsumptionPreview(
        game.value,
        tracking.target.value,
        preparation.value,
      )
    : null,
);
function consumption(action: Action) {
  const gaps = consumptionPreview.value?.(action) ?? [];
  return gaps.length
    ? '会消耗追踪物资：' +
        gaps
          .map(
            (gap) =>
              `${ruleContent.value.items[gap.id!].name}将缺${gap.missing}`,
          )
          .join('、') +
        '；材料未被预留。'
    : '';
}
const closureDecisions = ref<InstanceType<typeof ClosureDecisions>>();
const closureNavigation: ClosureNavigation = {
  owner: () => navigationOwner.value,
  leaveSettings: () => {
    const opener = settings.value?.open
      ? (settingsButton.value ?? null)
      : focus.capture();
    settings.value?.close();
    return opener;
  },
  accepted: (review, owner, sync, target) =>
    armStageFocus(review, owner, sync, target),
  showTrialPreparation,
};
const requestEnd = (type: 'RETIRE' | 'END_LIFE') =>
  closureDecisions.value?.requestEnd(type);
const reviewTrial = () => closureDecisions.value?.reviewTrial();
const reviewAscension = (ending: AscensionEnding) =>
  closureDecisions.value?.reviewAscension(ending);
const requestTrialRestore = () => closureDecisions.value?.requestTrialRestore();

provide(stageNavigationKey, stageNavigation);
provide(destinationsKey, destinations);
provide(playerActionsKey, playerOwner);
provide(directActionsKey, directOwner);
provide(saveControlsKey, saveOwner);
provide(trackingKey, tracking);
provide(milestoneReviewKey, milestoneOwner);
provide(closureCommandsKey, {
  requestEnd,
  reviewTrial,
  reviewAscension,
  requestTrialRestore,
});
onMounted(async () => {
  await experience.init();
  if (appActive) await initialiseGame();
});
</script>

<template>
  <div
    class="app-shell art-theme"
    data-theme="jade"
    :class="{
      'is-saving': store.busy,
      'text-enlarged': fontScale > 1,
      'has-game': !!game,
      'cultivation-home': cultivationHome,
      'is-opening': phase === 'opening',
      'single-screen': singleScreen && !!game,
      'game-menus-desktop': singleScreen,
      'hub-visible': hubMain,
      'hub-reduced': reduceMotion,
      'catalogue-view': catalogueView,
      'immersive-stage': immersive,
      'sealed-stage': immersive && game?.status !== 'active',
      'stage-forge': immersive && hubView === 'forge',
      'stage-details': immersive && detailViews.has(hubView),
    }"
    :data-opening-reader="
      singleScreen && phase === 'opening' && hubView === 'current'
    "
    :data-font-scale="fontScale"
    :data-session="session.kind"
    :style="{
      '--font-scale': fontScale,
      '--nav-height': navHeight + 'px',
      '--notice-height': noticeHeight + 'px',
    }"
  >
    <CultivationStageHost
      :active="
        !!game &&
        ['home', 'cultivation', 'current', 'trial-preparation'].includes(
          hubView,
        )
      "
      :handoff="
        hubMain &&
        store.activity?.version === 7 &&
        store.activity.status === 'stopped'
      "
      v-slot="{ milestoneResult, milestoneText, milestoneDetail }"
    >
      <AssetImage
        v-if="store.ready && game"
        class="world-ambience"
        :path="worldArt"
        asset-id="world-ambience"
        eager
        aria-hidden="true"
      />
      <nav class="skip-links" aria-label="快捷定位"
        ><a
          :href="game ? '#game-content' : '#welcome-content'"
          @click.prevent="focusContent"
          >跳到当前内容</a
        ><a
          v-if="game"
          href="#primary-navigation"
          @click.prevent="focusRegion('primary-navigation')"
          >{{ game.status === 'active' ? '跳到主导航' : '跳到封卷导航' }}</a
        ><a
          v-if="game"
          href="#goal-panel"
          @click.prevent="focusRegion('goal-panel')"
          >{{ game.status === 'active' ? '跳到当前目标' : '跳到此卷历程' }}</a
        ></nav
      >
      <StatusSurfaces
        ref="statusView"
        :immersive="immersive"
        :hub-main="hubMain"
        :view="hubView"
        :tab="tab"
        :story-view="storyView"
        :activity-rail-visible="activityRailVisible"
        :local-ready="experience.ready.value"
        :reduce-motion="reduceMotion"
        :target="tracking.target.value"
        :export-error="exportError"
        :import-notice="importNotice"
        v-model:resume-visible="resumeVisible"
        @open="openHub"
        @life="showLife"
        @help="showGameplayHelp"
        @settings="showSettings"
        @plan="viewActivityPlan"
        @receipt="viewReceipt"
        @export="exportSave"
        @demos="showDemoMenu"
        @reset="reset"
        @primary="focusPrimary"
        @retry="retryOperation"
        @reload="initialiseGame"
        @raw="exportRaw"
        @focus="focusContent"
        @height="noticeHeight = $event"
      />
      <main
        v-if="store.ready && !game && !demoNode"
        id="welcome-content"
        tabindex="-1"
        class="welcome"
      >
        <div class="welcome-art"
          ><AssetImage
            class="welcome-backdrop"
            :path="SCENE_ASSETS.wilderness"
            asset-id="welcome-wilderness"
            eager
          /><div class="welcome-copy"
            ><span class="eyebrow">尘缘问道 · 试玩版</span
            ><h2>凡心未改，<br />仙途已在眼前。</h2
            ><p
              >不计片刻，不赶境界。<br />采一味灵草，结一段因果，修属于自己的长生路。</p
            ></div
          ></div
        >
        <form class="paper welcome-form" @submit.prevent="startJourney">
          <span class="eyebrow">新建人生 / 凡心入道</span><h2>从此刻，问道。</h2
          ><label for="name">你的道号</label>
          <input
            id="name"
            name="dao-name"
            spellcheck="false"
            v-model="name"
            maxlength="16"
            required
            autocomplete="off"
            :disabled="uiLocked"
          />
          <p
            >安排修炼，积累材料，筹备下一步。数值未平衡；游戏月在已安排的周期完成时消耗，暂停后阅读不消耗寿元。</p
          >
          <button class="primary" type="submit" :disabled="uiLocked"
            >踏入仙途 <span>→</span></button
          >
          <div class="welcome-secondary"
            ><button
              type="button"
              data-testid="demo-menu-welcome"
              @click="showDemoMenu"
              :disabled="store.busy"
              >演示节点</button
            ><button
              type="button"
              data-testid="welcome-help"
              @click="showGameplayHelp"
              >玩法帮助</button
            ></div
          >
          <label class="file-button"
            >导入已有存档<input
              type="file"
              name="save-import"
              accept=".json,application/json"
              @change="importFile"
              :disabled="uiLocked"
          /></label>
          <details class="welcome-details"
            ><summary>本机存档与试玩记录</summary
            ><p class="small"
              >必要试玩记录只保存在本机，不上传、不记录道号；可在设置关闭、清空或知情导出。进度仅保存在当前浏览器，导出备份可用于迁移。</p
            ></details
          >
        </form>
      </main>
      <main v-if="store.ready && !game && demoNode" class="paper demo-banner"
        ><h2>演示进度尚未就绪</h2
        ><p>请核对上方错误后重试同次操作或重新读取；不会改动正常进度。</p
        ><button @click="initialiseGame" :disabled="store.busy"
          >重新读取演示进度</button
        ></main
      >
      <div v-if="game && core" class="effects-stage"
        ><ActionEffects
          :result="store.lastResult"
          :replayed="store.lastReplayed"
          :run-id="core.runId"
          :revision="core.revision"
          :school="game.school"
          :reduce-motion="reduceMotion"
          @focus-fallback="focusContent"
          :busy="store.busy"
          :eligible="
            store.saved &&
            store.available &&
            !store.error &&
            hubMain &&
            !store.lastFromActivity
          "
      /></div>
      <ActionExecution :execution="store.execution" />
      <MainStage
        v-if="
          store.ready && game && core && (hubMain || (immersive && game.battle))
        "
        ref="mainStage"
        :hub-main="hubMain"
        :immersive="immersive"
        :cultivation-home="cultivationHome"
        :resume-visible="resumeVisible"
        :demo-node="!!demoNode"
        :target="tracking.target.value"
        :goal-hint="hubGoalHint"
        v-model:method="hubTrainingMethod"
        :adventure-inspection-plan="adventureInspectionPlan"
        :adventure-inspection-saved="adventureInspectionSaved"
        :milestone-sequence="milestoneResult?.sequence ?? null"
        :milestone-text="milestoneText"
        :milestone-detail="milestoneDetail"
        @open="openHub"
        @prepare="openPreparation"
        @destination="inspectCaveDestination"
        @act="act"
        @battle="battle"
        @travel="travel"
        @start="
          (plan) =>
            plan.kind === 'cultivation'
              ? startTraining(plan)
              : startAdventure(plan)
        "
        @school="showEquipment"
        @life="showLife"
        @manage-life="inspectLifespan"
        @restart="reset"
        @settings="showSettings"
        @plan="viewActivityPlan"
        @receipt="viewReceipt"
        @compare="openTradeoffs('cultivation', $event)"
        @trial="showTrialPreparation"
        @tab="selectTab"
        @next="inspectNext"
        @export="exportSave"
        @demos="showDemoMenu"
      />
      <aside
        v-if="
          !immersive &&
          game &&
          game.status === 'active' &&
          singleScreen &&
          !hubMain &&
          catalogueView
        "
        class="feature-state"
        data-testid="feature-state"
        ><CharacterPanel
          :game="game"
          compact
          @inspect="openHub('character', $event)" /><TrainingActivity
          v-if="store.activity && store.activity.status !== 'stopped'"
          :store="store"
          compact
          @settings="viewActivityPlan"
          @details="viewReceipt" /><TrainingActivity
          v-else-if="stoppedTraining"
          :store="store"
          summary
          @settings="viewActivityPlan"
          @details="viewReceipt" /><StageOutcome
          v-else
          :game="game"
          :result="store.lastResult"
          :busy="store.busy"
          :saved="store.saved"
          :available="store.available"
          :error="store.error"
          :sync-issue="store.syncIssue"
          :replayed="store.lastReplayed"
          :execution="store.execution"
          :next="step?.title ?? '查看当前目标'"
          @next="inspectNext()"
          @details="viewReceipt"
      /></aside>
      <GameWorkspace
        v-if="store.ready && game && core"
        ref="workspace"
        :hub-main="hubMain"
        :single-screen="singleScreen"
        :immersive="immersive"
        :story-view="storyView"
        :catalogue-view="catalogueView"
        :cultivation-home="cultivationHome"
        :reading-generation="readingGeneration"
        :narrative-context="narrativeContext"
        :journal-key="journalKey"
        :consumption="consumption"
        :guidance-enabled="guidanceEnabled"
        :skipped-guides="skippedGuides"
        :tradeoff-kind="tradeoffKind"
        :tradeoff-seed="tradeoffSeed"
        :tradeoff-entry="tradeoffEntry"
        v-model:batch="batch"
        v-model:quantity="quantity"
        v-model:preparation="preparation"
        @prepare="openPreparation"
        @compare="openTradeoffs"
        @school="showEquipment"
        @resume="resumeEncounter"
        @primary="focusPrimary"
        @focus-cultivation="focusCultivation"
        @breakthrough-goal="showBreakthroughGoal"
        @help="
          (topic) => {
            if (topic) helpBook?.selectTopic(topic);
            showGameplayHelp();
          }
        "
        @guide="showCatalogueGuide"
        @skip="skipGuidance"
      />
      <SealedLifeNav
        v-if="store.ready && immersive && game && game.status !== 'active'"
        :view="hubView"
        :demo="!!demoNode"
        :normal-href="demoNode ? normalLink() : undefined"
        @open="openHub"
        @settings="showSettings"
        @height="navHeight = $event"
      />
      <PrimaryNav
        v-else-if="
          store.ready && game && (game.status === 'active' || demoNode)
        "
        :game="game"
        :demo="!!demoNode"
        :normal-href="demoNode ? normalLink() : undefined"
        :sealed="game.status !== 'active'"
        :selected="tab"
        :expanded="immersive"
        :view="navigationView"
        @open="openPrimaryFeature"
        @select="selectPrimaryTab"
        @height="navHeight = $event"
      />
      <button
        v-if="store.ready && immersive"
        class="stage-journal"
        data-testid="stage-details"
        @click="
          store.lastResult ||
          store.activity?.version === 6 ||
          (store.activity &&
            store.activity.version <= 5 &&
            store.activity.completedCycles > 0)
            ? viewReceipt()
            : openHub('life', $event)
        "
        >行道手记 ›</button
      >
      <MilestoneReview
        v-if="milestoneReview"
        :key="milestoneReview.identity"
        :review="milestoneReview"
        :stale="milestoneStale"
        :retry="milestoneRetry"
        :busy="store.busy"
        :available="store.available"
        :error="store.error"
        :pending-error="pendingStoryError"
        @confirm="!pendingStoryError && confirmMilestone()"
        @retry="confirmMilestone(true)"
        @close="closeMilestone"
      />
      <ConfigurationDialog
        v-if="configurationIntent && configurationSnapshot"
        :key="configurationIntent.command.commandId"
        :intent="configurationIntent"
        :snapshot="configurationSnapshot"
        :stale="configurationStale"
        :busy="store.busy"
        :available="store.available"
        :error="configurationError"
        :retry="configurationRetry"
        @confirm="confirmConfiguration()"
        @retry="confirmConfiguration(true)"
        @refresh="refreshConfiguration"
        @close="closeConfiguration"
      />
      <dialog
        ref="catalogueGuide"
        class="paper catalogue-guide"
        data-testid="catalogue-guide"
        aria-labelledby="catalogue-guide-title"
        ><header
          ><h2 id="catalogue-guide-title" tabindex="-1" data-dialog-initial
            >行道指引</h2
          ><button aria-label="关闭行道指引" @click="catalogueGuide?.close()"
            >关闭</button
          ></header
        ><GuidancePanel
          v-if="
            catalogueView &&
            guidanceEnabled &&
            !skippedGuides.includes(guidance.id)
          "
          :guide="guidance"
          @skip="skipCatalogueGuide"
          @help="showGameplayHelp"
      /></dialog>
      <GameSettings
        ref="settingsView"
        :experience="experience"
        :target="tracking.target.value"
        :save-label="saveDisplayLabel"
        :export-error="exportError"
        :import-notice="importNotice"
        @help="showGameplayHelp"
        @demos="showDemoMenu"
        @life="showLife"
        @retire="requestEnd('RETIRE')"
        @import="importFile"
        @export="exportSave"
        @raw="exportRaw"
        @restart="reset"
        @restore="restore"
      />
      <DemoMenu ref="demoMenuView" />
      <GameplayHelp
        ref="helpBook"
        v-model:enabled="guidanceEnabled"
        @reset="skippedGuides = []"
      />
      <ClosureDecisions
        ref="closureDecisions"
        :single-screen="singleScreen"
        :can="can"
        :navigation="closureNavigation"
      />
    </CultivationStageHost>
    <GameConfirmDialog
      v-if="confirmation.request.value"
      :key="confirmation.request.value.id"
      :request="confirmation.request.value"
      @answer="confirmation.answer($event)"
    />
  </div>
</template>
<style src="./closure-focus.css"></style>
<style>
@layer game {
  .art06-progress:has(> .art06-harvest) {
    padding-bottom: 4px;
  }
}
</style>
