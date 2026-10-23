import {test,expect,type Page} from '@playwright/test';
import {setupPersistence} from './support';

test.use({viewport:{width:1440,height:900}});

// Component/Store seam: the UI is real ActivityHistory, the Store and every query
// use the native test IndexedDB. Fixture progression uses formal single cycles
// at explicit rule deadlines; this is not a normal-route or real-online test.
test.beforeEach(async({page})=>{
 await setupPersistence(page);
 await page.evaluate(async()=>{
  const db=(globalThis as any).h;
  const source=await(await fetch('/src/ActivityHistory.vue')).text();
  const vueUrl=source.match(/from\s*["']([^"']*\/vue\.js(?:\?[^"']*)?)["']/)?.[1];
  if(!vueUrl)throw new Error('Cannot identify the component Vue module');
  const vue=await import(vueUrl),componentPath='/src/ActivityHistory.vue',storePath='/persistence-tests/activity-store-harness.ts';
  const {default:ActivityHistory}=await import(componentPath),{createActivityStoreHarness}=await import(storePath);
  const harness=createActivityStoreHarness(),restores:Array<()=>void>=[],releases:Array<()=>void>=[];
  const observations:any[]=[];let app:any=null;
  const stop=harness.store.observe((value:any)=>observations.push(value));
  const deferred=()=>{let resolve!:(value?:any)=>void;const promise=new Promise<any>(done=>resolve=done);return{promise,resolve};};
  function unmount(){app?.unmount();app=null;}
  function mount(){unmount();document.body.innerHTML='<div id="history-ui-root"></div>';app=vue.createApp({render:()=>vue.h(ActivityHistory,{store:harness.store})});app.mount('#history-ui-root');}
  async function seed(){
   unmount();const repo=await db.FullSaveRepository.open();
   try{
    const old=await repo.loadActivitySnapshot(),d=db.routes.driver('leave','sword');d.go('cave');
    const imported=await repo.importText(JSON.stringify(d.game),db.mutation(old.state));
    let out=await repo.startActivity({kind:'cultivation',method:'natural',maxCycles:5,until:'cycles',stoneBudget:0,stoneReserve:0},
     {commandId:crypto.randomUUID(),runId:imported.state.core.runId,expectedRevision:imported.state.core.revision,
      expectedActivityId:null,expectedActivityRevision:null,ownerId:'history-ui-fixture'});
    const realNow=Date.now,commands:any[]=[],results:any[]=[];
    try{
     for(let i=0;i<5;i++){
      const a=out.activity;commands.push(structuredClone(a.nextCommand));Date.now=()=>a.dueAt;
      out=await repo.settleActivity({commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,
       activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation});
      results.push(structuredClone(out.result));
     }
    }finally{Date.now=realNow;}
    if(out.activity.completedCycles!==5||out.activity.status!=='stopped')throw new Error('History fixture did not finish its five formal cycles');
    await harness.store.init();observations.length=0;
    return{commands,results,state:structuredClone(out.state),activity:structuredClone(out.activity),raw:await db.inspect(db.FULL_DB_NAME)};
   }finally{repo.close();}
  }
  // Only delivery is gated: the original native readonly transaction has fully
  // completed before entered resolves. No receipt or result is fabricated.
  function gateNext(fail=false){
   const prototype=db.FullSaveRepository.prototype,original=prototype.loadActivityHistory;
   const entered=deferred(),release=deferred(),finished=deferred();
   const restore=()=>{if(prototype.loadActivityHistory===intercept)prototype.loadActivityHistory=original;};
   const intercept=async function(this:any,...args:any[]){
    restore();const value=await Reflect.apply(original,this,args);entered.resolve(structuredClone(value));
    try{await release.promise;if(fail)throw new Error('obsolete history delivery probe');return value;}
    finally{finished.resolve();}
   };
   restores.push(restore);releases.push(()=>release.resolve());prototype.loadActivityHistory=intercept;
   return{entered:entered.promise,release:()=>release.resolve(),finished:finished.promise};
  }
  async function replace(kind:'activity'|'run'){
   const repo=await db.FullSaveRepository.open();
   try{
    const snapshot=await repo.loadActivitySnapshot();
    if(kind==='run'){
     const d=db.routes.driver('help','talisman');d.go('cave');
     await repo.importText(JSON.stringify(d.game),db.mutation(snapshot.state));
    }else await repo.startActivity({kind:'cultivation',method:'assisted',maxCycles:1,until:'cycles',stoneBudget:20,stoneReserve:0},
     {commandId:crypto.randomUUID(),runId:snapshot.state.core.runId,expectedRevision:snapshot.state.core.revision,
      expectedActivityId:snapshot.activity.id,expectedActivityRevision:snapshot.activity.revision,ownerId:'history-ui-other-owner'});
    await harness.store.refresh();observations.length=0;
   }finally{repo.close();}
  }
  function traceReads(){
   const transaction=IDBDatabase.prototype.transaction,prototype=db.FullSaveRepository.prototype,load=prototype.loadActivityHistory;
   const modes:string[]=[],queries:any[]=[];
   IDBDatabase.prototype.transaction=function(...args:any[]){if(this.name===db.FULL_DB_NAME)modes.push(args[1]??'readonly');return Reflect.apply(transaction,this,args);};
   prototype.loadActivityHistory=function(...args:any[]){queries.push(structuredClone(args));return Reflect.apply(load,this,args);};
   restores.push(()=>{IDBDatabase.prototype.transaction=transaction;prototype.loadActivityHistory=load;});
   return{modes,queries};
  }
  (globalThis as any).historyUI={...db,harness,observations,seed,mount,unmount,gateNext,replace,traceReads,
   state:()=>({...harness.state(),ready:harness.store.ready,available:harness.store.available,saveLabel:harness.store.saveLabel,syncEpoch:harness.store.syncEpoch}),
   cleanup(){for(const restore of restores.reverse())restore();for(const release of releases)release();unmount();stop();harness.dispose();}};
 });
});
test.afterEach(async({page})=>{await page.evaluate(()=>(globalThis as any).historyUI?.cleanup());});

