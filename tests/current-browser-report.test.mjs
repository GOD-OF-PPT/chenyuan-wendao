import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCurrentBrowserRun} from '../scripts/current-browser-report.mjs';

// Synthetic verifier inputs only; they are never browser or product evidence.
function reports() {
  const make = () => ({config: {metadata: {chenyuan: {head: 'a'.repeat(40), tree: 'b'.repeat(40), dirty: false}, runtimeDigest: 'c'.repeat(64)}}, errors: [],
    suites: [{title: 'a.spec.ts', specs: [{file: 'a.spec.ts', title: 'a real behavior contract', ok: true, tests: [{projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{status: 'passed', retry: 0}]}]}]}], stats: {expected: 1, skipped: 0, unexpected: 0, flaky: 0}});
  return [make(), make(), {head: 'a'.repeat(40), tree: 'b'.repeat(40), runtime: 'c'.repeat(64), dirty: false}];
}
test('current behavior compares actual declarations without a frozen title/version ledger', () => {
  const [declared, actual, end] = reports();
  declared.suites[0].specs[0].title = actual.suites[0].specs[0].title = 'a legitimately renamed behavior test';
  assert.equal(assessCurrentBrowserRun(declared, actual, end).passed, 1);
});
test('missing substituted duplicated and skipped current cases cannot become complete coverage', () => {
  for (const change of [r => r.suites = [], r => r.suites[0].specs[0].title += ' changed', r => r.suites.push(structuredClone(r.suites[0])), r => r.suites[0].specs[0].tests[0].results[0].status = 'skipped', r => r.suites[0].specs[0].ok = false]) {
    const [declared, actual, end] = reports(); change(actual);
    assert.throws(() => assessCurrentBrowserRun(declared, actual, end));
  }
});
test('retries expected failures reporter errors dirty or different sources stay failures', () => {
  for (const change of [r => r.suites[0].specs[0].tests[0].results.push({status: 'passed', retry: 1}), r => r.suites[0].specs[0].tests[0].expectedStatus = 'failed', r => r.errors.push({message: 'worker failed'}), r => r.config.metadata.chenyuan.dirty = true, r => r.config.metadata.runtimeDigest = 'd'.repeat(64)]) {
    const [declared, actual, end] = reports(); change(actual);
    assert.throws(() => assessCurrentBrowserRun(declared, actual, end));
  }
});

test('a changed or dirty ending source cannot reuse clean startup metadata', () => {
  for (const change of [e => e.dirty = true, e => e.head = 'd'.repeat(40), e => e.runtime = 'e'.repeat(64)]) {
    const [declared, actual, end] = reports(); change(end);
    assert.throws(() => assessCurrentBrowserRun(declared, actual, end));
  }
});
