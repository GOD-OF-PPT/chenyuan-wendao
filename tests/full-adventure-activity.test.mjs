import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { newGame, resolve, validateGame } from '../src/full/engine.ts';
import { remainingMonths } from '../src/full/costs.ts';
import { createActivity, completeActivity, validateActivity, validateActivityPlan, activityStop, pauseActivity, resumeActivity,
  previewActivity, defaultBattleStrategy, defaultEncounterPlan, defaultBattlePlan, singleBattlePlan, adventureDecision,
  ADVENTURE_CYCLE_MS } from '../src/full/activity.ts';
import { fullRoute } from './full-route.mjs';

const route = fullRoute();
const options = (change = {}) => ({ id: 'adventure', ownerId: 'one', commandId: 'start', now: 1000, ...change });
const rejects = (fn, code = 'ACTIVITY_INVALID') => assert.throws(fn, e => e.code === code);
function ready(realm = 'spirit', school = 'sword', location = 'wilderness') {
  const game = structuredClone(realm === 'spirit' ? route.checkpoints.trial : route.checkpoints[realm]);
  game.core.world.location = location; game.core.player.xp = 0; game.core.player.hp = C.realms[realm].maxHp;
  game.core.player.mp = C.realms[realm].maxMp; game.core.player.stones = 1000;
  for (const id of Object.keys(C.items)) game.core.inventory[id] = 0;
  game.core.inventory.healing_pill = 5; game.core.inventory.spirit_pill = 5;
  game.school = school; game.learned = [...Object.values(C.startingLoadouts[school])];
  game.loadout = { ...C.startingLoadouts[school], relic: null }; game.ownedRelics = [];
  validateGame(game); return game;
}
function action(game, a) { return { ...a, commandId: 'external-' + game.core.revision, runId: game.core.runId, expectedRevision: game.core.revision }; }
function combat(realm = 'qi', school = 'sword', enemy = 'wolf') {
  const game = ready(realm, school, C.enemies[enemy].location);
  return resolve(game, action(game, { type: 'ENCOUNTER', enemy })).nextState;
}
function complete(game, activity, now = activity.dueAt) {
  const out = resolve(game, activity.nextCommand);
  return { game: out.nextState, result: out.result,
    activity: completeActivity(out.nextState, activity, out.result, { commandId: activity.nextCommand.commandId, now }) };
}
function all(game, activity) {
  let out = { game, activity }, rounds = 0;
  while (out.activity.status === 'running') { assert.ok(rounds++ < 2051); out = complete(out.game, out.activity); }
  return out;
}
function strategy(game, change = {}) { return { ...defaultBattleStrategy(game), healBelowPercent: 0, restoreBelowPercent: 0, ...change }; }
function encounter(game, enemy = 'wolf', change = {}) { return { ...defaultEncounterPlan(game, enemy), strategy: strategy(game), ...change }; }
function auto(game, change = {}) { return { ...defaultBattlePlan(game), strategy: strategy(game), ...change }; }

test('all six destinations perform exactly one six-second zero-cost arrival with no implicit event or next activity', () => {
  assert.deepEqual(ADVENTURE_CYCLE_MS, { travel: 6000, encounter: 30000, battle: 3000 });
  for (const location of Object.keys(C.locations)) {
    const game = ready('spirit', 'sword', location === 'cave' ? 'wilderness' : 'cave'), before = structuredClone(game);
    const a = createActivity(game, { kind: 'travel', location, maxCycles: 1 }, options());
    assert.equal(a.version, 6); assert.equal(a.cycleMs, 6000); assert.equal(a.nextCommand.type, 'TRAVEL');
    assert.deepEqual(game, before); const out = complete(game, a);
    assert.equal(out.game.core.world.location, location); assert.equal(out.game.core.activeEvent, null); assert.equal(out.game.battle, null);
    assert.equal(out.activity.status, 'stopped'); assert.equal(out.activity.completedCycles, 1); assert.equal(out.activity.spentMonths, 0);
    assert.equal(out.activity.spentStones, 0); assert.equal(out.activity.battleTurns, 0); validateActivity(out.activity, out.game);
  }
});

