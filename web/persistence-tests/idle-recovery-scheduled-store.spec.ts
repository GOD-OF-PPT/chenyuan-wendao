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
 expect(retried.raw).toEqual(failed.raw);expect(retried.ui.game).toEqual(failed.outcome.state);expect(retried.ui.error).toBe('');expect(retried.ui.canRetry).toBe(false);expect(retried.ui.lastResult).toBeNull();expect(retried.ui.lastReplayed).toBe(true);
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
