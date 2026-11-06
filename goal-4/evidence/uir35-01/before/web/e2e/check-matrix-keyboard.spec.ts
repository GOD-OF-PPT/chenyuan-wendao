import {answerGameConfirmation} from './game-confirmation-support';
import {installRetirementDeliveryGate,armRetirementClose,armRetirementRead,releaseRetirementInOrder,cleanupRetirementGate} from './focus-delivery-support';
import {test,expect,type Page,type Locator,type TestInfo} from '@playwright/test';
import {newGame,advance,resolve} from '../../src/full/engine.ts';
import {completeActivity} from '../../src/full/activity.ts';
import {canonicalFingerprint} from '../../src/full/receipts.ts';
import {previewAction} from '../../src/full/queries.ts';
import {driver,prepareTrial} from '../../tests/full-route.mjs';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {validateActivityReceipt} from '../src/activity-persistence';
import {activityView,stopMessage} from '../src/activity-view';
import {formatCosts,formatDelta} from '../src/presentation';
import {sessionObservation,recordBytes,recordKey,validateRecord,publicId} from '../src/local-events';
import {useJourneyClock,snapshot,activitySnapshot as activity,revealStoryChoice,selectGoal,openHubFeature} from './support';

// 0032: only the existing fixed desktop. No scale, alternate viewport or timeout expansion.
test.use({viewport:{width:1440,height:900},reducedMotion:'no-preference',actionTimeout:8000,navigationTimeout:15000});
const gameDB='chenyuan-playable-v1',localDB='chenyuan-local-experience-v1';
const clocks=new WeakSet<Page>(),errors=new WeakMap<Page,string[]>(),focusReads=new WeakMap<Page,number>();
function listen(page:Page){if(errors.has(page))return;const found:string[]=[];errors.set(page,found);page.on('pageerror',e=>found.push(e.message));}
test.beforeEach(async({page})=>listen(page));
test.afterEach(async({context},info)=>{for(const p of context.pages())if(!p.isClosed()){
  await focusEvidence(p,'final-before-cleanup');
  await p.evaluate(async()=>{(window as any).__keyboardRestorePut?.();await (window as any).__keyboardReleaseLocal?.();});
  await info.attach('keyboard-page-errors-'+context.pages().indexOf(p),{body:JSON.stringify(errors.get(p)??[]),contentType:'application/json'});
  expect(errors.get(p)??[]).toEqual([]);
}});
async function evidence(info:TestInfo,name:string,value:unknown){await info.attach(name,{body:JSON.stringify(value),contentType:'application/json'});}
async function focusEvidence(page:Page,label:string){
  const value=await page.evaluate(()=>{const n=document.activeElement as HTMLElement|null,r=n?.getBoundingClientRect();return{tag:n?.tagName??null,id:n?.id??null,testid:n?.getAttribute('data-testid')??null,class:n?.className??null,tabIndex:n?.tabIndex??null,connected:n?.isConnected??false,text:n?.textContent?.slice(0,160)??null,rect:r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom}:null,inOpenDialog:!!n?.closest('dialog[open]'),currentContent:n?.closest('[data-testid=hub-current],.play-catalogue,#welcome-content,#game-content')?.getAttribute('data-testid')??n?.closest('#welcome-content,#game-content')?.id??null};});
  const sequence=(focusReads.get(page)??0)+1;focusReads.set(page,sequence);await evidence(test.info(),'keyboard-focus-'+sequence+'-'+label,value);return value;
}
async function clock(page:Page){if(!clocks.has(page)){await useJourneyClock(page);clocks.add(page);}}
async function database(page:Page,name=gameDB){return page.evaluate(name=>new Promise<any>((accept,reject)=>{
  const r=indexedDB.open(name);r.onupgradeneeded=()=>{r.transaction!.abort();reject(new Error('Readonly keyboard observation must not create a database'));};r.onerror=()=>reject(r.error);
  r.onsuccess=()=>{const db=r.result,tx=db.transaction([...db.objectStoreNames],'readonly'),out:any={};
    for(const n of db.objectStoreNames){out[n]=[];const q=tx.objectStore(n).openCursor();q.onsuccess=()=>{if(q.result){out[n].push({key:q.result.key,value:q.result.value});q.result.continue();}};}
    tx.oncomplete=()=>{db.close();accept(out);};tx.onabort=()=>{db.close();reject(tx.error);};};
}),name);}
const state=(raw:any,key:string)=>raw['full-state'].find((r:any)=>r.key===key)?.value??null;
async function keyboard(page:Page,control:Locator){await expect(control).toBeVisible();await expect(control).toBeEnabled();await control.focus();await expect(control).toBeFocused();await page.keyboard.press('Enter');}
async function controlComplete(page:Page,beforeRaw:any){
  await expect(page.getByTestId('action-execution')).toBeVisible();await page.clock.runFor(599);expect(await database(page)).toEqual(beforeRaw);
  await page.clock.runFor(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');return database(page);
}
async function load(page:Page,fixture:any){
  await clock(page);await page.goto('/');await expect(page.getByLabel('导入已有存档',{exact:true})).toBeEnabled();await expect(page.locator('.app-shell')).toHaveAttribute('data-font-scale','1');
  const before=await database(page);await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-keyboard-boundary.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await controlComplete(page,before);const actual=await snapshot(page),expected=structuredClone(fixture);
  expected.core.runId=actual.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=actual.core.runId+':'+expected.core.activeEvent.id;
  expect(actual).toEqual(expected);return actual;
}
function trialFixture(){const d=driver();for(let i=0;i<4;i++)d.realm();prepareTrial(d);return d.checkpoints.trial;}
function entryFixture(){return driver().checkpoints.mortal;}
function breakthroughFixture(){const d=driver();d.realm();return d.checkpoints.qi;}
function battleFixture(){const d=driver();d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});return d.game;}
async function layoutReady(page:Page){
  await expect.poll(()=>page.evaluate(()=>{const app=document.querySelector<HTMLElement>('.app-shell'),alerts=app?.querySelector<HTMLElement>('.stage-alerts');if(!app?.classList.contains('immersive-stage')||!alerts)return true;const height=alerts.getBoundingClientRect().height,known=parseFloat(app.style.getPropertyValue('--notice-height'));return Number.isFinite(known)&&Math.abs(known-(height?height+8:0))<=.5;}),{timeout:8000}).toBe(true);
}
async function focusedControl(page:Page){
  const result=await page.evaluate(()=>{const n=document.activeElement as HTMLElement,r=n.getBoundingClientRect(),dialog=n.closest('dialog[open]'),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{tag:n.tagName,id:n.getAttribute('data-testid'),inDialog:!!dialog,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:!!hit&&(hit===n||n.contains(hit))};});
  expect(result.inside).toBe(true);expect(result.hit).toBe(true);expect(result.width).toBeGreaterThanOrEqual(44);expect(result.height).toBeGreaterThanOrEqual(44);return result;
}
async function dialogKeyboard(page:Page,dialog:Locator,heading:Locator,info:TestInfo,label:string){
  await expect(dialog).toBeVisible();await expect(heading).toBeFocused();await layoutReady(page);
  const targets=await dialog.evaluate(node=>[...node.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])')].filter(n=>{
    if(!n.getClientRects().length||getComputedStyle(n).visibility==='hidden')return false;
    for(let p=n.parentElement;p&&p!==node;p=p.parentElement)if(p instanceof HTMLDetailsElement&&!p.open&&!p.querySelector(':scope>summary')?.contains(n))return false;return true;
  }).map(n=>n.getAttribute('data-testid')??n.getAttribute('aria-label')??n.textContent));
  expect(targets.length).toBeGreaterThan(0);const seen=new Set<number>(),walk:any[]=[];
  for(const reverse of[false,true])for(let i=0;i<=targets.length;i++){
    await page.keyboard.press(reverse?'Shift+Tab':'Tab');const row=await focusedControl(page);expect(row.inDialog).toBe(true);
    const index=await dialog.evaluate(node=>[...node.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])')].filter(n=>{
      if(!n.getClientRects().length||getComputedStyle(n).visibility==='hidden')return false;for(let p=n.parentElement;p&&p!==node;p=p.parentElement)if(p instanceof HTMLDetailsElement&&!p.open&&!p.querySelector(':scope>summary')?.contains(n))return false;return true;
    }).indexOf(document.activeElement as HTMLElement));expect(index).toBeGreaterThanOrEqual(0);seen.add(index);walk.push({reverse,index,...row});
  }
  expect(seen.size).toBe(targets.length);
  const copy=await dialog.locator('p:visible').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize)})));
  for(const row of copy){expect(row.text?.length).toBeGreaterThan(0);expect(row.font).toBeGreaterThanOrEqual(18);}
  await evidence(info,label+'-keyboard-dialog',{targets,walk,copy});
}
async function begin(page:Page,id:string,period:number){
  await keyboard(page,page.getByTestId(id));return running(page,period);
}
async function lateCloseWhileReopened(page:Page,dialog:Locator,heading:Locator,confirmation:Locator,info:TestInfo,label:string){
  await expect(dialog).toBeVisible();await expect(heading).toBeFocused();const before=await database(page),game=await snapshot(page);
  const delivered=await dialog.evaluate(node=>{const event=new Event('close');node.dispatchEvent(event);return{isTrusted:event.isTrusted,open:(node as HTMLDialogElement).open};});
  expect(delivered).toEqual({isTrusted:false,open:true});expect(await database(page)).toEqual(before);expect(await snapshot(page)).toEqual(game);
  await evidence(info,label+'-old-ui-close-while-new-review-open',{delivery:'synthetic close event, isTrusted=false; original native cancel/reopen remains separately exercised',delivered,before,game});
  await expect(dialog).toBeVisible();await expect(heading).toBeFocused();await expect(confirmation).toBeVisible();await expect(confirmation).toBeEnabled();
}
async function running(page:Page,period:number){
  await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);
  expect(a.cycleMs).toBe(period);expect(a.completedCycles).toBe(0);await expect(page.locator('[data-testid=training-activity][data-generation="'+a.generation+'"][data-running=true]')).toBeVisible();
  await expect(page.getByTestId('training-countdown')).toHaveText((period/1000).toFixed(1)+' 秒');return a;
}
async function cycle(page:Page,a:any,before:any,info:TestInfo,label:string,afterSaved?:()=>Promise<void>){
  const accepted=await database(page),left=a.dueAt-await page.evaluate(()=>Date.now());expect(left).toBeGreaterThan(0);expect(left).toBeLessThanOrEqual(a.cycleMs);
  expect(accepted['full-receipts'].some((r:any)=>r.key===a.runId+':'+a.nextCommand.commandId)).toBe(false);
  await page.clock.fastForward(left-1);expect(await database(page)).toEqual(accepted);expect(await snapshot(page)).toEqual(before);
  await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(1);if(afterSaved)await afterSaved();await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const expected=resolve(before,a.nextCommand),after=await snapshot(page),raw=await database(page),matches=raw['full-receipts'].filter((r:any)=>r.key===a.runId+':'+a.nextCommand.commandId);
  expect(after).toEqual(advance(before,a.nextCommand));expect(matches).toHaveLength(1);const receipt=matches[0].value;
  expect(receipt.command).toEqual(a.nextCommand);expect(receipt.result).toEqual(expected.result);expect(receipt.proof.activityBefore).toEqual(a);expect(receipt.proof.stateAfter).toEqual(expected.nextState);expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);
  expect(receipt.activity).toEqual(completeActivity(expected.nextState,a,expected.result,{commandId:a.nextCommand.commandId,now:receipt.proof.resolvedAt}));expect(state(raw,'activity')).toEqual(receipt.activity);expect(()=>validateActivityReceipt(receipt,after)).not.toThrow();
  if(['BREAKTHROUGH','START_TRIAL'].includes(a.nextCommand.type)){
    const cp=state(raw,'checkpoint');expect(cp.snapshot).toEqual(before);expect(state(raw,'checkpoint-owner')).toEqual({format:'chenyuan-checkpoint-scope',version:1,runId:after.core.runId,sourceRunId:cp.sourceRunId,sourceRevision:cp.sourceRevision,kind:cp.kind});
  }else{expect(state(raw,'checkpoint')).toEqual(state(accepted,'checkpoint'));expect(state(raw,'checkpoint-owner')).toEqual(state(accepted,'checkpoint-owner'));}
  await evidence(info,label+'-complete-original-cycle',{before,a,accepted,after,receipt,raw});return{before,after,raw,a};
}
async function showTrial(page:Page){
  if(!await page.getByTestId('trial-review-entry').isVisible())await page.getByTestId('breakthrough').click();
  await expect(page.getByTestId('trial-preparation')).toBeVisible();await expect(page.getByTestId('trial-review-entry')).toBeEnabled();
}
async function trialEntry(page:Page,before:any,info:TestInfo,label:string){await showTrial(page);await keyboard(page,page.getByTestId('trial-review-entry'));const a=await begin(page,'trial-confirm-entry',15000);return cycle(page,a,before,info,label);}
async function manual(page:Page){
  const raw=await database(page);if(!await page.getByTestId('battle-manual-takeover').isVisible()&&await page.getByTestId('resume-encounter').isVisible())await page.getByTestId('resume-encounter').click();
  await page.getByTestId('battle-manual-takeover').click();await expect(page.getByTestId('guard')).toBeEnabled();expect(await database(page)).toEqual(raw);
}
async function stageFocus(page:Page){const content=page.getByTestId('hub-current');await expect(content).toBeVisible();await focusEvidence(page,'owned-stage-handoff');await expect(content).toBeFocused();}
async function restored(page:Page,rawBefore:any){
  const raw=await database(page),old=state(rawBefore,'current'),after=state(raw,'current'),cp=state(rawBefore,'checkpoint'),oldActivity=state(rawBefore,'activity'),expected=structuredClone(cp.snapshot);
  expect(after.core.runId).not.toBe(old.core.runId);expected.core.runId=after.core.runId;expected.core.revision=0;expect(after).toEqual(expected);expect(state(raw,'checkpoint')).toEqual(cp);expect(state(raw,'previous')).toEqual(old);expect(state(raw,'activity')).toBeNull();
  expect(state(raw,'checkpoint-owner')).toEqual({format:'chenyuan-checkpoint-scope',version:1,runId:after.core.runId,sourceRunId:cp.sourceRunId,sourceRevision:cp.sourceRevision,kind:cp.kind});
  expect(raw['full-receipts']).toHaveLength(1);const row=raw['full-receipts'][0],r=row.value;expect(r.mutation).toEqual({commandId:r.mutation.commandId,runId:after.core.runId,expectedRunId:old.core.runId,expectedRevision:old.core.revision});
  expect(r).toEqual({format:'chenyuan-control-receipt',version:1,kind:'RESTORE',mutation:r.mutation,fingerprint:canonicalFingerprint({kind:'RESTORE',mutation:r.mutation,checkpoint:'active'})});expect(row.key).toBe(after.core.runId+':'+r.mutation.commandId);
  if(oldActivity)expect(raw['full-backups'].find((r:any)=>r.key==='restoration/'+row.value.mutation.commandId+'/activity')?.value).toEqual(oldActivity);
  for(const row of rawBefore['full-backups'])expect(raw['full-backups'].find((r:any)=>r.key===row.key)).toEqual(row);
  return{raw,after,cp};
}

