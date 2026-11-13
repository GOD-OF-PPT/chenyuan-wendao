import {confirmedDelivery} from './support';
import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';

test('the production Store defaults to an away schedule and reopening a closed page commits four periods without replaying a gift',async({page,context})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
 await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
 await setupPersistence(page);
 const started=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open();
  try{await repo.importText(JSON.stringify(d.game),h.mutation());}finally{repo.close();}
  const {createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');h.scheduledStore=createActivityStoreHarness();
  const store=h.scheduledStore.store;await store.init();
  await store.startPlannedActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1});
  return{ui:h.scheduledStore.state(),persisted:await h.scheduledStore.persisted()};
 });
 expect(started.persisted.schedule?.activityId).toBe(started.ui.activity.id);
 const other=await context.newPage();await page.close();await other.clock.runFor(135000);await setupPersistence(other);
 await other.evaluate(async()=>{
  const h=(globalThis as any).h,{createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');h.scheduledStore=createActivityStoreHarness();
  await h.scheduledStore.store.init();
 });
 await expect.poll(()=>other.evaluate(()=>(globalThis as any).h.scheduledStore.store.activity?.completedCycles)).toBe(4);
 const resumed=await other.evaluate(async()=>{const f=(globalThis as any).h.scheduledStore;return{ui:f.state(),summary:f.store.awaySummary,persisted:await f.persisted(),now:Date.now()};});
 expect(resumed.ui.error).toBe('');expect(resumed.ui.game.core.player.stones-started.ui.game.core.player.stones).toBe(80);
 expect(resumed.ui.activity.dueAt-resumed.now).toBe(15000);expect(resumed.ui.runtime.remainingMs).toBe(15000);
 expect(resumed.ui.lastResult).toBeNull();expect(resumed.persisted.state).toEqual(resumed.ui.game);expect(resumed.persisted.activity).toEqual(resumed.ui.activity);
 expect(resumed.summary.cycles).toBe(4);expect(resumed.summary.costs.months).toBe(48);expect(resumed.summary.delta.stones).toBe(80);
 await other.clock.runFor(14999);expect(await other.evaluate(()=>(globalThis as any).h.scheduledStore.store.activity.completedCycles)).toBe(4);
 await other.clock.runFor(1);await expect.poll(()=>other.evaluate(()=>(globalThis as any).h.scheduledStore.store.activity.completedCycles)).toBe(5);
 const finished=await other.evaluate(()=>(globalThis as any).h.scheduledStore.state());
 expect(finished.activity.status).toBe('stopped');expect(finished.lastResult.commandId).toBe(resumed.ui.activity.nextCommand.commandId);expect(finished.lastFromActivity).toBe(true);
 await other.evaluate(()=>(globalThis as any).h.scheduledStore.dispose());await other.close();
});

test('a scheduled single-cycle completion observer sees the confirmed saved state before presenting its real result',async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open();try{await repo.importText(JSON.stringify(d.game),h.mutation());}finally{repo.close();}
  const {createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');h.scheduledStore=createActivityStoreHarness();const s=h.scheduledStore.store;await s.init();h.completionStates=[];
  s.observe((o:any)=>{if(o.kind==='action')h.completionStates.push(structuredClone({saved:s.saved,available:s.available,error:s.error,result:s.lastResult,fromActivity:s.lastFromActivity,replayed:s.lastReplayed,game:s.game,observation:o}));});
  await s.startPlannedActivity({kind:'source',sourceId:'work',maxCycles:1,until:'cycles',target:null,monthBudget:12,remainingMonthsReserve:1});
 });
 await page.clock.runFor(29999);expect(await page.evaluate(()=>(globalThis as any).h.completionStates)).toEqual([]);await page.clock.runFor(1);
 await expect.poll(()=>page.evaluate(()=>(globalThis as any).h.scheduledStore.store.activity?.completedCycles)).toBe(1);
 const r=await page.evaluate(()=>{const h=(globalThis as any).h;return{states:h.completionStates,final:h.scheduledStore.store.game};});
 expect(r.states).toHaveLength(1);const state=r.states[0];expect(state.saved).toBe(true);expect(state.available).toBe(true);expect(state.error).toBe('');expect(state.fromActivity).toBe(true);expect(state.replayed).toBe(false);expect(state.game).toEqual(r.final);expect(state.result.revisionAfter).toBe(state.game.core.revision);expect(state.observation.result.delta).toEqual(state.result.delta);
 await page.evaluate(()=>(globalThis as any).h.scheduledStore.dispose());
});

