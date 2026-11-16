import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdventure, advance as advanceLegacy } from '../src/game/adventure.ts';
import { parseGame } from '../src/full/engine.ts';

for (const choice of ['help', 'trade', 'leave']) {
  for (const school of ['sword', 'talisman']) {
    test(`real Adventure snapshots retain resources and pending battle: ${choice}/${school}`, () => {
      let legacy = createAdventure('兼容测试', `legacy-${choice}-${school}`);
      const samples = [legacy];
      const action = payload => {
        legacy = advanceLegacy(legacy, {
          ...payload, commandId: `legacy-${legacy.core.revision}`,
          runId: legacy.core.runId, expectedRevision: legacy.core.revision,
        });
        samples.push(legacy);
      };
      action({ type: 'CHOOSE', choice });
      action({ type: 'TRAVEL', location: 'cave' });
      action({ type: 'CULTIVATE', method: 'natural', count: 5 });
      action({ type: 'BREAKTHROUGH' });
      action({ type: 'SCHOOL', school });
      action({ type: 'TRAVEL', location: 'wilderness' });
      action({ type: 'ENCOUNTER', enemy: 'wolf' });
      action({ type: 'BATTLE', move: 'technique' });
      for (const sample of samples) {
        const raw = JSON.stringify(sample), converted = parseGame(raw);
        assert.deepEqual(converted.core.player, sample.core.player);
        assert.deepEqual(converted.core.world, sample.core.world);
        assert.equal(converted.core.runId, sample.core.runId);
        assert.equal(converted.core.revision, sample.core.revision);
        assert.deepEqual(converted.core.activeEvent, sample.core.activeEvent);
        assert.deepEqual(converted.battle, sample.battle);
        assert.equal(converted.school, sample.school);
        for (const [item, quantity] of Object.entries(sample.core.inventory)) {
          assert.equal(converted.core.inventory[item], quantity);
        }
        assert.deepEqual(parseGame(JSON.stringify(converted)), converted);
        assert.equal(JSON.stringify(sample), raw, 'conversion must not mutate its source');
      }
    });
  }
}
