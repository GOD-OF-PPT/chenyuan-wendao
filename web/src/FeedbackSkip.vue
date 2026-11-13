<script setup lang="ts">
import {inject,nextTick,onMounted,onScopeDispose,ref} from 'vue';
import {gameFocusKey} from './focus';
const emit=defineEmits<{hold:[];dismiss:[]}>(),focus=inject(gameFocusKey);
const button=ref<HTMLButtonElement>(),target=ref<HTMLElement|null>(null);
let alive=true,returning=false,app:Element|null=null;
function returnFocus(owned:boolean){
 if(!owned||returning)return;returning=true;
 void nextTick(()=>{if(app?.isConnected)focus?.restore(null);});
}
function dismiss(){
 if(!alive)return;
 const owned=document.activeElement===button.value;
 emit('dismiss');returnFocus(owned);
}
function hold(){app?.classList.add('feedback-held');emit('hold');}
function leave(){queueMicrotask(()=>{if(alive&&document.activeElement!==button.value)dismiss();});}
onMounted(()=>{
 target.value=document.querySelector<HTMLElement>('.game-hud .activity-rail>footer')??document.querySelector<HTMLElement>('[data-testid=training-activity]>footer,[data-testid=training-summary]>footer');
 app=target.value?.closest('.app-shell')??null;
});
onScopeDispose(()=>{alive=false;app?.classList.remove('feedback-held');returnFocus(document.activeElement===button.value);});
</script>
<template><Teleport v-if="target" :to="target"><button ref="button" type="button" class="feedback-skip" data-testid="fx-skip" aria-label="跳过本次提示演出" title="收起本次提示，已保存成果保留" @focusin="hold" @focusout="leave" @click="dismiss">略过提示</button></Teleport></template>
<style scoped>
@layer game{
.app-shell.art-theme .feedback-skip{position:relative;display:flex;align-items:center;justify-content:center;min-width:104px!important;max-width:none!important;min-height:44px;padding:6px 8px!important;border:1px solid #9fcab5!important;border-radius:8px!important;background:#173d3b!important;color:#e1efe2!important;font-size:var(--ui14)!important;line-height:1.4;box-shadow:none!important;pointer-events:auto}
.app-shell.art-theme .feedback-skip:focus-visible{outline:3px solid #c4edd6!important;outline-offset:-3px!important}
:global(.feedback-held .action-feedback-layer .action-motion),:global(.feedback-held .action-feedback-layer .action-motion *),:global(.feedback-held .action-feedback-layer .action-number){animation:none!important}}
</style>
