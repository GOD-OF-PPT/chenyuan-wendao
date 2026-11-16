import {answerGameConfirmation} from './game-confirmation-support';
import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { driver } from '../../tests/full-route.mjs';
import { newGame, resolve, validateGame } from '../../src/full/engine.ts';
import { previewAction } from '../../src/full/queries.ts';
import type { Game } from '../../src/full/types.ts';
import type { Activity } from '../../src/full/activity.ts';
import { useJourneyClock, finishJourneyClock, activitySnapshot, openHubFeature, selectGoal, revealPaged } from './support';
import { openSupplySettings, closeSupplySettings, openInventoryLibrary, openInventoryUses } from './stage-support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
const databaseName = 'chenyuan-playable-v1', trackingKey = 'chenyuan-tracked-goal-v1';
type RawDatabase = { version: number; names: string[]; rows: Record<string, Array<{ key: any; value: any }>> };
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const found: string[] = []; errors.set(page, found); page.on('pageerror', e => found.push(e.message)); });
test.afterEach(async ({ page }, info) => {
  if (!page.isClosed()) await page.evaluate(() => {
    const w = window as any; w.__m03RestoreStorage?.(); w.__m03RestoreDecode?.();
    w.__m03OldDecode?.release?.('success'); w.__m03ImageObserver?.disconnect();
  });
  await info.attach('boundary-page-errors', { body: JSON.stringify(errors.get(page) ?? []), contentType: 'application/json' });
  expect(errors.get(page) ?? []).toEqual([]);
});

async function evidence(info: TestInfo, name: string, data: unknown) {
  await info.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}
async function database(page: Page): Promise<RawDatabase> {
  return page.evaluate(name => new Promise<RawDatabase>((accept, reject) => {
    const q = indexedDB.open(name);
    q.onupgradeneeded = () => { q.transaction!.abort(); reject(new Error('Readonly observation cannot create the fixture database')); };
    q.onerror = () => reject(q.error);
    q.onsuccess = () => {
      const db = q.result, names = [...db.objectStoreNames], tx = db.transaction(names, 'readonly');
      const rows: RawDatabase['rows'] = {};
      for (const name of names) {
        rows[name] = []; const read = tx.objectStore(name).openCursor();
        read.onsuccess = () => { if (read.result) { rows[name].push({ key: read.result.key, value: read.result.value }); read.result.continue(); } };
      }
      tx.oncomplete = () => { const version = db.version; db.close(); accept({ version, names, rows }); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), databaseName);
}
const gameOf = (raw: RawDatabase) => raw.rows['full-state']?.find(row => row.key === 'current')?.value as Game | undefined;
const activityOf = (raw: RawDatabase) => raw.rows['full-state']?.find(row => row.key === 'activity')?.value as Activity | undefined;

async function hit(locator: Locator) {
  await expect(locator).toBeVisible();
  const r = await locator.evaluate(node => {
    const b = node.getBoundingClientRect(), nav = document.getElementById('primary-navigation')?.getBoundingClientRect();
    const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2), outside: string[] = [];
    for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const p = parent.getBoundingClientRect();
      if (getComputedStyle(parent).display !== 'contents' && p.width && p.height &&
        (b.left < p.left - 1 || b.right > p.right + 1 || b.top < p.top - 1 || b.bottom > p.bottom + 1)) outside.push(parent.id || parent.className);
    }
    return { width: b.width, height: b.height, font: parseFloat(getComputedStyle(node).fontSize),
      inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight,
      aboveNav: !nav || !nav.width || b.bottom <= nav.top, hit: top === node || !!top && node.contains(top), outside,
      oneScreen: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth };
  });
  expect(r.width).toBeGreaterThanOrEqual(44); expect(r.height).toBeGreaterThanOrEqual(44);
  expect(r.font).toBeGreaterThanOrEqual(14); expect(r.inside).toBe(true); expect(r.aboveNav).toBe(true);
  expect(r.hit).toBe(true); expect(r.outside).toEqual([]); expect(r.oneScreen).toBe(true);
}
async function click(locator: Locator) { await expect(locator).toBeEnabled(); await hit(locator); await locator.click(); }
async function settings(page: Page) {
  if (!await page.getByRole('dialog', { name: '行旅设置', exact: true }).isVisible()) await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '行旅设置', exact: true })).toBeVisible();
}
async function load(page: Page, source?: Game) {
  const d = driver(); d.go('cave'); const fixture = source ?? d.game; validateGame(fixture);
  await useJourneyClock(page); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
  await page.getByLabel('导入已有存档', { exact: true }).setInputFiles({ name: 'm03-valid-ui-boundary.json',
    mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const raw = await database(page), actual = gameOf(raw)!, expected = structuredClone(fixture);
  expect(actual.core.runId).not.toBe(expected.core.runId); expected.core.runId = actual.core.runId; expected.core.revision = 0;
  if (expected.core.activeEvent) expected.core.activeEvent.instanceId = actual.core.runId + ':' + expected.core.activeEvent.id;
  expect(actual).toEqual(expected); expect(activityOf(raw)).toBeUndefined();
  return { game: actual, raw };
}
async function target(page: Page, value: string, quantity?: number) {
  await selectGoal(page, value);
  if (quantity !== undefined) {
    const manager = page.getByTestId('goal-management');
    if (!await manager.evaluate(node => (node as HTMLDetailsElement).open)) await page.getByTestId('goal-management-toggle').click();
    await page.getByLabel('目标数量', { exact: true }).fill(String(quantity)); await page.getByLabel('目标数量', { exact: true }).blur();
    await page.getByTestId('goal-management-toggle').click();
  }
}
async function running(page: Page) {
  await expect.poll(async () => (await activitySnapshot(page))?.status).toBe('running'); const a = await activitySnapshot(page) as Activity;
  await expect(page.locator('[data-testid=training-activity][data-generation="' + a.generation + '"][data-running=true]')).toBeVisible();
  await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs / 1000).toFixed(1) + ' 秒');
  await expect(page.getByTestId('save-status')).toHaveText('已保存'); return a;
}

