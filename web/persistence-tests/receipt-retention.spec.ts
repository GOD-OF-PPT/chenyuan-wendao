import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';

test.use({trace:'off'});
test.setTimeout(120_000);
test('delivered control writes stay bounded across the replay window without mutating Game or accepting a reused old id',async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 const result=await page.evaluate(async()=>{
  const h=(globalThis as any).h,name='q15-delivered-controls',repo=await h.FullSaveRepository.open(name),d=h.routes.driver();d.go('cave');
  // The same test reaches the pre-feature leak; a passing implementation must
  // also provide the explicit issuer/delivery boundary asserted below.
  const id=()=>typeof repo.issueCommandId==='function'?repo.issueCommandId():crypto.randomUUID();
  async function delivered(operation:Promise<any>,commandId:string){const out=await operation;if(typeof repo.confirmDelivery==='function')await repo.confirmDelivery(out.state.core.runId,commandId);return out;}
  const seed={...h.mutation(),commandId:id()};let out=await delivered(repo.importText(JSON.stringify(d.game),seed),seed.commandId),state=out.state,activity:any=null;
  const before=structuredClone(state),plan={kind:'cultivation',method:'natural',maxCycles:2,until:'cycles',stoneBudget:0,stoneReserve:0};
  const mutation=()=>({commandId:id(),runId:state.core.runId,expectedRevision:state.core.revision,expectedActivityId:activity?.id??null,expectedActivityRevision:activity?.revision??null,ownerId:'q15-receiver'});
  let m=mutation();out=await delivered(repo.startScheduledActivity(plan,m),m.commandId);activity=out.activity;
  let first:any;const counts:number[]=[];
  async function count(){return new Promise<number>((yes,no)=>{const q=indexedDB.open(name);q.onerror=()=>no(q.error);q.onupgradeneeded=()=>{q.transaction!.abort();no(Error('Observer cannot create storage'));};q.onsuccess=()=>{const db=q.result,tx=db.transaction(h.FULL_RECEIPT_STORE,'readonly'),read=tx.objectStore(h.FULL_RECEIPT_STORE).count();let n=0;read.onsuccess=()=>n=read.result;tx.oncomplete=()=>{db.close();yes(n);};tx.onabort=()=>{db.close();no(tx.error);};};});}
  for(let i=0;i<600;i++){
   m=mutation();if(!first)first=structuredClone(m);out=await delivered(repo.pauseScheduledActivity(m),m.commandId);state=out.state;activity=out.activity;
   m=mutation();out=await delivered(repo.resumeScheduledActivity(m),m.commandId);state=out.state;activity=out.activity;
   if(i===0||i===299||i===599)counts.push(await count());
  }
  const protectedBefore=await h.inspect(name),reused=await h.attempt(()=>repo.pauseScheduledActivity({...mutation(),commandId:first.commandId})),protectedAfter=await h.inspect(name),hasIssuer=typeof repo.issueCommandId==='function',hasDelivery=typeof repo.confirmDelivery==='function';
  repo.close();return{before,state,activity,counts,reused,unchangedOnReuse:JSON.stringify(protectedBefore)===JSON.stringify(protectedAfter),hasIssuer,hasDelivery};
 });
 expect(result.state).toEqual(result.before);expect(result.activity.completedCycles).toBe(0);expect(result.activity.status).toBe('running');expect(result.reused.ok).toBe(false);expect(result.unchangedOnReuse).toBe(true);
 expect(result.counts.at(-1),'512 recent proofs plus the protected current arrangement').toBeLessThanOrEqual(513);
 expect(result.hasIssuer).toBe(true);expect(result.hasDelivery).toBe(true);
});