test('CHECK-K1 retirement keyboard cancellation returns its exact settings opener and one twelve-second seal focuses factual life',async({page},info)=>{
  const before=await load(page,driver().game),raw=await database(page),opener=page.getByTestId('game-settings');
  await keyboard(page,opener);await keyboard(page,page.getByTestId('settings-retire'));const dialog=page.getByTestId('life-confirmation');
  await dialogKeyboard(page,dialog,page.locator('#life-confirm-title'),info,'retirement');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();expect(await database(page)).toEqual(raw);
  await keyboard(page,opener);await keyboard(page,page.getByTestId('settings-retire'));await lateCloseWhileReopened(page,dialog,page.locator('#life-confirm-title'),page.getByTestId('life-confirm-end'),info,'retirement');const a=await begin(page,'life-confirm-end',12000);expect(a.plan.action).toEqual({type:'RETIRE'});
  const saved=await cycle(page,a,before,info,'retirement');expect(saved.after.status).toBe('ended');expect(saved.after.ending).toBe('retired');expect(saved.after.core.runId).toBe(before.core.runId);await focusEvidence(page,'retired-life');await expect(page.getByTestId('life-title')).toBeFocused();expect(await database(page)).toEqual(saved.raw);
});

test('CHECK-K2 trial entry keyboard heading trap and cancellation retain the complete preparation before one fifteen-second question handoff',async({page},info)=>{
  const before=await load(page,trialFixture());await showTrial(page);const raw=await database(page),opener=page.getByTestId('trial-review-entry'),dialog=page.getByTestId('trial-entry-confirmation');
  expect(previewAction(before,{type:'START_TRIAL'}).allowed).toBe(true);await keyboard(page,opener);await dialogKeyboard(page,dialog,page.locator('#trial-entry-title'),info,'trial-entry');
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();expect(await database(page)).toEqual(raw);await keyboard(page,opener);await lateCloseWhileReopened(page,dialog,page.locator('#trial-entry-title'),page.getByTestId('trial-confirm-entry'),info,'trial-entry');
  const a=await begin(page,'trial-confirm-entry',15000),saved=await cycle(page,a,before,info,'trial-entry');expect(saved.after.trial).toEqual({stage:0,answer:null});await stageFocus(page);expect(await database(page)).toEqual(saved.raw);
});