for(const kind of ['direct','configuration','online'])test(`an old ${kind} reply retry preserves the complete newer away schedule instead of turning it into an online arrangement`,async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 const r=await page.evaluate(async kind=>{
  const h=(globalThis as any).h,d=h.routes.driver();
  if(kind==='direct'){d.resource('herb',1);d.funds(200);d.go('market');}else d.go('cave');
  const seed=await h.FullSaveRepository.open();try{await seed.importText(JSON.stringify(d.game),h.mutation());}finally{seed.close();}
  const {createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');h.scheduledStore=createActivityStoreHarness();const s=h.scheduledStore.store;await s.init();
  const method=kind==='direct'?'executeDirect':kind==='configuration'?'configure':'startActivity',prototype=h.FullSaveRepository.prototype,original=prototype[method];
  prototype[method]=async function(...args:any[]){prototype[method]=original;const result=await original.apply(this,args);h.originalLostIdentity=structuredClone(kind==='online'?args[1]:args[0].command);const error:any=new Error('旧意图已提交但回复丢失');error.code='STORAGE_ABORTED';throw error;};
  const plan=kind==='direct'?{kind:'buy',item:'healing_pill',maxCycles:2,until:'cycles',targetQuantity:null,stoneBudget:200,stoneReserve:0}:{kind:'cultivation',method:'natural',maxCycles:3,until:'cycles',stoneBudget:0,stoneReserve:0};
  try{
   if(kind==='direct')await s.executeDirect(s.prepareDirect({type:'SELL',item:'herb',quantity:1}));
   else if(kind==='configuration')await s.applyConfiguration(s.prepareConfiguration({type:'SCHOOL',school:'talisman'}));
   else await s.startOnlinePlannedActivity(plan);
  }finally{prototype[method]=original;}
  const failed=h.scheduledStore.state(),repo=await h.FullSaveRepository.open();let newer:any;
  const m=(snap:any,id:string,owner='other')=>({commandId:id,runId:snap.state.core.runId,expectedRevision:snap.state.core.revision,expectedActivityId:snap.activity?.id??null,expectedActivityRevision:snap.activity?.revision??null,ownerId:owner});
  try{
   let snap=await repo.loadActivitySnapshot();if(snap.activity?.status==='running')snap=await repo.pauseActivity(m(snap,'pause-online',snap.activity.ownerId));
   newer=await repo.startScheduledActivity(plan,m(snap,'new-away-after-'+kind));
  }finally{repo.close();}
  const before=await h.FullSaveRepository.exportRaw();await s.retry();
  const retried={ui:h.scheduledStore.state(),schedule:s.activitySchedule,raw:await h.FullSaveRepository.exportRaw()};
  await s.resumeCultivation();return{identity:h.originalLostIdentity,failed,newer,before,retried,continued:{ui:h.scheduledStore.state(),schedule:s.activitySchedule}};
 },kind);
 expect(r.failed.canRetry).toBe(true);expect(r.retried.ui.error).toBe('');expect(r.retried.ui.activity).toEqual(r.newer.activity);expect(r.retried.schedule).toEqual(r.newer.schedule);expect(r.retried.raw).toEqual(confirmedDelivery(r.before,r.identity));
 expect(r.continued.ui.error).toBe('');expect(r.continued.schedule).not.toBeNull();expect(r.continued.ui.game).toEqual(r.newer.state);expect(r.continued.ui.activity.id).toBe(r.newer.activity.id);expect(r.continued.ui.activity.dueAt).toBe(r.newer.activity.dueAt);
 await page.evaluate(()=>(globalThis as any).h.scheduledStore.dispose());
});

