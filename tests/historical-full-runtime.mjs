import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const historicalRulesCommit = 'd3f48ef7df6269133c2875d9b6ca035c0a30ca41';
/** Execute this repository's exact old source; do not commit generated Game snapshots. Requires a full Git checkout. */
export async function historicalFullRuntime() {
  const root = fileURLToPath(new URL('../', import.meta.url)), folder = mkdtempSync(join(tmpdir(), 'chenyuan-historical-full-'));
  try {
    const archive = execFileSync('git', ['archive', '--format=tar', historicalRulesCommit, 'src', 'tests/full-route.mjs'], { cwd: root, maxBuffer: 5_000_000, timeout: 30000 });
    execFileSync('tar', ['-x', '-C', folder], { input: archive, timeout: 30000 });
    writeFileSync(join(folder, 'package.json'), '{"type":"module"}');
    const engine = await import(pathToFileURL(join(folder, 'src/full/engine.ts')).href);
    const routes = await import(pathToFileURL(join(folder, 'tests/full-route.mjs')).href);
    const receipts = await import(pathToFileURL(join(folder, 'src/full/receipts.ts')).href);
    const events = await import(pathToFileURL(join(folder, 'src/full/events.ts')).href);
    const sample = engine.newGame('历史回放', 'historical-version-check');
    assert.equal(sample.core.contentVersion, 'full-demo.2'); assert.equal(sample.core.balanceVersion, 'full-unbalanced.2');
    return { engine, routes, receipts, events, sourceCommit: historicalRulesCommit };
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

let cachedRuntime;
export async function historicalCausalFixtures() {
  const old = await (cachedRuntime ??= historicalFullRuntime()), cases = [];
  for (const choice of ['help', 'trade', 'leave']) for (const school of ['sword', 'talisman']) {
    const d = old.routes.driver(choice, school); d.realm(); if (choice === 'leave') d.resource('herb', 2); d.go('sect');
    const previous = structuredClone(d.game), enter = { type: 'EVENT', event: 'shen_return', commandId: 'old-enter-' + choice + '-' + school, runId: previous.core.runId, expectedRevision: previous.core.revision };
    const entered = old.engine.resolve(previous, enter), pending = entered.nextState;
    const decide = { type: 'DECIDE', option: 'accept', commandId: 'old-accept-' + choice + '-' + school, runId: pending.core.runId, expectedRevision: pending.core.revision };
    const chosen = old.engine.resolve(pending, decide);
    const receipt = (command, result, state) => {
      const value = { format: 'chenyuan-receipt', version: 1, command, fingerprint: old.receipts.canonicalFingerprint(command), result };
      old.receipts.validateCommandReceipt(value, state); return value;
    };
    const snapshot = structuredClone(d.checkpoints.qi);
    const versions = { format: snapshot.format, version: snapshot.version, schemaVersion: snapshot.core.schemaVersion, contentVersion: snapshot.core.contentVersion, balanceVersion: snapshot.core.balanceVersion };
    const checkpoint = { format: 'chenyuan-checkpoint', version: 1, kind: 'breakthrough', sourceRunId: snapshot.core.runId, sourceRevision: snapshot.core.revision, versions, snapshot };
    const scope = current => ({ format: 'chenyuan-checkpoint-scope', version: 1, runId: current.core.runId, sourceRunId: checkpoint.sourceRunId, sourceRevision: checkpoint.sourceRevision, kind: checkpoint.kind });
    cases.push({ choice, school, sourceCommit: old.sourceCommit, checkpoint,
      pending: { current: pending, previous, receipt: receipt(enter, entered.result, pending), owner: scope(pending) },
      resolved: { current: chosen.nextState, previous: pending, receipt: receipt(decide, chosen.result, chosen.nextState), owner: scope(chosen.nextState) } });
  }
  return cases;
}