test('finite adventure previews match their persisted single-cycle completion and never mutate the input', () => {
  const traveler = ready('qi'), fighter = combat('qi');
  const cases = [
    { game: traveler, plan: { kind: 'travel', location: 'cave', maxCycles: 1 } },
    { game: traveler, plan: encounter(traveler, 'wolf', { maxCycles: 1 }) },
    { game: fighter, plan: singleBattlePlan(fighter, 'attack') },
  ];
  for (const { game, plan } of cases) {
    const before = structuredClone(game), preview = previewActivity(game, plan);
    assert.equal(preview.allowed, true); assert.equal(preview.stopReason.code, 'CYCLES_COMPLETE');
    assert.deepEqual(game, before);
    const out = complete(game, createActivity(game, plan, options()));
    assert.deepEqual(out.activity.stopReason, preview.stopReason);
    assert.equal(out.activity.completedCycles, 1); assert.equal(out.activity.nextCommand, null);
  }
});

test('saved v6 completion records retain the exact known historic message without accepting another reason or progress', () => {
  const traveler = ready('qi'), fighter = combat('qi');
  const plans = [
    { game: traveler, plan: { kind: 'travel', location: 'cave', maxCycles: 1 } },
    { game: traveler, plan: encounter(traveler, 'wolf', { maxCycles: 1 }) },
    { game: fighter, plan: singleBattlePlan(fighter, 'attack') },
  ];
  for (const { game, plan } of plans) {
    const out = complete(game, createActivity(game, plan, options())), historical = structuredClone(out.activity);
    // This was the exact persisted CYCLES_COMPLETE reason before CHECK-IDLE-02; retain its original bytes.
    historical.stopReason.message = '已完成本段授权动作数，不再自动出招';
    const original = structuredClone(historical); validateActivity(historical, out.game); assert.deepEqual(historical, original);
    for (const mutate of [a => { a.stopReason.message = '伪造完成'; }, a => { a.stopReason.code = 'VICTORY'; }, a => { a.completedCycles = 0; }]) {
      const forged = structuredClone(historical); mutate(forged); rejects(() => validateActivity(forged, out.game));
    }
  }
});

test('all six normal enemies and both schools use a full encounter then separate actual rounds and deterministic loot', () => {
  const entries = Object.entries(C.enemies).filter(([, e]) => !e.trial); assert.equal(entries.length, 6);
  for (const school of ['sword', 'talisman']) for (const [enemy, e] of entries) {
    const game = ready('spirit', school, e.location), before = structuredClone(game), a = createActivity(game, encounter(game, enemy), options());
    assert.equal(a.cycleMs, 30000); assert.equal(a.nextCommand.type, 'ENCOUNTER');
    const entry = complete(game, a); assert.equal(entry.activity.encountersStarted, 1); assert.equal(entry.activity.battleTurns, 0);
    assert.equal(entry.activity.cycleMs, 3000); assert.equal(entry.game.core.world.elapsedMonths, before.core.world.elapsedMonths + 12);
    assert.equal(entry.game.wins, before.wins); assert.deepEqual(entry.activity.gainedItems, {});
    const out = all(entry.game, entry.activity);
    assert.equal(out.activity.status, 'stopped'); assert.equal(out.activity.victories, 1, enemy + school);
    assert.equal(out.activity.stopReason.code, 'ENCOUNTERS_COMPLETE'); assert.equal(out.activity.defeats, 0);
    assert.equal(out.activity.spentMonths, 12); assert.equal(out.activity.gainedStones, e.stones);
    assert.equal(out.activity.gainedXp, e.xp); assert.deepEqual(out.activity.gainedItems, e.loot);
    assert.equal(out.game.wins, before.wins + 1); assert.equal(out.game.battle, null); assert.equal(out.game.core.player.realm, 'spirit');
    assert.equal(out.activity.completedCycles, 1 + out.activity.battleTurns); assert.deepEqual(game, before);
    validateActivity(out.activity, out.game);
  }
});

