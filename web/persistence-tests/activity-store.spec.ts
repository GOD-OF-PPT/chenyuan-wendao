import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test.beforeEach(async ({ page }) => {
  // Playwright's mocked clock belongs to this test's browser context; all Store operations use this page only.
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async () => {
    const modulePath = '/persistence-tests/activity-store-harness.ts';
    const { createActivityStoreHarness } = await import(modulePath);
    const h = (globalThis as any).h, d = h.routes.driver(); d.go('cave');
    h.activityStore = createActivityStoreHarness();
    h.caveGame = structuredClone(d.game);
    await h.activityStore.store.init();
    h.seeding = h.activityStore.store.importText(JSON.stringify(h.caveGame));
  });
  await page.clock.runFor(700);
  await expect.poll(() => page.evaluate(() => {
    const h = (globalThis as any).h;
    return { busy: h.activityStore.store.busy, error: h.activityStore.store.error,
      realm: h.activityStore.store.game?.core.player.realm, location: h.activityStore.store.game?.core.world.location,
      runtime: h.activityStore.store.activityRuntime };
  })).toEqual({ busy: false, error: '', realm: 'qi', location: 'cave', runtime: null });
  const imported = await page.evaluate(() => {
    const h = (globalThis as any).h;
    const expected = structuredClone(h.caveGame), actual = h.activityStore.store.game;
    // Import deliberately starts a fresh run/revision while preserving the lawful fixture's game resources.
    expected.core.runId = actual.core.runId; expected.core.revision = 0;
    return { actual, expected };
  });
  expect(imported.actual).toEqual(imported.expected);
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => (globalThis as any).h?.activityStore?.dispose());
});

async function arrange(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    await f.store.startCultivation({ kind: 'cultivation', method: 'assisted', maxCycles: 4,
      until: 'cycles', stoneBudget: 40, stoneReserve: 0 });
    return f.state();
  });
}

test('Store retry replays a committed cycle and pause/resume preserve its replay identity without more rewards', async ({ page }) => {
  const started = await arrange(page);
  expect(started.activity.status).toBe('running'); expect(started.runtime.remainingMs).toBe(60_000);
  await page.evaluate(() => (globalThis as any).h.activityStore.loseNextCycleDelivery());
  await page.clock.runFor(60_000);
  await expect.poll(() => page.evaluate(() => {
    const f = (globalThis as any).h.activityStore;
    return { busy: f.store.busy, canRetry: f.store.canRetry, completed: f.store.activity?.completedCycles,
      runtime: f.store.activityRuntime, delivered: !!f.delivered };
  })).toEqual({ busy: false, canRetry: true, completed: 1, runtime: null, delivered: true });
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), delivery: f.delivered, persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(failed.ui.error).toContain('回复丢失'); expect(failed.ui.lastResult).toBeNull();
  expect(failed.persisted.state).toEqual(failed.delivery.outcome.state);
  expect(failed.persisted.state.core.player.stones).toBe(started.game.core.player.stones - 20);
  expect(failed.persisted.state.core.world.elapsedMonths).toBe(started.game.core.world.elapsedMonths + 1);
  expect(failed.persisted.activity.completedCycles).toBe(1);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.retry());
  const retried = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(retried.ui.error).toBe(''); expect(retried.ui.canRetry).toBe(false); expect(retried.ui.lastReplayed).toBe(true);
  expect(retried.ui.lastResult).toEqual(failed.delivery.outcome.result); expect(retried.ui.lastFromActivity).toBe(true);
  expect(retried.ui.game).toEqual(failed.persisted.state); expect(retried.persisted).toEqual(failed.persisted);
  expect(retried.raw).toEqual(failed.raw); expect(retried.ui.runtime.remainingMs).toBe(60_000);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.pauseCultivation());
  const paused = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(paused.activity.status).toBe('paused'); expect(paused.runtime).toBeNull();
  expect(paused.lastReplayed).toBe(true); expect(paused.lastResult).toEqual(retried.ui.lastResult);
  expect(paused.game).toEqual(retried.ui.game); expect(paused.activity.completedCycles).toBe(1);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.resumeCultivation());
  const resumed = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(resumed.ui.lastReplayed).toBe(true); expect(resumed.ui.lastResult).toEqual(retried.ui.lastResult);
  expect(resumed.ui.game).toEqual(retried.ui.game); expect(resumed.persisted.state).toEqual(retried.ui.game);
  expect(resumed.ui.activity.completedCycles).toBe(1); expect(resumed.ui.activity.spentStones).toBe(20);
  expect(resumed.ui.runtime.remainingMs).toBe(60_000); expect(resumed.ui.activity.generation).toBeGreaterThan(paused.activity.generation);
});

