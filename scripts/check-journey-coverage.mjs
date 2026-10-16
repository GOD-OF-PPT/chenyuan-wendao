import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const expected=new Set(['help','trade','leave'].flatMap(choice=>['sword','talisman'].flatMap(school=>['craft','purchase'].flatMap(strategy=>['transmit','depart'].map(ending=>[choice,school,strategy,ending].join('/'))))));
const browsers=['chromium','firefox','webkit'];
export function verifyJourneyCoverage(directory){
 const reports=[];const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())walk(name);else if(entry.isFile()&&entry.name==='results.json')reports.push(name);}};walk(directory);assert.equal(reports.length,12,'Expected four shard reports for each of three browsers');
 const seen=Object.fromEntries(browsers.map(browser=>[browser,new Set()])),parts=Object.fromEntries(browsers.map(browser=>[browser,0]));
 for(const filename of reports){
  const report=JSON.parse(fs.readFileSync(filename,'utf8')),tests=[];const visit=suite=>{for(const spec of suite.specs??[])for(const test of spec.tests??[])tests.push({title:spec.title,ok:spec.ok,...test});for(const child of suite.suites??[])visit(child);};for(const suite of report.suites??[])visit(suite);
  assert.equal(tests.length,6,filename+': each shard must run six normal routes');assert.equal(report.errors?.length??0,0,filename+': reporter errors');const names=new Set(tests.map(t=>t.projectName));assert.equal(names.size,1,filename+': one actual browser per report');const browser=[...names][0];assert.ok(browsers.includes(browser),filename+': unknown browser');parts[browser]++;
  for(const test of tests){const id=test.title.replace(/^normal /,'');assert.ok(expected.has(id),filename+': unknown normal route '+test.title);assert.ok(!seen[browser].has(id),browser+': duplicate '+id);assert.equal(test.ok,true,id+': not a passing spec');assert.equal(test.status,'expected',id+': unexpected or skipped result');assert.equal(test.expectedStatus,'passed',id+': not required to pass');assert.equal(test.results.length,1,id+': retries are not accepted');assert.equal(test.results[0].status,'passed',id+': did not pass');assert.equal(test.results[0].retry,0,id+': retry is not accepted');seen[browser].add(id);}
 }
 for(const browser of browsers){assert.equal(parts[browser],4,browser+': four actual shard reports required');assert.equal(seen[browser].size,24,browser+': all24 routes required');for(const id of expected)assert.ok(seen[browser].has(id),browser+': missing '+id);}
 return{format:'chenyuan-journey-coverage',version:1,reports:12,passed:72,browsers:Object.fromEntries(browsers.map(browser=>[browser,[...seen[browser]].sort()]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(verifyJourneyCoverage(process.argv[2]??'journey-evidence')));
