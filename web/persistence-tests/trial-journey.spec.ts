import {test,expect} from '@playwright/test';
import {setupPersistence} from './support';
import {trialJourneyScenario,normalizeTrialGame} from '../../tests/trial-journey-route.mjs';
test.beforeEach(async({page})=>setupPersistence(page));
async function ready(page:any,name:string,school='sword',answer='accept',stage=0){
 const scenario=trialJourneyScenario(school,answer),at=scenario.states.findIndex((g:any)=>g.trial?.stage===stage);
 await page.evaluate(async({name,prepared,actions}:any)=>{const h=(globalThis as any).h,repo=await h.FullSaveRepository.open(name);let state=(await repo.importText(JSON.stringify(prepared),h.mutation())).state;for(const action of actions)state=(await repo.execute(h.command(state,action))).state;repo.close();},{name,prepared:scenario.prepared,actions:scenario.actions.slice(0,at)});return scenario;
}

test('both schools preserve the whole question, every battle and three gate transitions across reopening and stable replays',async({page})=>{
 for(const [school,answer] of [['sword','accept'],['talisman','release']]){
  const name='journey-'+school,scenario=trialJourneyScenario(school,answer);
  const result=await page.evaluate(async({name,prepared,actions}:any)=>{
   const h=(globalThis as any).h;let repo=await h.FullSaveRepository.open(name),state=(await repo.importText(JSON.stringify(prepared),h.mutation())).state;const rows=[];
   for(const action of actions){const command=h.command(state,action),first=await repo.execute(command);state=first.state;
    const cp=await repo.loadCheckpoint();repo.close();repo=await h.FullSaveRepository.open(name);const loaded=await repo.load(),retry=await repo.execute(command);rows.push({state,loaded,retry,cp});
   }
   const before=await h.inspect(name),duplicate=await h.attempt(()=>repo.execute(h.command(state,{type:'BATTLE',move:'attack'}))),after=await h.inspect(name);repo.close();return{rows,before,after,duplicate};
  },{name,prepared:scenario.prepared,actions:scenario.actions});
  for(let i=0;i<result.rows.length;i++){const row=result.rows[i];expect(normalizeTrialGame(row.state)).toEqual(normalizeTrialGame(scenario.states[i+1]));expect(row.loaded).toEqual(row.state);expect(row.retry.state).toEqual(row.state);expect(row.retry.replayed).toBe(true);expect(normalizeTrialGame(row.cp.snapshot)).toEqual(normalizeTrialGame(scenario.prepared));}
  expect(result.duplicate.code).toBe('NO_BATTLE');expect(result.after).toEqual(result.before);
 }
});

test('question and each gate roll back quota and put-success abort without changing progress, receipt or preparation',async({page})=>{
 for(const stage of [0,1,2,3])for(const mode of ['quota','abort']){
  const name='trial-atomic-'+stage+'-'+mode;await ready(page,name,'sword','accept',stage);
  const result=await page.evaluate(async({name,stage,mode}:any)=>{
   const h=(globalThis as any).h,repo=await h.FullSaveRepository.open(name),state=await repo.load(),command=h.command(state,stage===0?{type:'ANSWER_TRIAL',answer:'accept'}:{type:'BATTLE',move:'attack'}),before=await h.inspect(name),put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name===h.FULL_STATE_STORE&&key==='current'){if(mode==='quota')throw new DOMException('journey quota','QuotaExceededError');const request=put.call(this,value,key);request.addEventListener('success',()=>this.transaction.abort());return request;}return put.call(this,value,key!);};
   let failed;try{failed=await h.attempt(()=>repo.execute(command));}finally{IDBObjectStore.prototype.put=put;}
   const after=await h.inspect(name),retried=await repo.execute(command),repeat=await repo.execute(command);repo.close();return{before,after,failed,retried,repeat};
  },{name,stage,mode});expect(result.failed.code).toBe(mode==='quota'?'STORAGE_QUOTA':'STORAGE_ABORTED');expect(result.after).toEqual(result.before);expect(result.repeat.state).toEqual(result.retried.state);expect(result.repeat.replayed).toBe(true);
 }
});

