<script setup lang="ts">
import {computed,inject,ref,watch,onDeactivated} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import {pausedPlanView} from './preparation-view.ts';
import * as C from '../../src/full/content.ts';
import {stats} from '../../src/full/engine.ts';
import {previewActivity,type PreparationPlan,type LearnPlan,type StudyPlan} from '../../src/full/activity.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import {pageSlice} from './play-flow';
import CataloguePager from './CataloguePager.vue';
import JadeStudyScene from './JadeStudyScene.vue';
import type {useGame} from './store';
import GameIcon from './GameIcon.vue';
import type {QueueView} from './equipment-choreography';
const props=withDefaults(defineProps<{game:Game;busy:boolean;available:boolean;running:boolean;highlight:string;savedPlan:LearnPlan|StudyPlan|null;planSaved?:boolean;embedded?:boolean;mode:'skills'|'manual'}>(),{planSaved:false});
const scene=inject<ReturnType<typeof useGame>>('game-scene');
const restart=computed(()=>pausedPlanView(scene?.activity,props.game.core.runId,plan.value));
const emit=defineEmits<{start:[PreparationPlan];act:[Action];track:[TrackingTarget];travel:[PreparationPlan];browse:[]}>();
const filter=ref('current'),future=ref(false),page=ref(0),queuePage=ref(0),selected=ref(''),queue=ref<string[]>([]),budget=ref(0),reserve=ref(0),editedLimits=ref(false);
type Mode='skills'|'manual';
type Draft={filter:string;future:boolean;page:number;queuePage:number;selected:string;queue:string[];budget:number;reserve:number;editedLimits:boolean};
const drafts:Partial<Record<Mode,Draft>>={};
const manualComplete=computed(()=>props.mode==='manual'&&props.game.core.learnedSkills.includes(C.swordManual.id));
const originalManual=computed(()=>{
 const a=scene?.activity,s=props.savedPlan;
 if(!manualComplete.value||!props.planSaved||s?.kind!=='study'||a?.version!==5||a.runId!==props.game.core.runId||a.plan.kind!=='study')return null;
 const p=a.plan;
 return p.manual===s.manual&&p.maxCycles===s.maxCycles&&p.stoneBudget===s.stoneBudget&&p.stoneReserve===s.stoneReserve?{plan:p,cycleMs:a.cycleMs,spentStones:a.spentStones}:null;
});
const savedMatchesMode=computed(()=>props.savedPlan?.kind===(props.mode==='manual'?'study':'learn'));
const slots={mind:'心法',builder:'起手术法',finisher:'终结术法'} as const;
const rows=computed(()=>Object.entries(C.skills).filter(([id,s])=>(filter.value==='all'||filter.value==='current'&&(!props.game.school||s.school===props.game.school)||s.school===filter.value)&&(future.value||props.game.learned.includes(id)||C.rank(s.min)<=C.rank(props.game.core.player.realm))));
const paged=computed(()=>pageSlice(rows.value,page.value,4)),queued=computed(()=>pageSlice(queue.value,queuePage.value,1));
const skill=computed(()=>rows.value.some(([id])=>id===selected.value)?C.skills[selected.value]:null);
const pending=computed(()=>queue.value.filter(id=>!props.game.learned.includes(id)).length);
const queueView=ref<QueueView|null>(null);
function rememberQueue(view:QueueView){if(view.runId===props.game.core.runId)queueView.value=view;}
const settings=ref<HTMLDialogElement>(),library=ref<HTMLDialogElement>();
function closeViews(){settings.value?.close();library.value?.close();}
function openLibrary(){settings.value?.close();if(!library.value?.open)library.value?.showModal();}
function openSettings(){library.value?.close();if(!settings.value?.open)settings.value?.showModal();}
onDeactivated(closeViews);
const plan=computed<LearnPlan|StudyPlan>(()=>props.mode==='manual'?{kind:'study',manual:'jinghong',maxCycles:1,stoneBudget:budget.value,stoneReserve:reserve.value}:{kind:'learn',skills:[...queue.value],maxCycles:queue.value.length,stoneBudget:budget.value,stoneReserve:reserve.value});
const quote=computed(()=>props.mode==='manual'||queue.value.length?previewActivity(props.game,plan.value):null);
const forecast=computed(()=>({title:props.mode==='skills'&&queue.value.length&&!pending.value?'已掌握清单经卷；可比较装配':quote.value?'预计完成 '+quote.value.cycles+(props.mode==='manual'?' 次参悟':' 卷')+' · 消耗 '+quote.value.stones+' 灵石':'选择未掌握经卷加入清单',reason:quote.value?.failure?.message??(quote.value?.stopReason?'预计停止：'+quote.value.stopReason.message:'所选费用、资格或已掌握状态变化时停止')}));
const planningNote='只研习已选内容；不自动换派、装配或前往宗门。';
const sameSaved=computed(()=>{const p=props.savedPlan,d=plan.value;return !!p&&p.kind===d.kind&&p.stoneBudget===d.stoneBudget&&p.stoneReserve===d.stoneReserve&&(p.kind==='study'||d.kind==='learn'&&JSON.stringify(p.skills)===JSON.stringify(d.skills));});
const unit=computed(()=>props.mode==='manual'?previewAction(props.game,{type:'STUDY',manual:'jinghong'}):skill.value?previewAction(props.game,{type:'LEARN',skill:selected.value}):null);
const equip=computed(()=>skill.value?previewAction(props.game,{type:'EQUIP',skill:selected.value}):null);
const currentSlot=computed(()=>skill.value?props.game.loadout[skill.value.slot]:null);
const conflict=computed(()=>scene?.error&&(scene.canRetry||scene.syncIssue)?'存档状态待核对，请先恢复或重试':!props.available?'存档未就绪':props.busy?'当前行动保存中，请稍候':props.running?'当前活动进行中，请先暂停后确认新安排':'');
const move=computed(()=>previewAction(props.game,{type:'TRAVEL',location:'sect'}));
function resetBudget(){if(!editedLimits.value)budget.value=props.mode==='manual'?C.swordManual.price:queue.value.reduce((n,id)=>n+C.skills[id].price,0);}
function choose(id:string){selected.value=id;}
function focusSkill(id:string){if(!Object.hasOwn(C.skills,id))return;filter.value=C.skills[id].school;future.value=C.rank(C.skills[id].min)>C.rank(props.game.core.player.realm);page.value=Math.max(0,Math.floor(rows.value.findIndex(([key])=>key===id)/4));choose(id);}
function locate(){if(props.mode==='manual')return;const id=props.highlight.replace(/^(learn-|equip-)/,'');if(Object.hasOwn(C.skills,id))focusSkill(id);else if(rows.value.length&&!rows.value.some(([id])=>id===selected.value)){page.value=0;choose(rows.value[0][0]);}}
function restore(){const p=props.savedPlan;if(!p||p.kind!==(props.mode==='manual'?'study':'learn'))return;budget.value=p.stoneBudget;reserve.value=p.stoneReserve;editedLimits.value=true;if(p.kind==='learn'){queue.value=[...p.skills];queuePage.value=0;const id=p.skills[0];if(id){selected.value=id;filter.value=C.skills[id].school;future.value=true;page.value=Math.max(0,Math.floor(rows.value.findIndex(([key])=>key===id)/4));}}}
function snapshotDraft():Draft{return{filter:filter.value,future:future.value,page:page.value,queuePage:queuePage.value,selected:selected.value,queue:[...queue.value],budget:budget.value,reserve:reserve.value,editedLimits:editedLimits.value};}
function applyDraft(d:Draft){filter.value=d.filter;future.value=d.future;page.value=d.page;queuePage.value=d.queuePage;selected.value=d.selected;queue.value=[...d.queue];budget.value=d.budget;reserve.value=d.reserve;editedLimits.value=d.editedLimits;reconcile();}
function defaults(){filter.value='current';future.value=false;page.value=0;queuePage.value=0;selected.value='';queue.value=[];budget.value=props.mode==='manual'?C.swordManual.price:0;reserve.value=0;editedLimits.value=false;locate();restore();}
function turn(next:number){page.value=next;const row=pageSlice(rows.value,next,4).rows[0];selected.value=row?.[0]??'';}
function filterChanged(){page.value=0;const row=rows.value[0];selected.value=row?.[0]??'';}
function add(){if(!skill.value||props.game.learned.includes(selected.value)||queue.value.includes(selected.value))return;queue.value=[...queue.value,selected.value];queuePage.value=queue.value.length-1;resetBudget();}
function remove(id:string){queue.value=queue.value.filter(key=>key!==id);queuePage.value=queued.value.page;resetBudget();}
function reconcile(){if(props.mode!=='skills')return;const i=rows.value.findIndex(([id])=>id===selected.value);if(i<0){page.value=0;selected.value=rows.value[0]?.[0]??'';}else page.value=Math.floor(i/4);}
watch(rows,reconcile);
watch(()=>props.game.core.runId,()=>{closeViews();queueView.value=null;delete drafts.skills;delete drafts.manual;defaults();});
watch(()=>props.mode,(next,previous)=>{closeViews();drafts[previous]=snapshotDraft();const cached=drafts[next];if(cached)applyDraft(cached);else defaults();});
watch(()=>props.highlight,locate);
watch(()=>props.savedPlan,()=>{if(savedMatchesMode.value){restore();drafts[props.mode]=snapshotDraft();}});
defaults();
</script>
<template>
 <section class="idle-preparation learning-planner art10-learning" :class="{'paper':!embedded,'play-catalogue':!embedded}" :data-mode="mode" :data-complete="manualComplete" data-testid="learning-planner" aria-label="玉简研习安排">
  <header class="preparation-heading art10-study-heading"><small data-testid="preparation-plan-state">{{restart.same&&!conflict?restart.label:manualComplete?originalManual?'已悟记录 · 回看已保存原安排':'已悟记录 · 此简可随时展读':mode==='skills'&&!queue.length?'展读经卷 · 查看不入串':sameSaved&&planSaved?'已保存安排；修改后须重新确认':'待确认的新安排，确认后才开始'}}</small><button v-if="mode==='skills'" type="button" class="art10-library-opener" :class="{primary:!pending&&(!skill||game.learned.includes(selected)&&currentSlot===selected)}" data-testid="learning-library-open" @click="openLibrary">翻经架 · 换卷</button></header>
  <div class="preparation-work learning-work art10-study-work">
   <div class="learning-scroll">
    <JadeStudyScene :key="mode" :game="game" :skill-id="selected" :manual="mode==='manual'" :queue="queue" :queue-view="queueView" @remember="rememberQueue" @inspect="focusSkill" @plan="openSettings"><template #description>
    <article v-if="mode==='manual'" class="learning-object" data-testid="sword-manual"><h3>{{C.swordManual.name}}</h3><p>剑修终结术法伤害 +{{C.swordManual.damageBonus}}；不改变当前配装。</p><small v-if="!manualComplete">破庙交易已获得同一启迪时，不重复收费。</small><strong data-testid="manual-effect">当前伤害加成 {{stats(game).manualDamageBonus}}</strong><small v-if="game.school!=='sword'">当前{{game.school==='talisman'?'符修':'未择剑修'}}无此剑法直接收益；研读记录保留。</small><p v-if="!manualComplete">一次 {{C.swordManual.price}} 灵石 · 60 秒 · 青云宗 · 需{{C.realms[C.swordManual.min].name}}</p><small v-else>首次参悟条件：{{C.swordManual.price}} 灵石 · 60 秒 · 青云宗 · 需{{C.realms[C.swordManual.min].name}}</small><small v-if="!manualComplete">{{unit?.failure?.message}}</small><p v-if="originalManual" data-testid="manual-original-plan">已保存原安排：最多 {{originalManual.plan.maxCycles}} 次 · 每次 {{originalManual.cycleMs/1000}} 秒<br>累计灵石上限 {{originalManual.plan.stoneBudget}} · 保留灵石 {{originalManual.plan.stoneReserve}} · 实耗 {{originalManual.spentStones}} 灵石</p><div v-if="manualComplete" class="manual-next"><button class="primary" data-testid="manual-browse-skills" @click="emit('browse')">翻阅其他功法</button><small>仅查看目录；不换修法、不改配装。</small></div></article>
    <article v-else-if="skill" class="learning-object" :data-testid="'skill-'+selected"><div class="learning-title"><h3>{{skill.name}}</h3><small>{{skill.school==='sword'?'剑修':'符修'}} · {{slots[skill.slot]}} · 需{{C.realms[skill.min].name}}</small></div><p>{{skill.description}}</p><div class="learning-facts"><small>首次研习每卷 {{skill.price}} 灵石 · 30 秒 · 青云宗</small><small data-testid="learn-reason">{{game.learned.includes(selected)?'已掌握，无需再次研习；可原地比较配装':unit?.failure?.message}}</small></div><div class="learning-slot"><span>当前{{slots[skill.slot]}}：</span><strong>{{currentSlot?C.skills[currentSlot].name:'尚未装备'}}</strong><span>所选：{{skill.name}}</span></div></article>
    <div v-else class="catalogue-empty">当前无此类经卷；可翻经架切换流派或查看后续境界。</div>
    </template><template #action>
    <template v-if="mode==='skills'&&skill"><div class="learning-candidate"><button v-if="!game.learned.includes(selected)" :data-testid="'learn-'+selected" :class="{primary:!pending}" :disabled="queue.includes(selected)" @click="add">{{queue.includes(selected)?'已收入卷串':'收入待研卷串'}}</button><button v-else-if="currentSlot!==selected" :data-testid="'equip-'+selected" :class="{primary:!pending}" :disabled="!!conflict||!equip?.allowed" @click="emit('act',{type:'EQUIP',skill:selected})">比较后装入{{slots[skill.slot]}}</button><strong v-else class="art10-equipped-fact">此法已在当前{{slots[skill.slot]}}</strong><small v-if="game.learned.includes(selected)&&currentSlot!==selected&&!conflict" data-testid="equip-reason">{{equip?.failure?.message}}</small><button class="text-button" :data-testid="'track-skill-'+selected" @click="emit('track',{kind:'skill',id:selected})">查看此法筹备</button></div></template>
    </template><template v-if="mode==='manual'&&!manualComplete||mode==='skills'&&queue.length||!!conflict" #authorization>
     <div class="preparation-decision art10-study-authorization" :data-blocked="!!conflict">
      <small v-if="conflict" class="preparation-reason" :data-testid="mode==='skills'&&game.learned.includes(selected)?'equip-reason':undefined" role="status">{{conflict}}</small>
      <template v-if="mode==='manual'&&!manualComplete||mode==='skills'&&queue.length">
      <button v-if="mode==='manual'" class="learning-plan-summary" data-testid="learning-plan-open" @click="openSettings"><strong>仅参悟一次 · 完整安排</strong><small>累计灵石上限 {{budget}} · 保留 {{reserve}}</small></button>
      <div v-else class="art10-authorization-summary"><strong>待研卷串 {{queue.length}} 卷</strong><small>累计灵石上限 {{budget}} · 保留 {{reserve}}</small></div>
      <div v-if="!conflict" class="preparation-estimate" data-testid="preparation-estimate"><template v-if="restart.same"><strong data-testid="paused-plan-progress">{{restart.summary}} {{mode==='manual'?'次':'卷'}}</strong><small>{{restart.note}}</small></template><template v-else><strong>{{forecast.title}}</strong><small>{{forecast.reason}}</small><small>{{planningNote}}</small></template></div>
      <button v-if="(mode==='manual'||pending)&&game.core.world.location!=='sect'" :class="{primary:mode==='manual'||pending>0}" data-testid="preparation-travel" @click="emit('travel',plan)" :disabled="!!conflict||!move.allowed||mode==='skills'&&!queue.length">前往青云宗 · 不自动研习</button><button v-else-if="mode==='manual'||pending" :class="{primary:mode==='manual'||pending>0}" data-testid="preparation-start" @click="emit('start',plan)" :disabled="!!conflict||restart.same||!quote?.allowed">{{conflict?'当前暂不可安排':restart.same?restart.label:restart.label+(mode==='manual'?'安排参悟一次':'开始这段研习')}}</button>
      </template>
     </div>
    </template></JadeStudyScene>
   </div>
  </div>
  <dialog v-if="mode==='skills'" ref="library" class="learning-library-dialog art10-object-dialog" data-testid="learning-library-dialog" aria-labelledby="learning-library-title"><header><h3 id="learning-library-title">经架 · 择卷展读</h3><button type="button" data-testid="learning-library-close" @click="library?.close()">合上经架 · 返回经卷</button></header><p>择卷只查看；收入待研卷串与开始研习须另行点击。</p><div class="learning-filters"><label>流派 <select v-model="filter" @change="filterChanged" aria-label="功法流派"><option value="current">当前修法</option><option value="sword">剑修</option><option value="talisman">符修</option><option value="all">全部</option></select></label><label><input v-model="future" @change="filterChanged" type="checkbox" aria-label="显示后续功法法宝">后续境界</label></div><div class="learning-directory" aria-label="玉简目录"><div class="learning-entries"><button v-for="[id,s] in paged.rows" :key="id" type="button" :data-testid="'skill-select-'+id" :aria-pressed="selected===id" @click="choose(id);library?.close()"><span class="library-book-spine"><GameIcon kind="skill" :id="id"/><strong>{{s.name}}</strong><small>{{slots[s.slot]}} · {{game.learned.includes(id)?game.loadout[s.slot]===id?'已装配':'已掌握':'待研习'}}</small></span></button></div><CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="功法" @change="turn"/></div></dialog>
  <dialog ref="settings" class="learning-plan-dialog" data-testid="learning-plan-dialog" aria-labelledby="learning-plan-title"><h3 id="learning-plan-title">{{mode==='manual'?'剑简参悟':'本段研习'}} · 有限安排</h3><p>这里只调整待确认草案，关闭保留选择；另行点击开始后才保存并执行。</p><div v-if="mode==='skills'" class="learning-queue" aria-label="有限研习清单"><strong>本段清单 · {{queue.length}} / 12 卷</strong><div v-for="id in queued.rows" :key="id" class="learning-queue-row"><span>{{C.skills[id].name}}<small>{{game.learned.includes(id)?'已掌握，重新安排前可移除此卷':C.skills[id].price+' 灵石'}}</small></span><button @click="remove(id)" :aria-label="'移除'+C.skills[id].name">移除</button></div><small v-if="!queue.length">选择未掌握经卷加入清单；跨流派可研习，装备仍需对应修法。</small><CataloguePager v-if="queued.pages>1" :page="queued.page" :pages="queued.pages" :total="queued.total" label="研习清单" @change="queuePage=$event"/></div><div class="preparation-estimate" data-testid="learning-full-estimate"><strong>新安排预演 · {{forecast.title}}</strong><small>{{forecast.reason}}</small><small>{{planningNote}}</small></div><div class="preparation-limits"><label>累计研习灵石预算<input v-model.number="budget" @input="editedLimits=true" type="number" min="0" aria-label="累计研习灵石预算"></label><label>研习灵石保留量<input v-model.number="reserve" @input="editedLimits=true" type="number" min="0" aria-label="研习灵石保留量"></label></div><footer><button data-testid="learning-plan-close" @click="settings?.close()">完成调整 · 返回经卷</button></footer></dialog>
 </section>
</template>
