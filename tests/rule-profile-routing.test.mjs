import test from 'node:test';
import assert from 'node:assert/strict';
import * as current from '../src/full/engine.ts';
import * as activities from '../src/full/activity.ts';
import {
  validateCommandReceipt,
  canonicalFingerprint,
} from '../src/full/receipts.ts';
import { validateActivityReceipt } from '../web/src/activity-persistence.ts';
import * as legacy from '../src/legacy/rules-v3/index.ts';
import { contentForGame } from '../src/full/rule-content.ts';
import {
  getItemSources,
  previewAction,
  getLifeOverview,
} from '../src/full/queries.ts';
import { planCollection } from '../src/full/goals.ts';

function prepared(engine, runId = 'profile-shared') {
  let g = engine.newGame('版本修士', runId);
  for (const a of [
    { type: 'CHOOSE', choice: 'leave' },
    { type: 'TRAVEL', location: 'cave' },
    { type: 'CULTIVATE', method: 'natural', count: 2 },
    { type: 'BREAKTHROUGH' },
    { type: 'SCHOOL', school: 'sword' },
    { type: 'TRAVEL', location: 'sect' },
  ])
    g = engine.advance(g, {
      ...a,
      commandId: 'prepare:' + g.core.revision,
      runId: g.core.runId,
      expectedRevision: g.core.revision,
    });
  return g;
}
const sourcePlan = {
  kind: 'source',
  sourceId: 'work',
  maxCycles: 1,
  until: 'cycles',
  target: null,
  monthBudget: 24,
  remainingMonthsReserve: 1,
};
const start = {
  id: 'profile-activity',
  ownerId: 'page-one',
  commandId: 'profile-start',
  now: 10000,
};

test('new lives identify v5 rules and new activities explicitly identify their rules', () => {
  const g = prepared(current);
  assert.equal(g.core.contentVersion, 'full-demo.5');
  assert.equal(g.core.balanceVersion, 'full-unbalanced.5');
  const a = activities.createActivity(g, sourcePlan, start);
  assert.equal(a.rulesVersion, 'full-demo.5/full-unbalanced.5');
  activities.validateActivity(a, g);
});

test('old lives and their original source command activity and receipt are not reinterpreted or resigned', () => {
  const g = prepared(legacy.engine),
    original = structuredClone(g),
    command = {
      type: 'SOURCE',
      sourceId: 'work',
      count: 1,
      commandId: 'original-source',
      runId: g.core.runId,
      expectedRevision: g.core.revision,
    };
  assert.deepEqual(current.parseGame(JSON.stringify(g)), g);
  current.validateGame(g);
  assert.deepEqual(
    current.resolve(g, command),
    legacy.engine.resolve(g, command),
  );
  const a = legacy.activity.createActivity(g, sourcePlan, start);
  assert.deepEqual(activities.createActivity(g, sourcePlan, start), a);
  assert.equal(Object.hasOwn(a, 'rulesVersion'), false);
  const formal = legacy.engine.resolve(g, a.nextCommand),
    done = legacy.activity.completeActivity(
      formal.nextState,
      a,
      formal.result,
      { commandId: a.nextCommand.commandId, now: a.dueAt },
    );
  const input = {
    kind: 'TICK',
    tick: {
      commandId: a.nextCommand.commandId,
      runId: a.runId,
      expectedRevision: a.gameRevision,
      activityId: a.id,
      expectedActivityRevision: a.revision,
      ownerId: a.ownerId,
      generation: a.generation,
    },
  };
  const receipt = {
      format: 'chenyuan-activity-receipt',
      version: 1,
      input,
      fingerprint: canonicalFingerprint(input),
      activity: done,
      command: a.nextCommand,
      result: formal.result,
    },
    copy = structuredClone(receipt);
  validateActivityReceipt(receipt, formal.nextState);
  assert.deepEqual(receipt, copy);
  assert.deepEqual(g, original);
  assert.equal(formal.result.costs.months, 1);
  assert.equal(done.gainedStones, 20);
});

test('old failures retain the public RuleError code instead of becoming unknown storage errors', () => {
  const g = prepared(legacy.engine);
  assert.throws(
    () =>
      current.resolve(g, {
        type: 'SOURCE',
        sourceId: 'work',
        count: 1,
        commandId: 'stale',
        runId: g.core.runId,
        expectedRevision: g.core.revision - 1,
      }),
    (e) => e instanceof current.RuleError && e.code === 'STALE_REVISION',
  );
});

test('mixed content pairs and same-run old activities or receipts cannot masquerade as current rules', () => {
  const old = prepared(legacy.engine),
    g = prepared(current),
    a = legacy.activity.createActivity(old, sourcePlan, start);
  assert.throws(() =>
    current.validateGame({
      ...old,
      core: { ...old.core, balanceVersion: 'full-unbalanced.5' },
    }),
  );
  assert.throws(() => activities.validateActivity(a, g));
  const command = {
    type: 'SOURCE',
    sourceId: 'work',
    count: 1,
    commandId: 'shared-receipt',
    runId: old.core.runId,
    expectedRevision: old.core.revision,
  };
  const older = legacy.engine.resolve(old, command),
    newer = current.resolve(g, command),
    receipt = {
      format: 'chenyuan-receipt',
      version: 1,
      command,
      fingerprint: canonicalFingerprint(command),
      result: older.result,
    };
  assert.throws(() => validateCommandReceipt(receipt, newer.nextState));
});

test('interleaved old and new lives keep their own prices yields lifespan and source quotes without a global profile', () => {
  const beforeOld = prepared(legacy.engine),
    beforeNew = prepared(current),
    snapshots = structuredClone([beforeOld, beforeNew]);
  for (const game of [beforeNew, beforeOld, beforeNew, beforeOld]) {
    const old = game === beforeOld,
      C = contentForGame(game);
    assert.equal(C.items.foundation_pill.buy, old ? 160 : 195);
    assert.equal(C.sources.core.stones, old ? 0 : 75);
    assert.equal(C.sources.jade_task.items.jade, old ? 1 : 4);
    assert.equal(
      previewAction(game, { type: 'SOURCE', sourceId: 'work' }).costs.months,
      old ? 1 : 12,
    );
    assert.equal(getLifeOverview(game).limitMonths, old ? 1440 : 1200);
    const purchase = getItemSources(game, 'foundation_pill').find(
      (s) => s.kind === 'purchase',
    );
    assert.equal(purchase.costs.stones, old ? 160 : 195);
    assert.equal(
      planCollection(game, 'core', {
        kind: 'stones',
        quantity: game.core.player.stones + 40,
      })?.count,
      old ? undefined : 1,
    );
  }
  assert.deepEqual([beforeOld, beforeNew], snapshots);
});

test('malformed embedded rule snapshots are rejected as domain errors rather than retryable storage failures', () => {
  const game = current.newGame('坏证明', 'profile-malformed'),
    a = activities.createActivity(
      game,
      {
        kind: 'milestone',
        action: { type: 'CHOOSE', choice: 'leave' },
        maxCycles: 1,
      },
      start,
    );
  for (const value of [{}, [], 1, 'wrong', null, undefined]) {
    const bad = structuredClone(a);
    bad.originGame = value;
    assert.throws(
      () => activities.validateActivity(bad, game),
      (e) =>
        e instanceof current.RuleError &&
        !String(e.code).startsWith('STORAGE_'),
    );
  }
});
