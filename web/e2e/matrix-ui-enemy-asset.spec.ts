import { test, expect, type Page, type Route, type Locator, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { trialJourneyScenario } from '../../tests/trial-journey-route.mjs';
import { resolve, validateGame } from '../../src/full/engine.ts';
import { previewAction } from '../../src/full/queries.ts';
import { completeActivity, type Activity } from '../../src/full/activity.ts';
import type { Game } from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import { formatCosts } from '../src/presentation';
import { useJourneyClock, finishJourneyClock } from './support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
type Database = { version: number; names: string[]; rows: Record<string, Array<{ key: any; value: any }>> };
const databaseName = 'chenyuan-playable-v1';
async function attach(info: TestInfo, name: string, value: unknown) { await info.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' }); }
async function database(page: Page): Promise<Database> {
  return page.evaluate(name => new Promise<Database>((resolve, reject) => {
    const q = indexedDB.open(name); q.onupgradeneeded = () => { q.transaction!.abort(); reject(new Error('Readonly enemy proof cannot create a database')); }; q.onerror = () => reject(q.error);
    q.onsuccess = () => {
      const db = q.result, names = [...db.objectStoreNames], rows: Database['rows'] = {}, tx = db.transaction(names, 'readonly');
      for (const name of names) { rows[name] = []; const read = tx.objectStore(name).openCursor(); read.onsuccess = () => { if (read.result) { rows[name].push({ key: read.result.key, value: read.result.value }); read.result.continue(); } }; }
      tx.oncomplete = () => { const version = db.version; db.close(); resolve({ version, names, rows }); }; tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), databaseName);
}
const value = (raw: Database, key: string) => raw.rows['full-state'].find(row => row.key === key)?.value;
async function hit(control: Locator) {
  await expect(control).toBeVisible(); const row = await control.evaluate(node => {
    const r = node.getBoundingClientRect(), nav = document.getElementById('primary-navigation')!.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), parents: string[] = [];
    for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) { if (getComputedStyle(p).display === 'contents') continue; const b = p.getBoundingClientRect(); if (b.width && b.height && (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1)) parents.push(p.id || p.className); }
    return { height: r.height, width: r.width, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= nav.top, hit: top === node || !!top && node.contains(top), parents, font: parseFloat(getComputedStyle(node).fontSize) };
  });
  expect(row.height).toBeGreaterThanOrEqual(44); expect(row.width).toBeGreaterThanOrEqual(44); expect(row.inside).toBe(true); expect(row.hit).toBe(true); expect(row.parents).toEqual([]); expect(row.font).toBeGreaterThanOrEqual(14);
}
async function enemy(page: Page, id: string) {
  const object = page.locator('[data-testid=battle-presence] [data-asset-id="enemy-' + id + '"]'); await expect(object).toBeVisible(); await expect(object).toHaveAttribute('data-art-state', 'ready'); await expect(object).toHaveAttribute('data-art-path', 'art/v2/enemies/' + id + '.webp');
  await expect(object.locator('img')).toHaveAttribute('src', new RegExp('/art/v2/enemies/' + id + '\\.webp$')); expect(await object.locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(512); return object;
}

test('M03-E1 a late previous-heart image response and stale load error callbacks cannot replace the real next enemy after one formal three-second finishing turn', async ({ page }, info) => {
  const errors: string[] = [], held: Route[] = [], nativeRequests: any[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (request.url().endsWith('/art/v2/enemies/trial_heart.webp')) nativeRequests.push({ event: 'requestfailed', url: request.url(), failure: request.failure() }); });
  page.on('response', response => { if (response.url().endsWith('/art/v2/enemies/trial_heart.webp')) nativeRequests.push({ event: 'response', url: response.url(), status: response.status() }); });
  const scenario = trialJourneyScenario(), index = scenario.states.findIndex((game: Game, i: number) => game.battle?.enemy === 'trial_heart' && scenario.states[i + 1]?.battle?.enemy === 'trial_thunder');
  expect(index).toBeGreaterThan(0); const fixture = scenario.states[index] as Game, action = scenario.actions[index]; validateGame(fixture); expect(action.type).toBe('BATTLE'); expect(previewAction(fixture, action).allowed).toBe(true);
  await page.route('**/art/v2/enemies/trial_heart.webp', route => { held.push(route); });
  try {
    await useJourneyClock(page); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
    await page.getByLabel('导入已有存档', { exact: true }).setInputFiles({ name: 'lawful-heart-final-turn-prefix.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) }); await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
    const beforeRaw = await database(page), before = value(beforeRaw, 'current') as Game, normalized = structuredClone(fixture); normalized.core.runId = before.core.runId; normalized.core.revision = 0; if (normalized.core.activeEvent) normalized.core.activeEvent.instanceId = before.core.runId + ':' + normalized.core.activeEvent.id;
    expect(before).toEqual(normalized); expect(value(beforeRaw, 'activity')).toBeUndefined(); expect(before.battle!.enemy).toBe('trial_heart'); expect(held.length).toBeGreaterThan(0);
    const oldArt = page.locator('[data-testid=battle-presence] [data-asset-id=enemy-trial_heart]'); await expect(oldArt).toHaveAttribute('data-art-state', 'loading');
    await page.evaluate(() => {
      const w = window as any, old = document.querySelector<HTMLImageElement>('[data-testid=battle-presence] [data-asset-id=enemy-trial_heart] img'); if (!old) throw new Error('The held heart image is not the actual enemy node');
      w.__m03OldEnemy = old; w.__m03OldEnemyEvents = [];
      for (const type of ['load', 'error']) old.addEventListener(type, event => w.__m03OldEnemyEvents.push({ type: event.type, trusted: event.isTrusted, src: old.getAttribute('src'), connected: old.isConnected }));
    });
    await page.getByTestId('battle-manual-takeover').click(); expect(await database(page)).toEqual(beforeRaw);
    const selector = action.move === 'heal' || action.move === 'restore' ? 'battle-' + action.move : action.move, button = page.getByTestId(selector), preview = previewAction(before, action);
    expect(preview.allowed).toBe(true); await expect(button).toBeEnabled(); await expect(button).toContainText('3 秒 / 回合'); await expect(button).toContainText(formatCosts(preview.actualCosts ?? preview.costs)); await hit(button); await button.click();
    let accepted: Database; await expect.poll(async () => { accepted = await database(page); return (value(accepted, 'activity') as Activity)?.status; }).toBe('running'); const a = value(accepted!, 'activity') as Activity;
    expect(a.version).toBe(6); expect(a.plan).toMatchObject({ kind: 'battle', mode: 'single', move: action.move, maxCycles: 1, enemy: 'trial_heart' }); expect(a.nextCommand).toMatchObject(action); expect(a.cycleMs).toBe(3000); expect(value(accepted!, 'current')).toEqual(before);
    await expect(page.locator('[data-testid=training-activity][data-generation="' + a.generation + '"][data-running=true]')).toBeVisible(); await expect(page.getByTestId('training-countdown')).toHaveText('3.0 秒');
    const left = a.dueAt! - await page.evaluate(() => Date.now()); expect(left).toBe(3000); await page.clock.fastForward(left - 1); expect(await database(page)).toEqual(accepted!); await expect(oldArt).toHaveAttribute('data-art-state', 'loading');
    await page.clock.fastForward(1); let completed: Database; await expect.poll(async () => { completed = await database(page); return (value(completed, 'activity') as Activity)?.completedCycles; }).toBe(1);
    const formal = resolve(before, a.nextCommand!), after = value(completed!, 'current') as Game; expect(after).toEqual(formal.nextState); expect(after.battle!.enemy).toBe('trial_thunder'); expect(after.trial!.stage).toBe(2); expect(after.battle!.round).toBe(0); expect(after.battle!.log).toEqual([]);
    const knownNext = structuredClone(scenario.states[index + 1]); knownNext.core.runId = after.core.runId; knownNext.core.revision = after.core.revision; if (knownNext.core.activeEvent) knownNext.core.activeEvent.instanceId = after.core.runId + ':' + knownNext.core.activeEvent.id; expect(after).toEqual(knownNext);
    const receipts = completed!.rows['full-receipts'].filter(row => row.key === a.runId + ':' + a.nextCommand!.commandId); expect(receipts).toHaveLength(1); const receipt = receipts[0].value;
    expect(receipt.command).toEqual(a.nextCommand); expect(receipt.result).toEqual(formal.result); expect(receipt.proof.activityBefore).toEqual(a); expect(receipt.proof.stateAfter).toEqual(after); expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt!);
    expect(value(completed!, 'activity')).toEqual(completeActivity(after, a, formal.result, { commandId: a.nextCommand!.commandId, now: receipt.proof.resolvedAt })); expect(value(completed!, 'previous')).toEqual(before); expect(completed!.rows['full-receipts'].length).toBe(accepted!.rows['full-receipts'].length + 1);
    expect(value(completed!, 'checkpoint')).toEqual(value(accepted!, 'checkpoint')); expect(value(completed!, 'checkpoint-owner')).toEqual(value(accepted!, 'checkpoint-owner')); for (const name of completed!.names.filter(name => !['full-state', 'full-receipts'].includes(name))) expect(completed!.rows[name]).toEqual(accepted!.rows[name]);
    const current = await enemy(page, 'trial_thunder'); await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state', 'ready'); await expect(page.getByTestId('battle-presence').getByRole('heading', { name: C.enemies.trial_thunder.name, exact: true })).toBeVisible(); await expect(page.getByTestId('enemy-hp')).toContainText(String(after.battle!.hp));
    await expect(page.getByTestId('battle-presence').locator('.actor-impact,.actor-arrival')).toHaveCount(0); await expect(page.locator('[data-testid=battle-presence] [data-asset-id=enemy-trial_heart]')).toHaveCount(0);
    await page.evaluate(() => {
      const w = window as any, root = document.querySelector<HTMLElement>('[data-testid=battle-presence] .enemy-art')!; w.__m03EnemyChanges = [];
      const sample = () => { const art = root.querySelector('[data-art-path]')!, image = art.querySelector('img')!; return { id: art.getAttribute('data-asset-id'), path: art.getAttribute('data-art-path'), state: art.getAttribute('data-art-state'), src: image.getAttribute('src') }; };
      w.__m03EnemyBeforeLate = sample(); const observer = new MutationObserver(changes => { for (const change of changes) w.__m03EnemyChanges.push({ attribute: change.attributeName, oldValue: change.oldValue, current: sample() }); });
      observer.observe(root, { attributes: true, subtree: true, attributeOldValue: true, attributeFilter: ['data-art-path', 'data-art-state', 'src', 'data-asset-id'] }); w.__m03EnemyObserver = observer;
    });
    const heldBefore = await database(page); expect(heldBefore).toEqual(completed!); const body = await readFile(new URL('../public/art/v2/enemies/trial_heart.webp', import.meta.url)), fulfilled: string[] = [];
    for (const route of held) { await route.fulfill({ status: 200, contentType: 'image/webp', body }); fulfilled.push(route.request().url()); }
    expect(fulfilled.length).toBeGreaterThan(0); await page.clock.runFor(32); await enemy(page, 'trial_thunder'); expect(await database(page)).toEqual(heldBefore);
    for (const type of ['load', 'error']) {
      const old = await page.evaluate(type => { const node = (window as any).__m03OldEnemy as HTMLImageElement; if (!node || node.isConnected) throw new Error('The saved prior node is not detached from the new enemy'); node.dispatchEvent(new Event(type)); return { connected: node.isConnected, src: node.getAttribute('src'), explicitSyntheticDelivery: true }; }, type);
      expect(old.connected).toBe(false); expect(old.src).toMatch(/\/trial_heart\.webp$/); await page.clock.runFor(32); await enemy(page, 'trial_thunder'); expect(await database(page)).toEqual(heldBefore);
    }
    const observed = await page.evaluate(() => ({ before: (window as any).__m03EnemyBeforeLate, changes: (window as any).__m03EnemyChanges, oldEvents: (window as any).__m03OldEnemyEvents }));
    expect(observed.oldEvents.filter((event: any) => !event.trusted).map((event: any) => event.type)).toEqual(['load', 'error']);
    const attributeKeys: Record<string, string> = { 'data-art-path': 'path', 'data-art-state': 'state', 'src': 'src', 'data-asset-id': 'id' };
    for (const change of observed.changes) { expect(change.current).toEqual(observed.before); expect(change.oldValue).toBe(observed.before[attributeKeys[change.attribute]]); }
    await expect(current).toHaveAttribute('data-art-state', 'ready'); await expect(page.getByTestId('round')).toHaveText('第 1 回合'); await expect(page.getByTestId('intent')).toBeVisible(); await expect(page.getByTestId('battle-presence').locator('.actor-impact,.actor-arrival')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(900); for (const small of await page.getByTestId('battle-presence').locator('small').all()) expect(await small.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(14);
    await page.screenshot({ path: info.outputPath('next-enemy-after-old-heart-callbacks.png') }); await attach(info, 'previous-heart-current-thunder-proof', { index, action, beforeRaw, accepted: accepted!, completed: completed!, formal, receipt, fulfilled, nativeRequests, observed, errors,
      seam: 'A real previous-heart HTTP response was held and fulfilled with its real WebP. Old detached-node load/error callbacks are also explicitly dispatched with isTrusted=false, matching the legacy consumer-delivery contract; not a claim of two native network load/error events or native image corruption.' });
    expect(errors).toEqual([]); expect(await database(page)).toEqual(heldBefore);
  } finally { await page.evaluate(() => (window as any).__m03EnemyObserver?.disconnect()).catch(() => {}); await attach(info, 'enemy-page-errors', errors); expect(errors).toEqual([]); }
});
