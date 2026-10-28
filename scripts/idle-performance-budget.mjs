import assert from 'node:assert/strict';
import {performanceCases,performanceBudget,assertPerformanceSample} from './performance-budget.mjs';

// The remaining eighteen original profiles are retained for the last compatibility task.
export const idlePerformanceCases=()=>performanceCases().filter(c=>c.viewport.width===1440&&c.viewport.height===900);
export function assertIdlePerformanceSample(sample){
 const profile=idlePerformanceCases().find(c=>c.id===sample.id);assert.ok(profile,'Unreviewed performance profile');
 for(const key of ['kind','cpu','repeat','viewport'])assert.deepEqual(sample[key],profile[key],'Wrong actual profile '+key);
 assert.equal(sample.fontScale,1);assertPerformanceSample(sample);
 assert.deepEqual(sample.panelFeedback.map(p=>p.id),['tab-0','tab-2','tab-3'],'All three original actual panels required');
 for(const panel of sample.panelFeedback){assert.equal(panel.selected,true);assert.equal(panel.surfaceVisible,true,'The actual panel must be visible in the measured drawing frame');}
 const w=sample.witness;assert.ok(w,'Missing actual saved outcome witness');
 for(const key of ['actualNativeCommit','fullFormalGame','completeActivity','uniqueReceipt','allStoresReadOnly'])assert.equal(w[key],true,'Missing actual saved outcome or readonly proof');
 for(const value of [sample.fullOutcomeMs,w.dueAt,w.firstOutcomePutEpoch,w.outcomeCompleteEpoch,w.firstAcceptanceCompleteMs,w.outcomeCompleteMs])assert.ok(Number.isFinite(value)&&value>=0,'Missing finite timing witness');
 assert.equal(w.cycleMs,6000,'Current action must keep its original six second cycle');
 assert.ok(Number.isFinite(w.dueAt)&&w.firstOutcomePutEpoch>=w.dueAt&&w.outcomeCompleteEpoch>=w.firstOutcomePutEpoch,'Outcome saved before its deadline');
 assert.ok(Number.isFinite(w.firstAcceptanceCompleteMs)&&w.firstAcceptanceCompleteMs>0&&sample.firstActionReadyMs>=w.firstAcceptanceCompleteMs,'A ready button is not an atomic acceptance');
 assert.ok(w.outcomeCompleteMs>=w.firstAcceptanceCompleteMs&&sample.fullOutcomeMs>=w.outcomeCompleteMs,'Missing full outcome timing');
 assert.equal(sample.measurementClock,'real');assert.equal(sample.metricsMeaning,sample.kind==='new'?'created Game and enabled opening':'saved finite TRAVEL START and public running');
 return sample;
}
export function assertIdlePerformanceReport(report){
 assert.equal(report.format,'chenyuan-idle-production-performance');assert.ok([1,2].includes(report.version),'Unknown performance report version');
 assert.notEqual(report.diagnosticOnly,true,'A profiled diagnostic is not a performance certificate');
 if(report.version===2){
  assert.equal(report.serving?.kind,'candidate-python');assert.equal(report.serving.script,'scripts/candidate/serve.py');assert.match(report.serving.sha256,/^[a-f0-9]{64}$/);assert.equal(report.harnessHashes[report.serving.script],report.serving.sha256,'Wrong actual service source');
  for(const sample of report.samples)for(const resource of sample.resources){assert.equal(resource.productionPath,decodeURIComponent(new URL(resource.url).pathname.slice(1))||'index.html','Wrong actual resource path');const file=report.production.files.find(f=>f.path===resource.productionPath);assert.ok(file,'Unlisted served resource');assert.equal(resource.decodedSHA256,file.sha256,'Served bytes differ from this production build');}
 }
 assert.deepEqual(report.samples.map(s=>s.id).sort(),idlePerformanceCases().map(s=>s.id).sort(),'All twelve current cold samples are required');
 assert.deepEqual(report.attempts.map(s=>s.id).sort(),idlePerformanceCases().map(s=>s.id).sort(),'Attempt inventory differs');
 assert.ok(report.attempts.every(s=>s.status==='passed'),'A failed measurement cannot be omitted');
 for(const sample of report.samples)assertIdlePerformanceSample(sample);
 assert.deepEqual(report.budgets,performanceBudget);assert.equal(report.network.downloadBitsPerSecond,10_000_000);assert.equal(report.network.latencyMs,150);
 assert.equal(report.cache,'cold: new context + Network.setCacheDisabled');assert.ok(report.production.bytes<=performanceBudget.packageBytes);
 assert.ok(report.environment.browser&&report.environment.cpu&&report.environment.platform);assert.match(report.runtimeDigest,/^[a-f0-9]{64}$/);
 assert.equal(report.deferredOriginalProfiles,18);assert.equal(report.originalThirtyAccepted,false);assert.equal(report.compatibilityAccepted,false);
}
