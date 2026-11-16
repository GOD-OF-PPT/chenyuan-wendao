import test from 'node:test';
import assert from 'node:assert/strict';
import {responseContext} from '../web/src/response-context.ts';
import {createActivity,completeActivity,pauseActivity} from '../src/full/activity.ts';
import {resolve} from '../src/full/engine.ts';
import {driver} from './full-route.mjs';
import {narrativeFor} from '../web/src/story-pages.ts';
import {paidResponseFixture,npcResponseFixtures,responseStageFixtures} from './response-context-fixtures.mjs';

function planned(game,action){return createActivity(game,{kind:'milestone',action,maxCycles:1},{id:crypto.randomUUID(),ownerId:crypto.randomUUID(),commandId:crypto.randomUUID(),now:10000});}
function input(game=paidResponseFixture(),action={type:'DECIDE',option:'bargain'},activity=null){return{game,action,activity,identity:narrativeFor(game)?.key??'shen_return',mode:'choices',runtime:null,owned:false,busy:false,blocked:false,pausing:false};}
function freeze(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;}
function pure(i){const before=structuredClone(i),r=responseContext(freeze(i));assert.deepEqual(i,before);assert.deepEqual(Object.keys(r).sort(),['caption','state']);return r;}
function current(){const g=paidResponseFixture(),a=planned(g,{type:'DECIDE',option:'bargain'});return input(g,a.plan.action,a);}

test('response context keeps every actual NPC preselection unaccepted and does not change any input',()=>{
 for(const{game}of npcResponseFixtures()){const model=narrativeFor(game);assert.ok(model);for(const c of model.choices){const r=pure(input(game,c.action));assert.equal(r.state,'draft');assert.match(r.caption,/预选/);assert.doesNotMatch(r.caption,/已安排|已保存/);}}
});
test('a formally created matching response reads its real local cycle without granting a new authority',()=>{
 const i=current();i.runtime={id:i.activity.id,generation:i.activity.generation,phase:'running'};i.owned=true;const r=pure(i);assert.equal(r.state,'running');assert.equal(r.caption,'本次回应已安排');assert.equal(i.activity.completedCycles,0);assert.equal(i.activity.plan.maxCycles,1);
});
test('partial UI snapshots cannot borrow another life revision person or meeting instance',()=>{
 for(const change of [i=>i.game.core.runId=crypto.randomUUID(),i=>i.game.core.revision++,i=>i.identity='lu_intro',i=>i.game.core.activeEvent.instanceId+=':later']){const i=current();change(i);assert.equal(pure(i).state,'draft');}
});
test('another selected signature is readonly even while the original cycle or pause is real',()=>{
 for(const paused of [false,true]){const i=current();if(paused)i.activity=pauseActivity(i.activity);i.action={type:'DECIDE',option:'decline'};i.runtime={id:i.activity.id,generation:i.activity.generation,phase:'running'};i.owned=true;const r=pure(i);assert.equal(r.state,'view');assert.equal(r.caption,'此签仅查看 · 原安排不变');}
});
test('missing mismatched foreign and unknown-phase clocks never claim a local running cycle',()=>{
 for(const alter of [i=>i.runtime=null,i=>i.runtime.id=crypto.randomUUID(),i=>i.runtime.generation++,i=>i.owned=false,i=>i.runtime.phase='unknown']){const i=current();i.owned=true;i.runtime={id:i.activity.id,generation:i.activity.generation,phase:'running'};alter(i);const r=pure(i);assert.equal(r.state,'pending');assert.equal(r.caption,'回应已安排 · 接续见上方');}
});
test('saving pause pending and unavailable progress have distinct truthful priority',()=>{
 const base=current();base.owned=true;base.runtime={id:base.activity.id,generation:base.activity.generation,phase:'saving'};
 assert.equal(pure(structuredClone(base)).state,'saving');const p=structuredClone(base);p.pausing=true;assert.equal(pure(p).caption,'回应已安排 · 正在停手');
 const paused=structuredClone(base);paused.activity=pauseActivity(paused.activity);assert.equal(pure(paused).caption,'回应已暂停 · 沿用原安排');
 const blocked=structuredClone(base);blocked.blocked=true;assert.equal(pure(blocked).caption,'进度待核对 · 请看上方提示');
 const retry=structuredClone(base);retry.runtime=null;retry.busy=true;assert.equal(pure(retry).caption,'正在处理进度 · 请稍候');
});
test('a complete legal visit opens an unanswered meeting rather than a completed response',()=>{
 const d=driver();d.go('sect');const before=structuredClone(d.game),a=planned(before,{type:'EVENT',event:'lu_intro'}),formal=resolve(before,a.nextCommand),done=completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:a.dueAt});
 assert.equal(done.completedCycles,1);const model=narrativeFor(formal.nextState);assert.equal(model.key,'lu_intro');const r=pure(input(formal.nextState,model.choices[0].action,done));assert.equal(r.state,'draft');assert.doesNotMatch(r.caption,/已保存|已安排/);
});
test('a completed response is a stored fact only for its own current revision and selected signature',()=>{
 const i=current(),a=i.activity,formal=resolve(i.game,a.nextCommand),done=completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:a.dueAt});i.game=formal.nextState;i.activity=done;
 assert.equal(pure(structuredClone(i)).caption,'本次回应已保存');const other=structuredClone(i);other.action={type:'DECIDE',option:'decline'};assert.equal(pure(other).state,'view');
 const invalidated=structuredClone(i);invalidated.activity.stopReason={code:'STATE_CHANGED',message:'changed'};assert.equal(pure(invalidated).state,'draft');
 const later=structuredClone(i);later.game.core.revision++;assert.equal(pure(later).state,'draft');
});
test('question and ending preserve their own actual phase stage noun and single selected action',()=>{
 const f=responseStageFixtures();for(const[game,action,noun]of [[f.question,{type:'ANSWER_TRIAL',answer:'accept'},'作答'],[f.ending,{type:'END',ending:'depart'},'收卷']]){
  const a=planned(game,action),i=input(game,action,a);i.owned=true;i.runtime={id:a.id,generation:a.generation,phase:'running'};assert.equal(pure(structuredClone(i)).caption,'本次'+noun+'已安排');
  const stage=structuredClone(i);stage.game.trial.stage++;assert.equal(pure(stage).state,'draft');const wrong=structuredClone(i);wrong.identity='shen_return';assert.equal(pure(wrong).state,'draft');
 }
});
test('unaccepted saving remains pending while ordinary reading preserves the matching accepted context',()=>{
 const none=input();none.busy=true;assert.equal(pure(none).caption,'正在处理进度 · 请稍候');
 const i=current();i.action=null;i.mode='memory';i.owned=true;i.runtime={id:i.activity.id,generation:i.activity.generation,phase:'running'};assert.equal(pure(i).caption,'本次回应已安排');
});
