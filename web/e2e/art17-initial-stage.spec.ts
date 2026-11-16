import {test,expect} from '@playwright/test';
import {newGame,advance} from '../../src/full/engine.ts';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';

test('ART17-A13 complete initial reading precedes the game stage and preserves every saved record',async({page,browser},info)=>{
 let game=newGame('静候客','art17-stage-ready');
 for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2}]as const)
  game=advance(game,{...action,commandId:'prepare-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
 await importRecoveryFixture(page,game);
 const original=await recoveryDatabase(page),storageState=await page.context().storageState({indexedDB:true});
 const context=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:900},storageState}),resumed=await context.newPage(),errors:string[]=[];
 resumed.on('pageerror',e=>errors.push(e.message));
 try{
  await resumed.addInitScript(()=>{
   const state={sawLoading:false,earlyStage:[] as string[]};(window as any).__art17InitialStage=state;
   new MutationObserver(()=>{
    if(!document.querySelector('[data-testid=game-loading]'))return;
    state.sawLoading=true;
    for(const selector of ['.world-ambience','.game-hud','#primary-navigation','.stage-journal'])
     if(document.querySelector(selector)&&!state.earlyStage.includes(selector))state.earlyStage.push(selector);
   }).observe(document,{subtree:true,childList:true,attributes:true});
  });
  await resumed.goto('/');await expect(resumed.getByTestId('save-status')).toHaveText('已保存');
  await expect(resumed.getByTestId('game-loading')).toHaveCount(0);
  const observation=await resumed.evaluate(()=>(window as any).__art17InitialStage),actual=await recoveryDatabase(resumed);
  await info.attach('initial-stage-boundary',{body:JSON.stringify({observation,allGameStoresUnchanged:JSON.stringify(actual)===JSON.stringify(original)}),contentType:'application/json'});
  expect(actual).toEqual(original);expect(errors).toEqual([]);expect(observation.sawLoading).toBe(true);expect(observation.earlyStage).toEqual([]);
  await expect(resumed.locator('#primary-navigation').getByRole('button')).toHaveCount(8);
  await expect(resumed.getByTestId('cave-threshold-object')).toBeVisible();await expect(resumed.getByTestId('breakthrough')).toHaveText('引气入体');
 }finally{await context.close();}
});
