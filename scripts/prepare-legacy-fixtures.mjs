import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
export function prepareLegacyFixtures() {
  return execFileSync(process.platform === 'win32' ? 'python' : 'python3',
    [path.join(root, 'scripts/legacy_fixtures.py')], {cwd: root, encoding: 'utf8'});
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(prepareLegacyFixtures());
}
