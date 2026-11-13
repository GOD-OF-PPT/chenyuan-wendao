import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as previous from '../src/legacy/rules-v4/index.ts';
import * as activities from '../src/full/activity.ts';
import { ActivityLedger } from '../src/full/progression.ts';
import { defaultEncounterPlan } from '../src/full/adventure.ts';
import { ICONS, BRANCH_ICONS } from '../web/src/ui-icons.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import * as engine from '../src/full/engine.ts';
import { configurationPreview } from '../src/full/configuration.ts';
import { driver } from './full-route.mjs';

const command = (g, action) => ({
  ...action,
  commandId: crypto.randomUUID(),
  runId: g.core.runId,
  expectedRevision: g.core.revision,
});
const act = (g, action) => engine.resolve(g, command(g, action));
function spirit(school = 'sword') {
  const d = driver('leave', school);
  while (d.game.core.player.realm !== 'spirit') d.realm();
  d.rest();
  return d;
}
const forecast = (g) =>
  typeof engine.battleIntent === 'function'
    ? engine.battleIntent(g)
    : engine.intent(g.battle);

test('a new life exposes six pairs of mutually exclusive advanced paths while all base methods remain available', () => {
  const g = engine.newGame('分支检查', 'q16-catalogue');
  assert.equal(g.core.contentVersion, 'full-demo.5');
  assert.equal(g.core.balanceVersion, 'full-unbalanced.5');
  assert.equal(Object.keys(C.skills).length, 18);
  const groups = new Map();
  for (const [id, skill] of Object.entries(C.skills))
    if (skill.branch) {
      const rows = groups.get(skill.branch) ?? [];
      rows.push({ id, skill });
      groups.set(skill.branch, rows);
    }
  assert.equal(groups.size, 6);
  for (const rows of groups.values()) {
    assert.equal(rows.length, 2);
    assert.equal(rows[0].skill.school, rows[1].skill.school);
    assert.equal(rows[0].skill.slot, rows[1].skill.slot);
    assert.ok(rows.every((r) => r.skill.price > 0));
  }
  for (const school of ['sword', 'talisman'])
    for (const id of Object.values(C.startingLoadouts[school]))
      assert.equal(C.skills[id].branch, undefined);
});

test('the six new branch markers reuse the original matching school and slot glyphs without changing the published sprite', () => {
  assert.deepEqual(
    Object.keys(BRANCH_ICONS).sort(),
    Object.keys(C.skills)
      .filter((id) => !Object.hasOwn(previous.content.skills, id))
      .sort(),
  );
  for (const [id, original] of Object.entries(BRANCH_ICONS)) {
    assert.equal(C.skills[id].school, previous.content.skills[original].school);
    assert.equal(C.skills[id].slot, previous.content.skills[original].slot);
    assert.equal(ICONS.skill[id], ICONS.skill[original]);
  }
});

test('shatter breaks a ward only at its advertised three sword stacks, with one and two still paying the same real mana', () => {
  for (const stacks of [1, 2, 3]) {
    const d = spirit();
    d.funds(160);
    d.go('sect');
    d.doAction({ type: 'LEARN', skill: 'sword_shatter' });
    d.doAction({ type: 'EQUIP', skill: 'sword_shatter' });
    d.go('terrace');
    d.doAction({ type: 'ENCOUNTER', enemy: 'sentinel' });
    const moves =
      stacks === 3
        ? ['attack', 'guard', 'guard', 'technique']
        : ['guard', 'guard', 'guard', stacks === 1 ? 'attack' : 'technique'];
    for (const move of moves) d.doAction({ type: 'BATTLE', move });
    const before = d.game;
    assert.equal(before.battle.sword, stacks);
    assert.equal(forecast(before).kind, 'ward');
    const raw = 18 + engine.stats(before).power + 10 * stacks + 14,
      out = act(before, { type: 'BATTLE', move: 'release' });
    assert.equal(
      out.nextState.battle.hp,
      before.battle.hp - (stacks === 3 ? raw : Math.floor(raw / 2)),
    );
    assert.equal(out.result.costs.mp, 18);
    assert.equal(out.nextState.core.player.mp, before.core.player.mp - 18);
  }
});

