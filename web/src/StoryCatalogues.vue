<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { Action } from '../../src/full/types.ts';
import type { NavigationRequest } from './navigation';
import type { useGame } from './store';
import { useActionView } from './use-action-view';
import { activityPlansKey } from './use-activity-plans';
import { gamePhase } from '../../src/full/contracts.ts';
import { narrativeFor } from './story-pages';
import NarrativeStageHost from './NarrativeStageHost.vue';
import FateCatalogue from './FateCatalogue.vue';
import LifeCatalogue from './LifeCatalogue.vue';
import NarrativePanel from './NarrativePanel.vue';
const props = defineProps<{
  active: boolean;
  view: string;
  readingGeneration: number;
  narrativeContext: number;
  journalKey: (index: number) => string;
  consumption: (action: Action) => string;
}>();
const emit = defineEmits<{
  browse: [];
  act: [action: Action];
  navigate: [request: NavigationRequest];
  life: [event?: Event];
  resume: [];
  dialogue: [];
  end: [kind: 'RETIRE' | 'END_LIFE'];
  export: [];
  restore: [];
  restart: [];
  receipt: [];
  progress: [];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  plans = inject(activityPlansKey)!,
  { why } = useActionView(store);
const game = computed(() => store.game!),
  phase = computed(() => gamePhase(game.value)),
  storyView = computed(() => props.active),
  hubView = computed(() => props.view),
  highlight = plans.highlight;
const browseDirect = () => emit('browse'),
  storyAct = (action: Action) => emit('act', action),
  navigate = (request: NavigationRequest) => emit('navigate', request),
  showLife = (event?: Event) => emit('life', event),
  resumeEncounter = () => emit('resume'),
  requestEnd = (kind: 'RETIRE' | 'END_LIFE') => emit('end', kind),
  exportLife = () => emit('export'),
  restore = () => emit('restore'),
  reset = () => emit('restart'),
  viewReceipt = () => emit('receipt');
function openHub(view: string) {
  if (view === 'current') emit('dialogue');
  else if (view === 'trial') emit('progress');
}
const lifeBook = ref<InstanceType<typeof LifeCatalogue>>();
defineExpose({ manage: () => lifeBook.value?.manage() });
</script>
<template>
<NarrativeStageHost :active="storyView">
<KeepAlive :max="1"><FateCatalogue :key="game.core.runId+readingGeneration+'FateCatalogue'" v-if="storyView&&(hubView==='fate'||hubView==='current'&&phase==='idle')&&game.status==='active'" :game="game" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :highlight="highlight" :journal-key="journalKey" @browse="browseDirect()" @act="storyAct" @navigate="navigate" @life="showLife" @resume="resumeEncounter" @dialogue="openHub('current')"/></KeepAlive>
<KeepAlive :max="1"><LifeCatalogue ref="lifeBook" :key="game.core.runId+readingGeneration+game.status+'LifeCatalogue'" v-if="storyView&&(hubView==='life'||['fate','current'].includes(hubView)&&game.status!=='active')" :game="game" :end-reason="why({type:'RETIRE'})" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @end="requestEnd" @export="exportLife" @restore="restore" @restart="reset" @receipt="viewReceipt"/></KeepAlive>
<KeepAlive :max="1"><NarrativePanel :key="game.core.runId+readingGeneration+'NarrativePanel'" v-if="storyView&&hubView==='current'&&narrativeFor(game)" :game="game" :context="narrativeContext" :enabled="store.available" :running="store.activityRunning" :busy="store.busy" :consumption="consumption" @act="storyAct" @life="showLife" @progress="openHub('trial')"/></KeepAlive>
</NarrativeStageHost>
</template>
