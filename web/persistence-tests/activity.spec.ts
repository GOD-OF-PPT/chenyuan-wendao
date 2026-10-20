import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(() => {
    const h = (globalThis as any).h;
    h.plan = (maxCycles = 3, method = 'natural', stoneBudget = 0, stoneReserve = 0) =>
      ({ kind: 'cultivation', method, maxCycles, until: 'cycles', stoneBudget, stoneReserve });
    h.activityMutation = (snapshot: any, ownerId = 'page-a') => ({ commandId: crypto.randomUUID(),
      runId: snapshot.state.core.runId, expectedRevision: snapshot.state.core.revision,
      expectedActivityId: snapshot.activity?.id ?? null, expectedActivityRevision: snapshot.activity?.revision ?? null, ownerId });
    h.activityTick = (snapshot: any) => ({ commandId: snapshot.activity.nextCommand.commandId,
      runId: snapshot.state.core.runId, expectedRevision: snapshot.state.core.revision, activityId: snapshot.activity.id,
      expectedActivityRevision: snapshot.activity.revision, ownerId: snapshot.activity.ownerId, generation: snapshot.activity.generation });
    h.activityFixture = async (name: string) => {
      const d = h.routes.driver(); d.go('cave');
      const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(d.game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
  });
});

test('online cycles never reward early, a late callback settles one step, and receipts replay the latest snapshot', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.activityFixture('activity-cycle');
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.plan(3), h.activityMutation(snapshot)), firstTick = h.activityTick(started);
      const early = await h.attempt(() => repo.settleActivity(firstTick)), unchanged = await repo.loadActivitySnapshot();
      now = started.activity.dueAt + 3_600_000;
      const first = await repo.settleActivity(firstTick), firstReplay = await repo.settleActivity(firstTick);
      const secondEarly = await h.attempt(() => repo.settleActivity(h.activityTick(first)));
      now = first.activity.dueAt;
      const second = await repo.settleActivity(h.activityTick(first)), oldReplay = await repo.settleActivity(firstTick);
      const previous = await repo.loadPrevious(), loaded = await repo.loadActivitySnapshot();
      return { snapshot, started, early, unchanged, first, firstReplay, secondEarly, second, oldReplay, previous, loaded, now };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.started.state).toEqual(r.snapshot.state);
  expect(r.early.code).toBe('ACTIVITY_NOT_DUE'); expect(r.unchanged.activity).toEqual(r.started.activity);
  expect(r.unchanged.state).toEqual(r.snapshot.state);
  expect(r.first.result.executedSteps).toBe(1); expect(r.first.result.requestedSteps).toBe(1);
  expect(r.first.activity.completedCycles).toBe(1); expect(r.first.state.core.world.elapsedMonths).toBe(r.snapshot.state.core.world.elapsedMonths + 1);
  expect(r.first.activity.dueAt - r.first.activity.startedAt).toBe(r.first.activity.cycleMs);
  expect(r.secondEarly.code).toBe('ACTIVITY_NOT_DUE'); expect(r.firstReplay.replayed).toBe(true);
  expect(r.firstReplay.state).toEqual(r.first.state); expect(r.firstReplay.activity).toEqual(r.first.activity);
  expect(r.second.activity.completedCycles).toBe(2); expect(r.previous).toEqual(r.first.state);
  expect(r.oldReplay.replayed).toBe(true); expect(r.oldReplay.state).toEqual(r.second.state);
  expect(r.oldReplay.activity).toEqual(r.second.activity); expect(r.oldReplay.result).toEqual(r.first.result);
  expect(r.loaded).toEqual({ state: r.second.state, activity: r.second.activity });
});

