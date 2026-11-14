import { test, expect, type Page } from '@playwright/test';
import { fullRoute, driver } from '../../tests/full-route.mjs';
import { getLifeLedger, getLocalStoryAtlas } from '../../src/full/queries';
import {
  importRecoveryFixture,
  recoveryDatabase,
  stored,
} from './idle-recovery-ui-support';
import { snapshot, revealStoryChoice } from './support';
import { answerGameConfirmation } from './game-confirmation-support';
import { captureFixedPng } from './png-capture';

test.use({ viewport: { width: 1440, height: 900 } });
async function surfaceFits(page: Page, selector: string) {
  const facts = await page.locator(selector).evaluate((root: HTMLElement) => {
    const bottom = root.closest('dialog')
      ? innerHeight
      : document.getElementById('primary-navigation')!.getBoundingClientRect()
          .top;
    const inside = (r: DOMRect, b: DOMRect) =>
      r.left >= b.left - 0.5 &&
      r.right <= b.right + 0.5 &&
      r.top >= b.top - 0.5 &&
      r.bottom <= b.bottom + 0.5;
    return {
      buttons: Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
        .filter((n) => n.checkVisibility())
        .map((n) => {
          const r = n.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return {
            text: n.innerText,
            width: r.width,
            height: r.height,
            inside:
              r.left >= 0 &&
              r.right <= innerWidth &&
              r.top >= 0 &&
              r.bottom <= bottom,
            hit: n.disabled || (!!hit && (hit === n || n.contains(hit))),
          };
        }),
      copy: Array.from(root.querySelectorAll<HTMLElement>('p,h1,h2,h3,small'))
        .filter((n) => n.checkVisibility() && !n.closest('[aria-hidden=true]'))
        .map((n) => {
          const r = n.getBoundingClientRect(),
            q = document.createRange();
          q.selectNodeContents(n);
          const clips: DOMRect[] = [];
          for (
            let p = n.parentElement;
            p && p !== document.body;
            p = p.parentElement
          )
            if (
              /hidden|clip|scroll|auto/.test(
                getComputedStyle(p).overflow +
                  getComputedStyle(p).overflowX +
                  getComputedStyle(p).overflowY,
              )
            )
              clips.push(p.getBoundingClientRect());
          return {
            text: n.innerText,
            font: parseFloat(getComputedStyle(n).fontSize),
            min: n.matches('small,.sealed-life-note') ? 14 : 18,
            inside: r.top >= 0 && r.bottom <= bottom,
            range: Array.from(q.getClientRects())
              .filter((v) => v.width && v.height)
              .every((v) => inside(v, r) && clips.every((b) => inside(v, b))),
            overflow:
              n.scrollHeight <= n.clientHeight + 1 &&
              n.scrollWidth <= n.clientWidth + 1,
          };
        }),
    };
  });
  for (const b of facts.buttons) {
    expect(b.width, b.text).toBeGreaterThanOrEqual(44);
    expect(b.height, b.text).toBeGreaterThanOrEqual(44);
    expect(b.inside, b.text).toBe(true);
    expect(b.hit, b.text).toBe(true);
  }
  for (const t of facts.copy) {
    expect(t.font, t.text).toBeGreaterThanOrEqual(t.min);
    expect(t.inside, t.text).toBe(true);
    expect(t.range, t.text).toBe(true);
    expect(t.overflow, t.text).toBe(true);
  }
}
for (const ending of ['transmit', 'depart'] as const)
  test(`the ${ending} ending preserves every exclusive paragraph and actual ledger page as a readonly book`, async ({
    page,
  }, info) => {
    const before = await importRecoveryFixture(
        page,
        fullRoute('leave', 'talisman', 'craft', false, ending).game,
      ),
      raw = await recoveryDatabase(page),
      ledger = getLifeLedger(before);
    await expect(page.getByTestId('ending-echo-excerpt')).toHaveText(
      ledger.epilogue[0],
    );
    await surfaceFits(page, '[data-testid=sealed-life-stage]');
    await captureFixedPng(page, info.outputPath('ending-' + ending + '.png'));
    await page.getByTestId('sealed-open-life').click();
    const panel = page.getByTestId('life-panel');
    await expect(panel).toBeVisible();
    for (const mode of ['ledger', 'epilogue']) {
      await page.getByTestId('life-mode-' + mode).click();
      const prev = panel.getByTestId('catalogue-prev'),
        next = panel.getByTestId('catalogue-next');
      while (await prev.isEnabled()) await prev.click();
      const texts = new Map<string, string>();
      for (let i = 0; i < 40; i++) {
        const article = panel.locator('.life-reading');
        const key = (await article.getAttribute('data-page-key'))!,
          text = (await article.locator('p').textContent())!;
        texts.set(key, (texts.get(key) ?? '') + text);
        await surfaceFits(page, '[data-testid=life-panel]');
        expect(await snapshot(page)).toEqual(before);
        expect(await recoveryDatabase(page)).toEqual(raw);
        if (await next.isDisabled()) break;
        await next.click();
        expect(i).toBeLessThan(39);
      }
      if (mode === 'epilogue') {
        for (let i = 0; i < 3; i++)
          expect(texts.get('ending-echo-' + i)).toBe(ledger.epilogue[i]);
        expect(texts.get('ending-alternative')).toBe(
          ledger.alternateEnding!.text,
        );
      } else {
        expect(texts.get('ledger-summary')).toContain(
          String(before.core.world.elapsedMonths) + '游戏月',
        );
        expect(texts.get('ledger-stock')).toContain(
          '灵石' + before.core.player.stones,
        );
      }
      await captureFixedPng(
        page,
        info.outputPath('book-' + ending + '-' + mode + '.png'),
      );
    }
  });
