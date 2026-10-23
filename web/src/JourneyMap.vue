<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import * as C from '../../src/full/content';
import {SCENE_ASSETS} from './assets';
import {useActivityPresentation} from './use-activity-effect';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import './art02-journey.css';
const props=defineProps<{game:Game;selected:C.LocationId}>();
const emit=defineEmits<{select:[C.LocationId]}>();
const points:Record<C.LocationId,[number,number]>={cave:[17,28],wilderness:[49,23],market:[81,28],sect:[17,72],secret:[49,77],terrace:[81,72]};
const locations=Object.keys(C.locations) as C.LocationId[];
const {store,activity,runtime,working,progress,phase,effect}=useActivityPresentation(a=>a.version===6&&a.plan.kind==='travel'&&a.plan.location===props.selected,()=>props.game.core.runId+':'+props.selected);
const state=computed(()=>store?.error?'failed':runtime.value?phase.value:activity.value?.status??'idle');
const status=computed(()=>state.value==='failed'?'存档待核对 · 已停步':phase.value==='saving'?'抵达保存中 · 尚未确认':working.value?'行路中':activity.value?.status==='paused'?'行路已暂停':props.selected===props.game.core.world.location?'当前所在 · 已抵达':'目的地预览 · 尚未抵达');
const marker=computed(()=>{const from=points[props.game.core.world.location],to=points[props.selected];return{left:(from[0]+(to[0]-from[0])*progress.value)+'%',top:(from[1]+(to[1]-from[1])*progress.value)+'%'};});
const line=computed(()=>{const a=points[props.game.core.world.location],b=points[props.selected];return`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`;});
</script>
<template>
 <div class="journey-map" data-testid="journey-map" :data-state="state" :data-working="working">
  <div class="journey-landscape">
   <AssetImage class="journey-painting" :path="SCENE_ASSETS[selected]" :asset-id="'travel-destination-'+selected" eager/>
   <div class="journey-caption"><strong>{{C.locations[selected].name}}</strong><span data-testid="journey-state" :data-phase="phase" :data-working="working">{{status}}</span><small v-if="runtime">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</small></div>
   <svg class="journey-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path v-if="selected!==game.core.world.location" :d="line"/></svg>
   <nav class="journey-signposts" aria-label="目的地选择"><button v-for="id in locations" :key="id" :data-testid="'travel-'+id" :aria-pressed="selected===id" :data-current="game.core.world.location===id" :style="{left:points[id][0]+'%',top:points[id][1]+'%'}" @click="emit('select',id)"><GameIcon kind="nav" id="explore"/><strong>{{C.locations[id].name}}</strong><small>{{game.core.world.location===id?'当前所在':'需'+C.realms[C.locations[id].min].name}}</small></button></nav>
   <span v-if="working" class="journey-traveller" data-testid="journey-route-marker" :style="marker" aria-hidden="true">行</span>
   <span v-if="effect?.notice.family==='travel'" :key="effect.sequence" class="journey-arrival" data-testid="journey-arrival" :data-sequence="effect.sequence" role="status">已保存抵达 · {{C.locations[game.core.world.location].name}}</span>
  </div>
  <div class="journey-decision"><strong>当前：{{C.locations[game.core.world.location].name}} → {{C.locations[selected].name}}</strong><p>{{C.locations[selected].description}}</p><small>一次6秒 · 不消耗游戏月 · 抵达即停。到达后不会自动取材、采购、研习或挑战。</small><small>路标为目的地示意；点选只查看，确认行路后才移动。</small></div>
 </div>
</template>
