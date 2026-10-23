import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import {newGame,resolve} from '../src/full/engine.ts';
import {createActivity,completeActivity,pauseActivity,resumeActivity} from '../src/full/activity.ts';
import {writeObservation,loadedObservation} from '../web/src/local-events.ts';
import {createAlchemyFeedbackTracker} from '../web/src/alchemy-feedback.ts';
import {feedbackExamples} from './action-feedback-fixtures.mjs';
import {driver} from './full-route.mjs';

// Formal pure-rule frames, not transaction, real-time, UI or human acceptance.
// Reuse the existing lawful action-feedback prefix, then create actual Activity proofs.
const example=feedbackExamples().actions.get('CRAFT');
assert.ok(example);
const uuid=n=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
let identity=20000;
function plan(recipeId,maxCycles=1){const r=C.recipes[recipeId];return{kind:'craft',recipeId,maxCycles,until:'cycles',targetQuantity:null,
 stoneBudget:r.stones*maxCycles,stoneReserve:0,monthBudget:r.months*maxCycles,remainingMonthsReserve:1,itemReserves:{}};}
function settle(before,prior){
 const command=prior.nextCommand;assert.ok(command);
 const resolution=resolve(before,command),game=resolution.nextState,result=resolution.result;
 const activity=completeActivity(game,prior,result,{commandId:command.commandId,now:prior.dueAt});
 const observation=writeObservation(before,game,{kind:'action',command},result,false);
 assert.equal(observation.commandId,null);
 return{before,prior,game,result,activity,observation};
}
function frame(before=example.before,recipeId=example.action.recipeId,maxCycles=1){
 const game=structuredClone(before),activity=createActivity(game,plan(recipeId,maxCycles),{id:uuid(identity++),ownerId:'visible-furnace',commandId:uuid(identity++),now:1000});
 return settle(game,activity);
}
function armed(f){const t=createAlchemyFeedbackTracker();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);return t;}
function consume(t,f,replayed=false,eligible=true){return t.consume(f.observation,f.game,f.activity,f.result,replayed,eligible);}
function replayLawful(actions){let game=newGame('炉体反馈',uuid(identity++));for(const action of actions){game=resolve(game,{...action,commandId:uuid(identity++),runId:game.core.runId,expectedRevision:game.core.revision}).nextState;}return game;}
function stockedLawfully(recipeId,cycles=2){
 const d=driver(),r=C.recipes[recipeId];while(C.rank(d.game.core.player.realm)<C.rank(r.min))d.realm();
 for(const [id,n]of Object.entries(r.inputs))d.resource(id,n*cycles);d.funds(r.stones*cycles);d.go('cave');return replayLawful(d.actions);
}

test('a visible formal furnace binds its full Game, result and Activity once without editing public redaction',()=>{
 const f=frame(),raw=JSON.stringify(f),t=armed(f),notice=consume(t,f);
 assert.deepEqual(notice,{item:C.recipes[f.prior.plan.recipeId].output,quantity:1,label:'丹成 · '+C.items[C.recipes[f.prior.plan.recipeId].output].name});
 assert.equal(consume(t,f),null);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);
 assert.equal(JSON.stringify(f),raw);assert.equal(f.observation.commandId,null);assert.equal(f.observation.identifiersRedacted,true);
});

test('every legal recipe emits only its actual positive item after its own complete formal period',()=>{
 for(const id of Object.keys(C.recipes)){
  const f=frame(stockedLawfully(id),id),raw=JSON.stringify(f),t=armed(f),notice=consume(t,f);
  assert.equal(f.prior.cycleMs,C.recipes[id].months*30000,id);assert.equal(notice.item,C.recipes[id].output,id);assert.equal(notice.quantity,1,id);
  assert.deepEqual(f.result.costs.items,C.recipes[id].inputs,id);assert.equal(f.result.costs.stones,C.recipes[id].stones,id);assert.equal(JSON.stringify(f),raw,id);
 }
});

test('the next automatic cycle needs its own arm and an older result cannot consume that ownership',()=>{
 const first=frame(stockedLawfully('healing',2),'healing',2),second=settle(first.game,first.activity),t=armed(first);
 assert.equal(first.activity.status,'running');assert.ok(consume(t,first));assert.equal(consume(t,second),null);
 t.arm(second.prior,second.before,second.prior.id,second.prior.generation);assert.equal(consume(t,first),null);assert.ok(consume(t,second));assert.equal(consume(t,second),null);
});

test('refresh and history cannot acquire an already completed or foreign-runtime furnace result',()=>{
 const f=frame(),t=createAlchemyFeedbackTracker();assert.equal(consume(t,f),null);
 t.arm(f.activity,f.game,f.activity.id,f.activity.generation);assert.equal(consume(t,f),null);
 for(const bad of [
  {a:{...f.prior,status:'paused'},game:f.before,id:f.prior.id,generation:f.prior.generation},
  {a:f.prior,game:{...f.before,core:{...f.before.core,runId:uuid(9)}},id:f.prior.id,generation:f.prior.generation},
  {a:f.prior,game:f.before,id:uuid(10),generation:f.prior.generation},
  {a:f.prior,game:f.before,id:f.prior.id,generation:f.prior.generation+1},
 ]){const v=createAlchemyFeedbackTracker();v.arm(bad.a,bad.game,bad.id,bad.generation);assert.equal(consume(v,f),null);}
 assert.equal(armed(f).consume(loadedObservation(f.game,'resume'),f.game,f.activity,f.result,false,true),null);
 assert.equal(armed(f).consume(loadedObservation(f.game,'sync'),f.game,f.activity,f.result,false,true),null);
});

