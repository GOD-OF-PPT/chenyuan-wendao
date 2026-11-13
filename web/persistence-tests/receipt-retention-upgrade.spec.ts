import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { historicalBalanceOneFixture } from '../../tests/historical-full-runtime.mjs';
import { createDb10NativeFixture } from '../../tests/db10-native-fixture.mjs';
import { expectBaselineUpgrade } from './retention-upgrade-proof';
const balanceOne = await historicalBalanceOneFixture();

test('creating and reclaiming the exact historical source cannot reload another live native page', async ({
  page,
  context,
}, info) => {
  const frames: string[] = [];
  page.on('websocket', (socket) =>
    socket.on('framereceived', (event) => {
      if (typeof event.payload === 'string') frames.push(event.payload);
    }),
  );
  await setupPersistence(page);
  const initial = await page.evaluate(() => ({
    time: performance.timeOrigin,
    marker: ((window as any).__q15LiveMarker = crypto.randomUUID()),
  }));
  let fixture: any, peer: any;
  try {
    fixture = createDb10NativeFixture();
    peer = await context.newPage();
    await peer.goto('/persistence-tests/harness.html');
    await peer.evaluate(async (url) => {
      const old = await import(url);
      const repo = await old.FullSaveRepository.open('q15-watch-isolation');
      repo.close();
    }, fixture.repositoryUrl);
    fixture.cleanup();
    // Observe actual Vite watcher delivery; this does not advance a game clock.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const final = await page.evaluate(() => ({
      time: performance.timeOrigin,
      marker: (window as any).__q15LiveMarker,
    }));
    await info.attach('historical-source-watch-isolation', {
      body: JSON.stringify({ initial, final, frames }),
      contentType: 'application/json',
    });
    expect(final).toEqual(initial);
    expect(
      frames
        .map((frame) => JSON.parse(frame))
        .filter((frame) => frame.type === 'full-reload'),
    ).toEqual([]);
  } finally {
    fixture?.cleanup();
    await peer?.close();
  }
});

