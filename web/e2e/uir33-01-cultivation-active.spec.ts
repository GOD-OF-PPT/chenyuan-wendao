import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {completeActivity} from '../../src/full/activity';
import {canonicalFingerprint} from '../../src/full/receipts';
import {validateActivityReceipt} from '../src/activity-persistence';
import {snapshot,activitySnapshot as activity,useJourneyClock} from './support';
import {importRecoveryFixture,recoveryDatabase as database,recoveryReadonly as readonly,stored} from './idle-recovery-ui-support';
import {openCultivationNotes,openTrainingBudget,selectAlchemyRecipe} from './stage-support';
import {captureFixedPng} from './png-capture';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const faults=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const rows:string[]=[];faults.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(({page})=>expect(faults.get(page)).toEqual([]));
function fixture(){const d=driver();d.go('cave');return d.game;}
const panel=(page:Page)=>page.getByTestId('cultivation-ongoing');
async function start(page:Page,method='natural'){
 if(method==='assisted')await page.getByTestId('cultivation-method-assisted').click();
 await page.getByTestId('cultivate').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');return activity(page);
}
async function frame(page:Page,info:TestInfo,name:string){
 await expect(panel(page)).toBeVisible();const g=await panel(page).evaluate(root=>{
  const box=root.getBoundingClientRect(),nav=document.getElementById('primary-navigation')!.getBoundingClientRect();
  const inside=(r:DOMRect)=>r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1;
  return{body:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},safe:box.bottom<=nav.top,
   text:[...root.querySelectorAll<HTMLElement>('h2,p,small')].map(n=>{const r=document.createRange();r.selectNodeContents(n);return{text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),min:n.tagName==='SMALL'?14:18,ink:[...r.getClientRects()].filter(r=>r.width&&r.height).every(inside)};}),
   controls:[...root.querySelectorAll<HTMLButtonElement>('button')].map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),width:r.width,height:r.height,inside:inside(r),hit:hit===n||!!hit&&n.contains(hit),clipped:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1};})};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(g),contentType:'application/json'});await captureFixedPng(page,info.outputPath(name+'.png'));
 expect(g.body.width).toBeLessThanOrEqual(1440);expect(g.body.height).toBeLessThanOrEqual(900);expect(g.safe).toBe(true);
 for(const c of g.controls){expect(c.font,c.text).toBeGreaterThanOrEqual(18);expect(c.width,c.text).toBeGreaterThanOrEqual(44);expect(c.height,c.text).toBeGreaterThanOrEqual(44);expect(c.inside,c.text).toBe(true);expect(c.hit,c.text).toBe(true);expect(c.clipped,c.text).toBe(false);}
 for(const t of g.text){expect(t.font,t.text).toBeGreaterThanOrEqual(t.min);expect(t.ink,t.text).toBe(true);}
}
async function saved(page:Page,info:TestInfo,a:any,before:any,accepted:any){
 await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(a.completedCycles+1);
 const raw=await database(page),formal=resolve(before,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId,rows=raw.rows['full-receipts'].filter((r:any)=>r.key===key);
 expect(rows).toHaveLength(1);const r=rows[0].value,input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}};
 expect(r.version).toBe(1);expect(r.input).toEqual(input);expect(r.fingerprint).toBe(canonicalFingerprint(input));expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);
 const now=r.activity.status==='running'?r.activity.startedAt:a.dueAt;expect(now).toBeGreaterThanOrEqual(a.dueAt);expect(r.activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now}));expect(()=>validateActivityReceipt(r,formal.nextState)).not.toThrow();
 expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(raw,'current')).toEqual(formal.nextState);expect(stored(raw,'previous')).toEqual(before);expect(stored(raw,'activity')).toEqual(r.activity);expect(raw.version).toBe(9);
 expect(raw.rows['full-receipts'].filter((x:any)=>x.key!==key)).toEqual(accepted.rows['full-receipts']);expect(raw.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key))).toEqual(accepted.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key)));
 for(const n of Object.keys(raw.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[n],n).toEqual(accepted.rows[n]);
 await info.attach('formal-atomic-cycle',{body:JSON.stringify({a,before,accepted,formal,raw}),contentType:'application/json'});return formal.nextState;
}
async function cycle(page:Page,info:TestInfo,a:any,before:any){const raw=await database(page),left=a.dueAt-await page.evaluate(()=>Date.now());await page.clock.fastForward(left-1);expect(await database(page)).toEqual(raw);await page.clock.fastForward(1);return saved(page,info,a,before,raw);}

