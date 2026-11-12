<script setup lang="ts">
import {useLocalActivityControls} from './activity-controls';
import {computed} from 'vue';
import {useGame} from './store';
import {activityStop} from '../../src/full/activity';
import {activityView,stopMessage} from './activity-view';
const store=useGame();
const emit=defineEmits<{inspect:[]}>();
const a=computed(()=>store.activity?.runId===store.game?.core.runId&&store.activity?.status!=='stopped'?store.activity:null);
const view=computed(()=>a.value?activityView(a.value,store.game):null);
const blocked=computed(()=>a.value&&store.game?activityStop(store.game,a.value):null);
const check=computed(()=>!store.available||store.canRetry||store.unresolved);
const takeover=computed(()=>a.value?.status==='running'&&!store.activityOwned&&!store.activityRuntime);
const phase=computed(()=>check.value?'进度待核对':store.activityPausing?'正在暂停':store.activityRuntime?.phase==='saving'?'本轮保存中':store.activityRuntime?'正在'+(a.value?.version===1?'潜修':view.value?.noun):takeover.value?'待继续 · 本轮重计':a.value?.status==='paused'?'已暂停':'待继续');
const localControls=useLocalActivityControls();
</script>

<template>
 <section v-if="a&&view" class="cultivation-ongoing art06-main-decision" data-testid="cultivation-ongoing" :data-status="a.status" aria-label="本次活动">
  <header><small>{{phase}}</small><h2>{{view.name}}</h2></header>
  <p class="ongoing-progress">已完成 <strong>{{a.completedCycles}}</strong> {{view.unit}}<template v-if="a.version!==1"> · 上限 {{a.plan.maxCycles}} {{view.unit}}</template><span>每{{view.unit}} {{a.cycleMs/1000}} 秒</span></p>
  <template v-if="a.version===1">
   <p>本段修为 <strong>+{{a.gainedXp}}</strong></p>
   <small>{{view.goal}} · 上限 {{a.plan.maxCycles}} 轮<template v-if="a.plan.method==='assisted'"> · 用石 {{a.spentStones}} / {{a.plan.stoneBudget}} · 保留 {{a.plan.stoneReserve}}</template><template v-else> · 不耗灵石</template></small>
  </template>
  <small v-else>{{view.summary.join(' · ')}} · {{view.goal}}</small>
  <p v-if="check" role="status">请先处理上方存档提示，再继续本段。</p>
  <template v-else>
   <p v-if="store.activityPausing" role="status">核对本轮后停手，不再开始下一轮。</p>
   <button v-else-if="localControls&&a.status==='running'&&store.activityOwned" class="primary" data-testid="cultivation-active-pause" @click="store.pauseCultivation">暂停{{view.noun}}</button>
   <button v-else-if="localControls&&!store.activityRuntime" class="primary" data-testid="cultivation-active-resume" :disabled="store.busy||!!blocked" @click="store.resumeCultivation">{{'继续'+view.noun}}</button>
   <small v-if="!store.activityRuntime&&!store.activityPausing">沿用原额度，本轮重新计时；离线无收益，继续后其他页停手。</small>
   <p v-if="blocked&&!store.activityRuntime" role="status">{{stopMessage(a.plan,blocked)}}</p>
  </template>
  <button class="text-button" data-testid="cultivation-active-plan" @click="emit('inspect')">查看本段安排</button>
 </section>
</template>

<style scoped>
.cultivation-ongoing{gap:12px}.cultivation-ongoing h2{margin:0;font-weight:400}.ongoing-progress{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.ongoing-progress span{margin-left:auto;font-size:14px;color:#bad2c7}.cultivation-ongoing strong{color:#c3f5dd;font-size:26px;font-weight:400}.cultivation-ongoing>.text-button{align-self:center;min-height:44px;font-size:18px!important}.cultivation-ongoing>small{color:#c5d8ca}
:global(.art06-status:empty){display:none}
</style>
