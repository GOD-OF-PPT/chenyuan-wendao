import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import {repositoryFsRoot as root} from './fs-root';

test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(async root => {
    const h = (globalThis as any).h; h.adventureReceipts = await import(`/@fs${root}src/full/receipts.ts`);
    h.adventureMutation = (s: any, ownerId = 'adventure-page-a') => ({ commandId: crypto.randomUUID(), runId: s.state.core.runId,
      expectedRevision: s.state.core.revision, expectedActivityId: s.activity?.id ?? null, expectedActivityRevision: s.activity?.revision ?? null, ownerId });
    h.adventureTick = (s: any) => ({ commandId: s.activity.nextCommand.commandId, runId: s.state.core.runId, expectedRevision: s.state.core.revision,
      activityId: s.activity.id, expectedActivityRevision: s.activity.revision, ownerId: s.activity.ownerId, generation: s.activity.generation });
    h.adventureFixture = async (name: string, kind = 'travel', move = 'attack') => {
      const d = h.routes.driver(); d.realm(); d.realm(); d.funds(500); d.buy('healing_pill', 3); d.buy('spirit_pill', 3);
      d.go(kind === 'travel' ? 'cave' : 'wilderness');
      if (kind === 'battle') { d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' }); if (move === 'release') d.doAction({ type: 'BATTLE', move: 'technique' }); }
      const game = structuredClone(d.game);
      // Valid boundary states exercise real medicine formulas; they do not stand in for a normal player route.
      if (move === 'heal') game.core.player.hp = 30;
      if (move === 'restore') game.core.player.mp = 0;
      h.engine.validateGame(game); const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(game), h.mutation()); return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
  }, root);
});

test('travel waits for its exact deadline, saves one formal arrival and keeps a complete immutable history entry', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.adventureFixture('adventure-travel'), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const a = await repo.startActivity({ kind: 'travel', location: 'wilderness', maxCycles: 1 }, h.adventureMutation(snapshot));
      const tick = h.adventureTick(a), expected = h.engine.resolve(snapshot.state, a.activity.nextCommand), rawBefore = await h.inspect('adventure-travel');
      now = a.activity.dueAt - 1; const early = await h.attempt(() => repo.settleActivity(tick)), rawEarly = await h.inspect('adventure-travel');
      now++; const completed = await repo.settleActivity(tick), beforeHistory = await h.inspect('adventure-travel'), history = await repo.loadActivityHistory(a.activity.id);
      const replay = await repo.settleActivity(tick), afterHistory = await h.inspect('adventure-travel');
      return { a, expected, early, rawBefore, rawEarly, completed, history, replay, beforeHistory, afterHistory, previous: await repo.loadPrevious() };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.a.activity.cycleMs).toBe(6000); expect(r.early.code).toBe('ACTIVITY_NOT_DUE'); expect(r.rawEarly).toEqual(r.rawBefore);
  expect(r.completed.state).toEqual(r.expected.nextState); expect(r.completed.result).toEqual(r.expected.result); expect(r.completed.activity.status).toBe('stopped');
  expect(r.completed.activity.completedCycles).toBe(1); expect(r.completed.activity.decisionGame).toEqual(r.completed.state); expect(r.completed.activity.originGame).toEqual(r.previous);
  expect(r.history.total).toBe(1); expect(r.history.pages).toBe(1); expect(r.history.rows[0]).toEqual({ command: r.a.activity.nextCommand, result: r.completed.result, activity: r.completed.activity });
  expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.completed.state); expect(r.afterHistory).toEqual(r.beforeHistory);
});

