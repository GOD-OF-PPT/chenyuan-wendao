import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolve,reason} from '../src/full/engine.ts';
import {getLifeOverview} from '../src/full/queries.ts';
import {driver,fullRoute} from './full-route.mjs';
import {writeObservation} from '../web/src/local-events.ts';
import {ACTION_MOTIONS,MOVE_MOTIONS,activityFeedbackObservation,createActionFeedbackTracker} from '../web/src/action-feedback.ts';
import {createActivity,completeActivity,defaultBattlePlan} from '../src/full/activity.ts';
import {ICONS} from '../web/src/ui-icons.ts';
const uuid=n=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
function replay(actions,seed=1){let game=newGame('动作反馈',uuid(seed)),frames=[],tracker=createActionFeedbackTracker();for(const [index,action]of actions.entries()){const before=game,command={...action,commandId:uuid(index+100),runId:before.core.runId,expectedRevision:before.core.revision},resolution=resolve(before,command);game=resolution.nextState;const observation=writeObservation(before,game,{kind:'action',command},resolution.result,false),raw=JSON.stringify([before,resolution,observation]);const notice=tracker.consume(observation,game,resolution.result,false,true,before);assert.ok(notice,action.type);assert.equal(JSON.stringify([before,resolution,observation]),raw);assert.ok(ICONS[notice.icon.kind][notice.icon.id],JSON.stringify(notice.icon));assert.equal(tracker.consume(observation,game,resolution.result,false,true,before),null);frames.push({before,game,result:resolution.result,observation,notice,action});}return frames;}
function sample(){return replay([{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:1}]).at(-1);}
test('real normal routes and supplemental lawful actions exercise every action family without touching Game',()=>{
 const covered=new Set(),families=new Set(),moves=new Set();let count=0;
 const collect=actions=>{for(const f of replay(actions)){covered.add(f.action.type);families.add(f.notice.family);if(f.action.type==='BATTLE')moves.add(f.action.move);count++;}};
 for(const school of ['sword','talisman'])for(const strategy of ['craft','purchase'])collect(fullRoute('help',school,strategy,true,'transmit').actions);
 const d=driver();d.buy('healing_pill',3);d.buy('spirit_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'technique'});d.doAction({type:'BATTLE',move:'heal'});d.doAction({type:'BATTLE',move:'restore'});d.doAction({type:'BATTLE',move:'flee'});d.doAction({type:'USE',item:'healing_pill'});d.rest();d.resource('herb',2);d.go('market');d.doAction({type:'SELL',item:'herb',quantity:1});d.realm();d.funds(600);d.go('sect');d.doAction({type:'STUDY',manual:'jinghong'});d.doAction({type:'LEARN',skill:'sword_still'});d.doAction({type:'EQUIP',skill:'sword_still'});collect(d.actions);collect([...d.actions,{type:'RETIRE'}]);
 const life=driver();life.go('sect');while(getLifeOverview(life.game).remainingMonths>12)life.doAction({type:'SOURCE',sourceId:'work',count:Math.min(50,(getLifeOverview(life.game).remainingMonths-12)/12)});life.doAction({type:'END_LIFE'});collect(life.actions);
 assert.deepEqual([...covered].sort(),Object.keys(ACTION_MOTIONS).sort());assert.equal(families.size,14);assert.deepEqual([...moves].sort(),Object.keys(MOVE_MOTIONS).sort());assert.ok(count>500);
});
test('foreign, stale, unsaved, failed, replayed and mismatched observations cannot produce a success',()=>{
 const f=sample(),consume=(o=f.observation,g=f.game,r=f.result,replayed=false,eligible=true)=>createActionFeedbackTracker().consume(o,g,r,replayed,eligible,f.before);
 assert.equal(consume(null),null);assert.equal(consume(f.observation,null),null);assert.equal(consume(f.observation,f.game,null),null);assert.equal(consume(f.observation,f.game,f.result,true),null);assert.equal(consume(f.observation,f.game,f.result,false,false),null);
 for(const patch of [{runId:uuid(99)},{commandId:uuid(999)},{observedRevision:f.game.core.revision+1},{operation:'BUY'},{kind:'save_error',result:null,errorCode:'STORAGE_QUOTA'},{result:null},{replayed:true}])assert.equal(consume({...f.observation,...patch}),null,JSON.stringify(patch));
 for(const patch of [{revisionAfter:f.game.core.revision+1},{executedSteps:0},{phaseAfter:'ascended'},{versions:{...f.result.versions,balanceVersion:'wrong'}}])assert.equal(consume(f.observation,f.game,{...f.result,...patch}),null);
});
test('same-key replays are remembered and new life control results never masquerade as growth',()=>{
 const f=sample(),t=createActionFeedbackTracker();assert.equal(t.consume({...f.observation,kind:'replay'},f.game,f.result,true,true),null);assert.equal(t.consume(f.observation,f.game,f.result,false,true),null);
 for(const kind of ['new_game','restart','import','restore']){const game=newGame('新卷',uuid(900)),source={kind,commandId:uuid(901),runId:game.core.runId,sourceRunId:uuid(902),expectedRevision:0},o=writeObservation(null,game,source,null,false),notice=createActionFeedbackTracker().consume(o,game,null,false,true);assert.ok(notice);assert.equal(notice.delta,'当前进度已保存');assert.deepEqual(notice.numbers,[]);assert.equal(notice.major,false);}
});
test('damage is a snapshot difference, and vanished or replaced enemies never receive a made-up number',()=>{
 const d=driver();d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'flee'});const frames=replay(d.actions);const hit=frames.at(-2),flee=frames.at(-1);assert.equal(hit.notice.numbers.find(n=>n.target==='enemy').value,hit.game.battle.hp-hit.before.battle.hp);assert.equal(flee.notice.numbers.some(n=>n.target==='enemy'),false);assert.equal(flee.notice.terminal,true);assert.equal(flee.notice.label,'撤离战局');
 const noBefore=createActionFeedbackTracker().consume(hit.observation,hit.game,hit.result,false,true,null);assert.equal(noBefore.numbers.some(n=>n.target==='enemy'),false);
});
test('sprite selections remain in the existing forty symbols and all seven moves have distinct variants',()=>{
 for(const row of Object.values(ACTION_MOTIONS))assert.ok(ICONS[row.icon.kind][row.icon.id]);assert.equal(new Set(Object.values(MOVE_MOTIONS).map(x=>x.variant)).size,7);assert.equal(new Set(Object.values(ICONS).flatMap(Object.values)).size,40);
});
function activityFrame(){const d=driver();d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});const before=replay(d.actions).at(-1).game;
 const a=createActivity(before,defaultBattlePlan(before),{id:uuid(5000),ownerId:'feedback-owner',commandId:uuid(5001),now:0});
 const {nextState:game,result}=resolve(before,a.nextCommand),activity=completeActivity(game,a,result,{commandId:a.nextCommand.commandId,now:a.dueAt});
 return{before,game,result,activity,observation:writeObservation(before,game,{kind:'action',command:a.nextCommand},result,false)};}