test('pause and explicit takeover fence old callbacks, reopening grants nothing and starts a complete new cycle', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.activityFixture('activity-owner');
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.plan(), h.activityMutation(snapshot)), oldTick = h.activityTick(started);
      const paused = await repo.pauseActivity(h.activityMutation(started)); repo.close();
      now += 86_400_000;
      const fresh = await h.FullSaveRepository.open('activity-owner');
      try {
        const reopened = await fresh.loadActivitySnapshot();
        const resumed = await fresh.resumeActivity(h.activityMutation(reopened, 'page-b'));
        const stale = await h.attempt(() => fresh.settleActivity(oldTick));
        const foreignPause = await h.attempt(() => fresh.pauseActivity(h.activityMutation(resumed, 'page-a')));
        now += 1000;
        const taken = await fresh.resumeActivity(h.activityMutation(resumed, 'page-c'));
        const replacedTick = await h.attempt(() => fresh.settleActivity(h.activityTick(resumed)));
        const early = await h.attempt(() => fresh.settleActivity(h.activityTick(taken)));
        now = taken.activity.dueAt;
        const completed = await fresh.settleActivity(h.activityTick(taken));
        return { snapshot, started, paused, reopened, resumed, stale, foreignPause, taken, replacedTick, early, completed };
      } finally { fresh.close(); }
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.reopened).toEqual({ state: r.snapshot.state, activity: r.paused.activity });
  expect(r.resumed.activity.completedCycles).toBe(0); expect(r.resumed.activity.ownerId).toBe('page-b');
  expect(r.resumed.activity.generation).toBeGreaterThan(r.started.activity.generation);
  expect(r.stale.ok).toBe(false); expect(r.foreignPause.code).toBe('ACTIVITY_OWNER');
  expect(r.taken.activity.ownerId).toBe('page-c'); expect(r.taken.activity.startedAt).toBe(r.resumed.activity.startedAt + 1000);
  expect(r.replacedTick.ok).toBe(false); expect(r.early.code).toBe('ACTIVITY_NOT_DUE');
  expect(r.completed.activity.completedCycles).toBe(1);
});

test('the repository blocks short cultivation batches and other writes until pause, then invalidates the old plan', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.activityFixture('activity-lock');
    try {
      const one = await h.attempt(() => repo.execute(h.command(snapshot.state, { type: 'CULTIVATE', method: 'natural', count: 1 })));
      const batch = await h.attempt(() => repo.execute(h.command(snapshot.state, { type: 'CULTIVATE', method: 'natural', count: 50 })));
      const started = await repo.startActivity(h.plan(), h.activityMutation(snapshot));
      const changed = await h.attempt(() => repo.execute(h.command(started.state, { type: 'TRAVEL', location: 'sect' })));
      const replaced = await h.attempt(() => repo.startActivity(h.plan(), h.activityMutation(started)));
      const paused = await repo.pauseActivity(h.activityMutation(started));
      const moved = await repo.execute(h.command(paused.state, { type: 'TRAVEL', location: 'sect' }));
      const after = await repo.loadActivitySnapshot();
      const oldResume = await h.attempt(() => repo.resumeActivity(h.activityMutation(paused)));
      return { snapshot, one, batch, started, changed, replaced, paused, moved, after, oldResume };
    } finally { repo.close(); }
  });
  expect(r.one.code).toBe('ACTIVITY_REQUIRED'); expect(r.batch.code).toBe('ACTIVITY_REQUIRED');
  expect(r.changed.code).toBe('ACTIVITY_RUNNING'); expect(r.replaced.code).toBe('ACTIVITY_RUNNING');
  expect(r.after.state).toEqual(r.moved.state); expect(r.after.activity.status).toBe('stopped');
  expect(r.after.activity.stopReason.code).toBe('STATE_CHANGED'); expect(r.oldResume.code).toBe('STALE_REVISION');
  expect(r.after.activity.completedCycles).toBe(0); expect(r.after.state.core.player.xp).toBe(r.snapshot.state.core.player.xp);
});

for (const mode of ['quota', 'abort']) test(`cycle ${mode} rolls back Game, previous, activity and receipt; the original command retries once`, async ({ page }) => {
  const r = await page.evaluate(async mode => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.activityFixture('activity-fault-' + mode);
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.plan(2, 'assisted', 40), h.activityMutation(snapshot)), tick = h.activityTick(started);
      now = started.activity.dueAt;
      const before = await h.inspect('activity-fault-' + mode), put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
        if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE) throw new DOMException('activity quota', 'QuotaExceededError');
        const request = put.call(this, value, key!);
        if (mode === 'abort' && this.name === h.FULL_STATE_STORE && key === 'activity') request.addEventListener('success', () => this.transaction.abort());
        return request;
      };
      let failed;
      try { failed = await h.attempt(() => repo.settleActivity(tick)); }
      finally { IDBObjectStore.prototype.put = put; }
      const after = await h.inspect('activity-fault-' + mode), retried = await repo.settleActivity(tick), replay = await repo.settleActivity(tick);
      return { before, after, failed, retried, replay, snapshot };
    } finally { Date.now = realNow; repo.close(); }
  }, mode);
  expect(r.failed.code).toBe(mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED'); expect(r.after).toEqual(r.before);
  expect(r.retried.activity.completedCycles).toBe(1); expect(r.retried.activity.spentStones).toBe(20);
  expect(r.retried.state.core.player.stones).toBe(r.snapshot.state.core.player.stones - 20);
  expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.retried.state); expect(r.replay.activity).toEqual(r.retried.activity);
});