test('a sealed life offers its real gift before a cancellable confirmation and creates only the chosen new life', async ({
  page,
}, info) => {
  const game = fullRoute('leave', 'sword', 'craft', false, 'transmit').game,
    before = await importRecoveryFixture(page, game),
    raw = await recoveryDatabase(page);
  await expect(page.getByTestId('sealed-life-stage')).toBeVisible();
  await expect(page.getByTestId('life-legacy-gift')).toBeVisible();
  await page.getByTestId('life-legacy-gift').click();
  await expect(page.getByTestId('game-confirmation')).toContainText(
    '回春丹1枚',
  );
  expect(await snapshot(page)).toEqual(before);
  expect(await recoveryDatabase(page)).toEqual(raw);
  await answerGameConfirmation(page, 'restart', false);
  expect(await recoveryDatabase(page)).toEqual(raw);
  await page.getByTestId('life-legacy-gift').click();
  await captureFixedPng(
    page,
    info.outputPath('gift-original-confirmation.png'),
  );
  await answerGameConfirmation(page, 'restart');
  await page.clock.runFor(600);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const after = await snapshot(page),
    db = await recoveryDatabase(page);
  expect(after.core.runId).not.toBe(before.core.runId);
  expect(after.core.player.realm).toBe('mortal');
  expect(after.core.player.stones).toBe(40);
  expect(after.core.inventory.healing_pill).toBe(2);
  expect(after.incarnation.inheritance.sourceRunId).toBe(before.core.runId);
  expect(stored(db, 'previous')).toEqual(before);
  await expect(page.getByTestId('birth-inheritance')).toContainText(
    '回春丹1枚',
  );
  await page.reload();
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  expect(await snapshot(page)).toEqual(after);
  expect(await recoveryDatabase(page)).toEqual(db);
});

