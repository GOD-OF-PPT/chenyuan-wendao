import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import {createIdleRoute} from '../../scripts/economy/idle-scenarios.mjs';
import {trialJourneyScenario,normalizeTrialGame} from '../../tests/trial-journey-route.mjs';
import {resolve,stats} from '../../src/full/engine.ts';
import {defaultEncounterPlan} from '../../src/full/adventure.ts';
import {snapshot,activitySnapshot,useJourneyClock,revealPaged} from './support';
import {decision,runVisibleIdleRoute,settleVisibleActivity,home} from './idle-route-support';
import {importRecoveryFixture,runRecoveryPlan,recoveryDatabase,recoveryReadonly,stored,control600,assertRestored,recoveryMove,trialReport,readTrialReport,openRecoveryRestore} from './idle-recovery-ui-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();test.beforeEach(({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(async({page})=>{if(!page.isClosed())await page.evaluate(()=>(window as any).__m04UIRestorePut?.());expect(errors.get(page)).toEqual([]);});
async function enter(page:Page,answer:string){await runRecoveryPlan(page,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1});await runRecoveryPlan(page,{kind:'milestone',action:{type:'ANSWER_TRIAL',answer},maxCycles:1});}
async function failedRestore600(page:Page,before:any){
 await expect(page.getByTestId('action-countdown')).toHaveText('0.6 秒');await page.clock.runFor(599);expect(await recoveryDatabase(page)).toEqual(before);await page.clock.runFor(1);await expect(page.getByTestId('trial-restore-error')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(before);
}
async function restoreFault(page:Page,mode:string){await page.evaluate(mode=>{
 const put=IDBObjectStore.prototype.put;(window as any).__m04UIRestorePut=()=>IDBObjectStore.prototype.put=put;(window as any).__m04RestoreFault={mode,hits:0,requestSuccess:false,abortCalled:false,intent:null};
 IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
  const f=(window as any).__m04RestoreFault;if(this.name==='full-receipts'&&value?.format==='chenyuan-control-receipt'&&value.kind==='RESTORE')f.intent=structuredClone(value.mutation);
  if(this.transaction.db.name==='chenyuan-playable-v1'&&(mode==='quota'?this.name==='full-receipts'&&value?.kind==='RESTORE':this.name==='full-state'&&key==='current')){
   f.hits++;if(mode==='quota'){(window as any).__m04UIRestorePut();throw new DOMException('M04 native full restore quota','QuotaExceededError');}
   const q=put.call(this,value,key!);q.addEventListener('success',()=>{(window as any).__m04UIRestorePut();f.requestSuccess=true;this.transaction.abort();f.abortCalled=true;});return q;
  }return put.call(this,value,key!);
 };
},mode);}

for(const school of ['sword','talisman']as const)test(`M04-U1 ${school} twice experiences lethal thunder then reads real costs and restores complete preparation after reload`,async({page},info)=>{
 test.setTimeout(240000);const answer=school==='sword'?'accept':'release',scenario=trialJourneyScenario(school,answer),prepared=await importRecoveryFixture(page,scenario.prepared),runs:string[]=[];
 const prefix=scenario.actions.slice(2,scenario.states.findIndex((g:any)=>g.trial?.stage===2));
 for(let attempt=0;attempt<2;attempt++){
  await enter(page,answer);for(const action of prefix)await recoveryMove(page,action.move);await recoveryMove(page,'heal');
  for(let turn=0;(await snapshot(page)).battle&&turn<45;turn++)await recoveryMove(page,'guard');
  const failed=await snapshot(page);expect(failed.battle).toBeNull();expect(failed.trial).toBeNull();expect(failed.core.player.hp).toBe(1);
  await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(failed);
  await recoveryReadonly(page,async()=>{await trialReport(page);const rows=await readTrialReport(page);expect(rows.get('trial-failure-reason')).toBe(failed.journal.at(-1));expect(rows.get('consumed')).toContain('渡劫引 ×1');expect(rows.get('consumed')).toContain('回春丹 ×'+(prepared.core.inventory.healing_pill-failed.core.inventory.healing_pill));});
  if(attempt===0)await page.screenshot({path:info.outputPath('actual-'+school+'-lethal-costs.png')});
  await recoveryReadonly(page,async()=>{await page.getByTestId('trial-mode-checkpoint').click();await decision(page,page.getByTestId('trial-restore-open'));await expect(page.getByTestId('trial-restore-confirmation')).toBeVisible();});
  const before=await recoveryDatabase(page);await decision(page,page.getByTestId('trial-restore-cancel'));expect(await recoveryDatabase(page)).toEqual(before);
  await openRecoveryRestore(page);await decision(page,page.getByTestId('trial-restore-confirm'));await control600(page,before);const done=await assertRestored(page,before);
  expect(normalizeTrialGame(done.game)).toEqual(normalizeTrialGame(prepared));runs.push(done.game.core.runId);await expect(page.getByTestId('trial-preparation-title')).toBeFocused();
 }
 expect(new Set(runs).size).toBe(2);await page.screenshot({path:info.outputPath('twice-restored-'+school+'-real-preparation.png')});
});

