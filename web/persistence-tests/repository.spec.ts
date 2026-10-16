import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.goto('/persistence-tests/harness.html');
  await page.evaluate(async (root) => {
    const persistence = await import('/src/full-persistence.ts');
    const engine = await import(`/@fs${root}src/full/engine.ts`);
    const legacy = await import(`/@fs${root}src/game/adventure.ts`);
    const routes = await import(`/@fs${root}tests/full-route.mjs`);
    const seed = async (name: string, current: unknown, previous?: unknown, checkpoint?: unknown) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(name, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore('state'); req.result.createObjectStore('receipts'); };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result, tx = db.transaction(['state', 'receipts'], 'readwrite');
          tx.objectStore('state').put(current, 'current');
          if (previous !== undefined) tx.objectStore('state').put(previous, 'previous');
          if (checkpoint !== undefined) tx.objectStore('state').put(checkpoint, 'checkpoint');
          tx.objectStore('receipts').put({ original: true }, 'old-receipt');
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
    };
    const inspect = async (name: string) => new Promise<any>((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result, names = Array.from(db.objectStoreNames), tx = db.transaction(names, 'readonly');
        const result: any = { version: db.version, stores: names };
        for (const name of names) {
          const cursor = tx.objectStore(name).openCursor(), records: any[] = [];
          result[name] = records;
          cursor.onsuccess = () => { if (cursor.result) { records.push({ key: cursor.result.key, value: cursor.result.value }); cursor.result.continue(); } };
        }
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    const legacySamples = (choice = 'leave', school = 'sword') => {
      let game = legacy.createAdventure('旧档测试', `legacy-${choice}-${school}`);
      const samples = [game];
      for (const payload of [
        { type: 'CHOOSE', choice }, { type: 'TRAVEL', location: 'cave' },
        { type: 'CULTIVATE', method: 'natural', count: 5 }, { type: 'BREAKTHROUGH' },
        { type: 'SCHOOL', school }, { type: 'TRAVEL', location: 'wilderness' },
        { type: 'ENCOUNTER', enemy: 'wolf' }, { type: 'BATTLE', move: 'technique' },
      ]) {
        game = legacy.advance(game, { ...payload, commandId: `legacy-${game.core.revision}`, runId: game.core.runId, expectedRevision: game.core.revision });
        samples.push(game);
      }
      return samples;
    };
    const mutation = (current: any = null) => ({ commandId: crypto.randomUUID(), runId: crypto.randomUUID(),
      expectedRunId: current?.core.runId ?? null, expectedRevision: current?.core.revision ?? 0 });
    const command = (game: any, action: any) => ({ ...action, commandId: crypto.randomUUID(), runId: game.core.runId, expectedRevision: game.core.revision });
    const attempt = async (operation: () => any) => {
      try { return { ok: true, value: await operation() }; }
      catch (error: any) { return { ok: false, code: error.code, name: error.name, message: error.message }; }
    };
    (globalThis as any).h = { ...persistence, engine, routes, legacy, seed, inspect, legacySamples, mutation, command, attempt };
  }, root);
});

test('fresh storage waits for explicit creation and survives close/reopen', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open();
    const empty = await repo.load(), created = await repo.create('新局', h.mutation());
    const stored = await repo.load(); repo.close();
    const reopened = await h.FullSaveRepository.open(), loaded = await reopened.load(); reopened.close();
    return { empty, created, stored, loaded, raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(result.empty).toBeNull();
  expect(result.created.replayed).toBe(false);
  expect(result.created.state).toEqual(result.stored);
  expect(result.loaded).toEqual(result.stored);
  expect(result.raw.version).toBe(2);
  expect(result.raw['full-state'].find((x: any) => x.key === 'current').value).toEqual(result.loaded);
});

