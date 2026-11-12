import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './source-identity.mjs';
import {runCommand} from './process-command.mjs';
import {newValidationOutput} from './validation-output.mjs';
import {assessCurrentBrowserRun} from './current-browser-report.mjs';

export function checkCurrentBrowser(suite = 'ui', requested) {
  const config = {ui: 'playwright.quality.config.ts', native: 'playwright.idle-persistence.config.ts'}[suite];
  if (!config) throw new Error('Current browser suite must be ui or native');
  const output = newValidationOutput(requested, 'current-' + suite);
  const cli = path.join(root, 'web/node_modules/@playwright/test/cli.js');
  for (const declaration of [true, false]) {
    const name = declaration ? 'declarations' : 'execution';
    const args = [cli, 'test', '--config', config, '--project=chromium', '--forbid-only', '--retries=0', '--reporter=' + (declaration ? 'json' : 'list,json'),
      ...(declaration ? ['--list'] : ['--output=' + path.join(output, 'results')])];
    const result = runCommand(process.execPath, args, {cwd: path.join(root, 'web'), encoding: 'utf8', maxBuffer: 20_000_000,
      env: {...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(output, name + '.json')}});
    fs.writeFileSync(path.join(output, name + '.log'), (result.stdout ?? '') + (result.stderr ?? ''));
    if (result.error || result.status !== 0) throw result.error ?? new Error('Current browser ' + name + ' failed; see ' + output);
  }
  const report = assessCurrentBrowserRun(...['declarations', 'execution'].map(name => JSON.parse(fs.readFileSync(path.join(output, name + '.json'), 'utf8'))));
  fs.writeFileSync(path.join(output, 'behavior.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 4) throw new Error('Use: check-current-browser.mjs [ui|native] [new artifacts directory]');
  console.log(JSON.stringify(checkCurrentBrowser(process.argv[2], process.argv[3])));
}
