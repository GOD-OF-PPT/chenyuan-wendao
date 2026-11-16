import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { newGame, resolve, validateGame } from '../src/full/engine.ts';
import { gamePhase } from '../src/full/contracts.ts';
import { remainingMonths } from '../src/full/costs.ts';
import { createActivity, completeActivity, validateActivity, validateActivityPlan, activityStop, pauseActivity, resumeActivity,
  previewActivity, isMilestoneAction, isMilestonePlan, validateMilestonePlan, MILESTONE_CYCLE_MS } from '../src/full/activity.ts';
import { fullRoute } from './full-route.mjs';

const route = fullRoute();
const options = (change = {}) => ({ id: 'milestone', ownerId: 'one', commandId: 'start', now: 1000, ...change });
const plan = action => ({ kind: 'milestone', action, maxCycles: 1 });
const rejects = (fn, code = 'ACTIVITY_INVALID') => assert.throws(fn, error => error.code === code);
function action(game, a) { return { ...a, commandId: 'external-' + game.core.revision, runId: game.core.runId, expectedRevision: game.core.revision }; }
function apply(game, a) { return resolve(game, action(game, a)).nextState; }
function checkpoint(name = 'trial') { return structuredClone(route.checkpoints[name]); }
function complete(game, activity, now = activity.dueAt) {
  const formal = resolve(game, activity.nextCommand);
  return { game: formal.nextState, result: formal.result, checkpointKind: formal.checkpointKind,
    activity: completeActivity(formal.nextState, activity, formal.result, { commandId: activity.nextCommand.commandId, now }) };
}
function checkOnce(game, selected, afterPhase) {
  const before = structuredClone(game), arranged = createActivity(game, plan(selected), options());
  assert.equal(arranged.version, 7); assert.equal(arranged.cycleMs, MILESTONE_CYCLE_MS[selected.type]);
  assert.deepEqual(game, before); assert.deepEqual(arranged.originGame, before); assert.equal(arranged.outcomeGame, null);
  const formal = resolve(game, arranged.nextCommand);
  rejects(() => completeActivity(formal.nextState, arranged, formal.result,
    { commandId: arranged.nextCommand.commandId, now: arranged.dueAt - 1 }), 'ACTIVITY_NOT_DUE');
  assert.equal(arranged.completedCycles, 0); assert.deepEqual(game, before);
  const out = complete(game, arranged);
  assert.equal(out.activity.status, 'stopped'); assert.equal(out.activity.completedCycles, 1);
  assert.equal(out.activity.nextCommand, null); assert.equal(out.activity.startedAt, null); assert.equal(out.activity.dueAt, null);
  assert.equal(out.activity.realm, before.core.player.realm); assert.deepEqual(out.activity.originGame, before);
  assert.deepEqual(out.activity.outcomeGame, out.game); assert.equal(gamePhase(out.game), afterPhase);
  assert.equal(out.activity.spentStones, out.result.costs.stones); assert.equal(out.activity.spentMonths, out.result.costs.months);
  assert.equal(out.activity.xpChange, out.result.delta.xp); assert.equal(out.activity.gainedXp, Math.max(0, out.result.delta.xp));
  assert.equal(out.activity.hpChange, out.result.delta.hp); assert.equal(out.activity.mpChange, out.result.delta.mp);
  assert.deepEqual(out.activity.spentItems, out.result.costs.items);
  assert.equal(out.activity.gainedStones, out.result.delta.stones + out.result.costs.stones);
  for (const id of Object.keys(C.items)) assert.equal(out.game.core.inventory[id], before.core.inventory[id] +
    (out.activity.gainedItems[id] ?? 0) - (out.activity.spentItems[id] ?? 0));
  validateActivity(out.activity, out.game); assert.deepEqual(game, before);
  rejects(() => resumeActivity(out.game, out.activity, { ownerId: 'one', commandId: 'again', now: 100000 }), 'ACTIVITY_STOPPED');
  rejects(() => completeActivity(out.game, out.activity, out.result,
    { commandId: arranged.nextCommand.commandId, now: arranged.dueAt }), 'ACTIVITY_NOT_RUNNING');
  const preview = previewActivity(game, plan(selected));
  assert.equal(preview.allowed, true); assert.equal(preview.cycles, 1); assert.equal(preview.cycleMs, arranged.cycleMs);
  assert.deepEqual(preview.spentItems, out.activity.spentItems); assert.deepEqual(preview.items, out.activity.gainedItems);
  assert.deepEqual(preview.stopReason, out.activity.stopReason);
  return out;
}

