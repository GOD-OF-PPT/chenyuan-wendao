import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {feedbackExamples} from '../../tests/action-feedback-fixtures.mjs';
import {resolve,validateGame} from '../../src/full/engine';
import {getLifeRecord,exportLifeText} from '../../src/full/queries';
import {completeActivity} from '../../src/full/activity';
import {canonicalFingerprint} from '../../src/full/receipts';
import {validateActivityReceipt} from '../src/activity-persistence';
import {lifeReadings} from '../src/story-pages';
import {snapshot,activitySnapshot as activity,openHubFeature,finishJourneyClock} from './support';
import {importRecoveryFixture,recoveryDatabase as database,recoveryReadonly as readonly,stored} from './idle-recovery-ui-support';
import {answerGameConfirmation} from './game-confirmation-support';
import {captureFixedPng} from './png-capture';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const e:string[]=[];errors.set(page,e);page.on('pageerror',v=>e.push(v.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));

async function frame(page:Page,info:TestInfo,name:string,photo=true){
 const data=await page.getByTestId('life-panel').evaluate(root=>{
  const rect=(n:Element)=>n.getBoundingClientRect(),nav=rect(document.getElementById('primary-navigation')!),reading=root.querySelector<HTMLElement>('.life-reading')!,p=reading.querySelector('p')!,title=root.querySelector<HTMLElement>('[data-testid=life-title]')!;
  const inside=(a:DOMRect,b:DOMRect)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5;
  const ranges=(n:Element)=>{const range=document.createRange();range.selectNodeContents(n);return[...range.getClientRects()].filter(r=>r.width&&r.height);};
  return{height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,text:p.textContent,key:reading.dataset.pageKey,font:parseFloat(getComputedStyle(p).fontSize),ink:ranges(p).every(r=>inside(r,rect(p))&&inside(r,rect(reading))&&inside(r,rect(root.querySelector('.life-scroll-canvas')!))),title:title.innerText,titleFont:parseFloat(getComputedStyle(title).fontSize),titleInside:inside(rect(title),rect(root.querySelector('.life-scroll-title')!))&&ranges(title).every(r=>inside(r,rect(title))),controls:[...root.querySelectorAll<HTMLButtonElement>('button')].filter(n=>n.checkVisibility()).map(n=>{const r=rect(n),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.innerText,width:r.width,height:r.height,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=nav.top,hit:n.disabled||hit===n||!!hit&&n.contains(hit),clipped:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1};})};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(data),contentType:'application/json'});
 if(photo)await captureFixedPng(page,info.outputPath(name+'.png'));
 expect(data.width).toBeLessThanOrEqual(1440);expect(data.height).toBeLessThanOrEqual(900);expect(data.font).toBeGreaterThanOrEqual(18);expect(data.ink).toBe(true);expect(data.titleFont).toBeGreaterThanOrEqual(18);expect(data.titleInside).toBe(true);
 for(const c of data.controls){expect(c.width,c.text).toBeGreaterThanOrEqual(44);expect(c.height,c.text).toBeGreaterThanOrEqual(44);expect(c.inside,c.text).toBe(true);expect(c.hit,c.text).toBe(true);expect(c.clipped,c.text).toBe(false);}
 return data;
}
async function first(page:Page,game:any,info:TestInfo,name:string){
 await frame(page,info,name);const r=getLifeRecord(game),row=page.locator('.life-reading');await expect(row).toHaveAttribute('data-page-key','life-now');await expect(row.locator('p')).toContainText(r.overview.ageLabel);await expect(row.locator('p')).toContainText(r.overview.realmName);await expect(row.locator('p')).toContainText(r.opening.text);if(r.realms.length)await expect(row.locator('p')).toContainText(r.realms.at(-1)!.text);
 await expect(page.getByTestId('life-title')).toHaveText(game.core.player.name+' · 修行纪事');await expect(page.locator('.life-scroll-binding')).toHaveText('此卷未封');await expect(row).not.toContainText('尚未作出此生的结束选择');
}
async function exportCurrent(page:Page,g:any){await readonly(page,async()=>{await page.getByTestId('life-manage-open').click();const event=page.waitForEvent('download');await page.getByTestId('export-life').click();const stream=await(await event).createReadStream(),chunks:Buffer[]=[];for await(const c of stream!)chunks.push(c);expect(Buffer.concat(chunks).toString('utf8')).toBe(exportLifeText(g));await page.getByTestId('life-manage-close').click();await expect(page.getByTestId('life-manage-open')).toBeFocused();});}
async function saved(page:Page,a:any,before:any,accepted:any){
 await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(a.completedCycles+1);const raw=await database(page),formal=resolve(before,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId,rs=raw.rows['full-receipts'].filter((r:any)=>r.key===key);expect(rs).toHaveLength(1);const r=rs[0].value,input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}};
 expect(r.input).toEqual(input);expect(r.fingerprint).toBe(canonicalFingerprint(input));expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);expect(r.version).toBe(a.version>=5?2:1);const now=r.proof?.resolvedAt??(r.activity.status==='running'?r.activity.startedAt:a.dueAt);expect(now).toBeGreaterThanOrEqual(a.dueAt);expect(r.activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now}));expect(()=>validateActivityReceipt(r,formal.nextState)).not.toThrow();expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(raw,'current')).toEqual(formal.nextState);expect(stored(raw,'previous')).toEqual(before);expect(stored(raw,'activity')).toEqual(r.activity);
 expect(raw.rows['full-receipts'].filter((r:any)=>r.key!==key)).toEqual(accepted.rows['full-receipts']);expect(raw.rows['full-state'].filter((r:any)=>!['current','previous','activity'].includes(r.key))).toEqual(accepted.rows['full-state'].filter((r:any)=>!['current','previous','activity'].includes(r.key)));for(const n of Object.keys(raw.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[n]).toEqual(accepted.rows[n]);return{game:formal.nextState,raw};
}

