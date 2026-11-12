import {test, expect, type Page} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {newGame} from '../../src/full/engine';
import {defaultEncounterPlan} from '../../src/full/adventure';
import {importRecoveryFixture, recoveryDatabase as database} from './idle-recovery-ui-support';
import {snapshot, activitySnapshot as activity, inspectNeed, openHubFeature} from './support';
import {selectPlan, settleVisibleActivity, home} from './idle-route-support';
import {inspectInventorySupply} from './stage-support';

test.use({viewport: {width: 1440, height: 900}, actionTimeout: 8000, navigationTimeout: 15000});
test.setTimeout(60000);
test.afterEach(async ({page}, info) => {
  if (!page.isClosed()) await page.screenshot({path: info.outputPath('Q02-current-surface.png')});
});
function base() { const d = driver(); d.go('cave'); return d.game; }
function meeting() { const d = driver('trade', 'sword'); d.realm(); d.funds(300); d.go('sect'); d.doAction({type: 'EVENT', event: 'shen_return'}); return d.game; }
async function begin(page: Page, plan: any) {
  let selected;
  if (plan.kind === 'encounter') {
    await page.getByTestId('tab-1').click(); await page.getByTestId('explore-mode-battle').click();
    await page.getByTestId('encounter-' + plan.enemy).click();
    selected = {control: page.getByTestId('adventure-start')};
  } else selected = await selectPlan(page, plan);
  await selected.control.click();
  await expect.poll(async () => (await activity(page))?.status).toBe('running');
  return activity(page);
}

test('Q02-1 root source has one return while nested sources retain distinct parent and root returns', async ({page}) => {
  const g = await importRecoveryFixture(page, base()), raw = await database(page);
  await inspectNeed(page, 'foundation_pill');
  const breadcrumb = page.locator('.source-breadcrumb');
  await expect(breadcrumb.getByRole('button')).toHaveCount(1);
  await page.getByTestId('plan-recipe-foundation').click();
  await inspectNeed(page, 'herb');
  await expect(breadcrumb.getByRole('button')).toHaveCount(2);
  await expect(breadcrumb.getByRole('button', {name: '返回上一层', exact: true})).toBeVisible();
  await expect(breadcrumb.getByRole('button', {name: '回到目标', exact: true})).toBeVisible();
  expect(await snapshot(page)).toEqual(g); expect(await database(page)).toEqual(raw);
});

test('Q02-2 selected accepted travel is running rather than a new draft and remains readonly', async ({page}) => {
  const g = await importRecoveryFixture(page, base());
  const a = await begin(page, {kind: 'travel', location: 'wilderness', maxCycles: 1});
  await page.getByTestId('training-settings').first().click();
  const raw = await database(page);
  await expect(page.getByTestId('adventure-plan-state')).toContainText('行路中');
  await expect(page.getByTestId('adventure-plan-state')).not.toContainText('行前查看');
  expect(await activity(page)).toEqual(a); expect(await snapshot(page)).toEqual(g);
  await page.getByTestId('travel-market').click();
  await expect(page.getByTestId('adventure-plan-state')).toContainText('行前查看');
  expect(await database(page)).toEqual(raw);
});

test('Q02-3 reached realms hide obsolete location gates and keep real locked gates', async ({page}) => {
  await importRecoveryFixture(page, base());
  await page.getByTestId('tab-1').click(); await page.getByTestId('explore-mode-travel').click();
  await expect(page.getByTestId('travel-wilderness')).not.toContainText('需凡人');
  await expect(page.getByTestId('travel-cave')).toContainText('当前所在');
  await expect(page.getByTestId('travel-secret')).toContainText('需筑基');
});

test('Q02-2b editing the same opponent budget is a new readonly draft rather than the accepted paused strategy', async ({page}) => {
  const d = driver(); d.go('wilderness');
  const g = await importRecoveryFixture(page, d.game);
  await begin(page, defaultEncounterPlan(g, 'wolf'));
  await page.getByTestId('training-pause').click(); await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  await page.getByTestId('training-settings').first().click();
  const raw = await database(page);
  await expect(page.getByTestId('adventure-plan-state')).toContainText('已暂停');
  await page.getByTestId('adventure-page-limits').click();
  await page.getByLabel('历练最多场次', {exact: true}).fill('2');
  await expect(page.getByTestId('adventure-plan-state')).toContainText('行前查看');
  await expect(page.getByTestId('adventure-plan-state')).not.toContainText('原战策保留');
  expect(await database(page)).toEqual(raw);
});

test('Q02-4 current story and battle highlight their actual navigation surface without advancing Game', async ({page}) => {
  const g = await importRecoveryFixture(page, meeting()), raw = await database(page);
  await page.getByTestId('tab-3').click(); await page.getByTestId('resume-encounter').click();
  await expect(page.getByTestId('tab-3')).toHaveAttribute('aria-current', 'page');
  expect(await snapshot(page)).toEqual(g); expect(await database(page)).toEqual(raw);
});

test('Q02-5 a finished ordinary battle identifies the three-second rounds rather than the next entry cycle', async ({page}) => {
  const d = driver(); d.go('wilderness');
  const g = await importRecoveryFixture(page, d.game);
  await begin(page, defaultEncounterPlan(g, 'wolf'));
  await settleVisibleActivity(page);
  const a = await activity(page); expect(a.victories).toBe(1);
  const summary = page.locator('.game-hud [data-testid=training-summary]');
  await expect(summary).not.toContainText('每轮 30 秒');
  await expect(summary).toContainText('每招 3 秒');
  await expect(page.getByTestId('tab-1')).toHaveAttribute('aria-current', 'page');
  const after = await database(page);
  await page.getByTestId('tab-0').click();
  await expect(page.getByTestId('tab-0')).toHaveAttribute('aria-current', 'page');
  expect(await database(page)).toEqual(after);
});

