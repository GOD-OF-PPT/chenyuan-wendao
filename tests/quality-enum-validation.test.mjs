import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  parseGame,
  resolve,
  validateCommand,
} from '../src/full/engine.ts';
import { driver } from './full-route.mjs';

test('current saves reject non-string enum shapes rather than admitting a sealed or inconsistent life', () => {
  const d = driver('leave', 'sword'),
    valid = d.game;
  for (const [label, alter] of [
    ['status', (g) => (g.status = ['active'])],
    ['mode', (g) => (g.core.mode = ['idle'])],
    ['opening', (g) => (g.core.openingChoice = ['leave'])],
    ['school', (g) => (g.school = ['sword'])],
  ]) {
    const game = structuredClone(valid);
    alter(game);
    const raw = JSON.stringify(game);
    assert.throws(
      () => parseGame(raw),
      (e) => e.code?.startsWith('SAVE_'),
      label,
    );
    assert.equal(JSON.stringify(game), raw, label + ' original data remains');
  }
});

test('current command enums reject arrays and objects without paying for a different result', () => {
  const fields = [
    { type: 'CHOOSE', choice: 'trade' },
    { type: 'SCHOOL', school: 'sword' },
    { type: 'BATTLE', move: 'attack' },
    { type: 'ANSWER_TRIAL', answer: 'accept' },
    { type: 'END', ending: 'transmit' },
  ];
  for (const action of fields) {
    const key = Object.keys(action).find((k) => k !== 'type');
    for (const value of [[action[key]], {}, null, 0, true]) {
      const command = {
        ...action,
        [key]: value,
        commandId: 'bad-' + key,
        runId: 'enum-run',
        expectedRevision: 0,
      };
      assert.throws(
        () => validateCommand(command),
        (e) => e.code === 'INVALID_COMMAND',
        key + ' ' + JSON.stringify(value),
      );
    }
  }
  const game = newGame('枚举测试', 'enum-run'),
    original = structuredClone(game);
  assert.throws(
    () =>
      resolve(game, {
        type: 'CHOOSE',
        choice: ['trade'],
        commandId: 'bad-pay',
        runId: game.core.runId,
        expectedRevision: 0,
      }),
    (e) => e.code === 'INVALID_COMMAND',
  );
  assert.deepEqual(game, original);
  const actual = resolve(game, {
    type: 'CHOOSE',
    choice: 'trade',
    commandId: 'legal-trade',
    runId: game.core.runId,
    expectedRevision: 0,
  });
  assert.equal(actual.nextState.core.inventory.healing_pill, 0);
  assert.equal(actual.nextState.core.openingChoice, 'trade');
  assert.deepEqual(actual.nextState.core.learnedSkills, [
    'skill_jinghong_slash',
  ]);
});
