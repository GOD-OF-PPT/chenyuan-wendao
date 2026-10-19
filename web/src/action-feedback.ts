import type {Action,Game,Move} from '../../src/full/types.ts';
import {gamePhase,type ActionResult} from '../../src/full/contracts.ts';
import type {Observation} from './local-events.ts';
import * as C from '../../src/full/content.ts';
import {formatCosts,formatDelta} from './presentation.ts';
import {ICONS} from './ui-icons.ts';
export type MotionFamily='cultivation'|'travel'|'harvest'|'trade'|'craft'|'forge'|'learning'|'equipment'|'recovery'|'dialogue'|'battle'|'breakthrough'|'trial'|'closure';
type Icon={kind:keyof typeof ICONS;id:string};
type Motion={family:MotionFamily;label:string;icon:Icon;variant:string};
const motion=(family:MotionFamily,label:string,kind:Icon['kind'],id:string,variant='settle'):Motion=>({family,label,icon:{kind,id},variant});
/** Exhaustive presentation vocabulary. No action, cost, chance or reward is resolved here. */
export const ACTION_MOTIONS:Record<Action['type'],Motion>={
 CHOOSE:motion('dialogue','因果已记','nav','karma','choice'),DECIDE:motion('dialogue','抉择落定','nav','karma','choice'),EVENT:motion('dialogue','机缘展开','nav','karma','encounter'),
 TRAVEL:motion('travel','行至新境','nav','explore','arrive'),CULTIVATE:motion('cultivation','气息归元','nav','cultivate','breathe'),SOURCE:motion('harvest','取材归囊','item','herb','gather'),
 BUY:motion('trade','购入物资','item','core','buy'),SELL:motion('trade','售物得石','item','core','sell'),CRAFT:motion('craft','丹成入囊','item','healing_pill','elixir'),
 FORGE:motion('forge','法宝炼成','relic','cloud_mirror','forge'),SCHOOL:motion('learning','道途已择','skill','sword_mind','school'),STUDY:motion('learning','剑简已悟','skill','sword_mind','study'),LEARN:motion('learning','功法已悟','skill','sword_mind','learn'),
 EQUIP:motion('equipment','术法已配','skill','sword_mind','equip'),EQUIP_RELIC:motion('equipment','法宝已定','relic','cloud_mirror','relic'),USE:motion('recovery','丹药化开','item','healing_pill','medicine'),REST:motion('recovery','静养回元','item','healing_pill','rest'),
 ENCOUNTER:motion('battle','战意初起','nav','explore','challenge'),BATTLE:motion('battle','本回合已结算','skill','sword_build','round'),BREAKTHROUGH:motion('breakthrough','破境灵光','nav','cultivate','ascend'),
 START_TRIAL:motion('trial','登台问心','item','ascension_seal','enter'),ANSWER_TRIAL:motion('trial','心印已定','item','ascension_seal','answer'),END:motion('closure','此生封卷','action','export','ascended'),
 RETIRE:motion('closure','归隐收卷','action','export','retired'),END_LIFE:motion('closure','寿尽收卷','action','export','lifespan'),
};
export const MOVE_MOTIONS:Record<Move,{label:string;variant:string}>={attack:{label:'普通攻击',variant:'attack'},guard:{label:'凝神护体',variant:'guard'},technique:{label:'起手术法',variant:'technique'},release:{label:'终结术法',variant:'release'},heal:{label:'服丹回春',variant:'heal'},restore:{label:'服丹回灵',variant:'restore'},flee:{label:'撤离战局',variant:'flee'}};
export interface ActionNotice extends Motion{key:string;operation:Action['type']|'CREATE'|'IMPORT'|'RESTORE';delta:string;summary:string;major:boolean;terminal:boolean;numbers:{target:'player'|'enemy';value:number;label:string}[]}
function validVersions(result:ActionResult,game:Game){const v=result.versions;return v.format===game.format&&v.version===game.version&&v.schemaVersion===game.core.schemaVersion&&v.contentVersion===game.core.contentVersion&&v.balanceVersion===game.core.balanceVersion;}
export function describeAction(result:ActionResult,game:Game,observation:Observation,before:Game|null):ActionNotice|null{
 const definition=ACTION_MOTIONS[result.type];if(!definition)return null;
 const row={...definition,icon:{...definition.icon}},action=observation.action;
 if(result.type==='TRAVEL')row.label='抵达'+C.locations[game.core.world.location].name;
 if(result.type==='BREAKTHROUGH')row.label=(result.delta.realm.before==='mortal'?'引气入体 · ':'突破 · ')+C.realms[game.core.player.realm].name;
 if(result.type==='SCHOOL'){row.label=game.school==='talisman'?'符道初成':'剑道初成';row.icon={kind:'skill',id:game.school==='talisman'?'talisman_mind':'sword_mind'};}
 if(result.type==='SOURCE'&&typeof action?.sourceId==='string'&&C.sources[action.sourceId]){const source=C.sources[action.sourceId],item=Object.keys(source.items)[0];row.icon={kind:'item',id:item??'core'};}
 if(result.type==='CRAFT'&&typeof action?.recipeId==='string'&&C.recipes[action.recipeId]){const item=C.recipes[action.recipeId].output;row.label='丹成 · '+C.items[item].name;row.icon={kind:'item',id:item};}
 if(result.type==='ENCOUNTER'&&game.battle&&C.enemies[game.battle.enemy])row.label='迎战 · '+C.enemies[game.battle.enemy].name;
 if(result.type==='LEARN'&&typeof action?.skill==='string'&&C.skills[action.skill]){row.label='领悟 · '+C.skills[action.skill].name;row.icon={kind:'skill',id:action.skill};}
 if(result.type==='EQUIP'&&typeof action?.skill==='string'&&C.skills[action.skill]){row.label='配装 · '+C.skills[action.skill].name;row.icon={kind:'skill',id:action.skill};}
 if(['FORGE','EQUIP_RELIC'].includes(result.type)&&typeof action?.relic==='string'&&C.relics[action.relic]){row.label=(result.type==='FORGE'?'炼成 · ':'本命 · ')+C.relics[action.relic].name;row.icon={kind:'relic',id:action.relic};}
 if(['BUY','SELL','USE'].includes(result.type)&&typeof action?.item==='string'&&C.items[action.item]){row.label=(result.type==='BUY'?'购入 · ':result.type==='SELL'?'售出 · ':'服用 · ')+C.items[action.item].name;row.icon={kind:'item',id:action.item};}
 if(result.type==='BATTLE'&&typeof action?.move==='string'&&Object.hasOwn(MOVE_MOTIONS,action.move)){
  Object.assign(row,MOVE_MOTIONS[action.move as Move]);
  row.variant=(game.school==='talisman'?'talisman-':'sword-')+row.variant;
  const key=action.move==='release'?'finisher':action.move==='technique'?'builder':null,skill=key&&before?.loadout[key];if(skill&&C.skills[skill])row.label=C.skills[skill].name;
  row.icon=action.move==='heal'?{kind:'item',id:'healing_pill'}:action.move==='restore'?{kind:'item',id:'spirit_pill'}:{kind:'skill',id:game.school==='talisman'?'talisman_build':'sword_build'};
 }
 const terminal=result.type==='BATTLE'&&['battle_won','battle_lost','battle_withdrawn'].some(flag=>observation.flags.includes(flag as Observation['flags'][number]));
 if(terminal){row.label=observation.flags.includes('battle_won')?'战斗胜利':observation.flags.includes('battle_lost')?'败退 · 重新筹备':'撤离战局';row.variant=observation.flags.includes('battle_won')?'victory':observation.flags.includes('battle_lost')?'defeat':'flee';}
 const numbers:ActionNotice['numbers']=[];if(result.delta.hp&&(!terminal||result.delta.hp<0))numbers.push({target:'player',value:result.delta.hp,label:'气血'});
 if(result.type==='BATTLE'&&before?.core.runId===game.core.runId&&before.core.revision===result.revisionBefore&&before.battle&&observation.enemyId===before.battle.enemy){
  const remaining=game.battle?.enemy===before.battle.enemy?game.battle.hp:null;
  if(remaining!==null&&remaining!==before.battle.hp)numbers.push({target:'enemy',value:remaining-before.battle.hp,label:'敌方气血'});
 }
 return {...row,key:JSON.stringify([result.runId,result.commandId]),operation:result.type,major:result.type==='BREAKTHROUGH'||result.type==='BATTLE'||result.phaseBefore.startsWith('trial-')||result.phaseAfter.startsWith('trial-'),terminal,delta:formatDelta(result.delta),summary:`实际 ${result.executedSteps} / ${result.requestedSteps} 次 · ${result.stopReason?.message??formatCosts(result.costs)}`,numbers};
}
/** One bounded, read-only consumer. Seeing a button click is never proof of a successful action. */
export function createActionFeedbackTracker(){
 let run='';const seen=new Set<string>();
 return{consume(observation:Observation|null,game:Game|null,result:ActionResult|null,replayed:boolean,eligible:boolean,before:Game|null=null):ActionNotice|null{
  if(run!==(game?.core.runId??'')){run=game?.core.runId??'';seen.clear();}
  if(!eligible||!game||!observation||observation.observedRevision!==game.core.revision||observation.runId!==run||!observation.commandId)return null;
  if(['action','replay'].includes(observation.kind)){
   if(!result||!observation.result||observation.errorCode||observation.commandId!==result.commandId||observation.sourceRunId!==run||result.runId!==run||result.revisionAfter!==game.core.revision||observation.revisionAfter!==result.revisionAfter||result.revisionAfter!==result.revisionBefore+1||result.executedSteps<1||result.executedSteps>result.requestedSteps||result.phaseAfter!==gamePhase(game)||observation.operation!==result.type||!validVersions(result,game)||result.delta.realm.after!==game.core.player.realm)return null;
   const key=JSON.stringify([run,result.commandId]);if(seen.has(key))return null;seen.add(key);if(seen.size>128)seen.delete(seen.values().next().value!);if(replayed||observation.replayed||observation.kind==='replay')return null;
   return describeAction(result,game,observation,before);
  }
  if(!['new_game','restart','import','restore'].includes(observation.kind)||observation.errorCode||replayed||observation.replayed)return null;
  const operation=observation.kind==='restore'?'RESTORE':observation.kind==='import'?'IMPORT':'CREATE';if(observation.operation!==operation)return null;
  const key=JSON.stringify([run,observation.commandId]);if(seen.has(key))return null;seen.add(key);if(seen.size>128)seen.delete(seen.values().next().value!);
  return{...motion(observation.kind==='restore'?'recovery':'dialogue',({new_game:'此卷初启',restart:'新卷已启',import:'进度已载入',restore:'准备已恢复'}as Record<string,string>)[observation.kind],observation.kind==='restore'?'action':'nav',observation.kind==='restore'?'restore':'karma','control'),key,operation,delta:'当前进度已保存',summary:'查看与演出不会推进游戏月',major:false,terminal:false,numbers:[]};
 }};
}
