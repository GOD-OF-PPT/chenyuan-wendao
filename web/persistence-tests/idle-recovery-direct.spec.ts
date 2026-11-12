import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';

test('direct medicine and sale commit once with activity CAS and quota rollback',async({page})=>{
  await setupPersistence(page);
  const rows=await page.evaluate(async()=>{
    const h=(globalThis as any).h,out=[];
    for(const type of ['USE','SELL']){
      const d=h.routes.driver();d.buy('healing_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'flee'});d.go(type==='SELL'?'market':'cave');
      const name='direct-'+type,repo=await h.FullSaveRepository.open(name);
      try{
        await repo.importText(JSON.stringify(d.game),h.mutation());const before=await repo.loadActivitySnapshot();
        const intent={command:{type,item:'healing_pill',...(type==='SELL'?{quantity:1}:{}),commandId:crypto.randomUUID(),runId:before.state.core.runId,expectedRevision:before.state.core.revision},expectedActivityId:null,expectedActivityRevision:null};
        const raw=await h.inspect(name),put=IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name===h.FULL_RECEIPT_STORE)throw new DOMException('direct quota','QuotaExceededError');return put.call(this,value,key!);};
        let failed;try{failed=await h.attempt(()=>repo.executeDirect(intent));}finally{IDBObjectStore.prototype.put=put;}
        const afterFailure=await h.inspect(name),saved=await repo.executeDirect(intent),replay=await repo.executeDirect(intent);
        out.push({type,before,raw,failed,afterFailure,saved,replay,formal:h.engine.resolve(before.state,intent.command),persisted:await repo.loadActivitySnapshot()});
      }finally{repo.close();}
    }return out;
  });
  for(const r of rows){expect(r.failed.code).toBe('STORAGE_QUOTA');expect(r.afterFailure).toEqual(r.raw);expect(r.saved.state).toEqual(r.formal.nextState);expect(r.saved.result).toEqual(r.formal.result);expect(r.saved.activity).toBeNull();expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.saved.state);expect(r.persisted).toEqual({state:r.saved.state,activity:null});}
});
