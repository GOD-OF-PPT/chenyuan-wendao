import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setupPersistence } from './support';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async () => {
    const h = (globalThis as any).h;
    const path = '/persistence-tests/activity-store-harness.ts';
    const { createActivityStoreHarness } = await import(path);
    const restores: Array<() => void> = [];
    const notes: any[] = [];
    const f = h.activityStore = createActivityStoreHarness();
    let storeRepository: any;
    let sender: BroadcastChannel | null = null;
    let releaseCheckpoint: (() => void) | null = null;
    const state = () => ({ ...f.state(), ready: f.store.ready, available: f.store.available,
      saveLabel: f.store.saveLabel, warning: f.store.warning, syncEpoch: f.store.syncEpoch });
    async function connect() {
      const original = h.FullSaveRepository.open;
      const restore = () => { h.FullSaveRepository.open = original; };
      restores.push(restore);
      h.FullSaveRepository.open = async (...args: any[]) => {
        restore();
        const opened = await Reflect.apply(original, h.FullSaveRepository, args);
        storeRepository = opened;
        return opened;
      };
      try { await f.store.init(); } finally { restore(); }
    }
    async function evidence() {
      const repo = await h.FullSaveRepository.open();
      try {
        const snapshot = await repo.loadActivitySnapshot();
        const history = snapshot.activity ? await repo.loadActivityHistory(snapshot.activity.id) : null;
        return { ui: state(), snapshot, history, raw: await h.inspect(h.FULL_DB_NAME),
          notes: structuredClone(notes), observerFaults: h.syncMatrix.observerFaults,
          fault: structuredClone(h.syncMatrix.fault) };
      } finally { repo.close(); }
    }
    function notify() {
      sender ??= new BroadcastChannel('chenyuan-full-progress');
      sender.postMessage({ source: 'matrix-m01-native-sync-notification' });
    }
    function holdCheckpoint() {
      const target = storeRepository, original = target.loadCheckpoint;
      const restore = () => { target.loadCheckpoint = original; };
      restores.push(restore);
      target.loadCheckpoint = async function (...args: any[]) {
        restore();
        const checkpoint = await Reflect.apply(original, target, args);
        h.syncMatrix.checkpointEntered = true;
        await new Promise<void>(resolve => { releaseCheckpoint = resolve; });
        return checkpoint;
      };
    }
    function failNextSnapshot(kind: 'general' | 'closed') {
      const target = storeRepository, original = target.loadActivitySnapshot;
      const restore = () => { target.loadActivitySnapshot = original; };
      restores.push(restore);
      const fault = h.syncMatrix.fault = { kind, calls: 0, delivered: false, snapshot: null as any,
        code: '', message: '' };
      target.loadActivitySnapshot = async function (...args: any[]) {
        restore();
        const snapshot = await Reflect.apply(original, target, args);
        fault.calls++;
        fault.snapshot = structuredClone(snapshot);
        if (kind === 'closed') {
          target.close();
          try { await Reflect.apply(original, target, args); }
          catch (error: any) {
            fault.code = error.code; fault.message = error.message; fault.delivered = true;
            throw error;
          }
          throw new Error('A genuinely closed repository unexpectedly accepted a read');
        }
        const error = new h.engine.RuleError('STORAGE_ABORTED', '测试注入：原生同步读取完成后的交付失败。');
        fault.code = error.code; fault.message = error.message; fault.delivered = true;
        throw error;
      };
    }
    h.syncMatrix = { f, notes, state, connect, evidence, notify, holdCheckpoint, failNextSnapshot,
      checkpointEntered: false, fault: null, observerFaults: 0,
      releaseCheckpoint() { const done = releaseCheckpoint; releaseCheckpoint = null; done?.(); },
      cleanup() {
        const done = releaseCheckpoint; releaseCheckpoint = null; done?.();
        for (const restore of restores.reverse()) restore();
        sender?.close();
        f.dispose();
      } };
    await connect();
    const d = h.routes.driver(); d.go('cave');
    h.syncMatrix.importing = f.store.importText(JSON.stringify(d.game));
  });
  await page.clock.runFor(700);
  await page.evaluate(() => (globalThis as any).h.syncMatrix.importing);
  expect(await page.evaluate(() => {
    const s = (globalThis as any).h.activityStore.store;
    return { ready: s.ready, available: s.available, busy: s.busy, error: s.error,
      location: s.game?.core.world.location, realm: s.game?.core.player.realm };
  })).toEqual({ ready: true, available: true, busy: false, error: '', location: 'cave', realm: 'qi' });
  await page.evaluate(() => {
    const m = (globalThis as any).h.syncMatrix;
    m.f.store.observe((value: any) => m.notes.push(structuredClone(value)), () => { m.observerFaults++; });
  });
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => (globalThis as any).h?.syncMatrix?.cleanup());
});

