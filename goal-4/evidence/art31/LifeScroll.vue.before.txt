<script setup lang="ts">
import {computed,inject,onDeactivated,onScopeDispose,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
import type {Game} from '../../src/full/types';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useNarrativeObject} from './narrative-effects';
import AssetImage from './AssetImage.vue';
import './narrative-objects.css';
const props=defineProps<{game:Game;mode:string}>();
const focus=inject(gameFocusKey),management=ref<HTMLDialogElement>(),opener=ref<HTMLButtonElement>(),titleId=useId();
function close(){if(management.value?.open){management.value.close();focus?.target(opener.value??null);}}
function open(event:Event){if(focus)focus.open(management.value,event.currentTarget as HTMLElement);else management.value?.showModal();}
watch(()=>props.game.core.runId,()=>management.value?.close());onDeactivated(()=>management.value?.close());onScopeDispose(()=>focus?.release(management.value));
const scene=computed(()=>scenePresentation(props.game));
const {store,phase,working,progress,effect,engaged,runtime}=useNarrativeObject(()=> 'life',()=>props.game.core.runId);
const state=computed(()=>store?.error?'failed':phase.value);
const seal=computed(()=>props.game.status==='active'?'此卷未封':props.game.status==='ascended'?'飞升封卷':props.game.ending==='retired'?'归隐收卷':props.game.ending==='lifespan'?'寿尽收卷':'此生已收卷');
</script>
<template>
 <div class="life-scroll narrative-object" data-testid="life-scroll" :data-mode="mode" :data-life="game.status" :data-sealed="game.status!=='active'" :data-state="phase" :data-status="state" :data-engaged="engaged" :data-working="working&&!store?.error">
  <div class="life-scroll-title"><slot name="heading"/></div>
  <nav class="life-scroll-bookmarks" aria-label="命卷篇章书签"><slot name="chapters"/></nav>
  <div class="life-scroll-canvas book-canvas book-landscape" :data-gate="scene.gate"><AssetImage class="book-scenery" :path="sceneAssetPath(scene)" :asset-id="'reading-scene-'+scene.artKey"/><i class="life-scroll-rod rod-top" aria-hidden="true"/><i class="life-scroll-rod rod-bottom" aria-hidden="true"/>
   <div class="life-scroll-copy narrative-object-paper" :class="{'narrative-object-saved':!!effect&&!store?.error}"><div v-if="engaged" class="narrative-object-cycle" role="status"><strong>{{phase==='saving'?'封卷保存中 · 尚未落定':'已安排收卷一次'}}</strong><span v-if="runtime&&phase==='running'" data-testid="life-scroll-clock">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span></div><slot/><i class="narrative-object-ink" :style="{'--ink-progress':(working&&!store?.error?progress:0)*100+'%'}" aria-hidden="true"/><small v-if="effect&&!store?.error" class="narrative-object-result" data-testid="life-scroll-result" :data-sequence="effect.sequence">本次已保存 · {{effect.notice.label}}</small></div>
   <div class="narrative-seal-space" aria-hidden="true"/><div class="life-scroll-binding"><i class="life-scroll-cord" aria-hidden="true"/><strong>{{seal}}</strong></div>
  </div>
  <div class="life-scroll-tools"><small>翻卷只阅读，不推进年月。</small><button ref="opener" data-testid="life-manage-open" @click="open">{{game.status==='active'?'卷尾处理 · 导出与收卷':'卷尾留存 · 导出与恢复'}}</button></div>
  <dialog ref="management" class="art12-object-dialog life-management" data-testid="life-manage-dialog" :aria-labelledby="titleId"><header><h3 :id="titleId" tabindex="-1" data-dialog-initial>此生命卷 · 处理与留存</h3><button data-testid="life-manage-close" @click="close">返回当前卷页</button></header><slot name="management" :close="close"/><small>生平文本不含完整进度；恢复时须另行导出存档。</small></dialog>
 </div>
</template>
