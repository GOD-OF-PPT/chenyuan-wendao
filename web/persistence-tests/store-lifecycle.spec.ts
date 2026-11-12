import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {setupPersistence} from './support';

type ReadStage='open'|'snapshot'|'checkpoint'|'previous';
type Delivery='success'|'failure';
import {repositoryFsRoot as root} from './fs-root';
test.use({viewport:{width:1440,height:900}});

// Real Store/native IndexedDB seam. Gates hold only delivery after the original
// operation completes. Rule deadlines below prepare fixtures, not online pacing.
test.beforeEach(async({page})=>{
 await setupPersistence(page);
 await page.evaluate(async root=>{
  const h=(globalThis as any).h,modulePath='/persistence-tests/activity-store-harness.ts';
  const {createActivityStoreHarness}=await import(modulePath);
  const {RuleError}=await import('/@fs'+root+'src/full/errors.ts');h.RuleError=RuleError;
  const source=await(await fetch('/src/store.ts')).text();
  const vueUrl=source.match(/from\s*["']([^"']*\/vue\.js(?:\?[^"']*)?)["']/)?.[1];
  if(!vueUrl)throw new Error('Cannot identify the Store Vue module');
  const {watch}=await import(vueUrl),f=createActivityStoreHarness();
  const observations:any[]=[],timeline:any[]=[],repositories:any[]=[],channels:any[]=[],reads:any[]=[],jobs:Promise<any>[]=[],gates:any[]=[],restores:Array<()=>void>=[];
  let phase='setup',disposed=false,openCalls=0;
  const originalChannel=globalThis.BroadcastChannel;
  // Proxy real native channels; neither construction nor close is replaced by a mock.
  (globalThis as any).BroadcastChannel=new Proxy(originalChannel,{construct(target,args){
   const channel=Reflect.construct(target,args),nativeClose=channel.close.bind(channel);
   const row={channel,name:args[0],createdPhase:phase,closes:0,closed:false};channels.push(row);
   channel.close=()=>{row.closes++;row.closed=true;return nativeClose();};return channel;
  }});
  restores.push(()=>(globalThis as any).BroadcastChannel=originalChannel);
  const open=h.FullSaveRepository.open;
  function watchRepository(repo:any){
   const existing=repositories.find(row=>row.repo===repo);if(existing)return existing;
   const close=repo.close.bind(repo),row={repo,id:repositories.length,closes:0};repositories.push(row);
   repo.close=()=>{row.closes++;return close();};return row;
  }
  h.FullSaveRepository.open=async function(...args:any[]){openCalls++;const repo=await Reflect.apply(open,this,args);watchRepository(repo);return repo;};
  restores.push(()=>h.FullSaveRepository.open=open);
  const methods={snapshot:'loadActivitySnapshot',checkpoint:'loadCheckpoint',previous:'loadPrevious'} as const;
  for(const [stage,method]of Object.entries(methods)){
   const prototype=h.FullSaveRepository.prototype,original=prototype[method];
   prototype[method]=function(...args:any[]){
    const row={stage,repository:watchRepository(this).id,phase,completed:false,failed:false};reads.push(row);
    let native;try{native=Reflect.apply(original,this,args);}catch(error){row.failed=true;throw error;}
    const job=Promise.resolve(native).then(value=>{row.completed=true;return value;},error=>{row.failed=true;throw error;});
    jobs.push(job.then(()=>undefined,()=>undefined));return job;
   };
   restores.push(()=>prototype[method]=original);
  }
  const publicState=()=>structuredClone({...f.state(),ready:f.store.ready,available:f.store.available,syncIssue:f.store.syncIssue,saveLabel:f.store.saveLabel,
   warning:f.store.warning,hasCheckpoint:f.store.hasCheckpoint,checkpointSummary:f.store.checkpointSummary,trialRecovery:f.store.trialRecovery,syncEpoch:f.store.syncEpoch});
  const stopObservation=f.store.observe((value:any)=>observations.push(structuredClone(value)));
  const stopTimeline=watch(()=>[f.store.ready,f.store.available,f.store.saved,f.store.busy,f.store.error,f.store.warning],
   value=>timeline.push({phase,value:[...value],at:performance.now()}),{flush:'sync'});
  const deferred=()=>{let resolve!:(value?:any)=>void;const promise=new Promise<any>(done=>resolve=done);return{promise,resolve};};
  function launch(operation:()=>Promise<any>){const job=h.attempt(operation);jobs.push(job);return job;}
  async function seed(){
   const repo=await h.FullSaveRepository.open();
   try{
    await repo.create('生命周期测试',h.mutation());
    await h.finishAction(repo,{type:'CHOOSE',choice:'leave'});await h.finishAction(repo,{type:'TRAVEL',location:'cave'});
    const start=await repo.loadActivitySnapshot();
    let out=await repo.startActivity({kind:'cultivation',method:'natural',maxCycles:2,until:'xp-cap',stoneBudget:0,stoneReserve:0},
     {commandId:crypto.randomUUID(),runId:start.state.core.runId,expectedRevision:start.state.core.revision,
      expectedActivityId:start.activity.id,expectedActivityRevision:start.activity.revision,ownerId:'lifecycle-fixture'});
    const realNow=Date.now;
    try{for(let i=0;i<2;i++){
     const a=out.activity;Date.now=()=>a.dueAt;
     out=await repo.settleActivity({commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,
      activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation});
    }}finally{Date.now=realNow;}
    await h.finishAction(repo,{type:'BREAKTHROUGH'});
    const snapshot=await repo.loadActivitySnapshot();
    await repo.configure({command:h.command(snapshot.state,{type:'SCHOOL',school:'sword'}),expectedActivityId:snapshot.activity.id,expectedActivityRevision:snapshot.activity.revision});
    const seeded=await repo.loadActivitySnapshot(),checkpoint=await repo.loadCheckpoint(),previous=await repo.loadPrevious();
    if(!checkpoint||!previous||seeded.state.school!=='sword')throw new Error('The formal lifecycle fixture lacks its real checkpoint/previous/configuration');
    return{snapshot:seeded,checkpoint,previous,raw:await h.inspect(h.FULL_DB_NAME)};
   }finally{repo.close();}
  }
  function gate(stage:ReadStage,delivery:Delivery,code:string|null='STORAGE_ABORTED'){
   const target=stage==='open'?h.FullSaveRepository:h.FullSaveRepository.prototype,method=stage==='open'?'open':methods[stage];
   const original=target[method],entered=deferred(),release=deferred(),finished=deferred();
   let candidate:any;
   const restore=()=>{if(target[method]===intercept)target[method]=original;};
   const intercept=async function(this:any,...args:any[]){
    restore();const value=await Reflect.apply(original,this,args);candidate=stage==='open'?value:this;
    entered.resolve({stage,repository:watchRepository(candidate).id,value:stage==='open'?null:structuredClone(value)});
    try{
     await release.promise;
     if(delivery==='failure'){
      // A rejected open cannot hand its candidate to the Store. The injected
      // failing operation owns that candidate, like open's migration-error path.
      if(stage==='open')candidate.close();
      const message='controlled '+stage+' delivery failure after native completion';
      if(code===null)throw new Error(message);
      throw new h.RuleError(code,message);
     }
     return value;
    }finally{finished.resolve();}
   };
   target[method]=intercept;
   const result={stage,delivery,code,entered:entered.promise,release:()=>release.resolve(),finished:finished.promise,restore,get candidate(){return candidate;}};
   gates.push(result);restores.push(restore);return result;
  }
  async function externalConfiguration(){
   const repo=await h.FullSaveRepository.open();
   try{
    const snapshot=await repo.loadActivitySnapshot(),intent={command:h.command(snapshot.state,{type:'SCHOOL',school:snapshot.state.school==='sword'?'talisman':'sword'}),
     expectedActivityId:snapshot.activity.id,expectedActivityRevision:snapshot.activity.revision};
    const outcome=await repo.configure(intent);return{intent,outcome,raw:await h.inspect(h.FULL_DB_NAME)};
   }finally{repo.close();}
  }
  function dispose(){if(disposed)return;disposed=true;phase='disposed';f.dispose();}
  function resetEvidence(){observations.length=0;timeline.length=0;phase=disposed?'disposed':'active';}
  function channelState(){return channels.map(row=>({name:row.name,createdPhase:row.createdPhase,closes:row.closes,closed:row.closed}));}
  function repoState(){return repositories.map(row=>({id:row.id,closes:row.closes,closed:row.repo.closed}));}
  async function settleReads(){
   // Event-driven drain of native query deliveries; no sleep or Game clock.
   let consumed=0;for(let pass=0;pass<20;pass++){
    const current=jobs.slice(consumed);consumed=jobs.length;if(current.length)await Promise.allSettled(current);
    await Promise.resolve();if(consumed===jobs.length)return;
   }
   throw new Error('Lifecycle test query drain did not reach an idle boundary');
  }
  function postSync(){const sender=new originalChannel('chenyuan-full-progress');sender.postMessage({source:'lifecycle-native-sync'});sender.close();}
  (globalThis as any).lifecycle={...h,f,seed,gate,launch,externalConfiguration,dispose,resetEvidence,state:publicState,observations,timeline,reads,channels,postSync,
   channelState,repoState,get openCalls(){return openCalls;},phase(value:string){phase=value;},settleReads,
   async inspect(){return h.inspect(h.FULL_DB_NAME);},
   async cleanup(){for(const g of gates){g.restore();g.release();}await settleReads();dispose();stopObservation();stopTimeline();for(const row of channels)row.channel.close();for(const row of repositories)row.repo.close();for(const restore of restores.reverse())restore();}};
 },root);
});
test.afterEach(async({page})=>{await page.evaluate(async()=>(globalThis as any).lifecycle?.cleanup());});

