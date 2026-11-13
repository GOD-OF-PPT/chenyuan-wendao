import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {openPreparation} from './check-cend13-abc-support';

// Load the intended CJK family explicitly, including its installed Windows alias.
// No font is shipped, downloaded by this test, or added as a product dependency.
test('current response and preparation titles contain actual CJK glyphs without changing their font size or actions',async({page})=>{
 const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});
 await importRecoveryFixture(page,d.game);const before=await recoveryDatabase(page);
 async function tallFont(){await page.evaluate(async()=>{const font=new FontFace('Q14TallInk','local("Noto Serif CJK SC"),local("Noto Serif SC"),local("SimSun")');await font.load();document.fonts.add(font);});}await tallFont();
 await page.getByTestId('tab-0').click();await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-mode-choices').click();
 async function ink(selector:string){return page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>{(n as HTMLElement).style.fontFamily='Q14TallInk';const box=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return{font:parseFloat(getComputedStyle(n).fontSize),inside:[...range.getClientRects()].filter(r=>r.width&&r.height).every(r=>r.top>=box.top-.5&&r.bottom<=box.bottom+.5)};}));}
 const response=await ink('.response-copy .choice-act strong');expect(response.length).toBeGreaterThan(0);expect.soft(response.every(r=>r.font===22&&r.inside)).toBe(true);
 expect(await recoveryDatabase(page)).toEqual(before);const p=driver('help');p.go('cave');p.meditate();await importRecoveryFixture(page,p.game);const prepared=await recoveryDatabase(page);await tallFont();await openPreparation(page);const preparation=await ink('.goal-board-object h3');expect(preparation.length).toBeGreaterThan(0);expect.soft(preparation.every(r=>r.font===24&&r.inside)).toBe(true);expect(await recoveryDatabase(page)).toEqual(prepared);
});
