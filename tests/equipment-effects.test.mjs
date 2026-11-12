import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import {newGame,resolve} from '../src/full/engine.ts';
import {createActivity,completeActivity,pauseActivity,resumeActivity} from '../src/full/activity.ts';
import {writeObservation,loadedObservation} from '../web/src/local-events.ts';
import {createActivityEffectTracker} from '../web/src/activity-effects.ts';
import {createConfigurationEchoTracker,equipmentActivityMatches} from '../web/src/equipment-effects.ts';
import {driver} from './full-route.mjs';

// Formal rule/ownership examples only; not elapsed real time, IDB, UI or human acceptance.
let identity=70000;
const uuid=()=> '00000000-0000-4000-8000-'+(identity++).toString(16).padStart(12,'0');
function lawful(actions){let g=newGame('经器反馈',uuid());for(const action of actions)g=resolve(g,{...action,commandId:uuid(),runId:g.core.runId,expectedRevision:g.core.revision}).nextState;return g;}
const games=new Map();
function prepared(kind,id){const key=kind+':'+id;if(!games.has(key)){const d=driver();if(kind==='forge'){while(C.rank(d.game.core.player.realm)<C.rank('golden'))d.realm();for(const[item,n]of Object.entries(C.relics[id].inputs))d.resource(item,n);d.funds(C.relics[id].stones);d.go('cave');}else{d.realm();d.funds(300);d.go('sect');}games.set(key,lawful(d.actions));}return structuredClone(games.get(key));}
function plan(kind,id){return kind==='forge'?{kind,relicId:id,maxCycles:1,stoneBudget:C.relics[id].stones,stoneReserve:0,monthBudget:24,remainingMonthsReserve:1,itemReserves:{}}:kind==='study'?{kind,manual:'jinghong',maxCycles:1,stoneBudget:80,stoneReserve:0}:{kind,skills:[id],maxCycles:1,stoneBudget:C.skills[id].price,stoneReserve:0};}
function settle(before,prior){const command=prior.nextCommand;assert.ok(command);const {nextState:game,result}=resolve(before,command),activity=completeActivity(game,prior,result,{commandId:command.commandId,now:prior.dueAt}),observation=writeObservation(before,game,{kind:'action',command},result,false);return{before,prior,game,result,activity,observation};}
function frame(kind='learn',id='sword_still',p=plan(kind,id),before=prepared(kind,id)){return settle(before,createActivity(before,p,{id:uuid(),ownerId:'visible-equipment',commandId:uuid(),now:1000}));}
const match=(kind,id)=>a=>kind==='forge'?a.version===4&&a.plan.relicId===id:a.version===5&&a.plan.kind===kind&&(kind==='learn'?a.plan.skills.includes(id):a.plan.manual===id);
function armed(f,extra=f.prior.version){const kind=f.prior.plan.kind,id=kind==='forge'?f.prior.plan.relicId:kind==='learn'?f.prior.plan.skills[0]:'jinghong',t=createActivityEffectTracker(match(kind,id),extra);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);return t;}
const consume=(t,f,replayed=false,eligible=true)=>t.consume(f.observation,f.game,f.activity,f.result,replayed,eligible);
const examples=()=>[frame('forge','jade_seal'),frame('learn','sword_still'),frame('study','jinghong')];

test('explicit version four yields each actual relic only after its complete formal forging period',()=>{
 for(const id of Object.keys(C.relics)){const f=frame('forge',id),raw=JSON.stringify(f),notice=consume(armed(f,4),f);assert.ok(notice,id);assert.equal(notice.operation,'FORGE');assert.equal(notice.icon.id,id);assert.equal(f.prior.cycleMs,60000);assert.equal(f.activity.status,'stopped');assert.equal(f.activity.completedCycles,1);assert.deepEqual(f.result.costs.items,C.relics[id].inputs);assert.equal(f.result.costs.stones,C.relics[id].stones);assert.equal(f.game.ownedRelics.includes(id),true);assert.equal(f.game.loadout.relic,f.before.loadout.relic);assert.equal(JSON.stringify(f),raw);}
});

