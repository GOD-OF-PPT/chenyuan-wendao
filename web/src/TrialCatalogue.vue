<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Game,Action} from '../../src/full/types.ts';
import type {getTrialRecovery} from '../../src/full/queries.ts';
import {getTrialPreparation,getTrialJourney,previewAction} from '../../src/full/queries.ts';
import {intent} from '../../src/full/engine.ts';
import * as C from '../../src/full/content.ts';
import {formatCosts} from './presentation';
import {readingPages,type Reading} from './story-pages';
import {pageSlice} from './play-flow';
import type {CheckpointSummary} from './store';
import type {NavigationRequest} from './navigation';
import type {TrackingTarget} from '../../src/full/goals.ts';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{game:Game;kind:'preparation'|'progress';enabled:boolean;busy:boolean;checkpoint:CheckpointSummary|null;recovery:ReturnType<typeof getTrialRecovery>}>(),emit=defineEmits<{review:[];restore:[];export:[];prepare:[];resume:[];navigate:[NavigationRequest];track:[TrackingTarget]}>();
const mode=ref('required'),page=ref(0),prep=computed(()=>getTrialPreparation(props.game)),journey=computed(()=>getTrialJourney(props.game));
const tabs=computed(()=>props.kind==='preparation'?[['required','必需'],['items','渡劫引'],['optional','可选准备'],['checkpoint','检查点']]:[['required','行程'],['battle','术法战报'],['checkpoint','暂离与恢复']]);
const rows=computed<Reading[]>(()=>{
 const p=prep.value,g=props.game,j=journey.value;
 if(mode.value==='checkpoint')return[{key:'checkpoint',title:'完整准备检查点',testId:props.checkpoint?(props.checkpoint.kind==='trial'?'trial-checkpoint-committed':'trial-existing-checkpoint'):'trial-no-checkpoint',text:props.checkpoint?`已验证${props.checkpoint.kind==='trial'?'渡劫':'突破'}前完整准备，来源进度 ${props.checkpoint.sourceRevision}。恢复物品、年月、装备与人物记录一起回退，不单独返还已耗物。`:'本局没有已验证的完整准备检查点；正式入场成功时才保存本次准备。不能补造未记录快照。'},{key:'leaving',title:'暂离与导出',text:'离开前确认已保存；重开继续同一回合、意图及剑意/符印，不重新抽取。阅读与暂离不推进游戏月。导出进度不含数据库独立准备检查点，导入不会补造检查点。'}];
 if(props.kind==='preparation'){
  if(mode.value==='items')return p.items.map(i=>({key:i.id,title:i.name,testId:'trial-required-item-'+i.id,text:`${i.ready?'已具备':'未具备'} · 库存 ${i.have} · 入场消耗 ${i.quantity}。查看并追踪来源不会获取物品，筹齐后需回到登仙台另行确认。`}));
  if(mode.value==='optional')return[{key:'trial-mana',testId:'trial-mana',title:'灵力与气血',text:`灵力 ${p.preparation.mp} / ${p.preparation.maxMp}，气血 ${p.preparation.hp} / ${p.preparation.maxHp}。灵力不足仍可入场；攻击与护体可回灵，术法按实际灵力消耗。可回洞府疗养。`},{key:'trial-loadout',testId:'trial-loadout',title:'配装与法宝',text:p.preparation.loadout.map(s=>s.name).join(' / ')+' · '+p.preparation.relic+'。法宝可选，三关沿用当前配装。'},{key:'trial-medicine',testId:'trial-medicine',title:'随身丹药',text:p.preparation.medicine.map(i=>i.name+' ×'+i.quantity).join(' · ')+'。战中服丹占一回合，数量由你决定。'},{key:'trial-aid',testId:'trial-aid',title:'护阵约定',text:`天劫各击减伤 ${p.preparation.aid.allDamageReduction}，雷击另减 ${p.preparation.aid.thunderDamageReduction}。没有人物援助也可自行筹备入场，不构成必需门槛。`}];
  return p.mandatory.map(r=>({key:r.id,title:r.label,testId:'trial-required-'+r.id,text:`${r.ready?'已具备':'未具备'} · ${r.value} / ${r.need}`}));
 }
 if(mode.value==='battle'){
  const rows:Reading[]=[];
  for(const slot of ['builder','finisher']as const){const id=g.loadout[slot];if(id)rows.push({key:slot,title:C.skills[id].name,text:C.skills[id].description});}
  if(g.battle){const forecast=intent(g.battle);rows.unshift({key:'intent',title:'当前意图',text:forecast.name+' · 预计伤害 '+forecast.damage});g.battle.log.forEach((text,i)=>rows.push({key:'battle-log-'+i,title:'本场战报 · '+(i+1),text}));}
  if(!g.battle?.log.length)rows.push({key:'no-log',title:'战报',text:'本场尚未行动，实际回合结果会在保存后记录。'});return rows;
 }
 if(j)return[{key:'trial-stage-summary',testId:'trial-stage-summary',title:j.title,text:`已过 ${j.completed} / 3 关。三关沿用当前配装，气血、灵力和已用丹药跨关保留；过关不会补满资源，也不领取普通战利品。`},...j.steps.map(s=>({key:s.id,title:s.name,testId:'trial-step-'+s.id,text:s.status==='complete'?'已完成':s.status==='current'?'当前':'尚未开始'})),...(j.effect?[{key:'trial-selected-effect',testId:'trial-selected-effect',title:'问心之选',text:j.effect+'。本轮贯穿三关，不能在关间改选。'}]:[])];
 const r=props.recovery;if(r)return[{key:'trial-failure-title',testId:'trial-failure-title',title:'本轮渡劫已结束',text:'止于第 '+r.stage+' 关 · '+r.stageName},{key:'trial-failure-reason',testId:'trial-failure-reason',title:'结束原因',text:r.reason},{key:'consumed',testId:r.consumptionKnown?'trial-consumed':'trial-consumed-unknown',title:'实际耗物',text:r.consumptionKnown?(r.consumed.map(i=>i.name+' ×'+i.quantity).join(' · ')||'无'):'缺少可核对的入场快照，不能推断本轮累计耗物。'},{key:'trial-remaining',testId:'trial-remaining',title:'现有库存',text:r.inventory.map(i=>i.name+' ×'+i.quantity).join(' · ')},{key:'continue',title:'重新筹备',text:'本轮不结算战利品。可保留现状回洞府疗养、重新备引和补给，或恢复已有完整准备。已耗物不会单独返还。'}];
 return[{key:'ordinary',title:'斗法说明',text:'普通攻击与护体可回灵，服丹占一回合。查看术法和战报不行动；返回主舞台后选择本回合动作。'}];
});
const pages=computed(()=>readingPages(rows.value)),paged=computed(()=>pageSlice(pages.value,page.value,1));
function select(value:string){mode.value=value;page.value=0;}
watch(()=>props.kind,()=>select('required'));watch(()=>props.game.core.runId,()=>select('required'));
function canGo(location:C.LocationId){return props.enabled&&!props.busy&&prep.value.mandatory.find(r=>r.id==='phase')!.ready&&(props.game.core.world.location===location||previewAction(props.game,{type:'TRAVEL',location}).allowed);}
function go(location:C.LocationId,tab:NavigationRequest['tab'],focusId:string){emit('navigate',{location,tab,focusId,quantity:1});}
</script>
<template>
 <section class="paper play-catalogue story-book trial-book" :data-testid="kind==='preparation'?'trial-preparation':'trial-progress'" tabindex="-1"><header><div><small>登仙问道 · {{kind==='preparation'?'核对准备，不扣物资':'行程随实际行动保存'}}</small><h2 tabindex="-1" :data-testid="kind==='preparation'?'trial-preparation-title':'trial-progress-title'">{{kind==='preparation'?'渡劫准备':journey?'渡劫行程':recovery?'渡劫续行':'术法与战报'}}</h2></div><button v-if="kind==='progress'" data-testid="resume-encounter" @click="emit('resume')">{{game.battle||game.trial?'继续当前遭遇':'返回主舞台'}}</button></header>
  <nav class="catalogue-tabs" aria-label="渡劫篇章"><button v-for="[id,label] in tabs" :key="id" :data-testid="'trial-mode-'+id" :aria-pressed="mode===id" @click="select(id)">{{label}}</button></nav>
  <article v-for="row in paged.rows" :key="row.key+row.part" class="reading-text" :data-page-key="row.key"><small>{{row.title}}<span v-if="row.parts>1"> · {{row.part}} / {{row.parts}}</span></small><p :data-testid="row.testId">{{row.text}}</p></article>
  <div v-if="mode==='items'&&kind==='preparation'" class="story-inline-actions"><button v-for="item in prep.items" :key="item.id" :data-testid="'trial-track-'+item.id" @click="emit('track',{kind:'item',id:item.id,quantity:item.quantity})">追踪{{item.name}}来源</button></div>
  <div v-if="mode==='optional'&&kind==='preparation'" class="story-inline-actions"><button data-testid="trial-go-rest" :disabled="!canGo('cave')" @click="go('cave','修行','rest')">洞府疗养</button><button data-testid="trial-go-equipment" :disabled="!canGo('sect')" @click="go('sect','修行','equipment-panel')">功法法宝</button><button data-testid="trial-go-medicine" :disabled="!canGo('market')" @click="go('market','历练','buy-healing_pill')">坊市丹药</button></div>
  <div v-if="mode==='checkpoint'" class="story-inline-actions"><button data-testid="trial-export-current" @click="emit('export')" :disabled="!enabled||busy">导出当前进度</button><button v-if="checkpoint" :data-testid="kind==='preparation'?'trial-restore-existing':'trial-restore-open'" @click="emit('restore')" :disabled="!enabled||busy">恢复完整准备</button></div>
  <CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="渡劫" @change="page=$event"/>
  <footer v-if="kind==='preparation'" class="story-footer"><div><small data-testid="trial-entry-cost">入场成本：{{formatCosts(prep.costs)}}</small><small data-testid="trial-entry-reason">{{prep.failure?.message??'入场条件已齐，需另行确认。'}}</small></div><button v-if="game.core.world.location!==prep.entryLocation" data-testid="trial-go-terrace" :disabled="!canGo(prep.entryLocation)" @click="go(prep.entryLocation,'修行','trial-preparation-title')">前往登仙台</button><button class="primary" data-testid="trial-review-entry" :disabled="!enabled||busy||!prep.canEnter" @click="emit('review')">核对入场 →</button></footer>
  <footer v-else class="story-footer"><small>阅读/暂离不消耗游戏月，也不重新抽取意图。</small><button v-if="recovery" data-testid="trial-prepare-again" @click="emit('prepare')" :disabled="!enabled||busy">保留现状，重新筹备</button><button v-else-if="journey" @click="emit('resume')">返回当前行动</button></footer>
 </section>
</template>
