import {test, expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {snapshot, activitySnapshot as activity} from './support';
import {importRecoveryFixture, recoveryDatabase as database} from './idle-recovery-ui-support';
import {selectPlan, home} from './idle-route-support';
import {openInventoryUses, selectInventoryItem} from './stage-support';
import {lastMs, saved} from './check-cend13-abc-support';

test.use({viewport: {width: 1440, height: 900}, actionTimeout: 8000, navigationTimeout: 15000});

function fixture() {
  const d = driver();
  d.resource('herb', 2);
  d.go('cave');
  return d.game;
}

test('current readonly goal and inventory reading preserve the accepted activity and its one original due command', async ({page}, info) => {
  const g = await importRecoveryFixture(page, fixture());
  const plan = {kind: 'cultivation', method: 'natural', maxCycles: 2, until: 'xp-cap', stoneBudget: 0, stoneReserve: 0} as const;
  const selected = await selectPlan(page, plan);
  await selected.control.click();
  await expect.poll(async () => (await activity(page))?.status).toBe('running');
  const a = await activity(page), accepted = await database(page);
  expect(a.plan).toEqual(plan);
  await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs / 1000).toFixed(1) + ' 秒');
  for (let reading = 0; reading < 2; reading++) {
    await home(page);
    await page.getByTestId('hub-goal').click();
    expect(await database(page)).toEqual(accepted);
    await home(page);
    await page.getByTestId('tab-2').click();
    await selectInventoryItem(page, 'herb');
    await openInventoryUses(page);
    expect(await snapshot(page)).toEqual(g);
    expect(await database(page)).toEqual(accepted);
    await page.getByTestId('inventory-uses-close').click();
  }
  await home(page);
  expect(await activity(page)).toEqual(a);
  await lastMs(page, a, g, accepted);
  await page.clock.fastForward(1);
  const committed = await saved(page, g, a, accepted, info);
  expect(committed.g).toEqual(resolve(g, a.nextCommand).nextState);
  expect(committed.a.completedCycles).toBe(1);
  expect(committed.a.status).toBe('running');
});

test('current failed paintings keep real inventory reading and reachable actions without creating an arrangement', async ({page}, info) => {
  await page.route('**/art/**', route => route.abort());
  const g = await importRecoveryFixture(page, fixture()), before = await database(page);
  await page.getByTestId('tab-2').click();
  await selectInventoryItem(page, 'herb');
  const stage = page.getByTestId('inventory-stage');
  await expect(stage).toHaveAttribute('data-item', 'herb');
  await expect(stage.locator('[data-art-state="failed"]').first()).toBeVisible();
  await openInventoryUses(page);
  await expect(page.getByTestId('inventory-uses-dialog')).toBeVisible();
  expect(await snapshot(page)).toEqual(g);
  expect(await database(page)).toEqual(before);
  expect(await activity(page)).toBeNull();
  const controls = await page.getByTestId('inventory-uses-dialog').locator('button:visible').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return {width: box.width, height: box.height, hit: !!hit && (hit === node || node.contains(hit))};
  }));
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
    expect(control.hit).toBe(true);
  }
  await page.screenshot({path: info.outputPath('quality-failed-art-readable-actions.png')});
});
