<script setup lang="ts">
import {computed,onScopeDispose,ref,shallowRef,watch} from 'vue';
import type {useGame} from './store';
import type {ActivityHistoryPage} from './full-persistence';
import type {Command} from '../../src/full/types.ts';
import {items,recipes,relics,skills,sources} from '../../src/full/content.ts';
import {activityView,stopMessage} from './activity-view';
import {formatCosts,formatDelta} from './presentation';
import CataloguePager from './CataloguePager.vue';

const props=defineProps<{store:ReturnType<typeof useGame>}>();
const history=shallowRef<ActivityHistoryPage|null>(null),error=ref(''),loading=ref(false),requestedPage=ref(0);
const activity=computed(()=>{const a=props.store.activity;return a&&a.version<=5&&a.runId===props.store.game?.core.runId?a:null;});
const view=computed(()=>activity.value?activityView(activity.value,props.store.game):null);
const totals=computed(()=>activity.value&&view.value?[`已完成 ${activity.value.completedCycles} / ${activity.value.plan.maxCycles} ${view.value.unit}`,...view.value.summary]:[]);
const stopped=computed(()=>activity.value?.stopReason?stopMessage(activity.value.plan,activity.value.stopReason):'');
const incomplete='本段收获未能完整核对，请重新读取；没有改变游戏进度。';
let request=0,disposed=false;
function scope(){return{run:props.store.game?.core.runId,id:activity.value?.id,version:activity.value?.version,sync:props.store.syncEpoch,ready:props.store.ready};}
function sameContext(c:ReturnType<typeof scope>){const now=scope();return !disposed&&now.run===c.run&&now.id===c.id&&now.version===c.version&&now.sync===c.sync&&now.ready===c.ready;}
async function load(page=requestedPage.value){
 const owner=++request,c=scope(),expected=activity.value?.completedCycles??0;
 requestedPage.value=page;error.value='';
 if(!c.run||!c.id||!c.ready){history.value=null;loading.value=false;return;}
 loading.value=true;
 const owns=()=>owner===request&&sameContext(c)&&requestedPage.value===page;
 try{
  const result=await props.store.loadActivityHistory(c.id,page,1);
  if(!owns())return;
  const required=Math.max(expected,activity.value?.completedCycles??0);
  if(!Number.isSafeInteger(result.total)||result.total<required||!Number.isSafeInteger(result.pages)||result.pages!==Math.max(1,Math.ceil(result.total))||result.page!==Math.min(page,result.pages-1)||result.rows.length!==Math.min(1,result.total-result.page)||result.rows.some(row=>row.command.runId!==c.run||row.result.runId!==c.run||row.activity.runId!==c.run||row.activity.id!==c.id||row.activity.version>5||row.command.commandId!==row.result.commandId))throw new Error(incomplete);
  history.value=result;requestedPage.value=result.page;
 }catch{if(owns()){history.value=null;error.value=incomplete;}}
 finally{if(owner===request&&sameContext(c))loading.value=false;}
}
watch([()=>props.store.game?.core.runId,()=>props.store.activity?.runId,()=>props.store.activity?.id,()=>props.store.activity?.version,()=>props.store.syncEpoch,()=>props.store.ready,()=>props.store.activity?.completedCycles],(now,before)=>{
 const replaced=!before||now.slice(0,4).some((value,i)=>value!==before[i]);
 if(replaced)requestedPage.value=0;
 if(replaced||now[4]!==before?.[4]||now[5]!==before?.[5])history.value=null;
 void load();
},{immediate:true,flush:'sync'});
onScopeDispose(()=>{disposed=true;request++;});
function commandName(command:Command){
 switch(command.type){
  case'CULTIVATE':return command.method==='natural'?'自然吐纳':'灵石辅助';
  case'SOURCE':return sources[command.sourceId].name;
  case'CRAFT':return recipes[command.recipeId].name;
  case'FORGE':return'炼器 · '+relics[command.relic].name;
  case'LEARN':return'研习 · '+skills[command.skill].name;
  case'STUDY':return'参悟惊鸿剑简';
  case'BUY':return'采购 · '+items[command.item].name+' ×'+command.quantity;
  case'SELL':return'出售 · '+items[command.item].name+' ×'+command.quantity;
  case'USE':return'服用 · '+items[command.item].name;
  case'REST':return'洞府疗养';
  default:return'已保存行动';
 }
}
</script>
<template>
 <section class="activity-history" data-testid="activity-history" aria-label="本段活动逐次记录" :aria-busy="loading">
  <header><h2>{{view?.name??'本段活动'}} · 收获记录</h2><span v-if="loading" class="history-note" role="status">正在读取第 {{requestedPage+1}} 页…</span></header>
  <p class="history-note">只读回看实际周期，不会再次执行、消耗或发放奖励。</p>
  <div v-if="activity" class="history-totals" data-testid="activity-history-totals"><strong>本段累计</strong><span v-for="row in totals" :key="row">{{row}}</span><span v-if="stopped" class="history-stop" data-testid="activity-history-stop">停止：{{stopped}}</span><span v-else class="history-stop" data-testid="activity-history-stop">{{activity.status==='paused'?'活动已暂停；未完成的周期没有计入成果。':activity.status==='running'?'活动仍在安排中；这里只记已保存周期。':'此段活动已停止；停止说明未能核对。'}}</span></div>
  <p v-if="error" class="history-error" role="alert" data-testid="activity-history-error">{{error}} <button type="button" data-testid="activity-history-reload" @click="load()">重新读取</button></p>
  <template v-else-if="history"><div class="history-grid"><article v-for="row in history.rows" :key="row.command.commandId" data-testid="activity-history-row" :data-command-id="row.command.commandId"><h3>第 {{row.activity.completedCycles}} 次 · {{commandName(row.command)}}</h3><p class="history-note">单周期 {{row.activity.cycleMs/1000}} 秒 · 已执行 {{row.result.executedSteps}} / {{row.result.requestedSteps}} 次</p><p><span class="history-label">实际投入 </span><span data-testid="activity-history-costs">{{formatCosts(row.result.costs)}}</span></p><p><span class="history-label">净变化 </span><span data-testid="activity-history-delta">{{formatDelta(row.result.delta)}}</span></p></article></div><p v-if="history.total===0" class="history-note">尚无已保存周期。</p><CataloguePager :page="history.page" :pages="history.pages" :total="history.total" label="逐次记录" @change="load($event)"/></template>
  <p v-else-if="!loading&&!store.ready" class="history-note" role="status">正在核对本机进度，记录尚未读取。</p>
  <p v-else-if="!loading&&!activity" class="history-note">当前没有可核对的普通活动，请返回查看当前安排。</p>
 </section>