async function seed(page:Page){return page.evaluate(()=>(globalThis as any).lifecycle.seed());}
async function startStore(page:Page){return page.evaluate(async()=>{const h=(globalThis as any).lifecycle;await h.f.store.init();h.resetEvidence();return h.state();});}
async function observe(page:Page){return page.evaluate(async()=>{const h=(globalThis as any).lifecycle;return{state:h.state(),raw:await h.inspect(),observations:structuredClone(h.observations),timeline:structuredClone(h.timeline),channels:h.channelState(),repositories:h.repoState(),openCalls:h.openCalls};});}
async function attach(info:TestInfo,name:string,data:any){await info.attach(name,{body:JSON.stringify({seam:'Real Store/native IndexedDB; each gate starts only after the original operation completes. Failure injection changes delivery only, never Game or receipts.',...data}),contentType:'application/json'});}

for(const stage of ['open','snapshot','checkpoint','previous'] as const)for(const delivery of ['success','failure'] as const){
 test(`init ${stage}: disposal fences a late ${delivery} after the native operation completes`,async({page},info)=>{
  const initial=await seed(page);
  const entered=await page.evaluate(async({stage,delivery})=>{const h=(globalThis as any).lifecycle;h.g=h.gate(stage,delivery);h.starting=h.launch(()=>h.f.store.init());return h.g.entered;},{stage,delivery});
  const atDisposal=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.dispose();return{state:h.state(),raw:await h.inspect(),observations:structuredClone(h.observations),timelineLength:h.timeline.length,channels:h.channelState()};});
  const result=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;return h.starting;});
  const after=await observe(page);
  await attach(info,'init-disposal-'+stage+'-'+delivery,{entered,initial,atDisposal,result,after});
  expect(result.ok).toBe(true);expect(after.raw).toEqual(initial.raw);expect(after.raw).toEqual(atDisposal.raw);
  expect(after.state).toEqual(atDisposal.state);expect(after.observations).toEqual(atDisposal.observations);
  expect(after.timeline.length).toBe(atDisposal.timelineLength);expect(after.channels).toEqual(atDisposal.channels);
  expect(after.channels.every((row:any)=>row.closed)).toBe(true);
  expect(after.repositories.every((row:any)=>row.closed)).toBe(true);
 });
}

