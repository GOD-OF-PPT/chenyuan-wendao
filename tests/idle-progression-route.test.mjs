import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { defaultEncounterPlan } from '../src/full/adventure.ts';
import { createIdleRoute, runIdleScenario, idleScenarioOptions, idleScenarioId } from '../scripts/economy/idle-scenarios.mjs';

const cases = idleScenarioOptions();
const base = { choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural',
  answer: 'accept', ending: 'transmit', advanced: false };
test('the normal idle matrix contains 144 paid advanced and16 basic distinct branches', () => {
  assert.equal(cases.length, 160); assert.equal(new Set(cases.map(idleScenarioId)).size, 160);
  assert.equal(cases.filter(row => row.advanced).length, 144);
  assert.equal(cases.filter(row => !row.advanced).length, 16);
  for (const row of cases.filter(row => !row.advanced)) {
    assert.equal(row.choice, 'leave'); assert.equal(row.cultivation, 'natural');
    assert.ok(['gather', 'purchase'].includes(row.preparation));
  }
});

for (const options of cases) test('normal single-cycle idle route: ' + idleScenarioId(options), () => {
  const out = runIdleScenario(options);
  assert.equal(out.success, true, JSON.stringify(out.failure));
  const game = out.game, summary = out.report;
  assert.equal(game.status, 'ascended'); assert.equal(game.core.player.realm, 'ascended');
  assert.equal(game.ending, options.ending); assert.equal(game.core.world.location, 'terrace');
  assert.equal(game.core.openingChoice, options.choice); assert.equal(game.school, options.school);
  assert.equal(game.wins, 3); assert.equal(game.core.inventory.ascension_seal, 0);
  assert.deepEqual(game.choices, {}); assert.equal(game.trial, null); assert.equal(game.battle, null);
  assert.ok(game.core.player.hp > 0); assert.ok(game.core.player.mp >= 0);
  assert.equal(game.loadout.relic, options.advanced ? options.school === 'sword' ? 'frost_sword' : 'soul_lamp' : 'jade_seal');
  assert.equal(game.ownedRelics.length, 1);
  const advanced = options.school === 'sword' ? ['sword_still', 'sword_guard', 'sword_echo'] :
    ['talisman_calm', 'talisman_frost', 'talisman_return'];
  for (const skill of advanced) assert.equal(game.learned.includes(skill), options.advanced);
  assert.equal(game.learned.length, options.advanced ? 6 : 3);
  assert.deepEqual(summary.realms.map(row => row.realm), C.realmIds.slice(0, -1));
  assert.equal(summary.closing.revision, game.core.revision);
  assert.equal(summary.totals.commands, game.core.revision);
  assert.ok(summary.totals.costs.months > 100); assert.ok(summary.totals.costs.stones > 0);
  assert.equal(out.onlineMs, out.steps.reduce((sum, step) => sum + step.onlineMs, 0));
  assert.ok(out.onlineMs > 0);
  for (const step of out.steps) {
    if (step.kind === 'configuration') {
      assert.equal(step.plan, null); assert.equal(step.cycles, 1); assert.equal(step.cycleMs, 0); assert.equal(step.onlineMs, 0);
      assert.ok(['SCHOOL', 'EQUIP', 'EQUIP_RELIC'].includes(step.action.type));
    } else {
      assert.equal(step.action, null); assert.ok(step.plan); assert.ok(step.cycles >= 1);
      assert.equal(step.onlineMs, step.cycles * step.cycleMs);
      if (step.plan.kind === 'source' || step.plan.kind === 'craft' || step.plan.kind === 'forge')
        assert.ok(step.costs.months <= step.plan.monthBudget);
      if ('stoneBudget' in step.plan) assert.ok(step.costs.stones <= step.plan.stoneBudget);
    }
  }
  const battles = out.steps.filter(step => step.kind === 'activity' && step.plan.kind === 'battle');
  const stages = battles.map(step => step.plan.trialStage);
  assert.deepEqual(stages.filter((stage, index) => index === 0 || stage !== stages[index - 1]), [1, 2, 3]);
  assert.ok(battles.length >= 3 && battles.length <= 9);
  assert.ok(battles.every(step => step.plan.mode === 'auto' && step.plan.strategy.riskMode === 'pause'));
  assert.equal(out.trialAuthorizations.length, battles.length);
  assert.equal(new Set(out.trialAuthorizations.map(row => row.activityId)).size, battles.length);
  for (const stop of out.trialBudgetStops) {
    assert.equal(stop.reason.code, 'ACTIVITY_BUDGET'); assert.ok(stop.hp > 0);
    assert.ok(stop.healing > 0 || stop.spirit > 0); assert.ok(stop.enemyHp > 0);
    const renewed = out.trialAuthorizations.find(row => row.stage === stop.stage && row.segment === stop.segment + 1);
    assert.ok(renewed); assert.equal(renewed.before.enemyHp, stop.enemyHp); assert.equal(renewed.before.round, stop.round);
    assert.equal(renewed.before.hp, stop.hp); assert.equal(renewed.before.healing, stop.healing);
  }
  if (options.preparation === 'commission') {
    const qiPreparation = out.projections.find(row => row.realm === 'qi' && row.requestedVariant === 'commission');
    assert.equal(qiPreparation.actualVariant, 'gather'); assert.equal(qiPreparation.sharedDeterministicRoute, true);
  }
  const milestones = out.steps.filter(step => step.kind === 'activity' && step.plan.kind === 'milestone');
  assert.equal(milestones.filter(step => step.plan.action.type === 'BREAKTHROUGH').length, 5);
  for (const type of ['CHOOSE', 'START_TRIAL', 'ANSWER_TRIAL', 'END'])
    assert.equal(milestones.filter(step => step.plan.action.type === type).length, 1);
  assert.equal(milestones.find(step => step.plan.action.type === 'ANSWER_TRIAL').plan.action.answer, options.answer);
  assert.equal(milestones.find(step => step.plan.action.type === 'END').plan.action.ending, options.ending);
});