test('v7 permits exactly nine selected one-shot actions with strict shape, reference and finite-cycle validation', () => {
  assert.deepEqual(MILESTONE_CYCLE_MS, { CHOOSE: 6000, EVENT: 6000, DECIDE: 6000, BREAKTHROUGH: 30000,
    START_TRIAL: 15000, ANSWER_TRIAL: 6000, END: 12000, RETIRE: 12000, END_LIFE: 12000 });
  const selected = [{ type: 'CHOOSE', choice: 'help' }, { type: 'EVENT', event: 'shen_return' }, { type: 'DECIDE', option: 'decline' },
    { type: 'BREAKTHROUGH' }, { type: 'START_TRIAL' }, { type: 'ANSWER_TRIAL', answer: 'release' },
    { type: 'END', ending: 'depart' }, { type: 'RETIRE' }, { type: 'END_LIFE' }];
  for (const a of selected) {
    assert.equal(isMilestoneAction(a), true); assert.equal(isMilestonePlan(plan(a)), true);
    validateMilestonePlan(plan(a)); validateActivityPlan(plan(a));
    for (const extra of [{ commandId: 'injected' }, { runId: 'injected' }, { expectedRevision: 0 }, { count: 2 }, { next: a }]) {
      assert.equal(isMilestoneAction({ ...a, ...extra }), false); rejects(() => validateMilestonePlan(plan({ ...a, ...extra })));
    }
  }
  for (const a of [null, {}, { type: 'CHOOSE' }, { type: 'CHOOSE', choice: 'unknown' }, { type: 'EVENT', event: 'unknown' },
    { type: 'DECIDE', option: '' }, { type: 'ANSWER_TRIAL', answer: null }, { type: 'END', ending: 'retired' },
    { type: 'CULTIVATE', method: 'natural' }, { type: 'TRAVEL', location: 'cave' }, { type: 'BATTLE', move: 'attack' }]) {
    assert.equal(isMilestoneAction(a), false); rejects(() => validateActivityPlan(plan(a)));
  }
  for (const changed of [{ ...plan(selected[0]), maxCycles: 2 }, { ...plan(selected[0]), maxCycles: 0 },
    { ...plan(selected[0]), next: selected[1] }, { kind: 'milestone', maxCycles: 1 }]) rejects(() => validateActivityPlan(changed));
});

test('all opening choices execute only the selected exchange and never grant a realm', () => {
  for (const choice of ['help', 'trade', 'leave']) {
    const out = checkOnce(newGame('有限开场', 'opening-' + choice), { type: 'CHOOSE', choice }, 'idle');
    assert.equal(out.game.core.openingChoice, choice); assert.equal(out.game.core.player.realm, 'mortal');
    assert.deepEqual(out.activity.spentItems, choice === 'leave' ? {} : { healing_pill: 1 });
    assert.deepEqual(out.game.core.learnedSkills, choice === 'trade' ? [C.swordManual.id] : []);
    assert.equal(out.activity.stopReason.code, 'ACTION_COMPLETE');
    rejects(() => createActivity(out.game, plan({ type: 'CHOOSE', choice }), options()), 'EVENT_RESOLVED');
  }
});

test('event visit stops at an unchosen current event and a separate legal response records true causal cost and gain once', () => {
  let game = checkpoint('foundation'); game = apply(game, { type: 'TRAVEL', location: 'wilderness' });
  game = apply(game, { type: 'SOURCE', sourceId: 'herbs' }); game = apply(game, { type: 'TRAVEL', location: 'sect' });
  const visit = checkOnce(game, { type: 'EVENT', event: 'shen_return' }, 'event');
  assert.equal(visit.activity.stopReason.code, 'WAITING_DECISION'); assert.deepEqual(visit.game.choices, game.choices);
  assert.deepEqual(visit.activity.gainedItems, {}); assert.deepEqual(visit.game.core.activeEvent,
    { id: 'shen_return', instanceId: game.core.runId + ':shen_return' });
  rejects(() => createActivity(visit.game, plan({ type: 'EVENT', event: 'shen_return' }), options()), 'PENDING_EVENT');
  rejects(() => createActivity(visit.game, plan({ type: 'DECIDE', option: 'accept' }), options()), 'OPTION_CONDITION');
  game = visit.game; assert.ok(game.core.inventory.herb >= 2);
  const response = checkOnce(game, { type: 'DECIDE', option: 'assist' }, 'idle');
  assert.deepEqual(response.activity.spentItems, { herb: 2 }); assert.deepEqual(response.activity.gainedItems, { healing_pill: 1 });
  assert.equal(response.game.choices.shen_return, 'assist'); assert.equal(response.game.core.activeEvent, null);
  rejects(() => createActivity(response.game, plan({ type: 'EVENT', event: 'shen_return' }), options()), 'EVENT_UNAVAILABLE');
  const wrongPlace = checkpoint('foundation'); wrongPlace.core.world.location = 'cave';
  rejects(() => createActivity(wrongPlace, plan({ type: 'EVENT', event: 'shen_return' }), options()), 'EVENT_UNAVAILABLE');
});

