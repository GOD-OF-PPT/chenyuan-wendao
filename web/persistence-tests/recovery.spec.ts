import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
test.beforeEach(async ({ page }) => setupPersistence(page));

const withoutIdentity = (game: any) => {
  const value = structuredClone(game); value.core.runId = '<run>'; value.core.revision = 0;
  if (value.core.activeEvent) value.core.activeEvent.instanceId = '<run>:' + value.core.activeEvent.id;
  return value;
};

test('two connections commit one copy of the same command despite reordered fields', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, a = await h.FullSaveRepository.open('duplicate'), b = await h.FullSaveRepository.open('duplicate');
    const initial = (await a.create('并发', h.mutation())).state;
    const command = h.command(initial, { type: 'CHOOSE', choice: 'help' });
    const reordered = { expectedRevision: command.expectedRevision, runId: command.runId, commandId: command.commandId, choice: 'help', type: 'CHOOSE' };
    const outcomes = await Promise.all([a.execute(command), b.execute(reordered)]), current = await a.load();
    const changed = await h.attempt(() => b.execute({ ...command, choice: 'leave' }));
    a.close(); b.close(); return { outcomes, current, changed, raw: await h.inspect('duplicate') };
  });
  expect(result.outcomes.map((x: any) => x.replayed).sort()).toEqual([false, true]);
  expect(result.current.core.revision).toBe(1);
  expect(result.current.core.inventory.healing_pill).toBe(0);
  expect(result.outcomes[0].result).toEqual(result.outcomes[1].result);
  expect(result.changed.code).toBe('COMMAND_ID_REUSED');
  expect(result.raw['full-receipts'].filter((x: any) => x.value.format === 'chenyuan-receipt')).toHaveLength(1);
});

test('competing actions and competing new runs reject stale intents rather than overwrite', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, a = await h.FullSaveRepository.open('competing'), b = await h.FullSaveRepository.open('competing');
    const original = (await a.create('原局', h.mutation())).state;
    const actions = await Promise.all([h.attempt(() => a.execute(h.command(original, { type: 'CHOOSE', choice: 'help' }))),
      h.attempt(() => b.execute(h.command(original, { type: 'CHOOSE', choice: 'leave' })))]);
    const current = await a.load(), first = h.mutation(current), second = h.mutation(current);
    const replacements = await Promise.all([h.attempt(() => a.create('甲局', first)), h.attempt(() => b.create('乙局', second))]);
    const after = await a.load(), stale = await h.attempt(() => b.execute(h.command(current, { type: 'TRAVEL', location: 'cave' })));
    a.close(); b.close(); return { actions, replacements, after, stale };
  });
  for (const row of [result.actions, result.replacements]) {
    expect(row.filter((x: any) => x.ok)).toHaveLength(1);
    expect(row.find((x: any) => !x.ok).code).toBe('STALE_REVISION');
  }
  expect(['甲局', '乙局']).toContain(result.after.core.player.name);
  expect(result.stale.code).toBe('RUN_MISMATCH');
});

test('corrupt receipts including null and stored undefined never become new executable intentions', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('bad-receipts');
    const initial = (await repo.create('回执', h.mutation())).state, cmd = h.command(initial, { type: 'CHOOSE', choice: 'leave' });
    await repo.execute(cmd);
    const raw = await h.inspect('bad-receipts'), original = raw['full-receipts'].find((x: any) => x.value.format === 'chenyuan-receipt').value;
    const variants: any[] = [undefined, null, false, {}, { ...original, result: {} }];
    const wrongId = structuredClone(original); wrongId.result.commandId = 'different'; variants.push(wrongId);
    const wrongBudget = structuredClone(original); wrongBudget.result.costs.stones = -1; variants.push(wrongBudget);
    const checks = [];
    for (const bad of variants) {
      await h.put('bad-receipts', h.FULL_RECEIPT_STORE, cmd.runId + ':' + cmd.commandId, bad);
      const before = await h.inspect('bad-receipts'), failed = await h.attempt(() => repo.execute(cmd)), after = await h.inspect('bad-receipts');
      checks.push({ failed, unchanged: JSON.stringify(before) === JSON.stringify(after) });
    }
    repo.close(); return checks;
  });
  for (const row of result) { expect(row.failed.code).toBe('RECEIPT_INVALID'); expect(row.unchanged).toBe(true); }
});

