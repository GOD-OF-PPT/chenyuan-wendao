import {test,expect} from '@playwright/test';
import {setupCurrentRecovery} from './idle-recovery-support';
test.beforeEach(async({page})=>setupCurrentRecovery(page));
test.afterEach(async({page})=>{if(!page.isClosed())await page.evaluate(()=>{const h=(window as any).h;if(h?.m04RealNow)Date.now=h.m04RealNow;});});

for(const mode of ['quota','abort'])test(`M04-N12 ${mode} preserves the question and every gate full preparation until the original complete cycle retries once`,async({page})=>{
 const rows=await page.evaluate(async mode=>{
  const h=(window as any).h,rows=[];
  for(const school of ['sword','talisman']){
   const name='m04-gate-fault-'+mode+'-'+school,repo=await h.FullSaveRepository.open(name),scenario=h.m04TrialSamples[school];
   const prepared=(await repo.importText(JSON.stringify(scenario.prepared),h.mutation())).state;
   try{
    for(const action of scenario.actions){
     const current=await repo.loadActivitySnapshot(),formal=h.engine.resolve(current.state,h.command(current.state,action));
     const boundary=action.type==='ANSWER_TRIAL'||(action.type==='BATTLE'&&formal.nextState.trial?.stage!==current.state.trial?.stage);
     if(!boundary){await h.m04Action(repo,action);continue;}
     const started=await repo.startActivity(h.m04Plan(current.state,action),h.milestoneMutation(current)),tick=h.milestoneTick(started),a=started.activity,before=await h.inspect(name),cp=await repo.loadCheckpoint(),put=IDBObjectStore.prototype.put;
     h.m04Same(cp.snapshot,prepared,'good trial preparation before boundary');
     h.m04Now=a.dueAt-1;const early=await h.attempt(()=>repo.settleActivity(tick));h.m04Same(await h.inspect(name),before,'no early boundary write');h.m04Now=a.dueAt;
     let hit=false,requestSuccess=false,abortCalled=false;
     IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
      if(this.transaction.db.name===name&&(mode==='quota'?this.name===h.FULL_RECEIPT_STORE:this.name===h.FULL_STATE_STORE&&key==='current')){
       hit=true;if(mode==='quota')throw new DOMException('M04 boundary quota','QuotaExceededError');
       const q=put.call(this,value,key!);q.addEventListener('success',()=>{requestSuccess=true;this.transaction.abort();abortCalled=true;},{once:true});return q;
      }return put.call(this,value,key!);
     };
     let failed;try{failed=await h.attempt(()=>repo.settleActivity(tick));}finally{IDBObjectStore.prototype.put=put;}
     const afterFailure=await h.inspect(name),done=await repo.settleActivity(tick),saved=await h.inspect(name),replay=await repo.settleActivity({...tick}),afterReplay=await h.inspect(name);
     const expected=h.engine.resolve(current.state,a.nextCommand);h.m04Same(done.state,expected.nextState,'full boundary Game');h.m04Same(done.result,expected.result,'full boundary result');h.m04Same(done.activity,h.milestoneModel.completeActivity(expected.nextState,a,expected.result,{commandId:tick.commandId,now:h.m04Now}),'full boundary Activity');
     rows.push({school,action,from:current.state.trial.stage,to:done.state.trial.stage,cycleMs:a.cycleMs,early,hit,requestSuccess,abortCalled,failed,before,afterFailure,saved,afterReplay,replay,done,cp,cpAfter:await repo.loadCheckpoint()});
    }
   }finally{repo.close();}
  }return rows;
 },mode);
 expect(rows).toHaveLength(8);
 for(const r of rows){expect(r.early.code).toBe('ACTIVITY_NOT_DUE');expect(r.hit).toBe(true);expect(r.failed.code).toBe(mode==='quota'?'STORAGE_QUOTA':'STORAGE_ABORTED');if(mode==='abort'){expect(r.requestSuccess).toBe(true);expect(r.abortCalled).toBe(true);}expect(r.afterFailure).toEqual(r.before);expect(r.afterReplay).toEqual(r.saved);expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.done.state);expect(r.replay.result).toEqual(r.done.result);expect(r.cpAfter).toEqual(r.cp);expect(r.cycleMs).toBe(r.action.type==='ANSWER_TRIAL'?6000:3000);}
 for(const school of ['sword','talisman'])expect(rows.filter(r=>r.school===school).map(r=>r.to)).toEqual([1,2,3,4]);
});

