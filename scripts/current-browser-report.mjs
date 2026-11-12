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

export function assessCurrentBrowserRun(declarations, execution) {
  const source = report => {
    const value = report.config?.metadata?.chenyuan;
    assert.match(value?.head ?? '', /^[a-f0-9]{40}$/);
    assert.match(value?.tree ?? '', /^[a-f0-9]{40}$/);
    assert.equal(value.dirty, false, 'Browser source must be clean');
    assert.match(report.config?.metadata?.runtimeDigest ?? '', /^[a-f0-9]{64}$/);
    return {head: value.head, tree: value.tree, runtime: report.config.metadata.runtimeDigest};
  };
  assert.deepEqual(source(execution), source(declarations), 'Declaration and execution sources differ');
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