test('M03-B1 an exact tracked target survives reload and resets for a separately confirmed new life without readonly Game writes', async ({ page }, info) => {
  const before = await load(page); await target(page, 'item:herb', 3);
  await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×3'); expect(await database(page)).toEqual(before.raw);
  const preference = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), trackingKey);
  expect(preference).toEqual({ version: 1, runId: before.game.core.runId, target: { kind: 'item', id: 'herb', quantity: 3 } });
  await page.reload(); await expect(page.getByTestId('save-status')).toHaveText('已保存'); await openHubFeature(page, 'goal');
  await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×3'); expect(await database(page)).toEqual(before.raw);
  await settings(page); await page.getByTestId('restart').click();await answerGameConfirmation(page,'restart');
  await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const restarted = await database(page), fresh = gameOf(restarted)!;
  expect(fresh.core.runId).not.toBe(before.game.core.runId); expect(fresh).toEqual(newGame(before.game.core.player.name, fresh.core.runId));
  if (await page.getByRole('dialog', { name: '行旅设置', exact: true }).isVisible()) await page.getByRole('button', { name: '关闭设置', exact: true }).click();
  await openHubFeature(page, 'goal'); await expect(page.getByTestId('goal-select')).toHaveValue('breakthrough');
  expect(await database(page)).toEqual(restarted); await evidence(info, 'tracking-life-scope', { before, preference, restarted, current: await database(page) });
});

test('M03-B2 corrupt and unavailable tracking preferences remain separate from the valid saved Game and readonly target editing', async ({ page }, info) => {
  const before = await load(page);
  await page.evaluate(({ key, run }) => localStorage.setItem(key, JSON.stringify({ version: 1, runId: run,
    target: { kind: 'item', id: '__proto__', quantity: 1 } })), { key: trackingKey, run: before.game.core.runId });
  await page.reload(); await expect(page.getByTestId('save-status')).toHaveText('已保存'); await openHubFeature(page, 'goal');
  await expect(page.getByTestId('goal-select')).toHaveValue('breakthrough'); expect(await database(page)).toEqual(before.raw);
  await page.evaluate(key => {
    const w = window as any, original = Storage.prototype.setItem; w.__m03DeniedTracking = [];
    w.__m03RestoreStorage = () => Storage.prototype.setItem = original;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (this === localStorage && name === key) { w.__m03DeniedTracking.push({ key: name, value }); throw new DOMException('M03 tracking preference denied', 'SecurityError'); }
      return original.call(this, name, value);
    };
  }, trackingKey);
  await target(page, 'item:herb', 2); await expect(page.getByTestId('goal-panel')).toContainText('追踪选择仅在本页保留');
  await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×2');
  await page.getByTestId('goal-management-toggle').click();
  for (const invalid of ['0', '1.5']) {
    await page.getByLabel('目标数量', { exact: true }).fill(invalid); await page.getByLabel('目标数量', { exact: true }).blur();
    await expect(page.getByLabel('目标数量', { exact: true })).toHaveValue('2'); expect(await database(page)).toEqual(before.raw);
  }
  await page.getByTestId('goal-management-toggle').click(); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const denied = await page.evaluate(() => (window as any).__m03DeniedTracking); expect(denied.length).toBeGreaterThan(0);
  expect(denied.every((r: any) => r.key === trackingKey)).toBe(true); expect(await database(page)).toEqual(before.raw);
  await evidence(info, 'tracking-storage-boundary', { before, denied, after: await database(page) });
});

