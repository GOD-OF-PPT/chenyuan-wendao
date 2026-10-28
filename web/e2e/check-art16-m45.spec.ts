import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {resolve,stats} from '../../src/full/engine.ts';
import {createIdleRoute} from '../../scripts/economy/idle-scenarios.mjs';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {snapshot,activitySnapshot as activity,openHubFeature} from './support';
import {selectPlan,decision,home} from './idle-route-support';
import {importRecoveryFixture,runRecoveryPlan,recoveryMove,recoveryDatabase,recoveryReadonly,stored} from './idle-recovery-ui-support';
import {seedIdleLateSave} from '../idle-performance-tests/support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const failures=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const errors:string[]=[];failures.set(page,errors);page.on('pageerror',e=>errors.push(e.message));});
test.afterEach(async({page})=>{if(!page.isClosed())await page.evaluate(()=>(window as any).__crossSchoolRestore?.());expect(failures.get(page)).toEqual([]);});
const navigation=['tab-0','tab-1','hub-forge','hub-skills','hub-relics','tab-2','tab-3','hub-life'];
async function enter(page:Page){await runRecoveryPlan(page,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1});await runRecoveryPlan(page,{kind:'milestone',action:{type:'ANSWER_TRIAL',answer:'accept'},maxCycles:1});}
async function notes(page:Page){await home(page);await page.getByTestId('tab-0').click();await recoveryReadonly(page,()=>decision(page,page.getByTestId('cultivation-notes-open')));await expect(page.getByTestId('cultivation-notes-dialog')).toBeVisible();}
async function back(page:Page){await recoveryReadonly(page,()=>page.getByTestId('hub-close').click());await expect(page.getByTestId('cultivation-notes-open')).toBeFocused();}
async function bookFrame(page:Page,info:TestInfo,name:string){
 const measured=await page.getByTestId('cultivation-notes-dialog').evaluate(root=>{const nav=document.querySelector('#primary-navigation')!.getBoundingClientRect();return{height:document.documentElement.scrollHeight,viewport:innerHeight,scroll:root.scrollHeight-root.clientHeight,rows:[...root.querySelectorAll<HTMLElement>('button,h3,p,small')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),minimum:n.matches('small')?14:18,inside:r.x>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=nav.top,range:[...range.getClientRects()].filter(x=>x.width&&x.height).every(x=>x.x>=r.x-.5&&x.right<=r.right+.5&&x.top>=r.top-.5&&x.bottom<=r.bottom+.5),button:n.matches('button'),height:r.height,hit:!!hit&&(hit===n||n.contains(hit))};})};});
 await info.attach(name+'-geometry',{body:JSON.stringify(measured),contentType:'application/json'});
 expect(measured.height).toBeLessThanOrEqual(measured.viewport);expect(measured.scroll).toBeLessThanOrEqual(1);
 for(const r of measured.rows){expect(r.font,r.text).toBeGreaterThanOrEqual(r.minimum);expect(r.inside,r.text).toBe(true);expect(r.range,r.text).toBe(true);if(r.button){expect(r.height,r.text).toBeGreaterThanOrEqual(44);expect(r.hit,r.text).toBe(true);}}
 await page.screenshot({path:info.outputPath(name+'.png')});
}

test('CROSS-M45-C1 a genuine lethal trial retains all five practice notes and readonly recovery return',async({page},info)=>{
 test.setTimeout(180000);const scenario=trialJourneyScenario(),prepared=await importRecoveryFixture(page,scenario.prepared);await enter(page);
 for(const action of scenario.actions.slice(2,scenario.states.findIndex((g:any)=>g.trial?.stage===2)))await recoveryMove(page,action.move);
 await recoveryMove(page,'heal');let turns=0;for(;(await snapshot(page)).battle&&turns<45;turns++)await recoveryMove(page,'guard');
 const failed=await snapshot(page),raw=await recoveryDatabase(page);expect(failed.core.player.hp).toBe(1);expect(failed.battle).toBeNull();expect(failed.trial).toBeNull();expect(stored(raw,'checkpoint').snapshot).toEqual(prepared);
 await notes(page);await expect(page.locator('[data-notes-stage=practice]')).toBeVisible();await expect(page.locator('.cultivation-notes-options button')).toHaveCount(5);
 for(const id of ['hub-cultivation-details','hub-recovery','hub-trial-result'])await expect(page.getByTestId(id)).toBeVisible();await bookFrame(page,info,'lethal-five-complete-practice-entries');
 await recoveryReadonly(page,()=>decision(page,page.getByTestId('hub-trial-result')));await expect(page.getByTestId('trial-progress')).toBeVisible();await back(page);await notes(page);
 await recoveryReadonly(page,()=>decision(page,page.getByTestId('hub-recovery')));await expect(page.getByTestId('recovery-planner')).toBeVisible();await back(page);expect(await recoveryDatabase(page)).toEqual(raw);
 await info.attach('actual-lethal-prefix',{body:JSON.stringify({prefix:scenario.actions.slice(2,scenario.states.findIndex((g:any)=>g.trial?.stage===2)),explicitHeal:true,guardTurns:turns,virtualPeriodsOnly:true}),contentType:'application/json'});
});

