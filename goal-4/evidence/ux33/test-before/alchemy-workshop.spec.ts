import {selectAlchemyRecipe} from './stage-support';
import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {advance} from '../../src/full/engine.ts';
import * as C from '../../src/full/content.ts';
import {snapshot,activitySnapshot as activity,useJourneyClock,finishJourneyClock,revealPaged} from './support';
import {openProductionIntent,openProductionCatalogue,selectRelic} from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',error=>rows.push(error.message));});
test.afterEach(async({page})=>{
 await page.evaluate(()=>{(globalThis as any).releaseAlchemyTransaction?.();(globalThis as any).restoreAlchemyPut?.();(globalThis as any).alchemyArrivalObserver?.disconnect();});
 expect(errors.get(page)).toEqual([]);
});

async function rawDatabase(page:Page){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{
 const request=indexedDB.open('chenyuan-playable-v1');request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,names=Array.from(db.objectStoreNames),tx=db.transaction(names,'readonly'),result:any={version:db.version,stores:names};
  for(const name of names){const cursor=tx.objectStore(name).openCursor(),rows:any[]=[];result[name]=rows;cursor.onsuccess=()=>{if(cursor.result){rows.push({key:cursor.result.key,value:cursor.result.value});cursor.result.continue();}};}
  tx.oncomplete=()=>{db.close();resolve(result);};tx.onabort=()=>{db.close();reject(tx.error);};
 };
}));}
async function fixture(page:Page,{virtual=true,forge=false}:{virtual?:boolean;forge?:boolean}={}){
 const d=driver('leave','sword');
 if(forge){d.realm();d.realm();d.resource('jade',3);d.resource('core',1);d.funds(160);}
 else{d.resource('herb',24);d.resource('dew',4);d.funds(60);}
 d.go('cave');if(virtual)await useJourneyClock(page);await page.goto('/');
 const input=page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled({timeout:15000});
 await input.setInputFiles({name:'lawful-alchemy-object-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d.game))});
 if(virtual)await finishJourneyClock(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 return snapshot(page);
}
async function openWorkshop(page:Page,id='healing'){
 await page.getByTestId('hub-forge').click();await expect(page.getByTestId('recipe-catalogue')).toBeVisible();
 await selectAlchemyRecipe(page,id);
 await expect(page.getByTestId('alchemy-workshop')).toBeVisible();
}
async function openSettings(page:Page){const dialog=page.getByTestId('alchemy-settings');if(!await dialog.isVisible())await page.getByTestId('alchemy-settings-open').click();await expect(dialog).toBeVisible();}
async function closeSettings(page:Page){if(await page.getByTestId('alchemy-settings').isVisible())await page.getByTestId('alchemy-settings-close').click();}
async function setCycles(page:Page,n=1){await openProductionIntent(page);await page.getByLabel('炼丹炉次',{exact:true}).selectOption(String(n));await closeSettings(page);}
async function limits(page:Page,stones:number,months:number){
 await page.getByTestId('production-limits').click();await expect(page.locator('dialog[open]')).toHaveCount(1);
 await page.getByLabel('累计生产灵石预算').fill(String(stones));await page.getByLabel('累计生产游戏月预算').fill(String(months));
 await page.getByTestId('production-apply-limits').click();
}
async function begin(page:Page,virtual=true){
 await closeSettings(page);await page.getByTestId('production-start').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');
 const a=await activity(page);await expect(page.locator('[data-testid=training-activity][data-generation="'+a.generation+'"][data-running=true]')).toBeVisible();
 if(virtual)await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs/1000).toFixed(1)+' 秒');
 return a;
}
async function painted(page:Page){await page.clock.runFor(50);}
async function unlit(page:Page){for(const node of await page.getByTestId('alchemy-furnace').all()){await expect(node).toHaveAttribute('data-burning','false');for(const fx of await node.locator('.alchemy-flame,.alchemy-smoke').all()){await expect(fx).toHaveCSS('opacity','0');await expect(fx).toHaveCSS('animation-name','none');}}}
async function noArrival(page:Page){await expect(page.getByTestId('alchemy-arrival')).toHaveCount(0);}
const amount=(n:number)=>new RegExp('(?:^|\\D)'+n+'(?:\\D|$)');
async function stock(page:Page,n:number,total:number){await expect(page.getByTestId('alchemy-product-stock')).toHaveText(amount(n));await expect(page.getByTestId('alchemy-product-total')).toHaveText(amount(total));}
async function observeArrivals(page:Page){await page.evaluate(()=>{
 const seen=new WeakMap<Element,string>(),rows:any[]=[];
 const collect=(root:Node)=>{if(!(root instanceof Element))return;const nodes=root.matches('[data-testid=alchemy-arrival]')?[root]:Array.from(root.querySelectorAll('[data-testid=alchemy-arrival]'));
  for(const node of nodes){const sequence=node.getAttribute('data-sequence')??'';if(sequence&&seen.get(node)!==sequence){seen.set(node,sequence);rows.push({sequence,text:node.textContent,at:performance.now()});}}
 };
 const observer=new MutationObserver(changes=>{for(const change of changes){if(change.type==='attributes')collect(change.target);else for(const node of change.addedNodes)collect(node);}});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-sequence']});
 (globalThis as any).alchemyArrivalObserver=observer;(globalThis as any).alchemyArrivals=rows;
});}
async function arrivals(page:Page){return page.evaluate(()=>(globalThis as any).alchemyArrivals??[]);}
async function frame(page:Page,info:TestInfo,name:string){
 const bounds=await page.evaluate(()=>{
  const active=document.querySelector('dialog[open]'),navigation=document.getElementById('primary-navigation')!,nav=navigation.getBoundingClientRect();
  const rows=Array.from(document.querySelectorAll<HTMLElement>('[data-testid=alchemy-workshop] button,#primary-navigation button')).filter(el=>el.getClientRects().length&&(!active||active.contains(el))).map(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:el.textContent,visible:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=(navigation.contains(el)?innerHeight:nav.top),height:r.height,hit:el.matches(':disabled')||!!hit&&(hit===el||el.contains(hit))};});
  return{rows,height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,viewport:{width:innerWidth,height:innerHeight},inner:active?{height:active.scrollHeight,client:active.clientHeight}:null};
 });
 for(const row of bounds.rows){expect(row.visible,row.text??'').toBe(true);expect(row.height,row.text??'').toBeGreaterThanOrEqual(44);expect(row.hit,row.text??'').toBe(true);}
 expect(bounds.height).toBeLessThanOrEqual(bounds.viewport.height);expect(bounds.width).toBeLessThanOrEqual(bounds.viewport.width);if(bounds.inner)expect(bounds.inner.height).toBeLessThanOrEqual(bounds.inner.client);
 await page.screenshot({path:info.outputPath(name+'.png')});
}

