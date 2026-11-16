import {sourcePeriodMs,recipePeriodMs} from '../src/full/online-periods.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { advance, resolve, validateGame } from '../src/full/engine.ts';
import { remainingMonths } from '../src/full/costs.ts';
import {
  validateActivityPlan, validateActivity, createActivity, pauseActivity, resumeActivity,
  completeActivity, activityStop, previewActivity,
} from '../src/full/activity.ts';
import { driver, fullRoute } from './full-route.mjs';

const route = fullRoute();
const plan = (sourceId = 'herbs', overrides = {}) => ({ kind: 'source', sourceId, maxCycles: 5,
  until: 'cycles', target: null, monthBudget: C.sources[sourceId].months * 5, remainingMonthsReserve: 1, ...overrides });
const options = (overrides = {}) => ({ id: 'source-activity', ownerId: 'page-one', commandId: 'source-start', now: 1_000, ...overrides });
const rejects = (fn, code = 'ACTIVITY_INVALID') => assert.throws(fn, error => error.code === code);
function atSource(id = 'herbs', realm = C.sources[id].min) {
  const game = structuredClone(realm === 'spirit' ? route.checkpoints.trial : route.checkpoints[realm]);
  game.core.world.location = C.sources[id].location;
  validateGame(game);
  return game;
}
function complete(game, activity, now = activity.dueAt) {
  const resolution = resolve(game, activity.nextCommand);
  return { game: resolution.nextState, result: resolution.result,
    activity: completeActivity(resolution.nextState, activity, resolution.result, { commandId: activity.nextCommand.commandId, now }) };
}

test('all sixteen real sources keep their formal per-cycle output and game-month costs at full XP', () => {
  assert.equal(Object.keys(C.sources).length, 16);
  for (const [id, source] of Object.entries(C.sources)) {
    const game = atSource(id), before = structuredClone(game);
    const activity = createActivity(game, plan(id, { maxCycles: 2 }), options());
    assert.equal(activity.version, 2);
    assert.equal(activity.cycleMs, sourcePeriodMs(game,id));
    assert.ok(activity.cycleMs >= 30_000 && activity.cycleMs <= 180_000);
    assert.deepEqual(activity.nextCommand, { type: 'SOURCE', sourceId: id, count: 1,
      commandId: 'cycle:source-activity:0:1', runId: game.core.runId, expectedRevision: game.core.revision });
    assert.deepEqual(game, before);
    const first = complete(game, activity);
    assert.equal(first.activity.status, 'running');
    assert.equal(first.activity.gainedXp, 0, `${id}: capped XP must not stop material or currency gain`);
    assert.equal(first.activity.gainedStones, source.stones);
    assert.deepEqual(first.activity.gainedItems, source.items);
    assert.equal(first.activity.spentStones, 0);
    assert.equal(first.activity.spentMonths, source.months);
    const second = complete(first.game, first.activity);
    assert.equal(second.activity.status, 'stopped');
    assert.equal(second.activity.stopReason.code, 'CYCLES_COMPLETE');
    assert.equal(second.activity.gainedStones, source.stones * 2);
    assert.deepEqual(second.activity.gainedItems, Object.fromEntries(Object.entries(source.items).map(([item, n]) => [item, n * 2])));
    assert.equal(second.game.core.player.stones, before.core.player.stones + source.stones * 2);
    assert.equal(second.game.core.world.elapsedMonths, before.core.world.elapsedMonths + source.months * 2);
    assert.equal(second.game.core.player.realm, before.core.player.realm);
    validateActivity(second.activity, second.game);
  }
});

test('source XP is capped to the true remaining amount without cancelling future material cycles', () => {
  const game = atSource(); game.core.player.xp = C.realms.qi.xpCap - 1;
  const first = complete(game, createActivity(game, plan('herbs', { maxCycles: 2 }), options()));
  assert.equal(first.activity.gainedXp, 1); assert.equal(first.activity.status, 'running');
  const second = complete(first.game, first.activity);
  assert.equal(second.activity.gainedXp, 1); assert.deepEqual(second.activity.gainedItems, { herb: 4 });
});