test('story income, actual XP cap and no-consumption full-XP refusal retain formal option rules', () => {
  const base = checkpoint('foundation'); base.core.world.location = 'sect';
  const income = checkOnce(apply(base, { type: 'EVENT', event: 'omen_2' }), { type: 'DECIDE', option: 'observe' }, 'idle');
  assert.equal(income.activity.gainedStones, 10); assert.equal(income.activity.spentStones, 0);
  const gain = checkpoint('trial'); gain.core.player.xp = C.realms.spirit.xpCap - 1;
  gain.core.world.location = 'market'; gain.core.inventory.soul = 1; validateGame(gain);
  const event = apply(gain, { type: 'EVENT', event: 'local_lantern' });
  const remembered = checkOnce(event, { type: 'DECIDE', option: 'remember' }, 'idle');
  assert.equal(remembered.activity.gainedXp, 1); assert.equal(remembered.activity.xpChange, 1);
  const capped = structuredClone(event); capped.core.player.xp = C.realms.spirit.xpCap;
  const before = structuredClone(capped);
  rejects(() => createActivity(capped, plan({ type: 'DECIDE', option: 'remember' }), options()), 'XP_CAP');
  assert.deepEqual(capped, before);
});

test('all five ordinary realm transitions preserve their real pill, checkpoint, XP reset and restored new stats, then stop', () => {
  for (const realm of ['mortal', 'qi', 'foundation', 'golden', 'nascent']) {
    const game = checkpoint(realm), next = C.realms[realm].next;
    game.core.player.hp = Math.max(1, game.core.player.hp - 10); game.core.player.mp = 0; validateGame(game);
    const out = checkOnce(game, { type: 'BREAKTHROUGH' }, 'idle');
    assert.equal(out.checkpointKind, 'breakthrough'); assert.equal(out.game.core.player.realm, next);
    assert.equal(out.game.core.player.xp, 0); assert.equal(out.activity.xpChange, -C.realms[realm].xpCap); assert.equal(out.activity.gainedXp, 0);
    assert.equal(out.game.core.player.hp, C.realms[next].maxHp); assert.equal(out.game.core.player.mp, C.realms[next].maxMp);
    assert.equal(out.game.milestones[next], game.core.world.elapsedMonths);
    assert.deepEqual(out.activity.spentItems, C.realms[realm].pill ? { [C.realms[realm].pill]: 1 } : {});
    assert.equal(out.activity.stopReason.code, 'ACTION_COMPLETE'); assert.equal(activityStop(out.game, out.activity).code, 'ACTION_COMPLETE');
  }
  const spirit = checkpoint(); spirit.core.world.location = 'cave';
  rejects(() => createActivity(spirit, plan({ type: 'BREAKTHROUGH' }), options()), 'TRIAL_REQUIRED');
  const missing = checkpoint('qi'); missing.core.inventory.foundation_pill = 0;
  rejects(() => createActivity(missing, plan({ type: 'BREAKTHROUGH' }), options()), 'INSUFFICIENT_ITEM');
  const unready = checkpoint('qi'); unready.core.player.xp--;
  rejects(() => createActivity(unready, plan({ type: 'BREAKTHROUGH' }), options()), 'XP_REQUIRED');
});