test('CROSS-M45-C2 cancelled school comparison preserves a trial result until actual REST expires only its adjacent report',async({page},info)=>{
 test.setTimeout(90000);await importRecoveryFixture(page,trialJourneyScenario().prepared);await enter(page);await recoveryMove(page,'flee');const before=await snapshot(page),raw=await recoveryDatabase(page),checkpoint=stored(raw,'checkpoint');expect(checkpoint.kind).toBe('trial');
 await notes(page);await expect(page.getByTestId('hub-trial-result')).toBeVisible();await page.keyboard.press('Escape');
 await recoveryReadonly(page,async()=>{await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-school').click();await page.getByTestId('school-talisman').click();await expect(page.getByTestId('configuration-dialog')).toBeVisible();await page.getByTestId('configuration-cancel').click();await expect(page.getByTestId('school-talisman')).toBeFocused();});
 await notes(page);await expect(page.getByTestId('hub-trial-result')).toBeVisible();await page.keyboard.press('Escape');
 const done=await runRecoveryPlan(page,{kind:'rest',maxCycles:1,remainingMonthsReserve:1});expect(done.before).toEqual(before);expect(done.game.core.player.hp).toBe(stats(done.game).maxHp);expect(done.game.core.player.mp).toBe(stats(done.game).maxMp);
 const healed=await recoveryDatabase(page);expect(stored(healed,'checkpoint')).toEqual(checkpoint);expect(stored(healed,'checkpoint-owner')).toEqual(stored(raw,'checkpoint-owner'));
 await notes(page);await expect(page.getByTestId('hub-trial-result')).toHaveCount(0);await bookFrame(page,info,'real-rest-expired-adjacent-result');await page.keyboard.press('Escape');expect(await recoveryDatabase(page)).toEqual(healed);
});

test('CROSS-M45-C3 cancelled native school quota cannot poison a fresh actual trial checkpoint or its readonly question',async({page})=>{
 test.setTimeout(90000);const prepared=await importRecoveryFixture(page,trialJourneyScenario().prepared),raw=await recoveryDatabase(page);
 await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-school').click();await expect(page.getByTestId('loadout-constellation')).toHaveAttribute('data-school','sword');await expect(page.getByTestId('loadout-constellation').locator('.loadout-view-note')).not.toContainText('先择修法');await page.getByTestId('school-talisman').click();
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put,w=window as any;w.__crossSchoolRestore=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.format==='chenyuan-configuration-receipt'){w.__crossSchoolRestore();w.__crossRejectedSchool=structuredClone(value.intent);throw new DOMException('combined actual school quota','QuotaExceededError');}return key===undefined?put.call(this,value):put.call(this,value,key);};});
 await page.getByTestId('configuration-confirm').click();await expect(page.getByTestId('configuration-retry')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(raw);await page.getByTestId('configuration-cancel').click();
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1});const question=await snapshot(page),saved=await recoveryDatabase(page);expect(question.school).toBe('sword');expect(question.trial.stage).toBe(0);expect(stored(saved,'checkpoint').snapshot).toEqual(prepared);expect(saved.rows['full-receipts'].some((r:any)=>r.value.format==='chenyuan-configuration-receipt')).toBe(false);
 await recoveryReadonly(page,async()=>{await page.locator('#primary-navigation').getByTestId('tab-3').click();await expect(page.getByTestId('fate-catalogue')).toBeVisible();await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-school').click();await expect(page.getByTestId('school-talisman')).toBeDisabled();const selected=await selectPlan(page,{kind:'milestone',action:{type:'ANSWER_TRIAL',answer:'accept'},maxCycles:1});await expect(selected.control).toBeEnabled();await page.getByTestId('milestone-cancel').click();});expect(await snapshot(page)).toEqual(question);
});

