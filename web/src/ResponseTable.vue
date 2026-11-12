<script setup lang="ts">
import {computed,inject,onDeactivated,onScopeDispose,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
import type {Action,Game} from '../../src/full/types';
import {canonicalFingerprint as proof} from '../../src/full/receipts';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {responseContext} from './response-context';
import {useNarrativeObject} from './narrative-effects';
import AssetImage from './AssetImage.vue';
import PortraitImage from './PortraitImage.vue';
import './narrative-objects.css';
const props=defineProps<{game:Game;mode:string;identity:string;portrait:string;speaker:string;action:Action|null;inlineChoices?:boolean}>();
const scene=computed(()=>scenePresentation(props.game));
const {store,phase:cyclePhase,working:running,progress,effect:result,engaged:owned,runtime,action:cycleAction}=useNarrativeObject(()=> 'response',()=>props.identity);
const same=(a:Action|null,b:Action|null)=>!!a&&!!b&&proof(a)===proof(b);
const abandoned=ref<number|null>(null);
watch(()=>props.action?proof(props.action):null,()=>{if(result.value)abandoned.value=result.value.sequence;},{flush:'sync'});
const engaged=computed(()=>owned.value&&same(props.action,cycleAction.value)),phase=computed(()=>engaged.value?cyclePhase.value:'idle'),working=computed(()=>engaged.value&&running.value),effect=computed(()=>result.value&&result.value.sequence!==abandoned.value&&same(props.action,result.value.action)?result.value:null);
const state=computed(()=>store?.error?'failed':phase.value);
const context=computed(()=>responseContext({game:props.game,identity:props.identity,mode:props.mode,action:props.action,activity:store?.activity??null,runtime:runtime.value,owned:!!store?.activityOwned,busy:!!store?.busy,blocked:!!(store?.error||store?.syncIssue||!store?.available),pausing:!!store?.activityPausing}));
const focus=inject(gameFocusKey),choices=ref<HTMLDialogElement>(),title=useId();
function close(){choices.value?.close();}
function open(event:Event){if(focus)focus.open(choices.value,event.currentTarget as HTMLElement);else choices.value?.showModal();}
watch([()=>props.game.core.runId,()=>props.identity,()=>props.mode],close);
onDeactivated(close);onScopeDispose(()=>focus?.release(choices.value));
</script>
<template>
 <div class="response-table narrative-object art12-response" :class="{'art30-meeting':['shen','lu','pei','yan'].includes(portrait),'art32-threshold':['question','ending'].includes(identity)}" data-testid="response-table" :data-mode="mode" :data-model="identity" :data-action="action?.type" :data-state="phase" :data-status="state" :data-engaged="engaged" :data-working="working&&!store?.error">
  <AssetImage v-if="['shen','lu','pei','yan'].includes(portrait)" class="art30-parlour" path="art/v2/workshops/npc-parlour-v1.webp" asset-id="npc-parlour" eager aria-hidden="true"><span class="art30-parlour-fallback"/></AssetImage>
  <AssetImage v-if="['question','ending'].includes(identity)" class="art32-scene" :path="'art/v2/milestones/'+(identity==='question'?'heart-court-v1.webp':'heaven-gate-v1.webp')" :asset-id="'milestone-'+identity" fit="contain" eager aria-hidden="true"><span class="art32-scene-fallback"/></AssetImage><i v-if="['question','ending'].includes(identity)" class="art32-pulse" aria-hidden="true"/>
  <aside class="response-presence"><figure class="response-figure"><PortraitImage v-if="!['question','ending'].includes(identity)" class="response-portrait" :id="portrait" :fallback="speaker.slice(0,1)"/><AssetImage v-else path="art/v2/actors/player-standing-cold-v1.webp" asset-id="milestone-player" fit="contain" class="response-portrait" aria-hidden="true"><span class="portrait-fallback">{{speaker.slice(0,1)}}</span></AssetImage><figcaption>{{speaker}}</figcaption></figure><small data-testid="response-context" :data-context="context.state">{{context.caption}}</small><div v-if="engaged" class="narrative-object-cycle" role="status"><strong>{{phase==='saving'?'落笔保存中 · 尚未落定':'所选回应进行中'}}</strong><span v-if="runtime&&phase==='running'" data-testid="response-clock">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span></div></aside>
  <header v-if="mode==='choices'&&!inlineChoices" class="response-sign-control"><button data-testid="response-choices-open" @click="open">换回应签 · 全部选项</button></header>
  <div class="response-canvas book-canvas book-with-person" :style="inlineChoices?{gridTemplateColumns:'minmax(0,1fr)',alignItems:'stretch'}:undefined" :data-gate="scene.gate"><AssetImage class="book-scenery" :path="sceneAssetPath(scene)" :asset-id="'reading-scene-'+scene.artKey"/><div class="response-copy narrative-object-paper" :style="inlineChoices?{maxWidth:'none',alignSelf:'stretch'}:undefined" :class="{'narrative-object-saved':!!effect&&!store?.error}"><slot/><i class="narrative-object-ink" :style="{'--ink-progress':(working&&!store?.error?progress:0)*100+'%'}" aria-hidden="true"/><small v-if="effect&&!store?.error" class="narrative-object-result" data-testid="response-result" :data-sequence="effect.sequence">本次已保存 · {{effect.notice.label}}</small></div><div class="narrative-seal-space" :class="{art30:['shen','lu','pei','yan'].includes(portrait)}" aria-hidden="true"/></div>
  <dialog ref="choices" class="response-choices-dialog art12-object-dialog" data-testid="response-choices-dialog" :aria-labelledby="title"><header><h3 :id="title" tabindex="-1" data-dialog-initial>择一回应签 · 预选不执行</h3><button data-testid="response-choices-close" @click="close">合上回应签</button></header><nav class="response-sign-rack" aria-label="回应签 · 预选不执行"><slot name="choices" :close="close"/></nav></dialog>
 </div>
</template>
