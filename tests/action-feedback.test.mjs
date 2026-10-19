import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolve,reason} from '../src/full/engine.ts';
import {getLifeOverview} from '../src/full/queries.ts';
import {driver,fullRoute} from './full-route.mjs';
import {writeObservation} from '../web/src/local-events.ts';
import {ACTION_MOTIONS,MOVE_MOTIONS,createActionFeedbackTracker} from '../web/src/action-feedback.ts';
import {ICONS} from '../web/src/ui-icons.ts';
const uuid=n=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
function replay(actions,seed=1){let game=newGame('动作反馈',uuid(seed)),frames=[],tracker=createActionFeedbackTracker();for(const [index,action]of actions.entries()){const before=game,command={...action,commandId:uuid(index+100),runId:before.core.runId,expectedRevision:before.core.revision},resolution=resolve(before,command);game=resolution.nextState;const observation=writeObservation(before,game,{kind:'action',command},resolution.result,false),raw=JSON.stringify([before,resolution,observation]);const notice=tracker.consume(observation,game,resolution.result,false,true,before);assert.ok(notice,action.type);assert.equal(JSON.stringify([before,resolution,observation]),raw);assert.ok(ICONS[notice.icon.kind][notice.icon.id],JSON.stringify(notice.icon));assert.equal(tracker.consume(observation,game,resolution.result,false,true,before),null);frames.push({before,game,result:resolution.result,observation,notice,action});}return frames;}
function sample(){return replay([{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:1}]).at(-1);}
test('real normal routes and supplemental lawful actions exercise every action family without touching Game',()=>{
 const covered=new Set(),families=new Set(),moves=new Set();let count=0;
 const collect=actions=>{for(const f of replay(actions)){covered.add(f.action.type);families.add(f.notice.family);if(f.action.type==='BATTLE')moves.add(f.action.move);count++;}};
 for(const school of ['sword','talisman'])for(const strategy of ['craft','purchase'])collect(fullRoute('help',school,strategy,true,'transmit').actions);
 const d=driver();d.buy('healing_pill',3);d.buy('spirit_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'technique'});d.doAction({type:'BATTLE',move:'heal'});d.doAction({type:'BATTLE',move:'restore'});d.doAction({type:'BATTLE',move:'flee'});d.doAction({type:'USE',item:'healing_pill'});d.rest();d.resource('herb',2);d.go('market');d.doAction({type:'SELL',item:'herb',quantity:1});d.realm();d.funds(600);d.go('sect');d.doAction({type:'STUDY',manual:'jinghong'});d.doAction({type:'LEARN',skill:'sword_still'});d.doAction({type:'EQUIP',skill:'sword_still'});collect(d.actions);collect([...d.actions,{type:'RETIRE'}]);
 const life=driver();life.go('sect');while(getLifeOverview(life.game).remainingMonths>1)life.doAction({type:'SOURCE',sourceId:'work',count:Math.min(50,getLifeOverview(life.game).remainingMonths-1)});life.doAction({type:'END_LIFE'});collect(life.actions);
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
