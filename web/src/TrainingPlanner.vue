<script setup lang="ts">
import {playerCopy} from './player-copy';
import{stopMessage}from './activity-view';
import{computed,inject,ref,watch}from 'vue';
import type{Game,Action}from '../../src/full/types.ts';
import{previewActivity,type CultivationPlan}from '../../src/full/activity.ts';
import{getBreakthroughGoal,previewAction}from '../../src/full/queries.ts';
import{nextStep}from './play-flow';
import{actionSeconds}from './action-timing';
import{ADVENTURE_CYCLE_MS}from '../../src/full/adventure.ts';
import{formatCosts}from './presentation';
import CultivationSite from './CultivationSite.vue';
import type{useGame}from './store';
import{canonicalFingerprint}from '../../src/full/receipts.ts';
const props=defineProps<{game:Game;busy:boolean;available:boolean;running:boolean;savedPlan:CultivationPlan|null}>();
const emit=defineEmits<{start:[CultivationPlan];act:[Action];prepare:[];trial:[];school:[];cave:[];compare:['natural'|'assisted']}>();
const method=ref<'natural'|'assisted'>('natural'),target=ref('xp-cap'),capCycles=ref(50),budget=ref(0),reserve=ref(0),budgetInitialized=ref(false);
const scene=inject<ReturnType<typeof useGame>>('game-scene'),blocked=computed(()=>scene?.unresolved);
const goal=computed(()=>getBreakthroughGoal(props.game)),step=computed(()=>nextStep(props.game));
const plan=computed<CultivationPlan>(()=>({kind:'cultivation',method:method.value,maxCycles:target.value==='xp-cap'?capCycles.value:Number(target.value),until:target.value==='xp-cap'?'xp-cap':'cycles',stoneBudget:budget.value,stoneReserve:reserve.value}));
const matchesSaved=computed(()=>!!props.savedPlan&&canonicalFingerprint(props.savedPlan)===canonicalFingerprint(plan.value));
const paused=computed(()=>scene?.activity?.status==='paused');
const unchanged=computed(()=>paused.value&&scene?.activity?.version===1&&canonicalFingerprint(scene.activity.plan)===canonicalFingerprint(plan.value));
const quote=computed(()=>previewActivity(props.game,plan.value));
const one=computed(()=>previewAction(props.game,{type:'CULTIVATE',method:method.value,count:1}));
function selectMethod(value:'natural'|'assisted'){method.value=value;if(value==='assisted'&&!budgetInitialized.value){budget.value=Math.min(props.game.core.player.stones,(one.value.costs?.stones??0)*plan.value.maxCycles);budgetInitialized.value=true;}}
function restorePlan(){const saved=props.savedPlan;if(!saved)return;method.value=saved.method;target.value=saved.until==='xp-cap'?'xp-cap':String(saved.maxCycles);capCycles.value=saved.maxCycles;budget.value=saved.stoneBudget;reserve.value=saved.stoneReserve;budgetInitialized.value=true;}
watch(()=>props.savedPlan,restorePlan,{immediate:true});
const can=(action:Action)=>props.available&&!props.busy&&!props.running&&!blocked.value&&previewAction(props.game,action).allowed;
</script>
<template>
 <section class="paper play-catalogue training-planner" data-testid="cultivation-catalogue" data-copy30="training" tabindex="-1">
  <header><div><h3>{{matchesSaved?'本次修行打算':'安排一段潜修'}}</h3><small data-testid="training-plan-state">{{matchesSaved?playerCopy.savedPlan:savedPlan?playerCopy.nextPlan:'确认后开始'}}</small></div><button data-testid="training-compare" @click="emit('compare',method)">比较方式</button></header>
  <div v-if="game.core.world.location!=='cave'" class="catalogue-empty"><strong>返回听雨洞府修炼</strong><button class="primary" data-testid="return-cave" @click="emit('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府<small>{{formatCosts(previewAction(game,{type:'TRAVEL',location:'cave'}).costs)}} · {{ADVENTURE_CYCLE_MS.travel/1000}} 秒行旅</small></button></div>
  <template v-else>
   <CultivationSite :game="game" :method="method" compact @method="selectMethod"><template #decision>
    <p data-testid="training-per-cycle">每轮 {{quote.cycleMs/1000}} 秒 · 修为 {{one.delta?.xp??0}} · {{one.costs?.months??0}} 游戏月<span v-if="method==='assisted'"> · {{one.costs?.stones??0}} 灵石</span></p>
    <div class="training-estimate" data-testid="training-estimate"><details name="ux30-training"><summary style="min-height:44px">本段预估 · {{quote.cycles}} 轮</summary><p>修为 +{{quote.xp}} · 灵石消耗 {{quote.stones}} · {{quote.months}} 游戏月</p><small>{{quote.stopReason?'预计停止：'+stopMessage(plan,quote.stopReason,true):''}}</small></details><small v-if="blocked||quote.failure">{{blocked?'请先处理上方原安排或重新读取':'暂不可安排：'+quote.failure?.message}}</small><small>累计灵石上限 {{plan.stoneBudget}} · 保留 {{plan.stoneReserve}} · 最多 {{plan.maxCycles}} 轮</small></div>
    <button class="training-start" :class="unchanged?'text-button':'primary'" data-testid="training-start" @click="emit('start',plan)" :disabled="!available||busy||running||blocked||unchanged||!quote.allowed">{{running?'已有活动进行中，请先暂停':unchanged?'打算未变 · 上方继续':(paused?'另行开始 · ':savedPlan?'确认重新安排':'开始')+(method==='natural'?'自然吐纳':'灵石辅助')}}</button>
   </template><template #parameters><details class="training-limits" data-testid="training-limits" name="ux30-training"><summary data-testid="training-limits-toggle">本段限额 · {{plan.until==='xp-cap'?'修为圆满即停':'限次潜修'}} · 最多 {{plan.maxCycles}} 轮</summary><div>
    <div class="training-choice"><label>修行目标 <select v-model="target" aria-label="修行目标"><option value="xp-cap">修为圆满即停</option><option v-for="n in [1,5,20,50]" :key="n" :value="String(n)">{{n}} 轮后停</option><option v-if="target!=='xp-cap'&&![1,5,20,50].includes(Number(target))" :value="target">{{target}} 轮后停</option></select></label><label v-if="target==='xp-cap'">最多轮数 <input v-model.number="capCycles" aria-label="圆满最多轮数" type="number" min="1" max="50" step="1"></label></div>
    <div class="training-budget"><p v-if="method==='natural'">自然吐纳不消耗灵石；当前保留线与安排上限仍保留。</p><label>累计上限 <input v-model.number="budget" @input="budgetInitialized=true" aria-label="累计灵石预算" type="number" min="0" step="1"></label><label>至少保留 <input v-model.number="reserve" aria-label="灵石保留量" type="number" min="0" step="1"></label></div>
   </div><p class="training-offline-note">本次为在线修炼。关闭或刷新保留成果与安排，继续后本轮重新计时，不补发离线收益。</p></details></template></CultivationSite>
   <footer class="catalogue-confirm"><div><small>{{goal.preview?.failure?.message??'准备已齐，可确认下一步。'}}</small><button v-if="!game.school&&game.core.player.realm!=='mortal'" @click="emit('school')">选择剑修或符修</button><button v-else-if="game.core.player.realm==='spirit'" data-testid="breakthrough" @click="emit('trial')">查看渡劫准备</button><button v-else-if="step.kind==='prepare'" data-testid="journey-prepare" @click="emit('prepare')">{{step.title}}</button><button v-else-if="goal.action" data-testid="breakthrough" @click="emit('act',goal.action)" :disabled="!can(goal.action)">{{goal.title}}</button></div><button data-testid="rest" @click="emit('act',{type:'REST'})" :disabled="!can({type:'REST'})">查看疗养安排 · 每次 30 秒<small>{{previewAction(game,{type:'REST'}).failure?.message}}</small></button></footer>
  </template>
 </section>
</template>

<style scoped>
.training-planner :deep(button){font-size:18px}
</style>