test('an explicit encounter continues through real three-second turns and rewards only a formally won battle', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.adventureFixture('adventure-encounter', 'encounter'), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const plan = h.adventure.defaultEncounterPlan(snapshot.state, 'wolf'); let out = await repo.startActivity(plan, h.adventureMutation(snapshot));
      const steps = [];
      for (let i = 0; out.activity.status === 'running' && i < plan.maxCycles; i++) {
        const before = out, command = out.activity.nextCommand, expected = h.engine.resolve(out.state, command); now = out.activity.dueAt;
        out = await repo.settleActivity(h.adventureTick(out)); steps.push({ before, command, expected, out });
      }
      return { snapshot, plan, steps, out, history: await repo.loadActivityHistory(out.activity.id, 0, 20) };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.steps[0].command.type).toBe('ENCOUNTER'); expect(r.steps[0].before.activity.cycleMs).toBe(30000);
  expect(r.steps[0].out.state.battle.enemy).toBe('wolf'); expect(r.steps[0].out.result.costs.months).toBe(1); expect(r.steps[0].out.result.delta.wins).toBe(0);
  for (const step of r.steps) { expect(step.out.state).toEqual(step.expected.nextState); expect(step.out.result).toEqual(step.expected.result); if (step.command.type === 'BATTLE') expect(step.before.activity.cycleMs).toBe(3000); }
  expect(r.out.activity.status).toBe('stopped'); expect(r.out.activity.encountersStarted).toBe(1); expect(r.out.activity.victories).toBe(1);
  expect(r.out.activity.gainedItems).toEqual({ core: 1 }); expect(r.out.activity.gainedStones).toBe(10); expect(r.out.state.battle).toBeNull();
  expect(r.out.state.core.inventory.core).toBe(r.snapshot.state.core.inventory.core + 1); expect(r.history.total).toBe(r.steps.length);
});

test('all seven manual battle actions use exact formal costs, effects and one complete turn without automatic equipment', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const move of h.adventure.ADVENTURE_MOVES) {
        const { repo, snapshot } = await h.adventureFixture('adventure-move-' + move, 'battle', move);
        try {
          const a = await repo.startActivity(h.adventure.singleBattlePlan(snapshot.state, move), h.adventureMutation(snapshot));
          const expected = h.engine.resolve(snapshot.state, a.activity.nextCommand); now = a.activity.dueAt;
          const out = await repo.settleActivity(h.adventureTick(a)); rows.push({ move, snapshot, a, expected, out, history: await repo.loadActivityHistory(a.activity.id) });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  expect(rows).toHaveLength(7);
  for (const r of rows) {
    expect(r.a.activity.cycleMs).toBe(3000); expect(r.out.state).toEqual(r.expected.nextState); expect(r.out.result).toEqual(r.expected.result);
    expect(r.out.activity.status).toBe('stopped'); expect(r.out.activity.battleTurns).toBe(1); expect(r.out.activity.moves[r.move]).toBe(1);
    expect(r.out.activity.spentMp).toBe(r.out.result.costs.mp); expect(r.out.activity.spentItems).toEqual(r.out.result.costs.items);
    expect(r.out.state.school).toBe(r.snapshot.state.school); expect(r.out.state.loadout).toEqual(r.snapshot.state.loadout); expect(r.history.total).toBe(1);
  }
  const flee = rows.find((r: any) => r.move === 'flee'); expect(flee.out.activity.retreats).toBe(1); expect(flee.out.activity.gainedItems).toEqual({}); expect(flee.out.state.core.world.location).toBe('cave');
});

