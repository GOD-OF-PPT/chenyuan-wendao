import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {snapshot,activitySnapshot} from './support';
import {selectInventoryItem} from './stage-support';
import {paidResponseFixture,npcResponseFixtures} from '../../tests/response-context-fixtures.mjs';
import {narrativeFor} from '../src/story-pages';
import {createActivity,pauseActivity} from '../../src/full/activity';
import {selectPlan,home} from './idle-route-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});

test('NPC options are side by side and one confirmed response writes its real cost without a six-second timer',async({page},info)=>{
  const before=await importRecoveryFixture(page,paidResponseFixture());
  await page.getByTestId('tab-3').click();await page.getByTestId('fate-resume-dialogue').click();
  await expect(page.getByTestId('decide-bargain')).toBeVisible();
  const boxes=await page.locator('.direct-choices .choice-card').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));expect(boxes.length).toBeGreaterThanOrEqual(2);expect(boxes[0].top).toBe(boxes[1].top);expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left);
  await page.screenshot({path:info.outputPath('direct-npc-choices.png')});
  const raw=await recoveryDatabase(page);await page.getByTestId('decide-bargain').click();
  await expect(page.getByTestId('game-confirmation')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(raw);
  await page.screenshot({path:info.outputPath('direct-npc-one-confirmation.png')});
  await page.getByTestId('game-confirmation-confirm').click();
  await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  const after=await snapshot(page);expect(after).toEqual(resolve(before,{type:'DECIDE',option:'bargain',commandId:'proof',runId:before.core.runId,expectedRevision:before.core.revision}).nextState);
  expect(await activitySnapshot(page)).toBeNull();await expect(page.getByTestId('training-countdown')).toHaveCount(0);
});

test('a chosen medicine can be used once directly from the inventory without another planner or delay',async({page},info)=>{
  const d=driver();d.buy('healing_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'flee'});d.go('cave');
  const before=await importRecoveryFixture(page,d.game);await page.getByTestId('tab-2').click();await selectInventoryItem(page,'healing_pill');
  await expect.poll(()=>page.locator('[data-art-state=loading]:visible').count()).toBe(0);await page.screenshot({path:info.outputPath('direct-inventory-use.png')});
  await page.getByTestId('quick-use-healing_pill').dblclick();await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  expect(await snapshot(page)).toEqual(resolve(before,{type:'USE',item:'healing_pill',commandId:'proof',runId:before.core.runId,expectedRevision:before.core.revision}).nextState);
  await expect(page.getByTestId('recovery-planner')).toHaveCount(0);await expect(page.getByTestId('game-confirmation')).toHaveCount(0);expect(await activitySnapshot(page)).toBeNull();
});

test('a visit opens its choices after one confirmation, and direct selling is limited to one item at the actual market',async({page})=>{
  const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');const before=await importRecoveryFixture(page,d.game);
  await page.getByTestId('tab-3').click();await page.getByTestId('fate-mode-events').click();
  await page.getByTestId('event-shen_return').click();await page.getByTestId('game-confirmation-confirm').click();
  await expect(page.getByTestId('decide-bargain')).toBeVisible();expect((await snapshot(page)).core.activeEvent?.id).toBe('shen_return');expect((await snapshot(page)).core.revision).toBe(before.core.revision+1);
  expect(await activitySnapshot(page)).toBeNull();
});

test('one direct sale changes inventory and stones only once and does not open another plan',async({page})=>{
  const d=driver();d.buy('healing_pill',3);const before=await importRecoveryFixture(page,d.game);await page.getByTestId('tab-2').click();await selectInventoryItem(page,'healing_pill');
  await page.getByTestId('quick-sell-healing_pill').dblclick();await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  expect(await snapshot(page)).toEqual(resolve(before,{type:'SELL',item:'healing_pill',quantity:1,commandId:'proof',runId:before.core.runId,expectedRevision:before.core.revision}).nextState);await expect(page.getByTestId('game-confirmation')).toHaveCount(0);expect(await activitySnapshot(page)).toBeNull();
});

test('an inventory quota failure keeps its original single-dose retry and does not consume a second pill',async({page})=>{
  const d=driver();d.buy('healing_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'flee'});d.go('cave');const before=await importRecoveryFixture(page,d.game);
  await page.getByTestId('tab-2').click();await selectInventoryItem(page,'healing_pill');const raw=await recoveryDatabase(page);
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;(window as any).__restoreQuick=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.format==='chenyuan-direct-receipt')throw new DOMException('direct UI quota','QuotaExceededError');return put.call(this,value,key!);};});
  try{await page.getByTestId('quick-use-healing_pill').click();await expect(page.getByTestId('error')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(raw);await expect(page.getByTestId('quick-use-healing_pill')).toBeDisabled();}
  finally{await page.evaluate(()=>(window as any).__restoreQuick());}
  await page.getByTestId('retry').click();await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);expect((await snapshot(page)).core.inventory.healing_pill).toBe(before.core.inventory.healing_pill-1);await expect(page.getByTestId('error')).toHaveCount(0);
});

