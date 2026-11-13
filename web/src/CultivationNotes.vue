<script setup lang="ts">
import {inject,onDeactivated,onScopeDispose,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
const props=withDefaults(defineProps<{identity:string;context:string;purpose?:string;label?:string;prefix?:string;selection?:string;rich?:boolean}>(),{purpose:'安排 · 取舍 · 回看',label:'修行手记',prefix:'cultivation',selection:'button',rich:false});
const focus=inject(gameFocusKey),dialog=ref<HTMLDialogElement>(),opener=ref<HTMLButtonElement>(),options=ref<HTMLElement>(),panelId='cultivation-notes-'+useId();
function close(){dialog.value?.close();}
function open(){if(focus)focus.open(dialog.value,opener.value??null);else dialog.value?.showModal();}
function selectView(event:Event){if(!(event.target instanceof Element)||!event.target.closest(props.selection))return;close();focus?.target(opener.value??null);}
watch(options,(node,_,cleanup)=>{if(!node)return;node.addEventListener('click',selectView,true);cleanup(()=>node.removeEventListener('click',selectView,true));},{flush:'post'});
watch(()=>props.identity,close,{flush:'sync'});
onDeactivated(close);
onScopeDispose(()=>focus?.release(dialog.value));
</script>
<template>
 <div class="cultivation-notes">
  <button ref="opener" class="cultivation-notes-open" :data-testid="prefix+'-notes-open'" aria-haspopup="dialog" :aria-controls="panelId" @click="open"><span class="cultivation-notes-book" aria-hidden="true"><i/><i/></span><span><strong>{{label}}</strong><small>{{purpose}}</small></span><span aria-hidden="true">›</span></button>
  <dialog :id="panelId" ref="dialog" class="cultivation-notes-dialog" :class="{'notes-rich-dialog':rich}" :data-testid="prefix+'-notes-dialog'" :aria-labelledby="panelId+'-title'"><header><h3 :id="panelId+'-title'" tabindex="-1" data-dialog-initial>{{label}}</h3><button :data-testid="prefix+'-notes-close'" @click="close">合上手记</button></header><p class="cultivation-notes-context">{{context}}</p><small>选择条目只查看详情；不会开始行动或改变原安排。</small><nav ref="options" class="cultivation-notes-options" :class="{'notes-rich':rich}" :aria-label="label+'条目'"><slot/></nav></dialog>
 </div>
</template>
<style scoped>
@layer game{
.cultivation-notes{min-width:0;align-self:start}
.cultivation-notes-open{display:flex!important;align-items:center;gap:12px;min-height:48px;padding:4px 8px!important;border:0!important;border-bottom:1px solid #8cb49e66!important;border-radius:0!important;background:none!important;box-shadow:none!important;text-align:left;color:#c8e1ca!important;font-size:18px!important}
.cultivation-notes-open strong,.cultivation-notes-open small{display:block;font-weight:400;line-height:1.4}.cultivation-notes-open strong{font-size:18px}#app .cultivation-notes-open small{font-size:14px;color:#b7d0bd;line-height:1.65}
.cultivation-notes-book{position:relative;display:block;flex:none;width:36px;height:38px;border:2px solid #9ba77d;border-radius:5px 2px 2px 5px;background:repeating-linear-gradient(0deg,#285346 0 3px,#21463e 4px 6px);box-shadow:3px 2px #071f24}
.cultivation-notes-book i{position:absolute;inset:4px 5px 4px 8px;border-block:1px solid #a5bb9155;transform-origin:left;transition:transform .15s}.cultivation-notes-book i+i{inset:9px 5px;border-block-color:#c6d3a866}.cultivation-notes-open:is(:hover,:focus-visible) .cultivation-notes-book i{transform:rotate(-5deg)}
.cultivation-notes-dialog{width:640px;padding:20px 26px;color:#e2ead7;border:1px solid #9db78c;border-radius:5px 2px;background:linear-gradient(120deg,#193e3d,#0c2c33);overflow:visible;max-height:none}
.cultivation-notes-dialog>header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:0}.cultivation-notes-dialog h3{margin:0;font-size:26px;line-height:1.65}.cultivation-notes-dialog>header>button{min-height:44px;font-size:18px}.cultivation-notes-context{margin:8px 0;font-size:18px;line-height:1.5}.cultivation-notes-dialog>small{font-size:14px;line-height:1.5}
.cultivation-notes-options{margin-top:14px}.cultivation-notes-options :deep(.art06-secondary-actions){display:grid;grid-template-columns:1fr;gap:8px}
.cultivation-notes-options:not(.notes-rich) :deep(button){display:block;width:100%;min-height:48px;margin:0;padding:10px 14px;border:0;border-bottom:1px solid #93b99b66;border-radius:1px;background:#183e3d!important;color:#e1ebd4;font-size:18px!important;line-height:1.5;text-align:left}.cultivation-notes-options:not(.notes-rich)>:deep(button+button){margin-top:8px}
.cultivation-notes-dialog.notes-rich-dialog{width:960px}
:global(.hub-reduced .cultivation-notes .cultivation-notes-book i){transition:none!important;transform:none!important}
@media(prefers-reduced-motion:reduce){.cultivation-notes-book i{transition:none!important;transform:none!important}}}
</style>
