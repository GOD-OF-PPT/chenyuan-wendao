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

export async function openLearningSettings(page:Page){await closeLearningLibrary(page);if(!await page.getByTestId('learning-plan-dialog').isVisible())await page.getByTestId('learning-plan-open').click();await expect(page.getByTestId('learning-plan-dialog')).toBeVisible();}
export async function closeLearningSettings(page:Page){if(await page.getByTestId('learning-plan-dialog').isVisible())await page.getByTestId('learning-plan-close').click();}
export async function openLearningLibrary(page:Page){await closeLearningSettings(page);const dialog=page.getByTestId('learning-library-dialog');if(!await dialog.isVisible())await page.getByTestId('learning-library-open').click();await expect(dialog).toBeVisible();}
export async function closeLearningLibrary(page:Page){const dialog=page.getByTestId('learning-library-dialog');if(await dialog.isVisible())await page.getByTestId('learning-library-close').click();await expect(dialog).not.toBeVisible();}
export async function selectLearningSkill(page:Page,id:string){await openLearningLibrary(page);await revealPaged(page,'skill-select-'+id,'learning-library-dialog','功法');await page.getByTestId('skill-select-'+id).click();await expect(page.getByTestId('learning-library-dialog')).not.toBeVisible();await expect(page.getByTestId('skill-'+id)).toBeVisible();}
export async function closeRelicPreparation(page:Page){if(await page.getByTestId('relic-preparation-dialog').isVisible())await page.getByTestId('relic-preparation-close').click();}
export async function openRelicLibrary(page:Page){await closeRelicPreparation(page);const dialog=page.getByTestId('relic-library-dialog');if(!await dialog.isVisible())await page.getByTestId('relic-library-open').click();await expect(dialog).toBeVisible();}
export async function selectRelic(page:Page,id:string){await openRelicLibrary(page);await revealPaged(page,'forge-'+id,'relic-library-dialog','器谱');await page.getByTestId('forge-'+id).click();await expect(page.getByTestId('relic-library-dialog')).not.toBeVisible();await expect(page.getByTestId('relic-inscription-object')).toHaveAttribute('data-relic',id);}
export async function openRelicPreparation(page:Page){const open=page.getByTestId('relic-preparation-open');if(await open.isVisible()&&!await page.getByTestId('relic-preparation-dialog').isVisible())await open.click();}
export async function openProductionCatalogue(page:Page){if(await page.getByTestId('relic-library-open').isVisible())await openRelicLibrary(page);}


export async function openSupplySettings(page:Page){await closeMarketLibrary(page);await closeRecoveryOptions(page);for(const kind of ['market','recovery']){const open=page.getByTestId(kind+'-plan-open');if(await open.isVisible()){if(!await page.getByTestId(kind+'-plan-dialog').isVisible())await open.click();return kind;}}return null;}
export async function closeSupplySettings(page:Page){await closeMarketLibrary(page);await closeRecoveryOptions(page);await closeInventoryUses(page);await closeInventoryLibrary(page);for(const kind of ['market','recovery'])if(await page.getByTestId(kind+'-plan-dialog').isVisible())await page.getByTestId(kind+'-plan-close').click();}

// ART11 ordinary catalogues remain explicit, readonly public surfaces.
export async function openInventoryLibrary(page:Page){if(await page.getByTestId('inventory-uses-dialog').isVisible())await page.getByTestId('inventory-uses-close').click();if(!await page.getByTestId('inventory-library-dialog').isVisible())await page.getByTestId('inventory-library-open').click();await expect(page.getByTestId('inventory-library-dialog')).toBeVisible();}
export async function closeInventoryLibrary(page:Page){if(await page.getByTestId('inventory-library-dialog').isVisible())await page.getByTestId('inventory-library-close').click();}
export async function selectInventoryItem(page:Page,id:string){await openInventoryLibrary(page);await revealPaged(page,'inventory-select-'+id,'inventory-library-dialog','行囊');await page.getByTestId('inventory-select-'+id).click();await expect(page.getByTestId('inventory-library-dialog')).not.toBeVisible();await expect(page.getByTestId('inventory-stage')).toHaveAttribute('data-item',id);}
export async function openInventoryUses(page:Page){await closeInventoryLibrary(page);if(!await page.getByTestId('inventory-uses-dialog').isVisible())await page.getByTestId('inventory-uses-open').click();await expect(page.getByTestId('inventory-uses-dialog')).toBeVisible();}
export async function closeInventoryUses(page:Page){if(await page.getByTestId('inventory-uses-dialog').isVisible())await page.getByTestId('inventory-uses-close').click();}
export async function inspectInventorySupply(page:Page,id:string,kind:'use'|'sell'){if(await page.getByTestId('inventory-stage').getAttribute('data-item')!==id)await selectInventoryItem(page,id);await openInventoryUses(page);await page.getByTestId('inspect-'+kind+'-'+id).click();await expect(page.getByTestId('inventory-uses-dialog')).not.toBeVisible();await expect(page.getByTestId(kind==='use'?'recovery-planner':'market-planner')).toBeVisible();}
export async function openMarketLibrary(page:Page){if(await page.getByTestId('market-plan-dialog').isVisible())await page.getByTestId('market-plan-close').click();if(!await page.getByTestId('market-library-dialog').isVisible())await page.getByTestId('market-library-open').click();await expect(page.getByTestId('market-library-dialog')).toBeVisible();}
export async function closeMarketLibrary(page:Page){if(await page.getByTestId('market-library-dialog').isVisible())await page.getByTestId('market-library-close').click();}
export async function selectMarketMode(page:Page,mode:'buy'|'sell'){await openMarketLibrary(page);await page.getByTestId('market-mode-'+mode).click();await closeMarketLibrary(page);}
export async function selectMarketItem(page:Page,id:string,mode:'buy'|'sell'='buy'){await openMarketLibrary(page);await page.getByTestId('market-mode-'+mode).click();await revealPaged(page,mode+'-'+id,'market-library-dialog','坊市货物');await page.getByTestId(mode+'-'+id).click();await expect(page.getByTestId('market-library-dialog')).not.toBeVisible();await expect(page.getByTestId('market-counter')).toHaveAttribute('data-item',id);await expect(page.getByTestId('market-counter')).toHaveAttribute('data-mode',mode);}
export async function openRecoveryOptions(page:Page){if(await page.getByTestId('recovery-plan-dialog').isVisible())await page.getByTestId('recovery-plan-close').click();if(!await page.getByTestId('recovery-options-dialog').isVisible())await page.getByTestId('recovery-options-open').click();await expect(page.getByTestId('recovery-options-dialog')).toBeVisible();}
export async function closeRecoveryOptions(page:Page){if(await page.getByTestId('recovery-options-dialog').isVisible())await page.getByTestId('recovery-options-close').click();}
export async function selectRecoveryMethod(page:Page,id:string){await openRecoveryOptions(page);await page.getByTestId('recovery-'+id).click();await expect(page.getByTestId('recovery-options-dialog')).not.toBeVisible();}
