import { test, expect, type Page } from '@playwright/test';
import * as C from '../../src/full/content';
import { createIdleRoute } from '../../scripts/economy/idle-scenarios.mjs';
import { practiceLesson } from '../src/first-practice';
import { singleBattlePlan, defaultBattlePlan } from '../../src/full/adventure';
import { snapshot, activitySnapshot } from './support';
import {
  home,
  decision,
  selectPlan,
  settleVisibleActivity,
  runVisibleIdleRoute,
  readJourneyDatabase,
} from './idle-route-support';
import { captureFixedPng } from './png-capture';
import { driver } from '../../tests/full-route.mjs';
import { importRecoveryFixture } from './idle-recovery-ui-support';
import { openEquipment } from './support';
import { answerGameConfirmation } from './game-confirmation-support';

test.use({
  viewport: { width: 1440, height: 900 },
  actionTimeout: 8000,
  navigationTimeout: 15000,
});
async function openPractice(page: Page, primary = false) {
  if (primary) {
    await home(page);
    await page.getByTestId('cultivation-notes-open').click();
    await page.getByTestId('first-practice-open').click();
  } else {
    await page.getByTestId('hub-help').click();
    await page.getByTestId('help-first-practice').click();
  }
  await expect(page.getByTestId('first-practice-book')).toBeVisible();
  await expect(page.locator('#first-practice-title')).toBeFocused();
  await expect(page.getByTestId('practice-blocked')).toHaveCount(0);
}
async function bookFits(page: Page) {
  const facts = await page
    .getByTestId('first-practice-book')
    .evaluate((root) => {
      const inside = (r: DOMRect, b: DOMRect) =>
        r.left >= b.left - 0.5 &&
        r.right <= b.right + 0.5 &&
        r.top >= b.top - 0.5 &&
        r.bottom <= b.bottom + 0.5;
      const box = root.getBoundingClientRect();
      return {
        oneScreen:
          box.left >= 0 &&
          box.top >= 0 &&
          box.right <= innerWidth &&
          box.bottom <= innerHeight &&
          root.scrollHeight <= root.clientHeight,
        buttons: Array.from(root.querySelectorAll('button'))
          .filter((n) => n.checkVisibility())
          .map((n) => {
            const r = n.getBoundingClientRect(),
              hit = document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2,
              );
            return {
              text: n.innerText,
              w: r.width,
              h: r.height,
              inside: inside(r, box),
              hit: n.disabled || (!!hit && (n === hit || n.contains(hit))),
            };
          }),
        copy: Array.from(root.querySelectorAll<HTMLElement>('p,h2,h3,small'))
          .filter(
            (n) => n.checkVisibility() && !n.closest('[aria-hidden=true]'),
          )
          .map((n) => {
            const r = n.getBoundingClientRect(),
              q = document.createRange();
            q.selectNodeContents(n);
            const clips = [];
            for (
              let p = n.parentElement;
              p && p !== document.body;
              p = p.parentElement
            )
              if (
                /hidden|clip|auto|scroll/.test(
                  getComputedStyle(p).overflow +
                    getComputedStyle(p).overflowY +
                    getComputedStyle(p).overflowX,
                )
              )
                clips.push(p.getBoundingClientRect());
            return {
              text: n.innerText,
              font: parseFloat(getComputedStyle(n).fontSize),
              minimum: n.matches('small') ? 14 : 18,
              range: Array.from(q.getClientRects())
                .filter((v) => v.width && v.height)
                .every((v) => inside(v, r) && clips.every((b) => inside(v, b))),
              inside: inside(r, box),
            };
          }),
      };
    });
  expect(facts.oneScreen).toBe(true);
  for (const b of facts.buttons) {
    expect(b.w, b.text).toBeGreaterThanOrEqual(44);
    expect(b.h, b.text).toBeGreaterThanOrEqual(44);
    expect(b.inside, b.text).toBe(true);
    expect(b.hit, b.text).toBe(true);
  }
  for (const p of facts.copy) {
    expect(p.font, p.text).toBeGreaterThanOrEqual(p.minimum);
    expect(p.range, p.text).toBe(true);
    expect(p.inside, p.text).toBe(true);
  }
}
async function reachPractice(
  page: Page,
  kind: 'commission' | 'assisted' | 'encounter',
) {
  await openPractice(page);
  await page.getByTestId('practice-tab-' + kind).click();
  const game = await snapshot(page),
    lesson = practiceLesson(game, kind),
    before = await readJourneyDatabase(page);
  if (game.core.world.location !== lesson.location) {
    await page.getByTestId('practice-inspect').click();
    await expect(page.getByTestId('first-practice-book')).toBeHidden();
    expect(await readJourneyDatabase(page)).toEqual(before);
    await decision(page, page.getByTestId('adventure-start'));
    expect((await activitySnapshot(page)).plan).toEqual({
      kind: 'travel',
      location: lesson.location,
      maxCycles: 1,
    });
    await settleVisibleActivity(page);
    await openPractice(page);
    await page.getByTestId('practice-tab-' + kind).click();
  }
  await bookFits(page);
  return practiceLesson(await snapshot(page), kind);
}

