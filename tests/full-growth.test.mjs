import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, stats, validateGame } from '../src/full/engine.ts';
import * as C from '../src/full/content.ts';
import { driver, fullRoute } from './full-route.mjs';

const command = (game, action) => ({
  ...action, commandId: `growth-${game.core.revision}`, runId: game.core.runId,
  expectedRevision: game.core.revision,
});
const route = fullRoute();

for (const realm of ['qi', 'foundation', 'golden', 'nascent', 'spirit']) {
  test(`${realm}: cultivation and consumable deficits each reject without charging`, () => {
    const checkpoint = realm === 'spirit' ? route.checkpoints.trial : route.checkpoints[realm];
    const action = { type: realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH' };
    for (const missing of ['xp', 'item']) {
      const game = structuredClone(checkpoint);
      if (missing === 'xp') game.core.player.xp--;
      else game.core.inventory[C.realms[realm].pill] = 0;
      validateGame(game);
      const before = JSON.stringify(game);
      assert.throws(() => advance(game, command(game, action)), error =>
        error.code === (missing === 'xp' ? 'XP_REQUIRED' : 'INSUFFICIENT_ITEM'));
      assert.equal(JSON.stringify(game), before);
    }
  });

  test(`${realm}: empty inventory and currency can recover and earn through real commands`, () => {
    const checkpoint = realm === 'spirit' ? route.checkpoints.trial : route.checkpoints[realm];
    let game = structuredClone(checkpoint);
    Object.assign(game.core.player, { hp: 1, mp: 0, stones: 0, xp: 0 });
    game.core.inventory = Object.fromEntries(Object.keys(C.items).map(id => [id, 0]));
    game.core.world.location = 'cave';
    validateGame(game);
    const months = game.core.world.elapsedMonths;
    game = advance(game, command(game, { type: 'REST' }));
    assert.equal(game.core.player.stones, 0);
    assert.equal(game.core.player.hp, stats(game).maxHp);
    assert.equal(game.core.player.mp, stats(game).maxMp);
    assert.equal(game.core.world.elapsedMonths, months + 1);
    game = advance(game, command(game, { type: 'CULTIVATE', method: 'natural' }));
    assert.ok(game.core.player.xp > 0);
    game = advance(game, command(game, { type: 'TRAVEL', location: 'sect' }));
    game = advance(game, command(game, { type: 'SOURCE', sourceId: 'work' }));
    assert.ok(game.core.player.stones > 0);
  });
}

test('full cultivation and source batches have the same resources and game time as individual actions', () => {
  for (const action of [
    { type: 'CULTIVATE', method: 'natural' },
    { type: 'SOURCE', sourceId: 'herbs' },
  ]) {
    const d = driver();
    d.go(action.type === 'SOURCE' ? 'wilderness' : 'cave');
    const start = d.game;
    const batch = advance(start, command(start, { ...action, count: 4 }));
    let single = start;
    for (let i = 0; i < 4; i++) single = advance(single, command(single, action));
    for (const field of ['player', 'inventory', 'world']) assert.deepEqual(batch.core[field], single.core[field]);
    assert.equal(batch.core.revision, start.core.revision + 1);
    assert.equal(single.core.revision, start.core.revision + 4);
  }
});

test('full engine rejects a stale revision and a different run without modifying the snapshot', () => {
  const d = driver();
  d.go('cave');
  const before = JSON.stringify(d.game), valid = command(d.game, { type: 'CULTIVATE', method: 'natural' });
  assert.throws(() => advance(d.game, { ...valid, expectedRevision: valid.expectedRevision - 1 }), e => e.code === 'STALE_REVISION');
  assert.throws(() => advance(d.game, { ...valid, runId: 'other-run' }), e => e.code === 'RUN_MISMATCH');
  assert.equal(JSON.stringify(d.game), before);
});
