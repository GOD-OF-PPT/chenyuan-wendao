import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { getLifeRecord } from '../../src/full/queries.ts';
test.beforeEach(async ({ page }) => setupPersistence(page));

test('retirement state and receipt commit together, quota failure preserves the active life and one retry does not age it', async ({ page }) => {
  const result=await page.evaluate(async()=>{
    const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('retire-atomic');
    let state=(await repo.create('归隐事务',h.mutation())).state;state=(await repo.execute(h.command(state,{type:'CHOOSE',choice:'leave'}))).state;
    const before=await h.inspect('retire-atomic'),command=h.command(state,{type:'RETIRE'}),put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name===h.FULL_RECEIPT_STORE)throw new DOMException('ending quota','QuotaExceededError');return put.call(this,value,key!);};
    let failed;try{failed=await h.attempt(()=>repo.execute(command));}finally{IDBObjectStore.prototype.put=put;}
    const afterFailure=await h.inspect('retire-atomic'),first=await repo.execute(command),retry=await repo.execute(command),previous=await repo.loadPrevious();repo.close();
    const reopened=await h.FullSaveRepository.open('retire-atomic'),loaded=await reopened.load();reopened.close();
    return{state,before,failed,afterFailure,first,retry,previous,loaded};
  });
  expect(result.failed.code).toBe('STORAGE_QUOTA');expect(result.afterFailure).toEqual(result.before);
  expect(result.first.state.status).toBe('ended');expect(result.first.state.ending).toBe('retired');expect(result.first.state.core.player).toEqual(result.state.core.player);
  expect(result.first.state.core.world).toEqual(result.state.core.world);expect(result.first.result.costs.months).toBe(0);
  expect(result.retry.replayed).toBe(true);expect(result.retry.state).toEqual(result.first.state);expect(result.retry.result).toEqual(result.first.result);
  expect(result.previous).toEqual(result.state);expect(result.loaded).toEqual(result.first.state);expect(getLifeRecord(result.loaded).overview.ageMonths).toBe(216);
});

test('actual last-month progress ends once, abort rolls back, and two restores recover the complete real preparation', async ({ page }) => {
  const result=await page.evaluate(async()=>{
    const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('lifespan-atomic');let state=(await repo.create('寿尽事务',h.mutation())).state;
    const act=async(action:any)=>{state=(await repo.execute(h.command(state,action))).state;};
    await act({type:'CHOOSE',choice:'leave'});await act({type:'TRAVEL',location:'cave'});await act({type:'CULTIVATE',method:'natural',count:2});const prepared=state;
    await act({type:'BREAKTHROUGH'});await act({type:'TRAVEL',location:'sect'});
    const target=1440-state.core.player.startAgeMonths-1;
    while(state.core.world.elapsedMonths<target)await act({type:'SOURCE',sourceId:'work',count:Math.min(50,target-state.core.world.elapsedMonths)});
    const before=await h.inspect('lifespan-atomic'),command=h.command(state,{type:'END_LIFE'}),put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){const req=put.call(this,value,key!);if(this.name===h.FULL_STATE_STORE&&key==='current')req.addEventListener('success',()=>this.transaction.abort());return req;};
    let failed;try{failed=await h.attempt(()=>repo.execute(command));}finally{IDBObjectStore.prototype.put=put;}
    const afterFailure=await h.inspect('lifespan-atomic'),first=await repo.execute(command),retry=await repo.execute(command);
    const duplicate=await h.attempt(()=>repo.execute(h.command(first.state,{type:'END_LIFE'})));
    const restored=(await repo.restoreCheckpoint(h.mutation(first.state))).state,restoredAgain=(await repo.restoreCheckpoint(h.mutation(restored))).state;repo.close();
    return{state,prepared,before,failed,afterFailure,first,retry,duplicate,restored,restoredAgain};
  });
  expect(result.failed.code).toBe('STORAGE_ABORTED');expect(result.afterFailure).toEqual(result.before);expect(result.first.state.ending).toBe('lifespan');
  expect(result.first.state.core.world.elapsedMonths).toBe(result.state.core.world.elapsedMonths+1);expect(result.first.state.core.player).toEqual(result.state.core.player);
  expect(result.first.result.costs.months).toBe(1);expect(result.retry.replayed).toBe(true);expect(result.retry.state).toEqual(result.first.state);expect(result.duplicate.code).toBe('ENDED');
  const normalize=(game:any)=>{const value=structuredClone(game);value.core.runId='<run>';value.core.revision=0;return value;};
  expect(normalize(result.restored)).toEqual(normalize(result.prepared));expect(normalize(result.restoredAgain)).toEqual(normalize(result.prepared));
  expect(result.restored.core.runId).not.toBe(result.restoredAgain.core.runId);expect(getLifeRecord(result.restored).overview.reason).toBeNull();
  expect(getLifeRecord(result.first.state).overview.remainingMonths).toBe(0);
});

