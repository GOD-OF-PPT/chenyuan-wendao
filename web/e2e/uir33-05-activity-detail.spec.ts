import { originalSkillIds } from '../../tests/build-fixtures.mjs';
import { activityView } from '../src/activity-view';
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { driver } from '../../tests/full-route.mjs';
import * as C from '../../src/full/content';
import { resolve } from '../../src/full/engine';
import { completeActivity, pauseActivity } from '../../src/full/activity';
import { defaultBattlePlan } from '../../src/full/adventure';
import { canonicalFingerprint } from '../../src/full/receipts';
import { validateActivityReceipt } from '../src/activity-persistence';
import {
  snapshot,
  activitySnapshot as activity,
  openHubFeature,
} from './support';
import { openLearningLibrary, closeLearningLibrary } from './stage-support';
import {
  importRecoveryFixture,
  recoveryDatabase as database,
  recoveryReadonly as readonly,
  stored,
} from './idle-recovery-ui-support';
import { selectPlan, decision, home } from './idle-route-support';
import { captureFixedPng } from './png-capture';

test.use({
  viewport: { width: 1440, height: 900 },
  actionTimeout: 8000,
  navigationTimeout: 15000,
});
test.setTimeout(60000);
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', (e) => list.push(e.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
async function inspect(page: Page) {
  await page.getByTestId('activity-inspect').click();
  await expect(page.getByTestId('activity-details')).toBeVisible();
}
async function frame(page: Page, info: TestInfo, name: string, short = false) {
  const g = await page.getByTestId('activity-details').evaluate((root) => {
    const rect = (n: Element) => {
      const r = n.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        bottom: r.bottom,
        right: r.right,
      };
    };
    const pane = root.closest('.hub-feature')!,
      nav = document.getElementById('primary-navigation')!;
    const controls = [...pane.querySelectorAll<HTMLButtonElement>('button')]
      .filter((n) => n.checkVisibility())
      .map((n) => {
        const r = rect(n),
          hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
        return {
          ...r,
          text: n.innerText,
          hit: n.disabled || hit === n || (!!hit && n.contains(hit)),
          clipped:
            n.scrollHeight > n.clientHeight + 1 ||
            n.scrollWidth > n.clientWidth + 1,
        };
      });
    const copy = [
      ...root.querySelectorAll<HTMLElement>(
        '.training-totals>span,.training-resume-note,.training-goal,.training-notice,[data-testid=training-stop],.reading-text p',
      ),
    ].map((n) => ({
      ...rect(n),
      text: n.innerText,
      font: parseFloat(getComputedStyle(n).fontSize),
      visible: n.checkVisibility(),
    }));
    return {
      pane: rect(pane),
      body: rect(root),
      nav: rect(nav),
      controls,
      copy,
      scroll: document.documentElement.scrollHeight,
      innerScroll: root.scrollHeight > root.clientHeight + 1,
    };
  });
  await info.attach(name + '-geometry', {
    body: JSON.stringify(g),
    contentType: 'application/json',
  });
  await captureFixedPng(page, info.outputPath(name + '.png'));
  expect(g.scroll).toBeLessThanOrEqual(900);
  expect(g.innerScroll).toBe(false);
  expect(g.pane.bottom).toBeLessThanOrEqual(g.nav.y);
  if (short)
    expect(
      g.pane.height,
      'short activity content must not retain a nearly full-height report panel',
    ).toBeLessThanOrEqual(520);
  if (await page.getByTestId('activity-plan-review').isVisible())
    expect(
      g.pane.height,
      'paged strategy should remain a concise reading record',
    ).toBeLessThanOrEqual(460);
  for (const c of g.controls) {
    expect(c.width, c.text).toBeGreaterThanOrEqual(44);
    expect(c.height, c.text).toBeGreaterThanOrEqual(44);
    expect(c.hit, c.text).toBe(true);
    expect(c.clipped, c.text).toBe(false);
    expect(c.y, c.text).toBeGreaterThanOrEqual(g.pane.y);
    expect(c.bottom, c.text).toBeLessThanOrEqual(g.nav.y);
  }
  for (const c of g.copy) {
    expect(c.visible, c.text).toBe(true);
    expect(c.font, c.text).toBeGreaterThanOrEqual(14);
    expect(c.y, c.text).toBeGreaterThanOrEqual(g.body.y);
    expect(c.bottom, c.text).toBeLessThanOrEqual(g.body.bottom + 1);
  }
}
async function begin(page: Page, plan: any) {
  const before = await database(page),
    selection = await selectPlan(page, plan);
  expect(await database(page)).toEqual(before);
  await decision(page, selection.control);
  await expect.poll(async () => (await activity(page))?.status).toBe('running');
  const a = await activity(page);
  expect(a.plan).toEqual(selection.expectedPlan);
  await home(page);
  return a;
}
async function saved(page: Page, a: any, before: any, accepted: any) {
  await expect
    .poll(async () => (await activity(page))?.completedCycles)
    .toBe(a.completedCycles + 1);
  const raw = await database(page),
    formal = resolve(before, a.nextCommand),
    key = a.runId + ':' + a.nextCommand.commandId,
    rows = raw.rows['full-receipts'].filter((r: any) => r.key === key);
  expect(rows).toHaveLength(1);
  const r = rows[0].value;
  const input = {
    kind: 'TICK',
    tick: {
      commandId: a.nextCommand.commandId,
      runId: a.runId,
      expectedRevision: a.gameRevision,
      activityId: a.id,
      expectedActivityRevision: a.revision,
      ownerId: a.ownerId,
      generation: a.generation,
    },
  };
  expect(r.input).toEqual(input);
  expect(r.fingerprint).toBe(canonicalFingerprint(input));
  expect(r.command).toEqual(a.nextCommand);
  expect(r.result).toEqual(formal.result);
  expect(r.version).toBe(a.version >= 5 ? 2 : 1);
  const now =
    r.proof?.resolvedAt ??
    (r.activity.status === 'running' ? r.activity.startedAt : a.dueAt);
  expect(now).toBeGreaterThanOrEqual(a.dueAt);
  expect(r.activity).toEqual(
    completeActivity(formal.nextState, a, formal.result, {
      commandId: a.nextCommand.commandId,
      now,
    }),
  );
  expect(() => validateActivityReceipt(r, formal.nextState)).not.toThrow();
  expect(await snapshot(page)).toEqual(formal.nextState);
  expect(stored(raw, 'current')).toEqual(formal.nextState);
  expect(stored(raw, 'previous')).toEqual(before);
  expect(stored(raw, 'activity')).toEqual(r.activity);
  expect(raw.rows['full-receipts'].filter((r: any) => r.key !== key)).toEqual(
    accepted.rows['full-receipts'],
  );
  expect(
    raw.rows['full-state'].filter(
      (r: any) =>
        ![
          'current',
          'previous',
          'activity',
          'checkpoint',
          'checkpoint-owner',
        ].includes(r.key),
    ),
  ).toEqual(
    accepted.rows['full-state'].filter(
      (r: any) =>
        ![
          'current',
          'previous',
          'activity',
          'checkpoint',
          'checkpoint-owner',
        ].includes(r.key),
    ),
  );
  for (const n of Object.keys(raw.rows).filter(
    (n) => !['full-state', 'full-receipts'].includes(n),
  ))
    expect(raw.rows[n], n).toEqual(accepted.rows[n]);
  if (a.plan.kind !== 'milestone')
    for (const n of ['checkpoint', 'checkpoint-owner'])
      expect(stored(raw, n)).toEqual(stored(accepted, n));
  else {
    expect(stored(raw, 'checkpoint').snapshot).toEqual(before);
    expect(stored(raw, 'checkpoint').kind).toBe('breakthrough');
  }
  return { game: formal.nextState, raw };
}
async function tick(page: Page, a: any, before: any) {
  const raw = await database(page),
    left = a.dueAt - (await page.evaluate(() => Date.now()));
  expect(left).toBeGreaterThan(0);
  await page.clock.fastForward(left - 1);
  expect(await database(page)).toEqual(raw);
  await page.clock.fastForward(1);
  return saved(page, a, before, raw);
}

