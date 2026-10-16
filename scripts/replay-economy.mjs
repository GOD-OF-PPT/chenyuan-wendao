import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { VERSION, BALANCE, assistedCosts } from '../src/full/content.ts';
import { validateContent } from '../src/full/validate-content.ts';
import { matrix, cultivationProbes, conversionProbes, sourceRates, combatProbes, failureRecoveryProbe, comparisons } from './economy/analysis.mjs';
const root = new URL('../', import.meta.url), sha = text => createHash('sha256').update(text).digest('hex');
const baselinePath = new URL('docs/economy/baseline-full-unbalanced.1.json', root);
const target = new URL('docs/economy/report-full-unbalanced.2.json', root);
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
