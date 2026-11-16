import {test,expect} from '@playwright/test';
import {feedbackExamples} from '../../tests/action-feedback-fixtures.mjs';
import {snapshot} from './support';
test.use({actionTimeout:8000,navigationTimeout:15000});
for(const size of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080}])test('desktop full function entrances retain a complete game screen at '+size.width,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('/');await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-art-flow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(feedbackExamples().actions.get('START_TRIAL')!.before))});await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);
 for(const id of ['hub-forge','hub-skills','hub-relics','hub-goal','hub-cultivation-details','tab-1','tab-2','tab-3','hub-life']){
  await page.getByTestId(id).click();await expect(page.getByTestId('hub-close')).toBeVisible();
  const metrics=await page.locator('.hub-feature').evaluate(el=>({scroll:document.documentElement.scrollHeight,height:innerHeight,nav:document.querySelector('.bottom-nav')!.getBoundingClientRect().top,buttons:[...el.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.closest('dialog:not([open])')).map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:b.textContent,bottom:r.bottom,hit:hit===b||!!hit&&b.contains(hit)};})}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.height+2);for(const b of metrics.buttons){expect(b.bottom,b.label??id).toBeLessThanOrEqual(metrics.nav+1);expect(b.hit,b.label??id).toBe(true);}
  const scenery=page.locator('.book-scenery');if(await scenery.count())await expect(scenery).toHaveAttribute('data-art-state','ready');
  await page.screenshot({path:info.outputPath(id+'-'+size.width+'.png')});expect(await snapshot(page)).toEqual(before);await page.getByTestId('hub-close').click();
 }
});