test('CHECK-K3 the actual custom restore keyboard dialog cancels to its battle opener then restores the whole checkpoint with one six-hundred-ms receipt',async({page},info)=>{
  let before=await load(page,trialFixture());let saved=await trialEntry(page,before,info,'restore-real-entry');before=saved.after;
  await revealStoryChoice(page,'answer-accept');await page.getByTestId('answer-accept').click();saved=await cycle(page,await begin(page,'milestone-confirm',6000),before,info,'restore-real-answer');before=saved.after;
  await manual(page);saved=await cycle(page,await begin(page,'guard',3000),before,info,'restore-real-round');expect(saved.after.battle).not.toBeNull();
  await page.getByTestId('battle-recent').click();await page.getByTestId('trial-mode-checkpoint').click();const raw=await database(page),opener=page.getByTestId('trial-restore-open'),dialog=page.getByTestId('trial-restore-confirmation');
  await keyboard(page,opener);await dialogKeyboard(page,dialog,page.locator('#trial-restore-title'),info,'custom-restore');await page.screenshot({path:info.outputPath('custom-restore-keyboard.png')});
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();expect(await database(page)).toEqual(raw);await keyboard(page,opener);await lateCloseWhileReopened(page,dialog,page.locator('#trial-restore-title'),page.getByTestId('trial-restore-confirm'),info,'custom-restore');await keyboard(page,page.getByTestId('trial-restore-confirm'));await controlComplete(page,raw);
  const result=await restored(page,raw);await expect(page.getByTestId('trial-preparation-title')).toBeFocused();await expect(page.getByTestId('trial-review-entry')).toBeEnabled();expect(await database(page)).toEqual(result.raw);await evidence(info,'custom-keyboard-restore',result);
});

test('CHECK-K4 ending keyboard cancellation preserves its factual choice and a single twelve-second confirmation focuses the committed life record',async({page},info)=>{
  const before=await load(page,trialJourneyScenario().states.at(-1));await revealStoryChoice(page,'ending-depart');const opener=page.getByTestId('ending-depart'),raw=await database(page),dialog=page.getByTestId('ascension-confirmation');
  expect(previewAction(before,{type:'END',ending:'depart'}).allowed).toBe(true);await keyboard(page,opener);await dialogKeyboard(page,dialog,page.locator('#ascension-title'),info,'ending-depart');
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();expect(await database(page)).toEqual(raw);await keyboard(page,opener);await lateCloseWhileReopened(page,dialog,page.locator('#ascension-title'),page.getByTestId('ascension-confirm'),info,'ending-depart');
  const a=await begin(page,'ascension-confirm',12000),saved=await cycle(page,a,before,info,'ending-depart');expect(saved.after.status).toBe('ascended');expect(saved.after.ending).toBe('depart');expect(saved.after.core.runId).toBe(before.core.runId);await focusEvidence(page,'ascended-life');await expect(page.getByTestId('life-title')).toBeFocused();expect(await database(page)).toEqual(saved.raw);
});

