<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Game} from '../../src/full/types';
import type {Activity} from '../../src/full/activity';
import {projectStudyQueue,type QueueDomain,type QueueView} from './equipment-choreography';
import './ta09-equipment.css';
const props=defineProps<{game:Game;draft:string[];activity:Activity|null;command:Activity['nextCommand'];viewed:string;view:QueueView|null}>();
const emit=defineEmits<{inspect:[string];limits:[];remember:[QueueView]}>();
const hasSaved=computed(()=>props.activity?.version===5&&props.activity.plan.kind==='learn'&&props.activity.runId===props.game.core.runId);
const ownerRun=props.game.core.runId,restored=props.view?.runId===ownerRun?props.view:null;
const domain=ref<QueueDomain>(restored?.domain??(hasSaved.value?'saved':'draft')),touched=ref(restored?.touched??false),pages=ref(restored?{...restored.pages}:{draft:0,saved:0,slots:0});
const all=computed(()=>projectStudyQueue(props.game,props.draft,props.activity,props.command,domain.value==='saved'?'saved':'draft'));
const pageCount=computed(()=>Math.max(1,Math.ceil(all.value.length/2)));
const page=computed(()=>Math.max(0,Math.min(pages.value[domain.value],pageCount.value-1)));
const rows=computed(()=>all.value.slice(page.value*2,page.value*2+2));
const actualCount=computed(()=>hasSaved.value&&props.activity?.version===5&&props.activity.plan.kind==='learn'?props.activity.plan.skills.length:0);
function remember(){if(ownerRun===props.game.core.runId)emit('remember',{runId:ownerRun,domain:domain.value,pages:{...pages.value,[domain.value]:page.value},touched:touched.value});}
function choose(next:QueueDomain){touched.value=true;domain.value=next;remember();}
function turn(next:number){pages.value[domain.value]=next;remember();}
function reset(){touched.value=false;domain.value=hasSaved.value?'saved':'draft';pages.value={draft:0,saved:0,slots:0};}
watch(()=>props.game.core.runId,reset);
watch(()=>props.activity?.id,()=>{if(!touched.value)domain.value=hasSaved.value?'saved':'draft';});
watch([domain,()=>all.value.length],()=>{if(pages.value[domain.value]!==page.value){pages.value[domain.value]=page.value;remember();}});
</script>
<template>
 <section class="ta09-queue" data-testid="study-queue-rail" :data-domain="domain" :data-run="game.core.runId" :data-actual-count="actualCount" :data-draft-count="draft.length" aria-label="原研习安排与待确认卷串">
  <header class="ta09-queue-modes">
   <button type="button" data-testid="queue-mode-saved" :aria-pressed="domain==='saved'" :disabled="!hasSaved" @click="choose('saved')">原安排 {{actualCount}} 卷</button>
   <button type="button" data-testid="queue-mode-draft" :aria-pressed="domain==='draft'" @click="choose('draft')">下次选择 {{draft.length}} 卷</button>
   <button type="button" data-testid="queue-mode-slots" :aria-pressed="domain==='slots'" @click="choose('slots')">当前三槽</button>
   <button type="button" class="ta09-queue-limits" data-testid="learning-plan-open" @click="emit('limits')">定卷 · 完整安排</button>
  </header>
  <div v-if="domain==='slots'" class="ta09-queue-slot-view"><slot name="slots"/></div>
  <div v-else class="ta09-queue-row" :class="{'ta09-queue-single':pageCount===1}">
   <button v-if="pageCount>1" type="button" data-testid="queue-prev" aria-label="上一页卷串" :disabled="page===0" @click="turn(page-1)">上页</button>
   <div class="ta09-queue-scrolls">
    <button v-for="row in rows" :key="row.id" type="button" :data-testid="'queue-entry-'+row.id" :data-skill="row.id" :data-form="row.form" :data-current="row.current" :data-known="row.known" :aria-pressed="viewed===row.id" :aria-label="row.name+'，'+row.status+'，点击只查看'" @click="emit('inspect',row.id)">
     <svg class="ta09-queue-slip" viewBox="0 0 36 56" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 5L27 3L30 48L10 53Z"/><path d="M8 13L28 11M10 42L29 39"/><path v-if="row.form==='blade'||row.form==='scroll'" d="M16 37L23 17L22 12L17 19L16 37M12 30L23 34"/><path v-else-if="row.form==='seal'||row.form==='fan'" d="M14 18L23 19L19 26L25 31L17 39L14 33"/><path v-else d="M15 18L23 21L25 29L18 36L13 28Z"/><path v-if="row.known" d="M11 38L16 41L24 33"/></svg>
     <span><strong>{{row.name}}</strong><small>{{row.status}}</small></span>
    </button>
    <p v-if="!rows.length" class="ta09-empty-queue"><svg viewBox="0 0 110 24" aria-hidden="true"><path d="M4 12H106M12 5V19M34 5V19M56 5V19M78 5V19M100 5V19"/></svg>{{domain==='saved'?'原安排尚空':'此串尚空 · 从经架择卷'}}</p>
   </div>
   <div v-if="pageCount>1" class="ta09-queue-page"><small>{{page+1}} / {{pageCount}} 页</small><button type="button" data-testid="queue-next" aria-label="下一页卷串" :disabled="page+1>=pageCount" @click="turn(page+1)">下页</button></div>
  </div>
 </section>
</template>
