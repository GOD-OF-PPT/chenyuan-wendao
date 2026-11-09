import test from 'node:test';
import assert from 'node:assert/strict';
import {driver} from './full-route.mjs';
import * as C from '../src/full/content.ts';
import {getTrackedGoal} from '../src/full/goals.ts';
import {hudGoalObject} from '../web/src/hud-goal.ts';
function fixture(realm){const d=driver();while(d.game.core.player.realm!==realm)d.realm();d.go('cave');return d;}
const context=(g,target={kind:'breakthrough'})=>({runId:g.core.runId,revision:g.core.revision,goal:getTrackedGoal(g,target)});
test('the five actual mainline deficits use their existing item identities and current stock without changing either input',()=>{
 for(const realm of ['qi','foundation','golden','nascent','spirit']){
  const d=fixture(realm),g=d.game,c=context(g),before=structuredClone({g,c});const v=hudGoalObject(g,c);
  assert.equal(v.id,C.realms[realm].pill);assert.equal(v.name,C.items[v.id].name);assert.equal(v.have,g.core.inventory[v.id]);assert.equal(v.missing,1);assert.equal(v.xp,true);assert.deepEqual({g,c},before);
 }
});
test('a fully cultivated but unprepared mainline is distinct from a genuinely acquired required item',()=>{
 const d=fixture('qi');d.meditate();const g=d.game,v=hudGoalObject(g,context(g));assert.equal(v.id,'foundation_pill');assert.equal(v.xp,false);d.buy('foundation_pill',1);assert.equal(hudGoalObject(d.game,context(d.game)),null);
});
test('missing old foreign or inconsistent context and non-mainline targets do not borrow the mainline diagram',()=>{
 const g=fixture('qi').game,c=context(g);assert.equal(hudGoalObject(g,null),null);
 for(const mutate of [x=>x.runId+='foreign',x=>x.revision++,x=>x.goal.completed=true,x=>x.goal.deficits.find(d=>d.kind==='item').have++,x=>x.goal.deficits.find(d=>d.kind==='item').missing++,x=>x.goal.requiredItems.foundation_pill=2]){const x=structuredClone(c);mutate(x);assert.equal(hudGoalObject(g,x),null);}
 for(const target of [{kind:'item',id:'herb',quantity:2},{kind:'skill',id:'sword_guard'},{kind:'relic',id:'jade_seal'},{kind:'event',id:'shen_return'}])assert.equal(hudGoalObject(g,context(g,target)),null);
 const d=fixture('qi');d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});assert.equal(hudGoalObject(d.game,context(d.game)),null);assert.equal(hudGoalObject({...g,status:'ended'},c),null);
});