async function holdOptional(page:Page,context:any){
  const blocker=await context.newPage();listen(blocker);await blocker.goto('/');await expect(blocker.getByRole('button',{name:'踏入仙途',exact:false})).toBeEnabled();const gameRaw=await database(blocker),localRaw=await database(blocker,localDB);
  await blocker.evaluate(name=>new Promise<void>((accept,reject)=>{const q=indexedDB.open(name);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['meta','events'],'readwrite');let held=true;
    const ended=new Promise<void>((done,fail)=>{tx.oncomplete=()=>{db.close();done();};tx.onabort=()=>{db.close();fail(tx.error);};});(window as any).__keyboardReleaseLocal=async()=>{held=false;await ended;};
    let ready=false;const pulse=()=>{const read=tx.objectStore('meta').get('state');read.onsuccess=()=>{if(!ready){ready=true;accept();}if(held)pulse();};};pulse();};}),localDB);
  await clock(page);await page.goto('/');await page.bringToFront();await expect(page.getByTestId('game-loading')).toContainText('显示设置');await expect(page.locator('#welcome-content')).toHaveCount(0);
  const release=async()=>{if(!blocker.isClosed())await blocker.evaluate(()=>(window as any).__keyboardReleaseLocal());};return{blocker,gameRaw,localRaw,release};
}
async function oneTargetSession(page:Page,before:any,info:TestInfo,label:string){
  let after:any;await expect.poll(async()=>{after=await database(page,localDB);return after.events.length-before.events.length;}).toBe(1);
  expect(Object.keys(after)).toEqual(Object.keys(before));const added=after.events.at(-1),record=added.value.data,oldMeta=before.meta.find((r:any)=>r.key==='state').value;
  expect(after.events).toEqual([...before.events,added]);expect(Number.isSafeInteger(added.key)).toBe(true);expect(added.key).toBeGreaterThan(Math.max(0,...before.events.map((r:any)=>Number(r.key))));
  expect(()=>validateRecord(record)).not.toThrow();expect(publicId(record.id)).toBe(record.id);expect(publicId(record.sessionId)).toBe(record.sessionId);expect(before.events.some((r:any)=>r.value.data.sessionId===record.sessionId)).toBe(false);
  expect(record).toEqual({id:record.id,sessionId:record.sessionId,elapsedMs:record.elapsedMs,seed:null,observation:sessionObservation()});expect(Number.isSafeInteger(record.elapsedMs)&&record.elapsedMs>=0).toBe(true);
  expect(added.value).toEqual({id:record.id,sourceKey:recordKey(record),bytes:recordBytes(record),data:record});
  const expectedMeta={...oldMeta,revision:oldMeta.revision+1,eventCount:oldMeta.eventCount+1,eventBytes:oldMeta.eventBytes+recordBytes(record)};
  expect(after.meta).toEqual(before.meta.map((r:any)=>r.key==='state'?{...r,value:expectedMeta}:r));
  for(const name of Object.keys(before))if(name!=='events'&&name!=='meta')expect(after[name]).toEqual(before[name]);
  await evidence(info,label+'-only-target-session-appended',{before,after,added,expectedMeta});return after;
}
test('CHECK-K5 a native pending startup content skip never steals the keyboard focus from a newer settings decision',async({page,context},info)=>{
  const held=await holdOptional(page,context);try{
    await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'跳到当前内容',exact:true})).toBeFocused();await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');const opener=page.getByRole('button',{name:'设置',exact:true});await expect(opener).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#settings-title')).toBeFocused();
    await held.release();await expect(page.getByRole('button',{name:'踏入仙途',exact:false})).toBeEnabled();await expect(page.locator('#settings-title')).toBeFocused();await page.keyboard.press('Escape');await expect(opener).toBeFocused();
    expect(await database(page)).toEqual(held.gameRaw);const localAfter=await oneTargetSession(page,held.localRaw,info,'startup-newer-focus');await expect(page.getByTestId('save-status')).toHaveText('尚无存档');await evidence(info,'startup-newer-keyboard-focus',{gameRaw:held.gameRaw,localRaw:held.localRaw,localAfter});
  }finally{await held.release();expect(errors.get(held.blocker)??[]).toEqual([]);await held.blocker.close();}
});
test('CHECK-K6 pending startup without newer intent restores welcome focus and genuine keyboard creation choice and navigation keep their proper targets',async({page,context},info)=>{
  const held=await holdOptional(page,context);try{
    await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'跳到当前内容',exact:true})).toBeFocused();await page.keyboard.press('Enter');await held.release();await expect(page.locator('#welcome-content')).toBeFocused();
    expect(await database(page)).toEqual(held.gameRaw);await oneTargetSession(page,held.localRaw,info,'startup-no-newer-intent');await held.blocker.close();
    const raw=await database(page);await keyboard(page,page.getByRole('button',{name:'踏入仙途',exact:false}));await controlComplete(page,raw);const created=await snapshot(page);expect(created).toEqual(newGame('顾长青',created.core.runId));await expect(page.locator('#opening-actions')).toBeFocused();
    await page.getByTestId('leave').focus();await page.keyboard.press('Space');await expect(page.locator('#milestone-review-title')).toBeFocused();const saved=await cycle(page,await begin(page,'milestone-confirm',6000),created,info,'keyboard-opening-choice');await stageFocus(page);
    await keyboard(page,page.getByRole('link',{name:'跳到主导航',exact:true}));await expect(page.locator('#primary-navigation')).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByTestId('tab-0')).toBeFocused();await focusedControl(page);expect(await database(page)).toEqual(saved.raw);
  }finally{await held.release();expect(errors.get(held.blocker)??[]).toEqual([]);if(!held.blocker.isClosed())await held.blocker.close();}
});

