import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/full/engine.ts';
import * as queries from '../src/full/queries.ts';
import * as C from '../src/full/content.ts';
import { driver, fullRoute } from './full-route.mjs';
import { stories } from '../src/full/events.ts';
import { localStoryIdsForSeed } from '../src/full/incarnation.ts';
import { getItemSources } from '../src/full/queries.ts';
import * as published from '../src/legacy/rules-v5/index.ts';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createIdleRoute } from '../scripts/economy/idle-scenarios.mjs';

test('a new v6 life stores its own stable incarnation seed without an inherited gift', () => {
  const g = engine.newGame('新卷修士', 'q17-fixed-seed');
  assert.equal(g.core.contentVersion, 'full-demo.6');
  assert.equal(g.core.balanceVersion, 'full-unbalanced.6');
  assert.deepEqual(g.incarnation, {
    version: 1,
    seed: 'q17-fixed-seed',
    inheritance: null,
  });
  assert.deepEqual(engine.parseGame(JSON.stringify(g)), g);
  assert.equal(g.core.player.stones, 40);
  assert.equal(g.core.inventory.healing_pill, 1);
});

test('the readonly atlas preserves all eighteen complete entries and distinguishes this life without offering excluded sources', () => {
  assert.equal(typeof queries.getLocalStoryAtlas, 'function');
  const d = driver();
  while (d.game.core.player.realm !== 'spirit') d.realm();
  const before = structuredClone(d.game),
    rows = queries.getLocalStoryAtlas(d.game);
  assert.equal(rows.length, 18);
  assert.equal(rows.filter((r) => r.inLife).length, 10);
  for (const row of rows) {
    const actual = queries.getStoryContext(d.game, row.id);
    assert.equal(row.story.body, actual.body);
    assert.deepEqual(row.story.options, actual.options);
    assert.ok(row.label.length > 0);
  }
  rows[0].story.options[0].detail = 'changed reading';
  assert.deepEqual(d.game, before);
});

test('malformed incarnation fields and mixed source-rule pairs reject without changing the supplied saved life', () => {
  const source = fullRoute('leave', 'sword', 'craft', false, 'transmit').game,
    child = engine.reincarnate(source, '新卷', 'q17-shape', 'ending-gift');
  for (const mutate of [
    (g) => delete g.incarnation,
    (g) => (g.incarnation.extra = true),
    (g) => (g.incarnation.seed = ''),
    (g) => (g.incarnation.version = 2),
    (g) => (g.incarnation.inheritance.sourceRunId = g.core.runId),
    (g) => (g.incarnation.inheritance.sourceRevision = -1),
    (g) => (g.incarnation.inheritance.balanceVersion = 'full-unbalanced.5'),
    (g) => (g.incarnation.inheritance.sourceEnding = 'retired'),
  ]) {
    const g = structuredClone(child);
    mutate(g);
    const raw = JSON.stringify(g);
    assert.throws(
      () => engine.parseGame(raw),
      (e) => ['SAVE_SHAPE', 'SAVE_INCARNATION'].includes(e.code),
    );
    assert.equal(JSON.stringify(g), raw);
  }
});

test('the actual v5 frozen closure and full local pool remain unchanged under the v6 dispatcher', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL('../src/legacy/rules-v5/source-manifest.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(
    manifest.sourceCommit,
    '7c67f7b6b9b87252e2fe5dd91c17604d74ef34e5',
  );
  assert.equal(Object.keys(manifest.files).length, 150);
  for (const [file, p] of Object.entries(manifest.files)) {
    const b = fs.readFileSync(
      new URL('../src/legacy/rules-v5/' + file, import.meta.url),
    );
    assert.equal(b.length, p.bytes, file);
    assert.equal(createHash('sha256').update(b).digest('hex'), p.sha256, file);
  }
  const d = driver('leave', 'sword', published.engine, published.content);
  while (d.game.core.player.realm !== 'spirit') d.realm();
  const ids = new Set();
  for (const location of Object.keys(C.locations)) {
    d.go(location);
    for (const e of engine.availableEvents(d.game))
      if (e.id.startsWith('local_')) ids.add(e.id);
  }
  assert.equal(ids.size, 18);
  assert.equal(Object.hasOwn(d.game, 'incarnation'), false);
  assert.deepEqual(engine.parseGame(JSON.stringify(d.game)), d.game);
});

