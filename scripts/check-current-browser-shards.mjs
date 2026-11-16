import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceIdentity,runtimeSources,sha} from './source-identity.mjs';
import {assessCurrentBrowserShards} from './current-browser-report.mjs';

export function checkCurrentBrowserShards(directory) {
  const source={...sourceIdentity(),runtime:sha(JSON.stringify(runtimeSources()))},entries=[];
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('Shard evidence symlink');
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())walk(file);
    else if(entry.name==='shard.json'){
      const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
      entries.push({...read('shard.json'),full:read('full-declarations.json'),declarations:read('declarations.json'),execution:read('execution.json')});
    }
  }}
  walk(directory);return assessCurrentBrowserShards(entries,source);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==4)throw new Error('Use: check-current-browser-shards.mjs [downloaded normal artifacts directory] [new report path]');
  const report=checkCurrentBrowserShards(path.resolve(process.argv[2])),output=path.resolve(process.argv[3]);
  if(fs.existsSync(output))throw new Error('Preserve the previous coverage report');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
