<script setup lang="ts">
import {computed,inject,onDeactivated,onScopeDispose,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
import type {Game} from '../../src/full/types';
import {NPC_PORTRAITS,sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useNarrativeObject} from './narrative-effects';
import AssetImage from './AssetImage.vue';
import PortraitImage from './PortraitImage.vue';
import './narrative-objects.css';
const props=defineProps<{game:Game;mode:string;personId?:string;name?:string;seal?:string;eventId?:string;pending:boolean}>();
const emit=defineEmits<{browse:[]}>();
const portrait=computed(()=>NPC_PORTRAITS[props.personId??'']??props.personId??'');
const scene=computed(()=>scenePresentation(props.game));
const {store,phase,working,progress,effect,engaged,runtime,action}=useNarrativeObject(()=> 'fate',()=>props.mode==='events'?(props.eventId?'event:'+props.eventId:''):portrait.value,()=>props.mode!=='journal');
const state=computed(()=>store?.error?'failed':phase.value);
const verb=computed(()=>action.value?.type==='DECIDE'?'回应':'拜访');
const focus=inject(gameFocusKey),people=ref<HTMLDialogElement>(),route=ref<HTMLDialogElement>(),instance=useId();
function close(){people.value?.close();route.value?.close();}
function open(dialog:HTMLDialogElement|undefined,event:Event){emit('browse');close();if(focus)focus.open(dialog,event.currentTarget as HTMLElement);else dialog?.showModal();}
function openRoute(event:Event){open(route.value,event);}
watch([()=>props.game.core.runId,()=>props.mode],close);
watch(()=>props.personId,()=>route.value?.close());
onDeactivated(close);onScopeDispose(()=>{focus?.release(people.value);focus?.release(route.value);});
</script>
<template>
 <div class="encounter-table narrative-object art12-encounter" :class="{'art30-meeting':['shen','lu','pei','yan'].includes(portrait)&&mode!=='journal'}" data-testid="encounter-table" :data-mode="mode" :data-person="portrait" :data-state="phase" :data-status="state" :data-engaged="engaged" :data-working="working&&!store?.error">
  <AssetImage v-if="['shen','lu','pei','yan'].includes(portrait)&&mode!=='journal'" class="art30-parlour" path="art/v2/workshops/npc-parlour-v1.webp" asset-id="npc-parlour" eager aria-hidden="true"><span class="art30-parlour-fallback"/></AssetImage>
  <header v-if="mode==='people'" class="encounter-controls"><button data-testid="fate-people-open" @click="open(people,$event)">换缘牍 · 四位人物</button></header>
  <aside class="encounter-presence" :class="{'encounter-letter':mode==='events','encounter-journal':mode==='journal'}">
   <figure v-if="portrait&&mode!=='journal'" class="encounter-figure"><PortraitImage class="encounter-portrait" :id="portrait" :fallback="seal||name?.slice(0,1)||'缘'"/><figcaption><h2>{{name}}</h2></figcaption></figure>
   <div v-else class="encounter-letter-object" aria-hidden="true"><i/><i/><i/><b>{{mode==='journal'?'记':'访'}}</b></div>
   <small v-if="mode!=='people'||pending">{{mode==='people'?'本次会面已保存 · 回应由你决定':mode==='events'?(pending?'会面已保存 · 回应由你决定':'拜帖未递 · 核对后才拜访'):'此生行道手记 · 回看不推进年月'}}</small>
   <div v-if="engaged" class="narrative-object-cycle" role="status"><strong>{{verb}}{{phase==='saving'?'保存中 · 尚未落定':'进行中'}}</strong><span v-if="runtime&&phase==='running'" data-testid="encounter-clock">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span></div>
  </aside>
  <div class="encounter-canvas book-canvas" :class="mode==='people'?'fate-reading book-with-person':'book-landscape'" :data-testid="mode==='people'?'relationships':undefined" :data-person="mode==='people'?portrait:undefined">
   <AssetImage class="book-scenery" :path="sceneAssetPath(scene)" :asset-id="'reading-scene-'+scene.artKey"/>
   <div class="encounter-copy narrative-object-paper" :class="{'narrative-object-saved':!!effect&&!store?.error}"><slot/><i class="narrative-object-ink" :style="{'--ink-progress':(working&&!store?.error?progress:0)*100+'%'}" aria-hidden="true"/><small v-if="effect&&!store?.error" class="narrative-object-result" data-testid="encounter-result" :data-sequence="effect.sequence">本次已保存 · {{effect.notice.label}}</small></div>
   <div class="narrative-seal-space" :class="{art30:['shen','lu','pei','yan'].includes(portrait)&&mode!=='journal'}" aria-hidden="true"/>
  </div>
  <footer v-if="$slots.decision" class="encounter-decision"><slot name="decision" :open-route="openRoute"/></footer>
  <dialog ref="people" class="fate-people-dialog art12-object-dialog" data-testid="fate-people-dialog" :aria-labelledby="instance+'-people'"><header><h3 :id="instance+'-people'" tabindex="-1" data-dialog-initial>换缘牍 · 选择只翻读</h3><button data-testid="fate-people-close" @click="close">返回当前缘牍</button></header><nav class="encounter-name-rack" aria-label="人物名笺"><slot name="people" :close="close"/></nav></dialog>
  <dialog ref="route" class="fate-route-dialog art12-object-dialog" data-testid="fate-route-dialog" :aria-labelledby="instance+'-route'"><header><h3 :id="instance+'-route'" tabindex="-1" data-dialog-initial>来往地点与后续</h3><button data-testid="fate-route-close" @click="close">返回缘牍</button></header><slot name="route" :close="close"/></dialog>
 </div>
</template>