test('explicit version five learns cross-school real skills without equipping them and studies the sword manual once',()=>{
 for(const [kind,id] of [['learn','sword_still'],['learn','talisman_calm'],['study','jinghong']]){const f=frame(kind,id),notice=consume(armed(f,5),f);assert.ok(notice,kind+id);assert.equal(notice.operation,kind==='learn'?'LEARN':'STUDY');assert.equal(f.prior.cycleMs,kind==='learn'?30000:60000);assert.deepEqual(f.game.loadout,f.before.loadout);assert.equal(f.game.school,f.before.school);if(kind==='learn'){assert.equal(f.game.learned.includes(id),true);assert.equal(f.result.costs.stones,C.skills[id].price);}else{assert.equal(f.game.core.learnedSkills.includes(C.swordManual.id),true);assert.equal(f.result.costs.stones,80);}}
});

test('default and explicit zero keep old admission closed to lawful forge and preparation effects',()=>{
 for(const f of examples())for(const args of [[],[0]]){const t=createActivityEffectTracker(()=>true,...args);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);}
});

test('a malformed zero-version arm cannot steal a legitimate default source cycle',()=>{
 const d=driver();d.go('wilderness');const before=lawful(d.actions),p={kind:'source',sourceId:'herbs',maxCycles:1,until:'cycles',target:null,monthBudget:12,remainingMonthsReserve:1},f=settle(before,createActivity(before,p,{id:uuid(),ownerId:'source',commandId:uuid(),now:1000})),t=createActivityEffectTracker(()=>true);
 t.arm(f.prior,before,f.prior.id,f.prior.generation);const malformed=structuredClone(f.prior);malformed.version=0;malformed.nextCommand.commandId='malformed-other-cycle';t.arm(malformed,before,malformed.id,malformed.generation);assert.ok(consume(t,f));
});

test('an explicit extra version never admits a different valid equipment domain',()=>{
 for(const f of examples()){const wrong=f.prior.version===4?5:4;assert.equal(consume(armed(f,wrong),f),null);const t=createActivityEffectTracker(()=>false,f.prior.version);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);}
 const before=prepared('learn','sword_still'),d=driver();d.go('market');const g=lawful(d.actions),buy={kind:'buy',item:'healing_pill',maxCycles:1,until:'cycles',targetQuantity:null,stoneBudget:18,stoneReserve:0},f=settle(g,createActivity(g,buy,{id:uuid(),ownerId:'unrelated-buy',commandId:uuid(),now:1000}));
 assert.ok(before);const t=createActivityEffectTracker(a=>equipmentActivityMatches('learn','sword_still',a),5);t.arm(f.prior,g,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);
});

test('the whole learning plan retains the completed previous scroll when nextCommand advances',()=>{
 const p={kind:'learn',skills:['sword_still','talisman_calm'],maxCycles:2,stoneBudget:200,stoneReserve:0},first=frame('learn','sword_still',p),second=settle(first.game,first.activity),t=armed(first,5);
 assert.equal(first.activity.nextCommand.skill,'talisman_calm');assert.ok(consume(t,first));assert.equal(consume(t,second),null);t.arm(second.prior,second.before,second.prior.id,second.prior.generation);assert.ok(consume(t,second));assert.equal(second.activity.status,'stopped');assert.deepEqual(second.game.loadout,first.before.loadout);
});

test('equipment effects are one-shot and all replay signals remain observed without exposing cycle ids',()=>{
 for(const f of examples()){const raw=JSON.stringify(f),t=armed(f);assert.ok(consume(t,f));assert.equal(consume(t,f),null);t.clear();t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);assert.equal(f.observation.commandId,null);assert.equal(f.observation.identifiersRedacted,true);assert.equal(JSON.stringify(f),raw);
  for(const mode of ['argument','observation','kind']){const q=armed(f),other=structuredClone(f);if(mode==='observation')other.observation.replayed=true;if(mode==='kind')other.observation.kind='replay';assert.equal(consume(q,other,mode==='argument'),null);q.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(q,f),null);}}
});

