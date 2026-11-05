import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {completeActivity} from '../../src/full/activity';
import {snapshot,activitySnapshot as activity,openHubFeature} from './support';
import {selectPlan} from './idle-route-support';
import {selectLearningSkill,openLearningSettings,closeLearningSettings} from './stage-support';
import {importRecoveryFixture,recoveryDatabase,recoveryReadonly,stored,runRecoveryPlan,control600,assertRestored} from './idle-recovery-ui-support';
import {answerGameConfirmation} from './game-confirmation-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
function prepared(breakthrough=false){
 const d=driver();d.realm();d.realm();d.resource('jade',4);d.funds(2000);d.go('cave');
 d.doAction({type:'FORGE',relic:'jade_seal'});d.doAction({type:'EQUIP_RELIC',relic:'jade_seal'});
 if(breakthrough){d.realm();return d.checkpoints.golden;}
 d.go('sect');return d.game;
}
async function summary(page:Page){await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-summary').click();await expect(page.getByTestId('loadout-constellation')).toHaveAttribute('data-mode','summary');}
async function inspectRelic(page:Page){await page.getByTestId('loadout-node-relic').click();await expect(page.getByTestId('relic-atelier')).toHaveAttribute('data-relic','jade_seal');}
async function forgeLimits(page:Page,edit=false){
 await page.getByTestId('production-limits').click();
 if(edit){await page.getByLabel('累计生产灵石预算',{exact:true}).fill('777');await page.getByLabel('累计生产游戏月预算',{exact:true}).fill('9');await page.getByTestId('production-apply-limits').click();}
 else{await expect(page.getByLabel('累计生产灵石预算',{exact:true})).toHaveValue('777');await expect(page.getByLabel('累计生产游戏月预算',{exact:true})).toHaveValue('9');await page.getByRole('button',{name:'取消调整',exact:true}).click();}
}
async function startLearn(page:Page,skills:string[]){
 const plan={kind:'learn',skills,maxCycles:skills.length,stoneBudget:317,stoneReserve:13};
 const selected=await selectPlan(page,plan);await selected.control.click();
 await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);
 expect(a.plan).toEqual(plan);expect(a.cycleMs).toBe(30000);
 await expect(page.getByTestId('training-countdown')).toHaveText('30.0 秒');return a;
}
async function oneSaved(page:Page,a:any,before:any){
 await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(a.completedCycles+1);
 const raw=await recoveryDatabase(page),key=a.runId+':'+a.nextCommand.commandId;
 const records=raw.rows['full-receipts'].filter((r:any)=>r.key===key);expect(records).toHaveLength(1);
 const r=records[0].value,formal=resolve(before,a.nextCommand);
 expect(await snapshot(page)).toEqual(formal.nextState);expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);
 expect(r.proof.activityBefore).toEqual(a);expect(r.proof.stateAfter).toEqual(formal.nextState);expect(r.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);
 expect(r.activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:r.proof.resolvedAt}));
 return{game:formal.nextState,raw,receipt:r};
}
async function frame(page:Page,info:TestInfo,name:string){
 const g=await page.evaluate(()=>{
  const dialog=document.querySelector('dialog[open]'),root=dialog??document.querySelector('main:not([style*="display: none"])')!,nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),hud=document.querySelector('[data-testid=game-hud]')!.getBoundingClientRect();
  const visible=(n:Element)=>n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden',inside=(r:DOMRect,b:DOMRect)=>r.left>=b.left-.5&&r.right<=b.right+.5&&r.top>=b.top-.5&&r.bottom<=b.bottom+.5;
  return{scroll:document.documentElement.scrollHeight,inner:dialog?dialog.scrollHeight-dialog.clientHeight:0,
   hud:[...document.querySelectorAll<HTMLElement>('[data-testid=game-hud] strong,[data-testid=game-hud] small,[data-testid=game-hud] b')].filter(visible).map(n=>{const r=document.createRange();r.selectNodeContents(n);return{text:n.innerText,inside:inside(n.getBoundingClientRect(),hud),ink:[...r.getClientRects()].filter(x=>x.width&&x.height).every(x=>inside(x,hud))};}),
   controls:[...root.querySelectorAll<HTMLElement>('button,input,select')].filter(visible).map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.innerText||n.getAttribute('aria-label'),width:r.width,height:r.height,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=(dialog?innerHeight:nav.top),hit:n.matches(':disabled')||!!hit&&(hit===n||n.contains(hit))};}),
   copy:[...root.querySelectorAll<HTMLElement>('.loadout-node small,.loadout-node strong,.loadout-node span,.loadout-stage-caption strong,.loadout-stage-caption small,[data-testid=build-stats],.loadout-view-note,.configuration-slots p,.configuration-slots span,.configuration-effects')].filter(visible).map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const clips:DOMRect[]=[];for(let p=n.parentElement;p&&p!==document.body;p=p.parentElement)if(/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflow+getComputedStyle(p).overflowX+getComputedStyle(p).overflowY))clips.push(p.getBoundingClientRect());return{text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),min:n.matches('.loadout-node small,.loadout-node span,.loadout-stage-caption small,.configuration-slots span,.loadout-view-note')?14:18,lines:[...range.getClientRects()].filter(x=>x.width&&x.height).every(x=>inside(x,r)&&clips.every(b=>inside(x,b))),overflow:n.scrollHeight<=n.clientHeight+1&&n.scrollWidth<=n.clientWidth+1};})};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(g),contentType:'application/json'});await page.screenshot({path:info.outputPath(name+'.png')});
 expect(g.scroll).toBeLessThanOrEqual(900);expect(g.inner).toBeLessThanOrEqual(1);for(const r of g.hud){expect(r.inside,r.text).toBe(true);expect(r.ink,r.text).toBe(true);}
 for(const r of g.controls){expect(r.width,r.text??'').toBeGreaterThanOrEqual(44);expect(r.height,r.text??'').toBeGreaterThanOrEqual(44);expect(r.inside,r.text??'').toBe(true);expect(r.hit,r.text??'').toBe(true);}
 for(const r of g.copy){expect(r.font,r.text).toBeGreaterThanOrEqual(r.min);expect(r.lines,r.text).toBe(true);expect(r.overflow,r.text).toBe(true);}
}
test('CHECK-ART-C1 two paid scrolls retain their exact running period and separate forge draft across school loadout and current relic inspection',async({page},info)=>{
 const before=await importRecoveryFixture(page,prepared()),a=await startLearn(page,['sword_guard','sword_still']),accepted=await recoveryDatabase(page);
 await recoveryReadonly(page,async()=>{
  await page.getByTestId('equipment-mode-school').click();await expect(page.getByTestId('school-talisman')).toBeDisabled();
  await summary(page);await expect(page.getByTestId('loadout-relic')).toHaveText('玄玉印');await frame(page,info,'running-study-real-loadout');
  await inspectRelic(page);await forgeLimits(page,true);await summary(page);await inspectRelic(page);await forgeLimits(page);
  await page.getByTestId('equipment-mode-skills').click();await selectLearningSkill(page,'sword_guard');
 });
 expect(await activity(page)).toEqual(a);expect(await recoveryDatabase(page)).toEqual(accepted);
 await page.clock.fastForward(29999);expect(await recoveryDatabase(page)).toEqual(accepted);expect(await snapshot(page)).toEqual(before);
 expect(parseFloat(await page.getByTestId('training-countdown').innerText())).toBeLessThan(0.3);await page.clock.fastForward(1);
 const first=await oneSaved(page,a,before);expect(first.game.loadout).toEqual(before.loadout);expect(first.game.learned).toContain('sword_guard');expect(first.game.learned).not.toContain('sword_still');
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');const paused=await activity(page),raw=await recoveryDatabase(page);
 expect(paused.plan).toEqual(a.plan);expect(paused.completedCycles).toBe(1);expect(paused.spentStones).toBe(before.core.player.stones-first.game.core.player.stones);
 await recoveryReadonly(page,async()=>{await summary(page);await inspectRelic(page);await forgeLimits(page);await page.getByTestId('equipment-mode-skills').click();await openLearningSettings(page);await expect(page.getByLabel('累计研习灵石预算')).toHaveValue('317');await expect(page.getByLabel('研习灵石保留量')).toHaveValue('13');await closeLearningSettings(page);await selectLearningSkill(page,'sword_guard');await expect(page.getByTestId('equip-sword_guard')).toBeEnabled();});
 expect(await recoveryDatabase(page)).toEqual(raw);expect(await activity(page)).toEqual(paused);await frame(page,info,'paused-original-study-after-object-inspection');
});
test('CHECK-ART-C2 a native paid-study quota keeps complete loadout and relic reading then retries only the original cycle before a readonly comparison',async({page},info)=>{
 const before=await importRecoveryFixture(page,prepared()),a=await startLearn(page,['sword_guard']),accepted=await recoveryDatabase(page);
 await page.clock.fastForward(29999);expect(await recoveryDatabase(page)).toEqual(accepted);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(this.name==='full-state'&&k==='current'){IDBObjectStore.prototype.put=put;(window as any).__artCheckRejected=structuredClone(v);throw new DOMException('check-art24-26-paid-study-quota','QuotaExceededError');}return k===undefined?put.call(this,v):put.call(this,v,k);};});
 await page.clock.fastForward(1);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await recoveryDatabase(page)).toEqual(accepted);expect(await page.evaluate(()=>(window as any).__artCheckRejected)).toEqual(resolve(before,a.nextCommand).nextState);
 await recoveryReadonly(page,async()=>{
  await summary(page);await frame(page,info,'quota-complete-real-loadout');await inspectRelic(page);await expect(page.getByTestId('production-start')).toHaveCount(0);await expect(page.getByTestId('relic-atelier')).toContainText('保存待核对');await forgeLimits(page,true);await forgeLimits(page);await frame(page,info,'quota-current-bound-relic-readable');
  await page.getByTestId('equipment-mode-skills').click();await selectLearningSkill(page,'sword_guard');await expect(page.getByTestId('preparation-start')).toBeDisabled();
 });
 expect(await activity(page)).toEqual(a);await page.getByTestId('retry').click();const first=await oneSaved(page,a,before);expect(first.game.loadout).toEqual(before.loadout);
 await selectLearningSkill(page,'sword_guard');await page.getByTestId('equip-sword_guard').click();await expect(page.locator('.configuration-slots article')).toHaveCount(4);await expect(page.locator('.configuration-slots .changed')).toHaveCount(1);await frame(page,info,'real-study-retry-then-one-slot-compare');await page.getByTestId('configuration-cancel').click();expect(await recoveryDatabase(page)).toEqual(first.raw);
});
test('CHECK-ART-C3 another page full restore retires old-life current-relic inspection and its edited budget without applying a new authorization',async({page,context},info)=>{
 const before=await importRecoveryFixture(page,prepared(true));expect(before.core.player.realm).toBe('golden');
 await runRecoveryPlan(page,{kind:'milestone',action:{type:'BREAKTHROUGH'},maxCycles:1});expect((await snapshot(page)).core.player.realm).toBe('nascent');
 await summary(page);await inspectRelic(page);await forgeLimits(page,true);const old=await recoveryDatabase(page);expect(stored(old,'checkpoint').snapshot).toEqual(before);
 const other=await context.newPage(),otherErrors:string[]=[];other.on('pageerror',e=>otherErrors.push(e.message));try{
  await other.goto('/');await expect(other.getByTestId('save-status')).toHaveText('已保存');await other.getByTestId('game-settings').click();await other.getByTestId('restore-checkpoint').click();await answerGameConfirmation(other,'restore');await control600(other,old);const restored=await assertRestored(other,old);
  await expect(page.getByTestId('game-hud')).toContainText('金丹');await recoveryReadonly(page,async()=>{await summary(page);await expect(page.getByTestId('loadout-relic')).toHaveText('玄玉印');await expect(page.locator('.loadout-node-saved')).toHaveCount(0);await inspectRelic(page);await page.getByTestId('production-limits').click();await expect(page.getByLabel('累计生产灵石预算',{exact:true})).toHaveValue('140');await expect(page.getByLabel('累计生产游戏月预算',{exact:true})).toHaveValue('2');await page.getByRole('button',{name:'取消调整',exact:true}).click();await summary(page);});
  expect(await snapshot(page)).toEqual(restored.game);expect(await recoveryDatabase(page)).toEqual(restored.after);await frame(page,info,'restored-life-real-loadout-without-old-draft');expect(otherErrors).toEqual([]);
 }finally{await other.close();}
});
