import { test, expect } from '@playwright/test';
import { positiveCostIds, setupPositiveCosts, expectCommitted, expectPositiveCost, savePositiveEvidence } from './positive-cost-support';

test.beforeEach(async ({ page }) => { await setupPositiveCosts(page); });

for (const id of positiveCostIds) for (const mode of ['quota', 'abort', 'lost-delivery'] as const)
  test(`M02 ${id} ${mode}: full native rollback or committed receipt, original retry and exact replay`, async ({ page }, info) => {
    const r = await page.evaluate(async ({ id, mode }) => {
      const h = (globalThis as any).h, name = `m02-${id}-${mode}`;
      const { repo, row, started, expected, expectedActivity, tick } = await h.m02Open(id, name);
      const realNow = Date.now; Date.now = () => started.activity.dueAt;
      try {
        const before = await h.inspect(name), fault = mode === 'lost-delivery' ? null : h.m02Fault(mode, name, tick);
        let delivered: any = null, failed: any;
        try { failed = await h.attempt(async () => {
          const value = await repo.settleActivity(tick);
          if (mode === 'lost-delivery') { delivered = structuredClone(value); throw new Error('M02 delivery lost after native commit'); }
          return value;
        }); } finally { fault?.restore(); }
        const after = await h.inspect(name), completed = await repo.settleActivity(tick);
        const committed = await h.inspect(name), replay = await repo.settleActivity(tick);
        return { id, mode, fixture: row.game, cost: row.cost, started, expected, expectedActivity, tick, before, after, failed, delivered,
          hits: fault?.hits ?? [], completed, committed, replay, afterReplay: await h.inspect(name), previous: await repo.loadPrevious() };
      } finally { Date.now = realNow; repo.close(); }
    }, { id, mode });
    await savePositiveEvidence(info, r);
    expect(r.failed.ok).toBe(false);
    if (mode === 'lost-delivery') {
      expect(r.delivered.result).toEqual(r.expected.result); expect(r.completed.replayed).toBe(true);
      expect(r.after).toEqual(r.committed);
    } else {
      expect(r.failed.code).toBe(mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED');
      expect(r.hits).toHaveLength(1); expect(r.hits[0].database).toBe(`m02-${id}-${mode}`);
      expect(r.hits[0].tick).toEqual(r.tick);
      if (mode === 'quota') { expect(r.hits[0].value.input.kind).toBe('TICK'); expect(r.hits[0].value.input.tick).toEqual(r.tick); }
      if (mode === 'abort') { expect(r.hits[0].requestSucceeded).toBe(true); expect(r.hits[0].abortCalled).toBe(true); }
      expect(r.after).toEqual(r.before); expect(r.completed.replayed).toBe(false);
    }
    expectCommitted(r);
    expect(r.replay.replayed).toBe(true); expect(r.replay.state).toEqual(r.completed.state);
    expect(r.replay.activity).toEqual(r.completed.activity); expect(r.replay.result).toEqual(r.expected.result);
    expect(r.afterReplay).toEqual(r.committed);
  });

for (const id of positiveCostIds) for (const committed of [false, true])
  test(`M02 ${id} ${committed ? 'committed replacement replay' : 'uncommitted takeover rejection'} preserves all stores`, async ({ page }, info) => {
    const r = await page.evaluate(async ({ id, committed }) => {
      const h = (globalThis as any).h, name = `m02-owner-${id}-${committed}`;
      const { repo, row, started, expected, tick } = await h.m02Open(id, name), other = await h.FullSaveRepository.open(name);
      const realNow = Date.now; Date.now = () => started.activity.dueAt;
      try {
        const paid = committed ? await repo.settleActivity(tick) : null;
        const current = await other.loadActivitySnapshot();
        const foreign = committed
          ? await other.startActivity(h.m02ReplacementPlan(current.state), h.milestoneMutation(current, 'm02-other-page'))
          : await other.resumeActivity(h.milestoneMutation(current, 'm02-other-page'));
        const before = await h.inspect(name), result = await h.attempt(() => repo.settleActivity(tick));
        return { id, committed, cost: row.cost, started, expected, tick, paid, foreign, before, result,
          after: await h.inspect(name), current: await repo.loadActivitySnapshot() };
      } finally { Date.now = realNow; repo.close(); other.close(); }
    }, { id, committed });
    await savePositiveEvidence(info, r); expectPositiveCost(r.expected.result.costs, r.cost);
    expect(r.after).toEqual(r.before); expect(r.current).toEqual({ state: r.foreign.state, activity: r.foreign.activity });
    expect(r.foreign.activity.ownerId).toBe('m02-other-page');
    if (committed) {
      expect(r.paid.state).toEqual(r.expected.nextState); expect(r.result.ok).toBe(true);
      expect(r.result.value.replayed).toBe(true); expect(r.result.value.result).toEqual(r.expected.result);
      expect(r.result.value.state).toEqual(r.foreign.state); expect(r.result.value.activity).toEqual(r.foreign.activity);
      expect(r.foreign.activity.id).not.toBe(r.started.activity.id);
    } else {
      expect(r.result.code).toBe('ACTIVITY_STALE'); expect(r.current.state).toEqual(r.started.state);
      expect(r.after['full-receipts'].filter((entry: any) => entry.key === r.tick.runId + ':' + r.tick.commandId)).toHaveLength(0);
    }
  });
