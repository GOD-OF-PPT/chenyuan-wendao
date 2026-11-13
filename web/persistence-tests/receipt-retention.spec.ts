import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test.use({ trace: 'off' });
test.setTimeout(120_000);
test('delivered control writes stay bounded across the replay window without mutating Game or accepting a reused old id', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-delivered-controls',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('cave');
    // The same test reaches the pre-feature leak; a passing implementation must
    // also provide the explicit issuer/delivery boundary asserted below.
    const id = () =>
      typeof repo.issueCommandId === 'function'
        ? repo.issueCommandId()
        : crypto.randomUUID();
    async function delivered(operation: Promise<any>, commandId: string) {
      const out = await operation;
      if (typeof repo.confirmDelivery === 'function')
        await repo.confirmDelivery(out.state.core.runId, commandId);
      return out;
    }
    const seed = { ...h.mutation(), commandId: id() };
    let out = await delivered(
        repo.importText(JSON.stringify(d.game), seed),
        seed.commandId,
      ),
      state = out.state,
      activity: any = null;
    const before = structuredClone(state),
      plan = {
        kind: 'cultivation',
        method: 'natural',
        maxCycles: 2,
        until: 'cycles',
        stoneBudget: 0,
        stoneReserve: 0,
      };
    const mutation = () => ({
      commandId: id(),
      runId: state.core.runId,
      expectedRevision: state.core.revision,
      expectedActivityId: activity?.id ?? null,
      expectedActivityRevision: activity?.revision ?? null,
      ownerId: 'q15-receiver',
    });
    let m = mutation();
    out = await delivered(repo.startScheduledActivity(plan, m), m.commandId);
    activity = out.activity;
    let first: any;
    const counts: number[] = [];
    async function count() {
      return new Promise<number>((yes, no) => {
        const q = indexedDB.open(name);
        q.onerror = () => no(q.error);
        q.onupgradeneeded = () => {
          q.transaction!.abort();
          no(Error('Observer cannot create storage'));
        };
        q.onsuccess = () => {
          const db = q.result,
            tx = db.transaction(h.FULL_RECEIPT_STORE, 'readonly'),
            read = tx.objectStore(h.FULL_RECEIPT_STORE).count();
          let n = 0;
          read.onsuccess = () => (n = read.result);
          tx.oncomplete = () => {
            db.close();
            yes(n);
          };
          tx.onabort = () => {
            db.close();
            no(tx.error);
          };
        };
      });
    }
    for (let i = 0; i < 600; i++) {
      m = mutation();
      if (!first) first = structuredClone(m);
      out = await delivered(repo.pauseScheduledActivity(m), m.commandId);
      state = out.state;
      activity = out.activity;
      m = mutation();
      out = await delivered(repo.resumeScheduledActivity(m), m.commandId);
      state = out.state;
      activity = out.activity;
      if (i === 0 || i === 299 || i === 599) counts.push(await count());
    }
    const protectedBefore = await h.inspect(name),
      reused = await h.attempt(() =>
        repo.pauseScheduledActivity({
          ...mutation(),
          commandId: first.commandId,
        }),
      ),
      protectedAfter = await h.inspect(name),
      hasIssuer = typeof repo.issueCommandId === 'function',
      hasDelivery = typeof repo.confirmDelivery === 'function';
    repo.close();
    return {
      before,
      state,
      activity,
      counts,
      reused,
      unchangedOnReuse:
        JSON.stringify(protectedBefore) === JSON.stringify(protectedAfter),
      hasIssuer,
      hasDelivery,
    };
  });
  expect(result.state).toEqual(result.before);
  expect(result.activity.completedCycles).toBe(0);
  expect(result.activity.status).toBe('running');
  expect(result.reused.ok).toBe(false);
  expect(result.unchangedOnReuse).toBe(true);
  expect(
    result.counts.at(-1),
    '512 recent proofs plus the protected current arrangement',
  ).toBeLessThanOrEqual(513);
  expect(result.hasIssuer).toBe(true);
  expect(result.hasDelivery).toBe(true);
});
test('a passive repository cannot confirm another receiver original reply merely by observing its committed revision', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-passive-delivery',
      origin = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('cave');
    const seed = { ...h.mutation(), commandId: origin.issueCommandId() },
      out = await origin.importText(JSON.stringify(d.game), seed),
      before = await h.inspect(name),
      peer = await h.FullSaveRepository.open(name);
    await peer.load();
    const rejected = await h.attempt(() =>
        peer.confirmDelivery(out.state.core.runId, seed.commandId),
      ),
      after = await h.inspect(name);
    peer.close();
    origin.close();
    return { before, after, rejected };
  });
  expect(result.rejected.ok).toBe(false);
  expect(result.after).toEqual(result.before);
});

