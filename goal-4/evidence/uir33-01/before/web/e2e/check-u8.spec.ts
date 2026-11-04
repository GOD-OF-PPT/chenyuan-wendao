import {openCultivationNotes} from './stage-support';
import {selectAlchemyRecipe} from './stage-support';
import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {snapshot,activitySnapshot,useJourneyClock,finishJourneyClock,revealPaged} from './support';
import {openProductionIntent,closeProductionSettings,openSupplySettings,closeSupplySettings,openMarketLibrary} from './stage-support';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine.ts';
import {activityView} from '../src/activity-view';
import {formatCosts,formatDelta} from '../src/presentation';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});

async function activityIdentity(page:Page){
 const a=await activitySnapshot(page);
 return a&&{id:a.id,revision:a.revision,generation:a.generation,ownerId:a.ownerId,runId:a.runId,gameRevision:a.gameRevision,
  plan:a.plan,nextCommand:a.nextCommand,completedCycles:a.completedCycles,status:a.status,startedAt:a.startedAt,dueAt:a.dueAt};
}

async function gameStores(page:Page){
 return page.evaluate(()=>new Promise<Record<string,Array<{key:IDBValidKey;value:any}>>>((resolve,reject)=>{
  const req=indexedDB.open('chenyuan-playable-v1');
  req.onupgradeneeded=()=>{req.transaction?.abort();reject(new Error('Readonly observation cannot create a Game database'));};
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{const db=req.result,tx=db.transaction([...db.objectStoreNames],'readonly'),out:Record<string,Array<{key:IDBValidKey;value:any}>>={};
   for(const name of db.objectStoreNames){out[name]=[];const rows=tx.objectStore(name).openCursor();rows.onsuccess=()=>{const row=rows.result;if(row){out[name].push({key:row.key,value:row.value});row.continue();}};}
   tx.oncomplete=()=>{db.close();resolve(out);};tx.onabort=()=>{db.close();reject(tx.error??new Error('Readonly Game snapshot aborted'));};
  };
 }));
}

async function seed(page:Page,d:ReturnType<typeof driver>,name:string){
 await useJourneyClock(page);await page.goto('/');
 await expect(page.getByTestId('save-status')).toHaveText('尚无存档',{timeout:15000});
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d.game))});
 await finishJourneyClock(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 return snapshot(page);
}

async function stageGeometry(page:Page){
 await expect(page.locator('#primary-navigation button:visible')).toHaveCount(8);
 const controls=await page.locator('.game-hud button:visible,#primary-navigation button:visible,main button:visible,main summary:visible').evaluateAll(nodes=>nodes.map(el=>{
  const r=el.getBoundingClientRect(),hud=document.querySelector('[data-testid=game-hud]')!.getBoundingClientRect(),nav=document.querySelector('#primary-navigation')!.getBoundingClientRect();
  const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),inMain=!!el.closest('main'),head=el.closest('main')?.querySelector('.feature-header')?.getBoundingClientRect();
  return{text:el.textContent,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,
   hit:!!hit&&(hit===el||el.contains(hit)),contentTop:inMain?(head&&!el.closest('.feature-header')?Math.max(hud.bottom,head.bottom):hud.bottom):0,
   contentBottom:inMain?nav.top:innerHeight};
 }));
 for(const c of controls){expect(c.height,c.text??'control').toBeGreaterThanOrEqual(44);expect(c.hit,c.text??'control').toBe(true);
  expect(c.left,c.text??'control').toBeGreaterThanOrEqual(0);expect(c.right,c.text??'control').toBeLessThanOrEqual(1440);
  expect(c.top,c.text??'control').toBeGreaterThanOrEqual(c.contentTop-1);expect(c.bottom,c.text??'control').toBeLessThanOrEqual(c.contentBottom+1);}
 const texts=await page.locator('main .reading-text p:visible,main .production-object p:visible,main .alchemy-product-tray>p:visible,[data-testid=activity-history-row] p:not(.history-note):visible').evaluateAll(nodes=>nodes.map(el=>{
  const r=el.getBoundingClientRect(),surface=el.closest('.reading-text,.book-canvas,.alchemy-product-tray,[data-testid=activity-history-row]')?.getBoundingClientRect(),nav=document.querySelector('#primary-navigation')!.getBoundingClientRect();
  return{text:el.textContent,font:parseFloat(getComputedStyle(el).fontSize),top:r.top,bottom:r.bottom,left:r.left,right:r.right,
   limit:Math.min(nav.top,surface?.bottom??nav.top),start:surface?.top??0};
 }));
 for(const t of texts){expect(t.font,t.text??'body').toBeGreaterThanOrEqual(18);expect(t.left).toBeGreaterThanOrEqual(0);expect(t.right).toBeLessThanOrEqual(1440);
  expect(t.top).toBeGreaterThanOrEqual(t.start-1);expect(t.bottom,t.text??'body').toBeLessThanOrEqual(t.limit+1);}
 const small=await page.locator('.game-hud small:visible,main small:visible,[data-testid=activity-history] .history-note:visible').evaluateAll(nodes=>nodes.map(el=>parseFloat(getComputedStyle(el).fontSize)));
 expect(small.every(n=>n>=14)).toBe(true);
 const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,innerWidth,innerHeight,overflow:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,testid:e.getAttribute('data-testid'),x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,right:e.getBoundingClientRect().right,bottom:e.getBoundingClientRect().bottom})).filter(e=>e.right>innerWidth+1||e.bottom>innerHeight+1)}));
 expect(bounds.width,JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.innerWidth);expect(bounds.height,JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.innerHeight);
}

