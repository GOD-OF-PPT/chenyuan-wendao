import {test,expect,type Page} from '@playwright/test';
import {setupMilestones} from './milestone-support';
import {repositoryFsRoot as root} from './fs-root';

test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
 await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
 await setupMilestones(page);
 await page.evaluate(async root=>{
  const h=(globalThis as any).h,open=IDBFactory.prototype.open;
  h.ackRuleError=(await import(`/@fs${root}src/full/errors.ts`)).RuleError;
  IDBFactory.prototype.open=function(name:string,version?:number){
   const request=version===undefined?open.call(this,name):open.call(this,name,version);
   request.addEventListener('success',()=>{if(name===h.FULL_DB_NAME&&!h.ackDB){h.ackDB=request.result;IDBFactory.prototype.open=open;}});
   return request;
  };
  h.ackRestoreOpen=()=>IDBFactory.prototype.open=open;
  const {createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');
  h.ackCreateStore=createActivityStoreHarness;h.ackStore=createActivityStoreHarness();
  await h.ackStore.store.init();
  h.ackSeed=h.ackStore.store.importText(JSON.stringify(h.milestoneSamples.find((r:any)=>r.action.type==='CHOOSE').game));
 },root);
 await page.clock.runFor(700);
 await expect.poll(()=>page.evaluate(()=>{const s=(globalThis as any).h.ackStore.store;return{busy:s.busy,error:s.error,event:s.game?.core.activeEvent?.id};})).toEqual({busy:false,error:'',event:'temple'});
});
test.afterEach(async({page})=>page.evaluate(()=>{const h=(globalThis as any).h;h?.ackRelease?.();h?.ackRestore?.();h?.ackRestoreOpen?.();if(!h?.ackDisposed)h?.ackStore?.dispose();h?.ackNextStore?.dispose();}));

async function importSample(page:Page,type:string){
 await page.evaluate(type=>{const h=(globalThis as any).h;h.ackSeed=h.ackStore.store.importText(JSON.stringify(h.milestoneSamples.find((r:any)=>r.action.type===type).game));},type);
 await page.clock.runFor(700);
 await expect.poll(()=>page.evaluate(()=>{const s=(globalThis as any).h.ackStore.store;return{busy:s.busy,error:s.error};})).toEqual({busy:false,error:''});
}

