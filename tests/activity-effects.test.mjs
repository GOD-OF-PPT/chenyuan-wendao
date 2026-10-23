import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import {newGame,resolve} from '../src/full/engine.ts';
import {createActivity,completeActivity,pauseActivity,resumeActivity} from '../src/full/activity.ts';
import {writeObservation,loadedObservation} from '../web/src/local-events.ts';
import {createActivityEffectTracker} from '../web/src/activity-effects.ts';
import {driver} from './full-route.mjs';

// Lawful pure-rule frames prove visual ownership, not IDB commit, real seconds or pixels.
const uuid=n=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
let identity=50000;
function replay(actions){let g=newGame('行旅取材反馈',uuid(identity++));for(const action of actions)g=resolve(g,{...action,commandId:uuid(identity++),runId:g.core.runId,expectedRevision:g.core.revision}).nextState;return g;}
const sourceGames=new Map(),travelGames=new Map();
function atSource(id){if(!sourceGames.has(id)){const d=driver(),s=C.sources[id];while(C.rank(d.game.core.player.realm)<C.rank(s.min))d.realm();d.go(s.location);sourceGames.set(id,replay(d.actions));}return structuredClone(sourceGames.get(id));}
function beforeTravel(location){if(!travelGames.has(location)){const d=driver();while(d.game.core.player.realm!=='spirit')d.realm();d.go(location==='cave'?'wilderness':'cave');travelGames.set(location,replay(d.actions));}return structuredClone(travelGames.get(location));}
function sourcePlan(id='herbs',maxCycles=1){return{kind:'source',sourceId:id,maxCycles,until:'cycles',target:null,monthBudget:C.sources[id].months*maxCycles,remainingMonthsReserve:1};}
const travelPlan=(location='sect')=>({kind:'travel',location,maxCycles:1});
function settle(before,prior){const command=prior.nextCommand;assert.ok(command);const {nextState:game,result}=resolve(before,command),activity=completeActivity(game,prior,result,{commandId:command.commandId,now:prior.dueAt}),observation=writeObservation(before,game,{kind:'action',command},result,false);return{before,prior,game,result,activity,observation};}
function frame(plan=sourcePlan(),before=plan.kind==='source'?atSource(plan.sourceId):beforeTravel(plan.location)){const game=structuredClone(before),prior=createActivity(game,plan,{id:uuid(identity++),ownerId:'visible-current-scene',commandId:uuid(identity++),now:1000});return settle(game,prior);}
const matching=f=>a=>a.version===f.prior.version&&(a.version===2?a.plan.sourceId===f.prior.plan.sourceId:a.version===6&&a.plan.kind==='travel'&&a.plan.location===f.prior.plan.location);
function armed(f){const t=createActivityEffectTracker(matching(f));t.arm(f.prior,f.before,f.prior.id,f.prior.generation);return t;}
const consume=(t,f,replayed=false,eligible=true)=>t.consume(f.observation,f.game,f.activity,f.result,replayed,eligible);
const twoKinds=()=>[frame(sourcePlan()),frame(travelPlan())];

test('all sixteen legal resource and commission periods report their actual yield only after a complete formal cycle',()=>{
 for(const [id,s] of Object.entries(C.sources)){
  const f=frame(sourcePlan(id)),raw=JSON.stringify(f),notice=consume(armed(f),f);
  assert.ok(notice,id);assert.equal(notice.operation,'SOURCE',id);assert.equal(notice.family,'harvest',id);
  assert.equal(f.prior.cycleMs,s.months*30000,id);assert.equal(f.result.executedSteps,1,id);assert.deepEqual(f.result.delta.inventory,s.items,id);
  assert.equal(f.result.delta.stones,s.stones,id);assert.equal(f.result.costs.months,s.months,id);assert.equal(f.game.core.world.location,s.location,id);
  assert.equal(f.activity.completedCycles,1,id);assert.equal(f.activity.status,'stopped',id);assert.equal(f.activity.nextCommand,null,id);
  for(const [item,n] of Object.entries(s.items))assert.equal(f.game.core.inventory[item],f.before.core.inventory[item]+n,id);
  assert.equal(JSON.stringify(f),raw,id);
 }
});

