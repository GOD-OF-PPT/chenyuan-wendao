import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {snapshot,activitySnapshot} from './support';
import {selectInventoryItem} from './stage-support';
import {paidResponseFixture} from '../../tests/response-context-fixtures.mjs';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});

test('NPC options are side by side and one confirmed response writes its real cost without a six-second timer',async({page},info)=>{
  const before=await importRecoveryFixture(page,paidResponseFixture());
  await page.getByTestId('tab-3').click();await page.getByTestId('fate-resume-dialogue').click();
  await expect(page.getByTestId('decide-bargain')).toBeVisible();
  const raw=await recoveryDatabase(page);await page.getByTestId('decide-bargain').click();
  await expect(page.getByTestId('game-confirmation')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(raw);
  await page.screenshot({path:info.outputPath('direct-npc-one-confirmation.png')});
  await page.getByTestId('game-confirmation-confirm').click();
  await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  const after=await snapshot(page);expect(after).toEqual(resolve(before,{type:'DECIDE',option:'bargain',commandId:'proof',runId:before.core.runId,expectedRevision:before.core.revision}).nextState);
  expect(await activitySnapshot(page)).toBeNull();await expect(page.getByTestId('training-countdown')).toHaveCount(0);
});

test('a chosen medicine can be used once directly from the inventory without another planner or delay',async({page},info)=>{
  const d=driver();d.buy('healing_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'flee'});d.go('cave');
  const before=await importRecoveryFixture(page,d.game);await page.getByTestId('tab-2').click();await selectInventoryItem(page,'healing_pill');
  await page.screenshot({path:info.outputPath('direct-inventory-use.png')});
  await page.getByTestId('quick-use-healing_pill').click();await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  expect(await snapshot(page)).toEqual(resolve(before,{type:'USE',item:'healing_pill',commandId:'proof',runId:before.core.runId,expectedRevision:before.core.revision}).nextState);
  await expect(page.getByTestId('recovery-planner')).toHaveCount(0);await expect(page.getByTestId('game-confirmation')).toHaveCount(0);expect(await activitySnapshot(page)).toBeNull();
});
