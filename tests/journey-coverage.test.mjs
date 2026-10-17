import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyJourneyCoverage} from '../scripts/check-journey-coverage.mjs';
import {ascensionMatrix} from './ascension-matrix.mjs';
function fixture(change=()=>{}){const root=fs.mkdtempSync(path.join(os.tmpdir(),'chenyuan-coverage-'));for(const browser of ['chromium','firefox','webkit'])for(let shard=0;shard<4;shard++){const dir=path.join(root,browser+'-'+shard);fs.mkdirSync(dir);const report={errors:[],suites:[{specs:ascensionMatrix.slice(shard*6,shard*6+6).map(route=>({title:'normal '+route.id,ok:true,tests:[{projectName:browser,status:'expected',expectedStatus:'passed',results:[{status:'passed',retry:0}]}]}))}]};change(report,browser,shard,dir);fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report));}return root;}
function check(change,ok=false){const dir=fixture(change);try{if(ok)return verifyJourneyCoverage(dir);assert.throws(()=>verifyJourneyCoverage(dir));}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('coverage gate accepts only complete72 actual outcomes across12 balanced reports',()=>{const result=check(()=>{},true);assert.equal(result.passed,72);assert.deepEqual(Object.values(result.browsers).map(v=>v.length),[24,24,24]);});
test('coverage gate refuses duplicated, unknown or absent route identities',()=>{check((r,b,s)=>{if(b==='webkit'&&s===1)r.suites[0].specs[0].title='normal '+ascensionMatrix[0].id;});check((r,b,s)=>{if(b==='chromium'&&s===0)r.suites[0].specs.pop();});check((r,b,s)=>{if(b==='firefox'&&s===0)r.suites[0].specs[0].title='normal unknown';});});
test('coverage gate rejects skipped, failed or retried cases even if a report claims success',()=>{for(const value of ['skipped','failed'])check((r,b,s)=>{if(b==='webkit'&&s===0)r.suites[0].specs[0].tests[0].results[0].status=value;});check((r,b,s)=>{if(b==='firefox'&&s===1)r.suites[0].specs[0].tests[0].results.push({status:'passed',retry:1});});});
test('coverage gate refuses incorrect browser identity and reporter-level errors',()=>{check((r,b,s)=>{if(b==='webkit'&&s===3)for(const spec of r.suites[0].specs)spec.tests[0].projectName='firefox';});check((r,b,s)=>{if(b==='chromium'&&s===0)r.errors.push({message:'failed startup'});});});
