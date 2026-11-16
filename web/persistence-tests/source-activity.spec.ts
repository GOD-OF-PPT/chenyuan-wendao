import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(async () => {
    const h = (globalThis as any).h;
    const C = h.currentContent;
    h.sourcePlan = (sourceId = 'herbs', overrides: any = {}) => ({ kind: 'source', sourceId, maxCycles: 5,
      until: 'cycles', target: null, monthBudget: C.sources[sourceId].months * 5, remainingMonthsReserve: 1, ...overrides });
    h.activityMutation = (snapshot: any, ownerId = 'source-page-a') => ({ commandId: crypto.randomUUID(),
      runId: snapshot.state.core.runId, expectedRevision: snapshot.state.core.revision,
      expectedActivityId: snapshot.activity?.id ?? null, expectedActivityRevision: snapshot.activity?.revision ?? null, ownerId });
    h.activityTick = (snapshot: any) => ({ commandId: snapshot.activity.nextCommand.commandId,
      runId: snapshot.state.core.runId, expectedRevision: snapshot.state.core.revision, activityId: snapshot.activity.id,
      expectedActivityRevision: snapshot.activity.revision, ownerId: snapshot.activity.ownerId, generation: snapshot.activity.generation });
    h.sourceFixture = async (name: string, sourceId = 'herbs', options: any = {}) => {
      const d = h.routes.driver();
      if (options.fullXp) d.meditate();
      d.go(sourceId === 'work' || sourceId === 'core' ? 'sect' : 'wilderness');
      // Explicit validity-checked boundary fixtures; these are not player progression or balance evidence.
      const game = structuredClone(d.game);
      if (options.remainingMonths !== undefined) game.core.world.elapsedMonths =
        C.realms[game.core.player.realm].lifespanMonths - game.core.player.startAgeMonths - options.remainingMonths;
      if (options.herbQuantity !== undefined) game.core.inventory.herb = options.herbQuantity;
      h.engine.validateGame(game);
      const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
  });
});

test('two material cycles save separately at full cultivation, never reward early, and retain a complete receipt replay', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.sourceFixture('source-materials', 'herbs', { fullXp: true });
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.sourcePlan('herbs', { maxCycles: 2 }), h.activityMutation(snapshot));
      const tick = h.activityTick(started), early = await h.attempt(() => repo.settleActivity(tick));
      const before = await repo.loadActivitySnapshot(); now = started.activity.dueAt;
      const first = await repo.settleActivity(tick); now = first.activity.dueAt + 86_400_000;
      const second = await repo.settleActivity(h.activityTick(first)), replay = await repo.settleActivity(tick);
      return { snapshot, started, early, before, first, second, replay, previous: await repo.loadPrevious(), persisted: await repo.loadActivitySnapshot() };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.started.activity.version).toBe(2); expect(r.started.activity.cycleMs).toBe(30_000);
  expect(r.started.state).toEqual(r.snapshot.state); expect(r.early.code).toBe('ACTIVITY_NOT_DUE');
  expect(r.before).toEqual({ state: r.started.state, activity: r.started.activity });
  for (const outcome of [r.first, r.second]) {
    expect(outcome.result.type).toBe('SOURCE'); expect(outcome.result.requestedSteps).toBe(1); expect(outcome.result.executedSteps).toBe(1);
    expect(outcome.result.delta.xp).toBe(0); expect(outcome.result.delta.inventory).toEqual({ herb: 2 });
    expect(outcome.state.core.player.realm).toBe('qi'); expect(outcome.state.core.player.xp).toBe(1000);
  }
  expect(r.first.activity.status).toBe('running'); expect(r.first.activity.completedCycles).toBe(1);
  expect(r.second.activity.completedCycles).toBe(2); expect(r.second.activity.status).toBe('stopped');
  expect(r.second.activity.stopReason.code).toBe('CYCLES_COMPLETE'); expect(r.second.activity.gainedItems).toEqual({ herb: 4 });
  expect(r.second.activity.gainedStones).toBe(0); expect(r.second.activity.spentStones).toBe(0); expect(r.second.activity.spentMonths).toBe(24);
  expect(r.second.state.core.inventory.herb).toBe(r.snapshot.state.core.inventory.herb + 4);
  expect(r.previous).toEqual(r.first.state); expect(r.persisted).toEqual({ state: r.second.state, activity: r.second.activity });
  expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.second.state);
  expect(r.replay.activity).toEqual(r.second.activity); expect(r.replay.result).toEqual(r.first.result);
});

