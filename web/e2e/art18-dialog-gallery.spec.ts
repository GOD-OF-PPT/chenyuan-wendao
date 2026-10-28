import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver,fullRoute} from '../../tests/full-route.mjs';
import {newGame} from '../../src/full/engine.ts';
import {feedbackExamples} from '../../tests/action-feedback-fixtures.mjs';
import {importRecoveryFixture,recoveryDatabase,runRecoveryPlan,recoveryMove,openRecoveryRestore} from './idle-recovery-ui-support';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import * as stage from './stage-support';
import {answerGameConfirmation} from './game-confirmation-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
// Formal engine fixtures isolate presentation; these are not normal-route or balance evidence.
async function inspect(page:Page,info:TestInfo,name:string){
 const surface=page.locator('dialog[open]');await expect(surface).toHaveCount(1);await expect(surface).toBeVisible();
 const proof=await surface.evaluate(n=>{const d=n.getBoundingClientRect();return{material:getComputedStyle(n,'::before').borderImageSource,content:getComputedStyle(n,'::before').content,overflow:n.scrollHeight>n.clientHeight,dialog:{left:d.left,right:d.right,top:d.top,bottom:d.bottom},buttons:[...n.querySelectorAll<HTMLButtonElement>('button')].filter(b=>b.checkVisibility()).map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:b.textContent,height:r.height,layoutHeight:b.offsetHeight,font:parseFloat(getComputedStyle(b).fontSize),inside:r.top>=d.top&&r.bottom<=d.bottom&&r.left>=d.left&&r.right<=d.right,hit:!!hit&&(hit===b||b.contains(hit))};}),clipped:[...n.querySelectorAll<HTMLElement>('p,h2,h3,label,small,button')].filter(e=>e.checkVisibility()).flatMap(e=>{const r=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);return[...range.getClientRects()].filter(x=>x.width&&x.height&&(x.left<r.left-1||x.right>r.right+1||x.top<r.top-1||x.bottom>r.bottom+1)).map(()=>e.textContent?.slice(0,80));})};});
 await info.attach(name+'-material-geometry',{body:JSON.stringify(proof),contentType:'application/json'});expect(proof.material).toContain('dialog-jade-frame-v1.webp');expect(proof.content).not.toBe('none');expect(proof.overflow).toBe(false);expect(proof.dialog.left).toBeGreaterThanOrEqual(0);expect(proof.dialog.top).toBeGreaterThanOrEqual(0);expect(proof.dialog.right).toBeLessThanOrEqual(1440);expect(proof.dialog.bottom).toBeLessThanOrEqual(900);expect(proof.clipped).toEqual([]);
 for(const b of proof.buttons){expect(b.layoutHeight,b.text??'').toBeGreaterThanOrEqual(44);expect(Math.round(b.height*1000)/1000,b.text??'').toBeGreaterThanOrEqual(44);expect(b.font,b.text??'').toBeGreaterThanOrEqual(18);expect(b.inside,b.text??'').toBe(true);expect(b.hit,b.text??'').toBe(true);}
 await page.screenshot({path:info.outputPath(name+'.png')});
}
async function view(page:Page,info:TestInfo,name:string,open:()=>Promise<unknown>){const before=await recoveryDatabase(page);await open();await inspect(page,info,name);expect(await recoveryDatabase(page)).toEqual(before);await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);expect(await recoveryDatabase(page)).toEqual(before);}
function fixture(){const d=driver('trade','sword');d.realm();d.funds(300);d.go('cave');return d.game;}
test('ART18-G1 menus notes progress and opening details use actual readonly game entrances',async({page},info)=>{
 await importRecoveryFixture(page,fixture());
 await view(page,info,'cultivation-notes',()=>stage.openCultivationNotes(page));
 await page.getByTestId('hub-goal').click();await view(page,info,'progress',()=>page.getByRole('button',{name:'查看当前目标修为进度',exact:true}).click());await page.getByTestId('hub-close').click();
 await page.getByTestId('hub-skills').click();await view(page,info,'catalogue-guide',()=>page.getByTestId('guide-open').click());
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByTestId('gameplay-help-entry').click();await inspect(page,info,'game-help');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByTestId('demo-menu-open').click();await inspect(page,info,'demo-menu');await page.keyboard.press('Escape');
});
test('ART18-G2 alchemy material limits and source decisions retain all original defaults',async({page},info)=>{
 await importRecoveryFixture(page,fixture());await page.getByTestId('hub-forge').click();
 await view(page,info,'alchemy-library',()=>stage.openAlchemyLibrary(page));await view(page,info,'alchemy-settings',()=>stage.openProductionSettings(page));
 await stage.openProductionSettings(page);await page.getByTestId('production-limits').click();await inspect(page,info,'production-limits');await page.keyboard.press('Escape');await expect(page.getByTestId('alchemy-settings')).toBeVisible();await stage.closeProductionSettings(page);

});
test('ART18-G3 jade study relic and configuration keep complete catalogs and comparisons',async({page},info)=>{
 await importRecoveryFixture(page,fixture());await page.getByTestId('hub-skills').click();await view(page,info,'learning-library',()=>stage.openLearningLibrary(page));await view(page,info,'learning-plan',()=>stage.openLearningSettings(page));
 await page.getByTestId('equipment-mode-school').click();await page.getByTestId('school-talisman').click();await inspect(page,info,'configuration');await page.getByTestId('configuration-cancel').click();await page.getByTestId('hub-close').click();
 await page.getByTestId('hub-relics').click();await view(page,info,'relic-library',()=>stage.openRelicLibrary(page));await view(page,info,'relic-preparation',()=>stage.openRelicPreparation(page));
});
test('ART18-G4 inventory market and recovery expose their full library and finite plans',async({page},info)=>{
 await importRecoveryFixture(page,fixture());await page.getByTestId('tab-2').click();await view(page,info,'inventory-library',()=>stage.openInventoryLibrary(page));await view(page,info,'inventory-uses',()=>stage.openInventoryUses(page));
 await stage.inspectInventorySupply(page,'healing_pill','use');await view(page,info,'recovery-options',()=>stage.openRecoveryOptions(page));await view(page,info,'recovery-plan',()=>stage.openSupplySettings(page));
 await page.getByTestId('hub-close').click();await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await view(page,info,'market-library',()=>stage.openMarketLibrary(page));await view(page,info,'market-plan',()=>stage.openSupplySettings(page));
});
test('ART18-G5 relationships response and life confirmations use their real story objects',async({page},info)=>{
 await importRecoveryFixture(page,fixture());await page.getByTestId('tab-3').click();await view(page,info,'fate-people',()=>page.getByTestId('fate-people-open').click());await page.getByTestId('fate-people-open').click();await page.getByTestId('fate-person-shen').click();await view(page,info,'fate-route',()=>page.getByTestId('fate-route-open').click());
 await page.getByTestId('hub-life').click();await view(page,info,'life-manage',()=>page.getByTestId('life-manage-open').click());await page.getByTestId('life-manage-open').click();await page.getByTestId('retire').click();await inspect(page,info,'life-confirmation');await page.getByTestId('life-cancel').click();
});
test('ART18-G6 opening response and ascension retain full explicit choices',async({page},info)=>{
 await importRecoveryFixture(page,newGame('初遇客','art18-opening'));await view(page,info,'choice-inspection',()=>page.getByRole('button',{name:'查看保留丹药的代价与结果',exact:true}).click());
});
test('ART18-G7 pending responses are read without making a choice',async({page},info)=>{
 const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});await importRecoveryFixture(page,d.game);await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-show-choices').click();await view(page,info,'response-choices',()=>page.getByTestId('response-choices-open').click());
});
test('ART18-G8 completed trial shows the real explicit ending confirmation',async({page},info)=>{
 await importRecoveryFixture(page,feedbackExamples().actions.get('END')!.before);await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-show-choices').click();await page.getByTestId('ending-transmit').click();await inspect(page,info,'ascension-confirmation');await page.getByTestId('ascension-cancel').click();
});
test('ART18-G9 trial entry and real checkpoint recovery retain the complete original preparation',async({page},info)=>{
 await importRecoveryFixture(page,trialJourneyScenario().prepared);await page.getByTestId('breakthrough').click();await view(page,info,'trial-entry',()=>page.getByTestId('trial-review-entry').click());
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1});await runRecoveryPlan(page,{kind:'milestone',action:{type:'ANSWER_TRIAL',answer:'accept'},maxCycles:1});await recoveryMove(page,'guard');await view(page,info,'trial-restore',()=>openRecoveryRestore(page));
});

test('ART18-G10 the real wilderness source plan retains its full finite authorization',async({page},info)=>{const d=driver('trade','sword');d.go('wilderness');await importRecoveryFixture(page,d.game);await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-source').click();await page.getByTestId('source-herbs').click();await view(page,info,'source-plan',()=>stage.openSourceSettings(page));});