async function fixture(page:Page){return page.evaluate(()=>(globalThis as any).historyUI.seed());}
async function current(page:Page){return page.evaluate(async()=>{const h=(globalThis as any).historyUI;return{ui:h.state(),raw:await h.inspect(h.FULL_DB_NAME),observations:structuredClone(h.observations)};});}
async function readReady(page:Page){await expect(page.getByTestId('activity-history')).toHaveAttribute('aria-busy','false');}

test('native history deliveries cannot restore stale rows or errors after unmount, activity/run replacement or synchronization',async({page},info)=>{
 const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
 const checks:any[]=[];
 for(const kind of ['unmount','activity','run','sync'] as const)for(const fail of [false,true]){
  const seeded=await fixture(page);
  const entered=await page.evaluate(async fail=>{const h=(globalThis as any).historyUI;h.gate=h.gateNext(fail);h.mount();return h.gate.entered;},fail);
  expect(entered.total).toBe(5);expect(entered.rows.map((r:any)=>r.command)).toEqual(seeded.commands.slice(0,1));
  await expect(page.getByTestId('activity-history')).toHaveAttribute('aria-busy','true');
  if(kind==='unmount')await page.evaluate(()=>{const h=(globalThis as any).historyUI;h.unmount();h.mount();});
  else if(kind==='sync')await page.evaluate(()=>(globalThis as any).historyUI.harness.store.syncEpoch++);
  else await page.evaluate(kind=>(globalThis as any).historyUI.replace(kind),kind);
  await readReady(page);
  if(kind==='unmount'||kind==='sync'){
   const pager=page.getByRole('navigation',{name:'逐次回执翻页'});for(let i=0;i<4;i++){await pager.getByTestId('catalogue-next').click();await readReady(page);}
   await expect(page.getByTestId('activity-history-row')).toHaveCount(1);
   await expect(page.getByTestId('activity-history-row')).toHaveAttribute('data-command-id',seeded.commands[4].commandId);
  }else{
   await expect(page.getByTestId('activity-history-row')).toHaveCount(0);
   if(kind==='activity')await expect(page.getByTestId('activity-history')).toContainText('尚无已保存周期');
   else await expect(page.getByTestId('activity-history')).toContainText('当前没有可核对的普通活动');
  }
  await expect(page.getByTestId('activity-history-error')).toHaveCount(0);
  const before=await current(page),content=await page.getByTestId('activity-history').innerText();
  await page.evaluate(async()=>{const h=(globalThis as any).historyUI;h.gate.release();await h.gate.finished;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));});
  await readReady(page);
  await expect.poll(()=>page.getByTestId('activity-history').innerText()).toBe(content);
  await expect(page.getByTestId('activity-history-error')).toHaveCount(0);
  expect(await current(page)).toEqual(before);expect(before.ui.saved).toBe(true);expect(before.ui.error).toBe('');
  checks.push({kind,delivery:fail?'late failure':'late success',nativeTotal:entered.total,unchangedAfterDelivery:true});
 }
 expect(pageErrors).toEqual([]);
 await info.attach('history-delivery-ownership',{body:JSON.stringify({seam:'real component plus Store and native readonly IndexedDB; only method delivery held after transaction completion',checks}),contentType:'application/json'});
});