test('init on a disposed Store opens no new repository and cannot publish another ready or saved state',async({page},info)=>{
 const initial=await seed(page);await startStore(page);
 const before=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.dispose();return{state:h.state(),raw:await h.inspect(),channels:h.channelState(),repositories:h.repoState(),openCalls:h.openCalls,timelineLength:h.timeline.length};});
 await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;await h.f.store.init();});
 const after=await observe(page);await attach(info,'disposed-init',{initial,before,after});
 expect(after.openCalls).toBe(before.openCalls);expect(after.raw).toEqual(initial.raw);expect(after.raw).toEqual(before.raw);
 expect(after.state).toEqual(before.state);expect(after.channels).toEqual(before.channels);expect(after.repositories).toEqual(before.repositories);
 expect(after.timeline.length).toBe(before.timelineLength);expect(after.observations).toEqual([]);
});

for(const delivery of ['success','failure'] as const)test(`an old refresh ${delivery} cannot overwrite a new connection that read the formal external configuration`,async({page},info)=>{
 await seed(page);const original=await startStore(page);
 const entered=await page.evaluate(async delivery=>{const h=(globalThis as any).lifecycle;h.g=h.gate('snapshot',delivery);h.oldRefresh=h.launch(()=>h.f.store.refresh('sync'));return h.g.entered;},delivery);
 const external=await page.evaluate(()=>(globalThis as any).lifecycle.externalConfiguration());
 const connected=await startStore(page);expect(connected.game).toEqual(external.outcome.state);expect(connected.game.core.revision).toBe(original.game.core.revision+1);
 const before=await observe(page);
 const late=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;return h.oldRefresh;});
 const after=await observe(page);await attach(info,'old-refresh-new-connection-'+delivery,{entered,original,external,connected,before,late,after});
 expect(late.ok).toBe(true);expect(after.state).toEqual(before.state);expect(after.raw).toEqual(external.raw);expect(after.raw).toEqual(before.raw);
 expect(after.observations).toEqual(before.observations);expect(after.timeline).toEqual(before.timeline);expect(after.channels).toEqual(before.channels);
 expect(after.channels.filter((row:any)=>!row.closed)).toHaveLength(1);expect(after.state.saved).toBe(true);expect(after.state.error).toBe('');
});

