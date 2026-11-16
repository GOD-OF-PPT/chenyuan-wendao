import { proveControl } from '../e2e/scheduled-proof-support';
import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { proveRetentionDelta } from '../e2e/retention-proof-support';

test('the all-store retention proof accepts a native configuration but rejects forged metadata, lost originals and unexpected writes', async ({
  page,
}) => {
  await setupPersistence(page);
  const pair = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-proof-negative',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('cave');
    const seed = { ...h.mutation(), commandId: repo.issueCommandId() },
      initial = await repo.importText(JSON.stringify(d.game), seed);
    await repo.confirmDelivery(seed.runId, seed.commandId);
    const snapshot = (raw: any) => ({
        version: raw.version,
        rows: Object.fromEntries(
          raw.stores.map((name: string) => [name, raw[name]]),
        ),
      }),
      before = snapshot(await h.inspect(name)),
      command = {
        type: 'SCHOOL',
        school: 'talisman',
        runId: initial.state.core.runId,
        expectedRevision: initial.state.core.revision,
        commandId: repo.issueCommandId(),
      },
      intent = {
        command,
        expectedActivityId: null,
        expectedActivityRevision: null,
      },
      formal = h.engine.resolve(initial.state, command),
      out = await repo.configure(intent);
    await repo.confirmDelivery(seed.runId, command.commandId);
    const after = snapshot(await h.inspect(name)),
      row = after.rows['full-receipts'].find(
        (r: any) => r.key === command.runId + ':' + command.commandId,
      ),
      expected = structuredClone(before),
      put = (key: string, value: any) => {
        const rows = expected.rows['full-state'],
          r = rows.find((r: any) => r.key === key);
        if (r) r.value = value;
        else rows.push({ key, value });
        rows.sort((a: any, b: any) =>
          a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
        );
      };
    put('current', formal.nextState);
    put('previous', initial.state);
    expected.rows['full-receipts'].push(row);
    expected.rows['full-receipts'].sort((a: any, b: any) =>
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
    );
    const path = '/src/configuration-persistence.ts',
      { validateConfigurationReceipt } = await import(path);
    validateConfigurationReceipt(row.value, out.state);
    repo.close();
    return { before, after, expected, row, formal, out };
  });
  expect(pair.out.state).toEqual(pair.formal.nextState);
  expect(pair.out.result).toEqual(pair.formal.result);
  proveRetentionDelta(pair.before, structuredClone(pair.expected), pair.after, [
    pair.row,
  ]);
  const meta = (r: any) =>
    r.rows['full-retention'].find(
      (x: any) =>
        Array.isArray(x.key) &&
        x.key[0] === 'receipt' &&
        x.key[1] === pair.row.key,
    ).value;
  const mutations: [string, (r: any) => void][] = [
    ['unconfirmed reply', (r) => (meta(r).pending = true)],
    [
      'private receiver text',
      (r) => (meta(r).receiverId = 'private@example.invalid'),
    ],
    ['wrong receipt scope', (r) => (meta(r).parentKey = 'different-parent')],
    ['rewritten checksum', (r) => (meta(r).checksum = 'forged')],
    [
      'unaccounted sequence',
      (r) =>
        r.rows['full-retention'].find((x: any) => x.key === 'counter').value
          .sequence++,
    ],
    [
      'unknown metadata',
      (r) =>
        r.rows['full-retention'].push({
          key: 'future-extra',
          value: { version: 99 },
        }),
    ],
    ['deleted original', (r) => r.rows['full-receipts'].shift()],
    [
      'unexpected Game write',
      (r) =>
        r.rows['full-state'].find((x: any) => x.key === 'current').value.core
          .player.stones++,
    ],
    [
      'unexpected checkpoint',
      (r) =>
        r.rows['full-state'].push({
          key: 'checkpoint',
          value: { unaccounted: true },
        }),
    ],
    [
      'rewritten receipt',
      (r) =>
        r.rows['full-receipts'].find((x: any) => x.key === pair.row.key).value
          .result.costs.stones++,
    ],
    [
      'hidden new store',
      (r) => (r.rows['future-store'] = [{ key: 'unaccounted', value: true }]),
    ],
  ];
  for (const [name, mutate] of mutations) {
    const actual = structuredClone(pair.after);
    mutate(actual);
    expect(
      () =>
        proveRetentionDelta(
          pair.before,
          structuredClone(pair.expected),
          actual,
          [pair.row],
        ),
      name,
    ).toThrow();
  }
});

test('the formal START archive proof keeps pending other-life scheduled originals outside its current summary', async ({
  page,
}) => {
  await setupPersistence(page);
  const pair = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'q15-archive-proof-pending-other',
      repo = await h.FullSaveRepository.open(name),
      d = h.routes.driver();
    d.go('sect');
    const realNow = Date.now;
    let now = 1700000000000,
      prior: any = null,
      record: any;
    Date.now = () => now;
    const mutation = (s: any) => ({
        commandId: repo.issueCommandId(),
        runId: s.state.core.runId,
        expectedRevision: s.state.core.revision,
        expectedActivityId: s.activity?.id ?? null,
        expectedActivityRevision: s.activity?.revision ?? null,
        ownerId: 'proof-owner',
      }),
      plan = {
        kind: 'source',
        sourceId: 'work',
        maxCycles: 5,
        until: 'cycles',
        target: null,
        monthBudget: 60,
        remainingMonthsReserve: 1,
      },
      snapshot = (raw: any) => ({
        version: raw.version,
        rows: Object.fromEntries(raw.stores.map((n: string) => [n, raw[n]])),
      });
    try {
      for (let i = 0; i < 2; i++) {
        const m = { ...h.mutation(prior), commandId: repo.issueCommandId() },
          seed = await repo.importText(JSON.stringify(d.game), m),
          start = await repo.startScheduledActivity(
            plan,
            mutation({ state: seed.state, activity: null }),
          );
        now += 135000;
        record = await repo.advanceScheduledActivity(mutation(start));
        prior = record.state;
      }
      record = await repo.pauseScheduledActivity(mutation(record));
      const before = snapshot(await h.inspect(name)),
        m = mutation(record),
        started = await repo.startScheduledActivity(plan, m);
      await repo.confirmDelivery(m.runId, m.commandId);
      const after = snapshot(await h.inspect(name));
      return { before, after, game: record.state, started };
    } finally {
      Date.now = realNow;
      repo.close();
    }
  });
  expect(pair.started.state).toEqual(pair.game);
  proveControl(pair.after, pair.before, pair.game, 'START');
});
