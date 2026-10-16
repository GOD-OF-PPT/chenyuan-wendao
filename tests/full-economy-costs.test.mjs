import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { parseGame, validateGame } from '../src/full/engine.ts';
import { fullCatalog, validateContent } from '../src/full/validate-content.ts';
import { previewAction } from '../src/full/queries.ts';
import { runner } from '../scripts/economy/scenarios.mjs';
import { cultivationProbes, conversionProbes, failureRecoveryProbe } from '../scripts/economy/analysis.mjs';
const options = { choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural', advancedMind: false };

test('every active realm quotes and charges its versioned actual assisted fee', () => {
  const origin = runner(options); origin.grow('spirit', false);
  for (const [realm, game] of Object.entries(origin.checkpoints)) {
    const r = runner(options, game); r.funds(C.assistedCosts[realm]); r.go('cave');
    const quote = previewAction(r.ledger.game, { type: 'CULTIVATE', method: 'assisted', count: 1 });
    const result = r.act({ type: 'CULTIVATE', method: 'assisted', count: 1 });
    assert.equal(result.costs.stones, C.assistedCosts[realm]); assert.equal(quote.actualCosts.stones, result.costs.stones);
    assert.equal(result.versions.balanceVersion, C.BALANCE);
  }
});
test('assisted schedule rejects missing, negative, fractional and unknown realm fees', () => {
  for (const mutate of [x => delete x.assistedCosts.spirit, x => x.assistedCosts.golden = -1,
    x => x.assistedCosts.nascent = 0.5, x => x.assistedCosts.future = 10]) {
    const catalog = structuredClone(fullCatalog); mutate(catalog);
    assert.throws(() => validateContent(catalog));
  }
});
test('known previous balance migrates all real resources and context without retroactive charges', () => {
  const r = runner(options); r.grow('spirit');
  for (const game of Object.values(r.checkpoints)) {
    const old = structuredClone(game); old.core.contentVersion = 'full-demo.2'; old.core.balanceVersion = 'full-unbalanced.1';
    const raw = JSON.stringify(old), current = parseGame(raw);
    assert.throws(() => validateGame(old), error => error.code === 'SAVE_VERSION');
    assert.deepEqual(current, { ...old, core: { ...old.core, contentVersion: C.VERSION, balanceVersion: C.BALANCE } });
    assert.equal(JSON.stringify(old), raw); assert.deepEqual(parseGame(JSON.stringify(current)), current);
    old.core.balanceVersion = 'full-unbalanced.999'; assert.throws(() => parseGame(JSON.stringify(old)), error => error.code === 'SAVE_VERSION');
  }
});
test('known full content v1 only accepts its actual historical balance combination', () => {
  const r = runner(options), old = r.ledger.game;
  old.core.contentVersion = 'full-demo.1';
  assert.throws(() => parseGame(JSON.stringify(old)), error => error.code === 'SAVE_VERSION');
  old.core.balanceVersion = 'full-unbalanced.1'; assert.equal(parseGame(JSON.stringify(old)).core.balanceVersion, C.BALANCE);
});
test('same-checkpoint cultivation exposes a real time versus capital tradeoff', () => {
  const probes = cultivationProbes(); assert.equal(probes.length, 72);
  for (const natural of probes.filter(p => p.cultivation === 'natural')) {
    const assisted = probes.find(p => p.school === natural.school && p.realm === natural.realm && p.capital === natural.capital && p.cultivation === 'assisted' && p.advancedMind === natural.advancedMind);
    assert.deepEqual(assisted.initial, natural.initial);
    if (natural.capital === 'prefunded-common-checkpoint') {
      assert.ok(assisted.totals.costs.months < natural.totals.costs.months); assert.ok(assisted.closing.stones < natural.closing.stones);
    } else assert.ok(!(assisted.totals.costs.months < natural.totals.costs.months && assisted.closing.stones > natural.closing.stones));
  }
});
test('all finite buy/sell and sellable recipe conversion cycles fail to create free currency', () => {
  const rows = conversionProbes(); assert.equal(rows.length, 21);
  for (const row of rows) {
    if (!row.saleRejected) assert.ok(row.stones <= 0);
    else { assert.equal(row.saleRejected, 'LOCKED_ITEM'); assert.equal(row.conversionClosed, false); }
  }
});
test('a real trial defeat can restore health and repurchase entry without counting rollback as income', () => {
  const probe = failureRecoveryProbe(); assert.equal(probe.failure.hp, 1); assert.equal(probe.failure.inventory.ascension_seal, 0);
  assert.equal(probe.restoredReadiness.inventory.ascension_seal, 1); assert.equal(probe.recoveryGrossStones, 1500);
  assert.equal(probe.recoveryMonths, 21); assert.equal(probe.checkpointRollbackCountedAsIncome, false);
});
