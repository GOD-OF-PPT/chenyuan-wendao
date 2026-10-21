import {expect,type Page} from '@playwright/test';
// Follow the visible detail controls; retain every original cost and state assertion.
export async function openProductionIntent(page:Page){
 const toggle=page.getByTestId('production-intent-toggle');
 await expect(toggle).toBeVisible();
 if(!await toggle.evaluate(n=>(n.parentElement as HTMLDetailsElement).open))await toggle.click();
}
export async function expectActivityTotals(page:Page,text:string){
 await page.getByTestId('activity-inspect').click();
 await expect(page.getByTestId('activity-details')).toBeVisible();
 await expect(page.getByTestId('training-totals')).toContainText(text);
 await page.getByTestId('hub-close').click();
}

export async function openTrainingBudget(page:Page){const box=page.locator('.training-budget');if(!await box.evaluate(n=>(n as HTMLDetailsElement).open))await box.locator('summary').click();await expect(page.getByLabel('累计灵石预算')).toBeVisible();}

export async function openSourceSettings(page:Page,limits=false){const dialog=page.getByTestId('source-plan-dialog');if(!await dialog.isVisible())await page.getByTestId('source-plan-open').click();await expect(dialog).toBeVisible();const box=dialog.locator('.source-limits');if(limits&&!await box.evaluate(n=>(n as HTMLDetailsElement).open))await box.locator('summary').click();}
export async function closeSourceSettings(page:Page){if(await page.getByTestId('source-plan-dialog').isVisible())await page.getByTestId('source-plan-close').click();}