test('item targets mean final inventory, retain the formal target command and allow the last full-cycle overage', () => {
  const game = atSource(), existing = game.core.inventory.herb;
  const target = { kind: 'item', id: 'herb', quantity: existing + 3 };
  const arrangement = plan('herbs', { until: 'target', target, maxCycles: 50 });
  const activity = createActivity(game, arrangement, options());
  assert.deepEqual(activity.nextCommand.target, { item: 'herb', quantity: existing + 3 });
  target.quantity++; // The accepted plan owns its nested intent snapshot.
  assert.equal(activity.plan.target.quantity, existing + 3);
  const first = complete(game, activity), second = complete(first.game, first.activity);
  assert.equal(first.activity.status, 'running');
  assert.equal(second.activity.stopReason.code, 'TARGET_MET');
  assert.equal(second.game.core.inventory.herb, existing + 4);
  assert.deepEqual(second.activity.gainedItems, { herb: 4 });
  rejects(() => createActivity(second.game, activity.plan, options({ id: 'met' })), 'TARGET_MET');
});

test('stone targets use existing inventory and work remains productive despite zero XP and no items', () => {
  const game = atSource('work'), target = { kind: 'stones', quantity: game.core.player.stones + 21 };
  const activity = createActivity(game, plan('work', { until: 'target', target }), options());
  assert.equal(activity.nextCommand.target, undefined);
  const first = complete(game, activity), second = complete(first.game, first.activity);
  assert.equal(first.activity.status, 'running'); assert.equal(first.activity.gainedXp, 0);
  assert.equal(second.activity.stopReason.code, 'TARGET_MET');
  assert.equal(second.activity.gainedStones, 40); assert.deepEqual(second.activity.gainedItems, {});
});

test('cumulative month budget charges actual full cycles and cannot be replenished by currency income or resume', () => {
  const game = atSource('jade_task');
  let out = { game, activity: createActivity(game, plan('jade_task', { monthBudget: 84 }), options()) };
  out = complete(out.game, out.activity);
  const paused = pauseActivity(out.activity);
  assert.equal(paused.spentMonths, 36); assert.equal(paused.gainedStones, 50);
  out.activity = resumeActivity(out.game, paused, { ownerId: 'page-two', commandId: 'resume', now: 1_000_000 });
  out = complete(out.game, out.activity);
  assert.equal(out.activity.stopReason.code, 'ACTIVITY_BUDGET'); assert.equal(out.activity.completedCycles, 2);
  assert.equal(out.activity.spentMonths, 72); assert.equal(out.activity.gainedStones, 100);
  rejects(() => createActivity(game, plan('jade_task', { monthBudget: 2 }), options()), 'ACTIVITY_BUDGET');
});

test('minimum remaining lifespan is respected exactly without bypassing the formal age limit at zero reserve', () => {
  const game = atSource();
  game.core.world.elapsedMonths = C.realms.qi.lifespanMonths - game.core.player.startAgeMonths - 14;
  validateGame(game);
  const activity = createActivity(game, plan('herbs', { remainingMonthsReserve: 2 }), options());
  const out = complete(game, activity);
  assert.equal(remainingMonths(out.game), 2);assert.equal(out.activity.stopReason.code, 'ACTIVITY_RESERVE');
  rejects(() => createActivity(out.game, activity.plan, options()), 'ACTIVITY_RESERVE');
  const near=structuredClone(out.game);near.core.world.elapsedMonths-=11;
  const last=createActivity(near,plan('herbs',{remainingMonthsReserve:0}),options());
  const final=complete(near,last);assert.equal(remainingMonths(final.game),1);assert.equal(final.activity.stopReason.code,'ACTIVITY_RESERVE');
  assert.equal(remainingMonths(out.game), 2);
  const exhausted=structuredClone(near);exhausted.core.world.elapsedMonths++;
  rejects(()=>createActivity(exhausted,plan('herbs',{remainingMonthsReserve:0}),options()),'AGE_LIMIT');
});

test('capacity halts before a partial reward or cost, for both inventory and stone bounds', () => {
  const game = atSource(); game.core.inventory.herb = C.maxQuantity - 3;
  const first = complete(game, createActivity(game, plan(), options()));
  assert.equal(first.activity.stopReason.code, 'CAPACITY');
  assert.equal(first.game.core.inventory.herb, C.maxQuantity - 1);
  rejects(() => createActivity(first.game, plan(), options()), 'CAPACITY');
  const rich = atSource('work'); rich.core.player.stones = C.maxQuantity - 21;
  const work = complete(rich, createActivity(rich, plan('work'), options()));
  assert.equal(work.activity.status, 'stopped'); assert.equal(work.activity.stopReason.code, 'SAVE_RANGE');
  assert.equal(work.game.core.player.stones, C.maxQuantity - 1);
});