test('shadow healing follows actual net damage and guard or an interrupted heavy hit really prevents it', () => {
  const d = spirit();
  d.go('secret');
  d.doAction({ type: 'ENCOUNTER', enemy: 'shadow' });
  const g = d.game;
  const attack = act(g, { type: 'BATTLE', move: 'attack' }),
    guard = act(g, { type: 'BATTLE', move: 'guard' }),
    damage = 13 + engine.stats(g).power,
    loss = -attack.result.delta.hp;
  assert.ok(loss > 0);
  assert.equal(attack.nextState.battle.hp, g.battle.hp - damage + loss);
  assert.equal(guard.nextState.core.player.hp, g.core.player.hp);
  assert.equal(guard.nextState.battle.hp, g.battle.hp);
  const t = spirit('talisman');
  t.go('secret');
  t.doAction({ type: 'ENCOUNTER', enemy: 'shadow' });
  t.doAction({ type: 'BATTLE', move: 'technique' });
  t.doAction({ type: 'BATTLE', move: 'technique' });
  const out = act(t.game, { type: 'BATTLE', move: 'release' });
  assert.equal(out.result.delta.hp, 0);
  assert.equal(
    out.nextState.battle.hp,
    t.game.battle.hp -
      (16 +
        engine.stats(t.game).power +
        t.game.battle.marks.reduce(
          (n, duration) => n + duration * engine.stats(t.game).markDamage,
          0,
        )),
  );
});

test('changing an already equipped relic quotes and commits its real conversion cost once while first equip stays free', () => {
  const d = driver();
  d.realm();
  d.realm();
  d.resource('jade', 7);
  d.resource('core', 1);
  d.resource('dew', 3);
  d.funds(600);
  d.go('cave');
  d.doAction({ type: 'FORGE', relic: 'frost_sword' });
  d.doAction({ type: 'FORGE', relic: 'jade_seal' });
  const first = act(d.game, { type: 'EQUIP_RELIC', relic: 'frost_sword' });
  assert.deepEqual(first.result.costs, {
    stones: 0,
    mp: 0,
    months: 0,
    items: {},
  });
  const before = first.nextState,
    immutable = structuredClone(before),
    action = { type: 'EQUIP_RELIC', relic: 'jade_seal' },
    preview = configurationPreview(before, action);
  assert.equal(preview.allowed, true);
  assert.deepEqual(before, immutable);
  assert.deepEqual(preview.costs, {
    stones: 24,
    mp: 0,
    months: 0,
    items: { dew: 1 },
  });
  const second = act(before, action);
  assert.deepEqual(second.result.costs, preview.costs);
  assert.equal(
    second.nextState.core.player.stones,
    before.core.player.stones - 24,
  );
  assert.equal(
    second.nextState.core.inventory.dew,
    before.core.inventory.dew - 1,
  );
  assert.equal(second.nextState.loadout.relic, 'jade_seal');
  assert.throws(
    () => act(second.nextState, action),
    (e) => e.code === 'NO_CHANGE',
  );
  assert.deepEqual(before, immutable);
});

test('three late opponents expose three genuinely different four-turn patterns through their real battle context', () => {
  const patterns = [];
  for (const enemy of ['puppet', 'shadow', 'sentinel']) {
    const d = spirit();
    d.go(C.enemies[enemy].location);
    d.doAction({ type: 'ENCOUNTER', enemy });
    let g = d.game;
    const pattern = [];
    for (let i = 0; i < 4; i++) {
      pattern.push(forecast(g).kind);
      g = act(g, { type: 'BATTLE', move: 'guard' }).nextState;
      assert.ok(
        g.battle,
        'four safe observation guards must retain the real encounter',
      );
    }
    patterns.push(pattern.join('/'));
  }
  assert.equal(new Set(patterns).size, 3);
  assert.equal(typeof engine.battleIntent, 'function');
});

test('a visible sword-puppet reflection has a real health consequence that ordinary guard avoids', () => {
  const d = spirit();
  d.go('secret');
  d.doAction({ type: 'ENCOUNTER', enemy: 'puppet' });
  const ready = act(d.game, { type: 'BATTLE', move: 'guard' }).nextState;
  assert.equal(forecast(ready).kind, 'reflect');
  const attacked = act(ready, { type: 'BATTLE', move: 'attack' }),
    guarded = act(ready, { type: 'BATTLE', move: 'guard' });
  assert.ok(attacked.nextState.core.player.hp < ready.core.player.hp);
  assert.equal(guarded.nextState.core.player.hp, ready.core.player.hp);
  assert.equal(attacked.result.delta.wins, 0);
  assert.equal(guarded.result.delta.wins, 0);
});

