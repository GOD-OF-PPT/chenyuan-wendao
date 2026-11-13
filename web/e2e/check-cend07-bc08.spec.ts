import { originalSkillIds } from '../../tests/build-fixtures.mjs';
import {
  test,
  expect,
  type Page,
  type TestInfo,
  type Locator,
} from '@playwright/test';
import { driver } from '../../tests/full-route.mjs';
import * as C from '../../src/full/content';
import { resolve, validateGame } from '../../src/full/engine';
import {
  completeActivity,
  previewActivity,
  validateActivity,
} from '../../src/full/activity';
import { canonicalFingerprint } from '../../src/full/receipts';
import { validateActivityReceipt } from '../src/activity-persistence';
import { validateConfigurationReceipt } from '../src/configuration-persistence';
import {
  snapshot,
  activitySnapshot as activity,
  openHubFeature,
} from './support';
import {
  importRecoveryFixture,
  recoveryDatabase as database,
  stored,
} from './idle-recovery-ui-support';
import { selectPlan } from './idle-route-support';
import {
  selectRelic,
  selectSource,
  openRelicPreparation,
  closeRelicPreparation,
  openLearningSettings,
  closeLearningSettings,
  openSourceSettings,
  closeSourceSettings,
} from './stage-support';
import { captureFixedPng } from './png-capture';

