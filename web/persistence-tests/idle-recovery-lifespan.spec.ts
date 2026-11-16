import {test,expect} from '@playwright/test';
import {setupCurrentRecovery} from './idle-recovery-support';
import {getLifeOverview} from '../../src/full/queries.ts';
import {normalizeTrialGame} from '../../tests/trial-journey-route.mjs';
test('M04-N9 a real final-month cycle aborts atomically and two actual lifespan endings restore the complete ordinary preparation without accumulating goods',async({page},info)=>{
 await setupCurrentRecovery(page);
 try{
  const r=await page.evaluate(async()=>{
   const h=(window as any).h,name='m04-lifespan',d=h.routes.driver();d.craft('foundation');d.meditate();
   // Build the late-life fixture by legal rules, not by assigning XP, age or items.
   while(h.queries.getLifeOverview(d.game).remainingMonths>h.m04C.actionDurations.endLife){
    const remaining=h.queries.getLifeOverview(d.game).remainingMonths;
    const [sourceId,source]=Object.entries(h.m04C.sources).filter(([,v]:any)=>h.m04C.rank(v.min)<=h.m04C.rank(d.game.core.player.realm)&&v.months<=remaining-1).sort((a:any,b:any)=>b[1].months-a[1].months)[0] as any;
    d.go(source.location);d.doAction({type:'SOURCE',sourceId,count:Math.min(50,Math.floor((remaining-1)/source.months))});
   }
   d.go('cave');const repo=await h.FullSaveRepository.open(name);await repo.importText(JSON.stringify(d.game),h.mutation());
   try{
    await h.m04Travel(repo,'cave');
    const broken=await h.m04Action(repo,{type:'BREAKTHROUGH'}),cp=await repo.loadCheckpoint(),prepared=cp.snapshot;
    await h.m04Travel(repo,'sect');let sourceCycles=0;
    for(let segments=0;h.queries.getLifeOverview(await repo.load()).remainingMonths>h.m04C.actionDurations.endLife;segments++){
     if(segments>=100)throw Error('M04 lifespan fixture finite segment bound');
     const current=await repo.load(),remaining=h.queries.getLifeOverview(current).remainingMonths;
     const [sourceId,source]=Object.entries(h.m04C.sources).filter(([,v]:any)=>h.m04C.rank(v.min)<=h.m04C.rank(current.core.player.realm)&&v.months<=remaining-1).sort((a:any,b:any)=>b[1].months-a[1].months)[0] as any;
     await h.m04Travel(repo,source.location);const n=Math.min(50,Math.floor((remaining-1)/source.months));
     const a=await h.m04Run(repo,{kind:'source',sourceId,maxCycles:n,until:'cycles',target:null,monthBudget:n*source.months,remainingMonthsReserve:1});sourceCycles+=a.records.length;
    }
    const rows=[];
    for(let attempt=0;attempt<2;attempt++){
     const snapshot=await repo.loadActivitySnapshot();if(h.queries.getLifeOverview(snapshot.state).remainingMonths!==12)throw Error('Actual final twelve-month remainder required');
     const started=await repo.startActivity(h.milestonePlan({type:'END_LIFE'}),h.milestoneMutation(snapshot,'m04-lifespan')),tick=h.milestoneTick(started),formal=h.engine.resolve(started.state,started.activity.nextCommand);
     h.m04Now=started.activity.dueAt;const before=await h.inspect(name),put=IDBObjectStore.prototype.put;let failed:any=null,requestSuccess=false,abortCalled=false;
     if(attempt===0){
      IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){const q=put.call(this,value,key!);if(this.transaction.db.name===name&&this.name===h.FULL_STATE_STORE&&key==='current'){IDBObjectStore.prototype.put=put;q.addEventListener('success',()=>{requestSuccess=true;this.transaction.abort();abortCalled=true;});}return q;};
      try{failed=await h.attempt(()=>repo.settleActivity(tick));}finally{IDBObjectStore.prototype.put=put;}
     }
     const afterFailure=await h.inspect(name),ended=await repo.settleActivity(tick),beforeReplay=await h.inspect(name),replay=await repo.settleActivity(tick),afterReplay=await h.inspect(name),restored=await repo.restoreCheckpoint(h.mutation(ended.state));
     rows.push({snapshot,started,tick,formal,before,failed,requestSuccess,abortCalled,afterFailure,ended,beforeReplay,replay,afterReplay,restored,cpAfter:await repo.loadCheckpoint()});
    }
    return{broken,prepared,cp,sourceCycles,rows};
   }finally{repo.close();}
  });
  expect(r.sourceCycles).toBeGreaterThan(0);expect(r.rows).toHaveLength(2);
  for(const[i,x]of r.rows.entries()){
   expect(x.started.activity.cycleMs).toBe(12000);if(i===0){expect(x.failed.code).toBe('STORAGE_ABORTED');expect(x.requestSuccess).toBe(true);expect(x.abortCalled).toBe(true);expect(x.afterFailure).toEqual(x.before);}
   expect(x.ended.state).toEqual(x.formal.nextState);expect(x.ended.state.status).toBe('ended');expect(x.ended.result.costs.months).toBe(12);expect(getLifeOverview(x.snapshot.state).remainingMonths).toBe(12);expect(x.replay.replayed).toBe(true);expect(x.afterReplay).toEqual(x.beforeReplay);
   expect(normalizeTrialGame(x.restored.state)).toEqual(normalizeTrialGame(r.prepared));expect(x.cpAfter).toEqual(r.cp);
  }
  expect(r.rows[0].restored.state.core.runId).not.toBe(r.rows[1].restored.state.core.runId);
  await info.attach('current-final-month-summary',{body:JSON.stringify({realRuleSourceCycles:r.sourceCycles,explicitTwelveSecondEndings:2,originalFullOrdinaryCheckpointPreserved:true,virtualRuleTimeOnly:true}),contentType:'application/json'});
 }finally{await page.evaluate(()=>{const h=(window as any).h;if(h?.m04RealNow)Date.now=h.m04RealNow;});}
});
