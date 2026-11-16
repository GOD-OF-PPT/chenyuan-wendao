import { expect, type Page } from '@playwright/test';
import * as C from '../../src/full/content.ts';
import {previewAction} from '../../src/full/queries.ts';
import { action, snapshot, start, travel,openEquipment,revealAction } from './support';

export async function go(page: Page, location: C.LocationId) {
  if ((await snapshot(page)).core.world.location !== location) await travel(page, location);
  await page.getByTestId('tab-1').click();
}
const fixedBatch = (needed: number) => [50, 20, 5, 1].find(count => count <= needed)!;
export async function funds(page: Page, required: number) {
  let game = await snapshot(page);
  const source = Object.entries(C.sources).filter(([, source]) => source.stones > 0 && !Object.keys(source.items).length && C.rank(source.min) <= C.rank(game.core.player.realm)).at(-1)!;
  await go(page, source[1].location);await revealAction(page,'source-'+source[0]);
  while ((game = await snapshot(page)).core.player.stones < required) {
    const count = fixedBatch(Math.ceil((required - game.core.player.stones) / source[1].stones));
    await page.getByLabel('取材次数').selectOption(String(count)); await action(page, `source-${source[0]}`);
  }
}
export async function resource(page: Page, item: string, required: number) {
  let game = await snapshot(page);
  if (game.core.inventory[item] >= required) return;
  const source = Object.entries(C.sources).find(([, source]) => source.items[item] && C.rank(source.min) <= C.rank(game.core.player.realm))!;
  await go(page, source[1].location);await revealAction(page,'source-'+source[0]);
  while ((game = await snapshot(page)).core.inventory[item] < required) {
    const count = fixedBatch(Math.ceil((required - game.core.inventory[item]) / source[1].items[item]));
    await page.getByLabel('取材次数').selectOption(String(count)); await action(page, `source-${source[0]}`);
  }
}
export async function buy(page: Page, item: string, quantity: number) {
  const missing = quantity - (await snapshot(page)).core.inventory[item]; if (missing <= 0) return;
  await funds(page, C.items[item].buy * missing); await go(page, 'market');await revealAction(page,'buy-'+item);
  await page.getByLabel('采购数量').fill(String(missing)); await action(page, `buy-${item}`);
}
export async function craft(page: Page, recipeId: string) {
  const recipe = C.recipes[recipeId];
  for (const [item, quantity] of Object.entries(recipe.inputs)) await resource(page, item, quantity);
  await funds(page, recipe.stones); await go(page, 'cave'); await page.getByTestId('tab-2').click(); await action(page, `craft-${recipeId}`);
}
export async function meditate(page: Page) {
  await go(page, 'cave'); await page.getByTestId('tab-0').click(); await page.getByLabel('行动次数').selectOption('50');
  for (let batches = 0; batches < 10; batches++) {
    const game = await snapshot(page); if (game.core.player.xp === C.realms[game.core.player.realm as C.RealmId].xpCap) return;
    await action(page, 'cultivate');
  }
  throw new Error('修为未在正常批次内达到上限');
}
export async function nextRealm(page: Page, strategy: 'craft' | 'purchase') {
  const before = await snapshot(page), realm = C.realms[before.core.player.realm as C.RealmId];
  if (realm.pill) {
    if (strategy === 'purchase') await buy(page, realm.pill, 1);
    else await craft(page, Object.keys(C.recipes).find(id => C.recipes[id].output === realm.pill)!);
  }
  if (realm.pill && C.rank(before.core.player.realm) >= C.rank('foundation')) {
    await page.getByTestId('tab-0').click(); const ready = await snapshot(page);
    if(await page.getByTestId('hub-cultivation-details').isVisible())await page.getByTestId('hub-cultivation-details').click();
    await expect(page.getByTestId('growth-pill-ready')).toBeVisible();
    expect(await snapshot(page)).toEqual(ready);
    if (ready.core.player.xp < realm.xpCap) {expect(previewAction(ready,{type:'BREAKTHROUGH'}).allowed).toBe(false);if(await page.getByTestId('breakthrough').isVisible())await expect(page.getByTestId('breakthrough')).toBeDisabled();else await expect(page.getByTestId('return-cave')).toBeEnabled();}
  }
  await meditate(page); const prepared = await snapshot(page); await action(page, 'breakthrough');
  await expect(page.getByTestId('realm')).toHaveText(C.realms[realm.next!].name);
  if (realm.pill) expect((await snapshot(page)).core.inventory[realm.pill]).toBe(prepared.core.inventory[realm.pill] - 1);
  return prepared;
}
export async function foundation(page: Page, school: C.School, strategy: 'craft' | 'purchase', choice = 'leave') {
  await start(page, choice); await action(page, `school-${school}`); await nextRealm(page, strategy);
}
export async function prepareRelic(page: Page, id: string) {
  for (const [item, quantity] of Object.entries(C.relics[id].inputs)) await resource(page, item, quantity);
  await funds(page, C.relics[id].stones); await go(page, 'cave'); await page.getByTestId('tab-0').click();
}
export async function learn(page: Page, id: string) {
  await funds(page, C.skills[id].price); await go(page, 'sect'); await page.getByTestId('tab-0').click();
  await openEquipment(page);await revealAction(page,'learn-'+id);await page.getByTestId(`track-skill-${id}`).click();if(await page.getByTestId('feature-goal').isVisible())await page.getByTestId('feature-goal').click(); const before = await snapshot(page);
  await page.getByTestId('goal-location').click();
  await expect(page.getByTestId(`learn-${id}`)).toBeFocused(); expect(await snapshot(page)).toEqual(before);
  await action(page, `learn-${id}`); const after = await snapshot(page);
  expect(after.learned).toContain(id); expect(after.loadout).toEqual(before.loadout);
  expect(after.core.player.stones).toBe(before.core.player.stones - C.skills[id].price);
  expect(after.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths);
}
