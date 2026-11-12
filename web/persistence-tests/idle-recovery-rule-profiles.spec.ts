import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';
import {repositoryFsRoot} from './fs-root';

test('rule profiles keep a genuine v3 database checkpoint and original tick replay unchanged in the new repository',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async root=>{
  const h=(globalThis as any).h,old=await import(`/@fs${root}src/legacy/rules-v3/web/src/full-persistence.ts`),name='rule-profile-old',repo=await old.FullSaveRepository.open(name);
  const mutation=(s:any)=>({commandId:crypto.randomUUID(),runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'legacy-owner'});
  const tick=async(a:any)=>{const now=Date.now;Date.now=()=>a.dueAt;try{return await repo.settleActivity({commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation});}finally{Date.now=now;}};
  let current:any;
  try{
   await repo.create('旧约真存储',h.mutation());await h.finishAction(repo,{type:'CHOOSE',choice:'leave'});await h.finishAction(repo,{type:'TRAVEL',location:'cave'});
   let s=await repo.loadActivitySnapshot(),started=await repo.startActivity({kind:'cultivation',method:'natural',maxCycles:2,until:'xp-cap',stoneBudget:0,stoneReserve:0},mutation(s));
   await tick(started.activity);await tick((await repo.loadActivitySnapshot()).activity);
   const completed=await h.finishAction(repo,{type:'BREAKTHROUGH'}),before=await h.inspect(name),a=completed.activity;
   const row=before[h.FULL_RECEIPT_STORE].find((v:any)=>v.value.input?.kind==='TICK'&&v.value.command?.type==='BREAKTHROUGH'),input=row.value.input.tick;
   current=await h.FullSaveRepository.open(name);const opened=await h.inspect(name),snapshot=await current.loadActivitySnapshot(),replay=await current.settleActivity(input),after=await h.inspect(name);
   return{before,opened,snapshot,replay,after,completed,a,checkpoint:await current.loadCheckpoint()};
  }finally{repo.close();current?.close();}
 },repositoryFsRoot);
 expect(r.opened).toEqual(r.before);expect(r.after).toEqual(r.before);expect(r.snapshot.state.core.contentVersion).toBe('full-demo.3');expect(r.snapshot.state.core.balanceVersion).toBe('full-unbalanced.3');expect(r.snapshot.state.core.runId).toBe(r.completed.state.core.runId);expect(r.snapshot.activity).toEqual(r.completed.activity);expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.completed.state);expect(r.replay.result).toEqual(r.completed.result);expect(r.checkpoint.versions.contentVersion).toBe('full-demo.3');expect(r.checkpoint.snapshot.core.contentVersion).toBe('full-demo.3');
});

test('rule profiles let the actual old repository reject a new v4 database without mutating any store',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async root=>{
  const h=(globalThis as any).h,old=await import(`/@fs${root}src/legacy/rules-v3/web/src/full-persistence.ts`),name='rule-profile-new',repo=await h.FullSaveRepository.open(name);let reader:any;
  try{
   const created=await repo.create('新约真存储',h.mutation()),before=await h.inspect(name);let error;
   try{reader=await old.FullSaveRepository.open(name);}catch(e:any){error={code:e.code,message:e.message};}
   return{created,before,error,after:await h.inspect(name),current:await repo.loadActivitySnapshot()};
  }finally{reader?.close();repo.close();}
 },repositoryFsRoot);
 expect(r.created.state.core.contentVersion).toBe('full-demo.4');expect(r.error.code).toBe('SAVE_VERSION');expect(r.after).toEqual(r.before);expect(r.current.state).toEqual(r.created.state);
});

test('genuine old configuration and direct replies replay after later progress without repricing or rewriting the database',async({page})=>{
 await setupPersistence(page);
 const r=await page.evaluate(async root=>{
  const h=(globalThis as any).h,old=await import(`/@fs${root}src/legacy/rules-v3/web/src/full-persistence.ts`),name='old-direct-config',repo=await old.FullSaveRepository.open(name);
  const mutation=(s:any)=>({commandId:crypto.randomUUID(),runId:s.state.core.runId,expectedRevision:s.state.core.revision,expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null,ownerId:'old-owner'});
  const intent=(s:any,action:any)=>({command:h.command(s.state,action),expectedActivityId:s.activity?.id??null,expectedActivityRevision:s.activity?.revision??null});
  const tick=async(a:any)=>{const now=Date.now;Date.now=()=>a.dueAt;try{return await repo.settleActivity({commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation});}finally{Date.now=now;}};
  let reader:any;
  try{
   await repo.create('旧约回音',h.mutation());await h.finishAction(repo,{type:'CHOOSE',choice:'leave'});await h.finishAction(repo,{type:'TRAVEL',location:'cave'});
   const s=await repo.loadActivitySnapshot(),started=await repo.startActivity({kind:'cultivation',method:'natural',maxCycles:2,until:'xp-cap',stoneBudget:0,stoneReserve:0},mutation(s));
   await tick(started.activity);await tick((await repo.loadActivitySnapshot()).activity);await h.finishAction(repo,{type:'BREAKTHROUGH'});
   const config=intent(await repo.loadActivitySnapshot(),{type:'SCHOOL',school:'sword'}),configured=await repo.configure(config);
   await h.finishAction(repo,{type:'TRAVEL',location:'sect'});
   const visit=intent(await repo.loadActivitySnapshot(),{type:'EVENT',event:'lu_intro'});await repo.executeDirect(visit);
   const answer=intent(await repo.loadActivitySnapshot(),{type:'DECIDE',option:'listen'}),answered=await repo.executeDirect(answer);
   await h.finishAction(repo,{type:'TRAVEL',location:'cave'});const before=await h.inspect(name);
   reader=await h.FullSaveRepository.open(name);const snapshot=await reader.loadActivitySnapshot(),a=await reader.configure(config),b=await reader.executeDirect(answer),after=await h.inspect(name);
   return{before,after,snapshot,configured,answered,a,b};
  }finally{repo.close();reader?.close();}
 },repositoryFsRoot);
 expect(r.after).toEqual(r.before);expect(r.snapshot.state.core.contentVersion).toBe('full-demo.3');
 for(const [replay,saved]of [[r.a,r.configured],[r.b,r.answered]]){
  expect(replay.replayed).toBe(true);expect(replay.result).toEqual(saved.result);expect(replay.state).toEqual(r.snapshot.state);expect(replay.activity).toEqual(r.snapshot.activity);
 }
});
