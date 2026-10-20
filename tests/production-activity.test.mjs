import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { resolve, validateGame } from '../src/full/engine.ts';
import { remainingMonths } from '../src/full/costs.ts';
import { createActivity, completeActivity, validateActivity, validateActivityPlan, pauseActivity,
  resumeActivity, previewActivity, activityStop } from '../src/full/activity.ts';
import { fullRoute } from './full-route.mjs';

const route = fullRoute();
const options = (change = {}) => ({ id: 'production', ownerId: 'one', commandId: 'start', now: 1_000, ...change });
const rejects = (fn, code = 'ACTIVITY_INVALID') => assert.throws(fn, error => error.code === code);
const limits = (unit, months, count = 5) => ({ stoneBudget: unit.stones * count, stoneReserve: 0,
  monthBudget: months * count, remainingMonthsReserve: 1, itemReserves: {} });
const craftPlan = (id = 'healing', change = {}) => ({ kind: 'craft', recipeId: id, maxCycles: 5, until: 'cycles',
  targetQuantity: null, ...limits(C.recipes[id], C.recipes[id].months), ...change });
const forgePlan = (id = 'frost_sword', change = {}) => ({ kind: 'forge', relicId: id, maxCycles: 1,
  ...limits(C.relics[id], C.actionDurations.forge, 1), ...change });
function stocked(realm = 'qi') {
  const game = structuredClone(realm === 'spirit' ? route.checkpoints.trial : route.checkpoints[realm]);
  game.core.world.location = 'cave';
  game.core.player.stones = 10_000;
  for (const id of Object.keys(C.items)) game.core.inventory[id] = 100;
  game.ownedRelics = []; game.loadout.relic = null;
  validateGame(game); return game;
}
function complete(game, activity, now = activity.dueAt) {
  const out = resolve(game, activity.nextCommand);
  return { game: out.nextState, result: out.result,
    activity: completeActivity(out.nextState, activity, out.result, { commandId: activity.nextCommand.commandId, now }) };
}
const multiplied = (items, count) => Object.fromEntries(Object.entries(items).map(([id, amount]) => [id, amount * count]));

test('all seven recipes execute two full formal furnaces with exact gross materials, net inventory and costs', () => {
  assert.equal(Object.keys(C.recipes).length, 7);
  for (const [id, recipe] of Object.entries(C.recipes)) {
    const game = stocked(recipe.min), before = structuredClone(game), plan = craftPlan(id, { maxCycles: 2 });
    const activity = createActivity(game, plan, options());
    assert.equal(activity.version, 3); assert.equal(activity.cycleMs, recipe.months * 30_000);
    assert.ok(activity.cycleMs >= 30_000 && activity.cycleMs <= 150_000);
    assert.deepEqual(activity.nextCommand, { type: 'CRAFT', recipeId: id,
      commandId: 'cycle:production:0:1', runId: game.core.runId, expectedRevision: game.core.revision });
    assert.deepEqual(game, before); assert.deepEqual(activity.spentItems, {});
    const first = complete(game, activity), second = complete(first.game, first.activity);
    assert.equal(first.activity.status, 'running'); assert.equal(second.activity.status, 'stopped');
    assert.equal(second.activity.stopReason.code, 'CYCLES_COMPLETE');
    assert.equal(second.activity.completedCycles, 2); assert.equal(second.activity.gainedXp, 0);
    assert.deepEqual(second.activity.spentItems, multiplied(recipe.inputs, 2));
    assert.deepEqual(second.activity.gainedItems, { [recipe.output]: 2 }); assert.deepEqual(second.activity.forgedRelics, []);
    assert.equal(second.activity.spentStones, recipe.stones * 2); assert.equal(second.activity.spentMonths, recipe.months * 2);
    assert.equal(second.game.core.player.stones, before.core.player.stones - recipe.stones * 2);
    assert.equal(second.game.core.inventory[recipe.output], before.core.inventory[recipe.output] + 2);
    for (const [material, amount] of Object.entries(recipe.inputs)) {
      assert.equal(first.result.delta.inventory[material], -amount);
      assert.equal(second.game.core.inventory[material], before.core.inventory[material] - amount * 2);
    }
    assert.equal(second.game.core.player.realm, before.core.player.realm);
    assert.deepEqual(second.game.loadout, before.loadout); validateActivity(second.activity, second.game);
  }
});