test('same Store reconnect preserves running arrangement without offline catch-up and explicit resume starts a full period', async ({ page }) => {
  const started = await arrange(page);
  await page.clock.runFor(20_000);
  const before = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(before.ui.runtime.remainingMs).toBe(40_000); expect(before.ui.activity.completedCycles).toBe(0);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.init());
  await page.clock.runFor(180_000);
  const reopened = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(reopened.ui.error).toBe(''); expect(reopened.ui.runtime).toBeNull(); expect(reopened.ui.activity.status).toBe('running');
  expect(reopened.ui.activity.ownerId).toBe(started.activity.ownerId);
  expect(reopened.ui.activity).toEqual(before.ui.activity); expect(reopened.persisted).toEqual(before.persisted);
  expect(reopened.ui.game).toEqual(started.game);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.resumeCultivation());
  const resumed = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(resumed.runtime.remainingMs).toBe(60_000); expect(resumed.activity.ownerId).toBe(started.activity.ownerId);
  expect(resumed.activity.generation).toBeGreaterThan(started.activity.generation); expect(resumed.activity.completedCycles).toBe(0);
  expect(resumed.game).toEqual(started.game);
  await page.clock.runFor(59_999);
  expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(started.game);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => {
    const f = (globalThis as any).h.activityStore;
    return { busy: f.store.busy, completed: f.store.activity?.completedCycles };
  })).toEqual({ busy: false, completed: 1 });
  const after = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(after.ui.game.core.player.stones).toBe(started.game.core.player.stones - 20);
  expect(after.ui.game.core.world.elapsedMonths).toBe(started.game.core.world.elapsedMonths + 1);
  expect(after.persisted.state).toEqual(after.ui.game);
});

test('pause waits for a cycle already committed but not yet delivered and never starts the next cycle', async ({ page }) => {
  const started = await arrange(page);
  await page.evaluate(() => (globalThis as any).h.activityStore.holdNextCycleDelivery());
  await page.clock.runFor(60_000);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.holding)).toBe(true);
  await page.evaluate(() => {
    const h = (globalThis as any).h;
    h.pausing = h.activityStore.store.pauseCultivation();
  });
  const waiting = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), delivery: f.delivered };
  });
  expect(waiting.ui.busy).toBe(true); expect(waiting.ui.pausing).toBe(true); expect(waiting.ui.runtime).toBeNull();
  expect(waiting.ui.game).toEqual(started.game); expect(waiting.ui.activity.completedCycles).toBe(0);
  expect(waiting.persisted.state).toEqual(waiting.delivery.outcome.state); expect(waiting.persisted.activity.completedCycles).toBe(1);
  expect(waiting.persisted.activity.status).toBe('running');
  await page.evaluate(async () => {
    const h = (globalThis as any).h; h.activityStore.releaseHeldCycle(); await h.pausing;
  });
  const paused = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(paused.ui.error).toBe(''); expect(paused.ui.pausing).toBe(false); expect(paused.ui.runtime).toBeNull();
  expect(paused.ui.activity.status).toBe('paused'); expect(paused.ui.activity.completedCycles).toBe(1);
  expect(paused.ui.game).toEqual(waiting.delivery.outcome.state); expect(paused.persisted.state).toEqual(paused.ui.game);
  expect(paused.persisted.activity).toEqual(paused.ui.activity);
  await page.clock.runFor(180_000);
  const after = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(after.ui.game).toEqual(paused.ui.game); expect(after.ui.activity).toEqual(paused.ui.activity);
  expect(after.persisted).toEqual(paused.persisted);
});