test('a failed gifted birth retries only its original choice', async ({
  page,
}) => {
  const source = fullRoute('leave', 'sword', 'craft', false, 'depart').game,
    before = await importRecoveryFixture(page, source),
    raw = await recoveryDatabase(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).__q17Put = () => (IDBObjectStore.prototype.put = put);
    IDBObjectStore.prototype.put = function (v: any, k?: IDBValidKey) {
      if (
        this.name === 'full-receipts' &&
        v?.format === 'chenyuan-control-receipt' &&
        v.kind === 'CREATE'
      )
        throw new DOMException('q17 birth quota', 'QuotaExceededError');
      return put.call(this, v, k!);
    };
  });
  try {
    await page.getByTestId('life-legacy-gift').click();
    await answerGameConfirmation(page, 'restart');
    await page.clock.runFor(600);
    await expect(page.getByTestId('error')).toBeVisible();
    expect(await snapshot(page)).toEqual(before);
    expect(await recoveryDatabase(page)).toEqual(raw);
    await expect(page.getByTestId('life-legacy-gift')).toBeDisabled();
  } finally {
    await page.evaluate(() => (window as any).__q17Put());
  }
  await page.getByTestId('retry').click();
  await page.clock.runFor(600);
  await expect(page.getByTestId('error')).toHaveCount(0);
  const gifted = await snapshot(page);
  expect(gifted.core.player.stones).toBe(60);
  expect(gifted.incarnation.inheritance.sourceRunId).toBe(before.core.runId);
});

test('a second real page changing the source life invalidates the open gift confirmation', async ({
  page,
  context,
}) => {
  const before = await importRecoveryFixture(
    page,
    fullRoute('leave', 'sword', 'craft', false, 'transmit').game,
  );
  await page.getByTestId('life-legacy-gift').click();
  const peer = await context.newPage();
  try {
    await peer.goto('/');
    await expect(peer.getByTestId('sealed-life-stage')).toBeVisible();
    await peer.getByTestId('life-fresh-start').click();
    await answerGameConfirmation(peer, 'restart');
    await peer.clock.runFor(600);
    await expect(peer.getByTestId('save-status')).toHaveText('已保存');
    const actual = await snapshot(peer);
    expect(actual.core.runId).not.toBe(before.core.runId);
    await expect
      .poll(async () => (await snapshot(page)).core.runId)
      .toBe(actual.core.runId);
    await expect(page.getByTestId('game-confirmation-confirm')).toBeDisabled();
    await expect(page.getByTestId('game-confirmation-blocked')).toBeVisible();
    const raw = await recoveryDatabase(page);
    await page.getByTestId('game-confirmation-cancel').click();
    expect(await snapshot(page)).toEqual(actual);
    expect(await recoveryDatabase(page)).toEqual(raw);
    expect(actual.core.inventory.healing_pill).toBe(1);
    expect(actual.incarnation.inheritance).toBeNull();
  } finally {
    await peer.close();
  }
});

test('the ordinary fresh choice starts from the base inventory without an inheritance', async ({
  page,
}) => {
  const source = fullRoute('leave', 'sword', 'craft', false, 'depart').game;
  const again = await importRecoveryFixture(page, source);
  await page.getByTestId('life-fresh-start').click();
  await answerGameConfirmation(page, 'restart');
  await page.clock.runFor(600);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const fresh = await snapshot(page);
  expect(fresh.core.runId).not.toBe(again.core.runId);
  expect(fresh.core.player.stones).toBe(40);
  expect(fresh.core.inventory.healing_pill).toBe(1);
  expect(fresh.incarnation.inheritance).toBeNull();
});

