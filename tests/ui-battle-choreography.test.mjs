import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolve,validateGame} from '../src/full/engine.ts';
import {createActivity,completeActivity,pauseActivity,resumeActivity,defaultBattlePlan,defaultEncounterPlan,singleBattlePlan} from '../src/full/activity.ts';
import {writeObservation,loadedObservation} from '../web/src/local-events.ts';
import {createBattleWitness,castForNotice,fitBattleCast,BATTLE_SHAPES} from '../web/src/battle-choreography.ts';
import {driver,fullRoute} from './full-route.mjs';
import {feedbackExamples} from './action-feedback-fixtures.mjs';

// Formal proof/ownership checks only: no native commit, wall-clock or pixel claim.
const examples=feedbackExamples(),moves=Object.keys(BATTLE_SHAPES);
let sequence=160000;
const uuid=()=> '00000000-0000-4000-8000-'+(sequence++).toString(16).padStart(12,'0');
const apply=(g,a)=>resolve(g,{...a,commandId:uuid(),runId:g.core.runId,expectedRevision:g.core.revision}).nextState;
const runtime=a=>({id:a.id,generation:a.generation,phase:'running',remainingMs:a.cycleMs,totalMs:a.cycleMs});
function settle(before,prior){
 const command=prior.nextCommand;assert.ok(command);
 const {nextState:game,result}=resolve(before,command);
 const activity=completeActivity(game,prior,result,{commandId:command.commandId,now:prior.dueAt});
 const observation=writeObservation(before,game,{kind:'action',command},result,false);
 return{before,prior,game,result,activity,observation};
}
function frame(before,plan){
 const game=structuredClone(before);validateGame(game);
 return settle(game,createActivity(game,plan,{id:uuid(),ownerId:'current-battle-stage',commandId:uuid(),now:1000}));
}
const moveFrame=(school='sword',move='technique')=>{
 const e=examples.moves.get(school+':'+move);assert.ok(e,school+':'+move);
 return frame(e.before,singleBattlePlan(e.before,move));
};
const armed=f=>{const w=createBattleWitness();w.arm(f.prior,f.before,runtime(f.prior));return w;};
const capture=(w,f,replayed=false,eligible=true)=>w.capture(f.observation,f.game,f.activity,f.result,replayed,eligible);
// Only discriminator fields are needed by the notice-to-shape/claim APIs.
const notice=c=>({operation:'BATTLE',key:c.key,variant:c.variant,terminal:false});
function replay(actions){let g=newGame('七招见证',uuid());for(const action of actions)g=apply(g,action);return g;}
function automatic(){
 const d=driver('leave','sword');d.buy('healing_pill',3);d.buy('spirit_pill',3);d.rest();d.go('wilderness');
 d.doAction({type:'ENCOUNTER',enemy:'warden'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'attack'});
 const before=replay(d.actions),plan={...defaultBattlePlan(before),maxCycles:2};
 plan.strategy={...plan.strategy,respondHeavy:false,healBelowPercent:0,restoreBelowPercent:0,retreatBelowPercent:0};
 return frame(before,plan);
}

test('all seven lawful moves in both schools freeze the actual three-second command and complete full proof once',()=>{
 for(const school of ['sword','talisman'])for(const move of moves){
  const f=moveFrame(school,move),raw=JSON.stringify(f),w=armed(f),cue=capture(w,f);
  assert.ok(cue,school+':'+move);assert.equal(f.prior.version,6);assert.equal(f.prior.cycleMs,3000);
  assert.equal(cue.move,move);assert.equal(cue.school,school);assert.equal(cue.commandId,f.prior.nextCommand.commandId);
  assert.equal(cue.id,f.prior.id);assert.equal(cue.generation,f.prior.generation);assert.equal(cue.owner,f.prior.ownerId);
  assert.equal(cue.runId,f.before.core.runId);assert.equal(cue.revision,f.game.core.revision);
  assert.equal(cue.enemy,f.before.battle.enemy);assert.equal(cue.stage,f.before.trial?.stage??null);
  assert.equal(cue.enemyHurt,f.game.battle?.enemy===cue.enemy&&f.game.battle.hp<f.before.battle.hp);
  assert.equal(cue.hurt,f.result.delta.hp<0);assert.equal(cue.key,JSON.stringify([f.before.core.runId,f.prior.nextCommand.commandId]));
  assert.equal(w.forNotice(notice(cue)),cue);assert.equal(capture(w,f),null);
  assert.equal(f.activity.moves[move],1);assert.equal(f.activity.battleTurns,1);assert.equal(f.activity.status,'stopped');
  assert.equal(f.activity.spentMp,f.result.costs.mp);assert.deepEqual(f.activity.spentItems,f.result.costs.items);
  if(move==='heal')assert.deepEqual(f.result.costs.items,{healing_pill:1});
  if(move==='restore')assert.deepEqual(f.result.costs.items,{spirit_pill:1});
  if(move==='technique'||move==='release')assert.ok(f.result.costs.mp>0);
  if(move==='flee'){assert.equal(f.game.core.player.hp,f.before.core.player.hp-8);assert.equal(f.game.battle,null);}
  assert.equal(f.observation.commandId,null);assert.equal(f.observation.identifiersRedacted,true);assert.equal(JSON.stringify(f),raw);
 }
});