test('M03-B3 a tracked real medicine remains spendable and one exact six-second use exposes its new shortage', async ({ page }, info) => {
  // Both injury and stock are produced by legal actions, not direct HP or item mutation.
  const d = driver(); d.go('wilderness'); d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
  d.doAction({ type: 'BATTLE', move: 'attack' }); d.doAction({ type: 'BATTLE', move: 'flee' });
  expect(previewAction(d.game, { type: 'USE', item: 'healing_pill' }).allowed).toBe(true);
  const before = await load(page, d.game), wanted = before.game.core.inventory.healing_pill;
  expect(wanted).toBeGreaterThan(0); await target(page, 'item:healing_pill', wanted);
  await expect(page.getByTestId('goal-complete')).toBeVisible(); expect(await database(page)).toEqual(before.raw);
  await page.getByTestId('tab-2').click(); await checkArt03Read(page,async()=>{await openInventoryLibrary(page);await revealPaged(page, 'inventory-select-healing_pill', 'inventory-library-dialog', '行囊');
  await page.getByTestId('inventory-select-healing_pill').click();await expect(page.getByTestId('inventory-library-dialog')).not.toBeVisible();});
  await checkArt03Read(page,async()=>{await openInventoryUses(page);await expect(page.getByTestId('inventory-uses-dialog')).toBeVisible();});
  await expect(page.getByTestId('inventory-uses-dialog')).toContainText('会消耗追踪物资');
  await expect(page.getByTestId('inventory-uses-dialog')).toContainText('材料未被预留');
  await evidence(info, 'tracked-medicine-before-use', { before, wanted, warning: await page.getByTestId('inventory-uses-dialog').innerText() });
  await click(page.getByTestId('inspect-use-healing_pill')); await openSupplySettings(page);
  await page.getByLabel('最多服丹数', { exact: true }).fill('1'); await page.getByLabel('恢复目标百分比', { exact: true }).fill('100');
  await page.getByLabel('服丹库存保留量', { exact: true }).fill('0'); await closeSupplySettings(page);
  expect(await database(page)).toEqual(before.raw); await click(page.getByTestId('preparation-start'));
  const a = await running(page), arranged = await database(page), expected = resolve(before.game, a.nextCommand!);
  expect(a.version).toBe(5); expect(a.plan).toMatchObject({ kind: 'use', item: 'healing_pill', maxCycles: 1 });
  expect(a.cycleMs).toBe(6000); expect(expected.result.costs.items).toEqual({ healing_pill: 1 });
  expect(gameOf(arranged)).toEqual(before.game); await page.clock.fastForward(5999); expect(await database(page)).toEqual(arranged);
  await page.clock.fastForward(1); await expect.poll(async () => (await activitySnapshot(page))?.completedCycles).toBe(1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存'); const paid = await database(page);
  expect(gameOf(paid)).toEqual(expected.nextState); expect(activityOf(paid)!.status).toBe('stopped');
  const receipts = paid.rows['full-receipts'].filter(r => r.key === a.runId + ':' + a.nextCommand!.commandId);
  expect(receipts).toHaveLength(1); expect(receipts[0].value.result).toEqual(expected.result);
  await expect.poll(async () => { await page.clock.runFor(16); return page.getByTestId('recovery-result').isVisible(); }).toBe(true);
  await openHubFeature(page, 'goal'); await expect(page.getByTestId('goal-complete')).toHaveCount(0);
  await expect(page.getByTestId('need-healing_pill')).toContainText(/尚缺\s*1/); expect(await database(page)).toEqual(paid);
  await hit(page.getByTestId('goal-management-toggle')); await page.screenshot({ path: info.outputPath('tracked-medicine-actual-shortage.png') });
  await evidence(info, 'tracked-medicine-paid-once', { before, wanted, a, arranged, expected, paid, afterReadonly: await database(page) });
});

test('M03-B4 legal imported name and journal markup stay literal readable text without script or external requests', async ({ page }, info) => {
  const external: string[] = []; page.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && !['127.0.0.1', 'localhost'].includes(u.hostname)) external.push(r.url()); });
  const d = driver(), source = structuredClone(d.game);
  // Schema-valid untrusted display text, not a corrupted/progression-granting Game.
  const payload = '<img src="https://invalid.example.test/unsafe-marker" onerror="window.__m03Unsafe=1">';
  source.core.player.name = '<b>道号</b>'; source.journal = [payload]; validateGame(source);
  const before = await load(page, source);
  await evidence(info, 'valid-untrusted-display-input', { before, payload, external });
  await expect(page.getByTestId('hud-character')).toContainText('<b>道号</b>');
  await page.getByTestId('tab-3').click(); await click(page.getByTestId('fate-mode-journal'));
  const paragraph = page.getByTestId('journal-entry').locator('p'); await expect(paragraph).toHaveText(payload);
  expect(await paragraph.evaluate(n => parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(18);
  await expect(page.locator('img[src*="unsafe-marker"]')).toHaveCount(0);
  await expect(page.getByTestId('hud-character').locator('b').filter({ hasText: /^道号$/ })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__m03Unsafe)).toBeUndefined(); expect(external).toEqual([]);
  expect(await database(page)).toEqual(before.raw); await evidence(info, 'inert-imported-display-text', { before, payload, external, after: await database(page) });
});

