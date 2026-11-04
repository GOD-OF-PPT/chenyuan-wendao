import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectIdleReport,latestIdleResults,inspectIdleDeclarations,verifyIdleMatrixCoverage} from '../scripts/idle-matrix-evidence.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
const runtime='a'.repeat(64);
function report(){return{config:{rootDir:'/isolated/web/e2e',metadata:{runtimeDigest:runtime},projects:[{name:'chromium',repeatEach:1,retries:0}]},errors:[],suites:[{specs:[{file:'example.spec.ts',title:'a pinned verifier fixture',ok:true,tests:[{projectName:'chromium',expectedStatus:'passed',status:'expected',results:[{status:'passed',retry:0}]}]}]}]};}
const alter=fn=>{const r=report();fn(r,r.suites[0].specs[0],r.suites[0].specs[0].tests[0]);return r;};
test('current evidence parser retains an actual unique file title project and suite identity',()=>{
 const rows=inspectIdleReport(report(),'ui',runtime);assert.equal(rows.length,1);assert.deepEqual([rows[0].file,rows[0].title,rows[0].projectName,rows[0].suite],['example.spec.ts','a pinned verifier fixture','chromium','ui']);
});
test('another runtime cannot be relabelled as current evidence',()=>assert.throws(()=>inspectIdleReport(report(),'ui','b'.repeat(64)),/Different runtime/));
test('reporter errors cannot be hidden by successful individual cases',()=>assert.throws(()=>inspectIdleReport(alter(r=>r.errors=[{message:'worker failed'}]),'ui',runtime),/Reporter errors/));
test('skips expected failures automatic retries and repetitions cannot add current coverage',()=>{
 const changes=[(r,s,t)=>t.results[0].status='skipped',(r,s,t)=>t.expectedStatus='failed',(r,s,t)=>t.results.push({...t.results[0],retry:1}),(r,s,t)=>t.results[0].retry=1,r=>r.config.projects[0].repeatEach=2,r=>r.config.projects[0].retries=1];
 for(const change of changes)assert.throws(()=>inspectIdleReport(alter(change),'ui',runtime));
});
test('a duplicate declaration wrong layer or another browser cannot satisfy a current consumer',()=>{
 for(const change of [(r,s)=>r.suites[0].specs.push(structuredClone(s)),r=>r.config.rootDir='/isolated/web/persistence-tests',(r,s,t)=>t.projectName='webkit'])assert.throws(()=>inspectIdleReport(alter(change),'ui',runtime));
});
test('a newer failed case never falls back to an earlier green result',()=>{
 const good=inspectIdleReport(report(),'ui',runtime),bad=inspectIdleReport(alter((r,s,t)=>{s.ok=false;t.status='unexpected';t.results[0].status='failed';}),'ui',runtime);
 const proof=latestIdleResults([{name:'first',tests:good},{name:'later',tests:bad}]);assert.equal(proof.current.size,1);assert.equal([...proof.current.values()][0].test.results[0].status,'failed');assert.equal(proof.history[0].phase,'first');
});
test('an explicit later passing execution keeps the original failure in composite history',()=>{
 const bad=inspectIdleReport(alter((r,s,t)=>{s.ok=false;t.status='unexpected';t.results[0].status='timedOut';}),'ui',runtime),good=inspectIdleReport(report(),'ui',runtime);
 const proof=latestIdleResults([{name:'original',tests:bad},{name:'targeted',tests:good}]);assert.equal(proof.current.size,1);assert.equal([...proof.current.values()][0].phase,'targeted');assert.deepEqual(proof.history,[{identity:JSON.stringify(['ui','example.spec.ts','a pinned verifier fixture','chromium']),phase:'original',status:'timedOut',supersededBy:'targeted'}]);
});

