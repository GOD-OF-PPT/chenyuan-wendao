import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { snapshot, action, start } from './support';
import { legacyFixture, seedLegacy, npcFixture } from './fixtures';

for (const stage of ['opening', 'battle', 'foundation'] as const) {
  test(`production page migrates a real legacy ${stage} save without resetting progress`, async ({ page }) => {
    const fixture = legacyFixture(stage); await seedLegacy(page, fixture); await page.goto('/');
    await expect(page.getByTestId('realm')).toHaveText(stage === 'foundation' ? '筑基' : stage === 'battle' ? '炼气' : '凡人');
    const current = await snapshot(page);
    expect(current.format).toBe('chenyuan-full'); expect(current.core.contentVersion).toBe('full-demo.3');
    expect(current.core.player).toEqual(fixture.current.core.player);
    expect(current.core.world).toEqual(fixture.current.core.world);
    expect(current.core.runId).not.toBe(fixture.current.core.runId);
    expect(current.battle).toEqual(fixture.current.battle);
    if (stage === 'opening') await expect(page.getByTestId('help')).toBeVisible();
    if (stage === 'battle') await expect(page.getByTestId('round')).toHaveText('第 2 回合');
    await page.reload(); await expect(page.getByTestId('realm')).toBeVisible(); expect(await snapshot(page)).toEqual(current);
  });
}

test('failed write remains visibly unsaved after reread and original intent retry commits once', async ({ page }) => {
  await start(page); const before = await snapshot(page);
  await page.evaluate(() => {
    const originalGet = IDBObjectStore.prototype.get, originalPut = IDBObjectStore.prototype.put;
    (globalThis as any).receiptKeys = [];
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      if (this.name === 'full-receipts') (globalThis as any).receiptKeys.push(key);
      return originalGet.call(this, key);
    };
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === 'full-state' && key === 'current') { IDBObjectStore.prototype.put = originalPut; throw new DOMException('quota', 'QuotaExceededError'); }
      return originalPut.call(this, value, key!);
    };
  });
  await page.getByTestId('cultivate').click();
  await expect(page.getByTestId('error')).toContainText('存储空间不足');
  await expect(page.getByTestId('save-status')).toHaveText('本次未保存'); expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('retry').click();
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const after = await snapshot(page);
  expect(after.core.revision).toBe(before.core.revision + 1); expect(after.core.player.xp).toBe(before.core.player.xp + 50);
  const keys = await page.evaluate(() => (globalThis as any).receiptKeys);
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
});

test('checkpoint restore stays available for a second complete restore in the real page', async ({ page }) => {
  await start(page); const original = await snapshot(page), restored: any[] = [];
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await expect(page.getByTestId('restore-checkpoint')).toBeEnabled();
    page.once('dialog', dialog => dialog.accept()); await page.getByTestId('restore-checkpoint').click();
    await expect(page.getByTestId('realm')).toHaveText('凡人'); await expect(page.getByTestId('save-status')).toHaveText('已保存');
    restored.push(await snapshot(page));
  }
  expect(restored[0].core.runId).not.toBe(original.core.runId); expect(restored[1].core.runId).not.toBe(restored[0].core.runId);
  expect(restored[0].core.player).toEqual(restored[1].core.player); expect(restored[1].core.player.xp).toBe(10);
});

test('imported non-temple event refreshes and resolves through its real option', async ({ page }) => {
  await start(page); const fixture = npcFixture();
  await page.getByRole('button', { name: '设置', exact: true }).click(); page.once('dialog', dialog => dialog.accept());
  await page.getByTestId('import').setInputFiles({ name: 'npc.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await page.getByRole('button', { name: '关闭设置' }).click();
  await expect(page.getByTestId('event-title')).toHaveText('药香故人');
  const pending = await snapshot(page); expect(pending.core.activeEvent.instanceId).toBe(pending.core.runId + ':shen_return');
  await page.reload(); await expect(page.getByTestId('event-title')).toHaveText('药香故人');
  await action(page, 'decide-assist'); expect((await snapshot(page)).choices.shen_return).toBe('assist');
});

test('unreadable future database disables new-game writes but offers a readonly original backup', async ({ page }) => {
  await page.addInitScript(() => {
    const req = indexedDB.open('chenyuan-playable-v1', 4);
    req.onupgradeneeded = () => req.result.createObjectStore('future-data').put({ version: 99, data: 'preserve' }, 'current');
    req.onsuccess = () => req.result.close();
  });
  await page.goto('/'); await expect(page.getByTestId('error')).toContainText('数据库版本较新');
  await expect(page.getByRole('button', { name: '踏入仙途' })).toBeDisabled();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByTestId('raw-backup').click();
  const file = await download, path = await file.path(); expect(path).toBeTruthy();
  const backup = JSON.parse(readFileSync(path!, 'utf8'));
  expect(backup.format).toBe('chenyuan-raw-database-backup'); expect(backup.database.version).toBe(4);
  expect(backup.stores[0].entries[0].value).toEqual({ version: 99, data: 'preserve' });
});


test('live tabs synchronize committed progression and replacement run before the next action', async ({ page, context }) => {
  await start(page); const other = await context.newPage(); await other.goto('/');
  await expect(other.getByTestId('realm')).toHaveText('炼气');
  await action(page, 'cultivate'); await expect(other.getByTestId('xp')).toHaveText('50 / 1000');
  await expect(page.getByTestId('action-receipt')).toBeVisible();
  await action(other, 'cultivate'); await expect(page.getByTestId('xp')).toHaveText('100 / 1000');
  await expect(page.getByTestId('action-receipt')).toHaveCount(0);
  const before = await snapshot(page);
  await page.getByRole('button', { name: '设置', exact: true }).click(); page.once('dialog', dialog => dialog.accept());
  await page.getByTestId('restart').click(); await expect(page.getByTestId('help')).toBeVisible();
  await expect(other.getByTestId('help')).toBeVisible(); const replaced = await snapshot(other);
  expect(replaced.core.runId).not.toBe(before.core.runId); expect(replaced.core.revision).toBe(0);
  await action(other, 'leave'); await expect(page.getByTestId('help')).toHaveCount(0);
  await expect(page.getByTestId('save-status')).toHaveText('已保存'); await other.close();
});

test('live database version change disables stale writes and provides a reload path', async ({ page }) => {
  await start(page); const before = await snapshot(page);
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('chenyuan-playable-v1', 4);
    request.onsuccess = () => { request.result.close(); resolve(); }; request.onerror = () => reject(request.error);
  }));
  await page.getByTestId('cultivate').click(); await expect(page.getByTestId('error')).toContainText('连接已更新或关闭');
  await expect(page.getByTestId('save-status')).toHaveText('本次未保存');
  await expect(page.getByTestId('cultivate')).toBeDisabled(); expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('reload-storage').click(); await expect(page.getByTestId('error')).toContainText('数据库版本较新');
  await expect(page.getByTestId('cultivate')).toBeDisabled(); expect(await snapshot(page)).toEqual(before);
});
