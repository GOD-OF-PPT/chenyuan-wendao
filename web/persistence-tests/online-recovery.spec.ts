import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { performance as hostPerformance } from 'node:perf_hooks';
import { setupPersistence } from './support';

// A separate fault track: normal visible new lives and real six-second cycles.
// No fixture import, resource grant, Date override, or Playwright clock is used.
// Reconnect uses the existing Store.init seam because a quota/lost reply leaves
// storage available and App currently offers no user-facing reconnect button then.
const reconnectNotice = '已重新读取已保存进度；上次未确认的操作未自动重试，请核对当前成果后再安排。';
type Fault = 'quota' | 'lost';
type Recovery = 'retry' | 'reconnect';
test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });

async function state(page: Page) {
  return page.evaluate(async () => {
    const h = (globalThis as any).h, f = (globalThis as any).fault, s = f.store;
    // inspect uses a single readonly transaction across every Game DB store.
    // Optional experience/settings data live in a different DB and are excluded.
    const raw = await h.inspect(h.FULL_DB_NAME);
    const records = raw[h.FULL_STATE_STORE];
    const record = (key: string) => records.find((r: any) => r.key === key)?.value ?? null;
    return structuredClone({
      ui: { game: s.game, activity: s.activity, runtime: s.activityRuntime, busy: s.busy,
        saved: s.saved, canRetry: s.canRetry, available: s.available, ready: s.ready,
        error: s.error, warning: s.warning, lastResult: s.lastResult,
        lastReplayed: s.lastReplayed, lastFromActivity: s.lastFromActivity },
      persisted: { state: record('current'), activity: record('activity') }, raw,
      probe: h.onlineRecovery?.probe ?? null,
      timeline: h.onlineRecovery?.timeline ?? [],
    });
  });
}

test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(async () => {
    // Mirror the production stylesheet order without importing main.ts or
    // mounting a second App. fault-app provides the actual App and Pinia Store.
    for (const file of ['style', 'shell', 'demo', 'game-hub', 'panel-materials', 'immersive-theme',
      'action-motion', 'play-flow', 'story-book', 'catalogue-art', 'idle-activity',
      'idle-sources', 'idle-production', 'idle-preparation', 'stage-r1', 'stage-r2',
      'stage-r3', 'stage-r4', 'idle-tradeoffs']) await import('/src/' + file + '.css');
    const { mountFaultApp } = await import('/persistence-tests/fault-app.ts');
    (globalThis as any).fault = mountFaultApp({execution:'online'});
  });
  // This public readiness gate is setup, not an extension of action duration.
  await expect(page.getByRole('button', { name: '踏入仙途' })).toBeEnabled({ timeout: 15000 });
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    const h = (globalThis as any).h;
    for (const restore of h?.onlineRecovery?.restores ?? []) restore();
    (globalThis as any).fault?.dispose();
  });
});

