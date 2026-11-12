import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';
import {repositoryFsRoot} from './fs-root';

test('a real scheduled source persists four due periods together with its fifteen-second remainder',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async root=>{
  const h=(globalThis as any).h,model=await import(`/@fs${root}src/full/activity.ts`),d=h.routes.driver();d.go('sect');
  const name='scheduled-four',repo=await h.FullSaveRepository.open(name),realNow=Date.now;let now=1700000000000;Date.now=()=>now;let reopened:any;
  const mutation=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const original=await repo.loadActivitySnapshot();
   const started=await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},mutation(original,'scheduled-start'));
   now+=135000;const completed=await repo.advanceScheduledActivity(mutation(started,'scheduled-return'));
   let expected=started.state,a=started.activity;for(let n=0;n<4;n++){const result=h.engine.resolve(expected,a.nextCommand);expected=result.nextState;a=model.completeActivity(expected,a,result.result,{commandId:a.nextCommand.commandId,now:a.dueAt});}
   reopened=await h.FullSaveRepository.open(name);const snapshot=await reopened.loadActivitySnapshot(),raw=await h.FullSaveRepository.exportRaw(name),summary=await reopened.loadAwaySummary();
   return{original,started,completed,expected,expectedActivity:a,snapshot,raw,summary,afterSummary:await h.FullSaveRepository.exportRaw(name),now,scheduleStore:h.FULL_SCHEDULE_STORE};
  }finally{Date.now=realNow;reopened?.close();repo.close();}
 },repositoryFsRoot);
 expect(r.raw.database.version).toBe(10);expect(r.started.state).toEqual(r.original.state);expect(r.completed.state).toEqual(r.expected);expect(r.completed.activity).toEqual(r.expectedActivity);expect(r.completed.activity.completedCycles).toBe(4);
 expect(r.completed.state.core.player.stones-r.original.state.core.player.stones).toBe(80);expect(r.completed.activity.dueAt-r.now).toBe(15000);expect(r.snapshot.state).toEqual(r.completed.state);expect(r.snapshot.activity).toEqual(r.completed.activity);
 const clock=r.raw.stores.find((s:any)=>s.name===r.scheduleStore);expect(clock.entries).toHaveLength(1);expect(clock.entries[0].value.activityId).toBe(r.completed.activity.id);expect(clock.entries[0].value.activityRevision).toBe(r.completed.activity.revision);
 expect(r.summary.cycles).toBe(4);expect(r.summary.costs.months).toBe(48);expect(r.summary.delta.stones).toBe(80);expect(r.summary.delta.months).toBe(48);expect(r.afterSummary).toEqual(r.raw);
});

test('a claimed pre10 database with a conflicting clock store is refused without dropping even its empty original',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async()=>{
  const h=(globalThis as any).h,name='pre10-clock-collision',game=h.legacyRuleRoutes.driver().game;
  await new Promise<void>((resolve,reject)=>{
   const q=indexedDB.open(name,9);q.onupgradeneeded=()=>{for(const n of [h.FULL_STATE_STORE,h.FULL_RECEIPT_STORE,h.FULL_BACKUP_STORE,h.FULL_SCHEDULE_STORE])q.result.createObjectStore(n);q.transaction!.objectStore(h.FULL_STATE_STORE).put(game,'current');};
   q.onerror=()=>reject(q.error);q.onsuccess=()=>{q.result.close();resolve();};
  });
  const before=await h.FullSaveRepository.exportRaw(name),failed=await h.attempt(()=>h.FullSaveRepository.open(name));return{before,failed,after:await h.FullSaveRepository.exportRaw(name)};
 });
 expect(r.before.database.version).toBe(9);expect(r.before.stores.find((x:any)=>x.name==='full-schedules').entries).toEqual([]);expect(r.failed.code).toBe('DB_SCHEMA');expect(r.after).toEqual(r.before);
});

