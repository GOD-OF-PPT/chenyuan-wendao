import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, validateGame } from '../src/full/engine.ts';
import * as C from '../src/full/content.ts';
import { EngineLedger, reconcileLedger } from '../src/full/economy-ledger.ts';
import { ActivityLedger, projectProgression, progressionOptions, projectConfigurationCombat } from '../src/full/progression.ts';
import { driver } from './full-route.mjs';

// Earned rule fixtures isolate forecasts; they are not the current full Activity route evidence.
const command = (game, id, action) => ({ ...action, commandId: id, runId: game.core.runId, expectedRevision: game.core.revision });
test('stable audit commands reject duplicates, stale revisions and another life before mutation', () => {
  const ledger = new EngineLedger(newGame('只读', 'stable-ledger'));
  const c = command(ledger.game, 'economy-1', { type: 'CHOOSE', choice: 'leave' });
  ledger.applyCommand(c); const before = ledger.game;
  assert.throws(() => ledger.applyCommand(c), e => e.code === 'LEDGER_DUPLICATE');
  assert.throws(() => ledger.applyCommand({ ...c, commandId: 'stale' }), e => e.code === 'STALE_REVISION');
  assert.throws(() => ledger.applyCommand({ ...c, commandId: 'foreign', runId: 'other', expectedRevision: before.core.revision }), e => e.code === 'RUN_MISMATCH');
  assert.deepEqual(ledger.game, before); assert.equal(ledger.count, 1);
  ledger.apply({ type: 'TRAVEL', location: 'cave' });
  assert.equal(ledger.lastEntry.command.commandId, 'economy-2');
  const copy = ledger.lastEntry; copy.after.stones = 999;
  assert.notEqual(ledger.lastEntry.after.stones, 999);
  const report = ledger.report(true); reconcileLedger(report.initial, report.entries, report.closing);
});
test('Activity audit retains exact cycle command identity, integer duration and finite authorization', () => {
  const d = driver(), audit = new ActivityLedger(d.game, 'finite-audit', 2), before = d.game;
  const a = audit.run({ kind: 'cultivation', method: 'assisted', maxCycles: 50, until: 'xp-cap', stoneBudget: 20, stoneReserve: 0 });
  assert.equal(a.stopReason.code, 'ACTIVITY_BUDGET'); assert.equal(a.completedCycles, 1);
  assert.equal(audit.onlineMs, 60000); assert.equal(audit.game.core.player.stones, 20);
  assert.equal(audit.ledger.lastEntry.command.commandId, `cycle:${a.id}:0:1`);
  assert.equal(audit.steps[0].costs.stones, 20); assert.equal(audit.steps[0].gainedXp, 100);
  assert.deepEqual(d.game, before);
  assert.throws(() => audit.run({ kind: 'cultivation', method: 'natural', maxCycles: 50, until: 'xp-cap', stoneBudget: 0, stoneReserve: 0 }), e => e.code === 'PROJECTION_LIMIT');
  assert.equal(audit.onlineMs, 120000); assert.equal(audit.steps[1].cycles, 1);
});
for (const school of ['sword', 'talisman']) {
  const d = driver('leave', school);
  for (const realm of ['qi', 'foundation', 'golden', 'nascent', 'spirit']) {
    if (d.game.core.player.realm !== realm) d.realm();
    const game = structuredClone(d.game);
    test(`${school}/${realm}: every visible route is pure, same target, complete integer periods and balanced gross flow`, () => {
      const before = structuredClone(game);
      for (const kind of ['cultivation', 'preparation']) {
        for (const variant of progressionOptions(game, kind)) {
          const p = projectProgression(game, variant);
          assert.equal(p.complete, true, `${variant}: ${p.failure?.message}`); assert.equal(p.failure, null);
          assert.equal(p.closing.location, 'cave'); assert.equal(p.closing.realm, realm);
          assert.equal(p.closing.stones, p.initial.stones + p.totals.received.stones - p.totals.costs.stones);
          for (const id of Object.keys(C.items)) assert.equal(p.closing.inventory[id], p.initial.inventory[id] + (p.totals.received.items[id] ?? 0) - (p.totals.costs.items[id] ?? 0));
          assert.equal(p.onlineMs, p.steps.reduce((sum, step) => sum + step.onlineMs, 0));
          assert.equal(p.arrangements, p.steps.length);
          assert.ok(p.steps.every(s => s.kind === 'configuration' ? s.onlineMs === 0 : s.onlineMs === s.cycles * s.cycleMs));
          if (kind === 'cultivation') assert.equal(p.closing.xp, C.realms[realm].xpCap);
          else assert.equal(p.closing.inventory[C.realms[realm].pill], 1);
          assert.ok(!p.steps.some(s => s.plan?.kind === 'milestone'));
        }
      }
      assert.deepEqual(game, before);
    });
  }
}
test('already owned pill uses the same absolute target and does not buy or craft another', () => {
  const d = driver(); d.buy('foundation_pill', 1); d.go('cave');
  for (const variant of ['gather', 'purchase']) {
    const p = projectProgression(d.game, variant);
    assert.equal(p.complete, true); assert.equal(p.closing.inventory.foundation_pill, 1);
    assert.equal(p.onlineMs, 0); assert.deepEqual(p.steps, []); assert.equal(p.totals.costs.stones, 0);
  }
});
test('funding side XP can complete cultivation with no paid cycle; leftovers remain', () => {
  const d = driver(); d.realm(); d.meditate();
  // Consume all earned currency lawfully, then leave only one base point to the current cap.
  d.go('market'); const count = Math.floor(d.game.core.player.stones / 5); if (count) d.doAction({ type: 'BUY', item: 'herb', quantity: count }); d.go('cave');
  const boundary = structuredClone(d.game); boundary.core.player.xp = C.realms.foundation.xpCap - 1; validateGame(boundary);
  const p = projectProgression(boundary, 'assisted');
  assert.equal(p.complete, true); assert.ok(p.steps.some(s => s.plan?.kind === 'source'));
  assert.ok(!p.steps.some(s => s.plan?.kind === 'cultivation'));
  assert.equal(p.totals.costs.stones, 0); assert.ok(p.closing.stones >= 30);
});
test('zero cash remains recoverable through safe income; terminal/unknown phases and exhausted lifespan are explicit', () => {
  const d = driver(); d.go('market'); d.doAction({ type: 'BUY', item: 'herb', quantity: 8 }); d.go('cave');
  assert.equal(d.game.core.player.stones, 0);
  const p = projectProgression(d.game, 'purchase'); assert.equal(p.complete, true); assert.ok(p.steps.some(s => s.plan?.kind === 'source'));
  const opening = newGame('待抉择', 'opening'); assert.equal(projectProgression(opening, 'natural').failure.code, 'PROJECTION_PHASE');
  const short = structuredClone(d.game); short.core.world.elapsedMonths = C.realms.qi.lifespanMonths - short.core.player.startAgeMonths - 1;
  // Boundary fixture uses the persisted birth/lifespan relationship rather than granting resources.
  validateGame(short); assert.equal(projectProgression(short, 'purchase').complete, false);
});
test('mortal natural projection ends at the actual cap without opening a school or breakthrough', () => {
  const audit = new EngineLedger(newGame('初修', 'mortal-outlook')); audit.apply({ type: 'CHOOSE', choice: 'leave' });
  const p = projectProgression(audit.game, 'natural');
  assert.equal(p.complete, true); assert.equal(p.closing.realm, 'mortal'); assert.equal(p.closing.xp, 10);
  assert.equal(p.onlineMs, 66000); assert.equal(p.steps.at(-1).cycles, 2);
  assert.equal(projectProgression(audit.game, 'assisted').complete, false);
});
test('configuration combat outlook uses actual current resources and remains read-only', () => {
  const d = driver(); d.realm(); d.funds(100); d.go('sect'); d.doAction({ type: 'LEARN', skill: 'sword_still' }); d.go('cave');
  const before = structuredClone(d.game), p = projectConfigurationCombat(d.game, { type: 'EQUIP', skill: 'sword_still' });
  assert.equal(p.enemy, 'serpent'); assert.equal(p.configurationAllowed, true); assert.ok(p.after);
  assert.ok(p.before.onlineMs >= 30000); assert.ok(p.after.onlineMs >= 36000);
  assert.ok(p.before.spentItems.healing_pill === undefined); assert.deepEqual(d.game, before);
  const invalid = projectConfigurationCombat(d.game, { type: 'EQUIP_RELIC', relic: 'soul_lamp' });
  assert.equal(invalid.configurationAllowed, false); assert.equal(invalid.after, null);
});