test('UIR33-05-A1 compact live and paused details retain one clock original limits and complete saved receipts', async ({
  page,
}, info) => {
  const d = driver();
  d.go('cave');
  const before = await importRecoveryFixture(page, d.game),
    a = await begin(page, {
      kind: 'cultivation',
      method: 'natural',
      until: 'cycles',
      maxCycles: 5,
      stoneBudget: 0,
      stoneReserve: 9,
    });
  await readonly(page, () => inspect(page));
  await expect(page.getByTestId('training-countdown')).toHaveCount(1);
  await frame(page, info, 'live-cultivation', true);
  await page.clock.fastForward(5000);
  await expect(page.getByTestId('training-countdown')).toHaveText('55.0 秒');
  expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('training-pause').click();
  await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  await frame(page, info, 'paused-cultivation', true);
  const paused = await activity(page);
  await readonly(page, async () => {
    await page.getByTestId('hub-close').click();
    await expect(page.getByTestId('activity-inspect')).toBeFocused();
    await inspect(page);
  });
  await page.getByTestId('training-resume').click();
  await expect
    .poll(async () => (await activity(page))?.generation)
    .toBeGreaterThan(paused.generation);
  const resumed = await activity(page);
  expect(resumed.plan).toEqual(a.plan);
  expect(resumed.id).toBe(a.id);
  const done = await tick(page, resumed, before);
  await page.getByTestId('training-pause').click();
  await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  await frame(page, info, 'saved-cultivation', true);
  await readonly(page, async () => {
    await page.getByTestId('hub-receipt').click();
    await page.getByTestId('activity-history-open').click();
    await expect(page.getByTestId('activity-history-row')).toBeVisible();
    await page.getByTestId('hub-close').click();
  });
  expect(await snapshot(page)).toEqual(done.game);
  const raw = await database(page);
  await page.reload();
  await page.clock.fastForward(86400000);
  await expect(page.getByTestId('activity-inspect')).toBeVisible();
  expect(await database(page)).toEqual(raw);
  await readonly(page, () => inspect(page));
  await frame(page, info, 'refreshed-paused-detail', true);
});