test('all four relics use one sixty-second FORGE, add ownership once and preserve an existing equipped relic', () => {
  assert.equal(Object.keys(C.relics).length, 4);
  for (const [id, relic] of Object.entries(C.relics)) {
    const game = stocked('golden'), other = Object.keys(C.relics).find(key => key !== id);
    game.ownedRelics = [other]; game.loadout.relic = other; validateGame(game);
    const before = structuredClone(game), activity = createActivity(game, forgePlan(id), options());
    assert.equal(activity.version, 4); assert.equal(activity.cycleMs, 60_000); assert.equal(activity.relicBefore, other);
    assert.equal(activity.nextCommand.type, 'FORGE'); assert.equal(activity.nextCommand.relic, id);
    assert.equal(Object.hasOwn(activity.nextCommand, 'count'), false);
    const out = complete(game, activity);
    assert.equal(out.activity.status, 'stopped'); assert.equal(out.activity.stopReason.code, 'CYCLES_COMPLETE');
    assert.equal(out.activity.completedCycles, 1); assert.deepEqual(out.activity.forgedRelics, [id]);
    assert.deepEqual(out.activity.spentItems, relic.inputs); assert.deepEqual(out.activity.gainedItems, {});
    assert.deepEqual(out.game.ownedRelics, [other, id]); assert.equal(out.game.loadout.relic, other);
    assert.equal(out.game.core.player.stones, before.core.player.stones - relic.stones);
    assert.equal(out.game.core.world.elapsedMonths, before.core.world.elapsedMonths + 2);
    rejects(() => createActivity(out.game, forgePlan(id), options({ id: 'again' })), 'ALREADY_OWNED');
    const equipped = structuredClone(out.game); equipped.loadout.relic = id;
    rejects(() => createActivity(equipped, forgePlan(id), options({ id: 'again-equipped' })), 'ALREADY_OWNED');
    assert.deepEqual(game, before); validateActivity(out.activity, out.game);
  }
});

test('production previews return gross input, actual output and relic ownership separately and never mutate intent', () => {
  const game = stocked('golden'), plan = craftPlan('healing', { maxCycles: 2 }), before = structuredClone({ game, plan });
  const preview = previewActivity(game, plan);
  assert.equal(preview.allowed, true); assert.equal(preview.cycles, 2); assert.equal(preview.xp, 0);
  assert.equal(preview.stones, 4); assert.equal(preview.months, 2); assert.equal(preview.earnedStones, 0);
  assert.deepEqual(preview.items, { healing_pill: 2 }); assert.deepEqual(preview.spentItems, { herb: 4 });
  assert.deepEqual(preview.relics, []); assert.deepEqual(previewActivity(game, plan), preview);
  const forge = previewActivity(game, forgePlan());
  assert.equal(forge.cycles, 1); assert.equal(forge.stones, 140); assert.equal(forge.months, 2);
  assert.deepEqual(forge.items, {}); assert.deepEqual(forge.spentItems, { jade: 3, core: 1 });
  assert.deepEqual(forge.relics, ['frost_sword']); assert.deepEqual({ game, plan }, before);
});

test('inventory target counts existing finished pills and stops exactly without an extra material charge', () => {
  const game = stocked(), initial = game.core.inventory.healing_pill;
  const plan = craftPlan('healing', { until: 'target', targetQuantity: initial + 2, maxCycles: 50 });
  const first = complete(game, createActivity(game, plan, options())), second = complete(first.game, first.activity);
  assert.equal(second.activity.stopReason.code, 'TARGET_MET'); assert.equal(second.activity.completedCycles, 2);
  assert.equal(second.game.core.inventory.healing_pill, initial + 2);
  assert.deepEqual(second.activity.spentItems, { herb: 4 });
  rejects(() => createActivity(second.game, plan, options({ id: 'met' })), 'TARGET_MET');
  const blocked = previewActivity(second.game, plan); assert.equal(blocked.allowed, false);
  assert.equal(blocked.failure.code, 'TARGET_MET'); assert.deepEqual(blocked.items, {}); assert.deepEqual(blocked.spentItems, {});
});