test('two genuinely completed endings offer one explicit nonstacking starting gift and never edit the sealed source', () => {
  assert.equal(typeof engine.reincarnate, 'function');
  for (const ending of ['transmit', 'depart']) {
    const source = fullRoute('leave', 'sword', 'craft', false, ending).game,
      before = structuredClone(source);
    for (const choice of ['none', 'ending-gift']) {
      const child = engine.reincarnate(
        source,
        '下一卷',
        'q17-child-' + ending + '-' + choice,
        choice,
      );
      assert.equal(child.core.player.realm, 'mortal');
      assert.equal(child.core.player.startAgeMonths, 216);
      assert.equal(child.core.player.xp, 0);
      assert.equal(child.core.revision, 0);
      assert.equal(child.status, 'active');
      assert.equal(
        child.core.player.stones,
        choice === 'ending-gift' && ending === 'depart' ? 60 : 40,
      );
      assert.equal(
        child.core.inventory.healing_pill,
        choice === 'ending-gift' && ending === 'transmit' ? 2 : 1,
      );
      assert.deepEqual(child.learned, []);
      assert.deepEqual(child.ownedRelics, []);
      assert.equal(child.battle, null);
      assert.equal(child.trial, null);
      assert.deepEqual(child.choices, {});
      if (choice === 'none') assert.equal(child.incarnation.inheritance, null);
      else
        assert.deepEqual(child.incarnation.inheritance, {
          sourceRunId: source.core.runId,
          sourceRevision: source.core.revision,
          sourceName: source.core.player.name,
          sourceEnding: ending,
          contentVersion: source.core.contentVersion,
          balanceVersion: source.core.balanceVersion,
        });
      const loaded = engine.parseGame(JSON.stringify(child));
      assert.deepEqual(loaded, child);
      assert.throws(
        () =>
          engine.reincarnate(loaded, '再开', 'q17-no-double', 'ending-gift'),
        (e) => e.code === 'INHERITANCE_UNAVAILABLE',
      );
    }
    assert.deepEqual(source, before);
    assert.throws(
      () =>
        engine.reincarnate(source, '同卷', source.core.runId, 'ending-gift'),
      (e) => e.code === 'NEW_RUN_REQUIRED',
    );
    assert.throws(
      () => engine.reincarnate(source, '无效', 'q17-invalid', 'anything'),
      (e) => e.code === 'INVALID_INHERITANCE',
    );
  }
});

test('both inherited gifts finish both schools and both endings through separately authorized real Activity plans', () => {
  let passed = 0;
  for (const sourceEnding of ['transmit', 'depart']) {
    const source = fullRoute(
        'leave',
        'sword',
        'craft',
        false,
        sourceEnding,
      ).game,
      original = structuredClone(source);
    for (const school of ['sword', 'talisman'])
      for (const ending of ['transmit', 'depart']) {
        const runId = 'q17-idle-' + sourceEnding + '-' + school + '-' + ending,
          child = engine.reincarnate(source, '前缘行者', runId, 'ending-gift'),
          before = structuredClone(child);
        const options = {
          choice: 'leave',
          school,
          preparation: 'gather',
          cultivation: 'natural',
          answer: 'accept',
          ending,
          advanced: false,
        };
        const route = createIdleRoute(options, { runId }, child);
        route.begin();
        route.grow();
        route.finish();
        assert.equal(route.game.status, 'ascended');
        assert.equal(route.game.ending, ending);
        assert.equal(
          route.game.incarnation.inheritance.sourceRunId,
          source.core.runId,
        );
        assert.equal(route.game.core.inventory.ascension_seal, 0);
        const proof = route.activity.ledger.report(true);
        assert.ok(
          proof.entries.every(
            (row) =>
              row.command.runId === runId &&
              row.result.executedSteps === 1 &&
              row.result.versions.contentVersion === 'full-demo.6',
          ),
        );
        assert.ok(
          route.activity.steps
            .filter((s) => s.kind === 'activity')
            .every((s) => s.cycles > 0 && s.onlineMs >= s.cycleMs),
        );
        assert.deepEqual(child, before);
        assert.deepEqual(source, original);
        passed++;
      }
  }
  assert.equal(passed, 8);
});

