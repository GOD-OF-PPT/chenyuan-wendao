import { createHash } from 'node:crypto';
import * as C from '../../src/full/content.ts';
import { newGame, reason } from '../../src/full/engine.ts';
import { previewAction } from '../../src/full/queries.ts';
import { EngineLedger } from '../../src/full/economy-ledger.ts';

export const preparations = ['gather', 'alternate', 'buy-inputs', 'buy-product', 'hunt'];
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function runner(options, checkpoint) {
  const id = [options.choice, options.school, options.preparation, options.cultivation, options.advancedMind ? 'advanced' : 'base'].join('-');
  const ledger = new EngineLedger(checkpoint ?? newGame('经济回放', 'economy-' + id));
  const checkpoints = {}, fallbacks = [];
  const act = (action, purpose) => {
    if (ledger.count > 1500) throw new Error('SCENARIO_ACTION_BOUND');
    return ledger.apply(action, purpose);
  };
  const go = (location, purpose) => { if (ledger.game.core.world.location !== location) act({ type: 'TRAVEL', location }, purpose); };
  const funds = (amount, purpose = 'funding') => {
    for (let iterations = 0; ledger.game.core.player.stones < amount; iterations++) {
      if (iterations > 100) throw new Error('FUNDING_BOUND');
      const game = ledger.game;
      const candidates = Object.entries(C.sources).filter(([, source]) => source.stones > 0 && !Object.keys(source.items).length && C.rank(source.min) <= C.rank(game.core.player.realm));
      candidates.sort((a, b) => b[1].stones / b[1].months - a[1].stones / a[1].months || order(a[0], b[0]));
      const [sourceId, source] = candidates[0]; go(source.location, purpose);
      act({ type: 'SOURCE', sourceId, count: Math.min(C.maxBatch, Math.ceil((amount - ledger.game.core.player.stones) / source.stones)) }, purpose);
    }
  };
  const buy = (item, quantity, purpose = 'procurement') => {
    const missing = quantity - ledger.game.core.inventory[item]; if (missing <= 0) return;
    funds(C.items[item].buy * missing, purpose); go('market', purpose); act({ type: 'BUY', item, quantity: missing }, purpose);
  };
  const rest = (purpose = 'recovery') => { go('cave', purpose); if (!reason(ledger.game, { type: 'REST' })) act({ type: 'REST' }, purpose); };
  const fight = (policy = 'guarded', purpose = 'battle') => {
    for (let turns = 0; ledger.game.battle; turns++) {
      if (turns >= 150) throw new Error('BATTLE_BOUND');
      const game = ledger.game, available = move => !reason(game, { type: 'BATTLE', move });
      let move = 'attack';
      if (policy !== 'reckless') {
        if (game.core.player.hp < C.realms[game.core.player.realm].maxHp / 2 && available('heal')) move = 'heal';
        else if (game.battle.round % 3 === 2) move = 'guard';
        else if (policy !== 'ongoing' && available('release')) move = 'release';
        else if (available('technique')) move = 'technique';
      }
      act({ type: 'BATTLE', move }, purpose);
    }
  };
  const gather = (item, quantity, alternate = false, purpose = 'materials') => {
    const game = ledger.game;
    const candidates = Object.entries(C.sources).filter(([, source]) => source.items[item] && C.rank(source.min) <= C.rank(game.core.player.realm));
    const [sourceId, source] = alternate ? candidates.at(-1) : candidates[0];
    go(source.location, purpose);
    if (ledger.game.core.inventory[item] < quantity) act({ type: 'SOURCE', sourceId, count: C.maxBatch, target: { item, quantity } }, purpose);
  };
  const resource = (item, quantity, purpose = 'materials') => {
    if (ledger.game.core.inventory[item] >= quantity) return;
    if (options.preparation.startsWith('buy')) { buy(item, quantity, purpose); return; }
    if (options.preparation === 'hunt') {
      const enemies = Object.entries(C.enemies).filter(([, enemy]) => !enemy.trial && enemy.loot[item] && C.rank(enemy.min) <= C.rank(ledger.game.core.player.realm));
      enemies.sort((a, b) => C.rank(b[1].min) - C.rank(a[1].min) || a[1].hp - b[1].hp || order(a[0], b[0]));
      if (enemies.length) {
        const [enemyId, enemy] = enemies[0]; let defeats = 0;
        for (let attempts = 0; ledger.game.core.inventory[item] < quantity; attempts++) {
          if (attempts > 40) throw new Error('HUNT_BOUND');
          rest('hunt-recovery'); go(enemy.location, purpose); const wins = ledger.game.wins;
          act({ type: 'ENCOUNTER', enemy: enemyId }, purpose); fight('guarded', purpose);
          if (ledger.game.wins === wins && ++defeats >= 2) { fallbacks.push({ item, enemy: enemyId, defeats }); break; }
        }
        rest('hunt-recovery');
        if (ledger.game.core.inventory[item] >= quantity) return;
      }
    }
    gather(item, quantity, options.preparation === 'alternate', purpose);
  };
  const craft = (recipeId, purpose = 'breakthrough-materials') => {
    const recipe = C.recipes[recipeId];
    for (const [item, quantity] of Object.entries(recipe.inputs)) resource(item, quantity, purpose);
    funds(recipe.stones, purpose); go('cave', purpose); act({ type: 'CRAFT', recipeId }, purpose);
  };
  const meditate = (method = options.cultivation) => {
    for (let attempts = 0; ledger.game.core.player.xp < C.realms[ledger.game.core.player.realm].xpCap; attempts++) {
      if (attempts > 30) throw new Error('CULTIVATION_BOUND');
      const game = ledger.game;
      if (method === 'assisted' && game.core.player.realm !== 'mortal') {
        const quote = previewAction(game, { type: 'CULTIVATE', method, count: 1 });
        funds(quote.costs.stones, 'cultivation-funding'); go('cave', 'cultivation');
        if (ledger.game.core.player.xp === C.realms[ledger.game.core.player.realm].xpCap) break;
        const single = previewAction(ledger.game, { type: 'CULTIVATE', method, count: 1 });
        if (!single.allowed) throw new Error('CULTIVATION_PREVIEW:' + single.failure.code);
        const steps = Math.ceil((C.realms[ledger.game.core.player.realm].xpCap - ledger.game.core.player.xp) / single.delta.xp);
        funds(steps * single.costs.stones, 'cultivation-funding');
      }
      go('cave', 'cultivation');
      if (ledger.game.core.player.xp < C.realms[ledger.game.core.player.realm].xpCap) act({ type: 'CULTIVATE', method: ledger.game.core.player.realm === 'mortal' ? 'natural' : method, count: C.maxBatch }, 'cultivation');
    }
  };
  const mind = () => {
    const skill = options.school === 'sword' ? 'sword_still' : 'talisman_calm';
    if (!ledger.game.learned.includes(skill)) { funds(C.skills[skill].price, 'mind-investment'); go('sect', 'mind-investment'); act({ type: 'LEARN', skill }, 'mind-investment'); }
    if (ledger.game.loadout.mind !== skill) act({ type: 'EQUIP', skill }, 'mind-investment');
  };
  const relic = (id = 'jade_seal') => {
    if (!ledger.game.ownedRelics.includes(id)) {
      for (const [item, quantity] of Object.entries(C.relics[id].inputs)) resource(item, quantity, 'relic-investment');
      funds(C.relics[id].stones, 'relic-investment'); go('cave', 'relic-investment'); act({ type: 'FORGE', relic: id }, 'relic-investment');
    }
    if (ledger.game.loadout.relic !== id) act({ type: 'EQUIP_RELIC', relic: id }, 'relic-investment');
  };
  const realm = () => {
    const current = C.realms[ledger.game.core.player.realm];
    if (current.pill) {
      if (options.preparation === 'buy-product') buy(current.pill, 1, 'breakthrough-materials');
      else craft(Object.keys(C.recipes).find(id => C.recipes[id].output === current.pill));
    }
    meditate(); go('cave', 'breakthrough'); act({ type: 'BREAKTHROUGH' }, 'breakthrough');
  };
  if (!checkpoint) {
    act({ type: 'CHOOSE', choice: options.choice }, 'opening');
    realm(); act({ type: 'SCHOOL', school: options.school }, 'school');
  }
  const grow = (target = 'spirit', equipment = true) => {
    while (ledger.game.core.player.realm !== target) {
      checkpoints[ledger.game.core.player.realm] ??= ledger.game;
      if (options.advancedMind && C.rank(ledger.game.core.player.realm) >= C.rank('foundation')) mind();
      if (equipment && C.rank(ledger.game.core.player.realm) >= C.rank('golden')) relic();
      realm();
    }
    checkpoints[target] ??= ledger.game;
    if (options.advancedMind && C.rank(target) >= C.rank('foundation')) mind();
    if (equipment && C.rank(target) >= C.rank('golden')) relic();
  };
  const trial = (policy = 'guarded', supplies = true) => {
    if (options.preparation === 'buy-product') buy('ascension_seal', 1, 'trial-materials'); else craft('ascension', 'trial-materials');
    if (supplies) { buy('healing_pill', 12, 'trial-supplies'); buy('spirit_pill', 4, 'trial-supplies'); }
    meditate(); rest('trial-recovery'); go('terrace', 'trial-entry'); act({ type: 'START_TRIAL' }, 'trial-entry');
    act({ type: 'ANSWER_TRIAL', answer: 'accept' }, 'trial-entry'); fight(policy, 'trial');
    if (ledger.game.trial?.stage === 4) act({ type: 'END', ending: 'transmit' }, 'ending');
  };
  return { id, ledger, checkpoints, fallbacks, act, go, funds, buy, gather, resource, craft, rest, fight, meditate, mind, relic, realm, grow, trial };
}

export function runScenario(options, withEntries = false) {
  const r = runner(options); let failure = null;
  try { r.grow(); r.trial(); if (r.ledger.game.status !== 'ascended') throw new Error('TRIAL_FAILED'); }
  catch (error) { failure = { code: error.code ?? error.message, message: error.message }; }
  const entries = r.ledger.entries, report = r.ledger.report(withEntries);
  return { id: r.id, options: { ...options }, success: failure === null, failure, fallbacks: r.fallbacks,
    actionsSha256: createHash('sha256').update(JSON.stringify(entries.map(entry => entry.command))).digest('hex'), ...report };
}
