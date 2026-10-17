import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {recoveryMatrix} from '../tests/recovery-matrix.mjs';
const allBrowsers=['chromium','firefox','webkit'];
const normalized=value=>value.replaceAll('\\','/');
export function flattenRecoveryReport(report){
 const dir=normalized(report.config?.rootDir??'');const suite=dir.endsWith('/persistence-tests')?'persistence':dir.endsWith('/e2e')?'ui':null;assert.ok(suite,'Unknown recovery report suite');const tests=[];
 const walk=node=>{for(const spec of node.specs??[])for(const test of spec.tests??[])tests.push({suite,file:path.posix.basename(normalized(spec.file??node.file??'')),title:spec.title,ok:spec.ok,...test});for(const child of node.suites??[])walk(child);};for(const node of report.suites??[])walk(node);return{suite,tests};
}
export function bindRecoveryMatrix(tests,browsers=allBrowsers){
 assert.ok(browsers.length>0&&new Set(browsers).size===browsers.length&&browsers.every(b=>allBrowsers.includes(b)),'Invalid actual browser request');const proof={};
 for(const browser of browsers){const evidence=[];for(const row of recoveryMatrix){assert.ok(row.evidence.length>0);for(const item of row.evidence){const matches=tests.filter(t=>t.projectName===browser&&t.suite===item.suite&&t.file===item.file&&t.title===item.title);assert.equal(matches.length,1,`${browser}/${row.id}: missing or duplicate ${item.suite}/${item.file}: ${item.title}`);evidence.push(`${item.suite}/${item.file}::${item.title}`);}}proof[browser]={requirements:recoveryMatrix.map(r=>r.id),evidence:[...new Set(evidence)].sort(),totals:Object.fromEntries(['ui','persistence'].map(suite=>[suite,tests.filter(t=>t.projectName===browser&&t.suite===suite).length]))};}
 return proof;
}
export function verifyRecoveryCoverage(directory,{browsers=allBrowsers}={}){
 const files=[];const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile()&&['ui.json','persistence.json'].includes(entry.name))files.push(file);}};walk(directory);assert.ok(files.length,'No actual UI/persistence JSON reports');const tests=[],seenPairs=new Set;
 for(const file of files){const report=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(report.errors?.length??0,0,file+': reporter errors');const flat=flattenRecoveryReport(report);assert.ok(flat.tests.length,file+': no executed tests');const projects=new Set(flat.tests.map(t=>t.projectName));for(const browser of projects){assert.ok(allBrowsers.includes(browser),file+': unknown project');const pair=browser+'/'+flat.suite;assert.ok(!seenPairs.has(pair),pair+': duplicate suite report');seenPairs.add(pair);}
  for(const test of flat.tests){assert.equal(test.ok,true,test.title+': failed spec');assert.equal(test.status,'expected',test.title+': unexpected or skipped');assert.equal(test.expectedStatus,'passed',test.title+': expected failure is not evidence');assert.equal(test.results.length,1,test.title+': retries are not accepted');assert.equal(test.results[0].status,'passed',test.title+': did not pass');assert.equal(test.results[0].retry,0,test.title+': retry is not accepted');}tests.push(...flat.tests);
 }
 for(const browser of browsers)for(const suite of ['ui','persistence'])assert.ok(seenPairs.has(browser+'/'+suite),browser+'/'+suite+': missing report');
 return{format:'chenyuan-recovery-coverage',version:1,reports:files.length,requirementCount:recoveryMatrix.length,browsers:bindRecoveryMatrix(tests,browsers)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const browser=process.argv.find(a=>a.startsWith('--browser='))?.slice('--browser='.length);const proof=verifyRecoveryCoverage(process.argv[2]??'recovery-evidence',browser?{browsers:[browser]}:{});const root=fileURLToPath(new URL('../',import.meta.url));proof.sourceHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();proof.sourceTree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim();const files=new Set(recoveryMatrix.flatMap(r=>r.evidence.map(e=>`web/${e.suite==='ui'?'e2e':'persistence-tests'}/${e.file}`)));proof.testSourceHashes=Object.fromEntries([...files].sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));console.log(JSON.stringify(proof));
}
