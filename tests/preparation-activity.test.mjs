import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { newGame, resolve, validateGame, stats } from '../src/full/engine.ts';
import { remainingMonths } from '../src/full/costs.ts';
import { createActivity, completeActivity, validateActivity, validateActivityPlan, pauseActivity, resumeActivity,
  previewActivity, activityStop, PREPARATION_CYCLE_MS, preparationCycleAction, validatePreparationResult } from '../src/full/activity.ts';
import { fullRoute } from './full-route.mjs';

const route = fullRoute();
const options = (changes = {}) => ({ id: 'preparation', ownerId: 'page-one', commandId: 'start', now: 1_000, ...changes });
const rejects = (fn, code = 'ACTIVITY_INVALID') => assert.throws(fn, e => e.code === code);
const learn = (skills = ['sword_still'], changes = {}) => ({ kind: 'learn', skills, maxCycles: skills.length,
  stoneBudget: skills.reduce((n, id) => n + C.skills[id].price, 0), stoneReserve: 0, ...changes });
const study = (changes = {}) => ({ kind: 'study', manual: 'jinghong', maxCycles: 1, stoneBudget: 80, stoneReserve: 0, ...changes });
const buy = (item = 'herb', changes = {}) => ({ kind: 'buy', item, maxCycles: 3, until: 'cycles', targetQuantity: null,
  stoneBudget: C.items[item].buy * 3, stoneReserve: 0, ...changes });
const sell = (item = 'herb', changes = {}) => ({ kind: 'sell', item, maxCycles: 3, itemReserve: 0, ...changes });
const use = (item = 'healing_pill', changes = {}) => ({ kind: 'use', item, maxCycles: 3, targetPercent: 100, itemReserve: 0, ...changes });
const rest = (changes = {}) => ({ kind: 'rest', maxCycles: 1, remainingMonthsReserve: 1, ...changes });
function ready(realm = 'golden', location = 'cave') {
  const game = structuredClone(realm === 'spirit' ? route.checkpoints.trial : route.checkpoints[realm]);
  game.core.world.location = location; game.core.player.stones = 10_000;
  for (const id of Object.keys(C.items)) game.core.inventory[id] = 10;
  game.school = null; game.learned = []; game.loadout = { mind: null, builder: null, finisher: null, relic: null };
  game.ownedRelics = []; game.core.learnedSkills = [];
  validateGame(game); return game;
}
function injured(realm = 'golden', location = 'cave') {
  const game = ready(realm, location); game.core.player.hp = 1; game.core.player.mp = 0; validateGame(game); return game;
}
function complete(game, activity, now = activity.dueAt) {
  const out = resolve(game, activity.nextCommand);
  return { game: out.nextState, result: out.result,
    activity: completeActivity(out.nextState, activity, out.result, { commandId: activity.nextCommand.commandId, now }) };
}
function all(game, activity) {
  let out = { game, activity };
  while (out.activity.status === 'running') out = complete(out.game, out.activity);
  return out;
}

test('six adapters use declared real periods, accepted intent is read-only and transaction quantities are exactly one', () => {
  assert.deepEqual(PREPARATION_CYCLE_MS, { learn: 30_000, study: 60_000, buy: 15_000, sell: 15_000, use: 6_000, rest: 30_000 });
  for (const [game, plan] of [[ready('golden', 'sect'), learn()], [ready('golden', 'sect'), study()],
    [ready('golden', 'market'), buy()], [ready('golden', 'market'), sell()], [injured(), use()], [injured(), rest()]]) {
    const before = structuredClone({ game, plan }), activity = createActivity(game, plan, options());
    assert.equal(activity.version, 5); assert.equal(activity.completedCycles, 0); assert.equal(activity.cycleMs, PREPARATION_CYCLE_MS[plan.kind]);
    assert.equal(activity.dueAt, 1_000 + activity.cycleMs); assert.equal(activity.spentStones, 0);
    assert.deepEqual(activity.nextCommand, { ...preparationCycleAction(plan, 0), commandId: 'cycle:preparation:0:1',
      runId: game.core.runId, expectedRevision: game.core.revision });
    if (plan.kind === 'buy' || plan.kind === 'sell') assert.equal(activity.nextCommand.quantity, 1);
    assert.deepEqual({ game, plan }, before); validateActivity(activity, game);
  }
});