for(const choice of ['leave','help','trade'] as const)test('UIR33-06 opening '+choice+' leads with the actual life instead of repeated unsealed instructions',async({page},info)=>{
 const d=driver(choice);d.go('cave');const before=await importRecoveryFixture(page,d.game),raw=await database(page);await openHubFeature(page,'life');await first(page,before,info,'opening-'+choice);await exportCurrent(page,before);await first(page,before,info,'opening-'+choice+'-returned');expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});

test('UIR33-06 longest lawful name and complete late chapters preserve every original fact and unchanged text export',async({page},info)=>{
 const fixture=structuredClone(feedbackExamples().actions.get('END')!.before);fixture.core.player.name='长'.repeat(16);validateGame(fixture);const before=await importRecoveryFixture(page,fixture),raw=await database(page);await openHubFeature(page,'life');await first(page,before,info,'long-name-first-page');
 for(const group of ['life','training','decisions','seal']){await page.getByTestId('life-mode-'+group).click();const panel=page.getByTestId('life-panel'),prev=panel.getByTestId('catalogue-prev'),next=panel.getByTestId('catalogue-next');while(await prev.isEnabled())await prev.click();const source=lifeReadings(before).filter(r=>r.group===group),seen=new Map<string,string>();
  for(let i=0;i<100;i++){const row=panel.locator('.life-reading'),key=(await row.getAttribute('data-page-key'))!,text=(await row.locator('p').textContent())!;expect(Array.from(text).length).toBeLessThanOrEqual(140);seen.set(key,(seen.get(key)??'')+text);await frame(page,info,group+'-page-'+i,i===0||await next.isDisabled());if(await next.isDisabled())break;await next.click();}
  expect([...seen.keys()].sort()).toEqual(source.map(r=>r.key).sort());for(const row of source)expect(seen.get(row.key),row.key).toBe(row.text);if(group==='life')expect([...seen.keys()].at(-1)).toBe('life-conclusion');
 }
 await exportCurrent(page,before);expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});