test('UIR33-01-A1 the running cultivation stage replaces new-plan controls with real pause and original-budget keyboard continuation',async({page},info)=>{
 const before=await importRecoveryFixture(page,fixture()),a=await start(page);await expect(panel(page).locator('h2')).toHaveText('自然吐纳');await expect(page.getByTestId('cultivate')).toHaveCount(0);await expect(page.getByTestId('cultivation-method-natural')).toHaveCount(0);await frame(page,info,'natural-running');
 await page.clock.fastForward(5000);await expect(page.getByTestId('training-countdown')).toHaveText('55.0 秒');await expect(page.getByTestId('cultivation-cycle-clock')).toContainText('55 秒');expect(await snapshot(page)).toEqual(before);
 await page.getByTestId('cultivation-active-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');const paused=await activity(page),raw=await database(page);await expect(panel(page)).toContainText('沿用原段额度，本轮重新计时');await frame(page,info,'natural-paused');await page.clock.fastForward(86400000);expect(await database(page)).toEqual(raw);
 await readonly(page,async()=>{await openCultivationNotes(page);await page.getByTestId('hub-cultivation-details').click();await openTrainingBudget(page);await expect(page.getByLabel('累计灵石预算',{exact:true})).toBeVisible();await page.getByTestId('hub-close').click();await expect(page.getByTestId('cultivation-notes-open')).toBeFocused();});
 await page.getByTestId('cultivation-active-resume').focus();await page.keyboard.press('Enter');await expect.poll(async()=>(await activity(page))?.generation).toBeGreaterThan(paused.generation);const resumed=await activity(page);expect(resumed.id).toBe(a.id);expect(resumed.plan).toEqual(a.plan);expect(resumed.spentStones).toBe(a.spentStones);await expect(page.getByTestId('training-countdown')).toHaveText('60.0 秒');await cycle(page,info,resumed,before);await frame(page,info,'natural-saved-cycle');
});

test('UIR33-01-A2 assisted identity actual spending and finite limits survive readonly plan inspection refresh and explicit takeover',async({page,context},info)=>{
 const before=await importRecoveryFixture(page,fixture()),a=await start(page,'assisted');await expect(page.getByTestId('cultivation-site')).toHaveAttribute('data-method','assisted');const next=await cycle(page,info,a,before);const one=await activity(page);expect(one.spentStones).toBe(20);await expect(panel(page)).toContainText('用石 20 / 40');await frame(page,info,'assisted-spent-first-cycle');
 await readonly(page,async()=>{await page.getByTestId('cultivation-active-plan').click();await openTrainingBudget(page);await expect(page.getByLabel('累计灵石预算',{exact:true})).toHaveValue('40');await page.getByTestId('hub-close').click();await expect(page.getByTestId('cultivation-active-plan')).toBeFocused();});
 const accepted=await database(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect(page.getByTestId('cultivation-active-resume')).toHaveText('继续修炼');await expect(page.getByTestId('training-countdown')).toHaveCount(0);await expect(page.getByTestId('cultivation-site')).toHaveAttribute('data-method','assisted');await frame(page,info,'assisted-awaiting-takeover');await page.clock.fastForward(86400000);expect(await database(page)).toEqual(accepted);
 await page.getByTestId('cultivation-active-resume').click();await expect.poll(async()=>(await activity(page))?.ownerId).not.toBe(one.ownerId);const resumed=await activity(page);expect(resumed.id).toBe(a.id);expect(resumed.plan).toEqual(a.plan);expect(resumed.spentStones).toBe(20);await cycle(page,info,resumed,next);expect((await activity(page)).spentStones).toBe(40);expect((await activity(page)).status).toBe('stopped');await expect(panel(page)).toHaveCount(0);const stopped=await database(page);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(stopped);
});

test('UIR33-01-A3 a failed cycle exposes the canonical retry while viewing the next draft cannot replace the accepted command',async({page},info)=>{
 const before=await importRecoveryFixture(page,fixture()),a=await start(page),raw=await database(page);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.input?.kind==='TICK'){IDBObjectStore.prototype.put=put;throw new DOMException('UIR33-01 actual quota','QuotaExceededError');}return key===undefined?put.call(this,value):put.call(this,value,key);};});
 await page.clock.fastForward(a.cycleMs);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(raw);await expect(panel(page)).toContainText('请先处理上方存档提示');await expect(page.getByTestId('cultivation-active-pause')).toHaveCount(0);await expect(page.getByTestId('cultivation-active-resume')).toHaveCount(0);await frame(page,info,'original-error-main-stage');
 await readonly(page,async()=>{await openCultivationNotes(page);await page.getByTestId('hub-cultivation-details').click();await page.getByTestId('cultivation-method-assisted').click();await openTrainingBudget(page);await page.getByLabel('累计灵石预算',{exact:true}).fill('0');await page.getByTestId('hub-close').click();});expect(await activity(page)).toEqual(a);
 await page.getByTestId('retry').click();await saved(page,info,a,before,raw);await expect(panel(page).locator('h2')).toHaveText('自然吐纳');expect((await activity(page)).plan).toEqual(a.plan);await page.getByTestId('cultivation-active-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');
});