test('a missing saved cycle is reported as incomplete and readonly recovery never invents a receipt or changes Game saved state',async({page},info)=>{
 const seeded=await fixture(page);
 const damaged=await page.evaluate(async commandId=>{
  const h=(globalThis as any).historyUI,key=h.harness.store.game.core.runId+':'+commandId;
  const original=(await h.inspect(h.FULL_DB_NAME))[h.FULL_RECEIPT_STORE].find((row:any)=>row.key===key);
  if(!original)throw new Error('The native cycle receipt is missing before the deliberate test corruption');
  h.removedReceipt=structuredClone(original);await h.put(h.FULL_DB_NAME,h.FULL_RECEIPT_STORE,key,undefined,true);
  h.mount();return{raw:await h.inspect(h.FULL_DB_NAME),ui:h.state()};
 },seeded.commands[2].commandId);
 await readReady(page);
 await expect(page.getByTestId('activity-history-error')).toContainText('未能完整核对');
 await expect(page.getByTestId('activity-history-row')).toHaveCount(0);
 await expect(page.getByRole('navigation',{name:'逐次回执翻页'})).toHaveCount(0);
 await expect(page.getByTestId('activity-history-totals')).toContainText('已完成 5 / 5');
 const failed=await current(page);expect(failed.raw).toEqual(damaged.raw);expect(failed.ui).toEqual(damaged.ui);expect(failed.ui.game).toEqual(seeded.state);
 expect(failed.ui.saved).toBe(true);expect(failed.ui.error).toBe('');expect(failed.observations).toEqual([]);
 const repaired=await page.evaluate(async()=>{
  const h=(globalThis as any).historyUI;await h.put(h.FULL_DB_NAME,h.FULL_RECEIPT_STORE,h.removedReceipt.key,h.removedReceipt.value);
  h.readTrace=h.traceReads();return{raw:await h.inspect(h.FULL_DB_NAME),ui:h.state()};
 });
 await page.getByTestId('activity-history-reload').click();await readReady(page);
 await expect(page.getByTestId('activity-history-error')).toHaveCount(0);await expect(page.getByTestId('activity-history-row')).toHaveCount(1);
 for(let i=0;i<4;i++){await page.getByRole('navigation',{name:'逐次回执翻页'}).getByTestId('catalogue-next').click();await readReady(page);}
 await expect(page.getByTestId('activity-history-row')).toHaveAttribute('data-command-id',seeded.commands[4].commandId);
 const after=await current(page),trace=await page.evaluate(()=>(globalThis as any).historyUI.readTrace);
 expect(after.raw).toEqual(repaired.raw);expect(after.raw).toEqual(seeded.raw);expect(after.ui).toEqual(repaired.ui);expect(after.observations).toEqual([]);
 expect(trace.queries.length).toBe(5);expect(trace.modes.length).toBeGreaterThanOrEqual(5);expect(trace.modes.every((mode:string)=>mode==='readonly')).toBe(true);
 await info.attach('missing-history-recovery',{body:JSON.stringify({seam:'one native saved test-db receipt deliberately removed, then restored byte-for-byte by the test; UI reads never repair or award',removedKey:(await page.evaluate(()=>(globalThis as any).historyUI.removedReceipt.key)),queries:trace.queries,modes:trace.modes}),contentType:'application/json'});
});

test('a failed native history delivery stays local and the visible retry performs only readonly queries',async({page},info)=>{
 const seeded=await fixture(page);
 const entered=await page.evaluate(async()=>{const h=(globalThis as any).historyUI;h.gate=h.gateNext(true);h.mount();return h.gate.entered;});
 expect(entered.total).toBe(5);const before=await current(page);
 await page.evaluate(async()=>{const h=(globalThis as any).historyUI;h.gate.release();await h.gate.finished;await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));});await readReady(page);
 await expect(page.getByTestId('activity-history-error')).toContainText('未能完整核对');await expect(page.getByTestId('activity-history-row')).toHaveCount(0);
 expect(await current(page)).toEqual(before);
 await page.evaluate(()=>{const h=(globalThis as any).historyUI;h.readTrace=h.traceReads();});
 await page.getByTestId('activity-history-reload').click();await readReady(page);
 await expect(page.getByTestId('activity-history-error')).toHaveCount(0);await expect(page.getByTestId('activity-history-row')).toHaveCount(1);
 expect(await page.getByTestId('activity-history-row').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-command-id')))).toEqual(seeded.commands.slice(0,1).map((command:any)=>command.commandId));
 const after=await current(page),trace=await page.evaluate(()=>(globalThis as any).historyUI.readTrace);
 expect(after).toEqual(before);expect(after.ui.saved).toBe(true);expect(after.ui.saveLabel).toBe('已保存');expect(after.ui.error).toBe('');
 expect(trace.queries.length).toBe(1);expect(trace.modes.length).toBeGreaterThanOrEqual(1);expect(trace.modes.every((mode:string)=>mode==='readonly')).toBe(true);
 await info.attach('history-readonly-retry',{body:JSON.stringify({seam:'original native readonly query completed before a single delivery failure; visible component retry rereads genuine saved receipts',queries:trace.queries,modes:trace.modes}),contentType:'application/json'});
});
