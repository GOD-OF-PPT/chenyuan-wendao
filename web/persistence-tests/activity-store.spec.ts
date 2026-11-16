import {confirmedDelivery} from './support';
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
    await f.store.startOnlinePlannedActivity({ kind: 'cultivation', method: 'assisted', maxCycles: 4,
      until: 'cycles', stoneBudget: 40, stoneReserve: 0 });
    return f.state();
  });
}

test('clock handshake waits the one missing wall-clock millisecond, saves once and starts a full next cycle', async ({ page }) => {
  const started = await arrange(page);
  await page.evaluate(() => (globalThis as any).h.activityStore.shiftWallClock(-1));
  await page.clock.runFor(60_000);
  const waiting = await page.evaluate(async () => { const f = (globalThis as any).h.activityStore; return { ui: f.state(), persisted: await f.persisted() }; });
  expect(waiting.ui.error).toBe(''); expect(waiting.ui.busy).toBe(false); expect(waiting.ui.canRetry).toBe(false);
  expect(waiting.ui.runtime.remainingMs).toBe(1); expect(waiting.ui.runtime.phase).toBe('running');
  expect(waiting.persisted).toEqual({ state: started.game, activity: started.activity }); expect(waiting.ui.game).toEqual(started.game);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.activity?.completedCycles)).toBe(1);
  const first = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(first.error).toBe(''); expect(first.lastResult.commandId).toBe(started.activity.nextCommand.commandId);
  expect(first.game.core.player.stones).toBe(started.game.core.player.stones - 20); expect(first.runtime.remainingMs).toBe(60_000);
  await page.clock.runFor(59_999); expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(first.game);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.activity?.completedCycles)).toBe(2);
  const last = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(last.error).toBe(''); expect(last.activity.status).toBe('stopped'); expect(last.activity.spentStones).toBe(40);
  expect(last.game.core.player.stones).toBe(started.game.core.player.stones - 40);
});

test('clock handshake survives a rewind between its deadline check and the real transaction using the same tick', async ({ page }) => {
  const started = await arrange(page);
  await page.evaluate(() => (globalThis as any).h.activityStore.rewindBeforeNextCycle(2));
  await page.clock.runFor(60_000);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.earlyRejected?.code)).toBe('ACTIVITY_NOT_DUE');
  const waiting = await page.evaluate(async () => { const f = (globalThis as any).h.activityStore; return { ui: f.state(), rejected: f.earlyRejected, persisted: await f.persisted() }; });
  expect(waiting.ui.error).toBe(''); expect(waiting.ui.busy).toBe(false); expect(waiting.ui.canRetry).toBe(false);
  expect(waiting.ui.runtime.remainingMs).toBe(2); expect(waiting.rejected.tick.commandId).toBe(started.activity.nextCommand.commandId);
  expect(waiting.persisted).toEqual({ state: started.game, activity: started.activity });
  await page.clock.runFor(1); expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(started.game);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.activity?.completedCycles)).toBe(1);
  const paid = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(paid.error).toBe(''); expect(paid.canRetry).toBe(false); expect(paid.lastResult.commandId).toBe(waiting.rejected.tick.commandId);
  expect(paid.game.core.player.stones).toBe(started.game.core.player.stones - 20); expect(paid.activity.completedCycles).toBe(1);
  expect(paid.runtime.remainingMs).toBe(60_000);
});

for (const control of ['pause', 'reconnect', 'takeover', 'dispose']) test(`clock handshake ${control} cancels the wall-clock remainder without settling an abandoned cycle`, async ({ page }) => {
  const started = await arrange(page);
  await page.evaluate(() => (globalThis as any).h.activityStore.shiftWallClock(-1000));
  await page.clock.runFor(60_000);
  const waiting = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(waiting.error).toBe(''); expect(waiting.runtime.remainingMs).toBe(1000); expect(waiting.busy).toBe(false);
  await page.evaluate(async control => {
    const h = (globalThis as any).h, f = h.activityStore;
    if (control === 'pause') await f.store.pauseCultivation();
    else if (control === 'reconnect') await f.store.init();
    else if (control === 'dispose') f.dispose();
    else {
      const repo = await h.FullSaveRepository.open();
      try {
        const current = await repo.loadActivitySnapshot();
        await repo.resumeActivity({ commandId: crypto.randomUUID(), runId: current.state.core.runId, expectedRevision: current.state.core.revision,
          expectedActivityId: current.activity.id, expectedActivityRevision: current.activity.revision, ownerId: 'clock-other-page' });
        await f.store.refresh('sync');
      } finally { repo.close(); }
    }
  }, control);
  await page.clock.runFor(120_000);
  const after = await page.evaluate(async () => { const f = (globalThis as any).h.activityStore; return { ui: f.state(), persisted: await f.persisted() }; });
  expect(after.persisted.state).toEqual(started.game); expect(after.persisted.activity.completedCycles).toBe(0);
  expect(after.ui.runtime).toBeNull(); expect(after.ui.error).toBe('');
  if (control === 'pause') expect(after.persisted.activity.status).toBe('paused');
  if (control === 'takeover') expect(after.persisted.activity.ownerId).toBe('clock-other-page');
});