test.use({
  viewport: { width: 1440, height: 900 },
  actionTimeout: 8000,
  navigationTimeout: 15000,
});
test.setTimeout(90000);
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const e: string[] = [];
  errors.set(page, e);
  page.on('pageerror', (x) => e.push(x.message));
});
test.afterEach(async ({ page }) => {
  await page.evaluate(() => (window as any).__bc08RestorePut?.());
  expect(errors.get(page)).toEqual([]);
});
async function attach(info: TestInfo, name: string, value: unknown) {
  await info.attach(name, {
    body: JSON.stringify(value),
    contentType: 'application/json',
  });
}
function lawful() {
  const d = driver('leave', 'sword');
  d.realm();
  d.realm();
  for (const [item, n] of Object.entries(C.relics.jade_seal.inputs))
    d.resource(item, n);
  d.funds(C.relics.jade_seal.stones);
  d.go('cave');
  d.doAction({ type: 'FORGE', relic: 'jade_seal' });
  d.funds(1000);
  d.go('sect');
  validateGame(d.game);
  return d.game;
}
async function work(page: Page) {
  const before = await importRecoveryFixture(page, lawful());
  const plan = {
    kind: 'source',
    sourceId: 'work',
    maxCycles: 1,
    until: 'cycles',
    target: null,
    monthBudget: 1,
    remainingMonthsReserve: 1,
  };
  const view = await selectPlan(page, plan);
  await view.control.click();
  await expect.poll(async () => (await activity(page))?.status).toBe('running');
  const a = await activity(page);
  expect(a.version).toBe(2);
  expect(a.plan).toEqual(plan);
  expect(a.cycleMs).toBe(30000);
  expect(await snapshot(page)).toEqual(before);
  await expect(
    page.locator(
      '[data-testid=training-activity][data-generation="' +
        a.generation +
        '"][data-running=true]',
    ),
  ).toBeVisible();
  return { before, a, raw: await database(page) };
}
async function readonly(page: Page, task: () => Promise<void>) {
  const g = await snapshot(page),
    a = await activity(page),
    raw = await database(page);
  await task();
  expect(await snapshot(page)).toEqual(g);
  expect(await activity(page)).toEqual(a);
  expect(await database(page)).toEqual(raw);
}
async function relic(page: Page) {
  await openHubFeature(page, 'relics');
  await page.getByTestId('equipment-mode-relics').click();
  await selectRelic(page, 'jade_seal');
}
const relicRoot = (page: Page) => page.getByTestId('relic-atelier');
async function readRelic(page: Page) {
  await relic(page);
  const origin = relicRoot(page).locator('.relic-description details');
  if (!(await origin.evaluate((n) => (n as HTMLDetailsElement).open)))
    await origin.locator('summary').click();
  await expect(origin).toContainText('140 灵石');
  await expect(origin).toContainText('60 秒');
  await openRelicPreparation(page);
  await expect(page.getByTestId('relic-preparation-dialog')).toContainText(
    '地脉灵玉',
  );
  await closeRelicPreparation(page);
}
function studyPlan(game: any) {
  const skills = originalSkillIds
    .filter(
      (id) =>
        C.skills[id].school === 'sword' &&
        C.skills[id].price > 0 &&
        !game.learned.includes(id) &&
        C.rank(C.skills[id].min) <= C.rank(game.core.player.realm),
    )
    .slice(0, 2);
  expect(skills).toHaveLength(2);
  return {
    kind: 'learn',
    skills,
    maxCycles: 2,
    stoneBudget: C.skills[skills[0]].price,
    stoneReserve: 0,
  };
}
async function draft(page: Page, plan: any) {
  await selectPlan(page, plan);
  const quote = previewActivity(await snapshot(page), plan);
  expect(quote.allowed).toBe(true);
  expect(quote.cycles).toBe(1);
  expect(quote.stopReason?.code).not.toBe('CYCLES_COMPLETE');
}
async function checkDraft(page: Page, plan: any) {
  await openHubFeature(page, 'skills');
  await page.getByTestId('equipment-mode-skills').click();
  await openLearningSettings(page);
  await expect(
    page.getByLabel('累计研习灵石预算', { exact: true }),
  ).toHaveValue(String(plan.stoneBudget));
  await expect(page.getByLabel('研习灵石保留量', { exact: true })).toHaveValue(
    '0',
  );
  await expect(page.getByTestId('learning-plan-dialog')).toContainText(
    '本段清单 · 2 / 12 卷',
  );
  await closeLearningSettings(page);
  const estimate = page
    .getByTestId('learning-planner')
    .getByTestId('preparation-estimate');
  if (await estimate.isVisible()) {
    await expect(estimate.locator('small')).toBeVisible();
    await expect(estimate).toContainText('本段用石额度不足');
  }
}
async function frame(page: Page, info: TestInfo, name: string, root: Locator) {
  await captureFixedPng(page, info.outputPath(name + '.png'));
  const geometry = await root.evaluate((n) => {
    const b = n.getBoundingClientRect(),
      nav = document
        .getElementById('primary-navigation')!
        .getBoundingClientRect();
    const inside = (r: DOMRect) =>
      r.left >= b.left - 1 &&
      r.right <= b.right + 1 &&
      r.top >= b.top - 1 &&
      r.bottom <= b.bottom + 1 &&
      r.bottom <= nav.top;
    const visible = (x: HTMLElement) =>
      x.checkVisibility() && !x.closest('dialog:not([open])');
    return {
      controls: [...n.querySelectorAll<HTMLElement>('button,summary,input')]
        .filter(visible)
        .map((x) => {
          const r = x.getBoundingClientRect(),
            h = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return {
            text: x.innerText,
            width: r.width,
            height: r.height,
            inside: inside(r),
            hit: x.matches(':disabled') || h === x || (!!h && x.contains(h)),
          };
        }),
      text: [
        ...n.querySelectorAll<HTMLElement>(
          '.preparation-estimate strong,.preparation-estimate small,.learning-object p,.learning-object small,.relic-description p,.relic-description summary',
        ),
      ]
        .filter(visible)
        .map((x) => {
          const range = document.createRange();
          range.selectNodeContents(x);
          return {
            text: x.innerText,
            font: parseFloat(getComputedStyle(x).fontSize),
            min: x.matches('small') ? 14 : 18,
            inside: [...range.getClientRects()]
              .filter((r) => r.width && r.height)
              .every(inside),
          };
        }),
    };
  });
  for (const c of geometry.controls) {
    expect(c.width, c.text).toBeGreaterThanOrEqual(44);
    expect(c.height, c.text).toBeGreaterThanOrEqual(44);
    expect(c.inside, c.text).toBe(true);
    expect(c.hit, c.text).toBe(true);
  }
  for (const t of geometry.text) {
    expect(t.font, t.text).toBeGreaterThanOrEqual(t.min);
    expect(t.inside, t.text).toBe(true);
  }
  await attach(info, name + '-geometry', geometry);
}
async function sourceProof(
  page: Page,
  a: any,
  before: any,
  accepted: any,
  info: TestInfo,
  name: string,
) {
  await expect
    .poll(async () => (await activity(page))?.completedCycles)
    .toBe(a.completedCycles + 1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const raw = await database(page),
    g = await snapshot(page),
    formal = resolve(before, a.nextCommand),
    key = a.runId + ':' + a.nextCommand.commandId,
    rows = raw.rows['full-receipts'].filter((r: any) => r.key === key);
  expect(rows).toHaveLength(1);
  const receipt = rows[0].value;
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
  expect(receipt.format).toBe('chenyuan-activity-receipt');
  expect(receipt.version).toBe(1);
  expect(receipt).not.toHaveProperty('proof');
  expect(receipt.input).toEqual(input);
  expect(receipt.fingerprint).toBe(canonicalFingerprint(input));
  expect(receipt.command).toEqual(a.nextCommand);
  expect(receipt.result).toEqual(formal.result);
  expect(g).toEqual(formal.nextState);
  expect(stored(raw, 'current')).toEqual(g);
  expect(stored(raw, 'previous')).toEqual(before);
  const done = completeActivity(g, a, formal.result, {
    commandId: a.nextCommand.commandId,
    now: a.dueAt,
  });
  expect(receipt.activity).toEqual(done);
  expect(await activity(page)).toEqual(done);
  expect(stored(raw, 'activity')).toEqual(done);
  expect(() => validateActivityReceipt(receipt, g)).not.toThrow();
  expect(raw.rows['full-receipts'].filter((r: any) => r.key !== key)).toEqual(
    accepted.rows['full-receipts'],
  );
  expect(
    raw.rows['full-state'].filter(
      (r: any) => !['current', 'previous', 'activity'].includes(r.key),
    ),
  ).toEqual(
    accepted.rows['full-state'].filter(
      (r: any) => !['current', 'previous', 'activity'].includes(r.key),
    ),
  );
  for (const store of Object.keys(raw.rows).filter(
    (n) => !['full-state', 'full-receipts'].includes(n),
  ))
    expect(raw.rows[store], store).toEqual(accepted.rows[store]);
  expect(g.core.player.stones).toBe(before.core.player.stones + 20);
  expect(g.learned).toEqual(before.learned);
  expect(g.loadout).toEqual(before.loadout);
  await attach(info, name + '-full-formal-game-activity-receipt-all-stores', {
    a,
    before,
    accepted,
    formal,
    done,
    raw,
  });
  return { raw, g, done, receipt };
}
async function toLastMs(page: Page, a: any, before: any, raw: any) {
  const left = a.dueAt - (await page.evaluate(() => Date.now()));
  expect(left).toBeGreaterThan(0);
  expect(left).toBeLessThanOrEqual(a.cycleMs);
  await page.clock.fastForward(left - 1);
  expect(await snapshot(page)).toEqual(before);
  expect(await database(page)).toEqual(raw);
}
async function quota(page: Page) {
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).__bc08RestorePut = () =>
      (IDBObjectStore.prototype.put = put);
    IDBObjectStore.prototype.put = function (v: any, k?: IDBValidKey) {
      if (
        this.transaction.db.name === 'chenyuan-playable-v1' &&
        this.name === 'full-receipts' &&
        v?.input?.kind === 'TICK'
      ) {
        (window as any).__bc08Rejected = structuredClone(v);
        IDBObjectStore.prototype.put = put;
        throw new DOMException('BC08 TICK quota', 'QuotaExceededError');
      }
      return k === undefined ? put.call(this, v) : put.call(this, v, k);
    };
  });
}

