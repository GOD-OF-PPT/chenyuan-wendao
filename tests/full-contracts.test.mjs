import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, resolve, newGame, parseGame, validateGame, biography } from '../src/full/engine.ts';
import { gamePhase } from '../src/full/contracts.ts';
import { currentVersions } from '../src/full/versions.ts';
import * as C from '../src/full/content.ts';
import { driver, fullRoute } from './full-route.mjs';

const command = (game, action) => ({ ...action, commandId: 'contract-test', runId: game.core.runId, expectedRevision: game.core.revision });

test('resolution exposes identity, actual costs, state delta and phase without mutating input', () => {
  const game = newGame('问道', 'contract-run'), before = JSON.stringify(game);
  const cmd = command(game, { type: 'CHOOSE', choice: 'help' }), outcome = resolve(game, cmd);
  assert.equal(JSON.stringify(game), before);
  assert.deepEqual(advance(game, cmd), outcome.nextState);
  assert.deepEqual(outcome.result.versions, currentVersions);
  assert.equal(outcome.result.commandId, cmd.commandId);
  assert.equal(outcome.result.runId, cmd.runId);
  assert.equal(outcome.result.revisionBefore, 0);
  assert.equal(outcome.result.revisionAfter, 1);
  assert.equal(outcome.result.phaseBefore, 'opening');
  assert.equal(outcome.result.phaseAfter, 'idle');
  assert.equal(outcome.result.costs.items.healing_pill, 1);
  assert.equal(outcome.result.delta.inventory.healing_pill, -1);
  assert.equal(outcome.checkpointKind, null);
});

test('partial batches report executed costs and the real stop code', () => {
  const d = driver(); d.go('cave');
  const result = resolve(d.game, command(d.game, { type: 'CULTIVATE', method: 'assisted', count: 50 }));
  assert.equal(result.result.requestedSteps, 50);
  assert.equal(result.result.executedSteps, 2);
  assert.equal(result.result.stopReason.code, 'INSUFFICIENT_STONES');
  assert.equal(result.result.costs.stones, 40);
  assert.equal(result.result.costs.months, 2);
  assert.equal(result.result.delta.stones, -40);
  assert.equal(result.result.delta.xp, 200);
  assert.equal(result.result.revisionAfter - result.result.revisionBefore, 1);
});

test('target stopping reports only four source actions and never the requested fifty costs', () => {
  const d = driver(); d.go('wilderness');
  const out = resolve(d.game, command(d.game, { type: 'SOURCE', sourceId: 'herbs', count: 50, target: { item: 'herb', quantity: 8 } }));
  assert.equal(out.result.executedSteps, 4);
  assert.equal(out.result.stopReason.code, 'TARGET_MET');
  assert.equal(out.result.costs.months, 4);
  assert.equal(out.result.delta.inventory.herb, 8);
});

test('failed commands never return a resolution or modify their source', () => {
  const d = driver(), before = JSON.stringify(d.game);
  for (const cmd of [
    { ...command(d.game, { type: 'REST' }), runId: 'different' },
    { ...command(d.game, { type: 'REST' }), expectedRevision: 0 },
    command(d.game, { type: 'CRAFT', recipeId: 'foundation' }),
  ]) assert.throws(() => resolve(d.game, cmd));
  assert.equal(JSON.stringify(d.game), before);
});

test('successful breakthroughs and trial starts declare distinct checkpoint purposes', () => {
  const d = fullRoute();
  const ordinary = d.checkpoints.qi, trial = d.checkpoints.trial;
  const first = resolve(ordinary, command(ordinary, { type: 'BREAKTHROUGH' }));
  assert.equal(first.checkpointKind, 'breakthrough');
  assert.equal(first.result.delta.inventory.foundation_pill, -1);
  const second = resolve(trial, command(trial, { type: 'START_TRIAL' }));
  assert.equal(second.checkpointKind, 'trial');
  assert.equal(second.result.phaseAfter, 'trial-question');
  assert.equal(second.result.delta.inventory.ascension_seal, -1);
  assert.equal(trial.core.inventory.ascension_seal, 1);
});

test('gross spell cost remains ten mana even when the same release restores mana', () => {
  const d = driver('leave', 'talisman'); d.realm(); d.realm();
  d.funds(160); d.go('sect'); d.doAction({ type: 'LEARN', skill: 'talisman_return' });
  d.doAction({ type: 'EQUIP', skill: 'talisman_return' });
  d.go('secret'); d.doAction({ type: 'ENCOUNTER', enemy: 'serpent' });
  d.doAction({ type: 'BATTLE', move: 'technique' });
  const out = resolve(d.game, command(d.game, { type: 'BATTLE', move: 'release' }));
  assert.equal(out.result.costs.mp, 10);
  assert.equal(out.result.delta.mp, 8);
});

