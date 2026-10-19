<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import {getRelationships,previewAction} from '../../src/full/queries.ts';
import {availableEvents} from '../../src/full/engine.ts';
import {gamePhase} from '../../src/full/contracts.ts';
import * as C from '../../src/full/content.ts';
import {readingPages,type Reading} from './story-pages';
import {pageSlice} from './play-flow';
import type {NavigationRequest} from './navigation';
import PortraitImage from './PortraitImage.vue';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;highlight:string}>(),emit=defineEmits<{act:[Action];navigate:[NavigationRequest];life:[];resume:[]}>();
const mode=ref('people'),page=ref(0),personIndex=ref(0),people=computed(()=>getRelationships(props.game)),person=computed(()=>people.value[personIndex.value]??people.value[0]);
const events=computed(()=>availableEvents(props.game)),eventPage=computed(()=>pageSlice(events.value,page.value,1));
const peopleRows=computed<Reading[]>(()=>{const p=person.value;if(!p)return[];return[{key:'summary',title:p.label,text:p.summary,testId:'relationship-summary-'+p.id},...p.facts.map(f=>({key:f.id,title:f.title,text:f.text,testId:'relationship-fact-'+f.id})),...(p.next?[{key:'next',title:'下一次来往 · '+p.next.name,text:C.locations[p.next.location].name+' · '+C.realms[p.next.min].name+'起。'+(p.next.unlocked?(p.next.view?.body??''):'待相应境界后再访，不会自动触发或补发物资。'),testId:'relationship-next-'+p.id},...(p.next.view?.options??[]).map(o=>({key:'option-'+o.id,title:o.label,text:o.detail}))]:[{key:'complete',title:'来往已收束',text:'实际选择记录仍保留，不补写未发生的来往。'}])];});
const rows=computed(()=>readingPages(mode.value==='people'?peopleRows.value:[...props.game.journal].reverse().map((text,i)=>({key:'journal-'+i,title:'近期手记 · '+(i+1),text})))),paged=computed(()=>pageSlice(rows.value,page.value,1));
function select(value:string){mode.value=value;page.value=0;}
function changePerson(value:number){personIndex.value=value;page.value=0;}
function canGo(location:C.LocationId){return props.enabled&&!props.busy&&gamePhase(props.game)==='idle'&&(props.game.core.world.location===location||previewAction(props.game,{type:'TRAVEL',location}).allowed);}
function locate(){if(!props.highlight.startsWith('event-'))return;select('events');page.value=Math.max(0,events.value.findIndex(e=>'event-'+e.id===props.highlight));}
watch(()=>props.highlight,locate,{immediate:true});watch(()=>props.game.core.world.location,locate);watch(()=>props.game.core.runId,()=>{select('people');personIndex.value=0;});
</script>
<template>
 <section class="paper play-catalogue story-book fate-book" data-testid="fate-catalogue" tabindex="-1"><header><div><small>仙缘因果 · 只记真实来往</small><h2>山海有故人</h2></div><button data-testid="show-life" @click="emit('life')">修仙生平</button></header>
  <nav class="catalogue-tabs" aria-label="仙缘篇章"><button v-for="[id,label] in [['people','人物'],['events','此地机缘'],['journal','近期手记']]" :key="id" :data-testid="'fate-mode-'+id" :aria-pressed="mode===id" @click="select(id)">{{label}}</button></nav>
  <template v-if="mode==='people'&&person"><nav class="fate-people" aria-label="人物"><button v-for="(p,i) in people" :key="p.id" :data-testid="'fate-person-'+p.id" :aria-pressed="personIndex===i" @click="changePerson(i)">{{p.name}}</button></nav><div class="fate-reading" data-testid="relationships" :data-person="person.id"><PortraitImage class="narrative-portrait" :id="person.id" :fallback="person.seal"/><article v-for="row in paged.rows" :key="row.key+row.part" class="reading-text" :data-testid="'relationship-'+person.id" :data-page-key="row.key"><small :data-testid="'relationship-label-'+person.id">{{person.label}} · {{row.title}}</small><p :data-testid="row.testId">{{row.text}}</p></article></div></template>
  <article v-else-if="mode==='events'" class="reading-text event-reading"><template v-for="event in eventPage.rows" :key="event.id"><small>{{event.npc}} · {{C.locations[event.location].name}}</small><h3>{{event.name}}</h3><p>由你开启这段机缘；打开后还需作出选择，查看人物记录不会自动触发。</p><button class="primary" :data-testid="'event-'+event.id" @click="emit('act',{type:'EVENT',event:event.id})" :disabled="!enabled||busy||!previewAction(game,{type:'EVENT',event:event.id}).allowed">拜访 · {{event.name}}</button></template><template v-if="!events.length"><p>此地暂无可开启的机缘。人物页会显示后续来往与地点。</p><button @click="select('people')">查看人物来往</button></template></article>
  <article v-else v-for="row in paged.rows" :key="row.key+row.part" class="reading-text" :data-page-key="row.key" data-testid="journal-entry"><small>{{row.title}} · 第{{row.part}} / {{row.parts}}段</small><p>{{row.text}}</p></article>
  <CataloguePager :page="mode==='events'?eventPage.page:paged.page" :pages="mode==='events'?eventPage.pages:paged.pages" :total="mode==='events'?eventPage.total:paged.total" label="仙缘" @change="page=$event"/>
  <footer class="story-footer"><template v-if="mode==='people'&&person?.next"><small>{{gamePhase(game)==='idle'?'前往仅旅行或定位，拜访需另行确认。':'先处理当前遭遇；记录仍可翻阅。'}}</small><button :data-testid="'relationship-go-'+person.next.id" :disabled="!person.next.unlocked||!canGo(person.next.location)" @click="emit('navigate',{location:person.next.location,tab:'仙缘',focusId:'event-'+person.next.id})">前往{{C.locations[person.next.location].name}}查看</button></template><small v-else>{{mode==='journal'?'保留最近100条手记；完整已选事实见生平。':'查看不消耗时间，没有人物援助仍可修行。'}}</small><button v-if="gamePhase(game)!=='idle'&&game.status==='active'" data-testid="resume-encounter" @click="emit('resume')">继续当前遭遇</button></footer>
 </section>
</template>
