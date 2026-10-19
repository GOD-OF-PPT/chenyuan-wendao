<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Game,Action} from '../../src/full/types.ts';
import {getTrialJourney,previewAction} from '../../src/full/queries.ts';
import {narrativeFor,readingPages} from './story-pages';
import {pageSlice} from './play-flow';
import {formatCosts,formatDelta} from './presentation';
import {actionSeconds} from './action-timing';
import PortraitImage from './PortraitImage.vue';
import ChoiceCard from './ChoiceCard.vue';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;consumption:(a:Action)=>string}>(),emit=defineEmits<{act:[Action];life:[];progress:[]}>();
const model=computed(()=>narrativeFor(props.game)),mode=ref('story'),page=ref(0),journey=computed(()=>getTrialJourney(props.game));
const rows=computed(()=>mode.value==='story'?readingPages([{key:'body',title:model.value?.speaker??'',text:model.value?.body??'',testId:model.value?.bodyTest}]):readingPages(model.value?.memories??[])),reading=computed(()=>pageSlice(rows.value,page.value,1)),choices=computed(()=>pageSlice(model.value?.choices??[],page.value,1));
function select(value:string){mode.value=value;page.value=0;}
watch(()=>props.game.core.runId+':'+model.value?.key,()=>select('story'));
const quotes=computed(()=>new Map<string,ReturnType<typeof previewAction>>());watch(()=>props.game,()=>quotes.value.clear());
function quote(a:Action){const key=JSON.stringify(a);if(!quotes.value.has(key))quotes.value.set(key,previewAction(props.game,a));return quotes.value.get(key)!;}
function details(a:Action,detail:string){const p=quote(a);return[{label:'即刻代价',value:formatCosts(p.actualCosts??p.costs)},{label:'已知结果',value:detail},{label:'预计变化',value:p.delta?formatDelta(p.delta):'条件未满足，当前不会执行'},{label:'当前条件',value:p.failure?.message??'由你确认后执行'}];}
</script>
<template>
 <section v-if="model" class="paper play-catalogue story-book narrative-book" data-testid="narrative-catalogue" tabindex="-1">
  <header><div><small>{{model.speaker}} · {{model.choices.length}}种抉择</small><h2 data-testid="event-title">{{model.title}}</h2></div><button v-if="journey" @click="emit('progress')">渡劫行程</button><button v-else @click="emit('life')">回看生平</button></header>
  <nav class="catalogue-tabs" aria-label="当前剧情篇章"><button data-testid="story-mode-story" :aria-pressed="mode==='story'" @click="select('story')">来由</button><button data-testid="story-mode-choices" :aria-pressed="mode==='choices'" @click="select('choices')">抉择 · {{model.choices.length}}</button><button data-testid="story-mode-memory" :aria-pressed="mode==='memory'" @click="select('memory')">已记来路</button></nav>
  <div v-if="mode!=='choices'" class="narrative-reading"><PortraitImage class="narrative-portrait" :id="model.portrait" :fallback="model.speaker.slice(0,1)"/><article v-if="reading.rows[0]" class="reading-text"><small>{{reading.rows[0].title}}</small><p :data-testid="reading.rows[0].testId">{{reading.rows[0].text}}</p><small v-if="reading.rows[0].parts>1">本段 {{reading.rows[0].part}} / {{reading.rows[0].parts}}</small></article><p v-else class="reading-text">尚无其他已记录选择；不会补写交情。</p></div>
  <div v-else class="narrative-choices" aria-label="当前遭遇选择"><ChoiceCard v-for="choice in choices.rows" :key="choice.id" :choice-id="choice.id" :label="choice.label" :disabled="!enabled||busy||!quote(choice.action).allowed" :identity="game.core.runId+game.core.revision" :details="details(choice.action,choice.detail)" @choose="emit('act',choice.action)"><strong>{{choice.label}}</strong><small>{{choice.detail}}</small><small>{{formatCosts(quote(choice.action).actualCosts??quote(choice.action).costs)}} · {{actionSeconds(choice.action)}} 秒</small><small>{{quote(choice.action).failure?.message}}</small><small>{{consumption(choice.action)}}</small></ChoiceCard></div>
  <CataloguePager :page="mode==='choices'?choices.page:reading.page" :pages="mode==='choices'?choices.pages:reading.pages" :total="mode==='choices'?choices.total:reading.total" label="剧情" @change="page=$event"/>
  <footer class="story-footer"><small v-if="journey" data-testid="trial-stage-summary">{{journey.title}} · 已过 {{journey.completed}} / 3 关</small><small v-else>浏览不行动；确认选择后读秒并保存。</small><button v-if="mode!=='choices'" class="primary" data-testid="story-show-choices" @click="select('choices')">查看{{model.choices.length}}种选择 →</button><button v-else @click="select('story')">重看来由</button></footer>
 </section>
</template>
