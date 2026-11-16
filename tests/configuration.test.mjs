import { legalSkillIds } from './build-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { resolve, validateGame, newGame } from '../src/full/engine.ts';
import {
  configurationPreview,
  configurationState,
  validateConfigurationIntent,
} from '../src/full/configuration.ts';
import { fullRoute } from './full-route.mjs';

const route = fullRoute();
function equipped() {
  const game = structuredClone(route.checkpoints.trial);
  game.core.world.location = 'cave';
  game.learned = legalSkillIds();
  game.core.inventory.dew = 10;
  game.core.player.stones = Math.max(100, game.core.player.stones);
  game.ownedRelics = Object.keys(C.relics);
  game.core.learnedSkills = [C.swordManual.id];
  game.school = 'sword';
  game.loadout = {
    mind: 'sword_still',
    builder: 'sword_guard',
    finisher: 'sword_echo',
    relic: 'frost_sword',
  };
  validateGame(game);
  return game;
}
const command = (game, action) => ({
  ...action,
  commandId: 'configuration-proof',
  runId: game.core.runId,
  expectedRevision: game.core.revision,
});
const intent = (game, action, change = {}) => ({
  command: command(game, action),
  expectedActivityId: null,
  expectedActivityRevision: null,
  ...change,
});
const rejects = (fn) =>
  assert.throws(fn, (error) => error.code === 'INVALID_COMMAND');

test('configuration intents accept only three formal commands and a paired finite activity CAS', () => {
  const game = equipped(),
    actions = [
      { type: 'SCHOOL', school: 'talisman' },
      { type: 'EQUIP', skill: 'sword_mind' },
      { type: 'EQUIP_RELIC', relic: 'jade_seal' },
    ];
  for (const action of actions) {
    const good = intent(game, action);
    validateConfigurationIntent(good);
    validateConfigurationIntent({
      ...good,
      expectedActivityId: 'paused-plan',
      expectedActivityRevision: 3,
    });
    for (const change of [
      { extra: true },
      { expectedActivityId: 'plan' },
      { expectedActivityRevision: 0 },
      { expectedActivityId: '' },
      { expectedActivityId: ' '.repeat(5) },
      { expectedActivityId: 'x'.repeat(65) },
      { expectedActivityId: 'plan', expectedActivityRevision: -1 },
      { expectedActivityId: 'plan', expectedActivityRevision: Infinity },
      { expectedActivityId: 'plan', expectedActivityRevision: new Number(2) },
    ])
      rejects(() => validateConfigurationIntent({ ...good, ...change }));
  }
  for (const action of [
    { type: 'BUY', item: 'herb', quantity: 1 },
    { type: 'USE', item: 'healing_pill' },
    { type: 'REST' },
    { type: 'LEARN', skill: 'sword_still' },
    { type: 'FORGE', relic: 'jade_seal' },
    { type: 'TRAVEL', location: 'sect' },
  ])
    rejects(() => validateConfigurationIntent(intent(game, action)));
  for (const input of [
    null,
    [],
    'configuration',
    { command: command(game, actions[0]) },
  ])
    rejects(() => validateConfigurationIntent(input));
  rejects(() =>
    validateConfigurationIntent(
      intent(game, { type: 'SCHOOL', school: new String('talisman') }),
    ),
  );
  rejects(() =>
    validateConfigurationIntent(
      intent(game, { type: 'EQUIP', skill: new String('sword_mind') }),
    ),
  );
  rejects(() =>
    validateConfigurationIntent(
      intent(game, { type: 'EQUIP_RELIC', relic: new String('jade_seal') }),
    ),
  );
});

test('school selection previews actual replacement of all three slots while retaining all study, relics and resources', () => {
  const game = equipped(),
    before = structuredClone(game),
    action = { type: 'SCHOOL', school: 'talisman' },
    preview = configurationPreview(game, action);
  assert.equal(preview.allowed, true);
  assert.equal(preview.failure, null);
  assert.deepEqual(preview.before.loadout, before.loadout);
  assert.deepEqual(preview.after.loadout, {
    ...C.startingLoadouts.talisman,
    relic: 'frost_sword',
  });
  assert.deepEqual(preview.after.learned, before.learned);
  assert.deepEqual(preview.after.ownedRelics, before.ownedRelics);
  assert.deepEqual(preview.after.manuals, [C.swordManual.id]);
  assert.equal(preview.before.cultivationBonus, 25);
  assert.equal(preview.after.cultivationBonus, 0);
  assert.equal(preview.before.guard - preview.after.guard, 6);
  assert.equal(preview.before.manualDamageBonus, 4);
  assert.equal(preview.after.manualDamageBonus, 0);
  assert.deepEqual(preview.costs, { stones: 0, mp: 0, months: 0, items: {} });
  const resolved = resolve(game, command(game, action));
  assert.deepEqual(preview.after, configurationState(resolved.nextState));
  assert.deepEqual(resolved.nextState.core.player, game.core.player);
  assert.deepEqual(resolved.nextState.core.inventory, game.core.inventory);
  assert.deepEqual(game, before);
});