test('all twelve skills learn in selected order with actual cumulative prices, zero-price and cross-school effects', () => {
  const game = ready('spirit', 'sect'), skills = Object.keys(C.skills), plan = learn(skills), before = structuredClone(game);
  assert.equal(skills.length, 12);
  const activity = createActivity(game, plan, options()), out = all(game, activity);
  assert.equal(out.activity.completedCycles, 12); assert.equal(out.activity.stopReason.code, 'CYCLES_COMPLETE');
  assert.deepEqual(out.activity.learnedSkills, skills); assert.deepEqual(out.game.learned, skills);
  assert.equal(out.activity.spentStones, skills.reduce((n, id) => n + C.skills[id].price, 0));
  assert.equal(out.game.core.player.stones, before.core.player.stones - out.activity.spentStones);
  assert.deepEqual(out.game.loadout, before.loadout); assert.equal(out.game.school, null);
  assert.deepEqual(out.activity.gainedItems, {}); assert.equal(out.activity.gainedXp, 0);
  assert.equal(out.activity.restoredHp, 0); assert.equal(out.activity.restoredMp, 0); assert.deepEqual(game, before);
  const zero = ready('qi', 'sect'); zero.core.player.stones = 0;
  const free = all(zero, createActivity(zero, learn(['sword_mind', 'talisman_mind']), options()));
  assert.equal(free.activity.completedCycles, 2); assert.equal(free.activity.spentStones, 0);
  assert.deepEqual(free.game.learned, ['sword_mind', 'talisman_mind']);
});

test('learning stops before another price and keeps queue identity plus actual cost through a pause/takeover', () => {
  const game = ready('spirit', 'sect'), plan = learn(['sword_still', 'sword_echo'], { stoneBudget: 100 });
  const out = complete(game, createActivity(game, plan, options()));
  assert.equal(out.activity.stopReason.code, 'ACTIVITY_BUDGET'); assert.equal(out.activity.completedCycles, 1);
  assert.deepEqual(out.activity.learnedSkills, ['sword_still']); assert.equal(out.activity.spentStones, 100);
  const other = ready('spirit', 'sect'), first = complete(other, createActivity(other, learn(['sword_mind', 'talisman_mind', 'sword_still']), options()));
  const paused = pauseActivity(first.activity), resumed = resumeActivity(first.game, paused, { ownerId: 'page-two', commandId: 'resume', now: 86_400_000 });
  assert.equal(resumed.nextCommand.skill, 'talisman_mind'); assert.equal(resumed.dueAt, 86_430_000);
  assert.deepEqual(resumed.learnedSkills, ['sword_mind']); assert.equal(resumed.spentStones, 0);
});

test('already learned anywhere in a queue, future skills and duplicate queue entries cannot charge a first period', () => {
  const game = ready('spirit', 'sect'); game.learned = ['sword_still'];
  rejects(() => createActivity(game, learn(['talisman_mind', 'sword_still']), options()), 'ALREADY_LEARNED');
  rejects(() => createActivity(ready('qi', 'sect'), learn(['sword_mind', 'sword_echo']), options()), 'REALM_REQUIRED');
  rejects(() => validateActivityPlan(learn(['sword_mind', 'sword_mind'])));
});

test('manual study is one real paid effect even for a talisman practitioner, with no fake damage or equipment bonus', () => {
  const game = ready('foundation', 'sect'); game.school = 'talisman'; game.learned = Object.values(C.startingLoadouts.talisman);
  game.loadout = { ...C.startingLoadouts.talisman, relic: null }; validateGame(game);
  const before = structuredClone(game), out = complete(game, createActivity(game, study(), options()));
  assert.equal(out.activity.spentStones, 80); assert.deepEqual(out.activity.studiedManuals, ['jinghong']);
  assert.deepEqual(out.game.core.learnedSkills, [C.swordManual.id]); assert.equal(stats(out.game).manualDamageBonus, 0);
  assert.deepEqual(out.game.loadout, before.loadout); assert.equal(out.game.school, 'talisman');
  assert.equal(out.activity.stopReason.code, 'CYCLES_COMPLETE');
  rejects(() => createActivity(out.game, study(), options()), 'ALREADY_LEARNED');
  rejects(() => createActivity(ready('qi', 'sect'), study(), options()), 'REALM_REQUIRED');
});

