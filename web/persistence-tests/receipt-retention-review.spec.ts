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
  // Verify the same saved window through the actual App, theme and visible
  // original receipt entry as well as the focused component seam above.
  await page.evaluate(async () => {
    const h = (globalThis as any).h,
      path = '/persistence-tests/fault-app.ts',
      { mountFaultApp } = await import(path);
    h.q15Product = mountFaultApp();
  });
  await expect
    .poll(() =>
      page.evaluate(() => (globalThis as any).h.q15Product.store.ready),
    )
    .toBe(true);
  await page.getByTestId('activity-inspect').click();
  await page
    .getByTestId('activity-details')
    .getByTestId('adventure-receipts')
    .click();
  await expect(page.getByTestId('adventure-history-folded')).toContainText(
    '较早 141 次明细已归入累计',
  );
  const productPager = page.getByRole('navigation', { name: '逐次记录翻页' });
  await expect(productPager).toContainText('共 256 项');
  const measureGeometry = () =>
    productPager.evaluate((node) => {
      const box = node.getBoundingClientRect(),
        fold = document
          .querySelector('[data-testid="adventure-history-folded"]')!
          .getBoundingClientRect(),
        button =
          node.querySelector('[data-testid="catalogue-next"]:not(:disabled)') ??
          node.querySelector('[data-testid="catalogue-prev"]')!,
        b = button.getBoundingClientRect(),
        hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      const clips: any[] = [];
      for (let p = node.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/hidden|clip|auto|scroll/.test(s.overflowY)) {
          const r = p.getBoundingClientRect();
          clips.push({ top: r.top, bottom: r.bottom });
        }
      }
      return {
        pager: { top: box.top, bottom: box.bottom },
        fold: { top: fold.top, bottom: fold.bottom },
        clips,
        navigationTop: document
          .querySelector('nav[aria-label="主要页面"]')!
          .getBoundingClientRect().top,
        contentBottom: node.closest('.hub-feature')!.getBoundingClientRect()
          .bottom,
        centerHit: !!hit && (button === hit || button.contains(hit)),
        height: innerHeight,
        night: getComputedStyle(document.querySelector('.app-shell')!)
          .getPropertyValue('--palette-night')
          .trim(),
      };
    });
  const allGeometry: any[] = [];
  for (let selected = 0; selected < 64; selected++) {
    if (selected) {
      await productPager.getByTestId('catalogue-next').click();
      await expect(productPager).toContainText(`${selected + 1} / 64 页`);
    }
    await expect(
      page.locator('.adventure-history-grid article strong').first(),
    ).toContainText(`第 ${142 + selected * 4} 次`);
    const geometry = await measureGeometry();
    expect(geometry.night).toBe('#10282f');
    expect(geometry.centerHit).toBe(true);
    expect(geometry.fold.bottom).toBeLessThanOrEqual(geometry.pager.top);
    expect(geometry.pager.bottom).toBeLessThanOrEqual(geometry.height);
    expect(geometry.pager.bottom).toBeLessThanOrEqual(geometry.navigationTop);
    expect(geometry.pager.bottom).toBeLessThanOrEqual(geometry.contentBottom);
    for (const clip of geometry.clips) {
      expect(geometry.fold.top).toBeGreaterThanOrEqual(clip.top);
      expect(geometry.pager.bottom).toBeLessThanOrEqual(clip.bottom);
    }
    allGeometry.push({ page: selected + 1, ...geometry });
    if (selected === 0)
      await page.screenshot({
        path: test.info().outputPath('folded-battle-product-first.png'),
      });
  }
  expect(allGeometry).toHaveLength(64);
  expect(
    await page.evaluate(() =>
      (globalThis as any).h.inspect((globalThis as any).h.FULL_DB_NAME),
    ),
  ).toEqual(r.raw);
  await page.screenshot({
    path: test.info().outputPath('folded-battle-product.png'),
  });
  await test.info().attach('folded-history-product-geometry', {
    body: JSON.stringify(allGeometry),
    contentType: 'application/json',
  });
  await page.evaluate(() => (globalThis as any).h.q15Product.dispose());
});

test('legal run ids with overlapping key prefixes do not mix protected old originals into current history', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-overlapping-runs',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('cave');
    const first = {
        ...h.mutation(),
        runId: 'overlap:prior',
        commandId: repo.issueCommandId(),
      },
      a = await repo.importText(JSON.stringify(d.game), first);
    const second = {
        ...h.mutation(a.state),
        runId: 'overlap',
        commandId: repo.issueCommandId(),
      },
      b = await repo.importText(JSON.stringify(d.game), second),
      m = {
        commandId: repo.issueCommandId(),
        runId: b.state.core.runId,
        expectedRevision: b.state.core.revision,
        expectedActivityId: null,
        expectedActivityRevision: null,
        ownerId: 'q15-overlap',
      };
    const started = await repo.startActivity(
        {
          kind: 'cultivation',
          method: 'natural',
          maxCycles: 1,
          until: 'cycles',
          stoneBudget: 0,
          stoneReserve: 0,
        },
        m,
      ),
      before = await h.inspect(name),
      history = await h.attempt(() =>
        repo.loadActivityHistory(started.activity.id),
      ),
      after = await h.inspect(name);
    repo.close();
    return { before, after, history, first };
  });
  expect(result.history.ok).toBe(true);
  expect(result.history.value).toMatchObject({
    total: 0,
    retained: 0,
    folded: 0,
    rows: [],
  });
  expect(result.after).toEqual(result.before);
  expect(
    result.after['full-receipts'].some(
      (r: any) => r.key === result.first.runId + ':' + result.first.commandId,
    ),
  ).toBe(true);
});

