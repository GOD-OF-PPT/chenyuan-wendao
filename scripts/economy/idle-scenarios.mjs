import * as C from '../../src/full/content.ts';
import { newGame, stats, validateGame } from '../../src/full/engine.ts';
import { economicSnapshot } from '../../src/full/economy-ledger.ts';
import {
  ActivityLedger,
  projectProgression,
  progressionOptions,
} from '../../src/full/progression.ts';
import { defaultBattlePlan } from '../../src/full/adventure.ts';

// Browser-safe audit composition. Every write belongs to the supplied finite
// ActivityLedger plan or its explicit, immediate configuration confirmation.
const preparations = ['gather', 'commission', 'purchase'];
const choices = ['help', 'trade', 'leave'];
const schools = ['sword', 'talisman'];
const answers = ['accept', 'release'];
const endings = ['transmit', 'depart'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function required(condition, message, code = 'IDLE_ROUTE_INCOMPLETE') {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}
export function idleScenarioId(options) {
  return [
    options.advanced ? 'advanced' : 'baseline',
    options.choice,
    options.school,
    options.preparation,
    options.cultivation,
    options.answer,
    options.ending,
  ].join('-');
}
export function idleScenarioOptions() {
  const rows = [];
  for (const choice of choices)
    for (const school of schools)
      for (const preparation of preparations)
        for (const cultivation of ['natural', 'assisted'])
          for (const answer of answers)
            for (const ending of endings)
              rows.push({
                choice,
                school,
                preparation,
                cultivation,
                answer,
                ending,
                advanced: true,
              });
  for (const school of schools)
    for (const preparation of ['gather', 'purchase'])
      for (const answer of answers)
        for (const ending of endings)
          rows.push({
            choice: 'leave',
            school,
            preparation,
            cultivation: 'natural',
            answer,
            ending,
            advanced: false,
          });
  return rows;
}
export function createIdleRoute(options, identity = {}, initialGame) {
  required(
    choices.includes(options.choice) &&
      schools.includes(options.school) &&
      preparations.includes(options.preparation) &&
      ['natural', 'assisted'].includes(options.cultivation) &&
      answers.includes(options.answer) &&
      endings.includes(options.ending) &&
      typeof options.advanced === 'boolean',
    'Unknown normal idle route options',
    'IDLE_ROUTE_OPTIONS',
  );
  const id = idleScenarioId(options),
    runId = identity.runId ?? 'idle-route-' + id;
  const initial = initialGame ?? newGame(identity.name ?? '放置路线', runId);
  validateGame(initial);
  required(
    initial.core.runId === runId &&
      initial.core.revision === 0 &&
      initial.core.player.realm === 'mortal' &&
      initial.core.mode === 'event' &&
      initial.core.activeEvent?.id === 'temple' &&
      initial.core.world.elapsedMonths === 0,
    'Idle route must begin at the supplied real fresh birth',
    'IDLE_ROUTE_ORIGIN',
  );
  const activity = new ActivityLedger(initial, 'idle-route', 1500);
  const projections = [],
    trialAuthorizations = [],
    trialBudgetStops = [];
  let phase = 'opening';
  const run = (plan, label) => {
    phase = label;
    const result = activity.run(plan, label);
    required(
      result.status === 'stopped',
      `${label}: ${result.status}: ${result.stopReason?.code ?? 'no safe stop'}`,
      result.stopReason?.code ?? 'IDLE_ROUTE_PAUSED',
    );
    return result;
  };
  const configure = (action, label) => {
    phase = label;
    return activity.configure(action, label);
  };
  const milestone = (action, label) =>
    run({ kind: 'milestone', action, maxCycles: 1 }, label);
  const go = (location, label = '明确行旅') => {
    if (activity.game.core.world.location !== location)
      run({ kind: 'travel', location, maxCycles: 1 }, label);
  };
  const source = (id, target, label) => {
    const s = C.sources[id],
      game = activity.game;
    const have =
      target.kind === 'stones'
        ? game.core.player.stones
        : game.core.inventory[target.id];
    if (have >= target.quantity) return;
    const yieldCount = target.kind === 'stones' ? s.stones : s.items[target.id];
    required(yieldCount > 0, `${id} cannot produce the selected target`);
    const cycles = Math.ceil((target.quantity - have) / yieldCount);
    required(
      cycles <= C.maxBatch,
      'Normal route source segment exceeds the finite batch bound',
    );
    go(s.location, label + ' · 前往');
    run(
      {
        kind: 'source',
        sourceId: id,
        maxCycles: cycles,
        until: 'target',
        target,
        monthBudget: cycles * s.months,
        remainingMonthsReserve: 1,
      },
      label,
    );
  };
  const funds = (amount, label = '明确筹资') => {
    if (activity.game.core.player.stones >= amount) return;
    const game = activity.game;
    const candidates = Object.entries(C.sources).filter(
      ([, s]) =>
        s.stones > 0 &&
        Object.keys(s.items).length === 0 &&
        C.rank(s.min) <= C.rank(game.core.player.realm),
    );
    candidates.sort(
      (a, b) =>
        b[1].stones / b[1].months - a[1].stones / a[1].months ||
        a[0].localeCompare(b[0]),
    );
    required(
      candidates.length > 0,
      'No currently legal deterministic funding source',
    );
    source(candidates[0][0], { kind: 'stones', quantity: amount }, label);
  };
  const buy = (item, targetQuantity, label = '明确采购') => {
    const missing = Math.max(
      0,
      targetQuantity - activity.game.core.inventory[item],
    );
    if (!missing) return;
    required(
      missing <= C.maxBatch,
      'Normal route purchase exceeds the finite batch bound',
    );
    const budget = missing * C.items[item].buy;
    funds(budget, label + ' · 筹资');
    go('market', label + ' · 前往坊市');
    run(
      {
        kind: 'buy',
        item,
        maxCycles: missing,
        until: 'target',
        targetQuantity,
        stoneBudget: budget,
        stoneReserve: 0,
      },
      label,
    );
  };
  const material = (item, quantity, label = '明确备料') => {
    if (activity.game.core.inventory[item] >= quantity) return;
    if (options.preparation === 'purchase') {
      buy(item, quantity, label);
      return;
    }
    const game = activity.game;
    const candidates = Object.entries(C.sources).filter(
      ([, s]) =>
        s.items[item] > 0 && C.rank(s.min) <= C.rank(game.core.player.realm),
    );
    required(candidates.length > 0, 'No deterministic source for ' + item);
    const selected =
      options.preparation === 'commission' ? candidates.at(-1) : candidates[0];
    source(selected[0], { kind: 'item', id: item, quantity }, label);
  };
  const project = (variant) => {
    const before = activity.game,
      original = JSON.stringify(before);
    const actualVariant =
      variant === 'commission' &&
      !progressionOptions(before, 'preparation').includes('commission')
        ? 'gather'
        : variant;
    const projected = projectProgression(before, actualVariant);
    required(
      JSON.stringify(before) === original,
      'Read-only progression projection changed its input',
    );
    required(
      projected.complete,
      `${variant}: ${projected.failure?.message ?? 'projection did not reach its declared endpoint'}`,
      projected.failure?.code ?? 'IDLE_ROUTE_PROJECTION',
    );
    for (const step of projected.steps) {
      if (step.kind === 'configuration') configure(step.action, step.label);
      else run(step.plan, step.label);
    }
    required(
      same(economicSnapshot(activity.game), projected.closing),
      variant + ': replay differs from projected endpoint',
    );
    projections.push({
      realm: before.core.player.realm,
      requestedVariant: variant,
      actualVariant,
      sharedDeterministicRoute: variant !== actualVariant,
      target: projected.target,
      onlineMs: projected.onlineMs,
      note:
        variant !== actualVariant
          ? '当前配方没有独立替代委托；此段明确共用既有确定采集/护送来源。'
          : null,
    });
    return projected;
  };
  const upgrade = () => {
    const game = activity.game;
    if (
      options.advanced &&
      C.rank(game.core.player.realm) >= C.rank('foundation')
    ) {
      const ids =
        options.school === 'sword'
          ? ['sword_still', 'sword_guard', 'sword_echo']
          : ['talisman_calm', 'talisman_frost', 'talisman_return'];
      const missing = ids.filter(
        (id) =>
          C.rank(C.skills[id].min) <= C.rank(game.core.player.realm) &&
          !game.learned.includes(id),
      );
      if (missing.length) {
        const budget = missing.reduce((n, id) => n + C.skills[id].price, 0);
        funds(budget, '本派进阶研习 · 筹资');
        go('sect', '本派进阶研习 · 前往宗门');
        run(
          {
            kind: 'learn',
            skills: missing,
            maxCycles: missing.length,
            stoneBudget: budget,
            stoneReserve: 0,
          },
          '本派付费研习',
        );
        for (const skill of missing)
          configure({ type: 'EQUIP', skill }, '确认本派进阶配装');
      }
    }
    if (C.rank(activity.game.core.player.realm) < C.rank('golden')) return;
    const relic = options.advanced
      ? options.school === 'sword'
        ? 'frost_sword'
        : 'soul_lamp'
      : 'jade_seal';
    if (!activity.game.ownedRelics.includes(relic)) {
      const r = C.relics[relic];
      for (const [item, n] of Object.entries(r.inputs))
        material(item, n, '本命法宝 · 备料');
      funds(r.stones, '本命法宝 · 筹资');
      go('cave', '本命法宝 · 返回洞府');
      run(
        {
          kind: 'forge',
          relicId: relic,
          maxCycles: 1,
          stoneBudget: r.stones,
          stoneReserve: 0,
          monthBudget: C.actionDurations.forge,
          remainingMonthsReserve: 1,
          itemReserves: {},
        },
        '一次本命炼器',
      );
    }
    if (activity.game.loadout.relic !== relic)
      configure({ type: 'EQUIP_RELIC', relic }, '确认本命法宝');
  };
  const begin = () => {
    milestone({ type: 'CHOOSE', choice: options.choice }, '明确开场选择');
    project('natural');
    milestone({ type: 'BREAKTHROUGH' }, '确认引气入体');
    configure({ type: 'SCHOOL', school: options.school }, '确认本次修法');
  };
  const grow = (target = 'spirit') => {
    for (let stages = 0; activity.game.core.player.realm !== target; stages++) {
      required(
        stages < C.realmIds.length &&
          C.rank(activity.game.core.player.realm) < C.rank(target),
        'Invalid growth target',
      );
      upgrade();
      project(options.preparation);
      project(options.cultivation);
      milestone({ type: 'BREAKTHROUGH' }, '确认本次普通突破');
    }
    upgrade();
  };
  const finish = () => {
    project(options.preparation);
    buy('healing_pill', 12, '本次天劫回春预算');
    buy('spirit_pill', 4, '本次天劫回灵预算');
    project(options.cultivation);
    go('cave', '临劫恢复核对');
    const game = activity.game,
      maximum = stats(game);
    if (
      game.core.player.hp < maximum.maxHp ||
      game.core.player.mp < maximum.maxMp
    )
      run(
        { kind: 'rest', maxCycles: 1, remainingMonthsReserve: 1 },
        '明确一次洞府疗养',
      );
    go('terrace', '明确前往登仙台');
    milestone({ type: 'START_TRIAL' }, '确认本次入劫');
    milestone(
      { type: 'ANSWER_TRIAL', answer: options.answer },
      '明确本次问心回答',
    );
    for (let stage = 1; stage <= 3; stage++) {
      required(
        activity.game.trial?.stage === stage && activity.game.battle,
        'Expected the next explicitly arranged trial stage',
      );
      for (let segment = 1; segment <= 3; segment++) {
        const before = activity.game,
          plan = defaultBattlePlan(before);
        const stopped = run(
          plan,
          `明确天劫第${stage}关第${segment}段战策${segment > 1 ? ' · 预算停止后另行确认' : ''}`,
        );
        const after = activity.game;
        trialAuthorizations.push({
          stage,
          segment,
          activityId: stopped.id,
          plan: structuredClone(plan),
          before: {
            hp: before.core.player.hp,
            mp: before.core.player.mp,
            enemyHp: before.battle.hp,
            round: before.battle.round,
            healing: before.core.inventory.healing_pill,
            spirit: before.core.inventory.spirit_pill,
          },
          after: {
            hp: after.core.player.hp,
            mp: after.core.player.mp,
            enemyHp: after.battle?.hp ?? null,
            round: after.battle?.round ?? null,
            healing: after.core.inventory.healing_pill,
            spirit: after.core.inventory.spirit_pill,
          },
          spentItems: { ...stopped.spentItems },
          stopReason: stopped.stopReason,
        });
        if (after.trial?.stage === stage + 1) break;
        const usedMedicineBudget =
          ((stopped.spentItems.healing_pill ?? 0) >=
            plan.strategy.healingBudget &&
            plan.strategy.healingBudget > 0 &&
            after.core.inventory.healing_pill > 0) ||
          ((stopped.spentItems.spirit_pill ?? 0) >=
            plan.strategy.spiritBudget &&
            plan.strategy.spiritBudget > 0 &&
            after.core.inventory.spirit_pill > 0);
        required(
          stopped.stopReason?.code === 'ACTIVITY_BUDGET' &&
            usedMedicineBudget &&
            segment < 3 &&
            after.trial?.stage === stage &&
            after.battle?.enemy === before.battle.enemy &&
            after.wins === before.wins,
          `Current trial stage ${stage} stopped: ${stopped.stopReason?.message ?? 'no completed stage'}; no automatic rescue or free supplies`,
          stopped.stopReason?.code ?? 'IDLE_ROUTE_TRIAL',
        );
        trialBudgetStops.push({
          stage,
          segment,
          activityId: stopped.id,
          reason: stopped.stopReason,
          enemy: after.battle.enemy,
          enemyHp: after.battle.hp,
          round: after.battle.round,
          hp: after.core.player.hp,
          mp: after.core.player.mp,
          healing: after.core.inventory.healing_pill,
          spirit: after.core.inventory.spirit_pill,
          nextAuthorization:
            'A new finite defaultBattlePlan must be explicitly confirmed; no continuation of the exhausted authorization.',
        });
      }
      required(
        activity.game.trial?.stage === stage + 1,
        'The current stage did not complete within three explicitly authorized segments',
      );
    }
    required(
      activity.game.trial?.stage === 4 && !activity.game.battle,
      'Ending remains unavailable',
    );
    milestone({ type: 'END', ending: options.ending }, '明确本次收卷选择');
    required(
      activity.game.status === 'ascended' &&
        activity.game.ending === options.ending,
      'Selected ending was not saved',
    );
    required(
      Object.keys(activity.game.choices).length === 0,
      'This no-later-aid route unexpectedly executed an NPC event',
    );
  };
  return {
    id,
    options: { ...options },
    initial,
    activity,
    projections,
    trialAuthorizations,
    trialBudgetStops,
    run,
    configure,
    milestone,
    go,
    source,
    funds,
    buy,
    material,
    project,
    upgrade,
    begin,
    grow,
    finish,
    get game() {
      return activity.game;
    },
    get phase() {
      return phase;
    },
  };
}

export function runIdleScenario(options, identity = {}) {
  const r = createIdleRoute(options, identity);
  let failure = null;
  try {
    r.begin();
    r.grow();
    r.finish();
  } catch (error) {
    failure = {
      code: error.code ?? error.name,
      message: error.message,
      phase: r.phase,
      realm: r.game.core.player.realm,
      hp: r.game.core.player.hp,
      mp: r.game.core.player.mp,
    };
  }
  return {
    id: r.id,
    options: { ...options },
    success: failure === null,
    failure,
    game: r.game,
    steps: r.activity.steps,
    onlineMs: r.activity.onlineMs,
    report: r.activity.ledger.report(),
    projections: r.projections,
    trialAuthorizations: r.trialAuthorizations,
    trialBudgetStops: r.trialBudgetStops,
  };
}

export function idleRouteMatrix() {
  return idleScenarioOptions().map((options) => runIdleScenario(options));
}