test('cumulative stone and month budgets remain consumed across pause, new income and explicit takeover', () => {
  for (const [change, expected] of [[{ stoneBudget: 4 }, 4], [{ monthBudget: 2 }, 4]]) {
    const game = stocked(), first = complete(game, createActivity(game, craftPlan('healing', change), options()));
    const paused = pauseActivity(first.activity), earned = structuredClone(first.game);
    earned.core.player.stones += 100; // Income does not renew an arrangement's already consumed budget.
    const resumed = resumeActivity(earned, paused, { ownerId: 'two', commandId: 'resume', now: 1_000_000 });
    const second = complete(earned, resumed);
    assert.equal(second.activity.stopReason.code, 'ACTIVITY_BUDGET'); assert.equal(second.activity.spentStones, expected);
    assert.equal(second.activity.completedCycles, 2); assert.equal(second.activity.spentMonths, 2);
    assert.equal(resumed.startedAt, 1_000_000); assert.equal(resumed.dueAt, 1_030_000);
  }
  rejects(() => createActivity(stocked(), craftPlan('healing', { stoneBudget: 1 }), options()), 'ACTIVITY_BUDGET');
  rejects(() => createActivity(stocked(), craftPlan('healing', { monthBudget: 0 }), options()), 'ACTIVITY_BUDGET');
});

test('stone and each input reserve are checked before a whole furnace, exact reserve is retained', () => {
  const game = stocked(); game.core.player.stones = 6; game.core.inventory.herb = 6;
  for (const change of [{ stoneReserve: 2 }, { itemReserves: { herb: 2 } }]) {
    const preview = previewActivity(game, craftPlan('healing', change));
    assert.equal(preview.allowed, true); assert.equal(preview.cycles, 2); assert.equal(preview.stopReason.code, 'ACTIVITY_RESERVE');
    assert.deepEqual(preview.spentItems, { herb: 4 });
  }
  rejects(() => createActivity(game, craftPlan('healing', { stoneReserve: 5 }), options()), 'ACTIVITY_RESERVE');
  rejects(() => createActivity(game, craftPlan('healing', { itemReserves: { herb: 5 } }), options()), 'ACTIVITY_RESERVE');
  const forge = stocked('golden'); forge.core.inventory.jade = 4;
  rejects(() => createActivity(forge, forgePlan('frost_sword', { itemReserves: { jade: 2 } }), options()), 'ACTIVITY_RESERVE');
});

test('actual material, currency and remaining-life shortages never start or partially consume a furnace', () => {
  const base = stocked(), plan = craftPlan('healing');
  for (const [mutate, code] of [
    [g => { g.core.inventory.herb = 1; }, 'INSUFFICIENT_ITEM'],
    [g => { g.core.player.stones = 1; }, 'INSUFFICIENT_STONES'],
    [g => { g.core.world.elapsedMonths += remainingMonths(g) - 1; }, 'ACTIVITY_RESERVE'],
  ]) {
    const game = structuredClone(base); mutate(game); const before = structuredClone(game);
    rejects(() => createActivity(game, plan, options()), code); assert.deepEqual(game, before);
  }
  const aging = stocked(); aging.core.world.elapsedMonths += remainingMonths(aging) - 3;
  const one = complete(aging, createActivity(aging, craftPlan('healing', { remainingMonthsReserve: 2 }), options()));
  assert.equal(remainingMonths(one.game), 2); assert.equal(one.activity.stopReason.code, 'ACTIVITY_RESERVE');
  const unsafe = structuredClone(aging); unsafe.core.world.elapsedMonths += 2;
  rejects(() => createActivity(unsafe, craftPlan('healing', { remainingMonthsReserve: 0 }), options()), 'AGE_LIMIT');
});

