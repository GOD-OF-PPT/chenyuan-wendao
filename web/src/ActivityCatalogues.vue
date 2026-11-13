<script setup lang="ts">
import { computed, inject } from 'vue';
import type { Action } from '../../src/full/types.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import type { NavigationRequest } from './navigation';
import type {
  ProgressionKind,
  ProgressionVariant,
} from '../../src/full/progression.ts';
import { activityPlansKey } from './use-activity-plans';
import type { useGame } from './store';
import { isAdventurePlan } from '../../src/full/adventure.ts';
import ActivityRecords from './ActivityRecords.vue';
import MarketPlanner from './MarketPlanner.vue';
import RecoveryPlanner from './RecoveryPlanner.vue';
import MilestoneGate from './MilestoneGate.vue';
import TrainingPlanner from './TrainingPlanner.vue';
import PreparationPanel from './PreparationPanel.vue';
import ProgressionChoices from './ProgressionChoices.vue';
import ExplorePanel from './ExplorePanel.vue';
import GoodsPanel from './GoodsPanel.vue';
const props = defineProps<{
  view: string;
  singleScreen: boolean;
  immersive: boolean;
  readingGeneration: number;
  tradeoffKind: ProgressionKind;
  tradeoffSeed: ProgressionVariant;
  tradeoffEntry: number;
  quantity: number;
  consumption: (action: Action) => string;
}>();
const receiptAll = defineModel<boolean>('allReceipts', { required: true });
const emit = defineEmits<{
  act: [action: Action];
  navigate: [request: NavigationRequest];
  track: [target: TrackingTarget];
  home: [];
  prepare: [];
  compare: [kind: ProgressionKind, seed: ProgressionVariant];
  open: [view: string];
  school: [event?: Event];
  trial: [];
  quick: [action: Action];
  receipt: [];
  destination: [request: NavigationRequest];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  plans = inject(activityPlansKey)!;
const {
  collectionTarget,
  highlight,
  trainingInspectionPlan,
  sourceInspectionPlan,
  productionInspectionPlan,
  preparationInspectionPlan,
  preparationInspectionSaved,
  preparationInspectionExact,
  adventureInspectionPlan,
  adventureInspectionSaved,
  activityPlanVisible,
  startTraining,
  startSource,
  startProduction,
  startPreparation,
  startAdventure,
  movePreparation,
  moveProduction,
  travel,
  viewActivityPlan,
} = plans;
const game = computed(() => store.game!),
  hubView = computed(() => props.view),
  pendingStoryError = computed(() => store.unresolved);
const act = (action: Action) => emit('act', action),
  navigate = (request: NavigationRequest) => emit('navigate', request),
  trackProduction = (target: TrackingTarget) => emit('track', target),
  closeHub = () => emit('home'),
  openPreparation = () => emit('prepare'),
  openTradeoffs = (kind: ProgressionKind, seed: ProgressionVariant) =>
    emit('compare', kind, seed),
  openHub = (view: string) => emit('open', view),
  showEquipment = (event?: Event) => emit('school', event),
  showTrialPreparation = () => emit('trial'),
  quickInventory = (action: Action) => emit('quick', action),
  viewReceipt = () => emit('receipt');
</script>
<template>
<ActivityRecords :view="hubView" :single-screen="singleScreen" :immersive="immersive" v-model:original-plan="activityPlanVisible" v-model:all-receipts="receiptAll" @settings="viewActivityPlan" @details="viewReceipt"/>
<KeepAlive :max="2"><MarketPlanner :key="game.core.runId+'MarketPlanner'+hubView" v-if="singleScreen&&hubView==='market'" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" :highlight="highlight" :plan-saved="preparationInspectionSaved" :inspection-exact="preparationInspectionExact" :saved-plan="preparationInspectionPlan?.kind==='buy'||preparationInspectionPlan?.kind==='sell'?preparationInspectionPlan:null" :consumption="consumption" @start="startPreparation" @act="act" @track="trackProduction" @travel="movePreparation"/></KeepAlive>
<KeepAlive :max="2"><RecoveryPlanner :key="game.core.runId+'RecoveryPlanner'+hubView" v-if="singleScreen&&hubView==='recovery'" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" :highlight="highlight" :plan-saved="preparationInspectionSaved" :inspection-exact="preparationInspectionExact" :saved-plan="preparationInspectionPlan?.kind==='use'||preparationInspectionPlan?.kind==='rest'?preparationInspectionPlan:null" @start="startPreparation" @act="act" @track="trackProduction" @travel="movePreparation"/></KeepAlive>
<MilestoneGate v-if="singleScreen&&hubView==='cultivation'&&store.activity?.version===7&&store.activity.plan.action.type==='BREAKTHROUGH'&&store.activity.status!=='stopped'" :game="game" kind="breakthrough" :action="store.activity.plan.action"><p>本次凝神已安排，读秒与停手在上方；保存后核对新境界。</p><button @click="viewActivityPlan">查看原安排</button></MilestoneGate><KeepAlive :max="2"><TrainingPlanner :key="game.core.runId+readingGeneration+game.core.player.realm+'TrainingPlanner'" v-if="singleScreen&&hubView==='cultivation'&&!(store.activity?.version===7&&store.activity.plan.action.type==='BREAKTHROUGH'&&store.activity.status!=='stopped')" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" :saved-plan="trainingInspectionPlan" @start="startTraining" @act="act" @prepare="openPreparation()" @trial="showTrialPreparation" @school="showEquipment" @cave="travel('cave')" @compare="openTradeoffs('cultivation',$event)"/></KeepAlive>
<KeepAlive :max="1"><PreparationPanel :key="game.core.runId+readingGeneration+game.core.player.realm+'PreparationPanel'" :blocked="pendingStoryError" v-if="singleScreen&&hubView==='journey'" :game="game" :busy="store.busy" :available="store.available" :running="store.activityRunning" @act="act" @navigate="navigate" @home="closeHub" @compare="openTradeoffs('preparation',$event)"/></KeepAlive>
<KeepAlive :max="1"><ProgressionChoices :key="game.core.runId+readingGeneration+game.core.player.realm+tradeoffKind" v-if="singleScreen&&hubView==='tradeoffs'" :game="game" :kind="tradeoffKind" :seed="tradeoffSeed" :entry="tradeoffEntry" :busy="store.busy" :available="store.available" @navigate="emit('destination',$event)" @inspect="openHub($event)"/></KeepAlive>
<KeepAlive :max="2"><ExplorePanel :key="game.core.runId+'ExplorePanel'+hubView" v-if="singleScreen&&hubView==='explore'" :game="game" :busy="store.busy" :available="store.available" :highlight="highlight" :collection="collectionTarget" :purchase-quantity="quantity" :running="store.activityRunning" :saved-adventure-plan="adventureInspectionPlan" :plan-saved="adventureInspectionSaved" :activity="store.activity" :runtime="store.activityRuntime" :saved-source-plan="sourceInspectionPlan" :saved-preparation-plan="preparationInspectionPlan" :preparation-saved="preparationInspectionSaved" :preparation-exact="preparationInspectionExact" :consumption="consumption" @travel-plan="movePreparation" @track="trackProduction" @start="plan=>plan.kind==='source'?startSource(plan):isAdventurePlan(plan)?startAdventure(plan):startPreparation(plan)" @act="act" @travel="travel" @home="closeHub"/></KeepAlive>
<KeepAlive :max="2"><GoodsPanel :key="game.core.runId+'GoodsPanel'+hubView" v-if="singleScreen&&(hubView==='inventory'||hubView==='forge')" :minimal="immersive&&hubView==='forge'" :mode="hubView==='forge'?'forge':'inventory'" :game="game" :busy="store.busy" :available="store.available" :highlight="highlight" :consumption="consumption" :running="store.activityRunning" :activity="store.activity" :runtime="store.activityRuntime" :saved-production="productionInspectionPlan" :saved-preparation-plan="preparationInspectionPlan" :preparation-saved="preparationInspectionSaved" @travel-plan="movePreparation" @start="startProduction" @move="moveProduction" @act="act" @quick="quickInventory" @track="trackProduction" @travel="travel"/></KeepAlive>
</template>