test('the life ledger reads actual months routes stock and exclusive three-part endings without inventing online time or writing a gift', () => {
  assert.equal(typeof queries.getLifeLedger, 'function');
  const endings = [];
  for (const ending of ['transmit', 'depart']) {
    const g = fullRoute('leave', 'talisman', 'craft', false, ending).game,
      before = structuredClone(g),
      ledger = queries.getLifeLedger(g);
    assert.equal(ledger.source.runId, g.core.runId);
    assert.equal(ledger.source.revision, g.core.revision);
    assert.equal(ledger.duration.gameMonths, g.core.world.elapsedMonths);
    assert.equal(ledger.duration.actualOnlineMs, null);
    assert.equal(ledger.route.opening, g.core.openingChoice);
    assert.equal(ledger.route.school, g.school);
    assert.deepEqual(
      ledger.route.learned.map((x) => x.id).sort(),
      g.learned.slice().sort(),
    );
    assert.equal(ledger.stock.stones, g.core.player.stones);
    assert.deepEqual(
      Object.fromEntries(ledger.stock.inventory.map((x) => [x.id, x.quantity])),
      Object.fromEntries(
        Object.entries(g.core.inventory).filter(([, n]) => n > 0),
      ),
    );
    assert.equal(ledger.epilogue.length, 3);
    assert.ok(ledger.epilogue.every((p) => p.length > 20));
    assert.equal(
      ledger.alternateEnding.id,
      ending === 'transmit' ? 'depart' : 'transmit',
    );
    endings.push(ledger.epilogue.join('\n'));
    ledger.stock.inventory[0].quantity = 999;
    assert.deepEqual(g, before);
  }
  assert.notEqual(endings[0], endings[1]);
});

test('seeded pools keep two per actual realm, cover every original local encounter across seeds and never reroll a rebound imported life', () => {
  const all = new Set();
  for (let i = 0; i < 128; i++) {
    const ids = localStoryIdsForSeed('q17-seed-' + i),
      same = localStoryIdsForSeed('q17-seed-' + i),
      groups = {};
    assert.deepEqual(ids, same);
    assert.equal(ids.length, 10);
    for (const id of ids) {
      all.add(id);
      groups[stories[id].min] = (groups[stories[id].min] ?? 0) + 1;
    }
    assert.deepEqual(Object.values(groups), [2, 2, 2, 2, 2]);
  }
  assert.deepEqual(
    [...all].sort(),
    Object.keys(stories)
      .filter((id) => id.startsWith('local_'))
      .sort(),
  );
  const d = driver();
  while (d.game.core.player.realm !== 'spirit') d.realm();
  const g = d.game,
    copy = engine.parseGame(JSON.stringify(g)),
    seed = g.incarnation.seed;
  copy.core.runId = 'q17-rebound-import';
  engine.validateGame(copy);
  assert.equal(copy.incarnation.seed, seed);
  assert.deepEqual(
    localStoryIdsForSeed(copy.incarnation.seed),
    localStoryIdsForSeed(seed),
  );
});

test('an out-of-pool local event cannot be selected, imported as a pending response or promised as a current item source', () => {
  const d = driver();
  while (d.game.core.player.realm !== 'spirit') d.realm();
  const ids = localStoryIdsForSeed(d.game.incarnation.seed),
    id = Object.keys(stories).find(
      (id) => id.startsWith('local_') && !ids.includes(id),
    );
  d.go(stories[id].location);
  const g = d.game,
    original = structuredClone(g),
    command = {
      type: 'EVENT',
      event: id,
      commandId: 'q17-excluded',
      runId: g.core.runId,
      expectedRevision: g.core.revision,
    };
  assert.throws(
    () => engine.resolve(g, command),
    (e) => e.code === 'EVENT_UNAVAILABLE',
  );
  const chosen = structuredClone(g);
  chosen.choices[id] = 'decline';
  assert.throws(
    () => engine.parseGame(JSON.stringify(chosen)),
    (e) => e.code === 'SAVE_STORIES',
  );
  const pending = structuredClone(g);
  pending.core.mode = 'event';
  pending.core.activeEvent = { id, instanceId: g.core.runId + ':' + id };
  assert.throws(
    () => engine.parseGame(JSON.stringify(pending)),
    (e) => e.code === 'SAVE_EVENT',
  );
  for (const item of Object.keys(C.items))
    for (const row of getItemSources(g, item))
      if (row.kind === 'event' && row.id.startsWith('local_'))
        assert.ok(ids.includes(row.id.split(':')[0]));
  assert.deepEqual(g, original);
  assert.deepEqual(C.sources, published.content.sources);
});

test('a real spirit life exposes exactly two local encounters per realm across its six legitimate locations', () => {
  const d = driver();
  while (d.game.core.player.realm !== 'spirit') d.realm();
  const local = new Set(),
    mandatory = new Set();
  for (const location of Object.keys(C.locations)) {
    d.go(location);
    for (const event of engine.availableEvents(d.game)) {
      if (event.id.startsWith('local_')) local.add(event.id);
      else mandatory.add(event.id);
    }
  }
  assert.equal(local.size, 10);
  for (const id of [
    'shen_return',
    'pei_meet',
    'lu_intro',
    'yan_stone',
    ...Array.from({ length: 6 }, (_, i) => 'omen_' + i),
  ])
    assert.ok(mandatory.has(id), id);
});
