import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {flattenRecoveryReport} from './check-recovery-coverage.mjs';
import {recoveryMatrix} from '../tests/recovery-matrix.mjs';
import {idleRecoveryMatrix,idleComprehensiveProfiles} from '../tests/idle-recovery-matrix.mjs';
import {idleNativeMigration} from '../tests/idle-recovery-native-migration.mjs';
import {ascensionMatrix} from '../tests/ascension-matrix.mjs';
const repositoryRoot=fileURLToPath(new URL('../',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const key=r=>JSON.stringify([r.suite,r.file,r.title,r.projectName??'chromium']);
const additions=JSON.parse(fs.readFileSync(new URL('../tests/idle-comprehensive-additions.json',import.meta.url)));
const copyAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-ux30-additions.json',import.meta.url)));
const readabilityAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-ux31-additions.json',import.meta.url)));
const marketCopyAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-ux32-additions.json',import.meta.url)));
const statusAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-ux33-additions.json',import.meta.url)));
const combinationAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-ux31-33-additions.json',import.meta.url)));
const ongoingAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir33-01-additions.json',import.meta.url)));
const localExplorationAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir33-02-additions.json',import.meta.url)));
const studyNotesAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir33-04-additions.json',import.meta.url)));
const uirCombinationAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-uir33-01-additions.json',import.meta.url)));
const activityDetailAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir33-05-additions.json',import.meta.url)));
const lifeEntryAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir33-06-additions.json',import.meta.url)));
const outcomeAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir33-07-additions.json',import.meta.url)));
const secondCheckAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-uir33-02-additions.json',import.meta.url)));
const alchemyArrangementAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir33-08-additions.json',import.meta.url)));
const lifespanGuidanceAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir34-01-additions.json',import.meta.url)));
const paintedTravelAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-cend07-f03-additions.json',import.meta.url)));
const preparationBenchAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-cend07-f04-additions.json',import.meta.url)));
const powerFocusAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-cend07-f02a-additions.json',import.meta.url)));
const forecastContextAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-cend07-additions.json',import.meta.url)));
const travelPassageAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-cend06-f02b-additions.json',import.meta.url)));
 const openingResponseAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-cend06-f02a-additions.json',import.meta.url)));
 const sourceStateAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-ui35-source-additions.json',import.meta.url)));
 const medicineSummaryAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir35-04-additions.json',import.meta.url)));
const savedProgressAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir35-03-additions.json',import.meta.url)));
const ui35FeedbackAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-ui35-additions.json',import.meta.url)));
const cultivationFallbackAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir35-02-additions.json',import.meta.url)));
const goalAuthorizationAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir35-01-additions.json',import.meta.url)));
const finalUICombinationAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-uir34-05-07-additions.json',import.meta.url)));
const fateClarityAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir34-07-additions.json',import.meta.url)));
const characterFolioAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir34-06-additions.json',import.meta.url)));
const trialLifeFocusAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir34-05-additions.json',import.meta.url)));
const confirmConfigurationAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-uir34-02-04-additions.json',import.meta.url)));
const resumeWordingAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir34-04-additions.json',import.meta.url)));
const configurationFocusAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir34-03-additions.json',import.meta.url)));
const finiteFocusAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-uir34-02-additions.json',import.meta.url)));
const lifespanAlchemyAdditions=JSON.parse(fs.readFileSync(new URL('../tests/idle-check-lifespan-alchemy-additions.json',import.meta.url)));
export function idleReportTests(report,suite){
 assert.ok(['ui','persistence','journey'].includes(suite),'Unknown current suite');
 const directory=String(report.config?.rootDir??'').replaceAll('\\','/');
 assert.ok(directory.endsWith('/'+({ui:'e2e',persistence:'persistence-tests',journey:'journey-tests'}[suite])),'Wrong actual suite directory');
 if(suite!=='journey')return flattenRecoveryReport(report).tests;
 const rows=[];function walk(s){for(const spec of s.specs??[])for(const test of spec.tests??[])rows.push({suite,file:path.posix.basename(String(spec.file).replaceAll('\\','/')),title:spec.title,ok:spec.ok,...test});for(const c of s.suites??[])walk(c);}for(const s of report.suites??[])walk(s);return rows;
}
export function inspectIdleReport(report,suite,runtime){
 assert.match(runtime,/^[a-f0-9]{64}$/,'Explicit runtime required');
 assert.equal(report.config?.metadata?.runtimeDigest,runtime,'Different runtime');
 assert.deepEqual(report.errors??[],[],'Reporter errors cannot be superseded');
 const rows=idleReportTests(report,suite);assert.ok(rows.length,'No actual tests');
 assert.equal(new Set(rows.map(key)).size,rows.length,'Duplicate declaration');
 const project=report.config.projects?.find(p=>p.name==='chromium');assert.ok(project,'Missing actual Chromium project');assert.equal(project.repeatEach,1,'Repeated cases are not new coverage');assert.equal(project.retries,0,'Configured retries are not accepted');
 for(const r of rows){assert.equal(r.projectName,'chromium','Unexpected browser');assert.equal(r.expectedStatus,'passed','Expected failures are not evidence');assert.equal(r.results?.length,1,'Hidden retries or unexecuted declarations');assert.equal(r.results[0].retry,0,'Retry is not accepted');assert.ok(['passed','failed','timedOut'].includes(r.results[0].status),'Interrupted or skipped case');}
 return rows;
}
export function latestIdleResults(phases){
 const current=new Map(),history=[];
 for(const phase of phases){for(const r of phase.tests){const k=key(r),prior=current.get(k);if(prior)history.push({identity:k,phase:prior.phase,status:prior.test.results[0].status,supersededBy:phase.name});current.set(k,{phase:phase.name,test:r});}}
 return{current,history};
}
/** Validate real named declarations; v2 includes every v1 UI consumer in the complete UI inventory. */
export function inspectIdleDeclarations(version,declarations,runtime,recoveryUI){
 assert.ok(version===1||version===2||version===3||version===4||version===5||version===6||version===7||version===8||version===9||version===10||version===11||version===12||version===13||version===14||version===15||version===16||version===17||version===18||version===19||version===20||version===21||version===22||version===23||version===24||version===25||version===26||version===27||version===28||version===29||version===30||version===31||version===32||version===33||version===34||version===35||version===36||version===37||version===38||version===39,'Unknown idle matrix version');assert.match(runtime,/^[a-f0-9]{64}$/);
 const profiles = {
  1: idleRecoveryMatrix.profiles,
  2: idleComprehensiveProfiles,
  3: {...idleComprehensiveProfiles, ui: additions.profile},
  4: {...idleComprehensiveProfiles, ui: copyAdditions.profile},
  5: {...idleComprehensiveProfiles, ui: readabilityAdditions.profile},
  6: {...idleComprehensiveProfiles, ui: marketCopyAdditions.profile},
  7: {...idleComprehensiveProfiles, ui: statusAdditions.profile},
  8: {...idleComprehensiveProfiles, ui: combinationAdditions.profile},
  9: {...idleComprehensiveProfiles, ui: ongoingAdditions.profile},
  10: {...idleComprehensiveProfiles, ui: localExplorationAdditions.profile},
  11: {...idleComprehensiveProfiles, ui: studyNotesAdditions.profile},
  12: {...idleComprehensiveProfiles, ui: uirCombinationAdditions.profile},
  13: {...idleComprehensiveProfiles, ui: activityDetailAdditions.profile},
  14: {...idleComprehensiveProfiles, ui: lifeEntryAdditions.profile},
  15: {...idleComprehensiveProfiles, ui: outcomeAdditions.profile},
  16: {...idleComprehensiveProfiles, ui: secondCheckAdditions.profile},
  17: {...idleComprehensiveProfiles, ui: alchemyArrangementAdditions.profile},
  18: {...idleComprehensiveProfiles, ui: lifespanGuidanceAdditions.profile},
  19: {...idleComprehensiveProfiles, ui: lifespanAlchemyAdditions.profile},
  20: {...idleComprehensiveProfiles, ui: finiteFocusAdditions.profile},
  21: {...idleComprehensiveProfiles, ui: configurationFocusAdditions.profile},
  22: {...idleComprehensiveProfiles, ui: resumeWordingAdditions.profile},
  23: {...idleComprehensiveProfiles, ui: confirmConfigurationAdditions.profile},
  24: {...idleComprehensiveProfiles, ui: trialLifeFocusAdditions.profile},
  25: {...idleComprehensiveProfiles, ui: characterFolioAdditions.profile},
  26: {...idleComprehensiveProfiles, ui: fateClarityAdditions.profile},
  27: {...idleComprehensiveProfiles, ui: finalUICombinationAdditions.profile},
  28: {...idleComprehensiveProfiles, ui: goalAuthorizationAdditions.profile},
  29: {...idleComprehensiveProfiles, ui: cultivationFallbackAdditions.profile},
  30: {...idleComprehensiveProfiles, ui: ui35FeedbackAdditions.profile},
  31: {...idleComprehensiveProfiles, ui: savedProgressAdditions.profile},
  32: {...idleComprehensiveProfiles, ui: medicineSummaryAdditions.profile},
  33: {...idleComprehensiveProfiles, ui: sourceStateAdditions.profile},
  34: {...idleComprehensiveProfiles, ui: openingResponseAdditions.profile},
  35: {...idleComprehensiveProfiles, ui: travelPassageAdditions.profile},
  36: {...idleComprehensiveProfiles, ui: forecastContextAdditions.profile},
  37: {...idleComprehensiveProfiles, ui: powerFocusAdditions.profile},
  38: {...idleComprehensiveProfiles, ui: preparationBenchAdditions.profile},
  39: {...idleComprehensiveProfiles, ui: paintedTravelAdditions.profile},
 };
 const pins=profiles[version],expected=[],seen=new Set();
 const named=(report,suite,pin)=>{const rows=idleReportTests(report,suite);assert.equal(path.basename(report.config.configFile),pin.configuration,'Partial declaration wrapper is not the reviewed profile');assert.equal(report.config.metadata.runtimeDigest,runtime,'Declaration source runtime differs');assert.equal(rows.length,pin.count,'Profile declarations were reduced');assert.equal(sha(JSON.stringify(rows.map(key).sort())),pin.signature,'Profile identities differ from the reviewed full source inventory');return rows;};
 for(const d of declarations){const pin=pins[d.suite];assert.ok(pin&&!seen.has(d.suite),'Exactly one complete named source profile per suite is required');seen.add(d.suite);expected.push(...named(d.report,d.suite,pin));}
 assert.deepEqual([...seen].sort(),['journey','persistence','ui']);assert.equal(new Set(expected.map(key)).size,expected.length,'Duplicate required identity');
 if(version>=2){assert.ok(recoveryUI,'v2 requires the original reviewed recovery UI declaration');const original=named(recoveryUI,'ui',idleRecoveryMatrix.profiles.ui),complete=new Set(expected.filter(r=>r.suite==='ui').map(key));for(const row of original)assert.ok(complete.has(key(row)),'Original recovery UI consumer lost from the comprehensive inventory');}
 let previousUI=expected.filter(r=>r.suite==='ui');
 if(version>=39){
  assert.equal(paintedTravelAdditions.format,'chenyuan-cend07-f03-travel-additions');assert.equal(paintedTravelAdditions.version,39);assert.equal(paintedTravelAdditions.parentVersion,38);assert.equal(paintedTravelAdditions.additions.length,7);
  const added=new Set(paintedTravelAdditions.additions.map(key));assert.equal(added.size,7,'Duplicate painted travel case');
  for(const row of paintedTravelAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'cend06-f02b-travel-passage.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed painted travel consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,preparationBenchAdditions.profile.count,'Original v38 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),preparationBenchAdditions.profile.signature,'Original v38 consumer lost or replaced');
 }
 if(version>=38){
  assert.equal(preparationBenchAdditions.format,'chenyuan-cend07-f04-preparation-additions');assert.equal(preparationBenchAdditions.version,38);assert.equal(preparationBenchAdditions.parentVersion,37);assert.equal(preparationBenchAdditions.additions.length,10);
  const added=new Set(preparationBenchAdditions.additions.map(key));assert.equal(added.size,10,'Duplicate preparation bench case');
  for(const row of preparationBenchAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'cend07-f04-preparation-bench.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed preparation consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,powerFocusAdditions.profile.count,'Original v37 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),powerFocusAdditions.profile.signature,'Original v37 consumer lost or replaced');
 }
 if(version>=37){
  assert.equal(powerFocusAdditions.format,'chenyuan-cend07-f02a-power-additions');assert.equal(powerFocusAdditions.version,37);assert.equal(powerFocusAdditions.parentVersion,36);assert.equal(powerFocusAdditions.additions.length,4);
  const added=new Set(powerFocusAdditions.additions.map(key));assert.equal(added.size,4,'Duplicate power focus case');
  for(const row of powerFocusAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'cend07-f02a-power-focus.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed power focus consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,forecastContextAdditions.profile.count,'Original v36 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),forecastContextAdditions.profile.signature,'Original v36 consumer lost or replaced');
 }
 if(version>=36){
  assert.equal(forecastContextAdditions.format,'chenyuan-check-cend07-forecast-additions');assert.equal(forecastContextAdditions.version,36);assert.equal(forecastContextAdditions.parentVersion,35);assert.equal(forecastContextAdditions.additions.length,3);
  const added=new Set(forecastContextAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate forecast context case');
  for(const row of forecastContextAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-cend07-forecast-context.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed forecast context consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,travelPassageAdditions.profile.count,'Original v35 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),travelPassageAdditions.profile.signature,'Original v35 consumer lost or replaced');
 }
 if(version>=35){
  assert.equal(travelPassageAdditions.format,'chenyuan-cend06-f02b-passage-additions');assert.equal(travelPassageAdditions.version,35);assert.equal(travelPassageAdditions.parentVersion,34);assert.equal(travelPassageAdditions.additions.length,5);
  const added=new Set(travelPassageAdditions.additions.map(key));assert.equal(added.size,5,'Duplicate travel passage case');
  for(const row of travelPassageAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'cend06-f02b-travel-passage.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed travel passage consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,openingResponseAdditions.profile.count,'Original v34 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),openingResponseAdditions.profile.signature,'Original v34 consumer lost or replaced');
 }
 if(version>=34){
  assert.equal(openingResponseAdditions.format,'chenyuan-cend06-f02a-response-additions');assert.equal(openingResponseAdditions.version,34);assert.equal(openingResponseAdditions.parentVersion,33);assert.equal(openingResponseAdditions.additions.length,5);
  const added=new Set(openingResponseAdditions.additions.map(key));assert.equal(added.size,5,'Duplicate opening response case');
  for(const row of openingResponseAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'cend06-f02a-opening-response.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed opening response consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,sourceStateAdditions.profile.count,'Original v33 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),sourceStateAdditions.profile.signature,'Original v33 consumer lost or replaced');
 }
 if(version>=33){
  assert.equal(sourceStateAdditions.format,'chenyuan-check-ui35-source-additions');assert.equal(sourceStateAdditions.version,33);assert.equal(sourceStateAdditions.parentVersion,32);assert.equal(sourceStateAdditions.additions.length,3);
  const added=new Set(sourceStateAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate source state combination');
  for(const row of sourceStateAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-ui35-source-state.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed source state consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,medicineSummaryAdditions.profile.count,'Original v32 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),medicineSummaryAdditions.profile.signature,'Original v32 consumer lost or replaced');
 }
 if(version>=32){
  assert.equal(medicineSummaryAdditions.format,'chenyuan-uir35-04-medicine-additions');assert.equal(medicineSummaryAdditions.version,32);assert.equal(medicineSummaryAdditions.parentVersion,31);assert.equal(medicineSummaryAdditions.additions.length,4);
  const added=new Set(medicineSummaryAdditions.additions.map(key));assert.equal(added.size,4,'Duplicate medicine summary case');
  for(const row of medicineSummaryAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir35-04-battle-medicine.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed medicine summary case');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,savedProgressAdditions.profile.count,'Original v31 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),savedProgressAdditions.profile.signature,'Original v31 consumer lost or replaced');
 }
 if(version>=31){
  assert.equal(savedProgressAdditions.format,'chenyuan-uir35-03-progress-additions');assert.equal(savedProgressAdditions.version,31);assert.equal(savedProgressAdditions.parentVersion,30);assert.equal(savedProgressAdditions.additions.length,3);
  const added=new Set(savedProgressAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate saved progress case');
  for(const row of savedProgressAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir35-03-progress-hierarchy.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed saved progress case');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,ui35FeedbackAdditions.profile.count,'Original v30 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),ui35FeedbackAdditions.profile.signature,'Original v30 consumer lost or replaced');
 }
 if(version>=30){
  assert.equal(ui35FeedbackAdditions.format,'chenyuan-check-ui35-feedback-additions');assert.equal(ui35FeedbackAdditions.version,30);assert.equal(ui35FeedbackAdditions.parentVersion,29);assert.equal(ui35FeedbackAdditions.additions.length,3);
  const added=new Set(ui35FeedbackAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate feedback combination');
  for(const row of ui35FeedbackAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-ui35-feedback.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed feedback combination');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,cultivationFallbackAdditions.profile.count,'Original v29 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),cultivationFallbackAdditions.profile.signature,'Original v29 consumer lost or replaced');
 }
 if(version>=29){
  assert.equal(cultivationFallbackAdditions.format,'chenyuan-uir35-02-cultivation-fallback-additions');assert.equal(cultivationFallbackAdditions.version,29);assert.equal(cultivationFallbackAdditions.parentVersion,28);assert.equal(cultivationFallbackAdditions.additions.length,4);
  const added=new Set(cultivationFallbackAdditions.additions.map(key));assert.equal(added.size,4,'Duplicate cultivation fallback consumer');
  for(const row of cultivationFallbackAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir35-02-cultivation-fallback.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed cultivation fallback consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,goalAuthorizationAdditions.profile.count,'Original v28 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),goalAuthorizationAdditions.profile.signature,'Original v28 consumer lost or replaced');
 }
 if(version>=28){
  assert.equal(goalAuthorizationAdditions.format,'chenyuan-uir35-01-goal-authorization-additions');assert.equal(goalAuthorizationAdditions.version,28);assert.equal(goalAuthorizationAdditions.parentVersion,27);assert.equal(goalAuthorizationAdditions.additions.length,3);
  const added=new Set(goalAuthorizationAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate growth authorization consumer');
  for(const row of goalAuthorizationAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir35-01-goal-authority.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed growth authorization consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,finalUICombinationAdditions.profile.count,'Original v27 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),finalUICombinationAdditions.profile.signature,'Original v27 consumer lost or replaced');
 }
 if(version>=27){
  assert.equal(finalUICombinationAdditions.format,'chenyuan-check-uir34-05-07-additions');assert.equal(finalUICombinationAdditions.version,27);assert.equal(finalUICombinationAdditions.parentVersion,26);assert.equal(finalUICombinationAdditions.additions.length,3);
  const added=new Set(finalUICombinationAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate final UI combination');
  for(const row of finalUICombinationAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-uir34-05-07.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed final UI combination');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,fateClarityAdditions.profile.count,'Original v26 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),fateClarityAdditions.profile.signature,'Original v26 consumer lost or replaced');
 }
 if(version>=26){
  assert.equal(fateClarityAdditions.format,'chenyuan-uir34-07-comprehensive-additions');assert.equal(fateClarityAdditions.version,26);assert.equal(fateClarityAdditions.parentVersion,25);assert.equal(fateClarityAdditions.additions.length,5);
  const added=new Set(fateClarityAdditions.additions.map(key));assert.equal(added.size,5,'Duplicate fate clarity consumer');
  for(const row of fateClarityAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir34-07-fate-clarity.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed fate clarity consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,characterFolioAdditions.profile.count,'Original v25 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),characterFolioAdditions.profile.signature,'Original v25 consumer lost or replaced');
 }
 if(version>=25){
  assert.equal(characterFolioAdditions.format,'chenyuan-uir34-06-comprehensive-additions');assert.equal(characterFolioAdditions.version,25);assert.equal(characterFolioAdditions.parentVersion,24);assert.equal(characterFolioAdditions.additions.length,6);
  const added=new Set(characterFolioAdditions.additions.map(key));assert.equal(added.size,6,'Duplicate character folio consumer');
  for(const row of characterFolioAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir34-06-character-folio.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed character folio consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,trialLifeFocusAdditions.profile.count,'Original v24 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),trialLifeFocusAdditions.profile.signature,'Original v24 consumer lost or replaced');
 }
 if(version>=24){
  assert.equal(trialLifeFocusAdditions.format,'chenyuan-uir34-05-comprehensive-additions');assert.equal(trialLifeFocusAdditions.version,24);assert.equal(trialLifeFocusAdditions.parentVersion,23);assert.equal(trialLifeFocusAdditions.additions.length,5);
  const added=new Set(trialLifeFocusAdditions.additions.map(key));assert.equal(added.size,5,'Duplicate trial life focus consumer');
  for(const row of trialLifeFocusAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir34-05-trial-life-focus.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed trial life focus consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,confirmConfigurationAdditions.profile.count,'Original v23 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),confirmConfigurationAdditions.profile.signature,'Original v23 consumer lost or replaced');
 }
 if(version>=23){
  assert.equal(confirmConfigurationAdditions.format,'chenyuan-check-uir34-02-04-additions');assert.equal(confirmConfigurationAdditions.version,23);assert.equal(confirmConfigurationAdditions.parentVersion,22);assert.equal(confirmConfigurationAdditions.additions.length,3);
  const added=new Set(confirmConfigurationAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate confirmation configuration combination');
  for(const row of confirmConfigurationAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-uir34-02-04.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed confirmation configuration combination');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,resumeWordingAdditions.profile.count,'Original v22 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),resumeWordingAdditions.profile.signature,'Original v22 consumer lost or replaced');
 }
 if(version>=22){
  assert.equal(resumeWordingAdditions.format,'chenyuan-uir34-04-comprehensive-additions');assert.equal(resumeWordingAdditions.version,22);assert.equal(resumeWordingAdditions.parentVersion,21);assert.equal(resumeWordingAdditions.additions.length,4);
  const added=new Set(resumeWordingAdditions.additions.map(key));assert.equal(added.size,4,'Duplicate resume wording consumer');
  for(const row of resumeWordingAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir34-04-resume-wording.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed resume wording consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,configurationFocusAdditions.profile.count,'Original v21 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),configurationFocusAdditions.profile.signature,'Original v21 consumer lost or replaced');
 }
 if(version>=21){
  assert.equal(configurationFocusAdditions.format,'chenyuan-uir34-03-comprehensive-additions');assert.equal(configurationFocusAdditions.version,21);assert.equal(configurationFocusAdditions.parentVersion,20);assert.equal(configurationFocusAdditions.additions.length,4);
  const added=new Set(configurationFocusAdditions.additions.map(key));assert.equal(added.size,4,'Duplicate configuration focus consumer');
  for(const row of configurationFocusAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir34-03-configuration-focus.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed configuration focus consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,finiteFocusAdditions.profile.count,'Original v20 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),finiteFocusAdditions.profile.signature,'Original v20 consumer lost or replaced');
 }
 if(version>=20){
  assert.equal(finiteFocusAdditions.format,'chenyuan-uir34-02-comprehensive-additions');assert.equal(finiteFocusAdditions.version,20);assert.equal(finiteFocusAdditions.parentVersion,19);assert.equal(finiteFocusAdditions.additions.length,6);
  const added=new Set(finiteFocusAdditions.additions.map(key));assert.equal(added.size,6,'Duplicate finite focus consumer');
  for(const row of finiteFocusAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir34-02-finite-focus.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed finite focus consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,lifespanAlchemyAdditions.profile.count,'Original v19 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),lifespanAlchemyAdditions.profile.signature,'Original v19 consumer lost or replaced');
 }
 if(version>=19){
  assert.equal(lifespanAlchemyAdditions.format,'chenyuan-lifespan-alchemy-check-additions');assert.equal(lifespanAlchemyAdditions.version,19);assert.equal(lifespanAlchemyAdditions.parentVersion,18);assert.equal(lifespanAlchemyAdditions.additions.length,3);
  const added=new Set(lifespanAlchemyAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate lifespan alchemy combination');
  for(const row of lifespanAlchemyAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-lifespan-alchemy.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed lifespan alchemy combination');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,lifespanGuidanceAdditions.profile.count,'Original v18 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),lifespanGuidanceAdditions.profile.signature,'Original v18 consumer lost or replaced');
 }
 if(version>=18){
  assert.equal(lifespanGuidanceAdditions.format,'chenyuan-uir34-01-comprehensive-additions');assert.equal(lifespanGuidanceAdditions.version,18);assert.equal(lifespanGuidanceAdditions.parentVersion,17);assert.equal(lifespanGuidanceAdditions.additions.length,8);
  const added=new Set(lifespanGuidanceAdditions.additions.map(key));assert.equal(added.size,8,'Duplicate lifespan guidance consumer');
  for(const row of lifespanGuidanceAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir34-01-lifespan-guidance.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed lifespan guidance consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,alchemyArrangementAdditions.profile.count,'Original v17 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),alchemyArrangementAdditions.profile.signature,'Original v17 consumer lost or replaced');
 }
 if(version>=17){
  assert.equal(alchemyArrangementAdditions.format,'chenyuan-uir33-08-comprehensive-additions');assert.equal(alchemyArrangementAdditions.version,17);assert.equal(alchemyArrangementAdditions.parentVersion,16);assert.equal(alchemyArrangementAdditions.additions.length,3);
  const added=new Set(alchemyArrangementAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate alchemy arrangement consumer');
  for(const row of alchemyArrangementAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir33-08-alchemy-arrangement.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed alchemy arrangement consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,secondCheckAdditions.profile.count,'Original v16 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),secondCheckAdditions.profile.signature,'Original v16 consumer lost or replaced');
 }
 if(version>=16){
  assert.equal(secondCheckAdditions.format,'chenyuan-check-uir33-02-comprehensive-additions');assert.equal(secondCheckAdditions.version,16);assert.equal(secondCheckAdditions.parentVersion,15);assert.equal(secondCheckAdditions.additions.length,4);
  const added=new Set(secondCheckAdditions.additions.map(key));assert.equal(added.size,4,'Duplicate second check consumer');
  for(const row of secondCheckAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-uir33-02.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed second check consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,outcomeAdditions.profile.count,'Original v15 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),outcomeAdditions.profile.signature,'Original v15 consumer lost or replaced');
 }
 if(version>=15){
  assert.equal(outcomeAdditions.format,'chenyuan-uir33-07-comprehensive-additions');assert.equal(outcomeAdditions.version,15);assert.equal(outcomeAdditions.parentVersion,14);assert.equal(outcomeAdditions.additions.length,4);
  const added=new Set(outcomeAdditions.additions.map(key));assert.equal(added.size,4,'Duplicate outcome consumer');
  for(const row of outcomeAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir33-07-outcome-focus.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed outcome consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,lifeEntryAdditions.profile.count,'Original v14 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),lifeEntryAdditions.profile.signature,'Original v14 consumer lost or replaced');
 }
 if(version>=14){
  assert.equal(lifeEntryAdditions.format,'chenyuan-uir33-06-comprehensive-additions');assert.equal(lifeEntryAdditions.version,14);assert.equal(lifeEntryAdditions.parentVersion,13);assert.equal(lifeEntryAdditions.additions.length,7);
  const added=new Set(lifeEntryAdditions.additions.map(key));assert.equal(added.size,7,'Duplicate life entry consumer');
  for(const row of lifeEntryAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir33-06-life-entry.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed life entry consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,activityDetailAdditions.profile.count,'Original v13 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),activityDetailAdditions.profile.signature,'Original v13 consumer lost or replaced');
 }
 if(version>=13){
  assert.equal(activityDetailAdditions.format,'chenyuan-uir33-05-comprehensive-additions');assert.equal(activityDetailAdditions.version,13);assert.equal(activityDetailAdditions.parentVersion,12);assert.equal(activityDetailAdditions.additions.length,10);
  const added=new Set(activityDetailAdditions.additions.map(key));assert.equal(added.size,10,'Duplicate activity detail consumer');
  for(const row of activityDetailAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir33-05-activity-detail.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed activity detail consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,uirCombinationAdditions.profile.count,'Original v12 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),uirCombinationAdditions.profile.signature,'Original v12 consumer lost or replaced');
 }
 if(version>=12){
  assert.equal(uirCombinationAdditions.format,'chenyuan-uir33-check-comprehensive-additions');assert.equal(uirCombinationAdditions.version,12);assert.equal(uirCombinationAdditions.parentVersion,11);assert.equal(uirCombinationAdditions.additions.length,3);
  const added=new Set(uirCombinationAdditions.additions.map(key));assert.equal(added.size,3,'Duplicate UIR combination consumer');
  for(const row of uirCombinationAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'check-uir33-01.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed UIR combination consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,studyNotesAdditions.profile.count,'Original v11 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),studyNotesAdditions.profile.signature,'Original v11 consumer lost or replaced');
 }
 if(version>=11){
  assert.equal(studyNotesAdditions.format,'chenyuan-uir33-04-comprehensive-additions');assert.equal(studyNotesAdditions.version,11);assert.equal(studyNotesAdditions.parentVersion,10);assert.equal(studyNotesAdditions.additions.length,5);
  const added=new Set(studyNotesAdditions.additions.map(key));assert.equal(added.size,5,'Duplicate study notes consumer');
  for(const row of studyNotesAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir33-04-study-notes.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed study notes consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));assert.equal(previousUI.length,localExplorationAdditions.profile.count,'Original v10 inventory reduced');assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),localExplorationAdditions.profile.signature,'Original v10 consumer lost or replaced');
 }
 if(version>=10){
  assert.equal(localExplorationAdditions.format,'chenyuan-uir33-02-comprehensive-additions');
  assert.equal(localExplorationAdditions.version,10);assert.equal(localExplorationAdditions.parentVersion,9);
  assert.equal(localExplorationAdditions.additions.length,5);
  const added=new Set(localExplorationAdditions.additions.map(key));assert.equal(added.size,5,'Duplicate local exploration consumer');
  for(const row of localExplorationAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir33-02-local-exploration.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed local exploration consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));
  assert.equal(previousUI.length,ongoingAdditions.profile.count,'Original v9 inventory reduced');
  assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),ongoingAdditions.profile.signature,'Original v9 consumer lost or replaced');
 }
 if(version>=9){
  assert.equal(ongoingAdditions.format,'chenyuan-uir33-01-comprehensive-additions');
  assert.equal(ongoingAdditions.version,9);assert.equal(ongoingAdditions.parentVersion,8);
  assert.equal(ongoingAdditions.additions.length,5);
  const added=new Set(ongoingAdditions.additions.map(key));assert.equal(added.size,5,'Duplicate ongoing consumer');
  for(const row of ongoingAdditions.additions){assert.equal(row.suite,'ui');assert.equal(row.file,'uir33-01-cultivation-active.spec.ts');assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed ongoing consumer');}
  previousUI=previousUI.filter(row=>!added.has(key(row)));
  assert.equal(previousUI.length,combinationAdditions.profile.count,'Original v8 inventory reduced');
  assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),combinationAdditions.profile.signature,'Original v8 consumer lost or replaced');
 }
 if(version>=8){
  assert.equal(combinationAdditions.format,'chenyuan-ux31-33-comprehensive-additions');
  assert.equal(combinationAdditions.version,8);
  assert.equal(combinationAdditions.parentVersion,7);
  assert.equal(combinationAdditions.additions.length,3);
  const added=new Set(combinationAdditions.additions.map(key));
  assert.equal(added.size,3,'Duplicate combination consumer');
  for(const row of combinationAdditions.additions){
   assert.equal(row.suite,'ui');assert.equal(row.file,'check-ux31-33.spec.ts');
   assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed combination consumer');
  }
  previousUI=previousUI.filter(row=>!added.has(key(row)));
  assert.equal(previousUI.length,statusAdditions.profile.count,'Original v7 inventory reduced');
  assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),statusAdditions.profile.signature,'Original v7 consumer lost or replaced');
 }
 if(version>=7){
  assert.equal(statusAdditions.format,'chenyuan-ux33-comprehensive-additions');
  assert.equal(statusAdditions.version,7);
  assert.equal(statusAdditions.parentVersion,6);
  assert.equal(statusAdditions.additions.length,7);
  const added=new Set(statusAdditions.additions.map(key));
  assert.equal(added.size,7,'Duplicate status clarity consumer');
  for(const row of statusAdditions.additions){
   assert.equal(row.suite,'ui');
   assert.equal(row.file,'ux33-activity-status.spec.ts');
   assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed status clarity consumer');
  }
  previousUI=previousUI.filter(row=>!added.has(key(row)));
  assert.equal(previousUI.length,marketCopyAdditions.profile.count,'Original v6 inventory reduced');
  assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),marketCopyAdditions.profile.signature,'Original v6 consumer lost or replaced');
 }
 if(version>=6){
  assert.equal(marketCopyAdditions.format,'chenyuan-ux32-comprehensive-additions');
  assert.equal(marketCopyAdditions.version,6);
  assert.equal(marketCopyAdditions.parentVersion,5);
  assert.equal(marketCopyAdditions.additions.length,6);
  const added=new Set(marketCopyAdditions.additions.map(key));
  assert.equal(added.size,6,'Duplicate market copy consumer');
  for(const row of marketCopyAdditions.additions){
   assert.equal(row.suite,'ui');
   assert.equal(row.file,'ux32-market-copy.spec.ts');
   assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed market copy consumer');
  }
  previousUI=previousUI.filter(row=>!added.has(key(row)));
  assert.equal(previousUI.length,readabilityAdditions.profile.count,'Original v5 inventory reduced');
  assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),readabilityAdditions.profile.signature,'Original v5 consumer lost or replaced');
 }
 if(version>=5){
  assert.equal(readabilityAdditions.format,'chenyuan-ux31-comprehensive-additions');
  assert.equal(readabilityAdditions.version,5);
  assert.equal(readabilityAdditions.parentVersion,4);
  assert.equal(readabilityAdditions.additions.length,4);
  const added=new Set(readabilityAdditions.additions.map(key));
  assert.equal(added.size,4,'Duplicate readability consumer');
  for(const row of readabilityAdditions.additions){
   assert.equal(row.suite,'ui');
   assert.equal(row.file,'ux31-readability.spec.ts');
   assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed readability consumer');
  }
  previousUI=previousUI.filter(row=>!added.has(key(row)));
  assert.equal(previousUI.length,copyAdditions.profile.count,'Original v4 inventory reduced');
  assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),copyAdditions.profile.signature,'Original v4 consumer lost or replaced');
 }
 if(version>=4){
  assert.equal(copyAdditions.format,'chenyuan-ux30-comprehensive-additions');
  assert.equal(copyAdditions.version,4);
  assert.equal(copyAdditions.parentVersion,3);
  assert.equal(copyAdditions.additions.length,4);
  const added=new Set(copyAdditions.additions.map(key));
  assert.equal(added.size,4,'Duplicate copy consumer');
  for(const row of copyAdditions.additions){
   assert.equal(row.suite,'ui');
   assert.equal(row.file,'ux30-primary-copy.spec.ts');
   assert.ok(previousUI.some(actual=>key(actual)===key(row)),'Missing reviewed copy consumer');
  }
  previousUI=previousUI.filter(row=>!added.has(key(row)));
  assert.equal(previousUI.length,additions.profile.count,'Original v3 inventory reduced');
  assert.equal(sha(JSON.stringify(previousUI.map(key).sort())),additions.profile.signature,'Original v3 consumer lost or replaced');
 }
 if(version>=3){
  assert.equal(additions.format,'chenyuan-current-comprehensive-additions');assert.equal(additions.version,3);assert.equal(additions.additions.length,14);const added=new Set(additions.additions.map(key)),ui=previousUI;assert.equal(added.size,14,'Duplicate added identity');for(const id of added)assert.ok(ui.some(r=>key(r)===id),'Missing reviewed added consumer');const original=ui.filter(r=>!added.has(key(r)));assert.equal(original.length,idleComprehensiveProfiles.ui.count,'Original v2 inventory reduced');assert.equal(sha(JSON.stringify(original.map(key).sort())),idleComprehensiveProfiles.ui.signature,'Original v2 consumer lost or replaced');
 }
 return expected;
}
/** Explicit same-runtime engineering proof; does not replace the historical candidate gate. */
export function verifyIdleMatrixCoverage(manifestFile){
 const manifest=JSON.parse(fs.readFileSync(manifestFile)),base=path.dirname(path.resolve(manifestFile));
 assert.equal(manifest.format,'chenyuan-idle-matrix-inputs');assert.ok(manifest.version===1||manifest.version===2||manifest.version===3||manifest.version===4||manifest.version===5||manifest.version===6||manifest.version===7||manifest.version===8||manifest.version===9||manifest.version===10||manifest.version===11||manifest.version===12||manifest.version===13||manifest.version===14||manifest.version===15||manifest.version===16||manifest.version===17||manifest.version===18||manifest.version===19||manifest.version===20||manifest.version===21||manifest.version===22||manifest.version===23||manifest.version===24||manifest.version===25||manifest.version===26||manifest.version===27||manifest.version===28||manifest.version===29||manifest.version===30||manifest.version===31||manifest.version===32||manifest.version===33||manifest.version===34||manifest.version===35||manifest.version===36||manifest.version===37||manifest.version===38||manifest.version===39,'Unknown idle matrix version');assert.deepEqual(manifest.scope,{browser:'chromium',viewport:{width:1440,height:900},fontScale:1});assert.match(manifest.runtime,/^[a-f0-9]{64}$/);
 const read=ref=>{assert.ok(ref&&typeof ref.path==='string');assert.match(ref.sha256,/^[a-f0-9]{64}$/);const bytes=fs.readFileSync(path.resolve(base,ref.path));assert.equal(sha(bytes),ref.sha256,'Evidence bytes changed: '+ref.path);return JSON.parse(bytes);};
 const phases=[],phaseNames=new Set();let previousStart=-Infinity;
 for(const descriptor of manifest.phases){
  assert.ok(!phaseNames.has(descriptor.name),'Duplicate phase');phaseNames.add(descriptor.name);
  const report=read(descriptor.report),before=read(descriptor.before),after=read(descriptor.after),terminal=read(descriptor.terminal),declared=read(descriptor.declared);
  const configuration=path.resolve(base,descriptor.configuration.path);assert.equal(sha(fs.readFileSync(configuration)),descriptor.configuration.sha256,'Pinned executed configuration changed');assert.equal(path.resolve(report.config.configFile),configuration,'Wrong actual configuration');assert.equal(before.hashes[path.relative(repositoryRoot,configuration).split(path.sep).join('/')],descriptor.configuration.sha256,'Executed configuration absent from its exact snapshot path');assert.equal(before.hashes[path.relative(repositoryRoot,path.resolve(base,descriptor.declared.path)).split(path.sep).join('/')],descriptor.declared.sha256,'Actual declarations absent from their execution snapshot');
  const tests=inspectIdleReport(report,descriptor.suite,manifest.runtime),decls=idleReportTests(declared,descriptor.suite);
  assert.deepEqual(tests.map(key).sort(),decls.map(key).sort(),'Actual declarations differ');
  assert.deepEqual(before.hashes,after.hashes,'Inputs changed during execution');assert.deepEqual(before.runtimeSources,after.runtimeSources,'Runtime inputs changed');assert.equal(sha(JSON.stringify(before.runtimeSources)),manifest.runtime,'Snapshot runtime differs');assert.equal(before.runtimeDigest,manifest.runtime);assert.equal(after.runtimeDigest,manifest.runtime);
  assert.equal(terminal.launchError??terminal.error??null,null,'Runner launch failed');if(terminal.reportSha256)assert.equal(terminal.reportSha256,descriptor.report.sha256,'Terminal raw report pin differs');
  assert.equal(terminal.exact??terminal.withinPhaseInputsExact,true,'Terminal input audit failed');assert.equal(terminal.exactDeclared??terminal.declarationExact,true,'Terminal declaration audit failed');assert.equal(terminal.sameGit??true,true,'Git changed within phase');assert.equal(terminal.runtime,manifest.runtime);assert.deepEqual(terminal.stats,report.stats);assert.deepEqual(terminal.errors??[],[]);assert.deepEqual(terminal.retried,[]);
  const began=Date.parse(report.stats.startTime);assert.ok(Number.isFinite(began)&&began>=previousStart,'Phases must retain real chronological order');assert.ok(Date.parse(before.recordedAt)<=began&&began+report.stats.duration<=Date.parse(after.recordedAt)+1,'Snapshot is not a real before/after execution window');previousStart=began;
  phases.push({name:descriptor.name,suite:descriptor.suite,tests});
 }
 const {current,history}=latestIdleResults(phases),expected=inspectIdleDeclarations(manifest.version,manifest.declarations.map(d=>({suite:d.suite,report:read(d.report)})),manifest.runtime,manifest.version>=2?read(manifest.recoveryUIDeclaration):undefined);
 assert.deepEqual([...current.keys()].sort(),expected.map(key).sort(),'Current normal/UI/native inventory is incomplete or contains undeclared cases');
 for(const {test:r} of current.values()){assert.equal(r.ok,true,r.title+': latest spec not passing');assert.equal(r.status,'expected',r.title+': latest outcome unexpected');assert.equal(r.results[0].status,'passed',r.title+': latest case did not pass');}
 assert.equal(idleRecoveryMatrix.legacySignature,sha(JSON.stringify(recoveryMatrix)),'Original obligations changed without per-leaf review');
 assert.deepEqual(idleRecoveryMatrix.rows.map(r=>r.id),recoveryMatrix.map(r=>r.id));
 const requirements=[];
 for(const [index,row]of idleRecoveryMatrix.rows.entries()){
  assert.deepEqual(row.leaves.map(l=>l.legacy),recoveryMatrix[index].evidence,'Original requirement leaf lost');
  for(const leaf of row.leaves){assert.ok(leaf.current.length&&leaf.assertion);for(const ref of leaf.current){assert.ok(ref.suite===leaf.legacy.suite||leaf.legacy.suite==='ui'&&ref.suite==='journey','A storage helper cannot replace a UI consumer');assert.ok(current.has(key(ref)),row.id+': missing actual current '+key(ref));}}
  requirements.push({id:row.id,legacyLeaves:row.leaves.length,currentEvidence:[...new Set(row.leaves.flatMap(l=>l.current.map(key)))],compatibilityDeferred:row.leaves.filter(l=>l.compatibilityDeferred).map(l=>({legacy:l.legacy,reason:l.compatibilityDeferred}))});
 }
 const originalNative=idleReportTests(read(manifest.legacyNativeDeclarations),'persistence'),retainedNative=[...idleNativeMigration.includedLegacyTests,...idleNativeMigration.supersededLegacyTests].map(r=>({suite:'persistence',...r}));assert.equal(originalNative.length,idleNativeMigration.legacyDeclarationCount);assert.equal(new Set(retainedNative.map(key)).size,retainedNative.length);assert.deepEqual(retainedNative.map(key).sort(),originalNative.map(key).sort(),'Original native declaration lost or invented; this baseline is inventory only, never current execution');
 for(const old of idleNativeMigration.includedLegacyTests)assert.ok(current.has(key({suite:'persistence',...old})),'Included original native test missing');
 for(const old of idleNativeMigration.supersededLegacyTests){assert.ok(old.reason&&old.replacementTitlePrefixes.length);for(const prefix of old.replacementTitlePrefixes){assert.ok(!/^M04-[UN]\d+$/.test(prefix),'Numeric case prefix requires an explicit boundary');assert.ok([...current.values()].some(r=>r.test.suite==='persistence'&&r.test.title.startsWith(prefix)),'Missing semantic native replacement: '+prefix);}}
 const actual=[...current.values()].map(r=>r.test),routes=actual.filter(r=>r.file==='idle-normal-matrix.spec.ts');assert.deepEqual(routes.map(r=>r.title).sort(),ascensionMatrix.map(r=>'normal idle '+r.id).sort(),'All24 normal routes required');
 const guides=actual.filter(r=>r.file==='idle-foundation-guide.spec.ts');assert.equal(guides.length,6);assert.equal(new Set(guides.map(r=>r.title.replace(/^guided idle foundation /,'').split('/').slice(0,2).join('/'))).size,6,'All six opening/school guides required');
 assert.deepEqual(actual.filter(r=>r.file==='idle-trial-reopen.spec.ts').map(r=>r.title).sort(),['sword','talisman'].map(s=>'current normal '+s+' reopens its actual question and every saved battle round without reroll or an automatic next gate').sort());
 return{format:'chenyuan-idle-matrix-coverage',version:manifest.version,profile:manifest.version>=2?'fixed-desktop-comprehensive-v'+manifest.version:idleRecoveryMatrix.profile,runtime:manifest.runtime,phases:phases.length,composite:phases.length>3,uniqueTests:actual.length,totals:Object.fromEntries(['ui','persistence','journey'].map(s=>[s,actual.filter(r=>r.suite===s).length])),normalRoutes:24,foundationGuides:6,everyRoundNormalRoutes:2,requirements,history,legacyNative:{included:idleNativeMigration.includedLegacyTests.length,superseded:idleNativeMigration.supersededLegacyTests.length,total:idleNativeMigration.legacyDeclarationCount},pageCompatibilityAccepted:false,originalThreeBrowserMatrixAccepted:false,humanOrBalanceAccepted:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(verifyIdleMatrixCoverage(process.argv[2])));
