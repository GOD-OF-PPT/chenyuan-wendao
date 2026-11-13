import { test, expect } from '@playwright/test';
import { setupMilestones } from './milestone-support';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupMilestones(page);
  await page.evaluate(async () => {
    const h = (globalThis as any).h, path = '/persistence-tests/activity-store-harness.ts';
    const { createActivityStoreHarness } = await import(path); h.milestoneStore = createActivityStoreHarness();
    await h.milestoneStore.store.init();
    h.seeding = h.milestoneStore.store.importText(JSON.stringify(h.milestoneSamples.find((r: any) => r.action.type === 'CHOOSE').game));
  });
  await page.clock.runFor(700);
  await expect.poll(() => page.evaluate(() => { const f = (globalThis as any).h.milestoneStore; return { busy: f.store.busy, error: f.store.error, phase: f.store.game?.core.activeEvent?.id }; }))
    .toEqual({ busy: false, error: '', phase: 'temple' });
});
test.afterEach(async ({ page }) => { await page.evaluate(() => (globalThis as any).h?.milestoneStore?.dispose()); });

test('prepared selection captures stable Game and activity CAS, waits one full online cycle and stops before unknown branches', async ({ page }) => {
  const started = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.milestoneStore;
    const intent = f.store.prepareMilestone({ type: 'CHOOSE', choice: 'help' }); h.finiteIntent = structuredClone(intent);
    const before = f.state(); await f.store.startOnlinePreparedMilestone(intent); return { before, intent, ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(started.intent.plan).toEqual({ kind: 'milestone', action: { type: 'CHOOSE', choice: 'help' }, maxCycles: 1 });
  expect(started.intent.mutation.expectedActivityId).toBeNull(); expect(started.ui.game).toEqual(started.before.game);
  expect(started.ui.activity.version).toBe(7); expect(started.ui.runtime.remainingMs).toBe(6000); expect(started.ui.lastResult).toBeNull();
  await page.clock.runFor(5999);
  expect(await page.evaluate(() => (globalThis as any).h.milestoneStore.store.game)).toEqual(started.before.game);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.milestoneStore.store.activity?.completedCycles)).toBe(1);
  const done = await page.evaluate(async () => { const f = (globalThis as any).h.milestoneStore; return { ui: f.state(), persisted: await f.persisted() }; });
  expect(done.ui.game.core.openingChoice).toBe('help'); expect(done.ui.game.core.activeEvent).toBeNull(); expect(done.ui.activity.status).toBe('stopped');
  expect(done.ui.runtime).toBeNull(); expect(done.ui.saved).toBe(true); expect(done.ui.lastFromActivity).toBe(true); expect(done.ui.lastReplayed).toBe(false);
  expect(done.ui.lastResult.commandId).toBe(started.ui.activity.nextCommand.commandId); expect(done.persisted).toEqual({ state: done.ui.game, activity: done.ui.activity });
  await page.clock.runFor(86_400_000);
  expect(await page.evaluate(() => (globalThis as any).h.milestoneStore.state())).toEqual(done.ui);
});

test('a stored arrangement cannot renew an old selection when activity CAS changes without advancing Game', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.milestoneStore, intent = f.store.prepareMilestone({ type: 'CHOOSE', choice: 'help' });
    const other = await h.FullSaveRepository.open();
    try {
      const snapshot = await other.loadActivitySnapshot(), arranged = await other.startActivity(h.milestonePlan({ type: 'CHOOSE', choice: 'leave' }), h.milestoneMutation(snapshot, 'another-page'));
      const paused = await other.pauseActivity(h.milestoneMutation(arranged, 'another-page')), before = await h.inspect(h.FULL_DB_NAME);
      await f.store.startOnlinePreparedMilestone(intent);
      const activityRace = { intent, paused, before, after: await h.inspect(h.FULL_DB_NAME), ui: f.state() };
      const resumed = await other.resumeActivity(h.milestoneMutation(await other.loadActivitySnapshot(), 'another-page')), realNow = Date.now;
      Date.now = () => resumed.activity.dueAt;
      try { await other.settleActivity(h.milestoneTick(resumed)); } finally { Date.now = realNow; }
      const revisionBefore = await h.inspect(h.FULL_DB_NAME); await f.store.startOnlinePreparedMilestone(intent);
      const revisionRace = { before: revisionBefore, after: await h.inspect(h.FULL_DB_NAME), ui: f.state() };
      await other.create('新人', h.mutation(await other.load()));
      const runBefore = await h.inspect(h.FULL_DB_NAME); await f.store.startOnlinePreparedMilestone(intent);
      return { ...activityRace, revisionRace, runRace: { before: runBefore, after: await h.inspect(h.FULL_DB_NAME), ui: f.state() } };
    } finally { other.close(); }
  });
  expect(result.ui.error).toContain('活动已被暂停'); expect(result.ui.canRetry).toBe(false); expect(result.ui.runtime).toBeNull();
  expect(result.after).toEqual(result.before); expect(result.ui.game).toEqual(result.paused.state); expect(result.ui.game.core.openingChoice).toBeNull();
  expect(result.ui.activity).toEqual(result.paused.activity);
  expect(result.revisionRace.after).toEqual(result.revisionRace.before); expect(result.revisionRace.ui.error).toContain('进度已变化');
  expect(result.runRace.after).toEqual(result.runRace.before); expect(result.runRace.ui.error).toContain('所属人生已经切换');
});

