import { createScheduledActivity, adoptScheduledActivity, advanceScheduledActivity, pauseScheduledActivity, resumeScheduledActivity, validateScheduledActivity } from '../../src/full/scheduled-activity.ts';
import type { AwaySchedule, ScheduledActivity, ScheduledProgress } from '../../src/full/scheduled-activity.ts';
import { validateActivity, validateActivityMutation, validateActivityPlan } from '../../src/full/activity.ts';
import type { Activity, ActivityMutation, ActivityPlan } from '../../src/full/activity.ts';
import type { Game } from '../../src/full/types.ts';
import type { ActionResult } from '../../src/full/contracts.ts';
import { validateGame } from '../../src/full/engine.ts';
import { rulesVersion } from '../../src/full/rule-profile.ts';
import { canonicalFingerprint as fingerprint } from '../../src/full/receipts.ts';
import { RuleError } from '../../src/full/errors.ts';

export type ScheduledInput = { kind:'START'; plan:ActivityPlan; mutation:ActivityMutation } | { kind:'ADVANCE'|'PAUSE'|'RESUME'|'ADOPT'; mutation:ActivityMutation };
export interface ScheduledReceipt {
  format:'chenyuan-scheduled-receipt'; version:1; input:ScheduledInput; fingerprint:string;
  proof:{ stateBefore:Game; activityBefore:Activity|null; scheduleBefore:AwaySchedule|null; observedAt:number;
    stateAfter:Game; recordAfter:ScheduledActivity; cycles:number; more:boolean; result:ActionResult|null };
}
export function scheduledProgress(state:Game,activity:Activity|null,schedule:AwaySchedule|undefined,input:ScheduledInput,now:number,id?:string):ScheduledProgress {
  const m=input.mutation;validateGame(state);validateActivityMutation(m);
  if (m.runId!==state.core.runId) throw new RuleError('RUN_MISMATCH','安排所属人生已经变化');
  if (m.expectedRevision!==state.core.revision) throw new RuleError('STALE_REVISION','进度已变化，请读取最新安排');
  if ((activity?.id??null)!==m.expectedActivityId||(activity?.revision??null)!==m.expectedActivityRevision)
    throw new RuleError('ACTIVITY_STALE','安排已变化，原意图未受理');
  if (input.kind==='START') {
    validateActivityPlan(input.plan);
    if (activity?.status==='running') throw new RuleError('ACTIVITY_RUNNING','先暂停当前安排，再安排新的活动');
    if (!id) throw new RuleError('ACTIVITY_INVALID','新安排缺少身份');
    const record=createScheduledActivity(state,input.plan,{id,ownerId:m.ownerId,commandId:m.commandId,now});
    return {state,record,cycles:[],more:false};
  }
  if (input.kind==='ADOPT') {
    if (!activity) throw new RuleError('ACTIVITY_REQUIRED','尚无可以继续的安排');
    if (schedule) throw new RuleError('SCHEDULE_MODE','该安排已经允许离开累计，请读取当前安排');
    return {state,record:adoptScheduledActivity(state,activity,m,now),cycles:[],more:false};
  }
  if (!activity||!schedule) throw new RuleError('SCHEDULE_REQUIRED','当前安排尚未允许离开累计，请明确继续');
  if (input.kind==='PAUSE'||input.kind==='RESUME') {
    const record=(input.kind==='PAUSE'?pauseScheduledActivity:resumeScheduledActivity)(state,{activity,schedule},m,now);
    return {state,record,cycles:[],more:false};
  }
  return advanceScheduledActivity(state,{activity,schedule},m,now);
}
export function scheduledReceipt(input:ScheduledInput,state:Game,activity:Activity|null,schedule:AwaySchedule|undefined,now:number,progress:ScheduledProgress):ScheduledReceipt {
  return structuredClone({format:'chenyuan-scheduled-receipt',version:1,input,fingerprint:fingerprint(input),
    proof:{stateBefore:state,activityBefore:activity,scheduleBefore:schedule??null,observedAt:now,stateAfter:progress.state,
      recordAfter:progress.record,cycles:progress.cycles.length,more:progress.more,result:progress.cycles.at(-1)?.result??null}});
}
function invalid():never { throw new RuleError('RECEIPT_INVALID','离开安排回执损坏，未重复执行或覆盖原记录'); }
function shape(value:unknown,fields:string[]):asserts value is Record<string,unknown> {
  if (!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==fields.sort().join(',')) invalid();
}
/** Replay proves the original batch; callers still return the latest committed snapshot. */
export function replayScheduledReceipt(value:unknown,current:Game):{receipt:ScheduledReceipt;progress:ScheduledProgress} {
  try {
    shape(value,['format','version','input','fingerprint','proof']);
    if (value.format!=='chenyuan-scheduled-receipt'||value.version!==1) invalid();
    shape(value.input,['kind','mutation',...(value.input&&typeof value.input==='object'&&'kind' in value.input&&value.input.kind==='START'?['plan']:[])]);
    if (!['START','ADVANCE','PAUSE','RESUME','ADOPT'].includes(String(value.input.kind))) invalid();
    const input=value.input as ScheduledInput;validateActivityMutation(input.mutation);
    if (value.fingerprint!==fingerprint(input)) invalid();
    shape(value.proof,['stateBefore','activityBefore','scheduleBefore','observedAt','stateAfter','recordAfter','cycles','more','result']);
    const p=value.proof;validateGame(p.stateBefore);validateGame(p.stateAfter);validateGame(current);
    for (const game of [p.stateBefore,p.stateAfter])
      if (rulesVersion(game)!==rulesVersion(current)||game.core.runId!==current.core.runId||game.core.revision>current.core.revision) invalid();
    if (p.activityBefore!==null) validateActivity(p.activityBefore,p.stateBefore);
    if (p.scheduleBefore!==null) validateScheduledActivity({activity:p.activityBefore,schedule:p.scheduleBefore},p.stateBefore);
    validateScheduledActivity(p.recordAfter,p.stateAfter);
    if (!Number.isSafeInteger(p.observedAt)||Number(p.observedAt)<0) invalid();
    const expected=scheduledProgress(p.stateBefore,p.activityBefore as Activity|null,p.scheduleBefore as AwaySchedule|null??undefined,
      input,Number(p.observedAt),p.recordAfter.activity.id);
    if (fingerprint(expected.state)!==fingerprint(p.stateAfter)||fingerprint(expected.record)!==fingerprint(p.recordAfter)||
        expected.cycles.length!==p.cycles||expected.more!==p.more||fingerprint(expected.cycles.at(-1)?.result??null)!==fingerprint(p.result)) invalid();
    return {receipt:value as unknown as ScheduledReceipt,progress:expected};
  } catch { invalid(); }
}
export function validateScheduledReceipt(value:unknown,current:Game):asserts value is ScheduledReceipt {replayScheduledReceipt(value,current);}
