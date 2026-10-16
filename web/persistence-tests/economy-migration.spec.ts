import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
test.beforeEach(async ({ page }) => setupPersistence(page));

// Fixtures use real natural-cultivation commands: no changed assisted fees are fabricated.
async function seedBalanceOne(page: any, name: string) {
  return page.evaluate(async (name: string) => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open(name);
    const prepared = h.routes.fullRoute().checkpoints.qi;
    const imported = await repo.importText(JSON.stringify(prepared), h.mutation());
    const oldCommand = h.command(imported.state, { type: 'BREAKTHROUGH' });
    await repo.execute(oldCommand); repo.close();
    const raw = await h.inspect(name), state = raw[h.FULL_STATE_STORE];
    for (const entry of state) {
      if (['current', 'previous'].includes(entry.key)) entry.value.core.balanceVersion = 'full-unbalanced.1';
      if (entry.key === 'checkpoint') { entry.value.snapshot.core.balanceVersion = 'full-unbalanced.1'; entry.value.versions.balanceVersion = 'full-unbalanced.1'; }
      await h.put(name, h.FULL_STATE_STORE, entry.key, entry.value);
    }
    for (const entry of raw[h.FULL_RECEIPT_STORE]) {
      if (entry.value.result) entry.value.result.versions.balanceVersion = 'full-unbalanced.1';
      await h.put(name, h.FULL_RECEIPT_STORE, entry.key, entry.value);
    }
    await h.put(name, h.FULL_RECEIPT_STORE, 'raw-undefined', undefined);
    return { oldCommand, before: await h.inspect(name) };
  }, name);
}

test('balance migration preserves snapshots and all raw receipts, creates a new run and is repeatable', async ({ page }) => {
  const seeded = await seedBalanceOne(page, 'economy-migrate');
  const result = await page.evaluate(async ({ name, oldCommand }: any) => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open(name);
    const current = await repo.load(), previous = await repo.loadPrevious(), cp = await repo.loadCheckpoint();
    const stale = await h.attempt(() => repo.execute(oldCommand));
    const first = await h.inspect(name), archives = await repo.archives(); repo.close();
    const reopened = await h.FullSaveRepository.open(name), again = await reopened.load(), second = await h.inspect(name);
    const restored = await reopened.restoreCheckpoint(h.mutation(again));
    const restoredAgain = await reopened.restoreCheckpoint(h.mutation(restored.state)); reopened.close();
    return { current, previous, cp, stale, first, second, again, archives, restored: restored.state, restoredAgain: restoredAgain.state,
      undefinedArchived: archives.some((entry: any) => /\/receipts\//.test(entry.key) && entry.value === undefined) };
  }, { name: 'economy-migrate', oldCommand: seeded.oldCommand });
  const original = seeded.before['full-state'].find((row: any) => row.key === 'current').value;
  const prior = seeded.before['full-state'].find((row: any) => row.key === 'previous').value;
  expect(result.current.core.balanceVersion).toBe('full-unbalanced.2');
  expect(result.current.core.runId).not.toBe(original.core.runId); expect(result.current.core.revision).toBe(0);
  for (const key of ['player', 'world', 'inventory']) { expect(result.current.core[key]).toEqual(original.core[key]); expect(result.previous.core[key]).toEqual(prior.core[key]); }
  expect(result.current.choices).toEqual(original.choices); expect(result.current.loadout).toEqual(original.loadout);
  expect(result.cp.snapshot.core.balanceVersion).toBe('full-unbalanced.2');
  expect(result.cp.snapshot.core.player).toEqual(prior.core.player);
  for (const row of seeded.before['full-state']) expect(result.archives.some((a: any) => JSON.stringify(a.value) === JSON.stringify(row.value))).toBe(true);
  for (const row of seeded.before['full-receipts']) expect(result.archives.some((a: any) => /\/receipts\//.test(a.key) && JSON.stringify(a.value) === JSON.stringify(row.value))).toBe(true);
  expect(result.undefinedArchived).toBe(true); expect(result.stale.code).toBe('RUN_MISMATCH');
  expect(result.again).toEqual(result.current); expect(result.second).toEqual(result.first);
  for (const restored of [result.restored, result.restoredAgain]) {
    expect(restored.core.player).toEqual(result.cp.snapshot.core.player); expect(restored.core.inventory).toEqual(result.cp.snapshot.core.inventory);
    expect(restored.core.world).toEqual(result.cp.snapshot.core.world); expect(restored.core.balanceVersion).toBe('full-unbalanced.2');
  }
  expect(result.restoredAgain.core.runId).not.toBe(result.restored.core.runId);
  expect(result.first['full-receipts']).toHaveLength(1); expect(result.first['full-receipts'][0].value.kind).toBe('MIGRATE');
});

test('quota failure while archiving a receipt aborts the whole balance migration, then retry works', async ({ page }) => {
  const seeded = await seedBalanceOne(page, 'economy-quota');
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === h.FULL_BACKUP_STORE && typeof key === 'string' && key.includes('/receipts/')) throw new DOMException('archive quota', 'QuotaExceededError');
      return put.call(this, value, key!);
    };
    let failed;
    try { failed = await h.attempt(() => h.FullSaveRepository.open('economy-quota')); }
    finally { IDBObjectStore.prototype.put = put; }
    const afterFailure = await h.inspect('economy-quota'), repo = await h.FullSaveRepository.open('economy-quota');
    const retried = await repo.load(); repo.close(); return { failed, afterFailure, retried };
  });
  expect(result.failed.code).toBe('STORAGE_QUOTA'); expect(result.afterFailure).toEqual(seeded.before);
  expect(result.retried.core.balanceVersion).toBe('full-unbalanced.2');
});

test('unknown balance cannot migrate, mutate or discard the original', async ({ page }) => {
  const seeded = await seedBalanceOne(page, 'economy-future');
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = await h.inspect('economy-future');
    const raw = rows[h.FULL_STATE_STORE].find((r: any) => r.key === 'current').value;
    raw.core.balanceVersion = 'full-unbalanced.999'; await h.put('economy-future', h.FULL_STATE_STORE, 'current', raw);
    const before = await h.inspect('economy-future'), failed = await h.attempt(() => h.FullSaveRepository.open('economy-future'));
    return { failed, before, after: await h.inspect('economy-future') };
  });
  expect(seeded.before.version).toBe(3); expect(result.failed.code).toBe('SAVE_VERSION'); expect(result.after).toEqual(result.before);
});
