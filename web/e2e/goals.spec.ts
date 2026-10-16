import { test, expect, type Page } from '@playwright/test';
import { start, snapshot, action, travel } from './support';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message)); });
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('goal to recipe to material keeps its context, navigates only, and collects until the real target', async ({ page }) => {
  await start(page); const before = await snapshot(page);
  await page.getByTestId('inspect-foundation_pill').click();
  await expect(page.getByTestId('route-recipe-foundation')).toBeVisible();
  await page.getByTestId('plan-recipe-foundation').click();
  await expect(page.getByTestId('need-herb')).toContainText('0 / 8');
  await expect(page.getByTestId('plan-cost')).toContainText('灵石 20');
  await page.getByTestId('inspect-herb').click(); expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('go-source-herbs').click();
  await expect(page.getByTestId('source-herbs')).toBeFocused();
  const arrived = await snapshot(page); expect(arrived.core.world.location).toBe('wilderness');
  expect(arrived.core.inventory).toEqual(before.core.inventory); expect(arrived.core.player).toEqual(before.core.player);
  expect(arrived.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths); expect(arrived.core.revision).toBe(before.core.revision + 1);
  await page.getByLabel('取材次数').selectOption('target');
  await expect(page.getByTestId('preview-山野采药')).toContainText('当前可执行 4 次');
  await action(page, 'source-herbs');
  const gathered = await snapshot(page); expect(gathered.core.inventory.herb).toBe(8);
  expect(gathered.core.world.elapsedMonths - arrived.core.world.elapsedMonths).toBe(4);
  await expect(page.getByTestId('executed-steps')).toHaveText('实际执行 4 / 50 次');
  await expect(page.getByTestId('actual-cost')).toContainText('4 游戏月');
  await expect(page.getByTestId('actual-stop')).toContainText('目标已经收集齐全');
  await expect(page.getByTestId('collection-target')).toContainText('凝气草库存达到 8');
  await expect(page.getByTestId('source-herbs')).toBeDisabled();
  await expect(page.getByTestId('target')).toHaveText('筹备筑基');
  await expect(page.getByTestId('source-title')).toHaveText('凝气草来源');
  await page.getByTestId('source-back').click(); await expect(page.getByTestId('need-herb')).toHaveCount(0);
  await expect(page.getByTestId('need-dew')).toContainText('尚缺 2');
  await page.getByTestId('goal-panel').getByRole('button', { name: '前往听雨洞府' }).click();
  const recipe = page.getByTestId('craft-healing').locator('..');
  await expect(recipe).toContainText('凝气草将缺2'); await expect(page.getByTestId('craft-healing')).toBeEnabled();
  await action(page, 'craft-healing'); await expect(page.getByTestId('need-herb')).toContainText('尚缺 2');
  expect((await snapshot(page)).core.inventory.herb).toBe(6);
});

test('procurement navigation never buys automatically and the acquired pill removes the goal shortage', async ({ page }) => {
  await start(page); await travel(page, 'sect'); for (let i = 0; i < 6; i++) await action(page, 'source-work');
  const before = await snapshot(page); await page.getByTestId('inspect-foundation_pill').click();
  await page.getByTestId('go-purchase-foundation_pill').click(); await expect(page.getByTestId('buy-foundation_pill')).toBeFocused();
  const arrived = await snapshot(page); expect(arrived.core.inventory).toEqual(before.core.inventory); expect(arrived.core.player.stones).toBe(160);
  expect(arrived.core.revision).toBe(before.core.revision + 1);
  await action(page, 'buy-foundation_pill'); expect((await snapshot(page)).core.player.stones).toBe(0);
  await expect(page.getByTestId('source-details')).toContainText('已备齐，无需重复收集');
  await page.getByTestId('source-back').click(); await expect(page.getByTestId('need-foundation_pill')).toHaveCount(0);
  await expect(page.getByTestId('need-xp')).toBeVisible();
});