for (const choice of ['help', 'trade', 'leave'] as const)
  for (const school of ['sword', 'talisman'] as const)
    test(`normal first practice ${choice}/${school} earns spends and reads a real first battle`, async ({
      page,
    }, info) => {
      const options = {
        choice,
        school,
        preparation: 'gather',
        cultivation: 'natural',
        answer: 'accept',
        ending: 'transmit',
        advanced: false,
      };
      const prefix = (o: any, identity: any) => {
        const r = createIdleRoute(o, identity);
        r.begin();
        return {
          success: true,
          failure: null,
          game: r.game,
          steps: r.activity.steps,
          onlineMs: r.activity.onlineMs,
        };
      };
      const initial = await runVisibleIdleRoute(page, info, options, prefix, {
        terminalRealm: 'qi',
      });
      expect(initial.core.player.xp).toBe(0);
      const raw = await readJourneyDatabase(page);
      await openPractice(page, true);
      for (const kind of ['commission', 'assisted', 'encounter']) {
        await page.getByTestId('practice-tab-' + kind).click();
        await bookFits(page);
        expect(await readJourneyDatabase(page)).toEqual(raw);
        if (choice === 'leave' && school === 'sword')
          await captureFixedPng(
            page,
            info.outputPath('practice-' + kind + '.png'),
          );
      }
      await page.getByTestId('practice-close').click();
      expect(await readJourneyDatabase(page)).toEqual(raw);
      for (const kind of ['commission', 'assisted', 'encounter'] as const) {
        const lesson = await reachPractice(page, kind),
          before = await snapshot(page),
          old = await activitySnapshot(page);
        const db = await readJourneyDatabase(page);
        await page.getByTestId('practice-close').click();
        expect(await readJourneyDatabase(page)).toEqual(db);
        await openPractice(page);
        await page.getByTestId('practice-tab-' + kind).click();
        await page.getByTestId('practice-confirm').dblclick();
        await expect
          .poll(async () => {
            const a = await activitySnapshot(page);
            return a?.id !== old?.id && a?.status === 'running';
          })
          .toBe(true);
        expect((await activitySnapshot(page)).plan).toEqual(lesson.plan);
        expect(await snapshot(page)).toEqual(before);
        const done = await settleVisibleActivity(page);
        expect(done.cycles).toBe(1);
        if (kind === 'commission')
          expect(done.game.core.player.stones).toBe(
            before.core.player.stones + C.sources.work.stones,
          );
        if (kind === 'assisted') {
          expect(done.game.core.player.stones).toBe(
            before.core.player.stones - lesson.plan.stoneBudget,
          );
          expect(done.game.core.player.xp).toBeGreaterThan(
            before.core.player.xp,
          );
        }
        if (kind === 'encounter') {
          expect(done.game.battle?.round).toBe(0);
          expect(done.game.wins).toBe(0);
        }
        await openPractice(page);
        await page.getByTestId('practice-tab-' + kind).click();
        await expect(page.getByTestId('practice-result')).toBeVisible();
        await bookFits(page);
        if (kind === 'encounter') {
          const currentBattle = await readJourneyDatabase(page);
          await page.getByTestId('practice-current-battle').click();
          expect(await readJourneyDatabase(page)).toEqual(currentBattle);
        } else await page.getByTestId('practice-close').click();
      }
      await expect(page.getByTestId('first-battle-hint')).toBeVisible();
      await expect(page.getByTestId('first-battle-hint')).toContainText('护体');
      const beforeGuard = await snapshot(page),
        beforeManual = await readJourneyDatabase(page);
      await decision(page, page.getByTestId('battle-manual-takeover'));
      expect(await readJourneyDatabase(page)).toEqual(beforeManual);
      await decision(page, page.getByTestId('guard'));
      await expect
        .poll(async () => (await activitySnapshot(page))?.status)
        .toBe('running');
      expect((await activitySnapshot(page)).plan).toEqual(
        singleBattlePlan(beforeGuard, 'guard'),
      );
      await settleVisibleActivity(page);
      expect((await snapshot(page)).battle?.round).toBe(1);
      const auto = await selectPlan(
        page,
        defaultBattlePlan(await snapshot(page)),
      );
      await decision(page, auto.control);
      const won = await settleVisibleActivity(page);
      expect(won.game.wins).toBe(1);
      expect(won.game.core.player.realm).toBe('qi');
      expect(won.game.core.player.xp).toBeLessThan(C.realms.qi.xpCap);
      const final = await readJourneyDatabase(page);
      await page.reload();
      await expect(page.getByTestId('save-status')).toHaveText('已保存');
      expect(await snapshot(page)).toEqual(won.game);
      expect(await readJourneyDatabase(page)).toEqual(final);
      await info.attach('first-practice-result', {
        body: JSON.stringify({
          choice,
          school,
          normalNewGame: true,
          imported: false,
          game: won.game,
          originalBudgetsAndCycles: true,
        }),
        contentType: 'application/json',
      });
    });

