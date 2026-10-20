import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, advance, resolve, validateGame } from '../src/full/engine.ts';
import * as C from '../src/full/content.ts';
import {
  CULTIVATION_CYCLE_MS, validateActivityPlan, validateActivity, validateActivityMutation, validateActivityTick,
  createActivity, pauseActivity, resumeActivity, completeActivity, activityStop, previewActivity,
} from '../src/full/activity.ts';
import { driver, fullRoute } from './full-route.mjs';

const natural = (overrides = {}) => ({ kind: 'cultivation', method: 'natural', maxCycles: 50,
  until: 'xp-cap', stoneBudget: 0, stoneReserve: 0, ...overrides });
const options = (overrides = {}) => ({ id: 'activity-one', ownerId: 'page-one', commandId: 'start-one', now: 1_000, ...overrides });
function opening() {
  let game = newGame('静修', 'activity-run');
  for (const action of [{ type: 'CHOOSE', choice: 'leave' }, { type: 'TRAVEL', location: 'cave' }])
    game = advance(game, { ...action, commandId: `opening-${game.core.revision}`, runId: game.core.runId, expectedRevision: game.core.revision });
  return game;
}
function qi() { const d = driver(); d.go('cave'); return structuredClone(d.game); }
function complete(game, activity, now = activity.dueAt) {
  const out = resolve(game, activity.nextCommand);
  return { game: out.nextState, activity: completeActivity(out.nextState, activity, out.result,
    { commandId: activity.nextCommand.commandId, now }), result: out.result };
}
const rejects = (fn, code = 'ACTIVITY_INVALID') => assert.throws(fn, error => error.code === code);

test('an arrangement starts a stable single cycle without changing Game or consuming its budget', () => {
  const game = opening(), before = structuredClone(game), plan = natural();
  const activity = createActivity(game, plan, options());
  assert.deepEqual(game, before);
  assert.equal(activity.status, 'running');
  assert.equal(activity.cycleMs, 30_000);
  assert.equal(activity.dueAt, 31_000);
  assert.deepEqual(activity.nextCommand, { type: 'CULTIVATE', method: 'natural', count: 1,
    commandId: 'cycle:activity-one:0:1', runId: game.core.runId, expectedRevision: game.core.revision });
  assert.equal(activity.completedCycles, 0); assert.equal(activity.spentStones, 0);
  plan.maxCycles = 1;
  assert.equal(activity.plan.maxCycles, 50);
  validateActivity(activity, game);
});

test('two real cycles accumulate real rewards then stop at XP cap without a breakthrough', () => {
  let game = opening(), activity = createActivity(game, natural(), options());
  const original = structuredClone(activity);
  ({ game, activity } = complete(game, activity));
  assert.equal(activity.status, 'running'); assert.equal(activity.completedCycles, 1);
  assert.equal(activity.gainedXp, 5); assert.equal(activity.spentMonths, 1);
  assert.equal(activity.nextCommand.expectedRevision, game.core.revision);
  assert.equal(activity.nextCommand.commandId, 'cycle:activity-one:0:2');
  assert.equal(original.completedCycles, 0);
  ({ game, activity } = complete(game, activity));
  assert.equal(activity.status, 'stopped'); assert.equal(activity.stopReason.code, 'XP_CAP');
  assert.equal(activity.gainedXp, 10); assert.equal(activity.spentMonths, 2);
  assert.equal(activity.nextCommand, null); assert.equal(activity.startedAt, null); assert.equal(activity.dueAt, null);
  assert.equal(game.core.player.realm, 'mortal'); assert.equal(game.core.player.xp, 10);
  validateActivity(activity, game);
});

test('an explicit one-cycle arrangement stops while the realm still has XP room', () => {
  const game = qi(), activity = createActivity(game, natural({ maxCycles: 1, until: 'cycles' }), options());
  const out = complete(game, activity);
  assert.equal(out.activity.stopReason.code, 'CYCLES_COMPLETE');
  assert.equal(out.activity.completedCycles, 1); assert.ok(out.game.core.player.xp < C.realms.qi.xpCap);
});

test('late callbacks complete one cycle and schedule from observed completion time without catching up', () => {
  const game = qi(), activity = createActivity(game, natural(), options());
  const late = activity.dueAt + 86_400_000, out = complete(game, activity, late);
  assert.equal(out.activity.completedCycles, 1);
  assert.equal(out.activity.startedAt, late);
  assert.equal(out.activity.dueAt, late + CULTIVATION_CYCLE_MS.qi);
  assert.equal(out.game.core.player.xp - game.core.player.xp, 50);
});

