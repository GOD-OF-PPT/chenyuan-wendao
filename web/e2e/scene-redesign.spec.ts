import {test,expect,type Page} from '@playwright/test';
import {action,snapshot,travel} from './support';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
test.use({actionTimeout:8000,navigationTimeout:15000});
const sizes=[{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080}];
async function ready(page:Page,id:string,gate='closed'){
 await expect(page.getByTestId('scene')).toHaveAttribute('data-scene-art',id);
 const art=page.locator(`[data-asset-id="scene-${id}"]`);
 await expect(art).toHaveAttribute('data-art-state','ready');
 const filename=id==='terrace'&&gate!=='closed'?`terrace-${gate}`:id;
 await expect(art.locator('img')).toHaveAttribute('src',new RegExp(`/art/v2/scenes/${filename}\\.webp$`));
 expect(await art.locator('img').evaluate((img:HTMLImageElement)=>[img.naturalWidth,img.naturalHeight])).toEqual([1536,865]);
}
for(const size of sizes){
 test(`scene art ${size.width}: normal opening and cave use distinct production paintings without passive writes`,async({page},info)=>{
  await page.setViewportSize(size);await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();
  await expect(page.getByTestId('save-status')).toContainText('已保存');const opening=await snapshot(page);
  await ready(page,'opening');await page.getByTestId('scene').screenshot({path:info.outputPath(`scene-opening-${size.width}.png`)});expect(await snapshot(page)).toEqual(opening);
  await action(page,'leave');await action(page,'return-cave');await ready(page,'cave');const cave=await snapshot(page);
  await page.getByTestId('scene').screenshot({path:info.outputPath(`scene-cave-${size.width}.png`)});expect(await snapshot(page)).toEqual(cave);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath(`scene-cave-context-${size.width}.png`)});
 });
 test(`scene art ${size.width}: six actual destinations retain their distinct images and legal travel state`,async({page},info)=>{
  await page.setViewportSize(size);await page.goto('/');const input=page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled();
  await input.setInputFiles({name:'legal-prepared-scene-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(trialJourneyScenario().prepared))});
  await expect(page.getByTestId('realm')).toHaveText('化神');await expect(page.getByTestId('save-status')).toContainText('已保存');
  for(const id of ['cave','sect','market','secret','wilderness','terrace']){
   await travel(page,id);const state=await snapshot(page);expect(state.core.world.location).toBe(id);await ready(page,id);
   await page.getByTestId('scene').screenshot({path:info.outputPath(`scene-${id}-${size.width}.png`)});expect(await snapshot(page)).toEqual(state);
  }
 });
}
for(const gate of ['closed','storm','opened'])test(`desktop terrace ${gate}: full painted gateway and matching stage overlay retain the whole game`,async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});const route=trialJourneyScenario();const state=gate==='closed'?route.prepared:gate==='storm'?route.states.find((g:any)=>g.battle):route.states.at(-1);
 await page.goto('/');const input=page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled();await input.setInputFiles({name:'legal-stage-scene-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await expect(page.getByTestId('save-status')).toContainText('已保存');await ready(page,'terrace',gate);await expect(page.getByTestId('scene')).toHaveAttribute('data-gate',gate);
 const before=await snapshot(page),frame=await page.getByTestId('scene').boundingBox(),bounds=await page.locator('.photo-gate-state .gate-bounds').boundingBox();
 expect(bounds!.x).toBeGreaterThanOrEqual(frame!.x);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(frame!.x+frame!.width);
 expect(bounds!.y).toBeGreaterThanOrEqual(frame!.y);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(frame!.y+frame!.height);
 await page.getByTestId('scene').screenshot({path:info.outputPath(`scene-terrace-${gate}-1440.png`)});expect(await snapshot(page)).toEqual(before);
});