test('Q02-6 people captions keep a solid readable base and clearance below the actual figure', async ({page}, info) => {
  await importRecoveryFixture(page, meeting());
  await page.getByTestId('tab-3').click(); await page.getByTestId('fate-resume-dialogue').click();
  const table = page.getByTestId('response-table');
  const facts = await table.locator('[data-testid=response-context]').evaluate(node => {
    const box = node.getBoundingClientRect(), figure = node.parentElement!.querySelector('figure')!.getBoundingClientRect();
    return {gap: box.top - figure.bottom, background: getComputedStyle(node).backgroundColor, font: parseFloat(getComputedStyle(node).fontSize)};
  });
  await info.attach('caption-clearance', {body: JSON.stringify(facts), contentType: 'application/json'});
  expect(facts.gap).toBeGreaterThanOrEqual(10); expect(facts.font).toBeGreaterThanOrEqual(14);
  expect(facts.background).not.toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({path: info.outputPath('Q02-person-caption.png')});
});

test('Q02-6b the ordinary opening result does not paint a toast ellipse over its text', async ({page}, info) => {
  await importRecoveryFixture(page, newGame('抉择回响', 'q02-opening'));
  await page.getByTestId('leave').click(); await page.getByTestId('milestone-confirm').click();
  await expect.poll(async () => (await activity(page))?.status).toBe('running');
  await settleVisibleActivity(page);
  await page.clock.runFor(32);
  const toast = page.locator('.action-feedback-toast');
  await expect(toast).toBeVisible();
  expect(await toast.evaluate(node => getComputedStyle(node, '::before').display)).toBe('none');
  await page.screenshot({path: info.outputPath('Q02-choice-feedback.png')});
});

test('Q02-7 a receipt states elapsed months as a cost rather than positive inventory gain', async ({page}) => {
  const d = driver(); d.go('wilderness');
  await importRecoveryFixture(page, d.game);
  await begin(page, {kind: 'source', sourceId: 'herbs', maxCycles: 1, until: 'cycles', target: null, monthBudget: 1, remainingMonthsReserve: 1});
  await settleVisibleActivity(page); await page.getByTestId('hub-receipt').first().click();
  await expect(page.getByTestId('game-content').or(page.locator('.catalogue-view'))).not.toContainText('游戏月 +1');
  await expect(page.getByText('耗时 1 游戏月', {exact: false}).first()).toBeVisible();
});

test('Q02-8 medicine states the paused craft consequence before accepting any replacement', async ({page}) => {
  const d = driver(); d.buy('healing_pill', 6); d.go('wilderness'); d.doAction({type: 'ENCOUNTER', enemy: 'wolf'});
  d.doAction({type: 'BATTLE', move: 'attack'}); d.doAction({type: 'BATTLE', move: 'attack'}); d.doAction({type: 'BATTLE', move: 'flee'});
  d.resource('herb', 8); d.funds(100); d.go('cave');
  await importRecoveryFixture(page, d.game);
  await begin(page, {kind: 'craft', recipeId: 'healing', maxCycles: 5, until: 'cycles', targetQuantity: null, stoneBudget: 25, stoneReserve: 0, monthBudget: 5, remainingMonthsReserve: 1, itemReserves: {herb: 0}});
  await page.getByTestId('training-pause').click(); await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  const paused = await activity(page), raw = await database(page);
  await home(page); await page.getByTestId('tab-2').click(); await inspectInventorySupply(page, 'healing_pill', 'use');
  const planner = page.getByTestId('recovery-planner');
  await expect(planner.getByTestId('preparation-start')).not.toContainText('替换暂停安排');
  await expect(planner).toContainText('结束原炼丹');
  await expect(planner).toContainText('已完成成果保留');
  expect(await activity(page)).toEqual(paused); expect(await database(page)).toEqual(raw);
});

test('Q02-8b rest outside the cave says the trip replaces the paused plan before any travel is accepted', async ({page}) => {
  const d = driver(); d.go('wilderness'); d.doAction({type: 'ENCOUNTER', enemy: 'wolf'});
  d.doAction({type: 'BATTLE', move: 'attack'}); d.doAction({type: 'BATTLE', move: 'attack'}); d.doAction({type: 'BATTLE', move: 'flee'}); d.go('wilderness');
  await importRecoveryFixture(page, d.game);
  await begin(page, {kind: 'source', sourceId: 'herbs', maxCycles: 5, until: 'cycles', target: null, monthBudget: 5, remainingMonthsReserve: 1});
  await page.getByTestId('training-pause').click(); await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  const raw = await database(page);
  await home(page); await page.getByTestId('tab-2').click(); await inspectInventorySupply(page, 'healing_pill', 'use');
  await page.getByTestId('recovery-options-open').click(); await page.getByTestId('recovery-rest').click();
  await expect(page.getByTestId('recovery-replacement-note')).toContainText('启程将结束原');
  await expect(page.getByTestId('recovery-replacement-note')).toContainText('抵达后另行确认疗养');
  await expect(page.getByTestId('preparation-travel')).toBeVisible();
  expect(await database(page)).toEqual(raw);
});
