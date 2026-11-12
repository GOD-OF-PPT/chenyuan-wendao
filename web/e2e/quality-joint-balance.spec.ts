import {test,expect} from '@playwright/test';
import * as old from '../../src/legacy/rules-v3/index.ts';
import * as current from '../../src/full/engine.ts';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {snapshot,activitySnapshot} from './support';
import {selectMarketItem,selectSource} from './stage-support';
import {home,selectPlan} from './idle-route-support';
import {lifespanFixture,atLocation} from '../../tests/lifespan-guidance-fixtures.mjs';

test.use({viewport:{width:1440,height:900}});
test.setTimeout(60000);
function prepared(engine=current){
 let game=engine.newGame('数值核对','number-ui');
 for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'}])game=engine.advance(game,{...action,commandId:'prepare-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
 return game;
}
for(const legacy of [false,true])test(`Q07 read-only ${legacy?'old v3':'new v4'} surfaces retain their own prices periods and calendar`,async({page},info)=>{
 const game=prepared(legacy?old.engine:current);game.core.world.location='sect';const before=await importRecoveryFixture(page,game),raw=await recoveryDatabase(page);
 await expect(page.getByTestId('legacy-rules')).toHaveCount(legacy?1:0);
 await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await selectMarketItem(page,'foundation_pill');
 await expect(page.locator('.market-price')).toContainText(`每件 ${legacy?160:195} 灵石`);
 await page.screenshot({path:info.outputPath('own-profile-price.png')});
 await home(page);await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-source').click();await selectSource(page,'core');
 await expect(page.locator('.source-chosen')).toContainText(`120 秒 / ${legacy?4:48} 游戏月`);
 await expect(page.locator('.source-chosen')).toContainText('妖核 ×1');
 if(!legacy)await expect(page.locator('.source-chosen')).toContainText('灵石 +40');
 await page.screenshot({path:info.outputPath('own-profile-source.png')});
 expect(await recoveryDatabase(page)).toEqual(raw);expect(await snapshot(page)).toEqual(before);
});

test('Q08 twelve genuine final months remain readable then one explicit full-period ending reaches the real lifespan',async({page},info)=>{
 const before=await importRecoveryFixture(page,atLocation(lifespanFixture(),'cave')),raw=await recoveryDatabase(page);
 await expect(page.getByTestId('lifespan-guidance')).toBeVisible();await page.getByTestId('lifespan-inspect-life').click();
 await expect(page.getByTestId('life-manage-dialog')).toBeVisible();await expect(page.getByTestId('end-life')).toContainText('最后12游戏月');expect(await recoveryDatabase(page)).toEqual(raw);
 await page.getByTestId('end-life').click();await expect(page.getByTestId('life-confirmation')).toContainText('实际最后余月');
 await page.getByTestId('life-confirm-end').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const a=await activitySnapshot(page),accepted=await recoveryDatabase(page);expect(a.plan.action.type).toBe('END_LIFE');expect(a.cycleMs).toBe(12000);
 await page.clock.fastForward(11999);expect(await recoveryDatabase(page)).toEqual(accepted);
 await page.clock.fastForward(1);await expect.poll(async()=>(await snapshot(page)).ending).toBe('lifespan');
 const ended=await snapshot(page);expect(ended.core.world.elapsedMonths-before.core.world.elapsedMonths).toBe(12);expect(ended.core.runId).toBe(before.core.runId);
 await page.screenshot({path:info.outputPath('twelve-month-lifespan-ending.png')});const saved=await recoveryDatabase(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await recoveryDatabase(page)).toEqual(saved);
});

test('Q07 a new source charges twelve months only after its original thirty-second period and same-intent quota retry',async({page},info)=>{
 const game=prepared();game.core.world.location='sect';const before=await importRecoveryFixture(page,game);
 const selected=await selectPlan(page,{kind:'source',sourceId:'work',maxCycles:1,until:'cycles',target:null,monthBudget:12,remainingMonthsReserve:1});await selected.control.click();
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const a=await activitySnapshot(page),accepted=await recoveryDatabase(page);expect(a.cycleMs).toBe(30000);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.input?.kind==='TICK'){IDBObjectStore.prototype.put=put;throw new DOMException('number quota','QuotaExceededError');}return key===undefined?put.call(this,value):put.call(this,value,key);};});
 await page.clock.fastForward(29999);expect(await recoveryDatabase(page)).toEqual(accepted);await page.clock.fastForward(1);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await recoveryDatabase(page)).toEqual(accepted);
 await page.getByTestId('retry').click();await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(1);
 const after=await snapshot(page);expect(after.core.world.elapsedMonths-before.core.world.elapsedMonths).toBe(12);expect(after.core.player.stones-before.core.player.stones).toBe(20);expect(after.core.revision-before.core.revision).toBe(1);
 const saved=await recoveryDatabase(page),ticks=saved.rows['full-receipts'].filter((r:any)=>r.value.input?.kind==='TICK');expect(ticks).toHaveLength(1);expect(ticks[0].value.command).toEqual(a.nextCommand);
 await page.screenshot({path:info.outputPath('new-source-original-retry.png')});await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await recoveryDatabase(page)).toEqual(saved);
});