test('all eighteen seeded atlas entries preserve every option and disclose this life without executing a visit', async ({
  page,
}, info) => {
  const d = driver();
  while (d.game.core.player.realm !== 'spirit') d.realm();
  const before = await importRecoveryFixture(page, d.game),
    raw = await recoveryDatabase(page),
    expected = getLocalStoryAtlas(before);
  await page.getByTestId('tab-3').click();
  await page.getByTestId('fate-mode-atlas').click();
  const panel = page.getByTestId('fate-catalogue'),
    next = panel.getByTestId('catalogue-next'),
    texts = new Map<string, string>();
  for (let i = 0; i < 80; i++) {
    const article = page.getByTestId('local-atlas-entry'),
      key = (await article.getAttribute('data-page-key'))!,
      id = key.slice(6),
      entry = expected.find((r) => r.id === id)!;
    await expect(article.locator('small').first()).toContainText(entry.label);
    texts.set(
      id,
      (texts.get(id) ?? '') + (await article.locator('p').textContent()),
    );
    await surfaceFits(page, '[data-testid=fate-catalogue]');
    expect(await snapshot(page)).toEqual(before);
    expect(await recoveryDatabase(page)).toEqual(raw);
    if (await next.isDisabled()) break;
    await next.click();
    expect(i).toBeLessThan(79);
  }
  expect(texts.size).toBe(18);
  for (const row of expected)
    expect(texts.get(row.id)).toBe(
      `${row.locationName} · ${row.realmName}。${row.story.body}\n${row.story.options.map((o) => o.label + '：' + o.detail).join('\n')}`,
    );
  await expect(panel.locator('[data-testid^=event-]')).toHaveCount(0);
  await captureFixedPng(page, info.outputPath('local-atlas-readonly.png'));
});

test('a completed demo can only reload its original node and leaves the complete normal database unchanged', async ({
  page,
}) => {
  const normal = await importRecoveryFixture(page, driver().game),
    raw = await recoveryDatabase(page);
  await page.goto('/?demo=ending-sword');
  await expect
    .poll(async () =>
      (await page.getByTestId('action-execution').isVisible())
        ? 'control'
        : (await page.getByTestId('save-status').textContent()) === '已保存'
          ? 'read'
          : 'waiting',
    )
    .not.toBe('waiting');
  if (await page.getByTestId('action-execution').isVisible())
    await page.clock.runFor(600);
  await expect(page.getByTestId('demo-persistent-label')).toContainText(
    '演示存档',
  );
  const readDemo = () =>
    page.evaluate(async () => {
      const names = await indexedDB.databases(),
        name = names.find(
          (d) =>
            d.name?.startsWith('chenyuan-demo-game-v1-') &&
            d.name.endsWith('-ending-sword'),
        )!.name!;
      return new Promise<any>((resolve, reject) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction(['full-state'], 'readonly'),
            g = tx.objectStore('full-state').get('current'),
            a = tx.objectStore('full-state').get('activity');
          tx.oncomplete = () => {
            db.close();
            resolve({ game: g.result, activity: a.result });
          };
          tx.onabort = () => reject(tx.error);
        };
        r.onerror = () => reject(r.error);
      });
    });
  const before = await readDemo();
  await revealStoryChoice(page, 'ending-transmit');
  await page.getByTestId('ending-transmit').click();
  await page.getByTestId('ascension-confirm').click();
  await expect
    .poll(async () => (await readDemo()).activity?.status)
    .toBe('running');
  const a = (await readDemo()).activity;
  expect(a.cycleMs).toBe(12000);
  await page.clock.runFor(11999);
  expect((await readDemo()).game).toEqual(before.game);
  await page.clock.runFor(1);
  await expect
    .poll(async () => (await readDemo()).game.status)
    .toBe('ascended');
  await expect(page.getByTestId('life-legacy-gift')).toHaveCount(0);
  await expect(page.getByTestId('life-fresh-start')).toHaveCount(0);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByTestId('restart').click();
  await expect(page.getByTestId('game-confirmation')).toContainText(
    '重载演示节点',
  );
  await answerGameConfirmation(page, 'restart');
  await page.clock.runFor(600);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const reloaded = await readDemo();
  expect(reloaded.game.status).toBe('active');
  expect(reloaded.game.trial.stage).toBe(4);
  expect(reloaded.game.incarnation.inheritance).toBeNull();
  expect(await snapshot(page)).toEqual(normal);
  expect(await recoveryDatabase(page)).toEqual(raw);
});