for(const damage of ['count','profile'])test(`a batch with damaged ${damage} proof cannot produce a summary or repeat gains and the whole raw database stays intact`,async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async damage=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const name='scheduled-proof-'+damage,repo=await h.FullSaveRepository.open(name),realNow=Date.now;
  let now=1700000000000;Date.now=()=>now;
  const m=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());
   const started=await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},m(await repo.loadActivitySnapshot(),'proof-start'));
   now+=135000;const intent=m(started,'proof-return'),done=await repo.advanceScheduledActivity(intent),raw=await h.FullSaveRepository.exportRaw(name),key=intent.runId+':'+intent.commandId;
   const receipt=raw.stores.find((x:any)=>x.name===h.FULL_RECEIPT_STORE).entries.find((x:any)=>x.key===key).value;
   if(damage==='count')receipt.proof.cycles++;else receipt.proof.stateAfter.core.balanceVersion='full-unbalanced.3';
   await h.put(name,h.FULL_RECEIPT_STORE,key,receipt);const before=await h.FullSaveRepository.exportRaw(name);
   const summary=await h.attempt(()=>repo.loadAwaySummary()),replay=await h.attempt(()=>repo.advanceScheduledActivity(intent));
   return{before,after:await h.FullSaveRepository.exportRaw(name),summary,replay,done,current:await repo.loadActivitySnapshot()};
  }finally{Date.now=realNow;repo.close();}
 },damage);
 expect(r.summary.code).toBe('RECEIPT_INVALID');expect(r.replay.code).toBe('RECEIPT_INVALID');expect(r.after).toEqual(r.before);expect(r.current.state).toEqual(r.done.state);expect(r.current.activity).toEqual(r.done.activity);
});

for(const boundary of ['inventory','lifespan'])test(`an away batch stops at its saved ${boundary} boundary using actual current-profile resources`,async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async({boundary,root})=>{
  const h=(globalThis as any).h,model=await import(`/@fs${root}src/full/activity.ts`),d=h.routes.driver(),C=h.currentContent;
  if(boundary==='inventory')d.go('wilderness');
  else{
   d.go('sect');const cost=C.sources.work.months;
   for(let n=0;h.queries.getLifeOverview(d.game).remainingMonths>36;n++){
    if(n>20)throw new Error('lawful late-life preparation exceeded its finite bound');
    const count=Math.min(50,Math.floor((h.queries.getLifeOverview(d.game).remainingMonths-36)/cost));
    if(count<1)throw new Error('late-life preparation cannot reach its exact boundary');d.doAction({type:'SOURCE',sourceId:'work',count});
   }
  }
  const name='scheduled-boundary-'+boundary,repo=await h.FullSaveRepository.open(name),realNow=Date.now;let now=1700000000000;Date.now=()=>now;
  const m=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const snapshot=await repo.loadActivitySnapshot(),target=boundary==='inventory'?{kind:'item',id:'herb',quantity:snapshot.state.core.inventory.herb+2*C.sources.herbs.items.herb}:null;
   const plan={kind:'source',sourceId:boundary==='inventory'?'herbs':'work',maxCycles:5,until:target?'target':'cycles',target,monthBudget:600,remainingMonthsReserve:boundary==='inventory'?1:24};
   const started=await repo.startScheduledActivity(plan,m(snapshot,'boundary-start'));now+=8*60*60*1000;
   const intent=m(started,'boundary-return'),out=await repo.advanceScheduledActivity(intent);let game=started.state,a=started.activity;
   for(let n=0;n<(boundary==='inventory'?2:1);n++){const next=h.engine.resolve(game,a.nextCommand);game=next.nextState;a=model.completeActivity(game,a,next.result,{commandId:a.nextCommand.commandId,now:a.dueAt});}
   const beforeReplay=await h.FullSaveRepository.exportRaw(name),replay=await repo.advanceScheduledActivity(intent);
   return{snapshot,started,out,expected:game,expectedActivity:a,target,remaining:h.queries.getLifeOverview(out.state).remainingMonths,beforeReplay,afterReplay:await h.FullSaveRepository.exportRaw(name),replay,summary:await repo.loadAwaySummary()};
  }finally{Date.now=realNow;repo.close();}
 },{boundary,root:repositoryFsRoot});
 expect(r.out.state).toEqual(r.expected);expect(r.out.activity).toEqual(r.expectedActivity);expect(r.out.activity.status).toBe('stopped');expect(r.out.more).toBe(false);
 expect(r.out.activity.stopReason.code).toBe(boundary==='inventory'?'TARGET_MET':'ACTIVITY_RESERVE');expect(r.out.cycles).toBe(boundary==='inventory'?2:1);
 if(boundary==='inventory')expect(r.out.state.core.inventory.herb).toBe(r.target.quantity);else expect(r.remaining).toBe(24);
 expect(r.summary.cycles).toBe(r.out.cycles);expect(r.afterReplay).toEqual(r.beforeReplay);expect(r.replay.replayed).toBe(true);
});