for(const delivery of ['success','failure'] as const)test(`same-connection refreshes reject an older ${delivery} delivered after the newer formal snapshot`,async({page},info)=>{
 await seed(page);const original=await startStore(page);
 const entered=await page.evaluate(async delivery=>{const h=(globalThis as any).lifecycle;h.g=h.gate('snapshot',delivery);h.oldRefresh=h.launch(()=>h.f.store.refresh('sync'));return h.g.entered;},delivery);
 const external=await page.evaluate(()=>(globalThis as any).lifecycle.externalConfiguration());
 await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;await h.f.store.refresh('sync');});
 const before=await observe(page);expect(before.state.game).toEqual(external.outcome.state);expect(before.state.game.core.revision).toBe(original.game.core.revision+1);
 const late=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;return h.oldRefresh;});
 const after=await observe(page);await attach(info,'same-connection-read-order-'+delivery,{entered,original,external,before,late,after});
 expect(late.ok).toBe(true);expect(after.state).toEqual(before.state);expect(after.raw).toEqual(external.raw);expect(after.raw).toEqual(before.raw);
 expect(after.observations).toEqual(before.observations);expect(after.timeline).toEqual(before.timeline);expect(after.channels).toEqual(before.channels);
});

for(const delivery of ['success','failure'] as const)test(`a stale refresh ${delivery} cannot replace a later locally confirmed configuration or its saved receipt`,async({page},info)=>{
 await seed(page);const original=await startStore(page);
 const entered=await page.evaluate(async delivery=>{const h=(globalThis as any).lifecycle;h.g=h.gate('snapshot',delivery);h.oldRefresh=h.launch(()=>h.f.store.refresh('sync'));return h.g.entered;},delivery);
 const confirmed=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle,intent=h.f.store.prepareConfiguration({type:'SCHOOL',school:'talisman'});if(!intent)throw new Error('Cannot prepare the formal configuration');await h.f.store.applyConfiguration(intent);return{intent,state:h.state(),raw:await h.inspect()};});
 expect(confirmed.state.game.school).toBe('talisman');expect(confirmed.state.game.core.revision).toBe(original.game.core.revision+1);expect(confirmed.state.saved).toBe(true);
 const before=await observe(page);
 const late=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;return h.oldRefresh;});
 const after=await observe(page);await attach(info,'old-read-after-configuration-'+delivery,{entered,original,confirmed,before,late,after});
 expect(late.ok).toBe(true);expect(after.state).toEqual(before.state);expect(after.raw).toEqual(confirmed.raw);expect(after.raw).toEqual(before.raw);
 expect(after.observations).toEqual(before.observations);expect(after.timeline).toEqual(before.timeline);expect(after.state.lastResult.commandId).toBe(confirmed.intent.command.commandId);
});

