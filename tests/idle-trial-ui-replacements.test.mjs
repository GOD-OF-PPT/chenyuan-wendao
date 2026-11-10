import test from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import path from'node:path';
import{execFileSync}from'node:child_process';
import{fileURLToPath}from'node:url';
import{verifyTrialUIPreparationReplacements}from'../scripts/idle-matrix-evidence.mjs';
import{fullRoute}from'./full-route.mjs';
import{resolve}from'../src/full/engine.ts';
import{createActivity,completeActivity}from'../src/full/activity.ts';
import{canonicalFingerprint}from'../src/full/receipts.ts';
import{currentVersions}from'../src/full/versions.ts';

const root=fileURLToPath(new URL('../',import.meta.url)),review=JSON.parse(fs.readFileSync(new URL('./idle-trial-ui-replacements.json',import.meta.url))),runtime='b'.repeat(64);
let modelBody;
function entryBody(){
 if(modelBody)return modelBody;
 const game=fullRoute().checkpoints.trial,a=createActivity(game,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1},{ownerId:'unit-entry-owner',commandId:'unit-entry-start',id:'unit-entry-activity',now:1000}),formal=resolve(game,a.nextCommand),input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}},done=completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:a.dueAt}),receipt={format:'chenyuan-activity-receipt',version:2,input,fingerprint:canonicalFingerprint(input),activity:done,command:a.nextCommand,result:formal.result,proof:{activityBefore:a,stateAfter:formal.nextState,resolvedAt:a.dueAt}},raw={version:9,current:formal.nextState,previous:game,activity:done,checkpoint:{format:'chenyuan-checkpoint',version:1,kind:'trial',sourceRunId:game.core.runId,sourceRevision:game.core.revision,versions:currentVersions,snapshot:game},'checkpoint-owner':{format:'chenyuan-checkpoint-scope',version:1,runId:game.core.runId,sourceRunId:game.core.runId,sourceRevision:game.core.revision,kind:'trial'},receipt};
 modelBody=Buffer.from(JSON.stringify({game,a,raw,formal})).toString('base64');return modelBody;
}
// Synthetic objects only exercise the verifier. They are never emitted as browser or product evidence.
function reports(){
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const make=(suite,identities)=>({suite,report:{syntheticVerifierUnitOnly:true,config:{rootDir:path.join(root,'web',suite==='ui'?'e2e':'journey-tests'),metadata:{runtimeDigest:runtime,chenyuan:{head,source:head,dirty:false}},projects:[{name:'chromium',repeatEach:1,retries:0}]},errors:[],suites:[{specs:identities.map(row=>({file:row.file,title:row.title,ok:true,tests:[{projectName:'chromium',expectedStatus:'passed',status:'expected',results:[{retry:0,status:'passed',attachments:suite==='journey'&&row.file!=='idle-foundation-guide.spec.ts'?[{name:'actual-entry-full-checkpoint-owner-receipt',contentType:'application/json',body:entryBody()}]:[]}]}]}))}]}});
 return[make('ui',review.requiredUIInventory),make('journey',review.requiredJourneyInventory)];
}
test('current trial UI equivalence requires all exact8 current cases and32 normal routes with26 complete coherent entry proofs',()=>{
 const proof=verifyTrialUIPreparationReplacements(runtime,reports());assert.equal(proof.legacyObligations,8);assert.equal(proof.currentUI,8);assert.equal(proof.completeNormalRoutes,32);assert.equal(proof.actualFullEntryProofs,26);assert.equal(proof.legacyRawFailuresStillRetained,true);assert.equal(proof.oldMobileAndNative22RemainSeparate,true);assert.equal(proof.humanOrCompatibilityAccepted,false);
});
test('old UI obligations cannot be deleted duplicated or aliased to native22 retirement',()=>{
 for(const change of [r=>r.rows.pop(),r=>r.rows[0].legacy=r.rows[1].legacy,r=>r.native22IsNotThisUIReview=false,r=>r.legacyInventory[0].title+=' changed']){const r=structuredClone(review);change(r);assert.throws(()=>verifyTrialUIPreparationReplacements(runtime,reports(),r));}
});
test('unexecuted skipped renamed duplicated and incomplete current counterparts cannot close the original UI debt',()=>{
 assert.throws(()=>verifyTrialUIPreparationReplacements(runtime,[]),/missing/);
 for(const change of [r=>r[0].report.suites[0].specs.pop(),r=>r[0].report.suites[0].specs[0].tests[0].results=[],r=>r[0].report.suites[0].specs[0].tests[0].results[0].status='skipped',r=>r[0].report.suites[0].specs[0].title+=' other',r=>r[1].report.suites[0].specs=r[1].report.suites[0].specs.slice(0,2),r=>r[0].report.suites[0].specs.push(structuredClone(r[0].report.suites[0].specs[0]))]){const r=reports();change(r);assert.throws(()=>verifyTrialUIPreparationReplacements(runtime,r));}
});
test('missing normal entry payload and owner or pre-consumption corruption are refused even if all statuses say passed',()=>{
 for(const change of [row=>row.attachments=[],row=>{const body=JSON.parse(Buffer.from(row.attachments[0].body,'base64'));body.raw['checkpoint-owner'].sourceRevision++;row.attachments[0].body=Buffer.from(JSON.stringify(body)).toString('base64');},row=>{const body=JSON.parse(Buffer.from(row.attachments[0].body,'base64'));body.raw.checkpoint.snapshot=body.raw.current;row.attachments[0].body=Buffer.from(JSON.stringify(body)).toString('base64');},row=>row.attachments.push(structuredClone(row.attachments[0]))]){const r=reports(),result=r[1].report.suites[0].specs.find(x=>x.file==='idle-normal-matrix.spec.ts').tests[0].results[0];change(result);assert.throws(()=>verifyTrialUIPreparationReplacements(runtime,r));}
});
test('different runtime hidden retries dirty source and altered counterpart source bindings cannot be approved',()=>{
 for(const change of [r=>r[0].report.config.metadata.runtimeDigest='c'.repeat(64),r=>r[0].report.config.metadata.chenyuan.dirty=true,r=>r[0].report.config.projects[0].retries=1,r=>r[0].report.suites[0].specs[0].tests[0].results.push(structuredClone(r[0].report.suites[0].specs[0].tests[0].results[0]))]){const r=reports();change(r);assert.throws(()=>verifyTrialUIPreparationReplacements(runtime,r));}
 const changed=structuredClone(review);changed.sourceBindings.ui[0].sha256='0'.repeat(64);assert.throws(()=>verifyTrialUIPreparationReplacements(runtime,reports(),changed),/source changed/);
});
