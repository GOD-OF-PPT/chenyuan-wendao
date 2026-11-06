import{test,expect,type Page,type TestInfo}from'@playwright/test';
import{newGame,resolve}from'../../src/full/engine';
import{driver}from'../../tests/full-route.mjs';
import{lifespanFixture,atLocation}from'../../tests/lifespan-guidance-fixtures.mjs';
import{completeActivity}from'../../src/full/activity';
import{canonicalFingerprint}from'../../src/full/receipts';
import{validateActivityReceipt}from'../src/activity-persistence';
import{snapshot,activitySnapshot as activity}from'./support';
import{importRecoveryFixture,recoveryDatabase as database,stored,recoveryReadonly as readonly,control600}from'./idle-recovery-ui-support';
import{openCultivationNotes,openTrainingBudget}from'./stage-support';
import{captureFixedPng}from'./png-capture';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});test.setTimeout(60000);
const panel=(p:Page)=>p.getByTestId('cultivation-fallback');
const faults=new WeakMap<Page,string[]>();test.beforeEach(({page})=>{const e:string[]=[];faults.set(page,e);page.on('pageerror',x=>e.push(x.message));});test.afterEach(({page})=>expect(faults.get(page)).toEqual([]));
function qi(){const d=driver();d.go('cave');return d;}
async function begin(page:Page){await page.getByTestId('cultivate').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');return activity(page);}
async function startAssisted(page:Page){await page.getByTestId('cultivation-method-assisted').click();return begin(page);}
async function exhausted(page:Page,info:TestInfo){const before=await importRecoveryFixture(page,qi().game),a=await startAssisted(page);expect(a.cycleMs).toBe(60000);const first=await cycle(page,info,a,before),one=await activity(page),last=await cycle(page,info,one,first);expect(last.core.player.stones).toBe(0);expect((await activity(page)).status).toBe('stopped');return last;}
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



test('UIR35-02-A1 spent assisted stones reveal a lawful natural choice without a hidden write before one explicitly started full natural cycle',async({page},info)=>{
 const before=await exhausted(page,info),raw=await database(page),old=await activity(page);await expect(panel(page)).toBeVisible();await expect(page.getByTestId('cultivate')).toHaveCount(0);await expect(panel(page)).not.toContainText('修为 +0');await expect(panel(page)).toContainText('不耗灵石');await expect(panel(page)).toContainText('最多 50 轮');await expect(page.getByTestId('cultivation-method-assisted')).toHaveAttribute('aria-pressed','true');await frame(page,info,'exhausted-free-choice');
 await page.getByTestId('cultivation-select-natural').focus();await page.keyboard.press('Enter');await expect(panel(page)).toHaveCount(0);await expect(page.getByTestId('cultivation-method-natural')).toHaveAttribute('aria-pressed','true');await expect(page.getByTestId('cultivation-method-natural')).toBeFocused();await expect(page.getByTestId('cultivate')).toHaveText('开始自然吐纳');expect(await database(page)).toEqual(raw);await captureFixedPng(page,info.outputPath('manual-selection-not-a-start.png'));
 const a=await begin(page);expect(a.id).not.toBe(old.id);expect(a.plan).toEqual({...old.plan,method:'natural',stoneBudget:0});expect(a.cycleMs).toBe(60000);expect(a.completedCycles).toBe(0);const done=await cycle(page,info,a,before);expect(done.core.player.stones).toBe(0);expect(done.core.player.xp).toBeGreaterThan(before.core.player.xp);await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');await captureFixedPng(page,info.outputPath('natural-real-saved-and-explicitly-paused.png'));
});

test('UIR35-02-A2 affordable locked lifespan and full-growth states retain their original decision instead of a misleading free substitute',async({browser},info)=>{
 const cases=[{id:'affordable',game:qi().game},{id:'mortal',game:atLocation(resolve(newGame('凡人','uir35-mortal'),{type:'CHOOSE',choice:'leave',commandId:'leave',runId:'uir35-mortal',expectedRevision:0}).nextState,'cave')},{id:'lifespan',game:atLocation(lifespanFixture(),'cave')},{id:'full',game:(()=>{const d=qi();d.meditate();return d.game;})()}];
 for(const item of cases){const context=await browser.newContext({baseURL:new URL(test.info().project.use.baseURL as string??'http://127.0.0.1:4174/').origin,viewport:{width:1440,height:900}}),p=await context.newPage();try{const before=await importRecoveryFixture(p,item.game);if(await p.getByTestId('cultivation-method-assisted').isVisible())await p.getByTestId('cultivation-method-assisted').click();await expect(panel(p)).toHaveCount(0);if(item.id==='lifespan')await expect(p.getByTestId('lifespan-guidance')).toBeVisible();else if(item.id==='full')await expect(p.getByTestId('journey-prepare')).toBeVisible();else await expect(p.getByTestId('cultivate')).toBeVisible();if(item.id==='affordable')await expect(p.getByTestId('cultivate')).toBeEnabled();expect(await snapshot(p)).toEqual(before);await captureFixedPng(p,info.outputPath('original-'+item.id+'.png'));}finally{await context.close();}}
});

test('UIR35-02-A3 native saving and a quota failure retain the old paid activity until the original retry atomically exhausts it and only then offers a free choice',async({page},info)=>{
 const before=await importRecoveryFixture(page,qi().game),a=await startAssisted(page),first=await cycle(page,info,a,before),one=await activity(page),accepted=await database(page);expect(first.core.player.stones).toBe(20);
 await page.evaluate(()=>new Promise<void>((ok,no)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>no(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('full-state','readwrite');let hold=true;(window as any).__uir35Release=()=>hold=false;function keep(){const x=tx.objectStore('full-state').get('current');x.onsuccess=()=>{if(hold)keep();};}keep();tx.oncomplete=()=>db.close();ok();};}));
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(this.name==='full-receipts'&&v?.input?.kind==='TICK'){IDBObjectStore.prototype.put=original;throw new DOMException('UIR35-02 native quota','QuotaExceededError');}return k===undefined?original.call(this,v):original.call(this,v,k);};});
 try{await page.clock.fastForward(one.cycleMs);await expect(page.getByTestId('save-status')).toHaveText('保存中');await expect(panel(page)).toHaveCount(0);await expect(page.getByTestId('cultivation-ongoing')).toContainText('用石 20 / 40');await captureFixedPng(page,info.outputPath('native-saving-keeps-original-paid-facts.png'));}finally{await page.evaluate(()=>(window as any).__uir35Release());}
 await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(accepted);await expect(panel(page)).toHaveCount(0);await expect(page.getByTestId('cultivation-select-natural')).toHaveCount(0);await page.getByTestId('retry').click();const done=await saved(page,info,one,first,accepted);expect(done.core.player.stones).toBe(0);await expect(panel(page)).toBeVisible();await frame(page,info,'original-retry-then-free-choice');
});