for (const family of ['receipt', 'history', 'backup', 'unknown'])
  test(`future ${family} metadata rejects opening before any content write and preserves the full inventory`, async ({
    page,
  }) => {
    await setupPersistence(page);
    const result = await page.evaluate(async (family) => {
      const h = (globalThis as any).h,
        name = 'q15-future-family-' + family,
        repo = await h.FullSaveRepository.open(name),
        d = h.routes.driver();
      d.go('cave');
      const seed = { ...h.mutation(), commandId: repo.issueCommandId() },
        initial = await repo.importText(JSON.stringify(d.game), seed),
        plan = {
          kind: 'cultivation',
          method: 'natural',
          maxCycles: 1,
          until: 'cycles',
          stoneBudget: 0,
          stoneReserve: 0,
        },
        m = {
          commandId: repo.issueCommandId(),
          runId: initial.state.core.runId,
          expectedRevision: initial.state.core.revision,
          expectedActivityId: null,
          expectedActivityRevision: null,
          ownerId: 'q15-future',
        };
      const started = await repo.startActivity(plan, m),
        a = started.activity,
        realNow = Date.now;
      let done: any;
      Date.now = () => a.dueAt;
      try {
        done = await repo.settleActivity({
          commandId: a.nextCommand.commandId,
          runId: a.runId,
          expectedRevision: a.gameRevision,
          activityId: a.id,
          expectedActivityRevision: a.revision,
          ownerId: a.ownerId,
          generation: a.generation,
        });
      } finally {
        Date.now = realNow;
      }
      await repo.startActivity(plan, {
        ...m,
        commandId: repo.issueCommandId(),
        expectedRevision: done.state.core.revision,
        expectedActivityId: done.activity.id,
        expectedActivityRevision: done.activity.revision,
      });
      repo.close();
      const snapshot = await h.inspect(name),
        row =
          family === 'unknown'
            ? {
                key: 'future-unrecognized',
                value: { format: 'chenyuan-future-metadata', version: 2 },
              }
            : snapshot['full-retention'].find(
                (r: any) => r.value.kind === family,
              );
      if (!row)
        throw Error('The real fixture did not create its metadata family');
      row.value.version = 2;
      await h.put(name, 'full-retention', row.key, row.value);
      const before = await h.inspect(name),
        transaction = IDBDatabase.prototype.transaction,
        modes: string[] = [];
      IDBDatabase.prototype.transaction = function (...args: any[]) {
        if (this.name === name) modes.push(args[1] ?? 'readonly');
        return Reflect.apply(transaction, this, args);
      };
      let opened: any;
      try {
        opened = await h.attempt(async () => {
          const next = await h.FullSaveRepository.open(name);
          next.close();
          return true;
        });
      } finally {
        IDBDatabase.prototype.transaction = transaction;
      }
      return { before, after: await h.inspect(name), opened, modes };
    }, family);
    expect(result.opened.ok).toBe(false);
    expect(result.opened.code).toBe('RETENTION_INVALID');
    expect(result.after).toEqual(result.before);
    expect(result.modes.every((m: string) => m === 'readonly')).toBe(true);
  });

test('retained scheduled replies from a prefixed old run cannot enter the current away summary', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-summary-prefix',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('sect');
    const realNow = Date.now;
    let now = 1700000000000,
      prior: any = null,
      last: any;
    Date.now = () => now;
    try {
      for (const runId of ['summary:prior', 'summary']) {
        const m = {
            ...h.mutation(prior),
            runId,
            commandId: repo.issueCommandId(),
          },
          seed = await repo.importText(JSON.stringify(d.game), m),
          mutation = (s: any) => ({
            commandId: repo.issueCommandId(),
            runId: s.state.core.runId,
            expectedRevision: s.state.core.revision,
            expectedActivityId: s.activity?.id ?? null,
            expectedActivityRevision: s.activity?.revision ?? null,
            ownerId: 'q15-summary-prefix',
          }),
          start = await repo.startScheduledActivity(
            {
              kind: 'source',
              sourceId: 'work',
              maxCycles: 5,
              until: 'cycles',
              target: null,
              monthBudget: 60,
              remainingMonthsReserve: 1,
            },
            mutation({ state: seed.state, activity: null }),
          );
        now += 135000;
        last = await repo.advanceScheduledActivity(mutation(start));
        prior = last.state;
      }
      const before = await h.inspect(name),
        summary = await h.attempt(() => repo.loadAwaySummary()),
        after = await h.inspect(name);
      return { before, after, summary, last };
    } finally {
      Date.now = realNow;
      repo.close();
    }
  });
  expect(result.summary.ok).toBe(true);
  expect(result.summary.value).toMatchObject({ runId: 'summary', cycles: 4 });
  expect(result.after).toEqual(result.before);
  expect(result.last.activity.completedCycles).toBe(4);
});
