import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCurrentBrowserShards} from '../scripts/current-browser-report.mjs';

// Verifier fixtures only. They are never actual browser coverage.
function sample(){
 const source={head:'a'.repeat(40),tree:'b'.repeat(40),runtime:'c'.repeat(64),dirty:false};
 const make=(ids,shard=null)=>({config:{shard,metadata:{chenyuan:{head:source.head,tree:source.tree,dirty:false},runtimeDigest:source.runtime}},errors:[],suites:[{title:'normal.spec.ts',specs:ids.map(id=>({file:'normal.spec.ts',title:'route '+id,ok:true,tests:[{projectName:'chromium',expectedStatus:'passed',status:'expected',results:[{status:'passed',retry:0,workerIndex:0}]}]}))}],stats:{expected:ids.length,skipped:0,unexpected:0,flaky:0}});
 return {source,entries:Array.from({length:4},(_,i)=>{const shard={current:i+1,total:4};return{suite:'normal',shard,full:make([0,1,2,3]),declarations:make([i],shard),execution:make([i],shard)};})};
}
test('four native shards only become complete through their exact current full union',()=>{const {source,entries}=sample();const r=assessCurrentBrowserShards(entries,source);assert.equal(r.passed,4);assert.equal(r.shards.length,4);assert.equal(r.compatibilityAccepted,false);});
test('missing duplicated substituted or overlapping shards cannot become complete coverage',()=>{
 for(const change of [r=>r.pop(),r=>r[1].shard.current=1,r=>r[1].execution.suites[0].specs[0].title='substitute',r=>{r[1].declarations.suites[0].specs=r[0].declarations.suites[0].specs;r[1].execution.suites[0].specs=r[0].execution.suites[0].specs;},r=>r[0].full.suites[0].specs.pop()]){const {source,entries}=sample();change(entries);assert.throws(()=>assessCurrentBrowserShards(entries,source));}
});
test('sharded full declarations stale sources wrong shard configuration skips and retries remain red',()=>{
 for(const change of [r=>r[0].full.config.shard={current:1,total:4},r=>r[0].execution.config.metadata.runtimeDigest='d'.repeat(64),r=>r[0].execution.config.shard={current:2,total:4},r=>r[0].execution.suites[0].specs[0].tests[0].results[0].status='skipped',r=>r[0].execution.suites[0].specs[0].tests[0].results.push({status:'passed',retry:1}),r=>r[0].suite='q13']){const {source,entries}=sample();change(entries);assert.throws(()=>assessCurrentBrowserShards(entries,source));}
});