async function assertNoRewardPerformance(page:Page){
 await expect(page.locator('[data-testid=action-motion]:visible,[data-testid=action-number]:visible,[data-testid=hub-pulse]:visible')).toHaveCount(0);
}

async function assertReadOnlyStage(page:Page,before:any,identity:any){
 expect(await snapshot(page)).toEqual(before);
 expect(await activityIdentity(page)).toEqual(identity);
 await expect(page.locator('[data-testid="training-activity"]:visible')).toHaveCount(1);
 await stageGeometry(page);
}

async function rereadSettingsDuringActivity(page:Page,before:any,identity:any,stores:any){
 const countdown=await page.getByTestId('training-countdown').innerText();
 await page.getByTestId('game-settings').click();
 await page.getByTestId('local-records-panel').locator('summary').click();
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).__checkU8LocalTransactions=[];
  (window as any).__restoreCheckU8LocalTransactions=()=>IDBDatabase.prototype.transaction=original;
  IDBDatabase.prototype.transaction=function(...args:any[]){(window as any).__checkU8LocalTransactions.push({database:this.name,mode:args[1]??'readonly'});return Reflect.apply(original,this,args);};
 });
 let transactions:Array<{database:string;mode:string}>;
 try{
  await page.getByTestId('local-reconnect').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__checkU8LocalTransactions.some((row:any)=>row.database==='chenyuan-local-experience-v1'&&row.mode==='readonly'))).toBe(true);
  await expect(page.getByTestId('local-data-status')).toContainText('已保存');
  transactions=await page.evaluate(()=>(window as any).__checkU8LocalTransactions);
 }finally{await page.evaluate(()=>(window as any).__restoreCheckU8LocalTransactions());}
 expect(transactions!.filter(row=>row.database==='chenyuan-playable-v1'&&row.mode!=='readonly')).toEqual([]);
 await expect(page.getByTestId('save-status')).toHaveText('已保存');
 await page.getByRole('button',{name:'关闭设置',exact:true}).click();
 expect(await page.getByTestId('training-countdown').innerText()).toBe(countdown);
 await assertReadOnlyStage(page,before,identity);expect(await gameStores(page)).toEqual(stores);
 await page.clock.fastForward(1000);
 expect(parseFloat(await page.getByTestId('training-countdown').innerText())).toBe(parseFloat(countdown)-1);
 await assertReadOnlyStage(page,before,identity);expect(await gameStores(page)).toEqual(stores);
}