test('finished-pill capacity halts before charging or drops, and exactly one final slot is safe', () => {
  const game = stocked(); game.core.inventory.healing_pill = C.maxQuantity;
  const before = structuredClone(game);
  rejects(() => createActivity(game, craftPlan(), options()), 'CAPACITY'); assert.deepEqual(game, before);
  game.core.inventory.healing_pill--;
  const out = complete(game, createActivity(game, craftPlan(), options()));
  assert.equal(out.game.core.inventory.healing_pill, C.maxQuantity); assert.equal(out.activity.completedCycles, 1);
  assert.equal(out.activity.stopReason.code, 'CAPACITY'); assert.equal(out.activity.spentStones, 2);
});

test('a production cycle cannot settle early, twice, with an old generation or with a different command', () => {
  const game = stocked(), activity = createActivity(game, craftPlan(), options()), out = resolve(game, activity.nextCommand);
  const done = (a, commandId, now) => completeActivity(out.nextState, a, out.result, { commandId, now });
  rejects(() => done(activity, activity.nextCommand.commandId, activity.dueAt - 1), 'ACTIVITY_NOT_DUE');
  rejects(() => done(activity, 'other', activity.dueAt), 'ACTIVITY_STALE');
  const next = done(activity, activity.nextCommand.commandId, activity.dueAt);
  rejects(() => done(next, activity.nextCommand.commandId, next.dueAt), 'ACTIVITY_STALE');
  const resumed = resumeActivity(game, pauseActivity(activity), { ownerId: 'two', commandId: 'resume', now: 5_000_000 });
  rejects(() => done(resumed, activity.nextCommand.commandId, resumed.dueAt), 'ACTIVITY_STALE');
  assert.equal(resumed.completedCycles, 0); assert.deepEqual(resumed.gainedItems, {});
  assert.equal(resumed.dueAt - resumed.startedAt, 30_000); assert.deepEqual(game.core.inventory, stocked().core.inventory);
});

test('late production completes only one furnace and starts a new full period without catch-up', () => {
  const game = stocked(), activity = createActivity(game, craftPlan(), options());
  const out = complete(game, activity, 86_400_000);
  assert.equal(out.activity.completedCycles, 1); assert.equal(out.activity.startedAt, 86_400_000);
  assert.equal(out.activity.dueAt, 86_430_000); assert.deepEqual(out.activity.gainedItems, { healing_pill: 1 });
  const boundary = createActivity(game, craftPlan(), options({ now: Number.MAX_SAFE_INTEGER - 30_000 }));
  const final = complete(game, boundary);
  assert.equal(final.activity.stopReason.code, 'ACTIVITY_TIME_LIMIT'); assert.equal(final.activity.completedCycles, 1);
});

test('production validates exact plans and input-only finite reserves, rejecting implicit or unlimited intent', () => {
  validateActivityPlan(craftPlan()); validateActivityPlan(forgePlan());
  for (const change of [{ recipeId: 'unknown' }, { count: 5 }, { maxCycles: 0 }, { maxCycles: 51 },
    { targetQuantity: 1 }, { until: 'target' }, { until: 'target', targetQuantity: C.maxQuantity + 1 },
    { stoneBudget: Infinity }, { stoneBudget: -1 }, { monthBudget: NaN }, { remainingMonthsReserve: 0.5 },
    { itemReserves: { healing_pill: 1 } }, { itemReserves: { herb: -1 } }, { itemReserves: { herb: Infinity } },
    { itemReserves: [] }, { itemReserves: new Date() }, { itemReserves: { herb: C.maxQuantity + 1 } }])
    rejects(() => validateActivityPlan(craftPlan('healing', change)));
  for (const change of [{ relicId: 'unknown' }, { maxCycles: 2 }, { until: 'cycles' }, { itemReserves: { herb: 1 } },
    { relicId: new String('frost_sword') }, { stoneReserve: -1 }, { monthBudget: 0.5 }])
    rejects(() => validateActivityPlan(forgePlan('frost_sword', change)));
  const nested = craftPlan('healing', { itemReserves: { herb: 2 } });
  const accepted = createActivity(stocked(), nested, options()); nested.itemReserves.herb = 3;
  assert.equal(accepted.plan.itemReserves.herb, 2);
});

