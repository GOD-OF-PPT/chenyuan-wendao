import {expect,type Page} from '@playwright/test';
import {revealPaged} from './support';
// Follow the visible detail controls; retain every original cost and state assertion.
export async function openProductionSettings(page:Page){
 const settings=page.getByTestId('alchemy-settings'),open=page.getByTestId('alchemy-settings-open');
 if(await open.isVisible()&&!await settings.isVisible()){await open.click();await expect(settings).toBeVisible();}
}
export async function closeProductionSettings(page:Page){
 const settings=page.getByTestId('alchemy-settings');
 if(await settings.isVisible()){await page.getByTestId('alchemy-settings-close').click();await expect(settings).toBeHidden();}
}
export async function openProductionIntent(page:Page){
 await openProductionSettings(page);
 const toggle=page.getByTestId('production-intent-toggle');
 await expect(toggle).toBeVisible();
 if(!await page.getByLabel('炼丹炉次',{exact:true}).isVisible())await toggle.click();
}
export async function expectActivityTotals(page:Page,text:string){
 await page.getByTestId('activity-inspect').click();
 await expect(page.getByTestId('activity-details')).toBeVisible();
 await expect(page.getByTestId('training-totals')).toContainText(text);
 await page.getByTestId('hub-close').click();
}

export async function openTrainingBudget(page:Page){const box=page.getByTestId('training-limits');if(!await box.evaluate(n=>(n as HTMLDetailsElement).open))await page.getByTestId('training-limits-toggle').click();await expect(page.getByLabel('累计灵石预算')).toBeVisible();}

export async function openSourceSettings(page:Page,limits=false){const dialog=page.getByTestId('source-plan-dialog');if(!await dialog.isVisible())await page.getByTestId('source-plan-open').click();await expect(dialog).toBeVisible();const box=dialog.locator('.source-limits');if(limits&&!await box.evaluate(n=>(n as HTMLDetailsElement).open))await box.locator('summary').click();}
export async function closeSourceSettings(page:Page){if(await page.getByTestId('source-plan-dialog').isVisible())await page.getByTestId('source-plan-close').click();}

export async function openLearningSettings(page:Page){if(!await page.getByTestId('learning-plan-dialog').isVisible())await page.getByTestId('learning-plan-open').click();await expect(page.getByTestId('learning-plan-dialog')).toBeVisible();}
export async function closeLearningSettings(page:Page){if(await page.getByTestId('learning-plan-dialog').isVisible())await page.getByTestId('learning-plan-close').click();}
export async function selectLearningSkill(page:Page,id:string){await closeLearningSettings(page);await revealPaged(page,'skill-select-'+id,'learning-planner','功法');await page.getByTestId('skill-select-'+id).click();await expect(page.getByTestId('skill-'+id)).toBeVisible();}

export async function openSupplySettings(page:Page){for(const kind of ['market','recovery']){const open=page.getByTestId(kind+'-plan-open');if(await open.isVisible()){if(!await page.getByTestId(kind+'-plan-dialog').isVisible())await open.click();return kind;}}return null;}
export async function closeSupplySettings(page:Page){for(const kind of ['market','recovery'])if(await page.getByTestId(kind+'-plan-dialog').isVisible())await page.getByTestId(kind+'-plan-close').click();}
