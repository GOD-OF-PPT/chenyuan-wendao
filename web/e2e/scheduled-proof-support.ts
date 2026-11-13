import {proveRetentionDelta} from './retention-proof-support';
import {expect} from '@playwright/test';
import {resolve} from '../../src/full/engine.ts';
import {createActivity,pauseActivity,resumeActivity,completeActivity} from '../../src/full/activity.ts';
import {canonicalFingerprint} from '../../src/full/receipts.ts';
import {versionsForGame} from '../../src/full/rule-profile.ts';
import {validateScheduledActivity} from '../../src/full/scheduled-activity.ts';
import {validateActivityReceipt} from '../src/activity-persistence.ts';
import {replayScheduledReceipt} from '../src/scheduled-persistence.ts';
import {summarizeAway} from '../src/away-summary.ts';
import type {Game} from '../../src/full/types.ts';

export type ProofMode='scheduled'|'online';
export const proofValue=(raw:any,store:string,key:string)=>raw.rows[store].find((r:any)=>r.key===key)?.value;
const put=(raw:any,store:string,key:string,value:any)=>{
 const rows=raw.rows[store],found=rows.find((r:any)=>r.key===key);
 if(found)found.value=value;else rows.push({key,value});
 expect(rows.every((r:any)=>typeof r.key==='string')).toBe(true);
 rows.sort((a:any,b:any)=>a.key<b.key?-1:a.key>b.key?1:0);
};
const addedReceipts=(raw:any,before:any)=>raw.rows['full-receipts'].filter((r:any)=>!before.rows['full-receipts'].some((old:any)=>old.key===r.key));

/** Strict receipt reader for an explicitly chosen current or historical Interface. */
export function controlActivity(receipt:any,game:Game,kind:string,mode:ProofMode='scheduled'){
 expect(receipt.input.kind).toBe(kind);expect(receipt.fingerprint).toBe(canonicalFingerprint(receipt.input));
 if(mode==='online'){
  expect(receipt.format).toBe('chenyuan-activity-receipt');expect(receipt.version).toBe(1);expect(()=>validateActivityReceipt(receipt,game)).not.toThrow();return receipt.activity;
 }
 expect(receipt.format).toBe('chenyuan-scheduled-receipt');expect(receipt.version).toBe(1);
 const {progress}=replayScheduledReceipt(receipt,game);expect(receipt.proof.stateBefore).toEqual(game);expect(receipt.proof.stateAfter).toEqual(game);expect(progress.state).toEqual(game);expect(progress.cycles).toEqual([]);expect(progress.more).toBe(false);expect(receipt.proof.result).toBeNull();
 return progress.record.activity;
}