test('a received native START remains exactly acknowledged after real versionchange closes checkpoint delivery without claiming a new saved Game',async({page})=>{
 const prepared=await page.evaluate(async()=>{
  const h=(globalThis as any).h,s=h.ackStore.store,proto=h.FullSaveRepository.prototype,load=proto.loadCheckpoint;
  const before=await h.inspect(h.FULL_DB_NAME),intent=s.prepareMilestone({type:'CHOOSE',choice:'help'});
  h.ackIntent=structuredClone(intent);h.ackRestore=()=>proto.loadCheckpoint=load;
  proto.loadCheckpoint=async function(){const result=await load.call(this);h.ackRestore();h.ackCheckpointReadCompleted=true;await new Promise<void>(resolve=>h.ackRelease=resolve);return result;};
  h.ackStart=s.startOnlinePreparedMilestone(intent);return{before,intent};
 });
 await expect.poll(()=>page.evaluate(()=>(globalThis as any).h.ackCheckpointReadCompleted)).toBe(true);
 const closed=await page.evaluate(async()=>{
  const h=(globalThis as any).h;h.ackDB.addEventListener('versionchange',()=>h.ackNativeVersionChange=true);
  const aborted=await new Promise<string>((resolve,reject)=>{
   const request=indexedDB.open(h.FULL_DB_NAME,h.ackDB.version+1);
   request.onupgradeneeded=()=>{const db=request.result;request.transaction!.abort();db.close();};
   request.onerror=()=>resolve(request.error!.name);request.onsuccess=()=>{request.result.close();reject(new Error('Test upgrade must abort'));};
  });
  const raw=await h.inspect(h.FULL_DB_NAME);h.ackRelease();await h.ackStart;
  const s=h.ackStore.store,intent=h.ackIntent;
  return{aborted,native:h.ackNativeVersionChange,raw,after:await h.inspect(h.FULL_DB_NAME),ui:h.ackStore.state(),available:s.available,syncIssue:s.syncIssue,
   acknowledged:s.wasConfirmedFor(intent.mutation.commandId,intent.mutation.runId),wrongRun:s.wasConfirmedFor(intent.mutation.commandId,crypto.randomUUID()),unknown:s.wasConfirmedFor(crypto.randomUUID(),intent.mutation.runId)};
 });
 expect(closed.native).toBe(true);expect(closed.aborted).toBe('AbortError');expect(closed.raw.version).toBe(10);expect(closed.after).toEqual(closed.raw);
 expect(closed.ui.error).toContain('无法同步存档');expect(closed.ui.error).toContain('关闭');expect(closed.ui.saved).toBe(false);expect(closed.syncIssue).toBe(true);expect(closed.available).toBe(false);
 expect(closed.ui.canRetry).toBe(false);expect(closed.ui.runtime).toBeNull();expect(closed.ui.game).toEqual(prepared.before['full-state'].find((r:any)=>r.key==='current').value);
 expect(closed.ui.activity.plan).toEqual(prepared.intent.plan);expect(closed.ui.activity.completedCycles).toBe(0);
 const record=closed.raw['full-receipts'].find((r:any)=>r.key===prepared.intent.mutation.runId+':'+prepared.intent.mutation.commandId)?.value;
 expect(record).toBeTruthy();expect(record.input.kind).toBe('START');expect(record.input.plan).toEqual(prepared.intent.plan);expect(record.input.mutation).toEqual(prepared.intent.mutation);
 expect(closed.acknowledged).toBe(true);expect(closed.wrongRun).toBe(false);expect(closed.unknown).toBe(false);
 await page.clock.runFor(60_000);
 expect(await page.evaluate(()=>(globalThis as any).h.ackStore.state())).toEqual(closed.ui);
 expect(await page.evaluate(()=>(globalThis as any).h.inspect((globalThis as any).h.FULL_DB_NAME))).toEqual(closed.after);
});

test('unsubmitted quota and lost native START replies remain unacknowledged until original receipt retry and private confirmation memory is bounded',async({page})=>{
 const rows=[];
 for(const mode of ['quota','lost']){
  if(mode==='lost')await importSample(page,'CHOOSE');
  const row=await page.evaluate(async mode=>{
   const h=(globalThis as any).h,s=h.ackStore.store,intent=s.prepareMilestone({type:'CHOOSE',choice:'trade'}),before=await h.inspect(h.FULL_DB_NAME),proto=h.FullSaveRepository.prototype,start=proto.startActivity,put=IDBObjectStore.prototype.put;
   h.ackRestore=()=>{proto.startActivity=start;IDBObjectStore.prototype.put=put;};
   if(mode==='lost')proto.startActivity=async function(...args:any[]){const outcome=await start.apply(this,args);h.ackRestore();h.ackLostOutcome=structuredClone(outcome);throw new h.ackRuleError('STORAGE_ABORTED','native START committed but reply was lost');};
   else IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts')throw new DOMException('native START quota','QuotaExceededError');return put.call(this,value,key!);};
   try{await s.startOnlinePreparedMilestone(intent);}finally{h.ackRestore();}
   const failed={ui:h.ackStore.state(),ack:s.wasConfirmedFor(intent.mutation.commandId,intent.mutation.runId),raw:await h.inspect(h.FULL_DB_NAME)};
   await s.retryFor(intent.mutation.commandId);
   const retried={ui:h.ackStore.state(),ack:s.wasConfirmedFor(intent.mutation.commandId,intent.mutation.runId),raw:await h.inspect(h.FULL_DB_NAME)};
   h.ackOriginal=intent.mutation;return{mode,before,intent,failed,retried};
  },mode);
  rows.push(row);
 }
 for(const r of rows){
  expect(r.failed.ack).toBe(false);expect(r.failed.ui.canRetry).toBe(true);expect(r.failed.ui.saved).toBe(false);expect(r.failed.ui.game).toEqual(r.retried.ui.game);
  if(r.mode==='quota')expect(r.failed.raw).toEqual(r.before);else expect(r.retried.raw).toEqual(r.failed.raw);
  expect(r.retried.ack).toBe(true);expect(r.retried.ui.error).toBe('');expect(r.retried.ui.activity.completedCycles).toBe(0);expect(r.retried.ui.activity.plan).toEqual(r.intent.plan);
  const key=r.intent.mutation.runId+':'+r.intent.mutation.commandId;expect(r.retried.raw['full-receipts'].filter((x:any)=>x.key===key)).toHaveLength(1);
 }
 await importSample(page,'BREAKTHROUGH');
 const bounded=await page.evaluate(async()=>{
  const h=(globalThis as any).h,s=h.ackStore.store,ids=[];
  for(let n=0;n<129;n++){const intent=s.prepareConfiguration({type:'SCHOOL',school:s.game.school==='sword'?'talisman':'sword'});if(!intent)throw new Error('Lawful alternate school configuration unavailable');await s.applyConfiguration(intent);if(s.error)throw new Error(s.error);ids.push(structuredClone(intent.command));}
  const before=await h.inspect(h.FULL_DB_NAME),checks={old:s.wasConfirmedFor(h.ackOriginal.commandId,h.ackOriginal.runId),first:s.wasConfirmedFor(ids[0].commandId,ids[0].runId),second:s.wasConfirmedFor(ids[1].commandId,ids[1].runId),last:s.wasConfirmedFor(ids[128].commandId,ids[128].runId)};
  return{checks,before,after:await h.inspect(h.FULL_DB_NAME)};
 });
 expect(bounded.checks).toEqual({old:false,first:false,second:true,last:true});expect(bounded.after).toEqual(bounded.before);
});

