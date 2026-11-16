import test from 'node:test';import assert from 'node:assert/strict';
import {lifespanGuidance}from'../web/src/lifespan-guidance.ts';
import {getLifeOverview,previewAction}from'../src/full/queries.ts';
import {resolve}from'../src/full/engine.ts';
import{lifespanFixture,atLocation}from'./lifespan-guidance-fixtures.mjs';
const last=lifespanFixture(),cave=atLocation(last,'cave');
const act=(g,a)=>resolve(g,{...a,commandId:'life-test-'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision}).nextState;
test('ordinary and sealed lives do not acquire a last-month cultivation block',()=>{assert.equal(lifespanGuidance(lifespanFixture(24)),null);for(const type of ['RETIRE','END_LIFE'])assert.equal(lifespanGuidance(act(cave,{type})),null);});
test('the twelve-month warning keeps actual age without replacing the ordinary goal hint',()=>{const g=lifespanFixture(12),v=lifespanGuidance(g);assert.equal(v.life.ageLabel,getLifeOverview(g).ageLabel);assert.equal(v.hint,'余寿12月 · 先查看此生去向');assert.equal(v.blocked,false);});
test('a foreign last-month location gate is distinct from the actual cave AGE_LIMIT block',()=>{assert.equal(previewAction(last,{type:'CULTIVATE',method:'natural',count:1}).failure.code,'LOCATION_REQUIRED');assert.equal(lifespanGuidance(last).blocked,false);assert.match(lifespanGuidance(last).hint,/余寿12月/);assert.equal(previewAction(cave,{type:'CULTIVATE',method:'natural',count:1}).failure.code,'AGE_LIMIT');assert.equal(lifespanGuidance(cave).blocked,true);});
test('a genuinely ready last-month breakthrough remains legal and its saved new realm clears the warning',()=>{const g=atLocation(lifespanFixture(12,true),'cave');assert.equal(previewAction(g,{type:'BREAKTHROUGH'}).allowed,true);const v=lifespanGuidance(g);assert.equal(v.blocked,false);assert.match(v.hint,/核对突破/);assert.equal(lifespanGuidance(act(g,{type:'BREAKTHROUGH'})),null);});
test('a last-month ongoing battle keeps its own decision context',()=>{const g=act(atLocation(lifespanFixture(24),'wilderness'),{type:'ENCOUNTER',enemy:'wolf'});assert.equal(getLifeOverview(g).remainingMonths,12);assert.ok(g.battle);assert.equal(lifespanGuidance(g).blocked,false);assert.equal(lifespanGuidance(g).hint,null);});
test('the displayed lifespan projection does not change any original Game field',()=>{for(const g of [last,cave,lifespanFixture(12),atLocation(lifespanFixture(12,true),'cave')]){const before=structuredClone(g);lifespanGuidance(g);assert.deepEqual(g,before);}});

test('a full cultivation cap with a missing pill remains a preparation decision rather than a false ordinary-cultivation block',()=>{const g=atLocation(lifespanFixture(12,'no-pill'),'cave');assert.equal(g.core.inventory.foundation_pill,0);assert.equal(previewAction(g,{type:'BREAKTHROUGH'}).allowed,false);const v=lifespanGuidance(g);assert.equal(v.blocked,false);assert.match(v.hint,/核对当前筹备/);});
