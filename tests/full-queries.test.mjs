import test from 'node:test';
import assert from 'node:assert/strict';
import { previewAction, getItemSources, getCurrencySources, getActionResources, getBreakthroughGoal, costDeficits } from '../src/full/queries.ts';
import { resolve, newGame } from '../src/full/engine.ts';
import * as C from '../src/full/content.ts';
import { driver, fullRoute } from './full-route.mjs';

test('blocked crafting exposes the exact shared cost and independent material deficits', () => {
  const d = driver(); d.go('cave'); const before = JSON.stringify(d.game);
  const preview = previewAction(d.game, { type: 'CRAFT', recipeId: 'foundation' });
  assert.equal(preview.allowed, false);
  assert.equal(preview.failure.code, 'INSUFFICIENT_ITEM');
  assert.deepEqual(preview.costs, { stones: 20, mp: 0, months: 1, items: { herb: 8, dew: 2, core: 1 } });
  const missing = costDeficits(d.game, preview.costs);
  assert.deepEqual(missing.filter(x => x.kind === 'item').map(x => [x.id, x.missing]), [['herb', 8], ['dew', 2], ['core', 1]]);
  assert.equal(JSON.stringify(d.game), before);
});

test('batch preview separates the requested maximum budget from actual partial execution', () => {
  const d = driver(); d.go('cave'); const before = JSON.stringify(d.game);
  const preview = previewAction(d.game, { type: 'CULTIVATE', method: 'assisted', count: 50 });
  assert.equal(preview.allowed, true);
  assert.equal(preview.maximumCosts.stones, 1000);
  assert.equal(preview.actualCosts.stones, 40);
  assert.equal(preview.executedSteps, 2);
  assert.equal(preview.stopReason.code, 'INSUFFICIENT_STONES');
  assert.equal(JSON.stringify(d.game), before);
});

test('goal lists cultivation and pill deficits without acquiring or traveling automatically', () => {
  const d = driver(); const before = JSON.stringify(d.game);
  const goal = getBreakthroughGoal(d.game);
  assert.equal(goal.title, '筹备筑基');
  assert.equal(goal.targetRealm, 'foundation');
  assert.ok(goal.deficits.some(x => x.kind === 'xp' && x.missing === 1000));
  assert.ok(goal.deficits.some(x => x.id === 'foundation_pill' && x.missing === 1));
  assert.deepEqual(goal.sources.map(x => x.kind), ['recipe', 'purchase']);
  assert.equal(JSON.stringify(d.game), before);
});

test('source planning simulates legal travel and reports destination costs without touching the run', () => {
  const d = driver(); const before = JSON.stringify(d.game);
  const herbs = getItemSources(d.game, 'herb').find(x => x.kind === 'source');
  assert.equal(herbs.available, true);
  assert.deepEqual(herbs.navigation, { type: 'TRAVEL', location: 'wilderness' });
  assert.equal(herbs.costs.months, 1);
  const purchase = getItemSources(d.game, 'foundation_pill')[1];
  assert.equal(purchase.available, false);
  assert.equal(purchase.failure.code, 'INSUFFICIENT_STONES');
  assert.equal(purchase.costs.stones, 160);
  assert.equal(purchase.deficits.find(x => x.kind === 'stones').missing, 120);
  assert.equal(JSON.stringify(d.game), before);
});

test('future sources show the real travel gate and do not claim a zero-cost usable route', () => {
  const d = driver();
  const jade = getItemSources(d.game, 'jade').find(x => x.kind === 'source' && x.id === 'jade');
  assert.equal(jade.available, false);
  assert.equal(jade.failure.code, 'REALM_REQUIRED');
  assert.equal(jade.costs, null);
});

test('pending events and battles remain blockers in the same resolver used for writing', () => {
  const opening = newGame('问道', 'query-opening');
  assert.equal(getItemSources(opening, 'herb')[0].failure.code, 'PENDING_EVENT');
  const d = driver(); d.go('wilderness'); d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
  assert.equal(getItemSources(d.game, 'herb')[0].failure.code, 'IN_BATTLE');
});

test('battle rewards remain explicitly conditional on winning', () => {
  const d = driver(), before = JSON.stringify(d.game);
  const battle = getItemSources(d.game, 'core').find(x => x.kind === 'battle' && x.id === 'wolf');
  assert.equal(battle.available, true);
  assert.equal(battle.conditionalOnVictory, true);
  assert.equal(battle.rewardCount, 1);
  assert.deepEqual(battle.previews.at(-1).delta.inventory, {});
  assert.equal(JSON.stringify(d.game), before);
});

