import fs from 'node:fs';
import path from 'node:path';
import {currentVersions} from '../src/full/versions.ts';
import {root,sha,filesUnder,runtimeSources,sourceIdentity,publicSources} from './source-identity.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export function recordBuild(){
const source=sourceIdentity(),sources=runtimeSources(),digest=sha(JSON.stringify(sources)),demo=JSON.parse(fs.readFileSync(path.join(root,'web/dist/demo-nodes/manifest.json'),'utf8'));
if(demo.sourceDigest!==digest)throw new Error('Runtime sources changed between node generation and build');
const files=filesUnder('web/dist').map(file=>({path:file.slice('web/dist/'.length),bytes:fs.statSync(path.join(root,file)).size,sha256:sha(fs.readFileSync(path.join(root,file)))}));
const emitted=JSON.parse(fs.readFileSync(path.join(root,'web/dist/.vite/manifest.json'),'utf8')),allowed=new Set(['index.html','.vite/manifest.json',...publicSources().map(f=>f.slice('web/public/'.length)),'demo-nodes/manifest.json',...demo.nodes.map(n=>'demo-nodes/'+n.id+'.json')]);
for(const entry of Object.values(emitted))for(const file of[entry.file,...(entry.css??[]),...(entry.assets??[])]){assert.ok(typeof file==='string'&&!file.includes('..')&&!file.startsWith('/'));allowed.add(file);}
assert.deepEqual(files.map(f=>f.path).sort(),[...allowed].sort(),'Unlisted or missing production payload');
const report={format:'chenyuan-web-build',version:1,source,versions:currentVersions,runtimeSources:sources,sourceDigest:digest,locks:Object.fromEntries(['package-lock.json','web/package-lock.json'].map(file=>[file,sha(fs.readFileSync(path.join(root,file)))])),files,bytes:files.reduce((n,f)=>n+f.bytes,0)};
fs.mkdirSync(path.join(root,'web/build-report'),{recursive:true});fs.writeFileSync(path.join(root,'web/build-report/build.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({format:report.format,files:files.length,bytes:report.bytes,source}));
return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))recordBuild();
