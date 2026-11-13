import { test, expect } from '@playwright/test';
import { setupMilestones } from './milestone-support';
test.beforeEach(async ({ page }) => setupMilestones(page));

test('DB9 preserves DB8 Game, v6 activity, configuration and historical ordinary receipts, checkpoint and closes the old client', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'milestone-upgrade-v8', source = await h.FullSaveRepository.open(name + '-source'), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const d = h.legacyRuleRoutes.driver(); let game = (await source.importText(JSON.stringify(d.checkpoints.mortal), h.mutation())).state;
      // Reproduce exact DB8 ordinary records with the unchanged formal resolver, not a new v7 activity in an old schema.
      const breakthrough = h.command(game, { type: 'BREAKTHROUGH' }), resolved = h.engine.resolve(game, breakthrough);
      const oldCheckpoint = { format: 'chenyuan-checkpoint', version: 1, kind: 'breakthrough', sourceRunId: game.core.runId,
        sourceRevision: game.core.revision, versions: resolved.result.versions, snapshot: game };
      await h.put(name + '-source', h.FULL_STATE_STORE, 'previous', game);
      await h.put(name + '-source', h.FULL_STATE_STORE, 'current', resolved.nextState);
      await h.put(name + '-source', h.FULL_STATE_STORE, 'checkpoint', oldCheckpoint);
      await h.put(name + '-source', h.FULL_STATE_STORE, 'checkpoint-owner', { format: 'chenyuan-checkpoint-scope', version: 1,
        runId: game.core.runId, sourceRunId: game.core.runId, sourceRevision: game.core.revision, kind: 'breakthrough' });
      await h.put(name + '-source', h.FULL_RECEIPT_STORE, breakthrough.runId + ':' + breakthrough.commandId,
        { format: 'chenyuan-receipt', version: 1, command: breakthrough, fingerprint: h.milestoneReceipts.canonicalFingerprint(breakthrough), result: resolved.result });
      game = resolved.nextState;
      await source.configure({ command: h.command(game, { type: 'SCHOOL', school: 'sword' }), expectedActivityId: null, expectedActivityRevision: null });
      const travel = await source.startActivity({ kind: 'travel', location: 'sect', maxCycles: 1 }, h.milestoneMutation(await source.loadActivitySnapshot(), 'old-v8-page'));
      const tick = h.milestoneTick(travel); now = travel.activity.dueAt; const arrived = await source.settleActivity(tick), checkpoint = await source.loadCheckpoint();
      // Build genuine old ordinary retirement evidence with the unchanged formal rule engine.
      const oldCommand = h.command(arrived.state, { type: 'RETIRE' }), old = h.engine.resolve(arrived.state, oldCommand);
      await h.put(name + '-source', h.FULL_RECEIPT_STORE, oldCommand.runId + ':' + oldCommand.commandId,
        { format: 'chenyuan-receipt', version: 1, command: oldCommand, fingerprint: h.milestoneReceipts.canonicalFingerprint(oldCommand), result: old.result });
      // The historical receipt is older than a later lawful snapshot; replay must return that snapshot.
      await h.put(name + '-source', h.FULL_STATE_STORE, 'current', old.nextState);
      const original = h.legacyDatabaseFixture(await h.inspect(name + '-source'),8); source.close();
      const oldDB = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(name, 8); request.onupgradeneeded = () => { for (const store of original.stores) request.result.createObjectStore(store); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      await new Promise<void>((resolve, reject) => { const tx = oldDB.transaction(original.stores, 'readwrite'); for (const store of original.stores) for (const row of original[store]) tx.objectStore(store).put(row.value, row.key); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
      let closed = false; oldDB.onversionchange = () => { closed = true; oldDB.close(); }; now += 86_400_000;
      const upgraded = await h.FullSaveRepository.open(name);
      try {
        const loaded = await upgraded.loadActivitySnapshot(), after = await h.inspect(name), travelReplay = await upgraded.settleActivity(tick), oldReplay = await upgraded.execute(oldCommand);
        const oldClient = await h.attempt(() => new Promise((resolve, reject) => { const request = indexedDB.open(name, 8); request.onsuccess = () => { request.result.close(); resolve(true); }; request.onerror = () => reject(request.error); }));
        return { original, closed, loaded, after, travelReplay, oldReplay, old, arrived, checkpoint, checkpointAfter: await upgraded.loadCheckpoint(), afterReplay: await h.inspect(name), oldClient };
      } finally { upgraded.close(); oldDB.close(); }
    } finally { Date.now = realNow; source.close(); }
  });
  expect(r.loaded.state.core.contentVersion).toBe('full-demo.3'); expect(r.loaded.activity).not.toHaveProperty('rulesVersion'); expect(r.closed).toBe(true); expect(r.after.version).toBe(11); expect(r.oldClient.name).toBe('VersionError');
  for (const store of r.original.stores) expect(r.after[store]).toEqual(r.original[store]);
  expect(r.loaded).toEqual({ state: r.old.nextState, activity: r.arrived.activity }); expect(r.checkpointAfter).toEqual(r.checkpoint);
  expect(r.travelReplay.replayed).toBe(true); expect(r.travelReplay.state).toEqual(r.old.nextState); expect(r.travelReplay.result).toEqual(r.arrived.result);
  expect(r.oldReplay.replayed).toBe(true); expect(r.oldReplay.state).toEqual(r.old.nextState); expect(r.oldReplay.result).toEqual(r.old.result); expect(r.afterReplay).toEqual(r.after);
});