test('the logical receiver survives reconnect while an independent receiver cannot acknowledge a replayed reply', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-receiver-reconnect';
    if (typeof h.createReceiptReceiver !== 'function')
      return { supported: false };
    const receiver = h.createReceiptReceiver(),
      repo = await h.FullSaveRepository.open(name, receiver),
      d = h.routes.driver();
    d.go('cave');
    const m = { ...h.mutation(), commandId: repo.issueCommandId() },
      text = JSON.stringify(d.game),
      out = await repo.importText(text, m);
    repo.close();
    const before = await h.inspect(name),
      peer = await h.FullSaveRepository.open(name),
      replay = await peer.importText(text, m),
      rejected = await h.attempt(() =>
        peer.confirmDelivery(m.runId, m.commandId),
      );
    peer.close();
    const afterPeer = await h.inspect(name),
      connected = await h.FullSaveRepository.open(name, receiver);
    const ack = await h.attempt(() =>
        connected.confirmDelivery(m.runId, m.commandId),
      ),
      after = await h.inspect(name);
    connected.close();
    return {
      supported: true,
      out,
      replay,
      rejected,
      ack,
      before,
      afterPeer,
      after,
    };
  });
  expect(result.supported).toBe(true);
  expect(result.replay.state).toEqual(result.out.state);
  expect(result.replay.replayed).toBe(true);
  expect(result.rejected.ok).toBe(false);
  expect(result.afterPeer).toEqual(result.before);
  expect(result.ack.ok).toBe(true);
  expect(
    result.after['full-retention'].find((r: any) => r.value.kind === 'receipt')
      .value.pending,
  ).toBe(false);
});

test('an unconfirmed original reply survives many acknowledged writes and epoch rotations with exact readonly replay', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-pending-window',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('cave');
    const seed = { ...h.mutation(), commandId: repo.issueCommandId() };
    let out = await repo.importText(JSON.stringify(d.game), seed);
    await repo.confirmDelivery(seed.runId, seed.commandId);
    let state = out.state,
      a: any = null;
    const mutation = () => ({
      commandId: repo.issueCommandId(),
      runId: state.core.runId,
      expectedRevision: state.core.revision,
      expectedActivityId: a?.id ?? null,
      expectedActivityRevision: a?.revision ?? null,
      ownerId: 'q15-pending',
    });
    const start = mutation();
    out = await repo.startScheduledActivity(
      {
        kind: 'cultivation',
        method: 'natural',
        maxCycles: 2,
        until: 'cycles',
        stoneBudget: 0,
        stoneReserve: 0,
      },
      start,
    );
    a = out.activity;
    await repo.confirmDelivery(state.core.runId, start.commandId);
    const lost = mutation(),
      original = await repo.pauseScheduledActivity(lost);
    a = original.activity;
    for (let i = 0; i < 550; i++) {
      let m = mutation();
      out = await repo.resumeScheduledActivity(m);
      a = out.activity;
      await repo.confirmDelivery(state.core.runId, m.commandId);
      m = mutation();
      out = await repo.pauseScheduledActivity(m);
      a = out.activity;
      await repo.confirmDelivery(state.core.runId, m.commandId);
    }
    const before = await h.inspect(name),
      peer = await h.FullSaveRepository.open(name),
      replay = await peer.pauseScheduledActivity(lost),
      peerAck = await h.attempt(() =>
        peer.confirmDelivery(state.core.runId, lost.commandId),
      ),
      after = await h.inspect(name);
    peer.close();
    const ownReplay = await repo.pauseScheduledActivity(lost),
      ack = await h.attempt(() =>
        repo.confirmDelivery(state.core.runId, lost.commandId),
      );
    repo.close();
    return { original, replay, ownReplay, peerAck, ack, before, after };
  });
  expect(result.replay.result).toEqual(result.original.result);
  expect(result.replay.replayed).toBe(true);
  expect(result.ownReplay).toEqual(result.replay);
  expect(result.peerAck.ok).toBe(false);
  expect(result.after).toEqual(result.before);
  expect(result.ack.ok).toBe(true);
  expect(
    result.before['full-retention'].find((r: any) => r.key === 'counter').value
      .epoch,
  ).toBeGreaterThan(0);
});

