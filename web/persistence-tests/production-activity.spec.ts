import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

import {repositoryFsRoot as root} from './fs-root';
test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(async root => {
    const h = (globalThis as any).h;
    h.productionContent = await import(`/@fs${root}src/full/content.ts`);
    h.productionPlan = (kind = 'craft', id = 'healing', overrides: any = {}) => {
      const C = h.productionContent, entry = kind === 'craft' ? C.recipes[id] : C.relics[id];
      return { kind, ...(kind === 'craft' ? { recipeId: id, maxCycles: 5, until: 'cycles', targetQuantity: null } : { relicId: id, maxCycles: 1 }),
        stoneBudget: entry.stones * (kind === 'craft' ? 5 : 1), stoneReserve: 0,
        monthBudget: (kind === 'craft' ? entry.months * 5 : C.actionDurations.forge), remainingMonthsReserve: 1, itemReserves: {}, ...overrides };
    };
    h.activityMutation = (snapshot: any, ownerId = 'production-page-a') => ({ commandId: crypto.randomUUID(),
      runId: snapshot.state.core.runId, expectedRevision: snapshot.state.core.revision,
      expectedActivityId: snapshot.activity?.id ?? null, expectedActivityRevision: snapshot.activity?.revision ?? null, ownerId });
    h.activityTick = (snapshot: any) => ({ commandId: snapshot.activity.nextCommand.commandId,
      runId: snapshot.state.core.runId, expectedRevision: snapshot.state.core.revision, activityId: snapshot.activity.id,
      expectedActivityRevision: snapshot.activity.revision, ownerId: snapshot.activity.ownerId, generation: snapshot.activity.generation });
    h.productionFixture = async (name: string, kind = 'craft', id = 'healing', options: any = {}) => {
      const C = h.productionContent, entry = kind === 'craft' ? C.recipes[id] : C.relics[id], d = h.routes.driver();
      while (C.rank(d.game.core.player.realm) < C.rank(kind === 'craft' ? entry.min : 'golden')) d.realm();
      for (const [item, count] of Object.entries(entry.inputs)) d.resource(item, (count as number) * 5);
      d.funds(entry.stones * 5 + 100); d.go('cave');
      // These validity-checked boundary fixtures prove stopping rules, not player progression or balance.
      const game = structuredClone(d.game);
      if (options.remainingMonths !== undefined) game.core.world.elapsedMonths =
        C.realms[game.core.player.realm].lifespanMonths - game.core.player.startAgeMonths - options.remainingMonths;
      if (options.inventory) Object.assign(game.core.inventory, options.inventory);
      if (options.stones !== undefined) game.core.player.stones = options.stones;
      if (options.ownedRelics) game.ownedRelics = options.ownedRelics;
      if (options.relic !== undefined) game.loadout.relic = options.relic;
      h.engine.validateGame(game);
      const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
  }, root);
});