test('travel and encounter arrivals do not acquire a battle cast, but the encounter plan next real battle period may',()=>{
 const d=driver();d.go('wilderness');const before=replay(d.actions);
 const trip=frame(before,{kind:'travel',location:'cave',maxCycles:1});assert.equal(capture(armed(trip),trip),null);
 const plan={...defaultEncounterPlan(before,'warden'),maxCycles:2};
 plan.strategy={...plan.strategy,healBelowPercent:0,restoreBelowPercent:0,retreatBelowPercent:0};
 const encounter=frame(before,plan),w=armed(encounter);assert.equal(encounter.prior.nextCommand.type,'ENCOUNTER');
 assert.equal(capture(w,encounter),null);assert.equal(encounter.activity.status,'running');assert.equal(encounter.activity.nextCommand.type,'BATTLE');
 const battle=settle(encounter.game,encounter.activity);w.arm(battle.prior,battle.before,runtime(battle.prior));
 assert.ok(capture(w,battle));assert.equal(battle.prior.cycleMs,3000);
});

test('a saved automatic cycle retains its frozen move while the next decision has already changed',()=>{
 const first=automatic(),second=settle(first.game,first.activity),w=armed(first);
 assert.equal(first.prior.nextCommand.move,'technique');assert.equal(first.activity.nextCommand.move,'release');
 const cue=capture(w,first);assert.ok(cue);assert.equal(cue.move,'technique');assert.equal(cue.variant,'sword-technique');
 w.arm(second.prior,second.before,runtime(second.prior));assert.equal(w.forNotice(notice(cue)),cue);
 assert.equal(capture(w,first),null);const next=capture(w,second);assert.ok(next);assert.equal(next.move,'release');
 assert.notEqual(next.commandId,cue.commandId);assert.equal(w.forNotice(notice(cue)),null);assert.equal(w.forNotice(notice(next)),next);
});

test('only the exact notice key, operation and variant can claim the verified cast',()=>{
 const f=moveFrame(),w=armed(f),cue=capture(w,f);assert.ok(cue);
 for(const patch of [{key:'another-receipt'},{operation:'ENCOUNTER'},{variant:'sword-release'},{variant:cue.variant+'-extra'}])
  assert.equal(w.forNotice({...notice(cue),...patch}),null);
 assert.equal(w.forNotice(notice(cue)),cue);w.clear();assert.equal(w.forNotice(notice(cue)),null);
});

test('inactive, stale or foreign runtime and object snapshots cannot arm a lawful saved result',()=>{
 const f=moveFrame(),g=f.before,a=f.prior,r=runtime(a);
 const cases=[
  [null,g,r],[a,null,r],[a,g,null],[{...a,status:'paused'},g,r],
  [a,g,{...r,phase:'saving'}],[a,g,{...r,id:uuid()}],[a,g,{...r,generation:r.generation+1}],
  [a,{...g,core:{...g.core,runId:uuid()}},r],[a,{...g,core:{...g.core,revision:g.core.revision+1}},r],
  [{...a,plan:{...a.plan,enemy:a.plan.enemy==='wolf'?'warden':'wolf'}},g,r],[{...a,plan:{...a.plan,trialStage:1}},g,r],
  [{...a,nextCommand:{...a.nextCommand,type:'ENCOUNTER'}},g,r],
 ];
 for(const [prior,before,clock]of cases){const w=createBattleWitness();w.arm(prior,before,clock);assert.equal(capture(w,f),null);}
 const unarmed=createBattleWitness();assert.equal(capture(unarmed,f),null);
 unarmed.arm(f.activity,f.game,runtime(f.activity));assert.equal(capture(unarmed,f),null);
 for(const kind of ['resume','sync'])assert.equal(armed(f).capture(loadedObservation(f.game,kind),f.game,f.activity,f.result,false,true),null);
});

