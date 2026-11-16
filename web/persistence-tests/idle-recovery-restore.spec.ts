import {test,expect} from '@playwright/test';
import {setupCurrentRecovery} from './idle-recovery-support';
import {normalizeTrialGame} from '../../tests/trial-journey-route.mjs';
test.beforeEach(async({page})=>setupCurrentRecovery(page));
test.afterEach(async({page})=>{if(!page.isClosed())await page.evaluate(()=>{const h=(window as any).h;if(h?.m04RealNow)Date.now=h.m04RealNow;});});

test('M04-N1 both schools reopen the real online question every round and each gate and replay only the original cycle',async({page},info)=>{
 const rows=await page.evaluate(async()=>{
  const h=(window as any).h,out=[];
  for(const school of ['sword','talisman']){
   const scenario=h.m04TrialSamples[school],name='m04-reopen-'+school;let repo=await h.FullSaveRepository.open(name);
   const prepared=(await repo.importText(JSON.stringify(scenario.prepared),h.mutation())).state,records=[];
   try{
    for(const action of scenario.actions){
     const done=await h.m04Action(repo,action),last=done.records.at(-1),cp=await repo.loadCheckpoint(),saved=await repo.loadActivitySnapshot();
     repo.close();repo=await h.FullSaveRepository.open(name);const loaded=await repo.loadActivitySnapshot();h.m04Same(loaded,saved,'question/round/gate reopen');
     const before=await h.inspect(name),replay=await repo.settleActivity(last.tick),after=await h.inspect(name);
     h.m04Same(before,after,'replayed original cycle cannot write');h.m04Same(replay.state,done.state,'replayed current state');
     if(!replay.replayed)throw Error('M04 expected an actual stored cycle replay');
     records.push({action,state:done.state,loaded,cp,cycleMs:last.cycleMs,actualTick:last.tick,replayed:replay.replayed});
    }
    out.push({school,prepared,records,final:await repo.load()});
   }finally{repo.close();}
  }
  return out;
 });
 for(const r of rows){
  expect(r.records[0].action.type).toBe('START_TRIAL');expect(r.records[0].cycleMs).toBe(15000);expect(r.records[1].cycleMs).toBe(6000);
  for(const row of r.records){expect(row.loaded.state).toEqual(row.state);expect(row.cp.snapshot).toEqual(r.prepared);expect(row.replayed).toBe(true);if(row.action.type==='BATTLE')expect(row.cycleMs).toBe(3000);}
  expect(r.final.trial.stage).toBe(4);expect(r.final.status).toBe('active');expect(r.final.wins-r.prepared.wins).toBe(3);
  const stages=r.records.map(x=>x.state.trial.stage);expect(new Set(stages)).toEqual(new Set([0,1,2,3,4]));
 }
 await info.attach('current-reopen-period-summary',{body:JSON.stringify(rows.map(r=>({school:r.school,cycles:r.records.length,stages:r.records.map(x=>x.state.trial.stage),fullSavedStateAndCheckpointCompared:true}))),contentType:'application/json'});
});