test('every buyable item uses separate quantity-one transactions and real accumulated price, without XP or game-month charges', () => {
  for (const [id, item] of Object.entries(C.items)) {
    const game = ready('spirit', 'market'), before = structuredClone(game);
    const activity = createActivity(game, buy(id, { maxCycles: 2 }), options()), first = complete(game, activity), second = complete(first.game, first.activity);
    assert.equal(first.result.requestedSteps, 1); assert.equal(first.result.executedSteps, 1);
    assert.equal(second.activity.completedCycles, 2); assert.deepEqual(second.activity.gainedItems, { [id]: 2 });
    assert.deepEqual(second.activity.spentItems, {}); assert.equal(second.activity.spentStones, item.buy * 2);
    assert.equal(second.game.core.inventory[id], before.core.inventory[id] + 2);
    assert.equal(second.game.core.player.stones, before.core.player.stones - item.buy * 2);
    assert.equal(second.game.core.world.elapsedMonths, before.core.world.elapsedMonths); assert.equal(second.activity.gainedXp, 0);
  }
});

test('buy inventory targets, cumulative budget, reserve and actual insufficient money stop before a new item', () => {
  const game = ready('qi', 'market'), initial = game.core.inventory.herb;
  const target = buy('herb', { maxCycles: 50, until: 'target', targetQuantity: initial + 2 });
  const out = all(game, createActivity(game, target, options()));
  assert.equal(out.activity.completedCycles, 2); assert.equal(out.activity.stopReason.code, 'TARGET_MET');
  rejects(() => createActivity(out.game, target, options()), 'TARGET_MET');
  const limit = all(game, createActivity(game, buy('herb', { stoneBudget: 10 }), options()));
  assert.equal(limit.activity.completedCycles, 2); assert.equal(limit.activity.stopReason.code, 'ACTIVITY_BUDGET');
  const reserve = all(game, createActivity(game, buy('herb', { stoneReserve: game.core.player.stones - 10 }), options()));
  assert.equal(reserve.activity.completedCycles, 2); assert.equal(reserve.activity.stopReason.code, 'ACTIVITY_RESERVE');
  const poor = ready('qi', 'market'); poor.core.player.stones = 4;
  rejects(() => createActivity(poor, buy(), options()), 'INSUFFICIENT_STONES');
  const first = complete(game, createActivity(game, buy('herb', { maxCycles: 5, stoneBudget: 10 }), options()));
  const earned = structuredClone(first.game); earned.core.player.stones += 100;
  const resumed = resumeActivity(earned, pauseActivity(first.activity), { ownerId: 'two', commandId: 'resume', now: 100_000 });
  const second = complete(earned, resumed); assert.equal(second.activity.stopReason.code, 'ACTIVITY_BUDGET'); assert.equal(second.activity.spentStones, 10);
});

test('all saleable materials and both medicines remain sellable; gross spent items and earned stones stay separate', () => {
  const ids = Object.keys(C.items).filter(id => C.items[id].sell !== null);
  assert.ok(ids.includes('healing_pill') && ids.includes('spirit_pill'));
  for (const id of ids) {
    const game = ready('spirit', 'market'), before = structuredClone(game), out = all(game, createActivity(game, sell(id), options()));
    assert.equal(out.activity.completedCycles, 3); assert.equal(out.activity.spentStones, 0);
    assert.deepEqual(out.activity.spentItems, { [id]: 3 }); assert.deepEqual(out.activity.gainedItems, {});
    assert.equal(out.activity.gainedStones, 3 * C.items[id].sell);
    assert.equal(out.game.core.inventory[id], before.core.inventory[id] - 3);
    assert.equal(out.game.core.player.stones, before.core.player.stones + 3 * C.items[id].sell);
  }
});

