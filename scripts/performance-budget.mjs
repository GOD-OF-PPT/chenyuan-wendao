import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';

// Existing v0.3 §7 targets, in decimal bytes and milliseconds.
export const performanceBudget={criticalBytes:2_500_000,packageBytes:15_000_000,firstActionMs:3000,panelFeedbackMs:200};
export const performanceSizes=[{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080},{width:390,height:844}];
export function performanceCases(){return ['new','resume'].flatMap(kind=>[...performanceSizes.map(viewport=>({viewport,cpu:4})),{viewport:{width:1440,height:900},cpu:1}].flatMap(profile=>[1,2,3].map(repeat=>({kind,...profile,repeat,id:`${kind}/${profile.viewport.width}x${profile.viewport.height}/${profile.cpu}/${repeat}`}))));}

export function inspectProduction(root){
 const files=[];
 function walk(folder){for(const name of fs.readdirSync(folder).sort()){const file=path.join(folder,name),stat=fs.lstatSync(file);assert.ok(!stat.isSymbolicLink(),'Production package must contain actual files');if(stat.isDirectory())walk(file);else{const data=fs.readFileSync(file);files.push({path:path.relative(root,file).split(path.sep).join('/'),bytes:data.length,gzipBytes:gzipSync(data).length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}}}
 walk(root);assert.ok(files.some(f=>f.path==='index.html'),'Missing production entry');const bytes=files.reduce((s,f)=>s+f.bytes,0);assert.ok(bytes<=performanceBudget.packageBytes,`Production package ${bytes} > ${performanceBudget.packageBytes}`);return{files,bytes,gzipBytes:files.reduce((s,f)=>s+f.gzipBytes,0)};
}
function metric(value,name){assert.ok(Number.isFinite(value)&&value>=0,`Missing/invalid ${name}`);return value;}
export function assertPerformanceSample(sample){
 assert.ok(sample.id);assert.deepEqual(sample.errors,[],'Runtime/console/network errors');
 assert.ok(metric(sample.firstControlReadyMs,'first control')>0);assert.ok(metric(sample.firstActionReadyMs,'first action')>=sample.firstControlReadyMs);
 assert.ok(sample.firstActionReadyMs<=performanceBudget.firstActionMs,`${sample.id}: first action ${sample.firstActionReadyMs}ms > 3000ms`);
 assert.ok(Array.isArray(sample.navigation)&&sample.navigation.length===1,'Missing real navigation timing');
 assert.ok(sample.navigation[0].responseEnd-sample.navigation[0].fetchStart>=145,'Document body did not experience the configured 150ms network delay');
 assert.ok(Array.isArray(sample.resources)&&sample.resources.length>0,'Missing actual resource evidence');
 for(const resource of sample.resources){assert.equal(new URL(resource.url).origin,sample.origin,'Unexpected external request');assert.equal(resource.status,200);assert.equal(resource.finished,true,'Unfinished initial resource');metric(resource.bytes,'resource bytes');assert.equal(resource.fromCache,false,'Cold run used cache');}
 const bytes=sample.resources.reduce((sum,r)=>sum+r.bytes,0);assert.equal(sample.criticalTransferBytes,bytes);assert.ok(bytes<=performanceBudget.criticalBytes,`${sample.id}: initial transfer ${bytes} > ${performanceBudget.criticalBytes}`);
 assert.ok(Array.isArray(sample.panelFeedback)&&sample.panelFeedback.length===3,'Missing actual panel interactions');for(const panel of sample.panelFeedback)assert.ok(metric(panel.ms,'panel feedback')<=performanceBudget.panelFeedbackMs,`${sample.id}: ${panel.id} feedback ${panel.ms}ms > 200ms`);
 assert.equal(sample.committed,true,'First operation was not read back from IndexedDB');assert.equal(sample.readingPreservedGame,true,'Panel reading changed Game');
}
export function assertPerformanceReport(report){
 const expected=performanceCases().map(c=>c.id).sort();assert.deepEqual(report.samples.map(s=>s.id).sort(),expected,'Incomplete/duplicate performance matrix');for(const sample of report.samples)assertPerformanceSample(sample);assert.equal(report.network.downloadBitsPerSecond,10_000_000);assert.equal(report.network.latencyMs,150);assert.equal(report.cache,'cold: new context + Network.setCacheDisabled');assert.ok(report.production.bytes<=performanceBudget.packageBytes);assert.ok(report.environment.browser&&report.environment.cpu&&report.environment.platform);
}