for(const kind of ['restore','import','restart'])test(`a scheduled breakthrough checkpoint and ${kind} keep real ownership and archive the prior clock atomically`,async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async kind=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.realm();const name='scheduled-cp-'+kind,repo=await h.FullSaveRepository.open(name),realNow=Date.now,put=IDBObjectStore.prototype.put;
  let now=1700000000000;Date.now=()=>now;
  const m=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.checkpoints.qi),h.mutation());const original=await repo.loadActivitySnapshot();
   const started=await repo.startScheduledActivity({kind:'milestone',action:{type:'BREAKTHROUGH'},maxCycles:1},m(original,'cp-start'));now=started.activity.dueAt+1000;
   const intent=m(started,'cp-return'),before=await h.FullSaveRepository.exportRaw(name);
   IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name===h.FULL_SCHEDULE_STORE)throw new DOMException('cp final quota','QuotaExceededError');return put.call(this,value,key!);};
   let failed;try{failed=await h.attempt(()=>repo.advanceScheduledActivity(intent));}finally{IDBObjectStore.prototype.put=put;}
   const after=await h.FullSaveRepository.exportRaw(name),failedCP=await repo.loadCheckpoint(),done=await repo.advanceScheduledActivity(intent),cp=await repo.loadCheckpoint();
   const next=await repo.startScheduledActivity({kind:'cultivation',method:'natural',maxCycles:3,until:'cycles',stoneBudget:0,stoneReserve:0},m(done,'cp-next'));
   const mutation=h.mutation(next.state),out=kind==='restore'?await repo.restoreCheckpoint(mutation):kind==='import'?await repo.importText(JSON.stringify(original.state),mutation):await repo.create('重开修士',mutation);
   return{before,after,failed,failedCP,original,done,cp,next,out,snapshot:await repo.loadActivitySnapshot(),archives:await repo.archives(),raw:await h.FullSaveRepository.exportRaw(name)};
  }finally{IDBObjectStore.prototype.put=put;Date.now=realNow;repo.close();}
 },kind);
 expect(r.failed.code).toBe('STORAGE_QUOTA');expect(r.after).toEqual(r.before);expect(r.failedCP).toBeNull();expect(r.cp.snapshot).toEqual(r.original.state);
 expect(r.cp.sourceRunId).toBe(r.done.state.core.runId);expect(r.done.activity.completedCycles).toBe(1);expect(r.done.state.core.player.realm).toBe('foundation');
 expect(r.snapshot.state).toEqual(r.out.state);expect(r.snapshot.activity).toBeNull();expect(r.snapshot.schedule).toBeUndefined();expect(r.out.state.core.runId).not.toBe(r.next.state.core.runId);
 expect(r.raw.stores.find((x:any)=>x.name==='full-schedules').entries).toEqual([]);expect(r.archives.some((x:any)=>JSON.stringify(x.value)===JSON.stringify(r.next.schedule))).toBe(true);
 const archived=r.archives.find((x:any)=>x.value?.format==='chenyuan-away-summary-archive');expect(archived?.value.summary.cycles).toBe(1);
 expect(archived.value.summary.id).toBe('cp-return');expect(archived.value.receipts).toHaveLength(1);expect(archived.value.receipts[0].proof.stateBefore).toEqual(r.original.state);
});

