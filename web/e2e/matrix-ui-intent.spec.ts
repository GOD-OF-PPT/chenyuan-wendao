import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { resolve } from '../../src/full/engine.ts';
import type { Game } from '../../src/full/types.ts';
import type { Activity, CultivationPlan } from '../../src/full/activity.ts';
import { driver } from '../../tests/full-route.mjs';
import { useJourneyClock, finishJourneyClock, activitySnapshot, openHubFeature } from './support';
import { openTrainingBudget } from './stage-support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
const assistedPlan: CultivationPlan = { kind: 'cultivation', method: 'assisted', maxCycles: 5,
  until: 'cycles', stoneBudget: 100, stoneReserve: 40 };

/** A single native readonly transaction retains every Game database store. */
async function state(page: Page) {
  return page.evaluate(() => new Promise<{ raw: any; game: Game; activity: Activity | null }>((accept, reject) => {
    const request = indexedDB.open('chenyuan-playable-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, names = [...db.objectStoreNames], tx = db.transaction(names, 'readonly');
      const raw: any = { version: db.version, stores: names };
      for (const name of names) {
        const rows: any[] = []; raw[name] = rows;
        const cursor = tx.objectStore(name).openCursor();
        cursor.onsuccess = () => { if (cursor.result) { rows.push({ key: cursor.result.key, value: cursor.result.value }); cursor.result.continue(); } };
      }
      tx.oncomplete = () => { db.close(); accept({ raw,
        game: raw['full-state'].find((row: any) => row.key === 'current').value,
        activity: raw['full-state'].find((row: any) => row.key === 'activity')?.value ?? null }); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
}

async function evidence(info: TestInfo, name: string, value: unknown) {
  await info.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' });
}

async function control(locator: Locator) {
  await expect(locator).toBeVisible();
  const bounds = await locator.evaluate(node => {
    const r = node.getBoundingClientRect(), nav = document.getElementById('primary-navigation')!.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2), outside: string[] = [];
    for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) {
      const box = p.getBoundingClientRect(), style = getComputedStyle(p);
      if (style.display !== 'contents' && box.width > 0 && box.height > 0 &&
        (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1)) outside.push(p.id || p.className);
      if (p instanceof HTMLDialogElement && p.matches(':modal')) break;
    }
    return { height: r.height, width: r.width, font: parseFloat(getComputedStyle(node).fontSize),
      viewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      aboveNav: r.bottom <= nav.top, hit: !!hit && (hit === node || node.contains(hit)), outside,
      oneScreen: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth };
  });
  expect(bounds.height).toBeGreaterThanOrEqual(44); expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.font).toBeGreaterThanOrEqual(14); expect(bounds.viewport).toBe(true); expect(bounds.aboveNav).toBe(true);
  expect(bounds.hit).toBe(true); expect(bounds.outside).toEqual([]); expect(bounds.oneScreen).toBe(true);
}
async function click(locator: Locator) { await expect(locator).toBeEnabled(); await control(locator); await locator.click(); }

async function reading(page: Page) {
  const forecast = page.getByTestId('training-estimate').locator('details');
  const limits = page.getByTestId('training-limits');
  const forecastWasOpen = await forecast.evaluate(node => (node as HTMLDetailsElement).open);
  const limitsWereOpen = await limits.evaluate(node => (node as HTMLDetailsElement).open);
  const before = await state(page);
  if (!forecastWasOpen) await click(forecast.locator('summary'));
  for (const locator of [page.getByTestId('training-per-cycle'), page.getByTestId('training-estimate').locator('p')]) {
    await expect(locator).toBeVisible();
    expect(await locator.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(18);
  }
  for (const node of await page.getByTestId('cultivation-catalogue').locator('small:visible').all())
    expect(await node.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  if (!forecastWasOpen) await click(forecast.locator('summary'));
  if (limitsWereOpen) await openTrainingBudget(page);
  expect(await forecast.evaluate(node => (node as HTMLDetailsElement).open)).toBe(forecastWasOpen);
  expect(await limits.evaluate(node => (node as HTMLDetailsElement).open)).toBe(limitsWereOpen);
  expect((await state(page)).raw).toEqual(before.raw);
}

async function seed(page: Page) {
  // Formal resource acquisition is a fixture, not a real-time growth claim.
  const d = driver('leave', 'sword'); d.funds(140); d.go('cave');
  await useJourneyClock(page); await page.goto('/');
  await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
  await page.getByLabel('导入已有存档', { exact: true }).setInputFiles({ name: 'm03-lawful-qi.json',
    mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d.game)) });
  await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const actual = await state(page), expected = structuredClone(d.game);
  expect(actual.game.core.runId).not.toBe(expected.core.runId); expected.core.runId = actual.game.core.runId; expected.core.revision = 0;
  expect(actual.game).toEqual(expected); expect(actual.activity).toBeNull();
  return actual;
}

async function running(page: Page) {
  await expect.poll(async () => (await activitySnapshot(page))?.status).toBe('running');
  const a = (await activitySnapshot(page)) as Activity;
  await expect(page.locator('[data-testid="training-activity"][data-generation="' + a.generation + '"][data-running="true"]')).toBeVisible();
  await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs / 1000).toFixed(1) + ' 秒');
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  return a;
}

