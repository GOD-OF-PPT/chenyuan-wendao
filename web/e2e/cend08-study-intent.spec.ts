import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {feedbackExamples} from '../../tests/action-feedback-fixtures.mjs';
import {resolve} from '../../src/full/engine';
import * as C from '../../src/full/content';
import {previewActivity} from '../../src/full/activity';
import {importRecoveryFixture,recoveryDatabase as database} from './idle-recovery-ui-support';
import {snapshot,activitySnapshot as activity,openHubFeature} from './support';
import {openLearningSettings,closeLearningSettings,selectLearningSkill} from './stage-support';
import {captureFixedPng} from './png-capture';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const e:string[]=[];errors.set(page,e);page.on('pageerror',x=>e.push(x.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
const examples=feedbackExamples().actions;
const planner=(page:Page)=>page.getByTestId('learning-planner');
const main=(page:Page)=>planner(page).locator('.jade-authorization');
const estimate=(page:Page)=>main(page).getByTestId('preparation-estimate');
const note='只研习已选内容；不自动换派、装配或前往宗门。';
const temple='破庙交易已获得同一启迪时，不重复收费。';
async function load(page:Page,type:'STUDY'|'LEARN',game=examples.get(type).before){
 const before=await importRecoveryFixture(page,game);await openHubFeature(page,'skills');
 await page.getByTestId(type==='STUDY'?'equipment-mode-manual':'equipment-mode-skills').click();
 if(type==='LEARN')await selectLearningSkill(page,examples.get(type).action.skill);
 return before;
}
async function frame(page:Page,info:TestInfo,name:string){
 await captureFixedPng(page,info.outputPath(name+'.png'));
 const geometry=await page.locator('dialog[open]').count()?await page.locator('dialog[open]').evaluate(measure):await planner(page).evaluate(measure);
 for(const c of geometry.controls){expect(c.width,c.text).toBeGreaterThanOrEqual(44);expect(c.height,c.text).toBeGreaterThanOrEqual(44);expect(c.inside,c.text).toBe(true);expect(c.hit,c.text).toBe(true);}
 for(const row of geometry.words){expect(row.font,row.text).toBeGreaterThanOrEqual(row.small?14:18);expect(row.inside,row.text).toBe(true);}
 await info.attach(name+'-geometry',{body:JSON.stringify(geometry),contentType:'application/json'});
}
function measure(root:HTMLElement){
 const r=root.getBoundingClientRect(),nav=document.getElementById('primary-navigation')!.getBoundingClientRect();
 const inside=(b:DOMRect)=>b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1&&b.bottom<=nav.top;
 const visible=(n:HTMLElement)=>n.checkVisibility()&&!n.closest('dialog:not([open])');
 return {controls:[...root.querySelectorAll<HTMLElement>('button,input,summary')].filter(visible).map(n=>{const b=n.getBoundingClientRect(),h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {text:n.innerText,width:b.width,height:b.height,inside:inside(b),hit:n.matches(':disabled')||h===n||!!h&&n.contains(h)};}),words:[...root.querySelectorAll<HTMLElement>('.learning-object p,.learning-object strong,.learning-object small,.preparation-estimate strong,.preparation-estimate small,.jade-cycle-status strong,.jade-cycle-status small')].filter(visible).map(n=>{const range=document.createRange();range.selectNodeContents(n);return {text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),small:n.matches('small'),inside:[...range.getClientRects()].filter(b=>b.width&&b.height).every(inside)};})};
}
test('CEND08-F01-A1 one manual keeps actual effect cost and finite budget beside the action while complete terms remain readonly',async({page},info)=>{
 const before=await load(page,'STUDY'),raw=await database(page);
 await expect(page.getByTestId('jade-study-status')).toHaveCount(0);
 await expect(page.getByTestId('sword-manual')).toContainText('80 灵石 · 60 秒 · 青云宗');
 await expect(page.getByTestId('sword-manual')).not.toContainText(temple);
 await expect(main(page)).toContainText('累计灵石上限 80 · 保留 0');
 await expect(estimate(page)).toContainText('预计完成 1 次参悟 · 消耗 80 灵石');
 await expect(estimate(page).locator('small')).toHaveCount(0);
 await expect(page.getByTestId('preparation-start')).toHaveText('安排参悟一次');
 await frame(page,info,'manual-one-current-decision');
 await openLearningSettings(page);
 const detail=page.getByTestId('learning-plan-dialog');
 await expect(detail).toContainText(temple);await expect(detail).toContainText(note);
 await expect(detail).toContainText('预计停止：完成本段次数后停手');
 await expect(page.getByLabel('累计研习灵石预算',{exact:true})).toHaveValue('80');
 await frame(page,info,'manual-complete-terms');await closeLearningSettings(page);
 expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});
test('CEND08-F01-A2 learning keeps an actual budget failure visible and retains edited finite limits when the terms close',async({page},info)=>{
 const before=await load(page,'LEARN'),raw=await database(page),id=examples.get('LEARN').action.skill;
 await page.getByTestId('learn-'+id).click();
 await expect(page.getByTestId('jade-study-status')).toHaveCount(0);
 await expect(estimate(page).locator('small')).toHaveCount(0);await frame(page,info,'learning-one-current-decision');
 await openLearningSettings(page);await page.getByLabel('累计研习灵石预算',{exact:true}).fill('0');await closeLearningSettings(page);
 const p={kind:'learn' as const,skills:[id],maxCycles:1,stoneBudget:0,stoneReserve:0},quote=previewActivity(before,p);expect(quote.allowed).toBe(false);
 await expect(estimate(page)).toContainText('暂不可开始');await expect(estimate(page).locator('small')).toBeVisible();
 await expect(page.getByTestId('preparation-start')).toBeDisabled();await frame(page,info,'learning-budget-blocker-stays-visible');
 await openLearningSettings(page);await expect(page.getByLabel('累计研习灵石预算',{exact:true})).toHaveValue('0');await expect(page.getByTestId('learning-plan-dialog')).toContainText(note);await closeLearningSettings(page);
 const second=Object.keys(C.skills).find(key=>key!==id&&!before.learned.includes(key)&&C.rank(C.skills[key].min)<=C.rank(before.core.player.realm))!;expect(second).toBeTruthy();
 await selectLearningSkill(page,second);await page.getByTestId('learn-'+second).click();await openLearningSettings(page);await page.getByLabel('累计研习灵石预算',{exact:true}).fill(String(C.skills[id].price));await closeLearningSettings(page);
 const partial=previewActivity(before,{kind:'learn',skills:[id,second],maxCycles:2,stoneBudget:C.skills[id].price,stoneReserve:0});expect(partial.allowed).toBe(true);expect(partial.cycles).toBe(1);expect(partial.stopReason?.code).not.toBe('CYCLES_COMPLETE');
 await expect(main(page)).toContainText('研习清单 2 卷');await expect(estimate(page).locator('small')).toBeVisible();await expect(page.getByTestId('preparation-start')).toBeEnabled();await frame(page,info,'partial-budget-stop-stays-visible');
 expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});
test('CEND08-F01-A3 a genuinely mastered manual still shows its saved fact and complete original reference with no repeat action',async({page},info)=>{
 const example=examples.get('STUDY'),g=example.before;
 const formal=resolve(g,{...example.action,commandId:'cend08-mastered-reference',runId:g.core.runId,expectedRevision:g.core.revision});expect(formal.result.executedSteps).toBe(1);expect(formal.result.stopReason).toBeNull();
 const before=await load(page,'STUDY',formal.nextState),raw=await database(page);
 await expect(page.getByTestId('jade-study-status')).toContainText('剑简已悟');await expect(page.getByTestId('preparation-start')).toHaveCount(0);
 await expect(page.getByTestId('sword-manual')).toContainText('首次参悟条件：80 灵石 · 60 秒 · 青云宗');
 await frame(page,info,'mastered-manual-real-fact');expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});
test('CEND08-F01-A4 a real location gate remains on the main decision and looking at terms never travels or learns',async({page},info)=>{
 const g=examples.get('STUDY').before,formal=resolve(g,{type:'TRAVEL',location:'cave',commandId:'cend08-reference-travel',runId:g.core.runId,expectedRevision:g.core.revision});expect(formal.result.executedSteps).toBe(1);expect(formal.result.stopReason).toBeNull();
 const before=await load(page,'STUDY',formal.nextState),raw=await database(page);
 await expect(estimate(page)).toContainText('暂不可开始');await expect(estimate(page).locator('small')).toBeVisible();
 await expect(page.getByTestId('preparation-travel')).toHaveText('前往青云宗 · 不自动研习');
 await frame(page,info,'manual-location-gate');await openLearningSettings(page);await closeLearningSettings(page);
 expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});
test('CEND08-F01-A5 admitted manual work keeps its real countdown and pause survives reload without a learned fact or new authorization',async({page},info)=>{
 await page.clock.install({time:new Date('2032-06-01T00:00:00Z')});const before=await load(page,'STUDY');
 await page.getByTestId('preparation-start').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');
 const a=await activity(page);expect(a.cycleMs).toBe(60000);expect(a.plan).toMatchObject({kind:'study',manual:'jinghong',maxCycles:1,stoneBudget:80,stoneReserve:0});
 await page.clock.fastForward(1000);await expect(page.getByTestId('jade-study-status')).toContainText('循剑意参悟');await expect(page.getByTestId('training-countdown')).toHaveText('59.0 秒');expect((await activity(page)).cycleMs).toBe(60000);
 expect(await snapshot(page)).toEqual(before);await frame(page,info,'manual-running-real-countdown');
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');const paused=await activity(page),raw=await database(page);
 await expect(page.getByTestId('jade-study-status')).toContainText('此段研习已暂停');await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-manual').click();
 await expect(page.getByTestId('jade-study-status')).toContainText('此段研习已暂停');await frame(page,info,'manual-paused-after-reload');
 expect(await activity(page)).toEqual(paused);expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});
