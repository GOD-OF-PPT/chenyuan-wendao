import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import {repositoryFsRoot as root} from './fs-root';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async root => {
    const h = (globalThis as any).h, modulePath = '/persistence-tests/activity-store-harness.ts';
    const { createActivityStoreHarness } = await import(modulePath), { RuleError } = await import(`/@fs${root}src/full/errors.ts`);
    const d = h.routes.driver(); d.realm(); d.funds(200); d.go('sect'); d.doAction({ type: 'LEARN', skill: 'sword_still' }); d.go('cave');
    h.activityStore = createActivityStoreHarness(); await h.activityStore.store.init();
    h.configurationSeeding = h.activityStore.store.importText(JSON.stringify(d.game));
    const prototype = h.FullSaveRepository.prototype, configure = prototype.configure;
    h.configurationAttempts = []; h.configurationFaults = [];
    prototype.configure = async function(intent: any) {
      h.configurationAttempts.push(structuredClone(intent));
      const fault = h.configurationFaults.shift();
      if (fault === 'quota') {
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
          if (this.name === h.FULL_RECEIPT_STORE) throw new DOMException('configuration quota', 'QuotaExceededError');
          return put.call(this, value, key!);
        };
        try { return await configure.call(this, intent); }
        finally { IDBObjectStore.prototype.put = put; }
      }
      const result = await configure.call(this, intent);
      if (fault === 'lost') { h.configurationDelivered = structuredClone(result); throw new RuleError('STORAGE_ABORTED', '测试注入：配装已提交但回复丢失'); }
      return result;
    };
    h.restoreConfiguration = () => { prototype.configure = configure; };
  }, root);
  await page.clock.runFor(700);
  await page.evaluate(() => (globalThis as any).h.configurationSeeding);
  expect(await page.evaluate(() => {
    const s = (globalThis as any).h.activityStore.store; return { busy: s.busy, error: s.error, realm: s.game?.core.player.realm };
  })).toEqual({ busy: false, error: '', realm: 'foundation' });
});
test.afterEach(async ({ page }) => {
  await page.evaluate(() => { const h = (globalThis as any).h; h?.restoreConfiguration?.(); h?.activityStore?.dispose(); });
});

test('Store configuration prepares without writing and applies instantly with a distinct source instead of an action clock', async ({ page }) => {
  const prepared = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore, before = await h.inspect(h.FULL_DB_NAME);
    h.configurationIntent = f.store.prepareConfiguration({ type: 'EQUIP', skill: 'sword_still' });
    return { before, after: await h.inspect(h.FULL_DB_NAME), intent: h.configurationIntent, game: f.store.game, now: performance.now() };
  });
  expect(prepared.after).toEqual(prepared.before); expect(prepared.intent.command.expectedRevision).toBe(prepared.game.core.revision);
  const during = await page.evaluate(() => {
    const h = (globalThis as any).h, f = h.activityStore; h.configuring = f.store.applyConfiguration(h.configurationIntent);
    return { busy: f.store.busy, execution: f.store.execution, runtime: f.store.activityRuntime };
  });
  expect(during).toEqual({ busy: true, execution: null, runtime: null });
  await page.evaluate(() => (globalThis as any).h.configuring);
  const after = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore; return { ui: f.state(), persisted: await f.persisted(), execution: f.store.execution, now: performance.now(), attempts: h.configurationAttempts };
  });
  expect(after.now).toBe(prepared.now); expect(after.ui.error).toBe(''); expect(after.ui.lastFromActivity).toBe(false);
  expect(after.ui.lastResult.type).toBe('EQUIP'); expect(after.ui.lastResult.commandId).toBe(prepared.intent.command.commandId);
  expect(after.ui.game.loadout.mind).toBe('sword_still'); expect(after.ui.game.core.revision).toBe(prepared.game.core.revision + 1);
  expect(after.execution).toBeNull(); expect(after.ui.runtime).toBeNull(); expect(after.persisted.state).toEqual(after.ui.game); expect(after.attempts).toEqual([prepared.intent]);
});

test('Store configuration quota retry preserves the exact selected command and never invents a new authorization', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore, original = structuredClone(f.store.game), before = await h.inspect(h.FULL_DB_NAME);
    const intent = f.store.prepareConfiguration({ type: 'EQUIP', skill: 'sword_still' }); h.configurationFaults.push('quota');
    await f.store.applyConfiguration(intent); const failed = f.state(), afterFailure = await h.inspect(h.FULL_DB_NAME), matchingRetry = f.store.canRetryFor(intent.command.commandId);
    await f.store.retryFor(intent.command.commandId);
    return { intent, original, before, failed, afterFailure, matchingRetry, after: f.state(), persisted: await f.persisted(), attempts: h.configurationAttempts };
  });
  expect(r.failed.canRetry).toBe(true); expect(r.matchingRetry).toBe(true); expect(r.failed.error).toContain('空间不足'); expect(r.failed.game).toEqual(r.original); expect(r.afterFailure).toEqual(r.before);
  expect(r.after.error).toBe(''); expect(r.after.canRetry).toBe(false); expect(r.after.lastFromActivity).toBe(false);
  expect(r.after.lastResult.commandId).toBe(r.intent.command.commandId); expect(r.after.game.core.revision).toBe(r.original.core.revision + 1);
  expect(r.after.game.loadout.mind).toBe('sword_still'); expect(r.persisted.state).toEqual(r.after.game); expect(r.attempts).toEqual([r.intent, r.intent]);
});