for(const boundary of ['reconnect','dispose'] as const)test(`an already captured old native broadcast callback is inert after ${boundary}`,async({page},info)=>{
 const initial=await seed(page);await startStore(page);
 await page.evaluate(async boundary=>{
  const h=(globalThis as any).lifecycle,row=h.channels.find((row:any)=>!row.closed);h.oldChannel=row.channel;h.oldHandler=row.channel.onmessage;
  if(typeof h.oldHandler!=='function')throw new Error('The actual Store native channel callback was not captured');
  if(boundary==='reconnect')await h.f.store.init();else h.dispose();h.resetEvidence();
 },boundary);
 const before=await observe(page),readCount=await page.evaluate(()=>(globalThis as any).lifecycle.reads.length);
 // Explicit captured-callback seam: no claim that native close itself delivers
 // stale events. It verifies the handler's ownership if a callback is in flight.
 await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.oldHandler.call(h.oldChannel,new MessageEvent('message',{data:{source:'captured-old-channel'}}));await h.settleReads();});
 const after=await observe(page),afterReadCount=await page.evaluate(()=>(globalThis as any).lifecycle.reads.length);
 await attach(info,'old-channel-'+boundary,{initial,before,readCount,after,afterReadCount});
 expect(afterReadCount).toBe(readCount);expect(after.state).toEqual(before.state);expect(after.raw).toEqual(initial.raw);expect(after.raw).toEqual(before.raw);
 expect(after.observations).toEqual(before.observations);expect(after.timeline).toEqual(before.timeline);expect(after.channels).toEqual(before.channels);
 expect(after.channels.filter((row:any)=>!row.closed)).toHaveLength(boundary==='reconnect'?1:0);
});

for(const stage of ['snapshot','checkpoint','previous'] as const)test(`init ${stage}: a real connection closed after native read completion cannot become available or saved`,async({page},info)=>{
 const initial=await seed(page);
 const entered=await page.evaluate(async stage=>{
  const h=(globalThis as any).lifecycle;h.g=h.gate(stage,'success');h.starting=h.launch(()=>h.f.store.init());return h.g.entered;
 },stage);
 const closed=await page.evaluate(async()=>{
  const h=(globalThis as any).lifecycle;h.g.candidate.close();
  return{state:h.state(),raw:await h.inspect(),repositories:h.repoState(),channels:h.channelState()};
 });
 const result=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;return h.starting;});
 const after=await observe(page);await attach(info,'closed-init-'+stage,{initial,entered,closed,result,after});
 expect(result.ok).toBe(true);expect(after.raw).toEqual(initial.raw);expect(after.raw).toEqual(closed.raw);
 expect(after.state.available).toBe(false);expect(after.state.saved).toBe(false);expect(after.state.busy).toBe(false);expect(after.state.ready).toBe(true);
 expect(after.state.error).toContain('关闭');expect(after.state.saveLabel).not.toBe('已保存');
 expect(after.channels.filter((row:any)=>!row.closed)).toHaveLength(0);expect(after.repositories.every((row:any)=>row.closed)).toBe(true);
 expect(after.observations.some((row:any)=>row.kind==='resume')).toBe(false);
 expect(after.observations.some((row:any)=>row.kind==='save_error'&&row.errorCode==='STORAGE_CLOSED')).toBe(true);
});