test('failed saves and ineligible delivery preserve the original first successful retry without replaying it',()=>{
 const f=moveFrame(),w=armed(f),failed={...f.observation,kind:'save_error',errorCode:'STORAGE_QUOTA',result:null};
 assert.equal(w.capture(failed,f.before,f.prior,null,false,true),null);
 assert.equal(capture(w,f,false,false),null);assert.equal(w.capture(f.observation,null,f.activity,f.result,false,true),null);
 const cue=capture(w,f);assert.ok(cue);assert.equal(capture(w,f),null);
 w.clear();w.arm(f.prior,f.before,runtime(f.prior));assert.equal(capture(w,f),null);
 const current=armed(f),first=capture(current,f);assert.ok(first);
 assert.equal(current.capture(failed,f.game,f.activity,null,false,true),null);assert.equal(current.forNotice(notice(first)),null);
});

test('every replay channel is remembered and cannot later be relabelled as a new gesture',()=>{
 for(const signal of ['argument','observation','kind']){
  const f=moveFrame(),old=structuredClone(f),w=armed(f);
  if(signal==='observation')old.observation.replayed=true;if(signal==='kind')old.observation.kind='replay';
  assert.equal(capture(w,old,signal==='argument'),null);w.clear();w.arm(f.prior,f.before,runtime(f.prior));
  assert.equal(capture(w,f),null);
 }
});

test('pause or same-id takeover fences the abandoned command until a full new-generation period is armed',()=>{
 const f=moveFrame(),paused=pauseActivity(f.prior),resumed=resumeActivity(f.before,paused,{ownerId:'another-battle-page',commandId:uuid(),now:100000});
 const next=settle(f.before,resumed),w=armed(f);assert.equal(resumed.id,f.prior.id);assert.notEqual(resumed.generation,f.prior.generation);
 assert.notEqual(resumed.ownerId,f.prior.ownerId);assert.notEqual(resumed.nextCommand.commandId,f.prior.nextCommand.commandId);
 assert.equal(resumed.dueAt-resumed.startedAt,3000);assert.equal(capture(w,next),null);w.clear();assert.equal(capture(w,f),null);
 w.arm(resumed,f.before,runtime(resumed));assert.equal(capture(w,f),null);assert.ok(capture(w,next));
});

test('changed move, enemy, school, trial state and unrelated Game facts fail full formal proof',()=>{
 const f=moveFrame();
 for(const change of [
  x=>x.observation.action.move='guard',x=>x.game.battle.enemy=f.before.battle.enemy==='wolf'?'warden':'wolf',x=>x.game.battle.hp--,
  x=>x.game.school='talisman',x=>x.game.trial={stage:1,answer:'accept'},
  x=>x.game.choices.fabricated='another',x=>x.game.core.inventory.herb++,x=>x.game.journal.push('未发生的经历'),
 ]){const bad=structuredClone(f);change(bad);const w=armed(f);assert.equal(capture(w,bad),null);assert.ok(capture(w,f));}
});

test('matching public and private forged cost or delta still fail the whole result and Activity proof',()=>{
 const f=moveFrame();
 for(const change of [r=>r.costs.mp++,r=>r.delta.hp++,r=>r.delta.inventory.healing_pill=1,r=>r.versions.balanceVersion='foreign']){
  const bad=structuredClone(f);change(bad.result);
  bad.observation=writeObservation(bad.before,bad.game,{kind:'action',command:bad.prior.nextCommand},bad.result,false);
  assert.equal(capture(armed(f),bad),null);
 }
 for(const change of [a=>a.ownerId='another',a=>a.generation++,a=>a.cycleMs++,a=>a.completedCycles++,a=>a.plan.move='guard',a=>a.spentMp++]){
  const bad=structuredClone(f);change(bad.activity);assert.equal(capture(armed(f),bad),null);
 }
});

