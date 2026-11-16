import test from 'node:test';
import assert from 'node:assert/strict';
import { driver } from './full-route.mjs';
import { stats } from '../src/full/engine.ts';
import { relics } from '../src/full/content.ts';

// Every loadout is earned with normal source/crafting/learning commands.
function loadout(school, skills = [], relic = null) {
  const d = driver('leave', school);
  d.realm();
  d.realm();
  d.funds(1000);
  d.go('sect');
  for (const skill of skills) {
    d.doAction({ type: 'LEARN', skill });
    d.doAction({ type: 'EQUIP', skill });
  }
  if (relic) {
    for (const [item, quantity] of Object.entries(relics[relic].inputs)) d.resource(item, quantity);
    d.go('cave');
    d.doAction({ type: 'FORGE', relic });
    d.doAction({ type: 'EQUIP_RELIC', relic });
  }
  return d;
}
function battle(d, moves) {
  if (!d.game.battle) {
    d.go('secret');
    d.doAction({ type: 'ENCOUNTER', enemy: 'serpent' });
  }
  for (const move of moves) d.doAction({ type: 'BATTLE', move });
}

test('six default skills drive different sword and talisman resources and releases', () => {
  const sword = loadout('sword');
  assert.deepEqual(sword.game.loadout, {
    mind: 'sword_mind', builder: 'sword_build', finisher: 'sword_release', relic: null,
  });
  battle(sword, ['technique']);
  assert.equal(sword.game.battle.sword, 2);
  battle(sword, ['attack']);
  assert.equal(sword.game.battle.sword, 3);
  const hpBeforeHeavy = sword.game.core.player.hp;
  battle(sword, ['release']);
  assert.equal(sword.game.battle.sword, 0);
  assert.equal(sword.game.core.player.hp, hpBeforeHeavy, 'full sword release interrupts the heavy hit');
  assert.ok(sword.game.journal.at(-1).includes('打断重击'));

  const talisman = loadout('talisman');
  assert.deepEqual(talisman.game.loadout, {
    mind: 'talisman_mind', builder: 'talisman_build', finisher: 'talisman_release', relic: null,
  });
  battle(talisman, ['technique']);
  assert.deepEqual(talisman.game.battle.marks, [1], 'application turn consumes the first duration tick');
  const enemyBefore = talisman.game.battle.hp;
  battle(talisman, ['release']);
  assert.deepEqual(talisman.game.battle.marks, []);
  assert.ok(talisman.game.battle.hp < enemyBefore);
});

for (const [school, mind] of [['sword', 'sword_still'], ['talisman', 'talisman_calm']]) {
  test(`${mind}: cultivation bonus and school-specific battle effect are real`, () => {
    const ordinary = loadout(school), trained = loadout(school, [mind]);
    for (const d of [ordinary, trained]) {
      d.go('cave');
      const before = d.game.core.player.xp;
      d.doAction({ type: 'CULTIVATE', method: 'natural' });
      assert.equal(d.game.core.player.xp - before, d === trained ? 300 : 240);
      battle(d, ['technique', 'technique']);
    }
    if (school === 'sword') {
      assert.equal(stats(trained.game).guard - stats(ordinary.game).guard, 6);
      battle(ordinary, ['guard']); battle(trained, ['guard']);
      assert.equal(trained.game.core.player.hp - ordinary.game.core.player.hp, 6);
    } else {
      battle(ordinary, ['attack']); battle(trained, ['attack']);
      assert.equal(trained.game.core.player.mp - ordinary.game.core.player.mp, 4);
    }
  });
}

test('sword_guard exchanges damage and sword generation for immediate protection', () => {
  const ordinary = loadout('sword'), ward = loadout('sword', ['sword_guard']);
  battle(ordinary, ['technique']); battle(ward, ['technique']);
  assert.equal(ordinary.game.battle.sword, 2);
  assert.equal(ward.game.battle.sword, 1);
  assert.ok(ward.game.battle.hp > ordinary.game.battle.hp);
  assert.ok(ward.game.core.player.hp > ordinary.game.core.player.hp);
  assert.equal(ward.game.core.player.mp, ordinary.game.core.player.mp);
});

