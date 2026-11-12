import test from 'node:test';
import assert from 'node:assert/strict';
import {driver} from './full-route.mjs';

test('returning to the saved source earns four complete periods and keeps the fifteen-second remainder',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');
 const d=driver();d.go('sect');const before=structuredClone(d.game);
 const record=createScheduledActivity(d.game,{kind:'source',sourceId:'work',maxCycles:50,until:'cycles',target:null,monthBudget:600,remainingMonthsReserve:1},{id:'away-source',ownerId:'closed-page',commandId:'away-start',now:1000});
 const out=advanceScheduledActivity(d.game,record,{commandId:'return-first',runId:d.game.core.runId,expectedRevision:d.game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'return-page'},136000);
 assert.equal(out.cycles.length,4);assert.equal(out.state.core.player.stones-before.core.player.stones,80);assert.equal(out.state.core.world.elapsedMonths-before.core.world.elapsedMonths,48);
 assert.equal(out.state.core.revision-before.core.revision,4);assert.equal(out.record.activity.completedCycles,4);assert.equal(out.record.activity.spentMonths,48);
 assert.equal(out.record.activity.dueAt,151000);assert.equal(out.record.activity.dueAt-136000,15000);assert.equal(out.record.activity.ownerId,'return-page');assert.equal(out.more,false);
 assert.deepEqual(d.game,before);assert.equal(record.activity.completedCycles,0);
});


test('the eight-hour window survives chunked page returns and discarded time cannot be collected by refreshing',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');
 const old=await import('../src/legacy/rules-v3/index.ts');let game=old.engine.newGame('原约离开','away-cap');
 for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'},{type:'TRAVEL',location:'sect'}])game=old.engine.advance(game,{...action,commandId:'p-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
 const initial=structuredClone(game),now=1000+24*60*60*1000;
 let record=createScheduledActivity(game,{kind:'source',sourceId:'work',repeat:true,maxCycles:1000000000,until:'cycles',target:null,monthBudget:1200,remainingMonthsReserve:1},{id:'old-away-cap',ownerId:'closed-page',commandId:'cap-start',now:1000});
 let total=0,finished=false;
 for(let n=0;n<20;n++){
  record=structuredClone(record);
  const out=advanceScheduledActivity(game,record,{commandId:'return-'+n,runId:game.core.runId,expectedRevision:game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'page-'+n},now);
  assert.ok(out.cycles.length<=64,'one chunk stays bounded');total+=out.cycles.length;game=out.state;record=out.record;
  if(!out.more){finished=true;break;}
 }
 assert.equal(finished,true);assert.equal(total,960);assert.equal(record.activity.completedCycles,960);assert.equal(record.activity.spentMonths,960);assert.equal(game.core.player.stones-initial.core.player.stones,19200);
 assert.equal(record.activity.dueAt,now+30000);
 const again=advanceScheduledActivity(game,structuredClone(record),{commandId:'another-refresh',runId:game.core.runId,expectedRevision:game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'fresh-page'},now);
 assert.equal(again.cycles.length,0);assert.deepEqual(again.state,game);assert.equal(again.record.activity.dueAt,now+30000);
});


test('a persisted pending window cannot silently shorten its fixed eight-hour cutoff',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');
 const d=driver();d.go('sect');const now=1000+24*60*60*1000;
 const r=createScheduledActivity(d.game,{kind:'source',sourceId:'work',repeat:true,maxCycles:1000000000,until:'cycles',target:null,monthBudget:2000,remainingMonthsReserve:1},{id:'window-proof',ownerId:'old',commandId:'start-proof',now:1000});
 const first=advanceScheduledActivity(d.game,r,{commandId:'observe-proof',runId:d.game.core.runId,expectedRevision:d.game.core.revision,expectedActivityId:r.activity.id,expectedActivityRevision:r.activity.revision,ownerId:'one'},now);assert.equal(first.more,true);
 const bad=structuredClone(first.record);bad.schedule.window.eligibleUntil--;bad.schedule.window.discardedMs++;
 assert.throws(()=>advanceScheduledActivity(first.state,bad,{commandId:'changed-cutoff',runId:first.state.core.runId,expectedRevision:first.state.core.revision,expectedActivityId:bad.activity.id,expectedActivityRevision:bad.activity.revision,ownerId:'two'},now),e=>e.code==='SCHEDULE_INVALID');
});


