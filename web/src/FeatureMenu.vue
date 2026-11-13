<script setup lang="ts">
import {inject,nextTick,onActivated,onDeactivated,onScopeDispose,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
const props=defineProps<{identity:string;guide:boolean;preparation:boolean;goal:boolean;blueprints:boolean;sealed:boolean}>();
const emit=defineEmits<{guide:[];preparation:[];goal:[];blueprints:[];browse:[]}>();
const focus=inject(gameFocusKey),opener=ref<HTMLButtonElement>(),dialog=ref<HTMLDialogElement>(),opened=ref(false),title=useId();
let active=true,generation=0;
function close(){opened.value=false;dialog.value?.close();}
function open(){emit('browse');opened.value=true;if(focus)focus.open(dialog.value,opener.value??null);else dialog.value?.showModal();}
async function choose(kind:'guide'|'preparation'|'goal'|'blueprints'){
  const owner=++generation;close();await nextTick();
  if(!active||owner!==generation)return;
  if(focus)focus.target(opener.value??null);else opener.value?.focus();
  if(kind==='guide')emit('guide');
  else if(kind==='preparation')emit('preparation');
  else if(kind==='goal')emit('goal');
  else emit('blueprints');
}
watch(()=>props.identity,()=>{generation++;close();});
onActivated(()=>active=true);
onDeactivated(()=>{active=false;generation++;close();});
onScopeDispose(()=>{active=false;generation++;focus?.release(dialog.value);});
</script>
<template>
 <div class="feature-tools">
  <button ref="opener" data-testid="feature-menu-open" aria-haspopup="dialog" :aria-expanded="opened" @click="open">行道菜单 ⋯</button>
  <dialog ref="dialog" class="paper feature-tools-dialog" data-testid="feature-menu-dialog" :aria-labelledby="title" @close="opened=false">
   <header><h2 :id="title" tabindex="-1" data-dialog-initial>行道菜单</h2><button aria-label="关闭行道菜单" @click="close">合上</button></header>
   <nav aria-label="当前页面工具">
    <button v-if="goal" data-testid="feature-goal" @click="choose('goal')">{{sealed?'此卷历程':'当前目标'}}</button>
    <button v-if="preparation" data-testid="feature-prepare" @click="choose('preparation')">突破筹备</button>
    <button v-if="guide" data-testid="guide-open" @click="choose('guide')">玩法指引</button>
    <button v-if="blueprints" data-testid="feature-blueprints" @click="choose('blueprints')">翻阅未来器谱 · 只看</button>
   </nav>
  </dialog>
 </div>
</template>
<style scoped>
@layer game{
.feature-tools-dialog{width:420px;padding:24px;color:var(--game-ink,currentColor);border:1px solid var(--game-line,var(--line));background:var(--game-panel,var(--paper))}
.feature-tools-dialog header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:16px}
.feature-tools-dialog h2{font-size:22px;margin:0}
.feature-tools-dialog nav{display:grid;gap:12px}
.feature-tools-dialog nav button{text-align:left;min-height:48px;font-size:18px}}
</style>
