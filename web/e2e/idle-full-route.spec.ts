import { test, expect, type Page, type Locator } from '@playwright/test';
import { newGame, advance } from '../../src/full/engine.ts';
import type { Game } from '../../src/full/types.ts';
import type { ActivityPlan } from '../../src/full/activity.ts';
import * as C from '../../src/full/content.ts';
import { runIdleScenario } from '../../scripts/economy/idle-scenarios.mjs';
import { snapshot, activitySnapshot, useJourneyClock, finishJourneyClock, openEquipment, openHubFeature,
  revealPaged, revealStoryChoice } from './support';
import { openTrainingBudget, openSourceSettings, closeSourceSettings, openLearningSettings,
  closeLearningSettings, selectLearningSkill, openSupplySettings, closeSupplySettings, openMarketLibrary, openRelicLibrary, openLearningLibrary, selectRecoveryMethod } from './stage-support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
const options = { choice: 'leave', school: 'talisman', preparation: 'purchase', cultivation: 'natural',
  answer: 'accept', ending: 'transmit', advanced: true };

async function home(page: Page) {
  await closeSourceSettings(page); await closeLearningSettings(page); await closeSupplySettings(page);
  const readingClose = page.getByTestId('milestone-cancel');
  if (await readingClose.isVisible()) await readingClose.click();
  if (await page.getByTestId('hub-close').isVisible()) await page.getByTestId('hub-close').click();
}
async function field(page: Page, label: string, value: number) { await page.getByLabel(label, { exact: true }).fill(String(value)); }
async function decision(page: Page, control: Locator) {
  await expect(control).toBeVisible(); await expect(control).toBeEnabled();
  const geometry = await control.evaluate(node => {
    const r = node.getBoundingClientRect(), nav = document.getElementById('primary-navigation')!.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { aboveNav: r.bottom <= nav.top, visible: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      hit: !!hit && (hit === node || node.contains(hit)), oneScreen: document.documentElement.scrollHeight <= innerHeight };
  });
  expect(geometry).toEqual({ aboveNav: true, visible: true, hit: true, oneScreen: true });
  await control.click();
}
async function narrative(page: Page, id: string) {
  await home(page);
  if (!await page.getByTestId('narrative-catalogue').isVisible()) {
    await page.getByTestId('tab-0').click();
    await page.getByTestId('hub-current').getByRole('button', { name: '继续当前遭遇', exact: true }).click();
  }
  if (await page.getByTestId('story-show-choices').isVisible()) await page.getByTestId('story-show-choices').click();
  await checkArt03Read(page,async()=>{await page.getByTestId('response-choices-open').click();await expect(page.getByTestId('response-choices-dialog')).toBeVisible();await page.getByTestId('story-select-'+id).click();await expect(page.getByTestId('response-choices-dialog')).not.toBeVisible();}); await decision(page, page.getByTestId(id));
}

