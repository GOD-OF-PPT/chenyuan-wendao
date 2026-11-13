import {confirmedDelivery} from './support';
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

for(const action of [{type:'BREAKTHROUGH'},{type:'END',ending:'depart'}])test(`scheduled production ${action.type} lost delivery stays visibly retryable and replays its saved outcome without another reward`,async({page},info)=>{
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));await setupPersistence(page);
 await page.evaluate(async action=>{
  const h=(globalThis as any).h,game=action.type==='END'?h.routes.fullRoute().checkpoints.ending:(()=>{const d=h.routes.driver();d.realm();return d.checkpoints.qi;})();
  const repo=await h.FullSaveRepository.open();try{await repo.importText(JSON.stringify(game),h.mutation());}finally{repo.close();}
  const {mountFaultApp}=await import('/persistence-tests/fault-app.ts');(globalThis as any).fault=mountFaultApp({execution:'scheduled'});
 },action);
 await expect.poll(()=>page.evaluate(()=>(globalThis as any).fault.store.ready)).toBe(true);
 // The independent fault entry must consume the actual shared palette too.
 const palette=await page.locator('.app-shell').evaluate(node=>{const s=getComputedStyle(node);return{night:s.getPropertyValue('--palette-night').trim(),ink:s.getPropertyValue('--palette-ink').trim(),color:s.color};});
 expect(palette.night).toBe('#10282f');expect(palette.ink).toBe('#f0ebdc');expect(palette.color).toBe('rgb(240, 235, 220)');
 const before=await page.evaluate(async action=>{
  const h=(globalThis as any).h,f=(globalThis as any).fault,s=f.store,intent=s.prepareMilestone(action);await s.startPreparedMilestone(intent);
  const repo=await h.FullSaveRepository.open();try{
   const snapshot=await repo.loadActivitySnapshot(),formal=h.engine.resolve(snapshot.state,snapshot.activity.nextCommand);f.loseNextDelivery('advanceScheduledActivity');
   return{snapshot,formal,raw:await h.inspect(h.FULL_DB_NAME),execution:f.execution};
  }finally{repo.close();}
 },action);
 expect(before.execution).toBe('scheduled');expect(before.snapshot.schedule).toBeDefined();
 await page.clock.runFor(before.snapshot.activity.cycleMs-1);expect(await page.evaluate(()=>(globalThis as any).h.inspect((globalThis as any).h.FULL_DB_NAME))).toEqual(before.raw);
 await page.clock.runFor(1);await expect(page.getByTestId('save-status')).toHaveText('保存待确认');await expect(page.getByTestId('error')).toBeVisible();await expect(page.getByTestId('retry')).toBeVisible();
 const failed=await page.evaluate(async()=>{const h=(globalThis as any).h,f=(globalThis as any).fault;return{lost:f.lost,state:f.store.game,retry:f.store.canRetryFor(f.lost.intent.commandId),raw:await h.inspect(h.FULL_DB_NAME)};});
 expect(failed.state).toEqual(before.formal.nextState);expect(failed.lost.outcome.result).toEqual(before.formal.result);expect(failed.retry).toBe(true);
 await page.screenshot({path:info.outputPath(action.type.toLowerCase()+'-saved-reply-lost.png')});
 await page.getByTestId('retry').click();await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect(page.getByTestId('error')).toHaveCount(0);
 const recovered=await page.evaluate(async()=>{
  const h=(globalThis as any).h,f=(globalThis as any).fault,repo=await h.FullSaveRepository.open();
  try{return{state:f.store.game,activity:f.store.activity,result:f.store.lastResult,replayed:f.store.lastReplayed,raw:await h.inspect(h.FULL_DB_NAME),history:await repo.loadActivityHistory(f.store.activity.id,0,20)};}finally{repo.close();}
 });
 expect(recovered.state).toEqual(before.formal.nextState);expect(recovered.raw).toEqual(confirmedDelivery(failed.raw,failed.lost.intent));expect(recovered.result).toBeNull();expect(recovered.replayed).toBe(true);expect(recovered.history.total).toBe(1);expect(recovered.history.rows[0].result).toEqual(before.formal.result);
 expect(recovered.activity.completedCycles).toBe(1);await expect(page.getByTestId('action-effect')).toHaveCount(0);
 if(action.type==='END'){expect(recovered.state.status).toBe('ascended');expect(recovered.state.ending).toBe('depart');}else expect(recovered.state.core.player.realm).toBe('foundation');
 await page.evaluate(()=>(globalThis as any).fault.dispose());
});
