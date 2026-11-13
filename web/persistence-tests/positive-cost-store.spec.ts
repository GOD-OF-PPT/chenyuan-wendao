import { test, expect } from '@playwright/test';
import { positiveCostIds, setupPositiveCosts, expectPositiveCost, expectImported, savePositiveEvidence } from './positive-cost-support';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPositiveCosts(page);
});
test.afterEach(async ({ page }) => { await page.evaluate(() => (globalThis as any).h?.m02Store?.dispose()); });

async function seedStore(page: import('@playwright/test').Page, id: string) {
  await page.evaluate(async id => {
    const h = (globalThis as any).h, path = '/persistence-tests/activity-store-harness.ts';
    const { createActivityStoreHarness } = await import(path);
    h.m02Store = createActivityStoreHarness(); await h.m02Store.store.init();
    h.m02Seeding = h.m02Store.store.importText(JSON.stringify(h.m02Rows[id].game));
  }, id);
  await page.clock.runFor(700); await page.evaluate(() => (globalThis as any).h.m02Seeding);
  const started = await page.evaluate(async id => {
    const h = (globalThis as any).h, f = h.m02Store;
    if (f.store.busy || f.store.error || !f.store.ready) throw new Error('M02 Store fixture did not finish import');
    await f.store.startOnlinePlannedActivity(h.m02Rows[id].plan);
    return { fixture: h.m02Rows[id].game, ui: f.state(), cost: h.m02Rows[id].cost, expected: h.engine.resolve(f.store.game, f.store.activity.nextCommand) };
  }, id);
  expect(started.ui.error).toBe(''); expect(started.ui.saved).toBe(true); expect(started.ui.busy).toBe(false);
  expectPositiveCost(started.expected.result.costs, started.cost);
  expectImported(started.fixture, started.ui.game);
  expect(started.ui.runtime.remainingMs).toBe(started.ui.activity.cycleMs);
  return started;
}

for (const id of positiveCostIds) test(`M02 Store ${id} lost committed delivery retries the exact consumable command once`, async ({ page }, info) => {
  const started = await seedStore(page, id);
  await page.evaluate(() => (globalThis as any).h.m02Store.loseNextCycleDelivery());
  await page.clock.runFor(started.ui.activity.cycleMs);
  await expect.poll(() => page.evaluate(() => { const f = (globalThis as any).h.m02Store; return { busy: f.store.busy, retry: f.store.canRetry }; }))
    .toEqual({ busy: false, retry: true });
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    return { ui: f.state(), delivery: f.delivered, raw: await h.inspect(h.FULL_DB_NAME), persisted: await f.persisted() };
  });

  await savePositiveEvidence(info, { phase: 'committed reply lost, before retry', id, started, failed });
  expect(failed.ui.saved).toBe(false); expect(failed.ui.lastResult).toBeNull(); expect(failed.ui.runtime).toBeNull();
  expect(failed.ui.game).toEqual(started.expected.nextState); expect(failed.persisted.state).toEqual(started.expected.nextState);
  expect(failed.delivery.tick.commandId).toBe(started.ui.activity.nextCommand.commandId);
  expect(failed.delivery.outcome.result).toEqual(started.expected.result);
  await page.evaluate(() => { const f = (globalThis as any).h.m02Store; return f.store.retryFor(f.delivered.tick.commandId); });
  const replay = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store, repo = await h.FullSaveRepository.open();
    try { const second = await repo.settleActivity(f.delivered.tick);
      return { ui: f.state(), second, raw: await h.inspect(h.FULL_DB_NAME), persisted: await f.persisted() };
    } finally { repo.close(); }
  });
  await savePositiveEvidence(info, { id, started, failed, replay });
  expect(replay.ui.error).toBe(''); expect(replay.ui.saved).toBe(true); expect(replay.ui.canRetry).toBe(false);
  expect(replay.ui.lastReplayed).toBe(true); expect(replay.ui.lastFromActivity).toBe(true);
  expect(replay.ui.lastResult).toEqual(started.expected.result); expect(replay.ui.game).toEqual(started.expected.nextState);
  expect(replay.ui.activity).toEqual(failed.persisted.activity); expect(replay.ui.runtime).toBeNull();
  expect(replay.raw).toEqual(failed.raw); expect(replay.persisted).toEqual(failed.persisted);
  expect(replay.second.replayed).toBe(true); expect(replay.second.result).toEqual(started.expected.result);
});

