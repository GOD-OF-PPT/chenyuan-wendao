import { test, expect, type Page } from '@playwright/test';
import { setupPersistence } from './support';

const notice = '已重新读取已保存进度；上次未确认的操作未自动重试，请核对当前成果后再安排。';
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async () => {
    const h = (globalThis as any).h, path = '/persistence-tests/activity-store-harness.ts';
    const { createActivityStoreHarness } = await import(path);
    h.reconnectStore = createActivityStoreHarness();
    h.reconnectView = () => ({ ...h.reconnectStore.state(), warning: h.reconnectStore.store.warning,
      available: h.reconnectStore.store.available, ready: h.reconnectStore.store.ready, saveLabel: h.reconnectStore.store.saveLabel });
    await h.reconnectStore.store.init();
  });
});
test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    const h = (globalThis as any).h;
    h?.restoreReconnectFault?.(); h?.reconnectStore?.dispose();
  });
});

async function seed(page: Page, version: number) {
  await page.evaluate(version => {
    const h = (globalThis as any).h, d = h.routes.driver();
    if (version === 5) { d.funds(100); d.go('market'); }
    else d.go('cave');
    h.reconnectPlan = version === 5
      ? { kind: 'buy', item: 'healing_pill', maxCycles: 2, until: 'cycles', targetQuantity: null, stoneBudget: 100, stoneReserve: 0 }
      : version === 6 ? { kind: 'travel', location: 'wilderness', maxCycles: 1 }
        : { kind: 'milestone', action: { type: 'BREAKTHROUGH' }, maxCycles: 1 };
    // The complete preparing checkpoint and resources come from the lawful engine route.
    const game = version === 7 ? d.checkpoints.mortal : d.game;
    h.reconnectSeeding = h.reconnectStore.store.importText(JSON.stringify(game));
  }, version);
  await page.clock.runFor(700);
  await page.evaluate(() => (globalThis as any).h.reconnectSeeding);
  expect(await page.evaluate(() => {
    const s = (globalThis as any).h.reconnectStore.store; return { busy: s.busy, error: s.error, saved: s.saved };
  })).toEqual({ busy: false, error: '', saved: true });
}

async function failCycle(page: Page, version: number, mode: 'lost' | 'quota') {
  await seed(page, version);
  const started = await page.evaluate(async mode => {
    const h = (globalThis as any).h, f = h.reconnectStore;
    if (h.reconnectPlan.kind === 'milestone') await f.store.startOnlinePreparedMilestone(f.store.prepareMilestone(h.reconnectPlan.action));
    else await f.store.startOnlinePlannedActivity(h.reconnectPlan);
    const ui = h.reconnectView(), raw = await h.inspect(h.FULL_DB_NAME), expected = h.engine.resolve(ui.game, ui.activity.nextCommand);
    if (mode === 'lost') f.loseNextCycleDelivery();
    else {
      const put = IDBObjectStore.prototype.put;
      h.restoreReconnectFault = () => { IDBObjectStore.prototype.put = put; };
      IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
        if (this.name === h.FULL_STATE_STORE && key === 'current') {
          h.restoreReconnectFault(); throw new DOMException('reconnect quota', 'QuotaExceededError');
        }
        return put.call(this, value, key!);
      };
    }
    return { ui, raw, expected };
  }, mode);
  expect(started.ui.activity.version).toBe(version);
  await page.clock.runFor(started.ui.activity.cycleMs);
  await expect.poll(() => page.evaluate(() => {
    const s = (globalThis as any).h.reconnectStore.store;
    return { busy: s.busy, canRetry: s.canRetry, runtime: s.activityRuntime };
  })).toEqual({ busy: false, canRetry: true, runtime: null });
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.reconnectStore;
    return { ui: h.reconnectView(), raw: await h.inspect(h.FULL_DB_NAME), persisted: await f.persisted(), delivery: f.delivered,
      retryMatches: f.store.canRetryFor(f.delivered?.tick.commandId ?? f.store.activity.nextCommand.commandId) };
  });
  expect(failed.ui.saved).toBe(false); expect(failed.ui.lastResult).toBeNull(); expect(failed.retryMatches).toBe(true);
  expect(failed.ui.error).toContain(mode === 'lost' ? '回复丢失' : '存储空间不足');
  if (mode === 'quota') {
    expect(failed.raw).toEqual(started.raw); expect(failed.persisted).toEqual({ state: started.ui.game, activity: started.ui.activity });
  } else {
    expect(failed.persisted.state).toEqual(started.expected.nextState); expect(failed.delivery.outcome.result).toEqual(started.expected.result);
    expect(failed.persisted.activity.completedCycles).toBe(1);
  }
  return { started, failed };
}

