import {test,expect,type Page} from '@playwright/test';
import {start,snapshot,action} from './support';
import {newGame} from '../../src/full/engine.ts';
import {demoSave} from '../../src/demo.ts';
import {readFileSync} from 'node:fs';

test.use({actionTimeout:8000,navigationTimeout:15000});
async function holdFile(page:Page){
  await page.evaluate(()=>{
    const original=File.prototype.text;
    (window as any).__heldFile=null;
    File.prototype.text=function(){
      if(this.name!=='delayed.json')return original.call(this);
      return new Promise<string>((resolve,reject)=>{
        (window as any).__heldFile={release:()=>original.call(this).then(resolve,reject),reject:()=>reject(new DOMException('file unavailable','NotReadableError'))};
      });
    };
  });
}
async function chooseHeld(page:Page,game:unknown){
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await expect(page.getByTestId('import')).toBeEnabled();
  await page.getByTestId('import').setInputFiles({name:'delayed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__heldFile)).toBe(true);
}
async function releaseFile(page:Page){
  await page.evaluate(async()=>{(window as any).__heldFile.release();await Promise.resolve();await Promise.resolve();});
}

for(const change of ['action','restart']as const)test(`a late file read cannot replace a newer ${change} on the same page`,async({page})=>{
  await start(page);const original=await snapshot(page);await holdFile(page);await chooseHeld(page,original);
  page.on('dialog',d=>d.accept());
  if(change==='action'){
    await page.getByRole('button',{name:'关闭设置'}).click();await action(page,'cultivate');
  }else{
    await page.getByTestId('restart').click();await expect(page.getByTestId('help')).toBeEnabled();await expect(page.getByTestId('save-status')).toHaveText('已保存');
  }
  const latest=await snapshot(page);await releaseFile(page);
  // The fixed UI explains a discarded read; the old UI instead commits an overwrite.
  await expect.poll(async()=>await page.getByTestId('import-notice').count()>0||(await snapshot(page)).core.runId!==latest.core.runId).toBe(true);
  expect(await snapshot(page)).toEqual(latest);
  await expect(page.getByTestId('import-notice').first()).toContainText('进度已变化');
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
});

test('a later selected file owns the import even when the first file finishes last',async({page})=>{
  await start(page);const original=await snapshot(page);await holdFile(page);
  await chooseHeld(page,{...original,core:{...original.core,player:{...original.core.player,name:'先选文件'}}});
  page.on('dialog',d=>d.accept());
  await page.getByTestId('import').setInputFiles({name:'latest.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...original,core:{...original.core,player:{...original.core.player,name:'后选文件'}}}))});
  await expect.poll(async()=>(await snapshot(page)).core.player.name).toBe('后选文件');await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const latest=await snapshot(page);await releaseFile(page);
  // Read transactions queue after the released handler's write, if it wrongly writes.
  for(let i=0;i<3;i++)expect(await snapshot(page)).toEqual(latest);
});

test('unreadable file errors stay in the import UI and preserve the saved Game',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);const original=await snapshot(page);await holdFile(page);await chooseHeld(page,original);
  await page.evaluate(()=>(window as any).__heldFile.reject());
  await expect(page.getByTestId('import-notice').first()).toContainText('文件无法读取');
  expect(await snapshot(page)).toEqual(original);await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(errors).toEqual([]);
});

test('a file selected on an empty welcome screen cannot overwrite a subsequently created Game',async({page})=>{
  await page.goto('/');await expect(page.getByRole('button',{name:'踏入仙途'})).toBeEnabled();await holdFile(page);
  await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'delayed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(newGame('旧导入档','old-file-run')))});
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__heldFile)).toBe(true);
  await page.getByRole('button',{name:'踏入仙途'}).click();await expect(page.getByTestId('save-status')).toHaveText('已保存');const latest=await snapshot(page);
  page.on('dialog',d=>d.accept());await releaseFile(page);await expect(page.getByTestId('import-notice')).toContainText('进度已变化');expect(await snapshot(page)).toEqual(latest);
});

test('a delayed typed demo import cannot undo a newer scoped node reset or create normal data',async({page})=>{
  const node=JSON.parse(readFileSync('public/demo-nodes/battle-sword.json','utf8')),database='chenyuan-demo-game-v1-'+node.sourceDigest+'-battle-sword';
  const current=()=>page.evaluate(database=>new Promise<any>((resolve,reject)=>{const req=indexedDB.open(database);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('full-state','readonly'),read=tx.objectStore('full-state').get('current');read.onsuccess=()=>resolve(read.result);tx.oncomplete=()=>db.close();tx.onabort=()=>reject(tx.error);};}),database);
  await page.goto('/?demo=battle-sword');await expect(page.getByTestId('demo-badge')).toBeVisible();await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const before=await current();await holdFile(page);await chooseHeld(page,demoSave('battle-sword',node.sourceDigest,before));page.on('dialog',d=>d.accept());
  await page.getByTestId('restart').click();await expect.poll(async()=>(await current()).core.runId).not.toBe(before.core.runId);await expect(page.getByTestId('save-status')).toHaveText('已保存');const latest=await current();
  await releaseFile(page);await expect(page.getByTestId('import-notice')).toContainText('进度已变化');expect(await current()).toEqual(latest);
  expect(await page.evaluate(async()=>(await indexedDB.databases()).some(d=>d.name==='chenyuan-playable-v1'))).toBe(false);
});
