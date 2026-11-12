import {test,expect,type Page} from '@playwright/test';
import {newGame,resolve} from '../../src/full/engine';
import {previewAction} from '../../src/full/queries';
import {driver} from '../../tests/full-route.mjs';
import * as C from '../../src/full/content';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {snapshot,activitySnapshot} from './support';
import {selectPlan,home} from './idle-route-support';
import {openInventoryLibrary} from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});

async function clocks(page:Page){return page.locator('[data-testid$="-clock"],[data-testid$="-countdown"]').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility==='visible'&&!n.querySelector('[data-testid$="-clock"],[data-testid$="-countdown"]')).map(n=>({id:(n as HTMLElement).dataset.testid,text:n.textContent})));}

test('Q06-1 eight main entries disclose real realm gates while the future relic directory remains readonly',async({page},info)=>{
 const g=await importRecoveryFixture(page,newGame('初入仙途','navigation-gates')),raw=await recoveryDatabase(page);
 await expect(page.locator('#primary-navigation>button')).toHaveCount(8);
 for(const [id,reason]of [['hub-forge','炼气'],['hub-skills','炼气'],['hub-relics','金丹']]){await expect(page.getByTestId(id)).toBeDisabled();await expect(page.getByTestId(id)).toContainText(reason);}
 await page.getByTestId('tab-2').click();await page.getByTestId('feature-menu-open').click();await page.getByTestId('feature-blueprints').click();
 await expect(page.getByTestId('relic-library-open')).toBeVisible();await page.getByTestId('relic-library-open').click();await expect(page.getByTestId('relic-library-dialog')).toBeVisible();
 expect(await snapshot(page)).toEqual(g);expect(await recoveryDatabase(page)).toEqual(raw);await page.screenshot({path:info.outputPath('Q06-mortal-future-directory.png')});
});

test('Q06-2 the page tools menu keeps one return and restores its stable keyboard source after readonly goal and guide reading',async({page},info)=>{
 const d=driver();d.go('cave');const g=await importRecoveryFixture(page,d.game),raw=await recoveryDatabase(page);await page.getByTestId('tab-2').click();
 await expect(page.getByTestId('feature-prepare')).not.toBeVisible();await expect(page.getByTestId('hub-close')).toBeVisible();
 const opener=page.getByTestId('feature-menu-open');await opener.focus();await page.keyboard.press('Enter');await expect(page.getByTestId('feature-menu-dialog')).toBeVisible();
 const menu=page.getByTestId('feature-menu-dialog'),controls=await menu.locator('button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),d=n.closest('dialog')!.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.textContent,w:r.width,h:r.height,font:parseFloat(getComputedStyle(n).fontSize),inside:r.left>=d.left&&r.right<=d.right&&r.top>=d.top&&r.bottom<=d.bottom,hit:!!hit&&(hit===n||n.contains(hit))};}));for(const r of controls){expect(r.w,r.text??'').toBeGreaterThanOrEqual(44);expect(r.h,r.text??'').toBeGreaterThanOrEqual(44);expect(r.font,r.text??'').toBeGreaterThanOrEqual(18);expect(r.inside,r.text??'').toBe(true);expect(r.hit,r.text??'').toBe(true);}await page.screenshot({path:info.outputPath('Q06-open-world-tools.png')});
 await page.getByTestId('feature-goal').click();await expect(page.getByTestId('goal-panel')).toBeVisible();await expect(page.getByTestId('feature-menu-dialog')).not.toBeVisible();await page.getByTestId('hub-close').click();await expect(page.getByTestId('inventory-stage')).toBeVisible();await expect(opener).toBeFocused();
 await opener.click();await page.getByTestId('guide-open').click();await expect(page.getByTestId('catalogue-guide')).toBeVisible();await page.keyboard.press('Escape');await expect(opener).toBeFocused();
 expect(await snapshot(page)).toEqual(g);expect(await recoveryDatabase(page)).toEqual(raw);await page.screenshot({path:info.outputPath('Q06-stable-tools-return.png')});
});

test('Q06-3 one live clock and pause survive details reading pause refresh resume and the original full due command',async({page},info)=>{
 const d=driver();d.go('cave');const g=await importRecoveryFixture(page,d.game),plan={kind:'cultivation',method:'natural',maxCycles:2,until:'xp-cap',stoneBudget:0,stoneReserve:0}as const;
 const selected=await selectPlan(page,plan);await selected.control.click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const accepted=await activitySnapshot(page),raw=await recoveryDatabase(page);expect(await clocks(page)).toHaveLength(1);await expect(page.locator('[data-testid=training-pause]:visible,[data-testid=cultivation-active-pause]:visible')).toHaveCount(1);await page.screenshot({path:info.outputPath('Q06-single-activity-stage.png')});
 await page.getByTestId('activity-inspect').click();await expect(page.getByTestId('activity-details')).toBeVisible();expect(await clocks(page)).toHaveLength(1);expect(await recoveryDatabase(page)).toEqual(raw);await page.getByTestId('hub-close').click();
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('paused');const paused=await activitySnapshot(page);expect(paused.plan).toEqual(plan);expect(await snapshot(page)).toEqual(g);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activitySnapshot(page))?.generation).toBe(paused.generation+1);const resumed=await activitySnapshot(page),beforeDue=await recoveryDatabase(page);expect(resumed.id).toBe(accepted.id);expect(resumed.plan).toEqual(plan);expect(await clocks(page)).toHaveLength(1);
 await page.clock.fastForward(resumed.cycleMs-1);expect(await recoveryDatabase(page)).toEqual(beforeDue);await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(1);expect(await snapshot(page)).toEqual(resolve(g,resumed.nextCommand).nextState);
 const next=await activitySnapshot(page);await page.clock.fastForward(next.cycleMs);await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('stopped');const ended=await recoveryDatabase(page);await expect(page.getByTestId('activity-summary-open')).toBeVisible();await expect(page.getByTestId('activity-summary-open')).toContainText('+'+(await activitySnapshot(page)).gainedXp);await page.screenshot({path:info.outputPath('Q06-stopped-activity-marker.png')});expect(await clocks(page)).toHaveLength(0);await page.getByTestId('activity-summary-open').click();await expect(page.getByTestId('activity-details')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(ended);await page.screenshot({path:info.outputPath('Q06-complete-original-plan-details.png')});
});

