import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import {resolve,validateGame} from '../src/full/engine.ts';
import {createActivity,completeActivity,pauseActivity,resumeActivity} from '../src/full/activity.ts';
import {writeObservation,loadedObservation} from '../web/src/local-events.ts';
import {createActivityEffectTracker} from '../web/src/activity-effects.ts';
import {supplyActivityMatches,supplyCommandMatches} from '../web/src/supply-effects.ts';
import {fullRoute} from './full-route.mjs';

// Validated independent rule fixtures only. These do not prove elapsed time, pixels or persistence.
const route=fullRoute();let serial=81000;
const uuid=()=> '00000000-0000-4000-8000-'+(serial++).toString(16).padStart(12,'0');
function frame(kind='buy',id='herb',cycles=1){
 const before=structuredClone(route.checkpoints.trial);before.core.runId=uuid();before.core.world.location=kind==='buy'||kind==='sell'?'market':'cave';before.core.player.stones=10000;
 for(const k of Object.keys(C.items))before.core.inventory[k]=10;
 if(kind==='use'||kind==='rest'){before.core.player.hp=1;before.core.player.mp=0;}
 validateGame(before);
 const plan=kind==='buy'?{kind,item:id,maxCycles:cycles,until:'cycles',targetQuantity:null,stoneBudget:C.items[id].buy*cycles,stoneReserve:0}:kind==='sell'?{kind,item:id,maxCycles:cycles,itemReserve:2}:kind==='use'?{kind,item:id,maxCycles:cycles,targetPercent:100,itemReserve:2}:{kind,maxCycles:1,remainingMonthsReserve:1};
 const prior=createActivity(before,plan,{id:uuid(),ownerId:'supply-test',commandId:uuid(),now:1000});return settle(before,prior);
}
function settle(before,prior){const {nextState:game,result}=resolve(before,prior.nextCommand),activity=completeActivity(game,prior,result,{commandId:prior.nextCommand.commandId,now:prior.dueAt}),observation=writeObservation(before,game,{kind:'action',command:prior.nextCommand},result,false);return{before,prior,game,result,activity,observation};}
function armed(f){const kind=f.prior.plan.kind,id=f.prior.plan.item??'',t=createActivityEffectTracker(a=>supplyActivityMatches(kind,id,a),5);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);return t;}
const consume=(t,f,replayed=false,eligible=true)=>t.consume(f.observation,f.game,f.activity,f.result,replayed,eligible);
const examples=()=>[frame(),frame('sell'),frame('use','healing_pill'),frame('use','spirit_pill'),frame('rest')];

