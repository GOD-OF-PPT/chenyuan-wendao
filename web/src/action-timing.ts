import type {Action} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
export const ACTION_SECONDS:Record<Action['type'],number>={CHOOSE:.6,DECIDE:.6,EVENT:.6,TRAVEL:.8,CULTIVATE:1.6,SOURCE:1.4,BUY:.7,SELL:.7,CRAFT:2.2,FORGE:2.4,SCHOOL:.8,STUDY:1.4,LEARN:1.6,EQUIP:.6,EQUIP_RELIC:.6,USE:.7,REST:1.8,ENCOUNTER:.8,BATTLE:.7,BREAKTHROUGH:2.4,START_TRIAL:2.4,ANSWER_TRIAL:.8,END:1.8,RETIRE:1.2,END_LIFE:1.4};
export const ACTION_NAMES:Record<Action['type'],string>={CHOOSE:'作出抉择',DECIDE:'回应机缘',EVENT:'拜访故人',TRAVEL:'行路',CULTIVATE:'吐纳修行',SOURCE:'采集与委托',BUY:'采购物资',SELL:'出售物资',CRAFT:'炼制丹药',FORGE:'炼制法宝',SCHOOL:'选择修法',STUDY:'研读剑简',LEARN:'研习功法',EQUIP:'装备功法',EQUIP_RELIC:'装备法宝',USE:'服用丹药',REST:'洞府疗养',ENCOUNTER:'迎战',BATTLE:'斗法行动',BREAKTHROUGH:'凝神突破',START_TRIAL:'登台问心',ANSWER_TRIAL:'回答问心',END:'飞升收卷',RETIRE:'归隐收卷',END_LIFE:'寿尽收卷'};
export function actionSeconds(action:Action){return action.type==='BATTLE'&&action.move==='release'?1.1:ACTION_SECONDS[action.type];}
export function actionLabel(action:Action){
 const fallback=ACTION_NAMES[action.type]??'核对行动';
 if(action.type==='SOURCE')return C.sources[action.sourceId]?.name??fallback;
 if(action.type==='TRAVEL')return C.locations[action.location]?.name?'前往'+C.locations[action.location].name:fallback;
 if(action.type==='CRAFT')return C.recipes[action.recipeId]?.name??fallback;
 if(action.type==='BUY'||action.type==='SELL'||action.type==='USE')return (action.type==='BUY'?'采购':action.type==='SELL'?'出售':'服用')+(C.items[action.item]?.name??'物资');
 if(action.type==='FORGE'||action.type==='EQUIP_RELIC')return (action.type==='FORGE'?'炼制':'装备')+(C.relics[action.relic]?.name??'法宝');
 if(action.type==='LEARN'||action.type==='EQUIP')return (action.type==='LEARN'?'研习':'装备')+(C.skills[action.skill]?.name??'功法');
 if(action.type==='SCHOOL')return action.school==='sword'?'择定剑修':'择定符修';
 if(action.type==='BATTLE')return ({attack:'普通攻击',guard:'凝神护体',technique:'起手术法',release:'终结术法',heal:'服用回春丹',restore:'服用回灵丹',flee:'撤离战局'}as const)[action.move]??fallback;
 return fallback;
}
export type Execution={id:string;label:string;totalMs:number;remainingMs:number;phase:'acting'|'saving';batch:boolean};
type Clock={now:()=>number;set:(callback:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void};
const realClock:Clock={now:()=>performance.now(),set:(f,ms)=>setTimeout(f,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)};
/** A presentation deadline, not a reward clock. Only the caller can submit a command afterwards. */
export function createActionClock(clock:Clock=realClock){
 let token=0,handle:unknown,finish:((completed:boolean)=>void)|null=null;
 function cancel(){token++;if(handle!==undefined)clock.clear(handle);handle=undefined;const settle=finish;finish=null;settle?.(false);}
 return{cancel,wait(milliseconds:number,onTick:(remaining:number)=>void):Promise<boolean>{
  if(!Number.isFinite(milliseconds)||milliseconds<0||milliseconds>2400)throw new Error('行动耗时无效');
  cancel();const owner=token,deadline=clock.now()+milliseconds;
  return new Promise(resolve=>{finish=resolve;function tick(){if(owner!==token)return;const remaining=Math.max(0,deadline-clock.now());onTick(remaining);if(!remaining){handle=undefined;finish=null;resolve(true);}else handle=clock.set(tick,Math.min(100,remaining));}tick();});
 }};
}
