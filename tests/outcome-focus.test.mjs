import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackExamples} from './action-feedback-fixtures.mjs';
import {resolve} from '../src/full/engine.ts';
import * as C from '../src/full/content.ts';
import {outcome,formatCosts,formatDelta} from '../web/src/presentation.ts';
import {writeObservation} from '../web/src/local-events.ts';
import {createActionFeedbackTracker} from '../web/src/action-feedback.ts';
const examples=feedbackExamples();
for(const [type,ex] of examples.actions)test('actual '+type+' outcome is readonly and all non-configuration deltas remain exact',()=>{
 const command={...ex.action,commandId:'00000000-0000-4000-8000-000000004321',runId:ex.before.core.runId,expectedRevision:ex.before.core.revision};const {result,nextState:g}=resolve(ex.before,command),before=structuredClone([result,g,ex.action]);const text=outcome(result,g,ex.action);
 if(['SCHOOL','EQUIP','EQUIP_RELIC'].includes(type)){assert.notEqual(text,'物资未变化');assert.equal(formatDelta(result.delta),'物资未变化');assert.equal(formatCosts(result.costs),'不消耗物资');const effect=type==='SCHOOL'?C.skills[g.loadout.mind].description:type==='EQUIP'?C.skills[ex.action.skill].description:C.relics[ex.action.relic].description;assert.ok(text.includes(effect));if(type==='EQUIP')assert.equal(outcome(result,g),g.journal.at(-1));const observation=writeObservation(ex.before,g,{kind:'action',command},result,false),tracker=createActionFeedbackTracker();assert.equal(tracker.consume(observation,g,result,false,true,ex.before).delta,text);assert.equal(tracker.consume(observation,g,result,false,true,ex.before),null);assert.equal(createActionFeedbackTracker().consume({...observation,replayed:true},g,result,true,true,ex.before),null);}
 else assert.equal(text,formatDelta(result.delta));assert.deepEqual([result,g,ex.action],before);
});
test('foreign or later snapshots and unexecuted results cannot describe a fresh configuration',()=>{for(const type of ['SCHOOL','EQUIP','EQUIP_RELIC']){const ex=examples.actions.get(type),{result,nextState:g}=resolve(ex.before,{...ex.action,commandId:'outcome-stale',runId:ex.before.core.runId,expectedRevision:ex.before.core.revision});for(const patch of [{runId:'other'},{revisionAfter:result.revisionAfter+1},{executedSteps:0}])assert.equal(outcome({...result,...patch},g,ex.action),formatDelta(result.delta));}});