async function majorReady(page:Page,operation:string){
  await expect.poll(async()=>{await page.clock.runFor(16);return await page.getByTestId('fx-skip').isVisible();},{timeout:8000}).toBe(true);
  const skip=page.getByTestId('fx-skip');await expect(skip).toHaveAttribute('aria-label','跳过本次提示演出');await expect(skip).toHaveText('略过提示');
  await expect(page.getByTestId('action-motion')).toHaveAttribute('data-operation',operation);return skip;
}
async function tabToSkip(page:Page,skip:Locator){
  await page.getByRole('link',{name:'跳到当前内容',exact:true}).focus();
  for(let i=0;i<80;i++){await page.keyboard.press('Tab');if(await skip.evaluate(n=>n===document.activeElement)){await expect(skip).toBeFocused();return;}}
  throw new Error('The actual keyboard traversal did not reach the current explicit skip control');
}
async function stoppedFacts(page:Page,saved:any){
  const a=state(saved.raw,'activity'),view=activityView(a,saved.after),rail=page.locator('.game-hud .activity-rail[data-status="stopped"]');
  expect(a.status).toBe('stopped');expect(a.completedCycles).toBe(1);await expect(rail).toHaveAttribute('data-testid','training-summary');
  await expect(rail.locator('header strong')).toHaveText(view.name);await expect(rail.getByTestId('training-stop')).toHaveText(stopMessage(a.plan,a.stopReason));
  await expect(rail.locator('.rail-count')).toHaveText('已完成 1 / '+a.plan.maxCycles+' '+view.unit+' · '+(a.version===7?'本次':'每轮')+' '+a.cycleMs/1000+' 秒');
  await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await database(page)).toEqual(saved.raw);
}
async function promptFooter(page:Page,skip:Locator){
  const geometry=await skip.evaluate(n=>{
    const rect=(r:DOMRect)=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}),inside=(a:any,b:any)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5,overlaps=(a:any,b:any)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const footer=n.parentElement!,rail=footer.parentElement!,viewport={left:0,top:0,right:innerWidth,bottom:innerHeight},fr=rect(footer.getBoundingClientRect()),rr=rect(rail.getBoundingClientRect());
    const rows=[...footer.querySelectorAll<HTMLElement>('button')].filter(x=>x.getClientRects().length).map(x=>{
      const r=rect(x.getBoundingClientRect()),s=getComputedStyle(x),outline=parseFloat(s.outlineWidth)||0,offset=parseFloat(s.outlineOffset)||0,expand=s.outlineStyle==='none'?0:Math.max(0,outline+offset),visual={left:r.left-expand,right:r.right+expand,top:r.top-expand,bottom:r.bottom+expand};
      const clips:any[]=[{id:'viewport',rect:viewport}],walker=document.createTreeWalker(x,NodeFilter.SHOW_TEXT),text:any[]=[];let t:Node|null;
      for(let p=x.parentElement;p;p=p.parentElement){const c=getComputedStyle(p),pr=rect(p.getBoundingClientRect());if(/hidden|clip|scroll|auto/.test(c.overflowX+' '+c.overflowY))clips.push({id:p.getAttribute('data-testid')??p.className,rect:pr});}
      while(t=walker.nextNode()){if(!t.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(t);const font=parseFloat(getComputedStyle(t.parentElement!).fontSize);for(const line of range.getClientRects())if(line.width&&line.height){const lr=rect(line);text.push({text:t.textContent,font,rect:lr,inside:inside(lr,r)&&clips.every(c=>inside(lr,c.rect))});}}
      const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{id:x.getAttribute('data-testid'),text:x.textContent,rect:r,visual,outline,offset,clips,lines:text,inside:inside(r,fr)&&inside(r,rr)&&inside(visual,viewport)&&clips.every(c=>inside(visual,c.rect)),hit:!!hit&&(hit===x||x.contains(hit)),skip:x===n};
    });
    const me=rows.find(x=>x.skip)!,all=[...document.querySelectorAll<HTMLElement>('#primary-navigation button,.game-hud button,.feature-header button,.battle-mode-heading button,[data-testid=training-pause],[data-testid=battle-decisions] button')].filter(x=>x!==n&&x.getClientRects().length);
    return{footer:fr,rail:rr,owned:footer.tagName==='FOOTER'&&rail.matches('.game-hud .activity-rail,[data-testid=training-activity],[data-testid=training-summary]'),held:!!n.closest('.app-shell.feedback-held'),rows,clashes:all.filter(x=>overlaps(me.visual,rect(x.getBoundingClientRect()))).map(x=>x.getAttribute('data-testid')??x.textContent)};
  });
  expect(geometry.owned).toBe(true);expect(geometry.held).toBe(true);expect(geometry.rows.length).toBeGreaterThan(1);expect(geometry.clashes).toEqual([]);
  for(const row of geometry.rows){expect(row.rect.width).toBeGreaterThanOrEqual(44);expect(row.rect.height).toBeGreaterThanOrEqual(44);expect(row.inside).toBe(true);expect(row.hit).toBe(true);expect(row.lines.length).toBeGreaterThan(0);for(const line of row.lines){expect(line.font).toBeGreaterThanOrEqual(14);expect(line.inside).toBe(true);}}
  return geometry;
}
async function battleSelfClearance(page:Page,info:TestInfo,label:string){
  const motion=page.getByTestId('action-motion');await expect(motion).toHaveAttribute('data-operation','BATTLE');await expect(motion).toHaveAttribute('data-variant',/guard$/);
  const geometry=await motion.evaluate(node=>{
    const rect=(r:DOMRect)=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}),inside=(a:any,b:any)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5,overlaps=(a:any,b:any)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const visible=(e:Element)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return !!e.getClientRects().length&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
    const scene=[...document.querySelectorAll<HTMLElement>('.battle-presence[data-active=true]')].find(visible),player=scene?.querySelector<HTMLElement>('.battle-player-art'),m=rect(node.getBoundingClientRect());
    const protectedNodes=[...document.querySelectorAll<HTMLElement>('.battle-own-status,.enemy-status,.battle-deck button,#primary-navigation,.game-hud,.battle-mode-heading')].filter(visible),protectedRects=protectedNodes.map(e=>({id:e.getAttribute('data-testid')??(e.id||e.className),class:e.className,rect:rect(e.getBoundingClientRect()),clash:overlaps(m,rect(e.getBoundingClientRect()))}));
    const exchange=scene?.querySelector<HTMLElement>('[data-testid=battle-charge]'),lines:any[]=[];if(exchange){const walker=document.createTreeWalker(exchange,NodeFilter.SHOW_TEXT);let text:Node|null;while(text=walker.nextNode()){if(!text.textContent?.trim()||!visible(text.parentElement!))continue;const range=document.createRange();range.selectNodeContents(text);for(const r of range.getClientRects())if(r.width&&r.height)lines.push({text:text.textContent,rect:rect(r),font:parseFloat(getComputedStyle(text.parentElement!).fontSize),clash:overlaps(m,rect(r))});}}
    return{motion:m,receipt:node.getAttribute('data-receipt'),scene:scene?rect(scene.getBoundingClientRect()):null,player:player?rect(player.getBoundingClientRect()):null,insideScene:!!scene&&inside(m,rect(scene.getBoundingClientRect())),insidePlayer:!!player&&inside(m,rect(player.getBoundingClientRect())),protectedRects,protectedCoverage:['.battle-own-status','.enemy-status','#primary-navigation','.game-hud','.battle-mode-heading'].map(selector=>({selector,count:protectedNodes.filter(n=>n.matches(selector)).length})),sevenMoves:protectedRects.filter(r=>['attack','guard','technique','release','battle-heal','battle-restore','flee'].includes(r.id)).map(r=>r.id).sort(),exchangeLines:lines};
  });
  await evidence(info,label+'-battle-self-vfx-clearance',geometry);
  expect(geometry.insideScene).toBe(true);expect(geometry.insidePlayer).toBe(true);for(const group of geometry.protectedCoverage)expect(group.count).toBe(1);expect(geometry.sevenMoves).toEqual(['attack','battle-heal','battle-restore','flee','guard','release','technique']);
  expect(geometry.protectedRects.filter(r=>r.clash)).toEqual([]);expect(geometry.exchangeLines.some(r=>r.text.includes('交锋'))).toBe(true);for(const line of geometry.exchangeLines){expect(line.font).toBeGreaterThanOrEqual(14);expect(line.clash).toBe(false);}
  return geometry;
}
async function heldSkip(page:Page,saved:any,operation:string,info:TestInfo,label:string,photo=false,dismiss=true){
  const skip=await majorReady(page,operation);expect(await skip.evaluate(n=>n===document.activeElement)).toBe(false);
  const key=await page.getByTestId('action-motion').getAttribute('data-receipt');expect(JSON.parse(key!)).toEqual([saved.after.core.runId,saved.a.nextCommand.commandId]);
  await tabToSkip(page,skip);await layoutReady(page);await focusedControl(page);
  const geometry=await promptFooter(page,skip);
  expect(geometry.clashes).toEqual([]);await page.clock.runFor(2400);await expect(skip).toBeVisible();await expect(skip).toBeFocused();await expect(page.getByTestId('action-motion')).toHaveAttribute('data-receipt',key!);expect(await database(page)).toEqual(saved.raw);
  const moving=await page.getByTestId('action-motion').evaluate(n=>[n,...n.querySelectorAll('*')].flatMap(e=>e.getAnimations()).filter(a=>a.playState==='running').length);expect(moving).toBe(0);
  if(photo)await page.screenshot({path:info.outputPath('held-entry-prompt-keyboard.png')});if(operation==='BATTLE'&&saved.a.nextCommand.type==='BATTLE'&&saved.a.nextCommand.move==='guard')await battleSelfClearance(page,info,label);await evidence(info,label+'-held-short-prompt',{key,geometry,saved,heldVirtualMs:2400,moving});
  await skip.evaluate(n=>(window as any).__keyboardOldSkip=n);if(!dismiss)return key;
  await page.keyboard.press('Enter');await expect(skip).toHaveCount(0);await expect(page.locator('.app-shell.feedback-held')).toHaveCount(0);await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await stageFocus(page);await stoppedFacts(page,saved);return key;
}
async function breakthroughCycle(page:Page,fixture:any,info:TestInfo,label:string){
  const before=await load(page,fixture);expect(previewAction(before,{type:'BREAKTHROUGH'}).allowed).toBe(true);await page.getByTestId('breakthrough').click();const a=await begin(page,'milestone-confirm',30000);return cycle(page,a,before,info,label);
}
test('CHECK-K7 actual mortal entry retains one explicit keyboard skip beyond its natural lifetime without changing its actual saved outcome',async({page},info)=>{
  const saved=await breakthroughCycle(page,entryFixture(),info,'entry');expect(saved.after.core.player.realm).toBe('qi');await heldSkip(page,saved,'BREAKTHROUGH',info,'entry',true);
  await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect(page.getByTestId('fx-skip')).toHaveCount(0);await expect(page.locator('.app-shell.feedback-held')).toHaveCount(0);await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('hub-pulse')).toHaveCount(0);expect(await database(page)).toEqual(saved.raw);
});
test('CHECK-K8 an ordinary pill-consuming breakthrough keeps its explicit keyboard prompt static and Enter returns current content without repeating the receipt',async({page},info)=>{
  const saved=await breakthroughCycle(page,breakthroughFixture(),info,'ordinary-breakthrough');expect(saved.after.core.player.realm).toBe('foundation');expect(Object.values(resolve(saved.before,saved.a.nextCommand).result.costs.items).some(quantity=>Number(quantity)>0)).toBe(true);
  await heldSkip(page,saved,'BREAKTHROUGH',info,'ordinary-breakthrough');await page.keyboard.press('Tab');await focusedControl(page);expect(await database(page)).toEqual(saved.raw);
});
test('CHECK-K9 an actual battle turn keyboard prompt preserves focus and an old destroyed skip cannot dismiss the next turn while blur keeps the new target',async({page},info)=>{
  const before=await load(page,battleFixture());await manual(page);const first=await cycle(page,await begin(page,'guard',3000),before,info,'battle-first');expect(first.after.battle).not.toBeNull();const oldKey=await heldSkip(page,first,'BATTLE',info,'battle-first',true);
  const second=await cycle(page,await begin(page,'guard',3000),first.after,info,'battle-second'),skip=await majorReady(page,'BATTLE'),newKey=await page.getByTestId('action-motion').getAttribute('data-receipt');expect(newKey).not.toBe(oldKey);
  await skip.focus();await page.evaluate(()=>{const old=(window as any).__keyboardOldSkip as HTMLElement;old.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await expect(skip).toBeVisible();await expect(skip).toBeFocused();await expect(page.getByTestId('action-motion')).toHaveAttribute('data-receipt',newKey!);expect(await database(page)).toEqual(second.raw);
  const next=page.getByTestId('tab-1');await next.focus();await expect(next).toBeFocused();await expect(skip).toHaveCount(0);await expect(page.locator('.app-shell.feedback-held')).toHaveCount(0);await expect(next).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByTestId('explore-catalogue')).toBeVisible();expect(await database(page)).toEqual(second.raw);
  await page.getByTestId('tab-0').click();await manual(page);const third=await cycle(page,await begin(page,'guard',3000),second.after,info,'battle-before-rejected-start');
  const held=await majorReady(page,'BATTLE');await held.focus();expect(previewAction(third.after,{type:'BATTLE',move:'guard'}).allowed).toBe(true);
  await page.evaluate(()=>{const w=window as any,original=IDBObjectStore.prototype.put;w.__keyboardRestorePut=()=>IDBObjectStore.prototype.put=original;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-receipts'&&value?.input?.kind==='START'){w.__keyboardRejectedStart={key,value:structuredClone(value)};w.__keyboardRestorePut();throw new DOMException('CHECK keyboard native start quota','QuotaExceededError');}return original.call(this,value,key!);};});
  await keyboard(page,page.getByTestId('guard'));await expect(page.getByTestId('error')).toContainText('存储空间不足');await expect(page.getByTestId('fx-skip')).toHaveCount(0);await expect(page.getByTestId('action-motion')).toHaveCount(0);expect(await database(page)).toEqual(third.raw);
  const rejected=await page.evaluate(()=>(window as any).__keyboardRejectedStart);await keyboard(page,page.getByTestId('retry'));const original=await running(page,3000),accepted=await database(page);const start=accepted['full-receipts'].filter((r:any)=>r.key===rejected.key);expect(start).toHaveLength(1);expect(start[0].value.input).toEqual(rejected.value.input);
  const fourth=await cycle(page,original,third.after,info,'battle-after-original-start-retry');const lifeSkip=await majorReady(page,'BATTLE');await lifeSkip.focus();await lifeSkip.evaluate(n=>(window as any).__keyboardLifeSkip=n);
  await keyboard(page,page.getByTestId('game-settings'));await expect(page.getByTestId('fx-skip')).toHaveCount(0);await keyboard(page,page.getByTestId('restart'));await expect(page.getByTestId('game-confirmation-message')).not.toBeEmpty();await answerGameConfirmation(page,'restart');await controlComplete(page,fourth.raw);
  const newRaw=await database(page),newLife=state(newRaw,'current');expect(newLife.core.runId).not.toBe(fourth.after.core.runId);expect(newLife).toEqual(newGame(newLife.core.player.name,newLife.core.runId));expect(state(newRaw,'activity')).toBeNull();expect(state(newRaw,'previous')).toEqual(fourth.after);
  expect(newRaw['full-receipts']).toHaveLength(1);expect(newRaw['full-receipts'][0].value).toMatchObject({format:'chenyuan-control-receipt',kind:'CREATE',mutation:{runId:newLife.core.runId,expectedRunId:fourth.after.core.runId,expectedRevision:fourth.after.core.revision}});
  await expect.poll(async()=>{await page.clock.runFor(16);return await page.getByTestId('hub-pulse').count()===1?page.getByTestId('hub-pulse').getAttribute('data-operation'):null;}).toBe('CREATE');const newNotice=await page.getByTestId('hub-pulse').getAttribute('data-receipt');
  await page.evaluate(()=>(window as any).__keyboardLifeSkip.dispatchEvent(new MouseEvent('click',{bubbles:true})));await expect(page.getByTestId('hub-pulse')).toHaveAttribute('data-receipt',newNotice!);await expect(page.getByTestId('fx-skip')).toHaveCount(0);expect(await database(page)).toEqual(newRaw);
  await evidence(info,'old-detached-skip',{oldKey,newKey,delivery:'explicit old-node synthetic click, isTrusted=false; not a new player authorization',second,rejected,third,fourth,newRaw,newNotice});
});
async function restorePromptPreparation(page:Page){
  await keyboard(page,page.getByTestId('game-settings'));const raw=await database(page);await page.getByTestId('restore-checkpoint').click();await expect(page.getByTestId('game-confirmation-message')).toContainText('完整准备');await answerGameConfirmation(page,'restore');await controlComplete(page,raw);return restored(page,raw);
}
async function staticReducedEntry(page:Page,before:any,info:TestInfo,label:string){
  const saved=await trialEntry(page,before,info,label);await expect.poll(async()=>{await page.clock.runFor(16);return await page.getByTestId('hub-pulse').count()===1?page.getByTestId('hub-pulse').getAttribute('data-operation'):null;},{timeout:8000}).toBe('START_TRIAL');
  await expect(page.getByTestId('fx-skip')).toHaveCount(0);await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('hub-pulse')).toHaveAttribute('data-receipt',JSON.stringify([saved.after.core.runId,saved.a.nextCommand.commandId]));
  expect(saved.after.trial).toEqual({stage:0,answer:null});expect(await database(page)).toEqual(saved.raw);await page.clock.runFor(1601);await expect(page.getByTestId('hub-pulse')).toHaveCount(0);await expect(page.getByTestId('fx-skip')).toHaveCount(0);
  await expect(page.locator('.app-shell.feedback-held')).toHaveCount(0);await stoppedFacts(page,saved);return saved;
}
test('CHECK-K10 trial entry has an explicit held keyboard skip and a restored separately arranged reduced-motion entry has no empty skip control',async({page},info)=>{
  const before=await load(page,trialFixture()),first=await trialEntry(page,before,info,'trial-prompt-first');await heldSkip(page,first,'START_TRIAL',info,'trial-entry');
  const recovery=await restorePromptPreparation(page),second=await trialEntry(page,recovery.after,info,'trial-before-system-reduction');await heldSkip(page,second,'START_TRIAL',info,'trial-focused-before-system-reduction',false,false);
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.getByTestId('fx-skip')).toHaveCount(0);await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('hub-pulse')).toHaveCount(0);await expect(page.getByTestId('action-feedback-layer')).toHaveAttribute('data-state','idle');await stageFocus(page);
  await expect(page.locator('.app-shell.feedback-held')).toHaveCount(0);await stoppedFacts(page,second);
  const systemPreparation=await restorePromptPreparation(page);await staticReducedEntry(page,systemPreparation.after,info,'trial-new-system-reduced-result');
  const preferencePreparation=await restorePromptPreparation(page);await keyboard(page,page.getByTestId('game-settings'));await expect(page.getByTestId('reduce-effects')).toBeVisible();await page.getByTestId('reduce-effects').check();await expect(page.getByTestId('reduce-effects')).toBeChecked();await expect(page.locator('.app-shell')).toHaveClass(/hub-reduced/);await page.getByRole('button',{name:'关闭设置',exact:true}).click();
  await page.emulateMedia({reducedMotion:'no-preference'});expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);expect(await database(page)).toEqual(preferencePreparation.raw);await staticReducedEntry(page,preferencePreparation.after,info,'trial-new-preference-reduced-result');
});