test('a reviewed ending command cannot retire a changed revision or a newly created life', async ({ page }) => {
  const result=await page.evaluate(async()=>{
    const h=(globalThis as any).h,a=await h.FullSaveRepository.open('reviewed-ending'),b=await h.FullSaveRepository.open('reviewed-ending');
    let state=(await a.create('原人生',h.mutation())).state;state=(await a.execute(h.command(state,{type:'CHOOSE',choice:'leave'}))).state;
    const reviewed=h.command(state,{type:'RETIRE'}),advanced=(await b.execute(h.command(state,{type:'TRAVEL',location:'cave'}))).state;
    const beforeStale=await h.inspect('reviewed-ending'),stale=await h.attempt(()=>a.execute(reviewed)),afterStale=await h.inspect('reviewed-ending');
    const replaced=(await b.create('新人',h.mutation(advanced))).state,beforeForeign=await h.inspect('reviewed-ending'),foreign=await h.attempt(()=>a.execute(reviewed)),afterForeign=await h.inspect('reviewed-ending');a.close();b.close();
    return{reviewed,stale,beforeStale,afterStale,replaced,foreign,beforeForeign,afterForeign};
  });
  expect(result.stale.code).toBe('STALE_REVISION');expect(result.afterStale).toEqual(result.beforeStale);
  expect(result.foreign.code).toBe('RUN_MISMATCH');expect(result.afterForeign).toEqual(result.beforeForeign);expect(result.replaced.status).toBe('active');
});

test('ending inside a pending event is refused without a receipt or false saved ending', async ({ page }) => {
  const result=await page.evaluate(async()=>{
    const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('blocked-ending');const state=(await repo.create('未决',h.mutation())).state;
    const before=await h.inspect('blocked-ending'),retired=await h.attempt(()=>repo.execute(h.command(state,{type:'RETIRE'}))),lifespan=await h.attempt(()=>repo.execute(h.command(state,{type:'END_LIFE'}))),after=await h.inspect('blocked-ending');repo.close();return{before,retired,lifespan,after};
  });
  expect(result.retired.code).toBe('PENDING');expect(result.lifespan.code).toBe('PENDING');expect(result.after).toEqual(result.before);
});

test('a derived life record is never imported as a Game save over existing progress', async ({ page }) => {
  const result=await page.evaluate(async()=>{
    const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('record-not-save');const state=(await repo.create('好档',h.mutation())).state;
    const before=await h.inspect('record-not-save'),failed=await h.attempt(()=>repo.importText(JSON.stringify({format:'chenyuan-life-record',version:1,source:{runId:state.core.runId},overview:{name:'不是完整存档'}}),h.mutation(state))),after=await h.inspect('record-not-save');repo.close();return{before,failed,after};
  });
  expect(result.failed.code).toBe('SAVE_VERSION');expect(result.after).toEqual(result.before);
});