test('new-run and import retries are idempotent and altered payloads reject', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('controls'), create = h.mutation();
    const first = await repo.create('稳定', create), replay = await repo.create('稳定', { ...create });
    const changed = await h.attempt(() => repo.create('不同', create));
    const fixture = h.routes.driver().game, raw = JSON.stringify(fixture), intent = h.mutation(first.state);
    const imported = await repo.importText(raw, intent), replayImport = await repo.importText(raw, { ...intent });
    const different = structuredClone(fixture); different.core.player.name = '另档';
    const changedImport = await h.attempt(() => repo.importText(JSON.stringify(different), intent));
    repo.close(); return { first, replay, changed, imported, replayImport, changedImport };
  });
  expect(result.replay.replayed).toBe(true); expect(result.replay.state).toEqual(result.first.state);
  expect(result.changed.code).toBe('COMMAND_ID_REUSED');
  expect(result.replayImport.replayed).toBe(true); expect(result.replayImport.state).toEqual(result.imported.state);
  expect(result.changedImport.code).toBe('COMMAND_ID_REUSED');
});

test('ordinary checkpoint stays reusable across restores and rewinds the complete budget', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('repeat-restore');
    const prepared = (await repo.importText(JSON.stringify(h.routes.fullRoute().checkpoints.qi), h.mutation())).state;
    const broken = (await repo.execute(h.command(prepared, { type: 'BREAKTHROUGH' }))).state, cp = await repo.loadCheckpoint();
    const intention = h.mutation(broken), first = await repo.restoreCheckpoint(intention);
    let progressed = (await repo.execute(h.command(first.state, { type: 'TRAVEL', location: 'sect' }))).state;
    progressed = (await repo.execute(h.command(progressed, { type: 'SOURCE', sourceId: 'work' }))).state;
    const retry = await repo.restoreCheckpoint(intention), second = await repo.restoreCheckpoint(h.mutation(progressed));
    const cpAfter = await repo.loadCheckpoint(), previous = await repo.loadPrevious(); repo.close();
    const reopened = await h.FullSaveRepository.open('repeat-restore'), loaded = await reopened.load(); reopened.close();
    return { prepared, broken, cp, first, progressed, retry, second, cpAfter, previous, loaded };
  });
  expect(result.first.state.core.runId).not.toBe(result.broken.core.runId);
  expect(withoutIdentity(result.first.state)).toEqual(withoutIdentity(result.prepared));
  expect(result.retry.replayed).toBe(true); expect(result.retry.state).toEqual(result.progressed);
  expect(result.progressed.core.player.stones).toBe(result.prepared.core.player.stones + 20);
  expect(withoutIdentity(result.second.state)).toEqual(withoutIdentity(result.prepared));
  expect(result.second.state.core.runId).not.toBe(result.first.state.core.runId);
  expect(result.cpAfter).toEqual(result.cp); expect(result.previous).toEqual(result.progressed);
  expect(result.loaded).toEqual(result.second.state);
});

test('two real trial failures can each restore their complete preparation and seal exactly once', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('trial-retry');
    let game = (await repo.importText(JSON.stringify(h.routes.fullRoute().checkpoints.trial), h.mutation())).state;
    const prepared = game, rounds = [];
    for (let i = 0; i < 2; i++) {
      for (const action of [{ type: 'START_TRIAL' }, { type: 'ANSWER_TRIAL', answer: 'accept' }, { type: 'BATTLE', move: 'flee' }]) game = (await repo.execute(h.command(game, action))).state;
      const failed = game, intent = h.mutation(game), restored = await repo.restoreCheckpoint(intent), retry = await repo.restoreCheckpoint(intent);
      rounds.push({ failed, restored, retry, cp: await repo.loadCheckpoint() }); game = restored.state;
    }
    repo.close(); return { prepared, rounds };
  });
  for (const row of result.rounds) {
    expect(row.failed.core.inventory.ascension_seal).toBe(0);
    expect(row.failed.trial).toBeNull(); expect(row.failed.core.world.location).toBe('cave');
    expect(row.restored.state.core.inventory.ascension_seal).toBe(1);
    expect(withoutIdentity(row.restored.state)).toEqual(withoutIdentity(result.prepared));
    expect(row.retry.replayed).toBe(true); expect(row.retry.state).toEqual(row.restored.state);
    expect(row.cp.kind).toBe('trial');
  }
});

