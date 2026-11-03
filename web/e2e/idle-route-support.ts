import {selectSource as inspectSourceLibrary} from './stage-support';
import { test, expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import { newGame, advance } from '../../src/full/engine.ts';
import type { Game } from '../../src/full/types.ts';
import type { ActivityPlan } from '../../src/full/activity.ts';
import * as C from '../../src/full/content.ts';
import { runIdleScenario } from '../../scripts/economy/idle-scenarios.mjs';
import { snapshot, activitySnapshot, useJourneyClock, finishJourneyClock, openEquipment, openHubFeature,
  revealPaged, revealStoryChoice } from './support';
import { openTrainingBudget, openSourceSettings, closeSourceSettings, openLearningSettings,
  closeLearningSettings, selectLearningSkill, openSupplySettings, closeSupplySettings, openMarketLibrary, openRelicLibrary, openLearningLibrary, selectRecoveryMethod, selectAlchemyRecipe, openProductionIntent, closeProductionSettings } from './stage-support';

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 8000, navigationTimeout: 15000 });
export async function home(page: Page) {
  await closeSourceSettings(page); await closeLearningSettings(page); await closeSupplySettings(page);
  const readingClose = page.getByTestId('milestone-cancel');
  if (await readingClose.isVisible()) await readingClose.click();
  if (await page.getByTestId('hub-close').isVisible()) await page.getByTestId('hub-close').click();
}
async function field(page: Page, label: string, value: number) { await page.getByLabel(label, { exact: true }).fill(String(value)); }
export async function decision(page: Page, control: Locator) {
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
    await page.getByTestId('hub-current').getByRole('button', { name: /^(继续当前遭遇|查看问心选择|查看收卷选择)$/, exact: true }).click();
  }
  if (await page.getByTestId('story-show-choices').isVisible()) await page.getByTestId('story-show-choices').click();
  await checkArt03Read(page,async()=>{await page.getByTestId('response-choices-open').click();await expect(page.getByTestId('response-choices-dialog')).toBeVisible();await page.getByTestId('story-select-'+id).click();await expect(page.getByTestId('response-choices-dialog')).not.toBeVisible();}); await decision(page, page.getByTestId(id));
}

