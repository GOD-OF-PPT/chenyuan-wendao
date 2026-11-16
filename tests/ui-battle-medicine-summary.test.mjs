import test from'node:test';
import assert from'node:assert/strict';
import{medicineSummary}from'../web/src/battle-medicine-summary.ts';
import{defaultBattlePlan}from'../src/full/adventure.ts';
import{previewActivity}from'../src/full/activity.ts';
import{driver}from'./full-route.mjs';
function battle(){const d=driver('help');d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'technique'});return d.game;}
const game=battle(),base=defaultBattlePlan(game).strategy;
test('fully zero medicine authorization is concise and cannot mutate its original strategy',()=>{const s=Object.freeze({...base,priority:Object.freeze([...base.priority])}),before=structuredClone(s);assert.equal(medicineSummary(s),'不自动用药');assert.deepEqual(s,before);});
test('one medicine keeps every nonzero threshold allowance and reserve without a second default zero chain',()=>{const s={...base,healBelowPercent:50,healingBudget:1,healingReserve:2};assert.equal(medicineSummary(s),'回春最多 1 / 保留 2（气血 50%）');assert.deepEqual(s,{...base,healBelowPercent:50,healingBudget:1,healingReserve:2});});
test('both nondefault medicines and disabled thresholds retain exact authorized quantities and reserves',()=>{const s={...base,healBelowPercent:0,healingBudget:2,healingReserve:3,restoreBelowPercent:73,spiritBudget:4,spiritReserve:5};assert.equal(medicineSummary(s),'回春最多 2 / 保留 3（气血 0% · 未启用）；回灵最多 4 / 保留 5（灵力 73%）');assert.equal(medicineSummary({...base,healingReserve:8}),'回春最多 0 / 保留 8（气血 0% · 未启用）');});
test('an enabled threshold with a zero budget remains a formal stop and is never silently presented as disabled',()=>{const p=defaultBattlePlan(game),before=structuredClone(game);p.strategy.healBelowPercent=100;assert.equal(medicineSummary(p.strategy),'回春最多 0 / 保留 0（气血 100% · 触用药线停手）');const quote=previewActivity(game,p);assert.equal(quote.allowed,false);assert.equal(quote.failure.code,'ACTIVITY_BUDGET');p.strategy.healBelowPercent=0;assert.equal(medicineSummary(p.strategy),'不自动用药');assert.equal(previewActivity(game,p).allowed,true);assert.deepEqual(game,before);});
