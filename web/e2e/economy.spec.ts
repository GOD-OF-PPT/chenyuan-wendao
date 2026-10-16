import { test, expect } from '@playwright/test';
import * as C from '../../src/full/content.ts';
import { runner } from '../../scripts/economy/scenarios.mjs';
import { snapshot, action } from './support';
const options = { choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural', advancedMind: false };
test.use({ actionTimeout: 8000, navigationTimeout: 15000 });

test('known old balance imports without resource rescaling and each high realm shows and charges the actual fee', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const origin = runner(options); origin.grow('spirit', false);
  await page.goto('/');
  for (const realm of ['foundation', 'golden', 'nascent', 'spirit'] as const) {
    const r = runner(options, origin.checkpoints[realm]); r.funds(C.assistedCosts[realm] * 2); r.go('cave');
    const legacy = r.ledger.game; legacy.core.balanceVersion = 'full-unbalanced.1';
    await page.getByRole('button', { name: '设置', exact: true }).click();
    if (realm !== 'foundation') page.once('dialog', dialog => dialog.accept());
    await page.getByTestId('import').setInputFiles({ name: 'historical-balance.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
    await expect(page.getByTestId('realm')).toHaveText(C.realms[realm].name);
    await page.getByRole('button', { name: '关闭设置' }).click(); await page.getByTestId('tab-0').click();
    const imported = await snapshot(page);
    expect(imported.core.player).toEqual(legacy.core.player); expect(imported.core.inventory).toEqual(legacy.core.inventory); expect(imported.core.world).toEqual(legacy.core.world);
    expect(imported.core.balanceVersion).toBe('full-unbalanced.2'); expect(imported.core.runId).not.toBe(legacy.core.runId);
    await page.getByLabel('行动次数').selectOption('1');
    await expect(page.getByTestId('preview-灵石辅助')).toContainText(`预计扣费：灵石 ${C.assistedCosts[realm]}`);
    await action(page, 'cultivate-assisted'); const after = await snapshot(page);
    expect(after.core.player.stones).toBe(imported.core.player.stones - C.assistedCosts[realm]);
    expect(after.core.world.elapsedMonths).toBe(imported.core.world.elapsedMonths + 1); expect(after.core.player.xp).toBeGreaterThan(imported.core.player.xp);
    await expect(page.getByTestId('actual-cost')).toContainText(`灵石 ${C.assistedCosts[realm]}`);
    await page.reload(); await expect(page.getByTestId('realm')).toHaveText(C.realms[realm].name); expect(await snapshot(page)).toEqual(after);
  }
  expect(errors).toEqual([]);
});
