<script setup lang="ts">
import {onMounted,onScopeDispose,shallowRef,watch} from 'vue';
import type {Execution} from './action-timing';
const props=defineProps<{execution:Execution|null}>(),target=shallowRef<Element|null>(null);
function locate(){target.value=props.execution?document.querySelector('dialog[open]'):null;}
let observer:MutationObserver|undefined;
watch(()=>props.execution?.id,locate,{flush:'post'});
onMounted(()=>{observer=new MutationObserver(locate);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});});
onScopeDispose(()=>observer?.disconnect());
</script>
<template>
 <Teleport :to="target??'body'">
 <aside v-if="execution" class="action-execution" :data-phase="execution.phase" data-testid="action-execution" aria-label="当前行动进度">
  <div><strong>{{execution.label}}</strong><span role="status">{{execution.phase==='saving'?'正在保存结果…':`还需 ${Math.ceil(execution.remainingMs/1000)} 秒`}}</span><output aria-hidden="true" data-testid="action-countdown">{{execution.phase==='saving'?'保存中':(execution.remainingMs/1000).toFixed(1)+' 秒'}}</output></div>
  <progress :value="execution.totalMs-execution.remainingMs" :max="execution.totalMs" :aria-label="execution.label+'执行进度'"/>
  <small>{{execution.phase==='saving'?'保存成功后才会结算和播放效果':`${execution.batch?'整批':'本次'}耗时 ${(execution.totalMs/1000).toFixed(1)} 秒 · 结束后核对结算`}}</small>
 </aside>
 </Teleport>
</template>