test('CHECK-K11 an accepted trial entry cannot take focus from a newer keyboard settings decision after its actual saved handoff',async({page},info)=>{
  const before=await load(page,trialFixture());await showTrial(page);await keyboard(page,page.getByTestId('trial-review-entry'));const a=await begin(page,'trial-confirm-entry',15000),accepted=await database(page);
  await keyboard(page,page.getByTestId('game-settings'));await expect(page.locator('#settings-title')).toBeFocused();expect(await database(page)).toEqual(accepted);
  const saved=await cycle(page,a,before,info,'trial-newer-settings');expect(saved.after.trial).toEqual({stage:0,answer:null});await expect(page.locator('#settings-title')).toBeFocused();await expect(page.locator('#settings-title')).toBeVisible();
  await page.clock.runFor(2400);await expect(page.locator('#settings-title')).toBeFocused();expect(await database(page)).toEqual(saved.raw);await page.keyboard.press('Escape');await expect(page.getByTestId('game-settings')).toBeFocused();expect(await database(page)).toEqual(saved.raw);
});

test('CHECK-K12 an accepted trial entry cannot replace a newer keyboard exploration navigation or its focus when the original cycle commits',async({page},info)=>{
  const before=await load(page,trialFixture());await showTrial(page);await keyboard(page,page.getByTestId('trial-review-entry'));const a=await begin(page,'trial-confirm-entry',15000),accepted=await database(page),tab=page.getByTestId('tab-1');
  await keyboard(page,tab);await expect(page.getByTestId('explore-catalogue')).toBeVisible();await expect(tab).toBeFocused();expect(await database(page)).toEqual(accepted);
  const saved=await cycle(page,a,before,info,'trial-newer-navigation');expect(saved.after.trial).toEqual({stage:0,answer:null});await expect(page.getByTestId('explore-catalogue')).toBeVisible();await expect(tab).toBeFocused();
  await page.clock.runFor(2400);await expect(page.getByTestId('explore-catalogue')).toBeVisible();await expect(tab).toBeFocused();expect(await database(page)).toEqual(saved.raw);
});

