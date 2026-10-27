import {expect,type Page,type Locator} from '@playwright/test';
import {resolve} from '../../src/full/engine.ts';
import {completeActivity} from '../../src/full/activity.ts';
import {singleBattlePlan} from '../../src/full/adventure.ts';
import {canonicalFingerprint} from '../../src/full/receipts.ts';
import {snapshot,activitySnapshot,useJourneyClock} from './support';
import {selectPlan,decision,settleVisibleActivity,home} from './idle-route-support';

export async function recoveryDatabase(page:Page){return page.evaluate(()=>new Promise<any>((ok,no)=>{
 const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();no(Error('Readonly M04 observer cannot create Game storage'));};q.onerror=()=>no(q.error);
 q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};for(const n of db.objectStoreNames){rows[n]=[];const c=tx.objectStore(n).openCursor();c.onsuccess=()=>{if(c.result){rows[n].push({key:c.result.key,value:c.result.value});c.result.continue();}};}tx.oncomplete=()=>{db.close();ok({version:db.version,rows});};tx.onabort=()=>{db.close();no(tx.error);};};
}));}
export const stored=(raw:any,key:string)=>raw.rows['full-state'].find((x:any)=>x.key===key)?.value??null;
export async function recoveryReadonly(page:Page,work:()=>Promise<void>){const before=await recoveryDatabase(page);await work();expect(await recoveryDatabase(page)).toEqual(before);}
export async function control600(page:Page,before:any){
 await expect(page.getByTestId('action-countdown')).toHaveText('0.6 秒');await page.clock.runFor(599);expect(await recoveryDatabase(page)).toEqual(before);
 await page.clock.runFor(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');return recoveryDatabase(page);
}
export async function importRecoveryFixture(page:Page,fixture:any){
 await useJourneyClock(page);await page.goto('/');const input=page.getByLabel('导入已有存档',{exact:true});await expect(input).toBeEnabled({timeout:15000});const before=await recoveryDatabase(page);
 await input.setInputFiles({name:'lawful-current-recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await control600(page,before);
 const actual=await snapshot(page),expected=structuredClone(fixture);expected.core.runId=actual.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=actual.core.runId+':'+expected.core.activeEvent.id;
 expect(actual).toEqual(expected);return actual;
}
export async function runRecoveryControl(page:Page,control:Locator,plan?:any){
 const before=await snapshot(page),old=await activitySnapshot(page);await decision(page,control);
 await expect.poll(async()=>{const a=await activitySnapshot(page);return a?.id!==old?.id&&a?.status==='running';}).toBe(true);
 const a=await activitySnapshot(page);if(plan)expect(a.plan).toEqual(plan);expect(await snapshot(page)).toEqual(before);
 const done=await settleVisibleActivity(page);
 if(done.cycles===1){
  const formal=resolve(before,a.nextCommand),receipt=await page.evaluate(({runId,commandId})=>new Promise<any>((ok,no)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>no(q.error);q.onsuccess=()=>{const db=q.result,t=db.transaction('full-receipts','readonly'),r=t.objectStore('full-receipts').get(runId+':'+commandId);r.onsuccess=()=>ok(r.result);t.oncomplete=()=>db.close();t.onabort=()=>{db.close();no(t.error);};};}),{runId:a.runId,commandId:a.nextCommand.commandId});
  expect(receipt.command).toEqual(a.nextCommand);expect(receipt.result).toEqual(formal.result);expect(done.game).toEqual(formal.nextState);
  expect(receipt.proof.activityBefore).toEqual(a);expect(receipt.proof.stateAfter).toEqual(formal.nextState);expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);
  expect(receipt.activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:receipt.proof.resolvedAt}));
 }
 return{...done,before,a};
}
export async function runRecoveryPlan(page:Page,plan:any){const before=await snapshot(page),a=await activitySnapshot(page),selected=await selectPlan(page,plan);expect(await snapshot(page)).toEqual(before);expect(await activitySnapshot(page)).toEqual(a);return runRecoveryControl(page,selected.control,selected.expectedPlan);}
export async function recoveryMove(page:Page,move:string){
 await home(page);await page.getByTestId('tab-0').click();const id=move==='heal'?'battle-heal':move==='restore'?'battle-restore':move;
 if(!await page.getByTestId(id).isVisible())await recoveryReadonly(page,()=>decision(page,page.getByTestId('battle-manual-takeover')));
 const g=await snapshot(page);return runRecoveryControl(page,page.getByTestId(id),singleBattlePlan(g,move as any));
}
export async function trialReport(page:Page){
 await home(page);await page.getByTestId('tab-0').click();
 if(await page.getByTestId('battle-stage').isVisible())await page.getByTestId('battle-recent').click();else{
  if(!await page.getByTestId('hub-trial-result').isVisible()&&await page.getByTestId('cultivation-notes-open').isVisible()){
   await decision(page,page.getByTestId('cultivation-notes-open'));await expect(page.getByTestId('cultivation-notes-dialog')).toBeVisible();
  }
  await expect(page.getByTestId('hub-trial-result')).toBeVisible();await decision(page,page.getByTestId('hub-trial-result'));
 }
 await expect(page.getByTestId('trial-progress')).toBeVisible();
}
export async function readTrialReport(page:Page){
 const panel=page.getByTestId('trial-progress');await page.getByTestId('trial-mode-required').click();const prev=panel.getByTestId('catalogue-prev'),next=panel.getByTestId('catalogue-next');
 while(await prev.isEnabled())await prev.click();const rows=new Map<string,string>();
 for(let i=0;i<120;i++){
  const r=await panel.locator('.reading-text').evaluate(n=>{const p=n.querySelector('p')!,box=p.getBoundingClientRect(),nav=document.getElementById('primary-navigation')!.getBoundingClientRect();return{key:n.getAttribute('data-page-key')!,text:p.textContent??'',font:parseFloat(getComputedStyle(p).fontSize),inside:box.top>=0&&box.bottom<=nav.top,screen:document.documentElement.scrollHeight<=innerHeight};});
  expect(r.font).toBeGreaterThanOrEqual(18);expect(r.inside).toBe(true);expect(r.screen).toBe(true);rows.set(r.key,(rows.get(r.key)??'')+r.text);if(await next.isDisabled())return rows;await next.click();
 }throw Error('Finite current trial reading did not terminate');
}
export async function openRecoveryRestore(page:Page){await trialReport(page);await recoveryReadonly(page,async()=>{await page.getByTestId('trial-mode-checkpoint').click();await decision(page,page.getByTestId('trial-restore-open'));await expect(page.getByTestId('trial-restore-confirmation')).toBeVisible();});}
export async function assertRestored(page:Page,before:any){
 const after=await recoveryDatabase(page),game=stored(after,'current'),old=stored(before,'current'),cp=stored(before,'checkpoint'),expected=structuredClone(cp.snapshot);
 expected.core.runId=game.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=game.core.runId+':'+expected.core.activeEvent.id;
 expect(game.core.runId).not.toBe(old.core.runId);expect(game).toEqual(expected);expect(stored(after,'previous')).toEqual(old);expect(stored(after,'checkpoint')).toEqual(cp);expect(stored(after,'activity')).toBeNull();
 expect(stored(after,'checkpoint-owner')).toEqual({format:'chenyuan-checkpoint-scope',version:1,runId:game.core.runId,sourceRunId:cp.sourceRunId,sourceRevision:cp.sourceRevision,kind:cp.kind});
 expect(after.rows['full-receipts']).toHaveLength(1);const record=after.rows['full-receipts'][0],r=record.value;
 expect(r).toEqual({format:'chenyuan-control-receipt',version:1,kind:'RESTORE',mutation:{commandId:r.mutation.commandId,runId:game.core.runId,expectedRunId:old.core.runId,expectedRevision:old.core.revision},fingerprint:canonicalFingerprint({kind:'RESTORE',mutation:r.mutation,checkpoint:'active'})});
 expect(record.key).toBe(game.core.runId+':'+r.mutation.commandId);for(const row of before.rows['full-backups'])expect(after.rows['full-backups'].find((x:any)=>x.key===row.key)).toEqual(row);
 const activity=stored(before,'activity');if(activity)expect(after.rows['full-backups'].find((x:any)=>x.key==='restoration/'+r.mutation.commandId+'/activity')?.value).toEqual(activity);
 return{after,game,cp,receipt:r};
}
