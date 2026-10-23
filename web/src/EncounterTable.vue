<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import {NPC_PORTRAITS,sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useNarrativeObject} from './narrative-effects';
import AssetImage from './AssetImage.vue';
import PortraitImage from './PortraitImage.vue';
import './narrative-objects.css';
const props=defineProps<{game:Game;mode:string;personId?:string;name?:string;seal?:string;eventId?:string;pending:boolean}>();
const portrait=computed(()=>NPC_PORTRAITS[props.personId??'']??props.personId??'');
const scene=computed(()=>scenePresentation(props.game));
const {store,phase,working,progress,effect,engaged,runtime,action}=useNarrativeObject(()=> 'fate',()=>props.mode==='events'?(props.eventId?'event:'+props.eventId:''):portrait.value,()=>props.mode!=='journal');
const state=computed(()=>store?.error?'failed':phase.value);
const verb=computed(()=>action.value?.type==='DECIDE'?'回应':'拜访');
</script>
<template>
 <div class="encounter-table narrative-object" data-testid="encounter-table" :data-mode="mode" :data-person="portrait" :data-state="phase" :data-status="state" :data-engaged="engaged" :data-working="working&&!store?.error">
  <nav v-if="mode==='people'" class="encounter-name-rack" aria-label="人物名笺"><slot name="people"/></nav>
  <aside class="encounter-presence" :class="{'encounter-letter':mode==='events','encounter-journal':mode==='journal'}">
   <figure v-if="portrait&&mode!=='journal'" class="encounter-figure"><PortraitImage class="encounter-portrait" :id="portrait" :fallback="seal||name?.slice(0,1)||'缘'"/><figcaption>{{name}}</figcaption></figure>
   <div v-else class="encounter-letter-object" aria-hidden="true"><i/><i/><i/><b>{{mode==='journal'?'记':'访'}}</b></div>
   <small>{{mode==='people'?'展开缘牍，只记已发生的来往':mode==='events'?(pending?'会面已保存 · 回应由你决定':'拜帖未递 · 核对后才拜访'):'此生行道手记 · 回看不推进年月'}}</small>
   <div v-if="engaged" class="narrative-object-cycle" role="status"><strong>{{verb}}{{phase==='saving'?'保存中 · 尚未落定':'进行中'}}</strong><span v-if="runtime&&phase==='running'" data-testid="encounter-clock">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span></div>
  </aside>
  <div class="encounter-canvas book-canvas" :class="mode==='people'?'fate-reading book-with-person':'book-landscape'" :data-testid="mode==='people'?'relationships':undefined" :data-person="mode==='people'?portrait:undefined">
   <AssetImage class="book-scenery" :path="sceneAssetPath(scene)" :asset-id="'reading-scene-'+scene.artKey"/>
   <div class="encounter-copy narrative-object-paper" :class="{'narrative-object-saved':!!effect&&!store?.error}"><slot/><i class="narrative-object-ink" :style="{'--ink-progress':(working&&!store?.error?progress:0)*100+'%'}" aria-hidden="true"/><small v-if="effect&&!store?.error" class="narrative-object-result" data-testid="encounter-result" :data-sequence="effect.sequence">本次已保存 · {{effect.notice.label}}</small></div>
   <div class="narrative-seal-space" aria-hidden="true"/>
  </div>
 </div>
</template>