test('a real finite budget stops before the next income cycle and a new explicit segment earns only its new result', () => {
  const r = createIdleRoute(base); r.begin(); r.go('sect');
  const before = r.game;
  const plan = { kind: 'source', sourceId: 'work', maxCycles: 2, until: 'cycles', target: null,
    monthBudget: 12, remainingMonthsReserve: 1 };
  const first = r.run(plan, '首段有限杂务');
  assert.equal(first.completedCycles, 1); assert.equal(first.stopReason.code, 'ACTIVITY_BUDGET');
  assert.equal(r.game.core.player.stones, before.core.player.stones + C.sources.work.stones);
  const second = r.run(plan, '另行确认第二段杂务');
  assert.equal(second.completedCycles, 1); assert.equal(second.stopReason.code, 'ACTIVITY_BUDGET');
  assert.equal(first.spentMonths, 12); assert.equal(second.spentMonths, 12);
  assert.notEqual(first.id, second.id);
  assert.equal(r.game.core.player.stones, before.core.player.stones + 2 * C.sources.work.stones);
});

test('normal purchases and sales can reach zero stones and no medicine before free cave recovery', () => {
  const r = createIdleRoute(base); r.begin();
  r.buy('herb', 8, '正常花尽初始40灵石'); r.go('market');
  r.run({ kind: 'sell', item: 'healing_pill', maxCycles: 1, itemReserve: 0 }, '正常售出原有丹药');
  r.buy('herb', 9, '正常花尽售丹所得');
  assert.equal(r.game.core.player.stones, 0); assert.equal(r.game.core.inventory.healing_pill, 0);
  r.go('wilderness'); r.run(defaultEncounterPlan(r.game, 'wolf'), '明确一次正常妖狼历练');
  assert.equal(r.game.wins, 1); assert.equal(r.game.battle, null);
  assert.ok(r.game.core.player.hp < C.realms.qi.maxHp);
  r.buy('herb', 11, '正常花尽已保存战利灵石');
  assert.equal(r.game.core.player.stones, 0);
  assert.equal(r.game.core.inventory.healing_pill, 0); assert.equal(r.game.core.inventory.spirit_pill, 0);
  r.go('cave'); const before = r.game;
  const rest = r.run({ kind: 'rest', maxCycles: 1, remainingMonthsReserve: 1 }, '零钱零药明确疗养');
  assert.equal(rest.completedCycles, 1); assert.equal(r.game.core.player.hp, C.realms.qi.maxHp);
  assert.equal(r.game.core.player.mp, C.realms.qi.maxMp); assert.equal(r.game.core.player.stones, 0);
  assert.equal(r.game.core.world.elapsedMonths, before.core.world.elapsedMonths + C.actionDurations.rest);
});
