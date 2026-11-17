import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
export function prepareArtSources() {
  return execFileSync(process.platform === 'win32' ? 'python' : 'python3',
    [path.join(root, 'scripts/art_sources.py')], {cwd: root, encoding: 'utf8'});
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(prepareArtSources());
}