for (const version of [5, 6, 7]) for (const mode of ['lost', 'quota'] as const) {
  test(`v${version} ${mode}: same Store reconnect reports the saved snapshot, abandons the old local retry and never settles offline`, async ({ page }) => {
    const { started, failed } = await failCycle(page, version, mode);
    const connected = await page.evaluate(async commandId => {
      const h = (globalThis as any).h, f = h.reconnectStore; await f.store.init();
      return { ui: h.reconnectView(), raw: await h.inspect(h.FULL_DB_NAME), persisted: await f.persisted(), retryMatches: f.store.canRetryFor(commandId) };
    }, started.ui.activity.nextCommand.commandId);
    expect(connected.ui.game).toEqual(failed.persisted.state); expect(connected.ui.activity).toEqual(failed.persisted.activity);
    expect(connected.persisted).toEqual(failed.persisted); expect(connected.raw).toEqual(failed.raw);
    expect(connected.ui.saved).toBe(true); expect(connected.ui.saveLabel).toBe('已保存'); expect(connected.ui.warning).toBe(notice);
    expect(connected.ui.error).toBe(''); expect(connected.ui.available).toBe(true); expect(connected.ui.ready).toBe(true);
    expect(connected.ui.canRetry).toBe(false); expect(connected.retryMatches).toBe(false); expect(connected.ui.runtime).toBeNull();
    expect(connected.ui.lastResult).toBeNull(); expect(connected.ui.lastReplayed).toBe(false); expect(connected.ui.lastFromActivity).toBe(false);
    await page.evaluate(async commandId => {
      const h = (globalThis as any).h; await h.reconnectStore.store.retryFor(commandId); await h.reconnectStore.store.retry();
    }, started.ui.activity.nextCommand.commandId);
    await page.clock.runFor(86_400_000);
    const later = await page.evaluate(async () => {
      const h = (globalThis as any).h; return { ui: h.reconnectView(), raw: await h.inspect(h.FULL_DB_NAME) };
    });
    expect(later.ui).toEqual(connected.ui); expect(later.raw).toEqual(connected.raw);
  });
}

test('reconnect keeps a checkpoint-read warning beside its abandoned-intent explanation', async ({ page }) => {
  const { failed } = await failCycle(page, 7, 'lost');
  const connected = await page.evaluate(async () => {
    const h = (globalThis as any).h, prototype = h.FullSaveRepository.prototype, read = prototype.loadCheckpoint;
    prototype.loadCheckpoint = async () => { throw new Error('checkpoint read probe'); };
    h.restoreReconnectFault = () => { prototype.loadCheckpoint = read; };
    try { await h.reconnectStore.store.init(); return { ui: h.reconnectView(), raw: await h.inspect(h.FULL_DB_NAME) }; }
    finally { h.restoreReconnectFault(); }
  });
  expect(connected.ui.saved).toBe(true); expect(connected.ui.warning).toContain('检查点无法读取：checkpoint read probe');
  expect(connected.ui.warning).toContain(notice); expect(connected.ui.error).toBe(''); expect(connected.ui.runtime).toBeNull();
  expect(connected.raw).toEqual(failed.raw); expect(connected.ui.game).toEqual(failed.persisted.state);
});

for (const stage of ['open', 'snapshot'] as const) test(`failed reconnect ${stage} keeps a real error and never declares the snapshot saved`, async ({ page }) => {
  const { failed } = await failCycle(page, 6, 'quota');
  const result = await page.evaluate(async stage => {
    const h = (globalThis as any).h, target = stage === 'open' ? h.FullSaveRepository : h.FullSaveRepository.prototype;
    const key = stage === 'open' ? 'open' : 'loadActivitySnapshot', original = target[key];
    target[key] = async () => { throw new Error('reconnect ' + stage + ' probe'); };
    h.restoreReconnectFault = () => { target[key] = original; };
    try { await h.reconnectStore.store.init(); return { ui: h.reconnectView(), raw: await h.inspect(h.FULL_DB_NAME) }; }
    finally { h.restoreReconnectFault(); }
  }, stage);
  expect(result.ui.error).toContain('无法读取存档：reconnect ' + stage + ' probe'); expect(result.ui.available).toBe(false);
  expect(result.ui.saved).toBe(false); expect(result.ui.canRetry).toBe(false); expect(result.ui.runtime).toBeNull();
  expect(result.ui.warning).not.toContain(notice); expect(result.ui.lastResult).toBeNull(); expect(result.raw).toEqual(failed.raw);
});
