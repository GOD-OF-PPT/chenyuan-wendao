import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {root} from './source-identity.mjs';
import {runCommand} from './process-command.mjs';
import {parseTap} from './validate-core.mjs';
import {newValidationOutput} from './validation-output.mjs';

export const historicalGuardCommit = '691648a357e6ffb5cd431a029782cc366dd442b2';
const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();

export function checkHistoricalGuards(output, full = false) {
  const artifacts = path.join(root, 'artifacts');
  if (fs.existsSync(artifacts) && (fs.lstatSync(artifacts).isSymbolicLink() || fs.realpathSync(artifacts) !== path.resolve(artifacts))) {
    throw new Error('Historical artifacts must be a local directory');
  }
  const report = newValidationOutput(output, 'historical-guards/report');
  const checkout = path.join(artifacts, 'historical-guards', historicalGuardCommit);
  fs.mkdirSync(path.dirname(checkout), {recursive: true});
  if (!fs.existsSync(checkout)) git(root, 'worktree', 'add', '--detach', checkout, historicalGuardCommit);
  if (git(checkout, 'rev-parse', '--show-toplevel') !== checkout.replaceAll('\\', '/') ||
      git(checkout, 'rev-parse', 'HEAD') !== historicalGuardCommit || git(checkout, 'status', '--porcelain')) {
    throw new Error('Historical guards require their exact clean frozen worktree');
  }
  const commands = [
    ['inputs', process.execPath, ['scripts/prepare-legacy-fixtures.mjs']],
    ['ledger', process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', 'tests/idle-matrix-evidence.test.mjs', 'tests/idle-trial-ui-replacements.test.mjs']],
    ['source-and-art', 'python3', ['-X', 'utf8', 'art/tools/check_inventory.py', '--root', checkout]],
    ...(full ? [['negative-cases', 'python3', ['-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'art/tools', '-p', 'test_*.py']]] : []),
  ];
  const results = [];
  let counts;
  for (const [id, command, args] of commands) {
    const result = runCommand(command, args, {cwd: checkout, encoding: 'utf8', maxBuffer: 20_000_000});
    const text = (result.stdout ?? '') + (result.stderr ?? '');
    fs.writeFileSync(path.join(report, id + '.log'), text);
    results.push({id, exitCode: result.status});
    if (result.error || result.status !== 0) throw result.error ?? new Error('Historical guard failed: ' + id + '; see ' + report);
    if (id === 'ledger') counts = parseTap(text);
  }
  if (git(checkout, 'rev-parse', 'HEAD') !== historicalGuardCommit || git(checkout, 'status', '--porcelain')) throw new Error('Historical source changed during verification');
  const result = {format: 'chenyuan-historical-guards', source: historicalGuardCommit, historical: true, currentBehaviorAccepted: false, fullNegativeSuite: full, counts, results};
  fs.writeFileSync(path.join(report, 'historical.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const full = process.argv.includes('--full');
  const output = process.argv.slice(2).find(value => value !== '--full');
  console.log(JSON.stringify(checkHistoricalGuards(output, full)));
}
