import assert from 'node:assert/strict';
import * as C from '../../src/full/content.ts';
import { previewAction } from '../../src/full/queries.ts';
import { runner, runScenario, preparations } from './scenarios.mjs';

const options = { choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural', advancedMind: false };
const digestRun = r => ({ id: r.id, options: r.options, success: r.success, failure: r.failure, fallbacks: r.fallbacks,
  actionsSha256: r.actionsSha256, closing: r.closing, totals: r.totals,
  realms: r.realms.map(({ realm, opening, closing, ...totals }) => ({ realm, opening: { stones: opening.stones, xp: opening.xp, months: opening.months },
    closing: { stones: closing.stones, xp: closing.xp, months: closing.months }, ...totals })) });
export function matrix(withEntries = false) {
  const runs = [];
  for (const choice of ['help', 'trade', 'leave']) for (const school of ['sword', 'talisman'])
    for (const preparation of preparations) for (const cultivation of ['natural', 'assisted']) for (const advancedMind of [false, true]) {
      const result = runScenario({ choice, school, preparation, cultivation, advancedMind }, withEntries);
      assert.equal(result.success, true, result.id + ': ' + JSON.stringify(result.failure));
      runs.push(withEntries ? result : digestRun(result));
    }
  return runs;
}
export function cultivationProbes() {
  const probes = [];
  for (const school of ['sword', 'talisman']) {
    const origin = runner({ ...options, school }); origin.grow('spirit', false);
    for (const [realm, game] of Object.entries(origin.checkpoints)) for (const capital of ['working-balance', 'prefunded-common-checkpoint']) {
      const funding = runner({ ...options, school }, game);
      if (capital === 'prefunded-common-checkpoint') funding.funds(C.assistedCosts[realm] * Math.ceil(C.realms[realm].xpCap / C.realms[realm].baseYield), 'common-starting-capital');
      const common = funding.ledger.game, fundingReport = funding.ledger.report();
      for (const advancedMind of [false, true]) {
        if (realm === 'qi' && advancedMind) continue;
        for (const cultivation of ['natural', 'assisted']) {
          const r = runner({ ...options, school, advancedMind, cultivation }, common);
          if (advancedMind) r.mind();
          r.meditate(); const report = r.ledger.report();
          probes.push({ school, realm, advancedMind, cultivation, capital, origin: 'same-real-command-checkpoint',
            commonFunding: fundingReport.totals, ...report });
        }
      }
    }
  }
  return probes;
}
export function conversionProbes() {
  const origin = runner(options); origin.grow('spirit', false);
  const rows = [];
  for (const [item, config] of Object.entries(C.items)) {
    const r = runner(options, origin.ledger.game); r.funds(config.buy); r.go('market');
    const start = r.ledger.count;
    r.act({ type: 'BUY', item, quantity: 1 }, 'conversion');
    const quote = previewAction(r.ledger.game, { type: 'SELL', item, quantity: 1 });
    if (config.sell === null) {
      assert.equal(quote.allowed, false);
      assert.throws(() => r.act({ type: 'SELL', item, quantity: 1 }, 'conversion'), error => error.code === quote.failure.code);
      rows.push({ kind: 'buy-sell', item, saleRejected: quote.failure.code, conversionClosed: false }); continue;
    }
    r.act({ type: 'SELL', item, quantity: 1 }, 'conversion');
    const entries = r.ledger.entries.slice(start), before = entries[0].before, after = entries.at(-1).after;
    assert.deepEqual(after.inventory, before.inventory); assert.ok(after.stones <= before.stones);
    rows.push({ kind: 'buy-sell', item, stones: after.stones - before.stones, months: after.months - before.months, commands: entries.length });
  }
  for (const [recipeId, recipe] of Object.entries(C.recipes)) {
    const config = C.items[recipe.output];
    const r = runner(options, origin.ledger.game);
    r.funds(recipe.stones + Object.entries(recipe.inputs).reduce((sum, [id, n]) => sum + C.items[id].buy * n, 0));
    const start = r.ledger.count;
    r.go('market', 'conversion');
    for (const [item, quantity] of Object.entries(recipe.inputs)) r.act({ type: 'BUY', item, quantity }, 'conversion');
    r.go('cave', 'conversion'); r.act({ type: 'CRAFT', recipeId }, 'conversion');
    r.go('market', 'conversion');
    if (config.sell === null) {
      const quote = previewAction(r.ledger.game, { type: 'SELL', item: recipe.output, quantity: 1 });
      assert.equal(quote.allowed, false);
      assert.throws(() => r.act({ type: 'SELL', item: recipe.output, quantity: 1 }, 'conversion'), error => error.code === quote.failure.code);
      const entries = r.ledger.entries.slice(start), before = entries[0].before, after = entries.at(-1).after;
      assert.equal(after.inventory[recipe.output], before.inventory[recipe.output] + 1);
      rows.push({ kind: 'buy-craft-sell', recipeId, saleRejected: quote.failure.code, conversionClosed: false,
        stones: after.stones - before.stones, months: after.months - before.months, commands: entries.length }); continue;
    }
    r.act({ type: 'SELL', item: recipe.output, quantity: 1 }, 'conversion');
    const entries = r.ledger.entries.slice(start), before = entries[0].before, after = entries.at(-1).after;
    assert.deepEqual(after.inventory, before.inventory); assert.ok(after.stones < before.stones); assert.ok(after.months > before.months);
    rows.push({ kind: 'buy-craft-sell', recipeId, stones: after.stones - before.stones, months: after.months - before.months, commands: entries.length });
  }
  return rows;
}
export function sourceRates() {
  return C.realmIds.filter(id => !['mortal', 'ascended'].includes(id)).map(realm => {
    const eligible = Object.entries(C.sources).filter(([, s]) => C.rank(s.min) <= C.rank(realm));
    return { realm, sources: eligible.map(([id, s]) => ({ id, months: s.months, stones: s.stones, xpBeforeCap: s.xp, items: s.items,
      dominatedBy: eligible.filter(([other, v]) => other !== id &&
        v.stones * s.months >= s.stones * v.months && v.xp * s.months >= s.xp * v.months &&
        Object.keys(C.items).every(item => (v.items[item] ?? 0) * s.months >= (s.items[item] ?? 0) * v.months) &&
        (v.stones * s.months > s.stones * v.months || v.xp * s.months > s.xp * v.months ||
        Object.keys(C.items).some(item => (v.items[item] ?? 0) * s.months > (s.items[item] ?? 0) * v.months)))
        .map(([other, v]) => ({ id: other, classification: C.rank(v.min) > C.rank(s.min) ? 'intentional-higher-tier' : 'same-tier-review' })) })) };
  });
}
export function combatProbes() {
  const rows = [];
  const builds = [
    { id: 'sword-burst', school: 'sword', skills: ['sword_still'], relic: 'frost_sword', policy: 'guarded' },
    { id: 'sword-steady', school: 'sword', skills: ['sword_still', 'sword_guard', 'sword_echo'], relic: 'jade_seal', policy: 'guarded' },
    { id: 'talisman-ongoing', school: 'talisman', skills: ['talisman_calm', 'talisman_frost'], relic: 'soul_lamp', policy: 'ongoing' },
    { id: 'talisman-cashout', school: 'talisman', skills: ['talisman_calm', 'talisman_frost', 'talisman_return'], relic: 'cloud_mirror', policy: 'guarded' },
  ];
  for (const build of builds) {
    const origin = runner({ ...options, school: build.school }); origin.grow('spirit', false);
    for (const realm of ['golden', 'spirit']) {
      const r = runner({ ...options, school: build.school }, origin.checkpoints[realm]);
      const investmentStart = r.ledger.count;
      for (const skill of build.skills) { r.funds(C.skills[skill].price, 'build-investment'); r.go('sect', 'build-investment');
        r.act({ type: 'LEARN', skill }, 'build-investment'); r.act({ type: 'EQUIP', skill }, 'build-investment'); }
      r.relic(build.relic); r.rest(); const preparation = r.ledger.report();
      const start = r.ledger.count, enemy = realm === 'golden' ? 'puppet' : 'sentinel';
      r.go(C.enemies[enemy].location, 'combat'); r.act({ type: 'ENCOUNTER', enemy }, 'combat'); r.fight(build.policy, 'combat');
      const report = r.ledger.report(), entries = r.ledger.entries.slice(start);
      rows.push({ id: build.id, realm, enemy, policy: build.policy, investmentCommands: start - investmentStart,
        preparation: preparation.totals, battle: entries.map(({ command, result }) => ({ move: command.type === 'BATTLE' ? command.move : command.type, costs: result.costs, delta: result.delta })),
        survived: report.closing.wins > preparation.closing.wins, closing: report.closing });
    }
  }
  return rows;
}
export function failureRecoveryProbe() {
  const r = runner(options); r.grow('spirit', false);
  r.trial('reckless', false);
  assert.equal(r.ledger.game.status, 'active'); assert.equal(r.ledger.game.battle, null);
  const failure = r.ledger.report(), count = r.ledger.count;
  r.rest('failure-recovery'); r.buy('ascension_seal', 1, 'failure-recovery'); r.go('terrace', 'failure-recovery');
  assert.equal(previewAction(r.ledger.game, { type: 'START_TRIAL' }).allowed, true);
  const ready = r.ledger.report(), entries = r.ledger.entries.slice(count);
  return { policy: 'base sword, no relic, reckless attacks, no added potions', failedTrial: true,
    failure: failure.closing, restoredReadiness: ready.closing, recovery: entries.map(({ command, result }) => ({ type: command.type, costs: result.costs, delta: result.delta })),
    recoveryMonths: ready.closing.months - failure.closing.months, recoveryStoneNet: ready.closing.stones - failure.closing.stones,
    recoveryGrossStones: entries.reduce((sum, e) => sum + e.result.costs.stones, 0),
    checkpointRollbackCountedAsIncome: false };
}
export function comparisons(runs, baselineRuns) {
  return runs.map(run => {
    const previous = baselineRuns.find(old => old.id === run.id); assert.ok(previous);
    // Terminal realm/status, opening, school, mind, gear and endpoint match. Inventory differences disallow domination.
    const candidates = runs.filter(other => other.id !== run.id && other.options.choice === run.options.choice &&
      other.options.school === run.options.school && other.options.advancedMind === run.options.advancedMind &&
      JSON.stringify(other.closing.inventory) === JSON.stringify(run.closing.inventory));
    const better = candidates.filter(other => other.totals.costs.months <= run.totals.costs.months && other.totals.commands <= run.totals.commands &&
      other.totals.battleTurns <= run.totals.battleTurns && other.closing.stones >= run.closing.stones && other.closing.hp >= run.closing.hp && other.closing.mp >= run.closing.mp && other.closing.wins >= run.closing.wins &&
      (other.totals.costs.months < run.totals.costs.months || other.totals.commands < run.totals.commands || other.totals.battleTurns < run.totals.battleTurns || other.closing.stones > run.closing.stones || other.closing.hp > run.closing.hp || other.closing.mp > run.closing.mp || other.closing.wins > run.closing.wins));
    return { id: run.id, baselineDelta: { months: run.totals.costs.months - previous.totals.costs.months,
      commands: run.totals.commands - previous.totals.commands, closingStones: run.closing.stones - previous.closing.stones },
      dominatedInMeasuredCandidatesBy: better.map(other => other.id) };
  });
}
