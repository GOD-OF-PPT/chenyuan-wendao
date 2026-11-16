import test from 'node:test';
import assert from 'node:assert/strict';
import {trialGuidance} from '../web/src/trial-goal.ts';
import {trialJourneyScenario} from './trial-journey-route.mjs';
import {getTrialJourney} from '../src/full/queries.ts';
import {advance} from '../src/full/engine.ts';
const route=trialJourneyScenario();
for(const stage of [0,1,2,3,4])test(`UX20 stage${stage} reports only the actual committed question and gate facts`,()=>{
 const game=route.states.find(g=>g.trial?.stage===stage),copy=structuredClone(game),v=trialGuidance(game),j=getTrialJourney(game);
 assert.equal(v.stage,stage);assert.deepEqual(v.steps,j.steps);assert.match(v.state,new RegExp(`已过 ${Math.max(0,stage-1)} / 3 关`));assert.equal(v.verb,stage===0?'查看问心选择':stage===4?'查看收卷选择':'查看当前战局');assert.deepEqual(game,copy);
 assert.equal(v.steps.filter(s=>s.status==='complete').length,stage===0?0:stage);
 if(stage===4){assert.match(v.state,/尚未收卷/);assert.match(v.detail,/无需再筹渡劫引/);assert.match(v.detail,/确认.*12秒/);assert.equal(Object.hasOwn(v,'action'),false);}
});
test('UX20 prepared and both already-sealed lives never receive a pending trial view',()=>{
 assert.equal(trialGuidance(route.prepared),null);const g=route.states.at(-1);
 for(const ending of ['transmit','depart']){const end=advance(g,{type:'END',ending,commandId:'ux20-'+ending,runId:g.core.runId,expectedRevision:g.core.revision});assert.equal(trialGuidance(end),null);}
});