test('all fourteen purchases and nine legal sales prove the complete actual one-item exchange without time or reward mutation',()=>{
 for(const [id,item]of Object.entries(C.items))for(const kind of item.sell===null?['buy']:['buy','sell']){const f=frame(kind,id),raw=JSON.stringify(f),notice=consume(armed(f),f);assert.ok(notice,kind+id);assert.equal(notice.operation,kind.toUpperCase());assert.equal(notice.icon.id,id);assert.equal(f.prior.cycleMs,15000);assert.equal(f.result.executedSteps,1);assert.equal(f.result.delta.inventory[id],kind==='buy'?1:-1);assert.equal(f.result.delta.stones,kind==='buy'?-item.buy:item.sell);assert.equal(f.game.core.world.elapsedMonths,f.before.core.world.elapsedMonths);assert.equal(JSON.stringify(f),raw);}
});
test('both medicines and one-month rest report only their formally saved capped restoration',()=>{
 for(const f of examples().slice(2)){assert.ok(consume(armed(f),f));assert.equal(f.prior.cycleMs,f.result.type==='REST'?30000:6000);assert.equal(f.game.core.player.hp-f.before.core.player.hp,f.result.delta.hp);assert.equal(f.game.core.player.mp-f.before.core.player.mp,f.result.delta.mp);assert.equal(f.result.costs.months,f.result.type==='REST'?12:0);if(f.result.type==='USE')assert.equal(f.result.delta.inventory[f.prior.plan.item],-1);}
});
test('supply adapters reject wrong kind item command and unrelated preparation domains, preserving default admission',()=>{
 for(const f of examples()){const kind=f.prior.plan.kind,id=f.prior.plan.item??'';assert.equal(supplyActivityMatches(kind,id,f.prior),true);assert.equal(supplyCommandMatches(kind,id,f.prior.nextCommand),true);if(kind!=='rest'){assert.equal(supplyActivityMatches(kind,'wrong-item',f.prior),false);assert.equal(supplyCommandMatches(kind,'wrong-item',f.prior.nextCommand),false);}for(const other of ['buy','sell','use','rest'].filter(x=>x!==kind)){assert.equal(supplyActivityMatches(other,id,f.prior),false);assert.equal(supplyCommandMatches(other,id,f.prior.nextCommand),false);}for(const extra of [0,4]){const t=createActivityEffectTracker(()=>true,extra);t.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(t,f),null);}assert.equal(supplyActivityMatches(kind,id,{...f.prior,version:4}),false);assert.equal(supplyCommandMatches(kind,id,null),false);}
 const g=structuredClone(examples()[0].before);g.core.world.location='sect';g.school=null;g.learned=[];g.loadout={mind:null,builder:null,finisher:null,relic:null};g.core.learnedSkills=[];g.core.player.hp=1;g.core.player.mp=0;validateGame(g);
 for(const plan of [{kind:'learn',skills:['sword_mind'],maxCycles:1,stoneBudget:0,stoneReserve:0},{kind:'study',manual:'jinghong',maxCycles:1,stoneBudget:80,stoneReserve:0}]){const a=createActivity(g,plan,{id:uuid(),ownerId:'unrelated',commandId:uuid(),now:1000});for(const kind of ['buy','sell','use','rest']){assert.equal(supplyActivityMatches(kind,'herb',a),false);assert.equal(supplyCommandMatches(kind,'herb',a.nextCommand),false);}}
});
test('each authorized trade cycle has its own arm and previously saved or refreshed results never become another gain',()=>{
 for(const kind of ['buy','sell']){const f=frame(kind,'herb',2),second=settle(f.game,f.activity),t=armed(f);assert.ok(consume(t,f));assert.equal(consume(t,second),null);t.arm(second.prior,second.before,second.prior.id,second.prior.generation);assert.ok(consume(t,second));assert.equal(consume(t,second),null);const refreshed=createActivityEffectTracker(()=>true,5);refreshed.arm(second.activity,second.game,second.activity.id,second.activity.generation);assert.equal(consume(refreshed,second),null);}
});
test('failed hidden foreign and replay observations cannot fake delivery or swallow a genuine same-cycle retry',()=>{
 for(const f of examples()){const t=armed(f);assert.equal(consume(t,f,false,false),null);assert.equal(t.consume(loadedObservation(f.game,'sync'),f.game,f.activity,f.result,false,true),null);const error=structuredClone(f);error.observation.errorCode='STORAGE_QUOTA';assert.equal(consume(t,error),null);const foreign=structuredClone(f);foreign.observation.sourceRunId=uuid();assert.equal(consume(t,foreign),null);assert.ok(consume(t,f));assert.equal(consume(t,f),null);for(const flag of ['argument','observation','kind']){const q=armed(f),old=structuredClone(f);if(flag==='observation')old.observation.replayed=true;if(flag==='kind')old.observation.kind='replay';assert.equal(consume(q,old,flag==='argument'),null);q.clear();q.arm(f.prior,f.before,f.prior.id,f.prior.generation);assert.equal(consume(q,f),null);}}
});
test('pause takeover and new generation fence the abandoned supply command without changing saved gains',()=>{
 for(const f of examples()){const paused=pauseActivity(f.prior),resumed=resumeActivity(f.before,paused,{ownerId:'new-owner',commandId:uuid(),now:100000}),next=settle(f.before,resumed),t=armed(f);t.clear();assert.equal(consume(t,f),null);t.arm(resumed,next.before,resumed.id,resumed.generation);assert.equal(consume(t,f),null);assert.ok(consume(t,next),f.prior.plan.kind);assert.notEqual(resumed.nextCommand.commandId,f.prior.nextCommand.commandId);}
});
test('complete supply proof rejects forged narrative, costs, accumulated stock, budget, owner and period',()=>{
 for(const f of examples()){
  for(const change of [g=>g.journal[0]='伪造来历',g=>g.core.player.stones++,g=>g.core.inventory.dao++,g=>g.loadout.relic='cloud_mirror']){const bad=structuredClone(f);change(bad.game);assert.equal(consume(armed(f),bad),null);}
  for(const change of [r=>r.costs.months++,r=>r.delta.hp++,r=>r.delta.stones++,r=>r.versions.balanceVersion='wrong']){const bad=structuredClone(f);change(bad.result);bad.observation=writeObservation(bad.before,bad.game,{kind:'action',command:bad.prior.nextCommand},bad.result,false);assert.equal(consume(armed(f),bad),null);}
  for(const change of [a=>a.ownerId='other-page',a=>a.cycleMs++,a=>a.completedCycles++,a=>a.spentItems.herb=99,a=>a.plan.maxCycles++]){const bad=structuredClone(f);change(bad.activity);assert.equal(consume(armed(f),bad),null);}
 }
});