for (const mode of ['quota', 'abort', 'lost-delivery']) test(`adventure ${mode} never duplicates the stable travel, encounter or battle command`, async ({ page }) => {
  const rows = await page.evaluate(async mode => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const kind of ['travel', 'encounter', 'battle']) {
        const name = 'adventure-fault-' + mode + kind, { repo, snapshot } = await h.adventureFixture(name, kind);
        try {
          const plan = kind === 'travel' ? { kind, location: 'wilderness', maxCycles: 1 } : kind === 'encounter' ? h.adventure.defaultEncounterPlan(snapshot.state, 'wolf') : h.adventure.defaultBattlePlan(snapshot.state);
          const a = await repo.startActivity(plan, h.adventureMutation(snapshot)), tick = h.adventureTick(a), before = await h.inspect(name), expected = h.engine.resolve(snapshot.state, a.activity.nextCommand); now = a.activity.dueAt;
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
            if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE) throw new DOMException('adventure quota', 'QuotaExceededError');
            const request = put.call(this, value, key!); if (mode === 'abort' && this.name === h.FULL_STATE_STORE && key === 'activity') request.addEventListener('success', () => this.transaction.abort()); return request;
          };
          let failed;
          try { failed = await h.attempt(async () => { const out = await repo.settleActivity(tick); if (mode === 'lost-delivery') throw new Error('adventure reply lost after commit'); return out; }); }
          finally { IDBObjectStore.prototype.put = put; }
          const afterFailure = await h.inspect(name), retry = await repo.settleActivity(tick), beforeReplay = await h.inspect(name), replay = await repo.settleActivity(tick);
          rows.push({ kind, mode, expected, before, afterFailure, failed, retry, replay, beforeReplay, afterReplay: await h.inspect(name) });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  }, mode);
  for (const r of rows) {
    expect(r.failed.ok).toBe(false); if (mode !== 'lost-delivery') { expect(r.failed.code).toBe(mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED'); expect(r.afterFailure).toEqual(r.before); }
    expect(r.retry.state).toEqual(r.expected.nextState); expect(r.retry.result).toEqual(r.expected.result); expect(r.retry.replayed).toBe(mode === 'lost-delivery');
    expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.retry.state); expect(r.afterReplay).toEqual(r.beforeReplay);
  }
});

test('paused travel and explicit page takeover fence old callbacks and never pay elapsed closed-page time', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, { repo, snapshot } = await h.adventureFixture('adventure-owner'), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const a = await repo.startActivity({ kind: 'travel', location: 'wilderness', maxCycles: 1 }, h.adventureMutation(snapshot)), oldTick = h.adventureTick(a);
      const paused = await repo.pauseActivity(h.adventureMutation(a)); repo.close(); now += 86_400_000;
      const other = await h.FullSaveRepository.open('adventure-owner');
      try {
        const reopened = await other.loadActivitySnapshot(), resumed = await other.resumeActivity(h.adventureMutation(reopened, 'adventure-page-b'));
        const stale = await h.attempt(() => other.settleActivity(oldTick)), early = await h.attempt(() => other.settleActivity(h.adventureTick(resumed)));
        now = resumed.activity.dueAt; const completed = await other.settleActivity(h.adventureTick(resumed));
        const replaced = await other.create('新人生', h.mutation(completed.state)), old = await h.attempt(() => other.settleActivity(h.adventureTick(resumed)));
        return { snapshot, paused, reopened, resumed, stale, early, completed, replaced, old, archives: await other.archives() };
      } finally { other.close(); }
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.reopened).toEqual({ state: r.snapshot.state, activity: r.paused.activity }); expect(r.resumed.state).toEqual(r.snapshot.state);
  expect(r.resumed.activity.dueAt - r.resumed.activity.startedAt).toBe(6000); expect(r.stale.code).toBe('ACTIVITY_STALE'); expect(r.early.code).toBe('ACTIVITY_NOT_DUE');
  expect(r.completed.activity.completedCycles).toBe(1); expect(r.old.code).toBe('RUN_MISMATCH'); expect(r.archives.some((row: any) => row.value?.id === r.completed.activity.id)).toBe(true);
});

