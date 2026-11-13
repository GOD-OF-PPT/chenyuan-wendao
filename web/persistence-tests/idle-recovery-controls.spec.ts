import {confirmedDelivery} from './support';
import {test,expect} from '@playwright/test';
import {setupMilestones} from './milestone-support';
import {repositoryFsRoot as root} from './fs-root';
test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupMilestones(page);
 await page.evaluate(async root=>{
  const h=(window as any).h,{createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');
  h.m04ControlRuleError=(await import(`/@fs${root}src/full/errors.ts`)).RuleError;
  h.m04ControlHarness=createActivityStoreHarness();h.m04ControlRestore=()=>{};
 },root);
});
test.afterEach(async({page})=>{if(!page.isClosed())await page.evaluate(()=>{const h=(window as any).h;h?.m04ControlRestore?.();h?.m04ControlHarness?.dispose();});});

for(const kind of ['create','import','restore'])test(`M04-N10 Store ${kind} committed delivery loss keeps the original replacement identity through explicit retry`,async({page},info)=>{
 const before=await page.evaluate(async kind=>{
  const h=(window as any).h,f=h.m04ControlHarness;
  if(kind!=='create'){
   const repo=await h.FullSaveRepository.open();try{await repo.importText(JSON.stringify(h.milestoneSamples.find((x:any)=>x.action.type==='BREAKTHROUGH').game),h.mutation());await h.finishAction(repo,{type:'BREAKTHROUGH'});}finally{repo.close();}
  }
  await f.store.init();if(!f.store.ready||!f.store.available)throw Error('Current control Store not ready');
  return{ui:f.state(),raw:await h.inspect(h.FULL_DB_NAME),checkpoint:f.store.checkpointSummary};
 },kind);
 await page.evaluate(kind=>{
  const h=(window as any).h,f=h.m04ControlHarness,method=kind==='create'?'create':kind==='import'?'importText':'restoreCheckpoint',prototype=h.FullSaveRepository.prototype,original=prototype[method];
  h.m04ControlRestore=()=>prototype[method]=original;
  prototype[method]=async function(...args:any[]){let outcome;try{outcome=await original.apply(this,args);}finally{h.m04ControlRestore();}const intent=kind==='restore'?args[0]:args[1];h.m04ControlDelivery={kind,intent:structuredClone(intent),outcome:structuredClone(outcome)};throw new h.m04ControlRuleError('STORAGE_ABORTED','M04 committed replacement reply lost');};
  if(kind==='create')h.m04ControlJob=f.store.start('明确创建');
  else if(kind==='import')h.m04ControlJob=f.store.importPrepared(JSON.stringify(h.routes.driver('help','talisman').game),f.store.prepareImport());
  else h.m04ControlJob=f.store.restorePrepared(f.store.prepareCheckpoint());
 },kind);
 await page.clock.runFor(599);expect(await page.evaluate(async()=>{const h=(window as any).h;return h.inspect(h.FULL_DB_NAME);})).toEqual(before.raw);
 await page.clock.runFor(1);await page.evaluate(()=>(window as any).h.m04ControlJob);
 const failed=await page.evaluate(async()=>{const h=(window as any).h,f=h.m04ControlHarness,d=h.m04ControlDelivery;return{ui:f.state(),delivery:d,raw:await h.inspect(h.FULL_DB_NAME),persisted:await f.persisted(),retryOriginal:f.store.canRetryFor(d.intent.commandId)};});
 expect(failed.delivery.kind).toBe(kind);expect(failed.ui.saved).toBe(false);expect(failed.retryOriginal).toBe(true);expect(failed.ui.game).toEqual(failed.persisted.state);expect(failed.persisted.state.core.runId).toBe(failed.delivery.intent.runId);
 await page.evaluate(()=>{const h=(window as any).h;h.m04ControlJob=h.m04ControlHarness.store.retryFor(h.m04ControlDelivery.intent.commandId);});
 await page.clock.runFor(600);await page.evaluate(()=>(window as any).h.m04ControlJob);
 const replay=await page.evaluate(async()=>{const h=(window as any).h,f=h.m04ControlHarness;return{ui:f.state(),raw:await h.inspect(h.FULL_DB_NAME),persisted:await f.persisted()};});
 expect(replay.ui.error).toBe('');expect(replay.ui.saved).toBe(true);expect(replay.ui.canRetry).toBe(false);expect(replay.ui.runtime).toBeNull();expect(replay.raw).toEqual(confirmedDelivery(failed.raw,failed.delivery.intent));expect(replay.persisted).toEqual(failed.persisted);
 const controls=replay.raw['full-receipts'].filter((x:any)=>x.value.format==='chenyuan-control-receipt'&&x.value.mutation.commandId===failed.delivery.intent.commandId);expect(controls).toHaveLength(1);expect(controls[0].value.mutation).toEqual(failed.delivery.intent);
 await info.attach('original-control-retry-summary',{body:JSON.stringify({kind,originalIntent:failed.delivery.intent,actualNativeCommitted:true,fullGameRawProofsAndAllOtherMetadataUnchangedOnRetry:true,exactOriginalDeliveryConfirmed:true}),contentType:'application/json'});
});

