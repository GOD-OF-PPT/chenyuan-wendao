import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolve} from '../src/full/engine.ts';
import {guidanceFor,guideCatalog} from '../web/src/guidance.ts';

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
 route.act({type:'TRAVEL',location:'wilderness'});check(route.act({type:'SOURCE',sourceId:'herbs'}),'materials');
});
test('a stale or different-run receipt cannot announce a current action in guidance',()=>{
 const route=path();for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:5},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'},{type:'TRAVEL',location:'wilderness'},{type:'SOURCE',sourceId:'herbs'}])route.act(action);
 const{game,result}=route.current();assert.equal(guidanceFor(game,result).id,'materials');
 for(const patch of [{runId:'another-run'},{revisionAfter:game.core.revision-1},{phaseAfter:'opening'}])assert.equal(guidanceFor(game,{...result,...patch}).id,'cultivation');
 assert.equal(guidanceFor(null,result).id,'welcome');assert.ok(guideCatalog.some(g=>g.id==='save'&&g.body.includes('不是云档')));
});