test('assisted and natural batches show maximum budget but charge only real steps and stop at gates', async ({ page }) => {
  await start(page); const before = await snapshot(page); await page.getByLabel('行动次数').selectOption('50');
  await expect(page.getByTestId('preview-灵石辅助')).toContainText('预算上限：灵石 1000');
  await expect(page.getByTestId('preview-灵石辅助')).toContainText('当前可执行 2 次');
  await action(page, 'cultivate-assisted'); let after = await snapshot(page);
  expect(after.core.player.stones).toBe(0); expect(after.core.player.xp).toBe(200);
  expect(after.core.world.elapsedMonths - before.core.world.elapsedMonths).toBe(2);
  await expect(page.getByTestId('executed-steps')).toHaveText('实际执行 2 / 50 次');
  await expect(page.getByTestId('actual-cost')).toContainText('灵石 40'); await expect(page.getByTestId('actual-stop')).toContainText('灵石不足');
  await expect(page.getByTestId('cultivate-assisted')).toBeDisabled();
  await page.getByLabel('行动次数').selectOption('target'); await action(page, 'cultivate'); after = await snapshot(page);
  expect(after.core.player.xp).toBe(1000); expect(after.core.player.stones).toBe(0);
  await expect(page.getByTestId('executed-steps')).toHaveText('实际执行 16 / 50 次');
  await expect(page.getByTestId('actual-stop')).toContainText('修为圆满');
});

test('tracking preference survives reload without advancing the game and resets for a replacement run', async ({ page }) => {
  await start(page); const before = await snapshot(page);
  await page.getByLabel('追踪目标', { exact: true }).selectOption('item:herb');
  await page.getByLabel('目标数量').fill('3'); await page.getByLabel('目标数量').blur();
  await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×3'); expect(await snapshot(page)).toEqual(before);
  await page.reload(); await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×3'); expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button', { name: '设置', exact: true }).click(); page.once('dialog', dialog => dialog.accept());
  await page.getByTestId('restart').click(); await expect(page.getByTestId('help')).toBeVisible();
  await expect(page.getByTestId('goal-select')).toHaveValue('breakthrough');
  expect((await snapshot(page)).core.runId).not.toBe(before.core.runId);
});

test('invalid tracking preferences and unavailable preference storage do not change the good save', async ({ page }) => {
  await start(page); const before = await snapshot(page);
  await page.evaluate(runId => localStorage.setItem('chenyuan-tracked-goal-v1', JSON.stringify({ version: 1, runId, target: { kind: 'item', id: '__proto__', quantity: 1 } })), before.core.runId);
  await page.reload(); await expect(page.getByTestId('goal-select')).toHaveValue('breakthrough');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('denied', 'SecurityError'); }; });
  await page.getByLabel('追踪目标', { exact: true }).selectOption('item:herb');
  await expect(page.getByTestId('goal-panel')).toContainText('追踪选择仅在本页保留');
  await expect(page.getByTestId('save-status')).toHaveText('已保存'); expect(await snapshot(page)).toEqual(before);
  for (const quantity of ['0', '1.5']) {
    await page.getByLabel('目标数量').fill(quantity); await page.getByLabel('目标数量').blur();
    await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×1'); await expect(page.getByLabel('目标数量')).toHaveValue('1');
    expect(await snapshot(page)).toEqual(before);
  }
});

