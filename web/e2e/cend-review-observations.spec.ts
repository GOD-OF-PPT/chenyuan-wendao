import {test,expect,type Page} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {trialPreparationRunner} from '../../tests/trial-preparation-route.mjs';
import {newGame,resolve} from '../../src/full/engine';
import {gamePhase} from '../../src/full/contracts';
import {completeActivity} from '../../src/full/activity';
import {canonicalFingerprint} from '../../src/full/receipts';
import {validateActivityReceipt} from '../src/activity-persistence';
import {snapshot,activitySnapshot as activity,openHubFeature} from './support';
import {importRecoveryFixture,recoveryDatabase as database,recoveryReadonly,stored,runRecoveryPlan,recoveryMove} from './idle-recovery-ui-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});test.setTimeout(60000);
async function oneSaved(page:Page,a:any,before:any,accepted:any){await expect.poll(async()=>(await activity(page)).completedCycles).toBe(a.completedCycles+1);await expect(page.getByTestId('save-status')).toHaveText('已保存');const raw=await database(page),formal=resolve(before,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId,rows=raw.rows['full-receipts'].filter((r:any)=>r.key===key);expect(raw.version).toBe(9);expect(rows).toHaveLength(1);expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(raw,'current')).toEqual(formal.nextState);expect(stored(raw,'previous')).toEqual(before);const r=rows[0].value,input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}};expect(r.input).toEqual(input);expect(r.fingerprint).toBe(canonicalFingerprint(input));expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);let now=a.dueAt;if(a.version>=5){expect(r.version).toBe(2);expect(r.proof.activityBefore).toEqual(a);expect(r.proof.stateAfter).toEqual(formal.nextState);expect(r.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);now=r.proof.resolvedAt;}else{expect(r.version).toBe(1);expect(r).not.toHaveProperty('proof');}expect(r.activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now}));expect(stored(raw,'activity')).toEqual(r.activity);expect(()=>validateActivityReceipt(r,formal.nextState)).not.toThrow();expect(raw.rows['full-receipts'].filter((r:any)=>r.key!==key)).toEqual(accepted.rows['full-receipts']);expect(raw.rows['full-state'].filter((r:any)=>!['current','previous','activity'].includes(r.key))).toEqual(accepted.rows['full-state'].filter((r:any)=>!['current','previous','activity'].includes(r.key)));for(const n of Object.keys(raw.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[n],n).toEqual(accepted.rows[n]);return{game:formal.nextState,raw,receipt:r};}
// Observation capture is not a usability pass; the attached factual gaps remain open findings.
test('CEND02 observation: real retreat and readonly target lead only to its explicit full six-second travel',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const prepared=await importRecoveryFixture(page,trialPreparationRunner('sword','buy-product',2).ledger.game);
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1});
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'ANSWER_TRIAL',answer:'accept'},maxCycles:1});
 await recoveryMove(page,'flee');await page.getByTestId('tab-0').click();
 const g=await snapshot(page),raw=await database(page);expect(stored(raw,'checkpoint').snapshot).toEqual(prepared);expect(gamePhase(g)).toBe('idle');expect(g.battle).toBeNull();expect(g.trial).toBeNull();expect(g.core.activeEvent).toBeNull();expect(g.core.inventory.ascension_seal).toBe(1);
 await recoveryReadonly(page,async()=>{await page.getByTestId('hub-goal').click();await expect(page.getByTestId('goal-panel')).toBeVisible();});
 const control=page.getByTestId('goal-location'),text=await page.getByTestId('goal-panel').innerText(),button=await control.innerText(),kind=await control.getAttribute('data-navigation-kind');await expect(control).toBeEnabled();
 const observation={formalPhase:gamePhase(g),actualPendingEncounter:false,validNativeCheckpoint:true,goalText:text,buttonText:button,navigationKind:kind,captionAsksForEncounter:text.includes('先处理眼前的遭遇'),preActionSixSecondNotice:/6\s*秒/.test(text),realPeriodMs:6000,scope:'One isolated lawful actual online arrangement with virtual boundary checks; captures usability findings, not human comprehension or real growth pacing.'};
 await info.attach('CEND02-target-factual-observation',{body:JSON.stringify(observation),contentType:'application/json'});await page.screenshot({path:info.outputPath('idle-recovery-goal-before-explicit-travel.png')});
 await page.getByTestId('hub-close').click();expect(await database(page)).toEqual(raw);await page.getByTestId('hub-goal').click();expect(await database(page)).toEqual(raw);
 await control.click();await expect.poll(async()=>{const a=await activity(page);return a?.plan.kind==='travel'&&a.status==='running';}).toBe(true);
 const a=await activity(page),accepted=await database(page);expect(a.cycleMs).toBe(6000);expect(a.plan.maxCycles).toBe(1);expect(await snapshot(page)).toEqual(g);
 await info.attach('CEND02-real-running-hud',{body:await page.getByTestId('game-hud').innerText(),contentType:'text/plain'});await page.screenshot({path:info.outputPath('actual-travel-only-after-explicit-click.png')});
 await page.clock.runFor(5999);expect(await snapshot(page)).toEqual(g);expect(await database(page)).toEqual(accepted);await page.clock.runFor(1);
 const done=await oneSaved(page,a,g,accepted);expect(done.game.core.world.location).toBe('terrace');expect(done.game.trial).toBeNull();expect(stored(done.raw,'checkpoint')).toEqual(stored(raw,'checkpoint'));expect(stored(done.raw,'activity').status).toBe('stopped');expect(errors).toEqual([]);
 await page.screenshot({path:info.outputPath('actual-arrival-without-automatic-trial.png')});
});

