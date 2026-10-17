import {test,expect,type Page} from '@playwright/test';
import {action,snapshot,start,travel} from './support';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {npcFixture} from './fixtures';
test.use({actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
async function imported(page:Page,game:any){await page.goto('/');const input=page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled();await input.setInputFiles({name:'legal-ui-presentation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});await expect(page.getByTestId('realm')).toHaveText(game.core.player.realm==='spirit'?'化神':'筑基');}
for(const size of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080}])test(`desktop ${size.width}: three real columns and editable opening choices`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();await expect(page.getByTestId('help')).toBeEnabled();
 const character=await page.getByTestId('character-panel').boundingBox(),center=await page.locator('.center-column').boundingBox(),goals=await page.locator('.right-column').boundingBox();expect(character!.x+character!.width).toBeLessThan(center!.x);expect(center!.x+center!.width).toBeLessThan(goals!.x);expect(Math.abs(character!.y-center!.y)).toBeLessThan(2);
 expect(await page.locator('.story').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);await noOverflow(page);
 await page.screenshot({path:info.outputPath(`opening-${size.width}.png`),fullPage:true});
 const before=await snapshot(page);await action(page,'trade');const after=await snapshot(page);expect(after.core.revision).toBe(before.core.revision+1);expect(after.core.openingChoice).toBe('trade');await expect(page.locator('.scene h2')).toHaveText('青岚山野');
});
test('mobile puts current actions before goals and expandable character without writing the life',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();await expect(page.getByTestId('help')).toBeEnabled();
 const center=await page.locator('.center-column').boundingBox(),goals=await page.locator('.right-column').boundingBox(),character=await page.getByTestId('character-panel').boundingBox();expect(center!.y+center!.height).toBeLessThanOrEqual(goals!.y);expect(goals!.y+goals!.height).toBeLessThanOrEqual(character!.y);await noOverflow(page);await page.screenshot({path:info.outputPath('mobile-opening.png'),fullPage:true});
 const before=await snapshot(page);await expect(page.getByTestId('character-details')).toBeHidden();await page.getByTestId('character-toggle').click();await expect(page.getByTestId('character-details')).toBeVisible();await page.getByTestId('character-toggle').click();await expect(page.getByTestId('character-details')).toBeHidden();expect(await snapshot(page)).toEqual(before);
 await action(page,'leave');await action(page,'return-cave');await page.getByTestId('tab-2').click();await expect(page.getByTestId('item-healing_pill')).toBeVisible();await noOverflow(page);await page.screenshot({path:info.outputPath('mobile-inventory.png'),fullPage:true});
});
test('six locations follow actual travel and preparation never shows an opened gate',async({page},info)=>{
 await imported(page,trialJourneyScenario().prepared);
 for(const [id,key] of Object.entries({cave:'settlement',sect:'settlement',market:'settlement',secret:'secret',wilderness:'wilderness',terrace:'terrace'})){
  await travel(page,id);await expect(page.getByTestId('scene')).toHaveAttribute('data-location',id);await expect(page.getByTestId('scene')).toHaveAttribute('data-scene',key);await expect(page.getByTestId('scene')).toHaveAttribute('data-gate',id==='terrace'?'closed':'none');await noOverflow(page);
 }
 await page.getByTestId('tab-0').click();await page.getByTestId('scene').screenshot({path:info.outputPath('terrace-closed.png')});await page.getByTestId('trial-review-entry').click();await action(page,'trial-confirm-entry');await expect(page.getByTestId('scene')).toHaveAttribute('data-gate','closed');await action(page,'answer-accept');await expect(page.getByTestId('scene')).toHaveAttribute('data-gate','storm');
});
test('mobile battle shows actual player resources next to decisions and survives a real turn',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await start(page);await action(page,'school-sword');await travel(page,'wilderness');await action(page,'encounter-wolf');
 const before=await snapshot(page);await expect(page.getByTestId('battle-player')).toContainText(String(before.core.player.hp));await page.locator('.content-panel').screenshot({path:info.outputPath('mobile-battle.png')});await action(page,'attack');const after=await snapshot(page);expect(after.battle.round).toBe(before.battle.round+1);await expect(page.getByTestId('battle-player')).toContainText(String(after.core.player.hp));await expect(page.getByTestId('battle-player')).toContainText(String(after.core.player.mp));await noOverflow(page);
});
test('encounter narrative and decision labels remain dynamic DOM',async({page},info)=>{
 const game=npcFixture();await imported(page,game);await expect(page.getByTestId('event-title')).toHaveText('药香故人');const before=await snapshot(page);await expect(page.getByTestId('event-body')).toBeVisible();await expect(page.locator('[data-testid^="decide-"]').first()).toBeEnabled();await page.locator('.center-column').screenshot({path:info.outputPath('event-dom.png')});expect(await snapshot(page)).toEqual(before);await noOverflow(page);
});
