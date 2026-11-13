import {test,expect,type Page} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {openPreparation} from './check-cend13-abc-support';

// Use the intended installed CJK face, including its Windows family alias.
// No font is shipped, downloaded by the test, or added to the product.
async function ink(page:Page,selector:string,fontSize:number){
 await page.evaluate(async()=>{const font=new FontFace('Q14CJKInk','local("Noto Serif CJK SC"),local("Noto Serif SC"),local("SimSun")');await font.load();document.fonts.add(font);});
 const rows=await page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>{(n as HTMLElement).style.fontFamily='Q14CJKInk';const box=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return{font:parseFloat(getComputedStyle(n).fontSize),inside:[...range.getClientRects()].filter(r=>r.width&&r.height).every(r=>r.top>=box.top-.5&&r.bottom<=box.bottom+.5)};}));
 expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.font===fontSize&&r.inside)).toBe(true);
}
test('current parallel response titles contain actual CJK ink while complete costs and Game remain intact',async({page})=>{
 const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});
 await importRecoveryFixture(page,d.game);const before=await recoveryDatabase(page);
 await page.getByTestId('tab-0').click();await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-mode-choices').click();
 await ink(page,'.response-copy .choice-act strong',22);expect(await recoveryDatabase(page)).toEqual(before);
});
test('current preparation title contains actual CJK ink while all saved material facts remain intact',async({page})=>{
 const d=driver('help');d.go('cave');d.meditate();await importRecoveryFixture(page,d.game);const before=await recoveryDatabase(page);
 await openPreparation(page);await ink(page,'.goal-board-object h3',24);expect(await recoveryDatabase(page)).toEqual(before);
});