test('the last representable deadline can settle and safely stops before a future timer overflows', () => {
  const game = qi(), start = Number.MAX_SAFE_INTEGER - CULTIVATION_CYCLE_MS.qi;
  for (const maxCycles of [1, 50]) {
    const activity = createActivity(game, natural({ maxCycles }), options({ now: start }));
    assert.equal(activity.dueAt, Number.MAX_SAFE_INTEGER);
    const out = complete(game, activity);
    assert.equal(out.activity.status, 'stopped'); assert.equal(out.activity.completedCycles, 1);
    assert.equal(out.activity.stopReason.code, maxCycles === 1 ? 'CYCLES_COMPLETE' : 'ACTIVITY_TIME_LIMIT');
    assert.equal(out.game.core.player.xp - game.core.player.xp, 50);
  }
});

test('each realm uses its declared period and ascended games cannot arrange cultivation', () => {
  const route = fullRoute();
  for (const realm of ['mortal', 'qi', 'foundation', 'golden', 'nascent', 'spirit']) {
    const game = realm === 'mortal' ? opening() : structuredClone(realm === 'spirit' ? route.checkpoints.trial : route.checkpoints[realm]);
    game.core.player.xp = 0; game.core.world.location = 'cave'; validateGame(game);
    const activity = createActivity(game, natural(), options());
    assert.equal(activity.cycleMs, CULTIVATION_CYCLE_MS[realm]);
    assert.equal(activity.dueAt - activity.startedAt, activity.cycleMs);
  }
  rejects(() => createActivity(route.game, natural(), options()), 'ENDED');
});

test('assisted cultivation charges the actual realm cost and respects cumulative budget after pause/resume', () => {
  let game = qi(); game.core.player.stones = 500;
  let activity = createActivity(game, natural({ method: 'assisted', stoneBudget: 40 }), options());
  ({ game, activity } = complete(game, activity));
  assert.equal(activity.spentStones, 20); assert.equal(activity.gainedXp, 100);
  activity = pauseActivity(activity);
  const plan = structuredClone(activity.plan);
  activity = resumeActivity(game, activity, { ownerId: 'page-two', commandId: 'resume-two', now: 200_000 });
  assert.deepEqual(activity.plan, plan); assert.equal(activity.spentStones, 20);
  ({ game, activity } = complete(game, activity));
  assert.equal(game.core.player.stones, 460); assert.equal(activity.spentStones, 40);
  assert.equal(activity.stopReason.code, 'ACTIVITY_BUDGET'); assert.equal(activity.completedCycles, 2);
});

test('an exact reserve is retained and stops before the next charge', () => {
  let game = qi(); game.core.player.stones = 60;
  let activity = createActivity(game, natural({ method: 'assisted', stoneBudget: 200, stoneReserve: 40 }), options());
  ({ game, activity } = complete(game, activity));
  assert.equal(game.core.player.stones, 40); assert.equal(activity.spentStones, 20);
  assert.equal(activity.stopReason.code, 'ACTIVITY_RESERVE');
});

test('zero-cost cultivation still respects an explicitly higher reserve and never silently spends', () => {
  const game = opening();
  rejects(() => createActivity(game, natural({ stoneReserve: game.core.player.stones + 1 }), options()), 'ACTIVITY_RESERVE');
  const activity = createActivity(game, natural({ stoneReserve: game.core.player.stones }), options());
  const out = complete(game, activity);
  assert.equal(out.game.core.player.stones, game.core.player.stones);
  assert.equal(out.activity.spentStones, 0);
});

test('insufficient funds and budget reject before accepting a timer, without modifying Game', () => {
  const game = qi(), before = structuredClone(game);
  rejects(() => createActivity(game, natural({ method: 'assisted', stoneBudget: 19 }), options()), 'ACTIVITY_BUDGET');
  const poor = structuredClone(game); poor.core.player.stones = 19;
  rejects(() => createActivity(poor, natural({ method: 'assisted', stoneBudget: 20 }), options()), 'INSUFFICIENT_STONES');
  assert.deepEqual(game, before);
});