test('a real talisman setup can detonate its surviving marks to interrupt a forecast heavy hit without free mana', () => {
  const d = spirit('talisman');
  d.go('secret');
  d.doAction({ type: 'ENCOUNTER', enemy: 'shadow' });
  let g = d.game;
  for (let i = 0; i < 2; i++)
    g = act(g, { type: 'BATTLE', move: 'technique' }).nextState;
  assert.equal(forecast(g).kind, 'heavy');
  assert.ok(g.battle.marks.length > 0);
  const before = structuredClone(g),
    out = act(g, { type: 'BATTLE', move: 'release' });
  assert.ok(
    out.nextState.battle,
    'the comparison must not bypass the incoming hit by killing this opponent',
  );
  assert.equal(out.nextState.core.player.hp, before.core.player.hp);
  assert.equal(out.nextState.core.player.mp, before.core.player.mp - 10);
  assert.equal(out.result.costs.mp, 10);
  assert.equal(out.nextState.battle.marks.length, 0);
  assert.deepEqual(g, before);
});

test('all six upgrade groups reject the second path before charging and cannot be bypassed by switching schools or importing', () => {
  const d = spirit();
  d.funds(2000);
  d.go('sect');
  const groups = new Map();
  for (const [id, s] of Object.entries(C.skills))
    if (s.branch) {
      const rows = groups.get(s.branch) ?? [];
      rows.push(id);
      groups.set(s.branch, rows);
    }
  for (const ids of groups.values())
    for (const id of ids) {
      const other = ids.find((v) => v !== id),
        first = act(d.game, { type: 'LEARN', skill: id }),
        g = first.nextState,
        immutable = structuredClone(g);
      assert.equal(first.result.costs.stones, C.skills[id].price);
      assert.throws(
        () => act(g, { type: 'LEARN', skill: other }),
        (e) => e.code === 'SKILL_BRANCH',
      );
      assert.deepEqual(g, immutable);
      const plan = {
        kind: 'learn',
        skills: [other],
        maxCycles: 1,
        stoneBudget: 2000,
        stoneReserve: 0,
      };
      assert.throws(
        () =>
          activities.createActivity(g, plan, {
            id: 'branch',
            ownerId: 'page',
            commandId: 'branch-start',
            now: 1000,
          }),
        (e) => e.code === 'SKILL_BRANCH',
      );
      const switched = act(g, {
        type: 'SCHOOL',
        school: g.school === 'sword' ? 'talisman' : 'sword',
      }).nextState;
      assert.throws(
        () => act(switched, { type: 'LEARN', skill: other }),
        (e) => e.code === 'SKILL_BRANCH',
      );
      const mixed = structuredClone(g);
      mixed.learned.push(other);
      assert.throws(
        () => engine.parseGame(JSON.stringify(mixed)),
        (e) => e.code === 'SAVE_EQUIPMENT',
      );
    }
  const both = {
    kind: 'learn',
    skills: ['sword_still', 'sword_pierce'],
    maxCycles: 2,
    stoneBudget: 2000,
    stoneReserve: 0,
  };
  assert.throws(
    () =>
      activities.createActivity(d.game, both, {
        id: 'two-paths',
        ownerId: 'page',
        commandId: 'two-paths-start',
        now: 1000,
      }),
    (e) => e.code === 'SKILL_BRANCH',
  );
});