async function pausedAssisted(page: Page) {
  const before = await seed(page);
  await openHubFeature(page, 'cultivation-details');
  await page.getByTestId('cultivation-method-assisted').click(); await openTrainingBudget(page);
  await page.getByLabel('修行目标', { exact: true }).selectOption('5');
  await page.getByLabel('累计灵石预算', { exact: true }).fill('100');
  await page.getByLabel('灵石保留量', { exact: true }).fill('40');
  expect((await state(page)).raw).toEqual(before.raw);
  await click(page.getByTestId('training-start')); const started = await running(page);
  expect(started.plan).toEqual(assistedPlan); expect(started.cycleMs).toBe(60000);
  await page.getByTestId('hub-close').click(); await page.clock.fastForward(30000);
  expect((await state(page)).game).toEqual(before.game);
  await click(page.getByTestId('training-pause'));
  await expect.poll(async () => (await activitySnapshot(page))?.status).toBe('paused');
  const paused = await state(page);
  expect(paused.game).toEqual(before.game); expect(paused.activity!.id).toBe(started.id);
  expect(paused.activity!.plan).toEqual(assistedPlan); expect(paused.activity!.completedCycles).toBe(0);
  return { before, started, paused };
}

async function originalPlan(page: Page, paused: Awaited<ReturnType<typeof state>>) {
  await click(page.getByTestId('training-settings')); await openTrainingBudget(page);
  await expect(page.getByTestId('cultivation-method-assisted')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('修行目标', { exact: true })).toHaveValue('5');
  await expect(page.getByLabel('累计灵石预算', { exact: true })).toHaveValue('100');
  await expect(page.getByLabel('灵石保留量', { exact: true })).toHaveValue('40');
  await expect(page.getByTestId('training-plan-state')).toContainText('已保存');
  await expect(page.getByTestId('training-start')).toBeDisabled();
  await expect(page.getByTestId('cultivation-catalogue')).toContainText(/上方.*继续|继续.*上方/);
  await reading(page); expect((await state(page)).raw).toEqual(paused.raw);
}

