import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { newGame, advance, resolve, validateGame } from '../src/full/engine.ts';
import { getTrialPreparation, previewAction } from '../src/full/queries.ts';
import { runner } from '../scripts/economy/scenarios.mjs';
import { trialPreparationRunner, detailedTrialScenario, zeroManaTrialScenario } from './trial-preparation-route.mjs';
const command=(game,action)=>({...action,commandId:'trial-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
const take=(game,action)=>advance(game,command(game,action));
for(const school of ['sword','talisman'])for(const route of ['gather','buy-product'])test(`${school}/${route}: preparation eligibility and costs equal actual entry through real rules`,()=>{
 const r=trialPreparationRunner(school,route),before=r.ledger.game,view=getTrialPreparation(before);
 assert.equal(view.canEnter,true);assert.ok(view.mandatory.every(row=>row.ready));assert.ok(view.items.every(item=>item.ready));
 const quote=previewAction(before,{type:'START_TRIAL'}),out=resolve(before,command(before,{type:'START_TRIAL'}));
 assert.deepEqual(view.costs,quote.costs);assert.deepEqual(out.result.costs,view.costs);assert.equal(out.checkpointKind,'trial');
 assert.equal(out.nextState.core.inventory.ascension_seal,before.core.inventory.ascension_seal-1);assert.equal(out.nextState.trial.stage,0);assert.equal(out.nextState.trial.answer,null);
 assert.equal(out.nextState.core.activeEvent.id,'trial_question');assert.equal(out.nextState.core.activeEvent.instanceId,before.core.runId+':trial_question');
 assert.equal(out.nextState.core.world.elapsedMonths,before.core.world.elapsedMonths);assert.equal(out.nextState.core.player.realm,'spirit');
 assert.deepEqual(r.ledger.game,before);
});

test('real zero-mana, zero-potion, no-relic and no-ally preparation remains eligible',()=>{
 const game=zeroManaTrialScenario(),view=getTrialPreparation(game);assert.equal(game.core.player.mp,0);assert.equal(game.core.inventory.healing_pill,0);assert.equal(game.core.inventory.spirit_pill,0);assert.equal(game.loadout.relic,null);
 assert.deepEqual(view.preparation.aid,{allDamageReduction:0,thunderDamageReduction:0});assert.equal(view.canEnter,true);assert.ok(view.mandatory.every(row=>row.ready));
 assert.equal(take(game,{type:'START_TRIAL'}).core.activeEvent.id,'trial_question');
});

test('synthetic one-point health boundary uses the shared quote, not a second threshold',()=>{
 const base=trialPreparationRunner().ledger.game,required=previewAction(base,{type:'START_TRIAL'}).requirements.hp;
 for(const hp of [required-1,required]){
  const game=structuredClone(base);game.core.player.hp=hp;validateGame(game);const view=getTrialPreparation(game);
  assert.equal(view.mandatory.find(row=>row.id==='hp').need,String(required));assert.equal(view.canEnter,hp===required);
  if(hp<required)assert.throws(()=>take(game,{type:'START_TRIAL'}),e=>e.code==='HP_REQUIRED');else assert.equal(take(game,{type:'START_TRIAL'}).trial.stage,0);
 }
});

test('real missing item, incomplete cultivation and wrong location show actual deficits',()=>{
 const r=runner({choice:'leave',school:'sword',preparation:'gather',cultivation:'natural',advancedMind:false});r.grow('spirit',false);r.go('terrace');
 let view=getTrialPreparation(r.ledger.game);assert.equal(view.canEnter,false);assert.equal(view.mandatory.find(row=>row.id==='xp').ready,false);assert.equal(view.items[0].ready,false);
 r.meditate();r.go('terrace');view=getTrialPreparation(r.ledger.game);assert.equal(view.canEnter,false);assert.equal(view.items[0].quantity,1);
 r.craft('ascension');r.go('cave');view=getTrialPreparation(r.ledger.game);assert.equal(view.mandatory.find(row=>row.id==='location').ready,false);assert.equal(view.canEnter,false);
 r.go('terrace');assert.equal(getTrialPreparation(r.ledger.game).canEnter,true);
});

test('a real safely grown schoolless character is gated on school, not on optional preparation',()=>{
 let game=newGame('未择法','trial-schoolless');for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'}])game=take(game,action);
 const r=runner({choice:'leave',school:'sword',preparation:'gather',cultivation:'natural',advancedMind:false},game);r.grow('spirit',false);r.craft('ascension');r.meditate();r.go('terrace');
 const view=getTrialPreparation(r.ledger.game);assert.equal(view.mandatory.find(row=>row.id==='school').ready,false);assert.equal(view.canEnter,false);assert.throws(()=>take(r.ledger.game,{type:'START_TRIAL'}),e=>e.code==='SCHOOL_REQUIRED');
});

test('question and battle state cannot restart entry or charge a second seal',()=>{
 const r=trialPreparationRunner('sword','buy-product',2);r.act({type:'START_TRIAL'});const question=r.ledger.game;
 assert.equal(getTrialPreparation(question).canEnter,false);assert.throws(()=>r.act({type:'START_TRIAL'}),e=>e.code==='PENDING_EVENT');assert.deepEqual(r.ledger.game,question);
 r.act({type:'ANSWER_TRIAL',answer:'accept'});const battle=r.ledger.game;assert.equal(getTrialPreparation(battle).canEnter,false);assert.throws(()=>r.act({type:'START_TRIAL'}),e=>e.code==='IN_BATTLE');assert.deepEqual(r.ledger.game,battle);
});

test('detailed snapshot summary reflects actual learned, equipped, inventory and chosen facts',()=>{
 const scenario=detailedTrialScenario(),game=scenario.game,view=getTrialPreparation(game),before=JSON.stringify(game);
 assert.equal(view.snapshotSummary.choiceCount,Object.keys(game.choices).length);assert.equal(view.snapshotSummary.manualOwned,true);assert.equal(view.snapshotSummary.stones,game.core.player.stones);
 assert.deepEqual(view.snapshotSummary.learned,game.learned.map(id=>C.skills[id].name));
 assert.ok(view.snapshotSummary.relics.length>0);assert.deepEqual(view.preparation.aid,{allDamageReduction:6,thunderDamageReduction:8});
 view.snapshotSummary.inventory[0].quantity=99999;assert.equal(JSON.stringify(game),before);assert.notEqual(getTrialPreparation(game).snapshotSummary.inventory[0].quantity,99999);
});
