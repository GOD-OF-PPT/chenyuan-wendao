<script setup lang="ts">
import {computed,inject,onMounted,onScopeDispose,ref,useId} from 'vue';
import {gameFocusKey} from './focus';
import type {GameConfirmation} from './use-game-confirmation';
import GameIcon from './GameIcon.vue';
const props=defineProps<{request:GameConfirmation}>(),emit=defineEmits<{answer:[boolean]}>();
const dialog=ref<HTMLDialogElement>(),focus=inject(gameFocusKey,undefined),id='game-confirm-'+useId();
const appearance=computed(()=>props.request.appearance()),stale=computed(()=>!props.request.current());
const blocked=computed(()=>stale.value?'当前内容已变化，请合上核对后再决定；本次没有执行。':props.request.blocked?.()??'');
function confirm(){if(!blocked.value)emit('answer',true);}
onMounted(()=>{if(focus)focus.open(dialog.value,props.request.opener??null);else{dialog.value?.showModal();dialog.value?.querySelector<HTMLElement>('[data-dialog-initial]')?.focus();}});
onScopeDispose(()=>{if(focus)focus.release(dialog.value);else dialog.value?.close();});
</script>
<template>
 <Teleport to="body"><div class="art18-confirm-portal art-theme" :class="{'hub-reduced':appearance.reduceMotion}" :style="{'--font-scale':appearance.fontScale}">
  <dialog ref="dialog" class="game-confirmation" data-testid="game-confirmation" :data-kind="request.kind" :data-stale="stale" :aria-labelledby="id" @cancel.prevent="emit('answer',false)" @close="emit('answer',false)">
   <header><div><span class="eyebrow">{{request.kind==='light-action'?'此刻回应 · 确认后行动':'留卷抉择 · 确认后才执行'}}</span><h2 :id="id" tabindex="-1" data-dialog-initial>{{request.title}}</h2></div><button type="button" data-testid="game-confirmation-close" aria-label="取消确认" @click="emit('answer',false)"><GameIcon kind="action" id="close"/></button></header>
   <p class="game-confirmation-message" data-testid="game-confirmation-message">{{request.message}}</p>
   <p v-if="blocked" class="game-confirmation-block" role="status" data-testid="game-confirmation-blocked">{{blocked}}</p>
   <footer><button type="button" data-testid="game-confirmation-cancel" @click="emit('answer',false)">{{request.cancel??'暂不更动'}}</button><button type="button" class="primary" :class="{danger:request.kind!=='light-action'}" data-testid="game-confirmation-confirm" :disabled="!!blocked" @click="confirm">{{request.action}}</button></footer>
  </dialog>
 </div></Teleport>
</template>
<style scoped>
.art18-confirm-portal{display:contents}.game-confirmation{position:fixed;inset:0;margin:auto;width:600px;max-width:calc(100vw - 48px);max-height:calc(100dvh - 48px);padding:26px 30px;border:1px solid #a28f60;background:#102f35;color:#eee9d3;font-family:'Songti SC',STSong,serif;font-size:calc(18px * var(--font-scale,1));line-height:1.6;box-sizing:border-box}
.game-confirmation header{display:flex;justify-content:space-between;align-items:start;gap:18px}.game-confirmation h2{margin:4px 0 12px;font-family:'Kaiti SC',STKaiti,serif;font-size:calc(28px * var(--font-scale,1));line-height:1.4}.game-confirmation .eyebrow{font-size:calc(14px * var(--font-scale,1));color:#c6d8c1}.game-confirmation header>button{width:44px;min-width:44px;height:44px;padding:8px}.game-confirmation header .game-icon{width:24px;height:24px}.game-confirmation-message{white-space:pre-line;overflow-wrap:anywhere;margin:12px 0 22px}.game-confirmation-block{padding:8px 12px;border-left:2px solid #d1a57c;color:#f0d9bd;font-size:calc(18px * var(--font-scale,1))}.game-confirmation footer{display:flex;justify-content:flex-end;gap:14px;flex-wrap:wrap}.game-confirmation button{font:inherit;min-height:44px;padding:8px 18px}
</style>