test('multi-encounter plans can exceed fifty actual commands without changing old batch rules or charging one entry for all fights', () => {
  const game = ready(), plan = encounter(game, 'wolf', { maxEncounters: 20, maxCycles: 820, monthBudget: 240 });
  const out = all(game, createActivity(game, plan, options()));
  assert.equal(out.activity.victories, 20); assert.equal(out.activity.encountersStarted, 20); assert.ok(out.activity.completedCycles > 50);
  assert.equal(out.activity.spentMonths, 240); assert.deepEqual(out.activity.gainedItems, { core: 20 });
  assert.equal(out.activity.gainedStones, 200); assert.equal(out.activity.stopReason.code, 'ENCOUNTERS_COMPLETE');
  const preview = previewActivity(game, plan); assert.equal(preview.allowed, true); assert.equal(preview.adventure.victories, 20);
  assert.equal(preview.months, 240); assert.equal(preview.cycles, out.activity.completedCycles); assert.deepEqual(preview.items, { core: 20 });
});

test('actual loot inventory targets remain productive at capped XP and stop without another encounter', () => {
  const game = ready(); game.core.player.xp = C.realms.spirit.xpCap;
  const out = all(game, createActivity(game, encounter(game, 'wolf', { maxEncounters: 10, maxCycles: 410, monthBudget: 120, target: { item: 'core', quantity: 2 } }), options()));
  assert.equal(out.activity.victories, 2); assert.equal(out.activity.gainedXp, 0); assert.deepEqual(out.activity.gainedItems, { core: 2 });
  assert.equal(out.activity.stopReason.code, 'TARGET_MET'); assert.equal(out.activity.spentMonths, 24);
});

test('month, lifespan, encounter and total-action limits remain separate explicit boundaries', () => {
  const game = ready();
  rejects(() => createActivity(game, encounter(game, 'wolf', { monthBudget: 0 }), options()), 'ACTIVITY_BUDGET');
  const one = complete(game, createActivity(game, encounter(game, 'wolf', { maxCycles: 1 }), options()));
  assert.equal(one.activity.completedCycles, 1); assert.equal(one.activity.stopReason.code, 'CYCLES_COMPLETE'); assert.ok(one.game.battle);
  const limited = all(game, createActivity(game, encounter(game, 'wolf', { maxEncounters: 2, monthBudget: 12, maxCycles: 82 }), options()));
  assert.equal(limited.activity.victories, 1); assert.equal(limited.activity.stopReason.code, 'ACTIVITY_BUDGET');
  const aging = ready(); aging.core.world.elapsedMonths += remainingMonths(aging) - 13;
  const safe = all(aging, createActivity(aging, encounter(aging), options())); assert.equal(remainingMonths(safe.game), 1);
  const old = ready(); old.core.world.elapsedMonths += remainingMonths(old) - 1;
  rejects(() => createActivity(old, encounter(old), options()), 'AGE_LIMIT');
});

test('all seven explicit single moves execute one formal round for either school and then stop', () => {
  for (const school of ['sword', 'talisman']) for (const move of ['attack', 'guard', 'technique', 'release', 'heal', 'restore', 'flee']) {
    const game = combat('spirit', school, 'sentinel'); game.core.player.hp -= 50; game.core.player.mp -= 50;
    if (school === 'sword') game.battle.sword = 3; else game.battle.marks = [2];
    validateGame(game); const before = structuredClone(game), a = createActivity(game, singleBattlePlan(game, move), options());
    const out = complete(game, a); assert.equal(out.activity.battleTurns, 1); assert.equal(out.activity.moves[move], 1);
    assert.equal(out.activity.status, 'stopped'); assert.equal(out.activity.spentMp, out.result.costs.mp);
    assert.equal(out.activity.hpChange, out.game.core.player.hp - before.core.player.hp);
    assert.equal(out.activity.mpChange, out.game.core.player.mp - before.core.player.mp);
    if (move === 'heal') assert.deepEqual(out.activity.spentItems, { healing_pill: 1 });
    if (move === 'restore') assert.deepEqual(out.activity.spentItems, { spirit_pill: 1 });
    if (move === 'flee') { assert.equal(out.activity.retreats, 1); assert.equal(out.game.core.world.location, 'cave'); assert.equal(out.game.core.player.hp, before.core.player.hp - 8); }
    assert.deepEqual(game, before); validateActivity(out.activity, out.game);
  }
});

