<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { useGame } from './store';
import { activityPlansKey } from './use-activity-plans';
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
import * as C from '../../src/full/content.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import type { Action } from '../../src/full/types.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import {
  getLifeOverview,
  getTrialJourney,
  getStoryContext,
  getRelationships,
} from '../../src/full/queries.ts';
import { stories } from '../../src/full/events.ts';
import { useRuleContent } from './rule-content';
import { nextStep } from './play-flow';
import { guidanceFor } from './guidance';
import { navigationGate } from './navigation-gates';
import { narrativeFor } from './story-pages';
import { formatDelta } from './presentation';
import type {
  ProgressionKind,
  ProgressionVariant,
} from '../../src/full/progression.ts';
import ActivityCatalogues from './ActivityCatalogues.vue';
import StoryCatalogues from './StoryCatalogues.vue';
import TrialSurfaces from './TrialSurfaces.vue';
import LegacyContent from './LegacyContent.vue';
import EquipmentCatalogue from './EquipmentCatalogue.vue';
import FeatureMenu from './FeatureMenu.vue';
import ScenePanel from './ScenePanel.vue';
import RelationshipPanel from './RelationshipPanel.vue';
import GrowthPanel from './GrowthPanel.vue';
import TrialPreparationPanel from './TrialPreparationPanel.vue';
import LifePanel from './LifePanel.vue';
import ActionFeedback from './ActionFeedback.vue';
import GoalPanel from './GoalPanel.vue';
import CharacterPanel from './CharacterPanel.vue';
import PortraitImage from './PortraitImage.vue';
import GameIcon from './GameIcon.vue';
const props = defineProps<{
  hubMain: boolean;
  singleScreen: boolean;
  immersive: boolean;
  storyView: boolean;
  catalogueView: boolean;
  cultivationHome: boolean;
  readingGeneration: number;
  narrativeContext: number;
  journalKey: (index: number) => string;
  consumption: (action: Action) => string;
  guidanceEnabled: boolean;
  skippedGuides: readonly string[];
  tradeoffKind: ProgressionKind;
  tradeoffSeed: ProgressionVariant;
  tradeoffEntry: number;
}>();
const batch = defineModel<number | 'target'>('batch', { required: true }),
  quantity = defineModel<number>('quantity', { required: true }),
  preparation = defineModel<Action | null>('preparation', { required: true });