test('the real alchemy objects keep all seven recipes, honest gates and complete material quantities in one fixed desktop stage',async({page},info)=>{
 const before=await fixture(page),raw=await rawDatabase(page);await openWorkshop(page);await unlit(page);await noArrival(page);
 await expect(page.getByTestId('alchemy-workshop').locator('input[type=number]:visible')).toHaveCount(0);
 await expect(page.getByTestId('alchemy-workshop')).toContainText(/5\s*炉后停/);await expect(page.getByTestId('alchemy-workshop')).toContainText(/10\s*灵石\s*\/\s*5\s*月/);
 await expect(page.getByTestId('production-estimate')).toBeHidden();await expect(page.locator('#primary-navigation button')).toHaveCount(8);
 const objects=await page.evaluate(()=>['.alchemy-heading','[data-testid=alchemy-furnace]','[data-testid=alchemy-product-tray]'].map(selector=>{const r=document.querySelector(selector)!.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height};}));
 await expect(page.locator('.alchemy-recipe-book')).not.toBeVisible();expect(objects[2].right).toBeLessThanOrEqual(objects[1].left);expect(objects[1].width).toBeGreaterThan(180);expect(objects[1].height).toBeGreaterThan(180);
 const picture=page.getByTestId('alchemy-furnace').locator('[data-art-path]').first();await expect(picture).toHaveAttribute('data-art-state','ready');await expect(picture).not.toHaveAttribute('data-art-path','art/v2/catalogue/alchemy-v1.webp');
 await openProductionCatalogue(page);await page.getByLabel('显示后续生产目录').check();
 for(const[id,r]of Object.entries(C.recipes)){
  await selectAlchemyRecipe(page,id);await expect(page.getByTestId('craft-'+id)).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('alchemy-workshop').locator('.alchemy-heading')).toContainText(r.name);await stock(page,before.core.inventory[r.output],0);await unlit(page);
  for(const[item,n]of Object.entries(r.inputs)){const node=page.getByTestId('production-source-'+item);await expect(node).toContainText('每炉 '+n);await expect(node).toContainText('持有 '+before.core.inventory[item]);await expect(node).toContainText('保留 0');}
  if(id==='golden'){await frame(page,info,'alchemy-four-materials');const areas=await page.evaluate(()=>{const end=document.querySelector('.alchemy-authorization')!.getBoundingClientRect().top;return [...document.querySelectorAll('.alchemy-materials button')].map(el=>{const r=el.getBoundingClientRect();return {bottom:r.bottom,end,text:[...el.querySelectorAll('strong,span,small')].every(n=>{const t=n.getBoundingClientRect();return t.top>=r.top&&t.bottom<=r.bottom&&t.left>=r.left&&t.right<=r.right;})};});});for(const a of areas){expect(a.bottom).toBeLessThan(a.end);expect(a.text).toBe(true);}}
  if(C.rank(r.min)>C.rank(before.core.player.realm)){await expect(page.getByTestId('production-start')).toBeDisabled();await expect(page.getByTestId('alchemy-workshop')).toContainText(C.realms[r.min].name);}
 }
 expect(await snapshot(page)).toEqual(before);expect(await rawDatabase(page)).toEqual(raw);await frame(page,info,'alchemy-seven-recipes');
});

