import test from 'node:test';
import assert from 'node:assert/strict';
import { scenePresentation } from '../web/src/scene-presentation.ts';
import { newGame, advance } from '../src/full/engine.ts';
import { driver } from './full-route.mjs';
import { trialJourneyScenario } from './trial-journey-route.mjs';

test('early realms never display an open gate and each legal location uses its own motif',()=>{
 const d=driver();d.realm();
 for(const [location,key] of Object.entries({cave:'settlement',sect:'settlement',market:'settlement',secret:'secret',wilderness:'wilderness'})){
  d.go(location);const before=JSON.stringify(d.game);assert.deepEqual(scenePresentation(d.game),{key,location,phase:'idle',gate:'none',compact:false});assert.equal(JSON.stringify(d.game),before);
 }
 assert.equal(scenePresentation(newGame('初遇','scene-opening')).compact,true);
});
test('the real question and three gates stay closed or stormy until the trial ending',()=>{
 const r=trialJourneyScenario(),raw=JSON.stringify(r.states);
 for(const g of r.states){const view=scenePresentation(g);assert.equal(view.key,'terrace');assert.equal(view.gate,g.trial?.stage===4?'opened':g.battle?'storm':'closed');}
 assert.equal(JSON.stringify(r.states),raw);
});
test('both committed ascensions retain opened gate without inventing further gameplay',()=>{
 const g=trialJourneyScenario().states.at(-1),raw=JSON.stringify(g);
 for(const ending of ['transmit','depart']){const done=advance(g,{type:'END',ending,commandId:'scene-'+ending,runId:g.core.runId,expectedRevision:g.core.revision});assert.equal(scenePresentation(done).gate,'opened');assert.equal(scenePresentation(done).phase,'ascended');assert.equal(scenePresentation(done).compact,false);}
 assert.equal(JSON.stringify(g),raw);
});
test('retiring on a terrace never fakes a successful gate',()=>{
 const prepared=trialJourneyScenario().prepared,done=advance(prepared,{type:'RETIRE',commandId:'scene-retire',runId:prepared.core.runId,expectedRevision:prepared.core.revision});assert.equal(scenePresentation(done).gate,'closed');assert.equal(scenePresentation(done).phase,'ended');
});