test('M04-N3 two actual lethal failures in each school preserve paid consumption and restore the same complete preparation twice',async({page})=>{
 const rows=await page.evaluate(async()=>{
  const h=(window as any).h,out=[];
  for(const school of ['sword','talisman']){
   const scenario=h.m04TrialSamples[school],name='m04-lethal-'+school;let repo=await h.FullSaveRepository.open(name);
   const prepared=(await repo.importText(JSON.stringify(scenario.prepared),h.mutation())).state,attempts=[];
   try{
    const prefix=scenario.actions.slice(0,scenario.states.findIndex((g:any)=>g.trial?.stage===2));
    for(let n=0;n<2;n++){
     for(const action of prefix)await h.m04Action(repo,action);
     await h.m04Action(repo,{type:'BATTLE',move:'heal'});
     for(let turn=0;(await repo.load()).battle&&turn<45;turn++)await h.m04Action(repo,{type:'BATTLE',move:'guard'});
     repo.close();repo=await h.FullSaveRepository.open(name);const failed=await repo.load(),cp=await repo.loadCheckpoint(),view=h.queries.getTrialRecovery(failed,await repo.loadPrevious(),cp),intent=h.mutation(failed);
     const restored=await repo.restoreCheckpoint(intent),beforeReplay=await h.inspect(name),replay=await repo.restoreCheckpoint(intent),afterReplay=await h.inspect(name);
     h.m04Same(beforeReplay,afterReplay,'repeat complete restore receipt');attempts.push({failed,cp,view,restored,replay});
    }
    out.push({school,prepared,attempts});
   }finally{repo.close();}
  }
  return out;
 });
 for(const r of rows){
  expect(r.attempts).toHaveLength(2);
  for(const x of r.attempts){
   expect(x.failed.trial).toBeNull();expect(x.failed.core.player.hp).toBe(1);expect(x.view.reason).toContain('未能抵住');expect(x.view.stage).toBe(2);
   expect(x.view.consumptionKnown).toBe(true);expect(x.view.consumed).toEqual(expect.arrayContaining([expect.objectContaining({id:'ascension_seal',quantity:1}),expect.objectContaining({id:'healing_pill',quantity:1})]));
   expect(normalizeTrialGame(x.cp.snapshot)).toEqual(normalizeTrialGame(r.prepared));expect(normalizeTrialGame(x.restored.state)).toEqual(normalizeTrialGame(r.prepared));
   expect(x.replay.replayed).toBe(true);expect(x.replay.state).toEqual(x.restored.state);
  }
  expect(r.attempts[0].restored.state.core.runId).not.toBe(r.attempts[1].restored.state.core.runId);
 }
});

test('M04-N4 ordinary restore quota abort and lost delivery retain every store and the exact original receipt never rewinds later earnings',async({page})=>{
 const rows=await page.evaluate(async()=>{
  const h=(window as any).h,out=[];
  for(const mode of ['quota','abort','lost-delivery']){
   const name='m04-restore-'+mode,{repo,snapshot}=await h.milestoneFixture(name,'BREAKTHROUGH');
   try{
    const broken=await h.m04Run(repo,h.milestonePlan({type:'BREAKTHROUGH'})),cp=await repo.loadCheckpoint(),intent=h.mutation(broken.state),before=await h.inspect(name),put=IDBObjectStore.prototype.put;let hit=false,requestSuccess=false,abortCalled=false;
    if(mode!=='lost-delivery')IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
     if(this.transaction.db.name===name&&(mode==='quota'?this.name===h.FULL_RECEIPT_STORE:this.name===h.FULL_STATE_STORE&&key==='current')){
      hit=true;IDBObjectStore.prototype.put=put;if(mode==='quota')throw new DOMException('M04 restore quota','QuotaExceededError');const q=put.call(this,value,key!);q.addEventListener('success',()=>{requestSuccess=true;this.transaction.abort();abortCalled=true;});return q;
     }return put.call(this,value,key!);
    };
    let failed:any,committedLost:any=null;
    try{
     if(mode==='lost-delivery'){
      failed=await h.attempt(async()=>{committedLost=await repo.restoreCheckpoint(intent);throw Error('M04 committed delivery intentionally lost');});
     }else failed=await h.attempt(()=>repo.restoreCheckpoint(intent));
    }finally{IDBObjectStore.prototype.put=put;}
    const after=await h.inspect(name),retry=await repo.restoreCheckpoint(intent);
    await h.m04Travel(repo,'sect');const earned=await h.m04Run(repo,{kind:'source',sourceId:'work',maxCycles:1,until:'cycles',target:null,monthBudget:h.m04C.sources.work.months,remainingMonthsReserve:1});
    const beforeReplay=await h.inspect(name),replay=await repo.restoreCheckpoint(intent),afterReplay=await h.inspect(name),second=await repo.restoreCheckpoint(h.mutation(earned.state));
    out.push({mode,snapshot,broken,cp,intent,before,after,failed,hit,requestSuccess,abortCalled,committedLost,retry,earned,replay,beforeReplay,afterReplay,second,cpAfter:await repo.loadCheckpoint(),latest:await repo.load()});
   }finally{repo.close();}
  }
  return out;
 });
 for(const r of rows){
  if(r.mode==='lost-delivery'){expect(r.failed.ok).toBe(false);expect(r.retry.replayed).toBe(true);expect(r.retry.state).toEqual(r.committedLost.state);}
  else{expect(r.hit).toBe(true);expect(r.failed.code).toBe(r.mode==='quota'?'STORAGE_QUOTA':'STORAGE_ABORTED');expect(r.after).toEqual(r.before);expect(r.retry.replayed).toBe(false);}
  if(r.mode==='abort'){expect(r.requestSuccess).toBe(true);expect(r.abortCalled).toBe(true);}
  expect(normalizeTrialGame(r.retry.state)).toEqual(normalizeTrialGame(r.snapshot.state));expect(r.retry.state.core.runId).toBe(r.intent.runId);
  expect(r.earned.state.core.player.stones).toBe(r.snapshot.state.core.player.stones+20);expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.earned.state);expect(r.afterReplay).toEqual(r.beforeReplay);
  expect(normalizeTrialGame(r.second.state)).toEqual(normalizeTrialGame(r.snapshot.state));expect(r.second.state.core.runId).not.toBe(r.retry.state.core.runId);expect(r.cpAfter).toEqual(r.cp);expect(r.latest).toEqual(r.second.state);
 }
});

