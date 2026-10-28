<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types.ts';
import {trialGuidance} from './trial-goal';
const props=defineProps<{game:Game;notice:string}>(),emit=defineEmits<{inspect:[Event]}>();
const view=computed(()=>trialGuidance(props.game));
</script>
<template>
 <section v-if="view" class="trial-goal" data-testid="trial-goal" :data-stage="view.stage">
  <div class="trial-goal-seal" aria-hidden="true"><span>{{view.mark}}</span><small>登仙问道</small></div>
  <div class="trial-goal-decision"><small class="trial-goal-subject">{{view.subject}}</small><h2 data-testid="target">{{view.title}}</h2><p class="trial-goal-state">{{view.state}}</p><p>{{view.detail}}</p><button class="primary" data-testid="trial-goal-inspect" @click="emit('inspect',$event)">{{view.verb}}</button><small>查看不行动，阅读与预选不计时。</small><p v-if="notice" role="status">{{notice}}</p></div>
  <ol class="trial-goal-road" aria-label="已保存的渡劫行程"><li v-for="step in view.steps" :key="step.id" :data-step-state="step.status" :aria-current="step.status==='current'?'step':undefined"><span aria-hidden="true">{{step.status==='complete'?'成':step.status==='current'?'今':'待'}}</span><strong>{{step.name}}</strong><small>{{step.status==='complete'?'已完成':step.status==='current'?'当前':'尚未开始'}}</small></li></ol>
 </section>
</template>
<style scoped>
.trial-goal{display:grid;grid-template-columns:240px minmax(0,1fr);gap:16px 36px;align-items:center;min-width:0;padding:12px 24px;color:#dce8d6}
.trial-goal-seal{width:210px;height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;justify-self:center;border-block:3px double #a5b185;border-radius:44% 44% 12% 12%;background:radial-gradient(ellipse,#467c6e66,#123d3e33 65%,transparent 70%);box-shadow:inset 0 0 0 10px #6a9b7c11;color:#dbdfb7}
.trial-goal-seal>span{font:104px/1.3 'Kaiti SC',STKaiti,serif;text-shadow:0 8px 14px #061e28}
.trial-goal-seal>small{font-size:14px;letter-spacing:.3em}
.trial-goal-decision{min-width:0;max-width:630px;display:grid;gap:10px;padding:16px 26px;border-left:2px solid #9bb58a88;background:linear-gradient(90deg,#12363de8,#102e34a6)}
.trial-goal-decision h2{font:28px/1.5 'Kaiti SC',STKaiti,serif;color:#eee6c5;margin:0}
.trial-goal-decision p{font-size:18px;line-height:1.65;margin:0}
.trial-goal-decision small{font-size:14px;line-height:1.55;color:#c2d7c3}
.trial-goal-state{color:#b9ddbd}
.trial-goal-decision button{min-height:48px;font-size:18px;width:100%;margin:4px 0}
.trial-goal-road{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;list-style:none;margin:0;padding:12px 0 0;border-top:1px solid #8aa27a66}
.trial-goal-road li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:4px 10px;align-items:center;min-width:0;color:#b6c5b7}
.trial-goal-road li>span{grid-row:1/3;display:grid;place-items:center;width:42px;height:48px;border:1px solid #8c9c7866;border-radius:50% 50% 3px 3px;font:24px/1.2 'Kaiti SC',STKaiti,serif}
.trial-goal-road strong{font-size:18px;font-weight:400;line-height:1.5}.trial-goal-road small{font-size:14px;line-height:1.5}
.trial-goal-road [data-step-state=current]{color:#e1dfb5}.trial-goal-road [data-step-state=complete]{color:#afd8ba}
</style>