test('two real-formula furnaces settle separately, retain gross products and consumed herbs, and replay no new rewards', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.productionFixture('production-two-furnaces');
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.productionPlan('craft', 'healing', { maxCycles: 2 }), h.activityMutation(snapshot));
      const tick = h.activityTick(started), early = await h.attempt(() => repo.settleActivity(tick)), before = await repo.loadActivitySnapshot();
      now = started.activity.dueAt; const first = await repo.settleActivity(tick);
      now = first.activity.dueAt + 86_400_000;
      const second = await repo.settleActivity(h.activityTick(first)), replay = await repo.settleActivity(tick);
      return { snapshot, started, early, before, first, second, replay, previous: await repo.loadPrevious(), persisted: await repo.loadActivitySnapshot() };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.started.state).toEqual(r.snapshot.state); expect(r.started.activity.version).toBe(3);
  expect(r.started.activity.cycleMs).toBe(30_000); expect(r.started.activity.nextCommand.count).toBeUndefined();
  expect(r.early.code).toBe('ACTIVITY_NOT_DUE'); expect(r.before).toEqual({ state: r.started.state, activity: r.started.activity });
  for (const outcome of [r.first, r.second]) {
    expect(outcome.result.type).toBe('CRAFT'); expect(outcome.result.executedSteps).toBe(1); expect(outcome.result.requestedSteps).toBe(1);
    expect(outcome.result.costs).toEqual({ stones: 2, mp: 0, months: 12, items: { herb: 2 } });
    expect(outcome.result.delta.inventory).toEqual({ herb: -2, healing_pill: 1 }); expect(outcome.result.delta.xp).toBe(0);
  }
  expect(r.first.activity.status).toBe('running'); expect(r.second.activity.status).toBe('stopped');
  expect(r.second.activity.completedCycles).toBe(2); expect(r.second.activity.stopReason.code).toBe('CYCLES_COMPLETE');
  expect(r.second.activity.spentItems).toEqual({ herb: 4 }); expect(r.second.activity.gainedItems).toEqual({ healing_pill: 2 });
  expect(r.second.activity.forgedRelics).toEqual([]); expect(r.second.activity.spentStones).toBe(4); expect(r.second.activity.spentMonths).toBe(24);
  expect(r.second.state.core.inventory.herb).toBe(r.snapshot.state.core.inventory.herb - 4);
  expect(r.second.state.core.inventory.healing_pill).toBe(r.snapshot.state.core.inventory.healing_pill + 2);
  expect(r.previous).toEqual(r.first.state); expect(r.persisted).toEqual({ state: r.second.state, activity: r.second.activity });
  expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.second.state); expect(r.replay.result).toEqual(r.first.result);
});

test('all seven recipes and four relics persist their exact formal one-command costs without automatic equipment', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, C = h.productionContent, rows = [], realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const kind of ['craft', 'forge']) for (const [id, entry] of Object.entries(kind === 'craft' ? C.recipes : C.relics) as [string, any][]) {
        const { repo, snapshot } = await h.productionFixture('production-formula-' + kind + id, kind, id);
        try {
          const started = await repo.startActivity(h.productionPlan(kind, id, { maxCycles: 1 }), h.activityMutation(snapshot));
          const command = started.activity.nextCommand, expected = h.engine.resolve(snapshot.state, command);
          now = started.activity.dueAt; const completed = await repo.settleActivity(h.activityTick(started));
          const secondStart = kind === 'forge' ? await h.attempt(() => repo.startActivity(h.productionPlan(kind, id), h.activityMutation(completed))) : null;
          rows.push({ kind, id, entry, snapshot, command, expected, completed, secondStart, persisted: await repo.loadActivitySnapshot() });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  expect(rows).toHaveLength(11);
  for (const row of rows) {
    expect(row.completed.state).toEqual(row.expected.nextState); expect(row.completed.result).toEqual(row.expected.result);
    expect(row.command.count).toBeUndefined(); expect(row.completed.activity.completedCycles).toBe(1);
    expect(row.completed.activity.spentItems).toEqual(row.entry.inputs); expect(row.completed.activity.spentStones).toBe(row.entry.stones);
    expect(row.completed.activity.spentMonths).toBe(row.kind === 'craft' ? row.entry.months : 24);
    expect(row.completed.state.loadout).toEqual(row.snapshot.state.loadout); expect(row.completed.state.core.player.realm).toBe(row.snapshot.state.core.player.realm);
    expect(row.persisted).toEqual({ state: row.completed.state, activity: row.completed.activity });
    if (row.kind === 'craft') {
      expect(row.completed.activity.version).toBe(3); expect(row.completed.activity.gainedItems).toEqual({ [row.entry.output]: 1 });
      expect(row.completed.activity.forgedRelics).toEqual([]);
    } else {
      expect(row.completed.activity.version).toBe(4); expect(row.completed.activity.gainedItems).toEqual({});
      expect(row.completed.activity.forgedRelics).toEqual([row.id]); expect(row.completed.state.ownedRelics).toContain(row.id);
      expect(row.secondStart.code).toBe('ALREADY_OWNED');
    }
  }
});

