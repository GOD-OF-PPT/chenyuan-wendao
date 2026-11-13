import {confirmedDelivery} from './support';
import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async () => {
    const h = (globalThis as any).h, path = '/persistence-tests/activity-store-harness.ts', { createActivityStoreHarness } = await import(path);
    const d = h.routes.driver(); d.funds(100); d.buy('healing_pill', 3); d.buy('spirit_pill', 3); d.go('cave');
    h.activityStore = createActivityStoreHarness(); await h.activityStore.store.init(); h.adventureSeeding = h.activityStore.store.importText(JSON.stringify(d.game));
  });
  await page.clock.runFor(700); await page.evaluate(() => (globalThis as any).h.adventureSeeding);
  expect(await page.evaluate(() => { const s = (globalThis as any).h.activityStore.store; return { error: s.error, busy: s.busy, location: s.game?.core.world.location }; })).toEqual({ error: '', busy: false, location: 'cave' });
});
test.afterEach(async ({ page }) => { await page.evaluate(() => {
  const h = (globalThis as any).h;
  h?.restoreAdventureCheckpoint?.(); h?.releaseAdventureCheckpoint?.(); h?.adventureSyncChannel?.close();
  h?.activityStore?.dispose();
}); });

test('Store travel and encounter change periods only after each real atomic arrival, spawn and battle turn', async ({ page }) => {
  const started = await page.evaluate(async () => {
    const f = (globalThis as any).h.activityStore; await f.store.startOnlinePlannedActivity({ kind: 'travel', location: 'wilderness', maxCycles: 1 }); return f.state();
  });
  expect(started.runtime.totalMs).toBe(6000); await page.clock.runFor(5999);
  expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(started.game);
  await page.clock.runFor(1); await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.activity?.status)).toBe('stopped');
  const encounter = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore, arrived = f.state();
    await f.store.startOnlinePlannedActivity(h.adventure.defaultEncounterPlan(f.store.game, 'wolf')); return { arrived, ui: f.state() };
  });
  expect(encounter.arrived.game.core.world.location).toBe('wilderness'); expect(encounter.ui.runtime.totalMs).toBe(30000);
  await page.clock.runFor(29999); expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(encounter.ui.game);
  await page.clock.runFor(1); await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.activity?.encountersStarted)).toBe(1);
  const spawned = await page.evaluate(() => (globalThis as any).h.activityStore.state());
  expect(spawned.game.battle.enemy).toBe('wolf'); expect(spawned.activity.battleTurns).toBe(0); expect(spawned.runtime.totalMs).toBe(3000);
  await page.clock.runFor(2999); expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(spawned.game);
  await page.clock.runFor(1); await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.activity?.battleTurns)).toBe(1);
  const turn = await page.evaluate(async spawned => {
    const h = (globalThis as any).h, f = h.activityStore, expected = h.engine.resolve(spawned.game, spawned.activity.nextCommand); await f.store.pauseCultivation();
    return { expected, ui: f.state(), persisted: await f.persisted() };
  }, spawned);
  expect(turn.ui.game).toEqual(turn.expected.nextState); expect(turn.ui.lastFromActivity).toBe(true); expect(turn.ui.runtime).toBeNull(); expect(turn.ui.activity.status).toBe('paused');
  await page.clock.runFor(60000); expect(await page.evaluate(() => (globalThis as any).h.activityStore.persisted())).toEqual(turn.persisted);
});

