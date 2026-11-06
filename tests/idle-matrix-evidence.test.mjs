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

test('the real outer verifier recognizes v9 through v36 but cannot accept their unexecuted inventories',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chenyuan-local-matrix-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const save=(name,value)=>{const raw=JSON.stringify(value),file=path.join(dir,name);fs.writeFileSync(file,raw);return{path:name,sha256:createHash('sha256').update(raw).digest('hex')};};
 for(const version of [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]){
  const [broad,recovery,native,normal]=version===9?ongoingDeclarations():version===10?localExplorationDeclarations():version===11?studyNotesDeclarations():version===12?uirCombinationDeclarations():version===13?activityDetailDeclarations():version===14?lifeEntryDeclarations():version===15?outcomeDeclarations():version===16?secondCheckDeclarations():version===17?alchemyArrangementDeclarations():version===18?lifespanGuidanceDeclarations():version===19?lifespanAlchemyDeclarations():version===20?finiteFocusDeclarations():version===21?configurationFocusDeclarations():version===22?resumeWordingDeclarations():version===23?confirmConfigurationDeclarations():version===24?trialLifeFocusDeclarations():version===25?characterFolioDeclarations():version===26?fateClarityDeclarations():version===27?finalUICombinationDeclarations():version===28?goalAuthorizationDeclarations():version===29?cultivationFallbackDeclarations():version===30?ui35FeedbackDeclarations():version===31?savedProgressDeclarations():version===32?medicineSummaryDeclarations():version===33?sourceStateDeclarations():version===34?openingResponseDeclarations():version===35?travelPassageDeclarations():forecastContextDeclarations();
  const manifest={format:'chenyuan-idle-matrix-inputs',version,runtime,scope:{browser:'chromium',viewport:{width:1440,height:900},fontScale:1},phases:[],declarations:[broad,native,normal].map(d=>({suite:d.suite,report:save(version+'-'+d.suite+'.json',d.report)})),recoveryUIDeclaration:save(version+'-recovery.json',recovery.report)};
  const file=path.join(dir,'manifest.json');fs.writeFileSync(file,JSON.stringify(manifest));assert.throws(()=>verifyIdleMatrixCoverage(file),/Current normal\/UI\/native inventory is incomplete/);
  for(const invalid of [0,37]){fs.writeFileSync(file,JSON.stringify({...manifest,version:invalid}));assert.throws(()=>verifyIdleMatrixCoverage(file),/Unknown idle matrix version/);}
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

function activityDetailDeclarations(){const inventories=uirCombinationDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir33-05-additions.json',import.meta.url)));inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return inventories;}
test('v13 preserves all original identities and adds ten activity detail cases',()=>{const [b,r,n,j]=activityDetailDeclarations();assert.equal(inspectIdleDeclarations(13,[b,n,j],runtime,r.report).length,1329);assert.throws(()=>inspectIdleDeclarations(12,[b,n,j],runtime,r.report),/Profile declarations/);const [old,rr,nn,jj]=uirCombinationDeclarations();assert.equal(inspectIdleDeclarations(12,[old,nn,jj],runtime,rr.report).length,1319);});
test('v13 rejects missing duplicate renamed or replaced consumers',()=>{for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const [b,r,n,j]=activityDetailDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(13,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v13 retains original recovery source runtime and unique suites',()=>{const [b,r,n,j]=activityDetailDeclarations();assert.throws(()=>inspectIdleDeclarations(13,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(13,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(13,[b,n,n],runtime,r.report),/Exactly one/);});

function lifeEntryDeclarations(){const inventories=activityDetailDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir33-06-additions.json',import.meta.url)));inventories[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return inventories;}
test('v14 preserves the full previous inventory and adds seven factual life entry cases',()=>{const [b,r,n,j]=lifeEntryDeclarations();assert.equal(inspectIdleDeclarations(14,[b,n,j],runtime,r.report).length,1336);assert.throws(()=>inspectIdleDeclarations(13,[b,n,j],runtime,r.report),/Profile declarations/);const [old,rr,nn,jj]=activityDetailDeclarations();assert.equal(inspectIdleDeclarations(13,[old,nn,jj],runtime,rr.report).length,1329);});
test('v14 rejects missing duplicate renamed or replaced life entry identities',()=>{for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const [b,r,n,j]=lifeEntryDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(14,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v14 keeps the original recovery declaration source identity and unique suite ownership',()=>{const [b,r,n,j]=lifeEntryDeclarations();assert.throws(()=>inspectIdleDeclarations(14,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(14,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(14,[b,n,n],runtime,r.report),/Exactly one/);});

function outcomeDeclarations(){const v=lifeEntryDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir33-07-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v15 retains the complete previous matrix and four actual outcome consumers',()=>{const [b,r,n,j]=outcomeDeclarations();assert.equal(inspectIdleDeclarations(15,[b,n,j],runtime,r.report).length,1340);assert.throws(()=>inspectIdleDeclarations(14,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v15 rejects missing duplicated renamed or replaced consumers',()=>{for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const [b,r,n,j]=outcomeDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(15,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v15 still requires source runtime original recovery and unique suites',()=>{const [b,r,n,j]=outcomeDeclarations();assert.throws(()=>inspectIdleDeclarations(15,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(15,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(15,[b,n,n],runtime,r.report),/Exactly one/);});

function secondCheckDeclarations(){const v=outcomeDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-uir33-02-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v16 retains all previous cases and adds four actual second-check combinations',()=>{const [b,r,n,j]=secondCheckDeclarations();assert.equal(inspectIdleDeclarations(16,[b,n,j],runtime,r.report).length,1344);assert.throws(()=>inspectIdleDeclarations(15,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v16 refuses missing duplicated renamed and replaced consumers',()=>{for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const [b,r,n,j]=secondCheckDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(16,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v16 retains runtime original recovery and unique suite obligations',()=>{const [b,r,n,j]=secondCheckDeclarations();assert.throws(()=>inspectIdleDeclarations(16,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(16,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(16,[b,n,n],runtime,r.report),/Exactly one/);});

function alchemyArrangementDeclarations(){const v=secondCheckDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir33-08-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v17 retains every v16 identity and adds three actual alchemy hierarchy cases',()=>{const[b,r,n,j]=alchemyArrangementDeclarations();assert.equal(inspectIdleDeclarations(17,[b,n,j],runtime,r.report).length,1347);assert.throws(()=>inspectIdleDeclarations(16,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v17 rejects missing duplicate renamed or replaced current and original consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=alchemyArrangementDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(17,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v17 retains runtime original recovery and unique suite obligations',()=>{const[b,r,n,j]=alchemyArrangementDeclarations();assert.throws(()=>inspectIdleDeclarations(17,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(17,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(17,[b,n,n],runtime,r.report),/Exactly one/);});

function lifespanGuidanceDeclarations(){const v=alchemyArrangementDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir34-01-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v18 retains all v17 cases and eight permanent lifespan boundary cases',()=>{const[b,r,n,j]=lifespanGuidanceDeclarations();assert.equal(inspectIdleDeclarations(18,[b,n,j],runtime,r.report).length,1355);assert.throws(()=>inspectIdleDeclarations(17,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v18 refuses missing duplicate renamed and replaced new and original consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=lifespanGuidanceDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(18,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v18 requires the exact runtime original recovery and unique full suite inventories',()=>{const[b,r,n,j]=lifespanGuidanceDeclarations();assert.throws(()=>inspectIdleDeclarations(18,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(18,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(18,[b,n,n],runtime,r.report),/Exactly one/);});

function lifespanAlchemyDeclarations(){const v=lifespanGuidanceDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-lifespan-alchemy-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v19 retains every v18 consumer and requires three actual lifespan alchemy combinations',()=>{const[b,r,n,j]=lifespanAlchemyDeclarations();assert.equal(inspectIdleDeclarations(19,[b,n,j],runtime,r.report).length,1358);assert.throws(()=>inspectIdleDeclarations(18,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v19 refuses missing duplicate renamed or replaced old and new consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=lifespanAlchemyDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(19,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v19 retains source runtime recovery and unique full-suite obligations',()=>{const[b,r,n,j]=lifespanAlchemyDeclarations();assert.throws(()=>inspectIdleDeclarations(19,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(19,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(19,[b,n,n],runtime,r.report),/Exactly one/);});

function finiteFocusDeclarations(){const v=lifespanAlchemyDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir34-02-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v20 retains all v19 identities and six real finite choice focus consumers',()=>{const[b,r,n,j]=finiteFocusDeclarations();assert.equal(inspectIdleDeclarations(20,[b,n,j],runtime,r.report).length,1364);assert.throws(()=>inspectIdleDeclarations(19,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v20 rejects missing duplicate renamed and replaced current and original consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=finiteFocusDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(20,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v20 requires the exact runtime original recovery and unique full suite inventories',()=>{const[b,r,n,j]=finiteFocusDeclarations();assert.throws(()=>inspectIdleDeclarations(20,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(20,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(20,[b,n,n],runtime,r.report),/Exactly one/);});

function configurationFocusDeclarations(){const v=finiteFocusDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir34-03-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v21 retains all v20 identities and four actual configuration focus consumers',()=>{const[b,r,n,j]=configurationFocusDeclarations();assert.equal(inspectIdleDeclarations(21,[b,n,j],runtime,r.report).length,1368);assert.throws(()=>inspectIdleDeclarations(20,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v21 rejects missing duplicate renamed and replaced original and new consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=configurationFocusDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(21,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v21 requires the same runtime recovery and unique complete suites',()=>{const[b,r,n,j]=configurationFocusDeclarations();assert.throws(()=>inspectIdleDeclarations(21,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(21,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(21,[b,n,n],runtime,r.report),/Exactly one/);});

function resumeWordingDeclarations(){const v=configurationFocusDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir34-04-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v22 retains every v21 identity and four actual finite resume boundary consumers',()=>{const[b,r,n,j]=resumeWordingDeclarations();assert.equal(inspectIdleDeclarations(22,[b,n,j],runtime,r.report).length,1372);assert.throws(()=>inspectIdleDeclarations(21,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v22 rejects missing duplicate renamed or replaced old and new consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=resumeWordingDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(22,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v22 requires the current runtime original recovery and unique full suites',()=>{const[b,r,n,j]=resumeWordingDeclarations();assert.throws(()=>inspectIdleDeclarations(22,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(22,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(22,[b,n,n],runtime,r.report),/Exactly one/);});

function confirmConfigurationDeclarations(){const v=resumeWordingDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-uir34-02-04-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v23 retains every v22 identity and three actual confirmation configuration resume combinations',()=>{const[b,r,n,j]=confirmConfigurationDeclarations();assert.equal(inspectIdleDeclarations(23,[b,n,j],runtime,r.report).length,1375);assert.throws(()=>inspectIdleDeclarations(22,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v23 rejects missing duplicate renamed and replaced old and new consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=confirmConfigurationDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(23,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v23 requires exact runtime original recovery and unique full suites',()=>{const[b,r,n,j]=confirmConfigurationDeclarations();assert.throws(()=>inspectIdleDeclarations(23,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(23,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(23,[b,n,n],runtime,r.report),/Exactly one/);});

function trialLifeFocusDeclarations(){const v=confirmConfigurationDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir34-05-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v24 retains all v23 consumers and five actual trial and life confirmation consumers',()=>{const[b,r,n,j]=trialLifeFocusDeclarations();assert.equal(inspectIdleDeclarations(24,[b,n,j],runtime,r.report).length,1380);assert.throws(()=>inspectIdleDeclarations(23,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v24 rejects missing duplicate renamed and replaced new or original consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=trialLifeFocusDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(24,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v24 retains exact runtime original recovery and unique full-suite obligations',()=>{const[b,r,n,j]=trialLifeFocusDeclarations();assert.throws(()=>inspectIdleDeclarations(24,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(24,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(24,[b,n,n],runtime,r.report),/Exactly one/);});

function characterFolioDeclarations(){const v=trialLifeFocusDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir34-06-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v25 keeps all v24 consumers and six exact character folio cases',()=>{const[b,r,n,j]=characterFolioDeclarations();assert.equal(inspectIdleDeclarations(25,[b,n,j],runtime,r.report).length,1386);assert.throws(()=>inspectIdleDeclarations(24,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v25 rejects missing duplicate renamed and replaced old or new cases',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=characterFolioDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(25,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v25 requires exact runtime original recovery and unique full profiles',()=>{const[b,r,n,j]=characterFolioDeclarations();assert.throws(()=>inspectIdleDeclarations(25,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(25,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(25,[b,n,n],runtime,r.report),/Exactly one/);});

function fateClarityDeclarations(){const v=characterFolioDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir34-07-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v26 retains v25 and five factual fate clarity and finite response consumers',()=>{const[b,r,n,j]=fateClarityDeclarations();assert.equal(inspectIdleDeclarations(26,[b,n,j],runtime,r.report).length,1391);assert.throws(()=>inspectIdleDeclarations(25,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v26 rejects missing duplicate renamed and replaced prior or new consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=fateClarityDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(26,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v26 retains exact runtime original recovery and complete source profile obligations',()=>{const[b,r,n,j]=fateClarityDeclarations();assert.throws(()=>inspectIdleDeclarations(26,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(26,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(26,[b,n,n],runtime,r.report),/Exactly one/);});

function finalUICombinationDeclarations(){const v=fateClarityDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-uir34-05-07-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v27 retains all v26 identities and three real final UI combinations',()=>{const[b,r,n,j]=finalUICombinationDeclarations();assert.equal(inspectIdleDeclarations(27,[b,n,j],runtime,r.report).length,1394);assert.throws(()=>inspectIdleDeclarations(26,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v27 rejects missing duplicated renamed and replaced original or new consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=finalUICombinationDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(27,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v27 requires same runtime original recovery and unique complete source profiles',()=>{const[b,r,n,j]=finalUICombinationDeclarations();assert.throws(()=>inspectIdleDeclarations(27,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(27,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(27,[b,n,n],runtime,r.report),/Exactly one/);});

function goalAuthorizationDeclarations(){const v=finalUICombinationDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir35-01-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v28 preserves every v27 identity and three exact growth authorization consumers',()=>{const[b,r,n,j]=goalAuthorizationDeclarations();assert.equal(inspectIdleDeclarations(28,[b,n,j],runtime,r.report).length,1397);assert.throws(()=>inspectIdleDeclarations(27,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v28 rejects missing duplicated renamed and replaced new or original consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=goalAuthorizationDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(28,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v28 retains exact runtime original recovery and unique complete suite obligations',()=>{const[b,r,n,j]=goalAuthorizationDeclarations();assert.throws(()=>inspectIdleDeclarations(28,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(28,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(28,[b,n,n],runtime,r.report),/Exactly one/);});

function cultivationFallbackDeclarations(){const v=goalAuthorizationDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir35-02-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v29 keeps all v28 identities and four exact cultivation fallback consumers',()=>{const[b,r,n,j]=cultivationFallbackDeclarations();assert.equal(inspectIdleDeclarations(29,[b,n,j],runtime,r.report).length,1401);assert.throws(()=>inspectIdleDeclarations(28,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v29 rejects missing duplicate renamed or replaced original and fallback consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=cultivationFallbackDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(29,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v29 retains original recovery exact runtime and unique complete suite obligations',()=>{const[b,r,n,j]=cultivationFallbackDeclarations();assert.throws(()=>inspectIdleDeclarations(29,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(29,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(29,[b,n,n],runtime,r.report),/Exactly one/);});

function ui35FeedbackDeclarations(){const v=cultivationFallbackDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-ui35-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v30 retains all v29 identities and three current receipt feedback combinations',()=>{const[b,r,n,j]=ui35FeedbackDeclarations();assert.equal(inspectIdleDeclarations(30,[b,n,j],runtime,r.report).length,1404);assert.throws(()=>inspectIdleDeclarations(29,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v30 rejects missing duplicated renamed and replaced old or new feedback consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=ui35FeedbackDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(30,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v30 retains original recovery exact runtime and unique full suite obligations',()=>{const[b,r,n,j]=ui35FeedbackDeclarations();assert.throws(()=>inspectIdleDeclarations(30,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(30,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(30,[b,n,n],runtime,r.report),/Exactly one/);});

function savedProgressDeclarations(){const v=ui35FeedbackDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir35-03-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v31 retains all v30 identities and three actual saved progress consumers',()=>{const[b,r,n,j]=savedProgressDeclarations();assert.equal(inspectIdleDeclarations(31,[b,n,j],runtime,r.report).length,1407);assert.throws(()=>inspectIdleDeclarations(30,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v31 rejects missing duplicated renamed and replaced old or new progress consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=savedProgressDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(31,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v31 retains original recovery exact runtime and unique complete suite obligations',()=>{const[b,r,n,j]=savedProgressDeclarations();assert.throws(()=>inspectIdleDeclarations(31,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(31,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(31,[b,n,n],runtime,r.report),/Exactly one/);});

function medicineSummaryDeclarations(){const v=savedProgressDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-uir35-04-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v32 retains all v31 identities and four real medicine summary consumers',()=>{const[b,r,n,j]=medicineSummaryDeclarations();assert.equal(inspectIdleDeclarations(32,[b,n,j],runtime,r.report).length,1411);assert.throws(()=>inspectIdleDeclarations(31,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v32 rejects missing duplicated renamed and replaced old or new medicine consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=medicineSummaryDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(32,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v32 retains original recovery exact runtime and unique complete suite obligations',()=>{const[b,r,n,j]=medicineSummaryDeclarations();assert.throws(()=>inspectIdleDeclarations(32,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(32,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(32,[b,n,n],runtime,r.report),/Exactly one/);});

 function sourceStateDeclarations(){const v=medicineSummaryDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-ui35-source-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
 test('v33 retains all v32 identities and three actual source state combinations',()=>{const[b,r,n,j]=sourceStateDeclarations();assert.equal(inspectIdleDeclarations(33,[b,n,j],runtime,r.report).length,1414);assert.throws(()=>inspectIdleDeclarations(32,[b,n,j],runtime,r.report),/Profile declarations/);});
 test('v33 rejects missing duplicated renamed and replaced original or source state consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=sourceStateDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(33,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
 test('v33 retains original recovery runtime and unique complete suite obligations',()=>{const[b,r,n,j]=sourceStateDeclarations();assert.throws(()=>inspectIdleDeclarations(33,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(33,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(33,[b,n,n],runtime,r.report),/Exactly one/);});

 function openingResponseDeclarations(){const v=sourceStateDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-cend06-f02a-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
 test('v34 retains all v33 identities and five original opening response combinations',()=>{const[b,r,n,j]=openingResponseDeclarations();assert.equal(inspectIdleDeclarations(34,[b,n,j],runtime,r.report).length,1419);assert.throws(()=>inspectIdleDeclarations(33,[b,n,j],runtime,r.report),/Profile declarations/);});
 test('v34 rejects missing duplicated renamed and replaced original or opening consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=openingResponseDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(34,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
 test('v34 retains original recovery runtime and unique complete suite obligations',()=>{const[b,r,n,j]=openingResponseDeclarations();assert.throws(()=>inspectIdleDeclarations(34,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(34,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(34,[b,n,n],runtime,r.report),/Exactly one/);});

 function travelPassageDeclarations(){const v=openingResponseDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-cend06-f02b-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
 test('v35 retains all v34 identities and five actual travel passage combinations',()=>{const[b,r,n,j]=travelPassageDeclarations();assert.equal(inspectIdleDeclarations(35,[b,n,j],runtime,r.report).length,1424);assert.throws(()=>inspectIdleDeclarations(34,[b,n,j],runtime,r.report),/Profile declarations/);});
 test('v35 rejects missing duplicated renamed and replaced original or travel passage consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=travelPassageDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(35,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
 test('v35 retains original recovery runtime and unique complete suite obligations',()=>{const[b,r,n,j]=travelPassageDeclarations();assert.throws(()=>inspectIdleDeclarations(35,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(35,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(35,[b,n,n],runtime,r.report),/Exactly one/);});

function forecastContextDeclarations(){const v=travelPassageDeclarations(),extra=JSON.parse(fs.readFileSync(new URL('./idle-check-cend07-additions.json',import.meta.url)));v[0].report.suites[0].specs.push(...extra.additions.map(row=>({file:row.file,title:row.title,tests:[{projectName:row.projectName}]})));return v;}
test('v36 retains every v35 consumer and three actual forecast context combinations',()=>{const[b,r,n,j]=forecastContextDeclarations();assert.equal(inspectIdleDeclarations(36,[b,n,j],runtime,r.report).length,1427);assert.throws(()=>inspectIdleDeclarations(35,[b,n,j],runtime,r.report),/Profile declarations/);});
test('v36 rejects missing duplicate renamed or replaced original and forecast consumers',()=>{for(const mutate of[r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.at(-1).title+=' invented',r=>r.suites[0].specs[0].title+=' replaced',r=>r.suites[0].specs.splice(-1,1,structuredClone(r.suites[0].specs.at(-2)))]){const[b,r,n,j]=forecastContextDeclarations();mutate(b.report);assert.throws(()=>inspectIdleDeclarations(36,[b,n,j],runtime,r.report),/Profile declarations|Profile identities/);}});
test('v36 retains original recovery runtime and unique complete suite obligations',()=>{const[b,r,n,j]=forecastContextDeclarations();assert.throws(()=>inspectIdleDeclarations(36,[b,n,j],runtime),/requires the original/);assert.throws(()=>inspectIdleDeclarations(36,[b,n,j],'b'.repeat(64),r.report),/runtime differs/);assert.throws(()=>inspectIdleDeclarations(36,[b,n,n],runtime,r.report),/Exactly one/);});
