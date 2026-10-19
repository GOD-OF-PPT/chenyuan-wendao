<script setup lang="ts">
import {computed,inject,nextTick,onScopeDispose,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
const props=withDefaults(defineProps<{value:number;max:number;label:string;identity:string;hint:string;tone?:'health'|'spirit'|'cultivation'}>(),{tone:'cultivation'});
const focus=inject(gameFocusKey)!,dialog=ref<HTMLDialogElement>(),opener=ref<HTMLButtonElement>(),opened=ref(false),change=ref<number|null>(null),id=useId();
const ratio=computed(()=>Math.max(0,Math.min(100,props.value/Math.max(1,props.max)*100)));
let timer:ReturnType<typeof setTimeout>|undefined;
watch(()=>[props.value,props.max,props.identity]as const,([value,max,identity],[before,oldMax,oldIdentity])=>{
 clearTimeout(timer);change.value=null;
 if(identity!==oldIdentity||max!==oldMax){dialog.value?.close();return;}
 if(value!==before){change.value=value-before;timer=setTimeout(()=>change.value=null,1400);}
});
async function inspect(){const identity=props.identity;opened.value=true;await nextTick();if(props.identity!==identity){opened.value=false;return;}focus.target(opener.value??null);focus.open(dialog.value,opener.value??null);}
onScopeDispose(()=>{clearTimeout(timer);focus.release(dialog.value);});
</script>
<template>
 <div class="progress-track" :class="tone" :data-progress="label" :data-change="change===null?'none':change>0?'gain':'loss'">
  <span class="progress-fill" :style="{width:ratio+'%'}" aria-hidden="true"/>
  <progress :value="value" :max="max" :aria-label="label"/>
  <button ref="opener" type="button" class="progress-inspect" :aria-label="'查看'+label+'进度'" aria-haspopup="dialog" :aria-expanded="opened" @click="inspect"/>
  <span v-if="change!==null" class="progress-change" aria-hidden="true">{{change>0?'+':''}}{{change}}</span>
  <dialog ref="dialog" class="paper progress-dialog" :aria-labelledby="id" @close="opened=false">
   <template v-if="opened"><header><h2 :id="id" tabindex="-1" data-dialog-initial>{{label}} · 当前进度</h2><button type="button" @click="dialog?.close()" :aria-label="'关闭'+label+'进度'">关闭</button></header>
   <div class="progress-emblem" :style="{'--progress-angle':ratio*3.6+'deg'}"><strong>{{value}}<small>/ {{max}}</small></strong></div>
   <p class="progress-exact">{{ratio>=100?'当前已满':`还差 ${Math.max(0,max-value)}`}}</p><p>{{hint}}</p><p class="small">数值来自已保存的当前进度；查看不消耗游戏月。</p></template>
  </dialog>
 </div>
</template>
