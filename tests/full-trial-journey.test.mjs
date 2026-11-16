import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,resolve} from '../src/full/engine.ts';
import {getTrialJourney,getTrialRecovery} from '../src/full/queries.ts';
import {currentVersions} from '../src/full/versions.ts';
import {TRIAL_ANSWERS,TRIAL_STAGES} from '../src/full/trial-rules.ts';
import {trialPreparationRunner} from './trial-preparation-route.mjs';
import {trialJourneyScenario} from './trial-journey-route.mjs';
const command=(game,action)=>({...action,commandId:'journey-test-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
const step=(game,action)=>advance(game,command(game,action));
const checkpoint=game=>({format:'chenyuan-checkpoint',version:1,kind:'trial',sourceRunId:game.core.runId,sourceRevision:game.core.revision,versions:{...currentVersions},snapshot:game});
for(const school of ['sword','talisman'])for(const answer of ['accept','release'])test(`${school}/${answer}: journey is factual and preserves resources through all three real battles`,()=>{
 const route=trialJourneyScenario(school,answer),before=JSON.stringify(route.states);
 for(const game of route.states.slice(1)){
  const view=getTrialJourney(game);assert.equal(view.stage,game.trial.stage);assert.equal(view.completed,Math.max(0,game.trial.stage-1));
  assert.equal(view.steps.filter(s=>s.status==='complete').length,game.trial.stage===4?4:game.trial.stage);
  assert.equal(game.core.world.elapsedMonths,route.prepared.core.world.elapsedMonths);assert.equal(game.core.player.stones,route.prepared.core.player.stones);assert.equal(game.core.player.xp,route.prepared.core.player.xp);
  if(game.trial.answer){assert.equal(view.answerLabel,TRIAL_ANSWERS[answer].label);assert.equal(view.effect,TRIAL_ANSWERS[answer].record);}
  if(game.battle)assert.equal(game.battle.enemy,TRIAL_STAGES[game.trial.stage-1]);
 }
 const end=route.states.at(-1);assert.equal(end.status,'active');assert.equal(end.core.player.realm,'spirit');assert.equal(end.wins-route.prepared.wins,3);assert.equal(getTrialJourney(end).completed,3);assert.equal(JSON.stringify(route.states),before);
});
for(const choice of ['help','trade','leave'])test(`${choice}: the question recalls the actual opening without inventing aid`,()=>{
 // Build each opening with its real driver rather than changing an old choice in a snapshot.
 return import('./full-route.mjs').then(({driver})=>{
  const d=driver(choice,'sword');for(let i=0;i<4;i++)d.realm('purchase');d.buy('ascension_seal',1);d.meditate();d.go('terrace');d.doAction({type:'START_TRIAL'});
  const view=getTrialJourney(d.game);assert.ok(view.openingMemory.includes(choice==='help'?'赠出':choice==='trade'?'以丹换简':'保留丹药'));assert.equal(view.memories.length,1);assert.equal(view.memories[0].id,'temple');assert.equal(view.answers.length,2);assert.ok(view.answers.every(a=>a.preview.allowed));
  view.memories[0].text='changed';assert.notEqual(getTrialJourney(d.game).memories[0].text,'changed');
 });
});
test('existing answer mechanics still give exact ten-point protection and eight-point direct damage',()=>{
 const base=trialPreparationRunner().ledger.game;
 const enter=step(base,{type:'START_TRIAL'}),accept=step(enter,{type:'ANSWER_TRIAL',answer:'accept'}),release=step(enter,{type:'ANSWER_TRIAL',answer:'release'});
 const a=step(accept,{type:'BATTLE',move:'attack'}),b=step(release,{type:'BATTLE',move:'attack'});
 assert.equal(a.core.player.hp-b.core.player.hp,10);assert.equal(a.battle.hp-b.battle.hp,8);
 assert.throws(()=>step(a,{type:'ANSWER_TRIAL',answer:'release'}),e=>e.code==='NO_QUESTION');
});
test('actual fatigue and withdrawal have persisted reasons and exact item consumption without a new history',()=>{
 const route=trialJourneyScenario(),prepared=route.prepared,cp=checkpoint(prepared);let game=step(step(prepared,{type:'START_TRIAL'}),{type:'ANSWER_TRIAL',answer:'accept'});
 game=step(game,{type:'BATTLE',move:'attack'});game=step(game,{type:'BATTLE',move:'heal'});let previous;
 while(game.battle){previous=game;game=step(game,{type:'BATTLE',move:'guard'});}
 const view=getTrialRecovery(game,previous,cp);assert.ok(view.reason.includes('缠斗过久'));assert.deepEqual(view.consumed.map(x=>[x.id,x.quantity]),[['healing_pill',1],['ascension_seal',1]]);assert.equal(view.stage,1);assert.equal(view.consumptionKnown,true);
 assert.equal(getTrialRecovery(game,previous,null).consumptionKnown,false);
 const battle=route.states.find(g=>g.trial?.stage===2),fled=step(battle,{type:'BATTLE',move:'flee'});assert.ok(getTrialRecovery(fled,battle,cp).reason.includes('主动退离'));
 assert.equal(getTrialRecovery(game,null,cp),null);const old=structuredClone(previous);old.core.revision--;assert.equal(getTrialRecovery(game,old,cp),null);assert.equal(getTrialRecovery(route.states.at(-1),route.states.at(-2),cp),null);
});
test('a real lethal loss at the thunder gate preserves its reason and the input snapshots',()=>{
 const route=trialJourneyScenario(),cp=checkpoint(route.prepared);let game=route.states.find(g=>g.trial?.stage===2),previous;
 while(game.battle){previous=game;game=step(game,{type:'BATTLE',move:'guard'});}
 const before=JSON.stringify([game,previous,cp]),view=getTrialRecovery(game,previous,cp);assert.ok(view.reason.includes('未能抵住'));assert.equal(view.stage,2);assert.equal(game.core.player.hp,1);assert.equal(game.core.world.location,'cave');view.inventory[0].quantity=999;assert.equal(JSON.stringify([game,previous,cp]),before);
 const next=step(game,{type:'REST'});assert.equal(getTrialRecovery(next,game,cp),null);
});