test('complete furnace settings and readonly material/product sources preserve a finite draft without starting travel or production',async({page},info)=>{
 const before=await fixture(page),raw=await rawDatabase(page);await openWorkshop(page);await openProductionIntent(page);
 await page.getByLabel('炼丹炉次',{exact:true}).selectOption('target');await page.getByLabel('成品目标库存').fill(String(before.core.inventory.healing_pill+2));await page.getByLabel('目标最多炉次').fill('5');
 await page.getByTestId('production-limits').click();await expect(page.locator('dialog[open]')).toHaveCount(1);
 for(const label of ['累计生产灵石预算','生产灵石保留量','累计生产游戏月预算','生产余寿保留量'])await expect(page.getByLabel(label,{exact:true})).toBeVisible();await expect(page.getByLabel('凝气草保留')).toBeVisible();
 await page.getByLabel('累计生产灵石预算').fill('7');await page.getByLabel('生产灵石保留量').fill('3');await page.getByLabel('累计生产游戏月预算').fill('4');await page.getByLabel('生产余寿保留量').fill('2');await page.getByLabel('凝气草保留').fill('6');await page.getByTestId('production-apply-limits').click();
 await expect(page.getByTestId('alchemy-settings')).toBeVisible();await expect(page.getByTestId('production-estimate')).toContainText('预计 2 炉');await frame(page,info,'alchemy-complete-settings');await closeSettings(page);
 for(const id of ['production-source-herb','alchemy-product-source']){await page.getByTestId(id).click();await expect(page.getByTestId('goal-panel')).toBeVisible();expect(await snapshot(page)).toEqual(before);expect(await rawDatabase(page)).toEqual(raw);await page.getByTestId('hub-close').click();await expect(page.getByTestId('alchemy-workshop')).toBeVisible();await expect(page.getByTestId('craft-healing')).toHaveAttribute('aria-pressed','true');}
 await openProductionIntent(page);await expect(page.getByLabel('炼丹炉次',{exact:true})).toHaveValue('target');await expect(page.getByLabel('成品目标库存')).toHaveValue(String(before.core.inventory.healing_pill+2));await expect(page.getByLabel('目标最多炉次')).toHaveValue('5');await closeSettings(page);
 await page.getByTestId('production-limits').click();await expect(page.getByLabel('累计生产灵石预算')).toHaveValue('7');await expect(page.getByLabel('生产灵石保留量')).toHaveValue('3');await expect(page.getByLabel('累计生产游戏月预算')).toHaveValue('4');await expect(page.getByLabel('生产余寿保留量')).toHaveValue('2');await expect(page.getByLabel('凝气草保留')).toHaveValue('6');await page.getByLabel('累计生产灵石预算').fill('1');await page.getByRole('button',{name:'取消调整',exact:true}).click();
 await page.getByTestId('production-limits').click();await expect(page.getByLabel('累计生产灵石预算')).toHaveValue('7');await page.getByRole('button',{name:'取消调整',exact:true}).click();expect(await snapshot(page)).toEqual(before);expect(await activity(page)).toBeNull();expect(await rawDatabase(page)).toEqual(raw);
});