test('Store configuration lost delivery stays retryable after refresh makes its original revision stale and replays without re-equipping', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore, intent = f.store.prepareConfiguration({ type: 'EQUIP', skill: 'sword_still' });
    h.configurationFaults.push('lost'); await f.store.applyConfiguration(intent); await f.store.refresh('sync');
    const failed = f.state(), beforeRetry = await h.inspect(h.FULL_DB_NAME), matchingRetry = f.store.canRetryFor(intent.command.commandId);
    await f.store.retryFor(intent.command.commandId);
    return { intent, failed, beforeRetry, matchingRetry, delivered: h.configurationDelivered, after: f.state(), afterRetry: await h.inspect(h.FULL_DB_NAME), attempts: h.configurationAttempts };
  });
  expect(r.failed.error).toContain('回复丢失'); expect(r.failed.canRetry).toBe(true); expect(r.matchingRetry).toBe(true);
  expect(r.failed.game.core.revision).toBeGreaterThan(r.intent.command.expectedRevision); expect(r.failed.game).toEqual(r.delivered.state); expect(r.failed.lastResult).toBeNull();
  expect(r.after.error).toBe(''); expect(r.after.lastReplayed).toBe(true); expect(r.after.lastFromActivity).toBe(false);
  expect(r.after.lastResult).toEqual(r.delivered.result); expect(r.after.game).toEqual(r.delivered.state); expect(r.afterRetry).toEqual(r.beforeRetry); expect(r.attempts).toEqual([r.intent, r.intent]);
});

test('Store configuration rejects an old paused-activity confirmation after another arrangement replaces it at the same Game revision', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore, plan = { kind: 'cultivation', method: 'natural', maxCycles: 3, until: 'cycles', stoneBudget: 0, stoneReserve: 0 };
    await f.store.startOnlinePlannedActivity(plan); await f.store.pauseCultivation();
    const intent = f.store.prepareConfiguration({ type: 'EQUIP', skill: 'sword_still' }), oldActivity = structuredClone(f.store.activity), original = structuredClone(f.store.game);
    await f.store.startOnlinePlannedActivity({ ...plan, maxCycles: 2 }); await f.store.pauseCultivation();
    const currentActivity = structuredClone(f.store.activity), before = await h.inspect(h.FULL_DB_NAME);
    await f.store.applyConfiguration(intent); await f.store.retryFor(intent.command.commandId);
    return { intent, oldActivity, currentActivity, original, before, afterRaw: await h.inspect(h.FULL_DB_NAME), after: f.state(), attempts: h.configurationAttempts };
  });
  expect(r.currentActivity.id).not.toBe(r.oldActivity.id); expect(r.after.game).toEqual(r.original); expect(r.after.activity).toEqual(r.currentActivity);
  expect(r.after.error).toContain('活动安排已变化'); expect(r.after.canRetry).toBe(false); expect(r.after.lastResult).toBeNull(); expect(r.afterRaw).toEqual(r.before); expect(r.attempts).toEqual([r.intent]);
});

test('a newer failed Store configuration replaces the retry identity and cannot silently continue an older selected action', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore, original = structuredClone(f.store.game);
    const first = f.store.prepareConfiguration({ type: 'EQUIP', skill: 'sword_still' }); h.configurationFaults.push('quota'); await f.store.applyConfiguration(first);
    const second = f.store.prepareConfiguration({ type: 'SCHOOL', school: 'talisman' }); h.configurationFaults.push('quota'); await f.store.applyConfiguration(second);
    const firstAllowed = f.store.canRetryFor(first.command.commandId), secondAllowed = f.store.canRetryFor(second.command.commandId), failed = f.state(), beforeOldRetry = await h.inspect(h.FULL_DB_NAME);
    await f.store.retryFor(first.command.commandId); const afterOldRetry = await h.inspect(h.FULL_DB_NAME);
    await f.store.retryFor(second.command.commandId);
    return { first, second, firstAllowed, secondAllowed, failed, original, beforeOldRetry, afterOldRetry, after: f.state(), attempts: h.configurationAttempts };
  });
  expect(r.failed.game).toEqual(r.original); expect(r.firstAllowed).toBe(false); expect(r.secondAllowed).toBe(true); expect(r.afterOldRetry).toEqual(r.beforeOldRetry);
  expect(r.after.error).toBe(''); expect(r.after.lastResult.type).toBe('SCHOOL'); expect(r.after.lastResult.commandId).toBe(r.second.command.commandId);
  expect(r.after.lastFromActivity).toBe(false); expect(r.after.game.school).toBe('talisman'); expect(r.after.game.loadout.mind).toBe('talisman_mind');
  expect(r.after.game.core.revision).toBe(r.original.core.revision + 1); expect(r.attempts).toEqual([r.first, r.second, r.second]);
});