test('pause and resume invalidate old generations, preserve totals and restart a full period', () => {
  const game = qi(), running = createActivity(game, natural(), options());
  const paused = pauseActivity(running);
  assert.equal(paused.revision, 1); assert.equal(paused.generation, 1);
  assert.equal(paused.status, 'paused'); assert.equal(paused.nextCommand, null); assert.equal(paused.dueAt, null);
  const resumed = resumeActivity(game, paused, { ownerId: 'page-two', commandId: 'resume', now: 2_000_000 });
  assert.equal(resumed.revision, 2); assert.equal(resumed.generation, 2); assert.equal(resumed.ownerId, 'page-two');
  assert.notEqual(resumed.nextCommand.commandId, running.nextCommand.commandId);
  assert.equal(resumed.startedAt, 2_000_000); assert.equal(resumed.dueAt, 2_060_000);
  assert.equal(running.status, 'running'); assert.equal(running.revision, 0);
  const result = resolve(game, running.nextCommand);
  rejects(() => completeActivity(result.nextState, resumed, result.result,
    { commandId: running.nextCommand.commandId, now: resumed.dueAt }), 'ACTIVITY_STALE');
  rejects(() => pauseActivity(paused), 'ACTIVITY_NOT_RUNNING');
  const restarted = resumeActivity(game, resumed, { ownerId: 'page-two', commandId: 'repeat', now: 3_000_000 });
  assert.equal(restarted.generation, 3); assert.equal(restarted.dueAt, 3_060_000);
});

test('explicit takeover of persisted running activity transfers ownership without offline rewards', () => {
  const game = qi(), running = createActivity(game, natural(), options()), before = structuredClone(game);
  const resumed = resumeActivity(game, running, { ownerId: 'new-page', commandId: 'take-over', now: 86_400_000 });
  assert.equal(resumed.ownerId, 'new-page'); assert.equal(resumed.generation, 1); assert.equal(resumed.revision, 1);
  assert.equal(resumed.completedCycles, 0); assert.equal(resumed.gainedXp, 0); assert.equal(resumed.spentMonths, 0);
  assert.equal(resumed.startedAt, 86_400_000); assert.equal(resumed.dueAt, 86_460_000);
  assert.notEqual(resumed.nextCommand.commandId, running.nextCommand.commandId);
  assert.deepEqual(game, before);
  const stopped = complete(game, createActivity(game, natural({ maxCycles: 1 }), options())).activity;
  rejects(() => resumeActivity(game, stopped, { ownerId: 'new-page', commandId: 'again', now: 100_000 }), 'ACTIVITY_STOPPED');
});

test('a cycle cannot settle before its deadline and old activity state cannot consume another result', () => {
  const game = opening(), activity = createActivity(game, natural(), options()), out = resolve(game, activity.nextCommand);
  rejects(() => completeActivity(out.nextState, activity, out.result,
    { commandId: activity.nextCommand.commandId, now: activity.dueAt - 1 }), 'ACTIVITY_NOT_DUE');
  const next = completeActivity(out.nextState, activity, out.result, { commandId: activity.nextCommand.commandId, now: activity.dueAt });
  rejects(() => completeActivity(out.nextState, next, out.result,
    { commandId: activity.nextCommand.commandId, now: next.dueAt }), 'ACTIVITY_STALE');
});

test('lifespan prevents an unsafe first cycle and stops immediately before a later unsafe cycle', () => {
  const game = qi(); game.core.world.elapsedMonths = C.realms.qi.lifespanMonths - game.core.player.startAgeMonths - 2;
  validateGame(game);
  const activity = createActivity(game, natural(), options()), out = complete(game, activity);
  assert.equal(out.activity.completedCycles, 1); assert.equal(out.activity.stopReason.code, 'AGE_LIMIT');
  assert.equal(out.game.core.world.elapsedMonths, game.core.world.elapsedMonths + 1);
  rejects(() => createActivity(out.game, natural(), options({ id: 'after-age' })), 'AGE_LIMIT');
});

test('unavailable location, event and assisted realm requirements reject legally before starting', () => {
  const wilderness = newGame('山野', 'wild');
  rejects(() => createActivity(wilderness, natural(), options()), 'PENDING_EVENT');
  const game = opening();
  const away = advance(game, { type: 'TRAVEL', location: 'wilderness', commandId: 'away', runId: game.core.runId, expectedRevision: game.core.revision });
  rejects(() => createActivity(away, natural(), options()), 'LOCATION_REQUIRED');
  rejects(() => createActivity(game, natural({ method: 'assisted', stoneBudget: 20 }), options()), 'REALM_REQUIRED');
});

test('resume refuses changed revision, changed realm and another run', () => {
  const game = opening(), paused = pauseActivity(createActivity(game, natural(), options()));
  const changed = advance(game, { type: 'CULTIVATE', method: 'natural', commandId: 'elsewhere', runId: game.core.runId, expectedRevision: game.core.revision });
  rejects(() => resumeActivity(changed, paused, { ownerId: 'page-one', commandId: 'r', now: 100_000 }), 'STATE_CHANGED');
  const other = opening(); other.core.runId = 'different-run'; validateGame(other);
  rejects(() => resumeActivity(other, paused, { ownerId: 'page-one', commandId: 'r', now: 100_000 }), 'RUN_MISMATCH');
  const differentRealm = qi(); differentRealm.core.runId = game.core.runId;
  differentRealm.core.revision = game.core.revision; validateGame(differentRealm);
  rejects(() => resumeActivity(differentRealm, paused, { ownerId: 'page-one', commandId: 'r', now: 100_000 }), 'STATE_CHANGED');
  assert.equal(activityStop(changed, paused).code, 'STATE_CHANGED');
  assert.equal(activityStop(other, paused).code, 'RUN_MISMATCH');
});