test('source plans refuse undeclared fields, unrelated targets, nonprimitive identities and unlimited budgets', () => {
  validateActivityPlan(plan());
  validateActivityPlan(plan('work', { until: 'target', target: { kind: 'stones', quantity: 500 } }));
  for (const changes of [{ extra: true }, { sourceId: 'unknown' }, { sourceId: new String('herbs') },
    { maxCycles: 0 }, { maxCycles: 51 }, { maxCycles: 1.5 }, { monthBudget: Infinity }, { monthBudget: -1 },
    { remainingMonthsReserve: 0.5 }, { remainingMonthsReserve: NaN }, { until: 'forever' },
    { until: 'target', target: null }, { target: { kind: 'item', id: 'herb', quantity: 2 } },
    { until: 'target', target: { kind: 'item', id: 'dew', quantity: 2 } },
    { until: 'target', target: { kind: 'stones', quantity: 100 } },
    { until: 'target', target: { kind: 'item', id: 'herb', quantity: C.maxQuantity + 1 } },
    { until: 'target', target: { kind: 'item', id: 'herb', quantity: 2, extra: true } }])
    rejects(() => validateActivityPlan(plan('herbs', changes)));
});

test('source activity validates exact versioned schema, accumulated output and stable single-cycle identity', () => {
  const game = atSource(), running = createActivity(game, plan(), options()), first = complete(game, running);
  for (const activity of [running, first.activity]) {
    for (const mutate of [a => { a.version = 1; }, a => { delete a.gainedItems; }, a => { a.gainedStones++; },
      a => { a.gainedItems.herb = 100; }, a => { a.gainedItems.unrelated = 1; }, a => { a.spentStones = 1; },
      a => { a.spentMonths++; }, a => { a.cycleMs = 1_600; }, a => { a.gainedXp = 6; },
      a => { a.nextCommand.count = 50; }, a => { a.nextCommand.sourceId = 'dew'; },
      a => { a.nextCommand.target = { item: 'herb', quantity: 20 }; }, a => { a.unrecognized = true; }]) {
      const bad = structuredClone(activity); mutate(bad); rejects(() => validateActivity(bad));
    }
  }
  const legacy = createActivity(driver().game, { kind: 'cultivation', method: 'natural', maxCycles: 1,
    until: 'cycles', stoneBudget: 0, stoneReserve: 0 }, options());
  assert.equal(legacy.version, 1); assert.equal(Object.hasOwn(legacy, 'gainedItems'), false);
  const badLegacy = { ...legacy, gainedItems: {}, gainedStones: 0 };
  rejects(() => validateActivity(badLegacy));
  const work = createActivity(atSource('work'), plan('work'), options());
  for (const gainedItems of [null, [], new Date(), new Map()]) rejects(() => validateActivity({ ...work, gainedItems }));
});

test('source completion rejects early/stale cycles, forged rewards, changed locations and unrelated revisions', () => {
  const game = atSource(), activity = createActivity(game, plan(), options()), out = resolve(game, activity.nextCommand);
  const done = (state, result = out.result, now = activity.dueAt) => completeActivity(state, activity, result,
    { commandId: activity.nextCommand.commandId, now });
  rejects(() => done(out.nextState, out.result, activity.dueAt - 1), 'ACTIVITY_NOT_DUE');
  for (const mutate of [r => { r.type = 'CULTIVATE'; }, r => { r.commandId = 'other'; }, r => { r.delta.inventory.herb++; },
    r => { r.delta.inventory.dew = 1; }, r => { r.delta.stones++; }, r => { r.costs.months++; }, r => { r.delta.xp = C.sources.herbs.xp + 1; },
    r => { r.delta.hp++; }, r => { r.requestedSteps = 50; }, r => { r.executedSteps = 2; }]) {
    const bad = structuredClone(out.result); mutate(bad); rejects(() => done(out.nextState, bad));
  }
  const wrongPlace = structuredClone(out.nextState); wrongPlace.core.world.location = 'cave';
  rejects(() => done(wrongPlace));
  const wrongRevision = structuredClone(out.nextState); wrongRevision.core.revision++;
  rejects(() => done(wrongRevision));
  const next = done(out.nextState);
  rejects(() => completeActivity(out.nextState, next, out.result, { commandId: activity.nextCommand.commandId, now: next.dueAt }), 'ACTIVITY_STALE');
  assert.equal(activity.completedCycles, 0); assert.equal(activity.gainedStones, 0);
});

