import {test,expect} from '@playwright/test';
import * as C from '../../src/full/content.ts';
import {createIdleRoute} from '../../scripts/economy/idle-scenarios.mjs';
import {stats,resolve} from '../../src/full/engine.ts';
import {defaultBattlePlan} from '../../src/full/adventure.ts';
import {snapshot,activitySnapshot} from '../e2e/support';
import {runVisibleIdleRoute,decision,selectPlan,settleVisibleActivity} from '../e2e/idle-route-support';
import {runRecoveryPlan,recoveryDatabase,recoveryReadonly} from '../e2e/idle-recovery-ui-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
function prepare(o:any,identity:any){
 const r=createIdleRoute(o,identity);r.begin();while(C.rank(r.game.core.player.realm)<C.rank('spirit')){r.project(o.preparation);r.project('natural');r.milestone({type:'BREAKTHROUGH'},'明确本次突破');}
 r.project(o.preparation);r.buy('healing_pill',12,'本次回春筹备');r.buy('spirit_pill',4,'本次回灵筹备');r.project('natural');r.go('cave','核对完整体魄');const maximum=stats(r.game);if(r.game.core.player.hp<maximum.maxHp||r.game.core.player.mp<maximum.maxMp)r.run({kind:'rest',maxCycles:1,remainingMonthsReserve:1},'明确一次疗养');r.go('terrace','明确前往登仙台');return{success:true,failure:null,game:r.game,steps:r.activity.steps,onlineMs:r.activity.onlineMs};
}
for(const school of ['sword','talisman']as const)test(`current normal ${school} reopens its actual question and every saved battle round without reroll or an automatic next gate`,async({page},info)=>{
 const o={choice:'leave',school,preparation:'purchase',cultivation:'natural',answer:school==='sword'?'accept':'release',ending:'transmit',advanced:false};await runVisibleIdleRoute(page,info,o,prepare,{terminalRealm:'spirit'});
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1});
 const question=await recoveryDatabase(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await recoveryDatabase(page)).toEqual(question);expect((await snapshot(page)).trial.stage).toBe(0);
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'ANSWER_TRIAL',answer:o.answer},maxCycles:1});let rounds=0,reopens=0;const stages=new Set<number>();
 for(let gate=1;gate<=3;gate++){
  for(let segment=0;(await snapshot(page)).trial.stage===gate&&segment<3;segment++){
   const before=await snapshot(page),plan=defaultBattlePlan(before);plan.strategy.healingBudget=Math.min(4,before.core.inventory.healing_pill);const selected=await selectPlan(page,plan);await decision(page,selected.control);let a=await activitySnapshot(page);
   while(a.status==='running'){
    const g=await snapshot(page);await expect(page.locator('[data-testid="training-activity"][data-generation="'+a.generation+'"][data-running="true"]')).toBeVisible();await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs/1000).toFixed(1)+' 秒');
    await page.clock.runFor(a.cycleMs-1);expect(await snapshot(page)).toEqual(g);await page.clock.runFor(1);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(a.completedCycles+1);await expect(page.getByTestId('save-status')).toHaveText('已保存');const done=await activitySnapshot(page);expect(await snapshot(page)).toEqual(resolve(g,a.nextCommand).nextState);rounds++;stages.add((await snapshot(page)).trial.stage);
    const raw=await recoveryDatabase(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await recoveryDatabase(page)).toEqual(raw);expect(await activitySnapshot(page)).toEqual(done);reopens++;
    if(done.status==='running'){
     // Reload itself grants nothing. The player explicitly resumes this same finite authorization.
     await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activitySnapshot(page))?.generation).toBe(done.generation+1);a=await activitySnapshot(page);expect(a.id).toBe(done.id);expect(a.plan).toEqual(plan);expect(a.completedCycles).toBe(done.completedCycles);
    }else{a=done;}
   }
   if((await snapshot(page)).trial.stage===gate)expect(a.stopReason.code).toBe('ACTIVITY_BUDGET');
  }
  expect((await snapshot(page)).trial.stage).toBe(gate+1);expect((await snapshot(page)).status).toBe('active');
 }
 expect(rounds).toBeGreaterThan(3);expect(reopens).toBe(rounds);expect(stages).toEqual(new Set([1,2,3,4]));await recoveryReadonly(page,async()=>{const selected=await selectPlan(page,{kind:'milestone',action:{type:'END',ending:'transmit'},maxCycles:1});await expect(selected.control).toBeEnabled();await page.getByTestId('ascension-cancel').click();});expect((await snapshot(page)).status).toBe('active');await info.attach('every-round-reopen',{body:JSON.stringify({school,rounds,reopens,questionReload:true,stages:[...stages],normalNewLife:true,virtualCyclesOnly:true}),contentType:'application/json'});
});
