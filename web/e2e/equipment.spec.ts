import { test, expect, type Page } from '@playwright/test';
import * as C from '../../src/full/content.ts';
import { action, snapshot, start } from './support';
import { foundation, nextRealm, learn, go, prepareRelic } from './progression';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message)); });
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
const combinations = [
 { school: 'sword', strategy: 'craft', choice: 'help', relic: 'frost_sword' },
 { school: 'sword', strategy: 'purchase', choice: 'trade', relic: 'jade_seal' },
 { school: 'talisman', strategy: 'craft', choice: 'leave', relic: 'soul_lamp' },
 { school: 'talisman', strategy: 'purchase', choice: 'help', relic: 'cloud_mirror' },
] as const;
for (const route of combinations) test(`${route.school}/${route.strategy}: normal new game learns, replaces slots, reaches golden and equips ${route.relic}`, async ({ page }) => {
  await foundation(page, route.school, route.strategy, route.choice);
  await page.getByLabel('行动次数').selectOption('1'); await expect(page.getByTestId('preview-自然吐纳')).toContainText('修为 +120');
  const mind = route.school === 'sword' ? 'sword_still' : 'talisman_calm', builder = route.school === 'sword' ? 'sword_guard' : 'talisman_frost';
  const finisher = route.school === 'sword' ? 'sword_echo' : 'talisman_return';
  await learn(page, mind); await page.getByTestId(`track-skill-${mind}`).click();
  await expect(page.getByTestId('target')).toHaveText('研习' + C.skills[mind].name); await expect(page.getByTestId('goal-complete')).toBeVisible();
  await action(page, `equip-${mind}`); await expect(page.getByTestId('build-stats')).toContainText('静修加成 25%');
  await go(page, 'cave'); await page.getByTestId('tab-0').click(); await page.getByLabel('行动次数').selectOption('1');
  await expect(page.getByTestId('preview-自然吐纳')).toContainText('修为 +150');
  const beforeCultivation = await snapshot(page); await action(page, 'cultivate'); expect((await snapshot(page)).core.player.xp - beforeCultivation.core.player.xp).toBe(150);
  await learn(page, builder); await action(page, `equip-${builder}`);
  await page.reload(); await expect(page.getByTestId('loadout-builder')).toHaveText(C.skills[builder].name);
  const foundationSave = await snapshot(page); expect(foundationSave.loadout.mind).toBe(mind);
  await nextRealm(page, route.strategy); await learn(page, finisher); await action(page, `equip-${finisher}`);
  await prepareRelic(page, route.relic); const prepared = await snapshot(page);
  if (route.relic === 'frost_sword') {
    await page.getByTestId('track-relic-jade_seal').click();
    await expect(page.getByTestId('relic-frost_sword')).toContainText('地脉灵玉将缺3'); expect(await snapshot(page)).toEqual(prepared);
  }
  await action(page, `forge-${route.relic}`); const forged = await snapshot(page);
  expect(forged.ownedRelics).toEqual([route.relic]); expect(forged.loadout.relic).toBeNull();
  expect(forged.core.player.stones).toBe(prepared.core.player.stones - C.relics[route.relic].stones);
  expect(forged.core.world.elapsedMonths).toBe(prepared.core.world.elapsedMonths + 2);
  for (const [item, quantity] of Object.entries(C.relics[route.relic].inputs)) expect(forged.core.inventory[item]).toBe(prepared.core.inventory[item] - quantity);
  await expect(page.getByTestId(`forge-${route.relic}`)).toBeDisabled();
  await action(page, `equip-relic-${route.relic}`); const equipped = await snapshot(page);
  expect(equipped.loadout).toEqual({ mind, builder, finisher, relic: route.relic });
  expect(equipped.core.player.stones).toBe(forged.core.player.stones); expect(equipped.core.world).toEqual(forged.core.world);
  await page.reload(); await expect(page.getByTestId('loadout-relic')).toHaveText(C.relics[route.relic].name); expect(await snapshot(page)).toEqual(equipped);
  await go(page, 'secret'); await action(page, 'encounter-serpent'); await action(page, 'technique');
  const battle = await snapshot(page); expect(battle.battle).not.toBeNull();
  expect(battle.core.player.mp).toBe(150 - (route.school === 'sword' ? 8 : 10));
  if (route.school === 'sword') expect(battle.battle.sword).toBe(1); else expect(battle.battle.marks).toEqual([2]);
  await page.getByTestId('tab-0').click(); const oldBuilder = C.startingLoadouts[route.school].builder;
  await expect(page.getByTestId(`equip-${oldBuilder}`)).toBeDisabled(); await expect(page.getByTestId(`skill-${oldBuilder}`).getByTestId('equip-reason')).toContainText('战斗中');
  await expect(page.getByTestId(`equip-relic-${route.relic}`)).toBeDisabled(); expect(await snapshot(page)).toEqual(battle);
  await page.reload(); await expect(page.getByTestId('round')).toHaveText('第 2 回合'); expect(await snapshot(page)).toEqual(battle);
  await action(page, 'flee'); const outside = await snapshot(page), other = route.school === 'sword' ? 'talisman' : 'sword';
  await action(page, `school-${other}`); await action(page, `school-${route.school}`);
  const reset = await snapshot(page); expect(reset.learned).toEqual(expect.arrayContaining([mind, builder, finisher]));
  expect(reset.loadout).toEqual({ ...C.startingLoadouts[route.school], relic: route.relic });
  for (const id of [mind, builder, finisher]) await action(page, `equip-${id}`);
  const restored = await snapshot(page); expect(restored.loadout).toEqual({ mind, builder, finisher, relic: route.relic });
  expect(restored.core.inventory).toEqual(outside.core.inventory); expect(restored.core.player.stones).toBe(outside.core.player.stones); expect(restored.core.world).toEqual(outside.core.world);
});

