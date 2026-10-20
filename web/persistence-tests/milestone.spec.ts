import { test, expect } from '@playwright/test';
import { setupMilestones } from './milestone-support';
test.beforeEach(async ({ page }) => setupMilestones(page));

test('all nine finite actions wait the complete deadline and save exactly their selected formal outcome with immutable proof', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const sample of h.milestoneSamples) {
        const name = 'milestone-formal-' + sample.action.type, { repo, snapshot, action } = await h.milestoneFixture(name, sample.action.type);
        try {
          const started = await repo.startActivity(h.milestonePlan(action), h.milestoneMutation(snapshot)), tick = h.milestoneTick(started);
          const expected = h.engine.resolve(snapshot.state, started.activity.nextCommand), before = await h.inspect(name);
          now = started.activity.dueAt - 1; const early = await h.attempt(() => repo.settleActivity(tick)), afterEarly = await h.inspect(name);
          now++; const done = await repo.settleActivity(tick), previous = await repo.loadPrevious(), checkpoint = await repo.loadCheckpoint();
          const raw = await h.inspect(name), receipt = raw[h.FULL_RECEIPT_STORE].find((row: any) => row.key === tick.runId + ':' + tick.commandId).value;
          const replay = await repo.settleActivity(tick), history = await repo.loadActivityHistory(started.activity.id), afterReplay = await h.inspect(name);
          rows.push({ type: action.type, snapshot, started, expected, early, before, afterEarly, done, previous, checkpoint, raw, receipt, replay, history, afterReplay,
            life: h.queries.getLifeRecord(done.state) });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  expect(rows).toHaveLength(9);
  for (const r of rows) {
    expect(r.started.state).toEqual(r.snapshot.state); expect(r.started.activity.version).toBe(7); expect(r.started.activity.outcomeGame).toBeNull();
    expect(r.early.code).toBe('ACTIVITY_NOT_DUE'); expect(r.afterEarly).toEqual(r.before);
    expect(r.done.state).toEqual(r.expected.nextState); expect(r.done.result).toEqual(r.expected.result); expect(r.previous).toEqual(r.snapshot.state);
    expect(r.done.activity.status).toBe('stopped'); expect(r.done.activity.completedCycles).toBe(1); expect(r.done.activity.nextCommand).toBeNull();
    expect(r.done.activity.outcomeGame).toEqual(r.done.state); expect(r.done.activity.originGame).toEqual(r.snapshot.state);
    expect(r.done.activity.xpChange).toBe(r.done.result.delta.xp); expect(r.done.activity.gainedXp).toBe(Math.max(0, r.done.result.delta.xp));
    expect(r.receipt.version).toBe(2); expect(r.receipt.proof.activityBefore).toEqual(r.started.activity); expect(r.receipt.proof.stateAfter).toEqual(r.done.state);
    expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.done.state); expect(r.replay.activity).toEqual(r.done.activity);
    expect(r.replay.result).toEqual(r.done.result); expect(r.afterReplay).toEqual(r.raw); expect(r.history.total).toBe(1);
    if (['BREAKTHROUGH', 'START_TRIAL'].includes(r.type)) {
      expect(r.checkpoint.snapshot).toEqual(r.snapshot.state); expect(r.checkpoint.sourceRevision).toBe(r.snapshot.state.core.revision);
      const owner = r.raw['full-state'].find((row: any) => row.key === 'checkpoint-owner').value;
      expect(owner).toEqual({ format: 'chenyuan-checkpoint-scope', version: 1, runId: r.snapshot.state.core.runId,
        sourceRunId: r.snapshot.state.core.runId, sourceRevision: r.snapshot.state.core.revision, kind: r.type === 'BREAKTHROUGH' ? 'breakthrough' : 'trial' });
    } else expect(r.checkpoint).toBeNull();
    if (['EVENT', 'START_TRIAL', 'ANSWER_TRIAL'].includes(r.type)) expect(r.done.activity.stopReason.code).toBe('WAITING_DECISION');
    if (['END', 'RETIRE', 'END_LIFE'].includes(r.type)) expect(r.life.overview.status).toBe(r.type === 'END' ? 'ascended' : 'ended');
  }
  const end = rows.find(r => r.type === 'END')!; expect(end.done.state.core.player.realm).toBe('ascended'); expect(end.done.result.delta.xp).toBeLessThan(0);
  const retirement = rows.find(r => r.type === 'RETIRE')!; expect(retirement.done.result.costs.months).toBe(0); expect(retirement.done.state.core.player).toEqual(retirement.snapshot.state.core.player);
  const lifespan = rows.find(r => r.type === 'END_LIFE')!; expect(lifespan.done.result.costs.months).toBe(1); expect(lifespan.life.overview.remainingMonths).toBe(0);
});