test('a currency target that was already met cannot consume one more otherwise legal source result', () => {
  const game = atSource('work'), arrangement = plan('work', { until: 'target',
    target: { kind: 'stones', quantity: game.core.player.stones + 1 } });
  const activity = createActivity(game, arrangement, options());
  const changed = structuredClone(activity); changed.plan.target.quantity = game.core.player.stones;
  // SOURCE has no built-in currency target; the activity contract still rejects that extra cycle.
  const out = resolve(game, changed.nextCommand);
  rejects(() => completeActivity(out.nextState, changed, out.result,
    { commandId: changed.nextCommand.commandId, now: changed.dueAt }));
});

test('source pause and explicit takeover preserve results but invalidate unfinished cycles without catching up', () => {
  const game = atSource('work'), running = createActivity(game, plan('work'), options());
  const first = complete(game, running, running.dueAt + 86_400_000);
  assert.equal(first.activity.completedCycles, 1);
  assert.equal(first.activity.startedAt, running.dueAt + 86_400_000);
  const paused = pauseActivity(first.activity), resumed = resumeActivity(first.game, paused,
    { ownerId: 'page-two', commandId: 'resume', now: 100_000_000 });
  assert.equal(resumed.gainedStones, 20); assert.equal(resumed.spentMonths, 12);
  assert.equal(resumed.dueAt, 100_030_000); assert.equal(resumed.ownerId, 'page-two');
  assert.equal(resumed.generation, first.activity.generation + 2);
  assert.notEqual(resumed.nextCommand.commandId, first.activity.nextCommand.commandId);
  assert.deepEqual(first.game.core.inventory, game.core.inventory);
});

test('source start checks actual realm, location and pending decisions without automatically travelling', () => {
  const game = atSource(), before = structuredClone(game);
  rejects(() => createActivity(game, plan('work'), options()), 'LOCATION_REQUIRED');
  rejects(() => createActivity(game, plan('jade'), options()), 'REALM_REQUIRED');
  assert.deepEqual(game, before);
  const changed = advance(game, { type: 'TRAVEL', location: 'cave', commandId: 'travel', runId: game.core.runId, expectedRevision: game.core.revision });
  const paused = pauseActivity(createActivity(game, plan(), options()));
  assert.equal(activityStop(changed, paused).code, 'STATE_CHANGED');
});

test('read-only source preview shares inventory-target, budget, lifespan and capacity stops with real cycles', () => {
  const game = atSource(), arrangement = plan('herbs', { until: 'target', maxCycles: 50,
    target: { kind: 'item', id: 'herb', quantity: game.core.inventory.herb + 3 } });
  const before = structuredClone(game), beforePlan = structuredClone(arrangement);
  const projected = previewActivity(game, arrangement);
  assert.deepEqual(previewActivity(game, arrangement), projected);
  assert.equal(projected.allowed, true); assert.equal(projected.cycles, 2);
  assert.deepEqual(projected.items, { herb: 4 }); assert.equal(projected.earnedStones, 0);
  assert.equal(projected.stones, 0); assert.equal(projected.months, 24); assert.equal(projected.xp, 0);
  assert.equal(projected.stopReason.code, 'TARGET_MET');
  assert.deepEqual(game, before); assert.deepEqual(arrangement, beforePlan);
  const limited = previewActivity(game, plan('herbs', { monthBudget: 12 }));
  assert.equal(limited.cycles, 1); assert.equal(limited.stopReason.code, 'ACTIVITY_BUDGET');
  const blocked = previewActivity(game, plan('herbs', { monthBudget: 0 }));
  assert.equal(blocked.allowed, false); assert.equal(blocked.failure.code, 'ACTIVITY_BUDGET');
  assert.deepEqual(blocked.items, {}); assert.equal(blocked.earnedStones, 0);
  const work = previewActivity(atSource('work'), plan('work', { maxCycles: 2 }));
  assert.deepEqual(work.items, {}); assert.equal(work.earnedStones, 40); assert.equal(work.stones, 0);
});