test('CROSS-M45-C4 two original online cycles survive all eight views without stealing life reading or another authorization',async({page})=>{
 test.setTimeout(90000);const r=createIdleRoute({choice:'leave',school:'sword',preparation:'purchase',cultivation:'natural',answer:'accept',ending:'transmit',advanced:false});r.begin();const before=await importRecoveryFixture(page,r.game);expect(before.core.player.realm).toBe('qi');
 const plan={kind:'cultivation',method:'natural',maxCycles:2,until:'xp-cap',stoneBudget:0,stoneReserve:0};const selected=await selectPlan(page,plan);await decision(page,selected.control);await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);expect(a.plan).toEqual(plan);expect(a.cycleMs).toBe(60000);await expect(page.locator('[data-testid=training-activity][data-generation="'+a.generation+'"][data-running=true]')).toBeVisible();await expect(page.getByTestId('training-countdown')).toHaveText('60.0 秒');
 for(const id of navigation)await recoveryReadonly(page,async()=>{await page.locator('#primary-navigation').getByTestId(id).click();if(id==='hub-skills'){await page.getByTestId('equipment-mode-school').click();await expect(page.getByTestId('school-talisman')).toBeDisabled();await expect(page.getByTestId('school-talisman').locator('.school-reason')).not.toHaveText('');}});
 await expect(page.getByTestId('life-panel')).toBeVisible();const heading=await page.getByTestId('life-title').textContent();let current=a,game=before;
 for(let cycle=1;cycle<=2;cycle++){
  await expect(page.locator('[data-testid=training-activity][data-generation="'+current.generation+'"][data-running=true]')).toBeVisible();await expect(page.getByTestId('training-countdown')).toHaveText('60.0 秒');const unchanged=await recoveryDatabase(page);
  await page.clock.fastForward(59999);expect(await snapshot(page)).toEqual(game);expect(await recoveryDatabase(page)).toEqual(unchanged);await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page)).completedCycles).toBe(cycle);await expect(page.getByTestId('save-status')).toHaveText('已保存');game=resolve(game,current.nextCommand).nextState;expect(await snapshot(page)).toEqual(game);current=await activity(page);expect(current.id).toBe(a.id);expect(current.plan).toEqual(plan);await expect(page.getByTestId('life-panel')).toBeVisible();await expect(page.getByTestId('life-title')).toHaveText(heading!);
 }
 expect(current.status).toBe('stopped');const raw=await recoveryDatabase(page);expect(raw.rows['full-receipts'].filter((r:any)=>r.value.input?.kind==='TICK'&&r.value.activity?.id===a.id)).toHaveLength(2);
});

test('CROSS-M45-C5 a normal visible late-life preparation exposes all eight actual play surfaces without a Game write',async({page},info)=>{
 const late=await seedIdleLateSave(page,info);await page.clock.resume();const raw=await recoveryDatabase(page);expect(raw).toEqual(late.raw);
 for(const id of navigation){
  await recoveryReadonly(page,async()=>{await page.locator('#primary-navigation').getByTestId(id).click();await expect(page.locator('#primary-navigation').getByTestId(id)).toHaveAttribute('aria-current','page');});
  await expect.poll(()=>page.locator('[data-art-state=loading]').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).length)).toBe(0);
  const g=await page.locator('#primary-navigation').evaluate(nav=>({height:document.documentElement.scrollHeight,viewport:innerHeight,buttons:[...nav.querySelectorAll('button')].map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.textContent,height:r.height,inside:r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight,hit:!!hit&&(n===hit||n.contains(hit))};})}));expect(g.height).toBeLessThanOrEqual(g.viewport);expect(g.buttons).toHaveLength(8);for(const b of g.buttons){expect(b.height,b.text!).toBeGreaterThanOrEqual(44);expect(b.inside,b.text!).toBe(true);expect(b.hit,b.text!).toBe(true);}
  await info.attach(id+'-navigation-geometry',{body:JSON.stringify(g),contentType:'application/json'});await page.screenshot({path:info.outputPath('eight-'+id+'.png')});expect(await snapshot(page)).toEqual(late.game);expect(await recoveryDatabase(page)).toEqual(raw);
 }
});