test('UIR33-01-A4 the stage pause during a held atomic save settles only that cycle without starting another',async({page},info)=>{
 const before=await importRecoveryFixture(page,fixture()),a=await start(page);
 await page.evaluate(()=>new Promise<void>((ok,no)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>no(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('full-state','readwrite');let hold=true;(window as any).__uirRelease=()=>{hold=false;};function keep(){const r=tx.objectStore('full-state').get('current');r.onsuccess=()=>{if(hold)keep();};}keep();tx.oncomplete=()=>db.close();ok();};}));
 try{await page.clock.fastForward(a.cycleMs);await expect(page.getByTestId('save-status')).toHaveText('保存中');await expect(panel(page)).toContainText('本轮保存中');await frame(page,info,'saving-main-stage');await page.getByTestId('cultivation-active-pause').click();await expect(panel(page)).toContainText('核对本轮后停手');await frame(page,info,'pausing-main-stage');}finally{await page.evaluate(()=>(window as any).__uirRelease());}
 await expect.poll(async()=>(await activity(page))?.status).toBe('paused');expect((await activity(page)).completedCycles).toBe(1);expect(await snapshot(page)).toEqual(resolve(before,a.nextCommand).nextState);const raw=await database(page);expect(raw.rows['full-receipts'].filter((r:any)=>r.key===a.runId+':'+a.nextCommand.commandId)).toHaveLength(1);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(raw);
});

test('UIR33-01-A5 another cave activity keeps its real name controls and authorization instead of a disabled cultivation draft',async({page},info)=>{
 const d=driver();d.resource('herb',4);d.go('cave');const before=await importRecoveryFixture(page,d.game);await page.getByTestId('hub-forge').click();await selectAlchemyRecipe(page,'healing');await page.getByTestId('production-start').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);expect(a.version).toBe(3);await page.getByTestId('tab-0').click();await expect(panel(page).locator('h2')).toHaveText('炼制回春丹');await expect(panel(page)).not.toContainText('本段修为');await expect(page.getByTestId('cultivation-active-pause')).toHaveText('暂停炼丹');await expect(page.getByTestId('cultivate')).toHaveCount(0);await frame(page,info,'alchemy-on-cultivation-stage');
 await readonly(page,async()=>{await page.getByTestId('cultivation-active-plan').click();await expect(page.getByTestId('alchemy-workshop')).toBeVisible();await page.getByTestId('tab-0').click();});expect((await activity(page)).nextCommand).toEqual(a.nextCommand);await page.getByTestId('cultivation-active-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');await expect(page.getByTestId('cultivation-active-resume')).toHaveText('继续炼丹');expect(await snapshot(page)).toEqual(before);expect((await activity(page)).plan).toEqual(a.plan);
});