test('complete activity history paginates beyond eight turns, stays ordered and rejects corrupt same-run records without scanning another run', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'adventure-history', { repo, snapshot } = await h.adventureFixture(name, 'encounter'), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const plan = { ...h.adventure.defaultEncounterPlan(snapshot.state, 'wolf'), maxEncounters: 3, maxCycles: 123, monthBudget: 3 };
      let out = await repo.startActivity(plan, h.adventureMutation(snapshot)); const commands = [], results = [];
      for (let i = 0; out.activity.status === 'running' && i < 123; i++) { commands.push(out.activity.nextCommand); now = out.activity.dueAt; out = await repo.settleActivity(h.adventureTick(out)); results.push(out.result); }
      const before = await h.inspect(name), pages = [], first = await repo.loadActivityHistory(out.activity.id, 0, 4); pages.push(first);
      for (let p = 1; p < first.pages; p++) pages.push(await repo.loadActivityHistory(out.activity.id, p, 4));
      const clamped = await repo.loadActivityHistory(out.activity.id, 999, 4), after = await h.inspect(name);
      const original = before[h.FULL_RECEIPT_STORE].find((row: any) => row.key === snapshot.state.core.runId + ':' + commands[0].commandId).value;
      const foreignKey = snapshot.state.core.runId + '-foreign:cycle:' + out.activity.id + ':0:999'; await h.put(name, h.FULL_RECEIPT_STORE, foreignKey, { malformedForeign: true });
      const foreignIgnored = await repo.loadActivityHistory(out.activity.id, 0, 20);
      const badKey = snapshot.state.core.runId + ':cycle:' + out.activity.id + ':999:999'; await h.put(name, h.FULL_RECEIPT_STORE, badKey, original);
      const corruptBefore = await h.inspect(name), rejected = await h.attempt(() => repo.loadActivityHistory(out.activity.id)), corruptAfter = await h.inspect(name);
      return { out, commands, results, pages, clamped, before, after, foreignIgnored, rejected, corruptBefore, corruptAfter };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.out.activity.status).toBe('stopped'); expect(r.out.activity.victories).toBe(3); expect(r.commands.length).toBeGreaterThan(8);
  const rows = r.pages.flatMap((p: any) => p.rows); expect(rows.map((row: any) => row.command)).toEqual(r.commands); expect(rows.map((row: any) => row.result)).toEqual(r.results);
  expect(r.pages[0].total).toBe(r.commands.length); expect(r.clamped.page).toBe(r.pages.length - 1); expect(r.clamped.rows).toEqual(r.pages.at(-1).rows); expect(r.after).toEqual(r.before);
  expect(r.foreignIgnored.total).toBe(r.commands.length); expect(r.rejected.code).toBe('RECEIPT_INVALID'); expect(r.corruptAfter).toEqual(r.corruptBefore);
});

test('v6 proof binds the original round, policy, timing and full resulting battle state', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'adventure-proof', { repo, snapshot } = await h.adventureFixture(name, 'battle'), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const a = await repo.startActivity(h.adventure.singleBattlePlan(snapshot.state, 'attack'), h.adventureMutation(snapshot)), tick = h.adventureTick(a); now = a.activity.dueAt;
      const completed = await repo.settleActivity(tick), key = tick.runId + ':' + tick.commandId, raw = await h.inspect(name), original = raw[h.FULL_RECEIPT_STORE].find((r: any) => r.key === key).value, rows = [];
      for (const change of ['command', 'state', 'moves', 'time', 'identity']) {
        const damaged = structuredClone(original);
        if (change === 'command') damaged.command.move = 'guard';
        if (change === 'state') damaged.proof.stateAfter.battle.hp++;
        if (change === 'moves') damaged.activity.moves.attack++;
        if (change === 'time') damaged.proof.resolvedAt = damaged.proof.activityBefore.dueAt - 1;
        if (change === 'identity') { damaged.input.tick.commandId += '-other'; damaged.fingerprint = h.adventureReceipts.canonicalFingerprint(damaged.input); }
        await h.put(name, h.FULL_RECEIPT_STORE, key, damaged); const before = await h.inspect(name), rejected = await h.attempt(() => repo.settleActivity(tick)), after = await h.inspect(name);
        rows.push({ change, before, after, rejected });
      }
      await h.put(name, h.FULL_RECEIPT_STORE, key, original); const replay = await repo.settleActivity(tick);
      if (!replay.replayed || JSON.stringify(replay.state) !== JSON.stringify(completed.state)) throw new Error('restored receipt did not replay');
      return rows;
    } finally { Date.now = realNow; repo.close(); }
  });
  for (const row of rows) { expect(row.rejected.code, row.change).toBe('RECEIPT_INVALID'); expect(row.after).toEqual(row.before); }
});

