import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as C from '../../src/full/content';
import { resolve } from '../../src/full/engine';
import { driver } from '../../tests/full-route.mjs';
import * as previous from '../../src/legacy/rules-v4/index.ts';
import {
  importRecoveryFixture,
  recoveryDatabase,
} from './idle-recovery-ui-support';
import { snapshot, openHubFeature } from './support';
import {
  selectLearningSkill,
  openLearningLibrary,
  selectRelic,
  openRelicPreparation,
} from './stage-support';
import { captureFixedPng } from './png-capture';

test.use({ viewport: { width: 1440, height: 900 } });
const originalPaintedBounds = JSON.parse(
  readFileSync(
    new URL(
      '../../tests/fixtures/ui-bounds/art27-legacy-painted-bounds.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
async function ownedArtifactSize(page: Page, id: string) {
  const asset = page.locator(`[data-asset-id="relic-selected-${id}"]`);
  await expect(asset).toHaveAttribute('data-art-state', 'ready');
  const size = await asset.locator('img').evaluate(
    (node, b) => {
      const i = node as HTMLImageElement,
        r = i.getBoundingClientRect(),
        scale = Math.min(r.width / i.naturalWidth, r.height / i.naturalHeight);
      return { width: (b[2] - b[0]) * scale, height: (b[3] - b[1]) * scale };
    },
    originalPaintedBounds['art/v2/equipment/' + id + '-v1.webp'].alphaBBox16,
  );
  expect(Math.max(size.width, size.height)).toBeGreaterThanOrEqual(280);
}
test('conversion funding keeps its own 24-stone target and returning to the original material sheet restores the full 140-stone target', async ({
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
  d.go('market');
  const quantity = Math.floor(d.game.core.player.stones / C.items.herb.buy);
  if (quantity) d.doAction({ type: 'BUY', item: 'herb', quantity });
  const before = await importRecoveryFixture(page, d.game),
    raw = await recoveryDatabase(page);
  expect(before.core.player.stones).toBeLessThan(24);
  await openHubFeature(page, 'relics');
  await selectRelic(page, 'jade_seal');
  await controlsFit(page, '[data-testid=relic-atelier]');
  await page
    .getByRole('button', { name: '查看认主灵石来源', exact: true })
    .click();
  await expect(page.getByTestId('relic-funding-target')).toContainText(
    '认主灵石库存目标 24',
  );
  await expect(
    page.locator('[data-testid^=relic-go-currency-]').first(),
  ).toBeEnabled();
  await captureFixedPng(page, info.outputPath('conversion-funding-24.png'));
  await page
    .getByRole('button', { name: '← 返回全部材料缺口', exact: true })
    .click();
  await expect(page.getByTestId('relic-stone-need')).toContainText(
    /单件\s*140\s*\+\s*保留\s*0\s*=\s*需有\s*140/,
  );
  expect(await snapshot(page)).toEqual(before);
  expect(await recoveryDatabase(page)).toEqual(raw);
});
for (const old of [false, true])
  test(`original owned-relic forging details and funding keep their full price in ${old ? 'v4' : 'v5'}`, async ({
    page,
  }, info) => {
    const d = old
      ? driver('leave', 'sword', previous.engine, previous.content)
      : driver();
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
    await openHubFeature(page, 'relics');
    await selectRelic(page, 'jade_seal');
    await openRelicPreparation(page);
    await expect(page.getByTestId('relic-stone-need')).toContainText(
      /单件\s*140\s*\+\s*保留\s*0\s*=\s*需有\s*140/,
    );
    await page.getByTestId('relic-currency-sources').click();
    await expect(page.getByTestId('relic-preparation-dialog')).toContainText(
      '灵石库存目标 140',
    );
    await expect(
      page.locator('[data-testid^=relic-go-currency-]').first(),
    ).toBeEnabled();
    await captureFixedPng(
      page,
      info.outputPath(`original-forge-funding-${old ? 'v4' : 'v5'}.png`),
    );
    expect(await snapshot(page)).toEqual(before);
    expect(await recoveryDatabase(page)).toEqual(raw);
  });
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
  await ownedArtifactSize(page, 'jade_seal');
  await expect(page.getByTestId('production-equip-reason')).toBeVisible();
  await expect(page.getByTestId('production-equip-reason')).toContainText(
    '灵露',
  );
  await controlsFit(page, '[data-testid=relic-atelier]');
  await captureFixedPng(
    page,
    info.outputPath('conversion-missing-dew-stage.png'),
  );
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
  const reasons = await page.locator(selector).evaluate((root) =>
    Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-testid=production-equip-reason]',
      ),
    )
      .filter((n) => n.checkVisibility())
      .map((n) => {
        const b = n.getBoundingClientRect(),
          q = document.createRange();
        q.selectNodeContents(n);
        const clips: DOMRect[] = [];
        for (
          let p = n.parentElement;
          p && p !== document.body;
          p = p.parentElement
        )
          if (
            /hidden|clip|auto|scroll/.test(
              getComputedStyle(p).overflow +
                getComputedStyle(p).overflowX +
                getComputedStyle(p).overflowY,
            )
          )
            clips.push(p.getBoundingClientRect());
        const inside = (a: DOMRect, b: DOMRect) =>
          a.left >= b.left - 0.5 &&
          a.right <= b.right + 0.5 &&
          a.top >= b.top - 0.5 &&
          a.bottom <= b.bottom + 0.5;
        return {
          text: n.innerText,
          font: parseFloat(getComputedStyle(n).fontSize),
          range: Array.from(q.getClientRects())
            .filter((r) => r.width && r.height)
            .every((r) => inside(r, b) && clips.every((c) => inside(r, c))),
          overflow:
            n.scrollHeight <= n.clientHeight + 1 &&
            n.scrollWidth <= n.clientWidth + 1,
        };
      }),
  );
  for (const r of reasons) {
    expect(r.font, r.text).toBeGreaterThanOrEqual(14);
    expect(r.range, r.text).toBe(true);
    expect(r.overflow, r.text).toBe(true);
  }

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
            b.bottom <=
              (root.closest('dialog')
                ? innerHeight
                : (document
                    .getElementById('primary-navigation')
                    ?.getBoundingClientRect().top ?? innerHeight)),
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
    await expect(
      page.getByTestId('skill-select-' + id).locator('svg'),
    ).toHaveAttribute(
      'data-build-branch',
      String(!Object.hasOwn(previous.content.skills, id)),
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
