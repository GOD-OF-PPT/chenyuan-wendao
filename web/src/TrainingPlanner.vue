<script setup lang="ts">
import {computed,ref} from 'vue';
import type {Game,Action} from '../../src/full/types.ts';
import type {CultivationPlan} from '../../src/full/activity.ts';
import {previewActivity} from '../../src/full/activity.ts';
import {getBreakthroughGoal,previewAction} from '../../src/full/queries.ts';
import {nextStep} from './play-flow';
import {actionSeconds} from './action-timing';
import AssetImage from './AssetImage.vue';
import {DESKTOP_UI_ASSETS} from './assets';
const props=defineProps<{game:Game;busy:boolean;available:boolean;running:boolean}>();
const emit=defineEmits<{start:[CultivationPlan];act:[Action];prepare:[];trial:[];school:[];cave:[]}>();
const method=ref<'natural'|'assisted'>('natural'),target=ref('xp-cap'),budget=ref(0),reserve=ref(0);
const goal=computed(()=>getBreakthroughGoal(props.game)),step=computed(()=>nextStep(props.game));
const plan=computed<CultivationPlan>(()=>({kind:'cultivation',method:method.value,maxCycles:target.value==='xp-cap'?50:Number(target.value),until:target.value==='xp-cap'?'xp-cap':'cycles',stoneBudget:method.value==='natural'?0:budget.value,stoneReserve:method.value==='natural'?0:reserve.value}));
const quote=computed(()=>previewActivity(props.game,plan.value));
const one=computed(()=>previewAction(props.game,{type:'CULTIVATE',method:method.value,count:1}));
function selectMethod(value:'natural'|'assisted'){method.value=value;if(value==='assisted')budget.value=Math.min(props.game.core.player.stones,(one.value.costs?.stones??0)*50);}
const can=(action:Action)=>props.available&&!props.busy&&!props.running&&previewAction(props.game,action).allowed;
</script>
<template>
 <section class="paper play-catalogue training-planner" data-testid="cultivation-catalogue" tabindex="-1">
  <header><div><h3>安排一段修行</h3><p>选定方式后持续吐纳，每轮自动保存；达到目标或预算边界即停。</p></div></header>
  <div v-if="game.core.world.location!=='cave'" class="catalogue-empty"><strong>返回听雨洞府修炼</strong><button class="primary" data-testid="return-cave" @click="emit('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府</button></div>
  <template v-else>
   <div class="training-plan-art" aria-hidden="true"><AssetImage :path="DESKTOP_UI_ASSETS.meditation" asset-id="training-plan-meditation" fit="contain"/></div>
   <nav class="catalogue-tabs" aria-label="修炼方式"><button v-for="m in ['natural','assisted'] as const" :key="m" :aria-pressed="method===m" :data-testid="'cultivation-method-'+m" @click="selectMethod(m)">{{m==='natural'?'自然吐纳 · 节省灵石':'灵石辅助 · 加快积累'}}</button></nav>
   <div class="training-plan-body">
    <div class="training-choice"><label>修行目标 <select v-model="target" aria-label="修行目标"><option value="xp-cap">修为圆满即停（最多50轮）</option><option v-for="n in [1,5,20,50]" :key="n" :value="String(n)">{{n}} 轮后停</option></select></label><p data-testid="training-per-cycle">每轮 {{quote.cycleMs/1000}} 秒 · 修为 {{one.delta?.xp??0}} · {{one.costs?.months??0}} 游戏月<span v-if="method==='assisted'"> · {{one.costs?.stones??0}} 灵石</span></p></div>
    <details v-if="method==='assisted'" class="training-budget"><summary>灵石安排 · 上限 {{budget}} · 保留 {{reserve}}</summary><label>累计最多使用 <input v-model.number="budget" aria-label="累计灵石预算" type="number" min="0" step="1"></label><label>至少保留 <input v-model.number="reserve" aria-label="灵石保留量" type="number" min="0" step="1"></label></details>
    <div class="training-estimate" data-testid="training-estimate"><strong>预计可完成 {{quote.cycles}} 轮</strong><p>修为 +{{quote.xp}} · 灵石消耗 {{quote.stones}} · {{quote.months}} 游戏月</p><small>{{quote.failure?.message??quote.stopReason?.message}}</small><small>累计灵石上限 {{plan.stoneBudget}} · 保留 {{plan.stoneReserve}} · 最多 {{plan.maxCycles}} 轮</small></div>
    <button class="primary training-start" data-testid="training-start" @click="emit('start',plan)" :disabled="!available||busy||running||!quote.allowed">{{running?'当前修炼进行中，请先暂停':'开始'+(method==='natural'?'自然吐纳':'灵石辅助')}}</button>
    <p class="training-offline-note">本次为在线修炼。关闭或刷新保留成果与安排，继续后本轮重新计时，不补发离线收益。</p>
   </div>
   <footer class="catalogue-confirm"><div><small>{{goal.preview?.failure?.message??'准备已齐，可确认下一步。'}}</small><button v-if="!game.school&&game.core.player.realm!=='mortal'" @click="emit('school')">选择剑修或符修</button><button v-else-if="game.core.player.realm==='spirit'" data-testid="breakthrough" @click="emit('trial')">查看渡劫准备</button><button v-else-if="step.kind==='prepare'" data-testid="journey-prepare" @click="emit('prepare')">{{step.title}}</button><button v-else-if="goal.action" data-testid="breakthrough" @click="emit('act',goal.action)" :disabled="!can(goal.action)">{{goal.title}}</button></div><button data-testid="rest" @click="emit('act',{type:'REST'})" :disabled="!can({type:'REST'})">洞府疗养 · {{actionSeconds({type:'REST'})}} 秒<small>{{previewAction(game,{type:'REST'}).failure?.message}}</small></button></footer>
  </template>
 </section>
</template>