test('inventory target, cumulative budgets, material and resource reserves, shortages and capacity stop before another furnace', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, C = h.productionContent, rows = [], realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const mode of ['target', 'stoneBudget', 'monthBudget', 'itemReserve', 'stoneReserve', 'lifespan', 'shortage', 'capacity']) {
        const options = mode === 'lifespan' ? { remainingMonths: 14 } : mode === 'shortage' ? { inventory: { herb: 2 } } :
          mode === 'capacity' ? { inventory: { healing_pill: C.maxQuantity - 1 } } : {};
        const { repo, snapshot } = await h.productionFixture('production-stop-' + mode, 'craft', 'healing', options);
        try {
          const overrides = mode === 'target' ? { until: 'target', targetQuantity: snapshot.state.core.inventory.healing_pill + 1 } :
            mode === 'stoneBudget' ? { stoneBudget: 2 } : mode === 'monthBudget' ? { monthBudget: 12 } :
            mode === 'itemReserve' ? { itemReserves: { herb: snapshot.state.core.inventory.herb - 2 } } :
            mode === 'stoneReserve' ? { stoneReserve: snapshot.state.core.player.stones - 2 } :
            mode === 'lifespan' ? { remainingMonthsReserve: 2 } : {};
          const started = await repo.startActivity(h.productionPlan('craft', 'healing', overrides), h.activityMutation(snapshot));
          now = started.activity.dueAt; const completed = await repo.settleActivity(h.activityTick(started));
          rows.push({ mode, snapshot, completed, persisted: await repo.loadActivitySnapshot(), resume: await h.attempt(() => repo.resumeActivity(h.activityMutation(completed))) });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  const codes: Record<string, string> = { target: 'TARGET_MET', stoneBudget: 'ACTIVITY_BUDGET', monthBudget: 'ACTIVITY_BUDGET',
    itemReserve: 'ACTIVITY_RESERVE', stoneReserve: 'ACTIVITY_RESERVE', lifespan: 'ACTIVITY_RESERVE', shortage: 'INSUFFICIENT_ITEM', capacity: 'CAPACITY' };
  for (const row of rows) {
    expect(row.completed.activity.completedCycles).toBe(1); expect(row.completed.activity.status).toBe('stopped');
    expect(row.completed.activity.stopReason.code).toBe(codes[row.mode]); expect(row.resume.code).toBe('ACTIVITY_STOPPED');
    expect(row.completed.activity.spentItems).toEqual({ herb: 2 }); expect(row.completed.activity.gainedItems).toEqual({ healing_pill: 1 });
    expect(row.completed.activity.spentStones).toBe(2); expect(row.completed.activity.spentMonths).toBe(12);
    expect(row.completed.state.core.player.stones).toBe(row.snapshot.state.core.player.stones - 2);
    expect(row.persisted).toEqual({ state: row.completed.state, activity: row.completed.activity });
  }
});