/** No filtering away new stores: construct and compare the entire authorized delta. */
export function proveControl(raw:any,before:any,game:Game,kind:string,mode:ProofMode='scheduled'){
 expect(raw.version).toBe(11);expect(before.version).toBe(11);
 const added=addedReceipts(raw,before);expect(added).toHaveLength(1);const row=added[0],r=row.value,a=controlActivity(r,game,kind,mode),m=r.input.mutation;
 expect(row.key).toBe(m.runId+':'+m.commandId);expect(m.runId).toBe(game.core.runId);expect(m.expectedRevision).toBe(game.core.revision);
 const old=proofValue(before,'full-state','activity')??null,clock=proofValue(before,'full-schedules','current');
 expect(m.expectedActivityId).toBe(old?.id??null);expect(m.expectedActivityRevision).toBe(old?.revision??null);
 const expected=structuredClone(before);
 if(mode==='scheduled'){
  expect(r.proof.activityBefore).toEqual(old);expect(r.proof.scheduleBefore).toEqual(clock??null);expect(r.proof.cycles).toBe(0);expect(r.proof.more).toBe(false);
  const record=r.proof.recordAfter;expect(record.activity).toEqual(a);expect(()=>validateScheduledActivity(record,game)).not.toThrow();
  put(expected,'full-schedules','current',record.schedule);
  if(kind==='START'){
   const prefix='activity/'+m.runId+'/'+m.commandId+'/previous';
   if(old)put(expected,'full-backups',prefix+'/activity',old);
   if(clock){
    put(expected,'full-backups',prefix+'/schedule',clock);
    const values=before.rows['full-receipts'].map((v:any)=>v.value).filter((v:any)=>v?.format==='chenyuan-scheduled-receipt');
    const summary=summarizeAway(game,old,clock,values);
    if(summary){const receipts=values.filter((v:any)=>v.input.kind==='ADVANCE'&&v.proof.recordAfter.activity.id===old.id&&(v.proof.scheduleBefore?.window?.id??v.input.mutation.commandId)===summary.id&&v.proof.cycles>0);put(expected,'full-backups',prefix+'/away-summary',{format:'chenyuan-away-summary-archive',version:1,summary,receipts});}
   }
  }
  if(kind==='ADVANCE'){
   expect(old.status).toBe('running');expect(clock.window).toBeNull();expect(r.proof.observedAt).toBeGreaterThanOrEqual(clock.lastObservedAt);expect(r.proof.observedAt).toBeLessThan(old.dueAt);expect(a.startedAt).toBe(old.startedAt);expect(a.dueAt).toBe(old.dueAt);expect(a.plan).toEqual(old.plan);expect(a.completedCycles).toBe(old.completedCycles);
  }
 }else{
  expect(clock).toBeUndefined();expect(before.rows['full-schedules']).toEqual([]);
  const options={ownerId:m.ownerId,commandId:m.commandId,now:a.startedAt};
  const formal=kind==='START'?createActivity(game,r.input.plan,{...options,id:a.id}):kind==='PAUSE'?pauseActivity(old):resumeActivity(game,old,options);
  expect(a).toEqual(formal);
  if(kind==='START'&&old)put(expected,'full-backups','activity/'+m.runId+'/'+m.commandId+'/previous',old);
 }
 expect(proofValue(raw,'full-state','current')).toEqual(game);expect(proofValue(raw,'full-state','activity')).toEqual(a);
 put(expected,'full-state','activity',a);put(expected,'full-receipts',row.key,r);proveRetentionDelta(before,expected,raw,added);
 return{a,raw,r};
}