test('strict v3/v4 schema prevents forged input/output totals, arbitrary relics and fast or batched commands', () => {
  for (const [game, plan] of [[stocked(), craftPlan()], [stocked('golden'), forgePlan()]]) {
    const running = createActivity(game, plan, options()), completed = complete(game, running);
    for (const mutate of [a => { a.version = 2; }, a => { a.spentItems.herb = 999; }, a => { a.gainedItems.healing_pill = 999; },
      a => { a.forgedRelics = ['frost_sword', 'soul_lamp']; }, a => { a.forgedRelics.extra = true; },
      a => { a.cycleMs = 1_600; }, a => { a.nextCommand.count = 5; }, a => { a.gainedXp = 1; }]) {
      const bad = structuredClone(running); mutate(bad); rejects(() => validateActivity(bad));
    }
    for (const mutate of [a => { a.completedCycles++; }, a => { a.spentStones++; }, a => { a.spentMonths++; },
      a => { a.spentItems = {}; }, a => { a.gainedItems.herb = 1; }, a => { a.forgedRelics = []; a.forgedRelics.extra = true; }]) {
      const bad = structuredClone(completed.activity); mutate(bad); rejects(() => validateActivity(bad));
    }
  }
});

test('completion rejects pure-output lies, changed accounting, extra drops, auto-equipped relics and missing ownership', () => {
  for (const [game, plan] of [[stocked(), craftPlan()], [stocked('golden'), forgePlan()]]) {
    const activity = createActivity(game, plan, options()), out = resolve(game, activity.nextCommand);
    const done = (state, result) => completeActivity(state, activity, result,
      { commandId: activity.nextCommand.commandId, now: activity.dueAt });
    for (const mutate of [r => { r.costs.items = {}; }, r => { r.delta.inventory = {}; },
      r => { r.delta.inventory.dao = 1; }, r => { r.delta.stones = 0; }, r => { r.costs.months++; },
      r => { r.delta.xp = 1; }, r => { r.delta.hp = 1; }, r => { r.requestedSteps = 5; }]) {
      const bad = structuredClone(out.result); mutate(bad); rejects(() => done(out.nextState, bad));
    }
    const wrong = structuredClone(out.nextState); wrong.core.world.location = 'sect';
    rejects(() => done(wrong, out.result));
    if (plan.kind === 'forge') {
      const equipped = structuredClone(out.nextState); equipped.loadout.relic = plan.relicId;
      rejects(() => done(equipped, out.result));
      const absent = structuredClone(out.nextState); absent.ownedRelics = [];
      rejects(() => done(absent, out.result));
    }
    assert.equal(activity.completedCycles, 0);
  }
});

test('forge snapshot validation checks current ownership and original equip, but keeps historical stopped records readable', () => {
  const game = stocked('golden'), activity = createActivity(game, forgePlan(), options()), out = complete(game, activity);
  const missing = structuredClone(out.game); missing.ownedRelics = [];
  rejects(() => validateActivity(out.activity, missing));
  const equipped = structuredClone(out.game); equipped.loadout.relic = 'frost_sword';
  rejects(() => validateActivity(out.activity, equipped));
  equipped.core.revision++; validateActivity(out.activity, equipped);
  const badBefore = structuredClone(activity); badBefore.relicBefore = 'frost_sword';
  rejects(() => validateActivity(badBefore));
});