test('all three failed practice illustrations preserve complete text controls focus and the whole database', async ({
  page,
}, info) => {
  await page.route(
    /\/art\/v2\/(scenes\/sect|ui\/meditation-ink|enemies\/wolf)\.webp$/,
    (route) => route.abort('failed'),
  );
  const d = driver();
  d.go('cave');
  const game = await importRecoveryFixture(page, d.game),
    before = await readJourneyDatabase(page);
  await openPractice(page, true);
  for (const kind of ['commission', 'assisted', 'encounter']) {
    await page.getByTestId('practice-tab-' + kind).click();
    await expect(
      page.locator('[data-asset-id="practice-' + kind + '"]').first(),
    ).toHaveAttribute('data-art-state', 'failed');
    await bookFits(page);
    expect(await snapshot(page)).toEqual(game);
    expect(await readJourneyDatabase(page)).toEqual(before);
    await captureFixedPng(
      page,
      info.outputPath('practice-failed-' + kind + '.png'),
    );
  }
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('first-practice-book')).toBeHidden();
  expect(await readJourneyDatabase(page)).toEqual(before);
  await openPractice(page);
  await bookFits(page);
  expect(await readJourneyDatabase(page)).toEqual(before);
});

test('an actual second page changes school then starts a new life while the old practice cannot confirm either source', async ({
  page,
  context,
}) => {
  const d = driver();
  d.go('cave');
  await importRecoveryFixture(page, d.game);
  await openPractice(page, true);
  await page.getByTestId('practice-tab-assisted').click();
  const peer = await context.newPage();
  try {
    // Clock is shared by BrowserContext; the second page never installs another one.
    await peer.goto(page.url());
    await expect(peer.getByTestId('save-status')).toHaveText('已保存');
    await openEquipment(peer);
    await peer.getByTestId('equipment-mode-school').click();
    await peer.getByTestId('school-talisman').click();
    await peer.getByTestId('configuration-confirm').click();
    await expect
      .poll(async () => (await snapshot(page)).school)
      .toBe('talisman');
    const changed = await readJourneyDatabase(page);
    await expect(page.getByTestId('practice-blocked')).toContainText(
      '进度已变化',
    );
    await expect(page.getByTestId('practice-confirm')).toBeDisabled();
    await page.getByTestId('practice-tab-commission').click();
    await expect(page.getByTestId('practice-inspect')).toBeDisabled();
    expect(await readJourneyDatabase(page)).toEqual(changed);
    await page.getByTestId('practice-close').click();
    await openPractice(page);
    await page.getByTestId('practice-tab-assisted').click();
    await expect(page.getByTestId('practice-confirm')).toBeEnabled();
    const oldRun = (await snapshot(page)).core.runId;
    await peer.getByTestId('game-settings').click();
    await peer.getByTestId('restart').click();
    await answerGameConfirmation(peer, 'restart');
    await page.clock.runFor(600);
    await expect
      .poll(async () => (await snapshot(page)).core.runId)
      .not.toBe(oldRun);
    await expect
      .poll(async () => (await snapshot(page)).core.player.realm)
      .toBe('mortal');
    await expect(page.getByTestId('first-practice-book')).toBeHidden();
    const newborn = await readJourneyDatabase(page);
    await openPractice(page);
    await expect(page.getByTestId('practice-tab-commission')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await readJourneyDatabase(page)).toEqual(newborn);
  } finally {
    await peer.close();
  }
});