async function arrangeOpening(page: Page, mode: Fault) {
  await page.getByLabel('你的道号', { exact: true }).fill('在线恢复核对');
  await page.getByRole('button', { name: '踏入仙途' }).click();
  await expect(page.getByTestId('leave')).toBeEnabled();
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const created = await state(page);
  expect(created.ui.game.core.openingChoice).toBeNull();
  expect(created.ui.game.core.player.realm).toBe('mortal');
  expect(created.ui.activity).toBeNull();
  expect(created.persisted.state).toEqual(created.ui.game);
  await page.getByTestId('leave').click();
  await expect(page.getByTestId('milestone-period')).toContainText('6 秒');
  await expect(page.getByTestId('milestone-period')).toContainText('仅本次');
  expect((await state(page)).raw).toEqual(created.raw);

  await page.evaluate(mode => {
    const h = (globalThis as any).h, p = h.FullSaveRepository.prototype;
    const start = p.startActivity, settle = p.settleActivity;
    const stamp = (stage: string) => ({ stage, performance: performance.now(), utc: new Date().toISOString(),
      wall: Date.now(), timeOrigin: performance.timeOrigin });
    const record = h.onlineRecovery = { restores: [] as Array<() => void>, timeline: [] as any[],
      probe: { mode, accepted: null as any, attempts: [] as any[], delivered: null as any }, armed: true };
    record.restores.push(() => { p.startActivity = start; p.settleActivity = settle; });
    p.startActivity = async function(...args: any[]) {
      const outcome = await start.apply(this, args);
      const accepted = stamp('arrangement-committed');
      record.timeline.push(accepted);
      record.probe.accepted = { ...accepted, activity: structuredClone(outcome.activity) };
      return outcome;
    };
    p.settleActivity = async function(tick: any) {
      const attempt = { ...stamp('cycle-submit'), tick: structuredClone(tick), outcome: null as any };
      record.timeline.push(attempt); record.probe.attempts.push(attempt);
      if (!record.armed) {
        const outcome = await settle.call(this, tick); attempt.outcome = structuredClone(outcome); return outcome;
      }
      record.armed = false;
      if (mode === 'quota') {
        const put = IDBObjectStore.prototype.put;
        const restore = () => { IDBObjectStore.prototype.put = put; };
        record.restores.push(restore);
        IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
          if (this.transaction.db.name === h.FULL_DB_NAME && this.name === h.FULL_STATE_STORE && key === 'current')
            throw new DOMException('online cycle quota before commit', 'QuotaExceededError');
          return put.call(this, value, key!);
        };
        try { return await settle.call(this, tick); }
        finally { restore(); }
      }
      const outcome = await settle.call(this, tick);
      attempt.outcome = structuredClone(outcome);
      record.probe.delivered = { tick: structuredClone(tick), outcome: structuredClone(outcome) };
      record.timeline.push(stamp('committed-reply-withheld'));
      throw Object.assign(new Error('测试注入：本次已原子提交，但结果交付中断。'), { code: 'STORAGE_ABORTED' });
    };
  }, mode);
  const hostBegan = hostPerformance.now();
  await page.getByTestId('milestone-confirm').click();
  await expect.poll(() => page.evaluate(() => (globalThis as any).fault.store.activity?.status)).toBe('running');
  await expect(page.getByTestId('training-countdown')).toBeVisible();
  const started = await state(page);
  expect(started.ui.activity.version).toBe(7);
  expect(started.ui.activity.plan).toEqual({ kind: 'milestone', action: { type: 'CHOOSE', choice: 'leave' }, maxCycles: 1 });
  expect(started.ui.activity.cycleMs).toBe(6000);
  expect(started.ui.activity.completedCycles).toBe(0);
  expect(started.ui.game).toEqual(created.ui.game);
  expect(started.persisted).toEqual({ state: started.ui.game, activity: started.ui.activity });
  const expected = await page.evaluate(() => {
    const h = (globalThis as any).h, s = (globalThis as any).fault.store;
    return h.engine.resolve(s.game, s.activity.nextCommand);
  });
  const first = parseFloat(await page.getByTestId('training-countdown').innerText());
  await page.waitForTimeout(500);
  const early = await state(page);
  expect(early.ui.game).toEqual(created.ui.game);
  expect(early.raw).toEqual(started.raw);
  expect(early.probe.attempts).toEqual([]);
  expect(parseFloat(await page.getByTestId('training-countdown').innerText())).toBeLessThan(first);
  return { created, started, early, expected, hostBegan };
}

async function failCycle(page: Page, mode: Fault) {
  const setup = await arrangeOpening(page, mode);
  await expect.poll(() => page.evaluate(() => {
    const s = (globalThis as any).fault.store;
    return { busy: s.busy, retry: s.canRetry, runtime: s.activityRuntime };
  }), { timeout: 10000 }).toEqual({ busy: false, retry: true, runtime: null });
  await expect(page.getByTestId('save-status')).toHaveText('保存待确认');
  await expect(page.getByTestId('error')).toBeVisible();
  await expect(page.getByTestId('retry')).toBeEnabled();
  const failed = await state(page), hostElapsed = hostPerformance.now() - setup.hostBegan;
  const command = setup.started.ui.activity.nextCommand;
  expect(hostElapsed).toBeGreaterThanOrEqual(6000);
  expect(failed.probe.attempts).toHaveLength(1);
  expect(failed.probe.attempts[0].performance - failed.probe.accepted.performance).toBeGreaterThanOrEqual(6000);
  expect(failed.probe.attempts[0].tick.commandId).toBe(command.commandId);
  expect(failed.ui.lastResult).toBeNull();
  expect(failed.ui.saved).toBe(false);
  expect(failed.ui.available).toBe(true);
  expect(failed.ui.game).toEqual(failed.persisted.state);
  expect(failed.ui.activity).toEqual(failed.persisted.activity);
  expect(await page.evaluate(id => (globalThis as any).fault.store.canRetryFor(id), command.commandId)).toBe(true);
  const receiptKey = command.runId + ':' + command.commandId;
  if (mode === 'quota') {
    expect(failed.ui.error).toContain('存储空间不足');
    expect(failed.raw).toEqual(setup.started.raw);
    expect(failed.persisted).toEqual(setup.started.persisted);
    expect(failed.raw['full-receipts'].filter((row: any) => row.key === receiptKey)).toHaveLength(0);
  } else {
    expect(failed.ui.error).toContain('结果交付中断');
    expect(failed.persisted.state).toEqual(setup.expected.nextState);
    expect(failed.probe.delivered.outcome.state).toEqual(setup.expected.nextState);
    expect(failed.probe.delivered.outcome.result).toEqual(setup.expected.result);
    expect(failed.persisted.activity.status).toBe('stopped');
    expect(failed.persisted.activity.completedCycles).toBe(1);
    expect(failed.raw['full-receipts'].filter((row: any) => row.key === receiptKey)).toHaveLength(1);
  }
  return { ...setup, failed, command, receiptKey, hostElapsed };
}