test('restore abort and quota failures retain state, previous, checkpoint, ownership and receipts', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const mode of ['abort', 'quota']) {
      const name = 'restore-failure-' + mode, repo = await h.FullSaveRepository.open(name);
      const prepared = (await repo.importText(JSON.stringify(h.routes.fullRoute().checkpoints.qi), h.mutation())).state;
      const current = (await repo.execute(h.command(prepared, { type: 'BREAKTHROUGH' }))).state, intention = h.mutation(current);
      const before = await h.inspect(name), put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
        if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE) throw new DOMException('restore quota', 'QuotaExceededError');
        const request = put.call(this, value, key!);
        if (mode === 'abort' && this.name === h.FULL_STATE_STORE && key === 'current') request.addEventListener('success', () => this.transaction.abort());
        return request;
      };
      let failed;
      try { failed = await h.attempt(() => repo.restoreCheckpoint(intention)); } finally { IDBObjectStore.prototype.put = put; }
      const after = await h.inspect(name), lastGood = await repo.load(), retry = await repo.restoreCheckpoint(intention); repo.close();
      rows.push({ mode, prepared, current, failed, before, after, lastGood, retry });
    }
    return rows;
  });
  for (const row of result) {
    expect(row.failed.code).toBe(row.mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED');
    expect(row.after).toEqual(row.before); expect(row.lastGood).toEqual(row.current);
    expect(row.failed.ok).toBe(false); expect(withoutIdentity(row.retry.state)).toEqual(withoutIdentity(row.prepared));
  }
});

test('stale/cross-run restore and commands cannot overwrite another tab progress', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, a = await h.FullSaveRepository.open('restore-race'), b = await h.FullSaveRepository.open('restore-race');
    const ready = (await a.importText(JSON.stringify(h.routes.fullRoute().checkpoints.qi), h.mutation())).state;
    const current = (await a.execute(h.command(ready, { type: 'BREAKTHROUGH' }))).state;
    const oldCommand = h.command(current, { type: 'TRAVEL', location: 'sect' }), oldRestore = h.mutation(current);
    const restored = await a.restoreCheckpoint(h.mutation(current));
    const staleCommand = await h.attempt(() => b.execute(oldCommand)), staleRestore = await h.attempt(() => b.restoreCheckpoint(oldRestore));
    const after = await a.load(); a.close(); b.close(); return { restored, staleCommand, staleRestore, after };
  });
  expect(result.staleCommand.code).toBe('RUN_MISMATCH'); expect(result.staleRestore.code).toBe('STALE_REVISION');
  expect(result.after).toEqual(result.restored.state);
});

test('bad checkpoint purpose, version or ownership rejects without changing any good record', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const mode of ['purpose', 'version', 'owner']) {
      const name = 'bad-cp-' + mode, repo = await h.FullSaveRepository.open(name);
      const ready = (await repo.importText(JSON.stringify(h.routes.fullRoute().checkpoints.qi), h.mutation())).state;
      const current = (await repo.execute(h.command(ready, { type: 'BREAKTHROUGH' }))).state;
      const cp = await repo.loadCheckpoint();
      if (mode === 'purpose') { cp.snapshot.core.inventory.foundation_pill = 0; await h.put(name, h.FULL_STATE_STORE, 'checkpoint', cp); }
      if (mode === 'version') { cp.versions.contentVersion = 'future'; await h.put(name, h.FULL_STATE_STORE, 'checkpoint', cp); }
      if (mode === 'owner') {
        const raw = await h.inspect(name), owner = raw[h.FULL_STATE_STORE].find((x: any) => x.key === 'checkpoint-owner').value;
        owner.runId = 'foreign'; await h.put(name, h.FULL_STATE_STORE, 'checkpoint-owner', owner);
      }
      const before = await h.inspect(name), failed = await h.attempt(() => repo.restoreCheckpoint(h.mutation(current))), after = await h.inspect(name);
      repo.close(); rows.push({ mode, before, failed, after });
    }
    return rows;
  });
  for (const row of result) { expect(row.failed.ok).toBe(false); expect(row.after).toEqual(row.before); }
});

test('T04 migrated checkpoints acquire verified scope once without changing the saved game', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, samples = h.legacySamples(); await h.seed('scope-upgrade', samples[8], samples[7], samples[3]);
    const old = await h.FullSaveRepository.open('scope-upgrade'), original = await old.load(), cp = await old.loadCheckpoint(); old.close();
    await h.put('scope-upgrade', h.FULL_STATE_STORE, 'checkpoint-owner', undefined, true);
    const upgraded = await h.FullSaveRepository.open('scope-upgrade'), after = await upgraded.load(), checkpoint = await upgraded.loadCheckpoint(), archives = await upgraded.archives(); upgraded.close();
    const reopened = await h.FullSaveRepository.open('scope-upgrade'), again = await reopened.archives(); reopened.close();
    return { original, cp, after, checkpoint, archives, again };
  });
  expect(result.after).toEqual(result.original); expect(result.checkpoint).toEqual(result.cp); expect(result.again).toEqual(result.archives);
});

