<script setup lang="ts">
import {inject,nextTick,onScopeDispose,ref,useId,watch} from 'vue';
import {gameFocusKey} from './focus';
const props=defineProps<{choiceId:string;label:string;disabled:boolean;identity:string;details:{label:string;value:string}[]}>();
const emit=defineEmits<{choose:[]}>(),focus=inject(gameFocusKey)!,dialog=ref<HTMLDialogElement>(),peek=ref<HTMLButtonElement>(),opened=ref(false),id=useId();
async function inspect(){const identity=props.identity;opened.value=true;await nextTick();if(props.identity!==identity){opened.value=false;return;}focus.target(peek.value??null);focus.open(dialog.value,peek.value??null);}
watch(()=>props.identity,()=>dialog.value?.close());
onScopeDispose(()=>focus.release(dialog.value));
</script>
<template>
 <article class="choice-card">
  <button class="choice-act" :data-testid="choiceId" :disabled="disabled" @click="emit('choose')"><slot/></button>
  <button ref="peek" class="choice-peek" type="button" :aria-label="'查看'+label+'的代价与结果'" aria-haspopup="dialog" @click="inspect"><span aria-hidden="true">◇</span>详情</button>
  <dialog ref="dialog" class="paper choice-inspection" :aria-labelledby="id" @close="opened=false">
   <template v-if="opened"><header><div><span class="section-label">抉择之前</span><h2 :id="id" tabindex="-1" data-dialog-initial>{{label}}</h2></div><button type="button" @click="dialog?.close()" aria-label="关闭选择详情">关闭</button></header>
   <dl><div v-for="row in details" :key="row.label"><dt>{{row.label}}</dt><dd>{{row.value}}</dd></div></dl><p class="small">查看不会作出选择。回到对话后，由你点击行动；进度保存成功后才会结算。</p><button type="button" class="primary" @click="dialog?.close()">回到对话</button></template>
  </dialog>
 </article>
</template>
