import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {completeActivity} from '../../src/full/activity';
import {canonicalFingerprint} from '../../src/full/receipts';
import {validateActivityReceipt} from '../src/activity-persistence';
import {snapshot,activitySnapshot as activity} from './support';
import {importRecoveryFixture,recoveryDatabase as database,recoveryReadonly as readonly,stored} from './idle-recovery-ui-support';
import {openProductionSettings,closeProductionSettings,openProductionIntent,selectAlchemyRecipe} from './stage-support';
import {captureFixedPng} from './png-capture';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
function fixture(herbs=0){const d=driver();d.realm();d.funds(200);if(herbs)d.resource('herb',herbs);d.go('cave');return d.game;}
async function furnace(page:Page){await page.getByTestId('hub-forge').click();await selectAlchemyRecipe(page,'healing');await expect(page.getByTestId('alchemy-workshop')).toBeVisible();}
async function budget(page:Page,value:string){
 await openProductionSettings(page);await page.getByTestId('production-limits').click();
 await page.getByLabel('累计生产灵石预算',{exact:true}).fill(value);await page.getByTestId('production-apply-limits').click();
 await expect(page.getByTestId('alchemy-settings')).toBeVisible();
}
async function frame(page:Page,info:TestInfo,name:string){
 const dialog=page.getByTestId('alchemy-settings');await expect(dialog).toBeVisible();
 const g=await dialog.evaluate(root=>{
  const box=root.getBoundingClientRect(),inside=(r:DOMRect)=>r.left>=box.left&&r.right<=box.right&&r.top>=box.top&&r.bottom<=box.bottom;
  return{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,overflow:root.scrollHeight>root.clientHeight||root.scrollWidth>root.clientWidth,
   controls:[...root.querySelectorAll<HTMLElement>('button,input,select,summary')].filter(n=>n.checkVisibility()).map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.innerText,width:r.width,height:r.height,inside:inside(r),hit:hit===n||!!hit&&n.contains(hit)};}),
   text:[...root.querySelectorAll<HTMLElement>('.production-estimate strong,.production-estimate small')].filter(n=>n.checkVisibility()).map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return{text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),min:n.tagName==='SMALL'?14:18,inside:inside(r),ink:[...range.getClientRects()].filter(r=>r.width&&r.height).every(inside)};})};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(g),contentType:'application/json'});await captureFixedPng(page,info.outputPath(name+'.png'));
 expect(g.width).toBeLessThanOrEqual(1440);expect(g.height).toBeLessThanOrEqual(900);expect(g.overflow).toBe(false);
 for(const c of g.controls){expect(c.width,c.text).toBeGreaterThanOrEqual(44);expect(c.height,c.text).toBeGreaterThanOrEqual(44);expect(c.inside,c.text).toBe(true);expect(c.hit,c.text).toBe(true);}
 for(const t of g.text){expect(t.font,t.text).toBeGreaterThanOrEqual(t.min);expect(t.inside,t.text).toBe(true);expect(t.ink,t.text).toBe(true);}
}
async function started(page:Page){
 await page.getByTestId('production-start').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');
 const a=await activity(page);expect(a.version).toBe(3);expect(a.nextCommand.type).toBe('CRAFT');expect(a.cycleMs).toBe(30000);await expect(page.getByTestId('training-countdown')).toHaveText('30.0 秒');return a;
}
async function saved(page:Page,a:any,before:any,accepted:any,info:TestInfo,label:string){
 await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(a.completedCycles+1);const raw=await database(page),formal=resolve(before,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId;
 const rows=raw.rows['full-receipts'].filter((r:any)=>r.key===key);expect(rows).toHaveLength(1);const receipt=rows[0].value;
 const input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}};
 expect(raw.version).toBe(9);expect(receipt.version).toBe(1);expect(receipt.input).toEqual(input);expect(receipt.fingerprint).toBe(canonicalFingerprint(input));expect(receipt.command).toEqual(a.nextCommand);expect(receipt.result).toEqual(formal.result);
 const now=receipt.activity.status==='running'?receipt.activity.startedAt:a.dueAt;expect(now).toBeGreaterThanOrEqual(a.dueAt);expect(receipt.activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now}));
 expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(raw,'current')).toEqual(formal.nextState);expect(stored(raw,'previous')).toEqual(before);expect(stored(raw,'activity')).toEqual(receipt.activity);expect(()=>validateActivityReceipt(receipt,formal.nextState)).not.toThrow();
 expect(raw.rows['full-receipts'].filter((r:any)=>r.key!==key)).toEqual(accepted.rows['full-receipts']);expect(raw.rows['full-state'].filter((r:any)=>!['current','previous','activity'].includes(r.key))).toEqual(accepted.rows['full-state'].filter((r:any)=>!['current','previous','activity'].includes(r.key)));
 for(const n of Object.keys(raw.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[n],n).toEqual(accepted.rows[n]);
 await info.attach(label+'-formal-atomic-proof',{body:JSON.stringify({before,a,accepted,formal,receipt,raw}),contentType:'application/json'});return{game:formal.nextState,raw};
}