test('sale item reserve, shortage, protected breakthroughs and currency capacity retain unspent goods', () => {
  const game = ready('spirit', 'market'); game.core.inventory.herb = 3;
  const out = all(game, createActivity(game, sell('herb', { itemReserve: 1, maxCycles: 50 }), options()));
  assert.equal(out.activity.completedCycles, 2); assert.equal(out.activity.stopReason.code, 'ACTIVITY_RESERVE'); assert.equal(out.game.core.inventory.herb, 1);
  const empty = ready('qi', 'market'); empty.core.inventory.herb = 0;
  rejects(() => createActivity(empty, sell(), options()), 'INSUFFICIENT_ITEM');
  for (const id of Object.keys(C.items).filter(id => C.items[id].sell === null)) rejects(() => createActivity(ready('spirit', 'market'), sell(id), options()), 'LOCKED_ITEM');
  const rich = ready('spirit', 'market'); rich.core.player.stones = C.maxQuantity - 3;
  const capacity = complete(rich, createActivity(rich, sell(), options()));
  assert.equal(capacity.activity.completedCycles, 1); assert.equal(capacity.activity.stopReason.code, 'SAVE_RANGE');
  assert.equal(capacity.game.core.player.stones, C.maxQuantity - 1); assert.equal(capacity.game.core.inventory.herb, 9);
});

test('both medicines across every realm restore only actual capped HP/MP and stop on the selected threshold', () => {
  for (const realm of ['mortal', 'qi', 'foundation', 'golden', 'nascent', 'spirit']) {
    for (const id of ['healing_pill', 'spirit_pill']) {
      const game = injured(realm), item = C.items[id], maximum = item.hp ? C.realms[realm].maxHp : C.realms[realm].maxMp;
      const before = structuredClone(game), out = all(game, createActivity(game, use(id, { targetPercent: 60 }), options()));
      const amount = Math.max(item.hp ?? item.mp, Math.floor(maximum * .35)), initial = item.hp ? 1 : 0;
      const expectedCycles = Math.ceil((Math.ceil(maximum * .6) - initial) / amount);
      assert.equal(out.activity.completedCycles, expectedCycles); assert.equal(out.activity.stopReason.code, 'TARGET_MET');
      const actualGain = Math.min(maximum - initial, expectedCycles * amount);
      assert.equal(out.activity.restoredHp, item.hp ? actualGain : 0); assert.equal(out.activity.restoredMp, item.mp ? actualGain : 0);
      assert.deepEqual(out.activity.spentItems, { [id]: expectedCycles }); assert.equal(out.activity.spentMonths, 0);
      assert.equal(out.game.core.inventory[id], before.core.inventory[id] - expectedCycles); assert.equal(out.game.core.player.stones, before.core.player.stones);
      validateActivity(out.activity, out.game);
    }
  }
});

test('medicine plans do not wait for future injury and obey quantity, actual inventory and reserve limits', () => {
  rejects(() => createActivity(ready(), use(), options()), 'TARGET_MET');
  const game = injured('spirit'); game.core.inventory.healing_pill = 2;
  const reserve = all(game, createActivity(game, use('healing_pill', { itemReserve: 1 }), options()));
  assert.equal(reserve.activity.completedCycles, 1); assert.equal(reserve.activity.stopReason.code, 'ACTIVITY_RESERVE');
  const count = all(game, createActivity(game, use('healing_pill', { maxCycles: 1 }), options()));
  assert.equal(count.activity.completedCycles, 1); assert.equal(count.activity.stopReason.code, 'CYCLES_COMPLETE');
  const empty = injured(); empty.core.inventory.healing_pill = 0;
  rejects(() => createActivity(empty, use(), options()), 'INSUFFICIENT_ITEM');
  const threshold = injured(); threshold.core.player.hp = Math.ceil(C.realms.golden.maxHp * .6);
  rejects(() => createActivity(threshold, use('healing_pill', { targetPercent: 60 }), options()), 'TARGET_MET');
});