test('R4 and B read surfaces keep one running activity and never turn inspection into a Game write',async({page},info)=>{
 const d=driver();d.resource('herb',4);d.funds(4);d.go('cave');
 await seed(page,d,'lawful-check-u8.json');
 await expect(page.getByTestId('realm')).toHaveText('炼气');
 await page.getByTestId('hub-forge').click();
 await selectAlchemyRecipe(page,'healing');
 await page.getByTestId('production-start').click();
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const before=await snapshot(page);
 const storesBefore=await gameStores(page);
 const identity=await activityIdentity(page);
 await expect(page.getByTestId('training-countdown')).toBeVisible();
 await expect(page.getByTestId('training-activity')).toHaveAttribute('data-status','running');
 await rereadSettingsDuringActivity(page,before,identity,storesBefore);
 const readingCountdown=await page.getByTestId('training-countdown').innerText();

 await page.getByTestId('hub-life').click();
 await expect(page.getByTestId('life-panel')).toBeVisible();
 await stageGeometry(page);
 await page.screenshot({path:info.outputPath('check-u8-life-reading.png')});
 await assertReadOnlyStage(page,before,identity);expect(await gameStores(page)).toEqual(storesBefore);
 await page.getByTestId('hub-close').click();
 await assertReadOnlyStage(page,before,identity);

 await page.getByTestId('tab-3').click();
 await expect(page.getByTestId('fate-catalogue')).toBeVisible();
 await assertReadOnlyStage(page,before,identity);expect(await gameStores(page)).toEqual(storesBefore);
 await page.getByTestId('tab-0').click();
 await assertReadOnlyStage(page,before,identity);

 await page.getByTestId('hub-goal').click();
 await expect(page.getByTestId('goal-panel')).toBeVisible();
 await assertReadOnlyStage(page,before,identity);expect(await gameStores(page)).toEqual(storesBefore);
 await page.getByTestId('hub-close').click();
 await page.getByTestId('tab-0').click();
 await page.getByTestId('training-settings').click();
 await expect(page.getByTestId('recipe-catalogue')).toBeVisible();
 await expect(page.getByTestId('production-limits')).toBeVisible();
 await openProductionIntent(page);await expect(page.getByTestId('production-estimate')).toContainText('回春丹');await closeProductionSettings(page);
 await expect(page.getByTestId('training-countdown')).toHaveText(readingCountdown);
 await stageGeometry(page);
 await page.screenshot({path:info.outputPath('check-u8-production-reading.png')});
 await assertReadOnlyStage(page,before,identity);expect(await gameStores(page)).toEqual(storesBefore);
 await page.getByTestId('hub-close').click();

 await page.getByTestId('training-pause').click();
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('paused');
 const paused=await activityIdentity(page);
 const pausedStores=await gameStores(page);
 await page.getByTestId('tab-0').click();
 await page.getByTestId('training-settings').click();
 await expect(page.getByTestId('recipe-catalogue')).toBeVisible();
 await expect(page.getByTestId('production-limits')).toBeVisible();
 await openProductionIntent(page);await expect(page.getByTestId('production-estimate')).toContainText('回春丹');await closeProductionSettings(page);
 await assertReadOnlyStage(page,before,paused);expect(await gameStores(page)).toEqual(pausedStores);
 expect((await activitySnapshot(page))?.plan.recipeId).toBe('healing');
 await page.getByTestId('tab-1').click();await page.getByTestId('feature-prepare').click();
 await page.getByTestId('prepare-purchase-route').click();await page.getByTestId('preparation-compare').click();
 await expect(page.getByTestId('progression-choices')).toHaveAttribute('data-kind','preparation');
 await page.getByTestId('tradeoff-purchase').click();await assertReadOnlyStage(page,before,paused);expect(await gameStores(page)).toEqual(pausedStores);
 await page.getByTestId('hub-close').click();await expect(page.getByTestId('prepare-purchase-route')).toHaveAttribute('aria-pressed','true');
 await assertReadOnlyStage(page,before,paused);expect(await gameStores(page)).toEqual(pausedStores);
});

type ReceiptRow={key:IDBValidKey;value:any};
const cycleReceipts=(stores:Awaited<ReturnType<typeof gameStores>>,id:string):ReceiptRow[]=>(stores['full-receipts']??[])
 .filter(row=>row.value.input?.kind==='TICK'&&row.value.activity?.id===id)
 .sort((a,b)=>a.value.result.revisionAfter-b.value.result.revisionAfter);