test('UIR35-02-A4 pause reload readonly drafts and an explicitly imported new life never replace saved authority with a fallback selection',async({page},info)=>{
 const before=await importRecoveryFixture(page,qi().game),a=await startAssisted(page);await page.getByTestId('cultivation-active-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');const original=await database(page);await expect(panel(page)).toHaveCount(0);await expect(page.getByTestId('cultivation-active-resume')).toHaveText('继续修炼');await readonly(page,async()=>{await page.getByTestId('cultivation-active-plan').click();await page.getByTestId('cultivation-method-natural').click();await openTrainingBudget(page);await expect(page.getByLabel('累计灵石预算',{exact:true})).toHaveValue('40');await page.getByTestId('hub-close').click();});expect((await activity(page)).plan).toEqual(a.plan);expect(await database(page)).toEqual(original);await captureFixedPng(page,info.outputPath('paused-original-budget-unchanged.png'));
 await page.getByTestId('game-settings').click();const fresh=qi().game;await page.getByTestId('import').setInputFiles({name:'fresh-lawful-life.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fresh))});await page.getByTestId('game-confirmation-confirm').click();await control600(page,original);await page.getByRole('button',{name:'关闭设置',exact:true}).click();await expect(panel(page)).toHaveCount(0);const current=await snapshot(page);expect(current.core.runId).not.toBe(before.core.runId);expect(current.core.player.stones).toBe(40);expect(await activity(page)).toBeNull();await captureFixedPng(page,info.outputPath('new-life-no-old-free-choice.png'));
 const start=await startAssisted(page),one=await cycle(page,info,start,current),next=await activity(page);await cycle(page,info,next,one);await expect(panel(page)).toBeVisible();const raw=await database(page);await page.getByTestId('cultivation-select-natural').evaluate(button=>button.addEventListener('click',()=>queueMicrotask(()=>document.querySelector<HTMLButtonElement>('[data-testid=hub-forge]')!.click()),{capture:true,once:true}));await page.getByTestId('cultivation-select-natural').click();await expect(page.getByTestId('recipe-catalogue')).toBeVisible();await expect(page.locator('#feature-title')).toBeFocused();expect(await database(page)).toEqual(raw);await captureFixedPng(page,info.outputPath('newer-navigation-keeps-its-focus.png'));
});
