import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { detailedTrialScenario } from '../../tests/trial-preparation-route.mjs';
const scenario=detailedTrialScenario();
test.beforeEach(async({page})=>setupPersistence(page));
async function ready(page:any,name:string){
 return page.evaluate(async({name,prefix,actions}:any)=>{
  const h=(globalThis as any).h,repo=await h.FullSaveRepository.open(name);let state=(await repo.importText(JSON.stringify(prefix),h.mutation())).state;
  for(const action of actions)state=(await repo.execute(h.command(state,action))).state;
  const checkpoint=await repo.loadCheckpoint();repo.close();return{state,checkpoint};
 },{name,prefix:scenario.prefix,actions:scenario.actions});
}
const normalized=(game:any)=>{const value=structuredClone(game);value.core.runId='<run>';value.core.revision=0;if(value.core.activeEvent)value.core.activeEvent.instanceId='<run>:'+value.core.activeEvent.id;return value;};

test('real entry atomically replaces a breakthrough checkpoint with the complete pre-consumption state and stable retry',async({page})=>{
 const initial=await ready(page,'trial-entry');expect(initial.checkpoint.kind).toBe('breakthrough');expect(normalized(initial.state)).toEqual(normalized(scenario.game));
 const result=await page.evaluate(async()=>{
  const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('trial-entry'),before=await repo.load(),command=h.command(before,{type:'START_TRIAL'});
  const first=await repo.execute(command),cp=await repo.loadCheckpoint(),previous=await repo.loadPrevious(),retry=await repo.execute(command);
  const storedBefore=await h.inspect('trial-entry'),duplicate=await h.attempt(()=>repo.execute(h.command(first.state,{type:'START_TRIAL'}))),storedAfter=await h.inspect('trial-entry');
  const answered=await repo.execute(h.command(first.state,{type:'ANSWER_TRIAL',answer:'accept'})),lateRetry=await repo.execute(command);repo.close();
  const reopened=await h.FullSaveRepository.open('trial-entry'),loaded=await reopened.load(),loadedCP=await reopened.loadCheckpoint();reopened.close();
  return{before,command,first,cp,previous,retry,duplicate,storedBefore,storedAfter,answered,lateRetry,loaded,loadedCP};
 });
 expect(result.cp.kind).toBe('trial');expect(result.cp.snapshot).toEqual(result.before);expect(result.cp.sourceRunId).toBe(result.before.core.runId);expect(result.cp.sourceRevision).toBe(result.before.core.revision);expect(result.previous).toEqual(result.before);
 expect(result.first.state.core.inventory.ascension_seal).toBe(result.before.core.inventory.ascension_seal-1);expect(result.first.state.core.activeEvent.id).toBe('trial_question');expect(result.first.state.trial).toEqual({stage:0,answer:null});
 expect(result.first.result.costs.items).toEqual({ascension_seal:1});expect(result.first.state.core.world).toEqual(result.before.core.world);
 expect(result.retry.replayed).toBe(true);expect(result.retry.result).toEqual(result.first.result);expect(result.retry.state).toEqual(result.first.state);
 expect(result.duplicate.code).toBe('PENDING_EVENT');expect(result.storedAfter).toEqual(result.storedBefore);expect(result.lateRetry.state).toEqual(result.answered.state);expect(result.lateRetry.result).toEqual(result.first.result);
 expect(result.loaded).toEqual(result.answered.state);expect(result.loadedCP).toEqual(result.cp);
});

test('checkpoint, owner and receipt write failures roll the entire entry back without replacing the prior good checkpoint',async({page})=>{
 for(const target of ['checkpoint','checkpoint-owner','receipt']){
  const name='trial-fail-'+target;await ready(page,name);
  const result=await page.evaluate(async({name,target}:any)=>{
   const h=(globalThis as any).h,repo=await h.FullSaveRepository.open(name),state=await repo.load(),command=h.command(state,{type:'START_TRIAL'}),before=await h.inspect(name),put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(target==='receipt'?this.name===h.FULL_RECEIPT_STORE:this.name===h.FULL_STATE_STORE&&key===target)throw new DOMException('entry quota','QuotaExceededError');return put.call(this,value,key!);};
   let failed;try{failed=await h.attempt(()=>repo.execute(command));}finally{IDBObjectStore.prototype.put=put;}
   const after=await h.inspect(name),retried=await repo.execute(command),cp=await repo.loadCheckpoint();repo.close();return{before,failed,after,retried,cp,state};
  },{name,target});
  expect(result.failed.code).toBe('STORAGE_QUOTA');expect(result.after).toEqual(result.before);expect(result.retried.state.core.activeEvent.id).toBe('trial_question');expect(result.cp.snapshot).toEqual(result.state);
 }
});

test('put success is insufficient: transaction abort leaves all entry records untouched',async({page})=>{
 await ready(page,'trial-abort');const result=await page.evaluate(async()=>{
  const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('trial-abort'),state=await repo.load(),before=await h.inspect('trial-abort'),put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){const request=put.call(this,value,key!);if(this.name===h.FULL_STATE_STORE&&key==='checkpoint')request.addEventListener('success',()=>this.transaction.abort());return request;};
  let failed;try{failed=await h.attempt(()=>repo.execute(h.command(state,{type:'START_TRIAL'})));}finally{IDBObjectStore.prototype.put=put;}
  const after=await h.inspect('trial-abort');repo.close();return{before,failed,after};
 });expect(result.failed.code).toBe('STORAGE_ABORTED');expect(result.after).toEqual(result.before);
});

test('two real entries and complete restores never accumulate or partially return entry materials',async({page})=>{
 const initial=await ready(page,'trial-restore');const result=await page.evaluate(async()=>{
  const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('trial-restore'),restored=[];let state=await repo.load();
  for(let attempt=0;attempt<2;attempt++){
   const entered=await repo.execute(h.command(state,{type:'START_TRIAL'}));const cp=await repo.loadCheckpoint();
   state=(await repo.restoreCheckpoint(h.mutation(entered.state))).state;restored.push({state,cp});
  }
  repo.close();return restored;
 });
 for(const row of result){expect(normalized(row.state)).toEqual(normalized(initial.state));expect(normalized(row.cp.snapshot)).toEqual(normalized(initial.state));expect(row.state.core.inventory.ascension_seal).toBe(2);}
 expect(result[0].state.core.runId).not.toBe(result[1].state.core.runId);
});

test('entry preview identities lose races to another action or life replacement without consuming a seal',async({page})=>{
 await ready(page,'trial-race');const result=await page.evaluate(async()=>{
  const h=(globalThis as any).h,a=await h.FullSaveRepository.open('trial-race'),b=await h.FullSaveRepository.open('trial-race'),state=await a.load(),review=h.command(state,{type:'START_TRIAL'});
  const changed=await b.execute(h.command(state,{type:'TRAVEL',location:'cave'})),before=await h.inspect('trial-race'),stale=await h.attempt(()=>a.execute(review)),after=await h.inspect('trial-race');
  const next=await b.create('新人生',h.mutation(changed.state)),beforeNew=await h.inspect('trial-race'),foreign=await h.attempt(()=>a.execute(review)),afterNew=await h.inspect('trial-race');a.close();b.close();return{before,stale,after,next,beforeNew,foreign,afterNew};
 });expect(result.stale.code).toBe('STALE_REVISION');expect(result.after).toEqual(result.before);expect(result.foreign.code).toBe('RUN_MISMATCH');expect(result.afterNew).toEqual(result.beforeNew);expect(result.next.state.core.inventory.ascension_seal).toBe(0);
});