test('CHECK-BC08-C1 a running commission preserves owned relic reading and a two-scroll partial-budget draft through pause resume and its sole original source period', async ({
  page,
}, info) => {
  const { before, a } = await work(page),
    plan = studyPlan(before);
  await readonly(page, () => readRelic(page));
  await frame(page, info, 'owned-relic-reading-during-source', relicRoot(page));
  await readonly(page, () => draft(page, plan));
  await expect(page.getByTestId('preparation-start')).toBeDisabled();
  expect(await activity(page)).toEqual(a);
  await frame(
    page,
    info,
    'study-draft-beside-original-commission',
    page.getByTestId('learning-planner'),
  );
  await page.getByTestId('training-pause').click();
  await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  const paused = await activity(page);
  expect(await snapshot(page)).toEqual(before);
  await readonly(page, async () => {
    await page.getByTestId('tab-1').click();
    await page.getByTestId('explore-mode-source').click();
    await selectSource(page, 'work');
    await openSourceSettings(page, true);
    await expect(page.getByLabel('取材次数', { exact: true })).toHaveValue('1');
    await expect(
      page.getByLabel('累计游戏月预算', { exact: true }),
    ).toHaveValue('1');
    await closeSourceSettings(page);
  });
  await expect(page.getByTestId('source-start')).toHaveText('新安排宗门杂务');
  await frame(
    page,
    info,
    'paused-source-original-and-next',
    page.getByTestId('source-planner'),
  );
  await page.getByTestId('training-resume').click();
  await expect.poll(async () => (await activity(page))?.status).toBe('running');
  const resumed = await activity(page);
  expect(resumed.id).toBe(paused.id);
  expect(resumed.plan).toEqual(a.plan);
  expect(resumed.completedCycles).toBe(0);
  expect(resumed.generation).toBeGreaterThan(paused.generation);
  await expect(
    page.locator(
      '[data-testid=training-activity][data-generation="' +
        resumed.generation +
        '"][data-running=true]',
    ),
  ).toBeVisible();
  await readonly(page, () => checkDraft(page, plan));
  const accepted = await database(page);
  await toLastMs(page, resumed, before, accepted);
  await page.clock.fastForward(1);
  const proof = await sourceProof(
    page,
    resumed,
    before,
    accepted,
    info,
    'source-after-cross-feature-reading',
  );
  await readonly(page, () => checkDraft(page, plan));
  expect(await database(page)).toEqual(proof.raw);
  await frame(
    page,
    info,
    'partial-study-budget-after-real-source-income',
    page.getByTestId('learning-planner'),
  );
});

