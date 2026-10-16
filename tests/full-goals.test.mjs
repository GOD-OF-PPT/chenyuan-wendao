import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrackedGoal, parseTrackingTarget, planCollection, preparationConsumption, trackingConsumption } from '../src/full/goals.ts';
import { resolve } from '../src/full/engine.ts';
import { previewAction } from '../src/full/queries.ts';
import { driver } from './full-route.mjs';

const execute = (game, action) => resolve(game, { ...action, commandId: 'goal-test', runId: game.core.runId, expectedRevision: game.core.revision });

test('tracking an item reports exact remaining inventory and never acquires or reserves it', () => {
  const d = driver(), before = JSON.stringify(d.game), target = { kind: 'item', id: 'herb', quantity: 8 };
  const goal = getTrackedGoal(d.game, target);
  assert.deepEqual(goal.deficits, [{ kind: 'item', id: 'herb', required: 8, have: 0, missing: 8 }]);
  assert.ok(goal.sources.some(source => source.kind === 'source' && source.id === 'herbs'));
  assert.equal(goal.sources.find(source => source.kind === 'purchase').rewardCount, 8);
  assert.equal(JSON.stringify(d.game), before);
  goal.requiredItems.herb = 99; goal.target.quantity = 99;
  assert.equal(target.quantity, 8); assert.equal(d.game.core.inventory.herb, 0);
});

test('breakthrough, future learning and forging share real requirements and source queries', () => {
  const d = driver(); d.go('sect'); const before = JSON.stringify(d.game);
  assert.equal(getTrackedGoal(d.game, { kind: 'breakthrough' }).title, '筹备筑基');
  const skill = getTrackedGoal(d.game, { kind: 'skill', id: 'sword_still' });
  assert.equal(skill.preview.failure.code, 'REALM_REQUIRED'); assert.equal(skill.preview.costs.stones, 100);
  assert.ok(skill.currency.some(source => source.id === 'work' && source.available));
  const relic = getTrackedGoal(d.game, { kind: 'relic', id: 'jade_seal' });
  assert.equal(relic.materials[0].deficit.id, 'jade'); assert.equal(relic.requiredItems.jade, 4);
  assert.equal(JSON.stringify(d.game), before);
});

test('learned skills and resolved stories complete by actual facts without replaying rewards', () => {
  const d = driver();
  assert.equal(getTrackedGoal(d.game, { kind: 'skill', id: 'sword_mind' }).completed, true);
  d.go('sect'); d.doAction({ type: 'EVENT', event: 'lu_intro' }); d.doAction({ type: 'DECIDE', option: 'listen' });
  const before = JSON.stringify(d.game), goal = getTrackedGoal(d.game, { kind: 'event', id: 'lu_intro' });
  assert.equal(goal.completed, true); assert.deepEqual(goal.deficits, []); assert.equal(JSON.stringify(d.game), before);
});

test('target material batches stop at the requested inventory with the actual shared cost', () => {
  const d = driver(); d.go('wilderness'); const before = JSON.stringify(d.game);
  const action = planCollection(d.game, 'herbs', { kind: 'item', id: 'herb', quantity: 8 });
  assert.equal(action.count, 50); assert.equal(JSON.stringify(d.game), before);
  const preview = previewAction(d.game, action), actual = execute(d.game, action);
  assert.equal(preview.executedSteps, 4); assert.equal(preview.stopReason.code, 'TARGET_MET');
  assert.deepEqual(preview.actualCosts, actual.result.costs); assert.equal(actual.result.costs.months, 4);
  assert.equal(actual.nextState.core.inventory.herb, 8);
  assert.equal(previewAction(actual.nextState, action).failure.code, 'TARGET_MET');
  assert.equal(planCollection(d.game, 'dew', { kind: 'item', id: 'herb', quantity: 8 }), null);
});

