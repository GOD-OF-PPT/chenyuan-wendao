import {computed,shallowRef,watch} from 'vue';
import type {Game,Command} from '../../src/full/types.ts';
import type {MilestoneAction,MilestonePlan,MilestoneActivity} from '../../src/full/milestones.ts';
import {MILESTONE_CYCLE_MS} from '../../src/full/milestones.ts';
import {getLifeRecord,getStoryContext,getTrialJourney,previewAction} from '../../src/full/queries.ts';
import {ASCENSION_ENDINGS} from '../../src/full/ascension.ts';
import {TRIAL_ANSWERS} from '../../src/full/trial-rules.ts';
import * as C from '../../src/full/content.ts';
import type {MilestoneIntent,useGame} from './store';
import {formatCosts,formatDelta} from './presentation';
import type {Reading} from './story-pages';

type Store=ReturnType<typeof useGame>;
export type PreparedMilestone={intent:MilestoneIntent;command:Command};
export function prepareMilestoneReview(store:Store,action:MilestoneAction):PreparedMilestone|null{
 const intent=store.prepareMilestone(action);if(!intent)return null;
 return{intent,command:{...action,commandId:intent.mutation.commandId,runId:intent.mutation.runId,expectedRevision:intent.mutation.expectedRevision}};
}
export function milestoneReviewStale(store:Store,review:PreparedMilestone|null){
 if(!review)return false;const m=review.intent.mutation,g=store.game,a=store.activity;
 return !g||g.core.runId!==m.runId||g.core.revision!==m.expectedRevision||(a?.id??null)!==m.expectedActivityId||(a?.revision??null)!==m.expectedActivityRevision;
}
export type MilestoneReviewModel={plan:MilestonePlan;snapshot:Game;identity:string;prepared:PreparedMilestone|null;activity:MilestoneActivity|null};
export function useMilestoneReview(store:Store){
 const review=shallowRef<MilestoneReviewModel|null>(null);
 watch(()=>store.activity,a=>{const r=review.value;if(r?.activity&&a?.version===7&&a.id===r.activity.id)review.value={...r,activity:structuredClone(a)};});
 const stale=computed(()=>milestoneReviewStale(store,review.value?.prepared??null));
 const retry=computed(()=>!!review.value?.prepared&&store.canRetryFor(review.value.prepared.command.commandId));
 function close(){const p=review.value?.prepared;if(p)store.discardRetryFor(p.command.commandId);review.value=null;}
 function select(action:MilestoneAction){const prepared=prepareMilestoneReview(store,action);if(!prepared||!store.game)return;review.value={plan:prepared.intent.plan,snapshot:structuredClone(store.game),identity:prepared.command.commandId,prepared,activity:null};}
 function inspect(a:MilestoneActivity){review.value={plan:structuredClone(a.plan),snapshot:structuredClone(a.originGame),identity:a.id,prepared:null,activity:structuredClone(a)};}
 async function confirm(retrying=false){const r=review.value;if(!r?.prepared||store.busy||!retrying&&stale.value)return;if(retrying)await store.retryFor(r.prepared.command.commandId);else await store.startPreparedMilestone(r.prepared.intent);if(review.value===r&&(!store.error||store.wasConfirmedFor(r.prepared.command.commandId,r.prepared.command.runId)))close();}
 return{milestoneReview:review,milestoneStale:stale,milestoneRetry:retry,selectMilestone:select,inspectMilestone:inspect,closeMilestone:close,confirmMilestone:confirm};
}
const opening={help:{label:'赠丹相助',text:'赠出回春丹，结下赠药之缘。'},trade:{label:'以丹换简',text:`以回春丹换得惊鸿剑简；剑修终结伤害增加 ${C.swordManual.damageBonus}。`},leave:{label:'保留丹药',text:'保留回春丹，各自离开。'}} as const;
export function milestonePresentation(game:Game,action:MilestoneAction){
 let title='',speaker='行道之人',portrait='player',body='',effect='',next='本次完成即停，下一活动由你另行安排。';
 switch(action.type){
  case'CHOOSE':{const c=opening[action.choice];title=c.label;speaker='沈清禾';portrait='shen';body='山雨将歇，药修沈清禾向你求药。庙柱上的引气之法人人可习；三种开场皆可入道，剧情不会直接赋予境界。';effect=c.text;next='抉择落定后停止；修炼、旅行与破境仍由你安排。';break;}
  case'EVENT':{const s=getStoryContext(game,action.event);title='拜访 · '+s.name;speaker=s.npc;portrait=({沈清禾:'shen',陆玄松:'lu',裴照:'pei',砚尘:'yan'}as Record<string,string>)[s.npc]??'player';body=s.body;effect='仅在当前地点开启这段机缘，不旅行、不代选或领取选项成果。';next='拜访完成后停为待决定；先读当前机缘，再选择回应。';break;}
  case'DECIDE':{const s=getStoryContext(game,game.core.activeEvent!.id),o=s.options.find(o=>o.id===action.option)!;title=o.label;speaker=s.npc;portrait=({沈清禾:'shen',陆玄松:'lu',裴照:'pei',砚尘:'yan'}as Record<string,string>)[s.npc]??'player';body=s.body;effect=o.detail;next='仅回应当前机缘一次；条件变化停止，不改选其他回应。';break;}
  case'BREAKTHROUGH':{const r=C.realms[game.core.player.realm];title=game.core.player.realm==='mortal'?'引气入体':'凝神突破 · '+C.realms[r.next!].name;body=`当前${r.name}，已保存修为 ${game.core.player.xp} / ${r.xpCap}。${r.pill?`${C.items[r.pill].name}库存 ${game.core.inventory[r.pill]}，本次需一枚。`:'本次引气不消耗突破丹。'}修行没有捷径，仍须满足本境正式条件。`;effect=`仅踏入${C.realms[r.next!].name}，修为按规则重置，气血灵力按新境界恢复。`;next='本境突破后停止；不自动修炼或继续下一次突破。';break;}
  case'START_TRIAL':title='登台问心';speaker='登仙台';body='将当前完整准备与本次入场同时保存。渡劫引按正式规则消耗，物品、配装、人物选择和年月共同构成准备检查点。';effect='只进入问心，不代表已经渡劫成功。';next='入场后停为待问心；答案和当前关战策需要你另行决定。';break;
  case'ANSWER_TRIAL':{const j=getTrialJourney(game)!;title=TRIAL_ANSWERS[action.answer].label;speaker='问心';body=j.openingMemory+'接纳旧我，稳住心神；或放下旧念，以进攻开路。两条道路皆可向前，不另判善恶成败。';effect=TRIAL_ANSWERS[action.answer].record;next='答案保存后进入第一关；当前天劫战策须另行安排，不自动出招。';break;}
  case'END':{const c=ASCENSION_ENDINGS[action.ending];title=c.label;speaker='天门已开';body=c.description;effect='以所选结尾飞升封卷；当前物品、配装与人物记录保留，不新增道具或上界玩法。';next='此卷结束，保留完整生平；不自动开始新人生。';break;}
  case'RETIRE':title='主动归隐';speaker='此生收卷';body=getLifeRecord(game).overview.conclusion;effect='明确结束此生，不消耗剩余游戏月，不写作寿尽；确认收卷不能撤销为继续此卷。';next='保留生平与存档，不自动开始新人生。';break;
  case'END_LIFE':title='度过最后一月';speaker='寿尽收卷';body=getLifeRecord(game).overview.conclusion;effect='消耗最后1游戏月，达到当前境界寿限并结束此生；现实等待不会自行触发寿尽。';next='保留生平与存档，不自动开始新人生。';break;
 }
 const quote=previewAction(game,action),seconds=MILESTONE_CYCLE_MS[action.type]/1000;
 const readings:Reading[]=[{key:'cause',title:'来由',text:body},{key:'effect',title:'所选作用',text:effect},{key:'boundary',title:'完成之后',text:next}];
 return{title,speaker,portrait,body,effect,next,readings,quote,seconds,cost:formatCosts(quote.actualCosts??quote.costs),delta:quote.delta?formatDelta(quote.delta):quote.failure?.message??'等待确认',verb:`安排${title}一次`};
}
const signed=(n:number)=>n>0?'+'+n:String(n);
export function milestoneView(a:MilestoneActivity){
 const v=milestonePresentation(a.originGame,a.plan.action),done=!!a.completedCycles;
 const spent=Object.entries(a.spentItems).map(([id,n])=>C.items[id].name+' ×'+n).join(' · '),gained=Object.entries(a.gainedItems).map(([id,n])=>C.items[id].name+' +'+n).join(' · ');
 const rows=done?[`实际耗物：${spent||'无'} · 灵石 ${a.spentStones} · 游戏月 ${a.spentMonths}`,...(gained?[gained]:[]),`修为 ${signed(a.xpChange)} · 气血 ${signed(a.hpChange)} · 灵力 ${signed(a.mpChange)} · 灵石净变 ${signed(a.gainedStones-a.spentStones)}`]:['本次成本：'+v.cost,'仅执行已选内容一次，未完成前不结算'];
 if(done&&a.outcomeGame?.journal.at(-1))rows.unshift(a.outcomeGame.journal.at(-1)!);
 if(a.stopReason)rows.push(a.stopReason.message);
 const after=a.outcomeGame,action=a.plan.action,realmChanged=after&&after.core.player.realm!==a.originGame.core.player.realm,firstGain=Object.entries(a.gainedItems)[0];
 const result=realmChanged?`${C.realms[a.originGame.core.player.realm].name} → ${C.realms[after.core.player.realm].name}`:firstGain?C.items[firstGain[0]].name+' +'+firstGain[1]:action.type==='EVENT'?'机缘已展开，待回应':action.type==='START_TRIAL'?'已入场，问心待决定':action.type==='ANSWER_TRIAL'?`第 ${after?.trial?.stage??1} 关待战策`:action.type==='RETIRE'?'此生已归隐':action.type==='END_LIFE'?'此生已寿尽':action.type==='CHOOSE'?'开场抉择已落定':'本次回应已记录';
 const cost=formatCosts({items:a.spentItems,stones:a.spentStones,months:a.spentMonths,mp:0});
 const net=([['修为',a.xpChange],['气血',a.hpChange],['灵力',a.mpChange],['灵石',a.gainedStones-a.spentStones]]as const).filter(([,n])=>n!==0).slice(0,2).map(([label,n])=>label+' '+signed(n)).join(' · ');
 const summary=done?[result,'实际成本：'+cost,...(net?[net]:[])]:rows;
 return{name:v.title,noun:'此项',unit:'次',type:a.plan.action.type,rows,summary,details:rows,goal:v.next};
}