test('hidden, failed, foreign or paused equipment cannot manufacture effects; a current successful retry still works',()=>{
 for(const f of examples()){const t=armed(f);assert.equal(consume(t,f,false,false),null);assert.equal(consume(t,{...f,observation:{...f.observation,kind:'save_error',errorCode:'STORAGE_QUOTA'}}),null);assert.equal(t.consume(loadedObservation(f.game,'sync'),f.game,f.activity,f.result,false,true),null);assert.ok(consume(t,f));
  for(const change of [o=>o.sourceRunId=uuid(),o=>o.runId=uuid(),o=>o.observedRevision++,o=>o.action.extra='foreign']){const other=structuredClone(f);change(other.observation);const q=armed(f);assert.equal(consume(q,other),null);assert.ok(consume(q,f));}
  const q=createActivityEffectTracker(()=>true,f.prior.version);q.arm({...f.prior,status:'paused'},f.before,f.prior.id,f.prior.generation);assert.equal(consume(q,f),null);}
});

test('explicit resumed generations replace abandoned equipment cycles and clear withdraws old ownership',()=>{
 for(const f of examples()){const paused=pauseActivity(f.prior),resumed=resumeActivity(f.before,paused,{ownerId:'resumed-equipment',commandId:uuid(),now:100000}),next=settle(f.before,resumed),t=armed(f);t.clear();assert.equal(consume(t,f),null);t.arm(resumed,f.before,resumed.id,resumed.generation);assert.notEqual(resumed.generation,f.prior.generation);assert.equal(consume(t,f),null);assert.ok(consume(t,next));}
});

test('complete Game result and Activity proofs reject forged nonnumeric state and matched public private changes',()=>{
 for(const f of examples()){
  for(const change of [g=>g.journal[0]='伪造经历',g=>g.loadout.relic='frost_sword',g=>g.choices.forged='other']){const other=structuredClone(f);change(other.game);assert.equal(consume(armed(f),other),null);}
  for(const change of [r=>r.costs.stones++,r=>r.delta.xp++,r=>r.versions.balanceVersion='other']){const other=structuredClone(f);change(other.result);other.observation=writeObservation(other.before,other.game,{kind:'action',command:other.prior.nextCommand},other.result,false);assert.equal(consume(armed(f),other),null);}
  for(const change of [a=>a.ownerId='other-page',a=>a.generation++,a=>a.revision++,a=>a.completedCycles++,a=>a.plan.stoneBudget++,a=>a.cycleMs++]){const other=structuredClone(f);change(other.activity);assert.equal(consume(armed(f),other),null);}
 }
});

test('the actual equipment adapter matches the whole selected learning queue but rejects all other preparation plans',()=>{
 const p={kind:'learn',skills:['sword_still','talisman_calm'],maxCycles:2,stoneBudget:200,stoneReserve:0},f=frame('learn','sword_still',p);
 assert.equal(equipmentActivityMatches('learn','sword_still',f.prior),true);assert.equal(equipmentActivityMatches('learn','sword_still',f.activity),true);assert.equal(f.activity.nextCommand.skill,'talisman_calm');
 assert.equal(equipmentActivityMatches('learn','sword_echo',f.activity),false);assert.equal(equipmentActivityMatches('study','jinghong',f.activity),false);assert.equal(equipmentActivityMatches('forge','jade_seal',f.activity),false);
 const g=frame('study','jinghong');assert.equal(equipmentActivityMatches('study','jinghong',g.prior),true);assert.equal(equipmentActivityMatches('study',C.swordManual.id,g.prior),false);
});

function configurationFrame(type){
 let before=type==='EQUIP_RELIC'?frame('forge','jade_seal').game:prepared('learn','sword_still');
 if(type==='EQUIP')before=resolve(before,{type:'LEARN',skill:'sword_still',commandId:uuid(),runId:before.core.runId,expectedRevision:before.core.revision}).nextState;
 const action=type==='SCHOOL'?{type,school:'talisman'}:type==='EQUIP'?{type,skill:'sword_still'}:{type,relic:'jade_seal'},command={...action,commandId:uuid(),runId:before.core.runId,expectedRevision:before.core.revision};
 const {nextState:game,result}=resolve(before,command),observation=writeObservation(before,game,{kind:'action',command},result,false);return{before,command,game,result,observation};
}
const echo=(t,f,replayed=false,eligible=true)=>t.consume(f.observation,f.game,f.result,replayed,eligible,f.before);