test('furnace phases follow the real cycle and only two atomic saved pills arrive once before the cumulative budget stops',async({page},info)=>{
 const before=await fixture(page);await openWorkshop(page);await limits(page,4,2);await observeArrivals(page);const first=await begin(page);
 expect(first.plan.maxCycles).toBe(5);expect(first.plan.stoneBudget).toBe(4);expect(first.plan.monthBudget).toBe(2);await expect(page.getByTestId('alchemy-workshop')).toHaveAttribute('data-state','heating');await expect(page.getByTestId('alchemy-furnace')).toHaveAttribute('data-burning','true');
 await page.clock.fastForward(6000);await expect(page.getByTestId('alchemy-workshop')).toHaveAttribute('data-state','refining');await page.clock.fastForward(3000);await expect(page.getByTestId('alchemy-workshop')).toHaveAttribute('data-state','refining');await frame(page,info,'alchemy-refining');await page.clock.fastForward(18000);await expect(page.getByTestId('alchemy-workshop')).toHaveAttribute('data-state','coalescing');await page.clock.fastForward(2999);expect(await snapshot(page)).toEqual(before);await stock(page,before.core.inventory.healing_pill,0);await noArrival(page);
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('chenyuan-playable-v1');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('full-state','readwrite');let holding=true;(globalThis as any).releaseAlchemyTransaction=()=>holding=false;function keep(){tx.objectStore('full-state').get('current').onsuccess=()=>{if(holding)keep();};}keep();tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();resolve();};}));
 try{await page.clock.fastForward(1);await expect(page.getByTestId('save-status')).toHaveText('保存中');await expect(page.getByTestId('alchemy-workshop')).toHaveAttribute('data-state','saving');await stock(page,before.core.inventory.healing_pill,0);await noArrival(page);await unlit(page);await frame(page,info,'alchemy-saving-no-pill');}
 finally{await page.evaluate(()=>(globalThis as any).releaseAlchemyTransaction());}
 await expect.poll(async()=>(await activity(page)).completedCycles).toBe(1);await painted(page);const middle=await snapshot(page),second=await activity(page);expect(middle).toEqual(advance(before,first.nextCommand));await stock(page,before.core.inventory.healing_pill+1,1);await expect(page.getByTestId('alchemy-arrival')).toBeVisible();const sequence=Number(await page.getByTestId('alchemy-arrival').getAttribute('data-sequence'));expect(sequence).toBeGreaterThan(0);expect((await arrivals(page)).length).toBe(1);await frame(page,info,'alchemy-trusted-arrival');
 await page.clock.fastForward(second.cycleMs);await expect.poll(async()=>(await activity(page)).completedCycles).toBe(2);await painted(page);const after=await snapshot(page),ended=await activity(page);expect(after).toEqual(advance(middle,second.nextCommand));expect(ended.status).toBe('stopped');expect(ended.stopReason.code).toBe('ACTIVITY_BUDGET');expect(ended.spentItems).toEqual({herb:4});expect(ended.gainedItems).toEqual({healing_pill:2});expect(ended.spentStones).toBe(4);expect(ended.spentMonths).toBe(2);await stock(page,before.core.inventory.healing_pill+2,2);await unlit(page);expect(Number(await page.getByTestId('alchemy-arrival').getAttribute('data-sequence'))).toBeGreaterThan(sequence);expect((await arrivals(page)).length).toBe(2);
 await page.clock.fastForward(120000);expect(await snapshot(page)).toEqual(after);expect((await activity(page)).completedCycles).toBe(2);expect((await arrivals(page)).length).toBe(2);
});