test('a failed visit retries its original intent and presents the same current dialogue without another click',async({page})=>{
  const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');const before=await importRecoveryFixture(page,d.game);await page.getByTestId('tab-3').click();await page.getByTestId('fate-mode-events').click();
  const raw=await recoveryDatabase(page);await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;(window as any).__restoreVisit=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.format==='chenyuan-direct-receipt')throw new DOMException('visit quota','QuotaExceededError');return put.call(this,value,key!);};});
  try{await page.getByTestId('event-shen_return').click();await page.getByTestId('game-confirmation-confirm').click();await expect(page.getByTestId('error')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(raw);}
  finally{await page.evaluate(()=>(window as any).__restoreVisit());}
  await page.getByTestId('retry').click();await expect(page.getByTestId('decide-bargain')).toBeVisible();expect((await snapshot(page)).core.revision).toBe(before.core.revision+1);expect(await activitySnapshot(page)).toBeNull();
});

test('a keyboard sale of the final item returns focus to the stable inventory source entry',async({page})=>{
  const d=driver();d.buy('spirit_pill',1);const before=await importRecoveryFixture(page,d.game);await page.getByTestId('tab-2').click();await selectInventoryItem(page,'spirit_pill');
  await page.getByTestId('quick-sell-spirit_pill').focus();await page.keyboard.press('Enter');await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);await expect(page.getByTestId('inventory-main-source')).toBeFocused();expect((await snapshot(page)).core.inventory.spirit_pill).toBe(0);
});

test('an old nonfirst paused six-second response keeps its exact selected option and original plan on the parallel surface',async({page})=>{
  const before=await importRecoveryFixture(page,paidResponseFixture()),a=pauseActivity(createActivity(before,{kind:'milestone',action:{type:'DECIDE',option:'decline'},maxCycles:1},{id:'legacy-response',ownerId:'old-page',commandId:'old-start',now:10000}));
  await page.evaluate(record=>new Promise<void>((ok,no)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onsuccess=()=>{const db=q.result,t=db.transaction('full-state','readwrite');t.objectStore('full-state').put(record,'activity');t.oncomplete=()=>{db.close();ok();};t.onabort=()=>no(t.error);};}),a);
  await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await page.getByTestId('tab-3').click();await page.getByTestId('fate-resume-dialogue').click();
  const raw=await recoveryDatabase(page);await expect(page.getByTestId('response-context')).toContainText('已暂停');await expect(page.locator('[data-current-response=true]')).toContainText('原已安排的回应');expect(await activitySnapshot(page)).toEqual(a);expect(await recoveryDatabase(page)).toEqual(raw);
});

for(const {person,game} of npcResponseFixtures())test(`all ${person} response options and full costs remain readable before a readonly cancelled confirmation`,async({page},info)=>{
  const g=await importRecoveryFixture(page,game);await page.getByTestId('tab-3').click();await page.getByTestId('resume-encounter').click();
  const raw=await recoveryDatabase(page),choices=narrativeFor(g)!.choices;
  for(const c of choices){const button=page.getByTestId(c.id);await expect(button).toBeVisible();const geometry=await button.evaluate(node=>{const r=node.getBoundingClientRect(),nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{width:r.width,height:r.height,above:r.bottom<=nav.top,hit:!!hit&&(hit===node||node.contains(hit)),clip:node.scrollHeight>node.clientHeight+1,inside:r.top>=node.closest('.response-canvas')!.getBoundingClientRect().top};});expect(geometry.width).toBeGreaterThanOrEqual(44);expect(geometry.height).toBeGreaterThanOrEqual(44);expect(geometry.above).toBe(true);expect(geometry.hit).toBe(true);expect(geometry.clip).toBe(false);expect(geometry.inside).toBe(true);await expect(button).toContainText(c.detail);}
  await page.screenshot({path:info.outputPath('direct-'+person+'-all-options.png')});
  const allowed=[];for(const c of choices)if(await page.getByTestId(c.id).isEnabled())allowed.push(c);await page.getByTestId(allowed[0].id).click();await expect(page.getByTestId('game-confirmation')).toBeVisible();await page.getByTestId('game-confirmation-cancel').click();expect(await recoveryDatabase(page)).toEqual(raw);
});