test('two real lethal thunder failures can reopen, explain consumed items and restore the same full preparation',async({page})=>{
 const scenario=await ready(page,'trial-two-losses');
 const actions=scenario.actions.slice(1,scenario.states.findIndex((g:any)=>g.trial?.stage===2));
 const result=await page.evaluate(async({actions}:any)=>{
  const h=(globalThis as any).h;let repo=await h.FullSaveRepository.open('trial-two-losses'),state=await repo.load();const rows=[];
  for(let attempt=0;attempt<2;attempt++){
   if(!state.trial)state=(await repo.execute(h.command(state,{type:'START_TRIAL'}))).state;
   for(const action of actions)state=(await repo.execute(h.command(state,action))).state;
   state=(await repo.execute(h.command(state,{type:'BATTLE',move:'heal'}))).state;
   for(let turn=0;state.battle&&turn<45;turn++)state=(await repo.execute(h.command(state,{type:'BATTLE',move:'guard'}))).state;
   repo.close();repo=await h.FullSaveRepository.open('trial-two-losses');state=await repo.load();const previous=await repo.loadPrevious(),cp=await repo.loadCheckpoint(),recovery=h.queries.getTrialRecovery(state,previous,cp);
   const restored=(await repo.restoreCheckpoint(h.mutation(state))).state;rows.push({failed:state,recovery,restored,cp});state=restored;
  }repo.close();return rows;
 },{actions});
 for(const row of result){expect(row.failed.trial).toBeNull();expect(row.failed.core.player.hp).toBe(1);expect(row.recovery.reason).toContain('未能抵住');expect(row.recovery.stage).toBe(2);expect(row.recovery.consumed).toEqual(expect.arrayContaining([expect.objectContaining({id:'ascension_seal',quantity:1}),expect.objectContaining({id:'healing_pill',quantity:1})]));expect(normalizeTrialGame(row.restored)).toEqual(normalizeTrialGame(scenario.prepared));}
 expect(result[0].restored.core.runId).not.toBe(result[1].restored.core.runId);
});

test('a restore fixed before another connection turn is stale and its successful replay never rolls back later preparation',async({page})=>{
 await ready(page,'trial-restore-race','sword','accept',2);
 const result=await page.evaluate(async()=>{
  const h=(globalThis as any).h,a=await h.FullSaveRepository.open('trial-restore-race'),b=await h.FullSaveRepository.open('trial-restore-race'),state=await a.load(),old=h.mutation(state),command=h.command(state,{type:'BATTLE',move:'guard'}),turned=await b.execute(command),before=await h.inspect('trial-restore-race');
  const stale=await h.attempt(()=>a.restoreCheckpoint(old)),after=await h.inspect('trial-restore-race'),fresh=h.mutation(turned.state),restored=await a.restoreCheckpoint(fresh),next=await a.execute(h.command(restored.state,{type:'TRAVEL',location:'cave'})),replay=await b.restoreCheckpoint(fresh),foreign=await h.attempt(()=>b.execute(command));a.close();b.close();return{before,after,stale,next,replay,foreign};
 });expect(result.stale.code).toBe('STALE_REVISION');expect(result.after).toEqual(result.before);expect(result.replay.replayed).toBe(true);expect(result.replay.state).toEqual(result.next.state);expect(result.foreign.code).toBe('RUN_MISMATCH');
});

test('an imported ongoing trial has no invented checkpoint or total consumption after a real withdrawal',async({page})=>{
 const scenario=trialJourneyScenario('talisman','release'),battle=scenario.states.find((g:any)=>g.trial?.stage===2);
 const result=await page.evaluate(async(battle:any)=>{const h=(globalThis as any).h,repo=await h.FullSaveRepository.open('trial-imported');const state=(await repo.importText(JSON.stringify(battle),h.mutation())).state;await repo.execute(h.command(state,{type:'BATTLE',move:'flee'}));const current=await repo.load(),previous=await repo.loadPrevious(),cp=await repo.loadCheckpoint(),view=h.queries.getTrialRecovery(current,previous,cp);repo.close();return{current,cp,view};},battle);
 expect(result.cp).toBeNull();expect(result.view.reason).toContain('主动退离');expect(result.view.consumptionKnown).toBe(false);expect(result.view.consumed).toEqual([]);
});