test('full sword intent interrupts a heavy attack while mark caps and unavailable MP select another authorized move', () => {
  const sword = combat(); sword.battle.round = 2; sword.battle.sword = 3;
  const a = createActivity(sword, auto(sword), options()); assert.equal(a.nextCommand.move, 'release');
  const interrupted = complete(sword, a); assert.equal(interrupted.result.delta.hp, 0);
  const empty = combat(); empty.core.player.mp = 0;
  const fallback = createActivity(empty, auto(empty, { mpBudget: 0 }), options()); assert.equal(fallback.nextCommand.move, 'attack');
  const talisman = combat('spirit', 'talisman', 'sentinel'); talisman.battle.marks = [3, 3, 3];
  const marked = createActivity(talisman, auto(talisman, { strategy: strategy(talisman, { priority: ['technique', 'release', 'attack', 'guard'], releaseAt: 3 }) }), options());
  assert.equal(marked.nextCommand.move, 'release');
});

test('gross MP charges survive positive net recovery from return talismans and mirror regeneration', () => {
  const game = combat('spirit', 'talisman', 'sentinel'); game.learned.push('talisman_return'); game.loadout.finisher = 'talisman_return';
  game.core.player.mp = 100; game.battle.marks = [2]; validateGame(game);
  const out = complete(game, createActivity(game, auto(game, { maxCycles: 1, mpBudget: 10 }), options()));
  assert.equal(out.result.delta.mp, 8); assert.equal(out.activity.spentMp, 10); assert.equal(out.activity.mpChange, 8);
  const mirror = combat('spirit', 'sword', 'sentinel'); mirror.ownedRelics = ['cloud_mirror']; mirror.loadout.relic = 'cloud_mirror'; mirror.core.player.mp = 10;
  const restored = complete(mirror, createActivity(mirror, singleBattlePlan(mirror, 'attack'), options()));
  assert.equal(restored.result.delta.mp, 12); assert.equal(restored.activity.spentMp, 0);
});

test('four relic effects retain their real round outcomes without changing equipment during a plan', () => {
  for (const relic of Object.keys(C.relics)) {
    const game = combat('spirit', relic === 'soul_lamp' ? 'talisman' : 'sword', 'sentinel');
    game.ownedRelics = [relic]; game.loadout.relic = relic; game.core.player.hp -= 100;
    if (game.school === 'sword') game.battle.sword = 3; else game.battle.marks = [2]; validateGame(game);
    const move = relic === 'frost_sword' ? 'release' : relic === 'jade_seal' ? 'attack' : 'guard';
    const out = complete(game, createActivity(game, singleBattlePlan(game, move), options()));
    assert.equal(out.game.loadout.relic, relic); assert.deepEqual(out.game.ownedRelics, [relic]);
    if (relic === 'frost_sword') assert.equal(out.game.battle.sword, 1);
    if (relic === 'jade_seal') assert.equal(out.result.delta.hp, -62);
    if (relic === 'soul_lamp') assert.equal(out.game.battle.hp, game.battle.hp - 30);
    if (relic === 'cloud_mirror') assert.equal(out.result.delta.hp, 4);
  }
});

test('an enabled healing threshold stops on exhausted cumulative budget, missing stock or reserve rather than attacking silently', () => {
  const game = combat(); game.core.player.hp = 40;
  const plan = auto(game, { strategy: strategy(game, { healBelowPercent: 100, healingBudget: 1 }) });
  const first = complete(game, createActivity(game, plan, options()));
  assert.equal(first.activity.moves.heal, 1); assert.equal(first.result.delta.hp, 22);
  assert.equal(first.activity.stopReason.code, 'ACTIVITY_BUDGET'); assert.equal(first.activity.battleTurns, 1);
  const noStock = structuredClone(game); noStock.core.inventory.healing_pill = 0;
  rejects(() => createActivity(noStock, auto(noStock, { strategy: strategy(noStock, { healBelowPercent: 50, healingBudget: 2 }) }), options()), 'INSUFFICIENT_ITEM');
  const reserve = structuredClone(game); reserve.core.inventory.healing_pill = 1;
  rejects(() => createActivity(reserve, auto(reserve, { strategy: strategy(reserve, { healBelowPercent: 50, healingBudget: 2, healingReserve: 1 }) }), options()), 'ACTIVITY_RESERVE');
  const disabled = createActivity(noStock, auto(noStock, { strategy: strategy(noStock) }), options()); assert.equal(disabled.nextCommand.move, 'technique');
});

