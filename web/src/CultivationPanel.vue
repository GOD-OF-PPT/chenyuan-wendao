<script setup lang="ts">
import {computed,ref} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {previewAction,getBreakthroughGoal} from '../../src/full/queries.ts';
import {nextStep} from './play-flow';
import {actionSeconds} from './action-timing';
import BatchPreview from './BatchPreview.vue';
const props=defineProps<{game:Game;busy:boolean;available:boolean;count:number|'target'}>(),emit=defineEmits<{act:[Action];prepare:[];trial:[];school:[];home:[];cave:[];'update:count':[number|'target']}>();
const method=ref<'natural'|'assisted'>('natural'),count=computed({get:()=>props.count,set:(v:number|'target')=>emit('update:count',v)}),realm=computed(()=>C.realms[props.game.core.player.realm]),step=computed(()=>nextStep(props.game)),goal=computed(()=>getBreakthroughGoal(props.game));
const chosen=computed<Action>(()=>({type:'CULTIVATE',method:method.value,count:count.value==='target'?C.maxBatch:count.value})),label=computed(()=>method.value==='natural'?'自然吐纳':'灵石辅助');
const cache=computed(()=>({game:props.game,map:new Map<string,ReturnType<typeof previewAction>>() }));
function quote(a:Action){const c=cache.value,key=JSON.stringify(a);if(!c.map.has(key))c.map.set(key,previewAction(c.game,a));return c.map.get(key)!;}
const can=(a:Action)=>props.available&&!props.busy&&quote(a).allowed;
</script>
<template>
 <section class="paper play-catalogue cultivation-catalogue" data-testid="cultivation-catalogue" tabindex="-1"><header><div><small>修为 {{game.core.player.xp}} / {{realm.xpCap}}<span v-if="realm.pill&&game.core.inventory[realm.pill]>0" data-testid="growth-pill-ready"> · {{C.items[realm.pill].name}}已备齐</span></small></div></header>
  <div v-if="game.core.world.location!=='cave'" class="catalogue-empty"><strong>返回听雨洞府修炼</strong><button class="primary" data-testid="return-cave" @click="emit('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府</button></div>
  <template v-else><div class="catalogue-options"><label>吐纳批次 <select v-model.number="count" aria-label="吐纳行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到目标</option></select></label><button v-if="!game.school&&game.core.player.realm!=='mortal'" @click="emit('school')">选择剑修或符修</button></div>
   <nav class="catalogue-tabs" aria-label="修炼方式"><button v-for="m in ['natural','assisted'] as const" :key="m" :data-testid="'cultivation-method-'+m" :aria-pressed="method===m" @click="method=m">{{m==='natural'?'自然吐纳':'灵石辅助'}}</button></nav>
   <div class="catalogue-grid cultivation-budget"><article><BatchPreview :label="label" :preview="quote(chosen)"/><button class="primary" :data-testid="method==='natural'?'cultivate':'cultivate-assisted'" @click="emit('act',chosen)" :disabled="!can(chosen)">{{label}} · {{actionSeconds(chosen)}} 秒</button></article></div>
   <footer class="catalogue-confirm"><div><small>{{goal.preview?.failure?.message??'条件已齐，可确认下一步。'}}</small><button v-if="game.core.player.realm==='spirit'" data-testid="breakthrough" @click="emit('trial')" :disabled="busy||!available">查看渡劫准备</button><button v-else-if="step.kind==='prepare'" class="primary" data-testid="journey-prepare" @click="emit('prepare')">{{step.title}} →</button><button v-else-if="goal.action" data-testid="breakthrough" @click="emit('act',goal.action)" :disabled="!can(goal.action)">{{goal.title}}</button></div><button data-testid="rest" @click="emit('act',{type:'REST'})" :disabled="!can({type:'REST'})">洞府疗养 · {{actionSeconds({type:'REST'})}} 秒<small>{{quote({type:'REST'}).failure?.message}}</small></button></footer>
  </template>
 </section>
</template>