for(const broken of [false,true])test(`DB9 ${broken?'failed migration rolls back its version and new store':'upgrade preserves every old byte and safely rejects an old writer'}`,async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async({root,broken})=>{
  const h=(globalThis as any).h,old=await import(`/@fs${root}src/legacy/rules-v3/web/src/full-persistence.ts`),d=h.legacyRuleRoutes.driver();d.go('sect');
  const name='scheduled-v9-'+broken,prior=await old.FullSaveRepository.open(name);
  try{
   await prior.importText(JSON.stringify(d.game),h.mutation());const s=await prior.loadActivitySnapshot();
   await prior.startActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},
    {commandId:'v9-start',runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:null,expectedActivityRevision:null,ownerId:'old'});
  }finally{prior.close();}
  if(broken){const db=await h.inspect(name),a=db[h.FULL_STATE_STORE].find((x:any)=>x.key==='activity').value;await h.put(name,h.FULL_STATE_STORE,'activity',{...a,runId:'not-the-current-life'});}
  const before=await h.FullSaveRepository.exportRaw(name),opened=await h.attempt(async()=>{const repo=await h.FullSaveRepository.open(name);try{return await repo.loadActivitySnapshot();}finally{repo.close();}});
  const after=await h.FullSaveRepository.exportRaw(name);
  const oldAttempt=broken?null:await h.attempt(async()=>{const repo=await old.FullSaveRepository.open(name);repo.close();return true;});
  return{before,after,opened,oldAttempt};
 },{root:repositoryFsRoot,broken});
 expect(r.before.database.version).toBe(9);
 if(broken){expect(r.opened.ok).toBe(false);expect(r.after).toEqual(r.before);}
 else{
  expect(r.opened.ok).toBe(true);expect(r.after.database.version).toBe(10);expect(r.after.stores.filter((x:any)=>x.name!=='full-schedules')).toEqual(r.before.stores);
  expect(r.after.stores.find((x:any)=>x.name==='full-schedules').entries).toEqual([]);expect(r.opened.value.schedule).toBeUndefined();expect(r.oldAttempt.code).toBe('DB_VERSION');
 }
});

for(const mode of ['configure','direct'])test(`${mode} after a scheduled pause archives the old clock in the same state-changing transaction`,async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async mode=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.realm();d.resource('herb',2);d.go('sect');const name='scheduled-invalidate-'+mode,repo=await h.FullSaveRepository.open(name);
  const mutation=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const s=await repo.loadActivitySnapshot();
   const started=await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},mutation(s,'invalidate-start'));
   const paused=await repo.pauseScheduledActivity(mutation(started,'invalidate-pause'));
   const command=h.command(paused.state,mode==='configure'?{type:'SCHOOL',school:'talisman'}:{type:'EVENT',event:'shen_return'}),intent={command,expectedActivityId:paused.activity.id,expectedActivityRevision:paused.activity.revision};
   const expected=h.engine.resolve(paused.state,command),out=await (mode==='configure'?repo.configure(intent):repo.executeDirect(intent)),snapshot=await h.attempt(()=>repo.loadActivitySnapshot());
   return{paused,out,snapshot,expected,raw:await h.FullSaveRepository.exportRaw(name),archives:await repo.archives()};
  }finally{repo.close();}
 },mode);
 expect(r.out.state).toEqual(r.expected.nextState);expect(r.snapshot.ok).toBe(true);expect(r.snapshot.value.state).toEqual(r.out.state);expect(r.snapshot.value.schedule).toBeUndefined();
 expect(r.snapshot.value.activity.stopReason.code).toBe('STATE_CHANGED');expect(r.raw.stores.find((x:any)=>x.name==='full-schedules').entries).toEqual([]);
 expect(r.archives.some((x:any)=>JSON.stringify(x.value)===JSON.stringify(r.paused.schedule))).toBe(true);
});

for(const mode of ['extra','orphan-empty','undefined','orphan-activity'])test(`a ${mode} schedule is preserved and rejected instead of silently opening an empty or partial life`,async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async mode=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const name='scheduled-orphan-'+mode,repo=await h.FullSaveRepository.open(name);
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const s=await repo.loadActivitySnapshot();
   const started=await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},
    {commandId:'orphan-start',runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:null,expectedActivityRevision:null,ownerId:'one'});
   if(mode==='extra')await h.put(name,h.FULL_SCHEDULE_STORE,'unowned',started.schedule);
   if(mode==='undefined')await h.put(name,h.FULL_SCHEDULE_STORE,'current',undefined);
   if(mode==='orphan-activity')await h.put(name,h.FULL_STATE_STORE,'activity',null,true);
   if(mode==='orphan-empty'){
    const raw=await h.FullSaveRepository.exportRaw(name);for(const entry of raw.stores.find((x:any)=>x.name===h.FULL_STATE_STORE).entries)await h.put(name,h.FULL_STATE_STORE,entry.key,null,true);
   }
   const before=await h.FullSaveRepository.exportRaw(name),loaded=await h.attempt(()=>repo.loadActivitySnapshot());repo.close();
   const opened=await h.attempt(async()=>{const other=await h.FullSaveRepository.open(name);other.close();return true;});
   return{before,after:await h.FullSaveRepository.exportRaw(name),loaded,opened};
  }finally{repo.close();}
 },mode);
 expect(r.loaded.ok).toBe(false);expect(r.opened.ok).toBe(false);expect(r.after).toEqual(r.before);
});

