import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { legalLifeBoundary } from '../../tests/life-route.mjs';
import { driver, fullRoute } from '../../tests/full-route.mjs';
import { causalRoute } from '../../tests/causal-route.mjs';
import { getLifeRecord } from '../../src/full/queries.ts';
import { action, snapshot, start } from './support';
test.use({ actionTimeout: 8000, navigationTimeout: 15000 });
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
async function importLifeFixture(page:Page,game:any,replace=false){
  if(replace){await page.getByRole('button',{name:'设置',exact:true}).click();page.once('dialog',d=>d.accept());}
  const input=replace?page.getByTestId('import'):page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled();
  await input.setInputFiles({name:'legal-life-boundary.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});
  await expect.poll(async()=>(await snapshot(page))?.core.player.realm).toBe(game.core.player.realm);
  await expect.poll(async()=>(await snapshot(page))?.core.world.elapsedMonths).toBe(game.core.world.elapsedMonths);
  if(replace)await page.getByRole('button',{name:'关闭设置'}).click();
}
async function openLife(page:Page){await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByTestId('settings-life').click();await expect(page.getByTestId('life-panel')).toBeVisible();}
async function openRetirement(page:Page){await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByTestId('settings-retire').click();await expect(page.getByTestId('life-confirmation')).toBeVisible();}
const normalize=(game:any)=>{const value=structuredClone(game);value.core.runId='<run>';value.core.revision=0;if(value.core.activeEvent)value.core.activeEvent.instanceId='<run>:'+value.core.activeEvent.id;return value;};

test('a normal eighteen-year-old can review, cancel, export and retire without being called lifespan-ended',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();await action(page,'leave');const before=await snapshot(page);
  await openRetirement(page);await expect(page.getByTestId('life-review')).toContainText('18岁');await page.getByTestId('life-cancel').click();expect(await snapshot(page)).toEqual(before);
  await openLife(page);await expect(page.getByTestId('life-title')).toHaveText('此生仍在继续');const read=await snapshot(page);expect(read).toEqual(before);
  await page.getByTestId('retire').click();await action(page,'life-confirm-end');await expect(page.getByTestId('life-confirmation')).not.toBeVisible();
  await expect(page.getByTestId('life-title')).toHaveText('尘世留名 · 主动归隐');const ended=await snapshot(page);expect(ended.ending).toBe('retired');expect(ended.core.player).toEqual(before.core.player);expect(ended.core.world).toEqual(before.core.world);
  await expect(page.getByTestId('life-restore')).toBeDisabled();await expect(page.getByTestId('life-recovery-note')).toContainText('没有检查点');
  const download=page.waitForEvent('download');await page.getByTestId('export-life').click();const file=await download;expect(file.suggestedFilename()).toBe('尘缘问道-生平.txt');const path=await file.path();expect(path).toBeTruthy();
  const text=readFileSync(path!,'utf8');expect(text).toContain('主动归隐');expect(text).not.toContain('寿元已尽');expect(text).toContain(ended.core.runId);expect(text).toContain('不含完整进度');
  await page.reload();await expect(page.getByTestId('life-title')).toHaveText('尘世留名 · 主动归隐');expect(await snapshot(page)).toEqual(ended);
});

test('normal qi retirement restores the whole real checkpoint twice without keeping later history',async({page})=>{
  await start(page);await action(page,'cultivate');
  const checkpoint=await page.evaluate(async()=>new Promise<any>((resolve,reject)=>{const r=indexedDB.open('chenyuan-playable-v1');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('full-state','readonly'),q=tx.objectStore('full-state').get('checkpoint');q.onsuccess=()=>resolve(q.result);tx.oncomplete=()=>db.close();};}));
  for(let repeat=0;repeat<2;repeat++){
    await openRetirement(page);await action(page,'life-confirm-end');await expect(page.getByTestId('life-title')).toContainText('主动归隐');
    page.once('dialog',d=>d.accept());await page.getByTestId('life-restore').click();await expect(page.getByTestId('realm')).toHaveText('凡人');
    const restored=await snapshot(page);expect(normalize(restored)).toEqual(normalize(checkpoint.snapshot));expect(restored.status).toBe('active');expect(restored.ending).toBeNull();
  }
});

test('a legally generated last-month save ends at the exact lifespan with a mobile review and no real-time wait',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});const fixture=legalLifeBoundary('qi',1).ledger.game;await page.goto('/');await importLifeFixture(page,fixture);
  await expect(page.getByTestId('age-limit')).toContainText('119岁11个月');await expect(page.getByTestId('lifespan-warning')).toContainText('余寿 1 游戏月');
  const before=await snapshot(page);await page.getByTestId('lifespan-open-life').click();await expect(page.getByTestId('end-life')).toBeEnabled();expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('end-life').click();await expect(page.getByTestId('life-review')).toContainText('119岁11个月');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByTestId('life-confirmation').screenshot({path:info.outputPath('life-confirm-mobile.png')});
  await action(page,'life-confirm-end');await expect(page.getByTestId('life-title')).toHaveText('尘世留名 · 寿元已尽');await expect(page.getByTestId('life-age')).toContainText('120岁');
  const after=await snapshot(page);expect(after.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths+1);expect(after.core.player).toEqual(before.core.player);expect(after.core.inventory).toEqual(before.core.inventory);
  await page.reload();await expect(page.getByTestId('life-title')).toContainText('寿元已尽');expect(await snapshot(page)).toEqual(after);
});