test('UIR33-05-A2 native quota keeps visible original retry and a singular complete cycle in the compact detail', async ({
  page,
}, info) => {
  const d = driver();
  d.go('cave');
  const before = await importRecoveryFixture(page, d.game),
    a = await begin(page, {
      kind: 'cultivation',
      method: 'natural',
      until: 'cycles',
      maxCycles: 1,
      stoneBudget: 0,
      stoneReserve: 0,
    });
  await inspect(page);
  const raw = await database(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === 'full-receipts' && value?.input?.kind === 'TICK') {
        IDBObjectStore.prototype.put = put;
        throw new DOMException('UIR33-05 native quota', 'QuotaExceededError');
      }
      return key === undefined
        ? put.call(this, value)
        : put.call(this, value, key);
    };
  });
  await page.clock.fastForward(a.cycleMs);
  await expect(page.getByTestId('error')).toContainText('存储空间不足');
  expect(await database(page)).toEqual(raw);
  await frame(page, info, 'quota-detail', true);
  await page.getByTestId('training-retry').click();
  const done = await saved(page, a, before, raw);
  await frame(page, info, 'retry-saved-stopped-detail', true);
  await page.clock.fastForward(86400000);
  expect(await database(page)).toEqual(done.raw);
});

for (const kind of ['source', 'craft', 'forge', 'learn', 'milestone'] as const)
  test(
    'UIR33-05-' +
      kind +
      ' full original costs outcomes and finite stopping remain readable in the content-sized detail',
    async ({ page }, info) => {
      const d = driver();
      let plan: any;
      if (kind === 'source') {
        const [id, s] = Object.entries(C.sources).find(
          ([, s]) => s.items.herb,
        )!;
        d.go(s.location);
        plan = {
          kind,
          sourceId: id,
          maxCycles: 1,
          until: 'cycles',
          target: null,
          monthBudget: s.months,
          remainingMonthsReserve: 0,
        };
      } else if (kind === 'milestone') {
        d.realm();
        plan = { kind, action: { type: 'BREAKTHROUGH' }, maxCycles: 1 };
      } else {
        for (let n = 0; n < 4; n++) d.realm();
        d.funds(5000);
        if (kind === 'learn') {
          d.go('sect');
          plan = {
            kind,
            skills: originalSkillIds.filter(
              (id) => !d.game.learned.includes(id),
            ),
            maxCycles: originalSkillIds.filter(
              (id) => !d.game.learned.includes(id),
            ).length,
            stoneBudget: 5000,
            stoneReserve: 0,
          };
        } else {
          const item =
            kind === 'craft' ? C.recipes.ascension : C.relics.jade_seal;
          for (const [id, n] of Object.entries(item.inputs)) d.resource(id, n);
          d.go('cave');
          plan = {
            kind,
            ...(kind === 'craft'
              ? { recipeId: 'ascension', until: 'cycles', targetQuantity: null }
              : { relicId: 'jade_seal' }),
            maxCycles: 1,
            stoneBudget: 5000,
            stoneReserve: 7,
            monthBudget: 20,
            remainingMonthsReserve: 1,
            itemReserves: {},
          };
        }
      }
      const before = await importRecoveryFixture(
        page,
        kind === 'milestone' ? d.checkpoints.qi : d.game,
      );
      if (kind === 'learn') {
        await openHubFeature(page, 'skills');
        await openLearningLibrary(page);
        await page.getByLabel('功法流派', { exact: true }).selectOption('all');
        await closeLearningLibrary(page);
        await home(page);
      }
      await begin(page, plan);
      await readonly(page, () => inspect(page));
      await frame(page, info, kind + '-running', false);
      let prior = before;
      const cycles = kind === 'learn' ? plan.maxCycles : 1;
      for (let n = 0; n < cycles; n++) {
        const a = await activity(page);
        const done = await tick(page, a, prior);
        prior = done.game;
      }
      await expect
        .poll(async () => (await activity(page))?.status)
        .toBe('stopped');
      if (!(await page.getByTestId('activity-details').isVisible()))
        await readonly(page, () => inspect(page));
      await frame(page, info, kind + '-saved', false);
      await expect(page.getByTestId('training-totals')).toContainText(
        '已完成 ' +
          cycles +
          ' ' +
          activityView((await activity(page))!, await snapshot(page)).unit +
          ' · 上限 ' +
          cycles,
      );
      await expect(page.getByTestId('training-stop')).not.toHaveText('');
      const raw = await database(page);
      await page.clock.fastForward(86400000);
      expect(await database(page)).toEqual(raw);
    },
  );

