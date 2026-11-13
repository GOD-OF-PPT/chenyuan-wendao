<script setup lang="ts">
import { computed, inject } from 'vue';
import type { useGame } from './store';
import { activityPlansKey } from './use-activity-plans';
import { gamePhase } from '../../src/full/contracts.ts';
import type { Action } from '../../src/full/types.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import type { NavigationRequest } from './navigation';
import EquipmentPanel from './EquipmentPanel.vue';
const props = defineProps<{
    tab: string;
    view: string;
    singleScreen: boolean;
    entry: number;
    consumption: (action: Action) => string;
  }>(),
  equipmentOpen = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{
  act: [action: Action];
  track: [target: TrackingTarget];
  navigate: [request: NavigationRequest];
  section: [reading: { runId: string; section: string }];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  plans = inject(activityPlansKey)!;
const {
  highlight,
  productionInspectionPlan,
  preparationInspectionPlan,
  preparationInspectionSaved,
  movePreparation,
  startProduction,
  moveProduction,
} = plans;
const game = computed(() => store.game!),
  hubView = computed(() => props.view),
  equipmentEntry = computed(() => props.entry),
  equipmentVisible = computed(
    () =>
      props.tab === '修行' &&
      ((!props.singleScreen && gamePhase(game.value) !== 'opening') ||
        (props.singleScreen && ['skills', 'relics'].includes(hubView.value))) &&
      game.value.status === 'active',
  );
const act = (action: Action) => emit('act', action),
  trackProduction = (target: TrackingTarget) => emit('track', target),
  navigate = (request: NavigationRequest) => emit('navigate', request);
</script>
<template>
<details v-show="equipmentVisible" class="equipment-disclosure" data-testid="equipment-section" :open="singleScreen||equipmentOpen" @toggle="equipmentOpen=($event.target as HTMLDetailsElement).open"><summary data-testid="equipment-toggle">功法与法宝 <span>{{game.school==='sword'?'当前剑修':game.school==='talisman'?'当前符修':'查看与选择修法'}} · {{equipmentOpen?'收起':'展开'}}</span></summary><KeepAlive :max="1"><EquipmentPanel :entry="equipmentEntry" :key="game.core.runId" v-if="equipmentVisible&&(singleScreen||equipmentOpen)" :game="game" :enabled="store.available" :busy="store.busy" :highlight="highlight" @section="emit('section',$event)" :catalogue="hubView==='relics'?'relics':'skills'" :consumption="consumption" :running="store.activityRunning" :activity="store.activity" :runtime="store.activityRuntime" :saved-production="productionInspectionPlan" :saved-preparation-plan="preparationInspectionPlan" :preparation-saved="preparationInspectionSaved" @travel-plan="movePreparation" @start="startProduction" @move="moveProduction" @act="act" @track="trackProduction" @navigate="navigate"/></KeepAlive></details>
</template>
