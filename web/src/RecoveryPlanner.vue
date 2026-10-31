<script setup lang="ts">
import {computed,inject,onDeactivated,onUnmounted,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
import type {Action,Game} from '../../src/full/types.ts';
import {pausedPlanView} from './preparation-view.ts';
import * as C from '../../src/full/content.ts';
import {previewActivity,ADVENTURE_CYCLE_MS,type PreparationPlan,type UsePlan,type RestPlan} from '../../src/full/activity.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import type {useGame} from './store';
import RecoveryRitual from './RecoveryRitual.vue';
import GameIcon from './GameIcon.vue';
const props=withDefaults(defineProps<{game:Game;busy:boolean;available:boolean;running:boolean;highlight:string;savedPlan:UsePlan|RestPlan|null;planSaved?:boolean;inspectionExact?:boolean;embedded?:boolean}>(),{planSaved:false,inspectionExact:true});
const emit=defineEmits<{start:[PreparationPlan];act:[Action];track:[TrackingTarget];travel:[PreparationPlan]}>();
const focus=inject(gameFocusKey),settings=ref<HTMLDialogElement>(),options=ref<HTMLDialogElement>(),titleId=useId(),optionsTitle=useId();
const scene=inject<ReturnType<typeof useGame>>('game-scene');
const restart=computed(()=>pausedPlanView(scene?.activity,props.game.core.runId,plan.value));
function openSettings(event:Event){options.value?.close();if(focus)focus.open(settings.value,event.currentTarget as HTMLElement);else settings.value?.showModal();}
function openOptions(event:Event){settings.value?.close();if(focus)focus.open(options.value,event.currentTarget as HTMLElement);else options.value?.showModal();}
function closeViews(){settings.value?.close();options.value?.close();}
onDeactivated(closeViews);onUnmounted(()=>{focus?.release(settings.value);focus?.release(options.value);});watch(()=>props.game.core.runId,closeViews);
const mode=ref<'use'|'rest'>('use'),selected=ref<'healing_pill'|'spirit_pill'>('healing_pill'),target=ref(100),count=ref(3),reserve=ref(0),monthsReserve=ref(1);
const item=computed(()=>C.items[selected.value]);
const plan=computed<UsePlan|RestPlan>(()=>mode.value==='rest'?{kind:'rest',maxCycles:1,remainingMonthsReserve:monthsReserve.value}:{kind:'use',item:selected.value,maxCycles:count.value,targetPercent:target.value,itemReserve:reserve.value});
const quote=computed(()=>previewActivity(props.game,plan.value));
const sameSaved=computed(()=>{const p=props.savedPlan,d=plan.value;return !!p&&p.kind===d.kind&&(p.kind==='rest'&&d.kind==='rest'?p.remainingMonthsReserve===d.remainingMonthsReserve:p.kind==='use'&&d.kind==='use'&&p.item===d.item&&p.maxCycles===d.maxCycles&&p.targetPercent===d.targetPercent&&p.itemReserve===d.itemReserve);});
const conflict=computed(()=>scene?.error&&(scene.canRetry||scene.syncIssue)?'存档待核对，请先核对并重试原操作':!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'当前活动进行中，请先暂停后安排恢复':'');
const move=computed(()=>previewAction(props.game,{type:'TRAVEL',location:'cave'}));
function choose(id:string){mode.value=id==='rest'?'rest':'use';if(id==='healing_pill'||id==='spirit_pill')selected.value=id;}
function locate(){if(props.highlight==='rest'){mode.value='rest';return;}const id=props.highlight.replace(/^use-/,'');if(id==='healing_pill'||id==='spirit_pill')choose(id);}
let lastReadIntent='';
function restore(){const p=props.savedPlan;if(!p)return;const sig=JSON.stringify(p);if(!props.inspectionExact&&!props.planSaved){if(lastReadIntent===sig&&p.kind===mode.value&&(p.kind==='rest'||p.item===selected.value))return;lastReadIntent=sig;}mode.value=p.kind;if(p.kind==='rest')monthsReserve.value=p.remainingMonthsReserve;else{selected.value=p.item;target.value=p.targetPercent;count.value=p.maxCycles;reserve.value=p.itemReserve;}}
watch(()=>props.game.core.runId,()=>lastReadIntent='');watch([()=>props.game.core.runId,()=>props.highlight],locate,{immediate:true});watch(()=>props.savedPlan,restore,{immediate:true});
</script>
<template>
 <section class="idle-preparation recovery-planner" :class="{'paper':!embedded,'play-catalogue':!embedded}" data-testid="recovery-planner" aria-label="药匣与洞府恢复安排">
  <RecoveryRitual :game="game" :kind="mode" :item-id="selected" @source="emit('track',{kind:'item',id:selected,quantity:Math.max(1,count+reserve)})"><template #options>
  <button data-testid="recovery-options-open" @click="openOptions">选择恢复方式</button>
  </template><template #decision><small data-testid="preparation-plan-state">{{running&&!(sameSaved&&planSaved)?'下次安排草案 · 当前执行见活动条':sameSaved&&planSaved?'已保存安排；修改后须重新确认':'待确认的新安排，确认后才开始'}}</small><button class="supply-plan-open" data-testid="recovery-plan-open" @click="openSettings">{{mode==='rest'?'疗养一次 · 余寿保留 '+monthsReserve+' 月':'目标 '+target+'% · 最多 '+count+' 丹 · 库存保留 '+reserve}}<small>单次{{quote.cycleMs/1000}}秒 · 调整 ›</small></button>
    <div class="preparation-estimate" data-testid="preparation-estimate"><template v-if="restart.same"><strong data-testid="paused-plan-progress">{{restart.summary}} {{mode==='rest'?'次':'丹'}}</strong><small>{{restart.note}}</small></template><template v-else><strong>{{quote.failure?.message??('预计'+(mode==='rest'?'疗养 '+quote.cycles+' 次':'使用 '+quote.cycles+' 丹')+' · '+quote.months+' 游戏月')}}</strong><p v-if="quote.allowed">气血 +{{quote.hp}} · 灵力 +{{quote.mp}}</p><small>{{quote.stopReason?'预计停止：'+quote.stopReason.message:''}}</small><small v-if="mode==='use'">战中服丹占回合，另在斗法安排。</small></template></div>
    <button v-if="mode==='rest'&&game.core.world.location!=='cave'" class="primary" data-testid="preparation-travel" :disabled="!!conflict||!move.allowed" @click="emit('travel',plan)">前往听雨洞府 · {{ADVENTURE_CYCLE_MS.travel/1000}}秒 · 不自动疗养</button><button v-else class="primary" data-testid="preparation-start" :disabled="!!conflict||restart.same||!quote.allowed" @click="emit('start',plan)">{{conflict?'当前暂不可安排':restart.same?restart.label:restart.label+(mode==='rest'?'安排疗养一次':'按目标使用'+item.name)}}</button><small class="preparation-reason">{{conflict||'达标或触及保留线即停，逐次保存。'}}</small>
  </template></RecoveryRitual>
  <dialog ref="options" class="art11-object-dialog" data-testid="recovery-options-dialog" :aria-labelledby="optionsTitle"><h3 :id="optionsTitle">药匣与疗养方式</h3>  <div class="recovery-options" aria-label="恢复方式"><button v-for="id in ['healing_pill','spirit_pill']" :key="id" :aria-pressed="mode==='use'&&selected===id" :data-testid="'recovery-'+id" @click="choose(id);options?.close()"><GameIcon kind="item" :id="id"/><strong>{{C.items[id].name}}</strong><small>持有 {{game.core.inventory[id]}} 丹 · 6 秒 / 丹</small></button><button :aria-pressed="mode==='rest'" data-testid="recovery-rest" @click="choose('rest');options?.close()"><GameIcon kind="nav" id="cultivate"/><strong>洞府疗养</strong><small>1 游戏月 · 30 秒 · 恢复至满</small></button></div>
<footer><button data-testid="recovery-options-close" @click="options?.close()">返回当前恢复对象</button></footer></dialog>
  <dialog ref="settings" class="preparation-dialog" data-testid="recovery-plan-dialog" :aria-labelledby="titleId"><h3 :id="titleId">{{mode==='rest'?'洞府疗养':item.name}} · 单次{{quote.cycleMs/1000}}秒</h3><p>只改本段恢复草案，关闭保留；返回后确认才用药或疗养。</p><template v-if="mode==='use'"><label class="recovery-target">{{item.hp?'气血':'灵力'}}恢复目标 <input v-model.number="target" type="number" min="1" max="100" aria-label="恢复目标百分比">%</label><div class="recovery-limits-fields"><label>最多服丹数<input v-model.number="count" type="number" min="1" max="50" aria-label="最多服丹数"></label><label>服丹库存保留量<input v-model.number="reserve" type="number" min="0" :max="C.maxQuantity" aria-label="服丹库存保留量"></label></div></template><div v-else class="recovery-limits-fields"><label>疗养余寿保留量（游戏月）<input v-model.number="monthsReserve" type="number" min="1" aria-label="疗养余寿保留量"></label></div>
<footer><button data-testid="recovery-plan-close" @click="settings?.close()">完成调整 · 返回药匣</button></footer></dialog>
 </section>
</template>
