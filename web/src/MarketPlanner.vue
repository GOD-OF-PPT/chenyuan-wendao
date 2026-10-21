<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {previewActivity,type PreparationPlan,type BuyPlan,type SellPlan} from '../../src/full/activity.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import {pageSlice} from './play-flow';
import CataloguePager from './CataloguePager.vue';
import CatalogueArt from './CatalogueArt.vue';
import GameIcon from './GameIcon.vue';
const props=withDefaults(defineProps<{game:Game;busy:boolean;available:boolean;running:boolean;highlight:string;savedPlan:BuyPlan|SellPlan|null;planSaved?:boolean;embedded?:boolean;consumption:(action:Action)=>string}>(),{planSaved:false});
const emit=defineEmits<{start:[PreparationPlan];act:[Action];track:[TrackingTarget];travel:[PreparationPlan]}>();
const mode=ref<'buy'|'sell'>('buy'),future=ref(false),page=ref(0),selected=ref(''),count=ref(1),until=ref<'cycles'|'target'>('cycles'),target=ref(1),budget=ref(0),reserve=ref(0),itemReserve=ref(0),editedLimits=ref(false);
const rows=computed(()=>Object.entries(C.items).filter(([id,i])=>future.value||C.rank(i.min)<=C.rank(props.game.core.player.realm)||props.game.core.inventory[id]>0));
const paged=computed(()=>pageSlice(rows.value,page.value,4)),item=computed(()=>C.items[selected.value]);
const plan=computed<BuyPlan|SellPlan>(()=>mode.value==='buy'?{kind:'buy',item:selected.value,maxCycles:count.value,until:until.value,targetQuantity:until.value==='target'?target.value:null,stoneBudget:budget.value,stoneReserve:reserve.value}:{kind:'sell',item:selected.value,maxCycles:count.value,itemReserve:itemReserve.value});
const quote=computed(()=>item.value?previewActivity(props.game,plan.value):null);
const sameSaved=computed(()=>{const p=props.savedPlan,d=plan.value;return !!p&&p.kind===d.kind&&p.item===d.item&&p.maxCycles===d.maxCycles&&(p.kind==='buy'&&d.kind==='buy'?p.until===d.until&&p.targetQuantity===d.targetQuantity&&p.stoneBudget===d.stoneBudget&&p.stoneReserve===d.stoneReserve:p.kind==='sell'&&d.kind==='sell'&&p.itemReserve===d.itemReserve);});
const conflict=computed(()=>!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'当前活动进行中，请先暂停后确认交易安排':'');
const move=computed(()=>previewAction(props.game,{type:'TRAVEL',location:'market'}));
const consumptionWarning=computed(()=>mode.value==='sell'&&quote.value?.cycles?props.consumption({type:'SELL',item:selected.value,quantity:quote.value.cycles}):'');
function resetBudget(){if(!editedLimits.value&&item.value){const n=until.value==='target'?Math.min(count.value,Math.max(0,target.value-props.game.core.inventory[selected.value])):count.value;budget.value=item.value.buy*n;}}
function select(id:string){selected.value=id;count.value=1;until.value='cycles';target.value=props.game.core.inventory[id]+1;reserve.value=0;itemReserve.value=0;editedLimits.value=false;resetBudget();}
function locate(){const match=/^(buy|sell)-(.+)$/.exec(props.highlight);if(match&&Object.hasOwn(C.items,match[2])){mode.value=match[1] as 'buy'|'sell';future.value=C.rank(C.items[match[2]].min)>C.rank(props.game.core.player.realm);page.value=Math.max(0,Math.floor(rows.value.findIndex(([id])=>id===match[2])/4));select(match[2]);}else if(rows.value.length&&!rows.value.some(([id])=>id===selected.value)){page.value=0;select(rows.value[0][0]);}}
function restore(){const p=props.savedPlan;if(!p)return;mode.value=p.kind;future.value=C.rank(C.items[p.item].min)>C.rank(props.game.core.player.realm);selected.value=p.item;page.value=Math.max(0,Math.floor(rows.value.findIndex(([id])=>id===p.item)/4));count.value=p.maxCycles;editedLimits.value=true;if(p.kind==='buy'){until.value=p.until;target.value=p.targetQuantity??props.game.core.inventory[p.item]+1;budget.value=p.stoneBudget;reserve.value=p.stoneReserve;}else itemReserve.value=p.itemReserve;}
function selectMode(next:'buy'|'sell'){if(mode.value===next)return;mode.value=next;if(item.value)select(selected.value);}
watch([()=>props.game.core.runId,()=>props.highlight],locate,{immediate:true});watch(()=>props.savedPlan,restore,{immediate:true});
</script>
<template>
 <section class="idle-preparation market-planner" :class="{'paper':!embedded,'play-catalogue':!embedded}" data-testid="market-planner" aria-label="坊市购售安排">
  <header class="preparation-heading"><div><strong>云岚坊市 · {{mode==='buy'?'购入药材与补给':'出售多余物资'}}</strong><small data-testid="preparation-plan-state">{{sameSaved&&planSaved?'已保存安排；修改后须重新确认':'待确认的新安排，确认后才开始'}}</small></div><label><input v-model="future" @change="page=0" type="checkbox" aria-label="显示后续坊市货物">后续境界</label></header>
  <nav class="preparation-inline market-modes" aria-label="坊市购售"><button data-testid="market-mode-buy" :aria-pressed="mode==='buy'" @click="selectMode('buy')">购入</button><button data-testid="market-mode-sell" :aria-pressed="mode==='sell'" @click="selectMode('sell')">售出</button><span>持有灵石 {{game.core.player.stones}}</span></nav>
  <div class="market-shelves"><button v-for="[id,i] in paged.rows" :key="id" :data-testid="(mode==='buy'?'buy-':'sell-')+id" :aria-pressed="selected===id" @click="select(id)"><GameIcon kind="item" :id="id"/><strong>{{i.name}}</strong><span>{{mode==='buy'?'买入 '+i.buy:i.sell===null?'不可出售':'卖出 '+i.sell}} 灵石</span><small>库存 {{game.core.inventory[id]}}</small></button></div>
  <div v-if="item" class="preparation-work market-work">
   <div class="market-object"><div class="preparation-art"><CatalogueArt kind="supplies"/></div><div><h3>{{item.name}}</h3><p>{{item.description}}</p><small>当前 {{game.core.inventory[selected]}} 件 · 需{{C.realms[item.min].name}}{{mode==='sell'?'（出售按正式资格）':''}}</small><button @click="emit('track',{kind:'item',id:selected,quantity:mode==='buy'&&until==='target'?target:Math.max(1,itemReserve)})">查看来源与筹备</button></div></div>
   <div class="preparation-decision market-decision">
    <strong class="market-price">每件 {{mode==='buy'?item.buy:item.sell??'不可出售'}} 灵石 · 15 秒</strong>
    <div class="market-order"><label>本段最多（件）<input v-model.number="count" @change="resetBudget" type="number" min="1" max="50" aria-label="交易最多件数"></label><label v-if="mode==='buy'">停止目标<select v-model="until" @change="resetBudget" aria-label="采购停止目标"><option value="cycles">完成本段件数</option><option value="target">库存达到目标</option></select></label><label v-if="mode==='buy'&&until==='target'">目标库存<input v-model.number="target" @change="resetBudget" type="number" min="1" :max="C.maxQuantity" aria-label="采购目标库存"></label><label v-if="mode==='sell'">至少保留（件）<input v-model.number="itemReserve" type="number" min="0" :max="C.maxQuantity" aria-label="出售库存保留量"></label></div>
    <details v-if="mode==='buy'" class="preparation-limits"><summary>累计灵石上限 {{budget}} · 保留 {{reserve}}</summary><div class="market-limits-fields"><label>累计采购灵石预算<input v-model.number="budget" @input="editedLimits=true" type="number" min="0" aria-label="累计采购灵石预算"></label><label>采购灵石保留量<input v-model.number="reserve" @input="editedLimits=true" type="number" min="0" aria-label="采购灵石保留量"></label></div></details>
    <div class="preparation-estimate" data-testid="preparation-estimate"><strong>预计成交 {{quote?.cycles??0}} 件 · {{mode==='buy'?'灵石消耗 '+(quote?.stones??0):'灵石收入 '+(quote?.earnedStones??0)}}</strong><small>{{mode==='buy'?'逐件入囊，目标为最终库存':'逐件扣除库存，突破物不可出售；药物也受保留量约束'}}</small><small>{{quote?.failure?.message??(quote?.stopReason?'预计停止：'+quote.stopReason.message:'')}}</small><small v-if="consumptionWarning" data-testid="market-consumption">整段出售：{{consumptionWarning}}</small></div>
    <button v-if="game.core.world.location!=='market'" class="primary" data-testid="preparation-travel" @click="emit('travel',plan)" :disabled="!!conflict||!move.allowed||mode==='sell'&&item.sell===null">前往云岚坊市 · 不自动成交</button><button v-else class="primary" data-testid="preparation-start" @click="emit('start',plan)" :disabled="!!conflict||!quote?.allowed">{{running?'当前活动进行中，请先暂停':mode==='buy'?'安排购入'+item.name:'安排售出'+item.name}}</button><small class="preparation-reason">{{conflict||'限于本段安排；不自动补货、换物或旅行。'}}</small>
   </div>
  </div>
  <CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="坊市货物" @change="page=$event"/>
 </section>
</template>