test('checkpoint, owner, activity and receipt faults including put-success abort roll every record back and retry one original command', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const type of ['BREAKTHROUGH', 'START_TRIAL']) for (const target of ['checkpoint', 'checkpoint-owner', 'activity', 'receipt', 'abort']) {
        const name = 'milestone-fault-' + type + target, { repo, snapshot, action } = await h.milestoneFixture(name, type);
        try {
          const started = await repo.startActivity(h.milestonePlan(action), h.milestoneMutation(snapshot)), tick = h.milestoneTick(started);
          const before = await h.inspect(name), put = IDBObjectStore.prototype.put; now = started.activity.dueAt;
          IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
            if (target === 'receipt' ? this.name === h.FULL_RECEIPT_STORE : target !== 'abort' && this.name === h.FULL_STATE_STORE && key === target)
              throw new DOMException('milestone quota', 'QuotaExceededError');
            const request = put.call(this, value, key!);
            if (target === 'abort' && this.name === h.FULL_STATE_STORE && key === 'checkpoint') request.addEventListener('success', () => this.transaction.abort());
            return request;
          };
          let failed; try { failed = await h.attempt(() => repo.settleActivity(tick)); } finally { IDBObjectStore.prototype.put = put; }
          const after = await h.inspect(name), retried = await repo.settleActivity(tick), checkpoint = await repo.loadCheckpoint();
          rows.push({ target, failed, before, after, retried, checkpoint, snapshot, replay: await repo.settleActivity(tick) });
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  expect(rows).toHaveLength(10);
  for (const r of rows) {
    expect(r.failed.code).toBe(r.target === 'abort' ? 'STORAGE_ABORTED' : 'STORAGE_QUOTA'); expect(r.after).toEqual(r.before);
    expect(r.retried.activity.completedCycles).toBe(1); expect(r.checkpoint.snapshot).toEqual(r.snapshot.state);
    expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.retried.state); expect(r.replay.result).toEqual(r.retried.result);
  }
});

test('corrupt finite proofs cannot change the chosen consequence, realm, ending, cost, identity or deadline', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [], realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      for (const type of ['CHOOSE', 'BREAKTHROUGH', 'START_TRIAL', 'END', 'RETIRE', 'END_LIFE']) {
        const name = 'milestone-proof-' + type, { repo, snapshot, action } = await h.milestoneFixture(name, type);
        try {
          const started = await repo.startActivity(h.milestonePlan(action), h.milestoneMutation(snapshot)), tick = h.milestoneTick(started); now = started.activity.dueAt;
          const done = await repo.settleActivity(tick), key = tick.runId + ':' + tick.commandId, raw = await h.inspect(name);
          const original = raw[h.FULL_RECEIPT_STORE].find((row: any) => row.key === key).value;
          for (const change of ['missing-proof', 'state', 'result', 'owner', 'generation', 'deadline', 'origin', 'outcome']) {
            const bad = structuredClone(original);
            if (change === 'missing-proof') { delete bad.proof; bad.version = 1; }
            if (change === 'state') bad.proof.stateAfter.core.player.stones++;
            if (change === 'result') bad.result.delta.stones++;
            if (change === 'owner') bad.proof.activityBefore.ownerId = 'forged-owner';
            if (change === 'generation') bad.proof.activityBefore.generation++;
            if (change === 'deadline') bad.proof.resolvedAt = started.activity.dueAt - 1;
            if (change === 'origin') bad.activity.originGame.core.player.stones++;
            if (change === 'outcome') bad.activity.outcomeGame.core.player.stones++;
            await h.put(name, h.FULL_RECEIPT_STORE, key, bad); const before = await h.inspect(name);
            const rejected = await h.attempt(() => repo.settleActivity(tick)), after = await h.inspect(name); rows.push({ type, change, rejected, before, after });
            await h.put(name, h.FULL_RECEIPT_STORE, key, original);
          }
          const replay = await repo.settleActivity(tick); if (!replay.replayed || JSON.stringify(replay.state) !== JSON.stringify(done.state)) throw new Error('original finite receipt failed replay');
        } finally { repo.close(); }
      }
      return rows;
    } finally { Date.now = realNow; }
  });
  expect(rows).toHaveLength(48);
  for (const row of rows) { expect(row.rejected.code, row.type + row.change).toBe('RECEIPT_INVALID'); expect(row.after).toEqual(row.before); }
});

