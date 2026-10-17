import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {recoveryMatrix} from './recovery-matrix.mjs';
import {verifyRecoveryCoverage} from '../scripts/check-recovery-coverage.mjs';

function fixture(change=()=>{},split=false){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'chenyuan-recovery-'));
 for(const suite of ['ui','persistence']){
  const unique=[...new Map(recoveryMatrix.flatMap(r=>r.evidence).filter(e=>e.suite===suite).map(e=>[e.file+'::'+e.title,e])).values()];
  for(const browsers of split?[['chromium'],['firefox'],['webkit']]:[['chromium','firefox','webkit']]){
   const report={config:{rootDir:'/project/web/'+(suite==='ui'?'e2e':'persistence-tests')},errors:[],suites:[{suites:unique.map(e=>({file:e.file,specs:[{file:e.file,title:e.title,ok:true,tests:browsers.map(projectName=>({projectName,status:'expected',expectedStatus:'passed',results:[{status:'passed',retry:0}]}))}]}))}]};
   const dir=path.join(root,browsers.join('-'));fs.mkdirSync(dir,{recursive:true});change(report,suite,browsers);fs.writeFileSync(path.join(dir,suite+'.json'),JSON.stringify(report));
  }
 }
 return root;
}
function check(change,options,passes=false,split=false){
 const dir=fixture(change,split);try{if(passes)return verifyRecoveryCoverage(dir,options);assert.throws(()=>verifyRecoveryCoverage(dir,options));}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const first=r=>r.suites[0].suites[0].specs[0];
test('recovery gate binds all twenty requirements to actual three-browser outcomes in local and CI layouts',()=>{
 for(const split of [false,true]){const result=check(()=>{},undefined,true,split);assert.equal(result.requirementCount,20);assert.equal(result.reports,split?6:2);for(const browser of Object.values(result.browsers)){assert.deepEqual(browser.requirements,recoveryMatrix.map(r=>r.id));assert.ok(browser.evidence.length>60);}}
 const one=check((r,s,b)=>{for(const group of r.suites[0].suites)group.specs[0].tests=group.specs[0].tests.filter(t=>t.projectName==='firefox');},{browsers:['firefox']},true);assert.deepEqual(Object.keys(one.browsers),['firefox']);
});
test('recovery gate rejects missing requirements, wrong files, duplicate cases and missing browsers',()=>{
 check((r,s)=>{if(s==='persistence')r.suites[0].suites.pop();});
 check((r,s)=>{if(s==='ui')first(r).file='unrelated.spec.ts';});
 check((r,s)=>{if(s==='ui')r.suites[0].suites.push(structuredClone(r.suites[0].suites[0]));});
 check(r=>{for(const group of r.suites[0].suites)group.specs[0].tests.pop();});
});
test('recovery gate rejects skipped, failed, expected-failure and retried tests despite success summaries',()=>{
 const changes=[s=>s.ok=false,s=>s.tests[0].status='skipped',s=>s.tests[0].expectedStatus='failed',s=>s.tests[0].results[0].status='failed',s=>s.tests[0].results[0].retry=1,s=>s.tests[0].results.push({status:'passed',retry:1})];
 for(const change of changes)check((r,s)=>{if(s==='ui')change(first(r));});
});
test('recovery gate rejects invalid suites, unknown projects, reporter errors and duplicate report pairs',()=>{
 check((r,s)=>{if(s==='persistence')r.config.rootDir='/project/web/unrelated';});
 check((r,s)=>{if(s==='ui')first(r).tests[0].projectName='safari';});
 check((r,s)=>{if(s==='ui')r.errors.push({message:'startup failed'});});
 check((r,s,b)=>{if(s==='ui'&&b[0]==='firefox')for(const group of r.suites[0].suites)group.specs[0].tests[0].projectName='chromium';},undefined,false,true);
 check(()=>{},{browsers:[]});check(()=>{},{browsers:['chromium','chromium']});
});