async function saveFiveCycles(page:Page,version:number){
 const started=await activitySnapshot(page);expect(started.version).toBe(version);expect(started.plan.maxCycles).toBe(5);
 await expect(page.getByTestId('training-countdown')).toContainText((started.cycleMs/1000).toFixed(1));
 for(let n=0;n<5;n++){
  const a=await activitySnapshot(page),before=await snapshot(page),expected=resolve(before,a.nextCommand);
  await page.clock.fastForward(a.cycleMs-1);expect(await snapshot(page)).toEqual(before);
  await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(n+1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(expected.nextState);
  const rows=cycleReceipts(await gameStores(page),a.id);expect(rows).toHaveLength(n+1);
  expect(rows[n].value.command).toEqual(a.nextCommand);expect(rows[n].value.result).toEqual(expected.result);
  if(n<4)await expect(page.getByTestId('training-countdown')).toContainText((a.cycleMs/1000).toFixed(1));
 }
 const stopped=await activitySnapshot(page);expect(stopped.id).toBe(started.id);expect(stopped.status).toBe('stopped');expect(stopped.completedCycles).toBe(5);
 return{game:await snapshot(page),activity:stopped,stores:await gameStores(page)};
}

async function readRestoredHistory(page:Page,info:TestInfo,completed:Awaited<ReturnType<typeof saveFiveCycles>>,name:string){
 const expected=cycleReceipts(completed.stores,completed.activity.id);expect(expected).toHaveLength(5);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');
 expect(await snapshot(page)).toEqual(completed.game);expect(await activitySnapshot(page)).toEqual(completed.activity);expect(await gameStores(page)).toEqual(completed.stores);
 await assertNoRewardPerformance(page);
 const entry=page.getByTestId('hub-receipt');await expect(entry).toBeVisible();await expect(entry).toBeEnabled();await entry.click();
 const history=page.getByTestId('activity-history');await expect(history).toBeVisible();
 const pager=history.getByRole('navigation',{name:'逐次回执翻页'}),next=pager.getByTestId('catalogue-next'),previous=pager.getByTestId('catalogue-prev');
 const byId=new Map(expected.map(row=>[row.value.command.commandId,row.value])),seen:string[]=[];
 await expect(pager).toContainText('共 5 项');await expect(previous).toBeDisabled();
 await expect(history.getByTestId('activity-history-stop')).toContainText(completed.activity.stopReason.message);
 for(const total of activityView(completed.activity,completed.game).summary)await expect(history.getByTestId('activity-history-totals')).toContainText(total);
 let pages=0;
 for(;pages<6;pages++){
  const rows=history.getByTestId('activity-history-row');await expect.poll(()=>rows.count()).toBeGreaterThan(0);
  for(const row of await rows.all()){
   const id=await row.getAttribute('data-command-id');expect(id).not.toBeNull();expect(seen).not.toContain(id);const receipt=byId.get(id!);if(!receipt)throw new Error('Displayed receipt is not one of this exact persisted activity: '+id);
   await expect(row.getByTestId('activity-history-costs')).toContainText(formatCosts(receipt.result.costs));
   await expect(row.getByTestId('activity-history-delta')).toContainText(formatDelta(receipt.result.delta));seen.push(id!);
  }
  await stageGeometry(page);await assertNoRewardPerformance(page);expect(await gameStores(page)).toEqual(completed.stores);
  if(pages===0)await page.screenshot({path:info.outputPath(name+'-history-first.png')});
  if(await next.isDisabled())break;
  const first=await rows.first().getAttribute('data-command-id');await next.click();
  await expect(rows.first()).not.toHaveAttribute('data-command-id',first!);
 }
 expect(pages).toBeGreaterThan(0);expect(pages).toBeLessThan(6);expect(seen).toEqual(expected.map(row=>row.value.command.commandId));
 await page.screenshot({path:info.outputPath(name+'-history-last.png')});
 await previous.click();await expect(next).toBeEnabled();await assertNoRewardPerformance(page);expect(await gameStores(page)).toEqual(completed.stores);
 await page.getByTestId('hub-close').click();await assertNoRewardPerformance(page);
 await page.getByTestId('hub-receipt').click();await expect(history).toBeVisible();
 await page.clock.fastForward(2000);await assertNoRewardPerformance(page);expect(await gameStores(page)).toEqual(completed.stores);
}

test('five saved cultivation cycles retain every complete receipt after reload without replaying rewards',async({page},info)=>{
 const d=driver();d.go('cave');await seed(page,d,'lawful-check-u8-cultivation-history.json');
 await openCultivationNotes(page);await page.getByTestId('hub-cultivation-details').click();await page.getByTestId('training-limits-toggle').click();await page.getByTestId('cultivation-method-natural').click();await page.getByLabel('修行目标',{exact:true}).selectOption('5');
 await page.getByTestId('training-start').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const completed=await saveFiveCycles(page,1);await readRestoredHistory(page,info,completed,'cultivation-restored');
});

test('five saved alchemy cycles retain material costs and net pills on every receipt page after reload',async({page},info)=>{
 const d=driver();d.resource('herb',10);d.funds(10);d.go('cave');const before=await seed(page,d,'lawful-check-u8-alchemy-history.json');
 await page.getByTestId('hub-forge').click();await selectAlchemyRecipe(page,'healing');await openProductionIntent(page);await page.getByLabel('炼丹炉次').selectOption('5');await page.getByTestId('production-intent-toggle').click();
 await page.getByTestId('production-start').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const completed=await saveFiveCycles(page,3);expect(completed.game.core.inventory.herb).toBe(before.core.inventory.herb-10);expect(completed.game.core.inventory.healing_pill).toBe(before.core.inventory.healing_pill+5);expect(completed.game.core.player.stones).toBe(before.core.player.stones-10);
 await readRestoredHistory(page,info,completed,'alchemy-restored');
});

test('five saved purchase cycles retain positive currency costs and exact inventory gains after reload',async({page},info)=>{
 const d=driver();d.funds(150);d.go('market');const before=await seed(page,d,'lawful-check-u8-purchase-history.json');
 await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await checkArt03Read(page,async()=>{await openMarketLibrary(page);await revealPaged(page,'buy-healing_pill','market-library-dialog','坊市货物');await page.getByTestId('buy-healing_pill').click();await expect(page.getByTestId('market-library-dialog')).not.toBeVisible();});
 await openSupplySettings(page);await page.getByLabel('交易最多件数').fill('5');await page.getByLabel('交易最多件数').blur();await closeSupplySettings(page);
 await page.getByTestId('preparation-start').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const completed=await saveFiveCycles(page,5);expect(completed.game.core.inventory.healing_pill).toBe(before.core.inventory.healing_pill+5);expect(completed.game.core.player.stones).toBe(before.core.player.stones-90);
 await readRestoredHistory(page,info,completed,'purchase-restored');
});


test('another page names its takeover and only its new full cycle can award once',async({page,context})=>{
 const d=driver();d.go('cave');await seed(page,d,'lawful-check-u8-takeover.json');
 await openCultivationNotes(page);await page.getByTestId('hub-cultivation-details').click();await page.getByTestId('training-limits-toggle').click();await page.getByLabel('修行目标',{exact:true}).selectOption('1');await page.getByTestId('training-start').click();
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const old=await activitySnapshot(page),before=await snapshot(page);
 const other=await context.newPage();
 try{
  await other.goto('/');await expect(other.getByTestId('training-resume')).toContainText('接管');await expect(other.getByTestId('training-activity')).toContainText('本页尚未接管');
  expect(await snapshot(other)).toEqual(before);expect(await activitySnapshot(other)).toEqual(old);
  await other.getByTestId('training-resume').click();await expect.poll(async()=>(await activitySnapshot(other))?.generation).toBeGreaterThan(old.generation);
  const current=await activitySnapshot(other);expect(current.ownerId).not.toBe(old.ownerId);await expect(page.getByTestId('training-resume')).toContainText('接管');
  await page.clock.fastForward(current.cycleMs-1);expect(await snapshot(other)).toEqual(before);
  await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(other))?.completedCycles).toBe(1);
  expect(await snapshot(other)).toEqual(resolve(before,current.nextCommand).nextState);const rows=cycleReceipts(await gameStores(other),current.id);expect(rows).toHaveLength(1);expect(rows[0].value.command.commandId).toBe(current.nextCommand.commandId);
  expect(rows.some(row=>row.value.command.commandId===old.nextCommand.commandId)).toBe(false);
 }finally{await other.close();}
});