test('the frozen v4 closure is byte identical to its accepted manifest and old v4 lives keep their quotes and action proofs', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL('../src/legacy/rules-v4/source-manifest.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(
    manifest.sourceCommit,
    '9998a0d0e405d2c9d157ac8f453815a98fe139d2',
  );
  for (const [file, proof] of Object.entries(manifest.files)) {
    const bytes = fs.readFileSync(
      new URL('../src/legacy/rules-v4/' + file, import.meta.url),
    );
    assert.equal(bytes.length, proof.bytes, file);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      proof.sha256,
      file,
    );
  }
  let g = previous.engine.newGame('旧约修士', 'q16-old');
  for (const action of [
    { type: 'CHOOSE', choice: 'leave' },
    { type: 'TRAVEL', location: 'cave' },
    { type: 'CULTIVATE', method: 'natural', count: 2 },
    { type: 'BREAKTHROUGH' },
    { type: 'SCHOOL', school: 'sword' },
    { type: 'TRAVEL', location: 'sect' },
  ])
    g = previous.engine.resolve(g, command(g, action)).nextState;
  assert.deepEqual(engine.parseGame(JSON.stringify(g)), g);
  const plan = {
    kind: 'source',
    sourceId: 'work',
    maxCycles: 2,
    until: 'cycles',
    target: null,
    monthBudget: 24,
    remainingMonthsReserve: 1,
  };
  const start = {
      id: 'old-life-activity',
      ownerId: 'one',
      commandId: 'old-life-start',
      now: 1000,
    },
    a = previous.activity.createActivity(g, plan, start);
  assert.deepEqual(activities.createActivity(g, plan, start), a);
  const out = engine.resolve(g, a.nextCommand),
    expected = previous.engine.resolve(g, a.nextCommand);
  assert.deepEqual(out, expected);
  assert.equal(out.result.costs.months, 12);
  assert.deepEqual(
    activities.completeActivity(out.nextState, a, out.result, {
      commandId: a.nextCommand.commandId,
      now: a.dueAt,
    }),
    previous.activity.completeActivity(out.nextState, a, out.result, {
      commandId: a.nextCommand.commandId,
      now: a.dueAt,
    }),
  );
  const mixed = structuredClone(a);
  mixed.rulesVersion = 'full-demo.5/full-unbalanced.5';
  assert.throws(
    () => activities.validateActivity(mixed, g),
    (e) => e.code === 'ACTIVITY_INVALID',
  );
  assert.equal(Object.keys(previous.content.skills).length, 12);
});

test('reflection lethal to both sides gives no victory or loot and genuine guard does not deal reflected direct damage', () => {
  const d = spirit();
  d.go('secret');
  d.doAction({ type: 'ENCOUNTER', enemy: 'puppet' });
  const g = act(d.game, { type: 'BATTLE', move: 'guard' }).nextState;
  g.core.player.hp = 1;
  g.battle.hp = 1;
  engine.validateGame(g);
  const before = structuredClone(g),
    out = act(g, { type: 'BATTLE', move: 'attack' });
  assert.equal(out.result.delta.wins, 0);
  assert.equal(out.nextState.wins, g.wins);
  assert.equal(out.nextState.battle, null);
  assert.deepEqual(out.nextState.core.inventory, g.core.inventory);
  assert.equal(out.nextState.core.player.stones, g.core.player.stones);
  assert.deepEqual(g, before);
});

test('an unprepared late encounter really pauses for danger and a named prepared counter improves the same encounter', () => {
  const d = spirit();
  d.funds(600);
  d.resource('jade', 4);
  d.go('cave');
  d.doAction({ type: 'FORGE', relic: 'jade_seal' });
  const unprepared = d.game,
    run = (g) => {
      const ledger = new ActivityLedger(g, 'q16-danger');
      ledger.run(
        { kind: 'travel', location: 'terrace', maxCycles: 1 },
        '明确前往守灵所在',
      );
      const p = defaultEncounterPlan(ledger.game, 'sentinel');
      p.mpBudget = 3000;
      p.strategy = {
        ...p.strategy,
        healingBudget: 0,
        spiritBudget: 0,
        healBelowPercent: 0,
        restoreBelowPercent: 0,
      };
      return {
        out: ledger.run(p, '无用药授权，只迎战当前一场'),
        game: ledger.game,
      };
    };
  const first = run(unprepared);
  assert.equal(first.out.victories, 0);
  assert.match(first.out.stopReason.code, /ADVENTURE_(?:DANGER|RISK)/);
  assert.equal(first.out.status, 'paused');
  d.go('sect');
  d.doAction({ type: 'LEARN', skill: 'sword_shatter' });
  d.doAction({ type: 'EQUIP', skill: 'sword_shatter' });
  d.doAction({ type: 'EQUIP_RELIC', relic: 'jade_seal' });
  const counter = run(d.game);
  assert.equal(counter.out.victories, 1);
  assert.equal(counter.game.battle, null);
  assert.deepEqual(counter.out.spentItems, {});
});
