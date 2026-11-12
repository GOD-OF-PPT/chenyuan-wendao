import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import {newGame,resolve,validateGame} from '../src/full/engine.ts';
import {remainingMonths} from '../src/full/costs.ts';
import {createActivity,completeActivity,pauseActivity,resumeActivity,CULTIVATION_CYCLE_MS} from '../src/full/activity.ts';
import {writeObservation,loadedObservation} from '../web/src/local-events.ts';
import {createActivityEffectTracker} from '../web/src/activity-effects.ts';
import {cultivationActivityMatches,cultivationMilestoneMatches,cultivationTarget,cultivationObjectMatches,cultivationGateMatches} from '../web/src/cultivation-effects.ts';
import {narrativeActivityMatches} from '../web/src/narrative-effects.ts';
import {driver,fullRoute} from './full-route.mjs';

// Rule/proof fixtures only: these do not claim elapsed wall time, actual saving or pixels.
let sequence=110000;
const uuid=()=> '00000000-0000-4000-8000-'+(sequence++).toString(16).padStart(12,'0');
const apply=(g,a)=>resolve(g,{...a,commandId:uuid(),runId:g.core.runId,expectedRevision:g.core.revision}).nextState;
const replay=actions=>{let g=newGame('潜修见证',uuid());for(const action of actions)g=apply(g,action);return g;};
const route=fullRoute('help');
const checkpoint=id=>{const g=structuredClone(route.checkpoints[id]);g.core.runId=uuid();validateGame(g);return g;};
const mortal=()=>apply(apply(newGame('初入洞府',uuid()),{type:'CHOOSE',choice:'leave'}),{type:'TRAVEL',location:'cave'});
const qi=()=>apply(checkpoint('mortal'),{type:'BREAKTHROUGH'});
const training=(method='natural',maxCycles=1)=>({kind:'cultivation',method,maxCycles,until:'cycles',stoneBudget:method==='assisted'?20*maxCycles:0,stoneReserve:0});
function settle(before,prior){const command=prior.nextCommand;assert.ok(command);const {nextState:game,result}=resolve(before,command),activity=completeActivity(game,prior,result,{commandId:command.commandId,now:prior.dueAt}),observation=writeObservation(before,game,{kind:'action',command},result,false);return {before,prior,game,result,activity,observation};}
const frame=(before,plan)=>settle(before,createActivity(before,plan,{id:uuid(),ownerId:'current-cultivation-stage',commandId:uuid(),now:1000}));
const milestone=(before,action)=>frame(before,{kind:'milestone',action,maxCycles:1});
const examples=()=>[frame(mortal(),training()),frame(qi(),training('assisted')),...['help','trade','leave'].map(choice=>milestone(newGame('雨夜抉择',uuid()),{type:'CHOOSE',choice})),milestone(checkpoint('qi'),{type:'BREAKTHROUGH'}),milestone(checkpoint('trial'),{type:'START_TRIAL'})];
const matcher=f=>f.prior.version===1?cultivationActivityMatches:cultivationMilestoneMatches;
const armed=(f,extra=f.prior.version,matches=matcher(f))=>{const t=createActivityEffectTracker(matches,extra);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);return t;};
const consume=(t,f,replayed=false,eligible=true)=>t.consume(f.observation,f.game,f.activity,f.result,replayed,eligible);