/** Only visible controls select a finite plan. This function never writes via a Store or repository. */
async function selectPlan(page: Page, plan: any): Promise<{ control: Locator; expectedPlan: ActivityPlan }> {
  await home(page);
  switch (plan.kind) {
    case 'travel':
      await page.getByTestId('tab-1').click(); await page.getByTestId('explore-mode-travel').click();
      await revealPaged(page, 'travel-' + plan.location, 'adventure-planner', '目的地');
      await decision(page, page.getByTestId('travel-' + plan.location));
      return { control: page.getByTestId('adventure-start'), expectedPlan: plan };
    case 'cultivation':
      await openHubFeature(page, 'cultivation-details');
      await page.getByTestId('cultivation-method-' + plan.method).click();
      await openTrainingBudget(page);
      await page.getByLabel('修行目标', { exact: true }).selectOption(plan.until === 'xp-cap' ? 'xp-cap' : String(plan.maxCycles));
      if (plan.until === 'xp-cap') await field(page, '圆满最多轮数', plan.maxCycles);
      await field(page, '累计灵石预算', plan.stoneBudget); await field(page, '灵石保留量', plan.stoneReserve);
      return { control: page.getByTestId('training-start'), expectedPlan: plan };
    case 'source':
      await page.getByTestId('tab-1').click(); await page.getByTestId('explore-mode-source').click();
      await revealPaged(page, 'source-' + plan.sourceId, 'source-planner', '来源'); await page.getByTestId('source-' + plan.sourceId).click();
      await openSourceSettings(page, true);
      await page.getByLabel('取材次数', { exact: true }).selectOption(plan.until === 'target' ? 'target' : String(plan.maxCycles));
      if (plan.until === 'target') {
        await page.getByLabel('目标资源', { exact: true }).selectOption(plan.target.kind === 'stones' ? 'stones' : plan.target.id);
        await field(page, '目标库存', plan.target.quantity); await field(page, '目标最多轮数', plan.maxCycles);
      }
      await field(page, '累计游戏月预算', plan.monthBudget); await field(page, '余寿保留量', plan.remainingMonthsReserve);
      await closeSourceSettings(page);
      return { control: page.getByTestId('source-start'), expectedPlan: plan };
    case 'buy':
      await page.getByTestId('tab-1').click(); await page.getByTestId('explore-mode-purchase').click();
      await checkArt03Read(page,async()=>{await openMarketLibrary(page);await page.getByTestId('market-mode-buy').click();
      await revealPaged(page, 'buy-' + plan.item, 'market-library-dialog', '坊市货物'); await page.getByTestId('buy-' + plan.item).click();await expect(page.getByTestId('market-library-dialog')).not.toBeVisible();});
      await openSupplySettings(page); await field(page, '交易最多件数', plan.maxCycles);
      await page.getByLabel('采购停止目标', { exact: true }).selectOption(plan.until);
      if (plan.until === 'target') await field(page, '采购目标库存', plan.targetQuantity);
      // Enter the budget last: changing the quantity can update the visible default estimate.
      await field(page, '累计采购灵石预算', plan.stoneBudget); await field(page, '采购灵石保留量', plan.stoneReserve);
      await closeSupplySettings(page);
      return { control: page.getByTestId('preparation-start'), expectedPlan: plan };
    case 'learn': {
      await openEquipment(page); await page.getByTestId('equipment-mode-skills').click(); await openLearningSettings(page);
      // Old mastered queue entries remain visible; remove them through their real paginated controls.
      const queue = page.getByTestId('learning-plan-dialog').locator('.learning-queue-row');
      for (let count = 0; await queue.count(); count++) {
        expect(count, 'all prior queue entries must remain removable').toBeLessThan(12);
        await queue.first().getByRole('button', { name: /^移除/ }).click();
      }
      await closeLearningSettings(page);
      for (const id of plan.skills) { await selectLearningSkill(page, id); await page.getByTestId('learn-' + id).click(); }
      await openLearningSettings(page); await field(page, '累计研习灵石预算', plan.stoneBudget); await field(page, '研习灵石保留量', plan.stoneReserve);
      await closeLearningSettings(page);
      return { control: page.getByTestId('preparation-start'), expectedPlan: plan };
    }
    case 'forge': {
      await openHubFeature(page, 'relics'); await checkArt03Read(page,async()=>{await openRelicLibrary(page);await revealPaged(page, 'forge-' + plan.relicId, 'relic-library-dialog', '器谱');
      await page.getByTestId('forge-' + plan.relicId).click();await expect(page.getByTestId('relic-library-dialog')).not.toBeVisible();await expect(page.getByTestId('relic-inscription-object')).toHaveAttribute('data-relic',plan.relicId);}); await page.getByTestId('production-limits').click();
      await field(page, '累计生产灵石预算', plan.stoneBudget); await field(page, '生产灵石保留量', plan.stoneReserve);
      await field(page, '累计生产游戏月预算', plan.monthBudget); await field(page, '生产余寿保留量', plan.remainingMonthsReserve);
      const itemReserves: Record<string, number> = {};
      for (const id of Object.keys(C.relics[plan.relicId].inputs)) {
        itemReserves[id] = plan.itemReserves[id] ?? 0;
        await field(page, C.items[id].name + '保留量', itemReserves[id]);
      }
      await page.getByTestId('production-apply-limits').click();
      // The real limit dialog represents an absent reserve by an explicitly entered zero.
      return { control: page.getByTestId('production-start'), expectedPlan: { ...plan, itemReserves } };
    }
    case 'rest':
      await openHubFeature(page, 'cultivation-details'); await page.getByTestId('rest').click();
      await checkArt03Read(page,async()=>selectRecoveryMethod(page,'rest')); await openSupplySettings(page);
      await field(page, '疗养余寿保留量', plan.remainingMonthsReserve); await closeSupplySettings(page);
      return { control: page.getByTestId('preparation-start'), expectedPlan: plan };
    case 'battle': {
      expect(plan.mode).toBe('auto'); await page.getByTestId('tab-0').click();
      await page.getByTestId('battle-view-strategy').click();
      await field(page, '本关最多斗法回合', plan.maxCycles); await field(page, '斗法累计灵力预算', plan.mpBudget);
      const editor = page.getByTestId('battle-stage').getByTestId('battle-strategy-editor'), game = await snapshot(page);
      const label = (move: string) => move === 'technique' ? C.skills[game.loadout.builder].name : move === 'release' ? C.skills[game.loadout.finisher].name : move === 'guard' ? '凝神护体' : '普通攻击';
      await editor.getByTestId('strategy-tab-priority').click();
      for (const [position, move] of plan.strategy.priority.entries()) {
        const rows = editor.locator('.tactic-move');
        let current = (await rows.locator('strong').allTextContents()).indexOf(label(move));
        expect(current).toBeGreaterThanOrEqual(position);
        while (current > position) { await rows.nth(current).getByRole('button', { name: '提升' + label(move) + '优先级', exact: true }).click(); current--; }
      }
      await editor.getByLabel('应对敌方重击', { exact: true }).setChecked(plan.strategy.respondHeavy);
      await editor.getByLabel('释放层数门槛', { exact: true }).selectOption(String(plan.strategy.releaseAt));
      await editor.getByTestId('strategy-tab-supplies').click();
      for (const [name, value] of [['自动回春气血阈值', plan.strategy.healBelowPercent], ['战斗回春丹总预算', plan.strategy.healingBudget],
        ['战斗回春丹保留量', plan.strategy.healingReserve], ['自动回灵灵力阈值', plan.strategy.restoreBelowPercent],
        ['战斗回灵丹总预算', plan.strategy.spiritBudget], ['战斗回灵丹保留量', plan.strategy.spiritReserve]] as const) await field(page, name, value);
      await editor.getByTestId('strategy-tab-safety').click(); await field(page, '自动斗法气血危险线', plan.strategy.retreatBelowPercent);
      await editor.getByTestId('strategy-risk-' + plan.strategy.riskMode).click();
      return { control: page.getByTestId('battle-auto-start'), expectedPlan: plan };
    }
    case 'milestone': {
      const action = plan.action;
      if (action.type === 'CHOOSE') { await page.getByTestId(action.choice).click(); return { control: page.getByTestId('milestone-confirm'), expectedPlan: plan }; }
      if (action.type === 'BREAKTHROUGH') {
        await page.getByTestId('tab-0').click(); await page.getByTestId('breakthrough').click();
        return { control: page.getByTestId('milestone-confirm'), expectedPlan: plan };
      }
      if (action.type === 'START_TRIAL') {
        await page.getByTestId('tab-0').click(); await page.getByTestId('breakthrough').click(); await page.getByTestId('trial-review-entry').click();
        return { control: page.getByTestId('trial-confirm-entry'), expectedPlan: plan };
      }
      if (action.type === 'ANSWER_TRIAL') {
        await narrative(page, 'answer-' + action.answer); return { control: page.getByTestId('milestone-confirm'), expectedPlan: plan };
      }
      if (action.type === 'END') {
        await narrative(page, 'ending-' + action.ending); return { control: page.getByTestId('ascension-confirm'), expectedPlan: plan };
      }
      throw new Error('This normal route requires an explicitly supported milestone, not a private write: ' + action.type);
    }
    default: throw new Error('This normal route requires visible controls for ' + plan.kind);
  }
}

