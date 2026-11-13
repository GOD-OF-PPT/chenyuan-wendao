import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { historicalBalanceOneFixture } from '../../tests/historical-full-runtime.mjs';
const balanceOne = await historicalBalanceOneFixture();

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