test('item and currency targets stop after a real complete cycle and zero-XP work remains productive', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, realNow = Date.now, rows = []; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const sourceId of ['herbs', 'work']) {
        const { repo, snapshot } = await h.sourceFixture('source-target-' + sourceId, sourceId, { fullXp: true });
        try {
          const target = sourceId === 'herbs' ? { kind: 'item', id: 'herb', quantity: snapshot.state.core.inventory.herb + 3 } :
            { kind: 'stones', quantity: snapshot.state.core.player.stones + 30 };
          let outcome = await repo.startActivity(h.sourcePlan(sourceId, { until: 'target', target }), h.activityMutation(snapshot));
          const commands = [];
          while (outcome.activity.status === 'running') {
            commands.push(outcome.activity.nextCommand); now = outcome.activity.dueAt;
            outcome = await repo.settleActivity(h.activityTick(outcome));
          }
          const stored = await repo.loadActivitySnapshot(), invalidResume = await h.attempt(() => repo.resumeActivity(h.activityMutation(stored)));
          rows.push({ sourceId, snapshot, target, outcome, commands, stored, invalidResume });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  for (const row of r) {
    expect(row.outcome.activity.completedCycles).toBe(2); expect(row.outcome.activity.stopReason.code).toBe('TARGET_MET');
    expect(row.outcome.activity.spentMonths).toBe(24); expect(row.outcome.activity.gainedXp).toBe(0);
    expect(row.outcome.activity.nextCommand).toBeNull(); expect(row.stored).toEqual({ state: row.outcome.state, activity: row.outcome.activity });
    expect(row.invalidResume.code).toBe('ACTIVITY_STOPPED');
    for (const command of row.commands) {
      expect(command.sourceId).toBe(row.sourceId); expect(command.count).toBe(1);
      if (row.sourceId === 'herbs') expect(command.target).toEqual({ item: 'herb', quantity: row.target.quantity });
      else expect(command.target).toBeUndefined();
    }
  }
  expect(r[0].outcome.activity.gainedItems).toEqual({ herb: 4 }); expect(r[0].outcome.activity.gainedStones).toBe(0);
  expect(r[1].outcome.activity.gainedItems).toEqual({}); expect(r[1].outcome.activity.gainedStones).toBe(40);
  expect(r[1].outcome.activity.spentStones).toBe(0); expect(r[1].outcome.state.core.player.stones).toBe(r[1].snapshot.state.core.player.stones + 40);
});

