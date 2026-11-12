import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {activitySnapshot,snapshot} from './support';
import {openSourceSettings,closeSourceSettings} from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test('new source defaults continue beyond five cycles and pause refresh retains the same finite resource budget',async({page},info)=>{
  const d=driver();d.go('wilderness');await importRecoveryFixture(page,d.game);
  await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-source').click();
  await expect(page.getByTestId('source-plan-summary')).toContainText('持续');
  await expect(page.getByTestId('source-estimate')).toContainText('前50轮预估');
  await openSourceSettings(page,true);await expect(page.getByLabel('取材次数',{exact:true})).toHaveValue('continuous');
  await page.getByLabel('累计游戏月预算',{exact:true}).fill('8');await closeSourceSettings(page);
  await page.getByTestId('source-start').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
  const initial=await activitySnapshot(page);expect(initial.plan.repeat).toBe(true);expect(initial.plan.monthBudget).toBe(8);
  let g=await snapshot(page);
  for(let i=1;i<=6;i++){
    const a=await activitySnapshot(page),formal=resolve(g,a.nextCommand);
    await expect(page.getByTestId('training-countdown')).toContainText('30.0');await page.clock.fastForward(a.cycleMs);
    await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(i);g=await snapshot(page);expect(g).toEqual(formal.nextState);
  }
  await expect(page.getByTestId('training-activity')).toHaveAttribute('data-status','running');
  await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('paused');
  const raw=await recoveryDatabase(page),paused=await activitySnapshot(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');
  expect(await recoveryDatabase(page)).toEqual(raw);expect(await activitySnapshot(page)).toEqual(paused);
  await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activitySnapshot(page))?.generation).toBe(paused.generation+1);
  for(let i=7;i<=8;i++){const a=await activitySnapshot(page);await expect(page.getByTestId('training-countdown')).toContainText('30.0');await page.clock.fastForward(a.cycleMs);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(i);}
  const done=await activitySnapshot(page);expect(done.status).toBe('stopped');expect(done.stopReason.code).toBe('ACTIVITY_BUDGET');expect(done.spentMonths).toBe(8);expect(done.plan).toEqual(initial.plan);
  await page.screenshot({path:info.outputPath('continuing-source-budget-stop.png')});
});