test('raw backup reads failed and future databases without migration, and missing databases stay missing', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, raw = h.legacySamples()[8]; raw.version = 999;
    await h.seed('raw-old', raw);
    const failed = await h.attempt(() => h.FullSaveRepository.open('raw-old')), before = await h.inspect('raw-old');
    const exported = await h.FullSaveRepository.exportRaw('raw-old'), text = h.rawBackupText(exported), after = await h.inspect('raw-old');
    const missing = await h.FullSaveRepository.exportRaw('no-database'), names = await indexedDB.databases();
    const current = await h.FullSaveRepository.open('raw-import'), good = (await current.create('好档', h.mutation())).state;
    const rejectedImport = await h.attempt(() => current.importText(text, h.mutation(good))), kept = await current.load(); current.close();
    return { raw, failed, before, exported, parsed: JSON.parse(text), after, missing, names, good, rejectedImport, kept };
  });
  expect(result.failed.ok).toBe(false); expect(result.before).toEqual(result.after);
  expect(result.exported.database.version).toBe(1);
  expect(result.parsed.stores.find((s: any) => s.name === 'state').entries.find((x: any) => x.key === 'current').value).toEqual(result.raw);
  expect(result.missing).toBeNull(); expect(result.names.some((x: any) => x.name === 'no-database')).toBe(false);
  expect(result.rejectedImport.code).toBe('SAVE_VERSION'); expect(result.kept).toEqual(result.good);
});

test('raw export preserves an undefined entry explicitly and refuses lossy structured values', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h; await h.seed('raw-undefined', undefined, h.legacySamples()[3]);
    const before = await h.inspect('raw-undefined'), backup = await h.FullSaveRepository.exportRaw('raw-undefined');
    const parsed = JSON.parse(h.rawBackupText(backup));
    const unsupported = { ...backup, stores: [{ name: 'future', entries: [{ key: 'binary', value: new Uint8Array([1, 2]) }] }] };
    const failed = await h.attempt(() => h.rawBackupText(unsupported));
    return { parsed, before, after: await h.inspect('raw-undefined'), failed };
  });
  expect(result.parsed.stores.find((s: any) => s.name === 'state').entries.find((x: any) => x.key === 'current').valueEncoding).toBe('undefined');
  expect(result.failed.code).toBe('RAW_EXPORT_UNSUPPORTED'); expect(result.after).toEqual(result.before);
});

test('v2 to v3 upgrades the authoritative full state instead of replaying preserved v1 progress', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'real-v2', legacy = h.legacySamples()[4], route = h.routes.fullRoute();
    const full = route.checkpoints.golden, snapshot = route.checkpoints.foundation;
    const cp = { format: 'chenyuan-checkpoint', version: 1, kind: 'breakthrough', sourceRunId: snapshot.core.runId, sourceRevision: snapshot.core.revision,
      versions: { format: snapshot.format, version: snapshot.version, schemaVersion: snapshot.core.schemaVersion, contentVersion: snapshot.core.contentVersion, balanceVersion: snapshot.core.balanceVersion }, snapshot };
    const old = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name, 2);
      req.onupgradeneeded = () => {
        const db = req.result; db.createObjectStore('state').put(legacy, 'current'); db.createObjectStore('receipts');
        db.createObjectStore(h.FULL_STATE_STORE).put(full, 'current');
        req.transaction!.objectStore(h.FULL_STATE_STORE).put(cp, 'checkpoint'); db.createObjectStore(h.FULL_RECEIPT_STORE); db.createObjectStore(h.FULL_BACKUP_STORE);
      };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    old.onversionchange = () => old.close();
    const repo = await h.FullSaveRepository.open(name), current = await repo.load(), loadedCP = await repo.loadCheckpoint();
    const oldWrite = await h.attempt(() => old.transaction(h.FULL_STATE_STORE, 'readwrite')); repo.close();
    return { legacy, full, cp, current, loadedCP, oldWrite, raw: await h.inspect(name) };
  });
  expect(result.current).toEqual(result.full); expect(result.loadedCP).toEqual(result.cp);
  expect(result.current.core.player.realm).toBe('golden'); expect(result.raw.version).toBe(3);
  expect(result.raw.state.find((x: any) => x.key === 'current').value).toEqual(result.legacy);
  expect(result.oldWrite.ok).toBe(false);
});