test('paused cultivation exposes saved cycles after reload and history reading preserves the exact resume boundary',async({page},info)=>{
 const d=driver();d.go('cave');await seed(page,d,'lawful-check-u8-paused-history.json');
 await openCultivationNotes(page);await page.getByTestId('hub-cultivation-details').click();await page.getByTestId('training-limits-toggle').click();await page.getByLabel('修行目标',{exact:true}).selectOption('5');await page.getByTestId('training-start').click();
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const first=await activitySnapshot(page);await page.clock.fastForward(first.cycleMs);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(1);
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('paused');
 const paused={game:await snapshot(page),activity:await activitySnapshot(page),stores:await gameStores(page)};
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');
 await page.getByTestId('hub-receipt').click();await expect(page.getByTestId('activity-history-row')).toHaveCount(1);
 await expect(page.getByTestId('activity-history-stop')).toContainText('暂停');await stageGeometry(page);await assertNoRewardPerformance(page);
 await page.screenshot({path:info.outputPath('paused-history.png')});
 expect(await snapshot(page)).toEqual(paused.game);expect(await activitySnapshot(page)).toEqual(paused.activity);expect(await gameStores(page)).toEqual(paused.stores);
 await page.getByTestId('hub-close').click();await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activitySnapshot(page))?.generation).toBeGreaterThan(paused.activity.generation);
 const resumed=await activitySnapshot(page);await page.clock.fastForward(resumed.cycleMs-1);expect(await snapshot(page)).toEqual(paused.game);
 await page.clock.fastForward(1);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(2);
 expect(await snapshot(page)).toEqual(resolve(paused.game,resumed.nextCommand).nextState);
 await stageGeometry(page);await page.getByTestId('training-pause').click();
});