for (const mode of ['quota', 'lost'] as const) for (const recovery of ['retry', 'reconnect'] as const) {
  test(`real online ${mode}: ${recovery} preserves one finite command and its atomic snapshot`, async ({ page }, info: TestInfo) => {
    const track = await failCycle(page, mode);
    let recovered;
    if (recovery === 'retry') {
      await page.getByTestId('retry').click();
      await expect(page.getByTestId('save-status')).toHaveText('已保存');
      await expect(page.getByTestId('error')).toHaveCount(0);
      recovered = await state(page);
      expect(recovered.ui.game).toEqual(track.expected.nextState);
      expect(recovered.persisted.state).toEqual(track.expected.nextState);
      expect(recovered.ui.activity.status).toBe('stopped');
      expect(recovered.ui.activity.completedCycles).toBe(1);
      expect(recovered.ui.lastResult).toEqual(track.expected.result);
      expect(recovered.ui.lastResult.commandId).toBe(track.command.commandId);
      expect(recovered.ui.lastReplayed).toBe(mode === 'lost');
      expect(recovered.ui.lastFromActivity).toBe(true);
      expect(recovered.ui.canRetry).toBe(false);
      expect(recovered.ui.runtime).toBeNull();
      expect(recovered.probe.attempts).toHaveLength(2);
      expect(recovered.probe.attempts[1].tick).toEqual(recovered.probe.attempts[0].tick);
      expect(recovered.raw['full-receipts'].filter((row: any) => row.key === track.receiptKey)).toHaveLength(1);
      if (mode === 'lost') {
        expect(recovered.raw).toEqual(track.failed.raw);
        await expect(page.getByTestId('action-motion')).toHaveCount(0);
      }
    } else {
      // No visible reconnect button exists for an available-but-unconfirmed DB.
      // Invoke the existing same-Store connection API without awaiting invisibly;
      // then require the actual public saved marker and abandoned-intent warning.
      await page.evaluate(() => {
        const h = (globalThis as any).h;
        h.onlineRecovery.reconnecting = (globalThis as any).fault.store.init();
      });
      await expect(page.getByTestId('save-status')).toHaveText('已保存');
      await expect(page.locator('.error-banner[role="status"]')).toContainText(reconnectNotice);
      await expect(page.getByTestId('error')).toHaveCount(0);
      await expect(page.getByTestId('retry')).toHaveCount(0);
      await page.evaluate(() => (globalThis as any).h.onlineRecovery.reconnecting);
      recovered = await state(page);
      expect(recovered.raw).toEqual(track.failed.raw);
      expect(recovered.persisted).toEqual(track.failed.persisted);
      expect(recovered.ui.game).toEqual(track.failed.persisted.state);
      expect(recovered.ui.activity).toEqual(track.failed.persisted.activity);
      expect(recovered.ui.saved).toBe(true);
      expect(recovered.ui.ready).toBe(true);
      expect(recovered.ui.available).toBe(true);
      expect(recovered.ui.canRetry).toBe(false);
      expect(recovered.ui.runtime).toBeNull();
      expect(recovered.ui.lastResult).toBeNull();
      expect(recovered.ui.lastReplayed).toBe(false);
      expect(recovered.ui.lastFromActivity).toBe(false);
      expect(await page.evaluate(id => (globalThis as any).fault.store.canRetryFor(id), track.command.commandId)).toBe(false);
      // Verify the discarded command API is inert as well as the missing button.
      await page.evaluate(async id => {
        const s = (globalThis as any).fault.store; await s.retryFor(id); await s.retry();
      }, track.command.commandId);
      const idleStarted = hostPerformance.now();
      await page.waitForTimeout(6500);
      expect(hostPerformance.now() - idleStarted).toBeGreaterThanOrEqual(6500);
      const later = await state(page);
      expect(later.ui).toEqual(recovered.ui);
      expect(later.persisted).toEqual(recovered.persisted);
      expect(later.raw).toEqual(recovered.raw);
      expect(later.probe.attempts).toHaveLength(1);
      await expect(page.getByTestId('action-motion')).toHaveCount(0);
      if (mode === 'quota') await expect(page.getByTestId('training-resume')).toBeVisible();
    }
    await info.attach('online-atomic-track', { body: Buffer.from(JSON.stringify({
      scope: recovery === 'retry' ? 'real App visible retry' : 'real App and same-Store reconnect API seam; no visible reconnect entry for this error',
      clock: 'real browser and host monotonic; no virtual clock', mode, recovery,
      hostElapsedToFailureMs: track.hostElapsed, ...track, recovered,
    }, null, 2)), contentType: 'application/json' });
  });
}