for (const kind of ['craft', 'forge']) for (const mode of ['quota', 'abort', 'lost-delivery']) test(`${kind} ${mode} preserves atomic costs, outcome and stable-command retry`, async ({ page }) => {
  const r = await page.evaluate(async ({ kind, mode }) => {
    const h = (globalThis as any).h, name = 'production-fault-' + kind + mode, id = kind === 'craft' ? 'healing' : 'frost_sword';
    const { repo, snapshot } = await h.productionFixture(name, kind, id);
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.productionPlan(kind, id, { maxCycles: kind === 'craft' ? 2 : 1 }), h.activityMutation(snapshot));
      const tick = h.activityTick(started); now = started.activity.dueAt;
      const before = await h.inspect(name), put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
        if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE) throw new DOMException('production quota', 'QuotaExceededError');
        const request = put.call(this, value, key!);
        if (mode === 'abort' && this.name === h.FULL_STATE_STORE && key === 'activity') request.addEventListener('success', () => this.transaction.abort());
        return request;
      };
      let failed;
      try { failed = await h.attempt(async () => { const value = await repo.settleActivity(tick); if (mode === 'lost-delivery') throw new Error('delivery lost after production commit'); return value; }); }
      finally { IDBObjectStore.prototype.put = put; }
      const after = await h.inspect(name), retried = await repo.settleActivity(tick), replay = await repo.settleActivity(tick);
      return { kind, mode, snapshot, before, after, failed, retried, replay, previous: await repo.loadPrevious() };
    } finally { Date.now = realNow; repo.close(); }
  }, { kind, mode });
  expect(r.failed.ok).toBe(false);
  if (mode !== 'lost-delivery') {
    expect(r.failed.code).toBe(mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED'); expect(r.after).toEqual(r.before);
  }
  expect(r.retried.replayed).toBe(mode === 'lost-delivery'); expect(r.retried.activity.completedCycles).toBe(1);
  expect(r.retried.activity.spentItems).toEqual(kind === 'craft' ? { herb: 2 } : { jade: 3, core: 1 });
  expect(r.retried.activity.gainedItems).toEqual(kind === 'craft' ? { healing_pill: 1 } : {});
  expect(r.retried.activity.forgedRelics).toEqual(kind === 'craft' ? [] : ['frost_sword']);
  if (kind === 'forge') { expect(r.snapshot.state.ownedRelics).not.toContain('frost_sword'); expect(r.retried.state.ownedRelics).toContain('frost_sword'); }
  expect(r.previous).toEqual(r.snapshot.state); expect(r.replay.replayed).toBe(true);
  expect(r.replay.state).toEqual(r.retried.state); expect(r.replay.activity).toEqual(r.retried.activity);
});

test('production pause, explicit takeover, refresh and new-life archive fence old cycles without offline payout', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'production-owners', { repo, snapshot } = await h.productionFixture(name, 'forge', 'frost_sword',
      { ownedRelics: ['jade_seal'], relic: 'jade_seal' });
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.productionPlan('forge', 'frost_sword'), h.activityMutation(snapshot)), oldTick = h.activityTick(started);
      const paused = await repo.pauseActivity(h.activityMutation(started)); repo.close(); now += 86_400_000;
      const reopened = await h.FullSaveRepository.open(name);
      try {
        const before = await reopened.loadActivitySnapshot(), resumed = await reopened.resumeActivity(h.activityMutation(before, 'production-page-b'));
        const stale = await h.attempt(() => reopened.settleActivity(oldTick));
        const foreignPause = await h.attempt(() => reopened.pauseActivity(h.activityMutation(resumed)));
        const early = await h.attempt(() => reopened.settleActivity(h.activityTick(resumed))); now = resumed.activity.dueAt;
        const completed = await reopened.settleActivity(h.activityTick(resumed));
        const equipped = await reopened.configure({ command: h.command(completed.state, { type: 'EQUIP_RELIC', relic: 'frost_sword' }),
          expectedActivityId: completed.activity.id, expectedActivityRevision: completed.activity.revision });
        const afterEquipment = await reopened.loadActivitySnapshot(), historicReplay = await reopened.settleActivity(h.activityTick(resumed));
        const replacement = await reopened.create('新的人生', h.mutation(equipped.state));
        const old = await h.attempt(() => reopened.settleActivity(h.activityTick(resumed)));
        return { snapshot, started, paused, before, resumed, stale, foreignPause, early, completed, equipped, afterEquipment, historicReplay, replacement, old,
          persisted: await reopened.loadActivitySnapshot(), archives: await reopened.archives() };
      } finally { reopened.close(); }
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.before).toEqual({ state: r.snapshot.state, activity: r.paused.activity }); expect(r.resumed.state).toEqual(r.snapshot.state);
  expect(r.resumed.activity.dueAt - r.resumed.activity.startedAt).toBe(60_000); expect(r.resumed.activity.completedCycles).toBe(0);
  expect(r.stale.ok).toBe(false); expect(r.foreignPause.code).toBe('ACTIVITY_OWNER'); expect(r.early.code).toBe('ACTIVITY_NOT_DUE');
  expect(r.completed.activity.forgedRelics).toEqual(['frost_sword']); expect(r.completed.state.loadout.relic).toBe('jade_seal');
  expect(r.completed.activity.relicBefore).toBe('jade_seal'); expect(r.completed.state.ownedRelics).toEqual(['jade_seal', 'frost_sword']);
  expect(r.equipped.state.loadout.relic).toBe('frost_sword'); expect(r.afterEquipment.state).toEqual(r.equipped.state);
  expect(r.afterEquipment.activity.stopReason.code).toBe('STATE_CHANGED');
  expect(r.historicReplay.replayed).toBe(true); expect(r.historicReplay.state).toEqual(r.equipped.state);
  expect(r.historicReplay.result).toEqual(r.completed.result);
  expect(r.persisted.activity).toBeNull(); expect(r.persisted.state).toEqual(r.replacement.state); expect(r.old.code).toBe('RUN_MISMATCH');
  expect(r.archives.some((row: any) => row.value?.id === r.completed.activity.id)).toBe(true);
});

