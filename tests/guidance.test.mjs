import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolve} from '../src/full/engine.ts';
import {guidanceFor,guideCatalog} from '../web/src/guidance.ts';
import {driver} from './full-route.mjs';

function path(){
 let game=newGame('行道回归','guidance-run'),result=null;
 const act=action=>{({nextState:game,result}=resolve(game,{...action,commandId:'guide-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision}));return{game,result};};
 return{act,current:()=>({game,result})};
}
test('guidance follows actual paid actions while all Game fields remain read-only',()=>{
 const route=path();const check=(state,id)=>{const before=structuredClone(state.game);assert.equal(guidanceFor(state.game,state.result).id,id);assert.deepEqual(state.game,before);};
 check(route.current(),'opening');check(route.act({type:'CHOOSE',choice:'leave'}),'cultivation');check(route.act({type:'TRAVEL',location:'cave'}),'cultivation');
 check(route.act({type:'CULTIVATE',method:'natural',count:5}),'breakthrough');check(route.act({type:'BREAKTHROUGH'}),'equipment');check(route.act({type:'SCHOOL',school:'sword'}),'equipment');
 check(route.act({type:'TRAVEL',location:'wilderness'}),'cultivation');check(route.act({type:'SOURCE',sourceId:'herbs'}),'materials');check(route.act({type:'ENCOUNTER',enemy:'wolf'}),'battle');
 check(route.act({type:'BATTLE',move:'attack'}),'battle');check(route.act({type:'BATTLE',move:'flee'}),'recovery');
 route.act({type:'TRAVEL',location:'wilderness'});check(route.act({type:'SOURCE',sourceId:'herbs'}),'recovery');
});
test('a stale or different-run receipt cannot announce a current action in guidance',()=>{
 const route=path();for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:5},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'},{type:'TRAVEL',location:'wilderness'},{type:'SOURCE',sourceId:'herbs'}])route.act(action);
 const{game,result}=route.current();assert.equal(guidanceFor(game,result).id,'materials');
 for(const patch of [{runId:'another-run'},{revisionAfter:game.core.revision-1},{phaseAfter:'opening'}])assert.equal(guidanceFor(game,{...result,...patch}).id,'cultivation');
 assert.equal(guidanceFor(null,result).id,'welcome');assert.ok(guideCatalog.some(g=>g.id==='save'&&g.body.includes('不是云档')));
});
test('causal rewards and battle loot teach material uses even when recovery is also needed',()=>{
 const ready=()=>{const r=path();for(const a of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:5},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'}])r.act(a);return r;};
 const causal=ready();causal.act({type:'EVENT',event:'local_rain'});const paid=causal.act({type:'DECIDE',option:'exchange'}),copy=structuredClone(paid.game);assert.equal(paid.result.delta.inventory.herb,1);assert.equal(guidanceFor(paid.game,paid.result).id,'materials');assert.deepEqual(paid.game,copy);
 const combat=ready();for(const a of [{type:'TRAVEL',location:'wilderness'},{type:'ENCOUNTER',enemy:'wolf'},{type:'BATTLE',move:'attack'},{type:'BATTLE',move:'technique'},{type:'BATTLE',move:'release'}])combat.act(a);
 const loot=combat.current(),original=structuredClone(loot.game);assert.equal(loot.game.battle,null);assert.equal(loot.result.delta.inventory.core,1);assert.ok(loot.game.core.player.hp<100);assert.equal(guidanceFor(loot.game,loot.result).id,'materials');assert.deepEqual(loot.game,original);
});
for(const type of ['SOURCE','BUY','CRAFT'])for(const [injured,full,id]of [[true,false,'recovery'],[false,true,'breakthrough'],[true,true,'recovery']])test(`${type} receipt yields to ${id} at the current lawful stage (injured=${injured},full=${full})`,()=>{
 const d=driver();if(type==='CRAFT')d.resource('herb',2);if(full)d.meditate();if(injured){d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'flee'});}
 const action=type==='SOURCE'?{type,sourceId:'herbs'}:type==='BUY'?{type,item:'healing_pill',quantity:1}:{type,recipeId:'healing'};d.go(type==='SOURCE'?'wilderness':type==='BUY'?'market':'cave');
 const {nextState:game,result}=resolve(d.game,{...action,commandId:'stage-priority',runId:d.game.core.runId,expectedRevision:d.game.core.revision}),before=structuredClone(game),receipt=structuredClone(result);assert.equal(result.type,type);assert.equal(guidanceFor(game,result).id,id);assert.deepEqual(game,before);assert.deepEqual(result,receipt);
});
test('a current full spirit source receipt preserves trial preparation guidance without entering the trial',()=>{
 const d=driver();for(let n=0;n<4;n++)d.realm();d.meditate();d.go('sect');const {nextState:game,result}=resolve(d.game,{type:'SOURCE',sourceId:'work_spirit',commandId:'trial-stage-priority',runId:d.game.core.runId,expectedRevision:d.game.core.revision}),before=structuredClone(game);assert.equal(guidanceFor(game,result).id,'trial');assert.deepEqual(game,before);assert.equal(game.trial,null);
});