test('failed arrangement retries its original frozen command and ordinary Store short write entry points are absent', async ({ page }) => {
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.milestoneStore, intent = f.store.prepareMilestone({ type: 'CHOOSE', choice: 'trade' }), before = await h.inspect(h.FULL_DB_NAME);
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) { if (this.name === h.FULL_RECEIPT_STORE) throw new DOMException('arrangement quota', 'QuotaExceededError'); return put.call(this, value, key!); };
    try { await f.store.startOnlinePreparedMilestone(intent); } finally { IDBObjectStore.prototype.put = put; }
    h.failedFiniteIntent = structuredClone(intent); return { before, after: await h.inspect(h.FULL_DB_NAME), ui: f.state(), intent };
  });
  expect(failed.after).toEqual(failed.before); expect(failed.ui.canRetry).toBe(true); expect(failed.ui.saved).toBe(false); expect(failed.ui.activity).toBeNull();
  const retried = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.milestoneStore; await f.store.retry();
    const raw = await h.inspect(h.FULL_DB_NAME); return { ui: f.state(), raw, intent: h.failedFiniteIntent };
  });
  expect(retried.ui.error).toBe(''); expect(retried.ui.activity.plan.action.choice).toBe('trade'); expect(retried.ui.activity.completedCycles).toBe(0);
  expect(retried.raw['full-receipts'].some((row: any) => row.key === failed.intent.mutation.runId + ':' + failed.intent.mutation.commandId)).toBe(true);
  await page.evaluate(() => (globalThis as any).h.milestoneStore.store.pauseCultivation());
  const blocked = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.milestoneStore, before = await h.inspect(h.FULL_DB_NAME);
    // Current gameplay uses the family-specific plan/configuration/direct owners.
    // Legacy repository execute remains independently tested for migration/replay.
    const entryPoints = ['act', 'prepareAction', 'actPrepared'].map(key => typeof f.store[key]);
    return { before, after: await h.inspect(h.FULL_DB_NAME), entryPoints };
  });
  expect(blocked.after).toEqual(blocked.before); expect(blocked.entryPoints).toEqual(['undefined', 'undefined', 'undefined']);
});

test('lost ending delivery replays the exact committed life once, preserves readable results and never starts another cycle', async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as any).h; h.seedingEnding = h.milestoneStore.store.importText(JSON.stringify(h.milestoneSamples.find((r: any) => r.action.type === 'RETIRE').game)); });
  await page.clock.runFor(700);
  const imported = await page.evaluate(async () => {
    const h = (globalThis as any).h; await h.seedingEnding;
    return { ui: h.milestoneStore.state(), sample: h.milestoneSamples.find((r: any) => r.action.type === 'RETIRE').game };
  });
  expect(imported.ui.busy).toBe(false); expect(imported.ui.error).toBe('');
  expect(imported.ui.game).toEqual({ ...imported.sample, core: { ...imported.sample.core,
    runId: imported.ui.game.core.runId, revision: 0 } });
  const started = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.milestoneStore; await f.store.startOnlinePreparedMilestone(f.store.prepareMilestone({ type: 'RETIRE' }));
    f.loseNextCycleDelivery(); return f.state();
  });
  expect(started.game).toEqual(imported.ui.game); expect(started.busy).toBe(false);
  expect(started.activity.plan).toEqual({ kind: 'milestone', action: { type: 'RETIRE' }, maxCycles: 1 });
  expect(started.activity.completedCycles).toBe(0); expect(started.activity.nextCommand.type).toBe('RETIRE');
  await page.clock.runFor(12_000);
  await expect.poll(() => page.evaluate(() => { const f = (globalThis as any).h.milestoneStore; return { busy: f.store.busy, retry: f.store.canRetry }; })).toEqual({ busy: false, retry: true });
  const lost = await page.evaluate(async () => { const h = (globalThis as any).h, f = h.milestoneStore; return { ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME), persisted: await f.persisted(), delivered: f.delivered }; });
  expect(lost.ui.lastResult).toBeNull(); expect(lost.ui.runtime).toBeNull(); expect(lost.persisted.state.status).toBe('ended'); expect(lost.persisted.state.ending).toBe('retired');
  expect(lost.persisted.state.core.player).toEqual(started.game.core.player); expect(lost.persisted.state).toEqual(lost.delivered.outcome.state);
  await page.evaluate(() => (globalThis as any).h.milestoneStore.store.retry());
  const replay = await page.evaluate(async () => { const h = (globalThis as any).h, f = h.milestoneStore; return { ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME), record: h.queries.getLifeRecord(f.store.game) }; });
  expect(replay.ui.lastReplayed).toBe(true); expect(replay.ui.lastFromActivity).toBe(true); expect(replay.ui.lastResult).toEqual(lost.delivered.outcome.result);
  expect(replay.ui.game).toEqual(lost.persisted.state); expect(replay.raw).toEqual(lost.raw); expect(replay.ui.runtime).toBeNull(); expect(replay.record.overview.reason).toBe('retired');
  await page.clock.runFor(86_400_000); expect(await page.evaluate(() => (globalThis as any).h.milestoneStore.state())).toEqual(replay.ui);
});