for (const id of ['assisted', 'forge', 'breakthrough']) for (const progression of ['activity-only', 'game-and-activity', 'new-life'])
  test(`M02 Store ${id} held committed reply cannot replace newer accepted ${progression}`, async ({ page }, info) => {
    const started = await seedStore(page, id);
    await page.evaluate(() => (globalThis as any).h.m02Store.holdNextCycleDelivery());
    await page.clock.runFor(started.ui.activity.cycleMs);
    await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.holding)).toBe(true);
    const external = await page.evaluate(async progression => {
      const h = (globalThis as any).h, f = h.m02Store, repo = await h.FullSaveRepository.open();
      try {
        const paid = await repo.loadActivitySnapshot();
        if (progression === 'new-life') await repo.create('明确的新人生', h.mutation(paid.state));
        else {
          let current = await repo.startActivity(h.m02ReplacementPlan(paid.state), h.milestoneMutation(paid, 'm02-other-page'));
          if (progression === 'game-and-activity') {
            const now = Date.now; Date.now = () => current.activity.dueAt;
            try { current = await repo.settleActivity(h.milestoneTick(current)); } finally { Date.now = now; }
          }
        }
        await f.store.refresh('sync');
        return { paid, current: await repo.loadActivitySnapshot(), accepted: f.state(), raw: await h.inspect(h.FULL_DB_NAME), delivery: f.delivered };
      } finally { repo.close(); }
    }, progression);
    expect(external.paid.state).toEqual(started.expected.nextState);
    expect(external.accepted.game).toEqual(external.current.state); expect(external.accepted.activity).toEqual(external.current.activity);
    expect(external.accepted.runtime).toBeNull(); expect(external.accepted.busy).toBe(true);
    await savePositiveEvidence(info, { phase: 'newer snapshot accepted, before release', id, progression, started, external });
    await page.evaluate(() => { const h = (globalThis as any).h; h.m02Trace = h.m02Store.trace(); h.m02Store.releaseHeldCycle(); });
    await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.store.busy)).toBe(false);
    const released = await page.evaluate(async () => {
      const h = (globalThis as any).h, f = h.m02Store;
      return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME), trace: h.m02Trace };
    });
    await savePositiveEvidence(info, { id, progression, started, external, released });
    expect(released.ui.game).toEqual(external.current.state); expect(released.ui.activity).toEqual(external.current.activity);
    expect(released.ui.runtime).toBeNull(); expect(released.persisted).toEqual(external.current); expect(released.raw).toEqual(external.raw);
    expect(released.ui.error).toBe(''); expect(released.ui.saved).toBe(true);
    for (const state of released.trace.states) {
      expect(state.game).toEqual(external.current.state); expect(state.activity).toEqual(external.current.activity);
      expect(state.runtime).toBeNull(); expect(state.result).toBeNull();
    }
    expect(released.trace.observations.filter((o: any) => o.kind === 'action')).toHaveLength(0);
    if (released.ui.lastResult) {
      expect(progression).not.toBe('new-life'); expect(released.ui.lastReplayed).toBe(true);
      expect(released.ui.lastResult).toEqual(started.expected.result);
    }
  });

test('M02 Store a matching read preserves the first committed breakthrough result and handoff', async ({ page }, info) => {
  const started = await seedStore(page, 'breakthrough');
  await page.evaluate(() => (globalThis as any).h.m02Store.holdNextCycleDelivery());
  await page.clock.runFor(started.ui.activity.cycleMs);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.holding)).toBe(true);
  const matching = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    await f.store.refresh(); const before = f.state(), raw = await h.inspect(h.FULL_DB_NAME);
    h.m02Trace = f.trace(); f.releaseHeldCycle(); return { before, raw, delivered: f.delivered };
  });
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.store.busy)).toBe(false);
  const released = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    return { ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME), trace: h.m02Trace };
  });
  await savePositiveEvidence(info, { started, matching, released });
  expect(released.ui.game).toEqual(started.expected.nextState); expect(released.raw).toEqual(matching.raw);
  expect(released.ui.lastResult).toEqual(started.expected.result); expect(released.ui.lastReplayed).toBe(false);
  expect(released.ui.lastFromActivity).toBe(true); expect(released.ui.runtime).toBeNull();
  expect(released.trace.observations.filter((o: any) => o.kind === 'action')).toHaveLength(1);
});

test('M02 Store lost positive-cost retry cannot carry its old intent into a new life', async ({ page }, info) => {
  const started = await seedStore(page, 'breakthrough');
  await page.evaluate(() => (globalThis as any).h.m02Store.loseNextCycleDelivery());
  await page.clock.runFor(started.ui.activity.cycleMs);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.store.canRetry)).toBe(true);
  const replacement = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store, repo = await h.FullSaveRepository.open();
    try {
      const paid = await repo.loadActivitySnapshot();
      const replaced = await repo.create('另一次明确人生', h.mutation(paid.state));
      return { paid, replaced, delivered: f.delivered, raw: await h.inspect(h.FULL_DB_NAME) };
    } finally { repo.close(); }
  });
  await page.evaluate(() => { const f = (globalThis as any).h.m02Store; return f.store.retryFor(f.delivered.tick.commandId); });
  const rejected = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    return { ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  await savePositiveEvidence(info, { started, replacement, rejected });
  expect(replacement.paid.state).toEqual(started.expected.nextState);
  expect(rejected.ui.error).toContain('所属人生已经切换'); expect(rejected.ui.canRetry).toBe(false);
  expect(rejected.ui.game).toEqual(replacement.replaced.state); expect(rejected.ui.activity).toBeNull();
  expect(rejected.ui.lastResult).toBeNull(); expect(rejected.ui.runtime).toBeNull(); expect(rejected.ui.saved).toBe(false);
  expect(rejected.raw).toEqual(replacement.raw);
});