test('month budget, remaining lifespan and capacity stop in the same transaction before another charge', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const cap = 1_000_000;
      for (const mode of ['budget', 'reserve', 'capacity']) {
        const options = mode === 'reserve' ? { remainingMonths: 14 } : mode === 'capacity' ? { herbQuantity: cap - 2 } : {};
        const { repo, snapshot } = await h.sourceFixture('source-stop-' + mode, 'herbs', options);
        try {
          const plan = h.sourcePlan('herbs', mode === 'budget' ? { monthBudget: 12 } : mode === 'reserve' ? { remainingMonthsReserve: 2 } : {});
          const started = await repo.startActivity(plan, h.activityMutation(snapshot)); now = started.activity.dueAt;
          const completed = await repo.settleActivity(h.activityTick(started));
          const noTick = await h.attempt(() => repo.settleActivity(h.activityTick(started)));
          rows.push({ mode, snapshot, completed, noTick, persisted: await repo.loadActivitySnapshot() });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  for (const row of r) {
    expect(row.completed.activity.completedCycles).toBe(1); expect(row.completed.activity.status).toBe('stopped');
    expect(row.completed.activity.stopReason.code).toBe(row.mode === 'budget' ? 'ACTIVITY_BUDGET' : row.mode === 'reserve' ? 'ACTIVITY_RESERVE' : 'CAPACITY');
    expect(row.completed.activity.spentMonths).toBe(12); expect(row.completed.activity.gainedItems).toEqual({ herb: 2 });
    expect(row.completed.state.core.world.elapsedMonths).toBe(row.snapshot.state.core.world.elapsedMonths + 12);
    expect(row.noTick.ok).toBe(true); expect(row.noTick.value.replayed).toBe(true);
    expect(row.persisted).toEqual({ state: row.completed.state, activity: row.completed.activity });
  }
});

for (const mode of ['quota', 'abort']) test(`source ${mode} atomically rolls back all stores and retries the same single cycle once`, async ({ page }) => {
  const r = await page.evaluate(async mode => {
    const h = (globalThis as any).h, name = 'source-fault-' + mode, { repo, snapshot } = await h.sourceFixture(name);
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.sourcePlan(), h.activityMutation(snapshot)), tick = h.activityTick(started);
      now = started.activity.dueAt; const before = await h.inspect(name), put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
        if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE) throw new DOMException('source quota', 'QuotaExceededError');
        const request = put.call(this, value, key!);
        if (mode === 'abort' && this.name === h.FULL_STATE_STORE && key === 'activity') request.addEventListener('success', () => this.transaction.abort());
        return request;
      };
      let failed;
      try { failed = await h.attempt(() => repo.settleActivity(tick)); } finally { IDBObjectStore.prototype.put = put; }
      const after = await h.inspect(name), retried = await repo.settleActivity(tick), replay = await repo.settleActivity(tick);
      return { snapshot, before, failed, after, retried, replay, previous: await repo.loadPrevious() };
    } finally { Date.now = realNow; repo.close(); }
  }, mode);
  expect(r.failed.code).toBe(mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED'); expect(r.after).toEqual(r.before);
  expect(r.retried.activity.completedCycles).toBe(1); expect(r.retried.activity.gainedItems).toEqual({ herb: 2 });
  expect(r.retried.state.core.inventory.herb).toBe(r.snapshot.state.core.inventory.herb + 2);
  expect(r.previous).toEqual(r.snapshot.state); expect(r.replay.replayed).toBe(true);
  expect(r.replay.state).toEqual(r.retried.state); expect(r.replay.activity).toEqual(r.retried.activity);
});

test('source takeover and pause fence old owners and reopening never pays offline time', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'source-ownership', { repo, snapshot } = await h.sourceFixture(name);
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.sourcePlan(), h.activityMutation(snapshot)), oldTick = h.activityTick(started);
      const other = await h.FullSaveRepository.open(name);
      try {
        now += 86_400_000;
        const reopened = await other.loadActivitySnapshot(), resumed = await other.resumeActivity(h.activityMutation(reopened, 'source-page-b'));
        const old = await h.attempt(() => repo.settleActivity(oldTick));
        const foreignPause = await h.attempt(() => repo.pauseActivity(h.activityMutation(resumed)));
        const early = await h.attempt(() => other.settleActivity(h.activityTick(resumed))); now = resumed.activity.dueAt;
        const complete = await other.settleActivity(h.activityTick(resumed));
        const paused = await other.pauseActivity(h.activityMutation(complete, 'source-page-b'));
        now += 86_400_000;
        const pausedTick = await h.attempt(() => other.settleActivity(h.activityTick(complete)));
        return { snapshot, started, reopened, resumed, old, foreignPause, early, complete, paused, pausedTick, persisted: await other.loadActivitySnapshot() };
      } finally { other.close(); }
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.reopened).toEqual({ state: r.started.state, activity: r.started.activity }); expect(r.resumed.state).toEqual(r.snapshot.state);
  expect(r.resumed.activity.completedCycles).toBe(0); expect(r.resumed.activity.dueAt - r.resumed.activity.startedAt).toBe(30_000);
  expect(r.old.ok).toBe(false); expect(r.foreignPause.code).toBe('ACTIVITY_OWNER'); expect(r.early.code).toBe('ACTIVITY_NOT_DUE');
  expect(r.complete.activity.completedCycles).toBe(1); expect(r.paused.activity.status).toBe('paused'); expect(r.pausedTick.ok).toBe(false);
  expect(r.persisted).toEqual({ state: r.paused.state, activity: r.paused.activity });
});

