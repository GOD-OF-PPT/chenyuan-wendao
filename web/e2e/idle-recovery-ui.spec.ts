import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {snapshot,activitySnapshot} from './support';
import {decision} from './idle-route-support';
import {importRecoveryFixture,runRecoveryPlan,recoveryDatabase,recoveryReadonly,stored,control600,assertRestored} from './idle-recovery-ui-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});

test('M04-U7 an advertised ordinary checkpoint in trial preparation restores its complete earlier realm through a real confirmation',async({page},info)=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const d=driver();for(let i=0;i<4;i++)d.realm();
 await importRecoveryFixture(page,d.checkpoints.nascent);await runRecoveryPlan(page,{kind:'milestone',action:{type:'BREAKTHROUGH'},maxCycles:1});
 expect(stored(await recoveryDatabase(page),'checkpoint').kind).toBe('breakthrough');
 await runRecoveryPlan(page,{kind:'cultivation',method:'natural',maxCycles:50,until:'xp-cap',stoneBudget:0,stoneReserve:0});
 const before=await recoveryDatabase(page);expect(stored(before,'current').core.player.realm).toBe('spirit');
 await recoveryReadonly(page,async()=>{await page.getByTestId('tab-0').click();await decision(page,page.getByTestId('breakthrough'));await page.getByTestId('trial-mode-checkpoint').click();});
 await expect(page.getByTestId('trial-existing-checkpoint')).toContainText('突破');const dialogs:string[]=[];
 page.once('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss();});await decision(page,page.getByTestId('trial-restore-existing'));
 expect(dialogs).toEqual(['回到最近的完整准备检查点，当前进度将被替换，是否继续？']);expect(await recoveryDatabase(page)).toEqual(before);
 page.once('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});await decision(page,page.getByTestId('trial-restore-existing'));await control600(page,before);
 const result=await assertRestored(page,before);expect(result.game.core.player.realm).toBe('nascent');expect(await activitySnapshot(page)).toBeNull();expect(await snapshot(page)).toEqual(result.game);
 await expect(page.getByTestId('hub-current')).toBeVisible();await expect(page.getByTestId('breakthrough')).toBeEnabled();expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('ordinary-checkpoint-restored-current-stage.png')});
});