test('an old online arrangement adopts forward only after explicit continue and retains its paid counters',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open('scheduled-adopt'),realNow=Date.now;
  let now=1700000000000;Date.now=()=>now;
  const mutation=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());
   const started=await repo.startActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},mutation(await repo.loadActivitySnapshot(),'online-start'));
   now=started.activity.dueAt;const a=started.activity;
   const paid=await repo.settleActivity({commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation});
   now+=86400000;const prior=await repo.loadActivitySnapshot(),blocked=await h.attempt(()=>repo.advanceScheduledActivity(mutation(prior,'unconfirmed-adopt')));
   const adopted=await repo.adoptScheduledActivity(mutation(prior,'explicit-adopt')),early=await repo.advanceScheduledActivity(mutation(adopted,'adopt-early'));
   now=adopted.activity.dueAt;const next=await repo.advanceScheduledActivity(mutation(early,'adopt-due'));
   return{paid,prior,blocked,adopted,early,next};
  }finally{Date.now=realNow;repo.close();}
 });
 expect(r.prior.schedule).toBeUndefined();expect(r.prior.state).toEqual(r.paid.state);expect(r.blocked.code).toBe('SCHEDULE_REQUIRED');
 expect(r.adopted.state).toEqual(r.paid.state);expect(r.adopted.activity.id).toBe(r.paid.activity.id);expect(r.adopted.activity.plan).toEqual(r.paid.activity.plan);
 expect(r.adopted.activity.completedCycles).toBe(1);expect(r.adopted.activity.spentMonths).toBe(12);expect(r.adopted.activity.dueAt-r.adopted.schedule.lastObservedAt).toBe(30000);
 expect(r.early.cycles).toBe(0);expect(r.next.cycles).toBe(1);expect(r.next.activity.completedCycles).toBe(2);expect(r.next.activity.spentMonths).toBe(24);
});

test('a fixed eight-hour window survives real page takeover and database reopen across all bounded chunks',async({page,context})=>{
 await setupPersistence(page);
 const initial=await page.evaluate(async()=>{
  const h=(globalThis as any).h,engine=h.legacyRuleEngine;let game=engine.newGame('旧约离开','native-cap-life');
  for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'},{type:'TRAVEL',location:'sect'}])game=engine.advance(game,{...action,commandId:'p-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
  const repo=await h.FullSaveRepository.open('scheduled-cap'),realNow=Date.now;let now=1700000000000;Date.now=()=>now;
  try{
   await repo.importText(JSON.stringify(game),h.mutation());const snapshot=await repo.loadActivitySnapshot();
   const m=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'old-page'});
   const started=await repo.startScheduledActivity({kind:'source',sourceId:'work',repeat:true,maxCycles:1000000000,until:'cycles',target:null,monthBudget:1200,remainingMonthsReserve:1},m(snapshot,'cap-start'));
   now+=86400000;const first=await repo.advanceScheduledActivity(m(started,'cap-first'));
   return{started,first,now};
  }finally{Date.now=realNow;repo.close();}
 });
 const other=await context.newPage();await setupPersistence(other);
 const rest=await other.evaluate(async initial=>{
  const h=(globalThis as any).h,realNow=Date.now;Date.now=()=>initial.now;let repo=await h.FullSaveRepository.open('scheduled-cap');
  const mutation=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'new-page'});
  try{
   let current=await repo.loadActivitySnapshot();const chunks:any[]=[],windows:any[]=[];
   for(let i=0;i<18;i++){
    const out=await repo.advanceScheduledActivity(mutation(current,'cap-chunk-'+i));chunks.push(out.cycles);if(out.schedule.window)windows.push(out.schedule.window);current=out;
    if(!out.more)break;
    repo.close();repo=await h.FullSaveRepository.open('scheduled-cap');current=await repo.loadActivitySnapshot();
   }
   const again=await repo.advanceScheduledActivity(mutation(current,'cap-refresh'));
   return{current,chunks,windows,again,history:await repo.loadActivityHistory(current.activity.id,0,20),summary:await repo.loadAwaySummary()};
  }finally{Date.now=realNow;repo.close();}
 },initial);
 const stale=await page.evaluate(async first=>{
  const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('scheduled-cap');
  try{return await h.attempt(()=>repo.advanceScheduledActivity({commandId:'cap-stale',runId:first.state.core.runId,expectedRevision:first.state.core.revision,expectedActivityId:first.activity.id,expectedActivityRevision:first.activity.revision,ownerId:'old-page'}));}finally{repo.close();}
 },initial.first);
 await other.close();
 expect(initial.first.cycles).toBe(64);expect(initial.first.more).toBe(true);expect(rest.chunks.every((n:number)=>n<=64)).toBe(true);
 expect(rest.chunks.reduce((a:number,b:number)=>a+b,initial.first.cycles)).toBe(960);expect(rest.current.activity.completedCycles).toBe(960);
 expect(rest.current.activity.spentMonths).toBe(960);expect(rest.current.state.core.player.stones-initial.started.state.core.player.stones).toBe(19200);
 expect(rest.windows.every((w:any)=>JSON.stringify(w)===JSON.stringify(initial.first.schedule.window))).toBe(true);
 expect(rest.current.activity.dueAt).toBe(initial.now+30000);expect(rest.again.cycles).toBe(0);expect(rest.again.state).toEqual(rest.current.state);expect(rest.history.total).toBe(960);expect(stale.code).toBe('STALE_REVISION');
 expect(rest.summary.cycles).toBe(960);expect(rest.summary.delta.stones).toBe(19200);expect(rest.summary.costs.months).toBe(960);expect(rest.summary.discardedMs).toBe(16*60*60*1000);
});

