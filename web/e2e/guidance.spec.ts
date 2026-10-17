import {test,expect,type Page} from '@playwright/test';
import {start,snapshot,action} from './support';
import {advance} from '../../src/full/engine.ts';
import type {Action} from '../../src/full/types.ts';
test.use({actionTimeout:8000,navigationTimeout:15000});
async function guidedAction(page:Page,id:string,input:Action,tip:string){
  const before=await snapshot(page);await action(page,id);
  expect(await snapshot(page)).toEqual(advance(before,{...input,commandId:'guide-expected',runId:before.core.runId,expectedRevision:before.core.revision}));
  await expect(page.getByTestId('gameplay-guide')).toHaveAttribute('data-guide',tip);
}

test('guidance can be skipped and reviewed through keyboard help without changing the saved Game',async({page})=>{
  await start(page);const before=await snapshot(page);
  await expect(page.getByTestId('gameplay-guide')).toBeVisible();
  await page.getByTestId('guide-skip').click();await expect(page.getByTestId('gameplay-guide')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByTestId('gameplay-help-entry').focus();await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog',{name:'玩法帮助'});await expect(dialog).toBeVisible();await expect(page.locator('#gameplay-help-title')).toBeFocused();
  for(const title of ['修为与游戏年月','材料与取舍','疗养与战败','功法与搭配','突破与渡劫','本地存档与备份'])await expect(dialog.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(dialog).toContainText('不限定到达境界或通关时间');expect(await snapshot(page)).toEqual(before);
  await dialog.getByTestId('guide-toggle').click();await dialog.getByTestId('guide-toggle').click();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'设置',exact:true})).toBeFocused();
  await expect(page.getByTestId('gameplay-guide')).toBeVisible();expect(await snapshot(page)).toEqual(before);
});

test('new-player guidance follows committed choices, materials and injury without granting resources',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();
  await expect(page.getByTestId('gameplay-guide')).toHaveAttribute('data-guide','opening');
  await guidedAction(page,'leave',{type:'CHOOSE',choice:'leave'},'cultivation');
  const before=await snapshot(page);await page.getByTestId('guide-help').click();await page.getByRole('button',{name:'关闭玩法帮助'}).click();
  expect(await snapshot(page)).toEqual(before);
  await guidedAction(page,'return-cave',{type:'TRAVEL',location:'cave'},'cultivation');
  await page.getByLabel('行动次数').selectOption('5');await guidedAction(page,'cultivate',{type:'CULTIVATE',method:'natural',count:5},'breakthrough');
  await guidedAction(page,'breakthrough',{type:'BREAKTHROUGH'},'equipment');
  await page.getByLabel('行动次数').selectOption('1');await guidedAction(page,'school-sword',{type:'SCHOOL',school:'sword'},'equipment');
  await page.getByTestId('tab-1').click();await guidedAction(page,'travel-wilderness',{type:'TRAVEL',location:'wilderness'},'cultivation');
  await guidedAction(page,'source-herbs',{type:'SOURCE',sourceId:'herbs',count:1},'materials');
  await guidedAction(page,'encounter-wolf',{type:'ENCOUNTER',enemy:'wolf'},'battle');
  await guidedAction(page,'attack',{type:'BATTLE',move:'attack'},'battle');
  await guidedAction(page,'flee',{type:'BATTLE',move:'flee'},'recovery');
});

test('gameplay help remains readable at four viewports and150 percent with a complete focus return',async({page},info)=>{
  await start(page);const before=await snapshot(page);
  for(const [width,height]of [[1280,720],[1440,900],[1920,1080],[390,844]]){
    await page.setViewportSize({width,height});await page.getByRole('button',{name:'设置',exact:true}).click();
    await page.getByLabel('文字大小').selectOption('1.5');await expect(page.getByTestId('local-data-status')).toContainText('已保存');
    expect((await page.getByTestId('gameplay-guide').boundingBox())!.height).toBeLessThanOrEqual(height*0.4);
    await page.getByTestId('gameplay-help-entry').click();const dialog=page.getByRole('dialog',{name:'玩法帮助'});
    expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    const button=dialog.getByRole('button',{name:'关闭玩法帮助'});await button.focus();await expect(button).toBeFocused();
    const box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(height);
    await page.screenshot({path:info.outputPath('guidance-help-'+width+'.png')});
    await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'设置',exact:true})).toBeFocused();expect(await snapshot(page)).toEqual(before);
    await page.screenshot({path:info.outputPath('guidance-main-'+width+'.png')});
  }
});
