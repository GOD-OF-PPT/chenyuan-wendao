import { test, expect, type Page } from '@playwright/test';
import * as C from '../../src/full/content';
import { resolve } from '../../src/full/engine';
import { driver } from '../../tests/full-route.mjs';
import {
  importRecoveryFixture,
  recoveryDatabase,
} from './idle-recovery-ui-support';
import { snapshot, openHubFeature } from './support';
import {
  selectLearningSkill,
  openLearningLibrary,
  selectRelic,
} from './stage-support';
import { captureFixedPng } from './png-capture';

test.use({ viewport: { width: 1440, height: 900 } });
test('an unaffordable owned conversion retains its exact quote and a one-dew source target without executing anything', async ({
  page,
}, info) => {
  const d = driver();
  d.realm();
  d.realm();
  d.resource('jade', 7);
  d.resource('core', 1);
  d.funds(600);
  d.go('cave');
  d.doAction({ type: 'FORGE', relic: 'frost_sword' });
  d.doAction({ type: 'FORGE', relic: 'jade_seal' });
  d.doAction({ type: 'EQUIP_RELIC', relic: 'frost_sword' });
  const before = await importRecoveryFixture(page, d.game),
    raw = await recoveryDatabase(page);
  expect(before.core.inventory.dew).toBe(0);
  await openHubFeature(page, 'relics');
  await selectRelic(page, 'jade_seal');
  await page.getByTestId('equip-relic-jade_seal').click();
  await expect(page.getByTestId('configuration-cost')).toContainText('灵露 ×1');
  await expect(page.getByTestId('configuration-confirm')).toBeDisabled();
  await captureFixedPng(
    page,
    info.outputPath('conversion-insufficient-dew.png'),
  );
  await page.getByTestId('configuration-cancel').click();
  await page.getByRole('button', { name: '查看灵露来源', exact: true }).click();
  const target = await page.evaluate(() =>
    Object.keys(localStorage)
      .map((key) => {
        try {
          return JSON.parse(localStorage.getItem(key) ?? 'null')?.target;
        } catch {
          return null;
        }
      })
      .find((target) => target?.kind === 'item' && target.id === 'dew'),
  );
  expect(target).toEqual({ kind: 'item', id: 'dew', quantity: 1 });
  expect(await snapshot(page)).toEqual(before);
  expect(await recoveryDatabase(page)).toEqual(raw);
});
async function controlsFit(page: Page, selector: string) {
  const rows = await page.locator(selector).evaluate((root) =>
    Array.from(root.querySelectorAll('button'))
      .filter((n) => n.checkVisibility())
      .map((n) => {
        const b = n.getBoundingClientRect(),
          hit = document.elementFromPoint(
            b.x + b.width / 2,
            b.y + b.height / 2,
          );
        return {
          text: n.innerText,
          width: b.width,
          height: b.height,
          inside:
            b.left >= 0 &&
            b.right <= innerWidth &&
            b.top >= 0 &&
            b.bottom <= innerHeight,
          hit: n.disabled || (!!hit && (hit === n || n.contains(hit))),
        };
      }),
  );
  for (const row of rows) {
    expect(row.inside, row.text).toBe(true);
    expect(row.width, row.text).toBeGreaterThanOrEqual(44);
    expect(row.height, row.text).toBeGreaterThanOrEqual(44);
    expect(row.hit, row.text).toBe(true);
  }
}
test('eighteen real volumes remain readable and an already chosen branch explains and disables its rival without writing', async ({
  page,
}, info) => {
  const d = driver();
  d.realm();
  d.realm();
  d.funds(300);
  d.go('sect');
  d.doAction({ type: 'LEARN', skill: 'sword_still' });
  const before = await importRecoveryFixture(page, d.game),
    raw = await recoveryDatabase(page);
  await openHubFeature(page, 'skills');
  await page.getByTestId('equipment-mode-skills').click();
  await openLearningLibrary(page);
  await page.getByLabel('功法流派', { exact: true }).selectOption('all');
  await page.getByLabel('显示后续功法法宝', { exact: true }).check();
  for (const [id, skill] of Object.entries(C.skills)) {
    await selectLearningSkill(page, id);
    await expect(page.getByTestId('skill-' + id)).toContainText(
      skill.description,
    );
    await expect(page.getByTestId('jade-engraving')).toHaveAttribute(
      'data-painted',
      'true',
    );
  }
  await selectLearningSkill(page, 'sword_pierce');
  await expect(page.getByTestId('learn-reason')).toContainText('止水剑心');
  await expect(page.getByTestId('learn-sword_pierce')).toBeDisabled();
  await controlsFit(page, '[data-testid=learning-planner]');
  await captureFixedPng(page, info.outputPath('branch-rival-readable.png'));
  expect(await snapshot(page)).toEqual(before);
  expect(await recoveryDatabase(page)).toEqual(raw);
});

test('owned relic comparison shows a real conversion price before one atomic confirmation and refresh cannot charge it twice', async ({
  page,
}, info) => {
  const d = driver();
  d.realm();
  d.realm();
  d.resource('jade', 7);
  d.resource('core', 1);
  d.resource('dew', 2);
  d.funds(1000);
  d.go('cave');
  d.doAction({ type: 'FORGE', relic: 'frost_sword' });
  d.doAction({ type: 'FORGE', relic: 'jade_seal' });
  d.doAction({ type: 'EQUIP_RELIC', relic: 'frost_sword' });
  const before = await importRecoveryFixture(page, d.game),
    raw = await recoveryDatabase(page);
  await openHubFeature(page, 'relics');
  await selectRelic(page, 'jade_seal');
  await expect(page.getByTestId('relic-conversion-cost')).toContainText(
    '灵石 24',
  );
  await expect(page.getByTestId('relic-conversion-cost')).toContainText(
    '灵露 ×1',
  );
  await page.getByTestId('equip-relic-jade_seal').click();
  await expect(page.getByTestId('configuration-cost')).toContainText('灵石 24');
  await expect(page.getByTestId('configuration-cost')).toContainText('灵露 ×1');
  await controlsFit(page, '[data-testid=configuration-dialog]');
  await captureFixedPng(page, info.outputPath('conversion-actual-cost.png'));
  expect(await recoveryDatabase(page)).toEqual(raw);
  expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('configuration-cancel').click();
  expect(await recoveryDatabase(page)).toEqual(raw);
  await page.getByTestId('equip-relic-jade_seal').click();
  await page.getByTestId('configuration-confirm').click();
  await expect(page.getByTestId('configuration-dialog')).not.toBeVisible();
  const after = await snapshot(page),
    stored: any = await recoveryDatabase(page);
  const receipt = stored.rows['full-receipts']
    .map((e: any) => e.value)
    .find((v: any) => v.format === 'chenyuan-configuration-receipt');
  expect(after).toEqual(resolve(before, receipt.intent.command).nextState);
  expect(after.core.player.stones).toBe(before.core.player.stones - 24);
  expect(after.core.inventory.dew).toBe(before.core.inventory.dew - 1);
  await page.reload();
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  expect(await snapshot(page)).toEqual(after);
  expect(await recoveryDatabase(page)).toEqual(stored);
});