test('a lost cycle delivery replays the saved receipt and automatic budget stopping does not consume another cycle', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.activityFixture('activity-delivery');
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.plan(4, 'assisted', 20), h.activityMutation(snapshot)), tick = h.activityTick(started);
      now = started.activity.dueAt;
      const deliver = async () => { await repo.settleActivity(tick); throw new Error('delivery lost after commit'); };
      const lost = await h.attempt(deliver), saved = await repo.loadActivitySnapshot(), retry = await repo.settleActivity(tick);
      const cannotResume = await h.attempt(() => repo.resumeActivity(h.activityMutation(saved)));
      return { snapshot, lost, saved, retry, cannotResume };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.lost.ok).toBe(false); expect(r.saved.activity.completedCycles).toBe(1);
  expect(r.saved.activity.status).toBe('stopped'); expect(r.saved.activity.stopReason.code).toBe('ACTIVITY_BUDGET');
  expect(r.saved.activity.nextCommand).toBeNull(); expect(r.saved.state.core.player.stones).toBe(r.snapshot.state.core.player.stones - 20);
  expect(r.retry.replayed).toBe(true); expect(r.retry.state).toEqual(r.saved.state); expect(r.retry.activity).toEqual(r.saved.activity);
  expect(r.cannotResume.code).toBe('ACTIVITY_STOPPED');
});

test('activity command IDs cannot change payloads or cross into ordinary commands and corrupt receipts stay untouched', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.activityFixture('activity-receipts');
    try {
      const mutation = h.activityMutation(snapshot), started = await repo.startActivity(h.plan(), mutation);
      const replay = await repo.startActivity(h.plan(), mutation);
      const altered = await h.attempt(() => repo.startActivity(h.plan(2), mutation));
      const cross = await h.attempt(() => repo.execute({ ...h.command(started.state, { type: 'TRAVEL', location: 'sect' }), commandId: mutation.commandId }));
      await h.put('activity-receipts', h.FULL_RECEIPT_STORE, mutation.runId + ':' + mutation.commandId, undefined);
      const before = await h.inspect('activity-receipts'), corrupt = await h.attempt(() => repo.startActivity(h.plan(), mutation)), after = await h.inspect('activity-receipts');
      return { started, replay, altered, cross, before, corrupt, after };
    } finally { repo.close(); }
  });
  expect(r.replay.replayed).toBe(true); expect(r.replay.activity).toEqual(r.started.activity);
  expect(r.altered.code).toBe('COMMAND_ID_REUSED'); expect(r.cross.code).toBe('COMMAND_ID_REUSED');
  expect(r.corrupt.code).toBe('RECEIPT_INVALID'); expect(r.after).toEqual(r.before);
});

test('undefined or malformed activity records are rejected rather than overwritten by loading, commands or replacement', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const bad of [undefined, { format: 'future', version: 99 }]) {
      const name = 'activity-corrupt-' + rows.length, { repo, snapshot } = await h.activityFixture(name);
      try {
        await h.put(name, h.FULL_STATE_STORE, 'activity', bad);
        const before = await h.inspect(name), loaded = await h.attempt(() => repo.loadActivitySnapshot());
        const command = await h.attempt(() => repo.execute(h.command(snapshot.state, { type: 'TRAVEL', location: 'sect' })));
        const replace = await h.attempt(() => repo.create('保留原件', h.mutation(snapshot.state))), after = await h.inspect(name);
        rows.push({ before, loaded, command, replace, after });
      } finally { repo.close(); }
      rows.at(-1).reopen = await h.attempt(() => h.FullSaveRepository.open(name));
    }
    return rows;
  });
  for (const row of r) {
    expect(row.loaded.code).toBe('ACTIVITY_INVALID'); expect(row.command.code).toBe('ACTIVITY_INVALID');
    expect(row.replace.code).toBe('ACTIVITY_INVALID'); expect(row.reopen.code).toBe('ACTIVITY_INVALID'); expect(row.after).toEqual(row.before);
  }
});