for(const kind of ['create','import'])for(const mode of ['quota','abort'])test(`M04-N11 ${kind} replacement ${mode} preserves the real good checkpoint and one stable native retry replaces exactly once`,async({page})=>{
 const r=await page.evaluate(async({kind,mode})=>{
  const h=(window as any).h,name='m04-control-'+kind+'-'+mode,{repo}=await h.milestoneFixture(name,'BREAKTHROUGH');
  try{
   await h.finishAction(repo,{type:'BREAKTHROUGH'});const current=await repo.load(),checkpoint=await repo.loadCheckpoint(),intent=h.mutation(current),fixture=h.routes.driver('help','talisman').game,raw=JSON.stringify(fixture),before=await h.inspect(name),put=IDBObjectStore.prototype.put;let hit=false,requestSuccess=false,abortCalled=false;
   const execute=()=>kind==='create'?repo.create('明确替换',intent):repo.importText(raw,intent);
   IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.transaction.db.name===name&&(mode==='quota'?this.name===h.FULL_RECEIPT_STORE:this.name===h.FULL_STATE_STORE&&key==='current')){hit=true;IDBObjectStore.prototype.put=put;if(mode==='quota')throw new DOMException('M04 replacement quota','QuotaExceededError');const q=put.call(this,value,key!);q.addEventListener('success',()=>{requestSuccess=true;this.transaction.abort();abortCalled=true;});return q;}return put.call(this,value,key!);};
   let failed;try{failed=await h.attempt(execute);}finally{IDBObjectStore.prototype.put=put;}
   const after=await h.inspect(name),checkpointAfterFailure=await repo.loadCheckpoint(),first=await execute(),committed=await h.inspect(name),replay=await execute(),afterReplay=await h.inspect(name);
   const changed=structuredClone(fixture);changed.core.player.name='不同导入';const changedPayload=await h.attempt(()=>kind==='create'?repo.create('不同姓名',intent):repo.importText(JSON.stringify(changed),intent));
   return{kind,mode,current,checkpoint,intent,fixture,before,hit,requestSuccess,abortCalled,failed,after,checkpointAfterFailure,first,committed,replay,afterReplay,changedPayload,afterChanged:await h.inspect(name)};
  }finally{repo.close();}
 },{kind,mode});
 expect(r.checkpoint.kind).toBe('breakthrough');expect(r.hit).toBe(true);expect(r.failed.code).toBe(mode==='quota'?'STORAGE_QUOTA':'STORAGE_ABORTED');if(mode==='abort'){expect(r.requestSuccess).toBe(true);expect(r.abortCalled).toBe(true);}
 expect(r.after).toEqual(r.before);expect(r.checkpointAfterFailure).toEqual(r.checkpoint);expect(r.first.replayed).toBe(false);expect(r.first.state.core.runId).toBe(r.intent.runId);expect(r.first.state.core.revision).toBe(0);
 expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.first.state);expect(r.afterReplay).toEqual(r.committed);expect(r.changedPayload.code).toBe('COMMAND_ID_REUSED');expect(r.afterChanged).toEqual(r.committed);
});