test('failed delivery cleanup keeps a committed Store saved and retries known delivery only after a later write, including reconnect', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async () => {
    const h = (globalThis as any).h,
      path = '/persistence-tests/activity-store-harness.ts',
      { createActivityStoreHarness } = await import(path);
    h.q15store = createActivityStoreHarness();
    await h.q15store.store.init();
    const prototype = h.FullSaveRepository.prototype,
      ack = prototype.confirmDelivery;
    h.q15acks = [];
    prototype.confirmDelivery = async function (runId: string, id: string) {
      h.q15acks.push(id);
      return ack.call(this, runId, id);
    };
    const put = IDBObjectStore.prototype.put;
    let fault = true;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (
        fault &&
        this.name === 'full-retention' &&
        value?.kind === 'receipt' &&
        value.pending === false
      ) {
        fault = false;
        throw new DOMException('ack quota', 'QuotaExceededError');
      }
      return put.call(this, value, key!);
    };
    h.q15restore = () => {
      prototype.confirmDelivery = ack;
      IDBObjectStore.prototype.put = put;
    };
    const d = h.routes.driver();
    d.go('cave');
    h.q15seed = h.q15store.store.importText(JSON.stringify(d.game));
  });
  await page.clock.runFor(700);
  await page.evaluate(() => (globalThis as any).h.q15seed);
  const failed = await page.evaluate(async () => {
    const h = (globalThis as any).h;
    return {
      ui: h.q15store.state(),
      warning: h.q15store.store.warning,
      raw: await h.inspect(h.FULL_DB_NAME),
      acks: [...h.q15acks],
    };
  });
  expect(failed.ui.saved).toBe(true);
  expect(failed.ui.error).toBe('');
  expect(failed.ui.canRetry).toBe(false);
  expect(failed.warning).toContain('原件已保留');
  await page.evaluate(async () => {
    const h = (globalThis as any).h;
    await h.q15store.store.init();
    await h.q15store.store.refresh();
  });
  const read = await page.evaluate(async () => {
    const h = (globalThis as any).h;
    return { raw: await h.inspect(h.FULL_DB_NAME), acks: [...h.q15acks] };
  });
  expect(read.raw).toEqual(failed.raw);
  expect(read.acks).toEqual(failed.acks);
  await page.evaluate(async () => {
    const h = (globalThis as any).h;
    await h.q15store.store.startOnlinePlannedActivity({
      kind: 'cultivation',
      method: 'natural',
      maxCycles: 2,
      until: 'cycles',
      stoneBudget: 0,
      stoneReserve: 0,
    });
  });
  const later = await page.evaluate(async () => {
    const h = (globalThis as any).h;
    try {
      return {
        ui: h.q15store.state(),
        acks: [...h.q15acks],
        raw: await h.inspect(h.FULL_DB_NAME),
      };
    } finally {
      h.q15restore();
      h.q15store.dispose();
    }
  });
  expect(later.ui.saved).toBe(true);
  expect(later.ui.error).toBe('');
  expect(later.ui.game).toEqual(failed.ui.game);
  expect(later.acks.filter((id: string) => id === failed.acks[0])).toHaveLength(
    2,
  );
  expect(
    later.raw['full-retention']
      .filter((r: any) => r.value.kind === 'receipt')
      .every((r: any) => !r.value.pending),
  ).toBe(true);
});

test('indexed history folds older cycles truthfully and only materializes the requested page without cleanup writes', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-indexed-history',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    while (d.game.core.player.realm !== 'spirit') d.realm();
    d.go('wilderness');
    // Lawful spirit route leaves enough life for 300 real material cycles; this is storage load, not pacing evidence.
    const game = structuredClone(d.game);
    h.engine.validateGame(game);
    const seed = { ...h.mutation(), commandId: repo.issueCommandId() };
    let out = await repo.importText(JSON.stringify(game), seed);
    await repo.confirmDelivery(seed.runId, seed.commandId);
    const m = {
      commandId: repo.issueCommandId(),
      runId: out.state.core.runId,
      expectedRevision: out.state.core.revision,
      expectedActivityId: null,
      expectedActivityRevision: null,
      ownerId: 'q15-history',
    };
    out = await repo.startActivity(
      {
        kind: 'source',
        sourceId: 'herbs',
        repeat: true,
        maxCycles: 1_000_000_000,
        until: 'cycles',
        target: null,
        monthBudget: 3600,
        remainingMonthsReserve: 1,
      },
      m,
    );
    await repo.confirmDelivery(seed.runId, m.commandId);
    const realNow = Date.now;
    try {
      for (let i = 0; i < 300; i++) {
        const a = out.activity;
        Date.now = () => a.dueAt;
        out = await repo.settleActivity({
          commandId: a.nextCommand.commandId,
          runId: a.runId,
          expectedRevision: a.gameRevision,
          activityId: a.id,
          expectedActivityRevision: a.revision,
          ownerId: a.ownerId,
          generation: a.generation,
        });
        await repo.confirmDelivery(seed.runId, a.nextCommand.commandId);
      }
    } finally {
      Date.now = realNow;
    }
    const before = await h.inspect(name),
      prototype = IDBObjectStore.prototype,
      oldCursor = prototype.openCursor,
      oldAll = prototype.getAll,
      indexCursor = IDBIndex.prototype.openCursor;
    let deliveredRows = 0;
    prototype.openCursor = function (...args: any[]) {
      if (this.name === h.FULL_RECEIPT_STORE) throw Error('whole receipt scan');
      return Reflect.apply(oldCursor, this, args);
    };
    prototype.getAll = function (...args: any[]) {
      if (this.name === h.FULL_RECEIPT_STORE) throw Error('whole receipt scan');
      return Reflect.apply(oldAll, this, args);
    };
    IDBIndex.prototype.openCursor = function (...args: any[]) {
      const q = Reflect.apply(indexCursor, this, args);
      if (this.objectStore.name === h.FULL_RECEIPT_STORE)
        q.addEventListener('success', () => {
          if (q.result) deliveredRows++;
        });
      return q;
    };
    let first: any, last: any;
    try {
      first = await repo.loadActivityHistory(out.activity.id, 0, 4);
      last = await repo.loadActivityHistory(out.activity.id, 999, 4);
    } finally {
      prototype.openCursor = oldCursor;
      prototype.getAll = oldAll;
      IDBIndex.prototype.openCursor = indexCursor;
    }
    const after = await h.inspect(name);
    repo.close();
    return {
      first,
      last,
      deliveredRows,
      before,
      after,
      activity: out.activity,
    };
  });
  expect(result.activity.completedCycles).toBe(300);
  expect(result.first).toMatchObject({
    total: 300,
    retained: 256,
    folded: 44,
    page: 0,
    pages: 64,
  });
  expect(result.first.rows.map((r: any) => r.activity.completedCycles)).toEqual(
    [45, 46, 47, 48],
  );
  expect(result.last.page).toBe(63);
  expect(result.last.rows.map((r: any) => r.activity.completedCycles)).toEqual([
    297, 298, 299, 300,
  ]);
  expect(result.deliveredRows).toBeLessThanOrEqual(9);
  expect(result.after).toEqual(result.before);
});

