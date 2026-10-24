<script setup lang="ts">
import {computed,ref,watch,onDeactivated,inject} from 'vue';
import type {Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import type {CollectionTarget} from '../../src/full/goals.ts';
import {previewActivity,type SourcePlan,type Activity} from '../../src/full/activity.ts';
import {previewAction} from '../../src/full/queries.ts';
import {pageSlice} from './play-flow';
import SourceField from './SourceField.vue';
import type {useGame} from './store';
const props=defineProps<{game:Game;busy:boolean;available:boolean;running:boolean;highlight:string;collection:CollectionTarget|null;savedPlan:SourcePlan|null;activity?:Activity|null;runtime?:{id:string;generation:number;remainingMs:number;totalMs:number;phase:string}|null}>();
const emit=defineEmits<{start:[SourcePlan];locations:[];home:[]}>();
const scene=inject<ReturnType<typeof useGame>>('game-scene');
const rows=computed(()=>Object.entries(C.sources).filter(([,s])=>s.location===props.game.core.world.location));
const selectedId=ref(''),page=ref(0),cycles=ref<number|'target'>(5),targetId=ref(''),targetQuantity=ref(1),targetCycleLimit=ref(50),monthBudget=ref(5),reserve=ref(1);
const source=computed(()=>C.sources[selectedId.value]);
const selected=computed(()=>rows.value.find(([id])=>id===selectedId.value));
const paged=computed(()=>pageSlice(rows.value,page.value,4));
const resources=computed(()=>source.value?[...Object.keys(source.value.items),...(source.value.stones?['stones']:[])]:[]);
const target=computed<CollectionTarget|null>(()=>cycles.value!=='target'?null:targetId.value==='stones'?{kind:'stones',quantity:targetQuantity.value}:{kind:'item',id:targetId.value,quantity:targetQuantity.value});
const plan=computed<SourcePlan>(()=>({kind:'source',sourceId:selectedId.value,maxCycles:cycles.value==='target'?targetCycleLimit.value:cycles.value,until:cycles.value==='target'?'target':'cycles',target:target.value,monthBudget:monthBudget.value,remainingMonthsReserve:reserve.value}));
const quote=computed(()=>source.value?previewActivity(props.game,plan.value):null);
const stock=(id:string)=>id==='stones'?props.game.core.player.stones:props.game.core.inventory[id];
const resourceName=(id:string)=>id==='stones'?'灵石':C.items[id].name;
function select(id:string){if(id===selectedId.value)return;selectedId.value=id;targetId.value=resources.value[0]??'';targetCycleLimit.value=50;cycles.value=5;monthBudget.value=5*source.value.months;targetQuantity.value=stock(targetId.value)+(source.value.items[targetId.value]??source.value.stones)*5;applyCollection();loadSaved();}
function applyCollection(){const c=props.collection;if(!c||!source.value)return;const id=c.kind==='stones'?'stones':c.id;if(!resources.value.includes(id))return;cycles.value='target';targetId.value=id;targetQuantity.value=c.quantity;monthBudget.value=50*source.value.months;}
function locate(){if(!rows.value.length){selectedId.value='';page.value=0;return;}const id=props.highlight.startsWith('source-')?props.highlight.slice(7):'';const index=rows.value.findIndex(([key])=>key===id);if(index>=0){page.value=Math.floor(index/4);select(id);}else if(!selected.value&&rows.value.length){page.value=0;select(rows.value[0][0]);}}
watch([()=>props.game.core.runId,()=>props.game.core.world.location,()=>props.highlight],(now,before)=>{if(now[0]!==before?.[0]||now[1]!==before?.[1]){selectedId.value='';reserve.value=1;}locate();},{immediate:true});
watch(()=>props.collection,applyCollection);
function updateCycleBudget(){if(source.value)monthBudget.value=(cycles.value==='target'?targetCycleLimit.value:cycles.value)*source.value.months;}
function loadSaved(){const p=props.savedPlan;if(!p||p.sourceId!==selectedId.value)return;cycles.value=p.until==='target'?'target':p.maxCycles;targetCycleLimit.value=p.maxCycles;targetId.value=p.target?.kind==='item'?p.target.id:p.target?'stones':resources.value[0]??'';targetQuantity.value=p.target?.quantity??targetQuantity.value;monthBudget.value=p.monthBudget;reserve.value=p.remainingMonthsReserve;}
watch(()=>props.savedPlan,loadSaved,{immediate:true});
const settings=ref<HTMLDialogElement>();onDeactivated(()=>settings.value?.close());
const perCycle=computed(()=>source.value?previewAction(props.game,{type:'SOURCE',sourceId:selectedId.value,count:1}):null);
</script>
<template>
 <section class="source-planner source-object-planner" data-testid="source-planner" aria-label="取材与委托安排">
  <SourceField :game="game" :plan="plan" :rows="paged.rows" :catalogue="paged" :available="available" @select="select" @page="page=$event" @locations="emit('locations')" @home="emit('home')">
   <template #arrangement><div v-if="source" class="source-arrangement" data-testid="source-arrangement">
    <button class="source-plan-summary" data-testid="source-plan-open" @click="settings?.showModal()"><span data-testid="source-plan-summary">{{running?'下次安排草案 · ':''}}{{cycles==='target'?resourceName(targetId)+'库存达到 '+targetQuantity+' 即停 · 最多 '+targetCycleLimit+' 轮':cycles+' 轮后停'}} · 调整安排</span><small>累计上限 {{monthBudget}} 游戏月 · 余寿至少保留 {{reserve}} 月</small><small v-if="running">当前执行以已保存活动条为准</small></button>

    <div class="source-estimate" data-testid="source-estimate"><span>预计 {{quote?.cycles??0}} 轮 · {{quote?.months??0}} 游戏月 · {{Object.entries(quote?.items??{}).map(([id,n])=>C.items[id].name+' +'+n).concat(quote?.earnedStones?'灵石 +'+quote.earnedStones:[]).join(' · ')||'暂无产出'}}</span><small>{{quote?.failure?'暂不可安排：'+quote.failure.message:quote?.stopReason?'预计停止：'+quote.stopReason.message:''}}<template v-if="cycles==='target'"> · 按完整一轮结算，产出可能略超目标。</template></small></div>
    <button class="primary source-start" data-testid="source-start" :disabled="!available||busy||running||scene?.unresolved||!quote?.allowed" @click="emit('start',plan)">{{running?'已有活动进行中，请先暂停':(savedPlan?'重新安排':'安排')+source.name}}</button><small class="source-rule">{{scene?.unresolved?scene.syncIssue?'进度同步待核对，请先重新读取。':'存档待核对，请在活动条重试。':scene?.error?'上次操作未完成，可另行安排。':'在线逐轮保存；刷新后主动继续，不补离线。'}}{{!quote?.allowed?perCycle?.failure?.message:''}}</small>
   </div></template>
  </SourceField>
  <dialog v-if="source" ref="settings" class="source-settings-dialog" data-testid="source-plan-dialog" aria-labelledby="source-plan-title"><h3 id="source-plan-title">{{source?.name}} · {{running?'下次安排草案':'本段安排'}}</h3><p>这里只调整待确认草案。关闭会保留选择；另行点击开始后才保存并执行。</p>
    <div class="source-intent"><label>安排 <select v-model="cycles" @change="updateCycleBudget" aria-label="取材次数"><option v-for="n in [1,5,20,50]" :key="n" :value="n">{{n}} 轮后停</option><option v-if="cycles!=='target'&&![1,5,20,50].includes(cycles)" :value="cycles">{{cycles}} 轮后停</option><option value="target">库存达到目标即停</option></select></label><template v-if="cycles==='target'"><select v-model="targetId" aria-label="目标资源"><option v-for="id in resources" :key="id" :value="id">{{resourceName(id)}}</option></select><label>目标库存 <input v-model.number="targetQuantity" type="number" min="1" :max="C.maxQuantity" aria-label="目标库存"></label><label>最多 <input v-model.number="targetCycleLimit" type="number" min="1" max="50" aria-label="目标最多轮数">轮</label></template></div>
    <details class="source-limits"><summary>行程限额 · 最多 {{monthBudget}} 游戏月 · 余寿保留 {{reserve}} 月</summary><label>累计游戏月预算 <input v-model.number="monthBudget" type="number" min="1" aria-label="累计游戏月预算"></label><label>余寿至少保留 <input v-model.number="reserve" type="number" min="1" aria-label="余寿保留量"></label></details>
<footer><button data-testid="source-plan-close" @click="settings?.close()">完成调整 · 返回资源点</button></footer></dialog>
 </section>
</template>
