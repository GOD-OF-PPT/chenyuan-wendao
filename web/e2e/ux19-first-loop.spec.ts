import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {advance} from '../../src/full/engine.ts';
import {activitySnapshot,snapshot,useJourneyClock,finishJourneyClock} from './support';
import {recoveryDatabase} from './idle-recovery-ui-support';
import type {CultivationPlan} from '../../src/full/activity.ts';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
async function online(page:Page){
 const a=await activitySnapshot(page);
 await expect(page.locator(`[data-testid="training-activity"][data-generation="${a.generation}"][data-running="true"]`)).toBeVisible();
 await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs/1000).toFixed(1)+' 秒');
 return a;
}
async function complete(page:Page,ms:number){
 const a=await online(page),g=await snapshot(page);expect(a.cycleMs).toBe(ms);
 await page.clock.fastForward(ms-1);expect(await snapshot(page)).toEqual(g);
 expect((await activitySnapshot(page)).nextCommand.commandId).toBe(a.nextCommand.commandId);
 await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(page)).completedCycles).toBe(a.completedCycles+1);
 expect(await snapshot(page)).toEqual(advance(g,a.nextCommand));
 await expect(page.getByTestId('save-status')).toHaveText('已保存');
}
async function frame(page:Page,info:TestInfo,name:string){
 await expect(page.locator('#primary-navigation button')).toHaveCount(8);
 const metrics=await page.locator('[data-testid="journey-hint"]:visible,[data-testid="cultivate"]:visible,[data-testid="breakthrough"]:visible').evaluateAll(nodes=>nodes.map(n=>{
  const r=n.getBoundingClientRect(),s=getComputedStyle(n),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),nav=document.getElementById('primary-navigation')!.getBoundingClientRect();
  const walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),ranges=[];let node:Node|null;
  while((node=walker.nextNode()))if(node.textContent?.trim()){const range=document.createRange();range.selectNodeContents(node);for(const text of range.getClientRects())ranges.push({left:text.left,right:text.right,top:text.top,bottom:text.bottom});}
  return{text:n.textContent,font:parseFloat(s.fontSize),button:n instanceof HTMLButtonElement,height:r.height,inside:r.x>=0&&r.right<=1440&&r.y>=0&&r.bottom<=nav.top,scroll:{width:n.scrollWidth,clientWidth:n.clientWidth,height:n.scrollHeight,clientHeight:n.clientHeight},clipped:n.scrollHeight>n.clientHeight||n.scrollWidth>n.clientWidth,textInside:ranges.length>0&&ranges.every(t=>t.left>=r.left&&t.right<=r.right&&t.top>=r.top&&t.bottom<=r.bottom),ranges,hit:hit===n||!!hit&&n.contains(hit)};
 }));
 await info.attach(name+'-geometry',{body:JSON.stringify(metrics),contentType:'application/json'});
 expect(metrics.length).toBeGreaterThan(0);for(const m of metrics){expect(m.font,m.text??'').toBeGreaterThanOrEqual(18);expect(m.inside,m.text??'').toBe(true);expect(m.textInside,m.text??'').toBe(true);if(m.button){expect(m.height).toBeGreaterThanOrEqual(44);expect(m.hit).toBe(true);}else expect(m.clipped,m.text??'').toBe(false);}
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(900);
 await page.screenshot({path:info.outputPath(name+'.png')});
}