test('one thousand legal purchase cycles bound original replay data and keep only three complete new backup groups', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-many-activities',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('market');
    // Explicit resource fixture; each later debit/revision/proof is real native execution.
    const game = structuredClone(d.game);
    game.core.player.stones = 100000;
    h.engine.validateGame(game);
    const seed = { ...h.mutation(), commandId: repo.issueCommandId() };
    let out = await repo.importText(JSON.stringify(game), seed);
    await repo.confirmDelivery(seed.runId, seed.commandId);
    let a: any = null;
    const realNow = Date.now,
      stages: any[] = [];
    try {
      for (let group = 0; group < 20; group++) {
        const m = {
          commandId: repo.issueCommandId(),
          runId: out.state.core.runId,
          expectedRevision: out.state.core.revision,
          expectedActivityId: a?.id ?? null,
          expectedActivityRevision: a?.revision ?? null,
          ownerId: 'q15-many',
        };
        out = await repo.startActivity(
          {
            kind: 'buy',
            item: 'healing_pill',
            maxCycles: 50,
            until: 'cycles',
            targetQuantity: null,
            stoneBudget: 900,
            stoneReserve: 0,
          },
          m,
        );
        a = out.activity;
        await repo.confirmDelivery(seed.runId, m.commandId);
        for (let i = 0; i < 50; i++) {
          const due = a.dueAt;
          Date.now = () => due;
          const id = a.nextCommand.commandId;
          out = await repo.settleActivity({
            commandId: id,
            runId: a.runId,
            expectedRevision: a.gameRevision,
            activityId: a.id,
            expectedActivityRevision: a.revision,
            ownerId: a.ownerId,
            generation: a.generation,
          });
          a = out.activity;
          await repo.confirmDelivery(seed.runId, id);
        }
        if (group === 9 || group === 19) {
          const raw = await h.inspect(name);
          stages.push({
            receipts: raw[h.FULL_RECEIPT_STORE].length,
            metadata: raw['full-retention'].length,
            backups: raw[h.FULL_BACKUP_STORE].length,
            bytes: JSON.stringify(raw).length,
          });
        }
      }
    } finally {
      Date.now = realNow;
    }
    const raw = await h.inspect(name),
      groups = raw['full-retention']
        .filter((r: any) => r.value.kind === 'backup')
        .map((r: any) => r.value),
      hist = await repo.loadActivityHistory(a.id, 99, 4);
    repo.close();
    return { raw, groups, stages, hist, state: out.state, game, activity: a };
  });
  expect(
    result.state.core.inventory.healing_pill -
      result.game.core.inventory.healing_pill,
  ).toBe(1000);
  expect(result.state.core.player.stones).toBe(
    result.game.core.player.stones - 18000,
  );
  expect(result.activity.completedCycles).toBe(50);
  expect(result.groups).toHaveLength(3);
  expect(result.raw['full-backups'].map((r: any) => r.key).sort()).toEqual(
    result.groups.flatMap((g: any) => g.keys).sort(),
  );
  expect(result.stages[1].receipts).toBeLessThanOrEqual(563);
  expect(result.stages[1].metadata).toBeLessThanOrEqual(585);
  expect(result.stages[1].bytes).toBeLessThan(result.stages[0].bytes * 1.3);
  await test.info().attach('native-storage-growth', {
    body: JSON.stringify({
      cycles: 1000,
      stages: result.stages,
      backupGroups: result.groups.length,
    }),
    contentType: 'application/json',
  });
  expect(result.hist).toMatchObject({
    total: 50,
    retained: 50,
    folded: 0,
    page: 12,
    pages: 13,
  });
});