test('M04-N13 two real connections canonicalize the same tick and fence competing finite choices without duplicate rewards',async({page})=>{
 const r=await page.evaluate(async()=>{
  const h=(window as any).h,name='m04-canonical-cycle',a=await h.FullSaveRepository.open(name),b=await h.FullSaveRepository.open(name);
  try{
   const initial=(await a.create('并发周期',h.mutation())).state,s=await a.loadActivitySnapshot(),one=h.milestoneMutation(s),two=h.milestoneMutation(s);
   const starts=await Promise.all([h.attempt(()=>a.startActivity(h.milestonePlan({type:'CHOOSE',choice:'help'}),one)),h.attempt(()=>b.startActivity(h.milestonePlan({type:'CHOOSE',choice:'leave'}),two))]);
   const accepted=starts.find((x:any)=>x.ok).value,tick=h.milestoneTick(accepted),reordered=Object.fromEntries(Object.entries(tick).reverse());h.m04Now=accepted.activity.dueAt;
   const outcomes=await Promise.all([a.settleActivity(tick),b.settleActivity(reordered)]),saved=await h.inspect(name),changed=await h.attempt(()=>b.settleActivity({...tick,generation:tick.generation+1})),afterChanged=await h.inspect(name),formal=h.engine.resolve(initial,accepted.activity.nextCommand),current=await a.load();
   const currentSnapshot=await a.loadActivitySnapshot(),staleIntent=h.milestoneMutation(currentSnapshot),first=h.mutation(current),second=h.mutation(current),replacements=await Promise.all([h.attempt(()=>a.create('甲局',first)),h.attempt(()=>b.create('乙局',second))]);
   const replacement=await a.load(),beforeStale=await h.inspect(name),stale=await h.attempt(()=>a.startActivity(h.milestonePlan({type:'CHOOSE',choice:'help'}),staleIntent)),afterStale=await h.inspect(name);
   return{initial,starts,accepted,outcomes,saved,changed,afterChanged,formal,current,replacements,replacement,beforeStale,stale,afterStale};
  }finally{a.close();b.close();}
 });
 expect(r.starts.filter(x=>x.ok)).toHaveLength(1);expect(r.starts.find(x=>!x.ok)?.code).toBe('ACTIVITY_STALE');
 expect(r.outcomes.map(x=>x.replayed).sort()).toEqual([false,true]);expect(r.current).toEqual(r.formal.nextState);expect(r.current.core.revision).toBe(r.initial.core.revision+1);expect(r.outcomes[0].result).toEqual(r.outcomes[1].result);expect(r.saved['full-receipts'].filter(x=>x.value?.format==='chenyuan-activity-receipt'&&x.value.command!==null)).toHaveLength(1);
 expect(r.changed.code).toBe('COMMAND_ID_REUSED');expect(r.afterChanged).toEqual(r.saved);expect(r.replacements.filter(x=>x.ok)).toHaveLength(1);expect(r.replacements.find(x=>!x.ok)?.code).toBe('STALE_REVISION');expect(['甲局','乙局']).toContain(r.replacement.core.player.name);expect(r.stale.code).toBe('RUN_MISMATCH');expect(r.afterStale).toEqual(r.beforeStale);
});