test('M02 Store a failed confirmation reread preserves paid state and requires synchronization, never a new payment', async ({ page }, info) => {
  const started = await seedStore(page, 'forge');
  await page.evaluate(() => (globalThis as any).h.m02Store.holdNextCycleDelivery());
  await page.clock.runFor(started.ui.activity.cycleMs);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.holding)).toBe(true);
  const paid = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    await f.store.refresh();
    const raw = await h.inspect(h.FULL_DB_NAME), current = await f.persisted(), prototype = h.FullSaveRepository.prototype, original = prototype.loadActivitySnapshot;
    prototype.loadActivitySnapshot = async function () {
      prototype.loadActivitySnapshot = original;
      await original.call(this); // The native read succeeds; only its consumer delivery is injected to fail.
      throw new Error('M02 confirmation snapshot delivery failed');
    };
    h.m02Trace = f.trace(); f.releaseHeldCycle(); return { raw, current };
  });
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.store.busy)).toBe(false);
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    return { ui: f.state(), syncIssue: f.store.syncIssue, confirmed: f.store.wasConfirmedFor(f.delivered.tick.commandId, f.delivered.tick.runId),
      raw: await h.inspect(h.FULL_DB_NAME), trace: h.m02Trace };
  });
  await page.evaluate(() => (globalThis as any).h.m02Store.store.init());
  const reopened = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    return { ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  await savePositiveEvidence(info, { started, paid, failed, reopened });
  expect(paid.current.state).toEqual(started.expected.nextState); expect(failed.ui.game).toEqual(paid.current.state);
  expect(failed.ui.activity).toEqual(paid.current.activity); expect(failed.ui.saved).toBe(false); expect(failed.syncIssue).toBe(true);
  expect(failed.confirmed).toBe(true); expect(failed.ui.canRetry).toBe(false); expect(failed.ui.runtime).toBeNull();
  expect(failed.trace.observations.filter((o: any) => o.kind === 'action')).toHaveLength(0);
  expect(failed.raw).toEqual(paid.raw); expect(reopened.raw).toEqual(paid.raw); expect(reopened.ui.game).toEqual(paid.current.state);
  expect(reopened.ui.activity).toEqual(paid.current.activity); expect(reopened.ui.saved).toBe(true); expect(reopened.ui.runtime).toBeNull();
});

test('M02 Store a lost forge receipt replays against later foreign progress without reverting or charging twice', async ({ page }, info) => {
  const started = await seedStore(page, 'forge');
  await page.evaluate(() => (globalThis as any).h.m02Store.loseNextCycleDelivery());
  await page.clock.runFor(started.ui.activity.cycleMs);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.m02Store.store.canRetry)).toBe(true);
  const foreign = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store, repo = await h.FullSaveRepository.open();
    try {
      const paid = await repo.loadActivitySnapshot();
      const arranged = await repo.startActivity(h.m02ReplacementPlan(paid.state), h.milestoneMutation(paid, 'm02-foreign-retry'));
      const now = Date.now; Date.now = () => arranged.activity.dueAt;
      try { await repo.settleActivity(h.milestoneTick(arranged)); } finally { Date.now = now; }
      await f.store.refresh('sync');
      return { paid, current: await repo.loadActivitySnapshot(), raw: await h.inspect(h.FULL_DB_NAME), original: f.delivered };
    } finally { repo.close(); }
  });
  await page.evaluate(() => { const f = (globalThis as any).h.m02Store; return f.store.retryFor(f.delivered.tick.commandId); });
  const replay = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.m02Store;
    return { ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  await savePositiveEvidence(info, { started, foreign, replay });
  expect(foreign.paid.state).toEqual(started.expected.nextState); expect(replay.ui.game).toEqual(foreign.current.state);
  expect(replay.ui.activity).toEqual(foreign.current.activity); expect(replay.raw).toEqual(foreign.raw);
  expect(replay.ui.lastResult).toEqual(started.expected.result); expect(replay.ui.lastReplayed).toBe(true);
  expect(replay.ui.saved).toBe(true); expect(replay.ui.runtime).toBeNull(); expect(replay.ui.error).toBe('');
});