test('an already displayed event quotes only its decision and an already claimed event is unavailable', () => {
  const d = driver(); d.go('sect'); d.doAction({ type: 'EVENT', event: 'lu_intro' });
  const before = JSON.stringify(d.game);
  const source = getItemSources(d.game, 'herb').find(x => x.id === 'lu_intro:listen');
  assert.equal(source.available, true);
  assert.equal(source.repeatable, false);
  assert.deepEqual(source.steps, [{ type: 'DECIDE', option: 'listen' }]);
  assert.equal(JSON.stringify(d.game), before);
  d.doAction({ type: 'DECIDE', option: 'listen' });
  const claimed = getItemSources(d.game, 'herb').find(x => x.id === 'lu_intro:listen');
  assert.equal(claimed.available, false);
  assert.equal(claimed.failure.code, 'EVENT_UNAVAILABLE');
});

test('resources can be ready while the next required operation is returning to the cave', () => {
  const d = driver(); d.meditate(); d.buy('foundation_pill', 1);
  const goal = getBreakthroughGoal(d.game);
  assert.deepEqual(goal.deficits, []);
  assert.equal(goal.preview.failure.code, 'LOCATION_REQUIRED');
  assert.equal(goal.preview.requirements.location, 'cave');
});

test('active trial goal never asks for another already-consumed ascension seal', () => {
  const game = fullRoute().checkpoints.trial;
  const entered = resolve(game, { type: 'START_TRIAL', commandId: 'query-trial', runId: game.core.runId, expectedRevision: game.core.revision }).nextState;
  const goal = getBreakthroughGoal(entered);
  assert.equal(goal.phase, 'trial-question');
  assert.equal(goal.action, null);
  assert.deepEqual(goal.deficits, []);
  assert.deepEqual(goal.sources, []);
});

test('invalid queries/commands reject and preview results never alias frozen catalog costs', () => {
  const d = driver();
  assert.throws(() => getItemSources(d.game, '__proto__'), e => e.code === 'INVALID_QUERY');
  assert.throws(() => getItemSources(d.game, 'herb', 1.5), e => e.code === 'INVALID_QUERY');
  assert.equal(previewAction(d.game, { type: 'SOURCE', sourceId: 'missing' }).failure.code, 'INVALID_COMMAND');
  const invalid = previewAction(d.game, { type: 'CULTIVATE', method: 'natural', count: -1 });
  assert.equal(invalid.failure.code, 'INVALID_COMMAND');
  assert.equal(invalid.requestedSteps, 0);
  assert.equal(invalid.maximumCosts, null);
  const preview = previewAction(d.game, { type: 'CRAFT', recipeId: 'foundation' });
  preview.costs.items.herb = 999;
  assert.equal(C.recipes.foundation.inputs.herb, 8);
});

test('queries and previews neither read wall clocks nor call random sources', () => {
  const d = driver(), before = JSON.stringify(d.game);
  const now = Date.now, random = Math.random;
  try {
    Date.now = () => { throw new Error('wall clock forbidden'); };
    Math.random = () => { throw new Error('random source forbidden'); };
    getBreakthroughGoal(d.game); getItemSources(d.game, 'herb');
    previewAction(d.game, { type: 'CULTIVATE', method: 'natural' });
  } finally { Date.now = now; Math.random = random; }
  assert.equal(JSON.stringify(d.game), before);
});

test('lifespan endpoint preview does not falsely report the final month as a deficit', () => {
  const d = driver(), boundary = structuredClone(d.game);
  boundary.core.world.elapsedMonths = C.realms.qi.lifespanMonths - boundary.core.player.startAgeMonths - 1;
  const preview = previewAction(boundary, { type: 'END_LIFE' });
  assert.equal(preview.allowed, true);
  assert.deepEqual(preview.deficits, []);
  assert.equal(preview.delta.months, 1);
});

test('currency routes and skill/relic preparations reuse configured actions and real gates', () => {
  const d = driver(); const before = JSON.stringify(d.game);
  const income = getCurrencySources(d.game).find(source => source.id === 'work');
  assert.equal(income.available, true);
  assert.deepEqual(income.resource, { kind: 'stones' });
  assert.equal(income.rewardCount, 20);
  assert.deepEqual(income.steps, [{ type: 'TRAVEL', location: 'sect' }, { type: 'SOURCE', sourceId: 'work' }]);
  const learning = getActionResources(d.game, { type: 'LEARN', skill: 'sword_still' });
  assert.equal(learning.preview.costs.stones, 100);
  assert.ok(learning.currency.some(source => source.id === 'work' && source.available));
  const forging = getActionResources(d.game, { type: 'FORGE', relic: 'jade_seal' });
  assert.equal(forging.materials[0].deficit.id, 'jade');
  assert.ok(forging.materials[0].sources.some(source => source.failure?.code === 'REALM_REQUIRED'));
  assert.equal(JSON.stringify(d.game), before);
});