async function configure(page: Page, action: any, index: number) {
  const before = await snapshot(page), previousActivity = await activitySnapshot(page);
  await home(page);
  if (action.type === 'SCHOOL') {
    await openEquipment(page); await page.getByTestId('equipment-mode-school').click(); await page.getByTestId('school-' + action.school).click();
  } else if (action.type === 'EQUIP') {
    await openEquipment(page); await page.getByTestId('equipment-mode-skills').click();
    await checkArt03Read(page,async()=>{await openLearningLibrary(page);await page.getByLabel('功法流派', { exact: true }).selectOption(C.skills[action.skill].school);});
    await selectLearningSkill(page, action.skill); await page.getByTestId('equip-' + action.skill).click();
  } else if (action.type === 'EQUIP_RELIC') {
    await openHubFeature(page, 'relics'); await checkArt03Read(page,async()=>{await openRelicLibrary(page);await revealPaged(page, 'forge-' + action.relic, 'relic-library-dialog', '器谱');
    await page.getByTestId('forge-' + action.relic).click();await expect(page.getByTestId('relic-library-dialog')).not.toBeVisible();await expect(page.getByTestId('relic-inscription-object')).toHaveAttribute('data-relic',action.relic);}); await page.getByTestId('equip-relic-' + action.relic).click();
  } else throw new Error('Unsupported visible configuration ' + action.type);
  await expect(page.getByTestId('configuration-dialog')).toBeVisible();
  expect(await snapshot(page)).toEqual(before); expect(await activitySnapshot(page)).toEqual(previousActivity);
  await decision(page, page.getByTestId('configuration-confirm'));
  await expect.poll(async () => (await snapshot(page)).core.revision).toBe(before.core.revision + 1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  expect(await snapshot(page)).toEqual(advance(before, { ...action, commandId: 'ui-config-expected-' + index,
    runId: before.core.runId, expectedRevision: before.core.revision }));
  await expect(page.getByTestId('action-execution')).toHaveCount(0);
}

test('a normal new life follows visible finite idle plans from the welcome through the explicitly selected ascension', async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await useJourneyClock(page); await page.goto('/');
  await page.getByRole('button', { name: /^踏入仙途/ }).click();
  // Welcome creation uses the existing short action path; all subsequent Game actions use real activities.
  await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const initial: Game = await snapshot(page);
  expect(initial).toEqual(newGame(initial.core.player.name, initial.core.runId));
  expect(await activitySnapshot(page)).toBeNull();
  const expected = runIdleScenario(options, { runId: initial.core.runId, name: initial.core.player.name });
  expect(expected.failure).toBeNull(); expect(expected.success).toBe(true);
  const summary: any[] = []; let onlineMs = 0, cycles = 0;
  for (const [index, step] of expected.steps.entries()) {
    await test.step(`${index + 1}. ${step.label}`, async () => {
      if (step.kind === 'configuration') { await configure(page, step.action, index); summary.push({ kind: step.kind, action: step.action }); return; }
      const before = await snapshot(page), oldActivity = await activitySnapshot(page);
      const selected = await selectPlan(page, step.plan);
      expect(await snapshot(page), 'viewing and editing a plan must not execute its next step').toEqual(before);
      expect(await activitySnapshot(page), 'a draft cannot change the saved activity').toEqual(oldActivity);
      await decision(page, selected.control);
      await expect.poll(async () => { const a = await activitySnapshot(page); return a?.id !== oldActivity?.id && a?.status === 'running'; }).toBe(true);
      let current = await activitySnapshot(page);
      expect(current.plan).toEqual(selected.expectedPlan); expect(await snapshot(page)).toEqual(before);
      const activityId = current.id; let completed = 0, stepMs = 0;
      while (current.status === 'running') {
        expect(completed, 'the finite arrangement cannot exceed the expected completed cycles').toBeLessThan(step.cycles);
        await expect(page.getByTestId('training-countdown')).toBeVisible();
        await expect(page.getByTestId('training-countdown')).toContainText((current.cycleMs / 1000).toFixed(1));
        const game = await snapshot(page), command = current.nextCommand, ms = current.cycleMs;
        await page.clock.fastForward(ms - 1); expect(await snapshot(page), 'no reward is saved before this real cycle deadline').toEqual(game);
        await page.clock.fastForward(1);
        await expect.poll(async () => (await activitySnapshot(page))?.completedCycles).toBe(current.completedCycles + 1);
        await expect(page.getByTestId('save-status')).toHaveText('已保存');
        expect(await snapshot(page)).toEqual(advance(game, command));
        await expect(page.getByTestId('error')).toHaveCount(0);
        current = await activitySnapshot(page); completed++; cycles++; stepMs += ms; onlineMs += ms;
        expect(current.id).toBe(activityId);
      }
      expect(current.status).toBe('stopped'); expect(completed).toBe(step.cycles); expect(stepMs).toBe(step.onlineMs);
      summary.push({ kind: step.kind, plan: selected.expectedPlan, cycles: completed, onlineMs: stepMs,
        stopReason: current.stopReason.code, realm: (await snapshot(page)).core.player.realm });
    });
  }
  const final = await snapshot(page), activity = await activitySnapshot(page);
  expect(final).toEqual(expected.game); expect(final.status).toBe('ascended'); expect(final.ending).toBe(options.ending);
  expect(final.wins).toBe(3); expect(final.choices).toEqual({}); expect(final.core.runId).toBe(initial.core.runId);
  expect(activity.plan).toEqual({ kind: 'milestone', action: { type: 'END', ending: options.ending }, maxCycles: 1 });
  expect(activity.status).toBe('stopped'); expect(activity.completedCycles).toBe(1);
  expect(onlineMs).toBe(expected.onlineMs); expect(errors).toEqual([]);
  await expect(page.getByTestId('life-panel')).toBeVisible(); await expect(page.locator('#feature-title')).toHaveText('此生收卷');
  await page.screenshot({ path: info.outputPath('normal-idle-ascension.png') });
  await page.reload(); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  expect(await snapshot(page)).toEqual(final); expect(await activitySnapshot(page)).toEqual(activity);
  await info.attach('visible-normal-idle-route', { body: JSON.stringify({ options, steps: summary, cycles, onlineMs,
    limitation: 'Visible controls and accelerated declared cycles prove this route; they do not prove real online pacing, balance or human acceptance.' }, null, 2), contentType: 'application/json' });
});

// CHECK-ART03: public surface access is readonly over every native Game store.
async function checkArt03Read(page:Page,body:()=>Promise<void>){const read=()=>page.evaluate(()=>new Promise<any>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();reject(Error('Readonly catalogue cannot create Game DB'));};q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};for(const name of db.objectStoreNames){rows[name]=[];const r=tx.objectStore(name).openCursor();r.onsuccess=()=>{if(r.result){rows[name].push({key:r.result.key,value:r.result.value});r.result.continue();}};}tx.oncomplete=()=>{db.close();accept({version:db.version,rows});};tx.onabort=()=>{db.close();reject(tx.error);};};}));const before=await read();await body();expect(await read()).toEqual(before);}