test('M04-N5 a fixed full restore rejects another page real action and its replacement life while an old activity cannot settle after restoration',async({page})=>{
 const r=await page.evaluate(async()=>{
  const h=(window as any).h,name='m04-race',{repo}=await h.milestoneFixture(name,'BREAKTHROUGH'),other=await h.FullSaveRepository.open(name);
  try{
   const broken=await h.m04Run(repo,h.milestonePlan({type:'BREAKTHROUGH'})),intent=h.mutation(broken.state);
   await h.m04Travel(other,'sect');const newer=await other.load(),before=await h.inspect(name),stale=await h.attempt(()=>repo.restoreCheckpoint(intent)),after=await h.inspect(name);
   const fresh=h.mutation(newer),restored=await repo.restoreCheckpoint(fresh),oldTick=await h.attempt(()=>other.settleActivity(broken.records[0].tick));
   const replacement=(await other.create('明确的新人生',h.mutation(restored.state))).state,protectedNew=await h.inspect(name),replayOld=await h.attempt(()=>repo.restoreCheckpoint(fresh)),foreign=await h.attempt(()=>repo.restoreCheckpoint(h.mutation(newer))),afterNew=await h.inspect(name);
   return{newer,before,after,stale,restored,oldTick,replacement,protectedNew,replayOld,foreign,afterNew};
  }finally{repo.close();other.close();}
 });
 expect(r.stale.code).toBe('STALE_REVISION');expect(r.after).toEqual(r.before);expect(r.oldTick.code).toBe('RUN_MISMATCH');
 expect(r.replayOld.code).toBe('RUN_MISMATCH');expect(r.foreign.code).toBe('STALE_REVISION');expect(r.afterNew).toEqual(r.protectedNew);expect(r.replacement.core.player.realm).toBe('mortal');
});

test('M04-N6 missing foreign purpose and future-version checkpoints cannot replace any real current or archived record',async({page})=>{
 const rows=await page.evaluate(async()=>{
  const h=(window as any).h,out=[];
  for(const mode of ['missing','purpose','version','owner']){
   const name='m04-invalid-'+mode,{repo}=await h.milestoneFixture(name,'BREAKTHROUGH');
   try{
    const done=await h.m04Run(repo,h.milestonePlan({type:'BREAKTHROUGH'})),cp=await repo.loadCheckpoint();
    if(mode==='missing')await h.put(name,h.FULL_STATE_STORE,'checkpoint',null,true);
    if(mode==='purpose'){cp.snapshot.core.inventory.foundation_pill=0;await h.put(name,h.FULL_STATE_STORE,'checkpoint',cp);}
    if(mode==='version'){cp.versions.contentVersion='future';await h.put(name,h.FULL_STATE_STORE,'checkpoint',cp);}
    if(mode==='owner'){const raw=await h.inspect(name),owner=raw[h.FULL_STATE_STORE].find((x:any)=>x.key==='checkpoint-owner').value;owner.runId='foreign';await h.put(name,h.FULL_STATE_STORE,'checkpoint-owner',owner);}
    const before=await h.inspect(name),failed=await h.attempt(()=>repo.restoreCheckpoint(h.mutation(done.state))),after=await h.inspect(name);out.push({mode,before,failed,after});
   }finally{repo.close();}
  }
  return out;
 });
 for(const r of rows){expect(r.failed.ok).toBe(false);expect(r.after).toEqual(r.before);if(r.mode==='missing')expect(r.failed.code).toBe('NO_CHECKPOINT');}
});