test('trial entry preserves all gates and checkpoint and waits for an explicit answer; both answers wait for current battle strategy', () => {
  const game = checkpoint(), entry = checkOnce(game, { type: 'START_TRIAL' }, 'trial-question');
  assert.equal(entry.checkpointKind, 'trial'); assert.deepEqual(entry.activity.spentItems, { ascension_seal: 1 });
  assert.deepEqual(entry.game.trial, { stage: 0, answer: null }); assert.equal(entry.game.battle, null);
  assert.equal(entry.activity.stopReason.code, 'WAITING_DECISION');
  const firstAttacks = {};
  for (const answer of ['accept', 'release']) {
    const out = checkOnce(entry.game, { type: 'ANSWER_TRIAL', answer }, 'trial-battle');
    assert.equal(out.game.trial.answer, answer); assert.equal(out.game.trial.stage, 1);
    assert.equal(out.game.battle.enemy, 'trial_heart'); assert.equal(out.game.battle.round, 0);
    assert.equal(out.game.battle.hp, C.enemies.trial_heart.hp); assert.equal(out.game.wins, game.wins);
    assert.equal(out.activity.stopReason.code, 'WAITING_DECISION'); assert.deepEqual(out.activity.spentItems, {});
    firstAttacks[answer] = resolve(out.game, action(out.game, { type: 'BATTLE', move: 'attack' }));
    rejects(() => createActivity(out.game, plan({ type: 'ANSWER_TRIAL', answer }), options()), 'NO_QUESTION');
  }
  assert.equal(firstAttacks.accept.nextState.battle.hp - firstAttacks.release.nextState.battle.hp, 8);
  assert.equal(firstAttacks.accept.result.delta.hp - firstAttacks.release.result.delta.hp, 10);
  for (const [change, code] of [[g => { g.core.inventory.ascension_seal = 0; }, 'INSUFFICIENT_ITEM'],
    [g => { g.core.player.hp = 479; }, 'HP_REQUIRED'], [g => { g.core.player.xp--; }, 'XP_REQUIRED'],
    [g => { g.core.world.location = 'cave'; }, 'LOCATION_REQUIRED']]) {
    const changed = checkpoint(); change(changed); rejects(() => createActivity(changed, plan({ type: 'START_TRIAL' }), options()), code);
  }
});

test('both explicit ascension endings, retirement and last-month lifespan ending stop without creating a new life', () => {
  for (const ending of ['transmit', 'depart']) {
    const game = checkpoint('ending'), out = checkOnce(game, { type: 'END', ending }, 'ascended');
    assert.equal(out.game.ending, ending); assert.equal(out.game.core.player.realm, 'ascended');
    assert.equal(out.game.core.runId, game.core.runId); assert.equal(out.game.trial, null);
    assert.equal(out.game.milestones.ascended, game.core.world.elapsedMonths);
  }
  const game = checkpoint('qi'), retired = checkOnce(game, { type: 'RETIRE' }, 'ended');
  assert.equal(retired.game.ending, 'retired'); assert.equal(retired.game.core.world.elapsedMonths, game.core.world.elapsedMonths);
  rejects(() => createActivity(game, plan({ type: 'END_LIFE' }), options()), 'LIFESPAN_REMAINING');
  const twoMonths = checkpoint('qi'); twoMonths.core.world.elapsedMonths += remainingMonths(twoMonths) - 13;
  rejects(() => createActivity(twoMonths, plan({ type: 'END_LIFE' }), options()), 'LIFESPAN_REMAINING');
  const aged = checkpoint('qi'); aged.core.world.elapsedMonths += remainingMonths(aged) - 1; validateGame(aged);
  const life = checkOnce(aged, { type: 'END_LIFE' }, 'ended');
  assert.equal(life.game.ending, 'lifespan'); assert.equal(life.activity.spentMonths, 1); assert.equal(remainingMonths(life.game), 0);
  assert.equal(life.game.core.runId, aged.core.runId);
  rejects(() => createActivity(checkpoint(), plan({ type: 'END', ending: 'transmit' }), options()), 'TRIAL_REQUIRED');
  const question = apply(checkpoint(), { type: 'START_TRIAL' });
  rejects(() => createActivity(question, plan({ type: 'RETIRE' }), options()), 'PENDING');
});

test('pause and owner takeover retain the original chosen action, cancel the old generation and wait a new full period', () => {
  const game = newGame('暂停原意图', 'pause'), a = createActivity(game, plan({ type: 'CHOOSE', choice: 'trade' }), options());
  const paused = pauseActivity(a), resumed = resumeActivity(game, paused, { ownerId: 'two', commandId: 'resume', now: 50000 });
  assert.equal(resumed.ownerId, 'two'); assert.equal(resumed.dueAt, 56000); assert.equal(resumed.generation, 2);
  assert.deepEqual(resumed.plan, a.plan); assert.deepEqual(resumed.originGame, game);
  const formal = resolve(game, resumed.nextCommand);
  rejects(() => completeActivity(formal.nextState, resumed, formal.result,
    { commandId: a.nextCommand.commandId, now: resumed.dueAt }), 'ACTIVITY_STALE');
  assert.equal(complete(game, resumed).game.core.openingChoice, 'trade');
  const external = apply(game, { type: 'CHOOSE', choice: 'leave' });
  assert.equal(activityStop(external, paused).code, 'STATE_CHANGED');
  rejects(() => resumeActivity(external, paused, { ownerId: 'two', commandId: 'again', now: 50000 }), 'STATE_CHANGED');
  assert.equal(activityStop(newGame('另生', 'other'), paused).code, 'RUN_MISMATCH');
});