async function expectFullCountdown(page: Page, activity: any) {
  await expect.poll(() => page.evaluate(() => {
    const s = (globalThis as any).h.activityStore.store, a = s.activity, r = s.activityRuntime;
    return { busy: s.busy, id: r?.id, generation: r?.generation, phase: r?.phase,
      remainingMs: r?.remainingMs, totalMs: r?.totalMs, activityGeneration: a?.generation };
  })).toEqual({ busy: false, id: activity.id, generation: activity.generation, phase: 'running',
    remainingMs: activity.cycleMs, totalMs: activity.cycleMs, activityGeneration: activity.generation });
}

for (const phase of ['normal', 'queued'] as const) {
  for (const kind of ['general', 'closed'] as const) {
    test(`${phase} sync ${kind}: failed verification stops the local cycle, keeps every committed record, and reconnect requires an explicit full continuation`, async ({ page }, info) => {
      const started = await page.evaluate(async () => {
        const m = (globalThis as any).h.syncMatrix;
        await m.f.store.startOnlinePlannedActivity({ kind: 'cultivation', method: 'natural', maxCycles: 3,
          until: 'cycles', stoneBudget: 0, stoneReserve: 0 });
        return m.state();
      });
      await expectFullCountdown(page, started.activity);
      if (phase === 'queued') {
        await page.evaluate(() => (globalThis as any).h.syncMatrix.holdCheckpoint());
        await page.clock.runFor(started.activity.cycleMs);
        await expect.poll(() => page.evaluate(() => {
          const m = (globalThis as any).h.syncMatrix;
          return { checkpoint: m.checkpointEntered, busy: m.f.store.busy,
            completed: m.f.store.activity?.completedCycles };
        })).toEqual({ checkpoint: true, busy: true, completed: 1 });
      }
      const beforeFault = await page.evaluate(() => (globalThis as any).h.syncMatrix.evidence());
      if (phase === 'queued') {
        const expected = await page.evaluate(started => (globalThis as any).h.engine.resolve(started.game, started.activity.nextCommand), started);
        expect(beforeFault.snapshot.state).toEqual(expected.nextState);
        expect(beforeFault.ui.lastResult).toEqual(expected.result);
        expect(beforeFault.history.total).toBe(1);
        expect(beforeFault.history.rows[0].command).toEqual(started.activity.nextCommand);
      } else {
        expect(beforeFault.snapshot.state).toEqual(started.game);
        expect(beforeFault.history.total).toBe(0);
      }
      await page.evaluate(kind => {
        const m = (globalThis as any).h.syncMatrix;
        m.failNextSnapshot(kind); m.notify();
      }, kind);
      await expect.poll(() => page.evaluate(() => {
        const m = (globalThis as any).h.syncMatrix;
        return { syncEpoch: m.f.store.syncEpoch, busy: m.f.store.busy };
      })).toEqual({ syncEpoch: beforeFault.ui.syncEpoch + 1, busy: phase === 'queued' });
      if (phase === 'queued') await page.evaluate(() => (globalThis as any).h.syncMatrix.releaseCheckpoint());
      await expect.poll(() => page.evaluate(() => {
        const m = (globalThis as any).h.syncMatrix;
        return { faultDelivered: m.fault.delivered, calls: m.fault.calls,
          available: m.f.store.available, saved: m.f.store.saved, busy: m.f.store.busy,
          canRetry: m.f.store.canRetry, label: m.f.store.saveLabel,
          runtime: m.f.store.activityRuntime, syncError: m.f.store.error.includes('无法同步') };
      })).toEqual({ faultDelivered: true, calls: 1, available: false, saved: false, busy: false,
        canRetry: false, label: '同步待核对', runtime: null, syncError: true });
      const failed = await page.evaluate(() => (globalThis as any).h.syncMatrix.evidence());
      expect(failed.ui.game).toEqual(beforeFault.snapshot.state);
      expect(failed.ui.activity).toEqual(beforeFault.snapshot.activity);
      expect(failed.snapshot).toEqual(beforeFault.snapshot);
      expect(failed.raw).toEqual(beforeFault.raw);
      expect(failed.history).toEqual(beforeFault.history);
      expect(failed.fault.snapshot).toEqual(beforeFault.snapshot);
      expect(failed.fault.code).toBe(kind === 'closed' ? 'STORAGE_CLOSED' : 'STORAGE_ABORTED');
      expect(failed.observerFaults).toBe(0);
      expect(failed.notes.filter((row: any) => row.kind === 'save_error' && row.errorCode === (kind === 'closed' ? 'STORAGE_CLOSED' : 'STORAGE_ABORTED'))).toHaveLength(1);
      if (phase === 'queued') {
        expect(failed.ui.lastResult).toEqual(beforeFault.ui.lastResult);
        expect(failed.ui.lastFromActivity).toBe(true);
        const committed = beforeFault.ui.lastResult;
        const observations = failed.notes.filter((row: any) => row.kind === 'action' && row.operation === 'CULTIVATE' &&
          row.runId === committed.runId && row.revisionBefore === committed.revisionBefore &&
          row.revisionAfter === committed.revisionAfter && row.result?.revisionBefore === committed.revisionBefore &&
          row.result?.revisionAfter === committed.revisionAfter);
        expect(observations).toHaveLength(1);
        expect(observations[0]).toMatchObject({ commandId: null, identifiersRedacted: true,
          sourceRunId: committed.runId, observedRevision: committed.revisionAfter, replayed: false, errorCode: null,
          action: { method: 'natural', count: 1 }, versions: committed.versions });
        expect(observations[0].result).toEqual({ revisionBefore: committed.revisionBefore,
          revisionAfter: committed.revisionAfter, requestedSteps: committed.requestedSteps,
          executedSteps: committed.executedSteps, phaseBefore: committed.phaseBefore, phaseAfter: committed.phaseAfter,
          costs: committed.costs, delta: committed.delta, stopCode: committed.stopReason?.code ?? null });
      }
      await page.clock.runFor(started.activity.cycleMs * 2 + 1);
      expect((await page.evaluate(() => (globalThis as any).h.syncMatrix.evidence())).raw).toEqual(failed.raw);

      const reconnected = await page.evaluate(async () => {
        const m = (globalThis as any).h.syncMatrix; await m.connect(); return m.evidence();
      });
      expect(reconnected.ui).toMatchObject({ ready: true, available: true, saved: true, busy: false,
        saveLabel: '已保存', error: '', runtime: null, canRetry: false });
      expect(reconnected.snapshot).toEqual(failed.snapshot);
      expect(reconnected.raw).toEqual(failed.raw);
      await page.clock.runFor(started.activity.cycleMs * 2 + 1);
      expect((await page.evaluate(() => (globalThis as any).h.syncMatrix.evidence())).raw).toEqual(reconnected.raw);

      const resumed = await page.evaluate(async () => {
        const m = (globalThis as any).h.syncMatrix; await m.f.store.resumeOnlineCultivation(); return m.state();
      });
      expect(resumed.game).toEqual(reconnected.snapshot.state);
      expect(resumed.activity.completedCycles).toBe(phase === 'queued' ? 1 : 0);
      await expectFullCountdown(page, resumed.activity);
      const resumedBefore = await page.evaluate(() => (globalThis as any).h.syncMatrix.evidence());
      await page.clock.runFor(resumed.activity.cycleMs - 1);
      const beforeDeadline = await page.evaluate(() => (globalThis as any).h.syncMatrix.evidence());
      expect(beforeDeadline.raw).toEqual(resumedBefore.raw);
      expect(beforeDeadline.snapshot).toEqual(resumedBefore.snapshot);
      await page.clock.runFor(1);
      await expect.poll(() => page.evaluate(() => {
        const s = (globalThis as any).h.activityStore.store;
        return { completed: s.activity?.completedCycles, busy: s.busy, command: s.lastResult?.commandId };
      })).toEqual({ completed: resumed.activity.completedCycles + 1, busy: false,
        command: resumed.activity.nextCommand.commandId });
      const final = await page.evaluate(async resumed => {
        const h = (globalThis as any).h, m = h.syncMatrix;
        const expected = h.engine.resolve(resumed.game, resumed.activity.nextCommand);
        await m.f.store.pauseCultivation();
        return { expected, evidence: await m.evidence() };
      }, resumed);
      expect(final.evidence.snapshot.state).toEqual(final.expected.nextState);
      expect(final.evidence.ui.lastResult).toEqual(final.expected.result);
      expect(final.evidence.history.total).toBe((phase === 'queued' ? 1 : 0) + 1);
      expect(final.evidence.history.rows.filter((row: any) => row.command.commandId === resumed.activity.nextCommand.commandId)).toHaveLength(1);
      expect(final.evidence.ui.error).toBe('');
      expect(final.evidence.ui.runtime).toBeNull();
      expect(final.evidence.observerFaults).toBe(0);
      await page.clock.runFor(started.activity.cycleMs * 2 + 1);
      expect((await page.evaluate(() => (globalThis as any).h.syncMatrix.evidence())).raw).toEqual(final.evidence.raw);
      await info.attach('native-sync-queue-evidence', { body: JSON.stringify({ phase, kind,
        scope: 'Real Store/native IndexedDB. Only readonly/committed-checkpoint delivery is intercepted; Game and receipts are never assigned by this test.',
        started, beforeFault, failed, reconnected, resumed, final }), contentType: 'application/json' });
    });
  }
}
