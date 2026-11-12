<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {computed,ref,watch,inject} from 'vue';
import type {useGame} from './store';
import type {Action,Game,Move} from '../../src/full/types.ts';
import type {Activity} from '../../src/full/activity.ts';
import {previewActivity} from '../../src/full/activity.ts';
import {ADVENTURE_CYCLE_MS,adventureDecision,defaultBattlePlan,defaultBattleStrategy,type AdventurePlan,type BattlePlan,type BattleStrategy as Strategy} from '../../src/full/adventure.ts';
import {previewAction} from '../../src/full/queries.ts';
import {costsForAction} from '../../src/full/costs.ts';
import {formatCosts} from './presentation';
import * as C from '../../src/full/content.ts';
import GameIcon from './GameIcon.vue';
import BattleDeck from './BattleDeck.vue';
import{medicineSummary}from'./battle-medicine-summary';
import './idle-adventure.css';
const ruleContent=useRuleContent(()=>props.game);
const props=withDefaults(defineProps<{game:Game;modelValue?:Strategy;variant?:'editor'|'battle';compact?:boolean;busy?:boolean;available?:boolean;running?:boolean;activity?:Activity|null;savedPlan?:AdventurePlan|null;planSaved?:boolean;trial?:boolean;can?:(action:Action)=>boolean;cost?:(action:Action)=>string;why?:(action:Action)=>string}>(),{variant:'editor',compact:false,busy:false,available:true,running:false,planSaved:false,trial:false});
const scene=inject<ReturnType<typeof useGame>>('game-scene');
const emit=defineEmits<{'update:modelValue':[Strategy];start:[BattlePlan];move:[Move];details:[MouseEvent];takeover:[]}>();
const draft=ref<Strategy>(defaultBattleStrategy(props.game)),page=ref<'priority'|'supplies'|'safety'>('priority'),view=ref<'battle'|'strategy'|'manual'>('battle');
const limit=ref(props.game.battle?defaultBattlePlan(props.game).maxCycles:40),mpBudget=ref(props.game.battle?defaultBattlePlan(props.game).mpBudget:480);
const copyStrategy=(s:Strategy):Strategy=>({...s,priority:[...s.priority]});
const state=computed({get:()=>props.modelValue??draft.value,set:(next:Strategy)=>{draft.value=next;emit('update:modelValue',next);}});
const autoPlan=computed(()=>props.game.battle?{...defaultBattlePlan(props.game),maxCycles:limit.value,mpBudget:mpBudget.value,strategy:copyStrategy(state.value)}:null);
const quote=computed(()=>autoPlan.value?previewActivity(props.game,autoPlan.value):null);
const currentDecision=computed(()=>{const a=props.activity;return a?.version===6&&a.status==='running'&&a.runId===props.game.core.runId&&a.gameRevision===props.game.core.revision?adventureDecision(a):null;});
const authorization=computed(()=>{
 const a=props.activity;if(a?.version!==6||a.status==='stopped'||a.runId!==props.game.core.runId||a.gameRevision!==props.game.core.revision)return'';
 const p=a.plan;if(p.kind==='travel')return'原行旅：'+C.locations[p.location].name+'，只抵达一次，不自动开战。';
 const items=((a.spentItems.healing_pill??0)||(a.spentItems.spirit_pill??0)?'已用回春 '+(a.spentItems.healing_pill??0)+'、回灵 '+(a.spentItems.spirit_pill??0):'未耗丹药')+'；灵力累计已用 '+a.spentMp;
 if(p.kind==='battle'&&p.mode==='single')return'原手动单步：'+label(p.move)+'，最多1回合；'+items+'。';
 const s=p.strategy,scope=p.kind==='encounter'?'原历练 '+ruleContent.value.enemies[p.enemy].name+'，入场 '+a.encountersStarted+'/'+p.maxEncounters+'，游戏月 '+a.spentMonths+'/'+p.monthBudget+'，余寿保留 '+p.remainingMonthsReserve:'原本关自动斗法 '+ruleContent.value.enemies[p.enemy].name;
 return scope+'；动作 '+a.completedCycles+'/'+p.maxCycles+'；'+items+'/'+p.mpBudget+'；'+medicineSummary(s)+'；危险线 '+s.retreatBelowPercent+'% '+(s.riskMode==='pause'?'暂停，不离场':retreatEffect.value)+'。';
});
const next=computed(()=>currentDecision.value?currentDecision.value.action:quote.value?.adventure?.initialAction??null);
const explanation=computed(()=>currentDecision.value?.reason??quote.value?.adventure?.initialReason??quote.value?.failure?.message??'先核对战策，再安排当前这一关。');
const nextPreview=computed(()=>next.value?previewAction(props.game,next.value):null);
const blocked=computed(()=>scene?.unresolved?scene.syncIssue?'存档待核对，请先重新读取':'请先重试或取消原操作':!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'当前活动进行中，请先暂停后确认新战策':'');
const sameSaved=computed(()=>{const p=props.savedPlan,d=autoPlan.value;return !!d&&p?.kind==='battle'&&p.mode==='auto'&&p.enemy===d.enemy&&p.trialStage===d.trialStage&&p.maxCycles===d.maxCycles&&p.mpBudget===d.mpBudget&&JSON.stringify(p.strategy)===JSON.stringify(d.strategy);});
const savedSingle=computed(()=>{const p=props.savedPlan;return props.planSaved&&p?.kind==='battle'&&p.mode==='single'?p:null;});
const oldTarget=computed(()=>{const p=props.savedPlan;return p?.kind==='battle'&&p.mode==='auto'&&(p.enemy!==props.game.battle?.enemy||p.trialStage!==(props.game.trial?.stage??null))?ruleContent.value.enemies[p.enemy].name:null;});
function label(move:Move){const id=move==='technique'?props.game.loadout.builder:move==='release'?props.game.loadout.finisher:null;return id?ruleContent.value.skills[id].name:({attack:'普通攻击',guard:'凝神护体',technique:'起手术法',release:'终结术法',heal:'服用回春丹',restore:'服用回灵丹',flee:'撤回洞府'} as const)[move];}
function purpose(move:Move){if(move==='attack')return props.game.school==='sword'?'攻击、回灵并积蓄剑意':'普通攻击并回灵';if(move==='guard')return'护体减伤与回灵';if(move==='release')return props.game.school==='sword'?'消耗剑意；满层可打断重击':'结算并清除符印';if(move==='technique')return props.game.school==='sword'?'按已装备起手术法积蓄剑意':'按已装备术法留符并护体';return'占用一个正式回合，对方仍会出招';}
function update<K extends keyof Strategy>(key:K,value:Strategy[K]){state.value={...state.value,[key]:value};}
function numberField(key:keyof Strategy,event:Event){update(key,Number((event.target as HTMLInputElement).value) as never);}
function shift(index:number,offset:number){const priority=[...state.value.priority],other=index+offset;if(other<0||other>=priority.length)return;[priority[index],priority[other]]=[priority[other],priority[index]];update('priority',priority as Strategy['priority']);}
function manualCan(move:Move){const a:Action={type:'BATTLE',move};return !scene?.unresolved&&!props.running&&!props.busy&&props.available&&(props.can?props.can(a):previewAction(props.game,a).allowed);}
function manualReason(move:Move){return blocked.value||(props.why?props.why({type:'BATTLE',move}):previewAction(props.game,{type:'BATTLE',move}).failure?.message??'');}
function manualCost(move:Move){const a:Action={type:'BATTLE',move};return props.cost?props.cost(a):formatCosts(costsForAction(props.game,a));}
function takeover(){view.value='manual';if(props.running)emit('takeover');}
function restore(){const p=props.savedPlan;if(p?.kind!=='battle')return;if(p.mode==='auto'){draft.value=copyStrategy(p.strategy);limit.value=p.maxCycles;mpBudget.value=p.mpBudget;view.value='strategy';}else view.value='manual';}
function reset(){draft.value=defaultBattleStrategy(props.game);if(props.game.battle){const p=defaultBattlePlan(props.game);limit.value=p.maxCycles;mpBudget.value=p.mpBudget;}page.value='priority';view.value='battle';restore();}
watch([()=>props.game.core.runId,()=>props.game.battle?.enemy,()=>props.game.trial?.stage],reset);watch(()=>props.savedPlan,restore,{immediate:true});
watch(()=>props.activity?.id,(id,old)=>{const a=props.activity;if(id!==old&&a?.version===6&&a.status==='running'&&a.plan.kind==='battle')view.value=a.plan.mode==='auto'?'battle':'manual';},{immediate:true});
const retreatEffect=computed(()=>`气血 -8，最低1；无掉落；${props.trial?'结束本轮天劫':'结束本次交锋'}`);
const signed=(n:number)=>n>0?'+'+n:String(n);
</script>
<template>
 <section v-if="variant==='editor'" class="battle-strategy-editor" data-testid="battle-strategy-editor" aria-label="有限斗法战策">
  <nav class="tactic-pages" aria-label="战策分页"><button v-for="[id,name] in [['priority','招式顺序'],['supplies','用药上限'],['safety','危险停手']] as const" :key="id" :data-testid="'strategy-tab-'+id" :aria-pressed="page===id" @click="page=id">{{name}}</button></nav>
  <div v-if="page==='priority'" class="tactic-priority"><div class="tactic-move-grid"><article v-for="(move,index) in state.priority" :key="move" class="tactic-move"><GameIcon kind="skill" :id="move==='release'?(game.loadout.finisher??'sword_release'):move==='technique'?(game.loadout.builder??'sword_build'):move==='guard'?'sword_guard':'sword_build'"/><div><small>第 {{index+1}} 优先</small><strong>{{label(move)}}</strong><small>灵力 {{costsForAction(game,{type:'BATTLE',move}).mp}} · {{purpose(move)}}</small></div><div class="tactic-order"><button :disabled="index===0" @click="shift(index,-1)" :aria-label="'提升'+label(move)+'优先级'">↑</button><button :disabled="index===3" @click="shift(index,1)" :aria-label="'降低'+label(move)+'优先级'">↓</button></div></article></div><div class="tactic-priority-options"><label><input :checked="state.respondHeavy" @change="update('respondHeavy',($event.target as HTMLInputElement).checked)" type="checkbox" aria-label="应对敌方重击">应对重击：{{game.school==='sword'?'满剑意打断，否则护体':'优先凝神护体'}}</label><label>{{game.school==='sword'?'剑意':'符印'}}释放门槛<select :value="state.releaseAt" @change="numberField('releaseAt',$event)" aria-label="释放层数门槛"><option v-for="n in [1,2,3]" :key="n" :value="n">{{n}} 层</option></select></label></div></div>
  <div v-else-if="page==='supplies'" class="tactic-supply-page"><div class="tactic-medicine-grid"><article><strong><GameIcon kind="item" id="healing_pill"/>回春丹 · 持有 {{game.core.inventory.healing_pill}}</strong><label>气血低于 %<input :value="state.healBelowPercent" @input="numberField('healBelowPercent',$event)" type="number" min="0" max="100" aria-label="自动回春气血阈值"></label><label>整段最多使用<input :value="state.healingBudget" @input="numberField('healingBudget',$event)" type="number" min="0" max="50" aria-label="战斗回春丹总预算"></label><label>库存至少保留<input :value="state.healingReserve" @input="numberField('healingReserve',$event)" type="number" min="0" max="999999" aria-label="战斗回春丹保留量"></label></article><article><strong><GameIcon kind="item" id="spirit_pill"/>回灵丹 · 持有 {{game.core.inventory.spirit_pill}}</strong><label>灵力低于 %<input :value="state.restoreBelowPercent" @input="numberField('restoreBelowPercent',$event)" type="number" min="0" max="100" aria-label="自动回灵灵力阈值"></label><label>整段最多使用<input :value="state.spiritBudget" @input="numberField('spiritBudget',$event)" type="number" min="0" max="50" aria-label="战斗回灵丹总预算"></label><label>库存至少保留<input :value="state.spiritReserve" @input="numberField('spiritReserve',$event)" type="number" min="0" max="999999" aria-label="战斗回灵丹保留量"></label></article></div><p>阈值0表示不按该阈值用药；丹药占一回合，对方仍按敌意出招。不会自动采购、炼丹或使用战外恢复。</p></div>
  <div v-else class="tactic-safety"><label>气血危险线 %<input :value="state.retreatBelowPercent" @input="numberField('retreatBelowPercent',$event)" type="number" min="0" max="99" aria-label="自动斗法气血危险线"></label><div class="tactic-risk-options"><button :aria-pressed="state.riskMode==='pause'" data-testid="strategy-risk-pause" @click="update('riskMode','pause')"><strong>暂停战策</strong><small>不推进回合，不扣撤退气血；核对后主动继续。</small></button><button :aria-pressed="state.riskMode==='flee'" data-testid="strategy-risk-flee" @click="update('riskMode','flee')"><strong>撤回洞府</strong><small>{{retreatEffect}}</small></button></div><p>触及危险线或正式预演已知会败退时，按这里的选择处理。暂停不等于撤退；单步可保留玩家明确选择的合法冒险。</p></div>
 </section>
 <section v-else class="battle-automation" :class="{'battle-auto-surface':compact}" :data-view="view" data-testid="battle-stage" :data-enemy="game.battle?.enemy" aria-label="当前斗法">
  <header class="battle-mode-heading"><span>斗法 · <b data-testid="round">第 {{(game.battle?.round??0)+1}} 回合</b></span><nav aria-label="斗法视图"><button :aria-pressed="view==='battle'" data-testid="battle-view-scene" @click="view='battle'">战局</button><button :aria-pressed="view==='strategy'" data-testid="battle-view-strategy" @click="view='strategy'">战策</button><button :aria-pressed="view==='manual'" data-testid="battle-manual-takeover" @click="takeover">{{running?'暂停并手动接管':'手动操作'}}</button><button @click="emit('details',$event)" data-testid="battle-recent">术法与最近8条</button></nav></header>
  <template v-if="view==='strategy'"><div class="battle-plan-state" data-testid="battle-plan-state">{{oldTarget?'原安排目标 '+oldTarget+' 已结束；此处为当前关待确认选择':sameSaved&&planSaved?'本次战策 · 修改后需确认':'待确认的新战策；不会改动当前活动'}}</div><div class="battle-plan-limits"><label>本关最多回合<input v-model.number="limit" type="number" min="1" max="40" aria-label="本关最多斗法回合"></label><label>累计灵力预算<input v-model.number="mpBudget" type="number" min="0" aria-label="斗法累计灵力预算"></label></div><BattleStrategy v-model="state" :trial="trial" variant="editor" :game="game"/></template>
  <template v-else><slot name="hero"/><div v-if="view==='battle'" class="battle-next" data-testid="battle-next"><strong>{{currentDecision?'下一招':'战策预估'}}：{{next?.type==='BATTLE'?label(next.move):next?.type==='ENCOUNTER'?'迎战':'待核对'}}</strong><span>{{explanation}}</span><small v-if="nextPreview?.allowed">拟本回合：气血 {{signed(nextPreview.delta?.hp??0)}} · 灵力 {{signed(nextPreview.delta?.mp??0)}}；实际结果以保存为准。</small><small v-if="activity?.version===6&&activity.status==='paused'">可手动接管，选择服丹或撤回洞府。</small></div></template>
  <template v-if="view==='manual'"><p v-if="savedSingle" class="battle-plan-state" data-testid="battle-single-plan">原手动单步：{{ruleContent.enemies[savedSingle.enemy].name}}{{savedSingle.trialStage===null?'':' · 天劫第'+savedSingle.trialStage+'关'}} · {{label(savedSingle.move)}} · 仅1回合 / 3秒；查看不会再次执行。</p><BattleDeck :game="game" :saved-move="savedSingle?.move" :proposed-move="next?.type==='BATTLE'?next.move:undefined" :can-move="manualCan" :label="label" :purpose="purpose" :reason="manualReason" :cost="manualCost" :retreat-effect="retreatEffect" @move="emit('move',$event)"/></template>
  <template v-else-if="view==='strategy'||!activity||activity.status==='stopped'"><div class="battle-authorization" data-testid="battle-authorization"><span>待确认战策：每招 {{ADVENTURE_CYCLE_MS.battle/1000}} 秒 · 本关最多 {{limit}} 回合 · 灵力累计上限 {{mpBudget}}</span><span>{{medicineSummary(state)}}</span><span>危险线 {{state.retreatBelowPercent}}% · {{state.riskMode==='pause'?'暂停战策，不离场':retreatEffect}}</span></div><button class="primary battle-auto-start" data-testid="battle-auto-start" :disabled="!!blocked||!quote?.allowed||!autoPlan" @click="autoPlan&&emit('start',autoPlan)">{{running?'当前活动进行中，请先暂停':planSaved?'确认重新安排本关':'开始自动斗法'}}</button><small v-if="blocked" class="battle-action-reason">{{blocked}}</small><small v-else-if="quote?.failure" class="battle-action-reason">{{quote.failure.message}}</small></template>
  <div class="battle-current-activity"><p v-if="authorization" class="battle-current-authorization" data-testid="battle-current-authorization">{{authorization}}</p><slot name="activity"/></div>
 </section>
</template>

<style scoped>
.immersive-stage .hub-current section.battle-automation[data-view=battle]{grid-template-rows:44px minmax(0,1fr) auto auto auto}
section.battle-automation[data-view=battle]>.battle-authorization{padding-block:8px}
</style>