const emit = defineEmits<{
  prepare: [];
  compare: [kind: ProgressionKind, seed: ProgressionVariant];
  school: [event?: Event];
  resume: [];
  primary: [];
  focusCultivation: [];
  breakthroughGoal: [];
  help: [topic?: string];
  guide: [];
  skip: [];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  plans = inject(activityPlansKey)!,
  navigation = inject(stageNavigationKey)!,
  destinations = inject(destinationsKey)!,
  player = inject(playerActionsKey)!,
  direct = inject(directActionsKey)!,
  saves = inject(saveControlsKey)!,
  tracking = inject(trackingKey)!,
  milestones = inject(milestoneReviewKey)!,
  closure = inject(closureCommandsKey)!;
const {
  hubView,
  tab,
  hubTitle,
  equipmentOpen,
  equipmentReading,
  equipmentEntry,
  lifeOpen,
  detailParent,
  readingReturn,
  receiptAll,
  trialReadMode,
  selectTab,
  openHub,
  openPrimaryFeature,
  closeHub,
  showLife,
  showTrialPreparation,
} = navigation;
const { viewActivityPlan } = plans,
  { act, battle } = player,
  { storyAct, quickInventory, browse: browseDirect } = direct,
  { exportLife, restore, reset, exportSave } = saves,
  { requestEnd, reviewTrial, requestTrialRestore } = closure,
  { navigate, inspectTradeoffDestination } = destinations;
const game = computed(() => store.game!),
  core = computed(() => game.value.core),
  ruleContent = useRuleContent(() => store.game),
  realm = computed(() => ruleContent.value.realms[core.value.player.realm]),
  location = computed(() => C.locations[core.value.world.location]),
  phase = computed(() => gamePhase(game.value)),
  pendingStoryError = computed(() => store.unresolved),
  guidance = computed(() =>
    guidanceFor(game.value, store.lastReplayed ? null : store.lastResult),
  ),
  overview = computed(() => getLifeOverview(game.value)),
  relationships = computed(() => getRelationships(game.value)),
  activeStory = computed(() =>
    core.value.activeEvent && stories[core.value.activeEvent.id]
      ? getStoryContext(game.value, core.value.activeEvent.id)
      : null,
  ),
  producing = computed(
    () =>
      !!store.activity &&
      store.activity.status !== 'stopped' &&
      (store.activity.plan.kind === 'craft' ||
        store.activity.plan.kind === 'forge'),
  ),
  inspectingInventory = computed(
    () =>
      game.value.status === 'active' &&
      phase.value !== 'idle' &&
      tab.value === '行囊',
  );
function selectTracking(target: TrackingTarget) {
  navigation.advance();
  tracking.select(target);
}
async function trackProduction(target: TrackingTarget) {
  selectTracking(target);
  await openHub('goal');
}
const trackTrialMaterial = trackProduction;
function viewReceipt() {
  if (
    store.activity?.version === 7 &&
    store.activity.stopReason?.code !== 'STATE_CHANGED'
  )
    return milestones.inspectMilestone(store.activity);
  return openHub('receipt');
}
const openPreparation = () => emit('prepare'),
  openTradeoffs = (kind: ProgressionKind, seed: ProgressionVariant) =>
    emit('compare', kind, seed),
  showEquipment = (event?: Event) => emit('school', event),
  resumeEncounter = () => emit('resume'),
  focusPrimary = () => emit('primary'),
  focusCultivation = () => emit('focusCultivation'),
  showBreakthroughGoal = () => emit('breakthroughGoal'),
  showGameplayHelp = () => emit('help'),
  showCatalogueGuide = () => emit('guide'),
  skipGuidance = () => emit('skip'),
  travel = plans.travel;
const legacyContent = ref<InstanceType<typeof LegacyContent>>(),
  lifeBook = ref<InstanceType<typeof StoryCatalogues>>(),
  lifeSection = ref<HTMLDetailsElement>();
defineExpose({
  element: computed(() => legacyContent.value?.element),
  lifeElement: lifeSection,
  manage: () => lifeBook.value?.manage(),
});
</script>
<template>
<main v-show="!hubMain" class="game-grid" :class="{'hub-feature':singleScreen}" :aria-busy="store.busy">
<header v-if="singleScreen" class="feature-header"><div><h2 id="feature-title" tabindex="-1">{{game.status==='active'?hubTitle:hubView==='goal'?'此卷历程':['current','fate'].includes(hubView)?'修仙生平':hubTitle}}</h2></div><div class="feature-actions"><FeatureMenu :identity="game.core.runId+':'+hubView" :guide="catalogueView&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :preparation="hubView!=='journey'&&phase==='idle'&&!!realm.pill" :goal="hubView!=='goal'" :blueprints="navigationGate(game,'relics').locked" :sealed="game.status!=='active'" @browse="browseDirect()" @guide="showCatalogueGuide()" @preparation="openPreparation()" @goal="openHub('goal')" @blueprints="openPrimaryFeature('relics')"/><button data-testid="hub-close" :aria-label="detailParent||hubView==='life'&&readingReturn?'返回原玩法':'返回主舞台'" @click="closeHub">{{detailParent||hubView==='life'&&readingReturn?'返回原处':'返回舞台'}} <GameIcon kind="action" id="close"/></button></div></header>
<section v-show="!hubMain&&(!singleScreen||!['goal','character'].includes(hubView))" class="center-column" :class="{'in-battle':game.battle&&!inspectingInventory}">
<ScenePanel v-if="!singleScreen" :meditation="cultivationHome&&!producing&&!immersive" :battle-stage="!!game.battle&&!inspectingInventory" :game="game" :eyebrow="phase==='opening'?'初遇 / 山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':game.status==='ascended'?overview!.title:game.battle?location.name:activeStory?.name??location.name" :description="game.status==='ascended'?'此卷已收，来路犹存。':game.battle?'先辨来势，再决进退。':'山海不言，修行自有回响。'" :with-action="!cultivationHome&&(!game.battle||inspectingInventory)"><button v-if="!cultivationHome&&(!game.battle||inspectingInventory)" type="button" class="scene-action-link" data-testid="scene-action-jump" @click="focusPrimary">{{phase==='opening'?'前往抉择':'前往当前操作'}} ↓</button></ScenePanel>

<ActivityCatalogues :view="hubView" :single-screen="singleScreen" :immersive="immersive" :reading-generation="readingGeneration" :tradeoff-kind="tradeoffKind" :tradeoff-seed="tradeoffSeed" :tradeoff-entry="tradeoffEntry" :quantity="quantity" :consumption="consumption" v-model:all-receipts="receiptAll" @act="act" @navigate="navigate" @destination="inspectTradeoffDestination" @track="trackProduction" @home="closeHub" @prepare="openPreparation" @compare="openTradeoffs" @open="openHub" @school="showEquipment" @trial="showTrialPreparation" @quick="quickInventory" @receipt="viewReceipt"/>
<StoryCatalogues ref="lifeBook" :active="storyView" :view="hubView" :reading-generation="readingGeneration" :narrative-context="narrativeContext" :journal-key="journalKey" :consumption="consumption" @browse="browseDirect" @act="storyAct" @navigate="navigate" @life="showLife" @resume="resumeEncounter" @dialogue="openHub('current')" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset" @receipt="viewReceipt" @progress="openHub('trial')"/>
<TrialSurfaces :view="hubView" :story-view="storyView" :catalogue-view="catalogueView" :read-mode="trialReadMode" @review="reviewTrial" @restore="restore" @restore-trial="requestTrialRestore" @export="exportSave" @prepare="showTrialPreparation" @resume="closeHub" @navigate="navigate" @track="trackTrialMaterial" @equipment="openHub('skills')"/>
<LegacyContent ref="legacyContent" :hub-main="hubMain" :story-view="storyView" :single-screen="singleScreen" :immersive="immersive" :view="hubView" :tab="tab" :cultivation-home="cultivationHome" :guide="guidance" :guidance-enabled="guidanceEnabled" :skipped-guides="skippedGuides" :consumption="consumption" v-model:batch="batch" v-model:quantity="quantity" @act="act" @battle="battle" @travel="travel" @navigate="navigate" @track="selectTracking" @home="closeHub" @resume="resumeEncounter" @life="showLife" @school="showEquipment" @focus-cultivation="focusCultivation" @breakthrough-goal="showBreakthroughGoal" @help="topic=>emit('help',topic)" @skip="skipGuidance" @export="exportLife" @restore="restore" @restart="reset" @receipt="viewReceipt"/>
        <div v-if="!storyView&&tab==='仙缘'&&phase!=='idle'&&game.status==='active'" class="paper inline-actions"><button type="button" class="text-button" data-testid="show-life" @click="showLife">查看修仙生平 →</button><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></div>
        <RelationshipPanel v-if="!storyView&&tab==='仙缘' && phase!=='idle'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate"/>
        <details v-if="!storyView&&tab==='仙缘' && game.status==='active'&&(!singleScreen||hubView==='life')" ref="lifeSection" class="paper life-section" :open="lifeOpen" @toggle="lifeOpen=($event.target as HTMLDetailsElement).open" data-testid="life-section"><summary>修仙生平 · 查看、导出与收卷</summary><LifePanel v-if="lifeOpen" :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset"/></details>
        <GrowthPanel v-if="!singleScreen&&tab==='修行' && phase==='idle' && C.rank(core.player.realm)>=C.rank('foundation') && core.player.realm!=='spirit'" :game="game" :enabled="store.available && !store.busy" @navigate="navigate" @track="selectTracking"/>
        <TrialPreparationPanel v-if="!storyView&&(!singleScreen||hubView==='trial-preparation')&&tab==='修行' && phase==='idle' && core.player.realm==='spirit'" :game="game" :enabled="store.available && !store.busy" :checkpoint="store.checkpointSummary" @navigate="navigate" @track="selectTracking" @review="reviewTrial" @restore="restore" @inspect-equipment="openHub('skills')"/>
        <EquipmentCatalogue :tab="tab" :view="hubView" :single-screen="singleScreen" :entry="equipmentEntry" :consumption="consumption" v-model:open="equipmentOpen" @act="act" @track="trackProduction" @navigate="navigate" @section="equipmentReading=$event"/>
        <div v-if="!hubMain&&!catalogueView&&(!singleScreen||!['receipt','character','journey','explore','inventory','forge','skills','relics','cultivation'].includes(hubView))" class="feedback paper" aria-live="polite" data-testid="feedback"><span>手记</span><p>{{game.journal.at(-1)}}</p><ActionFeedback v-if="store.lastResult" :result="store.lastResult" :replayed="store.lastReplayed"/></div>
      </section>
      <aside v-show="!singleScreen||hubView==='goal'" class="right-column"><GoalPanel :write-blocked="!!pendingStoryError" :game="game" :target="tracking.target.value" :enabled="store.available && !store.busy" :notice="tracking.notice.value" @select="selectTracking" @navigate="navigate" @current="game.battle?selectTab('修行'):openHub('current',$event)" @preparation="preparation=$event"/><section v-if="!singleScreen" class="paper recent-action"><div class="section-label">最近行动</div><p>{{game.journal.at(-1)}}</p><p v-if="store.lastResult" class="small">{{formatDelta(store.lastResult.delta)}}</p></section><section v-if="!singleScreen" class="paper fate-summary"><div class="section-label">仙缘因果</div><div v-for="person in relationships.slice(0,2)" :key="person.id" :data-testid="`fate-summary-${person.id}`"><PortraitImage class="fate-portrait" :id="person.id" :fallback="person.seal"/><h3>{{person.name}} · {{person.label}}</h3><p class="small">{{person.summary}}</p></div><button class="text-button" @click="selectTab('仙缘')">展开仙缘 →</button></section>
      <section v-if="!singleScreen" class="note"><span>此地机缘</span><p>{{location.description}}</p><small>试玩版本 · 数值未平衡<br>约30分钟理解玩法，不限定通关时间</small></section></aside>
      <CharacterPanel v-if="!singleScreen||hubView==='character'" :game="game" :details-only="immersive"/>
    </main>
</template>