test('explicit replacement archives the activity atomically and cannot apply an old cycle to the new run', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const kind of ['create', 'import']) {
      const name = 'activity-replace-' + kind, { repo, snapshot } = await h.activityFixture(name);
      try {
        const started = await repo.startActivity(h.plan(), h.activityMutation(snapshot)), tick = h.activityTick(started);
        const mutation = h.mutation(started.state), put = IDBObjectStore.prototype.put, before = await h.inspect(name);
        IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
          if (this.name === h.FULL_RECEIPT_STORE) throw new DOMException('replacement quota', 'QuotaExceededError');
          return put.call(this, value, key!);
        };
        const operation = () => kind === 'create' ? repo.create('新人生', mutation) : repo.importText(JSON.stringify(snapshot.state), mutation);
        let failed;
        try { failed = await h.attempt(operation); } finally { IDBObjectStore.prototype.put = put; }
        const afterFailure = await h.inspect(name), replaced = await operation(), after = await repo.loadActivitySnapshot();
        const old = await h.attempt(() => repo.settleActivity(tick)), archives = await repo.archives();
        rows.push({ kind, before, failed, afterFailure, started, replaced, after, old, archives });
      } finally { repo.close(); }
    }
    return rows;
  });
  for (const row of r) {
    expect(row.failed.code).toBe('STORAGE_QUOTA'); expect(row.afterFailure).toEqual(row.before);
    expect(row.after.activity).toBeNull(); expect(row.after.state).toEqual(row.replaced.state); expect(row.old.code).toBe('RUN_MISMATCH');
    expect(row.archives.some((entry: any) => entry.value?.id === row.started.activity.id)).toBe(true);
  }
});

test('restoring a real breakthrough checkpoint archives the old activity with the replacement and keeps the checkpoint reusable', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('activity-restore');
    try {
      const d = h.routes.driver(), prepared = await repo.importText(JSON.stringify(d.checkpoints.mortal), h.mutation());
      const advanced = await repo.execute(h.command(prepared.state, { type: 'BREAKTHROUGH' }));
      const checkpoint = await repo.loadCheckpoint(), started = await repo.startActivity(h.plan(), h.activityMutation({ state: advanced.state, activity: null }));
      const intent = h.mutation(started.state), restored = await repo.restoreCheckpoint(intent), loaded = await repo.loadActivitySnapshot();
      const replay = await repo.restoreCheckpoint(intent), old = await h.attempt(() => repo.settleActivity(h.activityTick(started)));
      return { checkpoint, started, restored, loaded, replay, old, checkpointAfter: await repo.loadCheckpoint(), archives: await repo.archives() };
    } finally { repo.close(); }
  });
  expect(r.loaded.activity).toBeNull(); expect(r.loaded.state).toEqual(r.restored.state);
  expect(r.checkpointAfter).toEqual(r.checkpoint); expect(r.replay.replayed).toBe(true); expect(r.old.code).toBe('RUN_MISMATCH');
  expect(r.archives.some((entry: any) => entry.value?.id === r.started.activity.id)).toBe(true);
});

