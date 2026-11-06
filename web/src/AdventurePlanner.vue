<script setup lang="ts">
import {computed,ref,watch,inject} from 'vue';
import type {useGame} from './store';
import type {Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import type {Activity} from '../../src/full/activity.ts';
import {previewActivity} from '../../src/full/activity.ts';
import {stopMessage} from './activity-view';
import {defaultBattleStrategy,defaultEncounterPlan,type AdventurePlan,type TravelPlan,type EncounterPlan} from '../../src/full/adventure.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import {pageSlice} from './play-flow';
import {SCENE_ASSETS,ENEMY_ASSETS} from './assets';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
import BattleStrategy from './BattleStrategy.vue';
import{medicineSummary}from'./battle-medicine-summary';
import JourneyMap from './JourneyMap.vue';
import JourneyLocalAction from './JourneyLocalAction.vue';
import './idle-adventure.css';
const props=withDefaults(defineProps<{game:Game;mode:'travel'|'encounter';busy:boolean;available:boolean;running:boolean;highlight:string;activity?:Activity|null;savedPlan?:AdventurePlan|null;planSaved?:boolean;embedded?:boolean}>(),{planSaved:false,embedded:false});
const scene=inject<ReturnType<typeof useGame>>('game-scene');
const emit=defineEmits<{start:[AdventurePlan];track:[TrackingTarget];locations:['travel'|'source'|'purchase']}>();
const page=ref(0),section=ref<'object'|'strategy'|'limits'>('object');
const trip=ref<TravelPlan>({kind:'travel',location:props.game.core.world.location,maxCycles:1});
const encounter=ref<EncounterPlan>({kind:'encounter',enemy:'wolf',maxEncounters:1,maxCycles:41,target:null,monthBudget:1,remainingMonthsReserve:1,mpBudget:480,strategy:defaultBattleStrategy(props.game)});
const selected=computed(()=>props.mode==='travel'?trip.value.location:encounter.value.enemy);
const rows=computed(()=>props.mode==='travel'?Object.keys(C.locations):Object.keys(C.enemies).filter(id=>!C.enemies[id].trial&&C.enemies[id].location===props.game.core.world.location));
const paged=computed(()=>pageSlice(rows.value,page.value,4));
const copyEncounter=(p:EncounterPlan):EncounterPlan=>({...p,target:p.target?{...p.target}:null,strategy:{...p.strategy,priority:[...p.strategy.priority]}});
const plan=computed<TravelPlan|EncounterPlan>(()=>props.mode==='travel'?{kind:'travel',location:trip.value.location,maxCycles:1}:copyEncounter(encounter.value));
const quote=computed(()=>rows.value.length?previewActivity(props.game,plan.value):null);
const enemy=computed(()=>props.mode==='encounter'&&rows.value.includes(encounter.value.enemy)?C.enemies[encounter.value.enemy]:null);
const location=computed(()=>props.mode==='travel'?trip.value.location:props.game.core.world.location);
const here=computed(()=>props.mode==='travel'&&trip.value.location===props.game.core.world.location);
const conflict=computed(()=>scene?.unresolved?scene.syncIssue?'存档待核对，请先重新读取':'请先重试或取消原操作':!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'已有活动进行中，请先暂停后确认新安排':'');
const sameSaved=computed(()=>!!props.savedPlan&&JSON.stringify(props.savedPlan)===JSON.stringify(plan.value));
const targetItem=computed({get:()=>encounter.value.target?.item??'',set:(item:string)=>{encounter.value={...encounter.value,target:item?{item,quantity:props.game.core.inventory[item]+1}:null};}});
const strategy=computed({get:()=>encounter.value.strategy,set:(value:EncounterPlan['strategy'])=>{encounter.value={...encounter.value,strategy:{...value,priority:[...value.priority]}};}});
const danger=computed(()=>props.activity?.version===6&&props.activity.status==='paused'&&['ADVENTURE_DANGER','ADVENTURE_RISK'].includes(props.activity.stopReason?.code??'')?props.activity.stopReason?.message:null);
const rewardText=computed(()=>enemy.value?Object.entries(enemy.value.loot).map(([id,n])=>C.items[id].name+' ×'+n).concat('灵石 +'+enemy.value.stones,'修为最多 +'+enemy.value.xp).join(' · '):'');
function select(id:string){if(id===selected.value)return;if(props.mode==='travel'){trip.value.location=id as C.LocationId;return;}encounter.value=defaultEncounterPlan(props.game,id);section.value='object';}
function locate(){const match=/^(travel|encounter)-(.+)$/.exec(props.highlight);if(match&&match[1]===props.mode&&rows.value.includes(match[2])){page.value=Math.max(0,Math.floor(rows.value.indexOf(match[2])/4));select(match[2]);}else if(!rows.value.includes(selected.value)&&rows.value.length){page.value=0;select(rows.value[0]);}}
function restore(){const p=props.savedPlan;if(p?.kind==='travel'&&props.mode==='travel'){trip.value={...p};page.value=Math.max(0,Math.floor(rows.value.indexOf(p.location)/4));}else if(p?.kind==='encounter'&&props.mode==='encounter'){encounter.value=copyEncounter(p);page.value=Math.max(0,Math.floor(rows.value.indexOf(p.enemy)/4));}}
function count(e:Event){encounter.value.maxEncounters=Number((e.target as HTMLInputElement).value);}
function field(key:'maxCycles'|'monthBudget'|'remainingMonthsReserve'|'mpBudget',event:Event){encounter.value={...encounter.value,[key]:Number((event.target as HTMLInputElement).value)};}
function targetQuantity(event:Event){const t=encounter.value.target;if(t)encounter.value={...encounter.value,target:{...t,quantity:Number((event.target as HTMLInputElement).value)}};}
function minRealm(id:string){return props.mode==='travel'?C.realms[C.locations[id as C.LocationId].min].name:C.realms[C.enemies[id].min].name;}
function name(id:string){return props.mode==='travel'?C.locations[id as C.LocationId].name:C.enemies[id].name;}
watch([()=>props.game.core.runId,()=>props.mode,()=>props.game.core.world.location],()=>{section.value='object';locate();restore();});
watch(()=>props.highlight,locate);watch(()=>props.savedPlan,restore);
locate();restore();
</script>
<template>
 <section class="adventure-planner" :class="{'paper':!embedded}" data-testid="adventure-planner" :data-mode="mode" :data-section="section" aria-label="行旅与历练安排">
  <header class="adventure-heading"><div><strong>{{mode==='travel'?(here?'此地 · ':'行旅 · ')+C.locations[trip.location].name:'历练 · '+(enemy?.name??'选择对手')}}</strong><small data-testid="adventure-plan-state">{{sameSaved&&planSaved?'已保存安排；修改后须另行确认':here?'当前所在 · 可查看本地活动或点选异地':'待确认的新安排；选择不会旅行或开战'}}</small></div><nav v-if="mode==='encounter'&&rows.length" aria-label="历练安排分页"><button v-for="[id,label] in [['object','对手与目标'],['strategy','战策'],['limits','目标与限额']] as const" :key="id" :data-testid="'adventure-page-'+id" :aria-pressed="section===id" @click="section=id">{{label}}</button></nav></header>
  <p v-if="danger" class="adventure-danger">战局仍保留：{{danger}}。暂停不是撤退，不扣撤退气血。</p>
  <div v-if="!rows.length" class="adventure-empty"><strong>此地没有普通对手</strong><p>选择可前往的地点，实际抵达后再安排历练。不会自动行路或开战。</p><button data-testid="adventure-locations" @click="emit('locations','travel')">查看可前往的地点</button></div>
  <template v-else>
   <JourneyMap v-if="mode==='travel'" :game="game" :selected="trip.location" @select="select"/>
   <template v-else-if="section==='object'"><nav class="adventure-choices" aria-label="对手选择"><button v-for="id in paged.rows" :key="id" :data-testid="'encounter-'+id" :aria-pressed="selected===id" @click="select(id)"><GameIcon kind="nav" id="cultivate"/><strong>{{name(id)}}</strong><small>需{{minRealm(id)}} · 选择对手</small></button></nav>
   <div class="adventure-object-layout"><div class="adventure-art"><AssetImage class="adventure-scenery" :path="SCENE_ASSETS[location]" asset-id="encounter-environment" eager/><AssetImage v-if="enemy" class="adventure-enemy" :path="ENEMY_ASSETS[encounter.enemy]" :asset-id="'encounter-preview-'+encounter.enemy" fit="contain" eager/><span class="adventure-preview-label">对手预览 · 尚未开战</span></div><div v-if="enemy" class="adventure-object-details"><strong>{{enemy.name}} · 气血 {{enemy.hp}}</strong><small>迎战30秒 · 每回合3秒；普通原始伤害 {{enemy.attack}} · 重击原始伤害 {{enemy.heavy}}。</small><p data-testid="encounter-loot">胜利后：{{rewardText}}</p></div></div><CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="普通对手" @change="page=$event"/></template>
   <BattleStrategy v-else-if="section==='strategy'" v-model="strategy" :game="game" variant="editor"/>
   <div v-else class="adventure-limit-page"><p>下列为本段累计授权。收入与回灵不回补已用预算；扩大授权须再次确认。</p><div><label>历练最多场次<input :value="encounter.maxEncounters" @input="count" type="number" min="1" max="50" aria-label="历练最多场次"></label><label>停止目标<select v-model="targetItem" aria-label="历练掉落目标"><option value="">完成所选场次</option><option v-for="(_,id) in enemy?.loot??{}" :key="id" :value="id">{{C.items[id].name}}库存目标</option></select></label><label v-if="encounter.target">目标库存<input :value="encounter.target.quantity" @input="targetQuantity" aria-label="历练目标库存" type="number" min="1" :max="C.maxQuantity"></label><label>总动作上限<input :value="encounter.maxCycles" @input="field('maxCycles',$event)" type="number" min="1" max="2050" aria-label="历练总动作上限"></label><label>累计游戏月预算<input :value="encounter.monthBudget" @input="field('monthBudget',$event)" type="number" min="1" aria-label="历练游戏月预算"></label><label>余寿至少保留<input :value="encounter.remainingMonthsReserve" @input="field('remainingMonthsReserve',$event)" type="number" min="1" aria-label="历练余寿保留量"></label><label>累计灵力预算<input :value="encounter.mpBudget" @input="field('mpBudget',$event)" type="number" min="0" aria-label="历练累计灵力预算"></label></div><p>每场迎战30秒并消耗1游戏月；正式回合每次3秒，最多40回合。达到目标、预算或安全边界就停，不自动转场。</p></div>
   <div v-if="!here" class="adventure-preview" data-testid="adventure-preview"><p v-if="mode==='encounter'&&encounter.target" class="adventure-target">{{C.items[encounter.target.item].name}}库存达到 {{encounter.target.quantity}} 即停</p><strong>{{mode==='travel'?'预计一次抵达':`预计 ${quote?.adventure?.encountersStarted??0} 场 · 胜 ${quote?.adventure?.victories??0} 场 · ${quote?.cycles??0} 个动作`}}</strong><small>{{quote?.failure?.message??(quote?.stopReason?'预计停止：'+stopMessage(plan,quote.stopReason,true):'')}}</small><small v-if="mode==='encounter'">最多 {{encounter.maxEncounters}} 场 · 游戏月 {{encounter.monthBudget}} / 余寿保留 {{encounter.remainingMonthsReserve}} · 最多 {{encounter.maxCycles}} 动作 · 灵力累计 {{encounter.mpBudget}}</small><small v-if="mode==='encounter'">{{medicineSummary(encounter.strategy)}}；危险线 {{encounter.strategy.retreatBelowPercent}}% {{encounter.strategy.riskMode==='pause'?'暂停':'撤回洞府，气血-8，本段即停'}}。</small></div>
   <JourneyLocalAction v-if="here" :location="location" @locations="emit('locations',$event)" @track="emit('track',$event)"/>
   <footer v-else class="adventure-confirm"><small>{{conflict||'只执行本次明确安排；关闭或刷新后主动继续，不补离线收益。'}}</small><button class="primary" data-testid="adventure-start" :disabled="!!conflict||!quote?.allowed" @click="emit('start',plan)">{{running?'当前活动进行中，请先暂停':mode==='travel'?'安排行路至'+C.locations[trip.location].name:'按此战策历练'+enemy?.name}}</button></footer>
  </template>
 </section>
</template>
