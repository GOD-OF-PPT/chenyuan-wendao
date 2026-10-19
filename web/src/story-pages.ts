import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {gamePhase} from '../../src/full/contracts.ts';
import {getLifeRecord,getStoryContext,getTrialJourney,getAscensionChoices} from '../../src/full/queries.ts';
export type Reading={key:string;title:string;text:string;testId?:string;group?:string};
/** Preserve every code point, whitespace and punctuation; reading pages never edit Game. */
export function textPages(text:string,size=140){if(!Number.isInteger(size)||size<1||size>400)throw new Error('Invalid reading page size');const chars=Array.from(text),out:string[]=[];for(let i=0;i<chars.length;i+=size)out.push(chars.slice(i,i+size).join(''));return out.length?out:[''];}
export function readingPages(rows:Reading[]){return rows.flatMap(row=>textPages(row.text).map((text,part,parts)=>({...row,text,part:part+1,parts:parts.length})));}
export type StoryChoice={id:string;label:string;detail:string;action:Action};
export function narrativeFor(game:Game){
 const phase=gamePhase(game),journey=getTrialJourney(game);
 if(phase==='trial-question'&&journey)return{key:'question',title:'你愿如何面对来路？',speaker:'问心',portrait:'player',body:journey.openingMemory+'接纳旧我，稳住心神；或放下旧念，以进攻开路。两条道路皆可向前，不另判善恶成败。',bodyTest:'trial-question-memory',choices:journey.answers.map(a=>({id:'answer-'+a.id,label:a.label,detail:a.record,action:{type:'ANSWER_TRIAL',answer:a.id}as Action})),memories:journey.memories.map(m=>({key:m.id,title:m.person+' · '+m.title,text:m.text}))};
 if(phase==='trial-ending'){
  const end=getAscensionChoices(game);return{key:'ending',title:'此生，留下些什么？',speaker:'天门已开',portrait:'player',body:end.record.opening.text+end.record.training.school+'的来路已经留在记录中。两种选择都以飞升成功收卷，没有善恶高低。'+end.record.battle.trial+'选择前可查看生平；取消不改变进度，确认保存后才封卷。',bodyTest:'ending-body',choices:end.choices.map(c=>({id:'ending-'+c.ending,label:c.label,detail:c.description,action:{type:'END',ending:c.ending}as Action})),memories:end.record.decisions.map(d=>({key:d.id,title:d.npc+' · '+d.title,text:d.text}))};
 }
 const id=game.core.activeEvent?.id;
 if(id&&id!=='temple') {const story=getStoryContext(game,id);return{key:id,title:story.name,speaker:story.npc,portrait:({沈清禾:'shen',陆玄松:'lu',裴照:'pei',砚尘:'yan'}as Record<string,string>)[story.npc]??'',body:story.body,bodyTest:'event-body',choices:story.options.map(o=>({id:'decide-'+o.id,label:o.label,detail:o.detail,action:{type:'DECIDE',option:o.id}as Action})),memories:getLifeRecord(game).people.filter(p=>p.name===story.npc).flatMap(p=>p.facts.map(f=>({key:f.id,title:p.name+' · '+f.title,text:f.text})))};}
 return null;
}
export function lifeReadings(game:Game):Reading[]{
 const r=getLifeRecord(game),active=game.status==='active';
 const rows:Reading[]=[{group:'life',key:'life-conclusion',title:'此生来路',text:r.overview.conclusion,testId:'life-conclusion'},{group:'life',key:'life-age',title:'岁月',text:`${r.overview.name} · ${r.overview.ageLabel} · ${r.overview.realmName} · 行道${r.overview.elapsedMonths}游戏月。${r.overview.remainingMonths===null?r.overview.limitLabel:`${active?'当前':'封卷时'}寿限${r.overview.limitLabel}，余寿${r.overview.remainingMonths}游戏月。`}`,testId:'life-age'},{group:'life',key:'life-opening',title:'开卷之念',text:r.opening.text,testId:'life-opening'},...r.realms.map(row=>({group:'life',key:'realm-'+row.id,title:'境界记录',text:row.text,testId:'life-realms'})),
 {group:'training',key:'school',title:'修法与剑简',text:r.training.school+'。'+r.training.manual},{group:'training',key:'life-skills',title:'已掌握功法',text:r.training.learned.map(s=>s.name).join('、')||'尚无记录',testId:'life-skills'},{group:'training',key:'life-loadout',title:'功法槽',text:r.training.loadout.map(s=>s.name).join(' / '),testId:'life-loadout'},{group:'training',key:'life-relics',title:'法宝',text:(r.training.relics.map(s=>s.name).join('、')||'尚无记录')+'。当前装备：'+r.training.equippedRelic,testId:'life-relics'},
 {group:'seal',key:'snapshot',title:active?'当前状态':'封卷状态',text:`气血 ${r.snapshot.hp} · 灵力 ${r.snapshot.mp} · 修为 ${r.snapshot.xp} · 灵石 ${r.snapshot.stones}`},{group:'seal',key:'life-inventory',title:active?'当前行囊':'封卷行囊',text:(r.snapshot.inventory.map(i=>i.name+' ×'+i.quantity).join(' · ')||'行囊无存物')+'。只列当前库存，不推断累计获得。',testId:'life-inventory'},
 ...r.decisions.map(d=>({group:'decisions',key:d.id,title:d.npc+' · '+d.title,text:d.text,testId:'life-decisions'})),{group:'decisions',key:'life-pledges',title:'护阵之约',text:r.pledges.text,testId:'life-pledges'},{group:'decisions',key:'life-battles',title:'交锋记录',text:r.battle.text+' '+r.battle.trial,testId:'life-battles'},
 ...r.people.map(p=>({group:'decisions',key:'person-'+p.id,title:p.name+' · '+p.label,text:p.facts.map(f=>f.title+'：'+f.text).join('\n')||p.note})),
 {group:'seal',key:'scope',title:'记录范围',text:r.scope},{group:'seal',key:'identity',title:'存档身份',text:r.source.runId+' · 进度 '+r.source.revision+' · '+r.source.contentVersion+' / '+r.source.balanceVersion},{group:'seal',key:'recovery-note',title:'准备恢复',text:'恢复会回退完整准备，包括物品、年月、装备与人物记录，不保留此后所得。没有检查点时不能补造快照。生平文本不含完整进度，恢复请另行导出存档。',testId:'life-recovery-note'}];
 if(!r.decisions.length)rows.push({group:'decisions',key:'life-no-decisions',title:'实际选择',text:'存档尚无其他事件选择记录，不补写交情或来往。',testId:'life-no-decisions'});
 return rows;
}