for(const stage of ['checkpoint','previous'] as const)test(`native broadcast refresh ${stage}: closing the actual read connection requires synchronization recovery`,async({page},info)=>{
 const initial=await seed(page),started=await startStore(page);
 const entered=await page.evaluate(async stage=>{
  const h=(globalThis as any).lifecycle;h.g=h.gate(stage,'success');h.postSync();return h.g.entered;
 },stage);
 const closed=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.candidate.close();return{state:h.state(),raw:await h.inspect(),repositories:h.repoState()};});
 await page.evaluate(async()=>{
  const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;await h.settleReads();
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 });
 const after=await observe(page);await attach(info,'closed-native-sync-'+stage,{initial,started,entered,closed,after});
 expect(after.raw).toEqual(initial.raw);expect(after.raw).toEqual(closed.raw);expect(after.state.game).toEqual(initial.snapshot.state);expect(after.state.activity).toEqual(initial.snapshot.activity);
 expect(after.state.available).toBe(false);expect(after.state.saved).toBe(false);expect(after.state.syncIssue).toBe(true);expect(after.state.canRetry).toBe(false);
 expect(after.state.error).toContain('关闭');expect(after.state.error).toContain('无法同步存档');expect(after.state.saveLabel).toBe('同步待核对');expect(after.state.runtime).toBeNull();
 expect(after.observations.some((row:any)=>row.kind==='save_error'&&row.errorCode==='STORAGE_CLOSED')).toBe(true);
 const reconnected=await startStore(page),afterReconnect=await observe(page);
 expect(reconnected.game).toEqual(initial.snapshot.state);expect(reconnected.activity).toEqual(initial.snapshot.activity);
 expect(reconnected.saved).toBe(true);expect(reconnected.available).toBe(true);expect(reconnected.error).toBe('');expect(reconnected.syncIssue).toBe(false);
 expect(afterReconnect.raw).toEqual(after.raw);
});

for(const stage of ['checkpoint','previous'] as const)test(`optional ${stage} delivery failure remains a warning when its native connection is still usable`,async({page},info)=>{
 const initial=await seed(page);
 const entered=await page.evaluate(async stage=>{
  const h=(globalThis as any).lifecycle;h.g=h.gate(stage,'failure',null);h.starting=h.launch(()=>h.f.store.init());return h.g.entered;
 },stage);
 const result=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;return h.starting;});
 const after=await observe(page);await attach(info,'optional-metadata-warning-'+stage,{initial,entered,result,after});
 expect(result.ok).toBe(true);expect(after.raw).toEqual(initial.raw);expect(after.state.game).toEqual(initial.snapshot.state);expect(after.state.activity).toEqual(initial.snapshot.activity);
 expect(after.state.available).toBe(true);expect(after.state.saved).toBe(true);expect(after.state.ready).toBe(true);expect(after.state.busy).toBe(false);
 expect(after.state.error).toBe('');expect(after.state.syncIssue).toBe(false);expect(after.state.saveLabel).toBe('已保存');
 expect(after.state.warning).toContain('controlled '+stage+' delivery failure after native completion');
 expect(after.state.warning).toContain(stage==='checkpoint'?'检查点无法读取':'上一行动无法核对');
 expect(after.channels.filter((row:any)=>!row.closed)).toHaveLength(1);
});

for(const stage of ['checkpoint','previous'] as const)test(`a confirmed configuration survives a real ${stage} connection close without being relabeled as an uncommitted write`,async({page},info)=>{
 await seed(page);const started=await startStore(page);
 const accepted=await page.evaluate(async stage=>{
  const h=(globalThis as any).lifecycle,intent=h.f.store.prepareConfiguration({type:'SCHOOL',school:'talisman'});
  if(!intent)throw new Error('Cannot prepare the formal configuration');
  h.configurationIntent=intent;h.g=h.gate(stage,'success');h.configuring=h.launch(()=>h.f.store.applyConfiguration(intent));
  const entered=await h.g.entered;return{intent,entered,state:h.state(),raw:await h.inspect()};
 },stage);
 expect(accepted.state.game.core.revision).toBe(started.game.core.revision+1);expect(accepted.state.game.school).toBe('talisman');
 expect(accepted.state.lastResult.commandId).toBe(accepted.intent.command.commandId);expect(accepted.state.saved).toBe(true);expect(accepted.state.busy).toBe(true);
 const result=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.candidate.close();h.g.release();await h.g.finished;return h.configuring;});
 const after=await observe(page);await attach(info,'confirmed-write-closed-metadata-'+stage,{started,accepted,result,after});
 expect(result.ok).toBe(true);expect(after.raw).toEqual(accepted.raw);expect(after.state.game).toEqual(accepted.state.game);expect(after.state.activity).toEqual(accepted.state.activity);
 expect(after.state.lastResult).toEqual(accepted.state.lastResult);expect(after.state.lastFromActivity).toBe(false);expect(after.state.lastReplayed).toBe(false);
 expect(after.state.saved).toBe(false);expect(after.state.available).toBe(false);expect(after.state.syncIssue).toBe(true);expect(after.state.canRetry).toBe(false);expect(after.state.busy).toBe(false);
 expect(after.state.error).toContain('关闭');expect(after.state.error).toContain('已确认的成果保留');expect(after.state.saveLabel).toBe('同步待核对');
 const receipts=after.raw['full-receipts'].filter((row:any)=>row.key===accepted.intent.command.runId+':'+accepted.intent.command.commandId);
 expect(receipts).toHaveLength(1);expect(receipts[0].value.format).toBe('chenyuan-configuration-receipt');expect(receipts[0].value.result).toEqual(accepted.state.lastResult);
 expect(after.observations.filter((row:any)=>row.kind==='action'&&row.commandId===accepted.intent.command.commandId)).toHaveLength(1);
 expect(after.observations.filter((row:any)=>row.kind==='save_error'&&row.operation==='SCHOOL')).toHaveLength(0);
 expect(after.observations.some((row:any)=>row.kind==='save_error'&&row.errorCode==='STORAGE_CLOSED')).toBe(true);
});