test('failed lifespan persistence keeps an active last month and retries the fixed ending intent once',async({page})=>{
  const fixture=legalLifeBoundary('qi',1).ledger.game;await page.goto('/');await importLifeFixture(page,fixture);await openLife(page);await page.getByTestId('end-life').click();const before=await snapshot(page);
  await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;(globalThis as any).restoreLifePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts')throw new DOMException('ending quota','QuotaExceededError');return original.call(this,value,key!);};});
  await page.getByTestId('life-confirm-end').click();await expect(page.getByTestId('life-error')).toContainText('存储空间不足');expect(await snapshot(page)).toEqual(before);await expect(page.getByTestId('save-status')).toHaveText('本次未保存');
  await expect(page.getByTestId('life-title')).toHaveText('此生仍在继续');
  await page.getByTestId('life-cancel').click();await expect(page.getByTestId('retry')).toHaveCount(0);expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('end-life').click();await page.getByTestId('life-confirm-end').click();await expect(page.getByTestId('life-error')).toContainText('存储空间不足');
  await page.evaluate(()=>(globalThis as any).restoreLifePut());
  await action(page,'life-retry');await expect(page.getByTestId('life-title')).toContainText('寿元已尽');const after=await snapshot(page);expect(after.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths+1);
});

test('a cross-tab change or replacement invalidates an open ending review instead of ending the new life',async({page,context})=>{
  await start(page);await openRetirement(page);const review=await page.getByTestId('life-review').innerText();
  const other=await context.newPage();await other.goto('/');await expect(other.getByTestId('realm')).toHaveText('炼气');await action(other,'cultivate');
  await expect(page.getByTestId('life-stale')).toBeVisible();await expect(page.getByTestId('life-confirm-end')).toBeDisabled();expect(await page.getByTestId('life-review').innerText()).toBe(review);
  await other.getByRole('button',{name:'设置',exact:true}).click();other.once('dialog',d=>d.accept());await other.getByTestId('restart').click();await expect(other.getByTestId('help')).toBeVisible();
  await expect.poll(async()=>(await snapshot(page)).core.runId).toBe((await snapshot(other)).core.runId);const before=await snapshot(other);
  await page.getByTestId('life-confirm-end').evaluate((button:HTMLButtonElement)=>{button.disabled=false;});await page.getByTestId('life-confirm-end').click();expect(await snapshot(other)).toEqual(before);expect((await snapshot(other)).status).toBe('active');
  await page.getByTestId('life-cancel').click();await other.close();
});

test('pending encounters and battles allow biography reading but block ending and time consumption',async({page})=>{
  const event=driver();event.go('sect');event.doAction({type:'EVENT',event:'lu_intro'});const battle=driver();battle.go('wilderness');battle.doAction({type:'ENCOUNTER',enemy:'wolf'});
  await page.goto('/');let replace=false;
  for(const fixture of [event.game,battle.game]){
    await importLifeFixture(page,fixture,replace);replace=true;const before=await snapshot(page);await openLife(page);
    await expect(page.getByTestId('retire')).toBeDisabled();expect(await snapshot(page)).toEqual(before);
    await expect(page.getByTestId('life-title')).toHaveText('此生仍在继续');
  }
});

test('a completed real-rule journey displays its actual ending and choices, and exports a local text record',async({page})=>{
  const fixture=causalRoute({choice:'leave',school:'talisman',returnVisit:false,meet:'rival',echo:'solo'}).driver.game;
  await page.goto('/');await importLifeFixture(page,fixture);await expect(page.getByTestId('life-title')).toHaveText('飞升 · 留道传承');
  await expect(page.getByTestId('life-decisions')).toContainText('重新建立');await expect(page.getByTestId('life-pledges')).toContainText('不推断每一次实际命中');
  const saved=await snapshot(page),promise=page.waitForEvent('download');await page.getByTestId('export-life').click();const file=await promise,path=await file.path();expect(path).toBeTruthy();const text=readFileSync(path!,'utf8');
  expect(text).toContain('通过天劫三关');expect(text).toContain('本卷不继续推断上界寿元');expect(text).not.toContain('挥别故人');expect(await snapshot(page)).toEqual(saved);
});

test('a life-record document is refused as a save without replacing a good game',async({page})=>{
  await start(page);const before=await snapshot(page),record=getLifeRecord(before);await page.getByRole('button',{name:'设置',exact:true}).click();page.once('dialog',d=>d.accept());
  await expect(page.getByTestId('import')).toBeEnabled(); await page.getByTestId('import').setInputFiles({name:'record-only.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(record))});await expect(page.getByTestId('error')).toContainText('未知旧档版本');expect(await snapshot(page)).toEqual(before);
});