test('UIR33-05-battle complete original battle strategy is paged with stable controls after the saved victory', async ({
  page,
}, info) => {
  const d = driver();
  d.go('wilderness');
  d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
  while (d.game.battle && d.game.battle.hp > 16)
    d.doAction({ type: 'BATTLE', move: 'attack' });
  const before = await importRecoveryFixture(page, d.game),
    plan = defaultBattlePlan(before);
  plan.maxCycles = 9;
  plan.mpBudget = 77;
  plan.strategy.healBelowPercent = 0;
  const a = await begin(page, plan);
  await readonly(page, () => inspect(page));
  await frame(page, info, 'battle-running', false);
  const done = await tick(page, a, before);
  await expect.poll(async () => (await activity(page))?.status).toBe('stopped');
  await frame(page, info, 'battle-saved', false);
  await readonly(page, async () => {
    await page.getByTestId('activity-original-plan').click();
    const read = page.getByTestId('activity-plan-review');
    let text = '';
    let height: number | undefined;
    for (let n = 0; n < 12; n++) {
      text += await read.innerText();
      await frame(page, info, 'original-strategy-' + n, false);
      const next = read.getByRole('button', { name: '下一页', exact: true });
      const y = (await next.boundingBox())!.y;
      if (height !== undefined)
        expect(Math.abs(y - height)).toBeLessThanOrEqual(1);
      height = y;
      if (await next.isDisabled()) break;
      await next.click();
    }
    for (const word of [
      '9',
      '77',
      '招式顺序',
      '重击',
      '回春',
      '危险',
      '不重新开战',
    ])
      expect(text).toContain(word);
  });
  expect(await snapshot(page)).toEqual(done.game);
});

