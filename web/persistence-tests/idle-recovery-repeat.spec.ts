import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';

test('a repeating native source beyond fifty cycles preserves every store on quota and replays only its original cycle',async({page})=>{
  await setupPersistence(page);
  const r=await page.evaluate(async()=>{
    const h=(globalThis as any).h,name='repeat-native',d=h.routes.driver();d.go('wilderness');
    const repo=await h.FullSaveRepository.open(name),realNow=Date.now;let now=1700000000000;Date.now=()=>now;
    const mutation=(s:any,owner='one')=>({commandId:crypto.randomUUID(),runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:owner});
    const tick=(s:any)=>({commandId:s.activity.nextCommand.commandId,runId:s.state.core.runId,expectedRevision:s.state.core.revision,activityId:s.activity.id,expectedActivityRevision:s.activity.revision,ownerId:s.activity.ownerId,generation:s.activity.generation});
    try{
      await repo.importText(JSON.stringify(d.game),h.mutation());const original=await repo.loadActivitySnapshot();
      let s=await repo.startActivity({kind:'source',sourceId:'herbs',maxCycles:1000000000,repeat:true,until:'cycles',target:null,monthBudget:54,remainingMonthsReserve:1},mutation(original));
      for(let i=0;i<51;i++){now=s.activity.dueAt;s=await repo.settleActivity(tick(s));}
      const command=tick(s),before=await h.inspect(name),put=IDBObjectStore.prototype.put;now=s.activity.dueAt;
      IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name===h.FULL_RECEIPT_STORE)throw new DOMException('repeat quota','QuotaExceededError');return put.call(this,value,key!);};
      let failed;try{failed=await h.attempt(()=>repo.settleActivity(command));}finally{IDBObjectStore.prototype.put=put;}
      const after=await h.inspect(name),retry=await repo.settleActivity(command),replay=await repo.settleActivity(command);
      const history=await repo.loadActivityHistory(retry.activity.id,0,20),persisted=await repo.loadActivitySnapshot();
      return{original,at51:s,failed,before,after,retry,replay,history,persisted};
    }finally{Date.now=realNow;repo.close();}
  });
  expect(r.at51.activity.completedCycles).toBe(51);expect(r.at51.activity.status).toBe('running');
  expect(r.failed.code).toBe('STORAGE_QUOTA');expect(r.after).toEqual(r.before);
  expect(r.retry.activity.completedCycles).toBe(52);expect(r.retry.activity.spentMonths).toBe(52);expect(r.retry.activity.gainedItems).toEqual({herb:104});
  expect(r.retry.state.core.inventory.herb).toBe(r.original.state.core.inventory.herb+104);expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.retry.state);expect(r.replay.activity).toEqual(r.retry.activity);
  expect(r.history.total).toBe(52);expect(r.persisted).toEqual({state:r.retry.state,activity:r.retry.activity});
});