test('Q06-4 a single-page life has no disabled paging while its full original facts remain readable',async({page})=>{
 const g=await importRecoveryFixture(page,newGame('行道初记','one-folio')),raw=await recoveryDatabase(page);await page.getByTestId('hub-life').click();await expect(page.getByTestId('life-panel')).toBeVisible();
 await page.getByTestId('tab-2').click();await openInventoryLibrary(page);const library=page.getByTestId('inventory-library-dialog');await library.getByRole('button',{name:'丹药',exact:true}).click();
 const singles=await page.locator('.catalogue-pager:visible').evaluateAll(nodes=>nodes.filter(n=>/1\s*\/\s*1\s*页/.test(n.textContent??'')).map(n=>n.textContent));expect(singles).toEqual([]);
 await library.getByLabel('显示后续物资配方',{exact:true}).check();await library.getByRole('button',{name:'全部',exact:true}).click();const found=new Set<string>();
 for(let i=0;i<20;i++){for(const id of await library.locator('[data-testid^=inventory-select-]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.testid!.replace('inventory-select-',''))))found.add(id);const next=library.getByTestId('catalogue-next');if(await next.isDisabled())break;await next.click();}
 expect([...found].sort()).toEqual(Object.keys(C.items).sort());expect(await snapshot(page)).toEqual(g);expect(await recoveryDatabase(page)).toEqual(raw);
});

test('Q06-5 current skills and later sword manuals use their actual realm conditions without a duplicate relic category',async({page})=>{
 const d=driver();d.go('cave');const g=await importRecoveryFixture(page,d.game),raw=await recoveryDatabase(page);await page.getByTestId('hub-skills').click();await expect(page.getByTestId('equipment-mode-manual')).toBeDisabled();await expect(page.getByTestId('equipment-mode-manual')).toContainText('筑基');await expect(page.getByTestId('equipment-mode-relics')).toHaveCount(0);expect(await recoveryDatabase(page)).toEqual(raw);expect(await snapshot(page)).toEqual(g);
});

test('Q06-6 an actual foundation life opens the sword manual without changing its committed facts',async({page})=>{
 const d=driver();d.realm();const g=await importRecoveryFixture(page,d.game),raw=await recoveryDatabase(page);await page.getByTestId('hub-skills').click();await expect(page.getByTestId('equipment-mode-manual')).toBeEnabled();await page.getByTestId('equipment-mode-manual').click();await expect(page.getByTestId('sword-manual')).toBeVisible();expect(await snapshot(page)).toEqual(g);expect(await recoveryDatabase(page)).toEqual(raw);
});

for(const stage of ['mortal','qi'])test(`Q06-7 the genuinely learned trade-opening manual remains readable at ${stage} without another study`,async({page})=>{
 const initial=newGame('已悟旧卷','owned-manual'),fixture=stage==='mortal'?resolve(initial,{type:'CHOOSE',choice:'trade',commandId:'lawful-trade',runId:initial.core.runId,expectedRevision:0}).nextState:driver('trade','sword').game;
 const g=await importRecoveryFixture(page,fixture),raw=await recoveryDatabase(page);expect(g.core.learnedSkills).toContain(C.swordManual.id);await expect(page.getByTestId('hub-skills')).toBeEnabled();await page.getByTestId('hub-skills').click();await expect(page.getByTestId('equipment-mode-manual')).toBeEnabled();await page.getByTestId('equipment-mode-manual').click();await expect(page.getByTestId('sword-manual')).toBeVisible();await expect(page.getByTestId('jade-study-status')).toContainText('剑简已悟');expect(previewAction(g,{type:'STUDY',manual:'jinghong'}).allowed).toBe(false);expect(await snapshot(page)).toEqual(g);expect(await recoveryDatabase(page)).toEqual(raw);
});

test('Q06-8 reading the original encounter strategy retains exactly one live clock and pause',async({page})=>{
 const d=driver();d.go('wilderness');const g=await importRecoveryFixture(page,d.game);await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-battle').click();await page.getByTestId('encounter-wolf').click();await page.getByTestId('adventure-page-limits').click();await page.getByLabel('持续历练直到目标或手动停下',{exact:true}).uncheck();await page.getByLabel('历练游戏月预算',{exact:true}).fill('1');await page.getByLabel('历练累计灵力预算',{exact:true}).fill('480');await page.getByTestId('adventure-page-object').click();await page.getByTestId('adventure-start').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const a=await activitySnapshot(page),raw=await recoveryDatabase(page);
 await page.getByTestId('activity-inspect').click();await page.getByTestId('activity-original-plan').click();await expect(page.getByTestId('activity-plan-review')).toBeVisible();expect(await clocks(page)).toHaveLength(1);await expect(page.getByTestId('training-pause')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(raw);expect(await snapshot(page)).toEqual(g);await page.clock.fastForward(a.cycleMs-1);expect(await recoveryDatabase(page)).toEqual(raw);await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(1);expect(await snapshot(page)).toEqual(resolve(g,a.nextCommand).nextState);expect(await clocks(page)).toHaveLength(1);await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('paused');
});
