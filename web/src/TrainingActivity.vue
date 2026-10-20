<script setup lang="ts">
import {computed} from 'vue';
import type {useGame} from './store';
import {activityStop} from '../../src/full/activity.ts';
import {sources,items} from '../../src/full/content.ts';
const props=defineProps<{store:ReturnType<typeof useGame>;compact?:boolean;summary?:boolean}>();
const emit=defineEmits<{settings:[];details:[]}>();
const a=computed(()=>props.store.activity),runtime=computed(()=>props.store.activityRuntime);
const source=computed(()=>a.value?.plan.kind==='source'?sources[a.value.plan.sourceId]:null);
const noun=computed(()=>source.value?(source.value.location==='sect'?'委托':'取材'):'修炼');
const title=computed(()=>source.value?.name??(a.value?.plan.kind==='cultivation'&&a.value.plan.method==='assisted'?'灵石辅助':'自然吐纳'));
const earned=computed(()=>a.value?.version===2?Object.entries(a.value.gainedItems).map(([id,n])=>items[id].name+' +'+n).concat(a.value.gainedStones?'灵石 +'+a.value.gainedStones:[]).join(' · '):'');
const target=computed(()=>{const p=a.value?.plan;if(p?.kind!=='source'||!p.target||!props.store.game)return '';const t=p.target,stock=t.kind==='stones'?props.store.game.core.player.stones:props.store.game.core.inventory[t.id];return(t.kind==='stones'?'灵石':items[t.id].name)+'库存 '+stock+' / '+t.quantity;});
const lastCycle=computed(()=>props.store.lastResult?.type===(source.value?'SOURCE':'CULTIVATE')&&props.store.lastResult?.runId===a.value?.runId&&props.store.lastResult?.revisionAfter===a.value?.gameRevision);
const blocked=computed(()=>a.value&&props.store.game?activityStop(props.store.game,a.value):null);
const status=computed(()=>props.store.activityPausing?'正在暂停':runtime.value?.phase==='saving'?'本轮保存中':runtime.value?(source.value?noun.value+'进行中':'吐纳进行中'):a.value?.status==='paused'?noun.value+'已暂停':a.value?.status==='stopped'?'此段活动已结束':'已保存活动安排');
const seconds=computed(()=>Math.ceil(Math.max(0,runtime.value?.remainingMs??a.value?.cycleMs??0)/100)/10);
</script>
<template>
 <section v-if="a&&summary" class="training-stop-summary" data-testid="training-summary" aria-label="上段活动成果">
  <strong>{{title}} · 已结束</strong><p data-testid="training-stop">{{a.stopReason?.message}}</p>
  <small data-testid="training-totals">完成 {{a.completedCycles}} 轮 · 修为 +{{a.gainedXp}}<br><template v-if="a.version===2">{{earned||'暂无物资产出'}}<br></template><template v-else>灵石消耗 {{a.spentStones}} · </template>岁月 +{{a.spentMonths}} 月</small>
  <footer><button data-testid="training-review" @click="emit('settings')">{{source?'取材安排':'修行安排'}}</button><button v-if="lastCycle" data-testid="hub-receipt" @click="emit('details')">末轮结算</button></footer>
 </section>
 <section v-else-if="a" class="training-activity" :class="{'training-compact':compact}" data-testid="training-activity" :data-status="a.status" :data-running="!!runtime" :data-generation="a.generation" aria-label="当前活动">
  <header><span>{{status}}</span><strong>{{title}}</strong></header>
  <div v-if="runtime&&!store.activityPausing" class="training-cycle" data-testid="training-cycle"><output data-testid="training-countdown" aria-live="off">{{runtime.phase==='saving'?'保存中':seconds.toFixed(1)+' 秒'}}</output><div class="training-cycle-track" role="progressbar" :aria-valuenow="runtime.totalMs-runtime.remainingMs" :aria-valuemin="0" :aria-valuemax="runtime.totalMs" aria-label="本轮活动进度"><span :style="{width:Math.max(0,Math.min(100,100*(1-runtime.remainingMs/runtime.totalMs)))+'%'}"/></div><small>第 {{a.completedCycles+1}} 轮 · 保存后计入成果</small></div>
  <p v-else-if="a.status!=='stopped'" class="training-resume-note">{{store.activityPausing?'核对本轮结算后停止，不再开始下一轮。':'继续后本轮重新计时；关闭或刷新期间不补发收益。'}}</p>
  <p v-if="a.stopReason" data-testid="training-stop">{{a.stopReason.message}}</p>
  <div class="training-totals" data-testid="training-totals"><span>已完成 {{a.completedCycles}} / {{a.plan.maxCycles}} 轮</span><span>累计修为 +{{a.gainedXp}}</span><template v-if="a.version===2"><span>{{earned||'尚无已保存物资'}}</span><span>游戏月已用 {{a.spentMonths}} / {{a.plan.monthBudget}} · 余寿保留 {{a.plan.remainingMonthsReserve}} 月</span><span v-if="target">{{target}}</span></template><template v-else><span>灵石已用 {{a.spentStones}} / {{a.plan.stoneBudget}}</span><span v-if="!compact">游戏岁月 +{{a.spentMonths}} 月 · 保留灵石 {{a.plan.stoneReserve}}</span></template></div>
  <p v-if="!compact" class="training-goal">{{a.plan.until==='xp-cap'?'修为圆满即停':a.plan.until==='target'?'达到库存目标即停':'完成所选轮数即停'}} · 每轮 {{a.cycleMs/1000}} 秒</p>
  <p v-if="store.activityNotice" class="training-notice" role="status">{{store.activityNotice}}</p><p v-if="!runtime&&a.status!=='stopped'&&blocked" class="training-notice">{{blocked.message}}</p>
  <footer><button v-if="a.status!=='stopped'&&!runtime&&!store.activityPausing&&!store.canRetry" class="primary" data-testid="training-resume" @click="store.resumeCultivation" :disabled="store.busy||!!blocked">继续{{noun}}</button><button v-if="a.status==='running'&&store.activityOwned" :class="runtime||store.activityPausing||store.canRetry?'primary':'text-button'" data-testid="training-pause" @click="store.pauseCultivation" :disabled="store.activityPausing">{{store.activityPausing?'正在暂停…':'暂停'+noun}}</button><button v-if="store.canRetry" data-testid="training-retry" @click="store.retry" :disabled="store.busy">重试本次保存</button><button v-if="!compact" class="text-button" data-testid="training-settings" @click="emit('settings')">查看{{source?'取材':'修行'}}安排</button></footer>
 </section>
</template>
