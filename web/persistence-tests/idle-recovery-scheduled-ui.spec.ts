import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';
import {snapshot,activitySnapshot} from '../e2e/support';

test('the real game shows committed return costs and gains in the original activity surface without extra rewards on refresh',async({page},info)=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 const start=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open();
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const s=await repo.loadActivitySnapshot();
   return await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},
    {commandId:'ui-away-start',runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:null,expectedActivityRevision:null,ownerId:'departed-page'});
  }finally{repo.close();}
 });
 await page.clock.setSystemTime(new Date('2030-01-01T01:02:15Z'));await page.goto('/');
 await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(4);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const state=await snapshot(page);expect(state.core.player.stones-start.state.core.player.stones).toBe(80);
 const raw=()=>page.evaluate(async()=>{const p=await import('/src/full-persistence.ts');return p.FullSaveRepository.exportRaw();});
 const before=await raw();await page.getByTestId('activity-inspect').click();
 const card=page.getByTestId('away-summary');await expect(card).toBeVisible();await expect(card).toContainText('最近累计 4 轮');
 await expect(card.getByTestId('away-summary-change')).toContainText('灵石 +80');await expect(card.getByTestId('away-summary-costs')).toHaveText('实际消耗：48 游戏月');
 expect(await raw()).toEqual(before);
 const bounds=await card.evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.getElementById('primary-navigation')!.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,navTop:nav.top,viewport:[innerWidth,innerHeight],bodyHeight:document.documentElement.scrollHeight};});
 expect(bounds.viewport).toEqual([1440,900]);expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.top).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(1440);expect(bounds.bottom).toBeLessThanOrEqual(bounds.navTop);expect(bounds.bodyHeight).toBeLessThanOrEqual(900);
 await page.screenshot({path:info.outputPath('committed-return-summary.png')});
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(state);expect((await activitySnapshot(page)).completedCycles).toBe(4);
 await page.getByTestId('activity-inspect').click();await expect(page.getByTestId('away-summary')).toContainText('最近累计 4 轮');
});