for (const choice of ['help', 'trade', 'leave']) for (const school of ['sword', 'talisman']) {
  test(`native IDB upgrades preserve nine real Adventure stages: ${choice}/${school}`, async ({ page }) => {
    const checks = await page.evaluate(async ({ choice, school }) => {
      const h = (globalThis as any).h, samples = h.legacySamples(choice, school), checks = [];
      for (let i = 0; i < samples.length; i++) {
        const name = `stage-${choice}-${school}-${i}`, original = samples[i], cp = i >= 4 ? samples[3] : undefined;
        await h.seed(name, original, i ? samples[i - 1] : undefined, cp);
        const repo = await h.FullSaveRepository.open(name), current = await repo.load(), checkpoint = await repo.loadCheckpoint(), previous = await repo.loadPrevious();
        const archives = await repo.archives(); repo.close();
        const raw = await h.inspect(name);
        checks.push({ original, current, checkpoint, cp, previous, previousOriginal: i ? samples[i - 1] : null, archives, raw });
      }
      return checks;
    }, { choice, school });
    expect(checks).toHaveLength(9);
    for (const row of checks) {
      expect(row.current.core.player).toEqual(row.original.core.player);
      expect(row.current.core.world).toEqual(row.original.core.world);
      expect(row.current.core.runId).not.toBe(row.original.core.runId);
      expect(row.current.core.revision).toBe(0);
      expect(row.current.battle).toEqual(row.original.battle);
      if (row.previousOriginal) expect(row.previous.core.player).toEqual(row.previousOriginal.core.player);
      else expect(row.previous).toBeNull();
      if (row.current.core.activeEvent) expect(row.current.core.activeEvent.instanceId).toBe(row.current.core.runId + ':' + row.current.core.activeEvent.id);
      for (const [id, count] of Object.entries(row.original.core.inventory)) expect(row.current.core.inventory[id]).toBe(count);
      expect(row.raw.state.find((x: any) => x.key === 'current').value).toEqual(row.original);
      expect(row.raw.receipts).toEqual([{ key: 'old-receipt', value: { original: true } }]);
      expect(row.archives.some((x: any) => x.value?.format === 'chenyuan-playable')).toBe(true);
      if (row.cp) {
        expect(row.checkpoint.kind).toBe('breakthrough');
        expect(row.checkpoint.snapshot.core.player).toEqual(row.cp.core.player);
        expect(row.checkpoint.sourceRunId).toBe(row.cp.core.runId);
      } else expect(row.checkpoint).toBeNull();
    }
  });
}

test('actual legacy repository releases its connection on version change and cannot overwrite the migrated run', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, oldModule = await import('/src/persistence.ts');
    const old = await oldModule.SaveRepository.open(), original = await old.initialize('原网页');
    const repo = await h.FullSaveRepository.open(), current = await repo.load();
    const stale = await h.attempt(() => old.execute(h.command(original, { type: 'CHOOSE', choice: 'help' })));
    const after = await repo.load(); repo.close();
    return { original, current, after, stale, raw: await h.inspect(h.FULL_DB_NAME) };
  });
  expect(result.current.core.player).toEqual(result.original.core.player);
  expect(result.stale.ok).toBe(false);
  expect(result.after).toEqual(result.current);
  expect(result.raw.state.find((x: any) => x.key === 'current').value).toEqual(result.original);
});

test('plain M1 state migrates without inventing a school or losing the opening choice', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, original = h.legacySamples('trade', 'sword')[3].core;
    await h.seed('plain-m1', original);
    const repo = await h.FullSaveRepository.open('plain-m1'), current = await repo.load(); repo.close();
    return { original, current };
  });
  expect(result.current.core.player).toEqual(result.original.player);
  expect(result.current.core.openingChoice).toBe('trade');
  expect(result.current.school).toBeNull();
});

