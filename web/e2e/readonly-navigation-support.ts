import {expect,type Page} from '@playwright/test';

/** Follow the player's visible menu; callers retain their full readonly proofs. */
export async function currentPageTool(page:Page,id:'feature-goal'|'feature-prepare'|'guide-open'|'feature-blueprints'){
  const target=page.getByTestId(id),menu=page.getByTestId('feature-menu-dialog');
  if(!await target.isVisible()){
    if(!await menu.isVisible())await page.getByTestId('feature-menu-open').click();
    await expect(menu).toBeVisible();
  }
  await expect(target).toBeVisible();await expect(target).toBeEnabled();return target;
}
export async function openReadonlyRelics(page:Page){
  const entry=page.getByTestId('hub-relics');
  if(await entry.isEnabled()){await entry.click();return;}
  if(!await page.getByTestId('feature-menu-open').isVisible())await page.getByTestId('tab-2').click();
  await(await currentPageTool(page,'feature-blueprints')).click();
}
export async function currentReceiptControl(page:Page){
  const receipt=page.locator('[data-testid=hub-receipt]:visible,[data-testid=adventure-receipts]:visible');
  if(!await receipt.count())await page.getByTestId('activity-inspect').click();
  await expect(receipt).toHaveCount(1);await expect(receipt).toBeVisible();return receipt;
}
export async function openCurrentSavedPlan(page:Page){
  const control=page.locator('[data-testid=training-review]:visible,[data-testid=training-settings]:visible');
  if(!await control.count())await page.getByTestId('activity-inspect').click();
  await expect(control).toHaveCount(1);await control.click();
}
