import { test, expect } from '@playwright/test';
import { driver } from '../../tests/full-route.mjs';
import {
  importRecoveryFixture,
  recoveryDatabase,
} from './idle-recovery-ui-support';
import { snapshot } from './support';
import { answerGameConfirmation } from './game-confirmation-support';

test.use({
  viewport: { width: 1440, height: 900 },
  actionTimeout: 8000,
  navigationTimeout: 15000,
});
test('the real saved-game import refuses an array status without replacing the current life or writing any store', async ({
  page,
}, info) => {
  const d = driver();
  d.go('cave');
  const current = await importRecoveryFixture(page, d.game),
    before = await recoveryDatabase(page);
  await page.getByTestId('game-settings').click();
  const bad = structuredClone(current);
  bad.status = ['active'] as any;
  await page
    .getByLabel('导入存档', { exact: true })
    .setInputFiles({
      name: 'bad-enum.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(bad)),
    });
  await answerGameConfirmation(page, 'import');
  await page.clock.runFor(600);
  await expect(page.getByTestId('error')).toBeVisible();
  expect(await snapshot(page)).toEqual(current);
  expect(await recoveryDatabase(page)).toEqual(before);
  await expect(page.getByTestId('realm')).toHaveText('炼气');
  await info.attach('bad-enum-ui-original-preserved', {
    body: JSON.stringify({
      current,
      before,
      after: await recoveryDatabase(page),
      badEnumRefused: true,
    }),
    contentType: 'application/json',
  });
});