export function proveCycle(raw:any,accepted:any,before:Game,a:any,mode:ProofMode='scheduled'){
 expect(raw.version).toBe(11);expect(accepted.version).toBe(11);
 expect(proofValue(accepted,'full-state','current')).toEqual(before);expect(proofValue(accepted,'full-state','activity')).toEqual(a);
 const formal=resolve(before,a.nextCommand),after=proofValue(raw,'full-state','current'),key=a.runId+':'+a.nextCommand.commandId,rows=raw.rows['full-receipts'].filter((r:any)=>r.key===key);expect(rows).toHaveLength(1);const receipt=rows[0].value;
 const input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}};
 expect(receipt.format).toBe('chenyuan-activity-receipt');expect(receipt.input).toEqual(input);expect(receipt.fingerprint).toBe(canonicalFingerprint(input));expect(receipt.command).toEqual(a.nextCommand);expect(receipt.result).toEqual(formal.result);expect(after).toEqual(formal.nextState);expect(proofValue(raw,'full-state','previous')).toEqual(before);expect(()=>validateActivityReceipt(receipt,after)).not.toThrow();
 let reconstructionNow:number,batch:any=null;
 const added=addedReceipts(raw,accepted),expected=structuredClone(accepted);
 if(mode==='scheduled'){
  expect(receipt.version).toBe(3);expect(receipt.proof.activityBefore).toEqual(a);expect(receipt.proof.stateAfter).toEqual(after);expect(receipt.proof.logicalAt).toBe(a.dueAt);expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(receipt.proof.logicalAt);reconstructionNow=receipt.proof.logicalAt;
  expect(added).toHaveLength(2);const batchRows=added.filter((row:any)=>row.key!==key);expect(batchRows).toHaveLength(1);const row=batchRows[0];batch=row.value;
  expect(batch.format).toBe('chenyuan-scheduled-receipt');expect(batch.input.kind).toBe('ADVANCE');expect(row.key).toBe(batch.input.mutation.runId+':'+batch.input.mutation.commandId);expect(batch.input.mutation.ownerId).toBe(a.ownerId);
  expect(batch.proof.stateBefore).toEqual(before);expect(batch.proof.activityBefore).toEqual(a);expect(batch.proof.scheduleBefore).toEqual(proofValue(accepted,'full-schedules','current'));expect(batch.proof.stateAfter).toEqual(after);expect(batch.proof.observedAt).toBe(receipt.proof.resolvedAt);expect(batch.proof.cycles).toBe(1);expect(batch.proof.more).toBe(false);expect(batch.proof.result).toEqual(formal.result);
  const replay=replayScheduledReceipt(batch,after);expect(replay.progress.cycles).toHaveLength(1);expect(replay.progress.cycles[0].command).toEqual(a.nextCommand);expect(replay.progress.cycles[0].result).toEqual(formal.result);expect(replay.progress.record.activity).toEqual(receipt.activity);expect(replay.progress.record.schedule.window).toBeNull();expect(replay.progress.record.schedule.lastObservedAt).toBe(receipt.proof.resolvedAt);
  expect(raw.rows['full-schedules'].map((r:any)=>r.key)).toEqual(['current']);expect(proofValue(raw,'full-schedules','current')).toEqual(replay.progress.record.schedule);expect(()=>validateScheduledActivity(replay.progress.record,after)).not.toThrow();
  put(expected,'full-schedules','current',replay.progress.record.schedule);put(expected,'full-receipts',row.key,batch);
 }else{
  expect(added).toHaveLength(1);expect(added[0].key).toBe(key);expect(accepted.rows['full-schedules']).toEqual([]);
  if([5,6,7].includes(a.version)){expect(receipt.version).toBe(2);expect(receipt.proof.activityBefore).toEqual(a);expect(receipt.proof.stateAfter).toEqual(after);reconstructionNow=receipt.proof.resolvedAt;expect(reconstructionNow).toBeGreaterThanOrEqual(a.dueAt);}
  else{expect(receipt.version).toBe(1);expect(receipt).not.toHaveProperty('proof');reconstructionNow=receipt.activity.status==='running'?receipt.activity.startedAt:a.dueAt;}
 }
 const done=completeActivity(after,a,formal.result,{commandId:a.nextCommand.commandId,now:reconstructionNow});expect(receipt.activity).toEqual(done);expect(proofValue(raw,'full-state','activity')).toEqual(done);
 put(expected,'full-state','current',after);put(expected,'full-state','previous',before);put(expected,'full-state','activity',done);put(expected,'full-receipts',key,receipt);
 if(formal.checkpointKind){const cp={format:'chenyuan-checkpoint',version:1,kind:formal.checkpointKind,sourceRunId:before.core.runId,sourceRevision:before.core.revision,versions:versionsForGame(before),snapshot:before},owner={format:'chenyuan-checkpoint-scope',version:1,runId:before.core.runId,sourceRunId:before.core.runId,sourceRevision:before.core.revision,kind:formal.checkpointKind};put(expected,'full-state','checkpoint',cp);put(expected,'full-state','checkpoint-owner',owner);}
 proveRetentionDelta(accepted,expected,raw,mode==='scheduled'?[added.find((r:any)=>r.key===key),added.find((r:any)=>r.key!==key)]:added);
 return{a,before,accepted,after,formal,done,raw,key,receipt,reconstructionNow,batch};
}
