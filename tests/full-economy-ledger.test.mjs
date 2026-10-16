import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/full/engine.ts';
import { EngineLedger, reconcileLedger } from '../src/full/economy-ledger.ts';
import { runner, runScenario } from '../scripts/economy/scenarios.mjs';

const options = { choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural', advancedMind: false };
test('ledger records real source income once and closes every resource account', () => {
  const r = runner(options); r.go('wilderness'); r.act({ type: 'SOURCE', sourceId: 'herbs', count: 4 });
  const report = r.ledger.report(true), last = report.entries.at(-1);
  assert.equal(last.received.items.herb, 8); assert.equal(last.result.costs.months, 4);
  assert.equal(report.closing.inventory.herb, 8); assert.equal(report.totals.received.items.herb, 8);
  assert.equal(report.closing.stones, 40); assert.deepEqual(reconcileLedger(report.initial, report.entries, report.closing), report.totals);
});
test('recipe, purchase and breakthrough record acquired and consumed goods without double charges', () => {
  const r = runner(options); r.realm(); const report = r.ledger.report(true);
  assert.equal(report.totals.received.items.foundation_pill, 1); assert.equal(report.totals.costs.items.foundation_pill, 1);
  assert.equal(report.totals.costs.items.herb, 8); assert.equal(report.totals.received.items.herb, 8);
  assert.equal(report.closing.inventory.foundation_pill, 0);
  assert.equal(report.closing.stones, report.initial.stones + report.totals.received.stones - report.totals.costs.stones);
});
test('partial assisted batch charges only executed steps in the ledger', () => {
  const r = runner(options); r.go('cave');
  r.act({ type: 'CULTIVATE', method: 'assisted', count: 50 }); const row = r.ledger.entries.at(-1);
  assert.equal(row.result.executedSteps, 2); assert.equal(row.result.costs.stones, 40);
  assert.equal(row.result.stopReason.code, 'INSUFFICIENT_STONES'); assert.equal(row.received.stones, 0);
  assert.equal(r.ledger.report().closing.stones, 0);
});
test('failed actions have no successful row, reward or state mutation', () => {
  const r = runner(options), before = JSON.stringify(r.ledger.game), count = r.ledger.count;
  assert.throws(() => r.act({ type: 'CRAFT', recipeId: 'foundation' }), error => error.code === 'LOCATION_REQUIRED' || error.code === 'INSUFFICIENT_ITEM');
  assert.equal(JSON.stringify(r.ledger.game), before); assert.equal(r.ledger.count, count);
  assert.equal(r.ledger.failures.length, 1);
});
test('callers cannot fund or alter the private scenario through returned snapshots', () => {
  const ledger = new EngineLedger(newGame('审计', 'ledger-copy')), game = ledger.game;
  game.core.player.stones = 99999; game.core.player.realm = 'spirit';
  assert.equal(ledger.game.core.player.stones, 40); assert.equal(ledger.game.core.player.realm, 'mortal');
});
test('reconciliation rejects repeated commands, altered credits and a different run', () => {
  const r = runner(options), report = r.ledger.report(true), corrupted = structuredClone(report.entries);
  corrupted[1].command.commandId = corrupted[0].command.commandId;
  assert.throws(() => reconcileLedger(report.initial, corrupted, report.closing), error => error.code === 'LEDGER_DUPLICATE' || error.code === 'LEDGER_SEQUENCE');
  const credit = structuredClone(report.entries); credit[0].received.stones++;
  assert.throws(() => reconcileLedger(report.initial, credit, report.closing), error => error.code === 'LEDGER_FLOW');
  const run = structuredClone(report.entries); run[0].command.runId = 'unrelated';
  assert.throws(() => reconcileLedger(report.initial, run, report.closing), error => error.code === 'LEDGER_SEQUENCE');
  const sequence = structuredClone(report.entries); sequence[0].sequence = 9;
  assert.throws(() => reconcileLedger(report.initial, sequence, report.closing), error => error.code === 'LEDGER_SEQUENCE');
  const version = structuredClone(report.entries); version[0].result.versions.balanceVersion = 'unrelated';
  assert.throws(() => reconcileLedger(report.initial, version, report.closing), error => error.code === 'LEDGER_SEQUENCE');
});
test('mana income is separate from gross spell cost even when a spell restores mana', () => {
  const r = runner({ ...options, school: 'talisman' }); r.grow('golden');
  r.funds(160); r.go('sect'); r.act({ type: 'LEARN', skill: 'talisman_return' }); r.act({ type: 'EQUIP', skill: 'talisman_return' });
  r.go('secret'); r.act({ type: 'ENCOUNTER', enemy: 'puppet' }); r.act({ type: 'BATTLE', move: 'technique' });
  r.act({ type: 'BATTLE', move: 'release' }); const row = r.ledger.entries.at(-1);
  assert.equal(row.result.costs.mp, 10); assert.ok(row.received.mp > 0);
  assert.equal(row.after.mp - row.before.mp, row.received.mp - 10); r.ledger.report();
});
test('a complete scenario has no granted realm and a balanced ending inventory', () => {
  const r = runScenario({ ...options, preparation: 'hunt', advancedMind: true });
  assert.equal(r.success, true); assert.equal(r.closing.status, 'ascended');
  assert.ok(r.totals.battleTurns > 0); assert.ok(r.totals.restMonths > 0);
  assert.equal(r.totals.commandTypes.BREAKTHROUGH, 5); assert.equal(r.totals.commandTypes.END, 1);
});
