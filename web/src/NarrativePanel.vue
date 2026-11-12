<script setup lang="ts">
import {computed,inject,ref,watch} from 'vue';
import type {Game,Action} from '../../src/full/types.ts';
import {getTrialJourney,previewAction} from '../../src/full/queries.ts';
import {narrativeFor,readingPages} from './story-pages';
import {pageSlice} from './play-flow';
import {formatCosts,formatDelta} from './presentation';
import {isMilestoneAction,MILESTONE_CYCLE_MS} from '../../src/full/milestones.ts';
import ChoiceCard from './ChoiceCard.vue';
import CataloguePager from './CataloguePager.vue';
import ResponseTable from './ResponseTable.vue';
import type {useGame} from './store';
import {useReadingMemory} from './reading-memory';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;running:boolean;context?:number;consumption:(a:Action)=>string}>(),emit=defineEmits<{act:[Action];life:[];progress:[]}>();
const model=computed(()=>narrativeFor(props.game)),mode=ref(narrativeFor(props.game)?.choices[0]?.action.type==='DECIDE'?'choices':'story'),journey=computed(()=>getTrialJourney(props.game));
const instant=computed(()=>model.value?.choices[0]?.action.type==='DECIDE');
const store=inject<ReturnType<typeof useGame>>('game-scene'),pendingError=computed(()=>store?.error?store.syncIssue?'请重新读取；已确认成果保留':store.canRetry?'存档待核对，请先重试或取消原安排':'':'');
const rows=computed(()=>mode.value==='story'?readingPages([{key:'body',title:model.value?.speaker??'',text:model.value?.body??'',testId:model.value?.bodyTest}]):readingPages(model.value?.memories??[]));
const {page,relocated,reset}=useReadingMemory(()=>mode.value,()=>mode.value==='choices'?(model.value?.choices??[]).map(c=>c.id):rows.value.map(r=>r.key+':'+r.part)),reading=computed(()=>pageSlice(rows.value,page.value,1)),choices=computed(()=>pageSlice(model.value?.choices??[],instant.value?0:page.value,instant.value?Math.max(1,model.value?.choices.length??1):1));
function select(value:string){mode.value=value;}
watch(()=>props.game.core.runId+':'+model.value?.key+':'+props.context,()=>{select(instant.value?'choices':'story');reset();});
const quotes=computed(()=>new Map<string,ReturnType<typeof previewAction>>());watch(()=>props.game,()=>quotes.value.clear());
function quote(a:Action){const key=JSON.stringify(a);if(!quotes.value.has(key))quotes.value.set(key,previewAction(props.game,a));return quotes.value.get(key)!;}
function details(a:Action,detail:string){const p=quote(a);return[{label:'即刻代价',value:formatCosts(p.actualCosts??p.costs)},{label:'已知结果',value:detail},{label:'预计变化',value:p.delta?formatDelta(p.delta):'条件未满足，当前不会执行'},{label:'当前条件',value:pendingError.value||(props.running?'当前活动进行中，请先暂停再安排。':p.failure?.message??'由你确认后执行')}];}
const seconds=(a:Action)=>isMilestoneAction(a)?MILESTONE_CYCLE_MS[a.type]/1000:0;
</script>
<template>
 <section v-if="model" class="paper play-catalogue story-book narrative-book stage-story r4-narrative art05-story art12-narrative" :class="{'art32-narrative':['question','ending'].includes(model.key)}" data-testid="narrative-catalogue" tabindex="-1">
  <header><div><h2 data-testid="event-title">{{model.title}}</h2></div><div><button v-if="journey" @click="emit('progress')">渡劫行程</button><button @click="emit('life')">回看生平</button></div></header>
  <nav class="catalogue-tabs" aria-label="当前剧情篇章"><button data-testid="story-mode-story" :aria-pressed="mode==='story'" @click="select('story')">来由</button><button data-testid="story-mode-choices" :aria-pressed="mode==='choices'" @click="select('choices')">抉择 · {{model.choices.length}}</button><button data-testid="story-mode-memory" :aria-pressed="mode==='memory'" @click="select('memory')">已记来路</button></nav>
  <ResponseTable :game="game" :mode="mode" :identity="model.key" :portrait="model.portrait" :speaker="model.speaker" :action="mode==='choices'?choices.rows[0]?.action??null:null" :inline-choices="instant"><template #choices="{close}"><nav class="story-choice-list" aria-label="预选回应，不执行"><button v-for="(choice,i) in model.choices" :key="choice.id" :data-testid="'story-select-'+choice.id" :aria-pressed="choices.page===i" @click="page=i;close()"><strong>{{choice.label}}</strong><small>{{formatCosts(quote(choice.action).actualCosts??quote(choice.action).costs)}} · {{seconds(choice.action)}}秒</small></button></nav></template>
   <div v-if="mode!=='choices'" class="narrative-reading book-copy"><article v-if="reading.rows[0]" class="reading-text" :data-page-key="reading.rows[0].key"><small>{{reading.rows[0].title}}</small><p :data-testid="reading.rows[0].testId">{{reading.rows[0].text}}</p><small v-if="reading.rows[0].parts>1">本段 {{reading.rows[0].part}} / {{reading.rows[0].parts}}</small></article><article v-else class="reading-text"><p>暂无其他选择记录；不补写交情。</p></article></div>
   <div v-else class="narrative-choice-detail" :class="{'direct-choices':instant}" :style="instant?{display:'grid',alignContent:'center',height:'100%',boxSizing:'border-box'}:undefined" aria-label="当前遭遇选择"><p v-if="instant" class="direct-choice-context">{{model.body}}</p><ChoiceCard :compact="instant" v-for="choice in choices.rows" :key="choice.id" :choice-id="choice.id" :label="choice.label" :disabled="!enabled||busy||running||!!pendingError||!quote(choice.action).allowed" :identity="game.core.runId+game.core.revision" :details="details(choice.action,choice.detail)" @choose="emit('act',choice.action)"><strong>{{model.key==='question'?'作答 · ':model.key==='ending'?'收卷 · ':'回应 · '}}{{choice.label}}</strong><small>{{choice.detail}}</small><small v-if="instant">{{formatCosts(quote(choice.action).actualCosts??quote(choice.action).costs)}}</small><small v-if="['question','ending'].includes(model.key)" class="art32-choice-summary" data-testid="milestone-choice-summary">整次 {{seconds(choice.action)}} 秒 · 仅1次 · {{formatCosts(quote(choice.action).actualCosts??quote(choice.action).costs)}}</small><small data-testid="milestone-running-reason">{{pendingError||(running?'当前活动进行中，请先暂停再安排。':quote(choice.action).failure?.message)}}</small><small>{{consumption(choice.action)}}</small></ChoiceCard></div>
  </ResponseTable>
  <small v-if="relocated" role="status">内容已变化，已定位可读页。</small><CataloguePager v-if="!instant||mode!=='choices'" :page="mode==='choices'?choices.page:reading.page" :pages="mode==='choices'?choices.pages:reading.pages" :total="mode==='choices'?choices.total:reading.total" label="剧情" @change="page=$event"/>
  <footer class="story-footer"><small v-if="journey" data-testid="trial-stage-summary">已存进度 · 已过 {{journey.completed}} / 3 关</small><small v-else>查看不更改已存安排。</small><button v-if="mode!=='choices'" class="primary" data-testid="story-show-choices" @click="select('choices')">查看{{model.choices.length}}种选择 →</button><button v-else @click="select('story')">重看来由</button></footer>
 </section>
</template>

<style scoped>
.direct-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.direct-choice-context{grid-column:1/-1;font-size:18px;line-height:1.5;margin:0 0 8px}
:deep(.response-copy .direct-choices){display:grid}
</style>