test('retirement and an acknowledged lifespan endpoint have different valid reasons', () => {
  const d = driver();
  const retired = advance(d.game, command(d.game, { type: 'RETIRE' }));
  assert.equal(retired.ending, 'retired');
  assert.equal(retired.core.world.elapsedMonths, d.game.core.world.elapsedMonths);
  assert.ok(biography(retired).some(line => line.includes('主动归隐')));
  assert.throws(() => advance(d.game, command(d.game, { type: 'END_LIFE' })), e => e.code === 'LIFESPAN_REMAINING');
  const boundary = structuredClone(d.game);
  boundary.core.world.elapsedMonths = C.realms.qi.lifespanMonths - boundary.core.player.startAgeMonths - 1;
  const ended = resolve(boundary, command(boundary, { type: 'END_LIFE' }));
  assert.equal(ended.nextState.ending, 'lifespan');
  assert.equal(ended.result.delta.months, 1);
  assert.equal(ended.result.costs.months, 1);
  assert.equal(gamePhase(ended.nextState), 'ended');
  assert.deepEqual(parseGame(JSON.stringify(ended.nextState)), ended.nextState);
  assert.ok(biography(ended.nextState).some(line => line.includes('寿元已尽')));
  assert.throws(() => advance(ended.nextState, command(ended.nextState, { type: 'REST' })), e => e.code === 'ENDED');
});

test('current saves cannot falsely label a young retiree as lifespan-ended', () => {
  const d = driver(), invalid = advance(d.game, command(d.game, { type: 'RETIRE' }));
  invalid.ending = 'lifespan';
  assert.throws(() => validateGame(invalid), e => e.code === 'SAVE_AGE');
});

test('explicit full v1 conversion corrects its known RETIRE label and preserves all resources', () => {
  const d = driver('trade'), old = advance(d.game, command(d.game, { type: 'RETIRE' }));
  old.core.contentVersion = 'full-demo.1'; old.ending = 'lifespan';
  const raw = JSON.stringify(old), converted = parseGame(raw);
  assert.equal(converted.core.contentVersion, C.VERSION);
  assert.equal(converted.ending, 'retired');
  assert.deepEqual(converted.core.player, old.core.player);
  assert.deepEqual(converted.core.inventory, old.core.inventory);
  assert.deepEqual(converted.core.world, old.core.world);
  assert.equal(JSON.stringify(old), raw);
  assert.deepEqual(parseGame(JSON.stringify(converted)), converted);
});

test('full v1 active events and battles convert without reselecting their context', () => {
  const opening = newGame('旧档', 'old-full-opening');
  const d = driver('leave', 'talisman'); d.go('wilderness');
  d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' }); d.doAction({ type: 'BATTLE', move: 'technique' });
  for (const sample of [opening, d.game]) {
    const old = structuredClone(sample); old.core.contentVersion = 'full-demo.1';
    const converted = parseGame(JSON.stringify(old));
    assert.deepEqual(converted.battle, old.battle);
    assert.deepEqual(converted.core.activeEvent, old.core.activeEvent);
    assert.deepEqual(converted.core.player, old.core.player);
  }
});

test('unknown save/content/balance versions reject instead of silently resetting', () => {
  for (const change of [
    g => { g.version = 9; }, g => { g.core.schemaVersion = 9; },
    g => { g.core.contentVersion = 'full-demo.9'; },
    g => { g.core.balanceVersion = 'unknown'; },
    g => { g.core.contentVersion = 'full-demo.1'; g.core.balanceVersion = 'unknown'; },
  ]) {
    const value = newGame('版本', 'version-test'); change(value);
    assert.throws(() => parseGame(JSON.stringify(value)), e => e.code === 'SAVE_VERSION');
  }
});

test('save size limit counts UTF-8 bytes as well as character count', () => {
  const raw = JSON.stringify({ padding: '中'.repeat(340000) });
  assert.ok(raw.length < 1000000);
  assert.throws(() => parseGame(raw), e => e.code === 'SAVE_SIZE');
});

test('trial question, battles and ending are complete mutually consistent phases', () => {
  const route = fullRoute(), prep = route.checkpoints.trial;
  const question = advance(prep, command(prep, { type: 'START_TRIAL' }));
  const missingQuestion = structuredClone(question);
  missingQuestion.core.mode = 'idle'; missingQuestion.core.activeEvent = null;
  assert.throws(() => validateGame(missingQuestion), e => e.code === 'SAVE_TRIAL');
  const ending = route.checkpoints.ending;
  assert.equal(gamePhase(ending), 'trial-ending');
  const missingCompletion = structuredClone(ending);
  delete missingCompletion.milestones.trial_completed;
  assert.throws(() => validateGame(missingCompletion), e => e.code === 'SAVE_TRIAL');
  const prematureCompletion = structuredClone(prep);
  prematureCompletion.milestones.trial_completed = prep.core.world.elapsedMonths;
  assert.throws(() => validateGame(prematureCompletion), e => e.code === 'SAVE_TRIAL');
});

test('revision identity uses safe integers rather than the unrelated inventory capacity', () => {
  const d = driver(), game = structuredClone(d.game);
  game.core.revision = C.maxQuantity + 10;
  const out = resolve(game, command(game, { type: 'CULTIVATE', method: 'natural' }));
  assert.equal(out.result.revisionAfter, game.core.revision + 1);
  const unsafe = structuredClone(game); unsafe.core.revision = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => validateGame(unsafe), e => e.code === 'SAVE_ID');
});