test('an enabled MP threshold obeys its independent pill budget and full attributes never waste a dose at threshold100', () => {
  const game = combat(); game.core.player.mp = 1;
  const first = complete(game, createActivity(game, auto(game, { strategy: strategy(game, { restoreBelowPercent: 100, spiritBudget: 1 }) }), options()));
  assert.equal(first.activity.moves.restore, 1); assert.equal(first.activity.stopReason.code, 'ACTIVITY_BUDGET');
  assert.equal(first.activity.spentMp, 0); assert.equal(first.activity.mpChange, 25);
  const empty = structuredClone(game); empty.core.inventory.spirit_pill = 0;
  rejects(() => createActivity(empty, auto(empty, { strategy: strategy(empty, { restoreBelowPercent: 100, spiritBudget: 2 }) }), options()), 'INSUFFICIENT_ITEM');
  const kept = structuredClone(game); kept.core.inventory.spirit_pill = 1;
  rejects(() => createActivity(kept, auto(kept, { strategy: strategy(kept, { restoreBelowPercent: 100, spiritBudget: 2, spiritReserve: 1 }) }), options()), 'ACTIVITY_RESERVE');
  const full = combat(); const started = createActivity(full, auto(full, { strategy: strategy(full, { healBelowPercent: 100, restoreBelowPercent: 100 }) }), options());
  assert.equal(started.nextCommand.move, 'technique');
});

test('automatic danger pauses with persistent reason; an explicit flee strategy performs the real extra round and no loot', () => {
  for (const riskMode of ['pause', 'flee']) {
    const game = combat(); game.core.player.hp = 30;
    const a = createActivity(game, auto(game, { strategy: strategy(game, { priority: ['attack', 'guard', 'release', 'technique'], riskMode }) }), options());
    const first = complete(game, a); assert.equal(first.game.core.player.hp, 17); assert.equal(first.activity.battleTurns, 1);
    if (riskMode === 'pause') {
      assert.equal(first.activity.status, 'paused'); assert.equal(first.activity.stopReason.code, 'ADVENTURE_DANGER'); assert.equal(first.activity.nextCommand, null);
      rejects(() => resumeActivity(first.game, first.activity, { ownerId: 'two', commandId: 'resume', now: 100000 }), 'ADVENTURE_DANGER');
    } else {
      assert.equal(first.activity.nextCommand.move, 'flee'); const fled = complete(first.game, first.activity);
      assert.equal(fled.activity.retreats, 1); assert.equal(fled.game.core.player.hp, 9); assert.equal(fled.activity.victories, 0);
      assert.deepEqual(fled.activity.gainedItems, {}); assert.equal(fled.game.core.world.location, 'cave');
    }
  }
});

test('fortieth-turn known defeat pauses automatic play but a selected single risk stays lawful and last-turn victory has priority', () => {
  const game = combat('qi', 'sword', 'warden'); game.battle.round = 38;
  const first = complete(game, createActivity(game, auto(game, { strategy: strategy(game, { priority: ['guard', 'attack', 'technique', 'release'] }) }), options()));
  assert.equal(first.game.battle.round, 39); assert.equal(first.activity.status, 'paused'); assert.equal(first.activity.stopReason.code, 'ADVENTURE_RISK');
  const risky = complete(first.game, createActivity(first.game, singleBattlePlan(first.game, 'guard'), options({ id: 'manual-risk' })));
  assert.equal(risky.activity.defeats, 1); assert.equal(risky.game.battle, null); assert.equal(risky.game.core.world.location, 'cave');
  const last = combat('qi', 'sword', 'warden'); last.battle.round = 39; last.battle.hp = 1;
  const won = complete(last, createActivity(last, singleBattlePlan(last, 'attack'), options()));
  assert.equal(won.activity.victories, 1); assert.equal(won.activity.defeats, 0); assert.equal(won.result.delta.hp, 0);
});