test('catch-up stops at the saved cumulative budget instead of treating elapsed time as new permission',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');
 const d=driver();d.go('sect');const before=structuredClone(d.game);
 const record=createScheduledActivity(d.game,{kind:'source',sourceId:'work',repeat:true,maxCycles:1000000000,until:'cycles',target:null,monthBudget:24,remainingMonthsReserve:1},{id:'limited-away',ownerId:'old',commandId:'limited-start',now:1000});
 const out=advanceScheduledActivity(d.game,record,{commandId:'limited-return',runId:d.game.core.runId,expectedRevision:d.game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'one'},1000+24*60*60*1000);
 assert.equal(out.cycles.length,2);assert.equal(out.record.activity.spentMonths,24);assert.equal(out.record.activity.stopReason.code,'ACTIVITY_BUDGET');assert.equal(out.record.activity.status,'stopped');assert.equal(out.more,false);
 assert.equal(out.state.core.player.stones-before.core.player.stones,40);assert.deepEqual(out.record.activity.plan,record.activity.plan);assert.deepEqual(d.game,before);
});


test('pausing keeps saved gains cancels the unfinished period and resumes the same remaining authorization',async()=>{
 const {createScheduledActivity,advanceScheduledActivity,pauseScheduledActivity,resumeScheduledActivity}=await import('../src/full/scheduled-activity.ts');
 const d=driver();d.go('sect');
 const mutation=(g,r,id)=>({commandId:id,runId:g.core.runId,expectedRevision:g.core.revision,expectedActivityId:r.activity.id,expectedActivityRevision:r.activity.revision,ownerId:'one'});
 const original=createScheduledActivity(d.game,{kind:'source',sourceId:'work',maxCycles:10,until:'cycles',target:null,monthBudget:120,remainingMonthsReserve:1},{id:'pause-away',ownerId:'one',commandId:'pause-start',now:1000});
 const paid=advanceScheduledActivity(d.game,original,mutation(d.game,original,'pay-four'),136000);
 const paused=pauseScheduledActivity(paid.state,paid.record,mutation(paid.state,paid.record,'pause-four'),141000);
 assert.equal(paused.activity.status,'paused');assert.equal(paused.activity.completedCycles,4);assert.equal(paused.activity.spentMonths,48);assert.deepEqual(paused.activity.plan,original.activity.plan);
 assert.throws(()=>advanceScheduledActivity(paid.state,paused,mutation(paid.state,paused,'paused-return'),141000+8*60*60*1000),e=>e.code==='ACTIVITY_NOT_RUNNING');
 const resumed=resumeScheduledActivity(paid.state,paused,mutation(paid.state,paused,'resume-four'),200000);
 assert.equal(resumed.activity.dueAt,230000);assert.equal(resumed.activity.completedCycles,4);assert.equal(resumed.activity.spentMonths,48);assert.equal(resumed.activity.id,original.activity.id);
 assert.throws(()=>advanceScheduledActivity(paid.state,resumed,mutation(paid.state,paid.record,'old-callback'),230000),e=>e.code==='ACTIVITY_STALE');
 const next=advanceScheduledActivity(paid.state,resumed,mutation(paid.state,resumed,'one-new-period'),230000);
 assert.equal(next.cycles.length,1);assert.equal(next.record.activity.completedCycles,5);assert.equal(next.record.activity.spentMonths,60);
});


test('an explicitly continued old online arrangement keeps its paid totals without retroactive away credit',async()=>{
 const {adoptScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');
 const {createActivity,completeActivity}=await import('../src/full/activity.ts');const {resolve}=await import('../src/full/engine.ts');
 const d=driver();d.go('sect');let game=d.game,a=createActivity(game,{kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},{id:'existing-online',ownerId:'old-page',commandId:'existing-start',now:1000});
 for(let n=0;n<2;n++){const out=resolve(game,a.nextCommand);game=out.nextState;a=completeActivity(game,a,out.result,{commandId:a.nextCommand.commandId,now:a.dueAt});}
 const before=structuredClone(game),at=1000+24*60*60*1000;
 const mutation={commandId:'explicit-adoption',runId:game.core.runId,expectedRevision:game.core.revision,expectedActivityId:a.id,expectedActivityRevision:a.revision,ownerId:'current-page'};
 const record=adoptScheduledActivity(game,a,mutation,at);
 assert.equal(record.activity.id,a.id);assert.deepEqual(record.activity.plan,a.plan);assert.equal(record.activity.completedCycles,2);assert.equal(record.activity.spentMonths,24);assert.equal(record.activity.dueAt,at+30000);assert.deepEqual(game,before);
 const next=advanceScheduledActivity(game,record,{...mutation,commandId:'newly-due',expectedActivityRevision:record.activity.revision},at+30000);
 assert.equal(next.cycles.length,1);assert.equal(next.record.activity.completedCycles,3);assert.equal(next.record.activity.spentMonths,36);assert.equal(next.state.core.player.stones-before.core.player.stones,20);
});


test('wall-clock reversal and invalid time never advance or rewrite a pending catch-up window',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');
 const d=driver();d.go('sect');const now=1000+24*60*60*1000;
 const record=createScheduledActivity(d.game,{kind:'source',sourceId:'work',repeat:true,maxCycles:1000000000,until:'cycles',target:null,monthBudget:2000,remainingMonthsReserve:1},{id:'reverse-window',ownerId:'old',commandId:'reverse-start',now:1000});
 const first=advanceScheduledActivity(d.game,record,{commandId:'reverse-observe',runId:d.game.core.runId,expectedRevision:d.game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'one'},now);
 const before=structuredClone(first);
 const mutation={commandId:'reverse-next',runId:first.state.core.runId,expectedRevision:first.state.core.revision,expectedActivityId:first.record.activity.id,expectedActivityRevision:first.record.activity.revision,ownerId:'two'};
 assert.throws(()=>advanceScheduledActivity(first.state,first.record,mutation,now-1),e=>e.code==='CLOCK_REVERSED');
 for(const at of [-1,1.5,NaN,Infinity])assert.throws(()=>advanceScheduledActivity(first.state,first.record,mutation,at),e=>e.code==='CLOCK_INVALID');
 assert.deepEqual(first,before);
});