test('explicit replacement retains unconfirmed originals and isolates their run while known delivery can still be confirmed', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-replace-pending',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('cave');
    const seed = { ...h.mutation(), commandId: repo.issueCommandId() },
      text = JSON.stringify(d.game),
      old = await repo.importText(text, seed);
    const before = await h.inspect(name),
      next = { ...h.mutation(old.state), commandId: repo.issueCommandId() },
      now = await repo.importText(text, next);
    await repo.confirmDelivery(next.runId, next.commandId);
    const retained = await h.inspect(name),
      replay = await h.attempt(() => repo.importText(text, seed)),
      afterReplay = await h.inspect(name);
    await repo.confirmDelivery(seed.runId, seed.commandId);
    const after = await h.inspect(name);
    repo.close();
    return { before, retained, replay, afterReplay, after, now, old, seed };
  });
  expect(result.replay.code).toBe('RUN_MISMATCH');
  expect(result.afterReplay).toEqual(result.retained);
  const key = result.seed.runId + ':' + result.seed.commandId;
  expect(
    result.retained['full-receipts'].find((r: any) => r.key === key),
  ).toEqual(result.before['full-receipts'].find((r: any) => r.key === key));
  expect(
    result.after['full-retention'].find(
      (r: any) =>
        Array.isArray(r.key) && r.key[0] === 'receipt' && r.key[1] === key,
    ).value.pending,
  ).toBe(false);
  expect(
    result.after['full-state'].find((r: any) => r.key === 'current').value,
  ).toEqual(result.now.state);
});

test('DB10 originals form a fixed protected baseline, an aborted DB11 upgrade rolls back, and new acknowledged growth stays bounded', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-fixed-baseline',
      d = h.routes.driver();
    d.go('cave');
    await new Promise<void>((yes, no) => {
      const q = indexedDB.open(name, 10);
      q.onerror = () => no(q.error);
      q.onupgradeneeded = () => {
        for (const store of [
          'full-state',
          'full-receipts',
          'full-backups',
          'full-schedules',
        ])
          q.result.createObjectStore(store);
      };
      q.onsuccess = () => {
        const db = q.result,
          tx = db.transaction([...db.objectStoreNames], 'readwrite');
        tx.objectStore('full-state').put(d.game, 'current');
        for (let i = 0; i < 1100; i++)
          tx.objectStore('full-receipts').put(
            { original: i, unknownLegacyProof: true },
            'random-old-' + (1100 - i),
          );
        for (let i = 0; i < 7; i++)
          tx.objectStore('full-backups').put({ old: i }, 'opaque/old-' + i);
        tx.oncomplete = () => {
          db.close();
          yes();
        };
        tx.onabort = () => {
          db.close();
          no(tx.error);
        };
      };
    });
    const before = await h.inspect(name),
      put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === 'full-retention')
        throw new DOMException('upgrade quota', 'QuotaExceededError');
      return put.call(this, value, key!);
    };
    let failed: any;
    try {
      failed = await h.attempt(() => h.FullSaveRepository.open(name));
    } finally {
      IDBObjectStore.prototype.put = put;
    }
    const rollback = await h.inspect(name),
      repo = await h.FullSaveRepository.open(name),
      upgraded = await h.inspect(name);
    let a: any = null;
    const m = () => ({
      commandId: repo.issueCommandId(),
      runId: d.game.core.runId,
      expectedRevision: d.game.core.revision,
      expectedActivityId: a?.id ?? null,
      expectedActivityRevision: a?.revision ?? null,
      ownerId: 'q15-baseline',
    });
    let input = m(),
      out = await repo.startActivity(
        {
          kind: 'cultivation',
          method: 'natural',
          maxCycles: 2,
          until: 'cycles',
          stoneBudget: 0,
          stoneReserve: 0,
        },
        input,
      );
    a = out.activity;
    await repo.confirmDelivery(d.game.core.runId, input.commandId);
    for (let i = 0; i < 530; i++) {
      input = m();
      out = await repo.pauseActivity(input);
      a = out.activity;
      await repo.confirmDelivery(d.game.core.runId, input.commandId);
      input = m();
      out = await repo.resumeActivity(input);
      a = out.activity;
      await repo.confirmDelivery(d.game.core.runId, input.commandId);
    }
    const after = await h.inspect(name);
    repo.close();
    return { before, failed, rollback, upgraded, after };
  });
  expect(result.failed.ok).toBe(false);
  expect(result.rollback).toEqual(result.before);
  expect(result.upgraded.version).toBe(11);
  expect(result.upgraded['full-receipts']).toEqual(
    result.before['full-receipts'],
  );
  expect(result.after['full-backups']).toEqual(result.before['full-backups']);
  expect(
    result.after['full-receipts'].filter((r: any) =>
      r.key.startsWith('random-old-'),
    ),
  ).toEqual(result.before['full-receipts']);
  expect(result.after['full-receipts']).toHaveLength(1100 + 513);
  expect(
    result.after['full-retention'].filter(
      (r: any) => r.value.kind === 'receipt' && r.value.baseline,
    ),
  ).toHaveLength(1100);
});