test('old-content migration snapshots pre-upgrade backup membership before creating its new atomic backup group', async ({
  page,
}) => {
  await setupPersistence(page);
  const result = await page.evaluate(async (fixture) => {
    const h = (globalThis as any).h,
      name = 'q15-mixed-old-backups';
    await h.emptyLegacyDatabase(name);
    for (const [key, value] of [
      ['current', fixture.current],
      ['previous', fixture.previous],
      ['checkpoint', fixture.checkpoint],
      ['checkpoint-owner', fixture.owner],
    ])
      await h.put(name, 'full-state', key, value);
    await h.put(
      name,
      'full-receipts',
      fixture.command.runId + ':' + fixture.command.commandId,
      fixture.receipt,
    );
    await new Promise<void>((yes, no) => {
      const q = indexedDB.open(name);
      q.onerror = () => no(q.error);
      q.onsuccess = () => {
        const db = q.result,
          tx = db.transaction('full-backups', 'readwrite');
        for (let i = 0; i < 100; i++)
          tx.objectStore('full-backups').put(
            { old: i },
            'a' + i.toString().padStart(3, '0'),
          );
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
      repo = await h.FullSaveRepository.open(name),
      upgraded = await h.inspect(name),
      state = await repo.load(),
      m = { ...h.mutation(state), commandId: repo.issueCommandId() },
      out = await repo.create('明确的新卷', m),
      ack = await h.attempt(() =>
        repo.confirmDelivery(out.state.core.runId, m.commandId),
      ),
      after = await h.inspect(name);
    repo.close();
    return { before, upgraded, ack, after };
  }, balanceOne);
  const originalKeys = result.before['full-backups']
      .map((r: any) => r.key)
      .sort(),
    baselineKeys = result.upgraded['full-retention']
      .filter((r: any) => r.value.format === 'chenyuan-baseline-backup')
      .map((r: any) => r.value.key)
      .sort();
  expect(baselineKeys).toEqual(originalKeys);
  expect(result.ack.ok).toBe(true);
  for (const original of result.before['full-backups'])
    expect(result.after['full-backups']).toContainEqual(original);
});

test('an accepted DB10 live away window upgrades unchanged and completes its remaining 64 plus 2 cycles exactly once', async ({
  page,
}, info) => {
  const db10 = createDb10NativeFixture();
  try {
    await setupPersistence(page);
    const source = {
      sourceCommit: db10.sourceCommit,
      tree: db10.tree,
      archiveSha256: db10.archiveSha256,
      repositorySha256: db10.repositorySha256,
      repositoryUrl: db10.repositoryUrl,
      routesUrl: db10.routesUrl,
    };
    const result = await page.evaluate(async (source) => {
      const h = (globalThis as any).h,
        old = await import(source.repositoryUrl),
        routes = await import(source.routesUrl),
        name = 'q15-actual-db10-window',
        repo = await old.FullSaveRepository.open(name),
        d = routes.driver();
      if (old.FULL_DB_VERSION !== 10)
        throw Error('Expected the exact accepted DB10 repository');
      while (d.game.core.player.realm !== 'spirit') d.realm();
      d.go('sect');
      const realNow = Date.now;
      let now = 1700000000000;
      Date.now = () => now;
      let current: any;
      try {
        const imported = await repo.importText(
            JSON.stringify(d.game),
            h.mutation(),
          ),
          mutation = (s: any, id: string) => ({
            commandId: id,
            runId: s.state.core.runId,
            expectedRevision: s.state.core.revision,
            expectedActivityId: s.activity?.id ?? null,
            expectedActivityRevision: s.activity?.revision ?? null,
            ownerId: 'q15-db10-owner',
          }),
          start = await repo.startScheduledActivity(
            {
              kind: 'source',
              sourceId: 'work',
              repeat: true,
              maxCycles: 1_000_000_000,
              until: 'cycles',
              target: null,
              monthBudget: 1560,
              remainingMonthsReserve: 1,
            },
            mutation(
              { state: imported.state, activity: null },
              'db10-original-start',
            ),
          );
        now += 130 * start.activity.cycleMs + 15000;
        const originalIntent = mutation(start, 'db10-original-advance'),
          first = await repo.advanceScheduledActivity(originalIntent),
          before = await h.FullSaveRepository.exportRaw(name);
        current = await h.FullSaveRepository.open(name);
        const upgraded = await h.FullSaveRepository.exportRaw(name),
          oldClosed = await h.attempt(() => repo.load()),
          replay = await current.advanceScheduledActivity(originalIntent),
          afterReplay = await h.FullSaveRepository.exportRaw(name);
        let out = await current.loadActivitySnapshot();
        const chunks: number[] = [];
        do {
          const m = mutation(out, current.issueCommandId());
          out = await current.advanceScheduledActivity(m);
          chunks.push(out.cycles);
          await current.confirmDelivery(m.runId, m.commandId);
        } while (out.more);
        let expected = first.state;
        for (let i = 0; i < 66; i++)
          expected = h.engine.resolve(expected, {
            type: 'SOURCE',
            sourceId: 'work',
            count: 1,
            commandId: 'independent-remaining-' + i,
            runId: expected.core.runId,
            expectedRevision: expected.core.revision,
          }).nextState;
        const settled = await h.FullSaveRepository.exportRaw(name),
          again = await current.advanceScheduledActivity(originalIntent),
          afterAgain = await h.FullSaveRepository.exportRaw(name),
          summary = await current.loadAwaySummary();
        return {
          before,
          upgraded,
          oldClosed,
          replay,
          afterReplay,
          first,
          chunks,
          out,
          expected,
          settled,
          again,
          afterAgain,
          summary,
        };
      } finally {
        Date.now = realNow;
        repo.close();
        current?.close();
      }
    }, source);
    expect(result.before.database.version).toBe(10);
    expect(result.first.cycles).toBe(64);
    expect(result.first.more).toBe(true);
    expect(result.first.schedule.window).not.toBeNull();
    expectBaselineUpgrade(result.before, result.upgraded);
    expect(result.oldClosed.code).toBe('STORAGE_CLOSED');
    expect(result.replay.replayed).toBe(true);
    expect(result.afterReplay).toEqual(result.upgraded);
    expect(result.chunks).toEqual([64, 2]);
    expect(result.out.state).toEqual(result.expected);
    expect(result.out.activity.completedCycles).toBe(130);
    expect(result.summary.cycles).toBe(130);
    expect(result.summary.costs.months).toBe(1560);
    expect(result.summary.delta.stones).toBe(2600);
    expect(result.again.replayed).toBe(true);
    expect(result.afterAgain).toEqual(result.settled);
    await info.attach('accepted-db10-live-window', {
      body: JSON.stringify({
        ...source,
        sourceSchema: 10,
        targetSchema: 11,
        originalBatch: result.first.cycles,
        remainingChunks: result.chunks,
        summaryCycles: result.summary.cycles,
        originalFourStoresUnchanged: true,
        replaysWriteNothing: true,
      }),
      contentType: 'application/json',
    });
  } finally {
    db10.cleanup();
  }
});

test('multiple DB10 windows use their real saved revisions rather than baseline random-key enumeration order', async ({
  page,
}) => {
  const fixture = createDb10NativeFixture();
  try {
    await setupPersistence(page);
    const result = await page.evaluate(async (url) => {
      const h = (globalThis as any).h,
        old = await import(url),
        name = 'q15-db10-window-order',
        d = h.routes.driver();
      d.go('sect');
      const repo = await old.FullSaveRepository.open(name),
        realNow = Date.now;
      let now = 1700000000000,
        current: any;
      Date.now = () => now;
      try {
        const initial = await repo.importText(
            JSON.stringify(d.game),
            h.mutation(),
          ),
          m = (s: any, id: string) => ({
            commandId: id,
            runId: s.state.core.runId,
            expectedRevision: s.state.core.revision,
            expectedActivityId: s.activity?.id ?? null,
            expectedActivityRevision: s.activity?.revision ?? null,
            ownerId: 'db10-order',
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
            m({ state: initial.state, activity: null }, 'db10-start'),
          );
        now += 30000;
        const first = await repo.advanceScheduledActivity(
          m(start, 'z-older-window'),
        );
        now += 60000;
        await repo.advanceScheduledActivity(m(first, 'a-latest-window'));
        const expected = await repo.loadAwaySummary(),
          before = await h.FullSaveRepository.exportRaw(name);
        current = await h.FullSaveRepository.open(name);
        const afterUpgrade = await h.FullSaveRepository.exportRaw(name),
          summary = await current.loadAwaySummary(),
          after = await h.FullSaveRepository.exportRaw(name);
        return { expected, before, afterUpgrade, summary, after };
      } finally {
        Date.now = realNow;
        repo.close();
        current?.close();
      }
    }, fixture.repositoryUrl);
    expect(result.expected.cycles).toBe(2);
    expectBaselineUpgrade(result.before, result.afterUpgrade);
    expect(result.summary).toEqual(result.expected);
    expect(result.after).toEqual(result.afterUpgrade);
  } finally {
    fixture.cleanup();
  }
});