test('invalid and future legacy snapshots abort the entire database upgrade', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const kind of ['future', 'negative', 'invalid-checkpoint', 'missing-current', 'foreign-checkpoint']) {
      const good = h.legacySamples()[8], original = structuredClone(good);
      if (kind === 'future') original.version = 99;
      if (kind === 'negative') original.core.player.stones = -1;
      const cp = kind === 'invalid-checkpoint' ? { format: 'future', version: 99 } : kind === 'missing-current' ? h.legacySamples()[3] : kind === 'foreign-checkpoint' ? h.legacySamples('help', 'sword')[3] : undefined;
      await h.seed(kind, kind === 'missing-current' ? undefined : original, undefined, cp);
      const failed = await h.attempt(() => h.FullSaveRepository.open(kind));
      rows.push({ kind, original: kind === 'missing-current' ? undefined : original, cp, failed, raw: await h.inspect(kind) });
    }
    return rows;
  });
  for (const row of result) {
    expect(row.failed.ok).toBe(false);
    expect(row.raw.version).toBe(1);
    expect(row.raw.stores).toEqual(['receipts', 'state']);
    expect(row.raw.state.find((x: any) => x.key === 'current').value).toEqual(row.original);
    if (row.cp) expect(row.raw.state.find((x: any) => x.key === 'checkpoint').value).toEqual(row.cp);
  }
});

test('quota failure during upgrade rolls back schema/data and a later retry migrates once', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, original = h.legacySamples()[8]; await h.seed('quota-upgrade', original);
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === h.FULL_STATE_STORE && key === 'current') throw new DOMException('quota injection', 'QuotaExceededError');
      return put.call(this, value, key!);
    };
    let failed;
    try { failed = await h.attempt(() => h.FullSaveRepository.open('quota-upgrade')); }
    finally { IDBObjectStore.prototype.put = put; }
    const beforeRetry = await h.inspect('quota-upgrade');
    const repo = await h.FullSaveRepository.open('quota-upgrade'), current = await repo.load(); repo.close();
    const reopened = await h.FullSaveRepository.open('quota-upgrade'), again = await reopened.load(); reopened.close();
    return { failed, original, beforeRetry, current, again };
  });
  expect(result.failed.code).toBe('STORAGE_QUOTA');
  expect(result.beforeRetry.version).toBe(1);
  expect(result.beforeRetry.state.find((x: any) => x.key === 'current').value).toEqual(result.original);
  expect(result.current).toEqual(result.again);
  expect(result.current.core.player).toEqual(result.original.core.player);
});

test('a blocked open that already rejected never migrates later after the blocker closes', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, original = h.legacySamples()[0]; await h.seed('blocked', original);
    const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('blocked', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    blocker.onversionchange = () => {};
    const failed = await h.attempt(() => h.FullSaveRepository.open('blocked')); blocker.close();
    return { failed, original, raw: await h.inspect('blocked') };
  });
  expect(result.failed.code).toBe('STORAGE_BLOCKED');
  expect(result.raw.version).toBe(1);
  expect(result.raw.state.find((x: any) => x.key === 'current').value).toEqual(result.original);
});

test('imports reidentify the actual NPC event and preserve an unfinished battle', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, d = h.routes.driver(); d.realm(); d.go('sect'); d.doAction({ type: 'EVENT', event: 'shen_return' });
    const event = d.game, battle = h.routes.driver(); battle.go('wilderness'); battle.doAction({ type: 'ENCOUNTER', enemy: 'wolf' }); battle.doAction({ type: 'BATTLE', move: 'attack' });
    event.core.contentVersion = 'full-demo.1'; battle.game.core.contentVersion = 'full-demo.1';
    const repo = await h.FullSaveRepository.open('imports'), created = await repo.create('原档', h.mutation());
    const eventImported = await repo.importText(JSON.stringify(event), h.mutation(created.state));
    const battleImported = await repo.importText(JSON.stringify(battle.game), h.mutation(eventImported.state));
    const previous = await repo.loadPrevious(), checkpoint = await repo.loadCheckpoint(); repo.close();
    return { event, eventImported, battle: battle.game, battleImported, previous, checkpoint };
  });
  const event = result.eventImported.state;
  expect(event.core.activeEvent.id).toBe('shen_return');
  expect(event.core.activeEvent.instanceId).toBe(event.core.runId + ':shen_return');
  expect(event.core.player).toEqual(result.event.core.player);
  expect(result.battleImported.state.battle).toEqual(result.battle.battle);
  expect(result.battleImported.state.core.player).toEqual(result.battle.core.player);
  expect(result.previous).toEqual(event);
  expect(result.checkpoint).toBeNull();
});