test('UIR33-05-saving native commit and pending pause keep the record readable before any saved outcome', async ({
  page,
}, info) => {
  const d = driver();
  d.go('cave');
  const before = await importRecoveryFixture(page, d.game),
    a = await begin(page, {
      kind: 'cultivation',
      method: 'natural',
      until: 'cycles',
      maxCycles: 5,
      stoneBudget: 0,
      stoneReserve: 0,
    });
  await inspect(page);
  const accepted = await database(page);
  await page.evaluate(
    () =>
      new Promise<void>((ok, no) => {
        const q = indexedDB.open('chenyuan-playable-v1');
        q.onerror = () => no(q.error);
        q.onsuccess = () => {
          const db = q.result,
            tx = db.transaction('full-state', 'readwrite');
          let hold = true,
            ready = false;
          (window as any).__uir05Release = () => (hold = false);
          function read() {
            const r = tx.objectStore('full-state').get('current');
            r.onsuccess = () => {
              (window as any).__uir05HeldGame = r.result;
              if (!ready) {
                ready = true;
                ok();
              }
              if (hold) read();
            };
          }
          read();
          tx.oncomplete = () => db.close();
          tx.onabort = () => {
            db.close();
            no(tx.error);
          };
        };
      }),
  );
  try {
    await page.clock.fastForward(a.cycleMs);
    await expect(page.getByTestId('save-status')).toHaveText('保存中');
    await expect(page.getByTestId('training-countdown')).toHaveText('保存中');
    expect(await page.evaluate(() => (window as any).__uir05HeldGame)).toEqual(
      before,
    );
    await frame(page, info, 'native-saving', true);
    await page.getByTestId('training-pause').click();
    await expect(page.getByTestId('training-activity')).toContainText(
      '正在暂停',
    );
    await frame(page, info, 'native-pause-pending', true);
  } finally {
    await page.evaluate(() => (window as any).__uir05Release());
  }
  await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  const raw = await database(page),
    formal = resolve(before, a.nextCommand),
    extra = raw.rows['full-receipts'].filter(
      (r: any) =>
        !accepted.rows['full-receipts'].some((old: any) => old.key === r.key),
    );
  expect(extra).toHaveLength(2);
  const tick = extra.find((r: any) => r.value.input?.kind === 'TICK').value,
    pause = extra.find((r: any) => r.value.input?.kind === 'PAUSE').value;
  expect(tick.result).toEqual(formal.result);
  expect(tick.command).toEqual(a.nextCommand);
  expect(() => validateActivityReceipt(tick, formal.nextState)).not.toThrow();
  expect(() => validateActivityReceipt(pause, formal.nextState)).not.toThrow();
  expect(await snapshot(page)).toEqual(formal.nextState);
  expect(await activity(page)).toEqual(pauseActivity(tick.activity));
  expect(stored(raw, 'current')).toEqual(formal.nextState);
  expect(stored(raw, 'activity')).toEqual(pause.activity);
  expect(
    raw.rows['full-receipts'].filter(
      (r: any) => !extra.some((x: any) => x.key === r.key),
    ),
  ).toEqual(accepted.rows['full-receipts']);
  for (const n of Object.keys(raw.rows).filter(
    (n) => !['full-state', 'full-receipts'].includes(n),
  ))
    expect(raw.rows[n]).toEqual(accepted.rows[n]);
  await page.clock.fastForward(86400000);
  expect(await database(page)).toEqual(raw);
  await frame(page, info, 'native-saved-paused', true);
});

test('UIR33-05-takeover both detail pages keep original authority and only the newly owned full cycle saves', async ({
  page,
  context,
}, info) => {
  const d = driver();
  d.go('cave');
  const before = await importRecoveryFixture(page, d.game),
    a = await begin(page, {
      kind: 'cultivation',
      method: 'natural',
      until: 'cycles',
      maxCycles: 5,
      stoneBudget: 0,
      stoneReserve: 0,
    });
  await inspect(page);
  const other = await context.newPage();
  other.on('pageerror', (e) => errors.get(page)!.push(e.message));
  await other.goto('/');
  await expect(other.getByTestId('training-resume')).toBeVisible();
  await readonly(other, () => inspect(other));
  await frame(other, info, 'unowned-saved-detail', true);
  await other.getByTestId('training-resume').click();
  await expect
    .poll(async () => (await activity(other))?.ownerId)
    .not.toBe(a.ownerId);
  await expect(page.getByTestId('training-resume')).toBeVisible();
  await frame(page, info, 'previous-owner-detail', true);
  const owned = await activity(other);
  expect(owned.plan).toEqual(a.plan);
  expect(owned.id).toBe(a.id);
  const done = await tick(other, owned, before);
  const old = done.raw.rows['full-receipts'].filter(
    (r: any) => r.key === a.runId + ':' + a.nextCommand.commandId,
  );
  expect(old).toHaveLength(0);
  await other.getByTestId('training-pause').click();
  await expect.poll(async () => (await activity(other))?.status).toBe('paused');
  expect(await snapshot(page)).toEqual(done.game);
  await other.close();
});