test('future database or retention metadata is rejected without rewriting its original inventory', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      future = 'q15-future-db';
    await new Promise<void>((yes, no) => {
      const q = indexedDB.open(future, 12);
      q.onupgradeneeded = () => q.result.createObjectStore('future');
      q.onerror = () => no(q.error);
      q.onsuccess = () => {
        const db = q.result,
          tx = db.transaction('future', 'readwrite');
        tx.objectStore('future').put({ unrecognized: true }, 'original');
        tx.oncomplete = () => {
          db.close();
          yes();
        };
      };
    });
    const futureBefore = await h.inspect(future),
      futureOpen = await h.attempt(() => h.FullSaveRepository.open(future)),
      futureAfter = await h.inspect(future),
      name = 'q15-future-meta',
      repo = await h.FullSaveRepository.open(name);
    repo.close();
    const raw = await h.inspect(name),
      counter = raw['full-retention'].find(
        (r: any) => r.key === 'counter',
      ).value;
    counter.version = 2;
    await h.put(name, 'full-retention', 'counter', counter);
    const metaBefore = await h.inspect(name),
      metaOpen = await h.attempt(() => h.FullSaveRepository.open(name)),
      metaAfter = await h.inspect(name);
    return {
      futureBefore,
      futureOpen,
      futureAfter,
      metaBefore,
      metaOpen,
      metaAfter,
    };
  });
  expect(result.futureOpen.code).toBe('DB_VERSION');
  expect(result.futureAfter).toEqual(result.futureBefore);
  expect(result.metaOpen.code).toBe('RETENTION_INVALID');
  expect(result.metaAfter).toEqual(result.metaBefore);
});

test('the entire latest away window survives control-history retirement and is read without rewards after reconnect', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-whole-away-window',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    while (d.game.core.player.realm !== 'spirit') d.realm();
    d.go('wilderness');
    const seed = { ...h.mutation(), commandId: repo.issueCommandId() };
    let out = await repo.importText(JSON.stringify(d.game), seed);
    await repo.confirmDelivery(seed.runId, seed.commandId);
    let a: any = null;
    const m = () => ({
      commandId: repo.issueCommandId(),
      runId: out.state.core.runId,
      expectedRevision: out.state.core.revision,
      expectedActivityId: a?.id ?? null,
      expectedActivityRevision: a?.revision ?? null,
      ownerId: 'q15-window',
    });
    let input = m();
    out = await repo.startScheduledActivity(
      {
        kind: 'source',
        sourceId: 'herbs',
        repeat: true,
        maxCycles: 1_000_000_000,
        until: 'cycles',
        target: null,
        monthBudget: 4800,
        remainingMonthsReserve: 1,
      },
      input,
    );
    a = out.activity;
    await repo.confirmDelivery(seed.runId, input.commandId);
    const realNow = Date.now,
      now = a.dueAt + 299 * a.cycleMs,
      ids: string[] = [];
    Date.now = () => now;
    try {
      do {
        input = m();
        out = await repo.advanceScheduledActivity(input);
        a = out.activity;
        ids.push(input.commandId);
        await repo.confirmDelivery(seed.runId, input.commandId);
      } while (out.more);
      const summary = await repo.loadAwaySummary();
      for (let i = 0; i < 300; i++) {
        input = m();
        out = await repo.pauseScheduledActivity(input);
        a = out.activity;
        await repo.confirmDelivery(seed.runId, input.commandId);
        input = m();
        out = await repo.resumeScheduledActivity(input);
        a = out.activity;
        await repo.confirmDelivery(seed.runId, input.commandId);
      }
      repo.close();
      const connected = await h.FullSaveRepository.open(name),
        before = await h.inspect(name),
        afterSummary = await connected.loadAwaySummary(),
        snapshot = await connected.loadActivitySnapshot(),
        after = await h.inspect(name);
      connected.close();
      return { summary, afterSummary, before, after, ids, snapshot };
    } finally {
      Date.now = realNow;
      repo.close();
    }
  });
  expect(result.ids).toHaveLength(5);
  expect(result.summary.cycles).toBe(300);
  expect(result.summary.costs.months).toBe(3600);
  expect(result.afterSummary.cycles).toBe(result.summary.cycles);
  expect(result.afterSummary.costs).toEqual(result.summary.costs);
  expect(result.afterSummary.delta).toEqual(result.summary.delta);
  expect(result.after).toEqual(result.before);
  expect(result.snapshot.activity.completedCycles).toBe(300);
  for (const id of result.ids)
    expect(
      result.before['full-receipts'].some(
        (r: any) =>
          r.value.input?.kind === 'ADVANCE' &&
          r.value.input.mutation.commandId === id,
      ),
    ).toBe(true);
});

