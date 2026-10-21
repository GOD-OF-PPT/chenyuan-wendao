import {test,expect,type Page} from '@playwright/test';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const localName='chenyuan-local-experience-v1';
async function localState(page:Page){return page.evaluate(async name=>new Promise<any>((resolve,reject)=>{const request=indexedDB.open(name);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['meta','events'],'readonly'),meta=tx.objectStore('meta').get('state'),rows=tx.objectStore('events').getAll();tx.oncomplete=()=>{db.close();resolve({meta:meta.result,rows:rows.result});};tx.onabort=()=>{db.close();reject(tx.error);};};}),localName);}
async function panel(page:Page){await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByTestId('local-records-panel').locator('summary').click();}

test('delayed optional settings end with a truthful temporary choice and cannot overwrite it on late native success',async({page},info)=>{
 await page.addInitScript(name=>{
  const nativeOpen=indexedDB.open.bind(indexedDB);let trapped=false;
  indexedDB.open=function(database:string,version?:number){const request=nativeOpen(database,version);if(database===name&&!trapped){trapped=true;const descriptor=Object.getOwnPropertyDescriptor(IDBRequest.prototype,'onsuccess')!;Object.defineProperty(request,'onsuccess',{configurable:true,set(handler){descriptor.set!.call(request,function(event:Event){(window as any).__releaseLocalOpen=()=>handler.call(request,event);(window as any).__localOpenEntered=true;});},get(){return descriptor.get!.call(request);}});}return request;};
 },localName);
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__localOpenEntered===true)).toBe(true);await expect(page.getByTestId('game-loading')).toContainText('显示设置');await page.screenshot({path:info.outputPath('local-loading-wait.png')});
 await expect(page.getByRole('button',{name:'踏入仙途'})).toBeEnabled();await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
 const before=await localState(page);await panel(page);await expect(page.getByTestId('local-recording')).not.toBeChecked();await expect(page.getByTestId('local-data-status')).toContainText('未开启');await expect(page.getByTestId('local-record-count')).toContainText('未能读取');
 await page.getByTestId('reduce-effects').check();await expect(page.getByTestId('local-data-status')).toContainText('仅在本页');await page.screenshot({path:info.outputPath('local-loading-temporary.png')});
 await page.evaluate(()=>(window as any).__releaseLocalOpen());await expect(page.getByTestId('reduce-effects')).toBeChecked();await expect(page.getByTestId('local-recording')).not.toBeChecked();expect(await localState(page)).toEqual(before);
 await page.getByTestId('local-reconnect').click();await expect(page.getByTestId('local-data-status')).toContainText('临时');await expect(page.getByTestId('reduce-effects')).toBeChecked();await expect(page.getByTestId('local-recording')).not.toBeChecked();expect(await localState(page)).toEqual(before);await page.getByTestId('local-recording').check();await expect(page.getByTestId('local-data-status')).toContainText('已保存');await expect(page.getByTestId('reduce-effects')).toBeChecked();expect((await localState(page)).meta.preferences.reduceMotion).toBe(true);await expect(page.getByTestId('save-status')).toHaveText('尚无存档');await page.screenshot({path:info.outputPath('local-loading-reconnected.png')});
});

test('optional settings fallback never treats a denied Game database as a new usable save',async({page},info)=>{
 await page.addInitScript(()=>{const original=indexedDB.open.bind(indexedDB);indexedDB.open=function(name:string,version?:number){if(name==='chenyuan-playable-v1'||name==='chenyuan-local-experience-v1')throw new DOMException('not exported private cause','SecurityError');return original(name,version);};});
 await page.goto('/');await expect(page.getByTestId('error')).toContainText('不可访问');await expect(page.getByRole('button',{name:'踏入仙途'})).toBeDisabled();await expect(page.getByTestId('save-status')).not.toHaveText('已保存');await panel(page);await expect(page.getByTestId('local-recording')).not.toBeChecked();await expect(page.getByTestId('local-data-status')).toContainText('未开启');expect(await page.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name))).not.toContain('chenyuan-playable-v1');await page.screenshot({path:info.outputPath('game-loading-denied.png')});
});


test('a manual settings reread stays reachable after a normal connection and does not execute a Game',async({page})=>{
 await page.goto('/');await expect(page.getByTestId('save-status')).toHaveText('尚无存档');await panel(page);await expect(page.getByTestId('local-data-status')).toContainText('已保存');const before=await localState(page);await page.getByTestId('local-reconnect').click();await expect(page.getByTestId('local-data-status')).toContainText('已保存');expect(await localState(page)).toEqual(before);await expect(page.getByTestId('save-status')).toHaveText('尚无存档');await page.getByRole('button',{name:'关闭设置'}).click();await expect(page.getByRole('button',{name:'踏入仙途'})).toBeEnabled();
});
