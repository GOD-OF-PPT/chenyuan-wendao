import { test, expect, type Page } from '@playwright/test';
import * as C from '../../src/full/content.ts';
import { advance } from '../../src/full/engine.ts';
import { stories } from '../../src/full/events.ts';
import { causalRoute } from '../../tests/causal-route.mjs';
import { driver, prepareTrial } from '../../tests/full-route.mjs';
import { runner } from '../../scripts/economy/scenarios.mjs';
import { foundation, nextRealm, funds, resource, go } from './progression';
import { action, snapshot } from './support';
test.use({ actionTimeout: 8000, navigationTimeout: 15000 });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', e => list.push(e.message)); });
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
async function event(page: Page, id: string) { await go(page, stories[id].location); await page.getByTestId('tab-3').click(); await action(page, 'event-' + id); await expect(page.getByTestId('event-title')).toHaveText(stories[id].name); }
function entered(game: any, id: string) {
  let g = structuredClone(game);
  const act = (action: any) => { g = advance(g, { ...action, commandId: 'fixture-' + g.core.revision, runId: g.core.runId, expectedRevision: g.core.revision }); };
  if (g.core.world.location !== stories[id].location) act({ type: 'TRAVEL', location: stories[id].location });
  act({ type: 'EVENT', event: id }); return g;
}
async function importFixture(page: Page, fixture: any, replace = false) {
  if (replace) { await page.getByRole('button', { name: '设置', exact: true }).click(); page.once('dialog', d => d.accept()); }
  const input = replace ? page.getByTestId('import') : page.getByLabel('导入已有存档', { exact: true });
  await expect(input).toBeEnabled();
  await input.setInputFiles({ name: 'legal-causal-boundary.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await expect(page.getByTestId('event-title')).toHaveText(stories[fixture.core.activeEvent?.id]?.name ?? '');
  if (replace) await page.getByRole('button', { name: '关闭设置' }).click();
}
for (const route of [
  { choice: 'help', school: 'sword', meet: 'cooperate', option: 'accept', joint: 'share', phrase: '雨夜赠丹', label: '相助' },
  { choice: 'trade', school: 'talisman', meet: 'rival', option: 'bargain', joint: 'contest', phrase: '旧账早已两清', label: '竞中相惜' },
  { choice: 'leave', school: 'sword', meet: 'decline', option: 'assist', joint: 'reconnect', phrase: '才正式通报姓名', label: '新结同行' },
] as const) test(`${route.choice}/${route.meet}: normal new game makes a distinct reunion and golden-stage choice`, async ({ page }) => {
  test.setTimeout(240000); await foundation(page, route.school, 'purchase', route.choice);
  if (route.choice !== 'trade') {
    await funds(page, C.swordManual.price); await go(page, 'cave'); await page.getByTestId('tab-0').click();
    const navigating = await snapshot(page); await page.getByTestId('go-study-manual').click(); await expect(page.getByTestId('study-manual')).toBeFocused();
    const arrivedStudy = await snapshot(page); expect(arrivedStudy.core.inventory).toEqual(navigating.core.inventory); expect(arrivedStudy.core.player).toEqual(navigating.core.player); expect(arrivedStudy.core.learnedSkills).toEqual(navigating.core.learnedSkills);
    const beforeStudy = await snapshot(page); await expect(page.getByTestId('manual-effect')).toHaveText('当前剑简伤害加成 0');
    expect(await snapshot(page)).toEqual(beforeStudy); await action(page, 'study-manual'); const studied = await snapshot(page);
    expect(studied.core.player.stones).toBe(beforeStudy.core.player.stones - C.swordManual.price); expect(studied.core.learnedSkills).toEqual([C.swordManual.id]);
    await expect(page.getByTestId('manual-effect')).toHaveText('当前剑简伤害加成 4'); await expect(page.getByTestId('study-manual')).toBeDisabled();
  } else { await page.getByTestId('tab-0').click(); await expect(page.getByTestId('study-manual')).toHaveText('已研读'); await expect(page.getByTestId('study-manual')).toBeDisabled(); }

  if (route.choice === 'trade') await funds(page, 18); if (route.choice === 'leave') await resource(page, 'herb', 2);
  await event(page, 'shen_return'); await expect(page.getByTestId('event-body')).toContainText(route.phrase);
  for (const id of ['accept', 'bargain', 'assist']) await expect(page.getByTestId('decide-' + id)).toHaveCount(id === route.option ? 1 : 0);
  const before = await snapshot(page); await action(page, 'decide-' + route.option); const met = await snapshot(page);
  expect(met.core.inventory.healing_pill).toBe(before.core.inventory.healing_pill + 1);
  expect(met.core.inventory.herb).toBe(before.core.inventory.herb - (route.choice === 'leave' ? 2 : 0));
  expect(met.core.player.stones).toBe(before.core.player.stones - (route.choice === 'trade' ? 18 : 0));
  expect(met.core.player.realm).toBe('foundation'); expect(met.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths);
  await page.getByTestId('tab-3').click(); await expect(page.getByTestId('relationship-shen')).toContainText('待元婴后再访');
  const read = await snapshot(page); await page.getByTestId('relationship-record-shen').locator('summary').click(); expect(await snapshot(page)).toEqual(read);
  if (route.meet === 'cooperate') await funds(page, 15); await event(page, 'pei_meet'); await action(page, 'decide-' + route.meet);
  await nextRealm(page, 'purchase'); await resource(page, 'lotus', 1); await page.getByTestId('tab-3').click();
  const preGo = await snapshot(page); await page.getByTestId('relationship-go-pei_echo').click(); await expect(page.getByTestId('event-pei_echo')).toBeFocused();
  const arrived = await snapshot(page); expect(arrived.choices).toEqual(preGo.choices); expect(arrived.core.inventory).toEqual(preGo.core.inventory); expect(arrived.core.player).toEqual(preGo.core.player);
  expect(arrived.core.world.elapsedMonths).toBe(preGo.core.world.elapsedMonths);
  await action(page, 'event-pei_echo'); const inEvent = await snapshot(page);
  await expect(page.getByTestId('decide-' + route.joint)).toBeVisible();
  for (const id of ['share', 'contest', 'reconnect']) await expect(page.getByTestId('decide-' + id)).toHaveCount(id === route.joint ? 1 : 0);
  await action(page, 'decide-' + route.joint); const after = await snapshot(page);
  expect(after.core.inventory.lotus).toBe(inEvent.core.inventory.lotus - 1); expect(after.core.inventory.jade).toBe(inEvent.core.inventory.jade + (route.meet === 'cooperate' ? 3 : 2));
  expect(after.core.player.stones - inEvent.core.player.stones).toBe(route.meet === 'rival' ? 20 : 0);
  await page.getByTestId('tab-3').click(); await expect(page.getByTestId('relationship-label-pei')).toHaveText(route.label);
  await page.reload(); await expect(page.getByTestId('realm')).toHaveText('金丹'); expect(await snapshot(page)).toEqual(after);
  await page.getByTestId('tab-3').click(); await expect(page.getByTestId('relationship-label-pei')).toHaveText(route.label);
});

for (const person of ['shen', 'pei'] as const) test(`${person}: a legally generated late boundary pays for a new pledge after prior refusals`, async ({ page }, info) => {
  const route = causalRoute({ returnVisit: false, meet: 'decline', echo: 'solo', finish: false });
  const id = person === 'shen' ? 'shen_pact' : 'pei_pact', option = person === 'shen' ? 'rebuild' : 'renew';
  if (person === 'pei') await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); const fixture = entered(route.before[id], id); await importFixture(page, fixture);
  await expect(page.getByTestId('decide-' + option)).toBeEnabled(); await expect(page.getByTestId('decide-' + (person === 'shen' ? 'lend' : 'ally'))).toHaveCount(0);
  const before = await snapshot(page); await page.getByTestId('tab-3').click();
  await page.getByTestId('relationship-record-' + person).locator('summary').click();
  expect(await snapshot(page)).toEqual(before); await expect(page.getByTestId('relationship-go-' + id)).toBeDisabled();
  if (person === 'pei') {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByTestId('relationship-pei').screenshot({ path: info.outputPath('causal-mobile.png') });
  }
  await action(page, 'decide-' + option); const after = await snapshot(page);
  for (const [item, n] of Object.entries(stories[id].options.find(o => o.id === option)!.cost!)) expect(after.core.inventory[item]).toBe(before.core.inventory[item] - n);
  expect(after.core.player.xp).toBe(before.core.player.xp); expect(after.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths);
  await page.getByTestId('tab-3').click(); await expect(page.getByTestId('relationship-label-' + person)).toHaveText('相约护阵');
  await page.reload(); await expect(page.getByTestId('realm')).toHaveText(C.realms[after.core.player.realm as C.RealmId].name); expect(await snapshot(page)).toEqual(after);
});

test('decision receipt failure keeps the pending branch and retries its actual cost only once', async ({ page }) => {
  const route = causalRoute({ choice: 'leave', returnVisit: true, finish: false });
  await page.goto('/'); await importFixture(page, entered(route.before.shen_return, 'shen_return')); const before = await snapshot(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put; (globalThis as any).restoreCausalPut = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) { if (this.name === 'full-receipts') throw new DOMException('causal quota', 'QuotaExceededError'); return original.call(this, value, key!); };
  });
  await page.getByTestId('decide-assist').click(); await expect(page.getByTestId('error')).toContainText('存储空间不足'); expect(await snapshot(page)).toEqual(before);
  await expect(page.getByTestId('save-status')).toHaveText('本次未保存'); await expect(page.getByTestId('event-title')).toHaveText('药香故人');
  await page.evaluate(() => (globalThis as any).restoreCausalPut()); await action(page, 'retry'); const after = await snapshot(page);
  expect(after.core.inventory.herb).toBe(before.core.inventory.herb - 2); expect(after.core.inventory.healing_pill).toBe(before.core.inventory.healing_pill + 1); expect(after.choices.shen_return).toBe('assist');
});