test('hidden views, pause and a different selected recipe withdraw fire and cannot replay an already saved pill',async({page})=>{
 const before=await fixture(page);await openWorkshop(page);await observeArrivals(page);const first=await begin(page);await page.clock.fastForward(10000);await page.getByTestId('tab-1').click();await expect(page.getByTestId('alchemy-workshop')).toBeHidden();await unlit(page);await page.clock.fastForward(20000);await expect.poll(async()=>(await activity(page)).completedCycles).toBe(1);const middle=await snapshot(page);expect(middle).toEqual(advance(before,first.nextCommand));expect((await arrivals(page)).length).toBe(0);
 await openWorkshop(page);await noArrival(page);await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');await expect(page.getByTestId('alchemy-workshop')).toHaveAttribute('data-state','paused');await unlit(page);await page.clock.fastForward(600000);expect(await snapshot(page)).toEqual(middle);
 await page.getByTestId('training-resume').click();const resumed=await activity(page);await expect(page.locator('[data-testid=training-activity][data-generation="'+resumed.generation+'"][data-running=true]')).toBeVisible();await expect(page.getByTestId('training-countdown')).toHaveText('30.0 秒');await selectAlchemyRecipe(page,'spirit');await unlit(page);const spiritStock=middle.core.inventory.spirit_pill;await stock(page,spiritStock,0);
 await page.clock.fastForward(30000);await expect.poll(async()=>(await activity(page)).completedCycles).toBe(2);await painted(page);const after=await snapshot(page);expect(after).toEqual(advance(middle,resumed.nextCommand));await noArrival(page);await stock(page,spiritStock,0);await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');await selectAlchemyRecipe(page,'healing');await noArrival(page);await stock(page,before.core.inventory.healing_pill+2,2);expect((await arrivals(page)).length).toBe(0);
});

test('a quota failure keeps the furnace cold and original-command retry saves one pill with one arrival',async({page},info)=>{
 const before=await fixture(page);await openWorkshop(page);await setCycles(page);await observeArrivals(page);const started=await begin(page),raw=await rawDatabase(page);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;(globalThis as any).restoreAlchemyPut=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-state'&&key==='current'){(globalThis as any).restoreAlchemyPut();throw new DOMException('alchemy fixture quota','QuotaExceededError');}return put.call(this,value,key!);};});
 await page.clock.fastForward(30000);await expect(page.getByTestId('error')).toContainText('存储空间不足');await unlit(page);await noArrival(page);await stock(page,before.core.inventory.healing_pill,0);expect(await snapshot(page)).toEqual(before);expect(await rawDatabase(page)).toEqual(raw);expect((await activity(page)).nextCommand).toEqual(started.nextCommand);
 await page.getByTestId('training-retry').click();await expect.poll(async()=>(await activity(page)).completedCycles).toBe(1);await painted(page);const after=await snapshot(page),db=await rawDatabase(page);expect(after).toEqual(advance(before,started.nextCommand));await stock(page,before.core.inventory.healing_pill+1,1);await expect(page.getByTestId('alchemy-arrival')).toBeVisible();expect((await arrivals(page)).length).toBe(1);expect(db['full-receipts'].filter((row:any)=>row.key===started.runId+':'+started.nextCommand.commandId)).toHaveLength(1);await frame(page,info,'alchemy-retried-once');
 await page.clock.fastForward(120000);expect(await snapshot(page)).toEqual(after);expect((await arrivals(page)).length).toBe(1);
});

