<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {stats} from '../../src/full/engine.ts';
import {previewActivity,type PreparationPlan,type UsePlan,type RestPlan} from '../../src/full/activity.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import CatalogueArt from './CatalogueArt.vue';
import GameIcon from './GameIcon.vue';
const props=withDefaults(defineProps<{game:Game;busy:boolean;available:boolean;running:boolean;highlight:string;savedPlan:UsePlan|RestPlan|null;planSaved?:boolean;embedded?:boolean}>(),{planSaved:false});
const emit=defineEmits<{start:[PreparationPlan];act:[Action];track:[TrackingTarget];travel:[PreparationPlan]}>();
const mode=ref<'use'|'rest'>('use'),selected=ref<'healing_pill'|'spirit_pill'>('healing_pill'),target=ref(100),count=ref(3),reserve=ref(0),monthsReserve=ref(1);
const body=computed(()=>stats(props.game)),item=computed(()=>C.items[selected.value]);
const plan=computed<UsePlan|RestPlan>(()=>mode.value==='rest'?{kind:'rest',maxCycles:1,remainingMonthsReserve:monthsReserve.value}:{kind:'use',item:selected.value,maxCycles:count.value,targetPercent:target.value,itemReserve:reserve.value});
const quote=computed(()=>previewActivity(props.game,plan.value));
const one=computed(()=>previewAction(props.game,mode.value==='rest'?{type:'REST'}:{type:'USE',item:selected.value}));
const sameSaved=computed(()=>{const p=props.savedPlan,d=plan.value;return !!p&&p.kind===d.kind&&(p.kind==='rest'&&d.kind==='rest'?p.remainingMonthsReserve===d.remainingMonthsReserve:p.kind==='use'&&d.kind==='use'&&p.item===d.item&&p.maxCycles===d.maxCycles&&p.targetPercent===d.targetPercent&&p.itemReserve===d.itemReserve);});
const conflict=computed(()=>!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'当前活动进行中，请先暂停后安排恢复':'');
const move=computed(()=>previewAction(props.game,{type:'TRAVEL',location:'cave'}));
function choose(id:string){mode.value=id==='rest'?'rest':'use';if(id==='healing_pill'||id==='spirit_pill')selected.value=id;}
function locate(){if(props.highlight==='rest'){mode.value='rest';return;}const id=props.highlight.replace(/^use-/,'');if(id==='healing_pill'||id==='spirit_pill')choose(id);}
function restore(){const p=props.savedPlan;if(!p)return;mode.value=p.kind;if(p.kind==='rest')monthsReserve.value=p.remainingMonthsReserve;else{selected.value=p.item;target.value=p.targetPercent;count.value=p.maxCycles;reserve.value=p.itemReserve;}}
watch([()=>props.game.core.runId,()=>props.highlight],locate,{immediate:true});watch(()=>props.savedPlan,restore,{immediate:true});
</script>
<template>
 <section class="idle-preparation recovery-planner" :class="{'paper':!embedded,'play-catalogue':!embedded}" data-testid="recovery-planner" aria-label="药匣与洞府恢复安排">
  <header class="preparation-heading"><div><strong>药匣与疗养 · 安排恢复后再出发</strong><small data-testid="preparation-plan-state">{{sameSaved&&planSaved?'已保存安排；修改后须重新确认':'待确认的新安排，确认后才开始'}}</small></div></header>
  <div class="recovery-body" aria-label="当前体魄"><div><span>气血</span><strong>{{game.core.player.hp}} / {{body.maxHp}}</strong><progress :value="game.core.player.hp" :max="body.maxHp" aria-label="当前气血"/></div><div><span>灵力</span><strong>{{game.core.player.mp}} / {{body.maxMp}}</strong><progress :value="game.core.player.mp" :max="body.maxMp" aria-label="当前灵力"/></div></div>
  <div class="recovery-options" aria-label="恢复方式"><button v-for="id in ['healing_pill','spirit_pill']" :key="id" :aria-pressed="mode==='use'&&selected===id" :data-testid="'recovery-'+id" @click="choose(id)"><GameIcon kind="item" :id="id"/><strong>{{C.items[id].name}}</strong><small>持有 {{game.core.inventory[id]}} 丹 · 6 秒 / 丹</small></button><button :aria-pressed="mode==='rest'" data-testid="recovery-rest" @click="choose('rest')"><GameIcon kind="nav" id="cultivate"/><strong>洞府疗养</strong><small>1 游戏月 · 30 秒 · 恢复至满</small></button></div>
  <div class="preparation-work recovery-work"><div class="recovery-cabinet"><div class="preparation-art"><CatalogueArt kind="supplies"/></div><div><h3>{{mode==='rest'?'洞府休养':item.name}}</h3><p>{{mode==='rest'?'以一个游戏月换取气血灵力恢复圆满；不消耗丹药。':item.description}}</p><strong data-testid="recovery-per-cycle">本{{mode==='rest'?'次':'丹'}}气血 +{{one.delta?.hp??0}} · 灵力 +{{one.delta?.mp??0}}</strong><button v-if="mode==='use'" @click="emit('track',{kind:'item',id:selected,quantity:Math.max(1,count+reserve)})">查看丹药来源与补给</button><small v-else>离开洞府时先明确前往，抵达后另行确认恢复安排。</small></div></div>
   <div class="preparation-decision recovery-decision"><template v-if="mode==='use'"><label class="recovery-target">{{item.hp?'气血':'灵力'}}恢复目标 <input v-model.number="target" type="number" min="1" max="100" aria-label="恢复目标百分比">%</label><details class="preparation-limits"><summary>最多 {{count}} 丹 · 库存保留 {{reserve}}</summary><label>最多服丹数<input v-model.number="count" type="number" min="1" max="50" aria-label="最多服丹数"></label><label>服丹库存保留量<input v-model.number="reserve" type="number" min="0" :max="C.maxQuantity" aria-label="服丹库存保留量"></label></details></template><details v-else class="preparation-limits"><summary>疗养一次 · 余寿至少保留 {{monthsReserve}} 月</summary><label>疗养余寿保留量<input v-model.number="monthsReserve" type="number" min="1" aria-label="疗养余寿保留量"></label></details>
    <div class="preparation-estimate" data-testid="preparation-estimate"><strong>预计{{mode==='rest'?'疗养 '+quote.cycles+' 次':'使用 '+quote.cycles+' 丹'}} · {{quote.months}} 游戏月</strong><p>气血 +{{quote.hp}} · 灵力 +{{quote.mp}}</p><small>{{quote.failure?.message??(quote.stopReason?'预计停止：'+quote.stopReason.message:'')}}</small><small>{{mode==='rest'?'仅一次正式恢复，不分段重复耗月。':'只对当前不足恢复，达标即停；战中服丹占回合，另在斗法安排。'}}</small></div>
    <button v-if="mode==='rest'&&game.core.world.location!=='cave'" class="primary" data-testid="preparation-travel" :disabled="!!conflict||!move.allowed" @click="emit('travel',plan)">前往听雨洞府 · 不自动疗养</button><button v-else class="primary" data-testid="preparation-start" :disabled="!!conflict||!quote.allowed" @click="emit('start',plan)">{{running?'当前活动进行中，请先暂停':mode==='rest'?'安排疗养一次':'按目标使用'+item.name}}</button><small class="preparation-reason">{{conflict||'达到目标或触及保留线后停止，成果逐次保存。'}}</small>
   </div>
  </div>
 </section>
</template>