test('capacity errors stop the chosen fatal strike without fallback guard or a partially lost reward', () => {
  const game = combat(); game.battle.hp = 1; game.core.inventory.core = C.maxQuantity;
  const before = structuredClone(game);
  rejects(() => createActivity(game, auto(game), options()), 'CAPACITY'); assert.deepEqual(game, before);
  const rich = combat(); rich.battle.hp = 1; rich.core.player.stones = C.maxQuantity;
  rejects(() => createActivity(rich, auto(rich), options()), 'SAVE_RANGE');
});

test('a pure guard round can have zero player/resource delta while moving the real enemy intent forward', () => {
  const game = combat(); game.battle.round = 1;
  const out = complete(game, createActivity(game, singleBattlePlan(game, 'guard'), options()));
  assert.equal(out.result.delta.hp, 0); assert.equal(out.result.delta.mp, 0); assert.deepEqual(out.result.delta.inventory, {});
  assert.equal(out.game.battle.round, 2); assert.equal(out.activity.battleTurns, 1);
});

test('trial victories generate the formal next gate without normal loot and stop at each selected stage or final decision', () => {
  let game = ready('spirit', 'sword', 'terrace'); game.core.player.xp = C.realms.spirit.xpCap; game.core.inventory.ascension_seal = 1;
  game = resolve(game, action(game, { type: 'START_TRIAL' })).nextState;
  const waiting = structuredClone(game);
  rejects(() => createActivity(waiting, { kind: 'travel', location: 'cave', maxCycles: 1 }, options()), 'WAITING_DECISION');
  game = resolve(game, action(game, { type: 'ANSWER_TRIAL', answer: 'accept' })).nextState;
  for (let stage = 1; stage <= 3; stage++) {
    game.battle.hp = 1; validateGame(game);
    const before = structuredClone(game), out = complete(game, createActivity(game, singleBattlePlan(game, 'attack'), options({ id: 'trial-' + stage })));
    assert.equal(out.activity.victories, 1); assert.equal(out.activity.gainedXp, 0); assert.equal(out.activity.gainedStones, 0); assert.deepEqual(out.activity.gainedItems, {});
    assert.equal(out.game.trial.stage, stage + 1); assert.equal(out.game.wins, before.wins + 1);
    assert.equal(out.activity.stopReason.code, stage === 3 ? 'WAITING_DECISION' : 'STAGE_COMPLETE'); game = out.game;
  }
  assert.equal(game.status, 'active'); assert.equal(game.core.player.realm, 'spirit'); assert.equal(game.battle, null);
});

test('retreating or losing a trial preserves the real outcome instead of pretending that the gate was completed', () => {
  let game = ready('spirit', 'sword', 'terrace'); game.core.player.xp = C.realms.spirit.xpCap; game.core.inventory.ascension_seal = 1;
  game = resolve(game, action(game, { type: 'START_TRIAL' })).nextState;
  game = resolve(game, action(game, { type: 'ANSWER_TRIAL', answer: 'accept' })).nextState;
  const fled = complete(game, createActivity(game, singleBattlePlan(game, 'flee'), options()));
  assert.equal(fled.activity.retreats, 1); assert.equal(fled.activity.stopReason.code, 'RETREATED');
  assert.equal(fled.game.trial, null); assert.equal(fled.game.battle, null); assert.equal(fled.game.core.world.location, 'cave');
  const last = structuredClone(game); last.battle.round = 39;
  const lost = complete(last, createActivity(last, singleBattlePlan(last, 'guard'), options()));
  assert.equal(lost.activity.defeats, 1); assert.equal(lost.activity.stopReason.code, 'DEFEATED'); assert.equal(lost.game.trial, null);
});