test('a lost cleanup acknowledgment can be retried by the same logical receiver without another write', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-lost-ack',
      receiver = h.createReceiptReceiver(),
      repo = await h.FullSaveRepository.open(name, receiver),
      d = h.routes.driver();
    d.go('cave');
    const m = { ...h.mutation(), commandId: repo.issueCommandId() };
    await repo.importText(JSON.stringify(d.game), m);
    const lost = await h.attempt(async () => {
      await repo.confirmDelivery(m.runId, m.commandId);
      throw new Error('cleanup reply lost after native completion');
    });
    repo.close();
    const before = await h.inspect(name),
      connected = await h.FullSaveRepository.open(name, receiver),
      retry = await h.attempt(() =>
        connected.confirmDelivery(m.runId, m.commandId),
      ),
      after = await h.inspect(name);
    connected.close();
    return { lost, retry, before, after };
  });
  expect(result.lost.ok).toBe(false);
  expect(result.retry.ok).toBe(true);
  expect(result.after).toEqual(result.before);
});

test('acknowledged replacement replays do not accumulate stale offers in a live logical receiver', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      path = '/src/receipt-retention.ts',
      { receiptReceiverState } = await import(path),
      receiver = h.createReceiptReceiver(),
      name = 'q15-live-receiver-replays',
      repo = await h.FullSaveRepository.open(name, receiver);
    let state: any = null,
      last: any;
    const samples: any[] = [];
    for (let i = 0; i < 40; i++) {
      const m = { ...h.mutation(state), commandId: repo.issueCommandId() },
        out = await repo.create('重复回看原新卷', m);
      state = out.state;
      await repo.confirmDelivery(m.runId, m.commandId);
      const replay = await repo.create('重复回看原新卷', m);
      if (!replay.replayed) throw Error('expected the original control replay');
      await repo.confirmDelivery(m.runId, m.commandId);
      last = m;
      if (i === 0 || i === 9 || i === 39) {
        const held = receiptReceiverState(receiver, name);
        samples.push({
          writes: i + 1,
          offers: held.offers.size,
          confirmed: held.confirmed.size,
        });
      }
    }
    const before = await h.inspect(name);
    await repo.create('重复回看原新卷', last);
    await repo.confirmDelivery(last.runId, last.commandId);
    const after = await h.inspect(name);
    repo.close();
    return { samples, before, after };
  });
  expect(result.samples.map((s: any) => s.offers)).toEqual([0, 0, 0]);
  expect(result.samples.every((s: any) => s.confirmed <= 512)).toBe(true);
  expect(result.after).toEqual(result.before);
  expect(result.after['full-receipts']).toHaveLength(1);
  await test.info().attach('live-receiver-memory', {
    body: JSON.stringify(result.samples),
    contentType: 'application/json',
  });
});