test('ordinary SOURCE batches are blocked and explicit travel replaces a paused source without extra payout', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.sourceFixture('source-write-boundary');
    try {
      const results = [];
      for (const count of [1, 50]) results.push(await h.attempt(() => repo.execute(h.command(snapshot.state, { type: 'SOURCE', sourceId: 'herbs', count }))));
      const started = await repo.startActivity(h.sourcePlan(), h.activityMutation(snapshot));
      const blocked = await h.attempt(() => repo.execute(h.command(started.state, { type: 'TRAVEL', location: 'sect' })));
      const arrangedBlocked = await h.attempt(() => repo.startActivity({ kind: 'travel', location: 'sect', maxCycles: 1 }, h.activityMutation(started)));
      const paused = await repo.pauseActivity(h.activityMutation(started));
      const travel = await h.finishAction(repo, { type: 'TRAVEL', location: 'sect' });
      const persisted = await repo.loadActivitySnapshot();
      const replacement = await repo.startActivity(h.sourcePlan('work'), h.activityMutation(persisted));
      return { snapshot, results, blocked, arrangedBlocked, paused, travel, persisted, replacement, archives: await repo.archives() };
    } finally { repo.close(); }
  });
  for (const result of r.results) expect(result.code).toBe('ACTIVITY_REQUIRED'); expect(r.blocked.code).toBe('ACTIVITY_REQUIRED'); expect(r.arrangedBlocked.code).toBe('ACTIVITY_RUNNING');
  expect(r.persisted.state).toEqual(r.travel.state); expect(r.persisted.activity.status).toBe('stopped');
  expect(r.persisted.activity.plan.kind).toBe('travel'); expect(r.persisted.activity.stopReason.code).toBe('CYCLES_COMPLETE'); expect(r.persisted.activity.gainedItems).toEqual({});
  expect(r.travel.state.core.inventory).toEqual(r.snapshot.state.core.inventory);
  expect(r.replacement.activity.plan.sourceId).toBe('work'); expect(r.replacement.activity.completedCycles).toBe(0);
  expect(r.archives.some((row: any) => row.value?.id === r.persisted.activity.id)).toBe(true);
  expect(r.archives.find((row: any) => row.value?.id === r.paused.activity.id)?.value).toEqual(r.paused.activity);
});

test('source receipts reject a forged different source, target or owner instead of broadening activity authority', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.sourceFixture('source-receipt-contract');
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.sourcePlan('herbs', { until: 'target', target: { kind: 'item', id: 'herb', quantity: 8 } }), h.activityMutation(snapshot));
      const tick = h.activityTick(started); now = started.activity.dueAt;
      const completed = await repo.settleActivity(tick), raw = await h.inspect('source-receipt-contract');
      const key = tick.runId + ':' + tick.commandId, original = raw[h.FULL_RECEIPT_STORE].find((row: any) => row.key === key).value;
      const rows = [];
      for (const change of ['source', 'target', 'owner', 'result']) {
        const damaged = structuredClone(original);
        if (change === 'source') damaged.command.sourceId = 'dew';
        if (change === 'target') damaged.command.target.quantity += 1;
        if (change === 'owner') damaged.activity.ownerId = 'forged-owner';
        if (change === 'result') damaged.result.delta.inventory.herb += 1;
        await h.put('source-receipt-contract', h.FULL_RECEIPT_STORE, key, damaged);
        const before = await h.inspect('source-receipt-contract'), rejected = await h.attempt(() => repo.settleActivity(tick)), after = await h.inspect('source-receipt-contract');
        rows.push({ change, before, rejected, after });
      }
      await h.put('source-receipt-contract', h.FULL_RECEIPT_STORE, key, original);
      return { rows, completed, replay: await repo.settleActivity(tick) };
    } finally { Date.now = realNow; repo.close(); }
  });
  for (const row of r.rows) { expect(row.rejected.code).toBe('RECEIPT_INVALID'); expect(row.after).toEqual(row.before); }
  expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.completed.state); expect(r.replay.activity).toEqual(r.completed.activity);
});

