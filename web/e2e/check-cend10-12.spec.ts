import{test,expect,type Page,type TestInfo}from'@playwright/test';
import{driver}from'../../tests/full-route.mjs';
import*as C from'../../src/full/content';
import type{Game}from'../../src/full/types';
import{resolve,validateGame}from'../../src/full/engine';
import{createActivity,pauseActivity,resumeActivity,completeActivity}from'../../src/full/activity';
import{canonicalFingerprint}from'../../src/full/receipts';
import{validateActivityReceipt}from'../src/activity-persistence';
import{snapshot,activitySnapshot as activity}from'./support';
import{importRecoveryFixture,recoveryDatabase as database,recoveryReadonly as readonly,stored}from'./idle-recovery-ui-support';
import{selectPlan,decision}from'./idle-route-support';
import{openSourceSettings,closeSourceSettings}from'./stage-support';
import{captureFixedPng}from'./png-capture';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(120000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const e:string[]=[];errors.set(page,e);page.on('pageerror',x=>e.push(x.message));});
test.afterEach(async({page},info)=>{
 if(!page.isClosed())await page.evaluate(()=>{(window as any).__c1012Restore?.();(window as any).__c1012Release?.();});
 await attach(info,'page-errors',errors.get(page));expect(errors.get(page)).toEqual([]);
});
async function attach(info:TestInfo,name:string,value:unknown){await info.attach(name,{body:JSON.stringify(value),contentType:'application/json'});}
function lawful(sourceId:string){
 const d=driver('leave','sword');if(sourceId==='jade_task')d.realm();d.meditate();d.go(C.sources[sourceId].location);validateGame(d.game);
 expect(d.game.core.inventory[C.realms[d.game.core.player.realm].pill!]).toBe(0);return d.game;
}
async function mutation(page:Page,g:Game,before:any,kind:'START'|'PAUSE'|'RESUME',info:TestInfo){
 const after=await database(page),added=after.rows['full-receipts'].filter((r:any)=>!before.rows['full-receipts'].some((o:any)=>o.key===r.key));expect(added).toHaveLength(1);
 const r=added[0].value;expect(r.input.kind).toBe(kind);expect(r.fingerprint).toBe(canonicalFingerprint(r.input));expect(()=>validateActivityReceipt(r,g)).not.toThrow();
 expect(await snapshot(page)).toEqual(g);expect(stored(after,'current')).toEqual(g);expect(stored(after,'activity')).toEqual(await activity(page));
 const options={ownerId:r.input.mutation.ownerId,commandId:r.input.mutation.commandId,now:r.activity.startedAt};
 const formal=kind==='START'?createActivity(g,r.input.plan,{...options,id:r.activity.id}):kind==='RESUME'?resumeActivity(g,stored(before,'activity'),options):pauseActivity(stored(before,'activity'));
 expect(r.activity).toEqual(formal);expect(after.rows['full-state'].filter((x:any)=>x.key!=='activity')).toEqual(before.rows['full-state'].filter((x:any)=>x.key!=='activity'));
 expect(after.rows['full-receipts'].filter((x:any)=>x.key!==added[0].key)).toEqual(before.rows['full-receipts']);
 for(const n of Object.keys(before.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(after.rows[n],n).toEqual(before.rows[n]);
 await attach(info,kind+'-complete-mutation',{g,before,after,receipt:r,formal});return{a:r.activity,raw:after};
}
async function start(page:Page,info:TestInfo,sourceId:string){
 const g=await importRecoveryFixture(page,lawful(sourceId))as Game,item=sourceId==='herbs'?'herb':'jade';
 const plan={kind:'source',sourceId,maxCycles:sourceId==='herbs'?4:2,until:'target',target:{kind:'item',id:item,quantity:g.core.inventory[item]+(sourceId==='herbs'?2:1)},monthBudget:sourceId==='herbs'?4:6,remainingMonthsReserve:1};
 const view=await selectPlan(page,plan),before=await database(page);await decision(page,view.control);await expect.poll(async()=>(await activity(page))?.status).toBe('running');
 const accepted=await mutation(page,g,before,'START',info);expect(accepted.a.plan).toEqual(plan);expect(accepted.a.cycleMs).toBe(C.sources[sourceId].months*30000);
 await expect(page.getByTestId('training-countdown')).toHaveText((accepted.a.cycleMs/1000).toFixed(1)+' 秒');return{g,item,plan,...accepted};
}
async function bothGoals(page:Page,g:Game,item:string,quantity:number,met=false){
 const pill=C.realms[g.core.player.realm].pill!;expect(g.core.inventory[pill]).toBe(0);
 await expect(page.getByTestId('hud-goal-object')).toHaveAttribute('data-item',pill);await expect(page.getByTestId('hub-gap')).toHaveText('尚缺'+C.items[pill].name+' 1');
 const goal=page.getByTestId('source-stock-goal');await expect(goal).toHaveAttribute('data-item',item);await expect(goal).toHaveAttribute('data-met',String(met));await expect(goal.locator('strong')).toHaveText(String(quantity));await expect(goal.locator('small')).toHaveText(met?'目标已达':'本段目标');
 await expect(page.locator('.ta08-stock-row[data-item="'+item+'"]>b')).toHaveText(String(g.core.inventory[item]));
}
async function readMainline(page:Page,g:Game){
 const pill=C.realms[g.core.player.realm].pill!;await page.getByTestId('hub-goal').click();await expect(page.getByTestId('goal-panel')).toBeVisible();
 await page.getByTestId('inspect-'+pill).click();await expect(page.getByTestId('goal-object-board')).toHaveAttribute('data-object-id',pill);await expect(page.getByTestId('source-title')).toContainText(C.items[pill].name);await expect(page.getByTestId('source-details')).toContainText('当前 0 / 1');
 await expect(page.locator('[data-testid^=route-recipe-]')).toHaveCount(1);await expect(page.locator('[data-testid^=route-purchase-]')).toHaveCount(1);
 await page.getByTestId('source-back').click();await page.getByTestId('hub-close').click();await expect(page.getByTestId('hub-goal')).toBeFocused();
}
async function draft(page:Page,check=false){
 await openSourceSettings(page,true);
 const fields=[['累计游戏月预算','17'],['余寿保留量','9']]as const;
 if(check){await expect(page.getByLabel('取材次数',{exact:true})).toHaveValue('5');for(const[label,value]of fields)await expect(page.getByLabel(label,{exact:true})).toHaveValue(value);}
 else{await page.getByLabel('取材次数',{exact:true}).selectOption('5');for(const[label,value]of fields)await page.getByLabel(label,{exact:true}).fill(value);}
 await closeSourceSettings(page);
}
async function frame(page:Page,info:TestInfo,name:string){
 await captureFixedPng(page,info.outputPath(name+'.png'));
 const data=await page.evaluate(()=>{
  const box=(e:Element)=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},nav=box(document.getElementById('primary-navigation')!),visible=(e:HTMLElement)=>e.checkVisibility()&&!e.closest('dialog:not([open])');
  return{page:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},roots:['hub-goal','source-field'].map(id=>{
   const root=document.querySelector<HTMLElement>('[data-testid="'+id+'"]')!,bounds=box(root),inside=(r:DOMRect)=>r.left>=bounds.left-.5&&r.right<=bounds.right+.5&&r.top>=bounds.top-.5&&r.bottom<=bounds.bottom+.5&&r.bottom<=nav.top;
   const selector=id==='hub-goal'?'[data-testid=hub-target],[data-testid=hub-gap],small,[data-testid=hub-goal-open]':'h2,p,small,.source-chosen strong,.source-chosen>span,.ta08-object-caption>strong,.ta08-object-caption>span,.ta08-stock-row>span,.ta08-stock-row>b,.source-stock-goal>strong,.source-stock-goal>small,.ta08-satchel-result strong,.ta08-satchel-result span span,[data-testid=source-work-state],[data-testid=source-plan-summary]';
   const words=[...root.querySelectorAll<HTMLElement>(selector)].filter(visible).filter(e=>!e.matches('p')||[...e.childNodes].some(t=>t.nodeType===Node.TEXT_NODE&&!!t.textContent?.trim())).map(e=>{const r=document.createRange();r.selectNodeContents(e);const aux=e.matches('small,.source-chosen>span,.ta08-object-caption>span,.ta08-period-facts,.ta08-satchel-result span span');return{text:e.innerText,font:parseFloat(getComputedStyle(e).fontSize),min:e.matches('[data-testid=hub-target]')?22:id==='hub-goal'&&!e.matches('.hud-goal-copy>[data-testid=hub-gap]')||aux?14:18,inside:[...r.getClientRects()].filter(r=>r.width&&r.height).every(inside)};});
   const controls=[...(root.matches('button')?[root]:[]),...root.querySelectorAll<HTMLElement>('button,summary,input,select')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:e.innerText,width:r.width,height:r.height,inside:inside(r),hit:e.matches(':disabled')||hit===e||!!hit&&e.contains(hit)};});
   return{id,bounds,words,controls};
  })};
 });
 expect(data.page.width).toBeLessThanOrEqual(1440);expect(data.page.height).toBeLessThanOrEqual(900);
 for(const root of data.roots){expect(root.bounds.left).toBeGreaterThanOrEqual(0);expect(root.bounds.right).toBeLessThanOrEqual(1440);for(const w of root.words){expect(w.font,w.text).toBeGreaterThanOrEqual(w.min);expect(w.inside,w.text).toBe(true);}for(const c of root.controls){expect(c.width,c.text).toBeGreaterThanOrEqual(44);expect(c.height,c.text).toBeGreaterThanOrEqual(44);expect(c.inside,c.text).toBe(true);expect(c.hit,c.text).toBe(true);}}
 await attach(info,name+'-complete-source-and-hud-geometry',data);
}
async function lastMs(page:Page,a:any,g:Game,raw:any){const left=a.dueAt-await page.evaluate(()=>Date.now());expect(left).toBeGreaterThan(0);expect(left).toBeLessThanOrEqual(a.cycleMs);await page.clock.fastForward(left-1);expect(await snapshot(page)).toEqual(g);expect(await database(page)).toEqual(raw);}
async function saved(page:Page,a:any,g:Game,accepted:any,info:TestInfo){
 await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(a.completedCycles+1);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const after=await database(page),formal=resolve(g,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId,rows=after.rows['full-receipts'].filter((r:any)=>r.key===key);expect(rows).toHaveLength(1);const r=rows[0].value;
 expect(r.input).toEqual({kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}});expect(r.fingerprint).toBe(canonicalFingerprint(r.input));expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);expect(()=>validateActivityReceipt(r,formal.nextState)).not.toThrow();
 expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(after,'current')).toEqual(formal.nextState);expect(stored(after,'previous')).toEqual(g);const done=completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:a.dueAt});expect(r.activity).toEqual(done);expect(await activity(page)).toEqual(done);expect(stored(after,'activity')).toEqual(done);
 expect(after.rows['full-receipts'].filter((x:any)=>x.key!==key)).toEqual(accepted.rows['full-receipts']);expect(after.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key))).toEqual(accepted.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key)));for(const n of Object.keys(after.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(after.rows[n],n).toEqual(accepted.rows[n]);
 expect(formal.nextState.core.player.realm).toBe(g.core.player.realm);expect(done.status).toBe('stopped');expect(done.stopReason.code).toBe('TARGET_MET');expect(formal.nextState.core.inventory[C.realms[g.core.player.realm].pill!]).toBe(0);
 expect(formal.nextState.core.player.stones).toBe(g.core.player.stones+C.sources[a.plan.sourceId].stones);for(const[id,n]of Object.entries(C.sources[a.plan.sourceId].items))expect(formal.nextState.core.inventory[id]).toBe(g.core.inventory[id]+n);
 await attach(info,'complete-formal-tick-all-stores',{g,a,accepted,after,formal,receipt:r,done});return{g:formal.nextState,raw:after,a:done,receipt:r};
}
async function holdWrite(page:Page){await page.evaluate(()=>new Promise<void>((ok,no)=>{
 const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>no(q.error);q.onsuccess=()=>{const db=q.result,names=[...db.objectStoreNames],tx=db.transaction(names,'readwrite'),rows:any={};let holding=true,pending=names.length;const w=window as any;w.__c1012Release=()=>holding=false;
  const loop=()=>{const r=tx.objectStore('full-state').get('current');r.onsuccess=()=>{w.__c1012HeldGame=r.result;if(holding)loop();};};
  for(const n of names){rows[n]=[];const r=tx.objectStore(n).openCursor();r.onsuccess=()=>{if(r.result){rows[n].push({key:r.result.key,value:r.result.value});r.result.continue();}else if(--pending===0){w.__c1012HeldDB={version:db.version,rows};loop();ok();}};}
  tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();no(tx.error);};
 };
}));}

