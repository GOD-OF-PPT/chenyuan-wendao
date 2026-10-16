import test from 'node:test';
import assert from 'node:assert/strict';
import { driver } from './full-route.mjs';
import { resolve } from '../src/full/engine.ts';
import { canonicalFingerprint, validateCommandReceipt } from '../src/full/receipts.ts';

function sample(action = { type: 'CULTIVATE', method: 'assisted', count: 50 }) {
  const d = driver(); d.go('cave');
  const command = { ...action, commandId: 'receipt-test', runId: d.game.core.runId, expectedRevision: d.game.core.revision };
  const resolved = resolve(d.game, command);
  return { current: resolved.nextState, receipt: { format: 'chenyuan-receipt', version: 1, command,
    fingerprint: canonicalFingerprint(command), result: resolved.result } };
}
test('valid partial-batch receipt retains its committed identity and precise result', () => {
  const { current, receipt } = sample();
  assert.doesNotThrow(() => validateCommandReceipt(receipt, current));
  assert.equal(receipt.result.executedSteps, 2);
  assert.equal(receipt.result.stopReason.code, 'INSUFFICIENT_STONES');
});
test('fingerprint is independent of object key order, including nested batch targets', () => {
  assert.equal(canonicalFingerprint({ type: 'SOURCE', target: { item: 'herb', quantity: 8 } }),
    canonicalFingerprint({ target: { quantity: 8, item: 'herb' }, type: 'SOURCE' }));
});
test('corrupt identity, version, budgets, delta, phase and history bounds are rejected', () => {
  const good = sample();
  for (const mutate of [
    r => { r.version = 9; }, r => { r.result = {}; }, r => { r.fingerprint = 'wrong'; },
    r => { r.result.commandId = 'other'; }, r => { r.result.runId = 'other'; },
    r => { r.result.revisionBefore++; }, r => { r.result.revisionAfter++; },
    r => { r.result.requestedSteps = 49; }, r => { r.result.executedSteps = 0; },
    r => { r.result.stopReason = null; }, r => { r.result.stopReason.code = 'unknown'; },
    r => { r.result.versions.balanceVersion = 'unknown'; },
    r => { r.result.phaseBefore = 'opening'; }, r => { r.result.phaseAfter = 'unknown'; },
    r => { r.result.costs.stones = -1; }, r => { r.result.delta.months = -1; },
    r => { r.result.delta.months++; }, r => { r.result.delta.wins = 1; },
    r => { r.result.delta.inventory.unknown = 1; }, r => { r.result.delta.inventory.herb = 0; },
    r => { r.result.delta.realm.after = 'foundation'; },
    r => { r.result.delta.hp = Number.NaN; }, r => { r.result.costs.items.herb = 1.5; },
  ]) {
    const corrupted = structuredClone(good.receipt); mutate(corrupted);
    assert.throws(() => validateCommandReceipt(corrupted, good.current), error => error.code === 'RECEIPT_INVALID');
  }
});
test('historical result can precede latest state but cannot come from its future or another run', () => {
  const { receipt, current } = sample();
  const latest = structuredClone(current); latest.core.revision += 10;
  assert.doesNotThrow(() => validateCommandReceipt(receipt, latest));
  const future = structuredClone(current); future.core.revision--;
  assert.throws(() => validateCommandReceipt(receipt, future), error => error.code === 'RECEIPT_INVALID');
  latest.core.runId = 'other';
  assert.throws(() => validateCommandReceipt(receipt, latest), error => error.code === 'RECEIPT_INVALID');
});
