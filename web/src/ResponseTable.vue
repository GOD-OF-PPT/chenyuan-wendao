<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Action,Game} from '../../src/full/types';
import {canonicalFingerprint as proof} from '../../src/full/receipts';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useNarrativeObject} from './narrative-effects';
import AssetImage from './AssetImage.vue';
import PortraitImage from './PortraitImage.vue';
import './narrative-objects.css';
const props=defineProps<{game:Game;mode:string;identity:string;portrait:string;speaker:string;action:Action|null}>();
const scene=computed(()=>scenePresentation(props.game));
const {store,phase:cyclePhase,working:running,progress,effect:result,engaged:owned,runtime,action:cycleAction}=useNarrativeObject(()=> 'response',()=>props.identity);
const same=(a:Action|null,b:Action|null)=>!!a&&!!b&&proof(a)===proof(b);
const abandoned=ref<number|null>(null);
watch(()=>props.action?proof(props.action):null,()=>{if(result.value)abandoned.value=result.value.sequence;},{flush:'sync'});
const engaged=computed(()=>owned.value&&same(props.action,cycleAction.value)),phase=computed(()=>engaged.value?cyclePhase.value:'idle'),working=computed(()=>engaged.value&&running.value),effect=computed(()=>result.value&&result.value.sequence!==abandoned.value&&same(props.action,result.value.action)?result.value:null);
const state=computed(()=>store?.error?'failed':phase.value);
</script>
<template>
 <div class="response-table narrative-object" data-testid="response-table" :data-mode="mode" :data-model="identity" :data-action="action?.type" :data-state="phase" :data-status="state" :data-engaged="engaged" :data-working="working&&!store?.error">
  <aside class="response-presence"><figure class="response-figure"><PortraitImage class="response-portrait" :id="portrait" :fallback="speaker.slice(0,1)"/><figcaption>{{speaker}}</figcaption></figure><small>{{mode==='choices'?'先择一签 · 预选不作回应':'先读来由，再决定如何回应'}}</small><div v-if="engaged" class="narrative-object-cycle" role="status"><strong>{{phase==='saving'?'落笔保存中 · 尚未落定':'所选回应进行中'}}</strong><span v-if="runtime&&phase==='running'" data-testid="response-clock">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span></div></aside>
  <nav v-if="mode==='choices'" class="response-sign-rack" aria-label="回应签 · 预选不执行"><slot name="choices"/></nav>
  <div class="response-canvas book-canvas book-with-person" :data-gate="scene.gate"><AssetImage class="book-scenery" :path="sceneAssetPath(scene)" :asset-id="'reading-scene-'+scene.artKey"/><div class="response-copy narrative-object-paper" :class="{'narrative-object-saved':!!effect&&!store?.error}"><slot/><i class="narrative-object-ink" :style="{'--ink-progress':(working&&!store?.error?progress:0)*100+'%'}" aria-hidden="true"/><small v-if="effect&&!store?.error" class="narrative-object-result" data-testid="response-result" :data-sequence="effect.sequence">本次已保存 · {{effect.notice.label}}</small></div><div class="narrative-seal-space" aria-hidden="true"/></div>
 </div>
</template>
