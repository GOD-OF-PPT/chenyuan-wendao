import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {sourceIdentity,root,sha} from './source-identity.mjs';
export function parseTap(text){
 const value=key=>{const matches=[...text.matchAll(new RegExp('^# '+key+' (\\d+)\\s*$','gm'))];if(matches.length!==1)throw new Error('Missing or duplicate TAP '+key);return Number(matches[0][1]);};
 const counts=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key=>[key,value(key)]));
 if(counts.tests<1||counts.pass!==counts.tests||['fail','cancelled','skipped','todo'].some(k=>counts[k])||/^not ok |^Bail out!/m.test(text))throw new Error('Core TAP is not a complete first-run success');return counts;
}
export const coreCommands=tests=>[['lock','node',['scripts/check_lock.mjs']],['install','npm',['ci','--ignore-scripts','--no-audit','--no-fund']],['typecheck','npm',['run','typecheck']],['content','npm',['run','check:content']],['tests','node',['--experimental-strip-types','--test','--test-reporter=tap',...tests]],['m1','npm',['run','replay']],['full','npm',['run','replay:full']],['economy','npm',['run','audit:economy']],['documents','python3',['scripts/check_docs.py']],['design-documents','python3',['docs/v0.4/tools/check_documents.py']]];
export function coreLogName(id){if(!coreCommands([]).some(row=>row[0]===id))throw new Error('Unknown core command log');return id+(id==='tests'?'.tap':'.log');}
export function validateCore(output=path.join(root,'web/core-report')){
 fs.mkdirSync(output,{recursive:true});const source=sourceIdentity(),tests=fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>'tests/'+n);
 const commands=coreCommands(tests);
 const results=[];let counts=null;
 for(const [id,command,args]of commands){console.log('CORE COMMAND',id,command,...args);const r=spawnSync(command==='node'?process.execPath:command,args,{cwd:root,encoding:'utf8',maxBuffer:20_000_000}),text=(r.stdout??'')+(r.stderr??'');process.stdout.write(text);const file=coreLogName(id);fs.writeFileSync(path.join(output,file),text);results.push({id,command,args,exitCode:r.status,file,sha256:sha(text),bytes:Buffer.byteLength(text)});if(r.error||r.status!==0){fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify({format:'chenyuan-core-validation',version:1,source,passed:false,results},null,2));throw r.error??new Error('Core command failed: '+id);}if(id==='tests')counts=parseTap(text);}
 const end=sourceIdentity();if(source.head!==end.head||source.tree!==end.tree||source.dirty!==end.dirty)throw new Error('Source changed during core validation');const report={format:'chenyuan-core-validation',version:1,source,passed:true,counts,tests,results};fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({format:report.format,passed:counts.pass,source}));return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))validateCore(process.argv[2]?path.resolve(process.argv[2]):undefined);