test('M04-N7 each explicitly selected ending restores complete trial preparation and rejects the old life closing tick',async({page})=>{
 const r=await page.evaluate(async()=>{
  const h=(window as any).h,name='m04-end-restore',scenario=h.m04TrialSamples.sword,repo=await h.FullSaveRepository.open(name),prepared=(await repo.importText(JSON.stringify(scenario.prepared),h.mutation())).state,rows=[];
  try{
   for(const ending of ['transmit','depart']){
    for(const action of scenario.actions)await h.m04Action(repo,action);
    const ready=await repo.load(),done=await h.m04Action(repo,{type:'END',ending}),restored=await repo.restoreCheckpoint(h.mutation(done.state)),old=await h.attempt(()=>repo.settleActivity(done.records.at(-1).tick));
    rows.push({ending,ready,done,restored,old,cp:await repo.loadCheckpoint()});
   }
   return{prepared,rows};
  }finally{repo.close();}
 });
 for(const x of r.rows){expect(x.done.state.status).toBe('ascended');expect(x.done.state.ending).toBe(x.ending);expect(x.done.state.core.inventory).toEqual(x.ready.core.inventory);expect(x.done.state.core.world).toEqual(x.ready.core.world);expect(x.done.records[0].cycleMs).toBe(12000);expect(x.old.code).toBe('RUN_MISMATCH');expect(normalizeTrialGame(x.restored.state)).toEqual(normalizeTrialGame(r.prepared));expect(normalizeTrialGame(x.cp.snapshot)).toEqual(normalizeTrialGame(r.prepared));}
 expect(r.rows[0].restored.state.core.runId).not.toBe(r.rows[1].restored.state.core.runId);
});

test('M04-N8 imported mid-trial withdrawal preserves the actual stage and never invents checkpoint or cumulative costs',async({page})=>{
 const rows=await page.evaluate(async()=>{
  const h=(window as any).h,out=[];
  for(const school of ['sword','talisman']){
   const sample=h.m04TrialSamples[school].states.find((g:any)=>g.trial?.stage===2),name='m04-foreign-trial-'+school,repo=await h.FullSaveRepository.open(name);
   try{
    const before=(await repo.importText(JSON.stringify(sample),h.mutation())).state,done=await h.m04Action(repo,{type:'BATTLE',move:'flee'});repo.close();const reopened=await h.FullSaveRepository.open(name);
    try{const current=await reopened.load(),cp=await reopened.loadCheckpoint(),view=h.queries.getTrialRecovery(current,await reopened.loadPrevious(),cp),raw=await h.inspect(name),restore=await h.attempt(()=>reopened.restoreCheckpoint(h.mutation(current)));out.push({school,before,done,current,cp,view,restore,raw,after:await h.inspect(name)});}finally{reopened.close();}
   }finally{repo.close();}
  }
  return out;
 });
 for(const r of rows){expect(r.before.trial.stage).toBe(2);expect(r.current).toEqual(r.done.state);expect(r.cp).toBeNull();expect(r.view.reason).toContain('主动退离');expect(r.view.consumptionKnown).toBe(false);expect(r.view.consumed).toEqual([]);expect(r.restore.code).toBe('NO_CHECKPOINT');expect(r.after).toEqual(r.raw);}
});
