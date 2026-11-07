<script setup lang="ts">
import {computed,inject,ref,watch,onDeactivated,onScopeDispose} from 'vue';
import type {Game} from '../../src/full/types';
import type {ForgePlan} from '../../src/full/activity';
import {previewActivity} from '../../src/full/activity';
import {pausedPlanView} from './preparation-view.ts';
import {getCurrencySources,previewAction,type ItemSource} from '../../src/full/queries';
import {canonicalFingerprint as proof} from '../../src/full/receipts';
import * as C from '../../src/full/content';
import {useEquipmentCycle,useConfigurationEcho} from './equipment-effects';
import {gameFocusKey} from './focus';
import type {NavigationRequest} from './navigation';
import {pageSlice} from './play-flow';
import {formatCosts} from './presentation';
import AssetImage from './AssetImage.vue';
import RelicInscription from './RelicInscription.vue';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{game:Game;plan:ForgePlan;savedPlan:ForgePlan|null;rows:{id:string;name:string;icon:string;min:C.RealmId}[];catalogue:{page:number;pages:number;total:number};future:boolean;busy:boolean;available:boolean;running:boolean;consumptionWarning:string}>();
const emit=defineEmits<{select:[string];page:[number];future:[boolean];material:[string];limits:[];start:[];travel:[];equip:[];navigate:[NavigationRequest]}>();
const focus=inject(gameFocusKey),library=ref<HTMLDialogElement>(),preparation=ref<HTMLDialogElement>(),funding=ref(false),sourcePage=ref(0);
const relic=computed(()=>props.rows.some(r=>r.id===props.plan.relicId)?C.relics[props.plan.relicId]:null);
const visual=computed(()=>relic.value?props.plan.relicId:'frost_sword');
const owned=computed(()=>!!relic.value&&props.game.ownedRelics.includes(props.plan.relicId));
const bound=computed(()=>owned.value&&props.game.loadout.relic===props.plan.relicId);
const {store,activity,runtime,progress,phase,engaged,effect}=useEquipmentCycle('forge',()=>props.plan.relicId);
const {effect:configuration}=useConfigurationEcho(()=>props.game.core.runId+':relic:'+props.plan.relicId);
const boundEcho=computed(()=>{const c=configuration.value;return c?.result.type==='EQUIP_RELIC'&&c.slots.includes('relic')&&props.game.loadout.relic===props.plan.relicId?c:null;});
const state=computed(()=>!props.available||store?.error?'failed':store?.activityPausing&&activity.value?'pausing':engaged.value?phase.value==='saving'?'saving':phase.value==='running'?progress.value<.2?'preparing':progress.value<.8?'engraving':'forming':'idle':activity.value?.status==='paused'?'paused':'idle');
const restart=computed(()=>pausedPlanView(store?.activity,props.game.core.runId,props.plan));
const working=computed(()=>engaged.value&&phase.value==='running'&&props.available&&!store?.error&&!store?.activityPausing);
const status=computed(()=>({failed:store?.syncIssue?'进度待核对':'查看上方提示',pausing:'正在停手，保存后暂停',saving:'封存器纹 · 保存后炼成',paused:'此段已暂停 · 器谱保留',preparing:'备胚',engraving:'淬炼器纹',forming:'器物成形',idle:owned.value?'器纹已凝':activity.value?.status==='stopped'?'安排已停止':'待铸造'})[state.value]);
const quote=computed(()=>relic.value?previewActivity(props.game,props.plan):null);
const equipment=computed(()=>owned.value?previewAction(props.game,{type:'EQUIP_RELIC',relic:props.plan.relicId}):null);
const atCave=computed(()=>props.game.core.world.location==='cave');
const travel=computed(()=>!atCave.value?previewAction(props.game,{type:'TRAVEL',location:'cave'}):null);
const conflict=computed(()=>store?.unresolved?'请先处理上方存档提示':!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'已有活动进行中，请先暂停':'');
const reason=computed(()=>conflict.value||((atCave.value?quote.value?.failure?.message:travel.value?.failure?.message)??''));
const currentRelic=computed(()=>props.game.loadout.relic?C.relics[props.game.loadout.relic]:null);
const materials=computed(()=>Object.entries(relic.value?.inputs??{}).map(([id,cost])=>({id,cost,reserve:props.plan.itemReserves[id]??0,have:props.game.core.inventory[id],required:cost+(props.plan.itemReserves[id]??0)})));
const stones=computed(()=>(relic.value?.stones??0)+props.plan.stoneReserve);
const missing=computed(()=>!!relic.value&&(materials.value.some(r=>r.have<r.required)||props.game.core.player.stones<stones.value));
const limitsShort=computed(()=>!!relic.value&&(props.plan.stoneBudget<relic.value.stones||props.plan.monthBudget<C.actionDurations.forge));
const realmReady=computed(()=>C.rank(props.game.core.player.realm)>=C.rank('golden'));
const sameSaved=computed(()=>!!props.savedPlan&&proof(props.savedPlan)===proof(props.plan));
const routes=computed(()=>pageSlice(getCurrencySources(props.game),sourcePage.value,2));
const fundingTargetValid=computed(()=>Number.isSafeInteger(stones.value)&&stones.value>=1&&stones.value<=C.maxQuantity);
const path=(id:string)=>'art/v2/equipment/'+id+'-v1.webp';
function close(){library.value?.close();preparation.value?.close();}
function open(dialog:HTMLDialogElement|undefined,event:Event){close();if(focus)focus.open(dialog,event.currentTarget as HTMLElement);else dialog?.showModal();}
function browse(event:Event){if(!relic.value)emit('future',true);open(library.value,event);}
function prepare(event:Event){funding.value=false;open(preparation.value,event);}
function select(id:string){close();emit('select',id);}
function limits(){close();emit('limits');}
function material(id:string){close();emit('material',id);}
function canGo(source:ItemSource){return props.available&&!props.busy&&fundingTargetValid.value&&(!source.navigation||!store?.unresolved&&!props.running&&previewAction(props.game,source.navigation).allowed);}
function go(source:ItemSource){if(!canGo(source))return;close();emit('navigate',{location:source.location,tab:'历练',focusId:'source-'+source.id,collection:{kind:'stones',quantity:stones.value}});}
function start(){close();if(atCave.value)emit('start');else emit('travel');}
watch([()=>props.game.core.runId,()=>props.plan.relicId],(now,before)=>{if(now[0]!==before[0]||!library.value?.open)close();},{flush:'sync'});
onDeactivated(close);onScopeDispose(()=>{focus?.release(library.value);focus?.release(preparation.value);});
</script>
<template>
 <div class="relic-atelier art10-relic-stage" data-testid="relic-atelier" :data-state="state" :data-working="working" :data-relic="plan.relicId" :data-owned="owned" :data-bound="bound">
  <AssetImage class="study-sanctum relic-sanctum" path="art/v2/workshops/relic-v1.webp" asset-id="relic-workshop" eager aria-hidden="true"><span class="study-sanctum-fallback"/></AssetImage>
  <header class="relic-heading" :class="{'relic-locked':!relic}" :data-testid="!relic?'forge-locked':undefined"><small v-if="relic">择器只查看 · 炼成后另行比较认主</small><button data-testid="relic-library-open" @click="browse($event)"><AssetImage v-if="!relic" :path="path(visual)" asset-id="relic-future-silhouette" fit="contain" eager><GameIcon kind="relic" id="frost_sword"/></AssetImage><span>{{relic?'翻看器架 · 全部器谱':'翻阅四器图谱 ›'}}</span></button><div v-if="!relic"><h3>器谱待启 · 尚未炼成</h3><p>当前境界：{{C.realms[game.core.player.realm].name}}</p><p>金丹后可在洞府炼器；先翻看四件器谱，核对作用与材料。</p><small>图谱只作参考；翻阅不消耗物资，不安排铸造。</small></div></header>
  <template v-if="relic">
   <div class="relic-object-stage">
    <div class="relic-object" data-testid="production-relic-object"><RelicInscription :relic-id="plan.relicId" :state="state" :progress="progress" :owned="owned" :bound="bound" :sequence="effect?.sequence??0" :saved="!!effect" @inspect="limits"><template #artifact><AssetImage :path="path(visual)" :asset-id="'relic-selected-'+visual" fit="contain" eager><GameIcon kind="relic" :id="visual"/></AssetImage></template></RelicInscription><div class="relic-material-slots" aria-label="所选器物材料位"><button v-for="row in materials" :key="row.id" :data-testid="'relic-material-slot-'+row.id" @click="material(row.id)"><GameIcon kind="item" :id="row.id"/><strong>{{C.items[row.id].name}}</strong><small>持有 {{row.have}} / 需有 {{row.required}}<br>保留 {{row.reserve}} · 缺 {{Math.max(0,row.required-row.have)}}</small></button></div><strong data-testid="production-relic-state" style="white-space:pre-line">{{owned?bound?'已装备为本命':'已炼成\n尚未装备':'器谱冷胚示意\n尚未炼成'}}</strong><div class="relic-result-space"><span v-if="effect" class="relic-result" data-testid="relic-result" :data-sequence="effect.sequence" role="status">炼成 · {{relic.name}} · 已保存</span><span v-else-if="boundEcho" class="configuration-arrival" data-testid="configuration-arrival" :data-sequence="boundEcho.sequence" role="status">本命已定 · {{currentRelic?.name}} · 已保存</span></div></div>
    <section class="relic-description production-object"><h3>{{relic.name}}</h3><p>{{relic.description}}</p><strong class="relic-cycle" data-testid="production-fire">{{status}}</strong><span v-if="engaged&&runtime" data-testid="relic-local-countdown">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span><small v-else-if="activity?.status==='running'&&!store?.activityPausing&&!store?.error">等待本页主动续接，不补离线</small><p class="production-unit">每件 {{relic.stones}} 灵石 · {{C.actionDurations.forge}} 游戏月 · {{C.actionDurations.forge*30}} 秒 · 只铸造1件</p><div class="relic-bond-reference production-relic-slot"><small>实际本命</small><strong>{{bound?'当前本命即此器':currentRelic?.name??'尚未装备'}}</strong><p v-if="!bound">{{currentRelic?.description??'铸成只获得器物，不自动认主。'}}</p></div></section>
   </div>
   <footer class="relic-authorization"><div><strong>{{restart.same?restart.summary+' 件 · 原累计预算沿用':sameSaved?'原已保存安排 · 修改后须重新确认':owned?'器谱安排参考 · 此器已炼成':running?'下次铸器草案 · 当前活动未改变':'待确认安排 · 开始才执行'}} · 只铸造1件</strong><span>上限 {{plan.stoneBudget}} 灵石 / {{plan.monthBudget}} 月 · 保留 {{plan.stoneReserve}} 灵石 / 余寿 {{plan.remainingMonthsReserve}} 月</span></div><div class="relic-action">
    <button :class="{primary:!owned&&realmReady&&missing}" data-testid="relic-preparation-open" @click="prepare">{{owned?'器谱材料与来源':missing?'筹备此器材料':'材料与来源'}}</button>
    <button class="production-budget" :class="{primary:!owned&&realmReady&&!missing&&limitsShort}" data-testid="production-limits" @click="limits">{{!owned&&limitsShort?'核对完整限额':'完整铸器安排'}}</button>
    <button v-if="owned&&!bound" class="primary" :data-testid="'equip-relic-'+plan.relicId" :disabled="!!conflict||!equipment?.allowed" @click="emit('equip')">与本命比较 · 确认后认主</button><button v-else-if="owned||!realmReady" class="primary" data-testid="relic-library-browse" @click="open(library,$event)">换看其他器谱</button>
    <button v-else-if="!missing&&!limitsShort" class="primary production-start" :data-testid="atCave?'production-start':'production-return-cave'" :disabled="!!conflict||restart.same||(atCave?!quote?.allowed:!travel?.allowed)" @click="start">{{conflict?'当前暂不可安排':restart.same?restart.label:restart.label+(atCave?'安排铸造'+relic.name:'前往洞府 · 不自动启炉')}}</button>
    <small :data-testid="owned?'production-equip-reason':undefined">{{conflict||(owned?equipment?.failure?.message:reason)||'材料、预算与保留量按本段安排核对；不会自动采购或取材。'}}</small></div></footer>
  </template>
  <dialog ref="library" class="relic-library-dialog art10-object-dialog" data-testid="relic-library-dialog" aria-labelledby="relic-library-title"><header><h3 id="relic-library-title" tabindex="-1" data-dialog-initial>器架 · 择器只查看</h3><button data-testid="relic-library-close" @click="close">回到所选器物</button></header><label><input :checked="future" @change="emit('future',($event.target as HTMLInputElement).checked)" type="checkbox" aria-label="显示后续生产目录"> 后续境界</label><nav class="relic-rack production-choices" aria-label="器物选择"><button v-for="row in rows" :key="row.id" :data-testid="'forge-'+row.id" :data-relic="row.id" :aria-pressed="plan.relicId===row.id" @click="select(row.id)"><AssetImage :path="path(row.id)" :asset-id="'relic-rack-'+row.id" fit="contain" eager><GameIcon kind="relic" :id="row.id"/></AssetImage><strong>{{row.name}}</strong><small>{{game.loadout.relic===row.id?'当前本命':game.ownedRelics.includes(row.id)?'已炼成':'需'+C.realms[row.min].name}}</small></button></nav><p v-if="!rows.length">金丹后可铸造；勾选后续境界，先查看完整器谱。</p><CataloguePager v-if="catalogue.pages>1" :page="catalogue.page" :pages="catalogue.pages" :total="catalogue.total" label="器谱" @change="emit('page',$event)"/></dialog>
  <dialog ref="preparation" class="relic-preparation-dialog art10-object-dialog" data-testid="relic-preparation-dialog" aria-labelledby="relic-preparation-title"><header><h3 id="relic-preparation-title" tabindex="-1" data-dialog-initial>{{funding?'灵石来源':'筹备'+(relic?.name??'此器')}}</h3><button data-testid="relic-preparation-close" @click="close">回到器物</button></header>
   <template v-if="!funding"><p>核对单件投入及本段保留量；查看来源不取材、不采购。</p><div class="relic-materials production-materials"><button v-for="row in materials" :key="row.id" :data-testid="'production-source-'+row.id" @click="material(row.id)"><GameIcon kind="item" :id="row.id"/><strong>{{C.items[row.id].name}}</strong><span>单件 {{row.cost}} + 保留 {{row.reserve}} = 需有 {{row.required}}</span><small>持有 {{row.have}} · 尚缺 {{Math.max(0,row.required-row.have)}} · 查看完整来源</small></button></div><div class="relic-stone-need" data-testid="relic-stone-need"><strong>灵石</strong><span>单件 {{relic?.stones??0}} + 保留 {{plan.stoneReserve}} = 需有 {{stones}}</span><span>持有 {{game.core.player.stones}} · 尚缺 {{Math.max(0,stones-game.core.player.stones)}}</span><button data-testid="relic-currency-sources" @click="funding=true">查看灵石来源</button></div><small>当前授权 {{plan.stoneBudget}} 灵石 / {{plan.monthBudget}} 月；{{consumptionWarning}}</small><button data-testid="relic-preparation-limits" @click="limits">核对完整预算与保留量</button></template>
   <template v-else><button @click="funding=false">← 返回全部材料缺口</button><p>灵石库存目标 {{stones}}，包含本段保留；选择路线不自动执行委托。</p><div class="relic-currency-routes"><article v-for="source in routes.rows" :key="source.id"><strong>{{source.label}}</strong><small>每轮灵石 +{{source.rewardCount}} · {{C.locations[source.location].name}}</small><small>单轮 {{C.sources[source.id].months*30}} 秒<template v-if="source.navigation"> · 行旅6秒</template> · 准备与行动成本：{{formatCosts(source.costs)}}</small><small v-if="source.failure">{{source.failure.message}}</small><button :data-testid="'relic-go-currency-'+source.id" :disabled="!canGo(source)" @click="go(source)">{{source.navigation?'前往'+C.locations[source.location].name+' · 不自动取材':'查看此地来源'}}</button></article></div><CataloguePager :page="routes.page" :pages="routes.pages" :total="routes.total" label="铸器灵石来源" @change="sourcePage=$event"/><small v-if="!fundingTargetValid">目标超出可追踪库存上限，请先核对保留量。</small><small v-else-if="store?.unresolved||running">异地行旅须先处理原安排；此地来源仍可只读核对。</small></template>
  </dialog>
 </div>
</template>