</template>
<style scoped>
.activity-history{display:flex;flex:1;flex-direction:column;gap:8px;min-width:0;min-height:0;font-size:18px;line-height:1.5;color:#e7eedb}.activity-history header{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px}.activity-history h2{font-size:20px;line-height:1.4;margin:0}.activity-history p{margin:0;overflow-wrap:anywhere}.history-note,.history-label,.history-totals{font-size:14px;line-height:1.5}.history-note{color:#c9d8c9}.history-totals{display:flex;flex-wrap:wrap;gap:2px 14px;padding:6px 10px;background:#123236;border-left:2px solid #91c4ac;overflow-wrap:anywhere}.history-totals strong{font-size:18px}.history-stop{flex-basis:100%;color:#ebd7a6}.history-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-content:start}.history-grid article{min-width:0;padding:8px 12px;background:#123236;border-left:2px solid #91c4ac;overflow-wrap:anywhere}.history-grid h3{font-size:18px;line-height:1.5;margin:0 0 4px;color:#dce8be}.history-grid p+p{margin-top:4px}.history-label{color:#b9cdbd}.history-error{padding:10px;background:#273538;border-left:2px solid #d9bd7b}.activity-history button,.activity-history :deep(button){min-width:96px;min-height:44px;font-size:18px}.activity-history :deep(.catalogue-pager){margin-top:auto;flex:none}
</style>
