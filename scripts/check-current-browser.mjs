import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root, sourceIdentity, runtimeSources, sha} from './source-identity.mjs';
import {runCommand} from './process-command.mjs';
import {newValidationOutput} from './validation-output.mjs';
import {assessCurrentBrowserRun} from './current-browser-report.mjs';

export function checkCurrentBrowser(suite = 'ui', requested, shardText) {
  if(shardText && (suite!=='normal'||!/^[1-4]\/4$/.test(shardText))) throw new Error('Only normal supports the four native CI shards');
  const shard=shardText?{current:Number(shardText[0]),total:4}:null;
  const config = {ui: 'playwright.quality.config.ts', native: 'playwright.idle-recovery.config.ts', q02: 'playwright.q02.config.ts', q03:'playwright.q03.config.ts',q04:'playwright.q04.config.ts',q05:'playwright.q05.config.ts',q06:'playwright.q06.config.ts',q07:'playwright.q07.config.ts',group:'playwright.quality-group.config.ts',q13:'playwright.q13.config.ts',normal:'playwright.idle-journeys.config.ts'}[suite];
  if (!config) throw new Error('Current browser suite must be ui, native, q02, q03, q04, q05, q06, q13, normal or group');
  const snapshot = () => ({...sourceIdentity(), runtime: sha(JSON.stringify(runtimeSources()))});
  const before = snapshot();
  if (before.dirty) throw new Error('Current behavior requires clean frozen source');
  const output = newValidationOutput(requested, 'current-' + suite);
  const cli = path.join(root, 'web/node_modules/@playwright/test/cli.js');
  if(shard) fs.writeFileSync(path.join(output,'shard.json'),JSON.stringify({suite,shard},null,2)+'\n');
  const phases=shard?[{declaration:true,name:'full-declarations',partial:false},{declaration:true,name:'declarations',partial:true},{declaration:false,name:'execution',partial:true}]:[{declaration:true,name:'declarations'},{declaration:false,name:'execution'}];
  for (const {declaration,name,partial} of phases) {
    const args = [cli, 'test', '--config', config, '--project=chromium', '--forbid-only', '--retries=0', '--reporter=' + (declaration ? 'json' : 'list,json'),
      ...(partial?['--shard='+shardText]:[]),...(declaration ? ['--list'] : ['--output=' + path.join(output, 'results')])];
    const result = runCommand(process.execPath, args, {cwd: path.join(root, 'web'), encoding: 'utf8', maxBuffer: 20_000_000,
      env: {...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(output, name + '.json')}});
    fs.writeFileSync(path.join(output, name + '.log'), (result.stdout ?? '') + (result.stderr ?? ''));
    if (result.error || result.status !== 0) {process.stderr.write((result.stdout??'')+(result.stderr??''));throw result.error ?? new Error('Current browser ' + name + ' failed; see ' + output);}
  }
  const after = snapshot();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during browser verification; original reports retained at ' + output);
  const report = assessCurrentBrowserRun(...['declarations', 'execution'].map(name => JSON.parse(fs.readFileSync(path.join(output, name + '.json'), 'utf8'))), after);
  if(shard) Object.assign(report,{format:'chenyuan-current-browser-partial',suite,shard,partial:true});
  fs.writeFileSync(path.join(output, 'behavior.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 5 || process.argv[4]&&!process.argv[4].startsWith('--shard=')) throw new Error('Use: check-current-browser.mjs [suite] [new artifacts directory] [--shard=1/4]');
  console.log(JSON.stringify(checkCurrentBrowser(process.argv[2], process.argv[3],process.argv[4]?.slice(8))));
}