test('rest pays the current formal calendar cost with both real restorations and an exact remaining-life reserve', () => {
  for (const realm of ['mortal', 'qi', 'foundation', 'golden', 'nascent', 'spirit']) {
    const game = injured(realm), before = structuredClone(game), out = complete(game, createActivity(game, rest(), options()));
    assert.equal(out.activity.completedCycles, 1); assert.equal(out.activity.spentMonths, 12); assert.equal(out.activity.stopReason.code, 'CYCLES_COMPLETE');
    assert.equal(out.activity.restoredHp, C.realms[realm].maxHp - 1); assert.equal(out.activity.restoredMp, C.realms[realm].maxMp);
    assert.equal(out.game.core.world.elapsedMonths, before.core.world.elapsedMonths + 12); assert.deepEqual(out.activity.spentItems, {});
  }
  const aging = injured(); aging.core.world.elapsedMonths += remainingMonths(aging) - 13;
  const safe = complete(aging, createActivity(aging, rest(), options())); assert.equal(remainingMonths(safe.game), 1);
  rejects(() => createActivity(aging, rest({ remainingMonthsReserve: 2 }), options()), 'ACTIVITY_RESERVE');
  rejects(() => createActivity(ready(), rest(), options()), 'NO_CHANGE');
  rejects(() => validateActivityPlan(rest({ remainingMonthsReserve: 0 })));
});

test('locations, pending decisions and battle use the official rules and never implicitly travel or heal in combat', () => {
  rejects(() => createActivity(ready('golden', 'cave'), learn(), options()), 'LOCATION_REQUIRED');
  rejects(() => createActivity(ready('golden', 'cave'), buy(), options()), 'LOCATION_REQUIRED');
  rejects(() => createActivity(injured('golden', 'sect'), rest(), options()), 'LOCATION_REQUIRED');
  rejects(() => createActivity(newGame('待决', 'opening-before-supplies'), buy('healing_pill'), options()), 'PENDING_EVENT');
  const game = injured('qi', 'wilderness'); game.school = 'sword'; game.learned = Object.values(C.startingLoadouts.sword);
  game.loadout = { ...C.startingLoadouts.sword, relic: null }; game.core.player.hp = 40;
  const combat = resolve(game, { type: 'ENCOUNTER', enemy: 'wolf', commandId: 'meet', runId: game.core.runId, expectedRevision: game.core.revision }).nextState;
  rejects(() => createActivity(combat, use(), options()), 'IN_BATTLE');
  assert.equal(combat.core.inventory.healing_pill, game.core.inventory.healing_pill); assert.equal(combat.battle.enemy, 'wolf');
});

test('a forged completed medicine cycle beyond its already reached target cannot spend another dose', () => {
  const game = injured('mortal'); game.core.player.hp = C.realms.mortal.maxHp - 1;
  const out = complete(game, createActivity(game, use(), options()));
  assert.equal(out.activity.completedCycles, 1); assert.equal(out.activity.restoredHp, 1);
  const wasted = structuredClone(out.activity); wasted.completedCycles = 2; wasted.revision++;
  wasted.spentItems.healing_pill = 2;
  rejects(() => validateActivity(wasted));
  const fullyRested = complete(injured(), createActivity(injured(), rest(), options())).activity;
  fullyRested.startingHp = fullyRested.maxHp; fullyRested.startingMp = fullyRested.maxMp;
  fullyRested.restoredHp = 0; fullyRested.restoredMp = 0;
  rejects(() => validateActivity(fullyRested));
});

test('preparation plans reject unbounded, hidden, nonprimitive and malformed authorization', () => {
  for (const valid of [learn(), study(), buy(), sell(), use(), rest()]) validateActivityPlan(valid);
  for (const [base, changes] of [[learn(), [{ skills: [] }, { maxCycles: 2 }, { skills: ['unknown'] }, { skills: ['sword_mind', 'sword_mind'], maxCycles: 2 }, { skills: new Set(['sword_mind']) }]],
    [study(), [{ manual: 'other' }, { maxCycles: 2 }]], [buy(), [{ quantity: 5 }, { until: 'target' }, { targetQuantity: 1 }, { until: 'target', targetQuantity: 0 }]],
    [sell(), [{ itemReserve: -1 }, { itemReserve: C.maxQuantity + 1 }]], [use(), [{ item: 'herb' }, { targetPercent: 0 }, { targetPercent: 101 }, { targetPercent: 2.5 }]],
    [rest(), [{ remainingMonthsReserve: 0 }, { maxCycles: 2 }]]]) {
    for (const change of changes) rejects(() => validateActivityPlan({ ...base, ...change }));
    for (const change of [{ extra: true }, { maxCycles: Infinity }, { maxCycles: 0 }, { maxCycles: new Number(1) }]) rejects(() => validateActivityPlan({ ...base, ...change }));
  }
  for (const change of [{ stoneBudget: NaN }, { stoneReserve: -1 }, { stoneBudget: Number.MAX_SAFE_INTEGER + 1 }, { item: new String('herb') }]) rejects(() => validateActivityPlan(buy('herb', change)));
  const list = ['sword_mind', 'talisman_mind'], plan = learn(list), activity = createActivity(ready('qi', 'sect'), plan, options()); list.reverse();
  assert.deepEqual(activity.plan.skills, ['sword_mind', 'talisman_mind']);
});