test('current semantic mappings retain all original leaves and give numeric cases explicit boundaries',async()=>{
 const {idleRecoveryMatrix:matrix}=await import('./idle-recovery-matrix.mjs'),{idleNativeMigration:migration}=await import('./idle-recovery-native-migration.mjs'),{recoveryMatrix:legacy}=await import('./recovery-matrix.mjs');
 assert.deepEqual(Object.fromEntries(Object.entries(matrix.profiles).map(([k,v])=>[k,v.count])),{ui:171,persistence:415,journey:32});for(const pin of Object.values(matrix.profiles))assert.match(pin.signature,/^[a-f0-9]{64}$/);assert.equal(matrix.rows.length,20);assert.equal(matrix.rows.reduce((n,r)=>n+r.leaves.length,0),88);assert.deepEqual(matrix.rows.flatMap(r=>r.leaves.map(l=>l.legacy)),legacy.flatMap(r=>r.evidence));
 assert.equal(migration.includedLegacyTests.length+migration.supersededLegacyTests.length,82);for(const r of migration.supersededLegacyTests)for(const prefix of r.replacementTitlePrefixes)assert.ok(!/^M04-[UN]\d+$/.test(prefix),'N1 must not alias N10/N11');
});

function declarations(){
 const data=JSON.parse(fs.readFileSync(new URL('../goal-4/evidence/candidate-base-01/current-inventory.json',import.meta.url),'utf8')).inventories;
 return data.map(d=>({suite:d.suite,report:{config:{rootDir:'/isolated/web/'+({ui:'e2e',persistence:'persistence-tests',journey:'journey-tests'}[d.suite]),configFile:d.configuration,metadata:{runtimeDigest:runtime}},suites:[{specs:d.rows.map(r=>({file:r.file,title:r.title,tests:[{projectName:r.projectName}]}))}]}}));
}
test('v1 keeps its exact original inventory while v2 requires the complete broader inventory and all original UI consumers',()=>{
 const [broad,recovery,native,normal]=declarations();assert.equal(inspectIdleDeclarations(1,[recovery,native,normal],runtime).length,618);assert.equal(inspectIdleDeclarations(2,[broad,native,normal],runtime,recovery.report).length,1263);assert.throws(()=>inspectIdleDeclarations(1,[broad,native,normal],runtime),/reviewed profile/);
});
test('v2 rejects missing cases and same-count invented titles rather than certifying a reduced source inventory',()=>{
 for(const change of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs[0].title+=' invented']){const [broad,recovery,native,normal]=declarations();change(broad.report);assert.throws(()=>inspectIdleDeclarations(2,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);}
});
test('v2 cannot omit or replace the original reviewed recovery UI declaration',()=>{
 const [broad,recovery,native,normal]=declarations();assert.throws(()=>inspectIdleDeclarations(2,[broad,native,normal],runtime),/requires the original/);recovery.report.suites[0].specs[0].title+=' replaced';assert.throws(()=>inspectIdleDeclarations(2,[broad,native,normal],runtime,recovery.report),/Profile identities/);
});
test('v2 rejects wrong runtime metadata and duplicate named profiles',()=>{
 const [broad,recovery,native,normal]=declarations();assert.throws(()=>inspectIdleDeclarations(2,[broad,native,native],runtime,recovery.report),/Exactly one/);delete broad.report.config.metadata.runtimeDigest;assert.throws(()=>inspectIdleDeclarations(2,[broad,native,normal],runtime,recovery.report),/Declaration source runtime/);
});