test('a validated activity turn animates once while the public observation retains its redacted cycle identity',()=>{
 const f=activityFrame(),raw=JSON.stringify(f.observation),t=createActionFeedbackTracker();assert.equal(f.observation.commandId,null);
 const local=activityFeedbackObservation(f.observation,f.activity,f.result);assert.equal(local.commandId,f.result.commandId);assert.equal(JSON.stringify(f.observation),raw);
 const notice=t.consume(local,f.game,f.result,false,true,f.before);assert.equal(notice.family,'battle');assert.equal(notice.numbers.find(n=>n.target==='enemy').value,f.game.battle.hp-f.before.battle.hp);assert.equal(t.consume(local,f.game,f.result,false,true,f.before),null);
 assert.equal(createActionFeedbackTracker().consume({...local,kind:'replay',replayed:true},f.game,f.result,true,true,f.before),null);
});
test('activity presentation refuses foreign generations, later progress, altered costs and incomplete public results',()=>{
 const f=activityFrame();for(const a of [{...f.activity,generation:f.activity.generation+1},{...f.activity,id:uuid(5009)},{...f.activity,gameRevision:f.activity.gameRevision+1}])assert.equal(activityFeedbackObservation(f.observation,a,f.result).commandId,null);
 for(const patch of [{result:null},{result:{...f.observation.result,costs:{...f.observation.result.costs,mp:99}}},{sourceRunId:uuid(88)},{operation:'BUY'}])assert.equal(activityFeedbackObservation({...f.observation,...patch},f.activity,f.result).commandId,null);
});
test('finite milestone feedback binds the selected current cycle and preserves public redaction and replay fencing',()=>{
 const samples=new Map();let game=newGame('有限因果',uuid(6000));
 for(const [n,action]of fullRoute('help','sword','craft',true,'transmit').actions.entries()){
  if(['CHOOSE','EVENT','DECIDE','BREAKTHROUGH','START_TRIAL','ANSWER_TRIAL','END'].includes(action.type)&&!samples.has(action.type))samples.set(action.type,{game,action});
  game=resolve(game,{...action,commandId:uuid(6100+n),runId:game.core.runId,expectedRevision:game.core.revision}).nextState;
 }
 const life=driver();samples.set('RETIRE',{game:replay(life.actions,6001).at(-1).game,action:{type:'RETIRE'}});life.go('sect');while(getLifeOverview(life.game).remainingMonths>12)life.doAction({type:'SOURCE',sourceId:'work',count:Math.min(50,(getLifeOverview(life.game).remainingMonths-12)/12)});samples.set('END_LIFE',{game:replay(life.actions,6002).at(-1).game,action:{type:'END_LIFE'}});
 assert.equal(samples.size,9);
 for(const [type,{game:before,action}]of samples){
  const a=createActivity(before,{kind:'milestone',action,maxCycles:1},{id:uuid(7000),ownerId:'milestone-fx',commandId:uuid(7001),now:0}),resolved=resolve(before,a.nextCommand),after=resolved.nextState,result=resolved.result;
  const done=completeActivity(after,a,result,{commandId:a.nextCommand.commandId,now:a.dueAt}),publicObservation=writeObservation(before,after,{kind:'action',command:a.nextCommand},result,false),raw=JSON.stringify(publicObservation);
  assert.equal(publicObservation.commandId,null,type);const local=activityFeedbackObservation(publicObservation,done,result),tracker=createActionFeedbackTracker();assert.equal(local.commandId,result.commandId,type);
  assert.ok(tracker.consume(local,after,result,false,true,before),type);assert.equal(tracker.consume(local,after,result,false,true,before),null,type);assert.equal(JSON.stringify(publicObservation),raw,type);
  assert.equal(activityFeedbackObservation(publicObservation,{...done,plan:{...done.plan,action:{type:'RETIRE'}}},result).commandId,type==='RETIRE'?result.commandId:null,type);
  assert.equal(createActionFeedbackTracker().consume({...local,replayed:true,kind:'replay'},after,result,true,true,before),null,type);
 }
});