test('v5 strict totals, starting proofs and stable commands reject tampering instead of faking recovery or learned effects', () => {
  for (const [game, plan] of [[injured(), use()], [ready('spirit', 'sect'), learn(['sword_mind', 'talisman_mind'])], [ready('golden', 'market'), buy()]]) {
    const activity = createActivity(game, plan, options()), first = complete(game, activity);
    for (const source of [activity, first.activity]) {
      for (const mutate of [a => { a.restoredHp++; }, a => { a.restoredMp++; }, a => { a.spentItems.dao = 1; }, a => { a.gainedItems.dao = 1; },
        a => { a.gainedStones++; }, a => { a.learnedSkills.push('sword_echo'); }, a => { a.studiedManuals.push('jinghong'); },
        a => { a.maxHp++; }, a => { a.startingHp = 0; }, a => { a.manualsBefore = ['unknown']; },
        a => { a.loadoutBefore.relic = 'frost_sword'; }, a => { a.version = 1; }, a => { a.gainedXp = 1; }]) {
        const bad = structuredClone(source); mutate(bad); rejects(() => validateActivity(bad));
      }
    }
    const batched = structuredClone(activity); batched.nextCommand.quantity = 50; rejects(() => validateActivity(batched));
  }
});

test('formal receipt proof rejects restored-HP lies, missing costs, extra drops, autoconfiguration and missing mastery', () => {
  for (const [game, plan] of [[injured(), use()], [ready('spirit', 'sect'), learn()], [ready('golden', 'sect'), study()], [ready('golden', 'market'), buy()]]) {
    const activity = createActivity(game, plan, options()), out = resolve(game, activity.nextCommand);
    const done = (g, r) => completeActivity(g, activity, r, { commandId: activity.nextCommand.commandId, now: activity.dueAt });
    for (const mutate of [r => { r.delta.hp++; }, r => { r.delta.mp++; }, r => { r.delta.xp = 1; }, r => { r.costs.stones++; },
      r => { r.delta.inventory.dao = 1; }, r => { r.requestedSteps = 2; }, r => { r.commandId = 'different'; }]) {
      const bad = structuredClone(out.result); mutate(bad); rejects(() => done(out.nextState, bad));
    }
    if (plan.kind === 'learn') {
      const missing = structuredClone(out.nextState); missing.learned = []; rejects(() => done(missing, out.result));
      const swapped = structuredClone(out.nextState); swapped.school = 'sword'; swapped.learned = [...new Set([...swapped.learned, ...Object.values(C.startingLoadouts.sword)])];
      swapped.loadout = { ...C.startingLoadouts.sword, relic: null }; rejects(() => done(swapped, out.result));
    }
    if (plan.kind === 'study') { const missing = structuredClone(out.nextState); missing.core.learnedSkills = []; rejects(() => done(missing, out.result)); }
  }
});

test('deadline, duplicate result, pause and takeover retain exact intent without offline rewards or stale completion', () => {
  const game = injured(), activity = createActivity(game, use(), options()), out = resolve(game, activity.nextCommand);
  const done = (a, commandId, now) => completeActivity(out.nextState, a, out.result, { commandId, now });
  rejects(() => done(activity, activity.nextCommand.commandId, activity.dueAt - 1), 'ACTIVITY_NOT_DUE');
  const next = done(activity, activity.nextCommand.commandId, activity.dueAt);
  rejects(() => done(next, activity.nextCommand.commandId, next.dueAt), 'ACTIVITY_STALE');
  const resumed = resumeActivity(game, pauseActivity(activity), { ownerId: 'two', commandId: 'resume', now: 86_400_000 });
  assert.equal(resumed.dueAt, 86_406_000); assert.equal(resumed.completedCycles, 0); assert.equal(resumed.restoredHp, 0);
  assert.notEqual(resumed.nextCommand.commandId, activity.nextCommand.commandId);
  rejects(() => done(resumed, activity.nextCommand.commandId, resumed.dueAt), 'ACTIVITY_STALE');
  const late = complete(game, activity, 86_400_000); assert.equal(late.activity.completedCycles, 1); assert.equal(late.activity.dueAt, 86_406_000);
  const other = structuredClone(game); other.core.runId = 'new-life'; assert.equal(activityStop(other, activity).code, 'RUN_MISMATCH');
});