test('sword_echo trades six release damage for healing while preserving interruption', () => {
  const ordinary = loadout('sword'), echo = loadout('sword', ['sword_echo']);
  battle(ordinary, ['attack', 'technique', 'release']);
  battle(echo, ['attack', 'technique', 'release']);
  assert.equal(echo.game.battle.hp - ordinary.game.battle.hp, 6);
  assert.ok(echo.game.core.player.hp > ordinary.game.core.player.hp);
  assert.equal(echo.game.battle.sword, 0);
  assert.ok(echo.game.journal.at(-1).includes('打断重击'));
});

test('talisman_frost extends the mark and pays more mana with less immediate protection', () => {
  const ordinary = loadout('talisman'), frost = loadout('talisman', ['talisman_frost']);
  battle(ordinary, ['technique']); battle(frost, ['technique']);
  assert.deepEqual(ordinary.game.battle.marks, [1]);
  assert.deepEqual(frost.game.battle.marks, [2]);
  assert.equal(ordinary.game.core.player.mp - frost.game.core.player.mp, 2);
  assert.ok(frost.game.core.player.hp < ordinary.game.core.player.hp);
});

test('talisman_return detonates the same marks and restores eighteen mana', () => {
  const ordinary = loadout('talisman'), returning = loadout('talisman', ['talisman_return']);
  battle(ordinary, ['technique', 'release']); battle(returning, ['technique', 'release']);
  assert.equal(returning.game.battle.hp, ordinary.game.battle.hp);
  assert.deepEqual(returning.game.battle.marks, []);
  assert.equal(returning.game.core.player.mp - ordinary.game.core.player.mp, 18);
});

test('frost_sword adds direct damage and preserves one sword after a release', () => {
  const ordinary = loadout('sword'), frost = loadout('sword', [], 'frost_sword');
  battle(ordinary, ['attack']); battle(frost, ['attack']);
  assert.equal(ordinary.game.battle.hp - frost.game.battle.hp, 5);
  battle(ordinary, ['technique', 'release']); battle(frost, ['technique', 'release']);
  assert.equal(ordinary.game.battle.sword, 0);
  assert.equal(frost.game.battle.sword, 1);
});

test('jade_seal reduces an actual unguarded hit by eight', () => {
  const ordinary = loadout('sword'), sealed = loadout('sword', [], 'jade_seal');
  battle(ordinary, ['attack']); battle(sealed, ['attack']);
  assert.equal(sealed.game.core.player.hp - ordinary.game.core.player.hp, 8);
});

test('soul_lamp increases both immediate mark damage and detonation damage', () => {
  const ordinary = loadout('talisman'), lamp = loadout('talisman', [], 'soul_lamp');
  battle(ordinary, ['technique']); battle(lamp, ['technique']);
  assert.equal(ordinary.game.battle.hp - lamp.game.battle.hp, 4);
  battle(ordinary, ['release']); battle(lamp, ['release']);
  assert.equal(ordinary.game.battle.hp - lamp.game.battle.hp, 8);
});

test('cloud_mirror recovers extra mana and health on the actual turn', () => {
  const ordinary = loadout('talisman'), mirror = loadout('talisman', [], 'cloud_mirror');
  battle(ordinary, ['technique', 'technique']); battle(mirror, ['technique', 'technique']);
  battle(ordinary, ['attack']); battle(mirror, ['attack']);
  assert.equal(mirror.game.core.player.mp - ordinary.game.core.player.mp, 6);
  const before = [ordinary, mirror].map(d => d.game.core.player.hp);
  assert.ok(before.every(hp => hp < stats(ordinary.game).maxHp), 'a heavy hit creates real missing health');
  battle(ordinary, ['guard']); battle(mirror, ['guard']);
  const healthDeltas = [ordinary, mirror].map((d, i) => d.game.core.player.hp - before[i]);
  assert.equal(healthDeltas[1] - healthDeltas[0], 4);
});
