import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {feedbackExamples} from '../../tests/action-feedback-fixtures.mjs';
import {snapshot,revealStoryChoice,useJourneyClock,finishJourneyClock} from './support';
import {getRelationships} from '../../src/full/queries.ts';
import {advance} from '../../src/full/engine.ts';
import {narrativeFor} from '../src/story-pages';
test.use({actionTimeout:8000,navigationTimeout:15000});
const examples=feedbackExamples();
async function load(page:Page,game=examples.actions.get('START_TRIAL')!.before){
 await page.goto('/');await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-art-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});await expect(page.getByTestId('save-status')).toHaveText('已保存');
}
async function frame(page:Page,info:TestInfo,name:string){
 const root=page.locator('.story-book:visible');await expect(root.locator('.book-scenery')).toHaveAttribute('data-art-state','ready');
 if(await root.locator('.narrative-portrait').count())await expect(root.locator('.narrative-portrait')).toHaveAttribute('data-art-state','ready');
 const painted=await root.locator('.book-scenery img').evaluate((img:HTMLImageElement)=>{const r=img.getBoundingClientRect(),scale=(getComputedStyle(img).objectFit==='contain'?Math.min:Math.max)(r.width/img.naturalWidth,r.height/img.naturalHeight);return{width:img.naturalWidth*scale,height:img.naturalHeight*scale,frameWidth:r.width,frameHeight:r.height};});expect(painted.width).toBeGreaterThanOrEqual(painted.frameWidth-1);expect(painted.height).toBeGreaterThanOrEqual(painted.frameHeight-1);
 const text=root.locator('.reading-text').first();if(await text.count())await expect.poll(()=>text.evaluate(el=>Number(getComputedStyle(el).opacity))).toBe(1);
 const m=await root.evaluate(el=>({scroll:document.documentElement.scrollHeight,height:innerHeight,nav:document.querySelector('.bottom-nav')!.getBoundingClientRect().top,buttons:[...el.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:b.textContent,height:r.height,bottom:r.bottom,hit:hit===b||!!hit&&b.contains(hit)};}),text:[...el.querySelectorAll('.reading-text p')].filter(p=>p.getClientRects().length).map(p=>{const r=p.getBoundingClientRect(),a=p.closest('.reading-text')!.getBoundingClientRect();return{bottom:r.bottom,right:r.right,limit:a.bottom,edge:a.right};})}));
 expect(m.scroll).toBeLessThanOrEqual(m.height+2);for(const b of m.buttons){expect(b.height,b.label??'').toBeGreaterThanOrEqual(44);expect(b.bottom,b.label??'').toBeLessThanOrEqual(m.nav+1);expect(b.hit,b.label??'').toBe(true);}for(const t of m.text){expect(t.bottom).toBeLessThanOrEqual(t.limit+1);expect(t.right).toBeLessThanOrEqual(t.edge+1);}
 await info.attach(name+'-geometry.json',{body:Buffer.from(JSON.stringify(m)),contentType:'application/json'});await page.screenshot({path:info.outputPath(name+'.png')});
}
for(const size of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080}]){
 test('portraits and factual headings form a painted reading stage at '+size.width,async({page},info)=>{
  await page.setViewportSize(size);await load(page);const before=await snapshot(page);await page.getByTestId('tab-3').click();
  for(const person of getRelationships(before)){
   await page.getByTestId('fate-person-'+person.id).click();await expect(page.locator('.book-person figcaption')).toHaveText(person.name);await expect(page.getByTestId('relationship-label-'+person.id)).toHaveText(person.label);
   const portrait=page.locator('.narrative-portrait');await expect(portrait).toHaveAttribute('data-art-state','ready');const r=await portrait.boundingBox();expect(r!.height).toBeGreaterThanOrEqual(140);expect(r!.width).toBeGreaterThanOrEqual(140);await frame(page,info,'person-'+person.id+'-'+size.width);
  }
  await page.getByTestId('fate-mode-journal').click();await frame(page,info,'journal-'+size.width);await page.getByTestId('show-life').click();await frame(page,info,'life-'+size.width);expect(await snapshot(page)).toEqual(before);
 });
 for(const kind of ['DECIDE','ANSWER_TRIAL','END'])test(kind+' choices keep the real portrait and location at '+size.width,async({page},info)=>{
  await page.setViewportSize(size);await load(page,examples.actions.get(kind)!.before);const before=await snapshot(page),model=narrativeFor(before)!;await page.getByRole('button',{name:'继续当前遭遇',exact:true}).click();await frame(page,info,kind+'-reading-'+size.width);await page.getByTestId('story-show-choices').click();await expect(page.locator('.book-person figcaption')).toHaveText(model.speaker);await expect(page.locator('.narrative-portrait')).toHaveAttribute('data-asset-id','portrait-'+model.portrait);
  await frame(page,info,kind+'-choices-'+size.width);for(const choice of model.choices){await revealStoryChoice(page,choice.id);await expect(page.getByTestId(choice.id)).toContainText(choice.detail);}expect(await snapshot(page)).toEqual(before);
 });
 test('trial preparation and life retain the actual closed gate at '+size.width,async({page},info)=>{
  await page.setViewportSize(size);await load(page);const before=await snapshot(page);await page.getByTestId('breakthrough').click();await expect(page.locator('.book-canvas')).toHaveAttribute('data-gate','closed');await frame(page,info,'trial-closed-'+size.width);expect(await snapshot(page)).toEqual(before);
  await page.getByTestId('hub-close').click();await page.getByTestId('hub-life').click();await frame(page,info,'life-prepared-'+size.width);
 });
}
for(const phase of ['storm','opened'])test(phase+' gate artwork follows actual progress in the reading stage',async({page},info)=>{
 await page.setViewportSize({width:1280,height:720});let game=examples.actions.get(phase==='storm'?'ANSWER_TRIAL':'END')!.before;
 if(phase==='storm')game=advance(game,{type:'ANSWER_TRIAL',answer:'accept',commandId:'art-storm-prefix',runId:game.core.runId,expectedRevision:game.core.revision});
 await load(page,game);const before=await snapshot(page);await page.getByTestId('hub-life').click();await expect(page.locator('.book-canvas')).toHaveAttribute('data-gate',phase);await expect(page.locator('.book-scenery')).toHaveAttribute('data-art-path','art/v2/scenes/terrace-'+(phase==='storm'?'storm':'opened')+'.webp');await frame(page,info,'gate-'+phase);expect(await snapshot(page)).toEqual(before);
});
test('failed scene and portrait images retain complete text and usable choices',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.route('**/art/v2/characters/**',r=>r.abort());await page.route('**/art/v2/scenes/**',r=>r.abort());await load(page,examples.actions.get('DECIDE')!.before);const before=await snapshot(page);await page.getByRole('button',{name:'继续当前遭遇',exact:true}).click();await expect(page.locator('.book-scenery')).toHaveAttribute('data-art-state','failed');await expect(page.locator('.narrative-portrait')).toHaveAttribute('data-art-state','failed');await expect(page.getByTestId('event-body')).not.toBeEmpty();await page.getByTestId('story-show-choices').click();await expect(page.locator('.choice-act')).toBeEnabled();expect(await snapshot(page)).toEqual(before);
});
test('the painted choice still counts down and commits the original decision once',async({page})=>{
 await page.setViewportSize({width:1280,height:720});const example=examples.actions.get('DECIDE')!;await load(page,example.before);await revealStoryChoice(page,'decide-'+example.action.option);await useJourneyClock(page);const before=await snapshot(page);await page.getByTestId('decide-'+example.action.option).click();await expect(page.getByTestId('action-execution')).toHaveAttribute('data-phase','acting');expect(await snapshot(page)).toEqual(before);await finishJourneyClock(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(advance(before,{...example.action,commandId:'expected-painted-decision',runId:before.core.runId,expectedRevision:before.core.revision}));
});
