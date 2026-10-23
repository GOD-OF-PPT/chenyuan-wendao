import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolve,validateGame} from '../src/full/engine.ts';
import {remainingMonths} from '../src/full/costs.ts';
import {createActivity,completeActivity,pauseActivity,resumeActivity} from '../src/full/activity.ts';
import {writeObservation,loadedObservation} from '../web/src/local-events.ts';
import {createActivityEffectTracker} from '../web/src/activity-effects.ts';
import {narrativeActivityMatches,narrativeTarget,narrativeObjectMatches} from '../web/src/narrative-effects.ts';
import {driver,fullRoute} from './full-route.mjs';

// Independent lawful rule frames only: these do not prove pixels, wall time or IDB commits.
let sequence=91000;
const uuid=()=> '00000000-0000-4000-8000-'+(sequence++).toString(16).padStart(12,'0');
const command=(g,a)=>({...a,commandId:uuid(),runId:g.core.runId,expectedRevision:g.core.revision});
const apply=(g,a)=>resolve(g,command(g,a)).nextState;
const route=fullRoute('help'),story=driver('help');story.realm();story.go('sect');
let storyBefore=newGame('缘牍核验',uuid());for(const a of story.actions)storyBefore=apply(storyBefore,a);
const checkpoint=id=>{const g=structuredClone(route.checkpoints[id]);g.core.runId=uuid();validateGame(g);return g;};
const beforeVisit=()=>structuredClone(storyBefore);
function settle(before,prior){const formal=resolve(before,prior.nextCommand),activity=completeActivity(formal.nextState,prior,formal.result,{commandId:prior.nextCommand.commandId,now:prior.dueAt}),observation=writeObservation(before,formal.nextState,{kind:'action',command:prior.nextCommand},formal.result,false);return {before,prior,game:formal.nextState,result:formal.result,activity,observation};}
function frame(before,action){validateGame(before);return settle(before,createActivity(before,{kind:'milestone',action,maxCycles:1},{id:uuid(),ownerId:'current-narrative-stage',commandId:uuid(),now:1000}));}
const examples=()=>{
 const visit=frame(beforeVisit(),{type:'EVENT',event:'shen_return'}),question=apply(checkpoint('trial'),{type:'START_TRIAL'}),aged=checkpoint('qi');aged.core.world.elapsedMonths+=remainingMonths(aged)-1;
 return [visit,frame(visit.game,{type:'DECIDE',option:'accept'}),...['accept','release'].map(answer=>frame(question,{type:'ANSWER_TRIAL',answer})),...['transmit','depart'].map(ending=>frame(checkpoint('ending'),{type:'END',ending})),frame(checkpoint('qi'),{type:'RETIRE'}),frame(aged,{type:'END_LIFE'})];
};
const armed=(f,extra=7,matches=narrativeActivityMatches)=>{const t=createActivityEffectTracker(matches,extra);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);return t;};
const consume=(t,f,replayed=false,eligible=true)=>t.consume(f.observation,f.game,f.activity,f.result,replayed,eligible);