test('forge failure retries one complete payment and battle rejects a DOM-unlocked equipment action', async ({ page }) => {
  await foundation(page, 'sword', 'purchase'); await learn(page, 'sword_guard'); await nextRealm(page, 'purchase');
  await prepareRelic(page, 'jade_seal'); const before = await snapshot(page);
  await page.evaluate(() => { const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) { if (this.name === 'full-state' && key === 'current') { IDBObjectStore.prototype.put = original; throw new DOMException('quota', 'QuotaExceededError'); } return original.call(this, value, key!); };
  });
  await page.getByTestId('forge-jade_seal').click(); await expect(page.getByTestId('save-status')).toHaveText('本次未保存'); expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('retry').click(); await expect(page.getByTestId('loadout-relic')).toHaveText('尚未装备');
  await expect(page.getByTestId('forge-jade_seal')).toHaveText('已炼成'); const after = await snapshot(page);
  expect(after.core.revision).toBe(before.core.revision + 1); expect(after.core.player.stones).toBe(before.core.player.stones - 140);
  expect(after.core.inventory.jade).toBe(before.core.inventory.jade - 4); expect(after.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths + 2); expect(after.ownedRelics).toEqual(['jade_seal']);
  await action(page, 'equip-relic-jade_seal'); await expect(page.getByTestId('equip-sword_guard')).toBeEnabled();
  await go(page, 'secret'); await action(page, 'encounter-serpent'); await page.getByTestId('tab-0').click(); const during = await snapshot(page);
  await expect(page.getByTestId('equip-sword_guard')).toBeDisabled();
  await page.getByTestId('equip-sword_guard').evaluate((button: HTMLButtonElement) => { button.disabled = false; });
  await page.getByTestId('equip-sword_guard').click(); await expect(page.getByTestId('error')).toContainText('战斗中'); expect(await snapshot(page)).toEqual(during);
  await action(page, 'flee'); await action(page, 'equip-sword_guard'); expect((await snapshot(page)).loadout.builder).toBe('sword_guard');
});

test('mobile equipment target navigation reaches a real forge and keeps every operation visible', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await foundation(page, 'talisman', 'purchase'); await nextRealm(page, 'purchase');
  await prepareRelic(page, 'cloud_mirror'); await page.getByTestId('track-relic-cloud_mirror').click();
  await expect(page.getByTestId('target')).toHaveText('炼成流云镜');
  await page.getByTestId('goal-panel').getByRole('button', { name: '前往听雨洞府' }).click();
  await expect(page.getByTestId('forge-cloud_mirror')).toBeFocused(); await action(page, 'forge-cloud_mirror'); await action(page, 'equip-relic-cloud_mirror');
  await expect(page.getByTestId('loadout-relic')).toHaveText('流云镜'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId('relic-cloud_mirror').screenshot({ path: info.outputPath('equipment-mobile.png') });
});


test('early equipment inspection reveals true realm gates without granting skills or relics', async ({ page }) => {
  await start(page); await action(page, 'school-sword'); const before = await snapshot(page);
  await page.getByLabel('显示后续功法法宝').check();
  await expect(page.getByTestId('forge-jade_seal')).toBeDisabled(); await expect(page.getByTestId('relic-jade_seal').getByTestId('forge-reason')).toContainText('金丹');
  expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('track-skill-sword_still').click(); await page.getByTestId('goal-panel').getByRole('button', { name: '前往青云宗' }).click();
  await expect(page.getByTestId('learn-sword_still')).toBeDisabled(); await expect(page.getByTestId('skill-sword_still').getByTestId('learn-reason')).toContainText('筑基');
  const arrived = await snapshot(page); expect(arrived.core.revision).toBe(before.core.revision + 1);
  expect(arrived.core.player).toEqual(before.core.player); expect(arrived.core.inventory).toEqual(before.core.inventory);
  expect(arrived.learned).not.toContain('sword_still'); expect(arrived.ownedRelics).toEqual([]);
});