test('seven-move plans, thresholds and two snapshots have exact schemas and do not permit implicit U7 choices', () => {
  const game = combat(), plan = auto(game); validateActivityPlan(plan);
  for (const change of [{ extra: true }, { maxCycles: 41 }, { mode: 'unknown' }, { trialStage: 1 }, { enemy: new String('wolf') },
    { mpBudget: -1 }, { strategy: { ...plan.strategy, priority: ['attack', 'attack', 'guard', 'release'] } },
    { strategy: { ...plan.strategy, priority: ['attack', 'guard', 'technique', 'flee'] } },
    { strategy: { ...plan.strategy, respondHeavy: 1 } }, { strategy: { ...plan.strategy, healingBudget: 51 } },
    { strategy: { ...plan.strategy, healingReserve: 1000000 } }, { strategy: { ...plan.strategy, riskMode: 'auto-buy' } }]) rejects(() => validateActivityPlan({ ...plan, ...change }));
  rejects(() => validateActivityPlan({ ...singleBattlePlan(game, 'attack'), move: new String('attack') }));
  const routePlan = encounter(ready());
  for (const change of [{ enemy: 'trial_heart' }, { maxCycles: 2051 }, { target: { item: 'jade', quantity: 1 } }, { remainingMonthsReserve: 0 }]) rejects(() => validateActivityPlan({ ...routePlan, ...change }));
  const a = createActivity(game, plan, options());
  for (const mutate of [a => { a.spentMp++; }, a => { a.moves.attack++; }, a => { a.encountersStarted++; }, a => { a.hpChange++; },
    a => { a.decisionGame.battle.hp--; }, a => { a.originGame.core.player.stones++; }, a => { a.nextCommand.move = 'flee'; },
    a => { a.gainedItems.core = 1; }, a => { a.cycleMs = 700; }, a => { a.version = 5; }]) {
    const bad = structuredClone(a); mutate(bad); rejects(() => validateActivity(bad));
  }
});

test('formal full-Game proof rejects forged enemy states, hp signs, costs, drops and unrelated decisions', () => {
  const game = combat(), a = createActivity(game, auto(game), options()), out = resolve(game, a.nextCommand);
  const done = (g, r) => completeActivity(g, a, r, { commandId: a.nextCommand.commandId, now: a.dueAt });
  for (const mutate of [g => { g.battle.hp--; }, g => { g.battle.round++; }, g => { g.battle.sword = 0; },
    g => { g.core.player.hp++; }, g => { g.core.inventory.core++; }]) { const bad = structuredClone(out.nextState); mutate(bad); rejects(() => done(bad, out.result)); }
  for (const mutate of [r => { r.costs.mp = 0; }, r => { r.delta.hp = 1; }, r => { r.delta.inventory.core = 1; }, r => { r.delta.wins = 1; }]) {
    const bad = structuredClone(out.result); mutate(bad); rejects(() => done(out.nextState, bad));
  }
});

test('early, late, paused, resumed and historical commands preserve exact intent and never catch up or bind future Game to an old decision', () => {
  const game = combat(), a = createActivity(game, auto(game), options()), out = resolve(game, a.nextCommand);
  rejects(() => completeActivity(out.nextState, a, out.result, { commandId: a.nextCommand.commandId, now: a.dueAt - 1 }), 'ACTIVITY_NOT_DUE');
  const late = complete(game, a, 86400000); assert.equal(late.activity.completedCycles, 1); assert.equal(late.activity.dueAt, 86403000);
  const resumed = resumeActivity(game, pauseActivity(a), { ownerId: 'two', commandId: 'resume', now: 100000 });
  assert.equal(resumed.dueAt, 103000); assert.notEqual(resumed.nextCommand.commandId, a.nextCommand.commandId);
  rejects(() => completeActivity(out.nextState, resumed, out.result, { commandId: a.nextCommand.commandId, now: resumed.dueAt }), 'ACTIVITY_STALE');
  const travelled = complete(ready(), createActivity(ready(), { kind: 'travel', location: 'cave', maxCycles: 1 }, options()));
  const changed = resolve(travelled.game, action(travelled.game, { type: 'TRAVEL', location: 'sect' })).nextState;
  const invalidated = { ...travelled.activity, revision: travelled.activity.revision + 1, generation: travelled.activity.generation + 1,
    gameRevision: changed.core.revision, stopReason: { code: 'STATE_CHANGED', message: '玩家明确推进其他行动，旧决定快照保留' } };
  validateActivity(invalidated, changed); assert.equal(invalidated.decisionGame.core.world.location, 'cave');
  const other = structuredClone(game); other.core.runId = 'another-life'; assert.equal(activityStop(other, a).code, 'RUN_MISMATCH');
});