test('refresh, explicit continuation and saved receipt pages never animate an old completed furnace as a new reward',async({page})=>{
 const before=await fixture(page);await openWorkshop(page);await setCycles(page);const started=await begin(page);await page.clock.fastForward(10000);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await page.getByTestId('training-settings').click();await expect(page.getByTestId('alchemy-workshop')).toBeVisible();await unlit(page);await noArrival(page);await page.clock.fastForward(86400000);expect(await snapshot(page)).toEqual(before);expect((await activity(page)).completedCycles).toBe(0);
 await page.getByTestId('training-resume').click();const continued=await activity(page);expect(continued.generation).toBeGreaterThan(started.generation);await expect(page.locator('[data-testid=training-activity][data-generation="'+continued.generation+'"][data-running=true]')).toBeVisible();await expect(page.getByTestId('training-countdown')).toHaveText('30.0 秒');await page.clock.fastForward(29999);expect(await snapshot(page)).toEqual(before);await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page)).status).toBe('stopped');await painted(page);const after=await snapshot(page);expect(after).toEqual(advance(before,continued.nextCommand));
 await page.getByTestId('hub-receipt').click();await page.getByTestId('activity-history-open').click();await expect(page.getByTestId('activity-history')).toBeVisible();await expect(page.getByTestId('activity-history-row')).toHaveCount(1);await page.getByTestId('hub-close').click();await expect(page.getByTestId('alchemy-workshop')).toBeVisible();await noArrival(page);const raw=await rawDatabase(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await openWorkshop(page);await noArrival(page);await unlit(page);await stock(page,before.core.inventory.healing_pill+1,1);expect(await snapshot(page)).toEqual(after);expect(await rawDatabase(page)).toEqual(raw);
});

test('a different native page may craft but cannot light this page furnace or replay its saved product arrival',async({page,context})=>{
 const before=await fixture(page);await openWorkshop(page);await observeArrivals(page);const other=await context.newPage();other.on('pageerror',error=>errors.get(page)!.push('other page: '+error.message));
 try{await useJourneyClock(other);await other.goto('/');await expect(other.getByTestId('save-status')).toHaveText('已保存');await openWorkshop(other);await setCycles(other);const started=await begin(other);await expect.poll(async()=>(await activity(page)).ownerId).toBe(started.ownerId);await unlit(page);await noArrival(page);expect(await snapshot(page)).toEqual(before);
  await other.clock.fastForward(30000);await expect.poll(async()=>(await activity(other)).status).toBe('stopped');await other.clock.runFor(50);await expect(page.getByTestId('alchemy-product-stock')).toHaveText(amount(before.core.inventory.healing_pill+1));await unlit(page);await noArrival(page);expect((await arrivals(page)).length).toBe(0);expect(await snapshot(page)).toEqual(advance(before,started.nextCommand));
 }finally{await other.close();}
});

test('an invalid furnace image keeps real recipe, material and open-furnace controls playable',async({page},info)=>{
 await page.route('**/art/**/*.webp',route=>route.fulfill({status:200,contentType:'image/webp',body:'invalid alchemy raster fixture'}));
 const before=await fixture(page);await openWorkshop(page);await expect(page.getByTestId('alchemy-furnace').locator('[data-art-path]').first()).toHaveAttribute('data-art-state','failed');await setCycles(page);await frame(page,info,'alchemy-native-image-fallback');const started=await begin(page);await page.clock.fastForward(30000);await expect.poll(async()=>(await activity(page)).status).toBe('stopped');expect(await snapshot(page)).toEqual(advance(before,started.nextCommand));await stock(page,before.core.inventory.healing_pill+1,1);
});