test('explicit cultivation proves natural and assisted whole Game/cost/Activity outcomes without modifying a frame',()=>{
 for(const f of examples().slice(0,2)){const raw=JSON.stringify(f),notice=consume(armed(f),f);assert.ok(notice);assert.equal(notice.operation,'CULTIVATE');assert.equal(f.prior.cycleMs,CULTIVATION_CYCLE_MS[f.before.core.player.realm]);assert.equal(f.result.costs.months,12);assert.equal(f.result.costs.stones,f.prior.plan.method==='natural'?0:C.assistedCosts[f.before.core.player.realm]);assert.equal(f.game.core.player.xp-f.before.core.player.xp,f.result.delta.xp);assert.equal(f.activity.completedCycles,1);assert.equal(f.activity.status,'stopped');assert.equal(f.activity.nextCommand,null);assert.equal(JSON.stringify(f),raw);}
});
test('natural cycles keep each original realm period and legal one-cycle growth through spirit',()=>{
 for(const before of [mortal(),...['mortal','qi','foundation','golden','nascent'].map(id=>apply(checkpoint(id),{type:'BREAKTHROUGH'}))]){const f=frame(before,training());assert.ok(consume(armed(f),f),before.core.player.realm);assert.equal(f.prior.cycleMs,CULTIVATION_CYCLE_MS[before.core.player.realm]);assert.equal(f.game.core.player.realm,before.core.player.realm);assert.equal(f.result.costs.stones,0);assert.ok(f.result.delta.xp>0);}
});
test('default, zero and existing explicit extras do not admit version one, while malformed zero cannot steal an armed legitimate cycle',()=>{
 const f=frame(qi(),training());for(const extra of [0,4,5,7])assert.equal(consume(armed(f,extra),f),null);
 const implicit=createActivityEffectTracker(cultivationActivityMatches);implicit.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(implicit,f),null);
 const t=armed(f),bad=structuredClone(f.prior);bad.version=0;bad.nextCommand.commandId='malformed-not-a-cycle';t.arm(bad,f.before,bad.id,bad.generation);assert.ok(consume(t,f));
});
test('cultivation witness is bound to actual running method, command and original realm, independent of current preview selection',()=>{
 for(const f of examples().slice(0,2)){const raw=JSON.stringify(f),target=cultivationTarget(f.before,f.prior);assert.ok(target);assert.equal(target.commandId,f.prior.nextCommand.commandId);assert.deepEqual(target.game,f.before);assert.equal(cultivationObjectMatches(f.prior.plan.method,f.before,target),true);assert.equal(cultivationObjectMatches(f.prior.plan.method==='natural'?'assisted':'natural',f.before,target),false);const foreign=structuredClone(f.before);foreign.core.runId=uuid();assert.equal(cultivationObjectMatches(f.prior.plan.method,foreign,target),false);foreign.core.runId=f.before.core.runId;foreign.core.player.realm='foundation';assert.equal(cultivationObjectMatches(f.prior.plan.method,foreign,target),false);for(const change of [a=>a.nextCommand.method=a.plan.method==='natural'?'assisted':'natural',a=>a.nextCommand.count=50,a=>a.realm='spirit']){const bad=structuredClone(f.prior);change(bad);assert.equal(cultivationTarget(f.before,bad),null);}assert.equal(JSON.stringify(f),raw);}
});
test('both successive cycles and the xp-cap final cycle retain actual saved results without granting another realm',()=>{
 const first=frame(mortal(),training('natural',2)),second=settle(first.game,first.activity),t=armed(first);assert.equal(first.activity.status,'running');assert.ok(consume(t,first));assert.equal(consume(t,second),null);t.arm(second.prior,second.before,second.prior.id,second.prior.generation);assert.ok(consume(t,second));assert.equal(second.activity.status,'stopped');assert.equal(second.game.core.player.xp,C.realms.mortal.xpCap);assert.equal(second.game.core.player.realm,'mortal');
 const capped=frame(first.game,{...training('natural',50),until:'xp-cap'});assert.ok(consume(armed(capped),capped));assert.equal(capped.activity.completedCycles,1);assert.equal(capped.activity.status,'stopped');assert.equal(capped.game.core.player.realm,'mortal');
});
test('only opening, ordinary breakthrough and trial entry enter the stage domain with their original 6/30/15 second periods',()=>{
 for(const f of examples().slice(2)){assert.ok(consume(armed(f),f),f.result.type);assert.equal(cultivationMilestoneMatches(f.prior),true);assert.equal(narrativeActivityMatches(f.prior),false);assert.equal(f.prior.cycleMs,{CHOOSE:6000,BREAKTHROUGH:30000,START_TRIAL:15000}[f.result.type]);assert.equal(f.activity.completedCycles,1);assert.equal(f.activity.status,'stopped');assert.deepEqual(f.activity.outcomeGame,f.game);const target=cultivationTarget(f.before,f.prior),kind={CHOOSE:'opening',BREAKTHROUGH:'breakthrough',START_TRIAL:'trial'}[f.result.type];assert.ok(target);assert.equal(cultivationGateMatches(kind,f.before.core.runId,target),true);assert.equal(cultivationGateMatches(kind,uuid(),target),false);assert.equal(cultivationGateMatches(kind,f.before.core.runId,target,{...f.prior.plan.action}),true);assert.equal(cultivationGateMatches(kind,f.before.core.runId,target,{type:'CHOOSE',choice:f.prior.plan.action.choice==='leave'?'help':'leave'}),false);if(f.result.type==='BREAKTHROUGH'){assert.notEqual(f.game.core.player.realm,f.before.core.player.realm);assert.equal(target.realm,f.before.core.player.realm);}if(f.result.type==='START_TRIAL'){assert.equal(f.game.trial.stage,0);assert.equal(f.game.trial.answer,null);assert.equal(f.game.battle,null);}}
});
test('the three-operation domain rejects the six narrative outcomes and unrelated training even under explicit version seven',()=>{
 const d=driver('help');d.realm();d.go('sect');const visit=milestone(replay(d.actions),{type:'EVENT',event:'shen_return'}),question=apply(checkpoint('trial'),{type:'START_TRIAL'}),f=milestone(visit.game,{type:'DECIDE',option:'accept'}),aged=checkpoint('qi');aged.core.world.elapsedMonths+=remainingMonths(aged)-1;
 for(const other of [visit,f,milestone(question,{type:'ANSWER_TRIAL',answer:'accept'}),milestone(checkpoint('ending'),{type:'END',ending:'transmit'}),milestone(checkpoint('qi'),{type:'RETIRE'}),milestone(aged,{type:'END_LIFE'})]){assert.equal(cultivationMilestoneMatches(other.prior),false);assert.equal(cultivationTarget(other.before,other.prior),null);assert.equal(consume(armed(other,7,cultivationMilestoneMatches),other),null);}
 const train=frame(qi(),training());assert.equal(cultivationMilestoneMatches(train.prior),false);assert.equal(consume(armed(train,7,cultivationMilestoneMatches),train),null);for(const m of examples().slice(2))assert.equal(consume(armed(m,1,cultivationActivityMatches),m),null);
});
test('unwitnessed, stopped, loaded and foreign snapshots cannot create either kind of stage result',()=>{
 for(const f of examples()){const t=createActivityEffectTracker(matcher(f),f.prior.version);assert.equal(consume(t,f),null);t.arm(f.activity,f.game,f.activity.id,f.activity.generation);assert.equal(consume(t,f),null);for(const kind of ['resume','sync'])assert.equal(armed(f).consume(loadedObservation(f.game,kind),f.game,f.activity,f.result,false,true),null);for(const change of [o=>o.sourceRunId=uuid(),o=>o.runId=uuid(),o=>o.observedRevision++,o=>o.action.extra='forged']){const bad=structuredClone(f);change(bad.observation);const current=armed(f);assert.equal(consume(current,bad),null);assert.ok(consume(current,f));}}
});
test('failed and ineligible presentations do not claim success while a first same-intent saved retry is one-shot',()=>{
 for(const f of examples()){const t=armed(f),bad=structuredClone(f);bad.observation.kind='save_error';bad.observation.errorCode='STORAGE_QUOTA';assert.equal(consume(t,bad),null);assert.equal(consume(t,f,false,false),null);assert.ok(consume(t,f));assert.equal(consume(t,f),null);t.clear();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);}
});
test('every replay channel is consumed without re-awarding or exposing the private cycle identity',()=>{
 for(const f of examples())for(const signal of ['argument','observation','kind']){const t=armed(f),old=structuredClone(f);if(signal==='observation')old.observation.replayed=true;if(signal==='kind')old.observation.kind='replay';assert.equal(consume(t,old,signal==='argument'),null);t.clear();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);assert.equal(f.observation.commandId,null);assert.equal(f.observation.identifiersRedacted,true);}
});
test('pause, takeover and generation changes fence abandoned commands while a fresh full-period generation may succeed',()=>{
 for(const f of examples()){const paused=pauseActivity(f.prior),resumed=resumeActivity(f.before,paused,{ownerId:'other-cultivation-owner',commandId:uuid(),now:100000}),next=settle(f.before,resumed),t=armed(f);assert.equal(resumed.dueAt-resumed.startedAt,f.prior.cycleMs);assert.equal(consume(t,next),null);t.clear();assert.equal(consume(t,f),null);t.arm(resumed,f.before,resumed.id,resumed.generation);assert.equal(consume(t,f),null);assert.ok(consume(t,next));}
});
test('complete Game, public/private result and whole activity proof reject causal, numerical and ownership tampering',()=>{
 for(const f of examples()){
  for(const change of [g=>g.journal.push('未发生的来路'),g=>g.choices.fabricated='other',g=>g.core.inventory.herb++,g=>g.core.player.name='另一人']){const bad=structuredClone(f);change(bad.game);assert.equal(consume(armed(f),bad),null);}
  for(const change of [r=>r.costs.stones++,r=>r.delta.xp++,r=>r.versions.balanceVersion='wrong']){const bad=structuredClone(f);change(bad.result);bad.observation=writeObservation(bad.before,bad.game,{kind:'action',command:bad.prior.nextCommand},bad.result,false);assert.equal(consume(armed(f),bad),null);}
  for(const change of [a=>a.ownerId='foreign',a=>a.generation++,a=>a.cycleMs++,a=>a.revision++,a=>a.plan.maxCycles++,a=>a.spentStones++]){const bad=structuredClone(f);change(bad.activity);assert.equal(consume(armed(f),bad),null);}
  if(f.prior.version===7)for(const change of [a=>a.originGame.journal.push('伪准备'),a=>a.outcomeGame.choices.fabricated='other',a=>a.stopReason.message='伪终态']){const bad=structuredClone(f);change(bad.activity);assert.equal(consume(armed(f),bad),null);}
 }
});
