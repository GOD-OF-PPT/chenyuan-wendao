<script setup lang="ts">
import {computed} from 'vue';
import type {useGame} from './store';
import {activityStop} from '../../src/full/activity.ts';
import {activityView,stopMessage} from './activity-view';
const props=defineProps<{store:ReturnType<typeof useGame>;compact?:boolean;summary?:boolean;rail?:boolean}>();
const emit=defineEmits<{settings:[];details:[];inspect:[]}>();
const a=computed(()=>props.store.activity),runtime=computed(()=>props.store.activityRuntime);
const view=computed(()=>a.value?activityView(a.value,props.store.game):null);
const stopped=computed(()=>a.value?stopMessage(a.value.plan,a.value.stopReason):'');
const lastCycle=computed(()=>a.value?.version===7&&a.value.completedCycles===1||props.store.lastResult?.type===view.value?.type&&props.store.lastResult?.runId===a.value?.runId&&props.store.lastResult?.revisionAfter===a.value?.gameRevision);
const storedCycles=computed(()=>!!a.value&&a.value.version<=5&&a.value.completedCycles>0&&a.value.runId===props.store.game?.core.runId);
const takeover=computed(()=>a.value?.status==='running'&&!runtime.value&&!props.store.activityOwned&&!props.store.activityPausing);
const blocked=computed(()=>a.value&&props.store.game?activityStop(props.store.game,a.value):null);
const status=computed(()=>!props.store.available?'进度待核对':props.store.activityPausing?'正在暂停':runtime.value?.phase==='saving'?'正在保存':runtime.value?'进行中':a.value?.status==='paused'?'已暂停':a.value?.status==='stopped'?'本段已结束':props.store.canRetry?'保存待核对':takeover.value?'待继续 · 本轮重计':'待继续');
const seconds=computed(()=>Math.ceil(Math.max(0,runtime.value?.remainingMs??a.value?.cycleMs??0)/100)/10);
const brief=computed(()=>{const v=a.value;return v?.version===6&&v.plan.kind!=='travel'?[`胜 ${v.victories} / 败退 ${v.defeats} / 撤退 ${v.retreats}`,`耗灵 ${v.spentMp} · 用丹 ${(v.spentItems.healing_pill??0)+(v.spentItems.spirit_pill??0)}`]:[];});
const nextMove=computed(()=>{const c=a.value?.nextCommand;if(!c)return'待核对';if(c.type==='BATTLE')return({attack:'普通攻击',guard:'凝神护体',technique:'起手术法',release:'终结术法',heal:'服回春丹',restore:'服回灵丹',flee:'撤回洞府'} as const)[c.move];return c.type==='ENCOUNTER'?'迎战入场':'抵达目的地';});
const notice=computed(()=>{const n=props.store.activityNotice;return n===a.value?.stopReason?.message||!runtime.value&&a.value?.status!=='stopped'&&n===blocked.value?.message||a.value?.status==='paused'&&!a.value.stopReason&&n==='活动已暂停。未完成的这一轮在继续时重新计时。'?'':n;});
const blockMessage=computed(()=>blocked.value?.message===a.value?.stopReason?.message?'':a.value?stopMessage(a.value.plan,blocked.value):'');
function compactV6(){return props.compact&&a.value?.version===6;}
</script>
<template>
 <section v-if="a&&view&&summary&&!rail" class="training-stop-summary" data-testid="training-summary" aria-label="上段活动成果">
  <strong>{{view.name}} · 已结束</strong><p data-testid="training-stop">{{a.version===7?(a.stopReason?.code==='WAITING_DECISION'?'已停 · 待决定':'已完成一次 · 即停'):stopped}}</p>
  <small data-testid="training-totals"><span v-for="(row,index) in view.summary" :key="index">{{row}}<br></span></small>
  <footer><button data-testid="training-review" @click="emit('settings')">{{a.version===7?'原安排':view.noun+'安排'}}</button><button v-if="storedCycles||lastCycle||a.version===6&&a.completedCycles>0" data-testid="hub-receipt" @click="emit('details')">{{a.version===7?'完整成果':a.version===6||storedCycles?'本段回执':'末轮结算'}}</button></footer>
 </section>
 <section v-else-if="a&&view" class="training-activity" :class="{'training-compact':compact,'activity-rail':rail}" :data-testid="rail&&a.status==='stopped'?'training-summary':'training-activity'" :data-version="a.version" :data-status="a.status" :data-running="!!runtime" :data-generation="a.generation" aria-label="当前活动">
  <header><span>{{rail&&a.status==='paused'&&store.available?'已暂停 · 续行重计本轮':status}}</span><strong>{{view.name}}</strong></header>
  <div v-if="runtime&&!store.activityPausing" class="training-cycle" data-testid="training-cycle"><output data-testid="training-countdown" aria-live="off">{{runtime.phase==='saving'?'保存中':seconds.toFixed(1)+' 秒'}}</output><div class="training-cycle-track" role="progressbar" :aria-valuenow="runtime.totalMs-runtime.remainingMs" :aria-valuemin="0" :aria-valuemax="runtime.totalMs" aria-label="本轮活动进度"><span :style="{width:Math.max(0,Math.min(100,100*(1-runtime.remainingMs/runtime.totalMs)))+'%'}"/></div><small v-if="compact&&a.version===6">下一步：{{nextMove}}</small><small v-else>第 {{a.completedCycles+1}} {{view.unit}} · 保存后计入成果</small></div>
  <p v-else-if="!rail&&a.status!=='stopped'&&(!compactV6()||!notice&&!a.stopReason)" class="training-resume-note">{{store.activityPausing?'核对本轮结算后停止，不再开始下一轮。':'沿用原额度，本轮重计；离线无收益，继续后其他页停手。'}}</p>
  <p v-if="a.stopReason" data-testid="training-stop">{{stopped}}</p>
  <small v-if="rail" class="rail-count">已完成 {{a.completedCycles}} / {{a.plan.maxCycles}} {{view.unit}} · {{a.version===7?'本次':'每轮'}} {{a.cycleMs/1000}} 秒</small><div v-if="!rail" class="training-totals" data-testid="training-totals"><span>已完成 {{a.completedCycles}} / {{a.plan.maxCycles}} {{view.unit}}</span><span v-for="(row,index) in compact&&a.version===6?brief:view.rows.filter(row=>row!==stopped)" :key="index">{{row}}</span></div>
  <p v-if="!compact&&!rail" class="training-goal">{{view.goal}} · {{a.version===7?'本次在线':'每轮'}} {{a.cycleMs/1000}} 秒</p>
  <p v-if="notice&&(!rail||a.status==='running'&&!runtime)" class="training-notice" role="status">{{notice}}</p><p v-if="!runtime&&a.status!=='stopped'&&blockMessage" class="training-notice">{{blockMessage}}</p>
  <footer><button v-if="a.status!=='stopped'&&!runtime&&!store.activityPausing&&!store.canRetry" class="primary" :aria-label="'继续'+view.noun" data-testid="training-resume" @click="store.resumeCultivation" :disabled="store.busy||!store.available||!!blocked">{{'继续'+view.noun}}</button><button v-if="a.status==='running'&&store.activityOwned" :class="runtime||store.activityPausing?'primary':'text-button'" :aria-label="'暂停'+view.noun" data-testid="training-pause" @click="store.pauseCultivation" :disabled="store.activityPausing||!store.available">{{store.activityPausing?'正在暂停…':rail||compact&&a.version===6?'暂停':'暂停'+view.noun}}</button><button v-if="store.canRetry&&!rail" data-testid="training-retry" @click="store.retry" :disabled="store.busy">重试原操作</button><button v-if="rail||!compact||a.version===6||a.version===7" class="text-button" :aria-label="'查看'+view.noun+'安排'" :data-testid="rail&&a.status==='stopped'?'training-review':'training-settings'" @click="emit('settings')">{{rail||compact&&a.version===6?'原安排':'查看'+view.noun+'安排'}}</button><button v-if="a.version===6&&a.completedCycles>0" class="text-button" :data-testid="rail&&a.status==='stopped'?'hub-receipt':'adventure-receipts'" aria-label="本段回执" @click="emit('details')">{{compact?'回执':'本段回执'}}</button><button v-if="storedCycles||rail&&a.version!==6&&a.status==='stopped'&&lastCycle" data-testid="hub-receipt" @click="emit('details')">完整回执</button><button v-if="rail" data-testid="activity-inspect" @click="emit('inspect')">本段详情</button></footer>
 </section>
</template>