for(const lost of [false,true])test(`a sixty-five-cycle return keeps its final one-cycle chunk inside the same aggregate without a fresh reward${lost?' after a lost tail reply retry':''}`,async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 const original=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open();
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const s=await repo.loadActivitySnapshot();
   return await repo.startScheduledActivity({kind:'source',sourceId:'work',repeat:true,maxCycles:1000000000,until:'cycles',target:null,monthBudget:840,remainingMonthsReserve:1},
    {commandId:'sixty-five-start',runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:null,expectedActivityRevision:null,ownerId:'closed-page'});
  }finally{repo.close();}
 });
 await page.clock.setSystemTime(new Date('2030-01-01T01:32:45Z'));
 await page.evaluate(async lost=>{
  const h=(globalThis as any).h,{createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');
  if(lost){
   const prototype=h.FullSaveRepository.prototype,original=prototype.advanceScheduledActivity;let calls=0;
   prototype.advanceScheduledActivity=async function(...args:any[]){const result=await original.apply(this,args);if(++calls===2){h.tailLostIdentity=structuredClone(args[0]);prototype.advanceScheduledActivity=original;const error:any=new Error('尾批实际已保存但回复丢失');error.code='STORAGE_ABORTED';throw error;}return result;};
  }
  h.scheduledStore=createActivityStoreHarness();h.catchupTrace=h.scheduledStore.trace();await h.scheduledStore.store.init();
 },lost);
 await expect.poll(()=>page.evaluate(()=>(globalThis as any).h.scheduledStore.store.activity?.completedCycles)).toBe(65);
 await expect.poll(()=>page.evaluate(()=>(globalThis as any).h.scheduledStore.store.busy)).toBe(false);
 if(lost){
  expect(await page.evaluate(()=>(globalThis as any).h.scheduledStore.store.canRetry)).toBe(true);
  const pair=await page.evaluate(async()=>{const h=(globalThis as any).h,before=await h.FullSaveRepository.exportRaw();await h.scheduledStore.store.retry();return{identity:h.tailLostIdentity,before,after:await h.FullSaveRepository.exportRaw()};});
  expect(pair.after).toEqual(confirmedDelivery(pair.before,pair.identity));
 }
 const r=await page.evaluate(()=>{const h=(globalThis as any).h;return{ui:h.scheduledStore.state(),summary:h.scheduledStore.store.awaySummary,states:h.catchupTrace.states,observations:h.catchupTrace.observations,now:Date.now()};});
 expect(r.ui.game.core.player.stones-original.state.core.player.stones).toBe(1300);expect(r.ui.activity.dueAt-r.now).toBe(15000);
 expect(r.ui.lastResult).toBeNull();expect(r.ui.lastFromActivity).toBe(false);expect(r.states.every((s:any)=>s.result===null)).toBe(true);
 expect(r.summary.cycles).toBe(65);expect(r.summary.delta.stones).toBe(1300);expect(r.summary.costs.months).toBe(780);
 expect(r.observations.filter((o:any)=>o.kind==='action')).toHaveLength(lost?64:65);
 await page.evaluate(()=>(globalThis as any).h.scheduledStore.dispose());
});