test('all six explicit trips end at the chosen location after the formal six-second period without extra gathering or spending',()=>{
 for(const location of Object.keys(C.locations)){
  const f=frame(travelPlan(location)),raw=JSON.stringify(f),notice=consume(armed(f),f);
  assert.ok(notice,location);assert.equal(notice.family,'travel',location);assert.equal(notice.operation,'TRAVEL',location);assert.equal(notice.label,'抵达'+C.locations[location].name,location);
  assert.equal(f.prior.cycleMs,6000,location);assert.equal(f.game.core.world.location,location);assert.equal(f.activity.completedCycles,1);assert.equal(f.activity.status,'stopped');assert.equal(f.activity.nextCommand,null);
  assert.deepEqual(f.result.costs,{stones:0,mp:0,months:0,items:{}});assert.deepEqual(f.game.core.inventory,f.before.core.inventory);assert.equal(f.game.core.player.stones,f.before.core.player.stones);assert.equal(f.game.core.player.xp,f.before.core.player.xp);assert.equal(JSON.stringify(f),raw);
 }
});

test('current source and travel effects are one-shot and do not expose or mutate the redacted public cycle identity',()=>{
 for(const f of twoKinds()){
  const raw=JSON.stringify(f),t=armed(f);assert.equal(f.observation.commandId,null);assert.equal(f.observation.identifiersRedacted,true);
  assert.ok(consume(t,f));assert.equal(consume(t,f),null);t.clear();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);
  assert.equal(f.observation.commandId,null);assert.equal(JSON.stringify(f),raw);
 }
});

test('each automatic source cycle needs its own runtime arm and the preceding receipt cannot steal the next cycle',()=>{
 const first=frame(sourcePlan('herbs',2)),second=settle(first.game,first.activity),t=armed(first);
 assert.equal(first.activity.status,'running');assert.ok(consume(t,first));assert.equal(consume(t,second),null);
 t.arm(second.prior,second.before,second.prior.id,second.prior.generation);assert.equal(consume(t,first),null);assert.ok(consume(t,second));assert.equal(consume(t,second),null);
 assert.deepEqual(second.activity.gainedItems,{herb:4});assert.equal(second.activity.spentMonths,2);assert.equal(second.game.core.inventory.herb,first.before.core.inventory.herb+4);
});

test('a valid source target boundary keeps the actual integer yield without turning its stopping receipt into another reward',()=>{
 const before=atSource('herbs'),plan={...sourcePlan('herbs',5),until:'target',target:{kind:'item',id:'herb',quantity:before.core.inventory.herb+3}},first=frame(plan,before),second=settle(first.game,first.activity),t=armed(first);
 assert.ok(consume(t,first));t.arm(second.prior,second.before,second.prior.id,second.prior.generation);assert.ok(consume(t,second));assert.equal(second.activity.status,'stopped');assert.equal(second.activity.stopReason.code,'TARGET_MET');assert.deepEqual(second.activity.gainedItems,{herb:4});
 t.arm(second.activity,second.game,second.activity.id,second.activity.generation);assert.equal(consume(t,second),null);
});

test('refresh, unrelated match domains and foreign runtime or life identities cannot acquire completed results',()=>{
 for(const f of twoKinds()){
  const unarmed=createActivityEffectTracker(matching(f));assert.equal(consume(unarmed,f),null);unarmed.arm(f.activity,f.game,f.activity.id,f.activity.generation);assert.equal(consume(unarmed,f),null);
  const foreign=createActivityEffectTracker(()=>false);foreign.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(foreign,f),null);
  for(const patch of [
   {a:{...f.prior,status:'paused'},g:f.before,id:f.prior.id,generation:f.prior.generation},
   {a:f.prior,g:{...f.before,core:{...f.before.core,runId:uuid(1)}},id:f.prior.id,generation:f.prior.generation},
   {a:f.prior,g:f.before,id:uuid(2),generation:f.prior.generation},
   {a:f.prior,g:f.before,id:f.prior.id,generation:f.prior.generation+1},
  ]){const t=createActivityEffectTracker(matching(f));t.arm(patch.a,patch.g,patch.id,patch.generation);assert.equal(consume(t,f),null);}
  for(const kind of ['resume','sync'])assert.equal(armed(f).consume(loadedObservation(f.game,kind),f.game,f.activity,f.result,false,true),null);
 }
});

test('all replay signals are remembered even if a later caller falsely labels the same receipt as fresh',()=>{
 for(const f of twoKinds())for(const mode of ['argument','observation','kind']){
  const t=armed(f),old={...f,observation:{...f.observation,...(mode==='observation'?{replayed:true}:mode==='kind'?{kind:'replay'}:{})}};
  assert.equal(consume(t,old,mode==='argument'),null,mode);t.clear();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null,mode);
 }
});

test('saving or failed eligibility produces no arrival; the real first committed same-cycle retry is still usable once',()=>{
 for(const f of twoKinds()){
  const t=armed(f);assert.equal(consume(t,f,false,false),null);assert.equal(t.consume(f.observation,null,f.activity,f.result,false,true),null);assert.equal(t.consume(f.observation,f.game,null,f.result,false,true),null);assert.equal(t.consume(f.observation,f.game,f.activity,null,false,true),null);
  assert.equal(consume(t,{...f,observation:{...f.observation,kind:'save_error',errorCode:'STORAGE_ABORTED'}}),null);assert.ok(consume(t,f));assert.equal(consume(t,f),null);
 }
});

