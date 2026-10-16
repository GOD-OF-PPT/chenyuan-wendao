import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { advance, stats, parseGame, validateGame } from '../src/full/engine.ts';
import { previewAction } from '../src/full/queries.ts';
import { driver } from './full-route.mjs';
import { createAdventure, advance as advanceLegacy } from '../src/game/adventure.ts';
const command = (g, a) => ({ ...a, commandId: 'manual-' + g.core.revision, runId: g.core.runId, expectedRevision: g.core.revision });
const take = (g, a) => advance(g, command(g, a));
for (const choice of ['help', 'leave']) for (const school of ['sword', 'talisman']) test(`${choice}/${school}: actual later paid study reaches the same permanent opening insight`, () => {
  const d = driver(choice, school); d.realm(); d.funds(C.swordManual.price); d.go('sect'); const before = structuredClone(d.game);
  const quote = previewAction(before, { type: 'STUDY', manual: 'jinghong' }); assert.equal(quote.allowed, true); assert.equal(quote.costs.stones, 80);
  d.doAction({ type: 'STUDY', manual: 'jinghong' }); assert.equal(d.game.core.player.stones, before.core.player.stones - 80);
  assert.deepEqual(d.game.core.learnedSkills, [C.swordManual.id]); assert.deepEqual(d.game.learned, before.learned); assert.deepEqual(d.game.loadout, before.loadout);
  assert.equal(d.game.core.world.elapsedMonths, before.core.world.elapsedMonths); assert.equal(d.game.core.player.xp, before.core.player.xp);
  assert.equal(stats(d.game).manualDamageBonus, school === 'sword' ? 4 : 0); assert.deepEqual(parseGame(JSON.stringify(d.game)), d.game);
  const after = structuredClone(d.game); assert.throws(() => d.doAction({ type: 'STUDY', manual: 'jinghong' }), e => e.code === 'ALREADY_LEARNED'); assert.deepEqual(d.game, after);
  if (school === 'talisman') { d.doAction({ type: 'SCHOOL', school: 'sword' }); assert.equal(stats(d.game).manualDamageBonus, 4); d.doAction({ type: 'SCHOOL', school: 'talisman' }); assert.equal(stats(d.game).manualDamageBonus, 0); }
});
test('trade keeps its early benefit, while realm, place, balance and event locks reject unpaid study', () => {
  const trade = driver('trade'); trade.go('sect'); assert.deepEqual(trade.game.core.learnedSkills, [C.swordManual.id]);
  assert.equal(stats(trade.game).manualDamageBonus, 4); assert.throws(() => trade.doAction({ type: 'STUDY', manual: 'jinghong' }), e => e.code === 'ALREADY_LEARNED');
  const d = driver(); d.go('sect'); assert.throws(() => d.doAction({ type: 'STUDY', manual: 'jinghong' }), e => e.code === 'REALM_REQUIRED');
  d.realm(); assert.throws(() => d.doAction({ type: 'STUDY', manual: 'jinghong' }), e => e.code === 'LOCATION_REQUIRED');
  d.go('sect'); assert.throws(() => d.doAction({ type: 'STUDY', manual: 'jinghong' }), e => e.code === 'INSUFFICIENT_STONES');
  d.funds(80); d.doAction({ type: 'EVENT', event: 'shen_return' }); const before = structuredClone(d.game);
  assert.throws(() => d.doAction({ type: 'STUDY', manual: 'jinghong' }), e => e.code === 'PENDING_EVENT'); assert.deepEqual(d.game, before);
  for (const manual of ['__proto__', undefined, null]) assert.throws(() => take(d.game, { type: 'STUDY', manual }), e => e.code === 'INVALID_COMMAND');
});
test('the learned scroll changes real sword-release damage by the same four points as the trade opening', () => {
  const d = driver(); d.realm(); d.funds(80); d.go('sect'); const base = d.game, studied = take(base, { type: 'STUDY', manual: 'jinghong' });
  const attack = g => {
    g = take(g, { type: 'TRAVEL', location: 'wilderness' }); g = take(g, { type: 'ENCOUNTER', enemy: 'warden' });
    g = take(g, { type: 'BATTLE', move: 'technique' }); return take(g, { type: 'BATTLE', move: 'release' });
  };
  const plain = attack(base), trained = attack(studied); assert.ok(plain.battle && trained.battle); assert.equal(plain.battle.hp - trained.battle.hp, 4);
});
test('later-study state is valid only for new full content; never fabricate the ability in old full or M1 formats', () => {
  const d = driver(); const illegal = structuredClone(d.game); illegal.core.learnedSkills = [C.swordManual.id]; assert.throws(() => validateGame(illegal), e => e.code === 'SAVE_LEGACY_SKILL');
  d.realm(); d.funds(80); d.go('sect'); d.doAction({ type: 'STUDY', manual: 'jinghong' });
  const fake = structuredClone(d.game); fake.core.contentVersion = 'full-demo.2'; fake.core.balanceVersion = 'full-unbalanced.2'; assert.throws(() => parseGame(JSON.stringify(fake)), e => e.code === 'SAVE_LEGACY_SKILL');
  let legacy = createAdventure('旧格式', 'legacy-manual');
  for (const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:5},{type:'BREAKTHROUGH'},
    {type:'TRAVEL',location:'sect'},{type:'SOURCE',sourceId:'work',count:6},{type:'TRAVEL',location:'market'},{type:'BUY',item:'foundation_pill',quantity:1},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:20},{type:'BREAKTHROUGH'}]) {
    legacy = advanceLegacy(legacy, { ...action, commandId: 'legacy-' + legacy.core.revision, runId: legacy.core.runId, expectedRevision: legacy.core.revision });
  }
  legacy.core.learnedSkills = [C.swordManual.id]; assert.throws(() => parseGame(JSON.stringify(legacy)), e => e.code === 'SAVE_LEGACY_SKILL');
});