test('return-summary reading delivers only its latest complete window while retaining and validating the exact original proof', async ({
  page,
}, info) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-summary-read-window',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('sect');
    const realNow = Date.now;
    let now = 1700000000000;
    Date.now = () => now;
    try {
      const seed = { ...h.mutation(), commandId: repo.issueCommandId() };
      let out = await repo.importText(JSON.stringify(d.game), seed);
      await repo.confirmDelivery(seed.runId, seed.commandId);
      let a: any = null;
      const m = () => ({
        commandId: repo.issueCommandId(),
        runId: out.state.core.runId,
        expectedRevision: out.state.core.revision,
        expectedActivityId: a?.id ?? null,
        expectedActivityRevision: a?.revision ?? null,
        ownerId: 'q15-summary-reader',
      });
      let input = m();
      out = await repo.startScheduledActivity(
        {
          kind: 'source',
          sourceId: 'work',
          maxCycles: 50,
          until: 'cycles',
          target: null,
          monthBudget: 600,
          remainingMonthsReserve: 1,
        },
        input,
      );
      a = out.activity;
      await repo.confirmDelivery(seed.runId, input.commandId);
      for (const elapsed of [135000, 30000]) {
        now += elapsed;
        input = m();
        out = await repo.advanceScheduledActivity(input);
        a = out.activity;
        await repo.confirmDelivery(seed.runId, input.commandId);
      }
      for (let i = 0; i < 100; i++) {
        input = m();
        out = await repo.pauseScheduledActivity(input);
        a = out.activity;
        await repo.confirmDelivery(seed.runId, input.commandId);
        input = m();
        out = await repo.resumeScheduledActivity(input);
        a = out.activity;
        await repo.confirmDelivery(seed.runId, input.commandId);
      }
      const before = await h.inspect(name),
        path = '/src/away-summary.ts',
        { summarizeAway } = await import(path),
        reference = summarizeAway(
          out.state,
          a,
          out.schedule,
          before['full-receipts']
            .map((r: any) => r.value)
            .filter((v: any) => v.format === 'chenyuan-scheduled-receipt'),
        ),
        prototype = IDBObjectStore.prototype,
        methods = ['get', 'getAll', 'openCursor'] as const,
        restore: Array<() => void> = [],
        metrics = { requests: 0, rawValuesDelivered: 0 };
      for (const method of methods) {
        const original = prototype[method];
        prototype[method] = function (...args: any[]) {
          const q = Reflect.apply(original, this, args);
          if (
            this.transaction.db.name === name &&
            this.transaction.mode === 'readonly' &&
            this.name === 'full-receipts'
          ) {
            metrics.requests++;
            q.addEventListener('success', () => {
              metrics.rawValuesDelivered +=
                method === 'getAll'
                  ? q.result.length
                  : q.result === undefined || q.result === null
                    ? 0
                    : 1;
            });
          }
          return q;
        };
        restore.push(() => (prototype[method] = original));
      }
      let summary: any;
      try {
        summary = await repo.loadAwaySummary();
      } finally {
        for (const undo of restore) undo();
      }
      const after = await h.inspect(name),
        root = before['full-receipts'].find(
          (r: any) =>
            r.value.format === 'chenyuan-scheduled-receipt' &&
            r.value.input.kind === 'ADVANCE' &&
            r.value.input.mutation.commandId === summary.id,
        ),
        bad = structuredClone(root.value);
      bad.proof.result.delta.stones++;
      await h.put(name, 'full-receipts', root.key, bad);
      const damaged = await h.inspect(name),
        rejected = await h.attempt(() => repo.loadAwaySummary()),
        afterRejected = await h.inspect(name);
      return {
        before,
        after,
        reference,
        summary,
        metrics,
        damaged,
        afterRejected,
        rejected,
      };
    } finally {
      Date.now = realNow;
      repo.close();
    }
  });
  expect(result.before['full-receipts'].length).toBeGreaterThan(200);
  expect(result.summary).toEqual(result.reference);
  expect(result.summary).toMatchObject({
    cycles: 1,
    costs: { months: 12 },
    delta: { stones: 20 },
  });
  expect(result.after).toEqual(result.before);
  expect(result.rejected.code).toBe('RECEIPT_INVALID');
  expect(result.afterRejected).toEqual(result.damaged);
  await info.attach('latest-window-native-read-cost', {
    body: JSON.stringify({
      rawRetained: result.before['full-receipts'].length,
      metrics: result.metrics,
      summaryCycles: result.summary.cycles,
      originalInventoryPreserved: true,
      corruptOriginalRejected: true,
    }),
    contentType: 'application/json',
  });
  expect(result.metrics.rawValuesDelivered).toBeLessThanOrEqual(2);
});

for(const damage of ['missing-metadata','wrong-role','wrong-role-and-window'])test(`a ${damage} latest-window descriptor is rejected instead of presenting an older summary`,async({page})=>{
 await setupPersistence(page);
 const result=await page.evaluate(async damage=>{
  const h=(globalThis as any).h,name='q15-summary-descriptor-'+damage,repo=await h.FullSaveRepository.open(name),d=h.routes.driver();d.go('sect');const realNow=Date.now;let now=1700000000000;Date.now=()=>now;
  try{
   const seed={...h.mutation(),commandId:repo.issueCommandId()};let out=await repo.importText(JSON.stringify(d.game),seed),a:any=null;
   const m=()=>({commandId:repo.issueCommandId(),runId:out.state.core.runId,expectedRevision:out.state.core.revision,expectedActivityId:a?.id??null,expectedActivityRevision:a?.revision??null,ownerId:'descriptor-probe'});
   let input=m();out=await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},input);a=out.activity;
   for(const elapsed of [30000,60000]){now+=elapsed;input=m();out=await repo.advanceScheduledActivity(input);a=out.activity;}
   const key=input.runId+':'+input.commandId,raw=await h.inspect(name),meta=raw['full-retention'].find((r:any)=>Array.isArray(r.key)&&r.key[0]==='receipt'&&r.key[1]===key);
   if(damage!=='missing-metadata'){meta.value.role='control';if(damage==='wrong-role-and-window')meta.value.windowId=null;}
   await h.put(name,'full-retention',meta.key,meta.value,damage==='missing-metadata');
   const before=await h.inspect(name),summary=await h.attempt(()=>repo.loadAwaySummary()),after=await h.inspect(name);return{summary,before,after,rawOriginal:raw['full-receipts'].find((r:any)=>r.key===key)};
  }finally{Date.now=realNow;repo.close();}
 },damage);
 expect(result.summary.ok).toBe(false);expect(result.summary.code).toBe(damage==='wrong-role'?'RETENTION_INVALID':'RECEIPT_INVALID');expect(result.after).toEqual(result.before);
 expect(result.after['full-receipts']).toContainEqual(result.rawOriginal);
});