test('strict complete-Game proof rejects snapshot, action, causal, result, realm, timing and cumulative metadata tampering', () => {
  const game = checkpoint('qi'), a = createActivity(game, plan({ type: 'BREAKTHROUGH' }), options()), formal = resolve(game, a.nextCommand);
  for (const change of [g => { g.journal.push('伪造经历'); }, g => { g.milestones.foundation--; },
    g => { g.core.player.hp--; }, g => { g.core.inventory.herb++; }]) {
    const bad = structuredClone(formal.nextState); change(bad);
    rejects(() => completeActivity(bad, a, formal.result, { commandId: a.nextCommand.commandId, now: a.dueAt }));
  }
  for (const change of [r => { r.costs.items.foundation_pill = 0; }, r => { r.delta.xp++; }, r => { r.delta.hp--; },
    r => { r.phaseAfter = 'ended'; }, r => { r.delta.realm.after = 'golden'; }]) {
    const result = structuredClone(formal.result); change(result);
    rejects(() => completeActivity(formal.nextState, a, result, { commandId: a.nextCommand.commandId, now: a.dueAt }));
  }
  for (const change of [v => { v.originGame.journal.push('伪造原始经历'); }, v => { v.plan.action = { type: 'RETIRE' }; },
    v => { v.nextCommand.commandId = 'other'; }, v => { v.cycleMs = 1; }, v => { v.dueAt--; },
    v => { v.gainedItems = new Date(); }, v => { v.spentItems = { foundation_pill: 1 }; }, v => { v.outcomeGame = formal.nextState; }]) {
    const changed = structuredClone(a); change(changed); rejects(() => validateActivity(changed, game));
  }
  const done = complete(game, a).activity;
  for (const change of [v => { v.outcomeGame.ending = 'retired'; }, v => { v.outcomeGame.journal.push('未发生的选择'); },
    v => { v.gainedXp = 1; }, v => { v.xpChange = 0; }, v => { v.gainedStones = 1; },
    v => { v.spentItems = {}; }, v => { v.stopReason = { code: 'WAITING_DECISION', message: '伪造' }; },
    v => { v.realm = 'foundation'; }, v => { v.status = 'running'; }]) {
    const changed = structuredClone(done); change(changed); rejects(() => validateActivity(changed));
  }
  const opening = newGame('因果证明', 'causal-proof'), first = createActivity(opening, plan({ type: 'CHOOSE', choice: 'help' }), options());
  const resolved = resolve(opening, first.nextCommand), causal = structuredClone(resolved.nextState); causal.core.openingChoice = 'leave'; validateGame(causal);
  rejects(() => completeActivity(causal, first, resolved.result, { commandId: first.nextCommand.commandId, now: first.dueAt }));
});

test('STATE_CHANGED archives keep origin and completed outcome intact without claiming an unchanged latest Game', () => {
  const game = checkpoint('qi'), a = createActivity(game, plan({ type: 'BREAKTHROUGH' }), options());
  for (const original of [pauseActivity(a), complete(game, a).activity]) {
    const source = original.outcomeGame ?? original.originGame;
    const nextGame = apply(source, { type: 'RETIRE' });
    const invalidated = { ...structuredClone(original), revision: original.revision + 1, generation: original.generation + 1,
      gameRevision: nextGame.core.revision, status: 'stopped', nextCommand: null, startedAt: null, dueAt: null,
      stopReason: { code: 'STATE_CHANGED', message: '进度已改变' } };
    validateActivity(invalidated, nextGame); assert.deepEqual(invalidated.originGame, original.originGame);
    assert.deepEqual(invalidated.outcomeGame, original.outcomeGame);
    const forged = structuredClone(invalidated);
    if (original.completedCycles) forged.originGame.core.inventory.herb++;
    else forged.spentItems = { herb: 1 };
    rejects(() => validateActivity(forged));
  }
});
