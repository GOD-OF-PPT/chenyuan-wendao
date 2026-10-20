<script setup lang="ts">
import {computed} from 'vue';
import type {useGame} from './store';
import {activityStop} from '../../src/full/activity.ts';
import {activityView} from './activity-view';
const props=defineProps<{store:ReturnType<typeof useGame>;compact?:boolean;summary?:boolean}>();
const emit=defineEmits<{settings:[];details:[]}>();
const a=computed(()=>props.store.activity),runtime=computed(()=>props.store.activityRuntime);
const view=computed(()=>a.value?activityView(a.value,props.store.game):null);
const lastCycle=computed(()=>props.store.lastResult?.type===view.value?.type&&props.store.lastResult?.runId===a.value?.runId&&props.store.lastResult?.revisionAfter===a.value?.gameRevision);
const blocked=computed(()=>a.value&&props.store.game?activityStop(props.store.game,a.value):null);
const status=computed(()=>props.store.activityPausing?'正在暂停':runtime.value?.phase==='saving'?'本轮保存中':runtime.value?(a.value?.version===1?'吐纳进行中':view.value?.noun+'进行中'):a.value?.status==='paused'?view.value?.noun+'已暂停':a.value?.status==='stopped'?'此段活动已结束':'已保存活动安排');
const seconds=computed(()=>Math.ceil(Math.max(0,runtime.value?.remainingMs??a.value?.cycleMs??0)/100)/10);
</script>
<template>
 <section v-if="a&&view&&summary" class="training-stop-summary" data-testid="training-summary" aria-label="上段活动成果">
  <strong>{{view.name}} · 已结束</strong><p data-testid="training-stop">{{a.stopReason?.message}}</p>
  <small data-testid="training-totals"><span v-for="(row,index) in view.summary" :key="index">{{row}}<br></span></small>
  <footer><button data-testid="training-review" @click="emit('settings')">{{view.noun}}安排</button><button v-if="lastCycle" data-testid="hub-receipt" @click="emit('details')">末轮结算</button></footer>
 </section>
 <section v-else-if="a&&view" class="training-activity" :class="{'training-compact':compact}" data-testid="training-activity" :data-status="a.status" :data-running="!!runtime" :data-generation="a.generation" aria-label="当前活动">
  <header><span>{{status}}</span><strong>{{view.name}}</strong></header>
  <div v-if="runtime&&!store.activityPausing" class="training-cycle" data-testid="training-cycle"><output data-testid="training-countdown" aria-live="off">{{runtime.phase==='saving'?'保存中':seconds.toFixed(1)+' 秒'}}</output><div class="training-cycle-track" role="progressbar" :aria-valuenow="runtime.totalMs-runtime.remainingMs" :aria-valuemin="0" :aria-valuemax="runtime.totalMs" aria-label="本轮活动进度"><span :style="{width:Math.max(0,Math.min(100,100*(1-runtime.remainingMs/runtime.totalMs)))+'%'}"/></div><small>第 {{a.completedCycles+1}} {{view.unit}} · 保存后计入成果</small></div>
  <p v-else-if="a.status!=='stopped'" class="training-resume-note">{{store.activityPausing?'核对本轮结算后停止，不再开始下一轮。':'继续后本轮重新计时；关闭或刷新期间不补发收益。'}}</p>
  <p v-if="a.stopReason" data-testid="training-stop">{{a.stopReason.message}}</p>
  <div class="training-totals" data-testid="training-totals"><span>已完成 {{a.completedCycles}} / {{a.plan.maxCycles}} {{view.unit}}</span><span v-for="(row,index) in view.rows" :key="index">{{row}}</span></div>
  <p v-if="!compact" class="training-goal">{{view.goal}} · 每轮 {{a.cycleMs/1000}} 秒</p>
  <p v-if="store.activityNotice" class="training-notice" role="status">{{store.activityNotice}}</p><p v-if="!runtime&&a.status!=='stopped'&&blocked" class="training-notice">{{blocked.message}}</p>
  <footer><button v-if="a.status!=='stopped'&&!runtime&&!store.activityPausing&&!store.canRetry" class="primary" data-testid="training-resume" @click="store.resumeCultivation" :disabled="store.busy||!!blocked">继续{{view.noun}}</button><button v-if="a.status==='running'&&store.activityOwned" :class="runtime||store.activityPausing||store.canRetry?'primary':'text-button'" data-testid="training-pause" @click="store.pauseCultivation" :disabled="store.activityPausing">{{store.activityPausing?'正在暂停…':'暂停'+view.noun}}</button><button v-if="store.canRetry" data-testid="training-retry" @click="store.retry" :disabled="store.busy">重试本次保存</button><button v-if="!compact" class="text-button" data-testid="training-settings" @click="emit('settings')">查看{{view.noun}}安排</button></footer>
 </section>
</template>