test('future sources show true realm gates and do not invent a free reachable route', async ({ page }) => {
  await start(page); const before = await snapshot(page);
  await page.getByLabel('追踪目标', { exact: true }).selectOption('item:jade'); await page.getByTestId('goal-item-sources').click();
  const route = page.getByTestId('route-source-jade'); await expect(route).toContainText('筑基');
  await expect(route).toContainText('条件满足后才能确认成本'); await expect(page.getByTestId('go-source-jade')).toBeDisabled();
  expect(await snapshot(page)).toEqual(before);
  await page.getByLabel('追踪目标', { exact: true }).selectOption('skill:sword_still');
  await expect(page.getByTestId('target')).toHaveText('研习止水剑心'); await expect(page.getByTestId('need-stones')).toContainText('尚缺 60');
  await page.getByLabel('追踪目标', { exact: true }).selectOption('relic:jade_seal');
  await expect(page.getByTestId('need-jade')).toContainText('尚缺 4'); expect(await snapshot(page)).toEqual(before);
  await travel(page, 'sect'); await page.getByLabel('追踪目标', { exact: true }).selectOption('event:lu_intro');
  const title = await page.getByTestId('target').innerText(); await travel(page, 'wilderness');
  await expect(page.getByTestId('goal-select')).toHaveValue('event:lu_intro');
  await expect(page.getByTestId('target')).toHaveText(title); const visited = await snapshot(page);
  await page.reload(); await expect(page.getByTestId('goal-select')).toHaveValue('event:lu_intro');
  await expect(page.getByTestId('target')).toHaveText(title); expect(await snapshot(page)).toEqual(visited);
  expect(visited.core.activeEvent).toBeNull();
});

test('missing purchase funds guide a bounded income batch without buying or overspending', async ({ page }) => {
  await start(page); await page.getByTestId('inspect-foundation_pill').click();
  await page.getByTestId('plan-purchase-foundation_pill').click(); await expect(page.getByTestId('need-stones')).toContainText('尚缺 120');
  await page.getByTestId('inspect-stones').click(); await page.getByTestId('go-source-work').click();
  await page.getByLabel('取材次数').selectOption('target'); await expect(page.getByTestId('collection-target')).toContainText('灵石库存达到 160');
  await action(page, 'source-work'); const after = await snapshot(page);
  expect(after.core.player.stones).toBe(160); expect(after.core.inventory.foundation_pill).toBe(0);
  await expect(page.getByTestId('executed-steps')).toHaveText('实际执行 6 / 6 次');
  await expect(page.getByTestId('source-work')).toBeDisabled();
  await page.getByTestId('source-back').click(); await expect(page.getByTestId('need-stones')).toHaveCount(0);
});

test('battle blocks source navigation while allowing safe target inspection with conditional rewards', async ({ page }) => {
  await start(page); await action(page, 'school-sword'); await travel(page, 'wilderness'); await action(page, 'encounter-wolf');
  const before = await snapshot(page); await page.getByLabel('追踪目标', { exact: true }).selectOption('item:core');
  await page.getByTestId('goal-item-sources').click();
  await expect(page.getByTestId('route-battle-wolf')).toContainText('胜利后');
  await expect(page.getByTestId('go-source-core')).toBeDisabled(); expect(await snapshot(page)).toEqual(before);
});

test('tracked medicine is not reserved and a real use warns then exposes the new shortage', async ({ page }) => {
  await start(page); await action(page, 'school-sword'); await travel(page, 'wilderness'); await action(page, 'encounter-wolf');
  await action(page, 'attack'); await action(page, 'flee'); await page.getByTestId('tab-2').click();
  await page.getByTestId('track-healing_pill').click(); const row = page.locator('article').filter({ has: page.getByTestId('item-healing_pill') });
  await expect(row).toContainText('会消耗追踪物资'); await expect(page.getByTestId('goal-complete')).toBeVisible();
  const before = await snapshot(page); await row.getByRole('button', { name: '服用', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).core.revision).toBe(before.core.revision + 1);
  await expect(page.getByTestId('need-healing_pill')).toContainText('尚缺 1');
  await expect(page.getByTestId('actual-cost')).toContainText('回春丹 ×1');
});


test('mobile goal materials and source navigation remain readable and operable', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await start(page);
  await page.getByTestId('inspect-foundation_pill').click(); await page.getByTestId('plan-recipe-foundation').click();
  await expect(page.getByTestId('need-herb')).toContainText('尚缺 8');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('goal-panel').screenshot({ path: info.outputPath('goal-mobile.png') });
  await page.getByTestId('inspect-herb').click(); await page.getByTestId('go-source-herbs').click();
  await expect(page.getByTestId('source-herbs')).toBeFocused();
  await page.getByLabel('取材次数').selectOption('target'); await expect(page.getByTestId('source-herbs')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
