import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { driver } from '../../tests/full-route.mjs';
import { validateGame } from '../../src/full/engine.ts';
import { demoCatalog } from '../../src/demo.ts';
import type { Game } from '../../src/full/types.ts';
import { guideCatalog } from '../src/guidance';
import { observationLabels } from '../src/local-events';
import { formatCosts } from '../src/presentation';
import { useJourneyClock, finishJourneyClock } from './support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
type RawDatabase = { version: number; names: string[]; rows: Record<string, Array<{ key: any; value: any }>> };
const gameDatabase = 'chenyuan-playable-v1', localDatabase = 'chenyuan-local-experience-v1';
const baselines = new WeakMap<Page, RawDatabase>(), errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const rows: string[] = []; errors.set(page, rows); page.on('pageerror', error => rows.push(error.message)); });
test.afterEach(async ({ page }, info) => {
  if (!page.isClosed() && baselines.has(page)) {
    const after = await database(page); await evidence(info, 'menu-full-database-after', after);
    expect(after, 'Reading menus must preserve every Game database object store, Activity, receipt and checkpoint').toEqual(baselines.get(page));
  }
  await evidence(info, 'menu-page-errors', errors.get(page) ?? []); expect(errors.get(page) ?? []).toEqual([]);
});
async function evidence(info: TestInfo, name: string, value: unknown) {
  await info.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' });
}
async function database(page: Page, name = gameDatabase): Promise<RawDatabase> {
  return page.evaluate(name => new Promise<RawDatabase>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onupgradeneeded = () => { open.transaction!.abort(); reject(new Error('Readonly menu observation cannot create ' + name)); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, names = [...db.objectStoreNames], rows: RawDatabase['rows'] = {}, tx = db.transaction(names, 'readonly');
      for (const name of names) {
        rows[name] = []; const request = tx.objectStore(name).openCursor();
        request.onsuccess = () => { if (request.result) { rows[name].push({ key: request.result.key, value: request.result.value }); request.result.continue(); } };
      }
      tx.oncomplete = () => { const version = db.version; db.close(); resolve({ version, names, rows }); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), name);
}
const current = (raw: RawDatabase) => raw.rows['full-state'].find(row => row.key === 'current')!.value as Game;
async function unchanged(page: Page) { expect(await database(page)).toEqual(baselines.get(page)); }
async function load(page: Page, info: TestInfo) {
  const route = driver(); route.go('cave'); const fixture = route.game; validateGame(fixture);
  await useJourneyClock(page); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
  await expect(page.getByTestId('local-data-status')).not.toHaveText('正在读取本地设置……');
  await page.getByLabel('导入已有存档', { exact: true }).setInputFiles({ name: 'lawful-menu-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const raw = await database(page), game = current(raw), expected = structuredClone(fixture);
  expected.core.runId = game.core.runId; expected.core.revision = 0;
  if (expected.core.activeEvent) expected.core.activeEvent.instanceId = game.core.runId + ':' + expected.core.activeEvent.id;
  expect(game).toEqual(expected); expect(raw.rows['full-state'].find(row => row.key === 'activity')).toBeUndefined();
  baselines.set(page, raw); await evidence(info, 'menu-full-database-before', raw);
  return game;
}
async function openSettings(page: Page) {
  const opener = page.getByTestId('game-settings'); await opener.click();
  const dialog = page.getByRole('dialog', { name: '行旅设置', exact: true }); await expect(dialog).toBeVisible();
  return { opener, dialog };
}
async function geometry(page: Page, dialog: Locator, info: TestInfo, name: string) {
  const result = await dialog.evaluate(dialog => {
    const shown = (node: Element) => { if (!node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') return false; for (let p = node.parentElement; p; p = p.parentElement) if (p instanceof HTMLDetailsElement && !p.open && !p.querySelector(':scope > summary')?.contains(node)) return false; return true; };
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const violations: string[] = [], texts: any[] = [], controls: any[] = [], d = rect(dialog);
    const within = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
    if (dialog.scrollHeight > dialog.clientHeight + 1 || dialog.scrollWidth > dialog.clientWidth + 1) violations.push('dialog requires scrolling');
    for (const node of dialog.querySelectorAll<HTMLElement>('p,h2,h3,small,li,label,button,a,select,summary,span,strong')) {
      if (!shown(node)) continue;
      const box = rect(node), style = getComputedStyle(node), label = (node.textContent ?? '').trim().slice(0, 80);
      if (!within(box, d)) violations.push('outside dialog: ' + label);
      for (let parent = node.parentElement; parent && parent !== dialog; parent = parent.parentElement) {
        if (getComputedStyle(parent).display === 'contents') continue;
        const bounds = rect(parent); if (bounds.width && bounds.height && !within(box, bounds)) violations.push('outside ancestor ' + parent.tagName + ': ' + label);
      }
      if (node.clientWidth && (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)) violations.push('clipped or internal scroll: ' + label);
      if (label) {
        const auxiliary = !!node.closest('.small,small,.local-list'), minimum = node.tagName === 'P' && !auxiliary ? 18 : 14;
        const font = parseFloat(style.fontSize); texts.push({ text: label, font, minimum, box });
        if (font < minimum) violations.push('font below ' + minimum + ': ' + label);
      }
      if (node.matches('button,a,select,summary,label.setting-row,label.file-button')) {
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2), hit = top === node || !!top && node.contains(top);
        controls.push({ text: label, box, hit, disabled: 'disabled' in node && node.disabled });
        if (box.height < 44 || box.width < 44 || !hit) violations.push('unusable control: ' + label);
      }
    }
    return { dialog: d, clientHeight: dialog.clientHeight, scrollHeight: dialog.scrollHeight, texts, controls, violations,
      viewport: { width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight } };
  });
  await evidence(info, name, result);
  expect(result.dialog.left).toBeGreaterThanOrEqual(0); expect(result.dialog.right).toBeLessThanOrEqual(1440);
  expect(result.dialog.top).toBeGreaterThanOrEqual(0); expect(result.dialog.bottom).toBeLessThanOrEqual(900);
  expect(result.viewport.width).toBe(1440); expect(result.viewport.height).toBe(900);
  expect(result.viewport.pageWidth).toBeLessThanOrEqual(1440); expect(result.viewport.pageHeight).toBeLessThanOrEqual(900);
  expect(result.violations).toEqual([]); await unchanged(page);
}
async function press(control: Locator) { await expect(control).toBeEnabled(); await control.click(); }
async function liveControls(dialog: Locator, ids: string[]) { for (const id of ids) await expect(dialog.getByTestId(id)).toBeVisible(); }
async function labelFor(input: Locator) {
  await input.evaluate(node => {
    const label = (node as HTMLInputElement).labels?.[0];
    if (!label || label.control !== node || !label.contains(node) && label.htmlFor !== node.id) throw new Error('The visible control has no actual associated label');
  });
  const label = input.locator('xpath=ancestor::label[1]'); await expect(label).toHaveCount(1); return label;
}

test('M03-M1 settings overview local overview loaded records and export preview each fit one complete readonly menu', async ({ page }, info) => {
  const game = await load(page, info), { opener, dialog } = await openSettings(page);
  await liveControls(dialog, ['reduce-effects', 'gameplay-help-entry', 'raw-backup', 'settings-life', 'settings-retire', 'restore-checkpoint', 'restart', 'demo-menu-open', 'local-records-panel']);
  await expect(dialog.locator('select[name=text-size]')).toBeVisible(); await expect(dialog.getByText('文字大小', { exact: true })).toBeVisible();
  await expect(dialog.locator('label.file-button').filter({ has: page.getByTestId('import') })).toBeVisible();
  expect(await dialog.locator('select[name=text-size] option').allTextContents()).toEqual(['100%', '150%', '200%']);
  await expect(dialog.getByRole('button', { name: '导出当前进度', exact: true })).toBeVisible();
  await expect(dialog.getByTestId('local-records-panel')).not.toHaveAttribute('open', '');
  await page.screenshot({ path: info.outputPath('settings-overview-one-screen.png') });
  await geometry(page, dialog, info, 'settings-overview-geometry');
  const effects = dialog.getByTestId('reduce-effects'), effectLabel = await labelFor(effects), original = await effects.isChecked();
  await effectLabel.click(); await expect(effects).toBeChecked({ checked: !original });
  await expect(effects).toBeEnabled(); await effectLabel.click(); await expect(effects).toBeChecked({ checked: original });
  await expect(effects).toBeEnabled();
  const importLabel = dialog.locator('label.file-button').filter({ has: page.getByTestId('import') });
  expect(await dialog.getByTestId('import').evaluate(node => (node as HTMLInputElement).labels?.[0]?.control === node)).toBe(true);
  const choosing = page.waitForEvent('filechooser'); await importLabel.click(); await (await choosing).setFiles([]); await unchanged(page);
  const downloading = page.waitForEvent('download'); await dialog.getByRole('button', { name: '导出当前进度', exact: true }).click();
  const download = await downloading, path = await download.path(); expect(path).not.toBeNull(); expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual(game);
  const panel = dialog.getByTestId('local-records-panel'); await panel.locator(':scope > summary').click(); await expect(panel).toHaveAttribute('open', '');
  await liveControls(panel, ['local-view-overview', 'local-refresh', 'local-export-preview', 'local-recording', 'local-clear', 'local-reconnect']);
  await expect(panel.getByRole('button', { name: '恢复默认显示设置', exact: true })).toBeVisible();
  await expect(panel.getByText('记录仅在当前浏览器，不会自动上传。只记录必要行动和数值摘要，不含道号、完整存档、错误原文或设备指纹。查看和真实停留时间都不改变修为、寿元或奖励。', { exact: true })).toBeVisible();
  await expect(panel.getByText(/保留最近最多 1000 条、约 1 MB/)).toBeVisible();
  await expect(dialog.getByTestId('restart')).toBeHidden(); await geometry(page, dialog, info, 'local-overview-geometry');
  const recording = panel.getByTestId('local-recording'), recordLabel = await labelFor(recording), recordingBefore = await recording.isChecked();
  await expect(recording).toBeEnabled(); await recordLabel.click(); await expect(recording).toBeChecked({ checked: !recordingBefore });
  await expect(recording).toBeEnabled(); await recordLabel.click(); await expect(recording).toBeChecked({ checked: recordingBefore }); await expect(recording).toBeEnabled();
  let local: RawDatabase; await expect.poll(async () => { local = await database(page, localDatabase); return local.rows.events.length; }).toBeGreaterThanOrEqual(2);
  const loaded = local!.rows.events.slice().sort((a, b) => Number(b.key) - Number(a.key)).slice(0, 20);
  await expect(panel.getByTestId('local-record-count')).toContainText(`本地 ${local!.rows.events.length} 条`);
  await press(panel.getByTestId('local-refresh')); const pager = panel.getByRole('navigation', { name: '最近记录翻页', exact: true }); await expect(pager).toBeVisible();
  await expect(pager).toContainText(`共 ${loaded.length} 项`);
  const seen: any[] = [];
  for (let i = 0; i < loaded.length; i++) {
    const row = loaded[i].value.data, observation = row.observation, li = panel.locator('.local-list > li');
    await expect(li).toHaveCount(1); await expect(li.locator('strong')).toHaveText(observationLabels[observation.kind as keyof typeof observationLabels]);
    const operation = observation.operation === 'IMPORT' ? '导入人生' : observation.operation === null ? '仅观察' : null;
    expect(operation, 'This lawful fixture only creates session/resume/import observations').not.toBeNull();
    const texts = [`会话内 ${(row.elapsedMs / 1000).toFixed(1)} 秒 · ${operation}`];
    if (observation.result) {
      const r = observation.result; texts.push(`请求 ${r.requestedSteps} / 实际 ${r.executedSteps} 步 · 修为 ${r.delta.xp >= 0 ? '+' : ''}${r.delta.xp} · 游戏月 +${r.delta.months}`, formatCosts(r.costs));
    }
    if (observation.replayed) texts.push('观察旧回执，不是再次结算。'); if (observation.errorCode) texts.push('原因码 ' + observation.errorCode);
    expect(await li.locator(':scope > span').allTextContents()).toEqual(texts); await expect(pager).toContainText(`${i + 1} / ${loaded.length} 页`);
    await expect(pager.getByTestId('catalogue-prev')).toBeEnabled({ enabled: i > 0 }); await expect(pager.getByTestId('catalogue-next')).toBeEnabled({ enabled: i + 1 < loaded.length });
    await geometry(page, dialog, info, 'local-record-' + i + '-geometry'); seen.push({ sequence: loaded[i].key, row, texts });
    if (i + 1 < loaded.length) await press(pager.getByTestId('catalogue-next'));
  }
  expect(seen.map(row => row.sequence)).toEqual(loaded.map(row => row.key));
  await press(panel.getByTestId('local-export-preview')); const preview = panel.getByTestId('local-export-ready'); await expect(preview).toBeVisible();
  await expect(preview).toContainText(`包含预览时可读取的 ${local!.rows.events.length} 条本地记录、0 条本页临时记录，以及字号、降低动效和当前追踪快照。`);
  await expect(preview.getByText('文件不是游戏存档，不能恢复进度；包含的相对会话时间只用于分析。不会自动发送，下载后由你决定是否分享。预览之后的新记录不在本次文件中。', { exact: true })).toBeVisible();
  await expect(preview.getByTestId('local-download')).toBeEnabled(); await geometry(page, dialog, info, 'local-export-preview-geometry');
  await press(preview.getByTestId('local-export-cancel')); await expect(preview).toBeHidden(); await expect(panel.getByTestId('local-export-preview')).toBeFocused();
  await press(panel.getByTestId('local-view-overview')); await expect(recording).toBeVisible(); await geometry(page, dialog, info, 'local-return-overview-geometry');
  await panel.locator(':scope > summary').click(); await expect(panel).not.toHaveAttribute('open', ''); await expect(dialog.getByTestId('restart')).toBeVisible();
  await geometry(page, dialog, info, 'settings-return-overview-geometry'); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
  await evidence(info, 'local-loaded-records-complete', { loaded, seen, game });
});

test('M03-M2 all twelve help topics retain their exact complete prose and one-screen paging with Escape returning the public opener', async ({ page }, info) => {
  await load(page, info); const { opener, dialog: settings } = await openSettings(page); await press(settings.getByTestId('gameplay-help-entry'));
  const help = page.getByRole('dialog', { name: '玩法帮助', exact: true }); await expect(help).toBeVisible(); await expect(settings).toBeHidden();
  await expect(help.locator('#gameplay-help-title')).toBeFocused(); await geometry(page, help, info, 'help-initial-geometry');
  const pager = help.getByRole('navigation', { name: '帮助主题翻页', exact: true });
  await expect(pager).toBeVisible(); expect(guideCatalog).toHaveLength(12); const seen: string[] = [];
  const toggle = help.getByTestId('guide-toggle'), original = await toggle.getAttribute('aria-pressed');
  await press(toggle); await expect(toggle).toHaveAttribute('aria-pressed', original === 'true' ? 'false' : 'true'); await press(toggle); await expect(toggle).toHaveAttribute('aria-pressed', original!);
  for (const [index, guide] of guideCatalog.entries()) {
    await expect(help.getByRole('heading', { name: guide.title, exact: true })).toBeVisible();
    const body = help.getByText(guide.body, { exact: true }); await expect(body).toBeVisible(); expect(await body.textContent()).toBe(guide.body);
    expect(await body.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(18);
    const visibleTitles = await help.locator('h3').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => node.textContent)); expect(visibleTitles).toEqual([guide.title]);
    await expect(pager).toContainText(`${index + 1} / 12 页`); await expect(pager).toContainText('共 12 项');
    await expect(pager.getByTestId('catalogue-prev')).toBeEnabled({ enabled: index > 0 }); await expect(pager.getByTestId('catalogue-next')).toBeEnabled({ enabled: index < 11 });
    if (guide.id === 'cultivation') await page.screenshot({ path: info.outputPath('help-complete-cultivation-topic.png') });
    await geometry(page, help, info, 'help-' + guide.id + '-geometry'); seen.push(guide.id);
    if (index < 11) await press(pager.getByTestId('catalogue-next'));
  }
  expect(seen).toEqual(guideCatalog.map(guide => guide.id)); await press(pager.getByTestId('catalogue-prev'));
  await expect(help.getByText(guideCatalog[10].body, { exact: true })).toBeVisible(); await geometry(page, help, info, 'help-back-one-topic-geometry');
  await page.keyboard.press('Escape'); await expect(help).toBeHidden(); await expect(opener).toBeFocused(); await evidence(info, 'help-twelve-complete-topics', { seen, guideCatalog });
});

test('M03-M3 all nine demo node links descriptions and scope warnings fit one readonly menu and close to the original settings opener', async ({ page }, info) => {
  await load(page, info); const { opener, dialog: settings } = await openSettings(page); await press(settings.getByTestId('demo-menu-open'));
  const menu = page.getByRole('dialog', { name: '演示节点', exact: true }); await expect(menu).toBeVisible(); await expect(settings).toBeHidden(); await expect(menu.locator('#demo-menu-title')).toBeFocused();
  await expect(menu.getByText('以下是由正式指令回放生成的演示存档。进入不会替换正常进度，演示不计入正常新档通关验证。', { exact: true })).toBeVisible();
  expect(demoCatalog).toHaveLength(9); await expect(menu.locator('[data-testid^=demo-node-]')).toHaveCount(9); const links: any[] = [];
  for (const node of demoCatalog) {
    const link = menu.getByTestId('demo-node-' + node.id); await expect(link).toBeVisible(); await expect(link.locator('strong')).toHaveText(node.label); await expect(link.locator('span')).toHaveText(node.description);
    const href = await link.getAttribute('href'); expect(href).not.toBeNull(); const destination = new URL(href!, page.url()), current = new URL(page.url());
    expect(destination.origin).toBe(current.origin); expect(destination.pathname).toBe(current.pathname); expect(destination.search).toBe('?demo=' + node.id); expect(destination.hash).toBe(''); links.push({ ...node, href });
  }
  await geometry(page, menu, info, 'nine-demo-node-menu-geometry');
  await press(menu.getByRole('button', { name: '关闭演示节点', exact: true })); await expect(menu).toBeHidden(); await expect(opener).toBeFocused();
  await evidence(info, 'nine-demo-node-entry-links', links);
});