test('UIR33-06 one original cultivation cycle preserves the selected life record and context through ordinary return',async({page},info)=>{
 const d=driver();d.go('cave');const before=await importRecoveryFixture(page,d.game);await page.getByTestId('cultivate').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);await readonly(page,async()=>{await openHubFeature(page,'life');await first(page,before,info,'running-life-entry');const panel=page.getByTestId('life-panel');await panel.getByTestId('catalogue-next').click();await panel.getByTestId('catalogue-next').click();await expect(panel.locator('.life-reading')).toHaveAttribute('data-page-key','life-opening');await page.getByTestId('feature-goal').click();await page.getByTestId('hub-close').click();await expect(panel.locator('.life-reading')).toHaveAttribute('data-page-key','life-opening');});
 const accepted=await database(page),left=a.dueAt-await page.evaluate(()=>Date.now());await page.clock.fastForward(left-1);expect(await database(page)).toEqual(accepted);await page.clock.fastForward(1);const done=await saved(page,a,before,accepted);await expect(page.locator('.life-reading')).toHaveAttribute('data-page-key','life-opening');await frame(page,info,'same-reading-after-original-cycle');await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');await readonly(page,async()=>{const panel=page.getByTestId('life-panel');while(await panel.getByTestId('catalogue-prev').isEnabled())await panel.getByTestId('catalogue-prev').click();await first(page,done.game,info,'current-facts-after-cycle');});expect(await snapshot(page)).toEqual(done.game);
});

test('UIR33-06 a failed twelve-second retirement keeps the active entry and only its original retry reveals the sealed conclusion',async({page},info)=>{
 const before=await importRecoveryFixture(page,feedbackExamples().actions.get('RETIRE')!.before);await openHubFeature(page,'life');await first(page,before,info,'before-retirement');await page.getByTestId('life-manage-open').click();await page.getByTestId('retire').click();await page.getByTestId('life-confirm-end').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page),accepted=await database(page);expect(a.cycleMs).toBe(12000);await page.clock.fastForward(11999);expect(await database(page)).toEqual(accepted);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.input?.kind==='TICK'){IDBObjectStore.prototype.put=put;throw new DOMException('UIR33-06 retirement quota','QuotaExceededError');}return key===undefined?put.call(this,value):put.call(this,value,key);};});await page.clock.fastForward(1);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(accepted);await first(page,before,info,'quota-still-active');await page.getByTestId('retry').click();const done=await saved(page,a,before,accepted);if(!await page.getByTestId('life-panel').isVisible())await page.getByTestId('sealed-open-life').click();await expect(page.getByTestId('life-title')).toHaveText(getLifeRecord(done.game).overview.title);await expect(page.locator('.life-reading')).toHaveAttribute('data-page-key','life-conclusion');await expect(page.locator('.life-reading p')).toHaveText(getLifeRecord(done.game).overview.conclusion);await frame(page,info,'actual-sealed-conclusion');await exportCurrent(page,done.game);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(done.raw);
});

test('UIR33-06 replacing a life restores its own factual first page without inheriting the old reading or intent',async({page},info)=>{
 const d=driver('leave');d.go('cave');const before=await importRecoveryFixture(page,d.game);await openHubFeature(page,'life');await page.getByTestId('life-mode-training').click();await page.getByTestId('life-panel').getByTestId('catalogue-next').click();const other=driver('trade','talisman');other.go('sect');await page.getByTestId('game-settings').click();await page.getByTestId('import').setInputFiles({name:'lawful-life-entry-replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(other.game))});await answerGameConfirmation(page,'import');await finishJourneyClock(page);await expect.poll(async()=>(await snapshot(page)).core.runId).not.toBe(before.core.runId);await page.getByRole('button',{name:'关闭设置',exact:true}).click();const current=await snapshot(page),raw=await database(page);if(!await page.getByTestId('life-panel').isVisible())await openHubFeature(page,'life');await first(page,current,info,'new-life-own-entry');await expect(page.getByTestId('life-mode-life')).toHaveAttribute('aria-pressed','true');expect(await activity(page)).toBeNull();expect(await database(page)).toEqual(raw);await exportCurrent(page,current);
});
