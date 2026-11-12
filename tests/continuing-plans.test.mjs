import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivity,completeActivity,pauseActivity,resumeActivity,previewActivity,validateActivityPlan} from '../src/full/activity.ts';
import {resolve} from '../src/full/engine.ts';
import {driver} from './full-route.mjs';
import {defaultEncounterPlan} from '../src/full/adventure.ts';

const repeatLimit=1_000_000_000;
function sourcePlan(extra={}){return{kind:'source',sourceId:'herbs',maxCycles:repeatLimit,repeat:true,until:'cycles',target:null,monthBudget:80,remainingMonthsReserve:1,...extra};}
function settle(g,a){const out=resolve(g,a.nextCommand);return{g:out.nextState,a:completeActivity(out.nextState,a,out.result,{commandId:a.nextCommand.commandId,now:a.dueAt})};}
const start=(g,p)=>createActivity(g,p,{id:'continuing',ownerId:'one',commandId:'start',now:1000});

test('a new continuing source crosses the old batch bound, pauses and resumes its same cumulative budget',()=>{
  const d=driver();d.go('wilderness');let g=d.game,a=start(g,sourcePlan());
  for(let i=0;i<51;i++)({g,a}=settle(g,a));
  assert.equal(a.status,'running');assert.equal(a.completedCycles,51);assert.equal(a.spentMonths,51);
  const paused=pauseActivity(a),same=structuredClone(paused.plan);
  a=resumeActivity(g,paused,{ownerId:'two',commandId:'resume',now:a.dueAt+1000});
  assert.deepEqual(a.plan,same);assert.equal(a.completedCycles,51);assert.equal(a.spentMonths,51);
  while(a.status==='running')({g,a}=settle(g,a));
  assert.equal(a.completedCycles,80);assert.equal(a.stopReason.code,'ACTIVITY_BUDGET');
});

test('continuing preview is an explicit bounded prefix while target-first stops remain complete',()=>{
  const d=driver();d.go('wilderness');const before=structuredClone(d.game);
  const q=previewActivity(d.game,sourcePlan());assert.equal(q.allowed,true);assert.equal(q.truncated,true);assert.equal(q.cycles,50);assert.equal(q.stopReason,null);
  const target=previewActivity(d.game,sourcePlan({until:'target',target:{kind:'item',id:'herb',quantity:d.game.core.inventory.herb+12}}));
  assert.equal(target.truncated,false);assert.equal(target.cycles,6);assert.equal(target.stopReason.code,'TARGET_MET');assert.deepEqual(d.game,before);
});

test('old five-cycle authorizations keep their shape and stop and malformed repeats are refused',()=>{
  const d=driver();d.go('wilderness');const p=sourcePlan({maxCycles:5});delete p.repeat;
  const original=structuredClone(p);let g=d.game,a=start(g,p);while(a.status==='running')({g,a}=settle(g,a));
  assert.equal(a.completedCycles,5);assert.equal(a.stopReason.code,'CYCLES_COMPLETE');assert.deepEqual(a.plan,original);
  for(const extra of [{repeat:false},{repeat:1},{maxCycles:50}])assert.throws(()=>validateActivityPlan(sourcePlan(extra)));
});

test('a continuing encounter crosses one victory but respects cumulative mana and target stops',()=>{
  const d=driver();d.go('wilderness');const base=d.game,old=defaultEncounterPlan(base,'wolf');
  let g=base,a=start(g,{...old,repeat:true,maxCycles:repeatLimit,maxEncounters:repeatLimit,monthBudget:20,mpBudget:base.core.player.mp});
  while(a.status==='running'&&a.victories===0)({g,a}=settle(g,a));
  assert.equal(a.victories,1);assert.equal(a.status,'running');
  while(a.status==='running')({g,a}=settle(g,a));
  assert.ok(a.spentMp<=base.core.player.mp);assert.ok(['ACTIVITY_BUDGET','ADVENTURE_DANGER','INSUFFICIENT_MP'].includes(a.stopReason.code));
  const target=start(base,{...old,repeat:true,maxCycles:repeatLimit,maxEncounters:repeatLimit,monthBudget:20,mpBudget:base.core.player.mp,target:{item:'core',quantity:base.core.inventory.core+1}});
  g=base;a=target;while(a.status==='running')({g,a}=settle(g,a));assert.equal(a.victories,1);assert.equal(a.stopReason.code,'TARGET_MET');
});

test('repeat is closed to repeatable domains and actual production still consumes every furnace',()=>{
  const d=driver();d.resource('herb',122);d.resource('herb',122);d.funds(130);d.go('cave');const base=d.game;
  const p={kind:'craft',recipeId:'healing',repeat:true,maxCycles:repeatLimit,until:'cycles',targetQuantity:null,stoneBudget:130,stoneReserve:0,monthBudget:100,remainingMonthsReserve:1,itemReserves:{}};
  let g=base,a=start(g,p);for(let i=0;i<51;i++)({g,a}=settle(g,a));assert.equal(a.status,'running');assert.equal(a.spentStones,102);assert.equal(a.spentItems.herb,102);assert.equal(a.gainedItems.healing_pill,51);
  while(a.status==='running')({g,a}=settle(g,a));assert.equal(a.completedCycles,61);assert.equal(a.stopReason.code,'INSUFFICIENT_ITEM');
  for(const p of [{kind:'travel',location:'cave',maxCycles:1,repeat:true},{kind:'milestone',action:{type:'RETIRE'},maxCycles:1,repeat:true},{kind:'rest',maxCycles:1,remainingMonthsReserve:1,repeat:true}])assert.throws(()=>validateActivityPlan(p));
});