test('v3 database upgrades retain real Game records and receipts while an old connection closes on version change', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'activity-v3', source = await h.activityFixture('activity-v3-source');
    source.repo.close();
    const original = source.snapshot.state, sourceRaw = await h.inspect('activity-v3-source'), prior = h.routes.driver().checkpoints.mortal;
    let closed = false;
    const old = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 3);
      request.onupgradeneeded = () => { for (const store of [h.FULL_STATE_STORE, h.FULL_RECEIPT_STORE, h.FULL_BACKUP_STORE]) request.result.createObjectStore(store); };
      request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = old.transaction([h.FULL_STATE_STORE, h.FULL_RECEIPT_STORE], 'readwrite');
      tx.objectStore(h.FULL_STATE_STORE).put(original, 'current'); tx.objectStore(h.FULL_STATE_STORE).put(prior, 'previous');
      for (const receipt of sourceRaw[h.FULL_RECEIPT_STORE]) tx.objectStore(h.FULL_RECEIPT_STORE).put(receipt.value, receipt.key);
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    const before = await h.inspect(name); old.onversionchange = () => { closed = true; old.close(); };
    const repo = await h.FullSaveRepository.open(name);
    try { return { before, after: await h.inspect(name), loaded: await repo.loadActivitySnapshot(), original, closed, targetVersion: h.FULL_DB_VERSION }; }
    finally { repo.close(); old.close(); }
  });
  expect(r.closed).toBe(true); expect(r.after.version).toBe(r.targetVersion);
  expect(r.after['full-state']).toEqual(r.before['full-state']); expect(r.after['full-receipts']).toEqual(r.before['full-receipts']);
  expect(r.loaded.state).toEqual(r.original); expect(r.loaded.activity).toBeNull();
});

test('content migration archives and clears the old activity atomically without fabricating offline growth', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'activity-content-migration', { repo, snapshot } = await h.activityFixture(name);
    const started = await repo.startActivity(h.plan(), h.activityMutation(snapshot)); repo.close();
    const historical = structuredClone(started.state);
    historical.core.contentVersion = 'full-demo.1'; historical.core.balanceVersion = 'full-unbalanced.1';
    await h.put(name, h.FULL_STATE_STORE, 'current', historical);
    const before = await h.inspect(name), put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
      if (this.name === h.FULL_RECEIPT_STORE) throw new DOMException('migration quota', 'QuotaExceededError');
      return put.call(this, value, key!);
    };
    let failed;
    try { failed = await h.attempt(() => h.FullSaveRepository.open(name)); }
    finally { IDBObjectStore.prototype.put = put; }
    const afterFailure = await h.inspect(name), migrated = await h.FullSaveRepository.open(name);
    try { return { started, before, failed, afterFailure, loaded: await migrated.loadActivitySnapshot(), archives: await migrated.archives() }; }
    finally { migrated.close(); }
  });
  expect(r.failed.code).toBe('STORAGE_QUOTA'); expect(r.afterFailure).toEqual(r.before);
  expect(r.loaded.activity).toBeNull(); expect(r.loaded.state.core.runId).not.toBe(r.started.state.core.runId);
  expect(r.loaded.state.core.player).toEqual(r.started.state.core.player); expect(r.loaded.state.core.world).toEqual(r.started.state.core.world);
  expect(r.archives.some((entry: any) => entry.value?.id === r.started.activity.id)).toBe(true);
});

test('cycle and cultivation-cap limits stop in the same saved transaction without automatic breakthrough', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const maxCycles of [1, 50]) {
        const repo = await h.FullSaveRepository.open('activity-target-' + maxCycles);
        try {
          let current = (await repo.create('目标停止', h.mutation())).state;
          current = (await repo.execute(h.command(current, { type: 'CHOOSE', choice: 'leave' }))).state;
          current = (await repo.execute(h.command(current, { type: 'TRAVEL', location: 'cave' }))).state;
          let outcome = await repo.startActivity(h.plan(maxCycles), h.activityMutation({ state: current, activity: null }));
          while (outcome.activity.status === 'running') { now = outcome.activity.dueAt; outcome = await repo.settleActivity(h.activityTick(outcome)); }
          rows.push({ maxCycles, outcome, loaded: await repo.loadActivitySnapshot() });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  expect(r[0].outcome.activity.completedCycles).toBe(1); expect(r[0].outcome.activity.stopReason.code).toBe('CYCLES_COMPLETE');
  expect(r[1].outcome.activity.completedCycles).toBe(2); expect(r[1].outcome.activity.stopReason.code).toBe('XP_CAP');
  for (const row of r) {
    expect(row.outcome.state.core.player.realm).toBe('mortal'); expect(row.outcome.activity.nextCommand).toBeNull();
    expect(row.loaded).toEqual({ state: row.outcome.state, activity: row.outcome.activity });
  }
});
