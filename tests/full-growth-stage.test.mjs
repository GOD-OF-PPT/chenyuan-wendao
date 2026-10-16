import test from 'node:test';
import assert from 'node:assert/strict';
import { getGrowthStage } from '../src/full/growth.ts';
import { getItemSources } from '../src/full/queries.ts';
import { resolve } from '../src/full/engine.ts';
import { remainingMonths } from '../src/full/costs.ts';
import { driver, fullRoute } from './full-route.mjs';

const gold = () => { const d = driver(); d.realm(); d.realm(); return d; };
test('golden stage derives lotus requirements and deterministic alternate routes from the real recipe', () => {
  const d = gold(), before = JSON.stringify(d.game), stage = getGrowthStage(d.game);
  assert.equal(stage.pill, 'nascent_pill'); assert.equal(stage.pillReady, false);
  assert.equal(stage.reachedAt, d.game.milestones.golden); assert.equal(stage.remainingMonths, remainingMonths(d.game));
  const material = stage.recipes[0].materials[0]; assert.equal(material.id, 'lotus'); assert.equal(material.required, 5); assert.equal(material.missing, 5);
  assert.deepEqual(material.sources.map(source => source.id), ['lotus', 'lotus_task', 'lotus']);
  assert.ok(material.sources.filter(source => source.kind === 'source').every(source => source.available));
  const purchase = material.sources.find(source => source.kind === 'purchase');
  assert.equal(purchase.available, false); assert.equal(purchase.failure.code, 'INSUFFICIENT_STONES'); assert.equal(purchase.costs.stones, 325);
  assert.equal(JSON.stringify(d.game), before);
});
test('nascent and spirit keys unlock before the required breakthrough item', () => {
  const d = gold(); d.realm(); const nascent = getGrowthStage(d.game);
  assert.equal(nascent.recipes[0].materials[0].id, 'soul'); assert.equal(nascent.recipes[0].materials[0].required, 6);
  assert.ok(nascent.recipes[0].materials[0].sources.every(source => source.available || source.failure.code === 'INSUFFICIENT_STONES'));
  d.realm(); const spirit = getGrowthStage(d.game);
  assert.equal(spirit.recipes[0].materials[0].id, 'dao'); assert.equal(spirit.pill, 'ascension_seal');
  assert.ok(spirit.recipes[0].materials[0].sources.some(source => source.id === 'dao_task' && source.available));
});
test('a prepared breakthrough item never requests collecting its recipe again', () => {
  const d = gold(); d.craft('nascent'); const before = JSON.stringify(d.game), stage = getGrowthStage(d.game);
  assert.equal(stage.pillReady, true); assert.deepEqual(stage.recipes, []);
  assert.equal(stage.pillHave, 1); assert.equal(JSON.stringify(d.game), before);
});
test('material counts reflect current inventory without reserving or awarding goods', () => {
  const d = gold(); d.resource('lotus', 2); const before = JSON.stringify(d.game);
  const stage = getGrowthStage(d.game), material = stage.recipes[0].materials[0];
  assert.equal(material.have, 2); assert.equal(material.missing, 3);
  assert.equal(material.sources.find(source => source.kind === 'purchase').rewardCount, 3);
  material.sources[0].costs.months = 999; assert.equal(getGrowthStage(d.game).recipes[0].materials[0].sources[0].costs.months, 3);
  assert.equal(JSON.stringify(d.game), before);
});
test('active trials and endings do not manufacture a replacement seal requirement', () => {
  const game = fullRoute().checkpoints.trial;
  const entered = resolve(game, { type: 'START_TRIAL', commandId: 'growth-trial', runId: game.core.runId, expectedRevision: game.core.revision }).nextState;
  assert.equal(getGrowthStage(entered).pill, null); assert.deepEqual(getGrowthStage(entered).recipes, []);
  const ended = fullRoute().game; assert.equal(getGrowthStage(ended).pill, null);
});
test('stage reads do not advance time or call clocks/randomness', () => {
  const d = gold(), before = JSON.stringify(d.game), now = Date.now, random = Math.random;
  try { Date.now = () => { throw new Error('clock'); }; Math.random = () => { throw new Error('random'); }; getGrowthStage(d.game); getGrowthStage(d.game); }
  finally { Date.now = now; Math.random = random; }
  assert.equal(JSON.stringify(d.game), before);
});
test('filtered acquisition queries preserve exact plans and default backward behavior', () => {
  const d = gold(), before = JSON.stringify(d.game), all = getItemSources(d.game, 'lotus', 3);
  assert.deepEqual(getItemSources(d.game, 'lotus', 3, ['source', 'purchase']), all.filter(source => source.kind === 'source' || source.kind === 'purchase'));
  assert.deepEqual(getItemSources(d.game, 'lotus', 3, []), []); assert.equal(JSON.stringify(d.game), before);
  assert.throws(() => getItemSources(d.game, 'lotus', 1, ['unknown']), error => error.code === 'INVALID_QUERY');
  assert.throws(() => getItemSources(d.game, 'lotus', 1, null), error => error.code === 'INVALID_QUERY');
});
