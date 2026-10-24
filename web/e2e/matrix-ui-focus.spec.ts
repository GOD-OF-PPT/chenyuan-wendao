import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { driver } from '../../tests/full-route.mjs';
import { resolve, validateGame } from '../../src/full/engine.ts';
import { completeActivity, type Activity } from '../../src/full/activity.ts';
import type { Game } from '../../src/full/types.ts';
import { useJourneyClock, finishJourneyClock } from './support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
type Database = { version: number; names: string[]; rows: Record<string, Array<{ key: any; value: any }>> };
const databaseName = 'chenyuan-playable-v1', errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const rows: string[] = []; errors.set(page, rows); page.on('pageerror', error => rows.push(error.message)); });
test.afterEach(async ({ page }, info) => {
  if (!page.isClosed()) await page.evaluate(() => { const w = window as any; w.__m03FocusRelease?.(); w.__m03FocusRestore?.(); w.__m03StopFocusLog?.(); });
  await attach(info, 'focus-browser-errors', errors.get(page) ?? []); expect(errors.get(page) ?? []).toEqual([]);
});
async function attach(info: TestInfo, name: string, value: unknown) { await info.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' }); }
async function database(page: Page): Promise<Database> {
  return page.evaluate(name => new Promise<Database>((resolve, reject) => {
    const q = indexedDB.open(name); q.onupgradeneeded = () => { q.transaction!.abort(); reject(new Error('Readonly focus observation cannot create a Game database')); }; q.onerror = () => reject(q.error);
    q.onsuccess = () => {
      const db = q.result, names = [...db.objectStoreNames], rows: Database['rows'] = {}, tx = db.transaction(names, 'readonly');
      for (const name of names) { rows[name] = []; const read = tx.objectStore(name).openCursor(); read.onsuccess = () => { if (read.result) { rows[name].push({ key: read.result.key, value: read.result.value }); read.result.continue(); } }; }
      tx.oncomplete = () => { const version = db.version; db.close(); resolve({ version, names, rows }); }; tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), databaseName);
}
const value = (raw: Database, key: string) => raw.rows['full-state'].find(row => row.key === key)?.value;
async function load(page: Page, info: TestInfo, location: 'cave' | 'market' = 'cave') {
  const d = driver(); d.go(location); const fixture = d.game; validateGame(fixture);
  await useJourneyClock(page); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
  await page.getByLabel('导入已有存档', { exact: true }).setInputFiles({ name: 'lawful-focus-prefix.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) }); await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const raw = await database(page), game = value(raw, 'current') as Game, expected = structuredClone(fixture);
  expected.core.runId = game.core.runId; expected.core.revision = 0; if (expected.core.activeEvent) expected.core.activeEvent.instanceId = game.core.runId + ':' + expected.core.activeEvent.id;
  expect(game).toEqual(expected); expect(value(raw, 'activity')).toBeUndefined(); await attach(info, 'focus-lawful-baseline', { fixture, game, raw }); return { game, raw };
}
async function area(locator: Locator, info: TestInfo, name: string, requireFocus = false) {
  await expect(locator).toBeVisible(); const row = await locator.evaluate((node, requireFocus) => {
    const focused = document.activeElement as HTMLElement | null, input = node instanceof HTMLInputElement ? node : null;
    const target = input && (input.type === 'checkbox' || input.type === 'radio' || input.type === 'file') ? input.labels?.[0] ?? node : node;
    if (input && target instanceof HTMLLabelElement && target.control !== input) throw new Error('Control has no genuine associated click label');
    const r = target.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), dialog = target.closest('dialog[open]'), nav = document.getElementById('primary-navigation')?.getBoundingClientRect(), parents: any[] = [];
    for (let p = target.parentElement; p && p !== document.body; p = p.parentElement) {
      const b = p.getBoundingClientRect(); if (getComputedStyle(p).display !== 'contents' && b.width && b.height && (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1)) parents.push({ tag: p.tagName, class: p.className, top: b.top, bottom: b.bottom }); if (p === dialog) break;
    }
    return { text: target.textContent, tag: target.tagName, control: input?.type ?? null, height: r.height, width: r.width, font: parseFloat(getComputedStyle(target).fontSize),
      focused: !requireFocus || focused === node, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= (dialog || target.closest('#primary-navigation') ? innerHeight : nav?.top ?? innerHeight),
      hit: top === target || !!top && target.contains(top), parents, scroll: dialog ? { top: dialog.scrollTop, left: dialog.scrollLeft, height: dialog.scrollHeight, clientHeight: dialog.clientHeight, width: dialog.scrollWidth, clientWidth: dialog.clientWidth } : null,
      page: { height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth } };
  }, requireFocus);
  await attach(info, name, row); expect(row.width).toBeGreaterThanOrEqual(44); expect(row.height).toBeGreaterThanOrEqual(44); expect(row.font).toBeGreaterThanOrEqual(14);
  expect(row.focused).toBe(true); expect(row.inside).toBe(true); expect(row.hit).toBe(true); expect(row.parents).toEqual([]); expect(row.page.height).toBeLessThanOrEqual(900); expect(row.page.width).toBeLessThanOrEqual(1440);
  if (row.scroll) { expect(row.scroll.top).toBe(0); expect(row.scroll.left).toBe(0); expect(row.scroll.height).toBeLessThanOrEqual(row.scroll.clientHeight + 1); expect(row.scroll.width).toBeLessThanOrEqual(row.scroll.clientWidth + 1); }
}
async function settings(page: Page) {
  const opener = page.getByTestId('game-settings'); await opener.focus(); await page.keyboard.press('Enter'); const dialog = page.getByRole('dialog', { name: '行旅设置', exact: true }); await expect(dialog).toBeVisible(); await expect(dialog.locator('#settings-title')).toBeFocused(); return { opener, dialog };
}
async function nativeTabLoop(page: Page, dialog: Locator, info: TestInfo, name: string) {
  const handles = await dialog.locator('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])').elementHandles();
  const targets = []; for (const handle of handles) if (await handle.evaluate(node => {
    if (!node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') return false;
    for (let p = node.parentElement; p; p = p.parentElement) if (p instanceof HTMLDetailsElement && !p.open && !p.querySelector(':scope > summary')?.contains(node)) return false;
    return true;
  })) targets.push(handle);
  expect(targets.length).toBe(name === 'settings' ? 12 : 3); const indices: number[] = [];
  const check = async (index: number) => {
    expect(await targets[index].evaluate(node => node === document.activeElement)).toBe(true); expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    const focused = page.locator(':focus'); await area(focused, info, name + '-target-' + indices.length, true); indices.push(index);
  };
  await page.keyboard.press('Shift+Tab'); await check(targets.length - 1); await page.keyboard.press('Tab'); await check(0);
  for (let index = 1; index <= targets.length; index++) { await page.keyboard.press('Tab'); await check(index % targets.length); }
  await page.keyboard.press('Shift+Tab'); await check(targets.length - 1);
  for (let index = targets.length - 2; index >= 0; index--) { await page.keyboard.press('Shift+Tab'); await check(index); }
  await attach(info, name + '-native-tab-order', { count: targets.length, indices });
}

test('M03-F1 native Tab and Shift Tab stay within settings and paged help while Escape returns their exact public opener without writes', async ({ page }, info) => {
  const { raw } = await load(page, info), { opener, dialog } = await settings(page); await nativeTabLoop(page, dialog, info, 'settings'); expect(await database(page)).toEqual(raw);
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused(); await area(opener, info, 'settings-return-opener', true);
  await page.keyboard.press('Enter'); await expect(dialog.locator('#settings-title')).toBeFocused(); await dialog.getByTestId('gameplay-help-entry').focus(); await page.keyboard.press('Enter');
  const help = page.getByRole('dialog', { name: '玩法帮助', exact: true }); await expect(help).toBeVisible(); await expect(help.locator('#gameplay-help-title')).toBeFocused(); await expect(dialog).toBeHidden();
  await expect(help.getByRole('navigation', { name: '帮助主题翻页', exact: true })).toBeVisible(); await nativeTabLoop(page, help, info, 'help'); expect(await database(page)).toEqual(raw);
  await page.keyboard.press('Escape'); await expect(help).toBeHidden(); await expect(opener).toBeFocused(); expect(await database(page)).toEqual(raw);
});

test('M03-F2 the actual file wrapper and keyboard chooser cancel safely and oversized input retains visible modal error focus and the entire Game', async ({ page }, info) => {
  const { raw } = await load(page, info), { opener, dialog } = await settings(page), input = dialog.getByTestId('import'), label = dialog.locator('label.file-button');
  expect(await input.evaluate(node => (node as HTMLInputElement).labels?.[0]?.control === node)).toBe(true); await area(label, info, 'file-real-label-hit-area');
  for (let i = 0; i < 40 && !await input.evaluate(node => node === document.activeElement); i++) await page.keyboard.press('Tab');
  await expect(input).toBeFocused(); await area(input, info, 'file-keyboard-visible-wrapper', true);
  const outline = await label.evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth })); expect(outline).toEqual({ style: 'solid', width: '3px' });
  const keyboardChooser = page.waitForEvent('filechooser'); await page.keyboard.press('Space'); await (await keyboardChooser).setFiles([]); await expect(input).toBeFocused(); expect(await database(page)).toEqual(raw);
  const pointerChooser = page.waitForEvent('filechooser'); await label.click(); await (await pointerChooser).setFiles([]); expect(await database(page)).toEqual(raw);
  await input.setInputFiles({ name: 'oversized-no-import.json', mimeType: 'application/json', buffer: Buffer.alloc(1024 * 1024 + 1) });
  const error = dialog.getByTestId('settings-error'); await expect(error).toHaveText('存档大于 1 MB，未导入'); await expect(dialog.getByTestId('settings-save-status')).toHaveText('保存待确认');
  const copy = await error.evaluate(node => { const r = node.getBoundingClientRect(), parent = node.closest('dialog')!.getBoundingClientRect(); return { font: parseFloat(getComputedStyle(node).fontSize), inside: r.left >= parent.left && r.right <= parent.right && r.top >= parent.top && r.bottom <= parent.bottom, clipped: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1 }; }); expect(copy).toMatchObject({ inside: true, clipped: false }); expect(copy.font).toBeGreaterThanOrEqual(18);
  expect(await input.inputValue()).toBe(''); await input.focus(); await area(input, info, 'file-safe-error-focus', true); expect(await database(page)).toEqual(raw);
  await page.screenshot({ path: info.outputPath('file-wrapper-safe-error.png') }); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused(); expect(await database(page)).toEqual(raw);
});

async function holdCommittedMetadata(page: Page, before: Game) {
  await page.evaluate(before => {
    const w = window as any, originalPut = IDBObjectStore.prototype.put, originalGet = IDBObjectStore.prototype.get; let armed = true;
    w.__m03FocusHoldStarted = false; w.__m03FocusMetadataRequested = false; w.__m03FocusWriteCommitted = false;
    w.__m03FocusRestore = () => { IDBObjectStore.prototype.put = originalPut; IDBObjectStore.prototype.get = originalGet; };
    IDBObjectStore.prototype.get = function (...args: any[]) {
      if (w.__m03FocusWriteCommitted && this.transaction.db.name === 'chenyuan-playable-v1' && this.transaction.mode === 'readonly' && this.name === 'full-state' && ['checkpoint', 'previous'].includes(String(args[0]))) w.__m03FocusMetadataRequested = true;
      return Reflect.apply(originalGet, this, args);
    };
    IDBObjectStore.prototype.put = function (next: any, key?: IDBValidKey) {
      const request = originalPut.call(this, next, key!);
      if (armed && this.transaction.db.name === 'chenyuan-playable-v1' && this.name === 'full-state' && key === 'current' && next?.core.runId === before.core.runId && next.core.revision === before.core.revision + 1 && next.core.world.location === 'cave') {
        armed = false; this.transaction.addEventListener('complete', () => {
          w.__m03FocusWriteCommitted = true; const opening = indexedDB.open('chenyuan-playable-v1'); opening.onerror = () => w.__m03FocusHoldError = String(opening.error);
          opening.onsuccess = () => {
            const db = opening.result, names = [...db.objectStoreNames], tx = db.transaction(names, 'readwrite'), rows: any = {}; let pending = names.length, held = true;
            // This native lock performs reads only. It never changes a Game, receipt, owner or backup.
            w.__m03FocusRelease = () => held = false;
            const keep = () => { const q = tx.objectStore('full-state').get('current'); q.onsuccess = () => { if (held) keep(); }; }; keep();
            for (const name of names) { rows[name] = []; const q = tx.objectStore(name).openCursor(); q.onsuccess = () => { if (q.result) { rows[name].push({ key: q.result.key, value: q.result.value }); q.result.continue(); } else if (--pending === 0) { w.__m03FocusCommitted = { version: db.version, names, rows: structuredClone(rows) }; w.__m03FocusHoldStarted = true; } }; }
            tx.oncomplete = () => db.close(); tx.onabort = () => { w.__m03FocusHoldError = String(tx.error); db.close(); };
          };
        }, { once: true });
      }
      return request;
    };
  }, before);
}
test('M03-F3 committed travel metadata settles without stealing a later keyboard tab or changing its exact complete native outcome', async ({ page }, info) => {
  const { game: before, raw: beforeRaw } = await load(page, info, 'market'); await page.getByTestId('tab-1').click(); await expect(page.getByTestId('tab-1')).toHaveAttribute('aria-current', 'page'); expect(await database(page)).toEqual(beforeRaw); await page.getByTestId('travel-cave').click(); await holdCommittedMetadata(page, before);
  await page.getByTestId('adventure-start').click(); let accepted: Database; await expect.poll(async () => { accepted = await database(page); return (value(accepted, 'activity') as Activity)?.status; }).toBe('running');
  const a = value(accepted!, 'activity') as Activity; expect(a.version).toBe(6); expect(a.plan.kind).toBe('travel'); expect(a.cycleMs).toBe(6000); expect(a.plan.maxCycles).toBe(1);
  await expect(page.locator('[data-testid=training-activity][data-generation="' + a.generation + '"][data-running=true]')).toBeVisible(); await expect(page.getByTestId('training-countdown')).toHaveText('6.0 秒');
  await page.clock.fastForward(5999); expect(await database(page)).toEqual(accepted!); await page.clock.fastForward(1);
  try {
    await expect.poll(() => page.evaluate(() => (window as any).__m03FocusHoldStarted)).toBe(true); await expect.poll(() => page.evaluate(() => (window as any).__m03FocusMetadataRequested)).toBe(true); await expect(page.getByTestId('save-status')).toHaveText('保存中');
    const committed = await page.evaluate(() => (window as any).__m03FocusCommitted as Database), formal = resolve(before, a.nextCommand!); expect(value(committed, 'current')).toEqual(formal.nextState);
    const receipts = committed.rows['full-receipts'].filter(row => row.key === a.runId + ':' + a.nextCommand!.commandId); expect(receipts).toHaveLength(1); expect(receipts[0].value.command).toEqual(a.nextCommand); expect(receipts[0].value.result).toEqual(formal.result);
    expect(receipts[0].value.proof.activityBefore).toEqual(a); expect(receipts[0].value.proof.stateAfter).toEqual(formal.nextState); expect(receipts[0].value.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt!);
    expect(value(committed, 'activity')).toEqual(completeActivity(formal.nextState, a, formal.result, { commandId: a.nextCommand!.commandId, now: receipts[0].value.proof.resolvedAt }));
    await page.evaluate(() => { const w = window as any; w.__m03FocusLog = []; const record = () => w.__m03FocusLog.push({ id: document.activeElement?.getAttribute('data-testid'), tag: document.activeElement?.tagName }); document.addEventListener('focusin', record); w.__m03StopFocusLog = () => document.removeEventListener('focusin', record); });
    const target = page.getByTestId('tab-2'); await target.focus(); await page.keyboard.press('Enter'); await expect(target).toBeFocused(); await expect(target).toHaveAttribute('aria-current', 'page'); await expect(page.getByTestId('inventory-catalogue')).toBeVisible(); await area(target, info, 'late-metadata-new-keyboard-navigation', true);
    await page.evaluate(() => (window as any).__m03FocusRelease()); await expect(page.getByTestId('save-status')).toHaveText('已保存'); await expect(target).toBeFocused(); await expect(target).toHaveAttribute('aria-current', 'page'); await expect(page.getByTestId('inventory-catalogue')).toBeVisible();
    expect(await database(page)).toEqual(committed); const focusLog = await page.evaluate(() => (window as any).__m03FocusLog); expect(focusLog.length).toBeGreaterThan(0); for (const row of focusLog) expect(row.id).toBe('tab-2');
    await area(target, info, 'late-metadata-preserved-keyboard-navigation', true); await attach(info, 'late-metadata-current-native-proof', { accepted: accepted!, committed, a, formal, focusLog, final: await database(page) });
  } finally { await page.evaluate(() => { (window as any).__m03FocusRelease?.(); (window as any).__m03FocusRestore?.(); }); }
});

async function contrast(page: Page, info: TestInfo, name: string, selectors: Array<[string, string, boolean?]>) {
  const rows = await page.evaluate(selectors => {
    type RGB = [number, number, number, number];
    const color = (value: string): RGB => { const numbers = value.match(/[\d.]+/g)?.map(Number); if (!numbers || numbers.length < 3) throw new Error('Unsupported computed color: ' + value); return [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1]; };
    const blend = (over: RGB, under: RGB): RGB => [over[0] * over[3] + under[0] * (1 - over[3]), over[1] * over[3] + under[1] * (1 - over[3]), over[2] * over[3] + under[2] * (1 - over[3]), 1];
    const luminance = (rgb: RGB) => rgb.slice(0, 3).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a: RGB, b: RGB) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const split = (value: string) => { const rows: string[] = []; let depth = 0, start = 0; for (let i = 0; i < value.length; i++) { if (value[i] === '(') depth++; else if (value[i] === ')') depth--; else if (value[i] === ',' && !depth) { rows.push(value.slice(start, i)); start = i + 1; } } rows.push(value.slice(start)); return rows; };
    const unique = (rows: RGB[]) => [...new Map(rows.map(row => [JSON.stringify(row), row])).values()];
    function backgrounds(node: Element | null): { samples: RGB[]; uncertainImages: string[]; layers: any[] } {
      if (!node) return { samples: [[255, 255, 255, 1]], uncertainImages: [], layers: [] };
      const inherited = backgrounds(node.parentElement), style = getComputedStyle(node), base = color(style.backgroundColor);
      let samples = inherited.samples.map(under => blend(base, under)); const uncertainImages = [...inherited.uncertainImages];
      const layers = [...inherited.layers, { tag: node.tagName, class: node.className, color: style.backgroundColor, image: style.backgroundImage, opacity: style.opacity, filter: style.filter }];
      if (style.backgroundImage !== 'none') for (const layer of split(style.backgroundImage).reverse()) {
        if (layer.includes('url(')) { uncertainImages.push(layer); samples = [[0, 0, 0, 1], [255, 255, 255, 1]]; }
        else { const stops = layer.match(/rgba?\([^)]+\)/g); if (!stops?.length) throw new Error('Unsupported computed background layer: ' + layer); samples = unique(stops.flatMap(stop => samples.map(under => blend(color(stop), under)))); }
      }
      return { samples: unique(samples), uncertainImages, layers };
    }
    return selectors.map(([name, selector, outline]) => {
      const node = document.querySelector<HTMLElement>(selector); if (!node || !node.getClientRects().length) throw new Error('Contrast target is not actually visible: ' + selector);
      const style = getComputedStyle(node), b = backgrounds(outline ? node.parentElement : node), foreground = color(outline ? style.outlineColor : style.color), ratios = b.samples.map(sample => ratio(blend(foreground, sample), sample));
      const backgroundsL = b.samples.map(luminance), foregroundsL = b.samples.map(sample => luminance(blend(foreground, sample))), darkestBackground = Math.min(...backgroundsL), lightestBackground = Math.max(...backgroundsL), darkestForeground = Math.min(...foregroundsL), lightestForeground = Math.max(...foregroundsL);
      const lowerBound = darkestForeground > lightestBackground ? (darkestForeground + .05) / (lightestBackground + .05) : lightestForeground < darkestBackground ? (darkestBackground + .05) / (lightestForeground + .05) : 1;
      return { name, selector, text: node.textContent, foreground: outline ? style.outlineColor : style.color, minimumRatio: lowerBound, sampledRatios: ratios, required: outline ? 3 : 4.5, samples: b.samples, layers: b.layers, uncertainImages: b.uncertainImages,
        solid: style.outlineStyle, outlineWidth: style.outlineWidth, ownOpacity: style.opacity, filters: b.layers.filter(layer => layer.opacity !== '1' || layer.filter !== 'none'),
        note: 'Actual computed gradient/alpha endpoints over black/white bounds for unknown bitmap layers; conservative CSS proof, not bitmap pixel review.' };
    });
  }, selectors);
  await attach(info, name, rows); for (const row of rows) { expect(row.filters, row.name + ' cannot silently ignore group opacity/filter').toEqual([]); expect(row.ownOpacity, row.name).toBe('1'); expect(row.minimumRatio, row.name).toBeGreaterThanOrEqual(row.required); if (row.required === 3) { expect(row.solid).toBe('solid'); expect(row.outlineWidth).toBe('3px'); } }
}
test('M03-F4 current critical copy primary controls disabled reasons and keyboard focus keep the original computed contrast thresholds', async ({ page }, info) => {
  const { raw } = await load(page, info); await expect(page.getByTestId('cultivate')).toBeVisible();
  await contrast(page, info, 'current-game-contrast', [['realm', '[data-testid=realm]'], ['saved progress', '[data-testid=save-status]'], ['primary cultivation', '[data-testid=cultivate]'], ['current navigation', '#primary-navigation [data-testid=tab-0]']]); expect(await database(page)).toEqual(raw);
  const { opener, dialog } = await settings(page); await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: '关闭设置', exact: true })).toBeFocused();
  await expect(dialog.getByTestId('restore-checkpoint')).toBeDisabled(); await expect(dialog.locator('#checkpoint-unavailable')).toBeVisible();
  await contrast(page, info, 'settings-critical-contrast', [['modal body', 'dialog[open] .settings-grid > section > p'], ['disabled restore', '[data-testid=restore-checkpoint]'], ['disabled reason', '#checkpoint-unavailable'], ['file wrapper text', 'dialog[open] .file-button'], ['keyboard focus outline', 'dialog[open] header button', true]]);
  const input = dialog.getByTestId('import'); await input.focus(); await expect(input).toBeFocused(); await contrast(page, info, 'file-wrapper-visible-focus-contrast', [['file wrapper focus', 'dialog[open] .file-button', true]]);
  await area(input, info, 'contrast-file-focus-wrapper', true); await page.screenshot({ path: info.outputPath('critical-modal-file-focus-contrast.png') }); expect(await database(page)).toEqual(raw);
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused(); expect(await database(page)).toEqual(raw);
});