test('CHECK-BC08-C2 cancelling then immediately binding an owned relic preserves the paused source CAS and finite study draft without automatically resuming either', async ({
  page,
}, info) => {
  const { before } = await work(page),
    plan = studyPlan(before);
  await readonly(page, () => draft(page, plan));
  await page.getByTestId('training-pause').click();
  await expect.poll(async () => (await activity(page))?.status).toBe('paused');
  const paused = await activity(page),
    raw = await database(page);
  await readonly(page, () => readRelic(page));
  await page.getByTestId('equip-relic-jade_seal').click();
  await expect(page.getByTestId('configuration-dialog')).toBeVisible();
  await expect(page.getByTestId('configuration-dialog')).toContainText(
    '原安排不会自动继续',
  );
  await page.getByTestId('configuration-cancel').click();
  expect(await database(page)).toEqual(raw);
  expect(await activity(page)).toEqual(paused);
  await page.getByTestId('equip-relic-jade_seal').click();
  await frame(
    page,
    info,
    'paused-source-owned-relic-comparison',
    page.getByTestId('configuration-dialog'),
  );
  await page.getByTestId('configuration-confirm').click();
  await expect
    .poll(async () => (await snapshot(page)).core.revision)
    .toBe(before.core.revision + 1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const after = await database(page),
    added = after.rows['full-receipts'].filter(
      (r: any) =>
        !raw.rows['full-receipts'].some((old: any) => old.key === r.key),
    );
  expect(added).toHaveLength(1);
  const receipt = added[0].value;
  expect(receipt.format).toBe('chenyuan-configuration-receipt');
  expect(receipt.intent.expectedActivityId).toBe(paused.id);
  expect(receipt.intent.expectedActivityRevision).toBe(paused.revision);
  expect(receipt.intent.command).toMatchObject({
    type: 'EQUIP_RELIC',
    relic: 'jade_seal',
    runId: before.core.runId,
    expectedRevision: before.core.revision,
  });
  const formal = resolve(before, receipt.intent.command);
  expect(receipt.before).toEqual(before);
  expect(receipt.after).toEqual(formal.nextState);
  expect(receipt.result).toEqual(formal.result);
  expect(receipt.fingerprint).toBe(canonicalFingerprint(receipt.intent));
  expect(() =>
    validateConfigurationReceipt(receipt, formal.nextState),
  ).not.toThrow();
  expect(formal.result.costs).toEqual({
    stones: 0,
    mp: 0,
    months: 0,
    items: {},
  });
  expect(await snapshot(page)).toEqual(formal.nextState);
  expect(stored(after, 'current')).toEqual(formal.nextState);
  expect(stored(after, 'previous')).toEqual(before);
  const stopped = {
    ...paused,
    revision: paused.revision + 1,
    generation: paused.generation + 1,
    gameRevision: formal.nextState.core.revision,
    status: 'stopped',
    nextCommand: null,
    startedAt: null,
    dueAt: null,
    stopReason: {
      code: 'STATE_CHANGED',
      message: '进度已改变，请重新安排活动；已完成的积累保留',
    },
  };
  expect(() => validateActivity(stopped, formal.nextState)).not.toThrow();
  expect(stored(after, 'activity')).toEqual(stopped);
  expect(await activity(page)).toEqual(stopped);
  expect(
    after.rows['full-state'].filter(
      (r: any) => !['current', 'previous', 'activity'].includes(r.key),
    ),
  ).toEqual(
    raw.rows['full-state'].filter(
      (r: any) => !['current', 'previous', 'activity'].includes(r.key),
    ),
  );
  expect(
    after.rows['full-receipts'].filter((r: any) => r.key !== added[0].key),
  ).toEqual(raw.rows['full-receipts']);
  for (const name of Object.keys(raw.rows).filter(
    (n) => !['full-state', 'full-receipts'].includes(n),
  ))
    expect(after.rows[name], name).toEqual(raw.rows[name]);
  await expect(page.getByTestId('action-execution')).toHaveCount(0);
  await readonly(page, () => checkDraft(page, plan));
  await frame(
    page,
    info,
    'study-still-only-a-draft-after-binding',
    page.getByTestId('learning-planner'),
  );
  await attach(
    info,
    'instant-configuration-with-paused-activity-complete-proof',
    { before, paused, raw, receipt, formal, stopped, after },
  );
  await page.reload();
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  expect(await snapshot(page)).toEqual(formal.nextState);
  expect(await activity(page)).toEqual(stopped);
  expect(await database(page)).toEqual(after);
});

test('CHECK-BC08-C3 a commission quota failure remains authoritative across relic and study reading and the same intent retries only one source reward', async ({
  page,
}, info) => {
  const { before, a } = await work(page),
    plan = studyPlan(before);
  await readonly(page, () => draft(page, plan));
  const accepted = await database(page);
  await quota(page);
  await toLastMs(page, a, before, accepted);
  await page.clock.fastForward(1);
  await expect(page.getByTestId('error')).toBeVisible();
  await expect(page.getByTestId('retry')).toBeEnabled();
  expect(await snapshot(page)).toEqual(before);
  expect(await database(page)).toEqual(accepted);
  await expect(page.getByTestId('learning-planner')).toContainText(
    '请先处理存档提示',
  );
  await expect(page.getByTestId('preparation-start')).toBeDisabled();
  await expect(page.getByTestId('preparation-plan-state')).not.toHaveText(
    '已保存安排',
  );
  await frame(
    page,
    info,
    'source-save-failure-on-study-surface',
    page.getByTestId('learning-planner'),
  );
  const rejected = await page.evaluate(() => (window as any).__bc08Rejected);
  expect(rejected.command).toEqual(a.nextCommand);
  await readonly(page, () => readRelic(page));
  await expect(page.getByTestId('retry')).toBeEnabled();
  await page.getByTestId('retry').click();
  const proof = await sourceProof(
    page,
    a,
    before,
    accepted,
    info,
    'original-commission-retry-after-reading',
  );
  expect(proof.receipt.input).toEqual(rejected.input);
  expect(proof.receipt.fingerprint).toBe(rejected.fingerprint);
  await readonly(page, () => checkDraft(page, plan));
  await frame(
    page,
    info,
    'study-budget-after-source-retry',
    page.getByTestId('learning-planner'),
  );
  await page.reload();
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  expect(await snapshot(page)).toEqual(proof.g);
  expect(await database(page)).toEqual(proof.raw);
  await page.getByTestId('tab-1').click();
  await page.getByTestId('explore-mode-source').click();
  await selectSource(page, 'work');
  await expect(page.getByTestId('source-arrival')).toHaveCount(0);
  expect(await database(page)).toEqual(proof.raw);
});