test('CHECK-UX3133-C1 missing alchemy ingredients lead with their real gate while complete settings and material-source returns stay readonly',async({page},info)=>{
 const before=await importRecoveryFixture(page,fixture()),raw=await database(page);expect(before.core.inventory.herb).toBe(0);await furnace(page);await openProductionIntent(page);await frame(page,info,'missing-material-complete-arrangement');
 const estimate=page.getByTestId('production-estimate');await expect(estimate.locator('strong')).toContainText('凝气草不足');await expect(estimate).not.toContainText('预计 0 炉');await expect(estimate).not.toContainText('成品 暂无');await expect(page.getByTestId('production-start')).toBeDisabled();
 await page.getByTestId('production-limits').click();await expect(page.getByLabel('累计生产灵石预算')).toHaveValue('10');await expect(page.getByLabel('累计生产游戏月预算')).toHaveValue('5');await expect(page.getByLabel('凝气草保留量')).toBeVisible();await page.getByRole('button',{name:'取消调整',exact:true}).click();await closeProductionSettings(page);
 await page.getByTestId('production-source-herb').click();await expect(page.getByTestId('goal-panel')).toBeVisible();expect(await database(page)).toEqual(raw);await page.getByTestId('hub-close').click();await expect(page.getByTestId('alchemy-workshop')).toHaveAttribute('data-recipe','healing');await expect(page.getByTestId('production-source-herb')).toBeFocused();
 await openProductionIntent(page);await expect(page.getByLabel('炼丹炉次',{exact:true})).toHaveValue('5');expect(await database(page)).toEqual(raw);expect(await snapshot(page)).toEqual(before);expect(await activity(page)).toBeNull();await frame(page,info,'missing-material-return-retains-draft');
});

test('CHECK-UX3133-C2 a budget gate cannot masquerade as a zero forecast and a newly affordable furnace preserves the full original thirty-second transaction',async({page},info)=>{
 const before=await importRecoveryFixture(page,fixture(12));await furnace(page);await openProductionIntent(page);await page.getByLabel('炼丹炉次',{exact:true}).selectOption('1');const raw=await database(page);
 await budget(page,'0');await frame(page,info,'budget-gate-before-any-action');await expect(page.getByTestId('production-estimate').locator('strong')).toContainText('预算');await expect(page.getByTestId('production-estimate')).not.toContainText('预计 0 炉');await expect(page.getByTestId('production-start')).toBeDisabled();expect(await database(page)).toEqual(raw);
 await budget(page,'2');await expect(page.getByTestId('production-estimate')).toContainText('预计 1 炉 · 灵石消耗 2 · 1 游戏月');await expect(page.getByTestId('production-estimate')).toContainText('凝气草 ×2');await expect(page.getByTestId('production-estimate')).toContainText('回春丹 ×1');await frame(page,info,'affordable-complete-forecast');expect(await database(page)).toEqual(raw);await closeProductionSettings(page);
 const a=await started(page),accepted=await database(page);expect(a.plan.maxCycles).toBe(1);expect(a.plan.stoneBudget).toBe(2);const left=a.dueAt-await page.evaluate(()=>Date.now());await page.clock.fastForward(left-1);expect(await database(page)).toEqual(accepted);await page.clock.fastForward(1);const done=await saved(page,a,before,accepted,info,'affordable-single-furnace');expect(done.game.core.inventory.herb).toBe(before.core.inventory.herb-2);expect(done.game.core.inventory.healing_pill).toBe(before.core.inventory.healing_pill+1);expect((await activity(page)).status).toBe('stopped');await page.clock.fastForward(60000);expect(await database(page)).toEqual(done.raw);
});

test('CHECK-UX3133-C3 a failed original furnace remains the only retry while an unaffordable next draft and readonly sources cannot change its saved authorization',async({page},info)=>{
 const before=await importRecoveryFixture(page,fixture(12));await furnace(page);const a=await started(page),accepted=await database(page);expect(a.plan.stoneBudget).toBe(10);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.input?.kind==='TICK'){IDBObjectStore.prototype.put=put;throw new DOMException('CHECK UX3133 original furnace quota','QuotaExceededError');}return key===undefined?put.call(this,value):put.call(this,value,key);};});
 const left=a.dueAt-await page.evaluate(()=>Date.now());await page.clock.fastForward(left-1);expect(await database(page)).toEqual(accepted);await page.clock.fastForward(1);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(accepted);
 await readonly(page,async()=>{await budget(page,'0');await frame(page,info,'original-error-next-draft-gate');await expect(page.getByTestId('production-estimate').locator('strong')).toContainText('预算');await expect(page.getByTestId('production-estimate')).not.toContainText('预计 0 炉');await closeProductionSettings(page);await page.getByTestId('production-source-herb').click();await expect(page.getByTestId('goal-panel')).toBeVisible();await page.getByTestId('hub-close').click();});expect(await activity(page)).toEqual(a);await expect(page.getByTestId('retry')).toBeEnabled();
 await page.getByTestId('retry').click();const done=await saved(page,a,before,accepted,info,'same-original-furnace-retry');expect((await activity(page)).plan).toEqual(a.plan);await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');const paused=await database(page);await readonly(page,async()=>{await openProductionSettings(page);await page.getByTestId('production-limits').click();await expect(page.getByLabel('累计生产灵石预算')).toHaveValue('0');await page.getByRole('button',{name:'取消调整',exact:true}).click();await closeProductionSettings(page);});expect(await snapshot(page)).toEqual(done.game);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(paused);
});