test('failed v2 scope migration leaves database version and all original records at v2', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'invalid-v2', current = h.routes.driver().game; current.core.contentVersion = 'future';
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(name, 2); req.onupgradeneeded = () => {
        req.result.createObjectStore(h.FULL_STATE_STORE).put(current, 'current'); req.result.createObjectStore(h.FULL_RECEIPT_STORE); req.result.createObjectStore(h.FULL_BACKUP_STORE);
      }; req.onsuccess = () => { req.result.close(); resolve(); }; req.onerror = () => reject(req.error);
    });
    const before = await h.inspect(name), failed = await h.attempt(() => h.FullSaveRepository.open(name)), after = await h.inspect(name);
    return { before, failed, after };
  });
  expect(result.failed.code).toBe('SAVE_VERSION'); expect(result.after).toEqual(result.before); expect(result.after.version).toBe(2);
});

test('a foreign checkpoint without scope or migration proof is not adopted during reopening', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, a = await h.FullSaveRepository.open('foreign-a'), b = await h.FullSaveRepository.open('foreign-b');
    const fixture = JSON.stringify(h.routes.fullRoute().checkpoints.qi);
    const ga = (await a.importText(fixture, h.mutation())).state, gb = (await b.importText(fixture, h.mutation())).state;
    await a.execute(h.command(ga, { type: 'BREAKTHROUGH' })); await b.execute(h.command(gb, { type: 'BREAKTHROUGH' }));
    const foreign = await b.loadCheckpoint(); a.close(); b.close();
    await h.put('foreign-a', h.FULL_STATE_STORE, 'checkpoint', foreign); await h.put('foreign-a', h.FULL_STATE_STORE, 'checkpoint-owner', undefined, true);
    const before = await h.inspect('foreign-a'), failed = await h.attempt(() => h.FullSaveRepository.open('foreign-a')), after = await h.inspect('foreign-a');
    return { before, failed, after };
  });
  expect(result.failed.code).toBe('CHECKPOINT_OWNERSHIP'); expect(result.after).toEqual(result.before);
});

test('bad control receipts reject without rerunning a new-game operation', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('control-corruption'), intention = h.mutation();
    await repo.create('原档', intention); const raw = await h.inspect('control-corruption'), original = raw[h.FULL_RECEIPT_STORE][0].value;
    const wrong = structuredClone(original); wrong.mutation.runId = 'wrong'; const rows = [];
    for (const value of [null, undefined, { ...original, version: 99 }, wrong]) {
      await h.put('control-corruption', h.FULL_RECEIPT_STORE, intention.runId + ':' + intention.commandId, value);
      const before = await h.inspect('control-corruption'), failed = await h.attempt(() => repo.create('原档', intention)), after = await h.inspect('control-corruption');
      rows.push({ before, failed, after });
    }
    repo.close(); return rows;
  });
  for (const row of result) { expect(row.failed.code).toBe('RECEIPT_INVALID'); expect(row.after).toEqual(row.before); }
});

test('invalid writes reject through promises and storage denial never falls back to memory', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('failure-contract'), current = (await repo.create('保留', h.mutation())).state;
    const ops = [() => repo.create('', h.mutation(current)), () => repo.importText('{bad', h.mutation(current)),
      () => repo.execute({ type: 'UNKNOWN' }), () => repo.restoreCheckpoint(h.mutation(current))];
    const cases = [];
    for (const op of ops) { const promise = op(); cases.push({ promise: promise instanceof Promise, failed: await h.attempt(() => promise) }); }
    const before = await h.inspect('failure-contract'), factoryOpen = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function () { throw new DOMException('denied', 'SecurityError'); };
    let denied;
    try { denied = await h.attempt(() => h.FullSaveRepository.open('failure-contract')); } finally { IDBFactory.prototype.open = factoryOpen; }
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true });
    let unavailable;
    try { unavailable = await h.attempt(() => h.FullSaveRepository.open('failure-contract')); }
    finally { if (descriptor) Object.defineProperty(globalThis, 'indexedDB', descriptor); else delete (globalThis as any).indexedDB; }
    repo.close(); return { cases, denied, unavailable, before, after: await h.inspect('failure-contract') };
  });
  expect(result.cases.every((x: any) => x.promise && !x.failed.ok)).toBe(true);
  expect(result.denied.code).toBe('STORAGE_DENIED'); expect(result.unavailable.code).toBe('STORAGE_UNAVAILABLE'); expect(result.after).toEqual(result.before);
});

