import {test,expect,type Page} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine.ts';
import {snapshot,activitySnapshot,useJourneyClock,openEquipment} from './support';
import {decision} from './idle-route-support';
import {importRecoveryFixture,recoveryDatabase,recoveryReadonly,control600,runRecoveryPlan,runRecoveryControl,recoveryMove} from './idle-recovery-ui-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();test.beforeEach(({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
for(const phase of ['opening','event','battle']as const)test(`M04-U12 pending ${phase} refreshes its exact context and permits actual inventory and people reading before one explicitly chosen full cycle`,async({page},info)=>{
 if(phase==='opening'){
  await useJourneyClock(page);await page.goto('/');await expect(page.getByRole('button',{name:'踏入仙途'})).toBeEnabled();const empty=await recoveryDatabase(page);await page.getByRole('button',{name:'踏入仙途'}).click();await control600(page,empty);
 }else{
  const d=driver('help','sword');if(phase==='event'){d.realm();d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});}else{d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'guard'});}await importRecoveryFixture(page,d.game);
 }
 const before=await snapshot(page),raw=await recoveryDatabase(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await recoveryDatabase(page)).toEqual(raw);expect(await snapshot(page)).toEqual(before);
 await recoveryReadonly(page,async()=>{
  await page.getByTestId('tab-2').click();await expect(page.getByTestId('inventory-stage')).toBeVisible();await decision(page,page.getByTestId('inventory-library-open'));await expect(page.getByTestId('inventory-library-dialog')).toBeVisible();await decision(page,page.getByTestId('inventory-library-close'));
  await page.getByTestId('tab-3').click();await expect(page.getByTestId('fate-catalogue')).toBeVisible();await page.getByTestId('fate-mode-people').click();await expect(page.getByTestId('fate-catalogue')).toContainText('沈');
  await page.getByTestId('tab-0').click();
 });
 expect(await snapshot(page)).toEqual(before);expect(await activitySnapshot(page)).toBeNull();
 if(phase==='opening')await runRecoveryPlan(page,{kind:'milestone',action:{type:'CHOOSE',choice:'leave'},maxCycles:1});
 else if(phase==='battle'){const done=await recoveryMove(page,'guard');expect(done.game.battle.round).toBe(before.battle.round+1);}
 else{
  await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-show-choices').click();await page.getByTestId('response-choices-open').click();await page.getByTestId('story-select-decide-accept').click();await decision(page,page.getByTestId('decide-accept'));await runRecoveryControl(page,page.getByTestId('milestone-confirm'),{kind:'milestone',action:{type:'DECIDE',option:'accept'},maxCycles:1});expect((await snapshot(page)).choices.shen_return).toBe('accept');
 }
 expect((await snapshot(page)).core.revision).toBe(before.core.revision+1);await page.screenshot({path:info.outputPath('pending-'+phase+'-returned-and-resolved.png')});
});

test('M04-U13 a response cycle cannot steal a newer inventory selection or its focus when its complete Game is committed',async({page})=>{
 const d=driver('help','sword');d.realm();d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});await importRecoveryFixture(page,d.game);await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-show-choices').click();await page.getByTestId('response-choices-open').click();await page.getByTestId('story-select-decide-accept').click();await decision(page,page.getByTestId('decide-accept'));await decision(page,page.getByTestId('milestone-confirm'));
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const a=await activitySnapshot(page),before=await snapshot(page);await expect(page.locator('[data-testid="training-activity"][data-generation="'+a.generation+'"][data-running="true"]')).toBeVisible();
 await page.getByTestId('tab-2').click();const prior=await page.getByTestId('inventory-stage').getAttribute('data-item');await page.getByTestId('inventory-library-open').click();await expect(page.getByTestId('inventory-library-dialog')).toBeVisible();const chosen=prior==='herb'?'dew':'herb';await page.getByTestId('inventory-select-'+chosen).click();const selected=await page.getByTestId('inventory-stage').getAttribute('data-item');expect(selected).toBe(chosen);expect(selected).not.toBe(prior);const focus=await page.getByTestId('inventory-main-source').isVisible()?page.getByTestId('inventory-main-source'):page.getByTestId('inventory-main-uses');await expect(focus).toBeVisible();await focus.focus();await page.clock.runFor(a.cycleMs-1);expect(await snapshot(page)).toEqual(before);await page.clock.runFor(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect.poll(async()=>(await activitySnapshot(page)).completedCycles).toBe(1);await expect(page.getByTestId('inventory-stage')).toBeVisible();await expect(page.getByTestId('inventory-stage')).toHaveAttribute('data-item',selected!);await expect(focus).toBeFocused();expect(await snapshot(page)).toEqual(resolve(before,a.nextCommand).nextState);expect((await snapshot(page)).choices.shen_return).toBe('accept');
});

test('M04-U14 missing scene and portrait resources cannot block a normal opening or its explicit finite cultivation and first breakthrough',async({page})=>{
 await page.route('**/art/**',r=>r.abort());await useJourneyClock(page);await page.goto('/');await expect(page.getByRole('button',{name:'踏入仙途'})).toBeEnabled();const empty=await recoveryDatabase(page);await page.getByRole('button',{name:'踏入仙途'}).click();await control600(page,empty);
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'CHOOSE',choice:'leave'},maxCycles:1});await runRecoveryPlan(page,{kind:'travel',location:'cave',maxCycles:1});await runRecoveryPlan(page,{kind:'cultivation',method:'natural',maxCycles:50,until:'xp-cap',stoneBudget:0,stoneReserve:0});expect((await snapshot(page)).core.player.xp).toBe(10);await runRecoveryPlan(page,{kind:'milestone',action:{type:'BREAKTHROUGH'},maxCycles:1});expect((await snapshot(page)).core.player.realm).toBe('qi');expect(await page.locator('[data-art-state=failed]:visible').count()).toBeGreaterThan(0);await recoveryReadonly(page,()=>openEquipment(page));await expect(page.getByTestId('equipment-panel')).toBeVisible();
});
