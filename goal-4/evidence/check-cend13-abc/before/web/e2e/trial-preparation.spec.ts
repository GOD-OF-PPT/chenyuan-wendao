import {test,expect,type Page} from '@playwright/test';
import {advance} from '../../src/full/engine.ts';
import {runner} from '../../scripts/economy/scenarios.mjs';
import {trialPreparationRunner,detailedTrialScenario,zeroManaTrialScenario} from '../../tests/trial-preparation-route.mjs';
import {foundation,nextRealm,buy,craft,meditate,go} from './progression';
import {action,snapshot,travel} from './support';
test.use({actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
const normalize=(game:any)=>{const g=structuredClone(game);g.core.runId='<run>';g.core.revision=0;if(g.core.activeEvent)g.core.activeEvent.instanceId='<run>:'+g.core.activeEvent.id;return g;};
async function importFixture(page:Page,game:any){await page.goto('/');const input=page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled();await input.setInputFiles({name:'legal-trial-preparation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});await expect(page.getByTestId('realm')).toHaveText('化神');await expect.poll(async()=>(await snapshot(page)).core.world.elapsedMonths).toBe(game.core.world.elapsedMonths);}
async function cp(page:Page){return page.evaluate(async()=>new Promise<any>((resolve,reject)=>{const r=indexedDB.open('chenyuan-playable-v1');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('full-state','readonly'),q=tx.objectStore('full-state').get('checkpoint');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();};}));}
async function review(page:Page){await page.getByTestId('trial-review-entry').click();await expect(page.getByTestId('trial-entry-confirmation')).toBeVisible();}
const question=(page:Page)=>page.getByRole('heading',{name:'你愿如何面对来路？',exact:true});

for(const route of [{school:'sword',strategy:'purchase',choice:'leave'},{school:'talisman',strategy:'craft',choice:'help'}] as const)test(`${route.school}/${route.strategy}: normal new game enters the actual question with one full preparation checkpoint`,async({page})=>{
 test.setTimeout(300000);await foundation(page,route.school,route.strategy,route.choice);for(let stage=0;stage<3;stage++)await nextRealm(page,route.strategy);
 if(route.strategy==='purchase')await buy(page,'ascension_seal',1);else await craft(page,'ascension');await meditate(page);await go(page,'cave');await page.getByTestId('tab-0').click();
 const looking=await snapshot(page);await actionlessPreparation(page);expect(await snapshot(page)).toEqual(looking);
 await expect(page.getByTestId('trial-required-location')).toContainText('未具备');await expect(page.getByTestId('trial-review-entry')).toBeDisabled();
 await page.getByTestId('trial-go-terrace').click();const arrived=await snapshot(page);expect(arrived.core.inventory).toEqual(looking.core.inventory);expect(arrived.core.player).toEqual(looking.core.player);expect(arrived.core.activeEvent).toBeNull();
 await expect(page.getByTestId('trial-review-entry')).toBeEnabled();await review(page);const before=await snapshot(page);await page.getByTestId('trial-entry-cancel').click();expect(await snapshot(page)).toEqual(before);
 await review(page);await page.getByTestId('trial-confirm-entry').dblclick();await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);await expect(question(page)).toBeVisible();
 const after=await snapshot(page),checkpoint=await cp(page);expect(checkpoint.kind).toBe('trial');expect(checkpoint.snapshot).toEqual(before);expect(after.core.inventory.ascension_seal).toBe(before.core.inventory.ascension_seal-1);expect(after.trial).toEqual({stage:0,answer:null});
 await expect(page.getByTestId('trial-checkpoint-committed')).toBeVisible();await page.reload();await expect(question(page)).toBeVisible();expect(await snapshot(page)).toEqual(after);expect(await cp(page)).toEqual(checkpoint);
});
async function actionlessPreparation(page:Page){await page.getByTestId('breakthrough').click();await expect(page.getByTestId('trial-preparation-title')).toBeFocused();}

test('an incomplete real preparation remains inspectable and navigation does not acquire or consume materials',async({page})=>{
 const r=runner({choice:'leave',school:'sword',preparation:'gather',cultivation:'natural',advancedMind:false});r.grow('spirit',false);r.go('cave');await importFixture(page,r.ledger.game);
 const before=await snapshot(page);await expect(page.getByTestId('breakthrough')).toBeEnabled();await actionlessPreparation(page);expect(await snapshot(page)).toEqual(before);
 await expect(page.getByTestId('trial-required-xp')).toContainText('未具备');await expect(page.getByTestId('trial-required-item-ascension_seal')).toContainText('库存 0');await expect(page.getByTestId('trial-review-entry')).toBeDisabled();
 await page.getByTestId('trial-track-ascension_seal').click();expect(await snapshot(page)).toEqual(before);
 await page.getByTestId('trial-go-medicine').click();await expect(page.getByTestId('buy-healing_pill')).toBeFocused();const arrived=await snapshot(page);expect(arrived.core.inventory).toEqual(before.core.inventory);expect(arrived.core.player).toEqual(before.core.player);expect(arrived.core.activeEvent).toBeNull();
});

test('real zero-mana no-potion no-ally no-relic preparation can enter without optional gates',async({page})=>{
 const fixture=zeroManaTrialScenario();await importFixture(page,fixture);await expect(page.getByTestId('trial-mana')).toContainText('灵力 0 / 290');await expect(page.getByTestId('trial-medicine')).toContainText('回春丹 ×0');await expect(page.getByTestId('trial-aid')).toContainText('减伤 0');await expect(page.getByTestId('trial-review-entry')).toBeEnabled();
 await review(page);await action(page,'trial-confirm-entry');await expect(question(page)).toBeVisible();expect((await snapshot(page)).core.player.mp).toBe(0);expect((await cp(page)).snapshot.core.player.mp).toBe(0);
});

test('checkpoint quota failure stays in preparation, cancellation discards retry, and a fresh confirmed retry charges once',async({page})=>{
 await importFixture(page,detailedTrialScenario().game);await expect(page.getByTestId('trial-no-checkpoint')).toBeVisible();const before=await snapshot(page);await review(page);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;(globalThis as any).restoreTrialPut=()=>{IDBObjectStore.prototype.put=put;};IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-state'&&key==='checkpoint')throw new DOMException('trial quota','QuotaExceededError');return put.call(this,value,key!);};});
 await page.getByTestId('trial-confirm-entry').click();await expect(page.getByTestId('trial-entry-error')).toContainText('存储空间不足');expect(await snapshot(page)).toEqual(before);expect(await cp(page)).toBeUndefined();await expect(question(page)).toHaveCount(0);
 await page.getByTestId('trial-entry-cancel').click();await expect(page.getByTestId('retry')).toHaveCount(0);await review(page);await page.getByTestId('trial-confirm-entry').click();await expect(page.getByTestId('trial-entry-error')).toContainText('存储空间不足');
 await page.evaluate(()=>(globalThis as any).restoreTrialPut());await action(page,'trial-entry-retry');await expect(question(page)).toBeVisible();const after=await snapshot(page);expect(after.core.inventory.ascension_seal).toBe(before.core.inventory.ascension_seal-1);expect((await cp(page)).snapshot).toEqual(before);
});

test('a changed or replaced cross-tab progress invalidates the fixed entry review',async({page,context})=>{
 await importFixture(page,detailedTrialScenario().game);await review(page);const text=await page.getByTestId('trial-review-identity').innerText();const other=await context.newPage();await other.goto('/');await expect(other.getByTestId('trial-preparation')).toBeVisible();await travel(other,'cave');
 await expect(page.getByTestId('trial-review-stale')).toBeVisible();await expect(page.getByTestId('trial-confirm-entry')).toBeDisabled();expect(await page.getByTestId('trial-review-identity').innerText()).toBe(text);
 await other.getByRole('button',{name:'设置',exact:true}).click();other.once('dialog',d=>d.accept());await other.getByTestId('restart').click();await expect(other.getByTestId('help')).toBeVisible();
 await expect.poll(async()=>(await snapshot(page)).core.runId).toBe((await snapshot(other)).core.runId);const before=await snapshot(other);await page.getByTestId('trial-confirm-entry').evaluate((button:HTMLButtonElement)=>button.disabled=false);await page.getByTestId('trial-confirm-entry').click();expect(await snapshot(other)).toEqual(before);await page.getByTestId('trial-entry-cancel').click();await other.close();
});

test('two successful entries and complete preparation restores preserve the same assets and facts on mobile',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await importFixture(page,detailedTrialScenario().game);const before=await snapshot(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByTestId('trial-preparation').screenshot({path:info.outputPath('trial-preparation-mobile.png')});
 for(let attempt=0;attempt<2;attempt++){
  await review(page);await action(page,'trial-confirm-entry');await expect(question(page)).toBeVisible();
  await page.getByRole('button',{name:'设置',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByTestId('restore-checkpoint').click();await expect(page.getByTestId('trial-preparation')).toBeVisible();
  const restored=await snapshot(page);expect(normalize(restored)).toEqual(normalize(before));expect(restored.core.inventory.ascension_seal).toBe(2);await expect(page.getByTestId('trial-existing-checkpoint')).toContainText('渡劫前检查点');
 }
});

test('an imported question never claims a preparation checkpoint that the import did not contain',async({page})=>{
 const before=trialPreparationRunner().ledger.game,fixture=advance(before,{type:'START_TRIAL',commandId:'fixture-question',runId:before.core.runId,expectedRevision:before.core.revision});
 await importFixture(page,fixture);await expect(question(page)).toBeVisible();await expect(page.getByTestId('trial-checkpoint-unavailable')).toBeVisible();await expect(page.getByTestId('trial-checkpoint-committed')).toHaveCount(0);expect(await cp(page)).toBeUndefined();
});

test('an earlier failed navigation cannot be retried as the reviewed trial entry or discarded by cancelling it',async({page})=>{
 await importFixture(page,detailedTrialScenario().game);const before=await snapshot(page);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;(globalThis as any).restoreTrialPut=()=>{IDBObjectStore.prototype.put=put;};IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-state'&&key==='current')throw new DOMException('travel quota','QuotaExceededError');return put.call(this,value,key!);};});
 await page.getByTestId('trial-go-rest').click();await expect(page.getByTestId('retry')).toBeVisible();expect(await snapshot(page)).toEqual(before);
 await review(page);await expect(page.getByTestId('trial-entry-retry')).toHaveCount(0);await page.getByTestId('trial-entry-cancel').click();await expect(page.getByTestId('retry')).toBeVisible();
 await page.evaluate(()=>(globalThis as any).restoreTrialPut());await action(page,'retry');const after=await snapshot(page);expect(after.core.world.location).toBe('cave');expect(after.core.inventory).toEqual(before.core.inventory);expect(after.trial).toBeNull();await expect(question(page)).toHaveCount(0);
});
