import {test,expect} from '@playwright/test';
import {setupCurrentRecovery} from './idle-recovery-support';
test.beforeEach(async({page})=>setupCurrentRecovery(page));
test.afterEach(async({page})=>{if(!page.isClosed())await page.evaluate(()=>{const h=(window as any).h;if(h?.m04RealNow)Date.now=h.m04RealNow;});});

for(const target of ['checkpoint','checkpoint-owner','receipt'])test(`M04-N2 ${target} quota and put-success abort preserve the actual previous ordinary checkpoint before trial entry retries once`,async({page},info)=>{
 const rows=await page.evaluate(async target=>{
  const h=(window as any).h,out=[];
  for(const mode of ['quota','abort']){
   const name='m04-prior-'+target+'-'+mode,{repo,snapshot,prior}=await h.m04GoodTrial(name);
   try{
    const started=await repo.startActivity(h.milestonePlan({type:'START_TRIAL'}),h.milestoneMutation(snapshot,'m04-entry'));
    const tick=h.milestoneTick(started),formal=h.engine.resolve(started.state,started.activity.nextCommand);
    h.m04Now=started.activity.dueAt;const before=await h.inspect(name),put=IDBObjectStore.prototype.put,hits:any[]=[];
    IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
     const match=this.transaction.db.name===name&&(target==='receipt'?this.name===h.FULL_RECEIPT_STORE:this.name===h.FULL_STATE_STORE&&key===target);
     if(match){IDBObjectStore.prototype.put=put;hits.push({store:this.name,key,requestSuccess:false,abortCalled:false});if(mode==='quota')throw new DOMException('M04 prior-good target','QuotaExceededError');const q=put.call(this,value,key!);q.addEventListener('success',()=>{hits[0].requestSuccess=true;this.transaction.abort();hits[0].abortCalled=true;});return q;}
     return put.call(this,value,key!);
    };
    let failed;try{failed=await h.attempt(()=>repo.settleActivity(tick));}finally{IDBObjectStore.prototype.put=put;}
    const after=await h.inspect(name),oldCheckpoint=await repo.loadCheckpoint();
    h.m04Same(before,after,'all stores retain prior good checkpoint after '+mode);h.m04Same(oldCheckpoint,prior,'old checkpoint after '+mode);
    const retry=await repo.settleActivity(tick),committed=await h.inspect(name),replay=await repo.settleActivity(tick),afterReplay=await h.inspect(name),checkpoint=await repo.loadCheckpoint();
    out.push({target,mode,failed,hits,before,after,oldCheckpoint,prior,started,tick,formal,retry,committed,replay,afterReplay,checkpoint});
   }finally{repo.close();}
  }
  return out;
 },target);
 for(const r of rows){
  expect(r.failed.code).toBe(r.mode==='quota'?'STORAGE_QUOTA':'STORAGE_ABORTED');expect(r.hits).toHaveLength(1);
  if(r.mode==='abort'){expect(r.hits[0].requestSuccess).toBe(true);expect(r.hits[0].abortCalled).toBe(true);}
  expect(r.after).toEqual(r.before);expect(r.oldCheckpoint).toEqual(r.prior);expect(r.prior.kind).toBe('breakthrough');
  expect(r.retry.state).toEqual(r.formal.nextState);expect(r.retry.result).toEqual(r.formal.result);
  expect(r.retry.activity.completedCycles).toBe(1);expect(r.checkpoint.kind).toBe('trial');expect(r.checkpoint.snapshot).toEqual(r.started.state);
  expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.retry.state);expect(r.afterReplay).toEqual(r.committed);
  const records=r.committed['full-receipts'].filter((x:any)=>x.key===r.tick.runId+':'+r.tick.commandId);expect(records).toHaveLength(1);
  expect(records[0].value.proof.activityBefore).toEqual(r.started.activity);expect(records[0].value.proof.activityBefore.originGame).toEqual(r.started.state);expect(records[0].value.proof.stateAfter).toEqual(r.retry.state);
 }
 await info.attach('prior-good-checkpoint-summary',{body:JSON.stringify(rows.map(r=>({target:r.target,mode:r.mode,code:r.failed.code,hits:r.hits,cycleMs:r.started.activity.cycleMs,originalCommand:r.tick.commandId,priorKind:r.prior.kind,newKind:r.checkpoint.kind,fullAllStoresCompared:true}))),contentType:'application/json'});
});
