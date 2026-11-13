import {createActivity,resumeActivity,pauseActivity,completeActivity,validateActivity,validateActivityMutation} from './activity.ts';
import type {Activity,ActivityPlan,ActivityMutation,ActivityStartOptions} from './activity.ts';
import {resolve,validateGame} from './engine.ts';
import {rulesVersion,activityRulesVersion} from './rule-profile.ts';
import {RuleError} from './errors.ts';
import type {Game,Command} from './types.ts';
import type {ActionResult,SaveCheckpoint} from './contracts.ts';

export const AWAY_LIMIT_MS=8*60*60*1000;
export const AWAY_CHUNK_LIMIT=64;
export interface AwayWindow {id:string;observedAt:number;eligibleUntil:number;discardedMs:number;}
export interface AwaySchedule {
 format:'chenyuan-away-schedule';version:1;rulesVersion:string;
 runId:string;activityId:string;activityRevision:number;generation:number;ownerId:string;gameRevision:number;
 lastObservedAt:number;
 window:AwayWindow|null;
}
export interface ScheduledActivity {activity:Activity;schedule:AwaySchedule;}
export interface ScheduledCycle {
 command:Command;result:ActionResult;activityBefore:Activity;activityAfter:Activity;stateAfter:Game;
 logicalAt:number;observedAt:number;checkpoint:{kind:SaveCheckpoint['kind'];snapshot:Game}|null;
}
export interface ScheduledProgress {state:Game;record:ScheduledActivity;cycles:ScheduledCycle[];more:boolean;}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
function invalid():never{throw new RuleError('SCHEDULE_INVALID','离开安排的时钟或归属无法核对，原记录保留');}
function nowValid(now:number){if(!integer(now))throw new RuleError('CLOCK_INVALID','当前时间无法核对，未推进安排');}
function validateWindow(value:unknown,lastObservedAt:number,active:boolean):asserts value is AwayWindow|null{
 if(value===null)return;
 if(!object(value)||Object.keys(value).sort().join(',')!=='discardedMs,eligibleUntil,id,observedAt'||
    typeof value.id!=='string'||!value.id.trim()||value.id.length>100||!integer(value.observedAt)||
    !integer(value.eligibleUntil)||!integer(value.discardedMs)||value.eligibleUntil<lastObservedAt||
    value.eligibleUntil>value.observedAt||value.eligibleUntil!==lastObservedAt+Math.min(AWAY_LIMIT_MS,value.observedAt-lastObservedAt)||
    value.discardedMs!==value.observedAt-value.eligibleUntil||!active)invalid();
}
function bind(clock:AwaySchedule,activity:Activity):AwaySchedule{
 return{...clock,runId:activity.runId,activityId:activity.id,activityRevision:activity.revision,generation:activity.generation,ownerId:activity.ownerId,gameRevision:activity.gameRevision};
}
export function validateScheduledActivity(value:unknown,game?:Game):asserts value is ScheduledActivity{
 if(!object(value)||Object.keys(value).sort().join(',')!=='activity,schedule')invalid();
 validateActivity(value.activity,game);
 const a=value.activity,s=value.schedule;
 const fields=['format','version','rulesVersion','runId','activityId','activityRevision','generation','ownerId','gameRevision','lastObservedAt','window'];
 if(!object(s)||Object.keys(s).sort().join(',')!==fields.sort().join(',')||s.format!=='chenyuan-away-schedule'||s.version!==1||!integer(s.lastObservedAt))invalid();
 if(s.rulesVersion!==activityRulesVersion(a)||s.runId!==a.runId||s.activityId!==a.id||s.activityRevision!==a.revision||s.generation!==a.generation||s.ownerId!==a.ownerId||s.gameRevision!==a.gameRevision)invalid();
 const w=s.window;
 validateWindow(w,s.lastObservedAt,a.status==='running');
 if(a.status==='running'&&(a.startedAt!>(w===null?s.lastObservedAt:w.eligibleUntil)||w===null&&s.lastObservedAt>=a.dueAt!))invalid();
}
function freshSchedule(game:Game,activity:Activity,now:number):AwaySchedule{
 return{format:'chenyuan-away-schedule',version:1,rulesVersion:rulesVersion(game),runId:activity.runId,activityId:activity.id,activityRevision:activity.revision,generation:activity.generation,ownerId:activity.ownerId,gameRevision:activity.gameRevision,lastObservedAt:now,window:null};
}
function mutationScope(game:Game,activity:Activity,mutation:ActivityMutation,now:number){
 validateActivityMutation(mutation);nowValid(now);
 if(mutation.runId!==game.core.runId)throw new RuleError('RUN_MISMATCH','当前人生已经变化，原安排未推进');
 if(mutation.expectedRevision!==game.core.revision)throw new RuleError('STALE_REVISION','进度已经变化，请读取当前安排');
 if(mutation.expectedActivityId!==activity.id||mutation.expectedActivityRevision!==activity.revision)throw new RuleError('ACTIVITY_STALE','安排已经变化，旧接续未受理');
}
export function createScheduledActivity(game:Game,plan:ActivityPlan,options:ActivityStartOptions):ScheduledActivity{
 const activity=createActivity(game,plan,options);
 const schedule=freshSchedule(game,activity,options.now);
 const out={activity,schedule};validateScheduledActivity(out,game);return out;
}
export function adoptScheduledActivity(game:Game,previous:Activity,mutation:ActivityMutation,now:number):ScheduledActivity{
 validateGame(game);validateActivity(previous,game);mutationScope(game,previous,mutation,now);
 const activity=resumeActivity(game,previous,{ownerId:mutation.ownerId,commandId:mutation.commandId,now});
 const schedule=freshSchedule(game,activity,now);
 const out={activity,schedule};validateScheduledActivity(out,game);return out;
}
function controlScope(game:Game,input:ScheduledActivity,mutation:ActivityMutation,now:number){
 validateGame(game);validateScheduledActivity(input,game);mutationScope(game,input.activity,mutation,now);
}
export function pauseScheduledActivity(game:Game,input:ScheduledActivity,mutation:ActivityMutation,now:number):ScheduledActivity{
 controlScope(game,input,mutation,now);
 if(input.activity.ownerId!==mutation.ownerId)throw new RuleError('ACTIVITY_OWNER','该安排由其他页面接管，请先读取当前进度');
 const activity=pauseActivity(input.activity);
 const schedule=bind({...input.schedule,lastObservedAt:Math.max(now,input.schedule.lastObservedAt,input.schedule.window?.observedAt??0),window:null},activity);
 const out={activity,schedule};validateScheduledActivity(out,game);return out;
}
export function resumeScheduledActivity(game:Game,input:ScheduledActivity,mutation:ActivityMutation,now:number):ScheduledActivity{
 controlScope(game,input,mutation,now);
 if(input.activity.status!=='paused')throw new RuleError('ACTIVITY_NOT_PAUSED','当前安排没有暂停，未重新计时');
 const activity=resumeActivity(game,input.activity,{ownerId:mutation.ownerId,commandId:mutation.commandId,now});
 const schedule=bind({...input.schedule,lastObservedAt:now,window:null},activity);
 const out={activity,schedule};validateScheduledActivity(out,game);return out;
}
export function advanceScheduledActivity(game:Game,input:ScheduledActivity,mutation:ActivityMutation,now:number):ScheduledProgress{
 controlScope(game,input,mutation,now);
 if(now<Math.max(input.schedule.lastObservedAt,input.schedule.window?.observedAt??0))throw new RuleError('CLOCK_REVERSED','系统时间发生回拨，未推进安排');
 if(input.activity.status!=='running')throw new RuleError('ACTIVITY_NOT_RUNNING','当前安排未在运行，未推进');
 let state=structuredClone(game),activity=structuredClone(input.activity),schedule=structuredClone(input.schedule);
 if(activity.ownerId!==mutation.ownerId)activity=resumeActivity(state,activity,{ownerId:mutation.ownerId,commandId:mutation.commandId,now:activity.startedAt!});
 const eligibleUntil=schedule.window?.eligibleUntil??schedule.lastObservedAt+Math.min(AWAY_LIMIT_MS,now-schedule.lastObservedAt);
 const window=schedule.window??{id:mutation.commandId,observedAt:now,eligibleUntil,discardedMs:now-eligibleUntil};
 const cycles:ScheduledCycle[]=[];
 while(activity.status==='running'&&activity.dueAt!==null&&activity.dueAt<=window.eligibleUntil&&cycles.length<AWAY_CHUNK_LIMIT){
  const before=activity,command=before.nextCommand!,logicalAt=before.dueAt!,out=resolve(state,command);
  activity=completeActivity(out.nextState,before,out.result,{commandId:command.commandId,now:logicalAt});
  cycles.push({command:structuredClone(command),result:out.result,activityBefore:before,activityAfter:structuredClone(activity),stateAfter:structuredClone(out.nextState),logicalAt,observedAt:now,checkpoint:out.checkpointKind?{kind:out.checkpointKind,snapshot:state}:null});
  state=out.nextState;
 }
 const more=activity.status==='running'&&activity.dueAt!==null&&activity.dueAt<=window.eligibleUntil;
 if(!more&&activity.status==='running'&&window.discardedMs){
  const revision=activity.revision<Number.MAX_SAFE_INTEGER?activity.revision+1:activity.revision;
  if(activity.revision===Number.MAX_SAFE_INTEGER||activity.dueAt!>Number.MAX_SAFE_INTEGER-window.discardedMs)
   activity={...activity,revision,status:'stopped',nextCommand:null,startedAt:null,dueAt:null,stopReason:{code:'ACTIVITY_TIME_LIMIT',message:'无法安全安排下一周期，已保存本段成果'}};
  else activity={...activity,revision,startedAt:activity.startedAt!+window.discardedMs,dueAt:activity.dueAt!+window.discardedMs};
 }
 schedule=bind({...schedule,lastObservedAt:more?schedule.lastObservedAt:window.observedAt,window:more?window:null},activity);
 const record={activity,schedule};validateScheduledActivity(record,state);return{state,record,cycles,more};
}
