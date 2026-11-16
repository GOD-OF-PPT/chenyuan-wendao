import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {snapshot,revealPaged,openHubFeature} from './support';
test.use({actionTimeout:8000,navigationTimeout:15000});
test('a full spirit realm promotes preparation viewing without spending the missing entry item',async({page},info)=>{
 const d=driver();while(d.game.core.player.realm!=='spirit')d.realm('purchase');d.meditate();
 expect(d.game.core.inventory.ascension_seal).toBe(0);
 await page.goto('/');const input=page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled();await input.setInputFiles({name:'legal-spirit-desktop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d.game))});await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);
 const primary=page.getByTestId('cultivation-card').getByTestId('journey-prepare');await expect(primary).toBeEnabled();await expect(primary).toContainText('筹备渡劫引');await expect(page.getByTestId('hub-gap')).toContainText('尚缺渡劫引 1');await expect(page.getByTestId('cultivation-facts')).toContainText('查看不消耗物资');
 await page.screenshot({path:info.outputPath('spirit-preparation-primary.png')});await primary.click();await expect(page.getByTestId('prepare-craft-route')).toBeVisible();await expect(page.getByTestId('prepare-purchase-route')).toBeVisible();expect(await snapshot(page)).toEqual(before);await page.getByTestId('hub-close').click();
 await openHubFeature(page,'cultivation-details');await expect(page.getByTestId('cultivation-catalogue')).toBeVisible();await expect(page.getByRole('heading',{name:'化神修行',exact:true})).toBeVisible();expect(await snapshot(page)).toEqual(before);
 await page.getByTestId('cultivation-catalogue').getByTestId('breakthrough').click();await expect(page.getByTestId('trial-preparation-title')).toBeFocused();await expect(page.getByTestId('trial-entry-cost')).toContainText('渡劫引 ×1');await page.getByTestId('trial-mode-items').click();await revealPaged(page,'trial-required-item-ascension_seal','trial-preparation','渡劫');await expect(page.getByTestId('trial-required-item-ascension_seal')).toContainText('库存 0');await expect(page.getByTestId('trial-review-entry')).toBeDisabled();await expect(page.getByTestId('trial-entry-confirmation')).not.toBeVisible();expect(await snapshot(page)).toEqual(before);
});

test('enlarged desktop navigation keeps each functional caption on one readable line',async({page},info)=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);
 for(const size of ['1.5','2']){
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('文字大小').selectOption(size);await page.getByRole('button',{name:'关闭设置'}).click();
  for(let i=0;i<4;i++){
   const caption=page.getByTestId('tab-'+i).locator('small');await expect(caption).toBeVisible();expect(await caption.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return r.getClientRects().length;})).toBe(1);
   const box=await page.getByTestId('tab-'+i).boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(1280);
  }
  await page.screenshot({path:info.outputPath('desktop-navigation-'+size+'.png')});const last=await page.getByTestId('tab-3').boundingBox(),notice=await page.locator('.prototype-label').boundingBox();expect(last!.x+last!.width).toBeLessThanOrEqual(notice!.x);expect(await snapshot(page)).toEqual(before);
 }
});
