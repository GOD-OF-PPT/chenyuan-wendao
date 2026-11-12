import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const digest=value=>createHash('sha256').update(value).digest('hex');
const run=cwd=>spawnSync(process.execPath,['--experimental-strip-types','scripts/replay-economy.mjs','--check'],{cwd,encoding:'utf8',maxBuffer:4_000_000});

test('current instant120 audit checks actual engine provenance while the entire historical numeric result remains exact',()=>{
 const historical=fs.readFileSync(path.join(root,'docs/economy/current-report.json'));
 const current=JSON.parse(fs.readFileSync(path.join(root,'docs/economy/current-engine-report.json'),'utf8'));
 const old=JSON.parse(historical);const{sourceHashes:oldSources,...oldResults}=old;
 const{sourceHashes:currentSources,historicalReport,...currentResults}=current;
 assert.equal(digest(JSON.stringify(currentResults)),digest(JSON.stringify(oldResults)));
 assert.equal(historicalReport.sha256,digest(historical));assert.equal(current.passed,120);
 assert.notEqual(digest(JSON.stringify(currentSources)),digest(JSON.stringify(oldSources)));
 const result=run(root);assert.equal(result.status,0,result.stderr);
 const summary=JSON.parse(result.stdout.trim());assert.equal(summary.passed,120);assert.equal(summary.check,true);assert.equal(path.normalize(summary.report),path.join(root,'docs/economy/current-engine-report.json'));
 assert.deepEqual(fs.readFileSync(path.join(root,'docs/economy/current-report.json')),historical);
});

test('the original CLI rejects changed historical bytes and stale current results in an isolated copy',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chenyuan-economy-report-'));
 try{
  for(const name of ['src','scripts/economy','docs/economy'])fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});
  for(const name of ['scripts/replay-economy.mjs','tests/full-route.mjs']){fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});fs.copyFileSync(path.join(root,name),path.join(dir,name));}
  const historicalPath=path.join(dir,'docs/economy/current-report.json'),before=fs.readFileSync(historicalPath);
  fs.writeFileSync(historicalPath,Buffer.concat([before,Buffer.from('\n')]));let result=run(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/Historical instant audit is immutable/);
  fs.writeFileSync(historicalPath,before);const currentPath=path.join(dir,'docs/economy/current-engine-report.json'),current=JSON.parse(fs.readFileSync(currentPath,'utf8'));current.passed=119;fs.writeFileSync(currentPath,JSON.stringify(current));
  result=run(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/Economy report is stale/);assert.deepEqual(fs.readFileSync(historicalPath),before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