test('clock handshake a forward wall-clock jump cannot shorten the monotonic cycle or create catch-up rewards', async ({ page }) => {
  const started = await arrange(page);
  await page.evaluate(() => (globalThis as any).h.activityStore.shiftWallClock(86_400_000));
  await page.clock.runFor(59_999); expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(started.game);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.activity?.completedCycles)).toBe(1);
  const first = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(first.error).toBe(''); expect(first.activity.completedCycles).toBe(1); expect(first.runtime.remainingMs).toBe(60_000);
  expect(first.game.core.player.stones).toBe(started.game.core.player.stones - 20);
  await page.clock.runFor(59_999); expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(first.game);
});

test('clock handshake keeps a real quota failure visible and retries that same cycle after another wall-clock adjustment', async ({ page }) => {
  const started = await arrange(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
      if (this.name === 'full-state' && key === 'current') { IDBObjectStore.prototype.put = put; throw new DOMException('clock quota', 'QuotaExceededError'); }
      return put.call(this, value, key!);
    };
  });
  await page.clock.runFor(60_000);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.canRetry)).toBe(true);
  const failed = await page.evaluate(async () => { const f = (globalThis as any).h.activityStore; return { ui: f.state(), persisted: await f.persisted() }; });
  expect(failed.ui.error).toContain('存储空间不足'); expect(failed.ui.lastResult).toBeNull();
  expect(failed.persisted).toEqual({ state: started.game, activity: started.activity });
  await page.evaluate(() => { const h = (globalThis as any).h; h.activityStore.shiftWallClock(-2); h.clockRetry = h.activityStore.store.retry(); });
  const waiting = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(waiting.error).toBe(''); expect(waiting.runtime.remainingMs).toBe(2); expect(waiting.busy).toBe(false);
  expect(waiting.game).toEqual(started.game); expect(waiting.canRetry).toBe(false);
  await page.clock.runFor(2); await page.evaluate(() => (globalThis as any).h.clockRetry);
  const completed = await page.evaluate(async () => { const f = (globalThis as any).h.activityStore; return { ui: f.state(), persisted: await f.persisted() }; });
  expect(completed.ui.error).toBe(''); expect(completed.ui.activity.completedCycles).toBe(1);
  expect(completed.ui.lastResult.commandId).toBe(started.activity.nextCommand.commandId); expect(completed.ui.lastReplayed).toBe(false);
  expect(completed.ui.game.core.player.stones).toBe(started.game.core.player.stones - 20); expect(completed.ui.runtime.remainingMs).toBe(60_000);
  expect(completed.persisted.state).toEqual(completed.ui.game); expect(completed.persisted.activity).toEqual(completed.ui.activity);
});

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
  expect(failed.persisted.state.core.world.elapsedMonths).toBe(started.game.core.world.elapsedMonths + 12);
  expect(failed.persisted.activity.completedCycles).toBe(1);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.retry());
  const retried = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(retried.ui.error).toBe(''); expect(retried.ui.canRetry).toBe(false); expect(retried.ui.lastReplayed).toBe(true);
  expect(retried.ui.lastResult).toEqual(failed.delivery.outcome.result); expect(retried.ui.lastFromActivity).toBe(true);
  expect(retried.ui.game).toEqual(failed.persisted.state); expect(retried.persisted).toEqual(failed.persisted);
  expect(retried.raw).toEqual(confirmedDelivery(failed.raw,failed.delivery.outcome.result)); expect(retried.ui.runtime.remainingMs).toBe(60_000);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.pauseCultivation());
  const paused = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(paused.activity.status).toBe('paused'); expect(paused.runtime).toBeNull();
  expect(paused.lastReplayed).toBe(true); expect(paused.lastResult).toEqual(retried.ui.lastResult);
  expect(paused.game).toEqual(retried.ui.game); expect(paused.activity.completedCycles).toBe(1);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.resumeOnlineCultivation());
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
  await page.evaluate(() => (globalThis as any).h.activityStore.store.resumeOnlineCultivation());
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
  expect(after.ui.game.core.world.elapsedMonths).toBe(started.game.core.world.elapsedMonths + 12);
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