test('Store lost battle-turn delivery replays the original result and begins a full next turn without repeated damage or cost', async ({ page }) => {
  await page.evaluate(() => {
    const h = (globalThis as any).h, d = h.routes.driver(); d.go('wilderness'); d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' }); h.adventureBattleSeeding = h.activityStore.store.importText(JSON.stringify(d.game));
  });
  await page.clock.runFor(700); await page.evaluate(() => (globalThis as any).h.adventureBattleSeeding);
  const started = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore; await f.store.startOnlinePlannedActivity(h.adventure.defaultBattlePlan(f.store.game)); f.loseNextCycleDelivery(); return f.state();
  });
  await page.clock.runFor(3000); await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.canRetry)).toBe(true);
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore; return { ui: f.state(), delivered: f.delivered, raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(failed.ui.error).toContain('回复丢失'); expect(failed.ui.activity.battleTurns).toBe(1); expect(failed.ui.runtime).toBeNull(); expect(failed.ui.lastResult).toBeNull();
  expect(failed.ui.game).toEqual(failed.delivered.outcome.state); expect(failed.delivered.tick.commandId).toBe(started.activity.nextCommand.commandId);
  await page.evaluate(() => { const h = (globalThis as any).h; return h.activityStore.store.retryFor(h.activityStore.delivered.tick.commandId); });
  const replay = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore; return { ui: f.state(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(replay.ui.error).toBe(''); expect(replay.ui.lastReplayed).toBe(true); expect(replay.ui.lastFromActivity).toBe(true);
  expect(replay.ui.game).toEqual(failed.ui.game); expect(replay.ui.lastResult).toEqual(failed.delivered.outcome.result); expect(replay.raw).toEqual(confirmedDelivery(failed.raw,failed.delivered.outcome.result));
  expect(replay.ui.runtime.remainingMs).toBe(3000); await page.clock.runFor(2999); expect(await page.evaluate(() => (globalThis as any).h.activityStore.store.game)).toEqual(failed.ui.game);
  await page.evaluate(() => (globalThis as any).h.activityStore.store.pauseCultivation());
});

test('external progress invalidates viewing intent immediately while an arrived trip is still finishing its checkpoint read', async ({ page }) => {
  const started = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    await f.store.startOnlinePlannedActivity({ kind: 'travel', location: 'wilderness', maxCycles: 1 });
    const prototype = h.FullSaveRepository.prototype, original = prototype.loadCheckpoint;
    h.restoreAdventureCheckpoint = () => { prototype.loadCheckpoint = original; };
    prototype.loadCheckpoint = async function () {
      const checkpoint = await original.call(this);
      h.adventureCheckpointBlocked = true;
      return new Promise(resolve => { h.releaseAdventureCheckpoint = () => resolve(checkpoint); });
    };
    return { ui: f.state(), syncEpoch: f.store.syncEpoch };
  });
  await page.clock.runFor(6000);
  await expect.poll(() => page.evaluate(() => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { blocked: h.adventureCheckpointBlocked === true, busy: f.store.busy, completed: f.store.activity?.completedCycles };
  })).toEqual({ blocked: true, busy: true, completed: 1 });
  const arrived = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(arrived.ui.game.core.revision).toBe(started.ui.game.core.revision + 1);
  expect(arrived.ui.game.core.world.location).toBe('wilderness'); expect(arrived.ui.activity.status).toBe('stopped');
  expect(arrived.persisted).toEqual({ state: arrived.ui.game, activity: arrived.ui.activity });
  await page.evaluate(() => {
    const h = (globalThis as any).h;
    h.adventureSyncChannel = new BroadcastChannel('chenyuan-full-progress');
    h.adventureSyncChannel.postMessage({ source: 'test-progress-notification' });
  });
  await expect.poll(() => page.evaluate(() => {
    const s = (globalThis as any).h.activityStore.store; return { syncEpoch: s.syncEpoch, busy: s.busy };
  })).toEqual({ syncEpoch: started.syncEpoch + 1, busy: true });
  await page.evaluate(() => {
    const h = (globalThis as any).h; h.restoreAdventureCheckpoint(); h.releaseAdventureCheckpoint();
  });
  await expect.poll(() => page.evaluate(() => (globalThis as any).h.activityStore.store.busy)).toBe(false);
  await page.clock.runFor(60000);
  const synced = await page.evaluate(async () => {
    const h = (globalThis as any).h, f = h.activityStore;
    return { ui: f.state(), persisted: await f.persisted(), raw: await h.inspect(h.FULL_DB_NAME), history: await f.store.loadActivityHistory(f.store.activity.id) };
  });
  expect(synced.ui.error).toBe(''); expect(synced.ui.runtime).toBeNull();
  expect(synced.ui.game).toEqual(arrived.ui.game); expect(synced.persisted).toEqual(arrived.persisted); expect(synced.raw).toEqual(arrived.raw);
  expect(synced.history.total).toBe(1); expect(synced.ui.activity.completedCycles).toBe(1);
});
