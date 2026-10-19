<script setup lang="ts">
import {computed,ref} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {previewAction,getBreakthroughGoal} from '../../src/full/queries.ts';
import {nextStep} from './play-flow';
import {formatCosts} from './presentation';
import {actionSeconds} from './action-timing';
const props=defineProps<{game:Game;busy:boolean;available:boolean}>(),emit=defineEmits<{act:[Action];prepare:[];school:[];home:[];cave:[]}>();
const count=ref(50),realm=computed(()=>C.realms[props.game.core.player.realm]),step=computed(()=>nextStep(props.game)),goal=computed(()=>getBreakthroughGoal(props.game));
const natural=computed<Action>(()=>({type:'CULTIVATE',method:'natural',count:count.value})),assisted=computed<Action>(()=>({type:'CULTIVATE',method:'assisted',count:count.value}));
const cache=computed(()=>({game:props.game,map:new Map<string,ReturnType<typeof previewAction>>() }));
function quote(a:Action){const c=cache.value,key=JSON.stringify(a);if(!c.map.has(key))c.map.set(key,previewAction(c.game,a));return c.map.get(key)!;}
const can=(a:Action)=>props.available&&!props.busy&&quote(a).allowed;
</script>
<template>
 <section class="paper play-catalogue cultivation-catalogue" data-testid="cultivation-catalogue" tabindex="-1"><header><div><h2>{{realm.name}}修行</h2><small>修为 {{game.core.player.xp}} / {{realm.xpCap}}<span v-if="realm.pill&&game.core.inventory[realm.pill]>0" data-testid="growth-pill-ready"> · {{C.items[realm.pill].name}}已备齐</span></small></div><button @click="emit('home')">返回主舞台</button></header>
  <div v-if="game.core.world.location!=='cave'" class="catalogue-empty"><strong>返回听雨洞府修炼</strong><button class="primary" data-testid="return-cave" @click="emit('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府</button></div>
  <template v-else><div class="catalogue-options"><label>吐纳批次 <select v-model.number="count" aria-label="吐纳行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次 / 圆满即停</option></select></label><button v-if="!game.school&&game.core.player.realm!=='mortal'" @click="emit('school')">选择剑修或符修</button></div>
   <div class="catalogue-grid"><article v-for="[label,a] in [['自然吐纳',natural],['灵石辅助',assisted]] as const" :key="label"><strong>{{label}}<span v-if="quote(a).delta"> · 预计修为 {{quote(a).delta!.xp>0?'+':''}}{{quote(a).delta!.xp}}</span></strong><small>{{formatCosts(quote(a).actualCosts??quote(a).costs)}} · 整批 {{actionSeconds(a)}} 秒</small><button :data-testid="label==='自然吐纳'?'cultivate':'cultivate-assisted'" @click="emit('act',a)" :disabled="!can(a)">{{label}}</button><small>{{quote(a).failure?.message}}</small></article></div>
   <footer class="catalogue-confirm"><div><small>{{goal.preview?.failure?.message??'条件已齐，可确认下一步。'}}</small><button v-if="step.kind==='prepare'" class="primary" data-testid="journey-prepare" @click="emit('prepare')">{{step.title}} →</button><button v-else-if="goal.action" data-testid="breakthrough" @click="emit('act',goal.action)" :disabled="!can(goal.action)">{{goal.title}}</button></div><button data-testid="rest" @click="emit('act',{type:'REST'})" :disabled="!can({type:'REST'})">洞府疗养 · {{actionSeconds({type:'REST'})}} 秒<small>{{quote({type:'REST'}).failure?.message}}</small></button></footer>
  </template>
 </section>
</template>