test('a lost Store catch-up reply exposes an original-intent retry and never replays the four committed cycles as fresh feedback',async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 const before=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open();
  try{await repo.importText(JSON.stringify(d.game),h.mutation());const s=await repo.loadActivitySnapshot();return await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},
   {commandId:'store-lost-start',runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:null,expectedActivityRevision:null,ownerId:'closed-page'});
  }finally{repo.close();}
 });
 await page.clock.runFor(135000);
 await page.evaluate(async()=>{
  const h=(globalThis as any).h,{createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts'),original=h.FullSaveRepository.prototype.advanceScheduledActivity;
  h.FullSaveRepository.prototype.advanceScheduledActivity=async function(intent:any){h.FullSaveRepository.prototype.advanceScheduledActivity=original;h.lostIntent=intent;const result=await original.call(this,intent);h.lostResult=result;const error:any=new Error('测试：实际已提交但回复丢失');error.code='STORAGE_ABORTED';throw error;};
  h.scheduledStore=createActivityStoreHarness();await h.scheduledStore.store.init();
 });
 const failed=await page.evaluate(async()=>{const h=(globalThis as any).h;return{ui:h.scheduledStore.state(),raw:await h.FullSaveRepository.exportRaw(),intent:h.lostIntent,outcome:h.lostResult};});
 expect(failed.ui.canRetry).toBe(true);expect(failed.ui.activity.completedCycles).toBe(4);expect(failed.ui.game.core.player.stones-before.state.core.player.stones).toBe(80);
 expect(failed.ui.lastResult).toBeNull();expect(failed.ui.runtime).toBeNull();
 await page.evaluate(async()=>{const h=(globalThis as any).h;await h.scheduledStore.store.retryFor(h.lostIntent.commandId);});
 const retried=await page.evaluate(async()=>{const h=(globalThis as any).h;return{ui:h.scheduledStore.state(),raw:await h.FullSaveRepository.exportRaw(),summary:h.scheduledStore.store.awaySummary};});
 expect(retried.raw).toEqual(confirmedDelivery(failed.raw,failed.intent));expect(retried.ui.game).toEqual(failed.outcome.state);expect(retried.ui.error).toBe('');expect(retried.ui.canRetry).toBe(false);expect(retried.ui.lastResult).toBeNull();expect(retried.ui.lastReplayed).toBe(true);
 expect(retried.ui.runtime.remainingMs).toBe(15000);expect(retried.summary.cycles).toBe(4);
 await page.evaluate(()=>(globalThis as any).h.scheduledStore.dispose());
});

test('the explicit online Store interface stays online until the player continues it into a fresh away period',async({page})=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 const original=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open();
  try{await repo.importText(JSON.stringify(d.game),h.mutation());}finally{repo.close();}
  const {createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');h.scheduledStore=createActivityStoreHarness();
  await h.scheduledStore.store.init();await h.scheduledStore.store.startOnlinePlannedActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1});
  const state=await h.scheduledStore.persisted();h.scheduledStore.dispose();return state;
 });
 expect(original.schedule).toBeUndefined();await page.clock.setSystemTime(new Date('2030-01-02T01:00:00Z'));
 const reopened=await page.evaluate(async()=>{
  const h=(globalThis as any).h,{createActivityStoreHarness}=await import('/persistence-tests/activity-store-harness.ts');h.scheduledStore=createActivityStoreHarness();await h.scheduledStore.store.init();
  const unchanged=await h.scheduledStore.persisted(),runtime=h.scheduledStore.store.activityRuntime;await h.scheduledStore.store.resumeCultivation();
  return{unchanged,runtime,adopted:await h.scheduledStore.persisted(),ui:h.scheduledStore.state(),now:Date.now()};
 });
 expect(reopened.unchanged).toEqual(original);expect(reopened.runtime).toBeNull();expect(reopened.adopted.state).toEqual(original.state);
 expect(reopened.adopted.activity.id).toBe(original.activity.id);expect(reopened.adopted.activity.dueAt-reopened.now).toBe(30000);expect(reopened.adopted.schedule).toBeDefined();expect(reopened.ui.lastResult).toBeNull();
 await page.clock.runFor(29999);expect(await page.evaluate(()=>(globalThis as any).h.scheduledStore.store.activity.completedCycles)).toBe(0);
 await page.clock.runFor(1);await expect.poll(()=>page.evaluate(()=>(globalThis as any).h.scheduledStore.store.activity.completedCycles)).toBe(1);
 await page.evaluate(()=>(globalThis as any).h.scheduledStore.dispose());
});