/** Only visible controls select a finite plan. This function never writes via a Store or repository. */
export async function selectPlan(page: Page, plan: any): Promise<{ control: Locator; expectedPlan: ActivityPlan }> {
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
      await revealPaged(page, 'source-' + plan.sourceId, 'source-planner', '来源'); await inspectSourceLibrary(page,plan.sourceId);
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
    case 'craft': {
      await openHubFeature(page, 'forge');
      await checkArt03Read(page,async()=>selectAlchemyRecipe(page,plan.recipeId));
      await openProductionIntent(page);
      await page.getByLabel('炼丹炉次',{exact:true}).selectOption(plan.until==='target'?'target':String(plan.maxCycles));
      if(plan.until==='target'){
        await field(page,'成品目标库存',plan.targetQuantity);await field(page,'目标最多炉次',plan.maxCycles);
      }
      await page.getByTestId('production-limits').click();
      await field(page,'累计生产灵石预算',plan.stoneBudget);await field(page,'生产灵石保留量',plan.stoneReserve);
      await field(page,'累计生产游戏月预算',plan.monthBudget);await field(page,'生产余寿保留量',plan.remainingMonthsReserve);
      const itemReserves:Record<string,number>={};
      for(const id of Object.keys(C.recipes[plan.recipeId].inputs)){
        itemReserves[id]=plan.itemReserves[id]??0;await field(page,C.items[id].name+'保留量',itemReserves[id]);
      }
      await page.getByTestId('production-apply-limits').click();await closeProductionSettings(page);
      return{control:page.getByTestId('production-start'),expectedPlan:{...plan,itemReserves}};
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

export async function configure(page: Page, action: any, index: number) {
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

/** Read the same two complete persisted records in one coherent readonly snapshot. */
export async function readJourneyState(page:Page):Promise<{game:any;activity:any}>{
 return page.evaluate(()=>new Promise<{game:any;activity:any}>((accept,reject)=>{
  const request=indexedDB.open('chenyuan-playable-v1');
  request.onupgradeneeded=()=>{request.transaction!.abort();reject(Error('Journey read cannot create Game DB'));};
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('full-state')){db.close();reject(Error('Journey read requires full-state'));return;}
   const tx=db.transaction('full-state','readonly'),store=tx.objectStore('full-state'),game=store.get('current'),activity=store.get('activity');
   tx.oncomplete=()=>{db.close();accept({game:game.result,activity:activity.result??null});};
   tx.onabort=()=>{db.close();reject(tx.error??Error('Journey readonly transaction aborted'));};
  };
 }));
}

export async function runVisibleIdleRoute(page:Page,info:TestInfo,options:any,scenario=runIdleScenario,settings:{terminalRealm?:string;reopenStages?:boolean}={}) {
  test.setTimeout(240_000);
  const savedStatePolling = { intervals: [10, 20, 50, 100] };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await useJourneyClock(page); await page.goto('/');
  await page.getByRole('button', { name: /^踏入仙途/ }).click();
  // Welcome creation uses the existing short action path; all subsequent Game actions use real activities.
  await finishJourneyClock(page); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const initialRead=await readJourneyState(page),initial:Game=initialRead.game,initialActivity=initialRead.activity;
  expect(initial).toEqual(newGame(initial.core.player.name, initial.core.runId));
  expect(initialActivity).toBeNull();
  const expected = scenario(options, { runId: initial.core.runId, name: initial.core.player.name });
  expect(expected.failure).toBeNull(); expect(expected.success).toBe(true);
  const summary: any[] = []; let onlineMs = 0, cycles = 0; const reopened=new Set<number>();
  for (const [index, step] of expected.steps.entries()) {
    await test.step(`${index + 1}. ${step.label}`, async () => {
      if (step.kind === 'configuration') { await configure(page, step.action, index); summary.push({ kind: step.kind, action: step.action }); return; }
      const {game:before,activity:oldActivity} = await readJourneyState(page);
      const selected = await selectPlan(page, step.plan);
      const viewed=await readJourneyState(page);
      expect(viewed.game, 'viewing and editing a plan must not execute its next step').toEqual(before);
      expect(viewed.activity, 'a draft cannot change the saved activity').toEqual(oldActivity);
      await decision(page, selected.control);
      await expect.poll(async () => { const a = await activitySnapshot(page); return a?.id !== oldActivity?.id && a?.status === 'running'; }, savedStatePolling).toBe(true);
      const accepted=await readJourneyState(page);let current=accepted.activity;
      expect(current.plan).toEqual(selected.expectedPlan); expect(accepted.game).toEqual(before);
      const activityId = current.id; let completed = 0, stepMs = 0;
      while (current.status === 'running') {
        expect(completed, 'the finite arrangement cannot exceed the expected completed cycles').toBeLessThan(step.cycles);
        await expect(page.getByTestId('training-countdown')).toBeVisible();
        await expect(page.getByTestId('training-countdown')).toContainText((current.cycleMs / 1000).toFixed(1));
        const game = await snapshot(page), command = current.nextCommand, ms = current.cycleMs;
        await page.clock.fastForward(ms - 1); expect(await snapshot(page), 'no reward is saved before this real cycle deadline').toEqual(game);
        await page.clock.fastForward(1);
        await expect.poll(async () => (await activitySnapshot(page))?.completedCycles, savedStatePolling).toBe(current.completedCycles + 1);
        await expect(page.getByTestId('save-status')).toHaveText('已保存');
        const committed=await readJourneyState(page);
        expect(committed.game).toEqual(advance(game, command));
        await expect(page.getByTestId('error')).toHaveCount(0);
        current = committed.activity; completed++; cycles++; stepMs += ms; onlineMs += ms;
        if(settings.reopenStages&&current.plan.kind==='battle'&&current.status==='running'&&!reopened.has(current.plan.trialStage)){
          const stage=current.plan.trialStage;reopened.add(stage);const saved=await snapshot(page),persisted=current;
          await checkArt03Read(page,async()=>{await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');});
          const reloaded=await readJourneyState(page);expect(reloaded.game).toEqual(saved);expect(reloaded.activity).toEqual(persisted);
          await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activitySnapshot(page)).generation, savedStatePolling).toBe(persisted.generation+1);
          current=await activitySnapshot(page);expect(current.id).toBe(activityId);expect(current.completedCycles).toBe(persisted.completedCycles);expect(current.plan).toEqual(persisted.plan);
        }
        expect(current.id).toBe(activityId);
      }
      expect(current.status).toBe('stopped'); expect(completed).toBe(step.cycles); expect(stepMs).toBe(step.onlineMs);
      if(settings.reopenStages&&(current.plan.kind==='battle'||current.plan.kind==='milestone'&&current.plan.action.type==='START_TRIAL')){
        const saved=await snapshot(page),persisted=current;
        await checkArt03Read(page,async()=>{await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');});
        const reloaded=await readJourneyState(page);expect(reloaded.game).toEqual(saved);expect(reloaded.activity).toEqual(persisted);
      }
      summary.push({ kind: step.kind, plan: selected.expectedPlan, cycles: completed, onlineMs: stepMs,
        stopReason: current.stopReason.code, realm: (await snapshot(page)).core.player.realm });
    });
  }
  const {game:final,activity} = await readJourneyState(page);
  if(settings.terminalRealm){
    expect(final).toEqual(expected.game);expect(final.core.player.realm).toBe(settings.terminalRealm);expect(final.status).toBe('active');
    expect(final.core.runId).toBe(initial.core.runId);expect(onlineMs).toBe(expected.onlineMs);expect(errors).toEqual([]);
    await info.attach('visible-normal-idle-prefix',{body:JSON.stringify({options,steps:summary,cycles,onlineMs,realm:final.core.player.realm}),contentType:'application/json'});return final;
  }
  expect(final).toEqual(expected.game); expect(final.status).toBe('ascended'); expect(final.ending).toBe(options.ending);
  expect(final.wins).toBe(3); expect(final.choices).toEqual({}); expect(final.core.runId).toBe(initial.core.runId);
  expect(activity.plan).toEqual({ kind: 'milestone', action: { type: 'END', ending: options.ending }, maxCycles: 1 });
  expect(activity.status).toBe('stopped'); expect(activity.completedCycles).toBe(1);
  expect(onlineMs).toBe(expected.onlineMs); expect(errors).toEqual([]);
  await expect(page.getByTestId('life-panel')).toBeVisible(); await expect(page.locator('#feature-title')).toHaveText('修仙生平');
  await page.screenshot({ path: info.outputPath('normal-idle-ascension.png') });
  await page.reload(); await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const reloaded=await readJourneyState(page);expect(reloaded.game).toEqual(final); expect(reloaded.activity).toEqual(activity);
  await info.attach('visible-normal-idle-route', { body: JSON.stringify({ options, steps: summary, cycles, onlineMs,
    limitation: 'Visible controls and accelerated declared cycles prove this route; they do not prove real online pacing, balance or human acceptance.' }, null, 2), contentType: 'application/json' });
}

/** Read all keys and full values from every native store in one readonly transaction. */
export async function readJourneyDatabase(page:Page,transport:'auto'|'structured'='auto'){const observed=await page.evaluate(transport=>new Promise<any>((accept,reject)=>{
 const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();reject(Error('Readonly catalogue cannot create Game DB'));};q.onerror=()=>reject(q.error);
 q.onsuccess=()=>{const db=q.result;try{
  const names=[...db.objectStoreNames],tx=db.transaction(names,'readonly');
  const reads=names.map(name=>{const store=tx.objectStore(name);return{name,keys:store.getAllKeys(),values:store.getAll()};});
  tx.oncomplete=()=>{db.close();try{
   const rows=Object.fromEntries(reads.map(({name,keys,values})=>{if(keys.result.length!==values.result.length)throw Error('Incomplete readonly catalogue');return[name,keys.result.map((key,index)=>({key,value:values.result[index]}))];}));
   const value={version:db.version,rows},stack:any[]=[value],seen=new WeakSet<object>();let json=transport==='auto';
   while(json&&stack.length){const item=stack.pop();if(item===null||typeof item==='string'||typeof item==='boolean')continue;if(typeof item==='number'){json=Number.isFinite(item)&&!Object.is(item,-0);continue;}if(typeof item!=='object'||seen.has(item)){json=false;break;}seen.add(item);if(typeof item.toJSON==='function'){json=false;break;}const keys=Object.keys(item);if(keys.includes('__proto__')){json=false;break;}if(Array.isArray(item)){if(keys.length!==item.length||Reflect.ownKeys(item).length!==keys.length+1||keys.some((key,index)=>key!==String(index))){json=false;break;}}else if(Object.getPrototypeOf(item)!==Object.prototype||Reflect.ownKeys(item).length!==keys.length){json=false;break;}for(const key of keys)stack.push(item[key]);}
   if(json){let text:string|undefined;try{text=JSON.stringify(value);}catch{json=false;}if(json){accept({transport:'json',text});return;}}accept({transport:'structured',value});
  }catch(error){reject(error);}};
  tx.onabort=()=>{db.close();reject(tx.error??Error('Readonly catalogue transaction aborted'));};
 }catch(error){db.close();reject(error);}};
}),transport);return observed.transport==='json'?JSON.parse(observed.text):observed.value;}

// CHECK-ART03: public surface access is readonly over every native Game store.
async function checkArt03Read(page:Page,body:()=>Promise<void>){const before=await readJourneyDatabase(page);await body();expect(await readJourneyDatabase(page)).toEqual(before);}

/** Execute only an already explicitly accepted public activity; this never writes via a Store or repository. */
export async function settleVisibleActivity(page:Page){
 await expect.poll(async()=>{const a=await activitySnapshot(page);return a?.status==='running';}).toBe(true);
 let a=await activitySnapshot(page);const id=a.id,origin=a.completedCycles;let count=0;
 while(a.status==='running'){
  expect(count).toBeLessThanOrEqual(50);
  await expect(page.getByTestId('training-countdown')).toContainText((a.cycleMs/1000).toFixed(1));
  const before=await snapshot(page),command=a.nextCommand,completed=a.completedCycles;
  await page.clock.fastForward(a.cycleMs-1);expect(await snapshot(page)).toEqual(before);
  await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(page)).completedCycles).toBe(completed+1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(advance(before,command));
  await expect(page.getByTestId('error')).toHaveCount(0);a=await activitySnapshot(page);expect(a.id).toBe(id);count++;
 }
 expect(a.status).toBe('stopped');expect(a.completedCycles-origin).toBe(count);return{game:await snapshot(page),activity:a,cycles:count};
}