test('previews show exact spend, acquired objects, recovery and mastery while retaining old zero fields', () => {
  for (const [game, plan] of [[ready('spirit', 'sect'), learn(['sword_mind', 'sword_still'])], [ready('golden', 'sect'), study()],
    [ready('golden', 'market'), buy()], [ready('golden', 'market'), sell()], [injured(), use()], [injured(), rest()]]) {
    const before = structuredClone({ game, plan }), preview = previewActivity(game, plan), actual = all(game, createActivity(game, plan, options()));
    assert.equal(preview.allowed, true); assert.equal(preview.cycles, actual.activity.completedCycles);
    assert.equal(preview.hp, actual.activity.restoredHp); assert.equal(preview.mp, actual.activity.restoredMp);
    assert.deepEqual(preview.skills, actual.activity.learnedSkills); assert.deepEqual(preview.manuals, actual.activity.studiedManuals);
    assert.deepEqual(preview.items, actual.activity.gainedItems); assert.deepEqual(preview.spentItems, actual.activity.spentItems);
    assert.equal(preview.earnedStones, actual.activity.gainedStones); assert.deepEqual({ game, plan }, before);
  }
  const oldGame = ready(); oldGame.core.player.xp = 0;
  const old = previewActivity(oldGame, { kind: 'cultivation', method: 'natural', maxCycles: 1, until: 'cycles', stoneBudget: 0, stoneReserve: 0 });
  assert.deepEqual({ hp: old.hp, mp: old.mp, skills: old.skills, manuals: old.manuals }, { hp: 0, mp: 0, skills: [], manuals: [] });
});

test('current snapshots bind real recovery and configuration, historical STATE_CHANGED records allow later damage or equipment', () => {
  const game = injured(), out = complete(game, createActivity(game, use(), options()));
  const wrong = structuredClone(out.game); wrong.core.player.hp--;
  rejects(() => validateActivity(out.activity, wrong));
  wrong.core.revision++;
  const stopped = { ...out.activity, revision: out.activity.revision + 1, gameRevision: wrong.core.revision, status: 'stopped',
    stopReason: { code: 'STATE_CHANGED', message: '玩家已明确执行其他行动，旧安排停止' }, nextCommand: null, startedAt: null, dueAt: null };
  validateActivity(stopped, wrong);
  const initial = createActivity(game, use(), options()), resolved = resolve(game, initial.nextCommand);
  const proofBefore = validatePreparationResult(resolved.nextState, initial, resolved.result);
  assert.deepEqual(proofBefore.core.player, game.core.player);
  const result1 = completeActivity(resolved.nextState, initial, resolved.result, { commandId: initial.nextCommand.commandId, now: initial.dueAt });
  assert.deepEqual(completeActivity(resolved.nextState, initial, resolved.result, { commandId: initial.nextCommand.commandId, now: initial.dueAt }), result1);
});

test('capacity and real life boundaries reject a next action with no partial price, output or false restoration', () => {
  const full = ready('golden', 'market'); full.core.inventory.herb = C.maxQuantity;
  rejects(() => createActivity(full, buy(), options()), 'CAPACITY');
  full.core.inventory.herb--;
  const last = complete(full, createActivity(full, buy(), options()));
  assert.equal(last.activity.completedCycles, 1); assert.equal(last.activity.stopReason.code, 'CAPACITY');
  assert.equal(last.activity.spentStones, 5); assert.equal(last.game.core.inventory.herb, C.maxQuantity);
  const ending = injured(); ending.status = 'ended'; ending.ending = 'retired'; validateGame(ending);
  rejects(() => createActivity(ending, rest(), options()), 'ENDED');
});
