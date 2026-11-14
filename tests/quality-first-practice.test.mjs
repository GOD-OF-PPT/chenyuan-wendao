import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { driver } from './full-route.mjs';
import { ActivityLedger } from '../src/full/progression.ts';
import { defaultBattlePlan, singleBattlePlan } from '../src/full/adventure.ts';
import { battleIntent } from '../src/full/engine.ts';
import { previewAction } from '../src/full/queries.ts';
import * as publishedV3 from '../src/legacy/rules-v3/src/full/engine.ts';
import * as publishedV3Content from '../src/legacy/rules-v3/src/full/content.ts';

const practice = await import('../web/src/first-practice.ts').catch((error) => {
  if (
    error.code !== 'ERR_MODULE_NOT_FOUND' ||
    error.url !== new URL('../web/src/first-practice.ts', import.meta.url).href
  )
    throw error;
  return null;
});

test('first practice exposes finite real commission assisted and encounter plans without changing the saved life', () => {
  assert.equal(typeof practice?.practiceLesson, 'function');
  const d = driver(),
    game = d.game,
    original = structuredClone(game);
  for (const kind of ['commission', 'assisted', 'encounter']) {
    const lesson = practice.practiceLesson(game, kind);
    assert.equal(lesson.source.runId, game.core.runId);
    assert.equal(lesson.source.revision, game.core.revision);
    assert.equal(lesson.plan.maxCycles, 1);
    assert.equal(lesson.plan.remainingMonthsReserve ?? 1, 1);
    assert.deepEqual(game, original);
  }
  const work = practice.practiceLesson(game, 'commission');
  assert.equal(work.plan.sourceId, 'work');
  assert.equal(work.location, 'sect');
  assert.equal(work.plan.monthBudget, C.sources.work.months);
  assert.equal(work.gainedStones, C.sources.work.stones);
  const assisted = practice.practiceLesson(game, 'assisted');
  assert.equal(assisted.plan.method, 'assisted');
  assert.equal(
    assisted.plan.stoneBudget,
    previewAction(game, { type: 'CULTIVATE', method: 'assisted', count: 1 })
      .costs.stones,
  );
  assert.equal(assisted.plan.until, 'cycles');
  const encounter = practice.practiceLesson(game, 'encounter');
  assert.equal(encounter.plan.enemy, 'wolf');
  assert.equal(encounter.plan.maxEncounters, 1);
  assert.equal(encounter.plan.strategy.healingBudget, 0);
  assert.equal(encounter.plan.strategy.spiritBudget, 0);
});

test('all six legitimate early lives can earn work spend one assisted cycle and inspect a real first battle before full qi cultivation', () => {
  assert.equal(typeof practice?.practiceLesson, 'function');
  assert.equal(typeof practice?.firstBattleHint, 'function');
  for (const opening of ['help', 'trade', 'leave'])
    for (const school of ['sword', 'talisman']) {
      const d = driver(opening, school),
        ledger = new ActivityLedger(
          d.game,
          'practice-' + opening + '-' + school,
        );
      const travel = (location) => {
        if (ledger.game.core.world.location !== location)
          ledger.run(
            { kind: 'travel', location, maxCycles: 1 },
            'explicit practice trip',
          );
      };
      travel('sect');
      const beforeWork = structuredClone(ledger.game);
      ledger.run(
        practice.practiceLesson(ledger.game, 'commission').plan,
        'one explicit commission',
      );
      assert.equal(
        ledger.game.core.player.stones,
        beforeWork.core.player.stones + C.sources.work.stones,
      );
      assert.equal(ledger.game.core.player.xp, beforeWork.core.player.xp);
      travel('cave');
      const lesson = practice.practiceLesson(ledger.game, 'assisted'),
        beforeStudy = structuredClone(ledger.game);
      ledger.run(lesson.plan, 'one explicitly selected assisted cycle');
      assert.equal(
        ledger.game.core.player.stones,
        beforeStudy.core.player.stones - lesson.plan.stoneBudget,
      );
      assert.ok(ledger.game.core.player.xp > beforeStudy.core.player.xp);
      assert.ok(ledger.game.core.player.xp < C.realms.qi.xpCap);
      travel('wilderness');
      ledger.run(
        practice.practiceLesson(ledger.game, 'encounter').plan,
        'only the encounter, no automatic first turn',
      );
      assert.equal(ledger.game.battle.enemy, 'wolf');
      assert.equal(ledger.game.battle.round, 0);
      const game = structuredClone(ledger.game),
        hint = practice.firstBattleHint(ledger.game);
      assert.deepEqual(hint.intent, battleIntent(ledger.game));
      assert.equal(hint.healingCount, ledger.game.core.inventory.healing_pill);
      assert.equal(
        hint.guard.allowed,
        previewAction(ledger.game, { type: 'BATTLE', move: 'guard' }).allowed,
      );
      assert.deepEqual(ledger.game, game);
      ledger.run(
        singleBattlePlan(ledger.game, 'guard'),
        'one explicit practice guard',
      );
      assert.equal(ledger.game.battle.round, 1);
      ledger.run(
        defaultBattlePlan(ledger.game),
        'explicit original auto battle for this opponent',
      );
      assert.equal(ledger.game.wins, 1);
      assert.equal(ledger.game.core.player.realm, 'qi');
      assert.ok(ledger.game.core.player.xp < C.realms.qi.xpCap);
    }
});

test('practice uses published costs and only describes a matching committed activity rather than guessing from stones', () => {
  assert.equal(typeof practice?.practiceResult, 'function');
  const old = driver('leave', 'sword', publishedV3, publishedV3Content);
  old.go('sect');
  assert.equal(
    practice.practiceLesson(old.game, 'commission').plan.monthBudget,
    1,
  );
  const d = driver();
  d.go('sect');
  const ledger = new ActivityLedger(d.game, 'q19-real-practice-feedback');
  const lesson = practice.practiceLesson(ledger.game, 'commission');
  assert.equal(lesson.plan.monthBudget, 12);
  assert.equal(practice.practiceResult(ledger.game, 'commission', null), null);
  const activity = ledger.run(lesson.plan, 'one saved work result'),
    game = structuredClone(ledger.game);
  const result = practice.practiceResult(ledger.game, 'commission', activity);
  assert.match(result.text, /完成 1 趟/);
  assert.match(result.text, /灵石 20/);
  assert.match(result.text, /12 游戏月/);
  assert.equal(
    practice.practiceResult(ledger.game, 'assisted', activity),
    null,
  );
  ledger.run(
    { kind: 'travel', location: 'cave', maxCycles: 1 },
    'another actual revision',
  );
  assert.equal(
    practice.practiceResult(ledger.game, 'commission', activity),
    null,
  );
  assert.throws(() => practice.practiceLesson(ledger.game, 'unknown'));
  assert.deepEqual(game.core.player.stones, d.game.core.player.stones + 20);
});