test('source Store replays a lost material-cycle delivery and a pause during commit delivery never schedules another payout', async ({ page }) => {
  await page.evaluate(() => {
    const h = (globalThis as any).h, d = h.routes.driver(); d.go('wilderness');
    h.sourceSeeding = h.activityStore.store.importText(JSON.stringify(d.game));
  });
  await page.clock.runFor(700);
  await expect.poll(() => page.evaluate(() => {
    const f = (globalThis as any).h.activityStore;
    return { busy: f.store.busy, error: f.store.error, location: f.store.game?.core.world.location };
  })).toEqual({ busy: false, error: '', location: 'wilderness' });
  const started = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    await f.store.startOnlinePlannedActivity({ kind: 'source', sourceId: 'herbs', maxCycles: 5, until: 'cycles', target: null,
      monthBudget: 60, remainingMonthsReserve: 1 });
    f.loseNextCycleDelivery(); return f.state();
  });
  expect(started.activity.version).toBe(2); expect(started.runtime.remainingMs).toBe(30_000);
  await page.clock.runFor(30_000);
  await expect.poll(() => page.evaluate(() => {
    const f = (globalThis as any).h.activityStore;
    return { busy: f.store.busy, canRetry: f.store.canRetry, runtime: f.store.activityRuntime };
  })).toEqual({ busy: false, canRetry: true, runtime: null });
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME), delivery: f.delivered };
  });
  expect(failed.ui.lastResult).toBeNull(); expect(failed.ui.error).toContain('回复丢失');
  expect(failed.persisted.activity.gainedItems).toEqual({ herb: 2 }); expect(failed.persisted.activity.spentMonths).toBe(12);
  expect(failed.persisted.state.core.inventory.herb).toBe(started.game.core.inventory.herb + 2);
  expect(failed.persisted.state).toEqual(failed.delivery.outcome.state);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.retry());
  const retry = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(retry.ui.error).toBe(''); expect(retry.ui.lastReplayed).toBe(true); expect(retry.ui.lastFromActivity).toBe(true);
  expect(retry.ui.lastResult).toEqual(failed.delivery.outcome.result); expect(retry.persisted).toEqual(failed.persisted);
  expect(retry.raw).toEqual(confirmedDelivery(failed.raw,failed.delivery.outcome.result)); expect(retry.ui.runtime.remainingMs).toBe(30_000);
  await page.evaluate(() => (globalThis as any).h.activityStore.holdNextCycleDelivery());
  await page.clock.runFor(30_000);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.holding)).toBe(true);
  await page.evaluate(() => {
    const h = (globalThis as any).h; h.sourcePausing = h.activityStore.store.pauseCultivation();
  });
  const waiting = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), delivery: f.delivered };
  });
  expect(waiting.ui.runtime).toBeNull(); expect(waiting.ui.pausing).toBe(true);
  expect(waiting.ui.activity.completedCycles).toBe(1); expect(waiting.persisted.activity.completedCycles).toBe(2);
  expect(waiting.persisted.activity.gainedItems).toEqual({ herb: 4 }); expect(waiting.persisted.activity.spentMonths).toBe(24);
  await page.evaluate(async () => {
    const h = (globalThis as any).h; h.activityStore.releaseHeldCycle(); await h.sourcePausing;
  });
  const paused = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore; return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(paused.ui.activity.status).toBe('paused'); expect(paused.ui.runtime).toBeNull(); expect(paused.ui.activity.completedCycles).toBe(2);
  expect(paused.ui.game).toEqual(waiting.delivery.outcome.state); expect(paused.persisted.activity).toEqual(paused.ui.activity);
  await page.clock.runFor(86_400_000);
  expect(await page.evaluate(() => (globalThis as any).h.activityStore.persisted())).toEqual(paused.persisted);
});

