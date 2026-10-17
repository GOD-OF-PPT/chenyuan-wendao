import type {ActionResult} from '../../src/full/contracts.ts';
import * as C from '../../src/full/content.ts';
export type EffectGroup='entry'|'breakthrough'|'battle'|'trial';
export interface EffectNotice{key:string;group:EffectGroup;label:string;school:'sword'|'talisman'|null}
/** A bounded view-only receipt consumer; timers and animation never enter the rules. */
export function createEffectTracker(){
 let run='';const seen=new Set<string>();
 return {consume(result:ActionResult|null,replayed:boolean,runId:string,revision:number,school:'sword'|'talisman'|null):EffectNotice|null{
  if(run!==runId){run=runId;seen.clear();}
  if(!result||result.runId!==runId||result.revisionAfter!==revision||result.revisionAfter<=result.revisionBefore||result.executedSteps<1)return null;
  const key=runId+':'+result.commandId;if(seen.has(key))return null;seen.add(key);if(seen.size>128)seen.delete(seen.values().next().value!);if(replayed)return null;
  if(result.type==='BREAKTHROUGH'&&result.delta.realm.before!==result.delta.realm.after){const entry=result.delta.realm.before==='mortal';return{key,group:entry?'entry':'breakthrough',label:(entry?'引气入体 · ':'突破 · ')+C.realms[result.delta.realm.after].name,school};}
  if(result.phaseBefore.startsWith('trial-')||result.phaseAfter.startsWith('trial-')||result.type==='START_TRIAL'||result.type==='ANSWER_TRIAL'||result.type==='END')return{key,group:'trial',label:result.phaseAfter==='ascended'?'此生封卷':result.phaseAfter==='trial-ending'?'三关已过':result.phaseAfter==='idle'?'退回筹备':result.type==='START_TRIAL'?'登台问心':'渡劫回响',school};
  if(result.type==='BATTLE')return{key,group:'battle',label:school==='sword'?'剑修斗法':school==='talisman'?'符修斗法':'本回合已结算',school};
  return null;
 }};
}