test('currency target plans only missing income within the existing batch bound', () => {
  const d = driver(); d.go('sect');
  const action = planCollection(d.game, 'work', { kind: 'stones', quantity: 160 });
  assert.equal(action.count, 6); const actual = execute(d.game, action);
  assert.equal(actual.nextState.core.player.stones, 160); assert.equal(actual.result.costs.months, 6);
  assert.equal(planCollection(actual.nextState, 'work', { kind: 'stones', quantity: 160 }), null);
  assert.equal(planCollection(d.game, 'work', { kind: 'stones', quantity: 1000000 }).count, 50);
  assert.equal(planCollection(d.game, 'herbs', { kind: 'stones', quantity: 160 }), null);
});

test('collection respects lifespan and pending event blockers instead of granting target resources', () => {
  const d = driver(); d.go('wilderness'); const boundary = structuredClone(d.game);
  boundary.core.world.elapsedMonths = 1440 - boundary.core.player.startAgeMonths - 2;
  const action = planCollection(boundary, 'herbs', { kind: 'item', id: 'herb', quantity: 8 });
  const preview = previewAction(boundary, action);
  assert.equal(preview.executedSteps, 1); assert.equal(preview.stopReason.code, 'AGE_LIMIT');
  d.go('sect'); d.doAction({ type: 'EVENT', event: 'lu_intro' });
  const blocked = previewAction(d.game, planCollection(d.game, 'work', { kind: 'stones', quantity: 160 }));
  assert.equal(blocked.allowed, false); assert.equal(blocked.failure.code, 'PENDING_EVENT');
});

test('consuming tracked medicine warns about real increased shortage and does not lock it', () => {
  const d = driver(); d.go('wilderness');
  d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' }); d.doAction({ type: 'BATTLE', move: 'attack' }); d.doAction({ type: 'BATTLE', move: 'flee' });
  const target = { kind: 'item', id: 'healing_pill', quantity: 1 }, before = JSON.stringify(d.game);
  const warnings = trackingConsumption(d.game, target, { type: 'USE', item: 'healing_pill' });
  assert.equal(warnings[0].id, 'healing_pill'); assert.equal(warnings[0].missing, 1); assert.equal(JSON.stringify(d.game), before);
  assert.equal(execute(d.game, { type: 'USE', item: 'healing_pill' }).nextState.core.inventory.healing_pill, 0);
  assert.deepEqual(trackingConsumption(d.game, target, { type: 'BUY', item: 'healing_pill', quantity: 1 }), []);
  d.go('wilderness'); d.doAction({ type: 'SOURCE', sourceId: 'herbs', count: 4 }); d.go('cave');
  const planned = { type: 'CRAFT', recipeId: 'foundation' }, otherCraft = { type: 'CRAFT', recipeId: 'healing' };
  assert.equal(preparationConsumption(d.game, planned, otherCraft).find(gap => gap.id === 'herb').missing, 2);
  assert.deepEqual(preparationConsumption(d.game, planned, planned), []);
  assert.equal(execute(d.game, otherCraft).nextState.core.inventory.herb, 6);
});

test('invalid persisted targets and collection references reject without prototype lookups', () => {
  for (const value of [null, [], { kind: 'item', id: '__proto__', quantity: 1 }, { kind: 'item', id: 'herb', quantity: 0 },
    { kind: 'item', id: 'herb', quantity: 1.5 }, { kind: 'breakthrough', reward: 100 }, { kind: 'skill', id: 'missing' }]) {
    assert.throws(() => parseTrackingTarget(value), error => error.code === 'INVALID_GOAL');
  }
  const d = driver(); assert.throws(() => planCollection(d.game, '__proto__', { kind: 'stones', quantity: 10 }), error => error.code === 'INVALID_GOAL');
  for (const value of [null, [], { kind: 'stones', quantity: 0 }, { kind: 'stones', quantity: 10, reward: 999 }, { kind: 'item', id: 'herb', quantity: Infinity }]) {
    assert.throws(() => planCollection(d.game, 'work', value), error => error.code === 'INVALID_GOAL');
  }
});