test('a restore racing a live action commits exactly one intent across connections', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, a = await h.FullSaveRepository.open('restore-live-race'), b = await h.FullSaveRepository.open('restore-live-race');
    const prepared = (await a.importText(JSON.stringify(h.routes.fullRoute().checkpoints.qi), h.mutation())).state;
    const current = (await a.execute(h.command(prepared, { type: 'BREAKTHROUGH' }))).state;
    const intent = h.mutation(current), action = h.command(current, { type: 'TRAVEL', location: 'sect' });
    const outcomes = await Promise.all([h.attempt(() => a.restoreCheckpoint(intent)), h.attempt(() => b.execute(action))]);
    const after = await a.load(); a.close(); b.close(); return { prepared, current, intent, outcomes, after };
  });
  expect(result.outcomes.filter((x: any) => x.ok)).toHaveLength(1);
  expect(['STALE_REVISION', 'RUN_MISMATCH']).toContain(result.outcomes.find((x: any) => !x.ok).code);
  if (result.after.core.runId === result.intent.runId) expect(withoutIdentity(result.after)).toEqual(withoutIdentity(result.prepared));
  else { expect(result.after.core.world.location).toBe('sect'); expect(result.after.core.revision).toBe(result.current.core.revision + 1); }
});

test('quota during v2 scope upgrade rolls schema and ownership back and permits a clean retry', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'quota-v2', route = h.routes.fullRoute(), current = route.checkpoints.foundation, snapshot = route.checkpoints.qi;
    const cp = { format: 'chenyuan-checkpoint', version: 1, kind: 'breakthrough', sourceRunId: snapshot.core.runId, sourceRevision: snapshot.core.revision,
      versions: { format: snapshot.format, version: snapshot.version, schemaVersion: snapshot.core.schemaVersion, contentVersion: snapshot.core.contentVersion, balanceVersion: snapshot.core.balanceVersion }, snapshot };
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(name, 2); req.onupgradeneeded = () => {
        req.result.createObjectStore(h.FULL_STATE_STORE).put(current, 'current'); req.transaction!.objectStore(h.FULL_STATE_STORE).put(cp, 'checkpoint');
        req.result.createObjectStore(h.FULL_RECEIPT_STORE); req.result.createObjectStore(h.FULL_BACKUP_STORE);
      }; req.onsuccess = () => { req.result.close(); resolve(); }; req.onerror = () => reject(req.error);
    });
    const before = await h.inspect(name), put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === h.FULL_BACKUP_STORE) throw new DOMException('scope quota', 'QuotaExceededError');
      return put.call(this, value, key!);
    };
    let failed;
    try { failed = await h.attempt(() => h.FullSaveRepository.open(name)); } finally { IDBObjectStore.prototype.put = put; }
    const after = await h.inspect(name), retry = await h.FullSaveRepository.open(name), loaded = await retry.load(); retry.close();
    return { failed, before, after, current, loaded, final: await h.inspect(name) };
  });
  expect(result.failed.code).toBe('STORAGE_QUOTA'); expect(result.after).toEqual(result.before);
  expect(result.after.version).toBe(2); expect(result.final.version).toBe(3); expect(result.loaded).toEqual(result.current);
});

test('unknown v2 schema or empty full stores beside legacy progress never upgrade into a fresh run', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const mode of ['unknown-schema', 'missing-full']) {
      const name = 'schema-' + mode, legacy = h.legacySamples()[8];
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(name, 2); req.onupgradeneeded = () => {
          req.result.createObjectStore('state').put(legacy, 'current'); req.result.createObjectStore('receipts');
          if (mode === 'missing-full') for (const store of [h.FULL_STATE_STORE, h.FULL_RECEIPT_STORE, h.FULL_BACKUP_STORE]) req.result.createObjectStore(store);
        }; req.onsuccess = () => { req.result.close(); resolve(); }; req.onerror = () => reject(req.error);
      });
      const before = await h.inspect(name), failed = await h.attempt(() => h.FullSaveRepository.open(name)), after = await h.inspect(name);
      rows.push({ mode, before, failed, after });
    }
    return rows;
  });
  expect(result[0].failed.code).toBe('DB_SCHEMA'); expect(result[1].failed.code).toBe('MIGRATION_SOURCE_MISSING');
  for (const row of result) { expect(row.after).toEqual(row.before); expect(row.after.version).toBe(2); }
});
