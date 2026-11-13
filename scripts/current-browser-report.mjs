import assert from 'node:assert/strict';

export function currentBrowserCases(report) {
  assert.deepEqual(report.errors, [], 'Browser reporter errors');
  const rows = [];
  function visit(suite, parents = []) {
    const titles = suite.title ? [...parents, suite.title] : parents;
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      assert.equal(test.projectName, 'chromium', 'Only the current fixed browser is accepted');
      rows.push({id: JSON.stringify([spec.file.replaceAll('\\', '/'), ...titles, spec.title, test.projectName]), spec, test});
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  }
  visit(report);
  assert.ok(rows.length, 'Empty browser inventory');
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'Duplicate browser identities');
  return rows;
}

export function currentBrowserSource(report) {
    const value = report.config?.metadata?.chenyuan;
    assert.match(value?.head ?? '', /^[a-f0-9]{40}$/);
    assert.match(value?.tree ?? '', /^[a-f0-9]{40}$/);
    assert.equal(value.dirty, false, 'Browser source must be clean');
    assert.match(report.config?.metadata?.runtimeDigest ?? '', /^[a-f0-9]{64}$/);
    return {head: value.head, tree: value.tree, runtime: report.config.metadata.runtimeDigest};
}

export function assessCurrentBrowserRun(declarations, execution, endSource) {
  const source = currentBrowserSource;
  assert.deepEqual(source(execution), source(declarations), 'Declaration and execution sources differ');
  assert.equal(endSource?.dirty, false, 'Browser source changed during execution');
  assert.deepEqual({head: endSource.head, tree: endSource.tree, runtime: endSource.runtime}, source(execution), 'Browser source changed after startup');
  const expected = currentBrowserCases(declarations), actual = currentBrowserCases(execution);
  assert.deepEqual(actual.map(row => row.id).sort(), expected.map(row => row.id).sort(), 'Declared browser cases missing or substituted');
  for (const {test, spec} of actual) {
    assert.equal(spec.ok, true, 'Browser specification did not pass');
    assert.equal(test.expectedStatus, 'passed', 'Expected failures do not prove current behavior');
    assert.equal(test.status, 'expected');
    assert.equal(test.results.length, 1, 'Retries cannot replace a first execution');
    assert.equal(test.results[0].retry, 0);
    assert.equal(test.results[0].status, 'passed', 'Browser case did not pass');
  }
  assert.equal(execution.stats.expected, actual.length);
  for (const key of ['skipped', 'unexpected', 'flaky']) assert.equal(execution.stats[key], 0, 'Incomplete browser execution');
  return {format: 'chenyuan-current-browser-behavior', source: source(execution), passed: actual.length, historical: false, compatibilityAccepted: false};
}

/** Every native Playwright shard is partial until this exact union succeeds. */
export function assessCurrentBrowserShards(entries, endSource, total = 4) {
  assert.equal(entries.length, total, 'Missing normal shard reports');
  assert.deepEqual(entries.map(e => e.shard.current).sort((a,b)=>a-b), Array.from({length:total},(_,i)=>i+1), 'Missing/duplicate shard identities');
  let fullIds, identity;
  const observed = [], reports = [];
  for (const entry of entries) {
    assert.equal(entry.suite, 'normal');
    assert.equal(entry.shard.total, total);
    assert.equal(entry.full.config.shard ?? null, null, 'Full inventory was itself sharded');
    const ids = currentBrowserCases(entry.full).map(r=>r.id).sort();
    const source = currentBrowserSource(entry.full);
    if (fullIds) { assert.deepEqual(ids, fullIds, 'Full inventories differ'); assert.deepEqual(source, identity, 'Full inventory sources differ'); }
    else { fullIds = ids; identity = source; }
    assert.deepEqual(entry.declarations.config.shard, entry.shard);
    assert.deepEqual(entry.execution.config.shard, entry.shard);
    const report = assessCurrentBrowserRun(entry.declarations, entry.execution, endSource);
    assert.deepEqual(report.source, source, 'Shard source differs from full inventory');
    const cases = currentBrowserCases(entry.execution).map(r=>r.id);
    assert.ok(cases.every(id=>fullIds.includes(id)), 'Shard substituted a test outside the full inventory');
    observed.push(...cases); reports.push({shard:entry.shard,passed:report.passed});
  }
  assert.equal(new Set(observed).size, observed.length, 'Executed shards overlap');
  assert.deepEqual(observed.sort(), fullIds, 'Shard union does not cover every current normal case');
  return {format:'chenyuan-current-browser-shards',suite:'normal',source:identity,passed:observed.length,shards:reports,historical:false,compatibilityAccepted:false};
}