test('all old short-action receipts replay strictly before the new-write guard and preserve stored progress', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const sample of h.milestoneSamples) {
      const name = 'milestone-old-' + sample.action.type, { repo, snapshot, action } = await h.milestoneFixture(name, sample.action.type);
      try {
        const command = h.command(snapshot.state, action), expected = h.engine.resolve(snapshot.state, command);
        await h.put(name, h.FULL_STATE_STORE, 'previous', snapshot.state); await h.put(name, h.FULL_STATE_STORE, 'current', expected.nextState);
        await h.put(name, h.FULL_RECEIPT_STORE, command.runId + ':' + command.commandId,
          { format: 'chenyuan-receipt', version: 1, command, fingerprint: h.milestoneReceipts.canonicalFingerprint(command), result: expected.result });
        const before = await h.inspect(name), replay = await repo.execute(command), blocked = await h.attempt(() => repo.execute(h.command(expected.nextState, action)));
        rows.push({ type: action.type, expected, before, replay, blocked, after: await h.inspect(name) });
      } finally { repo.close(); }
    }
    return rows;
  });
  expect(rows).toHaveLength(9);
  for (const r of rows) { expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.expected.nextState); expect(r.replay.result).toEqual(r.expected.result);
    expect(r.blocked.code).toBe('ACTIVITY_REQUIRED'); expect(r.after).toEqual(r.before); }
});

test('pause, takeover, refresh, replacement and complete repeated restore fence finite old callbacks', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'milestone-lifecycle', { repo, snapshot, action } = await h.milestoneFixture(name, 'BREAKTHROUGH'), realNow = Date.now;
    let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const started = await repo.startActivity(h.milestonePlan(action), h.milestoneMutation(snapshot)), oldTick = h.milestoneTick(started);
      const paused = await repo.pauseActivity(h.milestoneMutation(started)); repo.close(); now += 86_400_000;
      const other = await h.FullSaveRepository.open(name);
      try {
        const reopened = await other.loadActivitySnapshot(), resumed = await other.resumeActivity(h.milestoneMutation(reopened, 'milestone-page-b'));
        const stale = await h.attempt(() => other.settleActivity(oldTick)), early = await h.attempt(() => other.settleActivity(h.milestoneTick(resumed)));
        now = resumed.activity.dueAt; const done = await other.settleActivity(h.milestoneTick(resumed)), checkpoint = await other.loadCheckpoint();
        const restored = await other.restoreCheckpoint(h.mutation(done.state)), restoredAgain = await other.restoreCheckpoint(h.mutation(restored.state));
        const oldLife = await h.attempt(() => other.settleActivity(h.milestoneTick(resumed))), loaded = await other.loadActivitySnapshot();
        return { snapshot, started, paused, reopened, resumed, stale, early, done, checkpoint, restored, restoredAgain, oldLife, loaded, archives: await other.archives() };
      } finally { other.close(); }
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.reopened).toEqual({ state: r.snapshot.state, activity: r.paused.activity }); expect(r.resumed.activity.cycleMs).toBe(30_000);
  expect(r.stale.code).toBe('ACTIVITY_STALE'); expect(r.early.code).toBe('ACTIVITY_NOT_DUE'); expect(r.checkpoint.snapshot).toEqual(r.snapshot.state);
  const normalized = (state: any) => { const copy = structuredClone(state); copy.core.runId = '<run>'; copy.core.revision = 0; return copy; };
  expect(normalized(r.restored.state)).toEqual(normalized(r.snapshot.state)); expect(normalized(r.restoredAgain.state)).toEqual(normalized(r.snapshot.state));
  expect(r.restored.state.core.runId).not.toBe(r.restoredAgain.state.core.runId); expect(r.oldLife.code).toBe('RUN_MISMATCH'); expect(r.loaded.activity).toBeNull();
  expect(r.archives.some((row: any) => row.value?.id === r.done.activity.id)).toBe(true);
});