test('the last representable return time saves only the capped cycles and safely stops before a new deadline overflows',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');const old=await import('../src/legacy/rules-v3/index.ts');
 let game=old.engine.newGame('截止边界','scheduled-last-time');for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'},{type:'TRAVEL',location:'sect'}])game=old.engine.advance(game,{...action,commandId:'p-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
 let record=createScheduledActivity(game,{kind:'source',sourceId:'work',repeat:true,maxCycles:1000000000,until:'cycles',target:null,monthBudget:1200,remainingMonthsReserve:1},{id:'last-return',ownerId:'old',commandId:'last-start',now:1000}),cycles=0;
 for(let n=0;n<20;n++){
  const out=advanceScheduledActivity(game,record,{commandId:'last-'+n,runId:game.core.runId,expectedRevision:game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'one'},Number.MAX_SAFE_INTEGER);
  cycles+=out.cycles.length;game=out.state;record=out.record;if(!out.more)break;
 }
 assert.equal(cycles,960);assert.equal(record.activity.status,'stopped');assert.equal(record.activity.stopReason.code,'ACTIVITY_TIME_LIMIT');assert.equal(record.activity.nextCommand,null);assert.equal(record.activity.dueAt,null);
});


test('an already selected trial entry completes away but the unknown question remains for the player',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');const {fullRoute}=await import('./full-route.mjs');
 const game=fullRoute().checkpoints.trial,before=structuredClone(game);
 const record=createScheduledActivity(game,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1},{id:'selected-entry',ownerId:'old',commandId:'entry-start',now:1000});
 const out=advanceScheduledActivity(game,record,{commandId:'entry-return',runId:game.core.runId,expectedRevision:game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'one'},1000+24*60*60*1000);
 assert.equal(out.cycles.length,1);assert.equal(out.state.trial.stage,0);assert.equal(out.state.core.activeEvent.id,'trial_question');assert.equal(out.state.battle,null);assert.equal(out.record.activity.status,'stopped');assert.equal(out.more,false);
 assert.equal(out.state.core.inventory.ascension_seal,before.core.inventory.ascension_seal-1);assert.equal(out.cycles[0].checkpoint.kind,'trial');assert.deepEqual(out.cycles[0].checkpoint.snapshot,before);assert.deepEqual(game,before);
});


test('a saved danger strategy pauses the actual battle during catch-up without healing looting or entering another fight',async()=>{
 const {createScheduledActivity,advanceScheduledActivity}=await import('../src/full/scheduled-activity.ts');const {defaultEncounterPlan}=await import('../src/full/adventure.ts');
 const d=driver();d.go('wilderness');const before=structuredClone(d.game),plan=defaultEncounterPlan(d.game,'wolf');
 plan.strategy={...plan.strategy,retreatBelowPercent:99,riskMode:'pause',healingBudget:0,spiritBudget:0,healBelowPercent:0,restoreBelowPercent:0};
 const record=createScheduledActivity(d.game,plan,{id:'danger-away',ownerId:'old',commandId:'danger-start',now:1000});
 const out=advanceScheduledActivity(d.game,record,{commandId:'danger-return',runId:d.game.core.runId,expectedRevision:d.game.core.revision,expectedActivityId:record.activity.id,expectedActivityRevision:record.activity.revision,ownerId:'one'},1000+24*60*60*1000);
 assert.equal(out.cycles.length,2);assert.equal(out.record.activity.status,'paused');assert.equal(out.record.activity.stopReason.code,'ADVENTURE_DANGER');assert.equal(out.more,false);assert.equal(out.state.battle.enemy,'wolf');assert.equal(out.state.wins,before.wins);assert.deepEqual(out.state.core.inventory,before.core.inventory);assert.ok(out.state.core.player.hp<before.core.player.hp);
});