test('production Store retries the saved furnace and a pause while the next commit is in flight never burns another batch', async ({ page }) => {
  await page.evaluate(() => {
    const h = (globalThis as any).h, d = h.routes.driver(); d.resource('herb', 10); d.funds(10); d.go('cave');
    h.productionSeeding = h.activityStore.store.importText(JSON.stringify(d.game));
  });
  await page.clock.runFor(700);
  await expect.poll(() => page.evaluate(() => {
    const f = (globalThis as any).h.activityStore;
    return { busy: f.store.busy, error: f.store.error, herbs: f.store.game?.core.inventory.herb };
  })).toEqual({ busy: false, error: '', herbs: 10 });
  const started = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    await f.store.startOnlinePlannedActivity({ kind: 'craft', recipeId: 'healing', maxCycles: 5, until: 'cycles', targetQuantity: null,
      stoneBudget: 10, stoneReserve: 0, monthBudget: 60, remainingMonthsReserve: 1, itemReserves: {} });
    f.loseNextCycleDelivery(); return f.state();
  });
  expect(started.activity.version).toBe(3); expect(started.runtime.remainingMs).toBe(30_000);
  await page.clock.runFor(30_000);
  await expect.poll(() => page.evaluate(() => {
    const f = (globalThis as any).h.activityStore;
    return { busy: f.store.busy, retry: f.store.canRetry, runtime: f.store.activityRuntime };
  })).toEqual({ busy: false, retry: true, runtime: null });
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME), delivery: f.delivered };
  });
  expect(failed.ui.lastResult).toBeNull(); expect(failed.persisted.state).toEqual(failed.delivery.outcome.state);
  expect(failed.persisted.activity.spentItems).toEqual({ herb: 2 }); expect(failed.persisted.activity.gainedItems).toEqual({ healing_pill: 1 });
  expect(failed.persisted.state.core.inventory.herb).toBe(8);
  expect(failed.persisted.state.core.inventory.healing_pill).toBe(started.game.core.inventory.healing_pill + 1);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.retry());
  const replay = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(replay.ui.lastReplayed).toBe(true); expect(replay.ui.lastFromActivity).toBe(true);
  expect(replay.ui.lastResult).toEqual(failed.delivery.outcome.result); expect(replay.persisted).toEqual(failed.persisted);
  expect(replay.raw).toEqual(confirmedDelivery(failed.raw,failed.delivery.outcome.result)); expect(replay.ui.runtime.remainingMs).toBe(30_000);
  await page.evaluate(() => (globalThis as any).h.activityStore.holdNextCycleDelivery());
  await page.clock.runFor(30_000);
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.holding)).toBe(true);
  await page.evaluate(() => {
    const h = (globalThis as any).h; h.productionPausing = h.activityStore.store.pauseCultivation();
  });
  const pending = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), delivery: f.delivered };
  });
  expect(pending.ui.pausing).toBe(true); expect(pending.ui.runtime).toBeNull(); expect(pending.ui.activity.completedCycles).toBe(1);
  expect(pending.persisted.activity.completedCycles).toBe(2); expect(pending.persisted.state.core.inventory.herb).toBe(6);
  expect(pending.persisted.activity.spentItems).toEqual({ herb: 4 }); expect(pending.persisted.activity.gainedItems).toEqual({ healing_pill: 2 });
  await page.evaluate(async () => {
    const h = (globalThis as any).h; h.activityStore.releaseHeldCycle(); await h.productionPausing;
  });
  const paused = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore; return { ui: f.state(), persisted: await f.persisted() };
  });
  expect(paused.ui.error).toBe(''); expect(paused.ui.activity.status).toBe('paused'); expect(paused.ui.runtime).toBeNull();
  expect(paused.ui.activity.completedCycles).toBe(2); expect(paused.ui.game).toEqual(pending.delivery.outcome.state);
  expect(paused.persisted.activity).toEqual(paused.ui.activity); expect(paused.persisted.state).toEqual(paused.ui.game);
  await page.clock.runFor(86_400_000);
  expect(await page.evaluate(() => (globalThis as any).h.activityStore.persisted())).toEqual(paused.persisted);
});
