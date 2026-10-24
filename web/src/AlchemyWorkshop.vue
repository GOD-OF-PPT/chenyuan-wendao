<script setup lang="ts">
import {computed,ref,watch,onActivated,onDeactivated} from 'vue';
import type {Game} from '../../src/full/types';
import {previewActivity,type Activity,type CraftPlan} from '../../src/full/activity';
import * as C from '../../src/full/content';
import {useActivityPresentation} from './use-activity-effect';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{game:Game;plan:CraftPlan;activity:Activity|null;runtime:{id:string;generation:number;totalMs:number;remainingMs:number;phase:string}|null;busy:boolean;available:boolean;running:boolean;rows:{id:string;name:string;icon:string;min:C.RealmId}[];catalogue:{page:number;pages:number;total:number};future:boolean;consumptionWarning:string}>();
const emit=defineEmits<{start:[];travel:[];source:[];limits:[boolean];select:[string];page:[number];future:[boolean];material:[string]}>();
const settingsOpen=ref(false),settings=ref<HTMLDialogElement>(),visible=ref(true);
const recipe=computed(()=>C.recipes[props.plan.recipeId]),item=computed(()=>recipe.value&&C.items[recipe.value.output]);
const {store:feedbackStore,activity:current,runtime,effect}=useActivityPresentation(a=>a.version===3&&a.plan.recipeId===props.plan.recipeId,()=>props.game.core.runId+':'+props.plan.recipeId);
const arrival=computed(()=>{const e=effect.value,quantity=e?.result.delta.inventory[recipe.value.output]??0;return e?.notice.family==='craft'&&quantity>0?{item:recipe.value.output,quantity,sequence:e.sequence}:null;});
const state=computed(()=>!props.available||feedbackStore?.error?'failed':feedbackStore?.activityPausing&&current.value?'pausing':runtime.value?runtime.value.phase==='saving'?'saving':runtime.value.remainingMs>runtime.value.totalMs*.8?'heating':runtime.value.remainingMs>runtime.value.totalMs*.2?'refining':'coalescing':current.value?.status==='paused'?'paused':'idle');
const burning=computed(()=>['heating','refining','coalescing'].includes(state.value));
const status=computed(()=>({failed:!props.available||feedbackStore?.syncIssue?'存档待核对 · 炉火已歇':feedbackStore?.unresolved?'当前活动保存未确认 · 请在活动条重试':'上次操作未完成 · 可另行安排',saving:'封存成果 · 保存后入匣',paused:'炉火暂歇',pausing:'正在停手，保存后暂停',heating:'温炉',refining:'炼化药性',coalescing:'凝丹',idle:current.value?.status==='stopped'?current.value.completedCycles?'成果已保存':'安排已停止':'待启炉'})[state.value]);
const atCave=computed(()=>props.game.core.world.location==='cave');
const buttonLabel=computed(()=>!atCave.value?'前往洞府 · 不自动启炉':props.running?current.value?'炼制中 · 可在活动条暂停':'已有活动 · 请先暂停':'开炉 · '+recipe.value.name);
const quote=computed(()=>previewActivity(props.game,props.plan));
const finite=computed(()=>props.plan.until==='target'?'成品库存达到 '+props.plan.targetQuantity+' 即停 · 最多 '+props.plan.maxCycles+' 炉':props.plan.maxCycles+' 炉后停');
const total=computed(()=>current.value?.version===3?current.value.gainedItems[recipe.value.output]??0:0);
const blocked=computed(()=>!props.available||props.busy||props.running||feedbackStore?.unresolved);
const reason=computed(()=>!props.available?'存档未就绪':feedbackStore?.unresolved?feedbackStore.syncIssue?'请先重新读取当前进度':'当前活动保存未确认，请重试或取消原安排':props.busy?'正在保存，请稍候':props.running?'已有活动进行中，请先暂停':quote.value.failure?.message??'');
function close(){settings.value?.close();settingsOpen.value=false;}
function open(){if(!visible.value)return;settingsOpen.value=true;settings.value?.showModal();}
function start(){close();if(props.game.core.world.location==='cave')emit('start');else emit('travel');}
const costText=(items:Record<string,number>)=>Object.entries(items).map(([id,n])=>C.items[id].name+' ×'+n).join(' · ');
function limits(){const back=settingsOpen.value;close();emit('limits',back);}
defineExpose({open});
watch([()=>props.game.core.runId,()=>props.plan.recipeId],close,{flush:'sync'});
onActivated(()=>visible.value=true);
onDeactivated(()=>{visible.value=false;close();});
</script>
<template>
 <div class="alchemy-workshop" data-testid="alchemy-workshop" :data-state="state">
  <aside class="alchemy-recipe-book"><div class="alchemy-book-title"><h3>丹方册</h3><label class="alchemy-future"><input :checked="future" @change="emit('future',($event.target as HTMLInputElement).checked)" type="checkbox" aria-label="显示后续生产目录"> 后续境界</label></div><nav class="production-choices" aria-label="配方选择"><button v-for="row in rows" :key="row.id" :data-testid="'craft-'+row.id" :aria-pressed="plan.recipeId===row.id" :aria-label="row.name" @click="emit('select',row.id)"><GameIcon kind="item" :id="row.icon"/><strong>{{C.items[row.icon].name}}</strong><small>需{{C.realms[row.min].name}}</small></button></nav><CataloguePager :page="catalogue.page" :pages="catalogue.pages" :total="catalogue.total" label="配方" @change="emit('page',$event)"/></aside>
  <div class="alchemy-scene">
   <div class="alchemy-furnace" data-testid="alchemy-furnace" :data-burning="burning">
    <div class="alchemy-rune" aria-hidden="true"/><AssetImage path="art/v2/workshop/furnace-v1.webp" asset-id="alchemy-cold-furnace" fit="contain" eager><span class="alchemy-art-fallback">听雨丹炉</span></AssetImage>
    <div class="alchemy-flame" aria-hidden="true"><i/><i/><i/></div><div class="alchemy-smoke" aria-hidden="true"><i/><i/><i/></div>
    <div v-if="arrival" class="alchemy-arrival" data-testid="alchemy-arrival" :data-sequence="arrival.sequence" aria-hidden="true"><GameIcon kind="item" :id="arrival.item"/><b>+{{arrival.quantity}}</b></div>
   </div>
   <div class="alchemy-cycle"><strong data-testid="production-fire">{{status}}</strong><span v-if="runtime">{{Math.ceil(runtime.remainingMs/1000)}} 秒 / {{runtime.totalMs/1000}} 秒</span><span v-else-if="current?.status==='running'&&!feedbackStore?.activityPausing">等待主动续接，不补离线</span><span v-else>每炉 {{recipe.months*30}} 秒 · {{recipe.months}} 游戏月</span></div>
   <button class="primary production-start" :data-testid="settingsOpen?undefined:atCave?'production-start':'production-return-cave'" :disabled="blocked||atCave&&!quote.allowed" @click="start">{{buttonLabel}}</button>
   <div class="alchemy-materials"><small>药匣 · 每炉自动取用，不必逐炉投药</small><div class="production-materials" aria-label="单炉材料药匣"><button v-for="(n,id) in recipe.inputs" :key="id" :data-testid="'production-source-'+id" @click="emit('material',String(id))"><GameIcon kind="item" :id="String(id)"/><strong>{{C.items[id].name}}</strong><span>每炉 {{n}} · 持有 {{game.core.inventory[id]}}</span><small>保留 {{plan.itemReserves[id]??0}} · {{game.core.inventory[id] < n+(plan.itemReserves[id]??0)?'缺 '+(n+(plan.itemReserves[id]??0)-game.core.inventory[id])+' · ':''}}<span style="white-space:nowrap">查看来源 ›</span></small></button></div></div>
  </div>
  <aside class="alchemy-product-tray" data-testid="alchemy-product-tray"><h3>{{recipe.name}}</h3><p>{{item.description}}</p><div class="alchemy-pill-rest"><GameIcon kind="item" :id="recipe.output"/><strong data-testid="alchemy-product-stock">持有 {{game.core.inventory[recipe.output]}} 枚</strong><span data-testid="alchemy-product-total">本段已保存 {{total}} 枚</span></div><small>每炉 {{recipe.stones}} 灵石 · 固定 1 枚</small><button data-testid="alchemy-product-source" :aria-label="item.name+'来源与坊市替代'" @click="emit('source')">来源与坊市替代 ›</button><p v-if="arrival" class="alchemy-saved" role="status">丹成入匣 · 实际 +{{arrival.quantity}}，已保存</p><small v-else>成品自动入匣，无需领取</small></aside>
  <footer class="alchemy-authorization"><div><strong><small>{{current?.status==='running'?'下次开炉草案 · 当前活动未改变':'待确认安排 · 开炉才执行'}}</small> · {{finite}}</strong><span>投入上限 {{plan.stoneBudget}} 灵石 / {{plan.monthBudget}} 月 · 新安排预计可炼 {{quote.cycles}} 炉</span><small>保留 {{plan.stoneReserve}} 灵石 / 余寿 {{plan.remainingMonthsReserve}} 月 · {{reason||current?.stopReason?.message||'材料不足、达到目标或触及保留量时自动停炉'}}</small></div><div class="alchemy-arrange-buttons"><button data-testid="alchemy-settings-open" @click="open">调整炉次与完整预估</button><button class="production-budget" :data-testid="settingsOpen?undefined:'production-limits'" @click="limits">预算与保留量</button></div></footer>
  <dialog @close="settingsOpen=false" ref="settings" class="alchemy-settings" data-testid="alchemy-settings" aria-labelledby="alchemy-settings-title"><header><h3 id="alchemy-settings-title">这段炼丹 · 安排与完整预估</h3><button data-testid="alchemy-settings-close" @click="close">返回丹炉</button></header><p>只调整待确认安排，开炉后才执行。在线逐炉保存，刷新后主动继续；不自动采购、取材或突破。</p><slot name="settings"/><div class="production-estimate" data-testid="production-estimate"><strong>预计 {{quote.cycles}} 炉 · 灵石消耗 {{quote.stones}} · {{quote.months}} 游戏月</strong><small>耗材：{{costText(quote.spentItems)||'暂无'}}；成品 {{costText(quote.items)||'暂无'}}</small><small v-if="consumptionWarning" data-testid="production-consumption">单炉：{{consumptionWarning}}</small><small>{{quote.failure?'暂不可安排：'+quote.failure.message:quote.stopReason?'预计停止：'+quote.stopReason.message:''}}</small></div><footer><button @click="close">保留草案 · 返回丹炉</button><button :data-testid="settingsOpen?'production-limits':undefined" @click="limits">调整完整预算与保留量</button><button v-if="settingsOpen" class="primary" :data-testid="atCave?'production-start':'production-return-cave'" :disabled="blocked||atCave&&!quote.allowed" @click="start">{{buttonLabel}}</button></footer></dialog>
 </div>
</template>