test('each actual atomic configuration reports only its changed slots with no extra cost or equipped reward',()=>{
 for(const [type,slots] of [['SCHOOL',['mind','builder','finisher']],['EQUIP',['mind']],['EQUIP_RELIC',['relic']]]){
  const f=configurationFrame(type),raw=JSON.stringify(f),t=createConfigurationEchoTracker(),notice=echo(t,f);assert.ok(notice,type);assert.equal(notice.notice.operation,type);assert.deepEqual(notice.slots,slots);assert.deepEqual(notice.result,f.result);assert.deepEqual(f.result.costs,{stones:0,mp:0,months:0,items:{}});assert.deepEqual(f.game.core.inventory,f.before.core.inventory);assert.equal(JSON.stringify(f),raw);assert.equal(echo(t,f),null);
 }
});

test('configuration replay and trusted but hidden or paused results remain observed rather than being reenacted',()=>{
 for(const type of ['SCHOOL','EQUIP','EQUIP_RELIC'])for(const mode of ['argument','observation','kind','hidden']){
  const f=configurationFrame(type),other=structuredClone(f),t=createConfigurationEchoTracker();if(mode==='observation')other.observation.replayed=true;if(mode==='kind')other.observation.kind='replay';
  assert.equal(echo(t,other,mode==='argument',mode!=='hidden'),null);assert.equal(echo(t,f),null);
 }
});

test('configuration requires the actual complete before Game and private command proof instead of matching visible numbers',()=>{
 for(const type of ['SCHOOL','EQUIP','EQUIP_RELIC']){
  const f=configurationFrame(type);
  for(const change of [g=>g.journal[0]='伪造来历',g=>g.choices.unrecorded='forged',g=>g.core.inventory.dao++,g=>g.core.player.name='另一修士']){const other=structuredClone(f);change(other.game);assert.equal(echo(createConfigurationEchoTracker(),other),null);}
  for(const change of [r=>r.delta.xp++,r=>r.costs.stones++,r=>r.versions.contentVersion='wrong',r=>r.commandId=uuid()]){const other=structuredClone(f);change(other.result);other.observation=writeObservation(other.before,other.game,{kind:'action',command:other.command},other.result,false);assert.equal(echo(createConfigurationEchoTracker(),other),null);}
  const badBefore=structuredClone(f);badBefore.before.loadout.relic='cloud_mirror';assert.equal(echo(createConfigurationEchoTracker(),badBefore),null);assert.equal(createConfigurationEchoTracker().consume(f.observation,f.game,f.result,false,true,null),null);
 }
});

test('foreign configuration observations and error/sync records do not swallow an actual saved confirmation',()=>{
 for(const type of ['SCHOOL','EQUIP','EQUIP_RELIC'])for(const change of [o=>o.commandId=uuid(),o=>o.runId=uuid(),o=>o.sourceRunId=uuid(),o=>o.observedRevision++,o=>o.operation='BUY',o=>o.action.extra='foreign',o=>o.result.delta.stones++,o=>o.errorCode='STORAGE_QUOTA']){
  const f=configurationFrame(type),other=structuredClone(f),t=createConfigurationEchoTracker();change(other.observation);assert.equal(echo(t,other),null);assert.ok(echo(t,f));
 }
 const f=configurationFrame('EQUIP');assert.equal(createConfigurationEchoTracker().consume(loadedObservation(f.game,'sync'),f.game,f.result,false,true,f.before),null);
 const forge=frame('forge','jade_seal');assert.equal(createConfigurationEchoTracker().consume(forge.observation,forge.game,forge.result,false,true,forge.before),null);
});
