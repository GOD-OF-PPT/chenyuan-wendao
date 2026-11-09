import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import {createActivity,pauseActivity,completeActivity} from '../src/full/activity.ts';
import {resolve,validateGame} from '../src/full/engine.ts';
import {fullRoute} from './full-route.mjs';
import {sourceStockGoal} from '../web/src/source-stock-goal.ts';
const route=fullRoute();
function fixture(id,targetId=Object.keys(C.sources[id].items)[0]??'stones'){
 const s=C.sources[id],game=structuredClone(s.min==='spirit'?route.checkpoints.trial:route.checkpoints[s.min]);game.core.world.location=s.location;validateGame(game);
 const stock=targetId==='stones'?game.core.player.stones:game.core.inventory[targetId],quantity=stock+(targetId==='stones'?s.stones:s.items[targetId]);
 const plan={kind:'source',sourceId:id,maxCycles:2,until:'target',target:targetId==='stones'?{kind:'stones',quantity}:{kind:'item',id:targetId,quantity},monthBudget:s.months*2,remainingMonthsReserve:1};
 return{game,plan,activity:createActivity(game,plan,{id:'goal-'+id,ownerId:'page',commandId:'start-'+id,now:1000}),targetId};
}
test('all sixteen source goals use the persisted target for each actual material and stone yield without mutations',()=>{
 let count=0;
 for(const[id,s]of Object.entries(C.sources))for(const targetId of [...Object.keys(s.items),...(s.stones?['stones']:[])]){
  const f=fixture(id,targetId),before=structuredClone(f);
  assert.deepEqual(sourceStockGoal(f.game,id,f.activity),{id:targetId,target:f.plan.target.quantity,met:false});
  assert.deepEqual(sourceStockGoal(f.game,id,pauseActivity(f.activity)),{id:targetId,target:f.plan.target.quantity,met:false});assert.deepEqual(f,before);count++;
 }
 assert.equal(count,20);
});
test('a real saved complete period marks only a formal met target and preserves overshoot stock',()=>{
 const f=fixture('herbs'),command=f.activity.nextCommand,r=resolve(f.game,command),done=completeActivity(r.nextState,f.activity,r.result,{commandId:command.commandId,now:f.activity.dueAt});
 assert.equal(done.stopReason.code,'TARGET_MET');assert.deepEqual(sourceStockGoal(r.nextState,'herbs',done),{id:'herb',target:f.plan.target.quantity,met:true});
 const over=structuredClone(r.nextState);over.core.inventory.herb+=2;const before=structuredClone(over);assert.equal(sourceStockGoal(over,'herbs',done).target,f.plan.target.quantity);assert.deepEqual(over,before);
});
test('no activity, next draft, another source life realm location revision or non-source activity can borrow a target',()=>{
 const f=fixture('jade_task');assert.equal(sourceStockGoal(f.game,'jade_task',null),null);assert.equal(sourceStockGoal(f.game,'core',f.activity),null);
 for(const change of [a=>a.runId+='foreign',a=>a.gameRevision++,a=>a.realm='mortal',a=>a.version=1,a=>a.plan.until='cycles',a=>a.plan.target=null,a=>a.plan.target={kind:'item',id:'herb',quantity:20},a=>{a.status='stopped';a.stopReason={code:'STATE_CHANGED',message:'changed'};},a=>{a.status='stopped';a.stopReason={code:'TARGET_MET',message:'not actually met'};}]){
  const a=structuredClone(f.activity);change(a);assert.equal(sourceStockGoal(f.game,'jade_task',a),null);
 }
 for(const change of [g=>g.status='ended',g=>g.core.world.location='cave',g=>g.core.revision++,g=>g.core.runId+='new']){const g=structuredClone(f.game);change(g);assert.equal(sourceStockGoal(g,'jade_task',f.activity),null);}
});