for (const [number, outcome] of [[5, 'success'], [6, 'error']] as const)
  test('M03-B' + number + ' a late old image decode ' + outcome + ' delivery cannot replace the newer saved scene', async ({ page }, info) => {
    await page.addInitScript(() => {
      const w = window as any, native = HTMLImageElement.prototype.decode; let first = true;
      w.__m03RestoreDecode = () => HTMLImageElement.prototype.decode = native;
      HTMLImageElement.prototype.decode = function () {
        if (!first || !this.closest('[data-asset-id=world-ambience]') || !this.src.endsWith('/art/v2/scenes/opening.webp')) return native.call(this);
        first = false; w.__m03RestoreDecode(); const image = this;
        return native.call(image).then(() => new Promise<void>((accept, reject) => {
          let released = false;
          w.__m03OldDecode = { image, nativeDecoded: image.naturalWidth > 0, path: image.src, settled: false,
            release(kind: string) { if (released) return; released = true; if (kind === 'error') reject(new DOMException('M03 old decode delivery failed', 'EncodingError')); else accept(); } };
        })).finally(() => { w.__m03OldDecode.settled = true; });
      };
    });
    await useJourneyClock(page); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
    await page.getByRole('button', { name: /^踏入仙途/ }).click(); await finishJourneyClock(page);
    await expect(page.getByTestId('save-status')).toHaveText('已保存');
    await expect.poll(() => page.evaluate(() => !!(window as any).__m03OldDecode?.nativeDecoded)).toBe(true);
    const opening = await database(page); await page.getByTestId('leave').click(); await page.getByTestId('milestone-confirm').click();
    const a = await running(page); expect(a.cycleMs).toBe(6000); await page.clock.fastForward(6000);
    await expect.poll(async () => (await activitySnapshot(page))?.completedCycles).toBe(1);
    await expect(page.getByTestId('save-status')).toHaveText('已保存');
    const world = page.locator('[data-asset-id=world-ambience]');
    await expect(world).toHaveAttribute('data-art-path', 'art/v2/scenes/wilderness.webp'); await expect(world).toHaveAttribute('data-art-state', 'ready');
    const current = await database(page), expected = resolve(gameOf(opening)!, a.nextCommand!);
    expect(gameOf(current)).toEqual(expected.nextState);
    const beforeRelease = await page.evaluate(() => {
      const w = window as any, node = document.querySelector('[data-asset-id=world-ambience]')!, image = node.querySelector('img')!;
      w.__m03ImageStates = []; w.__m03ImageObserver = new MutationObserver(() => w.__m03ImageStates.push({ path: node.getAttribute('data-art-path'), state: node.getAttribute('data-art-state'), src: image.getAttribute('src') }));
      w.__m03ImageObserver.observe(node, { attributes: true, subtree: true });
      return { nativeDecoded: w.__m03OldDecode.nativeDecoded, oldPath: w.__m03OldDecode.path,
        newPath: node.getAttribute('data-art-path'), newSrc: image.getAttribute('src'), newNode: image !== w.__m03OldDecode.image };
    });
    expect(beforeRelease.nativeDecoded).toBe(true); expect(beforeRelease.newNode).toBe(true);
    await evidence(info, 'late-old-image-before-release', { opening, a, expected, current, beforeRelease });
    await page.evaluate(kind => (window as any).__m03OldDecode.release(kind), outcome);
    await expect.poll(() => page.evaluate(() => (window as any).__m03OldDecode.settled)).toBe(true); await page.clock.runFor(32);
    const changes = await page.evaluate(() => (window as any).__m03ImageStates), after = await database(page);
    await evidence(info, 'late-old-image-delivery-' + outcome, { opening, a, expected, current, beforeRelease, changes, after: await database(page),
      seam: 'The old real image successfully decoded natively. Only delivery of that old decode promise is held, then resolved or rejected; this is not a claim of a native network-image failure.' });
    await expect(world).toHaveAttribute('data-art-path', beforeRelease.newPath!); await expect(world).toHaveAttribute('data-art-state', 'ready');
    await expect(world.locator('img')).toHaveAttribute('src', beforeRelease.newSrc!);
    for (const change of changes) expect(change).toEqual({ path: beforeRelease.newPath, state: 'ready', src: beforeRelease.newSrc });
    expect(after).toEqual(current);
  });

