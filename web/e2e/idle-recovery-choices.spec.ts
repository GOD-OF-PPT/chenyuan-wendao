import {test,expect,type Page} from '@playwright/test';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {fullRoute} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine.ts';
import {snapshot,activitySnapshot,useJourneyClock} from './support';
import {decision,selectPlan,settleVisibleActivity} from './idle-route-support';
import {importRecoveryFixture,recoveryDatabase,control600,stored} from './idle-recovery-ui-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();test.beforeEach(({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(async({page})=>{if(!page.isClosed())await page.evaluate(()=>(window as any).__m04ChoiceRestorePut?.());expect(errors.get(page)).toEqual([]);});
async function fault(page:Page,kind:'START'|'TICK'|'abort'){
 await page.evaluate(kind=>{const put=IDBObjectStore.prototype.put,w=window as any;w.__m04ChoiceRestorePut=()=>IDBObjectStore.prototype.put=put;w.__m04ChoiceRejected=null;
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(kind==='abort'&&this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-state'&&key==='current'){w.__m04ChoiceRejected={current:structuredClone(value),requestSuccess:false,abortCalled:false};const q=put.call(this,value,key!);q.addEventListener('success',()=>{w.__m04ChoiceRestorePut();w.__m04ChoiceRejected.requestSuccess=true;this.transaction.abort();w.__m04ChoiceRejected.abortCalled=true;},{once:true});return q;}if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-receipts'&&value?.input?.kind===kind){w.__m04ChoiceRejected=structuredClone(value);w.__m04ChoiceRestorePut();throw new DOMException('M04 explicit finite choice quota','QuotaExceededError');}return put.call(this,value,key!);};
 },kind);
}
async function due(page:Page){
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const a=await activitySnapshot(page),before=await recoveryDatabase(page);
 await expect(page.locator('[data-testid="training-activity"][data-generation="'+a.generation+'"][data-running="true"]')).toBeVisible();await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs/1000).toFixed(1)+' 秒');
 await page.clock.runFor(a.cycleMs-1);expect(await recoveryDatabase(page)).toEqual(before);await page.clock.runFor(1);return{a,before};
}
for(const ending of ['transmit','depart'])test(`M04-U6 ${ending} cancels only its unaccepted ending intent while a failed accepted closing cycle retains its original twelve-second retry`,async({page},info)=>{
 const initial=await importRecoveryFixture(page,trialJourneyScenario().states.at(-1)),before=await recoveryDatabase(page);let selected=await selectPlan(page,{kind:'milestone',action:{type:'END',ending},maxCycles:1});
 await fault(page,'START');await decision(page,selected.control);await expect(page.getByTestId('ascension-error')).toContainText('存储空间不足');expect(await recoveryDatabase(page)).toEqual(before);
 const rejectedStart=await page.evaluate(()=>(window as any).__m04ChoiceRejected);expect(rejectedStart.input.kind).toBe('START');await decision(page,page.getByTestId('ascension-cancel'));await expect(page.getByTestId('retry')).toHaveCount(0);expect(await recoveryDatabase(page)).toEqual(before);
 selected=await selectPlan(page,{kind:'milestone',action:{type:'END',ending},maxCycles:1});await decision(page,selected.control);await fault(page,'TICK');const pending=await due(page);expect(pending.a.cycleMs).toBe(12000);
 await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await recoveryDatabase(page)).toEqual(pending.before);expect(await snapshot(page)).toEqual(initial);const rejectedTick=await page.evaluate(()=>(window as any).__m04ChoiceRejected);
 expect(rejectedTick.input.tick.commandId).toBe(pending.a.nextCommand.commandId);await expect(page.getByTestId('ascension-confirmation')).not.toBeVisible();await page.screenshot({path:info.outputPath('failed-'+ending+'-accepted-cycle.png')});
 await page.getByTestId('retry').click();await expect(page.getByTestId('save-status')).toHaveText('已保存');const after=await snapshot(page);expect(after).toEqual(resolve(initial,pending.a.nextCommand).nextState);expect(after.ending).toBe(ending);expect(after.core.inventory).toEqual(initial.core.inventory);expect(after.core.world).toEqual(initial.core.world);expect(after.core.revision).toBe(initial.core.revision+1);
 const raw=await recoveryDatabase(page),receipts=raw.rows['full-receipts'].filter((r:any)=>r.value?.input?.kind==='TICK');expect(receipts).toHaveLength(1);expect(receipts[0].value.input.tick).toEqual(rejectedTick.input.tick);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(after);expect(await recoveryDatabase(page)).toEqual(raw);await expect(page.getByTestId('ending-'+ending)).toHaveCount(0);
});