test('scheduled pause cancels the unfinished period and old online callbacks cannot detach its saved clock',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const repo=await h.FullSaveRepository.open('scheduled-controls'),realNow=Date.now;
  let now=1700000000000;Date.now=()=>now;
  const mutation=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());
   const started=await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:6,until:'cycles',target:null,monthBudget:72,remainingMonthsReserve:1},mutation(await repo.loadActivitySnapshot(),'controls-start'));
   now+=135000;const paid=await repo.advanceScheduledActivity(mutation(started,'controls-paid')),a=paid.activity;
   const oldTick={commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation};
   const before=await h.FullSaveRepository.exportRaw('scheduled-controls');now+=10000;
   const online=await h.attempt(()=>repo.pauseActivity(mutation(paid,'old-online-pause'))),after=await h.FullSaveRepository.exportRaw('scheduled-controls');
   const paused=await repo.pauseScheduledActivity(mutation(paid,'controls-pause'));now+=3600000;
   const blocked=await h.attempt(()=>repo.advanceScheduledActivity(mutation(paused,'controls-blocked')));
   const resumed=await repo.resumeScheduledActivity(mutation(paused,'controls-resume'));
   const stale=await h.attempt(()=>repo.settleActivity(oldTick));now=resumed.activity.dueAt-1;
   const early=await repo.advanceScheduledActivity(mutation(resumed,'controls-early'));now++;
   const due=await repo.advanceScheduledActivity(mutation(early,'controls-due'));
   return{before,after,online,paid,paused,blocked,resumed,stale,early,due};
  }finally{Date.now=realNow;repo.close();}
 });
 expect(r.online.code).toBe('SCHEDULE_MODE');expect(r.after).toEqual(r.before);expect(r.paused.state).toEqual(r.paid.state);
 expect(r.paused.activity.status).toBe('paused');expect(r.paused.activity.completedCycles).toBe(4);expect(r.paused.activity.spentMonths).toBe(48);
 expect(r.blocked.code).toBe('ACTIVITY_NOT_RUNNING');expect(r.stale.ok).toBe(false);expect(r.resumed.activity.dueAt-r.resumed.schedule.lastObservedAt).toBe(30000);
 expect(r.early.cycles).toBe(0);expect(r.early.state).toEqual(r.paid.state);expect(r.due.cycles).toBe(1);expect(r.due.activity.completedCycles).toBe(5);expect(r.due.activity.spentMonths).toBe(60);
});