test('CHECK-K13 a saved guard while only the public strategy is visible keeps its original cycle and factual receipt without a viewport fallback or later borrowed actor',async({page},info)=>{
  const before=await load(page,battleFixture());await manual(page);const a=await begin(page,'guard',3000),accepted=await database(page);
  expect(a.plan).toMatchObject({kind:'battle',mode:'single',move:'guard',maxCycles:1});
  await keyboard(page,page.getByTestId('battle-view-strategy'));await expect(page.getByTestId('battle-stage')).toHaveAttribute('data-view','strategy');await expect(page.getByTestId('battle-strategy-editor')).toBeVisible();await expect(page.getByTestId('battle-presence')).toHaveCount(0);
  expect(await database(page)).toEqual(accepted);expect(await activity(page)).toEqual(a);expect(await snapshot(page)).toEqual(before);
  const saved=await cycle(page,a,before,info,'battle-result-without-scene');expect(saved.after.battle).not.toBeNull();
  await expect.poll(async()=>{await page.clock.runFor(16);return page.getByTestId('action-feedback-layer').getAttribute('data-state');},{timeout:8000}).toBe('success');
  await expect(page.getByTestId('battle-stage')).toHaveAttribute('data-view','strategy');await expect(page.getByTestId('battle-strategy-editor')).toBeVisible();await expect(page.getByTestId('battle-presence')).toHaveCount(0);
  await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('fx-skip')).toHaveCount(0);await expect(page.locator('.actor-impact,.actor-arrival')).toHaveCount(0);await expect(page.locator('.app-shell.feedback-held')).toHaveCount(0);await stoppedFacts(page,saved);
  await keyboard(page,page.getByTestId('hub-receipt'));const history=page.getByTestId('adventure-history'),row=history.locator('article');await expect(history).toBeVisible();await expect(history.getByRole('status')).toHaveCount(0);await expect(row).toHaveCount(1);
  const result=resolve(before,a.nextCommand).result;await expect(row.locator('strong')).toHaveText('第 1 次 · 凝神护体');await expect(row.locator('p').first()).toHaveText(formatDelta(result.delta));await expect(row.locator('small').first()).toHaveText('实际投入：'+formatCosts(result.costs));
  for(const [selector,min] of [['p:first-of-type',18],['small',14]] as const)expect(await row.locator(selector).first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(min);expect(await database(page)).toEqual(saved.raw);
  await keyboard(page,page.getByTestId('hub-close'));await expect(page.getByTestId('battle-stage')).toBeVisible();await keyboard(page,page.getByTestId('battle-view-scene'));await expect(page.getByTestId('battle-presence')).toBeVisible();await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-active','true');
  await page.clock.runFor(2400);await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('fx-skip')).toHaveCount(0);await expect(page.locator('.actor-impact,.actor-arrival')).toHaveCount(0);await stoppedFacts(page,saved);
  await evidence(info,'battle-no-scene-then-return',{accepted,a,saved,receiptResult:result,renderHandshake:'after actual commit, public feedback layer success via original rAF frames; no new game cycle',returnVirtualMs:2400});
});

