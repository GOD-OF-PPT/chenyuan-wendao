import {canonicalFingerprint as proof} from '../../src/full/receipts.ts';
import {resolve} from '../../src/full/engine.ts';
import type {Game} from '../../src/full/types.ts';
import {completeActivity,type Activity} from '../../src/full/activity.ts';
import type {ActionResult} from '../../src/full/contracts.ts';
import type {Observation} from './local-events.ts';
import {createActionFeedbackTracker} from './action-feedback.ts';

export function createActivityEffectTracker(matches:(a:Activity)=>boolean,extra:0|4|5|7=0){
 const feedback=createActionFeedbackTracker();let armed:Activity|null=null,before:Game|null=null;
 return {
  clear(){armed=null;before=null;},
  arm(a:Activity|null,g:Game,id:string,generation:number){
   if(!a||!(a.version&&[2,3,6,extra].includes(a.version))||!matches(a)||a.status!=='running'||a.runId!==g.core.runId||a.id!==id||a.generation!==generation||!a.nextCommand)return;
   if(armed?.nextCommand?.commandId!==a.nextCommand.commandId){armed=structuredClone(a);before=structuredClone(g);}
  },
  consume(o:Observation,g:Game|null,a:Activity|null,r:ActionResult|null,replayed:boolean,eligible:boolean){
   const prior=armed,command=prior?.nextCommand;
   if(!eligible||!prior||!command||!g||!a||!matches(a)||!r||!o.result||o.errorCode||r.type!==command.type||o.operation!==command.type||r.commandId!==command.commandId||r.runId!==prior.runId||r.revisionBefore!==prior.gameRevision||a.version!==prior.version||a.id!==prior.id||a.generation!==prior.generation||a.completedCycles!==prior.completedCycles+1||o.sourceRunId!==g.core.runId||r.stopReason!==null||o.result.stopCode!==null)return null;
   try{
    const {type,commandId,runId,expectedRevision,...action}=command;
    if(!['action','replay'].includes(o.kind)||o.runId!==g.core.runId||o.observedRevision!==g.core.revision||o.revisionBefore!==r.revisionBefore||o.revisionAfter!==r.revisionAfter||o.commandId!==null&&o.commandId!==commandId||proof(o.action)!==proof(action)||proof(o.result)!==proof({revisionBefore:r.revisionBefore,revisionAfter:r.revisionAfter,requestedSteps:r.requestedSteps,executedSteps:r.executedSteps,phaseBefore:r.phaseBefore,phaseAfter:r.phaseAfter,costs:r.costs,delta:r.delta,stopCode:null})||!before)return null;
    const resolved=resolve(before,command);
    if(proof(resolved.nextState)!==proof(g)||proof(resolved.result)!==proof(r))return null;
    const expected=completeActivity(g,prior,r,{commandId,now:a.startedAt??prior.dueAt!});
    if(proof(expected)!==proof(a))return null;
   }catch{return null;}
   armed=null;return feedback.consume({...o,commandId:command.commandId},g,r,replayed,true);
  }
 };
}
