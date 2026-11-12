<script setup lang="ts">
import {computed,inject,ref,watch} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import {getRelationships,getStoryContext,previewAction} from '../../src/full/queries.ts';
import {availableEvents} from '../../src/full/engine.ts';
import {gamePhase} from '../../src/full/contracts.ts';
import * as C from '../../src/full/content.ts';
import {readingPages,type Reading} from './story-pages';
import {pageSlice} from './play-flow';
import {describeVisitRoute,type NavigationRequest} from './navigation';
import PortraitImage from './PortraitImage.vue';
import CataloguePager from './CataloguePager.vue';
import EncounterTable from './EncounterTable.vue';
import type {useGame} from './store';
import {useReadingMemory} from './reading-memory';
import {formatCosts} from './presentation';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;running:boolean;journalKey:(index:number)=>string;highlight:string}>(),emit=defineEmits<{act:[Action];navigate:[NavigationRequest];life:[];resume:[];dialogue:[];browse:[]}>();
const mode=ref('people'),personIndex=ref(0),people=computed(()=>getRelationships(props.game)),person=computed(()=>people.value[personIndex.value]??people.value[0]);
const pending=computed(()=>{const id=props.game.core.activeEvent?.id;return id&&gamePhase(props.game)==='event'?getStoryContext(props.game,id):null;});
const store=inject<ReturnType<typeof useGame>>('game-scene'),pendingError=computed(()=>store?.error?store.syncIssue?'请重新读取；已确认成果保留':store.canRetry?'存档待核对，请先重试或取消原安排':'':'');
const events=computed(()=>availableEvents(props.game));
const peopleRows=computed<Reading[]>(()=>{const p=person.value;if(!p)return[];return[{key:'summary',title:p.label,text:p.summary,testId:'relationship-summary-'+p.id},...p.facts.map(f=>({key:f.id,title:f.title,text:f.text,testId:'relationship-fact-'+f.id})),...(p.next?[{key:'next',title:'下一次来往 · '+p.next.name,text:C.locations[p.next.location].name+' · '+C.realms[p.next.min].name+'起。'+(p.next.unlocked?(p.next.view?.body??''):'待相应境界后再访，不会自动触发或补发物资。'),testId:'relationship-next-'+p.id},...(p.next.view?.options??[]).map(o=>({key:'option-'+o.id,title:o.label,text:o.detail}))]:[{key:'complete',title:'来往已收束',text:'实际选择记录仍保留，不补写未发生的来往。'}])];});
const rows=computed(()=>readingPages(mode.value==='people'?peopleRows.value:[...props.game.journal].reverse().map((text,i)=>({key:'journal-'+i,title:'近期手记 · '+(i+1),text}))));
const {page,relocated}=useReadingMemory(()=>mode.value+(mode.value==='people'?':'+person.value?.id:''),()=>mode.value==='events'?events.value.map(e=>e.id):rows.value.map(r=>(mode.value==='journal'?props.journalKey(+r.key.slice(8)):r.key)+':'+r.part)),paged=computed(()=>pageSlice(rows.value,page.value,1)),eventPage=computed(()=>pageSlice(events.value,page.value,1));
const eventQuote=computed(()=>eventPage.value.rows[0]?previewAction(props.game,{type:'EVENT',event:eventPage.value.rows[0].id}):null);
const visit=computed(()=>events.value.find(e=>e.id===person.value?.next?.id)),personQuote=computed(()=>visit.value?previewAction(props.game,{type:'EVENT',event:visit.value.id}):null);
const meeting=computed(()=>pending.value?.npc===person.value?.name?pending.value:null);
const readingPerson=computed(()=>mode.value==='people'?person.value:people.value.find(p=>p.name===(pending.value?.npc??eventPage.value.rows[0]?.npc)));
const nextRoute=computed(()=>describeVisitRoute(props.game,person.value?.next,props));
function heading({key,title}:Reading){const label=person.value?.label;return mode.value==='people'?label==='未识'&&['summary','temple'].includes(key)?key==='summary'?'':title:label+(title!==label?' · '+title:''):title;}
function locate(){if(!props.highlight.startsWith('event-'))return;mode.value='events';page.value=Math.max(0,events.value.findIndex(e=>'event-'+e.id===props.highlight));}
watch(()=>props.highlight,locate,{immediate:true});watch(()=>props.game.core.world.location,locate);
</script>
<template>
 <section class="paper play-catalogue story-book fate-book stage-story r4-fate art05-story art12-fate" data-testid="fate-catalogue" tabindex="-1">
  <nav class="catalogue-tabs" aria-label="仙缘篇章"><button v-for="[id,label] in [['people','人物'],['events','此地机缘'],['journal','近期手记']]" :key="id" :data-testid="'fate-mode-'+id" :aria-pressed="mode===id" @click="mode=id;emit('browse')">{{label}}</button><button data-testid="show-life" @click="emit('life')">修仙生平</button></nav>
  <EncounterTable @browse="emit('browse')" :game="game" :mode="mode" :person-id="mode==='journal'?'':readingPerson?.id" :name="readingPerson?.name" :seal="readingPerson?.seal" :event-id="pending?.id??eventPage.rows[0]?.id" :pending="mode==='people'?!!meeting:!!pending"><template #people="{close}"><nav class="fate-people" aria-label="人物"><button v-for="(p,i) in people" :key="p.id" :data-testid="'fate-person-'+p.id" :aria-pressed="personIndex===i" @click="personIndex=i;close();emit('browse')"><PortraitImage class="encounter-token" :id="p.id" :fallback="p.seal"/><strong>{{p.name}}</strong><small>{{p.label}}</small></button></nav></template><template #route="{close}"><p v-if="person?.next">{{person.next.name}} · {{C.locations[person.next.location].name}} · {{C.realms[person.next.min].name}}起</p><template v-if="mode==='people'&&person?.next"><small>{{pendingError&&game.core.world.location!==person.next.location?pendingError:nextRoute.text}}</small><button :data-testid="'relationship-go-'+person.next.id" :disabled="!nextRoute.allowed||!!pendingError&&game.core.world.location!==person.next.location" @click="close();emit('navigate',{location:person.next.location,tab:'仙缘',focusId:'event-'+person.next.id})">前往{{C.locations[person.next.location].name}}查看</button></template><p v-else>此缘暂无后续来往；已保存的真实记录仍可完整翻读。</p></template>
   <template v-if="mode==='people'" #decision="{openRoute}"><template v-if="meeting"><small>已会面 · 待你回应；阅读不推进当前安排。</small><button class="primary" data-testid="fate-resume-dialogue" @click="emit('dialogue')">读对方来意</button></template><template v-else-if="visit"><small>{{formatCosts(personQuote?.actualCosts??personQuote?.costs??null)}} · 相见即展开对话 · 仅一次</small><button class="primary" :data-testid="'event-'+visit.id" :disabled="!enabled||busy||running||!!pendingError||!personQuote?.allowed" @click="emit('act',{type:'EVENT',event:visit.id})">拜访 · {{visit.name}}</button><small>{{pendingError||(running?'当前活动进行中，请先暂停再安排拜访。':personQuote?.failure?.message)}}</small></template><small v-else-if="!person?.next">来往已收束；可换缘牍，继续读已记事实。</small><button v-if="person?.next" :class="{primary:!meeting&&!visit}" data-testid="fate-route-open" @click="openRoute">查看来往地点与后续</button></template>
    <article v-if="mode==='events'" class="reading-text event-reading"><div v-if="pending" class="fate-pending-meeting" data-testid="fate-pending-meeting"><small>已会面 · 待你回应</small><h3>{{pending.name}}</h3><p>已保存拜访；回应仍需单独确认。</p><button class="primary" data-testid="fate-resume-dialogue" @click="emit('dialogue')">查看{{pending.npc}}的对话 →</button></div><template v-else v-for="event in eventPage.rows" :key="event.id"><small>{{event.npc}} · {{C.locations[event.location].name}}</small><h3>{{event.name}}</h3><p data-testid="milestone-running-reason">{{pendingError||(running?'当前活动进行中，请先暂停再安排拜访。':'由你开启机缘；拜访后待你回应，不自动选择。')}}</p><small>{{formatCosts(eventQuote?.actualCosts??eventQuote?.costs??null)}} · 相见即展开对话 · 仅一次</small><button class="primary" :data-testid="'event-'+event.id" @click="emit('act',{type:'EVENT',event:event.id})" :disabled="!enabled||busy||running||!!pendingError||!eventQuote?.allowed">拜访 · {{event.name}}</button></template><template v-if="!events.length&&!pending"><p>此地暂无可开启的机缘。可查看人物的后续来往。</p><button @click="mode='people'">查看人物来往</button></template></article>
    <template v-else><article v-for="row in paged.rows" :key="row.key+row.part" class="reading-text" :class="{'book-copy':mode==='people'}" :data-testid="mode==='people'?'relationship-'+person?.id:'journal-entry'" :data-page-key="row.key"><small v-if="mode==='people'&&(row.key==='next'||row.key.startsWith('option-'))" class="reading-category">下次来往预览</small><small v-if="heading(row)" :data-testid="mode==='people'?'relationship-label-'+person?.id:undefined">{{heading(row)}}<span v-if="row.parts>1"> · {{row.part}} / {{row.parts}}</span></small><p :data-testid="row.testId">{{row.text}}</p></article></template>
  </EncounterTable>
  <small v-if="relocated&&(mode!=='events'||!pending)" role="status">记录已变化，已定位可读页。</small><CataloguePager :page="mode==='events'?eventPage.page:paged.page" :pages="mode==='events'?eventPage.pages:paged.pages" :total="mode==='events'?(pending?1:eventPage.total):paged.total" label="仙缘" @change="page=$event;emit('browse')"/>
  <footer class="story-footer"><small>{{mode==='journal'?'近100条手记；完整因果见生平。':'阅读不耗时；无援助也可修行。'}}</small><button v-if="gamePhase(game)!=='idle'&&game.status==='active'" data-testid="resume-encounter" @click="emit('resume')">继续当前遭遇</button></footer>
 </section>
</template>