for(const kind of ['system','preference'] as const)test(`${kind} reduced motion keeps the real furnace states and saved product without animated flame or smoke`,async({page},info)=>{
 if(kind==='system')await page.emulateMedia({reducedMotion:'reduce'});const before=await fixture(page);
 if(kind==='preference'){await page.getByTestId('game-settings').click();await page.getByTestId('reduce-effects').check();await expect(page.locator('.app-shell')).toHaveClass(/hub-reduced/);await page.getByRole('button',{name:'关闭设置',exact:true}).click();}
 await openWorkshop(page);await setCycles(page);const started=await begin(page);await expect(page.getByTestId('production-fire')).toContainText('温炉');
 const animations=await page.getByTestId('alchemy-furnace').locator('.alchemy-flame,.alchemy-flame i,.alchemy-smoke,.alchemy-smoke i').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).animationName));expect(animations.every(name=>name==='none')).toBe(true);
 await page.clock.fastForward(30000);await expect.poll(async()=>(await activity(page)).status).toBe('stopped');await painted(page);expect(await snapshot(page)).toEqual(advance(before,started.nextCommand));await stock(page,before.core.inventory.healing_pill+1,1);await unlit(page);
 const arrival=page.getByTestId('alchemy-arrival');if(await arrival.isVisible())expect(await arrival.evaluate(node=>getComputedStyle(node).animationName)).toBe('none');else await expect(arrival).toBeHidden();if(kind==='system')await frame(page,info,'alchemy-reduced-static-result');
});

test('one real thirty-second furnace saves actual inputs and product before presenting the completed pill',async({page},info)=>{
 const before=await fixture(page,{virtual:false});await openWorkshop(page);await setCycles(page);const began=await page.evaluate(()=>performance.now()),started=await begin(page,false),first=parseFloat(await page.getByTestId('training-countdown').innerText());await page.waitForTimeout(500);expect(parseFloat(await page.getByTestId('training-countdown').innerText())).toBeLessThan(first);expect(await snapshot(page)).toEqual(before);await stock(page,before.core.inventory.healing_pill,0);await noArrival(page);
 await expect.poll(async()=>(await activity(page))?.status,{timeout:35000}).toBe('stopped');const ended=await page.evaluate(()=>({monotonic:performance.now(),wall:Date.now()}));expect(ended.monotonic-began).toBeGreaterThanOrEqual(30000);expect(ended.wall).toBeGreaterThanOrEqual(started.dueAt);expect(await snapshot(page)).toEqual(advance(before,started.nextCommand));await stock(page,before.core.inventory.healing_pill+1,1);await unlit(page);await frame(page,info,'alchemy-real-thirty-second-result');
 await info.attach('real-alchemy-cycle',{body:JSON.stringify({clock:'real Chromium monotonic and wall clock; no Playwright clock',began,ended,activity:started,minimumMs:30000}),contentType:'application/json'});
});

test('the forge retains its original one-cycle craft and explicit equip boundary outside the new alchemy workshop',async({page})=>{
 const before=await fixture(page,{forge:true});await page.getByTestId('hub-relics').click();await selectRelic(page,"frost_sword");await expect(page.getByTestId('forging-planner')).toBeVisible();await expect(page.getByTestId('alchemy-workshop')).toHaveCount(0);const started=await begin(page);expect(started.version).toBe(4);await page.clock.fastForward(59999);expect(await snapshot(page)).toEqual(before);await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page)).status).toBe('stopped');const after=await snapshot(page);expect(after).toEqual(advance(before,started.nextCommand));expect(after.ownedRelics).toContain('frost_sword');expect(after.loadout).toEqual(before.loadout);await page.getByTestId('equip-relic-frost_sword').click();await expect(page.getByTestId('configuration-dialog')).toBeVisible();expect(await snapshot(page)).toEqual(after);await page.getByTestId('configuration-cancel').click();expect(await snapshot(page)).toEqual(after);
});