function currentDeclarations(){const [broad,recovery,native,normal]=declarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-comprehensive-additions.json',import.meta.url)));broad.report.suites[0].specs.push(...extra.additions.map(r=>({file:r.file,title:r.title,tests:[{projectName:r.projectName}]})));return[broad,recovery,native,normal];}
test('v3 requires all fourteen new dialog and cross-task consumers while retaining the complete exact v2 and original recovery inventories',()=>{
 const [broad,recovery,native,normal]=currentDeclarations();assert.equal(inspectIdleDeclarations(3,[broad,native,normal],runtime,recovery.report).length,1277);assert.throws(()=>inspectIdleDeclarations(2,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
});
test('v3 cannot drop or relabel a new consumer, substitute an old consumer, or ignore original recovery source',()=>{
 for(const change of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced']){const[broad,recovery,native,normal]=currentDeclarations();change(broad.report);assert.throws(()=>inspectIdleDeclarations(3,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);}
 const[broad,recovery,native,normal]=currentDeclarations();assert.throws(()=>inspectIdleDeclarations(3,[broad,native,normal],runtime),/requires the original/);recovery.report.suites[0].specs[0].title+=' replacement';assert.throws(()=>inspectIdleDeclarations(3,[broad,native,normal],runtime,recovery.report),/Profile identities/);
});

function copyDeclarations() {
 const inventories=currentDeclarations();
 const extra=JSON.parse(fs.readFileSync(new URL('./idle-ux30-additions.json',import.meta.url)));
 inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({
  file:row.file,title:row.title,tests:[{projectName:row.projectName}],
 })));
 return inventories;
}

test('v4 retains the entire v3 inventory and all four real copy-disclosure consumers',()=>{
 const [broad,recovery,native,normal]=copyDeclarations();
 assert.equal(inspectIdleDeclarations(4,[broad,native,normal],runtime,recovery.report).length,1281);
 assert.throws(()=>inspectIdleDeclarations(3,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
 const [original,originalRecovery,originalNative,originalNormal]=currentDeclarations();
 assert.equal(inspectIdleDeclarations(3,[original,originalNative,originalNormal],runtime,originalRecovery.report).length,1277);
 assert.throws(()=>inspectIdleDeclarations(4,[original,originalNative,originalNormal],runtime,originalRecovery.report),/Profile declarations/);
});

test('v4 rejects missing duplicate or same-count substituted copy and original consumers',()=>{
 const mutations=[
  report=>report.suites[0].specs.pop(),
  report=>report.suites[0].specs.at(-1).title+=' invented',
  report=>report.suites[0].specs[0].title+=' replaced',
  report=>report.suites[0].specs.splice(-1,1,structuredClone(report.suites[0].specs.at(-2))),
 ];
 for(const mutate of mutations){
  const [broad,recovery,native,normal]=copyDeclarations();
  mutate(broad.report);
  assert.throws(()=>inspectIdleDeclarations(4,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);
 }
});

test('v4 requires the original recovery declaration and exact current runtime and suite ownership',()=>{
 const [broad,recovery,native,normal]=copyDeclarations();
 assert.throws(()=>inspectIdleDeclarations(4,[broad,native,normal],runtime),/requires the original/);
 assert.throws(()=>inspectIdleDeclarations(4,[broad,native,native],runtime,recovery.report),/Exactly one/);
 assert.throws(()=>inspectIdleDeclarations(4,[broad,native,normal],'b'.repeat(64),recovery.report),/runtime differs/);
 recovery.report.suites[0].specs[0].title+=' replaced';
 assert.throws(()=>inspectIdleDeclarations(4,[broad,native,normal],runtime,recovery.report),/Profile identities/);
});

function readabilityDeclarations(){
 const inventories=copyDeclarations();
 const extra=JSON.parse(fs.readFileSync(new URL('./idle-ux31-additions.json',import.meta.url)));
 inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));
 return inventories;
}
test('v5 retains all original v4 consumers and requires all four real readability scenarios',()=>{
 const [broad,recovery,native,normal]=readabilityDeclarations();
 assert.equal(inspectIdleDeclarations(5,[broad,native,normal],runtime,recovery.report).length,1285);
 assert.throws(()=>inspectIdleDeclarations(4,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
 const [old,oldRecovery,oldNative,oldNormal]=copyDeclarations();
 assert.equal(inspectIdleDeclarations(4,[old,oldNative,oldNormal],runtime,oldRecovery.report).length,1281);
 assert.throws(()=>inspectIdleDeclarations(5,[old,oldNative,oldNormal],runtime,oldRecovery.report),/Profile declarations/);
});
test('v5 rejects missing duplicate invented or replaced consumers without weakening the original inventories',()=>{
 for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){
  const [broad,recovery,native,normal]=readabilityDeclarations();mutate(broad.report);
  assert.throws(()=>inspectIdleDeclarations(5,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);
 }
});
test('v5 preserves original recovery declaration runtime and suite ownership requirements',()=>{
 const [broad,recovery,native,normal]=readabilityDeclarations();
 assert.throws(()=>inspectIdleDeclarations(5,[broad,native,normal],runtime),/requires the original/);
 assert.throws(()=>inspectIdleDeclarations(5,[broad,native,native],runtime,recovery.report),/Exactly one/);
 assert.throws(()=>inspectIdleDeclarations(5,[broad,native,normal],'b'.repeat(64),recovery.report),/runtime differs/);
 recovery.report.suites[0].specs[0].title+=' replaced';
 assert.throws(()=>inspectIdleDeclarations(5,[broad,native,normal],runtime,recovery.report),/Profile identities/);
});

function marketCopyDeclarations(){
 const inventories=readabilityDeclarations();
 const extra=JSON.parse(fs.readFileSync(new URL('./idle-ux32-additions.json',import.meta.url)));
 inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));
 return inventories;
}
test('v6 retains all original v5 consumers and requires six market copy scenarios',()=>{
 const [broad,recovery,native,normal]=marketCopyDeclarations();
 assert.equal(inspectIdleDeclarations(6,[broad,native,normal],runtime,recovery.report).length,1291);
 assert.throws(()=>inspectIdleDeclarations(5,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
 const [old,oldRecovery,oldNative,oldNormal]=readabilityDeclarations();
 assert.equal(inspectIdleDeclarations(5,[old,oldNative,oldNormal],runtime,oldRecovery.report).length,1285);
 assert.throws(()=>inspectIdleDeclarations(6,[old,oldNative,oldNormal],runtime,oldRecovery.report),/Profile declarations/);
});
test('v6 rejects missing duplicate invented or replaced consumers without weakening old inventories',()=>{
 for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){
  const [broad,recovery,native,normal]=marketCopyDeclarations();mutate(broad.report);
  assert.throws(()=>inspectIdleDeclarations(6,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);
 }
});
test('v6 preserves original recovery declaration runtime and suite ownership',()=>{
 const [broad,recovery,native,normal]=marketCopyDeclarations();
 assert.throws(()=>inspectIdleDeclarations(6,[broad,native,normal],runtime),/requires the original/);
 assert.throws(()=>inspectIdleDeclarations(6,[broad,native,native],runtime,recovery.report),/Exactly one/);
 assert.throws(()=>inspectIdleDeclarations(6,[broad,native,normal],'b'.repeat(64),recovery.report),/runtime differs/);
 recovery.report.suites[0].specs[0].title+=' replaced';
 assert.throws(()=>inspectIdleDeclarations(6,[broad,native,normal],runtime,recovery.report),/Profile identities/);
});

function statusDeclarations(){
 const inventories=marketCopyDeclarations();
 const extra=JSON.parse(fs.readFileSync(new URL('./idle-ux33-additions.json',import.meta.url)));
 inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));
 return inventories;
}
test('v7 retains all original v6 consumers and requires seven status clarity scenarios',()=>{
 const [broad,recovery,native,normal]=statusDeclarations();
 assert.equal(inspectIdleDeclarations(7,[broad,native,normal],runtime,recovery.report).length,1298);
 assert.throws(()=>inspectIdleDeclarations(6,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
 const [old,oldRecovery,oldNative,oldNormal]=marketCopyDeclarations();
 assert.equal(inspectIdleDeclarations(6,[old,oldNative,oldNormal],runtime,oldRecovery.report).length,1291);
 assert.throws(()=>inspectIdleDeclarations(7,[old,oldNative,oldNormal],runtime,oldRecovery.report),/Profile declarations/);
});
test('v7 rejects missing duplicate invented or replaced consumers without weakening old inventories',()=>{
 for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){
  const [broad,recovery,native,normal]=statusDeclarations();mutate(broad.report);
  assert.throws(()=>inspectIdleDeclarations(7,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);
 }
});
test('v7 preserves original recovery declaration runtime and suite ownership',()=>{
 const [broad,recovery,native,normal]=statusDeclarations();
 assert.throws(()=>inspectIdleDeclarations(7,[broad,native,normal],runtime),/requires the original/);
 assert.throws(()=>inspectIdleDeclarations(7,[broad,native,native],runtime,recovery.report),/Exactly one/);
 assert.throws(()=>inspectIdleDeclarations(7,[broad,native,normal],'b'.repeat(64),recovery.report),/runtime differs/);
 recovery.report.suites[0].specs[0].title+=' replaced';
 assert.throws(()=>inspectIdleDeclarations(7,[broad,native,normal],runtime,recovery.report),/Profile identities/);
});

function combinationDeclarations(){
 const inventories=statusDeclarations();
 const extra=JSON.parse(fs.readFileSync(new URL('./idle-check-ux31-33-additions.json',import.meta.url)));
 inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));
 return inventories;
}
test('v8 retains every v7 consumer and adds the three exact combination checks',()=>{
 const [broad,recovery,native,normal]=combinationDeclarations();
 assert.equal(inspectIdleDeclarations(8,[broad,native,normal],runtime,recovery.report).length,1301);
 assert.throws(()=>inspectIdleDeclarations(7,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
 const [old,oldRecovery,oldNative,oldNormal]=statusDeclarations();
 assert.equal(inspectIdleDeclarations(7,[old,oldNative,oldNormal],runtime,oldRecovery.report).length,1298);
 assert.throws(()=>inspectIdleDeclarations(8,[old,oldNative,oldNormal],runtime,oldRecovery.report),/Profile declarations/);
});
test('v8 refuses missing duplicate or invented combinations and replaced parent consumers',()=>{
 for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){
  const [broad,recovery,native,normal]=combinationDeclarations();mutate(broad.report);
  assert.throws(()=>inspectIdleDeclarations(8,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);
 }
});
test('v8 keeps original recovery source runtime and suite ownership mandatory',()=>{
 const [broad,recovery,native,normal]=combinationDeclarations();
 assert.throws(()=>inspectIdleDeclarations(8,[broad,native,normal],runtime),/requires the original/);
 assert.throws(()=>inspectIdleDeclarations(8,[broad,native,native],runtime,recovery.report),/Exactly one/);
 assert.throws(()=>inspectIdleDeclarations(8,[broad,native,normal],'b'.repeat(64),recovery.report),/runtime differs/);
 recovery.report.suites[0].specs[0].title+=' replaced';
 assert.throws(()=>inspectIdleDeclarations(8,[broad,native,normal],runtime,recovery.report),/Profile identities/);
});

function ongoingDeclarations(){
 const inventories=combinationDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir33-01-additions.json',import.meta.url)));
 inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return inventories;
}
test('v9 preserves all v8 identities with five real ongoing-stage consumers',()=>{
 const [broad,recovery,native,normal]=ongoingDeclarations();assert.equal(inspectIdleDeclarations(9,[broad,native,normal],runtime,recovery.report).length,1306);
 assert.throws(()=>inspectIdleDeclarations(8,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
 const [old,oldRecovery,oldNative,oldNormal]=combinationDeclarations();assert.equal(inspectIdleDeclarations(8,[old,oldNative,oldNormal],runtime,oldRecovery.report).length,1301);
});
test('v9 rejects missing invented duplicate or replaced ongoing and original consumers',()=>{
 for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){
  const [broad,recovery,native,normal]=ongoingDeclarations();mutate(broad.report);assert.throws(()=>inspectIdleDeclarations(9,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);
 }
});
test('v9 retains exact runtime and full original recovery obligation',()=>{
 const [broad,recovery,native,normal]=ongoingDeclarations();assert.throws(()=>inspectIdleDeclarations(9,[broad,native,normal],runtime),/requires the original/);
 assert.throws(()=>inspectIdleDeclarations(9,[broad,native,normal],'b'.repeat(64),recovery.report),/runtime differs/);
 assert.throws(()=>inspectIdleDeclarations(9,[broad,native,native],runtime,recovery.report),/Exactly one/);
});

function localExplorationDeclarations(){
 const inventories=ongoingDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir33-02-additions.json',import.meta.url)));
 inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return inventories;
}
test('v10 preserves every v9 consumer and adds five exact local exploration cases',()=>{
 const [broad,recovery,native,normal]=localExplorationDeclarations();assert.equal(inspectIdleDeclarations(10,[broad,native,normal],runtime,recovery.report).length,1311);
 assert.throws(()=>inspectIdleDeclarations(9,[broad,native,normal],runtime,recovery.report),/Profile declarations/);
 const [old,oldRecovery,oldNative,oldNormal]=ongoingDeclarations();assert.equal(inspectIdleDeclarations(9,[old,oldNative,oldNormal],runtime,oldRecovery.report).length,1306);
});
test('v10 rejects missing duplicate renamed or replaced local and old consumers',()=>{
 for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){
  const [broad,recovery,native,normal]=localExplorationDeclarations();mutate(broad.report);assert.throws(()=>inspectIdleDeclarations(10,[broad,native,normal],runtime,recovery.report),/Profile declarations|Profile identities/);
 }
});
test('v10 still requires the exact runtime full recovery and correct suite owner',()=>{
 const [broad,recovery,native,normal]=localExplorationDeclarations();assert.throws(()=>inspectIdleDeclarations(10,[broad,native,normal],runtime),/requires the original/);
 assert.throws(()=>inspectIdleDeclarations(10,[broad,native,normal],'b'.repeat(64),recovery.report),/runtime differs/);
 assert.throws(()=>inspectIdleDeclarations(10,[broad,native,native],runtime,recovery.report),/Exactly one/);
});

test('the real outer verifier recognizes v9 through v12 but cannot accept their unexecuted inventories',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chenyuan-local-matrix-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const save=(name,value)=>{const raw=JSON.stringify(value),file=path.join(dir,name);fs.writeFileSync(file,raw);return{path:name,sha256:createHash('sha256').update(raw).digest('hex')};};
 for(const version of [9,10,11,12]){
  const [broad,recovery,native,normal]=version===9?ongoingDeclarations():version===10?localExplorationDeclarations():version===11?studyNotesDeclarations():uirCombinationDeclarations();
  const manifest={format:'chenyuan-idle-matrix-inputs',version,runtime,scope:{browser:'chromium',viewport:{width:1440,height:900},fontScale:1},phases:[],declarations:[broad,native,normal].map(d=>({suite:d.suite,report:save(version+'-'+d.suite+'.json',d.report)})),recoveryUIDeclaration:save(version+'-recovery.json',recovery.report)};
  const file=path.join(dir,'manifest.json');fs.writeFileSync(file,JSON.stringify(manifest));assert.throws(()=>verifyIdleMatrixCoverage(file),/Current normal\/UI\/native inventory is incomplete/);
  for(const invalid of [0,13]){fs.writeFileSync(file,JSON.stringify({...manifest,version:invalid}));assert.throws(()=>verifyIdleMatrixCoverage(file),/Unknown idle matrix version/);}
 }
});

function studyNotesDeclarations(){const inventories=localExplorationDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir33-04-additions.json',import.meta.url)));inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return inventories;}
test('v11 retains every previous source case and adds five study-book consumers',()=>{const [broad,recovery,native,normal]=studyNotesDeclarations();assert.equal(inspectIdleDeclarations(11,[broad,native,normal],runtime,recovery.report).length,1316);assert.throws(()=>inspectIdleDeclarations(10,[broad,native,normal],runtime,recovery.report),/Profile declarations/);const [old,r,n,j]=localExplorationDeclarations();assert.equal(inspectIdleDeclarations(10,[old,n,j],runtime,r.report).length,1311);});
test('v11 refuses missing duplicate renamed and replaced consumers',()=>{for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const [b,r,n,j]=studyNotesDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(11,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v11 keeps exact runtime original recovery and unique suite ownership',()=>{const [b,r,n,j]=studyNotesDeclarations();assert.throws(()=>inspectIdleDeclarations(11,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(11,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(11,[b,n,n],runtime,r.report),/Exactly one/);});

function uirCombinationDeclarations(){const inventories=studyNotesDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-uir33-01-additions.json',import.meta.url)));inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return inventories;}
test('v12 retains every v11 identity and adds the three actual UIR combinations',()=>{const [b,r,n,j]=uirCombinationDeclarations();assert.equal(inspectIdleDeclarations(12,[b,n,j],runtime,r.report).length,1319);assert.throws(()=>inspectIdleDeclarations(11,[b,n,j],runtime,r.report),/Profile declarations/);const [old,rr,nn,jj]=studyNotesDeclarations();assert.equal(inspectIdleDeclarations(11,[old,nn,jj],runtime,rr.report).length,1316);});
test('v12 rejects missing duplicate renamed and replaced source consumers',()=>{for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const [b,r,n,j]=uirCombinationDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(12,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v12 still enforces exact source runtime full recovery and unique suite ownership',()=>{const [b,r,n,j]=uirCombinationDeclarations();assert.throws(()=>inspectIdleDeclarations(12,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(12,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(12,[b,n,n],runtime,r.report),/Exactly one/);});