test('a native START delivered after its Store is disposed cannot acknowledge or overwrite the replacement connection',async({page})=>{
 const held=await page.evaluate(async()=>{
  const h=(globalThis as any).h,s=h.ackStore.store,proto=h.FullSaveRepository.prototype,start=proto.startActivity,intent=s.prepareMilestone({type:'CHOOSE',choice:'leave'});
  h.ackRestore=()=>proto.startActivity=start;
  proto.startActivity=async function(...args:any[]){const outcome=await start.apply(this,args);h.ackRestore();h.ackHeldOutcome=structuredClone(outcome);await new Promise<void>(resolve=>h.ackRelease=resolve);return outcome;};
  h.ackStart=s.startOnlinePreparedMilestone(intent);return{intent,before:h.ackStore.state()};
 });
 await expect.poll(()=>page.evaluate(()=>!!(globalThis as any).h.ackHeldOutcome)).toBe(true);
 const done=await page.evaluate(async()=>{
  const h=(globalThis as any).h;h.ackStore.dispose();h.ackDisposed=true;h.ackNextStore=h.ackCreateStore();await h.ackNextStore.store.init();const before=h.ackNextStore.state(),raw=await h.inspect(h.FULL_DB_NAME);
  h.ackRelease();await h.ackStart;
  return{before,after:h.ackNextStore.state(),raw,afterRaw:await h.inspect(h.FULL_DB_NAME),outcome:h.ackHeldOutcome};
 });
 expect(done.after).toEqual(done.before);expect(done.afterRaw).toEqual(done.raw);expect(done.after.game).toEqual(held.before.game);expect(done.after.activity).toEqual(done.outcome.activity);expect(done.after.runtime).toBeNull();
 const exact=await page.evaluate(intent=>{const h=(globalThis as any).h;return{old:h.ackStore.store.wasConfirmedFor(intent.mutation.commandId,intent.mutation.runId),replacement:h.ackNextStore.store.wasConfirmedFor(intent.mutation.commandId,intent.mutation.runId)};},held.intent);
 expect(exact).toEqual({old:false,replacement:false});
 await page.clock.runFor(60_000);expect(await page.evaluate(()=>(globalThis as any).h.ackNextStore.state())).toEqual(done.after);
});
