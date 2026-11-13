import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test('a retired legacy UUID cannot be reused for a former run with fresh replacement CAS', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-retired-legacy',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('cave');
    const text = JSON.stringify(d.game),
      first = h.mutation(),
      a = await repo.importText(text, first);
    await repo.confirmDelivery(first.runId, first.commandId);
    const second = { ...h.mutation(a.state), commandId: repo.issueCommandId() },
      b = await repo.importText(text, second);
    await repo.confirmDelivery(second.runId, second.commandId);
    const before = await h.inspect(name),
      retry = {
        ...first,
        expectedRunId: b.state.core.runId,
        expectedRevision: b.state.core.revision,
      },
      reused = await h.attempt(() => repo.importText(text, retry)),
      after = await h.inspect(name);
    repo.close();
    return { before, after, reused };
  });
  expect(r.reused.ok).toBe(false);
  expect(r.reused.code).toBe('RECEIPT_EXPIRED');
  expect(r.after).toEqual(r.before);
});

test('restoring an acknowledged breakthrough checkpoint preserves its original entry proof', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-restore-ack-cp',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver(),
      seed = { ...h.mutation(), commandId: repo.issueCommandId() },
      initial = await repo.importText(
        JSON.stringify(d.checkpoints.mortal),
        seed,
      );
    await repo.confirmDelivery(seed.runId, seed.commandId);
    const m = {
        commandId: repo.issueCommandId(),
        runId: initial.state.core.runId,
        expectedRevision: initial.state.core.revision,
        expectedActivityId: null,
        expectedActivityRevision: null,
        ownerId: 'q15-cp',
      },
      start = await repo.startActivity(
        { kind: 'milestone', action: { type: 'BREAKTHROUGH' }, maxCycles: 1 },
        m,
      );
    await repo.confirmDelivery(seed.runId, m.commandId);
    const a = start.activity,
      tick = {
        commandId: a.nextCommand.commandId,
        runId: a.runId,
        expectedRevision: a.gameRevision,
        activityId: a.id,
        expectedActivityRevision: a.revision,
        ownerId: a.ownerId,
        generation: a.generation,
      },
      realNow = Date.now;
    let done: any;
    Date.now = () => a.dueAt;
    try {
      done = await repo.settleActivity(tick);
    } finally {
      Date.now = realNow;
    }
    await repo.confirmDelivery(seed.runId, tick.commandId);
    const cp = await repo.loadCheckpoint(),
      before = await h.inspect(name),
      restore = { ...h.mutation(done.state), commandId: repo.issueCommandId() },
      restored = await repo.restoreCheckpoint(restore);
    await repo.confirmDelivery(restore.runId, restore.commandId);
    const after = await h.inspect(name),
      cpAfter = await repo.loadCheckpoint();
    repo.close();
    return {
      before,
      after,
      cp,
      cpAfter,
      restored,
      key: tick.runId + ':' + tick.commandId,
    };
  });
  expect(r.cpAfter).toEqual(r.cp);
  expect(r.after['full-receipts'].find((x: any) => x.key === r.key)).toEqual(
    r.before['full-receipts'].find((x: any) => x.key === r.key),
  );
});

test('AdventureHistory renders the actual retained battle window and its folded cumulative boundary', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      repo = await h.FullSaveRepository.open(),
      d = h.routes.driver();
    while (d.game.core.player.realm !== 'spirit') d.realm();
    d.buy('healing_pill', 50);
    d.rest();
    d.go('wilderness');
    const seed = { ...h.mutation(), commandId: repo.issueCommandId() };
    let out = await repo.importText(JSON.stringify(d.game), seed);
    await repo.confirmDelivery(seed.runId, seed.commandId);
    const plan = {
      ...h.adventure.defaultEncounterPlan(out.state, 'wolf'),
      repeat: true,
      maxEncounters: 1_000_000_000,
      maxCycles: 1_000_000_000,
      monthBudget: 1560,
      mpBudget: 0,
    };
    plan.strategy.priority = ['attack', 'guard', 'technique', 'release'];
    plan.strategy.respondHeavy = false;
    plan.strategy.healingBudget = 50;
    const m = {
      commandId: repo.issueCommandId(),
      runId: out.state.core.runId,
      expectedRevision: out.state.core.revision,
      expectedActivityId: null,
      expectedActivityRevision: null,
      ownerId: 'q15-battle-ui',
    };
    out = await repo.startActivity(plan, m);
    await repo.confirmDelivery(seed.runId, m.commandId);
    const realNow = Date.now;
    try {
      for (let i = 0; out.activity.status === 'running'; i++) {
        if (i > 400) throw Error('bounded legal fixture');
        const a = out.activity;
        Date.now = () => a.dueAt;
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
        await repo.confirmDelivery(seed.runId, id);
      }
    } finally {
      Date.now = realNow;
      repo.close();
    }
    const source = await (await fetch('/src/AdventureHistory.vue')).text(),
      vueUrl = source.match(
        /from\s*["']([^"']*\/vue\.js(?:\?[^"']*)?)["']/,
      )?.[1];
    if (!vueUrl) throw Error('Vue module');
    const vue = await import(vueUrl),
      path = '/src/AdventureHistory.vue',
      harnessPath = '/persistence-tests/activity-store-harness.ts',
      { default: Component } = await import(path),
      { createActivityStoreHarness } = await import(harnessPath),
      f = createActivityStoreHarness();
    await f.store.init();
    document.body.innerHTML = '<div id="q15-ui"></div>';
    const app = vue.createApp({
      render: () => vue.h(Component, { store: f.store }),
    });
    app.mount('#q15-ui');
    h.cleanup = () => {
      app.unmount();
      f.dispose();
    };
    return {
      cycles: out.activity.completedCycles,
      raw: await h.inspect(h.FULL_DB_NAME),
    };
  });
  expect(r.cycles).toBe(397);
  await expect(page.getByTestId('adventure-history')).not.toContainText(
    '读取记录',
  );
  await expect(page.getByTestId('adventure-history')).toContainText(
    '较早 141 次明细已归入累计',
  );
  await expect(
    page.getByRole('navigation', { name: '逐次记录翻页' }),
  ).toContainText('共 256 项');
  expect(
    await page.evaluate(() =>
      (globalThis as any).h.inspect((globalThis as any).h.FULL_DB_NAME),
    ),
  ).toEqual(r.raw);
  await page.screenshot({ path: test.info().outputPath('folded-battle.png') });
  await page.evaluate(() => (globalThis as any).h.cleanup());
});
