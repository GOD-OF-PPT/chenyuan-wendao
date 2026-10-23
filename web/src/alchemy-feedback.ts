import {canonicalFingerprint as proof} from '../../src/full/receipts.ts';
import {resolve} from '../../src/full/engine.ts';
import type {Game} from '../../src/full/types';
import {completeActivity,type Activity,type CraftActivity} from '../../src/full/activity.ts';
import type {ActionResult} from '../../src/full/contracts';
import type {Observation} from './local-events';
import {createActionFeedbackTracker} from './action-feedback.ts';
import * as C from '../../src/full/content.ts';

/** Local visual ownership only. Never edits public observations, Game or a write command. */
export function createAlchemyFeedbackTracker(){
 const feedback=createActionFeedbackTracker();
 let armed:CraftActivity|null=null,before:Game|null=null;
 return {
  clear(){armed=null;before=null;},
  arm(a:Activity|null,game:Game,id:string,generation:number){
   if(a?.version!==3||a.status!=='running'||a.runId!==game.core.runId||a.id!==id||a.generation!==generation||!a.nextCommand)return;
   if(armed?.nextCommand?.commandId!==a.nextCommand.commandId){armed=structuredClone(a);before=structuredClone(game);}
  },
  consume(o:Observation,g:Game|null,a:Activity|null,r:ActionResult|null,replayed:boolean,eligible:boolean){
   const prior=armed,command=prior?.nextCommand;
   if(!eligible||!prior||!command||!g||a?.version!==3||!r||!o.result||o.errorCode||
    r.type!=='CRAFT'||o.operation!=='CRAFT'||o.action?.recipeId!==prior.plan.recipeId||
    r.commandId!==command.commandId||r.runId!==prior.runId||r.revisionBefore!==prior.gameRevision||
    a.id!==prior.id||a.generation!==prior.generation||a.completedCycles!==prior.completedCycles+1||
    o.sourceRunId!==g.core.runId||o.result.stopCode!==null||
    proof(o.result)!==proof({revisionBefore:r.revisionBefore,revisionAfter:r.revisionAfter,requestedSteps:r.requestedSteps,executedSteps:r.executedSteps,phaseBefore:r.phaseBefore,phaseAfter:r.phaseAfter,costs:r.costs,delta:r.delta,stopCode:null}))return null;
   try{
    if(!before)return null;const resolved=resolve(before,command);
    if(proof(resolved.nextState)!==proof(g)||proof(resolved.result)!==proof(r))return null;
    const expected=completeActivity(g,prior,r,{commandId:command.commandId,now:a.startedAt??prior.dueAt!});
    if(proof(expected)!==proof(a))return null;
   }catch{return null;}
   armed=null;
   const notice=feedback.consume({...o,commandId:command.commandId},g,r,replayed,true);
   if(!notice||notice.family!=='craft')return null;
   const item=C.recipes[prior.plan.recipeId].output,quantity=r.delta.inventory[item]??0;
   return quantity>0?{item,quantity,label:notice.label}:null;
  }
 };
}