test('the journal returns to life reading after an old milestone is invalidated by a later explicit configuration',async({page})=>{
 const d=driver();await seed(page,{...d,game:d.checkpoints.mortal},'lawful-check-u8-old-milestone.json');
 await page.getByTestId('breakthrough').click();await page.getByTestId('milestone-confirm').click();
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const milestone=await activitySnapshot(page);expect(milestone.version).toBe(7);
 await page.clock.fastForward(milestone.cycleMs);await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(1);await expect(page.getByTestId('realm')).toHaveText('炼气');
 await page.getByTestId('hub-skills').click();await page.getByTestId('equipment-mode-school').click();await page.getByTestId('school-talisman').click();await page.getByTestId('configuration-confirm').click();await expect.poll(async()=>(await snapshot(page)).school).toBe('talisman');
 await expect.poll(async()=>(await activitySnapshot(page))?.stopReason?.code).toBe('STATE_CHANGED');
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');const before={game:await snapshot(page),activity:await activitySnapshot(page),stores:await gameStores(page)};
 await page.getByTestId('stage-details').click();await expect(page.getByTestId('life-panel')).toBeVisible();await stageGeometry(page);await assertNoRewardPerformance(page);
 expect(await snapshot(page)).toEqual(before.game);expect(await activitySnapshot(page)).toEqual(before.activity);expect(await gameStores(page)).toEqual(before.stores);
});

// CHECK-ART03: public surface access is readonly over every native Game store.
async function checkArt03Read(page:Page,body:()=>Promise<void>){const read=()=>page.evaluate(()=>new Promise<any>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();reject(Error('Readonly catalogue cannot create Game DB'));};q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};for(const name of db.objectStoreNames){rows[name]=[];const r=tx.objectStore(name).openCursor();r.onsuccess=()=>{if(r.result){rows[name].push({key:r.result.key,value:r.result.value});r.result.continue();}};}tx.oncomplete=()=>{db.close();accept({version:db.version,rows});};tx.onabort=()=>{db.close();reject(tx.error);};};}));const before=await read();await body();expect(await read()).toEqual(before);}