test('v4 cultivation activity, real breakthrough checkpoint and all receipts survive v5 without offline growth', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    const fixture = await h.FullSaveRepository.open('source-v4-original');
    const plan = { kind: 'cultivation', method: 'natural', maxCycles: 3, until: 'xp-cap', stoneBudget: 0, stoneReserve: 0 };
    try {
      let state = (await fixture.importText(JSON.stringify(h.legacyRuleEngine.newGame('旧版真实修士', 'old-source-v4')), h.mutation())).state;
      state = (await h.finishAction(fixture, { type: 'CHOOSE', choice: 'leave' })).state;
      state = (await h.finishAction(fixture, { type: 'TRAVEL', location: 'cave' })).state;
      let activity = await fixture.startActivity(plan, h.activityMutation(await fixture.loadActivitySnapshot()));
      while (activity.activity.status === 'running') { now = activity.activity.dueAt; activity = await fixture.settleActivity(h.activityTick(activity)); }
      state = (await h.finishAction(fixture, { type: 'BREAKTHROUGH' })).state;
      activity = await fixture.startActivity(plan, h.activityMutation(await fixture.loadActivitySnapshot()));
      const tick = h.activityTick(activity); now = activity.activity.dueAt;
      const completed = await fixture.settleActivity(tick), checkpoint = await fixture.loadCheckpoint(), original = h.legacyDatabaseFixture(await h.inspect('source-v4-original'),4);
      fixture.close();
      const old = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('source-v4', 4);
        request.onupgradeneeded = () => { for (const name of original.stores) request.result.createObjectStore(name); };
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = old.transaction(original.stores, 'readwrite');
        for (const name of original.stores) for (const row of original[name]) tx.objectStore(name).put(row.value, row.key);
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
      });
      let closed = false; old.onversionchange = () => { closed = true; old.close(); };
      now += 86_400_000;
      const upgraded = await h.FullSaveRepository.open('source-v4');
      try {
        const loaded = await upgraded.loadActivitySnapshot(), after = await h.inspect('source-v4');
        const replay = await upgraded.settleActivity(tick);
        const oldProgram = await h.attempt(() => new Promise((resolve, reject) => {
          const request = indexedDB.open('source-v4', 4);
          request.onsuccess = () => { request.result.close(); resolve(true); }; request.onerror = () => reject(request.error);
        }));
        return { closed, completed, checkpoint, original, loaded, after, replay, oldProgram, checkpointAfter: await upgraded.loadCheckpoint(), targetVersion: h.FULL_DB_VERSION };
      } finally { upgraded.close(); old.close(); }
    } finally { Date.now = realNow; fixture.close(); }
  });
  expect(r.closed).toBe(true); expect(r.after.version).toBe(r.targetVersion); expect(r.loaded.activity.version).toBe(1);
  for (const name of r.original.stores) expect(r.after[name]).toEqual(r.original[name]);
  expect(r.loaded).toEqual({ state: r.completed.state, activity: r.completed.activity });
  expect(r.loaded.state.core.contentVersion).toBe('full-demo.3'); expect(r.loaded.activity).not.toHaveProperty('rulesVersion'); expect(r.checkpointAfter).toEqual(r.checkpoint); expect(r.replay.replayed).toBe(true);
  expect(r.replay.state).toEqual(r.completed.state); expect(r.replay.activity).toEqual(r.completed.activity);
  expect(r.oldProgram.ok).toBe(false); expect(r.oldProgram.name).toBe('VersionError');
});
