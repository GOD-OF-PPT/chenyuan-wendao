import {test,expect} from '@playwright/test';
import {start,action,snapshot,travel} from './support';
import {npcFixture} from './fixtures';
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
  await expect(page.getByText(payload,{exact:true})).toBeVisible();await expect(page.locator('img[src="/unsafe-marker"]')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__unsafeRendered)).toBeUndefined();expect(unwanted).toEqual([]);expect(errors).toEqual([]);
});
