import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) =>
  execFileSync('git', args, { cwd: root, maxBuffer: 8_000_000 });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const base = git('rev-parse', process.argv[2] ?? 'f0323f9')
  .toString('utf8')
  .trim();
if (!/^[a-f0-9]{40}$/.test(base))
  throw Error('Expected an immutable source commit');
const profile = process.argv[3] ?? '3';
if (!['3', '4', '5'].includes(profile))
  throw Error('Expected published rule profile 3, 4 or 5');
const destination = path.resolve(root, 'src/legacy/rules-v' + profile);
if (path.relative(root, destination).startsWith('..'))
  throw Error('Frozen rule destination escaped the workspace');
const tracked = new Set(
  git('ls-tree', '-r', '--name-only', base, '--', 'src', 'web/src')
    .toString('utf8')
    .trim()
    .split('\n'),
);
const roots = [
  'src/full/engine.ts',
  'src/full/queries.ts',
  'src/full/activity.ts',
  'src/full/costs.ts',
  'src/full/configuration.ts',
  'src/full/receipts.ts',
  'src/full/progression.ts',
  'src/full/economy-ledger.ts',
  'web/src/activity-persistence.ts',
  'web/src/configuration-persistence.ts',
  'web/src/direct-persistence.ts',
  'web/src/full-persistence.ts',
];
if (profile !== '3')
  roots.push(
    'src/full/scheduled-activity.ts',
    'web/src/scheduled-persistence.ts',
    'web/src/away-summary.ts',
  );
const inputs = new Map();
function resolve(from, reference) {
  const value = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), reference),
  );
  if (!value.startsWith('src/') && !value.startsWith('web/src/'))
    throw Error('Frozen dependency escaped its source areas: ' + value);
  const found = [
    value,
    value + '.ts',
    value + '.mjs',
    value + '.js',
    value + '/index.ts',
  ].find((file) => tracked.has(file));
  if (!found)
    throw Error('Unresolved frozen dependency: ' + from + ' -> ' + reference);
  return found;
}
function visit(file) {
  if (inputs.has(file)) return;
  const mode = git('ls-tree', base, '--', file).toString('utf8');
  if (!mode.startsWith('100644 ') && !mode.startsWith('100755 '))
    throw Error('Frozen input is not an ordinary tracked file: ' + file);
  const bytes = git('show', base + ':' + file);
  inputs.set(file, bytes);
  const source = bytes.toString('utf8');
  for (const match of source.matchAll(
    /(?:from\s*|import\s*(?:\(\s*)?)(['"])(\.[^'"]+)\1/g,
  ))
    visit(resolve(file, match[2]));
}
roots.forEach(visit);
const content = inputs.get('src/full/content.ts').toString('utf8');
const version = content.match(
    /export const VERSION(?:\s*:\s*string)?\s*=\s*(['"])([^'"]+)\1/,
  )?.[2],
  balance = content.match(
    /export const BALANCE(?:\s*:\s*string)?\s*=\s*(['"])([^'"]+)\1/,
  )?.[2];
if (
  version !== 'full-demo.' + profile ||
  balance !== 'full-unbalanced.' + profile
)
  throw Error(
    'This snapshot must contain the actual v' + profile + ' rule pair',
  );
const exports = {
  engine: 'src/full/engine.ts',
  queries: 'src/full/queries.ts',
  activity: 'src/full/activity.ts',
  costs: 'src/full/costs.ts',
  configuration: 'src/full/configuration.ts',
  progression: 'src/full/progression.ts',
  ledger: 'src/full/economy-ledger.ts',
  receipts: 'src/full/receipts.ts',
  content: 'src/full/content.ts',
  activityReceipt: 'web/src/activity-persistence.ts',
  configurationReceipt: 'web/src/configuration-persistence.ts',
  directReceipt: 'web/src/direct-persistence.ts',
};
if (profile !== '3')
  Object.assign(exports, {
    scheduled: 'src/full/scheduled-activity.ts',
    scheduledReceipt: 'web/src/scheduled-persistence.ts',
    awaySummary: 'web/src/away-summary.ts',
  });
const entry =
  '// Generated immutable v' +
  profile +
  ' rule adapter. See source-manifest.json and decision ' +
  (profile === '3' ? '0156' : profile === '4' ? '0164' : '0165') +
  '.\n' +
  Object.entries(exports)
    .map(([name, file]) => `export * as ${name} from './${file}';`)
    .join('\n') +
  '\n';
const manifest = {
  format: 'chenyuan-frozen-rule-profile',
  version: 1,
  contentVersion: version,
  balanceVersion: balance,
  sourceCommit: base,
  roots,
  productionEntry: 'index.ts',
  testOnlyRepository: 'web/src/full-persistence.ts',
  files: Object.fromEntries(
    [...inputs]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([file, bytes]) => [
        file,
        { sha256: sha(bytes), bytes: bytes.length },
      ]),
  ),
  entrySha256: sha(entry),
};
const report = JSON.stringify(manifest, null, 2) + '\n';
const existed = fs.existsSync(destination);
if (existed) {
  if (
    fs.readFileSync(path.join(destination, 'source-manifest.json'), 'utf8') !==
      report ||
    fs.readFileSync(path.join(destination, 'index.ts'), 'utf8') !== entry
  )
    throw Error('An existing frozen profile differs; refusing to overwrite it');
} else {
  fs.mkdirSync(destination, { recursive: true });
  for (const [file, bytes] of inputs) {
    const target = path.resolve(destination, file);
    if (path.relative(destination, target).startsWith('..'))
      throw Error('Frozen file escaped its directory');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  fs.writeFileSync(path.join(destination, 'index.ts'), entry);
  fs.writeFileSync(path.join(destination, 'source-manifest.json'), report);
}
for (const [file, bytes] of inputs)
  if (!fs.readFileSync(path.join(destination, file)).equals(bytes))
    throw Error('Frozen source differs: ' + file);
console.log(
  JSON.stringify({
    base,
    files: inputs.size,
    bytes: [...inputs.values()].reduce((n, b) => n + b.length, 0),
    destination,
    created: !existed,
    verified: true,
  }),
);
