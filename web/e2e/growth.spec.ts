import { test, expect, type Page } from '@playwright/test';
import * as C from '../../src/full/content.ts';
import { driver } from '../../tests/full-route.mjs';
import { start, action, snapshot, travel } from './support';
import { foundation, nextRealm, learn, go, prepareRelic, funds } from './progression';

test.use({ actionTimeout: 8000, navigationTimeout: 15000 });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message)); });
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
const routes = [
  { school: 'sword', strategy: 'craft', choice: 'help', alternate: false },
  { school: 'sword', strategy: 'purchase', choice: 'trade', alternate: false },
  { school: 'talisman', strategy: 'craft', choice: 'leave', alternate: true },
  { school: 'talisman', strategy: 'purchase', choice: 'help', alternate: false },
] as const;
const withoutIdentity = (game: any) => { const value = structuredClone(game); value.core.runId = '<run>'; value.core.revision = 0; return value; };
async function stageCollect(page: Page, item: string, source: string, required: number) {
  await page.getByTestId('tab-0').click(); const before = await snapshot(page), sourceConfig = C.sources[source];
  await page.getByTestId(`growth-go-source-${source}`).click(); const arrived = await snapshot(page);
  expect(arrived.core.inventory).toEqual(before.core.inventory); expect(arrived.core.player).toEqual(before.core.player);
  expect(arrived.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths); await expect(page.getByTestId(`source-${source}`)).toBeFocused();
  await page.getByLabel('取材次数').selectOption('target'); await action(page, `source-${source}`);
  const after = await snapshot(page), steps = Math.ceil((required - arrived.core.inventory[item]) / sourceConfig.items[item]);
  expect(after.core.inventory[item]).toBe(arrived.core.inventory[item] + steps * sourceConfig.items[item]);
  expect(after.core.world.elapsedMonths).toBe(arrived.core.world.elapsedMonths + steps * sourceConfig.months);
  await expect(page.getByTestId('actual-cost')).toContainText(`${steps * sourceConfig.months} 游戏月`);
  await expect(page.getByTestId('actual-stop')).toContainText('目标已经收集齐全');
  await go(page, 'cave'); await page.getByTestId('tab-0').click();
  await expect(page.getByTestId(`growth-material-${item}`)).toContainText('已备齐');
}
for (const route of routes) test(`${route.school}/${route.strategy}: normal new game grows through nascent to spirit with current and alternate resources`, async ({ page }, info) => {
  test.setTimeout(300000);
  const mobile = route.school === 'talisman' && route.strategy === 'purchase'; if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await foundation(page, route.school, route.strategy, route.choice);
  const mind = route.school === 'sword' ? 'sword_still' : 'talisman_calm'; await learn(page, mind); await action(page, `equip-${mind}`);
  await nextRealm(page, route.strategy); const relic = route.school === 'sword' ? 'jade_seal' : 'cloud_mirror';
  await prepareRelic(page, relic); await action(page, `forge-${relic}`); await action(page, `equip-relic-${relic}`);
  const loadout = (await snapshot(page)).loadout;
  for (const stage of [
    { realm: 'golden', item: 'lotus', quantity: 5, source: route.alternate ? 'lotus_task' : 'lotus', next: 'nascent' },
    { realm: 'nascent', item: 'soul', quantity: 6, source: route.alternate ? 'soul_task' : 'soul', next: 'spirit' },
  ] as const) {
    const current = await snapshot(page); await page.reload(); await expect(page.getByTestId('growth-title')).toContainText(C.realms[stage.realm].name);
    expect(await snapshot(page)).toEqual(current); await expect(page.getByTestId('target')).toHaveText('研习' + C.skills[mind].name);
    await expect(page.getByTestId(`growth-material-${stage.item}`)).toBeVisible();
    await expect(page.getByTestId(`growth-route-source-${stage.item}`)).toBeVisible();
    await expect(page.getByTestId(`growth-route-source-${stage.item}_task`)).toBeVisible();
    await expect(page.getByTestId(`growth-route-purchase-${stage.item}`)).toBeVisible();
    if (route.strategy === 'craft') await stageCollect(page, stage.item, stage.source, stage.quantity);
    const prepared = await nextRealm(page, route.strategy), after = await snapshot(page);
    expect(after.core.player.realm).toBe(stage.next); expect(after.loadout).toEqual(loadout); expect(after.ownedRelics).toEqual([relic]);
    expect(after.milestones[stage.next]).toBe(after.core.world.elapsedMonths);
    await expect(page.getByTestId('realm-milestone')).toContainText(`第 ${after.core.world.elapsedMonths} 游戏月`);
    if (stage.next === 'spirit' && route.school === 'sword' && route.strategy === 'craft') {
      for (let repeat = 0; repeat < 2; repeat++) {
        await page.getByRole('button', { name: '设置', exact: true }).click(); page.once('dialog', dialog => dialog.accept());
        await page.getByTestId('restore-checkpoint').click(); await expect(page.getByTestId('realm')).toHaveText('元婴');
        const restored = await snapshot(page); expect(restored.core.runId).not.toBe(prepared.core.runId);
        expect(withoutIdentity(restored)).toEqual(withoutIdentity(prepared));
        await expect(page.getByTestId('goal-select')).toHaveValue('breakthrough');
        await action(page, 'breakthrough'); expect(withoutIdentity(await snapshot(page))).toEqual(withoutIdentity(after));
      }
    }
  }
  await expect(page.getByTestId('realm')).toHaveText('化神'); const arrived = await snapshot(page);
  await page.reload(); await expect(page.getByTestId('growth-material-dao')).toBeVisible(); expect(await snapshot(page)).toEqual(arrived);
  await expect(page.getByTestId('growth-route-source-dao')).toBeVisible(); await expect(page.getByTestId('growth-route-source-dao_task')).toBeVisible();
  if (route.strategy === 'craft') await stageCollect(page, 'dao', route.alternate ? 'dao_task' : 'dao', 6);
  else {
    await funds(page, 720); await page.getByTestId('tab-0').click(); const funded = await snapshot(page);
    if (mobile) await page.getByTestId('growth-material-dao').screenshot({ path: info.outputPath('growth-spirit-mobile.png') });
    await page.getByTestId('growth-go-purchase-dao').click(); const inMarket = await snapshot(page);
    expect(inMarket.core.player.stones).toBe(funded.core.player.stones); expect(inMarket.core.inventory.dao).toBe(0);
    await expect(page.getByLabel('采购数量')).toHaveValue('6'); await action(page, 'buy-dao');
    const purchased = await snapshot(page); expect(purchased.core.player.stones).toBe(funded.core.player.stones - 720); expect(purchased.core.inventory.dao).toBe(6);
  }
  const finished = await snapshot(page); expect(finished.core.player.realm).toBe('spirit'); expect(finished.trial).toBeNull();
  expect(finished.core.inventory.ascension_seal).toBe(0); expect(finished.loadout).toEqual(loadout);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('zero funds retain a deterministic recovery action through the real page', async ({ page }) => {
  await start(page); await page.getByLabel('行动次数').selectOption('50'); await action(page, 'cultivate-assisted');
  expect((await snapshot(page)).core.player.stones).toBe(0); await expect(page.getByTestId('cultivate-assisted')).toBeDisabled();
  await travel(page, 'sect'); await page.getByLabel('取材次数').selectOption('1'); await expect(page.getByTestId('source-work')).toBeEnabled();
  const before = await snapshot(page); await action(page, 'source-work'); const after = await snapshot(page);
  expect(after.core.player.stones).toBe(20); expect(after.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths + 1);
});

test('legally generated lifespan boundary save stops a batch without charging unexecuted months', async ({ page }) => {
  const d = driver(); d.go('sect');
  const limit = C.realms.qi.lifespanMonths - d.game.core.player.startAgeMonths;
  while (limit - d.game.core.world.elapsedMonths > 51) d.doAction({ type: 'SOURCE', sourceId: 'work', count: 50 });
  await page.goto('/'); await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByTestId('import')).toBeEnabled(); await page.getByTestId('import').setInputFiles({ name: 'boundary.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d.game)) });
  await page.getByRole('button', { name: '关闭设置' }).click(); await expect(page.getByTestId('realm')).toHaveText('炼气');
  await page.getByTestId('tab-1').click(); await page.getByLabel('取材次数').selectOption('50'); const before = await snapshot(page);
  const steps = limit - before.core.world.elapsedMonths - 1; expect(steps).toBeGreaterThan(0); expect(steps).toBeLessThan(50);
  await action(page, 'source-work'); const after = await snapshot(page);
  expect(after.core.world.elapsedMonths).toBe(limit - 1); expect(after.core.player.stones).toBe(before.core.player.stones + steps * 20);
  await expect(page.getByTestId('actual-cost')).toContainText(`${steps} 游戏月`); await expect(page.getByTestId('actual-stop')).toContainText('寿元');
  await expect(page.getByTestId('source-work')).toBeDisabled(); await page.reload(); await expect(page.getByTestId('realm')).toHaveText('炼气'); expect(await snapshot(page)).toEqual(after);
});

test('legally generated nascent save with full cultivation still refuses a missing breakthrough item', async ({ page }) => {
  const d = driver(); d.realm(); d.realm(); d.realm(); d.meditate();
  await page.goto('/'); await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByTestId('import')).toBeEnabled(); await page.getByTestId('import').setInputFiles({ name: 'missing-pill.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d.game)) });
  await page.getByRole('button', { name: '关闭设置' }).click(); await expect(page.getByTestId('realm')).toHaveText('元婴');
  await expect(page.getByTestId('xp')).toHaveText('15000 / 15000'); await expect(page.getByTestId('breakthrough')).toBeDisabled();
  await expect(page.getByTestId('growth-pill')).toContainText('化神丹 0 / 1'); const before = await snapshot(page);
  await page.getByTestId('breakthrough').evaluate((button: HTMLButtonElement) => { button.disabled = false; });
  await page.getByTestId('breakthrough').click(); await expect(page.getByTestId('error')).toContainText('化神丹');
  expect(await snapshot(page)).toEqual(before); await page.reload(); await expect(page.getByTestId('realm')).toHaveText('元婴');
  expect(await snapshot(page)).toEqual(before); await expect(page.getByTestId('growth-go-source-soul')).toBeEnabled();
});