test('ordinary production writes cannot bypass cycles and damaged recipe, outcome, ownership or equipment receipts remain untouched', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const kind of ['craft', 'forge']) {
        const id = kind === 'craft' ? 'healing' : 'frost_sword', name = 'production-receipts-' + kind;
        const { repo, snapshot } = await h.productionFixture(name, kind, id);
        try {
          const direct = await h.attempt(() => repo.execute(h.command(snapshot.state, kind === 'craft' ? { type: 'CRAFT', recipeId: id } : { type: 'FORGE', relic: id })));
          const started = await repo.startActivity(h.productionPlan(kind, id, { maxCycles: 1 }), h.activityMutation(snapshot));
          const tick = h.activityTick(started); now = started.activity.dueAt;
          const completed = await repo.settleActivity(tick), raw = await h.inspect(name), key = tick.runId + ':' + tick.commandId;
          const original = raw[h.FULL_RECEIPT_STORE].find((row: any) => row.key === key).value, failures = [];
          for (const change of ['command', 'costs', 'inventory', 'totals', 'owner', ...(kind === 'forge' ? ['relicBefore', 'forgedRelics'] : [])]) {
            const damaged = structuredClone(original);
            if (change === 'command') { if (kind === 'craft') damaged.command.recipeId = 'spirit'; else damaged.command.relic = 'jade_seal'; }
            if (change === 'costs') damaged.result.costs.stones += 1;
            if (change === 'inventory') damaged.result.delta.inventory.herb = -99;
            if (change === 'totals') damaged.activity.spentItems = {};
            if (change === 'owner') damaged.activity.ownerId = 'forged-owner';
            if (change === 'relicBefore') damaged.activity.relicBefore = 'jade_seal';
            if (change === 'forgedRelics') damaged.activity.forgedRelics = ['jade_seal'];
            await h.put(name, h.FULL_RECEIPT_STORE, key, damaged);
            const before = await h.inspect(name), rejected = await h.attempt(() => repo.settleActivity(tick)), after = await h.inspect(name);
            failures.push({ change, before, rejected, after });
          }
          await h.put(name, h.FULL_RECEIPT_STORE, key, original);
          rows.push({ kind, direct, completed, failures, replay: await repo.settleActivity(tick) });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  for (const row of rows) {
    expect(row.direct.code).toBe('ACTIVITY_REQUIRED');
    for (const failure of row.failures) { expect(failure.rejected.code, failure.change).toBe('RECEIPT_INVALID'); expect(failure.after).toEqual(failure.before); }
    expect(row.replay.replayed).toBe(true); expect(row.replay.state).toEqual(row.completed.state); expect(row.replay.activity).toEqual(row.completed.activity);
  }
});