for(const choice of ['help','trade','leave'])test(`UX19 ${choice}: a normal new life understands finite cultivation then explicitly confirms first entry`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByTestId('save-status')).toHaveText('尚无存档',{timeout:15000});await useJourneyClock(page);
 await page.getByRole('button',{name:'踏入仙途'}).click();await finishJourneyClock(page);
 const opening=await snapshot(page);await page.getByTestId(choice).click();expect(await snapshot(page)).toEqual(opening);
 await page.getByTestId('milestone-confirm').click();await complete(page,6000);
 const temple=await snapshot(page);expect(temple.core.player.realm).toBe('mortal');
 await page.getByTestId('return-cave').click();expect(await snapshot(page)).toEqual(temple);await complete(page,6000);
 await expect(page.getByTestId('cultivate')).toBeVisible();const before=await snapshot(page),db=await recoveryDatabase(page);
 await expect(page.getByTestId('journey-hint')).toHaveText('修为圆满后再筹备突破');
 await page.getByTestId('cultivation-notes-open').click();
 const hint=page.getByTestId('cultivation-notes-dialog');await expect(hint).toBeVisible();await expect(hint).toContainText('洞府');await expect(hint).toContainText('自然吐纳');await expect(hint).toContainText('无需突破丹');await expect(hint).not.toContainText('先历练');await expect(hint).not.toContainText('筹备丹药');
 await page.getByTestId('cultivation-notes-close').click();await expect(hint).not.toBeVisible();
 await expect(page.getByTestId('cultivation-notes-open')).toBeFocused();expect(await recoveryDatabase(page)).toEqual(db);
 await expect(page.getByTestId('cultivation-facts')).toContainText('每轮修为 +5 · 30 秒');
 await expect(page.getByTestId('hub-batch-summary')).toContainText('最多50轮');await expect(page.getByTestId('hub-batch-summary')).toContainText('灵石上限0');
 await page.getByTestId('cultivation-notes-open').click();await page.getByTestId('hub-cultivation-details').click();
 await expect(page.getByTestId('cultivation-catalogue')).toBeVisible();
 const forecast=page.getByTestId('training-estimate').locator('details');await expect(forecast.locator('summary')).toHaveText('本段预估 · 2 轮');
 await forecast.locator('summary').click();await expect(forecast.locator('p')).toBeVisible();await expect(forecast.locator('p')).toHaveText('修为 +10 · 灵石消耗 0 · 2 游戏月');
 await page.getByTestId('hub-close').click();await expect(page.getByTestId('cultivation-notes-open')).toBeFocused();expect(await recoveryDatabase(page)).toEqual(db);
 await frame(page,info,choice+'-first-cultivation');
 await page.getByTestId('hub-goal').click();await expect(page.getByTestId('goal-panel')).toContainText('引气入体');expect(await recoveryDatabase(page)).toEqual(db);
 await page.getByTestId('hub-close').click();expect(await recoveryDatabase(page)).toEqual(db);
 await page.getByTestId('cultivate').click();await online(page);expect(await snapshot(page)).toEqual(before);const plan=(await activitySnapshot(page)).plan;expect(plan).toEqual({kind:'cultivation',method:'natural',maxCycles:50,until:'xp-cap',stoneBudget:0,stoneReserve:0} satisfies CultivationPlan);
 await page.clock.fastForward(10000);await expect(page.getByTestId('training-countdown')).toHaveText('20.0 秒');expect(await snapshot(page)).toEqual(before);
 const first=await activitySnapshot(page);await page.clock.fastForward(19999);expect(await snapshot(page)).toEqual(before);await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(page)).completedCycles).toBe(1);expect(await snapshot(page)).toEqual(advance(before,first.nextCommand));expect((await snapshot(page)).core.player.xp).toBe(5);
 await complete(page,30000);const full=await snapshot(page),stopped=await activitySnapshot(page);expect(full.core.player.xp).toBe(10);expect(full.core.player.realm).toBe('mortal');expect(stopped.status).toBe('stopped');expect(stopped.stopReason.code).toBe('XP_CAP');
 await expect(page.getByTestId('breakthrough')).toBeVisible();await page.clock.fastForward(600000);expect(await snapshot(page)).toEqual(full);expect(await activitySnapshot(page)).toEqual(stopped);
 if(choice==='leave')await frame(page,info,'full-cultivation-awaits-player');
 const capped=await recoveryDatabase(page);await page.getByTestId('breakthrough').click();await expect(page.getByTestId('milestone-review')).toBeVisible();await expect(page.getByTestId('milestone-cost')).not.toContainText('筑基丹');expect(await recoveryDatabase(page)).toEqual(capped);
 await page.getByTestId('milestone-cancel').click();expect(await recoveryDatabase(page)).toEqual(capped);
 await page.getByTestId('breakthrough').click();await page.getByTestId('milestone-confirm').click();await complete(page,30000);
 const qi=await snapshot(page);expect(qi.core.player.realm).toBe('qi');expect(qi.core.player.xp).toBe(0);expect(qi.school).toBeNull();expect(qi.core.inventory).toEqual(full.core.inventory);await expect(page.getByTestId('choose-school')).toBeVisible();
 const end=await recoveryDatabase(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await recoveryDatabase(page)).toEqual(end);expect(errors).toEqual([]);
 await info.attach('normal-first-loop',{body:JSON.stringify({choice,before,full,qi,plan,scope:'Normal isolated new life, formal UI and native IDB; virtual clock verifies boundaries, not human or long-term pacing.'}),contentType:'application/json'});
});