test('bad imports and stale replacement tokens preserve current state and receipt records', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('rejections');
    const created = await repo.create('好档', h.mutation()), intent = h.mutation(created.state);
    const changed = await repo.execute(h.command(created.state, { type: 'CHOOSE', choice: 'leave' }));
    const before = await h.inspect('rejections');
    const bad = await h.attempt(() => repo.importText('{bad', h.mutation(changed.state)));
    const stale = await h.attempt(() => repo.importText(JSON.stringify(created.state), intent));
    const future = structuredClone(created.state); future.core.contentVersion = 'full-demo.999';
    const unknown = await h.attempt(() => repo.importText(JSON.stringify(future), h.mutation(changed.state)));
    const after = await h.inspect('rejections'); repo.close(); return { bad, stale, unknown, before, after };
  });
  expect(result.bad.code).toBe('SAVE_JSON');
  expect(result.stale.code).toBe('STALE_REVISION');
  expect(result.unknown.code).toBe('SAVE_VERSION');
  expect(result.after).toEqual(result.before);
});

test('transaction abort after put success cannot publish a successful action', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('abort');
    const original = (await repo.create('回滚', h.mutation())).state, before = await h.inspect('abort');
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      const req = put.call(this, value, key!);
      if (this.name === h.FULL_STATE_STORE && key === 'current') req.addEventListener('success', () => this.transaction.abort());
      return req;
    };
    let failed;
    try { failed = await h.attempt(() => repo.execute(h.command(original, { type: 'CHOOSE', choice: 'help' }))); }
    finally { IDBObjectStore.prototype.put = put; }
    const after = await h.inspect('abort'); repo.close(); return { failed, before, after };
  });
  expect(result.failed.code).toBe('STORAGE_ABORTED');
  expect(result.after).toEqual(result.before);
});

test('receipt write failure rolls back breakthrough consumption, state and checkpoint together', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('atomic-breakthrough');
    const fixture = h.routes.fullRoute().checkpoints.qi;
    const imported = (await repo.importText(JSON.stringify(fixture), h.mutation())).state;
    const before = await h.inspect('atomic-breakthrough'), put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === h.FULL_RECEIPT_STORE) throw new DOMException('quota injection', 'QuotaExceededError');
      return put.call(this, value, key!);
    };
    let failed;
    try { failed = await h.attempt(() => repo.execute(h.command(imported, { type: 'BREAKTHROUGH' }))); }
    finally { IDBObjectStore.prototype.put = put; }
    const after = await h.inspect('atomic-breakthrough'); repo.close(); return { failed, before, after };
  });
  expect(result.failed.code).toBe('STORAGE_QUOTA');
  expect(result.after).toEqual(result.before);
});

