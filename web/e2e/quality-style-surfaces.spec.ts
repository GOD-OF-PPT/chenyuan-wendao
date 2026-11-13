import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {driver,fullRoute} from '../../tests/full-route.mjs';
import {newGame} from '../../src/full/engine';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {selectPlan} from './idle-route-support';
import {activitySnapshot,useJourneyClock} from './support';

// The exact same visible states produce before/after evidence. The clock and
// Game are the ordinary journey helpers; this file never seeks an animation.
async function capture(page:Page,info:TestInfo,name:string){
 await expect.poll(()=>page.locator('[data-art-state="loading"]').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).length)).toBe(0);
 await page.evaluate(()=>document.fonts.ready);
 const before=await recoveryDatabase(page);
 const styles=await page.locator('#app *').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>{
  const s=getComputedStyle(n),r=n.getBoundingClientRect(),properties=['display','position','color','backgroundColor','backgroundImage','fontFamily','fontSize','lineHeight','fontWeight','borderColor','borderWidth','padding','margin','opacity','visibility','transform','boxShadow','outline','zIndex'];
  return {tag:n.tagName,id:n.getAttribute('data-testid')??n.id,classes:n.getAttribute('class'),text:n.children.length?null:n.textContent,box:{x:r.x,y:r.y,width:r.width,height:r.height},style:Object.fromEntries(properties.map(p=>[p,s.getPropertyValue(p.replace(/[A-Z]/g,x=>'-'+x.toLowerCase()))]))};
 }));
 expect(await recoveryDatabase(page)).toEqual(before);
 const dir=process.env.Q12_CAPTURE_DIR??info.outputPath('surfaces');mkdirSync(dir,{recursive:true});
 writeFileSync(path.join(dir,name+'.styles.json'),JSON.stringify(styles,null,2)+'\n');
 await page.screenshot({path:path.join(dir,name+'.png')});
 expect(await recoveryDatabase(page)).toEqual(before);
 const screen=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollHeight}));
 expect(screen).toEqual({width:1440,height:900,scroll:900});
}

test('Q12 current welcome and opening choice keep complete fixed desktop surfaces',async({page},info)=>{
 await useJourneyClock(page);await page.goto('/');await expect(page.getByLabel('你的道号',{exact:true})).toBeVisible();await capture(page,info,'welcome');
});

test('Q12 current opening decision and its actual confirmation retain the original cost and controls',async({page},info)=>{
 await importRecoveryFixture(page,newGame('山雨客','q12-opening'));await capture(page,info,'opening');
 await page.getByTestId('leave').click();await expect(page.getByTestId('milestone-review')).toBeVisible();await capture(page,info,'opening-confirmation');
});

test('Q12 running cultivation retains its actual first frame and original remaining period',async({page},info)=>{
 const d=driver();d.go('cave');await importRecoveryFixture(page,d.game);
 const selected=await selectPlan(page,{kind:'cultivation',method:'natural',maxCycles:5,until:'cycles',stoneBudget:0,stoneReserve:0});await selected.control.click();
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');await expect(page.getByTestId('training-countdown')).toContainText('60.0');await capture(page,info,'cultivation-running');
});

test('Q12 recipe materials and display settings remain completely readable',async({page},info)=>{
 const d=driver();d.resource('herb',2);d.funds(2);d.go('cave');await importRecoveryFixture(page,d.game);
 await selectPlan(page,{kind:'craft',recipeId:'healing',maxCycles:1,until:'cycles',targetQuantity:null,stoneBudget:2,stoneReserve:0,monthBudget:12,itemReserves:{},remainingMonthsReserve:1});
 await capture(page,info,'recipe-materials');
 await page.getByTestId('game-settings').click();await expect(page.getByTestId('reduce-effects')).toBeVisible();await capture(page,info,'display-settings');
});

test('Q12 the real opponent and complete battle strategy keep original hierarchy',async({page},info)=>{
 const d=driver();d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});await importRecoveryFixture(page,d.game);await capture(page,info,'battle');
 await page.getByTestId('battle-view-strategy').click();await capture(page,info,'battle-strategy');
});

test('Q12 a genuine native save failure retains the complete original recovery surface',async({page},info)=>{
 const d=driver();d.go('wilderness');await importRecoveryFixture(page,d.game);
 const selected=await selectPlan(page,{kind:'source',sourceId:'herbs',maxCycles:1,until:'cycles',target:null,monthBudget:12,remainingMonthsReserve:1});await selected.control.click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.input?.kind==='ADVANCE'){IDBObjectStore.prototype.put=original;throw new DOMException('Q12 actual quota','QuotaExceededError');}return key===undefined?original.call(this,value):original.call(this,value,key);};});
 await page.clock.runFor(30000);await expect(page.getByTestId('error')).toContainText('存储空间不足');await capture(page,info,'save-failure');
});

test('Q12 current paid NPC choices retain their real portrait and complete parallel costs',async({page},info)=>{
 const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});await importRecoveryFixture(page,d.game);
 await page.getByTestId('tab-0').click();await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-mode-choices').click();await expect(page.getByTestId('decide-bargain')).toBeVisible();await capture(page,info,'npc-choices');
});

test('Q12 sealed home and its complete current life record remain stable',async({page},info)=>{
 const d=fullRoute('help','sword','purchase',false,'transmit');await importRecoveryFixture(page,d.game);await capture(page,info,'sealed-home');
 await page.getByTestId('sealed-open-life').click();await capture(page,info,'sealed-record');
});