test('hidden or deactivated views clear visual ownership and can rearm only a still-current unfinished cycle',()=>{
 const f=frame(),t=armed(f);t.clear();assert.equal(consume(t,f,false,false),null);assert.equal(consume(t,f),null);
 t.arm(f.activity,f.game,f.activity.id,f.activity.generation);assert.equal(consume(t,f),null);
 const current=armed(f);current.clear();current.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.ok(consume(current,f));
});

test('pause and explicit resume replace the cycle generation rather than animating the abandoned old one',()=>{
 const f=frame(stockedLawfully('healing',2),'healing',2),paused=pauseActivity(f.prior),resumed=resumeActivity(f.before,paused,{ownerId:'resumed-furnace',commandId:uuid(identity++),now:100000});
 const next=settle(f.before,resumed),t=armed(f);t.clear();t.arm(resumed,f.before,resumed.id,resumed.generation);
 assert.notEqual(resumed.nextCommand.commandId,f.prior.nextCommand.commandId);assert.equal(consume(t,f),null);assert.ok(consume(t,next));
});

test('replayed results remain remembered even if a later caller relabels that same result as fresh',()=>{
 for(const mode of ['argument','observation','kind']){
  const f=frame(),t=armed(f),old={...f,observation:{...f.observation,...(mode==='observation'?{replayed:true}:mode==='kind'?{kind:'replay'}:{})}};
  assert.equal(consume(t,old,mode==='argument'),null,mode);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null,mode);
 }
});

test('saving, failure and unavailable eligibility never produce a pill; a real first successful retry can produce it once',()=>{
 const f=frame(),t=armed(f);assert.equal(consume(t,f,false,false),null);assert.equal(t.consume(f.observation,null,f.activity,f.result,false,true),null);
 assert.equal(t.consume(f.observation,f.game,null,f.result,false,true),null);assert.equal(t.consume(f.observation,f.game,f.activity,null,false,true),null);
 assert.equal(consume(t,{...f,observation:{...f.observation,kind:'save_error',errorCode:'STORAGE_QUOTA'}}),null);
 assert.ok(consume(t,f));assert.equal(consume(t,f),null);
});

test('foreign observations, changed recipes and incomplete public result facts cannot turn into a craft notice',()=>{
 const f=frame();for(const change of [
  o=>o.runId=uuid(77),o=>o.sourceRunId=uuid(78),o=>o.observedRevision++,o=>o.operation='BUY',o=>o.action.recipeId='healing',
  o=>o.result=null,o=>o.result.stopCode='OTHER',o=>o.result.executedSteps=0,o=>o.result.costs.stones++,o=>o.result.delta.inventory[C.recipes[f.prior.plan.recipeId].output]++,
 ]){const other=structuredClone(f);change(other.observation);assert.equal(consume(armed(f),other),null);}
});

test('matching forged public and private delta still fails the formal one-furnace rule',()=>{
 const f=frame();for(const change of [
  r=>r.delta.inventory[C.recipes[f.prior.plan.recipeId].output]++,r=>r.delta.stones++,r=>r.costs.items[Object.keys(r.costs.items)[0]]++,
  r=>r.costs.months++,r=>r.versions.balanceVersion='wrong',r=>r.requestedSteps=2,r=>r.stopReason={code:'OTHER',message:'not the completed formal furnace'},
 ]){
  const other=structuredClone(f);change(other.result);other.observation=writeObservation(other.before,other.game,{kind:'action',command:other.prior.nextCommand},other.result,false);
  assert.equal(consume(armed(f),other),null);
 }
});

test('the full Game binding rejects unrelated inventory, choices, journal and loadout changes despite a valid cost delta',()=>{
 const f=frame();for(const change of [
  g=>g.journal[0]='伪造旧经历',g=>g.core.inventory.dao++,g=>g.choices.unrecorded='forged',g=>g.core.player.stones++,
  g=>g.core.player.name='被替换的完整状态',g=>g.loadout.relic='jade_seal',
 ]){const other=structuredClone(f);change(other.game);assert.equal(consume(armed(f),other),null);}
});

test('the complete Activity binding rejects another owner, period, plan, total or next-cycle identity',()=>{
 const f=frame(stockedLawfully('healing',2),'healing',2);for(const change of [
  a=>a.id=uuid(99),a=>a.generation++,a=>a.ownerId='another-page',a=>a.gameRevision++,a=>a.revision++,a=>a.plan.stoneBudget++,
  a=>a.spentStones++,a=>a.gainedItems.healing_pill++,a=>a.cycleMs++,a=>a.nextCommand.commandId='unrelated-command',
 ]){const other=structuredClone(f);change(other.activity);assert.equal(consume(armed(f),other),null);}
});

test('arm freezes caller-owned snapshots and repeated arm of the same cycle cannot replace its original Game',()=>{
 const f=frame(),game=structuredClone(f.before),activity=structuredClone(f.prior),t=createAlchemyFeedbackTracker();
 t.arm(activity,game,activity.id,activity.generation);game.journal[0]='later caller mutation';activity.plan.recipeId='healing';
 t.arm(f.prior,f.game,f.prior.id,f.prior.generation);assert.ok(consume(t,f));
});

test('equivalent legitimate key ordering keeps the same complete proof and does not require a new authorization',()=>{
 const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverse(item)])):value;
 const f=frame(),reordered=reverse(f),raw=JSON.stringify(reordered),t=createAlchemyFeedbackTracker();
 t.arm(reordered.prior,reordered.before,reordered.prior.id,reordered.prior.generation);
 assert.deepEqual(consume(t,reordered),consume(armed(f),f));assert.equal(JSON.stringify(reordered),raw);
});