test('existing full v1 content, previous snapshot and checkpoint migrate atomically with raw backups', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'content-version', repo = await h.FullSaveRepository.open(name); repo.close();
    const route = h.routes.fullRoute(), raw = structuredClone(route.checkpoints.qi), previous = structuredClone(h.routes.driver().game);
    const cpSnapshot = structuredClone(route.checkpoints.mortal);
    for (const g of [raw, previous, cpSnapshot]) g.core.contentVersion = 'full-demo.1';
    const cp = { format: 'chenyuan-checkpoint', version: 1, kind: 'breakthrough',
      sourceRunId: cpSnapshot.core.runId, sourceRevision: cpSnapshot.core.revision,
      versions: { format: cpSnapshot.format, version: cpSnapshot.version, schemaVersion: cpSnapshot.core.schemaVersion,
        contentVersion: cpSnapshot.core.contentVersion, balanceVersion: cpSnapshot.core.balanceVersion }, snapshot: cpSnapshot };
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(name); req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction([h.FULL_STATE_STORE, h.FULL_RECEIPT_STORE], 'readwrite');
        tx.objectStore(h.FULL_STATE_STORE).put(raw, 'current'); tx.objectStore(h.FULL_STATE_STORE).put(previous, 'previous');
        tx.objectStore(h.FULL_STATE_STORE).put(cp, 'checkpoint'); tx.objectStore(h.FULL_RECEIPT_STORE).put({ old: true }, 'old');
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
      };
    });
    const migrated = await h.FullSaveRepository.open(name), current = await migrated.load(), prior = await migrated.loadPrevious();
    const checkpoint = await migrated.loadCheckpoint(), archives = await migrated.archives(); migrated.close();
    const again = await h.FullSaveRepository.open(name), loadedAgain = await again.load(), archivesAgain = await again.archives(); again.close();
    return { raw, previous, cp, current, prior, checkpoint, archives, loadedAgain, archivesAgain };
  });
  expect(result.current.core.contentVersion).toBe('full-demo.2');
  expect(result.current.core.runId).not.toBe(result.raw.core.runId);
  expect(result.current.core.player).toEqual(result.raw.core.player);
  expect(result.prior.core.player).toEqual(result.previous.core.player);
  expect(result.prior.core.contentVersion).toBe('full-demo.2');
  expect(result.checkpoint.snapshot.core.contentVersion).toBe('full-demo.2');
  for (const raw of [result.raw, result.previous, result.cp]) expect(result.archives.some((x: any) => JSON.stringify(x.value) === JSON.stringify(raw))).toBe(true);
  expect(result.loadedAgain).toEqual(result.current);
  expect(result.archivesAgain).toEqual(result.archives);
});

test('unknown full content and inconsistent checkpoint metadata never overwrite existing full records', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const bad of ['future-content', 'checkpoint-version']) {
      const repo = await h.FullSaveRepository.open(bad); repo.close();
      const fixture = h.routes.fullRoute().checkpoints.qi;
      const raw = structuredClone(fixture); raw.core.contentVersion = bad === 'future-content' ? 'full-demo.999' : 'full-demo.1';
      const cp = { format: 'chenyuan-checkpoint', version: 1, kind: 'breakthrough', sourceRunId: fixture.core.runId,
        sourceRevision: fixture.core.revision, versions: { format: fixture.format, version: fixture.version,
          schemaVersion: fixture.core.schemaVersion, contentVersion: 'full-demo.999', balanceVersion: fixture.core.balanceVersion }, snapshot: fixture };
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(bad); req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result, tx = db.transaction(h.FULL_STATE_STORE, 'readwrite');
          tx.objectStore(h.FULL_STATE_STORE).put(raw, 'current');
          if (bad === 'checkpoint-version') tx.objectStore(h.FULL_STATE_STORE).put(cp, 'checkpoint');
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
        };
      });
      const before = await h.inspect(bad), failed = await h.attempt(() => h.FullSaveRepository.open(bad)), after = await h.inspect(bad);
      rows.push({ before, failed, after });
    }
    return rows;
  });
  expect(result[0].failed.code).toBe('SAVE_VERSION');
  expect(result[1].failed.code).toBe('CHECKPOINT_INVALID');
  for (const row of result) expect(row.after).toEqual(row.before);
});

test('arguments are captured before asynchronous writes and committed retries return the original result with latest state', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('owned-arguments');
    const intent = h.mutation(), intendedRun = intent.runId, creating = repo.create('意图', intent); intent.runId = 'mutated';
    const initial = (await creating).state, cmd = h.command(initial, { type: 'CHOOSE', choice: 'help' }), retry = structuredClone(cmd);
    const pending = repo.execute(cmd); cmd.choice = 'leave'; cmd.expectedRevision = 999;
    const first = await pending, latest = await repo.execute(h.command(first.state, { type: 'TRAVEL', location: 'cave' }));
    const replay = await repo.execute(retry); repo.close();
    return { intendedRun, initial, first, latest, replay };
  });
  expect(result.initial.core.runId).toBe(result.intendedRun);
  expect(result.first.state.core.openingChoice).toBe('help');
  expect(result.first.state.core.inventory.healing_pill).toBe(0);
  expect(result.replay.replayed).toBe(true);
  expect(result.replay.result).toEqual(result.first.result);
  expect(result.replay.state).toEqual(result.latest.state);
});

