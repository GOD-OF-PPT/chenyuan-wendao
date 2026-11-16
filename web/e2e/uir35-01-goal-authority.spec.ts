import{test,expect,type Page,type TestInfo}from'@playwright/test';
import{newGame,resolve}from'../../src/full/engine';
import{driver}from'../../tests/full-route.mjs';
import{completeActivity}from'../../src/full/activity';
import{canonicalFingerprint}from'../../src/full/receipts';
import{validateActivityReceipt}from'../src/activity-persistence';
import{snapshot,activitySnapshot as activity}from'./support';
import{importRecoveryFixture,recoveryDatabase as database,stored,recoveryReadonly as readonly,runRecoveryPlan}from'./idle-recovery-ui-support';
import{openTrainingBudget}from'./stage-support';
import{captureFixedPng}from'./png-capture';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});test.setTimeout(60000);
const faults=new WeakMap<Page,string[]>();test.beforeEach(({page})=>{const e:string[]=[];faults.set(page,e);page.on('pageerror',x=>e.push(x.message));});test.afterEach(({page})=>expect(faults.get(page)).toEqual([]));
const panel=(p:Page)=>p.getByTestId('cultivation-ongoing'),rail=(p:Page)=>p.locator('.game-hud .rail-count');
function mortal(){let g=newGame('顾长青','uir35-normal');for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'}]){const x=resolve(g,{...action,commandId:'prefix:'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision}as any);expect(x.result.executedSteps).toBe(1);g=x.nextState;}return g;}
async function begin(page:Page){await page.getByTestId('cultivate').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');return activity(page);}
async function finiteFacts(page:Page,a:any){await expect(rail(page)).toContainText('已完成 '+a.completedCycles+' 轮 · 上限 '+a.plan.maxCycles+' 轮');await expect(panel(page).locator('.ongoing-progress')).toContainText('已完成 '+a.completedCycles+' 轮');await expect(panel(page)).toContainText('上限 '+a.plan.maxCycles+' 轮');await expect(panel(page).locator('.ongoing-progress')).not.toContainText('/');}
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


test('UIR35-01-A1 natural cultivation shows actual growth instead of a fifty-cycle completion target and stops on the second original thirty-second period',async({page},info)=>{
 const before=await importRecoveryFixture(page,mortal()),a=await begin(page);expect(a.cycleMs).toBe(30000);expect(a.plan.maxCycles).toBe(50);expect(a.plan.until).toBe('xp-cap');await finiteFacts(page,a);await expect(panel(page)).toContainText('修为圆满即停');await expect(panel(page)).toContainText('不耗灵石');await expect(panel(page)).not.toContainText('用石 0 / 0');await frame(page,info,'natural-goal-running');
 const next=await cycle(page,info,a,before),one=await activity(page);expect(next.core.player.xp).toBe(5);await finiteFacts(page,one);await frame(page,info,'natural-one-saved');await page.getByTestId('cultivation-active-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');const paused=await activity(page);await frame(page,info,'natural-paused');
 await readonly(page,async()=>{await page.getByTestId('cultivation-active-plan').click();await openTrainingBudget(page);await expect(page.getByLabel('累计灵石预算',{exact:true})).toHaveValue('0');await expect(page.getByLabel('灵石保留量',{exact:true})).toHaveValue('0');await expect(page.getByLabel('圆满最多轮数',{exact:true})).toHaveValue('50');await captureFixedPng(page,info.outputPath('natural-complete-authority.png'));await page.getByTestId('hub-close').click();await expect(page.getByTestId('cultivation-active-plan')).toBeFocused();});
 await page.getByTestId('cultivation-active-resume').focus();await page.keyboard.press('Enter');await expect.poll(async()=>(await activity(page))?.generation).toBeGreaterThan(paused.generation);const resumed=await activity(page);expect(resumed.plan).toEqual(a.plan);const done=await cycle(page,info,resumed,next);expect(done.core.player.xp).toBe(10);expect(done.core.player.realm).toBe('mortal');expect((await activity(page)).completedCycles).toBe(2);expect((await activity(page)).status).toBe('stopped');await expect(rail(page)).toContainText('已完成 2 轮 · 上限 50 轮');const raw=await database(page);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(raw);await captureFixedPng(page,info.outputPath('natural-real-stop-two-of-upper-fifty.png'));
});

test('UIR35-01-A2 an explicit finite natural plan keeps its true target maximum and all original zero budget fields without a hidden write',async({page},info)=>{
 const d=driver();d.go('cave');const before=await importRecoveryFixture(page,d.game);const plan={kind:'cultivation',method:'natural',maxCycles:1,until:'cycles',stoneBudget:0,stoneReserve:0};const chosen=await import('./idle-route-support').then(m=>m.selectPlan(page,plan));await chosen.control.click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);expect(a.plan).toEqual(plan);await readonly(page,()=>page.getByTestId('cultivation-active-plan').click());await page.getByTestId('hub-close').click();await finiteFacts(page,a);await expect(panel(page)).toContainText('完成所选轮数即停');await expect(panel(page)).toContainText('不耗灵石');await frame(page,info,'natural-finite-one');await cycle(page,info,a,before);expect((await activity(page)).status).toBe('stopped');expect((await activity(page)).completedCycles).toBe(1);await expect(rail(page)).toContainText('已完成 1 轮 · 上限 1 轮');
});

test('UIR35-01-A3 assisted actual spending stays prominent and a failed second save cannot advance the displayed count or replace the original authority',async({page},info)=>{
 const d=driver();d.go('cave');const before=await importRecoveryFixture(page,d.game);await page.getByTestId('cultivation-method-assisted').click();const a=await begin(page);expect(a.cycleMs).toBe(60000);const next=await cycle(page,info,a,before),one=await activity(page);expect(one.spentStones).toBe(20);await finiteFacts(page,one);await expect(panel(page)).toContainText('用石 20 / 40');await expect(panel(page)).toContainText('保留 0');await expect(panel(page)).not.toContainText('不耗灵石');await frame(page,info,'assisted-real-cost');
 const raw=await database(page);await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(this.name==='full-receipts'&&v?.input?.kind==='TICK'){IDBObjectStore.prototype.put=original;throw new DOMException('UIR35 actual quota','QuotaExceededError');}return k===undefined?original.call(this,v):original.call(this,v,k);};});await page.clock.fastForward(one.dueAt-await page.evaluate(()=>Date.now()));await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(raw);await finiteFacts(page,one);await expect(panel(page)).toContainText('请先处理上方存档提示');await frame(page,info,'assisted-quota-old-facts');await page.getByTestId('retry').click();await saved(page,info,one,next,raw);expect((await activity(page)).status).toBe('stopped');expect((await activity(page)).spentStones).toBe(40);await expect(rail(page)).toContainText('已完成 2 轮 · 上限 50 轮');await captureFixedPng(page,info.outputPath('assisted-budget-stop.png'));
});