test('the real practice confirmation rolls back quota and the visible original retry starts and pays once', async ({
  page,
}) => {
  const d = driver();
  d.go('sect');
  const game = await importRecoveryFixture(page, d.game);
  await openPractice(page);
  const expected = practiceLesson(game, 'commission').plan,
    before = await readJourneyDatabase(page);
  await page.evaluate(() => {
    const w = window as any,
      put = IDBObjectStore.prototype.put;
    w.q19Restore = () => (IDBObjectStore.prototype.put = put);
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (
        this.transaction.db.name === 'chenyuan-playable-v1' &&
        this.name === 'full-receipts' &&
        value?.format === 'chenyuan-scheduled-receipt' &&
        value.input.kind === 'START'
      ) {
        w.q19Original = structuredClone(value.input);
        IDBObjectStore.prototype.put = put;
        throw new DOMException('practice full quota', 'QuotaExceededError');
      }
      return put.call(this, value, key!);
    };
  });
  try {
    await page.getByTestId('practice-confirm').click();
    await expect(page.getByTestId('error')).toBeVisible();
    expect(await snapshot(page)).toEqual(game);
    expect(await readJourneyDatabase(page)).toEqual(before);
    await page.evaluate(() => (window as any).q19Restore());
    await page.getByTestId('retry').click();
    await expect
      .poll(async () => (await activitySnapshot(page))?.status)
      .toBe('running');
    expect((await activitySnapshot(page)).plan).toEqual(expected);
    expect(await snapshot(page)).toEqual(game);
    const done = await settleVisibleActivity(page);
    expect(done.cycles).toBe(1);
    expect(done.game.core.player.stones).toBe(game.core.player.stones + 20);
    const raw = await readJourneyDatabase(page),
      original = await page.evaluate(() => (window as any).q19Original);
    const starts = raw.rows['full-receipts'].filter(
      (r: any) =>
        r.value.format === 'chenyuan-scheduled-receipt' &&
        r.value.input.kind === 'START',
    );
    expect(starts).toHaveLength(1);
    expect(starts[0].value.input).toEqual(original);
  } finally {
    await page.evaluate(() => (window as any).q19Restore?.());
  }
});

test('a paused original arrangement remains distinct from the newly confirmed single assisted practice', async ({
  page,
}) => {
  const d = driver();
  d.go('cave');
  const game = await importRecoveryFixture(page, d.game);
  const selected = await selectPlan(page, {
    kind: 'cultivation',
    method: 'natural',
    maxCycles: 5,
    until: 'cycles',
    stoneBudget: 0,
    stoneReserve: 0,
  });
  await decision(page, selected.control);
  await expect
    .poll(async () => (await activitySnapshot(page))?.status)
    .toBe('running');
  await page.clock.fastForward(5000);
  await page.locator('[data-testid=training-pause]:visible').click();
  await expect
    .poll(async () => (await activitySnapshot(page))?.status)
    .toBe('paused');
  const paused = await activitySnapshot(page),
    before = await readJourneyDatabase(page);
  expect(await snapshot(page)).toEqual(game);
  await openPractice(page);
  await page.getByTestId('practice-tab-assisted').click();
  await expect(page.getByTestId('practice-replacement')).toContainText(
    '自然吐纳',
  );
  await expect(page.getByTestId('practice-replacement')).toContainText(
    '不是继续原段',
  );
  await bookFits(page);
  expect(await readJourneyDatabase(page)).toEqual(before);
  const plan = practiceLesson(game, 'assisted').plan;
  await page.getByTestId('practice-confirm').click();
  await expect
    .poll(async () => {
      const a = await activitySnapshot(page);
      return a?.id !== paused.id && a?.status === 'running';
    })
    .toBe(true);
  expect((await activitySnapshot(page)).plan).toEqual(plan);
  const done = await settleVisibleActivity(page);
  expect(done.cycles).toBe(1);
  expect(done.game.core.player.stones).toBe(
    game.core.player.stones - plan.stoneBudget,
  );
  expect(done.game.core.player.xp).toBeGreaterThan(game.core.player.xp);
});
