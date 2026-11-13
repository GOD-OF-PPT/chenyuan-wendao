<script setup lang="ts">
import { computed, inject } from 'vue';
import type { useGame } from './store';
import { gamePhase } from '../../src/full/contracts.ts';
import { getTrialJourney } from '../../src/full/queries.ts';
import { narrativeFor } from './story-pages';
import type { NavigationRequest } from './navigation';
import type { TrackingTarget } from '../../src/full/goals.ts';
import MilestoneGate from './MilestoneGate.vue';
import TrialCatalogue from './TrialCatalogue.vue';
import TrialProgressPanel from './TrialProgressPanel.vue';
const props = defineProps<{
  view: string;
  storyView: boolean;
  catalogueView: boolean;
  readMode: 'required' | 'checkpoint';
}>();
const emit = defineEmits<{
  review: [];
  restore: [];
  restoreTrial: [];
  export: [];
  prepare: [];
  resume: [];
  navigate: [request: NavigationRequest];
  track: [target: TrackingTarget];
  equipment: [];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  game = computed(() => store.game!),
  phase = computed(() => gamePhase(game.value)),
  journey = computed(() => getTrialJourney(game.value)),
  hubView = computed(() => props.view),
  trialReadMode = computed(() => props.readMode),
  pendingStoryError = computed(() => store.unresolved);
const reviewTrial = () => emit('review'),
  restore = () => emit('restore'),
  requestTrialRestore = () => emit('restoreTrial'),
  exportSave = () => emit('export'),
  showTrialPreparation = () => emit('prepare'),
  closeHub = () => emit('resume'),
  navigate = (request: NavigationRequest) => emit('navigate', request),
  trackTrialMaterial = (target: TrackingTarget) => emit('track', target),
  openHub = (_view: string) => emit('equipment');
</script>
<template>
<MilestoneGate v-if="storyView&&hubView==='trial-preparation'" :game="game" kind="trial"><TrialCatalogue :block="pendingStoryError?(store.syncIssue?'请先重新读取当前进度':'请先重试或取消原安排'):null"  :game="game" kind="preparation" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :checkpoint="store.checkpointSummary" :recovery="store.trialRecovery" @review="reviewTrial" @restore="hubView==='trial-preparation'?restore():requestTrialRestore()" @export="exportSave" @prepare="showTrialPreparation" @resume="closeHub" @navigate="navigate" @track="trackTrialMaterial" @inspect-equipment="openHub('skills')"/></MilestoneGate>
<TrialCatalogue :block="pendingStoryError?(store.syncIssue?'请先重新读取当前进度':'请先重试或取消原安排'):null" v-if="storyView&&(['trial','battle'].includes(hubView)||hubView==='current'&&game.status==='active'&&!narrativeFor(game)&&phase!=='idle')" :game="game" kind="progress" :initial-mode="trialReadMode" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :checkpoint="store.checkpointSummary" :recovery="store.trialRecovery" @review="reviewTrial" @restore="hubView==='trial-preparation'?restore():requestTrialRestore()" @export="exportSave" @prepare="showTrialPreparation" @resume="closeHub" @navigate="navigate" @track="trackTrialMaterial" @inspect-equipment="openHub('skills')"/>
<TrialProgressPanel v-if="!catalogueView&&(journey || store.trialRecovery)" :journey="journey" :recovery="store.trialRecovery" :checkpoint="store.checkpointSummary" :enabled="store.available && !store.busy" @restore="requestTrialRestore" @export="exportSave" @prepare="showTrialPreparation"/>
</template>
