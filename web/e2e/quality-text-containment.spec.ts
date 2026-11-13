import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {openPreparation} from './check-cend13-abc-support';

// A test font with tall ascent/descent isolates the actual ink/line-box bug.
// It is diagnostic CSS geometry, not a shipped font or compatibility matrix.
test('current response and preparation titles contain a tall glyph line without changing their font size or actions',async({page})=>{
 const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});
 await importRecoveryFixture(page,d.game);const before=await recoveryDatabase(page);
 await page.evaluate(async()=>{const font=new FontFace('Q14TallInk','local("Noto Serif CJK SC"),local("Noto Serif SC"),local("SimSun"),local("Arial"),local("Liberation Sans")',{ascentOverride:'125%',descentOverride:'25%',lineGapOverride:'0%'});await font.load();document.fonts.add(font);});
 await page.getByTestId('tab-0').click();await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇',exact:true}).click();await page.getByTestId('story-mode-choices').click();
 async function ink(selector:string){return page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>{(n as HTMLElement).style.fontFamily='Q14TallInk';const box=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return{font:parseFloat(getComputedStyle(n).fontSize),inside:[...range.getClientRects()].filter(r=>r.width&&r.height).every(r=>r.top>=box.top-.5&&r.bottom<=box.bottom+.5)};}));}
 const response=await ink('.response-copy .choice-act strong');expect(response.length).toBeGreaterThan(0);expect.soft(response.every(r=>r.font===22&&r.inside)).toBe(true);
 await openPreparation(page);const preparation=await ink('.goal-board-object h3');expect(preparation.length).toBeGreaterThan(0);expect.soft(preparation.every(r=>r.font===24&&r.inside)).toBe(true);expect(await recoveryDatabase(page)).toEqual(before);
});