test('M04-U8 real duplicate confirmation accepts one finite breakthrough and charges one actual pill only at its full deadline',async({page})=>{
 const before=await importRecoveryFixture(page,fullRoute().checkpoints.qi),selected=await selectPlan(page,{kind:'milestone',action:{type:'BREAKTHROUGH'},maxCycles:1});
 await expect(selected.control).toBeEnabled();await selected.control.dblclick();const pending=await due(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');const raw=await recoveryDatabase(page),after=stored(raw,'current');expect(after).toEqual(resolve(before,pending.a.nextCommand).nextState);expect(after.core.inventory.foundation_pill).toBe(before.core.inventory.foundation_pill-1);expect(after.core.revision).toBe(before.core.revision+1);expect(raw.rows['full-receipts'].filter((r:any)=>r.value?.input?.kind==='START')).toHaveLength(1);expect(raw.rows['full-receipts'].filter((r:any)=>r.value?.input?.kind==='TICK')).toHaveLength(1);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await recoveryDatabase(page)).toEqual(raw);
});

test('M04-U9 two explicit ending reviews cannot seal twice or end the other page replacement life',async({page,context})=>{
 await importRecoveryFixture(page,trialJourneyScenario().states.at(-1));await selectPlan(page,{kind:'milestone',action:{type:'END',ending:'transmit'},maxCycles:1});const other=await context.newPage();other.on('pageerror',e=>errors.get(page)!.push(e.message));
 try{
  await useJourneyClock(other);await other.goto('/');await expect(other.getByTestId('save-status')).toHaveText('已保存');const selected=await selectPlan(other,{kind:'milestone',action:{type:'END',ending:'depart'},maxCycles:1});await decision(other,selected.control);await settleVisibleActivity(other);const sealed=await snapshot(other),raw=await recoveryDatabase(other);
  await expect(page.getByTestId('ascension-stale')).toBeVisible();await expect(page.getByTestId('ascension-confirm')).toBeDisabled();expect(await snapshot(page)).toEqual(sealed);expect(await recoveryDatabase(page)).toEqual(raw);
  await other.getByRole('button',{name:'设置',exact:true}).click();other.once('dialog',d=>d.accept());await other.getByTestId('restart').click();await control600(other,raw);const replacement=await snapshot(other),protectedRaw=await recoveryDatabase(other);await expect.poll(async()=>(await snapshot(page)).core.runId).toBe(replacement.core.runId);await expect(page.getByTestId('ascension-stale')).toBeVisible();await expect(page.getByTestId('ascension-confirm')).toBeDisabled();await decision(page,page.getByTestId('ascension-cancel'));expect(await recoveryDatabase(page)).toEqual(protectedRaw);expect(replacement.status).toBe('active');expect(replacement.core.player.realm).toBe('mortal');
 }finally{await other.close();}
});

test('M04-U10 put success followed by a real native abort publishes no breakthrough success and retries only its original full-period command',async({page},info)=>{
 const before=await importRecoveryFixture(page,fullRoute().checkpoints.qi),selected=await selectPlan(page,{kind:'milestone',action:{type:'BREAKTHROUGH'},maxCycles:1});await decision(page,selected.control);await fault(page,'abort');const pending=await due(page);
 await expect(page.getByTestId('error')).toBeVisible();await expect(page.getByTestId('save-status')).toHaveText('保存待确认');expect(await recoveryDatabase(page)).toEqual(pending.before);expect(await snapshot(page)).toEqual(before);const failed=await page.evaluate(()=>(window as any).__m04ChoiceRejected);expect(failed.requestSuccess).toBe(true);expect(failed.abortCalled).toBe(true);await page.screenshot({path:info.outputPath('native-abort-no-false-breakthrough.png')});
 await page.getByTestId('retry').click();await expect(page.getByTestId('save-status')).toHaveText('已保存');const raw=await recoveryDatabase(page);expect(stored(raw,'current')).toEqual(resolve(before,pending.a.nextCommand).nextState);expect(stored(raw,'checkpoint').snapshot).toEqual(before);const receipts=raw.rows['full-receipts'].filter((x:any)=>x.value?.input?.kind==='TICK');expect(receipts).toHaveLength(1);expect(receipts[0].value.input.tick.commandId).toBe(pending.a.nextCommand.commandId);
});

test('M04-U11 malformed JSON stays in the actual import surface and cannot overwrite any complete good Game record',async({page})=>{
 const before=await importRecoveryFixture(page,fullRoute().checkpoints.qi),raw=await recoveryDatabase(page);await page.getByRole('button',{name:'设置',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByTestId('import').setInputFiles({name:'invalid-json-boundary.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
 await expect(page.getByTestId('action-countdown')).toHaveText('0.6 秒');await page.clock.runFor(599);expect(await recoveryDatabase(page)).toEqual(raw);await page.clock.runFor(1);await expect(page.getByTestId('settings-error')).toContainText('JSON');await expect(page.getByTestId('settings-save-status')).toHaveText('保存待确认');await expect(page.getByTestId('import')).toBeEnabled();expect(await snapshot(page)).toEqual(before);expect(await recoveryDatabase(page)).toEqual(raw);
});
