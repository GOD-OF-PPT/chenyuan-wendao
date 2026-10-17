import {test,expect} from '@playwright/test';
import {advance} from '../../src/full/engine.ts';
import {start,travel,snapshot} from './support';
test.use({actionTimeout:8000,navigationTimeout:15000});
test('a completed travel cannot overwrite a newer tab choice while save metadata settles',async({page})=>{
 await start(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');await travel(page,'market');await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);
 await page.evaluate(async()=>{
  const request=indexedDB.open('chenyuan-playable-v1'),db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const put=IDBObjectStore.prototype.put;let armed=true,released=false;(globalThis as any).navHoldStarted=false;(globalThis as any).releaseNavHold=()=>{released=true;IDBObjectStore.prototype.put=put;};
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){const result=put.call(this,value,key!);if(armed&&this.name==='full-state'&&key==='current'&&value.core.world.location==='cave'){armed=false;this.transaction.addEventListener('complete',()=>{const tx=db.transaction('full-state','readwrite'),store=tx.objectStore('full-state');(globalThis as any).navHoldStarted=true;const keep=()=>{const read=store.get('current');read.onsuccess=()=>{if(!released)keep();};};tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();keep();});}return result;};
 });
 try{
  await page.getByTestId('tab-1').click();await page.getByTestId('travel-cave').click();await expect.poll(()=>page.evaluate(()=>(globalThis as any).navHoldStarted)).toBe(true);await expect(page.getByTestId('save-status')).toHaveText('保存中');
  await page.getByTestId('tab-2').click();await expect(page.getByTestId('tab-2')).toHaveAttribute('aria-current','page');await page.evaluate(()=>(globalThis as any).releaseNavHold());await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect(page.getByTestId('tab-2')).toHaveAttribute('aria-current','page');
  const expected=advance(before,{type:'TRAVEL',location:'cave',commandId:'expected-nav',runId:before.core.runId,expectedRevision:before.core.revision});expect(await snapshot(page)).toEqual(expected);
 }finally{await page.evaluate(()=>(globalThis as any).releaseNavHold?.());}
});