test('M04-N14 a complete restore racing a due real turn commits exactly one full intent across connections',async({page})=>{
 const rows=await page.evaluate(async()=>{
  const h=(window as any).h,out=[];
  for(const order of ['restore-first','turn-first']){
   const name='m04-restore-due-race-'+order,{repo}=await h.milestoneFixture(name,'BREAKTHROUGH'),other=await h.FullSaveRepository.open(name);
   try{
    await h.m04Action(repo,{type:'BREAKTHROUGH'});const cp=await repo.loadCheckpoint(),started=await repo.startActivity({kind:'travel',location:'sect',maxCycles:1},h.milestoneMutation(await repo.loadActivitySnapshot())),tick=h.milestoneTick(started),intent=h.mutation(started.state),formal=h.engine.resolve(started.state,started.activity.nextCommand);h.m04Now=started.activity.dueAt;
    const restore=()=>h.attempt(()=>repo.restoreCheckpoint(intent)),turn=()=>h.attempt(()=>other.settleActivity(tick)),outcomes=order==='restore-first'?await Promise.all([restore(),turn()]):await Promise.all([turn(),restore()]);
    const current=await repo.load(),after=await h.inspect(name),restored=current.core.runId!==started.state.core.runId,expected=structuredClone(restored?cp.snapshot:formal.nextState);if(restored){expected.core.runId=current.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=current.core.runId+':'+expected.core.activeEvent.id;}
    h.m04Same(current,expected,'entire winning race state');h.m04Same(await repo.loadCheckpoint(),cp,'race kept complete good checkpoint');out.push({order,outcomes,current,restored,after,expected});
   }finally{repo.close();other.close();}
  }return out;
 });
 for(const r of rows){expect(r.outcomes.filter(x=>x.ok)).toHaveLength(1);expect(['RUN_MISMATCH','STALE_REVISION']).toContain(r.outcomes.find(x=>!x.ok)?.code);expect(r.current).toEqual(r.expected);if(r.restored)expect(r.after['full-receipts']).toHaveLength(1);else expect(r.current.core.world.location).toBe('sect');}
});

test('M04-N15 caller mutation after submission cannot change a finite plan or tick and its committed replay returns the latest complete state',async({page})=>{
 const r=await page.evaluate(async()=>{
  const h=(window as any).h,name='m04-caller-capture',repo=await h.FullSaveRepository.open(name);
  try{
   const initial=(await repo.create('捕获原意图',h.mutation())).state,s=await repo.loadActivitySnapshot(),plan=h.milestonePlan({type:'CHOOSE',choice:'help'}),intent=h.milestoneMutation(s),originalIntent=structuredClone(intent),start=repo.startActivity(plan,intent);
   plan.action.choice='leave';intent.expectedRevision=999;intent.commandId='changed-after-submit';const accepted=await start;h.m04Same(accepted.activity.plan,h.milestonePlan({type:'CHOOSE',choice:'help'}),'captured original plan');
   const tick=h.milestoneTick(accepted),originalTick=structuredClone(tick);h.m04Now=accepted.activity.dueAt;const pending=repo.settleActivity(tick);tick.expectedRevision=999;tick.generation=999;tick.commandId='changed-tick-after-submit';const first=await pending,formal=h.engine.resolve(initial,accepted.activity.nextCommand);
   h.m04Same(first.state,formal.nextState,'captured whole command result');await h.m04Travel(repo,'cave');const latest=await repo.load(),beforeReplay=await h.inspect(name),replay=await repo.settleActivity(originalTick),afterReplay=await h.inspect(name);
   return{accepted,originalIntent,first,formal,latest,replay,beforeReplay,afterReplay};
  }finally{repo.close();}
 });
 expect(r.accepted.activity.plan.action.choice).toBe('help');expect(r.first.state).toEqual(r.formal.nextState);expect(r.replay.replayed).toBe(true);expect(r.replay.state).toEqual(r.latest);expect(r.replay.result).toEqual(r.first.result);expect(r.afterReplay).toEqual(r.beforeReplay);expect(r.latest.core.revision).toBe(r.first.state.core.revision+1);
});