test('old legal short travel, encounter and battle receipts still replay before the new-write guard', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const kind of ['travel', 'encounter', 'battle']) {
      const name = 'adventure-old-receipt-' + kind, { repo, snapshot } = await h.adventureFixture(name, kind);
      try {
        const action = kind === 'travel' ? { type: 'TRAVEL', location: 'sect' } : kind === 'encounter' ? { type: 'ENCOUNTER', enemy: 'wolf' } : { type: 'BATTLE', move: 'attack' };
        const command = h.command(snapshot.state, action), expected = h.engine.resolve(snapshot.state, command);
        await h.put(name, h.FULL_STATE_STORE, 'previous', snapshot.state); await h.put(name, h.FULL_STATE_STORE, 'current', expected.nextState);
        await h.put(name, h.FULL_RECEIPT_STORE, command.runId + ':' + command.commandId,
          { format: 'chenyuan-receipt', version: 1, command, fingerprint: h.adventureReceipts.canonicalFingerprint(command), result: expected.result });
        const before = await h.inspect(name), replay = await repo.execute(command), blocked = await h.attempt(() => repo.execute(h.command(expected.nextState, action))), after = await h.inspect(name);
        rows.push({ expected, replay, blocked, before, after });
      } finally { repo.close(); }
    }
    return rows;
  });
  for (const row of rows) { expect(row.replay.replayed).toBe(true); expect(row.replay.state).toEqual(row.expected.nextState); expect(row.replay.result).toEqual(row.expected.result); expect(row.blocked.code).toBe('ACTIVITY_REQUIRED'); expect(row.after).toEqual(row.before); }
});

test('a current trial gate uses real rounds and stops at the next gate without choosing another question or ending', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open('adventure-trial-boundary'), route = h.routes.fullRoute(), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      let state = (await repo.importText(JSON.stringify(route.checkpoints.trial), h.mutation())).state;
      state = (await h.finishAction(repo, { type: 'START_TRIAL' })).state; state = (await h.finishAction(repo, { type: 'ANSWER_TRIAL', answer: 'accept' })).state;
      const before = state, checkpoint = await repo.loadCheckpoint(), snapshot = await repo.loadActivitySnapshot();
      let out = await repo.startActivity(h.adventure.defaultBattlePlan(state), h.adventureMutation(snapshot)); const steps = [];
      for (let i = 0; out.activity.status === 'running' && i < 40; i++) { const command = out.activity.nextCommand, expected = h.engine.resolve(out.state, command); now = out.activity.dueAt; out = await repo.settleActivity(h.adventureTick(out)); steps.push({ expected, out }); }
      return { before, out, checkpoint, checkpointAfter: await repo.loadCheckpoint(), steps, history: await repo.loadActivityHistory(out.activity.id, 0, 20) };
    } finally { Date.now = realNow; repo.close(); }
  });
  for (const step of r.steps) expect(step.out.state).toEqual(step.expected.nextState);
  expect(r.out.state.trial.stage).toBe(2); expect(r.out.activity.status).toBe('stopped'); expect(r.out.activity.victories).toBe(1);
  expect(r.out.activity.gainedItems).toEqual({}); expect(r.out.activity.gainedStones).toBe(0); expect(r.out.state.status).toBe('active');
  expect(r.out.state.core.inventory.ascension_seal).toBe(r.before.core.inventory.ascension_seal); expect(r.checkpointAfter).toEqual(r.checkpoint); expect(r.history.total).toBe(r.steps.length);
});
