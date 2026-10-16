import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,newGame} from '../src/full/engine.ts';
import {getAscensionChoices,getLifeRecord} from '../src/full/queries.ts';
import {ASCENSION_ENDINGS} from '../src/full/ascension.ts';
import {fullRoute} from './full-route.mjs';
import {trialJourneyScenario} from './trial-journey-route.mjs';
import {ascensionMatrix} from './ascension-matrix.mjs';
const step=(g,a)=>advance(g,{...a,commandId:'ascension-'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision});
for(const ending of ['transmit','depart'])test(`${ending}: actual three gates close once with exact resources, time, facts and successful life record`,()=>{
 const route=trialJourneyScenario('sword','accept'),ready=route.states.at(-1),before=JSON.stringify(ready),view=getAscensionChoices(ready);assert.equal(view.choices.length,2);assert.ok(view.choices.every(c=>c.preview.allowed));
 const done=step(ready,{type:'END',ending});assert.equal(done.status,'ascended');assert.equal(done.core.player.realm,'ascended');assert.equal(done.ending,ending);assert.equal(done.trial,null);assert.equal(done.core.player.xp,0);
 for(const key of ['hp','mp','stones','name','startAgeMonths'])assert.equal(done.core.player[key],ready.core.player[key]);
 for(const key of ['inventory','world','learnedSkills'])assert.deepEqual(done.core[key],ready.core[key]);for(const key of ['choices','learned','ownedRelics','loadout','wins'])assert.deepEqual(done[key],ready[key]);
 const record=getLifeRecord(done);assert.equal(record.overview.title,ASCENSION_ENDINGS[ending].title);assert.equal(record.overview.limitMonths,null);assert.equal(record.pledges.allDamageReduction,0);assert.equal(record.decisions.length,0);assert.equal(done.journal.at(-1),ASCENSION_ENDINGS[ending].record);
 for(const option of ['transmit','depart'])assert.throws(()=>step(done,{type:'END',ending:option}),e=>e.code==='ENDED');assert.ok(getAscensionChoices(done).choices.every(c=>!c.preview.allowed));assert.equal(JSON.stringify(ready),before);
});
for(const choice of ['help','trade','leave'])test(`${choice}: both ending reviews retain true opening and never fabricate allies`,()=>{
 for(const ending of ['transmit','depart']){const d=fullRoute(choice,'talisman','craft',false,ending),view=getAscensionChoices(d.game),record=view.record;assert.equal(record.opening.choice,choice);assert.equal(record.pledges.allDamageReduction,0);assert.equal(record.pledges.thunderDamageReduction,0);assert.equal(record.decisions.length,0);assert.ok(!record.overview.conclusion.includes('故人'));view.choices[0].label='changed';assert.notEqual(getAscensionChoices(d.game).choices[0].label,'changed');}
});
test('ending eligibility is the shared rule at every question/gate and at the opening',()=>{
 for(const game of [newGame('封卷门槛','ending-gates'),...trialJourneyScenario().states.filter(g=>g.trial?.stage!==4)])assert.ok(getAscensionChoices(game).choices.every(choice=>!choice.preview.allowed));
});
test('all24 actual-rule routes cover the six cores, both preparations and both successful endings',()=>{
 assert.equal(ascensionMatrix.length,24);assert.equal(new Set(ascensionMatrix.map(r=>r.id)).size,24);
 for(const r of ascensionMatrix){const d=fullRoute(r.choice,r.school,r.strategy,false,r.ending);assert.equal(d.game.status,'ascended');assert.equal(d.game.ending,r.ending);assert.equal(getLifeRecord(d.game).opening.choice,r.choice);}
});
test('factual closing review contains actual choices, relics and aid without changing input',()=>{
 const done=fullRoute('trade','sword','purchase',true,'transmit').game,raw=JSON.stringify(done),view=getAscensionChoices(done);assert.ok(view.record.decisions.length>0);assert.ok(view.record.training.relics.length>0);assert.ok(view.record.pledges.allDamageReduction>0);view.record.snapshot.inventory[0].quantity=9999;assert.equal(JSON.stringify(done),raw);
});