test('a lawful next-gate victory keeps its former enemy identity and produces no attack shape on the new gate',()=>{
 const route=fullRoute('help','sword');let game=newGame('旧关见证',uuid()),found=null;
 for(const action of route.actions){
  const before=game;game=apply(game,action);
  if(action.type==='BATTLE'&&before.trial?.stage===1&&game.trial?.stage===2){found={before,move:action.move};break;}
 }
 assert.ok(found);const f=frame(found.before,singleBattlePlan(found.before,found.move)),cue=capture(armed(f),f);assert.ok(cue);
 assert.equal(cue.enemy,f.before.battle.enemy);assert.equal(cue.stage,1);assert.equal(f.game.trial.stage,2);
 assert.notEqual(f.game.battle.enemy,cue.enemy);assert.equal(cue.enemyHurt,false);assert.equal(cue.variant,'victory');
 assert.equal(castForNotice({...notice(cue),terminal:true}),null);
});

test('shape decoding is exact and runtime-safe without admitting suffixes, prototypes or other operations',()=>{
 for(const school of ['sword','talisman'])for(const move of moves)
  assert.deepEqual(castForNotice({operation:'BATTLE',terminal:false,variant:school+'-'+move}),{school,move,shape:BATTLE_SHAPES[move]});
 for(const variant of ['sword-release-extra','sword-attack-','-attack','sword-constructor','unknown-attack','sword','',null,7,{},new String('sword-attack')])
  assert.equal(castForNotice({operation:'BATTLE',terminal:false,variant}),null);
 for(const operation of ['ENCOUNTER','TRAVEL','START_TRIAL'])assert.equal(castForNotice({operation,terminal:false,variant:'sword-attack'}),null);
 assert.equal(castForNotice({operation:'BATTLE',terminal:true,variant:'sword-attack'}),null);
});

test('the complete cast and twelve-pixel glow fit real actor space without crossing status, head or exchange copy',()=>{
 const cases=[
  {actor:{left:384.34317,right:628.08914,top:295.51965,bottom:539.265625},scene:{left:40,right:1400,top:184,bottom:539.265625},obstacles:[
   {left:58,right:466,top:200,bottom:391.78125},{left:974,right:1382,top:200,bottom:364.390625},
   {left:384.34317,right:628.08914,top:295.51965,bottom:376.76831},{left:695.984,right:743.984,top:377.890625,bottom:410.890625},
   {left:656.984,right:782.984,top:420.890625,bottom:440.890625},
  ]},
  {actor:{left:834.61917,right:1130.3223,top:302.296875,bottom:598},scene:{left:40,right:1400,top:184,bottom:606.4375},obstacles:[
   {left:58,right:466,top:200,bottom:391.78125},{left:974,right:1382,top:200,bottom:364.390625},
   {left:695.984,right:743.984,top:402.0625,bottom:435.0625},{left:656.984,right:782.984,top:445.0625,bottom:465.0625},
  ]},
 ];
 for(const {actor,scene,obstacles}of cases){
  const raw=JSON.stringify({actor,scene,obstacles}),spot=fitBattleCast(actor,scene,obstacles);assert.ok(spot);assert.equal(spot.size,128);
  const half=spot.size/2+12,outer={left:spot.x-half,right:spot.x+half,top:spot.y-half,bottom:spot.y+half};
  for(const bounds of [actor,scene])assert.ok(outer.left>=bounds.left&&outer.right<=bounds.right&&outer.top>=bounds.top&&outer.bottom<=bounds.bottom);
  for(const b of obstacles)assert.equal(outer.left<b.right&&outer.right>b.left&&outer.top<b.bottom&&outer.bottom>b.top,false);
  assert.equal(JSON.stringify({actor,scene,obstacles}),raw);
 }
 const actor={left:0,right:200,top:0,bottom:200};assert.equal(fitBattleCast(actor,actor,[actor]),null);
 assert.equal(fitBattleCast(actor,{left:300,right:500,top:300,bottom:500},[]),null);
 assert.equal(fitBattleCast({left:0,right:112,top:0,bottom:112},actor,[]).size,88);
});