test('relationships stay readable during a real battle without advancing or allowing travel', async ({ page }) => {
  const route = causalRoute({ returnVisit: false, meet: 'rival', echo: 'solo', finish: false }); prepareTrial(route.driver); const fixture = route.driver.game;
  await page.goto('/'); await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByTestId('import')).toBeEnabled(); await page.getByTestId('import').setInputFiles({ name: 'legal-trial-state.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await page.getByRole('button', { name: '关闭设置' }).click(); await expect(page.locator('.enemy-row').getByRole('heading', { name: '往昔心魔', exact: true })).toBeVisible();
  const before = await snapshot(page); await page.getByTestId('tab-3').click(); await page.getByTestId('relationship-record-pei').locator('summary').click();
  await expect(page.getByTestId('relationship-label-pei')).toHaveText('相约护阵'); expect(await snapshot(page)).toEqual(before);
  for (const button of await page.locator('[data-testid^="relationship-go-"]').all()) await expect(button).toBeDisabled();
  await action(page, 'attack'); expect((await snapshot(page)).battle.round).toBe(1);
});

test('local insight at full cultivation refuses consumption while advice records a choice without a resource reward', async ({ page }) => {
  const r = runner({ choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural', advancedMind: false });
  r.grow('spirit', false); r.resource('soul', 1); r.meditate(); r.go('secret'); r.act({ type: 'EVENT', event: 'local_echo' });
  await page.goto('/'); await importFixture(page, r.ledger.game); const before = await snapshot(page);
  await expect(page.getByTestId('decide-remember')).toBeDisabled(); await expect(page.getByTestId('decide-remember')).toContainText('修为已满');
  await action(page, 'decide-decline'); const declined = await snapshot(page); expect(declined.core.inventory).toEqual(before.core.inventory);
  const d = driver(); d.go('cave'); d.doAction({ type: 'EVENT', event: 'local_rain' }); await importFixture(page, d.game, true);
  const advising = await snapshot(page); await action(page, 'decide-plan'); const planned = await snapshot(page);
  expect(planned.choices.local_rain).toBe('plan'); expect(planned.core.inventory).toEqual(advising.core.inventory); expect(planned.core.player).toEqual(advising.core.player); expect(planned.core.world).toEqual(advising.core.world);
});
