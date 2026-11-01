import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { VERSION, BALANCE, assistedCosts } from '../src/full/content.ts';
import { validateContent } from '../src/full/validate-content.ts';
import { matrix, cultivationProbes, conversionProbes, sourceRates, combatProbes, failureRecoveryProbe, comparisons } from './economy/analysis.mjs';
const root = new URL('../', import.meta.url), sha = text => createHash('sha256').update(text).digest('hex');
if (process.argv.includes('--idle')) {
  const { idleRouteMatrix } = await import('./economy/idle-scenarios.mjs');
  const reportIndex = process.argv.indexOf('--report');
  assert.ok(reportIndex < 0 || process.argv[reportIndex + 1] && !process.argv[reportIndex + 1].startsWith('--'), '--report requires a local path');
  assert.ok(!process.argv.includes('--trace'), 'Idle audit uses its own --report path; --trace remains the historical instant-audit option');
  const destination = reportIndex >= 0 ? resolvePath(process.argv[reportIndex + 1]) : fileURLToPath(new URL('artifacts/goal-4/u8-b/idle-economy-report.json', root));
  const historicalDirectory = fileURLToPath(new URL('docs/economy/', root));
  assert.ok(!destination.startsWith(historicalDirectory), '--idle must not overwrite a historical instant-audit report');
  const files = dir => readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(dir + entry.name + '/') : [dir + entry.name]);
  const sourceIdentity = () => Object.fromEntries([...files('src/'), ...files('scripts/economy/'), 'scripts/replay-economy.mjs'].sort().map(file => [file, sha(readFileSync(new URL(file, root)))]));
  const sourceHashes = sourceIdentity();
  validateContent();
  const results = idleRouteMatrix();
  assert.deepEqual(sourceIdentity(), sourceHashes, 'Idle audit inputs changed during execution; preserve this run as partial evidence and rerun only after freezing the source');
  const runs = results.map(({ id, options, success, failure, steps, onlineMs, report, projections, trialAuthorizations, trialBudgetStops }) => ({
    id, options, success, failure, onlineMs, arrangements: steps.filter(s => s.kind === 'activity').length,
    configurationConfirmations: steps.filter(s => s.kind === 'configuration').length,
    onlineCycles: steps.filter(s => s.kind === 'activity').reduce((n, step) => n + step.cycles, 0),
    steps, projections, trialAuthorizations, trialBudgetStops, ...report,
  }));
  const passed = runs.filter(row => row.success).length;
  const report = {
    schema: 'chenyuan-idle-economy-audit.1', contentVersion: VERSION, balanceVersion: BALANCE, numericStatus: 'unbalanced',
    scope: 'Normal newGame through explicitly selected finite Activity plans and immediate formal configuration. Virtual dueAt replay, not real elapsed play, browser, persistence, global optimality, balance or human acceptance.',
    historicalInstantAudit: { unchangedReport: 'docs/economy/current-report.json', separateExecution: true, note: 'This --idle result does not relabel the previous instant120 report or satisfy its --check.' },
    sourceHashes,
    assumptions: { advanced: { openings: 3, schools: 2, preparations: 3, cultivationMethods: 2, answers: 2, endings: 2, cases: 144 },
      baseline: { opening: 'leave', schools: 2, preparations: ['gather', 'purchase'], cultivation: 'natural', answers: 2, endings: 2, cases: 16 },
      laterNpcAid: false, advancedRelics: { sword: 'frost_sword', talisman: 'soul_lamp' }, baselineRelic: 'jade_seal',
      commission: 'Prefer a real alternative commission where present; qi has no separate alternative and explicitly shares the original gathering/escort route.',
      trialStockTargets: { healing_pill: 12, spirit_pill: 4 },
      battle: 'Original default finite strategy, separately authorized for each current trial stage. Only a saved medicine-budget stop may be followed by a new explicit finite confirmation, at most three segments per stage in this tested policy. Danger, missing medicine and other failures are reported without rescue or free resources.',
      accounting: 'Original stable nextCommand per cycle; gross costs and received amounts separate from net changes. Configuration is immediate and contributes zero onlineMs.' },
    expected: 160, passed, failed: runs.length - passed, runs,
  };
  assert.equal(runs.length, 160); assert.equal(new Set(runs.map(row => row.id)).size, 160);
  const text = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--write')) { mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, text); }
  else if (process.argv.includes('--check')) assert.equal(readFileSync(destination, 'utf8'), text, 'Idle report is stale; run --idle --write with its separate --report path');
  console.log(JSON.stringify({ mode: 'idle', expected: 160, passed, failed: report.failed,
    report: destination, sha256: sha(text), check: process.argv.includes('--check') && !process.argv.includes('--write'),
    failures: runs.filter(row => !row.success).map(({ id, failure }) => ({ id, failure })) }));
  if (passed !== 160) process.exitCode = 1;
} else {
const baselinePath = new URL('docs/economy/baseline-full-unbalanced.1.json', root);
const target = new URL('docs/economy/current-engine-report.json', root);
const historicalFile = 'docs/economy/current-report.json';
const historicalSha256 = sha(readFileSync(new URL(historicalFile, root)));
assert.equal(historicalSha256, 'cf3b130845be41b02b332f1436399a5edc8f5ae9d5093e8124f4b0df032e596c', 'Historical instant audit is immutable');
const baselineText = readFileSync(baselinePath, 'utf8'), baseline = JSON.parse(baselineText);
const oldCultivationFile = 'docs/economy/baseline-cultivation-full-unbalanced.1.json';
const oldCultivationText = readFileSync(new URL(oldCultivationFile, root), 'utf8');
assert.equal(sha(baselineText), '0509893b56c03999340cc0e4e37f330866b10d3e524c624db0130b7a9cdab832', 'Version-one baseline is immutable');
assert.equal(sha(oldCultivationText), '46a46543238852ced9c0044963eafeb6119e30e6305d6e3eda15c955550a0af4', 'Version-one cultivation baseline is immutable');
const files = dir => readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(dir + entry.name + '/') : [dir + entry.name]);
validateContent();
const traceIndex = process.argv.indexOf('--trace');
const detailed = traceIndex >= 0;
const allRuns = matrix(detailed);
if (detailed) {
  assert.ok(process.argv[traceIndex + 1], '--trace requires a local path');
  writeFileSync(process.argv[traceIndex + 1], JSON.stringify({ scope: 'Pure engine ledger; not a Game save or durable transaction proof.', runs: allRuns }, null, 2) + '\n');
}
const runs = detailed ? matrix() : allRuns;
const report = {
  schema: 'chenyuan-economy-audit.1', contentVersion: VERSION, balanceVersion: BALANCE, numericStatus: 'unbalanced',
  scope: 'Real engine commands from new games or explicitly labelled replay checkpoints. Not browser, persistence, global optimality, balance, human or real-time-duration acceptance.',
  historicalReport: { file: historicalFile, sha256: historicalSha256, scope: 'Frozen historical instant120 report; current engine provenance is recorded separately here. Neither report is idle160 or balance acceptance.' },
  baseline: { file: 'docs/economy/baseline-full-unbalanced.1.json', sha256: sha(baselineText), rulesCommit: baseline.baselineRulesCommit, cultivationFile: oldCultivationFile, cultivationSha256: sha(oldCultivationText) },
  sourceHashes: Object.fromEntries([...files('src/'), ...files('scripts/economy/'), 'scripts/replay-economy.mjs'].sort().map(file => [file, sha(readFileSync(new URL(file, root)))])),
  assumptions: { openings: 3, schools: 2, preparations: 5, cultivationMethods: 2, minds: 2, fixedTrialAnswer: 'accept', fixedEnding: 'transmit',
    mandatoryAllies: false, commonRelic: 'jade_seal', trialPotionBudget: { healing_pill: 12, spirit_pill: 4 },
    funding: 'highest eligible stable pure-currency income per game month; clipped XP read from actual result',
    comparison: 'Fixed candidate set only. Commands are logical engine calls, not DOM clicks or elapsed real time. Months already include work/recovery; do not charge gross stones again as months.',
    checkpointAccounting: 'Separate ledger epoch; a full rollback is not resource income. HP is net change, not inferred gross damage.' },
  assistedCosts, passed: runs.filter(run => run.success).length, runs,
  cultivation: cultivationProbes(), conversions: conversionProbes(), sources: sourceRates(), combat: combatProbes(),
  failureRecovery: failureRecoveryProbe(), comparisons: comparisons(runs, baseline.runs),
};
assert.equal(report.passed, 120);
assert.equal(report.sources.flatMap(r => r.sources.flatMap(s => s.dominatedBy)).filter(d => d.classification === 'same-tier-review').length, 0);
const text = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--write')) writeFileSync(target, text);
else if (process.argv.includes('--check')) assert.ok(readFileSync(target, 'utf8') === text, 'Economy report is stale: regenerate and review via npm run audit:economy -- --write');
console.log(JSON.stringify({ contentVersion: VERSION, balanceVersion: BALANCE, passed: report.passed, cultivationProbes: report.cultivation.length,
  conversions: report.conversions.length, combat: report.combat.length, failureRecoveryMonths: report.failureRecovery.recoveryMonths,
  report: fileURLToPath(target), sha256: sha(text), check: process.argv.includes('--check') && !process.argv.includes('--write') }));
}