test('M03-B7 a future primary database disables new Game writes and exports only its unchanged raw original without downgrading', async ({ page }, info) => {
  await page.goto('/persistence-tests/harness.html');
  const futurePayload = { version: 99, data: 'M03-isolated-future-original' };
  await page.evaluate(({ name, value }) => new Promise<void>((accept, reject) => {
    const q = indexedDB.open(name, 10); // Formal production DB is9; old historical4 is no longer a future version.
    q.onupgradeneeded = () => q.result.createObjectStore('future-data').put(value, 'current');
    q.onerror = () => reject(q.error); q.onsuccess = () => { q.result.close(); accept(); };
  }), { name: databaseName, value: futurePayload });
  const original = await database(page); expect(original.version).toBe(10);
  expect(original.rows['future-data']).toEqual([{ key: 'current', value: futurePayload }]);
  await evidence(info, 'future-primary-original', original);
  await page.goto('/'); await expect(page.getByTestId('error')).toContainText('存档数据库版本较新');
  await expect(page.getByRole('button', { name: /^踏入仙途/ })).toBeDisabled(); await expect(page.getByTestId('realm')).toHaveCount(0);
  expect(await database(page)).toEqual(original); await settings(page);
  const backup = page.getByTestId('raw-backup'); await hit(backup);
  await page.screenshot({ path: info.outputPath('future-primary-readonly-backup.png') });
  const downloading = page.waitForEvent('download'); await backup.click(); const file = await downloading, path = await file.path(); expect(path).toBeTruthy();
  const exported = JSON.parse(await readFile(path!, 'utf8'));
  expect(exported.format).toBe('chenyuan-raw-database-backup'); expect(exported.database.version).toBe(10);
  expect(Object.fromEntries(exported.stores.map((store: any) => [store.name, store.entries]))).toEqual(Object.fromEntries(Object.entries(original.rows).map(([name, rows]) => [name, rows.map(row => ({ key: row.key, valueEncoding: 'json', value: row.value }))])));
  expect(await database(page)).toEqual(original); await page.reload();
  await expect(page.getByTestId('error')).toContainText('存档数据库版本较新');
  await expect(page.getByRole('button', { name: /^踏入仙途/ })).toBeDisabled(); expect(await database(page)).toEqual(original);
  await evidence(info, 'future-primary-raw-export-preserved', { original, exported, after: await database(page) });
});

// CHECK-ART03: public surface access is readonly over every native Game store.
async function checkArt03Read(page:Page,body:()=>Promise<void>){const read=()=>page.evaluate(()=>new Promise<any>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();reject(Error('Readonly catalogue cannot create Game DB'));};q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};for(const name of db.objectStoreNames){rows[name]=[];const r=tx.objectStore(name).openCursor();r.onsuccess=()=>{if(r.result){rows[name].push({key:r.result.key,value:r.result.value});r.result.continue();}};}tx.oncomplete=()=>{db.close();accept({version:db.version,rows});};tx.onabort=()=>{db.close();reject(tx.error);};};}));const before=await read();await body();expect(await read()).toEqual(before);}