test('a later explicitly saved equip invalidates the old forge plan without binding future loadouts', () => {
  const game = stocked('golden'); game.ownedRelics = ['jade_seal', 'cloud_mirror']; game.loadout.relic = 'jade_seal';
  const activity = createActivity(game, forgePlan(), options()), completed = complete(game, activity);
  const equipped = resolve(completed.game, { type: 'EQUIP_RELIC', relic: 'frost_sword', commandId: 'manual-equip',
    runId: game.core.runId, expectedRevision: completed.game.core.revision }).nextState;
  const invalidated = { ...completed.activity, revision: completed.activity.revision + 1,
    gameRevision: equipped.core.revision, stopReason: { code: 'STATE_CHANGED', message: '玩家主动改变配装，旧安排停止' } };
  validateActivity(invalidated, equipped);
  assert.equal(equipped.loadout.relic, 'frost_sword'); assert.equal(invalidated.relicBefore, 'jade_seal');
  const paused = pauseActivity(activity), changed = resolve(game, { type: 'EQUIP_RELIC', relic: 'cloud_mirror', commandId: 'manual-during-pause',
    runId: game.core.runId, expectedRevision: game.core.revision }).nextState;
  const invalidatedPause = { ...paused, revision: paused.revision + 1, gameRevision: changed.core.revision, status: 'stopped',
    stopReason: { code: 'STATE_CHANGED', message: '玩家主动改变配装，旧安排停止' } };
  validateActivity(invalidatedPause, changed);
  rejects(() => resumeActivity(changed, invalidatedPause, { ownerId: 'one', commandId: 'resume-stale-plan', now: 100_000 }), 'ACTIVITY_STOPPED');
});

test('production realm, current location, revision and ended-life checks do not travel, auto-break or override decisions', () => {
  rejects(() => createActivity(stocked(), craftPlan('golden'), options()), 'REALM_REQUIRED');
  rejects(() => createActivity(stocked('foundation'), forgePlan(), options()), 'REALM_REQUIRED');
  const away = stocked(); away.core.world.location = 'sect';
  rejects(() => createActivity(away, craftPlan(), options()), 'LOCATION_REQUIRED');
  const game = stocked(), paused = pauseActivity(createActivity(game, craftPlan(), options()));
  const changed = structuredClone(game); changed.core.revision++;
  assert.equal(activityStop(changed, paused).code, 'STATE_CHANGED');
  rejects(() => resumeActivity(changed, paused, { ownerId: 'two', commandId: 'r', now: 100_000 }), 'STATE_CHANGED');
  const run = structuredClone(game); run.core.runId = 'another-life';
  assert.equal(activityStop(run, paused).code, 'RUN_MISMATCH');
  const ended = structuredClone(game); ended.status = 'ended'; ended.ending = 'retired'; validateGame(ended);
  rejects(() => createActivity(ended, craftPlan(), options()), 'ENDED');
});

test('legacy cultivation and source records retain exact schema while previews add only empty production fields', () => {
  const game = stocked(), natural = { kind: 'cultivation', method: 'natural', maxCycles: 1, until: 'cycles', stoneBudget: 0, stoneReserve: 0 };
  game.core.player.xp = 0;
  const old = createActivity(game, natural, options()); validateActivity(old, game);
  assert.equal(old.version, 1); assert.equal(Object.hasOwn(old, 'spentItems'), false); assert.equal(Object.hasOwn(old, 'forgedRelics'), false);
  const preview = previewActivity(game, natural); assert.deepEqual(preview.spentItems, {}); assert.deepEqual(preview.relics, []);
  game.core.world.location = 'wilderness';
  const source = { kind: 'source', sourceId: 'herbs', maxCycles: 1, until: 'cycles', target: null, monthBudget: 1, remainingMonthsReserve: 1 };
  const oldSource = createActivity(game, source, options()); validateActivity(oldSource, game);
  assert.equal(oldSource.version, 2); assert.equal(Object.hasOwn(oldSource, 'spentItems'), false);
  const sourcePreview = previewActivity(game, source); assert.deepEqual(sourcePreview.spentItems, {}); assert.deepEqual(sourcePreview.relics, []);
});
