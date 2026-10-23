<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import type {ForgePlan} from '../../src/full/activity';
import {previewActivity} from '../../src/full/activity';
import {previewAction} from '../../src/full/queries';
import * as C from '../../src/full/content';
import {useEquipmentCycle,useConfigurationEcho} from './equipment-effects';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{game:Game;plan:ForgePlan;rows:{id:string;name:string;icon:string;min:C.RealmId}[];catalogue:{page:number;pages:number;total:number};future:boolean;busy:boolean;available:boolean;running:boolean;consumptionWarning:string}>();
const emit=defineEmits<{select:[string];page:[number];future:[boolean];material:[string];limits:[];start:[];travel:[];equip:[]}>();
const relic=computed(()=>props.rows.some(r=>r.id===props.plan.relicId)?C.relics[props.plan.relicId]:null);
const visual=computed(()=>relic.value?props.plan.relicId:'frost_sword');
const owned=computed(()=>!!relic.value&&props.game.ownedRelics.includes(props.plan.relicId));
const bound=computed(()=>owned.value&&props.game.loadout.relic===props.plan.relicId);
const {store,activity,runtime,progress,phase,engaged,effect}=useEquipmentCycle('forge',()=>props.plan.relicId);
const {effect:configuration}=useConfigurationEcho(()=>props.game.core.runId+':relic:'+props.plan.relicId);
const boundEcho=computed(()=>{const c=configuration.value;return c?.result.type==='EQUIP_RELIC'&&c.slots.includes('relic')&&props.game.loadout.relic===props.plan.relicId?c:null;});
const state=computed(()=>!props.available||store?.error?'failed':store?.activityPausing&&activity.value?'pausing':engaged.value?phase.value==='saving'?'saving':phase.value==='running'?progress.value<.2?'preparing':progress.value<.8?'engraving':'forming':'idle':activity.value?.status==='paused'?'paused':'idle');
const working=computed(()=>engaged.value&&phase.value==='running'&&props.available&&!store?.error&&!store?.activityPausing);
const status=computed(()=>({failed:store?.syncIssue?'同步待核对 · 器纹已歇':'保存待核对 · 请查看上方提示',pausing:'正在停手，保存后暂停',saving:'封存器纹 · 保存后炼成',paused:'此段已暂停 · 器谱保留',preparing:'备胚',engraving:'淬炼器纹',forming:'器物成形',idle:owned.value?'器纹已凝':activity.value?.status==='stopped'?'安排已停止':'待铸造'})[state.value]);
const quote=computed(()=>relic.value?previewActivity(props.game,props.plan):null);
const equipment=computed(()=>owned.value?previewAction(props.game,{type:'EQUIP_RELIC',relic:props.plan.relicId}):null);
const atCave=computed(()=>props.game.core.world.location==='cave');
const travel=computed(()=>!atCave.value?previewAction(props.game,{type:'TRAVEL',location:'cave'}):null);
const conflict=computed(()=>store?.error&&(store.canRetry||store.syncIssue)?'存档待核对，请先核对并重试原操作':!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'已有活动进行中，请先暂停':'');
const reason=computed(()=>conflict.value||((atCave.value?quote.value?.failure?.message:travel.value?.failure?.message)??''));
const equipReason=computed(()=>conflict.value||(equipment.value?.failure?.message??''));
const currentRelic=computed(()=>props.game.loadout.relic?C.relics[props.game.loadout.relic]:null);
const costText=(items:Record<string,number>)=>Object.entries(items).map(([id,n])=>C.items[id].name+' ×'+n).join(' · ');
const path=(id:string)=>'art/v2/equipment/'+id+'-v1.webp';
function start(){if(atCave.value)emit('start');else emit('travel');}
</script>
<template>
 <div class="relic-atelier" data-testid="relic-atelier" :data-state="state" :data-working="working" :data-relic="plan.relicId" :data-owned="owned" :data-bound="bound">
  <header class="relic-heading"><small>择器只查看 · 炼成后仍须比较认主</small><label><input :checked="future" @change="emit('future',($event.target as HTMLInputElement).checked)" type="checkbox" aria-label="显示后续生产目录"> 后续境界</label></header>
  <template v-if="!relic"><div class="relic-locked" data-testid="forge-locked"><AssetImage :path="path(visual)" asset-id="relic-future-silhouette" fit="contain" eager><GameIcon kind="relic" id="frost_sword"/></AssetImage><div><small>未来器谱 · 尚未炼成</small><h3>金丹后可在洞府炼器</h3><p>先翻阅四件器谱，核对作用、材料与本命取舍。</p><button @click="emit('future',true)">查看完整目录</button></div></div></template>
  <template v-else>
   <nav class="relic-rack production-choices" aria-label="器物选择"><button v-for="row in rows" :key="row.id" :data-testid="'forge-'+row.id" :data-relic="row.id" :aria-pressed="plan.relicId===row.id" @click="emit('select',row.id)"><AssetImage :path="path(row.id)" :asset-id="'relic-rack-'+row.id" fit="contain" eager><GameIcon kind="relic" :id="row.id"/></AssetImage><strong>{{row.name}}</strong><small>{{game.loadout.relic===row.id?'当前本命':game.ownedRelics.includes(row.id)?'已炼成':'需'+C.realms[row.min].name}}</small></button></nav>
   <CataloguePager :page="catalogue.page" :pages="catalogue.pages" :total="catalogue.total" label="器谱" @change="emit('page',$event)"/>
   <div class="relic-object-stage">
    <div class="relic-object" data-testid="production-relic-object"><div class="relic-inscription" aria-hidden="true" :style="{'--relic-progress':(working?progress:0)*360+'deg'}"/><AssetImage :path="path(visual)" :asset-id="'relic-selected-'+visual" fit="contain" eager><GameIcon kind="relic" :id="visual"/></AssetImage><strong data-testid="production-relic-state">{{owned?bound?'已装备为本命':'已炼成 · 尚未装备':'器谱示意 · 尚未炼成'}}</strong><span v-if="effect" class="relic-result" data-testid="relic-result" :data-sequence="effect.sequence" role="status">炼成 · {{relic.name}} · 已保存</span></div>
    <section class="relic-description production-object"><h3>{{relic.name}}</h3><p>{{relic.description}}</p><strong class="relic-cycle" data-testid="production-fire">{{status}}</strong><span v-if="engaged&&runtime" data-testid="relic-local-countdown">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span><small v-else-if="activity?.status==='running'&&!store?.activityPausing&&!store?.error">等待本页主动续接，不补离线</small><p class="production-unit">每件 {{relic.stones}} 灵石 · {{C.actionDurations.forge}} 游戏月 · {{C.actionDurations.forge*30}} 秒 · 只铸造1件</p>
     <div class="relic-materials production-materials" aria-label="单炉材料药匣"><button v-for="(n,id) in relic.inputs" :key="id" :data-testid="'production-source-'+id" @click="emit('material',String(id))"><GameIcon kind="item" :id="String(id)"/><strong>{{C.items[id].name}}</strong><span>每件 {{n}} · 持有 {{game.core.inventory[id]}}</span><small>保留 {{plan.itemReserves[id]??0}} · 查看来源 →</small></button></div>
    </section>
    <aside class="relic-current-slot production-relic-slot" :class="{'relic-bound-saved':!!boundEcho}"><small>本命位 · 实际配装</small><AssetImage v-if="game.loadout.relic" :path="path(game.loadout.relic)" :asset-id="'relic-bound-'+game.loadout.relic" fit="contain" eager><GameIcon kind="relic" :id="game.loadout.relic"/></AssetImage><strong>当前本命：{{currentRelic?.name??'尚未装备'}}</strong><p>{{currentRelic?.description??'先炼成所选器物，再比较本命取舍。'}}</p><small>{{owned?'此器已炼成，不再收取铸造费用。':'炼成只获得器物，不会自动替换本命。'}}</small><span v-if="boundEcho" class="configuration-arrival" data-testid="configuration-arrival" :data-sequence="boundEcho.sequence" role="status">本命已定 · {{currentRelic?.name}} · 已保存</span><button v-if="owned" class="primary" :data-testid="'equip-relic-'+plan.relicId" :disabled="!!conflict||!equipment?.allowed" @click="emit('equip')">{{bound?'已装备':'比较后装备此法宝'}}</button><small v-if="owned&&equipReason&&!conflict" data-testid="production-equip-reason">{{equipReason}}</small></aside>
   </div>
   <footer class="relic-authorization"><div><strong>{{owned?'器谱预算参考 · 此器已炼成':(running?'下次铸器草案 · 当前活动未改变':'待确认安排 · 开始才执行')+' · 只铸造1件'}}</strong><span>投入上限 {{plan.stoneBudget}} 灵石 / {{plan.monthBudget}} 月 · 保留 {{plan.stoneReserve}} 灵石 / 余寿 {{plan.remainingMonthsReserve}} 月</span><button class="production-budget" data-testid="production-limits" @click="emit('limits')">调整完整预算与保留量</button></div><div v-if="!owned" class="production-estimate" data-testid="production-estimate"><strong>预计 {{quote?.cycles??0}} 件 · 灵石消耗 {{quote?.stones??0}} · {{quote?.months??0}} 游戏月</strong><small>耗材：{{costText(quote?.spentItems??{})||'暂无'}}；炼成 {{quote?.relics.map(id=>C.relics[id].name).join('、')||'暂无'}}</small><small v-if="consumptionWarning" data-testid="production-consumption">单件：{{consumptionWarning}}</small><small>{{quote?.failure?'暂不可安排：'+quote.failure.message:quote?.stopReason?'预计停止：'+quote.stopReason.message:''}}</small></div><div class="relic-action"><button v-if="owned" disabled data-testid="production-start">已炼成，不重复炼制</button><button v-else class="primary production-start" :data-testid="atCave?'production-start':'production-return-cave'" :disabled="!!conflict||(atCave?!quote?.allowed:!travel?.allowed)" @click="start">{{running?'已有活动进行中，请先暂停':atCave?'安排铸造'+relic.name:'前往洞府 · 不自动启炉'}}</button><small :data-testid="owned&&conflict?'production-equip-reason':undefined">{{reason||'在线逐轮保存；刷新后主动继续，不补离线。不自动采购、取材或突破。'}}</small></div></footer>
  </template>
 </div>
</template>