test('pause and explicit resume fence the abandoned generation for both gathering and travel',()=>{
 for(const f of twoKinds()){
  const paused=pauseActivity(f.prior),resumed=resumeActivity(f.before,paused,{ownerId:'resumed-current-scene',commandId:uuid(identity++),now:100000}),next=settle(f.before,resumed),t=armed(f);
  assert.notEqual(resumed.generation,f.prior.generation);assert.notEqual(resumed.nextCommand.commandId,f.prior.nextCommand.commandId);assert.equal(consume(t,next),null);
  t.clear();t.arm(resumed,f.before,resumed.id,resumed.generation);assert.equal(consume(t,f),null);assert.ok(consume(t,next));
 }
});

test('clear removes abandoned ownership and can rearm only a still-current unfinished period',()=>{
 for(const f of twoKinds()){
  const t=armed(f);t.clear();assert.equal(consume(t,f),null);t.arm(f.activity,f.game,f.activity.id,f.activity.generation);assert.equal(consume(t,f),null);
  t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.ok(consume(t,f));
 }
});

test('foreign, incomplete or changed public action and result facts fail without consuming a genuine matching receipt',()=>{
 for(const f of twoKinds())for(const [index,change] of [
  o=>o.runId=uuid(10),o=>o.sourceRunId=uuid(11),o=>o.observedRevision++,o=>o.operation='BUY',o=>o.action.extra='unrelated',
  o=>o.result=null,o=>o.result.stopCode='OTHER',o=>o.result.executedSteps=0,o=>o.result.costs.months++,o=>o.result.delta.stones++,
 ].entries()){const other=structuredClone(f);change(other.observation);const t=armed(f),label=f.result.type+' public mutation '+index;assert.equal(consume(t,other),null,label);assert.ok(consume(t,f),label);}
});

test('matching forged public and private deltas or versions still fail the complete formal resolution',()=>{
 for(const f of twoKinds())for(const change of [
  r=>r.delta.stones++,r=>r.costs.months++,r=>r.versions.balanceVersion='wrong',r=>r.requestedSteps=2,r=>r.stopReason={code:'OTHER',message:'not a completed cycle'},
 ]){const other=structuredClone(f);change(other.result);other.observation=writeObservation(other.before,other.game,{kind:'action',command:other.prior.nextCommand},other.result,false);assert.equal(consume(armed(f),other),null);}
});

test('full Game proof rejects unrelated narrative, equipment and inventory changes despite the same visible reward',()=>{
 for(const f of twoKinds())for(const change of [
  g=>g.journal[0]='另一段旧经历',g=>g.core.inventory.dao++,g=>g.choices.unrecorded='forged',g=>g.core.player.name='被替换的完整状态',g=>g.loadout.relic='jade_seal',
 ]){const other=structuredClone(f);change(other.game);assert.equal(consume(armed(f),other),null);}
});

test('complete Activity proof rejects changed owner, stop boundary, duration, plan and accumulated outcomes',()=>{
 for(const f of [frame(sourcePlan('herbs',2)),frame(travelPlan())])for(const change of [
  a=>a.id=uuid(12),a=>a.generation++,a=>a.ownerId='foreign-page',a=>a.gameRevision++,a=>a.revision++,a=>a.cycleMs++,a=>a.completedCycles++,a=>a.stopReason={code:'OTHER',message:'forged stop'},a=>a.plan.maxCycles++,
  a=>a.version===2?a.gainedItems.herb++:a.gainedStones++,
 ]){const other=structuredClone(f);change(other.activity);assert.equal(consume(armed(f),other),null);}
});

test('arming freezes caller snapshots and equivalent property ordering preserves a lawful complete proof',()=>{
 const reverse=v=>Array.isArray(v)?v.map(reverse):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
 for(const f of twoKinds()){
  const g=structuredClone(f.before),a=structuredClone(f.prior),t=createActivityEffectTracker(matching(f));t.arm(a,g,a.id,a.generation);g.journal[0]='caller changed history';a.plan.maxCycles++;
  t.arm(f.prior,f.game,f.prior.id,f.prior.generation);assert.ok(consume(t,f));
  const reordered=reverse(f),raw=JSON.stringify(reordered),second=armed(reordered);assert.deepEqual(consume(second,reordered),consume(armed(f),f));assert.equal(JSON.stringify(reordered),raw);
 }
});
