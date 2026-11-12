import {currentReceiptControl,openCurrentSavedPlan} from './readonly-navigation-support';
import {test,expect} from '@playwright/test';
import {newGame} from '../../src/full/engine';
import {driver} from '../../tests/full-route.mjs';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {activitySnapshot,snapshot} from './support';
import {settleVisibleActivity,selectPlan,home} from './idle-route-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});

test('player choice and real result use game language while keeping the formal cost and original saved proof',async({page},info)=>{
  const before=await importRecoveryFixture(page,newGame('山雨','copy-opening'));
  await page.getByTestId('leave').click();
  const review=page.getByTestId('milestone-review');
  await expect(review).toContainText('尚未行动');
  await expect(review.getByTestId('milestone-cost')).toContainText('不消耗物资');
  await expect(review.getByTestId('milestone-period')).toContainText('6 秒');
  await expect(review.getByTestId('milestone-cancel')).toHaveText('再想想');
  await page.screenshot({path:info.outputPath('copy-opening-review.png')});
  await page.getByTestId('milestone-confirm').click();
  await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
  expect(await snapshot(page)).toEqual(before);
  await settleVisibleActivity(page);
  const raw=await recoveryDatabase(page),a=await activitySnapshot(page);
  expect(a.stopReason.message).toContain('已保存本次明确安排');
  await expect(page.getByTestId('training-summary')).toContainText('此行已成');
  await expect(page.getByTestId('training-summary')).not.toContainText('明确安排');
  await page.screenshot({path:info.outputPath('copy-opening-result.png')});
  await openCurrentSavedPlan(page);
  await expect(page.getByTestId('milestone-review')).toContainText('查看本次打算');
  expect(await recoveryDatabase(page)).toEqual(raw);
});

test('source harvest and complete history use readable names without advancing the saved activity',async({page},info)=>{
  const d=driver();d.go('wilderness');await importRecoveryFixture(page,d.game);
  const selected=await selectPlan(page,{kind:'source',sourceId:'herbs',maxCycles:1,until:'cycles',target:null,monthBudget:1,remainingMonthsReserve:1});
  await selected.control.click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
  await settleVisibleActivity(page);const raw=await recoveryDatabase(page);
  await expect((await currentReceiptControl(page))).toHaveText('收获明细');
  await (await currentReceiptControl(page)).click();
  await page.getByTestId('activity-history-open').click();
  await expect(page.getByTestId('activity-history')).toContainText('收获记录');
  await expect(page.getByTestId('activity-history-costs')).toContainText('1 游戏月');
  await expect(page.getByTestId('activity-history-delta')).toContainText('凝气草 +2');
  expect(await recoveryDatabase(page)).toEqual(raw);
  await page.screenshot({path:info.outputPath('copy-source-history.png')});
  await home(page);
});


test('save identity stays in readonly management details rather than a life chapter',async({page},info)=>{
  const d=driver();d.go('cave');const g=await importRecoveryFixture(page,d.game),raw=await recoveryDatabase(page);
  await page.getByTestId('hub-life').click();await page.getByTestId('life-mode-seal').click();
  await expect(page.locator('.life-reading[data-page-key=identity]')).toHaveCount(0);
  await page.getByTestId('life-manage-open').click();
  const details=page.getByTestId('life-manage-dialog').locator('details').filter({has:page.getByText('存档识别信息',{exact:true})});
  const control=details.locator('summary');
  await control.click();await expect(details).toContainText(g.core.runId);
  const hit=await control.evaluate(node=>{const r=node.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{width:r.width,height:r.height,hit:!!h&&(h===node||node.contains(h)),font:parseFloat(getComputedStyle(node).fontSize)};});
  expect(hit.width).toBeGreaterThanOrEqual(44);expect(hit.height).toBeGreaterThanOrEqual(44);expect(hit.hit).toBe(true);expect(hit.font).toBeGreaterThanOrEqual(18);
  expect(await recoveryDatabase(page)).toEqual(raw);await page.screenshot({path:info.outputPath('copy-life-identity-details.png')});
});