for(const mode of ['quota','abort'])test(`scheduled batch ${mode} rolls every store back and the exact original batch can retry once`,async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async mode=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');const name='scheduled-fault-'+mode;
  const repo=await h.FullSaveRepository.open(name),realNow=Date.now,put=IDBObjectStore.prototype.put;let now=1700000000000;Date.now=()=>now;
  const mutation=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const original=await repo.loadActivitySnapshot();
   const started=await repo.startScheduledActivity({kind:'source',sourceId:'work',maxCycles:5,until:'cycles',target:null,monthBudget:60,remainingMonthsReserve:1},mutation(original,'fault-start'));
   now+=135000;const intent=mutation(started,'fault-return'),before=await h.FullSaveRepository.exportRaw(name);
   IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
    if(mode==='quota'&&this.name===h.FULL_SCHEDULE_STORE)throw new DOMException('late clock quota','QuotaExceededError');
    const request=put.call(this,value,key!);
    if(mode==='abort'&&this.name===h.FULL_SCHEDULE_STORE)request.addEventListener('success',()=>this.transaction.abort());
    return request;
   };
   let failed;try{failed=await h.attempt(()=>repo.advanceScheduledActivity(intent));}finally{IDBObjectStore.prototype.put=put;}
   const after=await h.FullSaveRepository.exportRaw(name),retried=await repo.advanceScheduledActivity(intent),replay=await repo.advanceScheduledActivity(intent);
   return{before,after,failed,retried,replay};
  }finally{IDBObjectStore.prototype.put=put;Date.now=realNow;repo.close();}
 },mode);
 expect(r.failed.code).toBe(mode==='quota'?'STORAGE_QUOTA':'STORAGE_ABORTED');expect(r.after).toEqual(r.before);
 expect(r.retried.cycles).toBe(4);expect(r.retried.activity.completedCycles).toBe(4);expect(r.retried.activity.spentMonths).toBe(48);
 expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.retried.state);expect(r.replay.activity).toEqual(r.retried.activity);
});

test('lost scheduled start and batch replies replay the original intent against the latest snapshot without more rewards',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async()=>{
  const h=(globalThis as any).h,d=h.routes.driver();d.go('sect');
  const repo=await h.FullSaveRepository.open('scheduled-replay'),realNow=Date.now;let now=1700000000000;Date.now=()=>now;
  const mutation=(s:any,id:string)=>({commandId:id,runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'one'});
  try{
   await repo.importText(JSON.stringify(d.game),h.mutation());const original=await repo.loadActivitySnapshot();
   const plan={kind:'source',sourceId:'work',maxCycles:10,until:'cycles',target:null,monthBudget:120,remainingMonthsReserve:1},startIntent=mutation(original,'reply-start');
   const started=await repo.startScheduledActivity(plan,startIntent),startReplay=await h.attempt(()=>repo.startScheduledActivity(plan,startIntent));
   now+=135000;const firstIntent=mutation(started,'reply-first'),first=await repo.advanceScheduledActivity(firstIntent);
   now+=30000;const second=await repo.advanceScheduledActivity(mutation(first,'reply-second'));
   const before=await h.FullSaveRepository.exportRaw('scheduled-replay'),replay=await h.attempt(()=>repo.advanceScheduledActivity(firstIntent));
   const changed=await h.attempt(()=>repo.advanceScheduledActivity({...firstIntent,ownerId:'another'}));
   const crossed=await h.attempt(()=>repo.startActivity(plan,firstIntent));
   const after=await h.FullSaveRepository.exportRaw('scheduled-replay'),history=await repo.loadActivityHistory(started.activity.id,0,20);
   return{started,startReplay,first,second,before,replay,changed,crossed,after,history};
  }finally{Date.now=realNow;repo.close();}
 });
 expect(r.startReplay.ok).toBe(true);expect(r.startReplay.value.replayed).toBe(true);expect(r.startReplay.value.activity).toEqual(r.started.activity);
 expect(r.first.cycles).toBe(4);expect(r.second.cycles).toBe(1);expect(r.replay.ok).toBe(true);expect(r.replay.value.replayed).toBe(true);
 expect(r.replay.value.state).toEqual(r.second.state);expect(r.replay.value.activity).toEqual(r.second.activity);expect(r.after).toEqual(r.before);
 expect(r.changed.code).toBe('COMMAND_ID_REUSED');expect(r.crossed.code).toBe('COMMAND_ID_REUSED');expect(r.history.total).toBe(5);
 expect(r.history.rows.every((x:any)=>x.result.revisionAfter===x.command.expectedRevision+1)).toBe(true);
 const cycles=r.before.stores.find((x:any)=>x.name==='full-receipts').entries.filter((x:any)=>x.value.format==='chenyuan-activity-receipt');
 expect(cycles).toHaveLength(5);expect(cycles.every((x:any)=>x.value.version===3&&x.value.proof.logicalAt===x.value.proof.activityBefore.dueAt&&x.value.proof.resolvedAt>=x.value.proof.logicalAt)).toBe(true);
});