// Read-only art/hierarchy observation; no minimum portrait size or user approval is invented.
test('CEND02 observation: the actual opening portrait and three full choices remain readonly and distinguishable',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await importRecoveryFixture(page,newGame('初入山门客','cend02-opening'));const before=await database(page);
 const portrait=page.locator('[data-asset-id="portrait-shen"]:visible');await expect(portrait).toBeVisible();await expect(portrait).toHaveAttribute('data-art-state','ready');const measured=await portrait.evaluate(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height,assetId:n.getAttribute('data-asset-id'),state:n.getAttribute('data-art-state')};});
 const main=await page.locator('#game-content').innerText(),choices=await page.locator('[data-testid="help"],[data-testid="trade"],[data-testid="leave"]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{text:n.textContent,enabled:!(n as HTMLButtonElement).disabled,width:r.width,height:r.height};}));expect(choices).toHaveLength(3);expect(choices.every(c=>c.enabled)).toBe(true);
 await page.screenshot({path:info.outputPath('opening-current-subject-and-choice-hierarchy.png')});await page.getByTestId('hub-goal').click();await expect(page.getByTestId('inspect-xp')).toBeDisabled();const goal=await page.getByTestId('goal-panel').innerText();await page.getByTestId('hub-close').click();expect(await database(page)).toEqual(before);expect(errors).toEqual([]);
 await info.attach('CEND02-opening-factual-observation',{body:JSON.stringify({portrait:measured,choices,main,goal,scope:'Structural art review; no art certification or human comprehension pass. Opening cave travel is actually disabled and not a defect.'}),contentType:'application/json'});
});

// A shared catalogue may be safe yet leave misleading global navigation context.
test('CEND02 observation: shared skill and relic tabs preserve Game while recording actual global navigation context',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const d=driver();d.realm();d.realm();d.go('cave');await importRecoveryFixture(page,d.game);const raw=await database(page);
 const readings:any[]=[];
 for(const [outer,inner]of [['relics','skills'],['skills','relics']]as const){await openHubFeature(page,outer);await page.getByTestId('equipment-mode-'+inner).click();await expect(page.getByTestId('equipment-panel')).toHaveAttribute('data-section',inner);await expect(page.getByTestId(inner==='skills'?'learning-planner':'relic-atelier')).toBeVisible();
 const header=await page.locator('#feature-title').innerText(),navigation=await page.locator('#primary-navigation button[aria-current="page"]').innerText(),innerName=await page.getByTestId('equipment-mode-'+inner).innerText();readings.push({outerRequested:outer,actualInner:inner,innerLabel:innerName,visibleHeader:header,currentMainNavigation:navigation});expect(await database(page)).toEqual(raw);await page.screenshot({path:info.outputPath(outer+'-outer-'+inner+'-inner-current-context.png')});}
 expect(errors).toEqual([]);await info.attach('CEND02-shared-catalogue-context-observation',{body:JSON.stringify({readings,readonlyAllDb:true,scope:'Actual readonly context observation, not a fixed-navigation or human-comprehension pass.'}),contentType:'application/json'});
});