test('each of all eighteen legal slot choices follows its real school and slot without replacing the other three slots', () => {
  for (const [id, skill] of Object.entries(C.skills)) {
    const game = equipped();
    game.learned = legalSkillIds([id]);
    game.school = skill.school;
    game.loadout = { ...C.startingLoadouts[skill.school], relic: 'jade_seal' };
    const alternative = Object.keys(C.skills).find(
      (key) =>
        key !== id &&
        game.learned.includes(key) &&
        C.skills[key].school === skill.school &&
        C.skills[key].slot === skill.slot,
    );
    game.loadout[skill.slot] = alternative;
    validateGame(game);
    const before = structuredClone(game),
      action = { type: 'EQUIP', skill: id },
      preview = configurationPreview(game, action);
    assert.equal(preview.allowed, true, id);
    assert.equal(preview.after.loadout[skill.slot], id);
    for (const slot of ['mind', 'builder', 'finisher', 'relic'])
      if (slot !== skill.slot)
        assert.equal(preview.after.loadout[slot], before.loadout[slot]);
    assert.deepEqual(
      preview.after,
      configurationState(resolve(game, command(game, action)).nextState),
    );
    assert.deepEqual(preview.after.learned, before.learned);
    assert.equal(preview.after.school, skill.school);
    assert.deepEqual(game, before);
  }
});

test('every owned relic preview preserves skill slots and the soul-lamp proof changes actual mark damage only when equipped', () => {
  for (const id of Object.keys(C.relics)) {
    const game = equipped();
    if (game.loadout.relic === id) game.loadout.relic = 'jade_seal';
    const before = structuredClone(game),
      preview = configurationPreview(game, { type: 'EQUIP_RELIC', relic: id });
    assert.equal(preview.allowed, true);
    assert.equal(preview.after.loadout.relic, id);
    for (const slot of ['mind', 'builder', 'finisher'])
      assert.equal(preview.after.loadout[slot], before.loadout[slot]);
    assert.equal(
      preview.after.markDamage - preview.before.markDamage,
      id === 'soul_lamp' ? 4 : 0,
    );
    assert.deepEqual(preview.after.ownedRelics, game.ownedRelics);
    assert.deepEqual(game, before);
  }
});

test('preview and state objects detach every nested collection and never mutate input Game or the paired intent', () => {
  const game = equipped(),
    draft = intent(
      game,
      { type: 'SCHOOL', school: 'talisman' },
      { expectedActivityId: 'old-paused', expectedActivityRevision: 2 },
    );
  const before = structuredClone({ game, draft }),
    p = configurationPreview(game, draft.command),
    state = configurationState(game);
  for (const target of [p.before, p.after, state]) {
    target.loadout.relic = null;
    target.learned.length = 0;
    target.ownedRelics.length = 0;
    target.manuals.length = 0;
  }
  p.costs.items.healing_pill = 999;
  assert.deepEqual({ game, draft }, before);
  validateConfigurationIntent(draft);
});

test('unowned, unlearned, other-school, current-slot and mortal selections return formal actionable failures', () => {
  const game = equipped();
  for (const [action, code] of [
    [{ type: 'SCHOOL', school: 'sword' }, 'NO_CHANGE'],
    [{ type: 'EQUIP', skill: 'sword_still' }, 'NO_CHANGE'],
    [{ type: 'EQUIP', skill: 'talisman_mind' }, 'SCHOOL_REQUIRED'],
    [{ type: 'EQUIP_RELIC', relic: 'frost_sword' }, 'NO_CHANGE'],
  ]) {
    const before = structuredClone(game),
      p = configurationPreview(game, action);
    assert.equal(p.allowed, false);
    assert.equal(p.failure.code, code);
    assert.deepEqual(p.after, p.before);
    assert.deepEqual(game, before);
  }
  const unlearned = equipped();
  unlearned.learned = unlearned.learned.filter((id) => id !== 'sword_mind');
  assert.equal(
    configurationPreview(unlearned, { type: 'EQUIP', skill: 'sword_mind' })
      .failure.code,
    'NOT_LEARNED',
  );
  const unowned = equipped();
  unowned.ownedRelics = ['frost_sword'];
  assert.equal(
    configurationPreview(unowned, { type: 'EQUIP_RELIC', relic: 'jade_seal' })
      .failure.code,
    'NOT_OWNED',
  );
  const opening = newGame('尚未择法', 'configuration-opening');
  assert.equal(
    configurationPreview(opening, { type: 'SCHOOL', school: 'sword' }).failure
      .code,
    'PENDING_EVENT',
  );
  const left = resolve(
    opening,
    command(opening, { type: 'CHOOSE', choice: 'leave' }),
  ).nextState;
  assert.equal(
    configurationPreview(left, { type: 'SCHOOL', school: 'sword' }).failure
      .code,
    'REALM_REQUIRED',
  );
});

test('battle and malformed actions cannot be presented as a valid configuration or silently travel', () => {
  const game = equipped();
  game.core.world.location = 'wilderness';
  const combat = resolve(
    game,
    command(game, { type: 'ENCOUNTER', enemy: 'wolf' }),
  ).nextState;
  const before = structuredClone(combat),
    preview = configurationPreview(combat, {
      type: 'EQUIP_RELIC',
      relic: 'jade_seal',
    });
  assert.equal(preview.allowed, false);
  assert.equal(preview.failure.code, 'IN_BATTLE');
  assert.deepEqual(combat, before);
  assert.throws(
    () =>
      configurationPreview(game, { type: 'BUY', item: 'herb', quantity: 1 }),
    (e) => e.code === 'INVALID_COMMAND',
  );
  const bad = configurationPreview(game, {
    type: 'EQUIP',
    skill: 'not-a-real-skill',
  });
  assert.equal(bad.allowed, false);
  assert.equal(bad.failure.code, 'INVALID_COMMAND');
});