test('CHECK-K14 a real goal toggle delivered after typing preserves the exact pending quantity through blur readonly saving and reload',async({page},info)=>{
  await page.addInitScript(()=>{
    const w=window as any,nativeAdd=EventTarget.prototype.addEventListener,nativeRemove=EventTarget.prototype.removeEventListener,entries:any[]=[];
    let armed=false,held:any=null,restored=false;
    EventTarget.prototype.addEventListener=function(type:string,listener:any,options?:any){
      if(type!=='toggle'||!listener||!(this instanceof HTMLDetailsElement)||this.getAttribute('data-testid')!=='goal-management')return nativeAdd.call(this,type,listener,options);
      const target=this,wrapped=function(event:Event){
        if(armed&&target.open&&!held){held={event,listener,target,sourceTrusted:event.isTrusted,sourceTarget:event.target};return;}
        if(typeof listener==='function')listener.call(target,event);else listener.handleEvent(event);
      };
      entries.push({target,listener,wrapped,options,capture:typeof options==='boolean'?options:!!options?.capture});return nativeAdd.call(this,type,wrapped,options);
    };
    EventTarget.prototype.removeEventListener=function(type:string,listener:any,options?:any){
      const capture=typeof options==='boolean'?options:!!options?.capture,at=entries.findIndex(row=>row.target===this&&row.listener===listener&&row.capture===capture);
      if(type==='toggle'&&at>=0){const row=entries.splice(at,1)[0];return nativeRemove.call(this,type,row.wrapped,options);}
      return nativeRemove.call(this,type,listener,options);
    };
    w.__goalToggleArm=()=>{armed=true;held=null;};
    w.__goalToggleHeld=()=>held?{type:held.event.type,isTrusted:held.sourceTrusted,target:held.sourceTarget instanceof Element?held.sourceTarget.getAttribute('data-testid'):null,open:held.target.open}:null;
    w.__goalToggleRelease=()=>{
      if(!held)throw new Error('No actual native goal toggle was held');
      const entry=held,event=entry.event;armed=false;
      if(typeof entry.listener==='function')entry.listener.call(entry.target,event);else entry.listener.handleEvent(event);
      return{type:event.type,isTrusted:event.isTrusted,sourceTrusted:entry.sourceTrusted,sameEvent:event===held.event,sameTarget:event.target===entry.sourceTarget,target:entry.target.getAttribute('data-testid'),open:entry.target.open};
    };
    w.__goalToggleRestore=()=>{
      if(restored)return;restored=true;armed=false;
      for(const row of entries){nativeRemove.call(row.target,'toggle',row.wrapped,row.options);if(row.target.isConnected)nativeAdd.call(row.target,'toggle',row.listener,row.options);}
      entries.length=0;EventTarget.prototype.addEventListener=nativeAdd;EventTarget.prototype.removeEventListener=nativeRemove;
    };
  });
  try{
    const before=await load(page,driver().game),raw=await database(page);await selectGoal(page,'item:herb');
    const manager=page.getByTestId('goal-management'),summary=page.getByTestId('goal-management-toggle'),input=page.getByLabel('目标数量',{exact:true});
    await expect(summary).toHaveText('更换追踪目标');expect(await manager.evaluate(node=>(node as HTMLDetailsElement).open)).toBe(false);
    expect(await database(page)).toEqual(raw);expect(await snapshot(page)).toEqual(before);expect(state(raw,'activity')).toBeNull();
    await page.evaluate(()=>(window as any).__goalToggleArm());await keyboard(page,summary);
    await expect.poll(()=>page.evaluate(()=>(window as any).__goalToggleHeld())).toEqual({type:'toggle',isTrusted:true,target:'goal-management',open:true});
    await expect(input).toBeVisible();await input.fill('3');await expect(input).toHaveValue('3');expect(await database(page)).toEqual(raw);
    const delivered=await page.evaluate(()=>(window as any).__goalToggleRelease());
    expect(delivered).toEqual({type:'toggle',isTrusted:true,sourceTrusted:true,sameEvent:true,sameTarget:true,target:'goal-management',open:true});
    const afterDeliveryValue=await input.inputValue();await page.evaluate(()=>(window as any).__goalToggleRestore());await input.blur();
    const afterBlurValue=await input.inputValue();await keyboard(page,summary);expect(await database(page)).toEqual(raw);expect(await snapshot(page)).toEqual(before);
    await evidence(info,'actual-native-goal-toggle-delivery',{before,raw,delivery:'Call the captured original listener with the same actual native Event and target; no synthetic event dispatch or Game injection',delivered,typedValue:'3',afterDeliveryValue,afterBlurValue});
    await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×3');
    const preference=await page.evaluate(()=>JSON.parse(localStorage.getItem('chenyuan-tracked-goal-v1')!));
    expect(preference).toEqual({version:1,runId:before.core.runId,target:{kind:'item',id:'herb',quantity:3}});
    await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await openHubFeature(page,'goal');
    await expect(page.getByTestId('target')).toHaveText('筹备凝气草 ×3');await expect(page.getByTestId('goal-select')).toHaveValue('item:herb');
    expect(await database(page)).toEqual(raw);expect(await snapshot(page)).toEqual(before);
    await evidence(info,'goal-toggle-final-readonly',{preference,before,raw,current:await database(page)});
  }finally{if(!page.isClosed())await page.evaluate(()=>(window as any).__goalToggleRestore?.());}
});

for(const newInput of [false,true])test('M04-FOCUS trusted automatic return '+(newInput?'preserves a later real Tab target':'hands the saved retirement to factual life'),async({page},info)=>{
 await installRetirementDeliveryGate(page);const before=await load(page,driver().game),raw=await database(page);
 try{
  await keyboard(page,page.getByTestId('game-settings'));await keyboard(page,page.getByTestId('settings-retire'));const dialog=page.getByTestId('life-confirmation');await expect(dialog).toBeVisible();expect(await database(page)).toEqual(raw);
  await armRetirementClose(page);const a=await begin(page,'life-confirm-end',12000);expect(a.plan.action).toEqual({type:'RETIRE'});await armRetirementRead(page);let delivery:any;
  const saved=await cycle(page,a,before,info,'trusted-retirement-return',async()=>{delivery=await releaseRetirementInOrder(page,newInput);await evidence(info,'trusted-native-complete-and-close-consumption',delivery.evidence);});
  expect(saved.after.status).toBe('ended');expect(saved.after.ending).toBe('retired');expect(saved.after.core.runId).toBe(before.core.runId);
  if(newInput){expect(await delivery.selected.evaluate((node:any)=>node===document.activeElement)).toBe(true);await expect(page.getByTestId('life-title')).toHaveCount(0);}
  else await expect(page.getByTestId('life-title')).toBeFocused();
  expect(await database(page)).toEqual(saved.raw);await page.screenshot({path:info.outputPath(newInput?'retirement-preserves-real-tab.png':'retirement-auto-return-life.png')});
 }finally{await cleanupRetirementGate(page);}
});