test('six narrative action types prove whole selected outcomes once, including both answers and both endings',()=>{
 for(const f of examples()){const raw=JSON.stringify(f),target=narrativeTarget(f.before,f.prior.plan.action),notice=consume(armed(f),f);assert.ok(notice,f.result.type);assert.equal(notice.operation,f.result.type);assert.equal(f.prior.cycleMs,['END','RETIRE','END_LIFE'].includes(f.result.type)?12000:6000);assert.equal(f.activity.completedCycles,1);assert.equal(f.activity.status,'stopped');assert.equal(f.activity.nextCommand,null);assert.deepEqual(f.activity.outcomeGame,f.game);assert.ok(target);assert.equal(target.runId,f.before.core.runId);assert.deepEqual(target.action,f.prior.plan.action);assert.equal(JSON.stringify(f),raw);}
});
test('default zero and other explicit domains remain closed, and the narrative domain rejects opening, breakthrough and trial entry',()=>{
 for(const f of examples())for(const extra of [0,4,5])assert.equal(consume(armed(f,extra),f),null);
 for(const f of [frame(newGame('开卷',uuid()),{type:'CHOOSE',choice:'help'}),frame(checkpoint('qi'),{type:'BREAKTHROUGH'}),frame(checkpoint('trial'),{type:'START_TRIAL'})]){assert.equal(narrativeActivityMatches(f.prior),false);assert.equal(narrativeTarget(f.before,f.prior.plan.action),null);assert.equal(consume(armed(f),f),null);assert.ok(consume(armed(f,7,()=>true),f));}
});
test('current NPC and narrative identity are frozen from the actual origin, with closure restricted to the same life',()=>{
 const frames=examples(),[visit,response]=frames;
 for(const f of [visit,response]){const t=narrativeTarget(f.before,f.prior.plan.action);assert.equal(t.personId,'shen');assert.equal(t.modelKey,'shen_return');assert.equal(narrativeObjectMatches('fate','shen',t),true);assert.equal(narrativeObjectMatches('fate','lu',t),false);assert.equal(narrativeObjectMatches('fate','events',t),false);assert.equal(narrativeObjectMatches('fate','event:shen_return',t),true);assert.equal(narrativeObjectMatches('fate','event:lu_qi',t),false);assert.equal(narrativeObjectMatches('response','question',t),false);assert.equal(narrativeObjectMatches('response','shen_return',t),f.result.type==='DECIDE');}
 for(const f of frames.slice(2)){const t=narrativeTarget(f.before,f.prior.plan.action);if(f.result.type==='ANSWER_TRIAL'){assert.equal(t.modelKey,'question');assert.equal(narrativeObjectMatches('response','question',t),true);assert.equal(narrativeObjectMatches('fate','events',t),false);}else{assert.equal(narrativeObjectMatches('life',f.before.core.runId,t),true);assert.equal(narrativeObjectMatches('life',uuid(),t),false);assert.equal(narrativeObjectMatches('fate','shen',t),false);}}
});
test('refresh, stopped snapshots and loaded or foreign observations cannot acquire an unwitnessed narrative result',()=>{
 for(const f of examples()){const t=createActivityEffectTracker(narrativeActivityMatches,7);assert.equal(consume(t,f),null);t.arm(f.activity,f.game,f.activity.id,f.activity.generation);assert.equal(consume(t,f),null);for(const kind of ['resume','sync'])assert.equal(armed(f).consume(loadedObservation(f.game,kind),f.game,f.activity,f.result,false,true),null);const bad=structuredClone(f);bad.observation.sourceRunId=uuid();const owned=armed(f);assert.equal(consume(owned,bad),null);assert.ok(consume(owned,f));}
});
test('save failure and hidden eligibility stay cold while the first committed same-command retry can appear exactly once',()=>{
 for(const f of examples()){const t=armed(f),bad=structuredClone(f);bad.observation.kind='save_error';bad.observation.errorCode='STORAGE_QUOTA';assert.equal(consume(t,bad),null);assert.equal(consume(t,f,false,false),null);assert.ok(consume(t,f));assert.equal(consume(t,f),null);t.clear();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);}
});
test('every replay signal remains observed without exposing public cycle command identities',()=>{
 for(const f of examples())for(const signal of ['argument','observation','kind']){const raw=JSON.stringify(f),t=armed(f),old=structuredClone(f);if(signal==='observation')old.observation.replayed=true;if(signal==='kind')old.observation.kind='replay';assert.equal(consume(t,old,signal==='argument'),null);t.clear();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);assert.equal(f.observation.commandId,null);assert.equal(f.observation.identifiersRedacted,true);assert.equal(JSON.stringify(f),raw);}
});
test('pause, owner takeover and a new generation fence abandoned narrative commands',()=>{
 for(const f of examples()){const paused=pauseActivity(f.prior),resumed=resumeActivity(f.before,paused,{ownerId:'new-current-scene',commandId:uuid(),now:100000}),next=settle(f.before,resumed),t=armed(f);assert.equal(consume(t,next),null);t.clear();t.arm(resumed,f.before,resumed.id,resumed.generation);assert.equal(consume(t,f),null);assert.ok(consume(t,next));assert.notEqual(resumed.nextCommand.commandId,f.prior.nextCommand.commandId);}
});
test('full narrative Game, result and activity proof rejects causal, history, ending, cost, owner and deadline tampering',()=>{
 for(const f of examples()){
  for(const change of [g=>g.journal.push('未发生的事实'),g=>g.choices.forged='other',g=>g.core.inventory.herb++,g=>g.core.player.name='另一人']){const bad=structuredClone(f);change(bad.game);assert.equal(consume(armed(f),bad),null);}
  for(const change of [r=>r.delta.stones++,r=>r.costs.months++,r=>r.versions.balanceVersion='wrong']){const bad=structuredClone(f);change(bad.result);bad.observation=writeObservation(bad.before,bad.game,{kind:'action',command:bad.prior.nextCommand},bad.result,false);assert.equal(consume(armed(f),bad),null);}
  for(const change of [a=>a.ownerId='foreign',a=>a.generation++,a=>a.cycleMs++,a=>a.originGame.journal.push('伪来路'),a=>a.outcomeGame.ending='retired',a=>a.stopReason.message='伪停止',a=>a.plan.maxCycles++]){const bad=structuredClone(f);change(bad.activity);if(JSON.stringify(bad.activity)===JSON.stringify(f.activity))continue;assert.equal(consume(armed(f),bad),null);}
 }
});