async function oneCycle(page: Page, a: Activity, before: Awaited<ReturnType<typeof state>>) {
  const expected = resolve(before.game, a.nextCommand!);
  await page.clock.fastForward(a.cycleMs - 1); expect((await state(page)).raw).toEqual(before.raw);
  await page.clock.fastForward(1);
  await expect.poll(async () => (await activitySnapshot(page))?.completedCycles).toBe(a.completedCycles + 1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const after = await state(page); expect(after.game).toEqual(expected.nextState);
  const receipts = after.raw['full-receipts'].filter((row: any) => row.key === a.runId + ':' + a.nextCommand!.commandId);
  expect(receipts).toHaveLength(1); expect(receipts[0].value.command).toEqual(a.nextCommand);
  expect(receipts[0].value.result).toEqual(expected.result);
  expect(after.activity!.id).toBe(a.id); expect(after.activity!.plan).toEqual(a.plan);
  return { after, expected };
}

test('M03-I1 paused assisted cultivation makes original continuation primary and readonly rearrangement never replaces it', async ({ page }, info) => {
  const fixture = await pausedAssisted(page), { paused } = fixture;
  await evidence(info, 'paused-before-intent-check', fixture);
  await expect(page.locator('#game-content [data-testid="cultivate"].primary:enabled:visible')).toHaveCount(0);
  await expect(page.getByTestId('cultivation-active-resume')).toHaveClass(/(^|\s)primary(\s|$)/);
  await click(page.getByTestId('cultivation-notes-open')); expect((await state(page)).raw).toEqual(paused.raw);
  const rearrange = page.getByTestId('hub-cultivation-details');
  await expect(rearrange).toHaveText('查看完整修行安排'); await expect(rearrange).not.toHaveClass(/(^|\s)primary(\s|$)/);
  await click(rearrange); await expect(page.getByTestId('cultivation-catalogue')).toBeVisible(); await openTrainingBudget(page);
  await reading(page); expect((await state(page)).raw).toEqual(paused.raw);
  await click(page.getByTestId('hub-close')); expect((await state(page)).raw).toEqual(paused.raw);
  await page.screenshot({ path: info.outputPath('paused-original-continuation.png') });
  await originalPlan(page, paused); await click(page.getByTestId('hub-close'));
  await click(page.getByTestId('training-resume')); const resumed = await running(page), beforeCycle = await state(page);
  expect(resumed.id).toBe(paused.activity!.id); expect(resumed.plan).toEqual(assistedPlan);
  expect(resumed.generation).toBeGreaterThan(paused.activity!.generation); expect(resumed.cycleMs).toBe(60000);
  expect(resumed.dueAt! - resumed.startedAt!).toBe(60000); expect(beforeCycle.game).toEqual(paused.game);
  const completed = await oneCycle(page, resumed, beforeCycle);
  expect(completed.expected.result.costs.stones).toBe(20); expect(completed.after.activity!.spentStones).toBe(20);
  expect(completed.after.game.core.player.stones).toBe(paused.game.core.player.stones - 20);
  await click(page.getByTestId('training-pause'));
  expect((await state(page)).game).toEqual(completed.after.game);
  await evidence(info, 'original-plan-resumed-one-full-cycle', { fixture, resumed, beforeCycle, completed, final: await state(page) });
});

test('M03-I2 an edited paused plan remains a draft through reading and return until explicit replacement starts one finite cycle', async ({ page }, info) => {
  const fixture = await pausedAssisted(page), { paused } = fixture;
  await evidence(info, 'paused-before-edit', fixture); await originalPlan(page, paused);
  await page.getByLabel('修行目标', { exact: true }).selectOption('1');
  await page.getByLabel('累计灵石预算', { exact: true }).fill('20');
  await expect(page.getByTestId('training-start')).toHaveText(/替换暂停安排/);
  await expect(page.getByTestId('training-start')).toBeEnabled(); expect((await state(page)).raw).toEqual(paused.raw);
  await click(page.getByTestId('feature-goal')); expect((await state(page)).raw).toEqual(paused.raw);
  await click(page.getByTestId('hub-close')); await expect(page.getByTestId('cultivation-catalogue')).toBeVisible();
  await openTrainingBudget(page); await expect(page.getByLabel('修行目标', { exact: true })).toHaveValue('1');
  await expect(page.getByLabel('累计灵石预算', { exact: true })).toHaveValue('20');
  await expect(page.getByLabel('灵石保留量', { exact: true })).toHaveValue('40');
  expect((await state(page)).raw).toEqual(paused.raw); await reading(page);
  await page.screenshot({ path: info.outputPath('explicit-paused-replacement-draft.png') });
  await click(page.getByTestId('hub-close')); expect((await state(page)).raw).toEqual(paused.raw);
  await click(page.getByTestId('cultivation-notes-open')); expect((await state(page)).raw).toEqual(paused.raw);
  await click(page.getByTestId('hub-cultivation-details')); await openTrainingBudget(page);
  await expect(page.getByLabel('修行目标', { exact: true })).toHaveValue('1');
  await expect(page.getByTestId('training-start')).toHaveText(/替换暂停安排/);
  expect((await state(page)).raw).toEqual(paused.raw); await click(page.getByTestId('training-start'));
  const replacement = await running(page), beforeCycle = await state(page);
  expect(replacement.id).not.toBe(paused.activity!.id);
  expect(replacement.plan).toEqual({ ...assistedPlan, maxCycles: 1, stoneBudget: 20 });
  expect(beforeCycle.game).toEqual(paused.game); await click(page.getByTestId('hub-close'));
  const completed = await oneCycle(page, replacement, beforeCycle);
  expect(completed.after.activity!.status).toBe('stopped'); expect(completed.after.activity!.completedCycles).toBe(1);
  expect(completed.after.activity!.spentStones).toBe(20); expect(completed.expected.result.costs.stones).toBe(20);
  const stopped = completed.after.raw; await page.clock.fastForward(60000); expect((await state(page)).raw).toEqual(stopped);
  await evidence(info, 'explicit-new-arrangement-only', { fixture, replacement, beforeCycle, completed });
});

test('M03-I3 idle and naturally stopped cultivation retain the original start entrance and never require a paused replacement intent', async ({ page }, info) => {
  const before = await seed(page);
  await control(page.getByTestId('cultivate')); await expect(page.getByTestId('cultivate')).toBeEnabled();
  await expect(page.getByTestId('cultivation-active-resume')).toHaveCount(0); expect((await state(page)).raw).toEqual(before.raw);
  await openHubFeature(page, 'cultivation-details'); await openTrainingBudget(page);
  await page.getByLabel('修行目标', { exact: true }).selectOption('1');
  await expect(page.getByTestId('training-start')).toBeEnabled(); await expect(page.getByTestId('training-start')).not.toHaveText(/替换暂停安排/);
  await click(page.getByTestId('training-start')); const natural = await running(page), beforeCycle = await state(page);
  expect(natural.plan).toEqual({ kind: 'cultivation', method: 'natural', maxCycles: 1, until: 'cycles', stoneBudget: 0, stoneReserve: 0 });
  expect(natural.cycleMs).toBe(60000); await click(page.getByTestId('hub-close'));
  const completed = await oneCycle(page, natural, beforeCycle);
  expect(completed.after.activity!.status).toBe('stopped'); expect(completed.expected.result.costs.stones).toBe(0);
  await expect(page.getByTestId('cultivation-active-resume')).toHaveCount(0); await expect(page.getByTestId('cultivate')).toBeEnabled();
  await control(page.getByTestId('cultivate')); expect((await state(page)).raw).toEqual(completed.after.raw);
  await click(page.getByTestId('cultivate')); const next = await running(page);
  expect(next.id).not.toBe(natural.id); expect(next.plan.kind).toBe('cultivation');
  expect((await state(page)).game).toEqual(completed.after.game);
  await evidence(info, 'normal-idle-and-stopped-controls', { before, natural, completed, next });
});
