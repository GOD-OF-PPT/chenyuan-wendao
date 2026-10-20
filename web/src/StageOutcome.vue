<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types.ts';
import type {ActionResult} from '../../src/full/contracts.ts';
import type {Execution} from './action-timing';
import {ACTION_MOTIONS} from './action-feedback';
import {formatDelta} from './presentation';
import GameIcon from './GameIcon.vue';
import {items,realms} from '../../src/full/content.ts';
const props=defineProps<{game:Game;result:ActionResult|null;busy:boolean;saved:boolean;available:boolean;error:string;replayed:boolean;execution:Execution|null;next:string}>();
defineEmits<{next:[];details:[]}>();
const receipt=computed(()=>props.saved&&props.available&&!props.busy&&!props.error&&!props.replayed&&props.result?.runId===props.game.core.runId&&props.result.revisionAfter===props.game.core.revision?props.result:null);
const state=computed(()=>props.error?'failed':props.execution?.phase??(props.busy?'saving':receipt.value?'settled':'idle'));
const changes=computed(()=>{
 const d=receipt.value?.delta;if(!d)return{visible:[],extra:0};
 const important:string[]=[];
 if(d.realm.before!==d.realm.after)important.push(`${realms[d.realm.before].name} → ${realms[d.realm.after].name}`);
 for(const [id,n]of Object.entries(d.inventory))if(n>0)important.push(`${items[id].name} +${n}`);
 for(const [name,n]of [['修为',d.xp],['气血',d.hp],['灵力',d.mp],['灵石',d.stones]]as const)if(n>0)important.push(`${name} +${n}`);
 const all=[...new Set([...important,...formatDelta(d).split(' · ')])];return{visible:all.slice(0,2),extra:Math.max(0,all.length-2)};
});
</script>
<template>
 <section class="stage-outcome" data-testid="stage-outcome" :data-state="state" :data-command="receipt?.commandId" aria-label="行动与下一步">
  <div :key="state==='settled'?receipt?.commandId:state" class="stage-result-body">
   <template v-if="execution"><strong>{{execution.label}}</strong><output data-testid="stage-time">{{execution.phase==='saving'?'保存中':(execution.remainingMs/1000).toFixed(1)+' 秒'}}</output><progress :value="execution.totalMs-execution.remainingMs" :max="execution.totalMs" :aria-label="execution.label+'阶段进度'"/><small>{{execution.phase==='saving'?'保存后显示本次结果':'正在行动，结束后核对结果'}}</small></template>
   <template v-else-if="error"><strong class="stage-failure">本次未保存</strong><p>进度未结算，请先处理上方原因并重试。</p></template>
   <template v-else-if="receipt"><strong class="stage-success"><GameIcon :kind="ACTION_MOTIONS[receipt.type].icon.kind" :id="ACTION_MOTIONS[receipt.type].icon.id"/>{{ACTION_MOTIONS[receipt.type].label}}</strong><p data-testid="stage-delta"><span v-for="row in changes.visible" :key="row">{{row}}</span></p><small v-if="changes.extra" data-testid="stage-more">另{{changes.extra}}项 · 结算详情</small><small v-if="receipt.stopReason">{{receipt.stopReason.message}}</small></template>
   <template v-else><strong>下一步</strong><p>{{next}}</p></template>
  </div>
  <footer v-if="!busy" class="stage-outcome-actions"><button class="stage-next" data-testid="stage-next" @click="$emit('next')">下一步 →</button><button v-if="result" class="stage-details" data-testid="hub-receipt" @click="$emit('details')">结算详情</button></footer>
 </section>
</template>