test('a capped realm cannot start another activity and never auto-breaks through', () => {
  const game = opening(); game.core.player.xp = C.realms.mortal.xpCap; validateGame(game);
  rejects(() => createActivity(game, natural(), options()), 'XP_CAP');
  assert.equal(game.core.player.realm, 'mortal');
});

test('plans reject unknown fields, unbounded counts, nonfinite costs and unsupported adapters', () => {
  validateActivityPlan(natural());
  for (const change of [
    { unknown: true }, { kind: 'source' }, { method: 'fast' }, { maxCycles: 0 }, { maxCycles: 51 }, { maxCycles: 1.5 },
    { until: 'forever' }, { stoneBudget: -1 }, { stoneBudget: Infinity }, { stoneBudget: Number.MAX_SAFE_INTEGER + 1 },
    { stoneReserve: NaN }, { stoneReserve: 0.5 }, { method: new String('natural') }, { until: new String('cycles') },
  ]) rejects(() => validateActivityPlan(natural(change)));
  for (const value of [null, [], 'natural', { kind: 'cultivation' }]) rejects(() => validateActivityPlan(value));
});

test('activity validation rejects tampered time, identities, totals, states and stable commands', () => {
  const game = qi(), good = createActivity(game, natural(), options());
  for (const mutate of [
    a => { a.unrecognized = true; }, a => { a.id = ''; }, a => { a.generation = 1; },
    a => { a.cycleMs = 1_600; }, a => { a.startedAt = -1; }, a => { a.dueAt++; },
    a => { a.completedCycles = 1; }, a => { a.spentStones = 1; }, a => { a.gainedXp = 1; },
    a => { a.nextCommand.count = 50; }, a => { a.nextCommand.commandId = 'other'; },
    a => { a.nextCommand.expectedRevision++; }, a => { a.nextCommand.runId = 'other'; },
    a => { a.status = 'paused'; }, a => { a.stopReason = { code: 'X', message: '坏状态' }; },
    a => { a.plan.maxCycles = 0; }, a => { a.realm = 'ascended'; }, a => { a.revision = Infinity; },
    a => { a.realm = new String('qi'); }, a => { a.status = new String('running'); },
  ]) { const bad = structuredClone(good); mutate(bad); rejects(() => validateActivity(bad)); }
  for (const now of [-1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) rejects(() => createActivity(game, natural(), options({ now })));
  const future = structuredClone(good); future.gameRevision++; future.nextCommand.expectedRevision++;
  rejects(() => validateActivity(future, game));
  const completed = complete(game, good).activity;
  const underVersioned = structuredClone(completed); underVersioned.revision = 0;
  rejects(() => validateActivity(underVersioned));
  const overRewarded = structuredClone(completed); overRewarded.gainedXp = C.realms.qi.xpCap;
  rejects(() => validateActivity(overRewarded));
});

test('mutation and tick inputs require exact shape and paired expected activity identities', () => {
  const mutation = { commandId: 'start', runId: 'run', expectedRevision: 0,
    expectedActivityId: null, expectedActivityRevision: null, ownerId: 'owner' };
  validateActivityMutation(mutation);
  validateActivityMutation({ ...mutation, expectedActivityId: 'activity', expectedActivityRevision: 2 });
  for (const change of [{ extra: true }, { expectedActivityId: 'a' }, { expectedActivityRevision: 0 },
    { expectedRevision: -1 }, { ownerId: '' }, { commandId: ' ' }]) rejects(() => validateActivityMutation({ ...mutation, ...change }));
  const tick = { commandId: 'cycle', runId: 'run', expectedRevision: 1,
    activityId: 'a', expectedActivityRevision: 2, ownerId: 'owner', generation: 0 };
  validateActivityTick(tick);
  for (const change of [{ extra: true }, { generation: -1 }, { expectedActivityRevision: NaN }, { activityId: null }])
    rejects(() => validateActivityTick({ ...tick, ...change }));
});

test('completion rejects forged result shape, accounting, deltas and unrelated game revisions', () => {
  const game = qi(), activity = createActivity(game, natural(), options()), out = resolve(game, activity.nextCommand);
  const done = (state, result) => completeActivity(state, activity, result, { commandId: activity.nextCommand.commandId, now: activity.dueAt });
  for (const mutate of [
    r => { r.extra = 1; }, r => { r.commandId = 'other'; }, r => { r.requestedSteps = 50; },
    r => { r.costs.stones = 1; }, r => { r.delta.xp++; }, r => { r.delta.months++; },
    r => { r.delta.hp = 1; }, r => { r.delta.inventory.herb = 1; },
  ]) { const bad = structuredClone(out.result); mutate(bad); rejects(() => done(out.nextState, bad)); }
  const wrong = structuredClone(out.nextState); wrong.core.revision++;
  rejects(() => done(wrong, out.result));
  assert.equal(activity.completedCycles, 0); assert.equal(game.core.player.xp, 0);
});

test('clamped XP is the actual gain while each cycle retains the full formal time and stone cost', () => {
  const game = qi(); game.core.player.xp = C.realms.qi.xpCap - 1;
  const activity = createActivity(game, natural({ method: 'assisted', stoneBudget: 40 }), options());
  const out = complete(game, activity);
  assert.equal(out.activity.gainedXp, 1); assert.equal(out.activity.spentStones, 20); assert.equal(out.activity.spentMonths, 1);
  assert.equal(out.activity.stopReason.code, 'XP_CAP');
});

test('activity preview respects cumulative budget and reserve rather than projecting the full batch', () => {
  const game = qi(); game.core.player.stones = 500;
  const budget = previewActivity(game, natural({ method: 'assisted', stoneBudget: 40 }));
  assert.equal(budget.allowed, true); assert.equal(budget.failure, null);
  assert.equal(budget.cycles, 2); assert.equal(budget.xp, 200); assert.equal(budget.stones, 40);
  assert.equal(budget.months, 2); assert.equal(budget.cycleMs, 60_000);
  assert.equal(budget.stopReason.code, 'ACTIVITY_BUDGET');
  const reserve = previewActivity(game, natural({ method: 'assisted', stoneBudget: 500, stoneReserve: 480 }));
  assert.equal(reserve.allowed, true); assert.equal(reserve.cycles, 1); assert.equal(reserve.stones, 20);
  assert.equal(reserve.stopReason.code, 'ACTIVITY_RESERVE');
  const blocked = previewActivity(game, natural({ method: 'assisted', stoneBudget: 19 }));
  assert.deepEqual({ allowed: blocked.allowed, cycles: blocked.cycles, xp: blocked.xp, stones: blocked.stones, months: blocked.months },
    { allowed: false, cycles: 0, xp: 0, stones: 0, months: 0 });
  assert.equal(blocked.failure.code, 'ACTIVITY_BUDGET'); assert.equal(blocked.stopReason, null);
});

test('activity preview is deterministic and read-only while keeping count, cap, lifespan and invalid-input stops', () => {
  const game = qi(), plan = natural({ maxCycles: 2, until: 'cycles' });
  const beforeGame = structuredClone(game), beforePlan = structuredClone(plan);
  const first = previewActivity(game, plan);
  assert.deepEqual(previewActivity(game, plan), first);
  assert.deepEqual(game, beforeGame); assert.deepEqual(plan, beforePlan);
  assert.equal(first.cycles, 2); assert.equal(first.stopReason.code, 'CYCLES_COMPLETE');
  const cap = opening(), capped = previewActivity(cap, natural());
  assert.equal(capped.cycles, 2); assert.equal(capped.xp, 10); assert.equal(capped.stopReason.code, 'XP_CAP');
  const aged = structuredClone(game);
  aged.core.world.elapsedMonths = C.realms.qi.lifespanMonths - aged.core.player.startAgeMonths - 2;
  const age = previewActivity(aged, natural());
  assert.equal(age.allowed, true); assert.equal(age.cycles, 1); assert.equal(age.stopReason.code, 'AGE_LIMIT');
  const invalid = previewActivity(game, natural({ maxCycles: Infinity }));
  assert.equal(invalid.allowed, false); assert.equal(invalid.failure.code, 'ACTIVITY_INVALID');
  const lastRevision = structuredClone(game); lastRevision.core.revision = Number.MAX_SAFE_INTEGER;
  const overflow = previewActivity(lastRevision, natural());
  assert.equal(overflow.allowed, false); assert.equal(overflow.cycles, 0); assert.equal(overflow.failure.code, 'SAVE_ID');
  assert.deepEqual(game, beforeGame); assert.deepEqual(plan, beforePlan);
});