test('v5 cultivation and source activities, complete resources, real checkpoint and receipts survive v6 byte-for-byte', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const kind of ['cultivation', 'source']) {
        const name = 'production-v5-' + kind, fixture = await h.FullSaveRepository.open(name + '-original'), d = h.legacyRuleRoutes.driver();
        try {
          let state = (await fixture.importText(JSON.stringify(d.checkpoints.mortal), h.mutation())).state;
          state = (await h.finishAction(fixture, { type: 'BREAKTHROUGH' })).state;
          const location = kind === 'source' ? 'wilderness' : 'cave';
          if (state.core.world.location !== location) state = (await h.finishAction(fixture, { type: 'TRAVEL', location })).state;
          const plan = kind === 'cultivation' ? { kind, method: 'natural', maxCycles: 3, until: 'cycles', stoneBudget: 0, stoneReserve: 0 } :
            { kind, sourceId: 'herbs', maxCycles: 3, until: 'cycles', target: null, monthBudget: 3, remainingMonthsReserve: 1 };
          const started = await fixture.startActivity(plan, h.activityMutation(await fixture.loadActivitySnapshot())), tick = h.activityTick(started);
          now = started.activity.dueAt; const completed = await fixture.settleActivity(tick), checkpoint = await fixture.loadCheckpoint(), original = await h.inspect(name + '-original');
          fixture.close();
          const old = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(name, 5);
            request.onupgradeneeded = () => { for (const store of original.stores) request.result.createObjectStore(store); };
            request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
          });
          await new Promise<void>((resolve, reject) => {
            const tx = old.transaction(original.stores, 'readwrite');
            for (const store of original.stores) for (const row of original[store]) tx.objectStore(store).put(row.value, row.key);
            tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
          });
          let closed = false; old.onversionchange = () => { closed = true; old.close(); }; now += 86_400_000;
          const upgraded = await h.FullSaveRepository.open(name);
          try {
            const loaded = await upgraded.loadActivitySnapshot(), after = await h.inspect(name), replay = await upgraded.settleActivity(tick);
            const oldProgram = await h.attempt(() => new Promise((resolve, reject) => {
              const request = indexedDB.open(name, 5);
              request.onsuccess = () => { request.result.close(); resolve(true); }; request.onerror = () => reject(request.error);
            }));
            rows.push({ kind, closed, original, completed, checkpoint, loaded, after, replay, oldProgram, checkpointAfter: await upgraded.loadCheckpoint() });
          } finally { upgraded.close(); old.close(); }
        } finally { fixture.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  for (const row of rows) {
    expect(row.closed).toBe(true); expect(row.after.version).toBe(9); expect(row.checkpoint).not.toBeNull();
    for (const store of row.original.stores) expect(row.after[store]).toEqual(row.original[store]);
    expect(row.loaded.state.core.contentVersion).toBe('full-demo.3'); expect(row.loaded.activity).not.toHaveProperty('rulesVersion'); expect(row.loaded.activity.version).toBe(row.kind === 'cultivation' ? 1 : 2);
    expect(row.loaded).toEqual({ state: row.completed.state, activity: row.completed.activity }); expect(row.checkpointAfter).toEqual(row.checkpoint);
    expect(row.replay.replayed).toBe(true); expect(row.replay.state).toEqual(row.completed.state); expect(row.replay.activity).toEqual(row.completed.activity);
    expect(row.oldProgram.ok).toBe(false); expect(row.oldProgram.name).toBe('VersionError');
  }
});