test('CHECK-CEND10-12-C1 a resumed finite source goal completes locally while the real mainline pill remains missing through readonly return and a separate draft',async({page},info)=>{
 const t=await start(page,info,'herbs');await bothGoals(page,t.g,t.item,t.plan.target.quantity);await frame(page,info,'C1-current-source-and-mainline');
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');const paused=await mutation(page,t.g,t.raw,'PAUSE',info);
 await readonly(page,async()=>{await draft(page);await readMainline(page,t.g);await expect(page.getByTestId('source-field')).toHaveAttribute('data-source','herbs');await draft(page,true);await bothGoals(page,t.g,t.item,t.plan.target.quantity);await frame(page,info,'C1-paused-return-preserves-next-draft');});
 await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const resumed=await mutation(page,t.g,paused.raw,'RESUME',info);expect(resumed.a.id).toBe(t.a.id);expect(resumed.a.plan).toEqual(t.plan);expect(resumed.a.generation).toBeGreaterThan(paused.a.generation);expect(resumed.a.completedCycles).toBe(0);
 await lastMs(page,resumed.a,t.g,resumed.raw);await page.clock.fastForward(1);const result=await saved(page,resumed.a,t.g,resumed.raw,info);await bothGoals(page,result.g,t.item,t.plan.target.quantity,true);await frame(page,info,'C1-only-local-source-goal-complete');await readonly(page,()=>readMainline(page,result.g));
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await database(page)).toEqual(result.raw);await page.clock.fastForward(resumed.a.cycleMs);expect(await database(page)).toEqual(result.raw);await expect(page.getByTestId('hud-goal-object')).toHaveAttribute('data-item','foundation_pill');
});
test('CHECK-CEND10-12-C2 an original dual yield retry atomically updates source stock without retiring the mainline pill or replaying either reward after refresh',async({page},info)=>{
 const t=await start(page,info,'jade_task');await bothGoals(page,t.g,t.item,t.plan.target.quantity);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;const w=window as any;w.__c1012Restore=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-receipts'&&v?.input?.kind==='TICK'){w.__c1012Rejected=structuredClone(v);IDBObjectStore.prototype.put=put;throw new DOMException('C1012 original source tick quota','QuotaExceededError');}return k===undefined?put.call(this,v):put.call(this,v,k);};});
 await lastMs(page,t.a,t.g,t.raw);await page.clock.fastForward(1);await expect(page.getByTestId('retry')).toBeEnabled();expect(await snapshot(page)).toEqual(t.g);expect(await database(page)).toEqual(t.raw);const rejected=await page.evaluate(()=>(window as any).__c1012Rejected);
 await readonly(page,async()=>{await readMainline(page,t.g);await bothGoals(page,t.g,t.item,t.plan.target.quantity);await expect(page.getByTestId('retry')).toBeEnabled();await frame(page,info,'C2-original-quota-and-mainline-not-awarded');});
 await holdWrite(page);try{await page.getByTestId('retry').click();await expect(page.getByTestId('save-status')).toHaveText('保存中');expect(await page.evaluate(()=>(window as any).__c1012HeldDB)).toEqual(t.raw);expect(await page.evaluate(()=>(window as any).__c1012HeldGame)).toEqual(t.g);await expect(page.getByTestId('source-stock-goal')).toHaveAttribute('data-met','false');await expect(page.getByTestId('hub-gap')).toHaveText('尚缺凝金丹 1');await frame(page,info,'C2-held-native-original-facts');}finally{await page.evaluate(()=>(window as any).__c1012Release());}
 const result=await saved(page,t.a,t.g,t.raw,info);expect(result.receipt).toEqual(rejected);await bothGoals(page,result.g,t.item,t.plan.target.quantity,true);await frame(page,info,'C2-formal-dual-yield-mainline-still-missing');await readonly(page,()=>readMainline(page,result.g));
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');expect(await database(page)).toEqual(result.raw);await page.clock.fastForward(t.a.cycleMs);expect(await database(page)).toEqual(result.raw);await expect(page.getByTestId('hud-goal-object')).toHaveAttribute('data-item','golden_pill');
});
