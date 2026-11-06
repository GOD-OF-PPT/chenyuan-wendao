import test from 'node:test';
import assert from 'node:assert/strict';
import{driver}from'./full-route.mjs';
import{lifespanFixture,atLocation}from'./lifespan-guidance-fixtures.mjs';
import{newGame,resolve}from'../src/full/engine.ts';
import{previewAction}from'../src/full/queries.ts';
import{previewActivity}from'../src/full/activity.ts';
import{cultivationFallback}from'../web/src/cultivation-fallback.ts';
const plan={kind:'cultivation',method:'assisted',maxCycles:50,until:'xp-cap',stoneBudget:0,stoneReserve:0};
function empty(){const d=driver();d.go('cave');d.doAction({type:'CULTIVATE',method:'assisted',count:2});assert.equal(d.game.core.player.stones,0);return d;}
function read(g,p=plan){const before=structuredClone(g),prior=structuredClone(p),v=cultivationFallback(g,p);assert.deepEqual(g,before);assert.deepEqual(p,prior);return v;}
test('empty paid cultivation has a formally viable zero-cost alternative with one-cycle yield and the original finite target',()=>{const g=empty().game,v=read(g),unit=previewAction(g,{type:'CULTIVATE',method:'natural',count:1}),whole=previewActivity(g,{...plan,method:'natural'});assert.ok(v);assert.equal(v.failure.code,'ACTIVITY_BUDGET');assert.equal(v.xp,unit.delta.xp);assert.notEqual(v.xp,whole.xp);assert.equal(v.cycleMs,60000);assert.equal(v.months,unit.costs.months);assert.equal(v.maxCycles,50);assert.equal(v.goal,'修为圆满即停');});
test('partly funded auxiliary cultivation explains the actual inventory and official per-cycle cost',()=>{const d=driver();d.go('market');d.doAction({type:'BUY',item:'healing_pill',quantity:2});d.go('cave');const g=d.game,v=read(g,{...plan,stoneBudget:g.core.player.stones}),paid=previewAction(g,{type:'CULTIVATE',method:'assisted',count:1});assert.ok(v);assert.ok(v.reason.includes(String(g.core.player.stones)));assert.ok(v.reason.includes(String(paid.costs.stones)));});
test('an explicit budget stop is different from claiming the player owns no stones and finite-cycle targets remain exact',()=>{const d=driver();d.go('cave');const v=read(d.game,{...plan,maxCycles:1,until:'cycles'});assert.ok(v);assert.match(v.reason,/额度或保留线/);assert.equal(v.goal,'完成所选轮数即停');assert.equal(v.maxCycles,1);});
test('a reserve that also blocks natural cultivation is never advertised as a free escape',()=>assert.equal(read(empty().game,{...plan,stoneReserve:1}),null));
test('affordable assisted and natural drafts are not replaced',()=>{const d=driver();d.go('cave');assert.equal(read(d.game,{...plan,stoneBudget:40}),null);assert.equal(read(d.game,{...plan,method:'natural'}),null);});
test('mortal realm locks last-month lifespan full growth and an active battle preserve their own formal gates',()=>{let m=newGame('凡人','fallback-mortal');m=resolve(m,{type:'CHOOSE',choice:'leave',commandId:'leave',runId:m.core.runId,expectedRevision:0}).nextState;m=atLocation(m,'cave');const full=driver();full.meditate();const fight=driver();fight.go('wilderness');fight.doAction({type:'ENCOUNTER',enemy:'wolf'});for(const g of[m,atLocation(lifespanFixture(),'cave'),full.game,fight.game])assert.equal(read(g),null);});