for(const delivery of ['success','failure'] as const)test(`a delayed CREATE follow-up snapshot ${delivery} cannot roll back or invalidate a newer formal choice accepted by public refresh`,async({page},info)=>{
 const initial=await seed(page),started=await startStore(page);
 const held=await page.evaluate(async delivery=>{
  const h=(globalThis as any).lifecycle;h.g=h.gate('snapshot',delivery);h.restartBegan=performance.now();
  h.restarting=h.launch(()=>h.f.store.restart('控制新卷'));
  const entered=await h.g.entered,elapsed=performance.now()-h.restartBegan,raw=await h.inspect();
  const created=raw[h.FULL_RECEIPT_STORE].filter((row:any)=>row.value?.format==='chenyuan-control-receipt'&&row.value.kind==='CREATE');
  return{entered,elapsed,raw,created,state:h.state()};
 },delivery);
 // This control operation waits its real existing 0.6-second presentation gate;
 // the separate formal CHOOSE fixture uses its explicit rule-time adapter.
 expect(held.elapsed).toBeGreaterThanOrEqual(600);expect(held.created).toHaveLength(1);
 expect(held.entered.value.state.core.runId).not.toBe(started.game.core.runId);expect(held.entered.value.state.core.revision).toBe(0);
 expect(held.state.busy).toBe(true);expect(held.state.game).toEqual(held.entered.value.state);
 const external=await page.evaluate(async()=>{
  const h=(globalThis as any).lifecycle,repo=await h.FullSaveRepository.open();
  try{const done=await h.finishAction(repo,{type:'CHOOSE',choice:'leave'});return{done,raw:await h.inspect()};}
  finally{repo.close();}
 });
 expect(external.done.state.core.runId).toBe(held.entered.value.state.core.runId);expect(external.done.state.core.revision).toBe(1);expect(external.done.state.core.openingChoice).toBe('leave');
 await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;await h.f.store.refresh();});
 const refreshed=await observe(page);expect(refreshed.state.game).toEqual(external.done.state);expect(refreshed.state.activity).toEqual(external.done.activity);
 const result=await page.evaluate(async()=>{const h=(globalThis as any).lifecycle;h.g.release();await h.g.finished;return h.restarting;});
 const after=await observe(page);await attach(info,'create-followup-read-order-'+delivery,{delivery,initial,started,held,external,refreshed,result,after});
 expect(result.ok).toBe(true);expect(after.state.game).toEqual(external.done.state);expect(after.state.activity).toEqual(external.done.activity);
 expect(after.raw).toEqual(external.raw);expect(after.raw).toEqual(refreshed.raw);expect(after.state.saved).toBe(true);expect(after.state.error).toBe('');expect(after.state.canRetry).toBe(false);expect(after.state.runtime).toBeNull();
 expect(after.state.available).toBe(true);expect(after.state.syncIssue).toBe(false);expect(after.observations.filter((row:any)=>row.kind==='save_error')).toHaveLength(0);
 const created=after.raw['full-receipts'].filter((row:any)=>row.value?.format==='chenyuan-control-receipt'&&row.value.kind==='CREATE');
 expect(created).toEqual(held.created);expect(after.observations.filter((row:any)=>row.kind==='restart')).toHaveLength(1);
});