for(const mode of ['quota','abort'])test(`M04-U2 ${mode} complete restore can cancel its failed intent then retry one fresh original confirmation without a partial rewind`,async({page},info)=>{
 const prepared=await importRecoveryFixture(page,trialJourneyScenario().prepared);await enter(page,'accept');await recoveryMove(page,'guard');await openRecoveryRestore(page);const raw=await recoveryDatabase(page);
 await restoreFault(page,mode);await decision(page,page.getByTestId('trial-restore-confirm'));await failedRestore600(page,raw);
 const first=await page.evaluate(()=>(window as any).__m04RestoreFault);expect(first.hits).toBe(1);if(mode==='abort'){expect(first.requestSuccess).toBe(true);expect(first.abortCalled).toBe(true);}
 await page.screenshot({path:info.outputPath(mode+'-failed-complete-restore.png')});await decision(page,page.getByTestId('trial-restore-cancel'));await expect(page.getByTestId('retry')).toHaveCount(0);expect(await recoveryDatabase(page)).toEqual(raw);
 await openRecoveryRestore(page);await restoreFault(page,mode);await decision(page,page.getByTestId('trial-restore-confirm'));await failedRestore600(page,raw);const second=await page.evaluate(()=>(window as any).__m04RestoreFault);
 expect(second.intent.commandId).not.toBe(first.intent.commandId);await decision(page,page.getByTestId('trial-restore-retry'));await control600(page,raw);const done=await assertRestored(page,raw);
 expect(done.receipt.mutation).toEqual(second.intent);expect(normalizeTrialGame(done.game)).toEqual(normalizeTrialGame(prepared));await expect(page.getByTestId('trial-restore-confirmation')).toBeHidden();
});

test('M04-U3 an open full restore never rewinds another page committed turn or its explicitly replaced life',async({page,context},info)=>{
 await importRecoveryFixture(page,trialJourneyScenario().prepared);await enter(page,'accept');await recoveryMove(page,'guard');await openRecoveryRestore(page);
 const other=await context.newPage();other.on('pageerror',e=>errors.get(page)!.push(e.message));
 try{
  await useJourneyClock(other);await other.goto('/');await expect(other.getByTestId('save-status')).toHaveText('已保存');await recoveryMove(other,'guard');const current=await snapshot(other),raw=await recoveryDatabase(other);
  await expect(page.getByTestId('trial-restore-stale')).toBeVisible();await expect(page.getByTestId('trial-restore-confirm')).toBeDisabled();expect(await snapshot(page)).toEqual(current);expect(await recoveryDatabase(page)).toEqual(raw);
  await decision(page,page.getByTestId('trial-restore-cancel'));await openRecoveryRestore(page);await other.getByTestId('game-settings').click();other.once('dialog',d=>d.accept());await other.getByTestId('restart').click();await control600(other,raw);
  const replacement=await snapshot(other),protectedRaw=await recoveryDatabase(other);await expect.poll(async()=>(await snapshot(page)).core.runId).toBe(replacement.core.runId);
  await expect(page.getByTestId('trial-restore-stale')).toBeVisible();await expect(page.getByTestId('trial-restore-confirm')).toBeDisabled();await page.screenshot({path:info.outputPath('restore-review-stale-new-life.png')});
  await decision(page,page.getByTestId('trial-restore-cancel'));expect(await recoveryDatabase(page)).toEqual(protectedRaw);expect(replacement.core.player.realm).toBe('mortal');
 }finally{await other.close();}
});

