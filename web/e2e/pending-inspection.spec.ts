import {test,expect} from '@playwright/test';
import {start,action,snapshot,travel} from './support';
import {npcFixture} from './fixtures';
import {advance} from '../../src/full/engine.ts';
test.use({actionTimeout:8000,navigationTimeout:15000});

for(const phase of ['opening','event','battle']as const)test(`a pending ${phase} permits readonly inventory and relationships then resumes the exact state`,async({page})=>{
  if(phase==='opening'){
    await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();await expect(page.getByTestId('help')).toBeEnabled();
  }else{
    await start(page);
    if(phase==='battle'){
      await action(page,'school-sword');await travel(page,'wilderness');await action(page,'encounter-wolf');
    }else{
      await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.getByTestId('import')).toBeEnabled();page.once('dialog',d=>d.accept());
      await page.getByTestId('import').setInputFiles({name:'event.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(npcFixture()))});
      await expect(page.getByTestId('settings-save-status')).toHaveText('已保存');await page.getByRole('button',{name:'关闭设置'}).click();await expect(page.getByTestId('event-title')).toBeVisible();
    }
  }
  await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);
  await page.getByTestId('tab-2').click();await expect(page.getByTestId('item-healing_pill')).toBeVisible();
  await expect(page.getByTestId('pending-inspection')).toContainText('查看不会');
  for(const button of await page.getByRole('button',{name:'服用',exact:true}).all())await expect(button).toBeDisabled();
  expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('tab-3').click();await expect(page.getByTestId('show-life')).toBeVisible();await expect(page.getByTestId('relationships')).toHaveCount(1);
  await page.getByTestId('show-life').click();await expect(page.getByTestId('life-title')).toBeVisible();expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('resume-encounter').click();await expect(page.getByTestId(phase==='opening'?'help':phase==='event'?'event-title':'round')).toBeVisible();
  expect(await snapshot(page)).toEqual(before);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(before);
});

test('imported name and journal markup remain inert text with no script or resource execution',async({page})=>{
  const unwanted:string[]=[],errors:string[]=[];page.on('request',r=>{if(r.url().includes('/unsafe-marker'))unwanted.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await start(page);const game=await snapshot(page),payload='<img src="/unsafe-marker" onerror="window.__unsafeRendered=1">';game.core.player.name='<b>道号</b>';game.journal=[payload];
  await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.getByTestId('import')).toBeEnabled();page.once('dialog',d=>d.accept());
  await page.getByTestId('import').setInputFiles({name:'text.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});
  await expect(page.getByTestId('character-panel').getByRole('heading',{name:'<b>道号</b>',exact:true})).toHaveCount(1);await page.getByRole('button',{name:'关闭设置'}).click();
  await expect(page.getByText(payload,{exact:true})).toHaveCount(2);await expect(page.getByTestId('feedback').getByText(payload,{exact:true})).toBeVisible();await expect(page.locator('.recent-action').getByText(payload,{exact:true})).toBeVisible();await expect(page.locator('img[src="/unsafe-marker"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__unsafeRendered)).toBeUndefined();expect(unwanted).toEqual([]);expect(errors).toEqual([]);
});

test('starting an event from relationships exposes its choices and keeps them available while reading people',async({page})=>{
  await start(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);
  await page.getByTestId('tab-3').click();await action(page,'event-local_rain');await expect(page.getByTestId('event-title')).toHaveText('檐下听雨');
  const entered=await snapshot(page);expect(entered).toEqual(advance(before,{type:'EVENT',event:'local_rain',commandId:'expected-event-entry',runId:before.core.runId,expectedRevision:before.core.revision}));
  await page.getByTestId('tab-3').click();await expect(page.getByTestId('relationships')).toHaveCount(1);await page.getByTestId('show-life').click();
  await expect(page.getByTestId('life-title')).toBeVisible();expect(await snapshot(page)).toEqual(entered);await expect(page.getByTestId('decide-plan')).toBeVisible();
  await action(page,'decide-plan');expect(await snapshot(page)).toEqual(advance(entered,{type:'DECIDE',option:'plan',commandId:'expected-event-choice',runId:entered.core.runId,expectedRevision:entered.core.revision}));
});

test('a newer inventory selection survives event commit metadata without stealing focus or changing the event',async({page})=>{
  await start(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);await page.getByTestId('tab-3').click();
  await page.evaluate(async()=>{
    const req=indexedDB.open('chenyuan-playable-v1'),db=await new Promise<IDBDatabase>((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const put=IDBObjectStore.prototype.put;let armed=true,released=false;(window as any).__eventHoldStarted=false;(window as any).__releaseEventHold=()=>{released=true;IDBObjectStore.prototype.put=put;};
    IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){const result=put.call(this,value,key!);if(armed&&this.name==='full-state'&&key==='current'&&value.core.activeEvent?.id==='local_rain'){armed=false;this.transaction.addEventListener('complete',()=>{const tx=db.transaction('full-state','readwrite'),store=tx.objectStore('full-state');(window as any).__eventHoldStarted=true;const keep=()=>{const read=store.get('current');read.onsuccess=()=>{if(!released)keep();};};tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();keep();});}return result;};
  });
  try{
    await page.getByTestId('event-local_rain').click();await expect.poll(()=>page.evaluate(()=>(window as any).__eventHoldStarted)).toBe(true);await expect(page.getByTestId('save-status')).toHaveText('保存中');
    await page.getByTestId('tab-2').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('item-healing_pill')).toBeVisible();await expect(page.getByTestId('tab-2')).toBeFocused();
    await page.evaluate(()=>(window as any).__releaseEventHold());await expect(page.getByTestId('save-status')).toHaveText('已保存');
    await expect(page.getByTestId('tab-2')).toHaveAttribute('aria-current','page');await expect(page.getByTestId('tab-2')).toBeFocused();
    expect(await snapshot(page)).toEqual(advance(before,{type:'EVENT',event:'local_rain',commandId:'expected-held-entry',runId:before.core.runId,expectedRevision:before.core.revision}));
  }finally{await page.evaluate(()=>(window as any).__releaseEventHold?.());}
});