test('newer database versions close stale repositories and remain intact when older code reopens', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('future-db');
    const original = (await repo.create('版本', h.mutation())).state;
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('future-db', 3); req.onsuccess = () => { req.result.close(); resolve(); }; req.onerror = () => reject(req.error);
    });
    const closed = await h.attempt(() => repo.load()), older = await h.attempt(() => h.FullSaveRepository.open('future-db'));
    return { original, closed, older, raw: await h.inspect('future-db') };
  });
  expect(result.closed.code).toBe('STORAGE_CLOSED');
  expect(result.older.code).toBe('DB_VERSION');
  expect(result.raw.version).toBe(3);
  expect(result.raw['full-state'].find((x: any) => x.key === 'current').value).toEqual(result.original);
});

test('full breakthroughs and trial questions/battles persist their complete preparing checkpoint', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, route = h.routes.fullRoute(), rows = [];
    for (const kind of ['breakthrough', 'trial']) {
      const name = 'complete-checkpoint-' + kind, repository = await h.FullSaveRepository.open(name);
      const snapshot = kind === 'trial' ? route.checkpoints.trial : route.checkpoints.qi;
      const original = (await repository.importText(JSON.stringify(snapshot), h.mutation())).state;
      let outcome = await repository.execute(h.command(original, { type: kind === 'trial' ? 'START_TRIAL' : 'BREAKTHROUGH' }));
      const first = outcome.state; repository.close();
      const reopened = await h.FullSaveRepository.open(name), checkpoint = await reopened.loadCheckpoint(), reloaded = await reopened.load();
      if (kind === 'trial') {
        outcome = await reopened.execute(h.command(reloaded, { type: 'ANSWER_TRIAL', answer: 'accept' }));
        outcome = await reopened.execute(h.command(outcome.state, { type: 'BATTLE', move: 'attack' }));
      }
      reopened.close();
      const last = await h.FullSaveRepository.open(name), final = await last.load(), checkpointAgain = await last.loadCheckpoint(); last.close();
      rows.push({ kind, original, first, reloaded, final, expected: outcome.state, checkpoint, checkpointAgain });
    }
    return rows;
  });
  for (const row of result) {
    expect(row.reloaded).toEqual(row.first);
    expect(row.final).toEqual(row.expected);
    expect(row.checkpoint.snapshot).toEqual(row.original);
    expect(row.checkpoint.kind).toBe(row.kind);
    expect(row.checkpointAgain).toEqual(row.checkpoint);
    if (row.kind === 'trial') {
      expect(row.first.core.activeEvent.id).toBe('trial_question');
      expect(row.first.core.inventory.ascension_seal).toBe(0);
      expect(row.final.battle.enemy).toBe('trial_heart');
    } else {
      expect(row.final.core.player.realm).toBe('foundation');
      expect(row.final.core.inventory.foundation_pill).toBe(0);
    }
  }
});

test('an orphaned full checkpoint or previous snapshot is never mistaken for a new empty run', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('orphaned-full');
    const original = (await repo.create('保留', h.mutation())).state; repo.close();
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('orphaned-full'); req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction(h.FULL_STATE_STORE, 'readwrite'), state = tx.objectStore(h.FULL_STATE_STORE);
        state.put(original, 'previous'); state.delete('current');
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
      };
    });
    const before = await h.inspect('orphaned-full'), failed = await h.attempt(() => h.FullSaveRepository.open('orphaned-full'));
    return { failed, before, after: await h.inspect('orphaned-full') };
  });
  expect(result.failed.code).toBe('MIGRATION_SOURCE_MISSING');
  expect(result.after).toEqual(result.before);
});