test('M04-U4 imported mid-trial retreat shows unknown cumulative cost and a legal recovery route without fabricating a checkpoint',async({page},info)=>{
 const scenario=trialJourneyScenario('talisman','release'),fixture=scenario.states.find((g:any)=>g.trial?.stage===2);await importRecoveryFixture(page,fixture);await recoveryMove(page,'flee');const failed=await snapshot(page),raw=await recoveryDatabase(page);
 expect(stored(raw,'checkpoint')).toBeNull();await recoveryReadonly(page,async()=>{await home(page);await page.getByTestId('tab-0').click();await expect(page.locator('[data-notes-stage="gate"]')).toBeVisible();await decision(page,page.getByTestId('cultivation-notes-open'));await expect(page.getByTestId('hub-trial-result')).toBeVisible();await page.screenshot({path:info.outputPath('gate-book-current-result-entry.png')});await decision(page,page.getByTestId('hub-trial-result'));await expect(page.getByTestId('cultivation-notes-dialog')).not.toBeVisible();await expect(page.getByTestId('trial-progress')).toBeVisible();await page.getByTestId('hub-close').click();await expect(page.getByTestId('cultivation-notes-open')).toBeFocused();});await recoveryReadonly(page,async()=>{await trialReport(page);const rows=await readTrialReport(page);expect(rows.get('trial-failure-reason')).toBe(failed.journal.at(-1));expect(rows.get('consumed')).toContain('不能推断本轮累计耗物');await page.getByTestId('trial-mode-checkpoint').click();});
 await expect(page.getByTestId('trial-restore-open')).toHaveCount(0);await expect(page.getByTestId('trial-no-checkpoint')).toContainText('没有已验证');
 await recoveryReadonly(page,()=>decision(page,page.getByTestId('trial-prepare-again')));await expect(page.getByTestId('trial-preparation-title')).toBeFocused();
 const healed=await runRecoveryPlan(page,{kind:'rest',maxCycles:1,remainingMonthsReserve:1});expect(healed.game.core.player.hp).toBe(stats(healed.game).maxHp);expect(healed.game.core.player.mp).toBe(stats(healed.game).maxMp);expect(stored(await recoveryDatabase(page),'checkpoint')).toBeNull();
 await recoveryReadonly(page,async()=>{
  await page.getByTestId('tab-0').click();await expect(page.locator('[data-notes-stage="gate"]')).toBeVisible();
  await decision(page,page.getByTestId('cultivation-notes-open'));await expect(page.getByTestId('cultivation-notes-dialog')).toBeVisible();
  // A subsequent real REST breaks the adjacent trial transition proof. The current book must not advertise an expired report.
  await expect(page.getByTestId('hub-trial-result')).toHaveCount(0);await page.getByTestId('cultivation-notes-close').click();await expect(page.getByTestId('cultivation-notes-open')).toBeFocused();
 });
 await page.screenshot({path:info.outputPath('no-invented-checkpoint-real-recovery.png')});
});

test('M04-U5 a normally earned nonzero victory exports clears only its isolated site and imports every Game field with a new identity and honest missing checkpoint',async({page},info)=>{
 test.setTimeout(240000);const options={choice:'help',school:'sword',preparation:'purchase',cultivation:'natural',answer:'accept',ending:'transmit',advanced:false};
 const prefix=(o:any,identity:any)=>{const r=createIdleRoute(o,identity);r.begin();return{success:true,failure:null,game:r.game,steps:r.activity.steps,onlineMs:r.activity.onlineMs};};
 await runVisibleIdleRoute(page,info,options,prefix,{terminalRealm:'qi'});await runRecoveryPlan(page,{kind:'travel',location:'wilderness',maxCycles:1});
 await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-battle').click();await revealPaged(page,'encounter-wolf','adventure-planner','普通对手');await page.getByTestId('encounter-wolf').click();const base=await snapshot(page);
 await decision(page,page.getByTestId('adventure-start'));await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');expect((await activitySnapshot(page)).plan).toEqual(defaultEncounterPlan(base,'wolf'));
 const victorious=await settleVisibleActivity(page),before=victorious.game;expect(before.wins).toBe(1);expect(stored(await recoveryDatabase(page),'checkpoint')).not.toBeNull();
 await page.getByTestId('game-settings').click();const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前进度',exact:true}).click();const downloaded=await waiting,raw=fs.readFileSync((await downloaded.path())!,'utf8');expect(JSON.parse(raw)).toEqual(before);await page.getByRole('button',{name:'关闭设置',exact:true}).click();
 // Navigating to this known same-origin static JSON releases all App connections before deleting disposable test data.
 await page.goto('/.vite/manifest.json');await page.evaluate(async()=>{for(const name of ['chenyuan-playable-v1','chenyuan-local-experience-v1'])await new Promise<void>((ok,no)=>{const q=indexedDB.deleteDatabase(name);q.onsuccess=()=>ok();q.onerror=()=>no(q.error);q.onblocked=()=>no(Error('Isolated test database still has an App connection'));});localStorage.clear();sessionStorage.clear();});
 await page.goto('/');await expect(page.getByLabel('导入已有存档',{exact:true})).toBeEnabled({timeout:15000});await expect(page.getByTestId('realm')).toHaveCount(0);const empty=await recoveryDatabase(page);
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'owned-current-export.json',mimeType:'application/json',buffer:Buffer.from(raw)});await control600(page,empty);const imported=await snapshot(page);
 expect(imported.core.runId).not.toBe(before.core.runId);expect(imported.core.revision).toBe(0);expect(normalizeTrialGame(imported)).toEqual(normalizeTrialGame(before));expect(stored(await recoveryDatabase(page),'checkpoint')).toBeNull();
 await page.getByTestId('game-settings').click();await expect(page.getByTestId('restore-checkpoint')).toBeDisabled();await expect(page.locator('#checkpoint-unavailable')).toBeVisible();await page.getByRole('button',{name:'关闭设置',exact:true}).click();
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await snapshot(page)).toEqual(imported);await runRecoveryPlan(page,{kind:'travel',location:'cave',maxCycles:1});expect((await snapshot(page)).core.revision).toBe(imported.core.revision+1);
 await page.screenshot({path:info.outputPath('owned-site-data-current-game-recovered.png')});
});
