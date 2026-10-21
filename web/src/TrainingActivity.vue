<script setup lang="ts">
import {computed} from 'vue';
import type {useGame} from './store';
import {activityStop} from '../../src/full/activity.ts';
import {activityView,stopMessage} from './activity-view';
const props=defineProps<{store:ReturnType<typeof useGame>;compact?:boolean;summary?:boolean}>();
const emit=defineEmits<{settings:[];details:[]}>();
const a=computed(()=>props.store.activity),runtime=computed(()=>props.store.activityRuntime);
const view=computed(()=>a.value?activityView(a.value,props.store.game):null);
const stopped=computed(()=>a.value?stopMessage(a.value.plan,a.value.stopReason):'');
const lastCycle=computed(()=>a.value?.version===7&&a.value.completedCycles===1||props.store.lastResult?.type===view.value?.type&&props.store.lastResult?.runId===a.value?.runId&&props.store.lastResult?.revisionAfter===a.value?.gameRevision);
const blocked=computed(()=>a.value&&props.store.game?activityStop(props.store.game,a.value):null);
const status=computed(()=>props.store.activityPausing?'正在暂停':runtime.value?.phase==='saving'?'本轮保存中':runtime.value?(a.value?.version===1?'吐纳进行中':view.value?.noun+'进行中'):a.value?.status==='paused'?view.value?.noun+'已暂停':a.value?.status==='stopped'?'此段活动已结束':'已保存活动安排');
const seconds=computed(()=>Math.ceil(Math.max(0,runtime.value?.remainingMs??a.value?.cycleMs??0)/100)/10);
const brief=computed(()=>{const v=a.value;return v?.version===6&&v.plan.kind!=='travel'?[`胜 ${v.victories} / 败退 ${v.defeats} / 撤退 ${v.retreats}`,`耗灵 ${v.spentMp} · 用丹 ${(v.spentItems.healing_pill??0)+(v.spentItems.spirit_pill??0)}`]:[];});
const nextMove=computed(()=>{const c=a.value?.nextCommand;if(!c)return'待核对';if(c.type==='BATTLE')return({attack:'普通攻击',guard:'凝神护体',technique:'起手术法',release:'终结术法',heal:'服回春丹',restore:'服回灵丹',flee:'撤回洞府'} as const)[c.move];return c.type==='ENCOUNTER'?'迎战入场':'抵达目的地';});
const notice=computed(()=>compactV6()&&props.store.activityNotice===a.value?.stopReason?.message?'':props.store.activityNotice);
const blockMessage=computed(()=>{const m=blocked.value?.message??'';return compactV6()&&(m===a.value?.stopReason?.message||m===notice.value)?'':m;});
function compactV6(){return props.compact&&a.value?.version===6;}
</script>
<template>
 <section v-if="a&&view&&summary" class="training-stop-summary" data-testid="training-summary" aria-label="上段活动成果">
  <strong>{{view.name}} · 已结束</strong><p data-testid="training-stop">{{a.version===7?(a.stopReason?.code==='WAITING_DECISION'?'已停 · 待决定':'已完成一次 · 即停'):stopped}}</p>
  <small data-testid="training-totals"><span v-for="(row,index) in view.summary" :key="index">{{row}}<br></span></small>
  <footer><button data-testid="training-review" @click="emit('settings')">{{a.version===7?'原安排':view.noun+'安排'}}</button><button v-if="lastCycle||a.version===6&&a.completedCycles>0" data-testid="hub-receipt" @click="emit('details')">{{a.version===7?'完整成果':a.version===6?'本段回执':'末轮结算'}}</button></footer>
 </section>
 <section v-else-if="a&&view" class="training-activity" :class="{'training-compact':compact}" data-testid="training-activity" :data-version="a.version" :data-status="a.status" :data-running="!!runtime" :data-generation="a.generation" aria-label="当前活动">
  <header><span>{{status}}</span><strong>{{view.name}}</strong></header>
  <div v-if="runtime&&!store.activityPausing" class="training-cycle" data-testid="training-cycle"><output data-testid="training-countdown" aria-live="off">{{runtime.phase==='saving'?'保存中':seconds.toFixed(1)+' 秒'}}</output><div class="training-cycle-track" role="progressbar" :aria-valuenow="runtime.totalMs-runtime.remainingMs" :aria-valuemin="0" :aria-valuemax="runtime.totalMs" aria-label="本轮活动进度"><span :style="{width:Math.max(0,Math.min(100,100*(1-runtime.remainingMs/runtime.totalMs)))+'%'}"/></div><small v-if="compact&&a.version===6">下一步：{{nextMove}}</small><small v-else>第 {{a.completedCycles+1}} {{view.unit}} · 保存后计入成果</small></div>
  <p v-else-if="a.status!=='stopped'&&(!compactV6()||!notice&&!a.stopReason)" class="training-resume-note">{{store.activityPausing?'核对本轮结算后停止，不再开始下一轮。':'继续后本轮重新计时；关闭或刷新期间不补发收益。'}}</p>
  <p v-if="a.stopReason" data-testid="training-stop">{{stopped}}</p>
  <div class="training-totals" data-testid="training-totals"><span>已完成 {{a.completedCycles}} / {{a.plan.maxCycles}} {{view.unit}}</span><span v-for="(row,index) in compact&&a.version===6?brief:view.rows" :key="index">{{row}}</span></div>
  <p v-if="!compact" class="training-goal">{{view.goal}} · {{a.version===7?'本次在线':'每轮'}} {{a.cycleMs/1000}} 秒</p>
  <p v-if="notice" class="training-notice" role="status">{{notice}}</p><p v-if="!runtime&&a.status!=='stopped'&&blockMessage" class="training-notice">{{blockMessage}}</p>
  <footer><button v-if="a.status!=='stopped'&&!runtime&&!store.activityPausing&&!store.canRetry" class="primary" :aria-label="'继续'+view.noun" data-testid="training-resume" @click="store.resumeCultivation" :disabled="store.busy||!!blocked">{{compact&&a.version===6?'继续':'继续'+view.noun}}</button><button v-if="a.status==='running'&&store.activityOwned" :class="runtime||store.activityPausing||store.canRetry?'primary':'text-button'" :aria-label="'暂停'+view.noun" data-testid="training-pause" @click="store.pauseCultivation" :disabled="store.activityPausing">{{store.activityPausing?'正在暂停…':compact&&a.version===6?'暂停':'暂停'+view.noun}}</button><button v-if="store.canRetry" data-testid="training-retry" @click="store.retry" :disabled="store.busy">重试本次保存</button><button v-if="!compact||a.version===6||a.version===7" class="text-button" :aria-label="'查看'+view.noun+'安排'" data-testid="training-settings" @click="emit('settings')">{{compact&&a.version===6?'原安排':'查看'+view.noun+'安排'}}</button><button v-if="a.version===6&&a.completedCycles>0" class="text-button" data-testid="adventure-receipts" aria-label="本段回执" @click="emit('details')">{{compact?'回执':'本段回执'}}</button></footer>
 </section>
</template>
