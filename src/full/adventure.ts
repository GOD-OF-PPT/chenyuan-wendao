import * as C from './content.ts';
import type { LocationId } from './content.ts';
import type { Action, Game, Move } from './types.ts';
import type { ActionResult, GamePhase, RuleFailure } from './contracts.ts';
import { gamePhase } from './contracts.ts';
import { costsForAction, remainingMonths } from './costs.ts';
import { intent, previewResolution, resolve, validateGame } from './engine.ts';
import { canonicalFingerprint as fingerprint } from './receipts.ts';
import { RuleError } from './errors.ts';
import { TRIAL_STAGES } from './trial-rules.ts';
import type { ActivityBase } from './activity.ts';
import {REPEAT_CYCLE_LIMIT,repeats,type RepeatingPlan} from './repetition.ts';

export type PriorityMove = 'attack' | 'guard' | 'technique' | 'release';
export interface BattleStrategy {
  priority: PriorityMove[]; respondHeavy: boolean; releaseAt: number;
  healBelowPercent: number; restoreBelowPercent: number;
  healingBudget: number; spiritBudget: number; healingReserve: number; spiritReserve: number;
  retreatBelowPercent: number; riskMode: 'pause' | 'flee';
}
export interface TravelPlan { kind: 'travel'; location: LocationId; maxCycles: 1; }
export interface EncounterPlan extends RepeatingPlan {
  kind: 'encounter'; enemy: string; maxEncounters: number; maxCycles: number;
  target: { item: string; quantity: number } | null; monthBudget: number; remainingMonthsReserve: number;
  mpBudget: number; strategy: BattleStrategy;
}
interface BattleIdentity { kind: 'battle'; enemy: string; trialStage: 1 | 2 | 3 | null; }
export interface AutoBattlePlan extends BattleIdentity { mode: 'auto'; maxCycles: number; mpBudget: number; strategy: BattleStrategy; }
export interface SingleBattlePlan extends BattleIdentity { mode: 'single'; maxCycles: 1; move: Move; }
export type BattlePlan = AutoBattlePlan | SingleBattlePlan;
export type AdventurePlan = TravelPlan | EncounterPlan | BattlePlan;
export interface AdventureTotals {
  encountersStarted: number; battleTurns: number; victories: number; defeats: number; retreats: number;
  moves: Record<Move, number>; spentMp: number; spentItems: Record<string, number>; gainedItems: Record<string, number>;
  gainedStones: number; hpChange: number; mpChange: number;
}
export interface AdventureActivity extends ActivityBase, AdventureTotals {
  version: 6; plan: AdventurePlan; originGame: Game; decisionGame: Game;
}
export interface AdventureDecision { action: Action | null; reason: string; failure: RuleFailure | null; cycleMs: number; }
export interface AdventurePreview extends Omit<AdventureTotals, 'moves' | 'spentItems' | 'gainedItems' | 'gainedStones'> {
  initialAction: Action; initialReason: string; hpAfter: number; mpAfter: number; enemyHpAfter: number | null;
  finalPhase: GamePhase; finalLocation: LocationId;
}
/** Initial online periods only. Formal resolve owns every cost, state transition and reward. */
export const ADVENTURE_CYCLE_MS = Object.freeze({ travel: 6_000, encounter: 30_000, battle: 3_000 });
export const ADVENTURE_MOVES = Object.freeze(['attack', 'guard', 'technique', 'release', 'heal', 'restore', 'flee'] as const);
export const ADVENTURE_PAUSE_CODES = Object.freeze(['ADVENTURE_DANGER', 'ADVENTURE_RISK'] as const);
const priorities: readonly string[] = ['attack', 'guard', 'technique', 'release'];
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);
const id = (v: unknown, table: object): v is string => typeof v === 'string' && Object.hasOwn(table, v);
function invalid(message = '行旅或战策安排无效，未执行动作'): never { throw new RuleError('ACTIVITY_INVALID', message); }
function shape(v: unknown, fields: string[]): asserts v is Record<string, unknown> {
  if (!object(v) || Object.keys(v).length !== fields.length || Object.keys(v).some(k => !fields.includes(k))) invalid();
}
function itemMap(v: unknown): boolean {
  return object(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v)) &&
    Object.entries(v).every(([key, amount]) => id(key, C.items) && integer(amount, 1, C.maxQuantity));
}
export function isAdventurePlan(v: unknown): v is AdventurePlan {
  return object(v) && (v.kind === 'travel' || v.kind === 'encounter' || v.kind === 'battle');
}
export function validateBattleStrategy(v: unknown): asserts v is BattleStrategy {
  shape(v, ['priority', 'respondHeavy', 'releaseAt', 'healBelowPercent', 'restoreBelowPercent', 'healingBudget', 'spiritBudget',
    'healingReserve', 'spiritReserve', 'retreatBelowPercent', 'riskMode']);
  if (!Array.isArray(v.priority) || Object.getPrototypeOf(v.priority) !== Array.prototype || v.priority.length !== 4 ||
      Object.keys(v.priority).length !== 4 || new Set(v.priority).size !== 4 ||
      v.priority.some(move => typeof move !== 'string' || !priorities.includes(move)) || typeof v.respondHeavy !== 'boolean' ||
      !integer(v.releaseAt, 1, 3) || !integer(v.healBelowPercent, 0, 100) || !integer(v.restoreBelowPercent, 0, 100) ||
      !integer(v.healingBudget, 0, 50) || !integer(v.spiritBudget, 0, 50) ||
      !integer(v.healingReserve, 0, 999_999) || !integer(v.spiritReserve, 0, 999_999) ||
      !integer(v.retreatBelowPercent, 0, 99) || v.riskMode !== 'pause' && v.riskMode !== 'flee') invalid('战策须有四招严格顺序、明确阈值及有限用药授权');
}
export function validateAdventurePlan(v: unknown): asserts v is AdventurePlan {
  if (!isAdventurePlan(v)) invalid();
  if (v.kind === 'travel') {
    shape(v, ['kind', 'location', 'maxCycles']);
    if (!id(v.location, C.locations) || v.maxCycles !== 1) invalid('行旅只可明确抵达一个正式目的地一次');
    return;
  }
  if (v.kind === 'encounter') {
    shape(v, ['kind', 'enemy', 'maxEncounters', 'maxCycles', 'target', 'monthBudget', 'remainingMonthsReserve', 'mpBudget', 'strategy',...(Object.hasOwn(v,'repeat')?['repeat']:[])]);
    if(Object.hasOwn(v,'repeat')&&(v.repeat!==true||v.maxCycles!==REPEAT_CYCLE_LIMIT||v.maxEncounters!==REPEAT_CYCLE_LIMIT))invalid('持续历练标识或安全边界无效');
    if (!id(v.enemy, C.enemies) || C.enemies[v.enemy].trial || !integer(v.maxEncounters, 1, repeats(v)?REPEAT_CYCLE_LIMIT:50) ||
        !integer(v.maxCycles, 1, repeats(v)?REPEAT_CYCLE_LIMIT:2050) || !integer(v.monthBudget) || !integer(v.remainingMonthsReserve, 1) || !integer(v.mpBudget)) invalid('历练须指定普通敌人、场次/动作边界、累计月数与灵力预算');
    if (v.target !== null) {
      shape(v.target, ['item', 'quantity']);
      if (!id(v.target.item, C.enemies[v.enemy].loot) || !integer(v.target.quantity, 1, C.maxQuantity)) invalid('此敌人不产该库存目标');
    }
    validateBattleStrategy(v.strategy); return;
  }
  const single = v.mode === 'single';
  shape(v, ['kind', 'enemy', 'trialStage', 'mode', 'maxCycles', ...(single ? ['move'] : ['mpBudget', 'strategy'])]);
  if (!id(v.enemy, C.enemies) || v.mode !== 'auto' && v.mode !== 'single' || !integer(v.maxCycles, 1, single ? 1 : 40) ||
      !(v.trialStage === null || integer(v.trialStage, 1, 3)) ||
      (C.enemies[v.enemy].trial ? v.trialStage === null || TRIAL_STAGES[v.trialStage - 1] !== v.enemy : v.trialStage !== null)) invalid('斗法安排须绑定当前敌人与当前天劫关卡');
  if (single) {
    if (typeof v.move !== 'string' || !ADVENTURE_MOVES.includes(v.move)) invalid('单步须选择七种正式招式之一');
  } else { if (!integer(v.mpBudget)) invalid('累计灵力预算无效'); validateBattleStrategy(v.strategy); }
}
export function defaultBattleStrategy(game: Game): BattleStrategy {
  validateGame(game);
  const healingBudget = Math.min(game.core.inventory.healing_pill, 1), spiritBudget = Math.min(game.core.inventory.spirit_pill, 1);
  return { priority: ['release', 'technique', 'attack', 'guard'], respondHeavy: true, releaseAt: game.school === 'talisman' ? 1 : 3,
    healBelowPercent: healingBudget ? 50 : 0, restoreBelowPercent: spiritBudget ? 25 : 0,
    healingBudget, spiritBudget, healingReserve: 0, spiritReserve: 0, retreatBelowPercent: 20, riskMode: 'pause' };
}
export function defaultEncounterPlan(game: Game, enemy: string): EncounterPlan {
  const plan: EncounterPlan = { kind: 'encounter', enemy, maxEncounters: 1, maxCycles: 41, target: null,
    monthBudget: 1, remainingMonthsReserve: 1, mpBudget: 480, strategy: defaultBattleStrategy(game) };
  validateAdventurePlan(plan); return plan;
}
function battleIdentity(game: Game): BattleIdentity {
  validateGame(game);
  if (!game.battle) throw new RuleError('NO_BATTLE', '当前没有可安排的战斗');
  const stage = game.trial?.stage ?? null;
  if (stage !== null && stage !== 1 && stage !== 2 && stage !== 3) invalid('当前天劫阶段不可出招');
  return { kind: 'battle', enemy: game.battle.enemy, trialStage: stage };
}
export function defaultBattlePlan(game: Game): AutoBattlePlan {
  return { ...battleIdentity(game), mode: 'auto', maxCycles: Math.max(1, 40 - game.battle!.round), mpBudget: 480, strategy: defaultBattleStrategy(game) };
}
export function singleBattlePlan(game: Game, move: Move): SingleBattlePlan {
  const plan: SingleBattlePlan = { ...battleIdentity(game), mode: 'single', maxCycles: 1, move };
  validateAdventurePlan(plan); return plan;
}
export function adventureCycleMs(plan: AdventurePlan, game: Game): number {
  return plan.kind === 'travel' ? ADVENTURE_CYCLE_MS.travel : plan.kind === 'battle' || game.battle ? ADVENTURE_CYCLE_MS.battle : ADVENTURE_CYCLE_MS.encounter;
}
function failed(cycleMs: number, code: string, message: string): AdventureDecision {
  return { action: null, reason: message, failure: { code, message }, cycleMs };
}
const recoverable = new Set(['MP_REQUIRED', 'SWORD_REQUIRED', 'MARK_REQUIRED', 'MARK_CAP']);
export function validateAdventureStart(game: Game, plan: AdventurePlan): void {
  validateGame(game); validateAdventurePlan(plan);
  if (game.core.mode === 'event' || game.trial?.stage === 0 || game.trial?.stage === 4)
    throw new RuleError('WAITING_DECISION', '当前有未决定的机缘、问心或收卷，请先由玩家选择');
  if (plan.kind === 'battle') {
    if (!game.battle) throw new RuleError('NO_BATTLE', '当前没有可安排的战斗');
    if (game.battle.enemy !== plan.enemy || (game.trial?.stage ?? null) !== plan.trialStage)
      throw new RuleError('STATE_CHANGED', '当前敌人或天劫关卡与所选安排不一致');
    if (plan.mode === 'auto') return;
  }
  const action: Action = plan.kind === 'travel' ? { type: 'TRAVEL', location: plan.location } :
    plan.kind === 'encounter' ? { type: 'ENCOUNTER', enemy: plan.enemy } : { type: 'BATTLE', move: plan.move };
  const preview = previewResolution(game, action);
  if (!preview.ok) throw preview.error;
}
/** A closed, deterministic strategy. It never changes Game, chooses a story branch or pays through a second engine. */
export function adventureDecision(a: AdventureActivity): AdventureDecision {
  const plan = a.plan, game = a.decisionGame, cycleMs = adventureCycleMs(plan, game);
  validateAdventurePlan(plan); validateGame(game);
  const fail = (code: string, message: string) => failed(cycleMs, code, message);
  if (game.status !== 'active') return fail('ENDED', '此生已经结束，安排停止');
  if (game.core.mode === 'event' || game.trial?.stage === 0 || game.trial?.stage === 4)
    return fail('WAITING_DECISION', '当前有未决定的机缘、问心或收卷，请先由玩家选择');
  if (a.defeats > 0) return fail('DEFEATED', '本轮已败退回洞府，请查看实际战损并自行筹备');
  if (a.retreats > 0) return fail('RETREATED', '已按明确动作撤退，本次不获战利品');
  if (plan.kind === 'battle' && (game.trial?.stage ?? null) !== plan.trialStage)
    return fail('STAGE_COMPLETE', '本关已结束；后续关卡或收卷由玩家另行安排');
  if (plan.kind === 'encounter' && plan.target && game.core.inventory[plan.target.item] >= plan.target.quantity)
    return fail('TARGET_MET', '实际战利品库存已达到本段目标');
  if (plan.kind === 'battle' && a.victories > 0) return fail('VICTORY', '当前敌人已战胜，本段斗法结束');
  if (a.completedCycles >= plan.maxCycles) return fail('CYCLES_COMPLETE', '已完成本段授权动作数，不再自动出招');
  const formal = (action: Action, reason: string): AdventureDecision => {
    const preview = previewResolution(game, action);
    return preview.ok ? { action, reason, failure: null, cycleMs } : fail(preview.error.code, preview.error.message);
  };
  if (plan.kind === 'travel') return formal({ type: 'TRAVEL', location: plan.location }, `前往${C.locations[plan.location].name}一次；到达后不自动接其他活动`);
  if (!game.battle) {
    if (plan.kind === 'battle') return fail('NO_BATTLE', '当前战局已结束或变化，不自动重新迎战');
    if (a.encountersStarted >= plan.maxEncounters) return fail('ENCOUNTERS_COMPLETE', '已完成本段安排的有限场次');
    const cost = C.actionDurations.encounter;
    if (a.spentMonths + cost > plan.monthBudget) return fail('ACTIVITY_BUDGET', '累计游戏月预算不足以再次迎战');
    if (remainingMonths(game) - cost < plan.remainingMonthsReserve) return fail('ACTIVITY_RESERVE', '再次迎战会低于余寿保留线');
    if (game.core.player.hp * 100 <= C.realms[a.realm].maxHp * plan.strategy.retreatBelowPercent)
      return fail('ADVENTURE_DANGER', '当前气血触及危险线，先暂停筹备；未自动旅行或用药');
    return formal({ type: 'ENCOUNTER', enemy: plan.enemy }, `按已选战策迎战${C.enemies[plan.enemy].name}；正式消耗1游戏月`);
  }
  if (game.battle.enemy !== plan.enemy) return fail('STATE_CHANGED', '敌人已变化，请重新确认本段战策');
  if (plan.kind === 'battle' && plan.mode === 'single') return formal({ type: 'BATTLE', move: plan.move }, '执行玩家明确选择的一招；本回合后停止自动行动');
  const strategy = plan.strategy, mpBudget = plan.mpBudget, p = game.core.player, realm = C.realms[a.realm];
  const risk = (code: string, message: string): AdventureDecision => strategy.riskMode === 'pause' ? fail(code, message + '；按战策暂停，战局保留') :
    formal({ type: 'BATTLE', move: 'flee' }, message + '；已授权撤退，扣8气血（最低1），回洞府并结束本轮天劫');
  if (p.hp * 100 <= realm.maxHp * strategy.retreatBelowPercent) return risk('ADVENTURE_DANGER', '当前气血触及已选危险线');
  const candidate = (move: Move, reason: string): AdventureDecision | null => {
    const action: Action = { type: 'BATTLE', move }, cost = costsForAction(game, action);
    if (a.spentMp + cost.mp > mpBudget) return null;
    if (move === 'heal' && ((a.spentItems.healing_pill ?? 0) >= strategy.healingBudget || game.core.inventory.healing_pill - 1 < strategy.healingReserve)) return null;
    if (move === 'restore' && ((a.spentItems.spirit_pill ?? 0) >= strategy.spiritBudget || game.core.inventory.spirit_pill - 1 < strategy.spiritReserve)) return null;
    const preview = previewResolution(game, action);
    if (!preview.ok) return recoverable.has(preview.error.code) ? null : fail(preview.error.code, preview.error.message);
    if (!preview.value.nextState.battle && preview.value.result.delta.wins === 0)
      return risk('ADVENTURE_RISK', '正式预演表明下一招会败退');
    return { action, reason, failure: null, cycleMs };
  };
  const medicineLimit = (move: 'heal' | 'restore'): AdventureDecision | null => {
    const healing = move === 'heal', item = healing ? 'healing_pill' : 'spirit_pill';
    if ((a.spentItems[item] ?? 0) >= (healing ? strategy.healingBudget : strategy.spiritBudget))
      return fail('ACTIVITY_BUDGET', `已达到${C.items[item].name}累计用量上限，战策停止等待调整`);
    if (game.core.inventory[item] < 1) return fail('INSUFFICIENT_ITEM', `${C.items[item].name}不足，战策停止等待补给`);
    if (game.core.inventory[item] - 1 < (healing ? strategy.healingReserve : strategy.spiritReserve))
      return fail('ACTIVITY_RESERVE', `继续使用${C.items[item].name}会低于库存保留线，战策停止`);
    return null;
  };
  if (strategy.healBelowPercent > 0 && p.hp < realm.maxHp && p.hp * 100 <= realm.maxHp * strategy.healBelowPercent) {
    const limit = medicineLimit('heal'); if (limit) return limit;
    const healing = candidate('heal', '气血低于已选服丹阈值；用药占一个正式回合'); if (healing) return healing;
  }
  if (strategy.respondHeavy && intent(game.battle).kind === 'heavy') {
    if (game.school === 'sword' && game.battle.sword === 3) { const release = candidate('release', '满剑意可按正式规则打断本次重击'); if (release) return release; }
    const guard = candidate('guard', '敌方将重击，按战策先护体'); if (guard) return guard;
  }
  if (strategy.restoreBelowPercent > 0 && p.mp < realm.maxMp && p.mp * 100 <= realm.maxMp * strategy.restoreBelowPercent) {
    const limit = medicineLimit('restore'); if (limit) return limit;
    const restore = candidate('restore', '灵力低于已选回灵阈值；用药占一个正式回合'); if (restore) return restore;
  }
  for (const move of strategy.priority) {
    if (move === 'release' && (game.school === 'sword' ? game.battle.sword : game.battle.marks.length) < strategy.releaseAt) continue;
    const selected = candidate(move, '按已选招式优先级选择当前合法行动'); if (selected) return selected;
  }
  return fail('NO_LEGAL_MOVE', '本段预算或当前状态下没有已授权的合法招式，请玩家调整');
}

export function adventureMetadata(game: Game): Pick<AdventureActivity, 'originGame' | 'decisionGame'> & AdventureTotals {
  return { originGame: structuredClone(game), decisionGame: structuredClone(game), encountersStarted: 0, battleTurns: 0,
    victories: 0, defeats: 0, retreats: 0, moves: Object.fromEntries(ADVENTURE_MOVES.map(move => [move, 0])) as Record<Move, number>,
    spentMp: 0, spentItems: {}, gainedItems: {}, gainedStones: 0, hpChange: 0, mpChange: 0 };
}
function immutableConfiguration(game: Game): unknown {
  return { format: game.format, version: game.version, schemaVersion: game.core.schemaVersion, contentVersion: game.core.contentVersion,
    balanceVersion: game.core.balanceVersion, runId: game.core.runId, name: game.core.player.name, realm: game.core.player.realm,
    startAgeMonths: game.core.player.startAgeMonths, opening: game.core.openingChoice, manuals: game.core.learnedSkills,
    school: game.school, loadout: game.loadout, learned: game.learned, relics: game.ownedRelics, choices: game.choices };
}
export function validateAdventureTotals(a: AdventureActivity): boolean {
  validateAdventurePlan(a.plan);
  try { validateGame(a.originGame); validateGame(a.decisionGame); } catch { invalid('行旅或战策的原始/当前决定快照损坏'); }
  const initial = a.originGame, current = a.decisionGame, plan = a.plan, n = a.completedCycles;
  if (!integer(n, 0, plan.maxCycles) || initial.core.runId !== a.runId || current.core.runId !== a.runId ||
      initial.core.player.realm !== a.realm || current.core.player.realm !== a.realm ||
      initial.core.revision + n !== current.core.revision || !integer(initial.core.revision + n) ||
      (a.status === 'stopped' && a.stopReason?.code === 'STATE_CHANGED' ? a.gameRevision < current.core.revision : a.gameRevision !== current.core.revision) ||
      !same(immutableConfiguration(initial), immutableConfiguration(current)) ||
      a.cycleMs !== adventureCycleMs(plan, current) || !itemMap(a.spentItems) || !itemMap(a.gainedItems)) invalid('战策身份、当前决定或配置证据不一致');
  shape(a.moves, [...ADVENTURE_MOVES]);
  if (ADVENTURE_MOVES.some(move => !integer(a.moves[move], 0, plan.maxCycles)) ||
      !integer(a.encountersStarted, 0, repeats(plan)?REPEAT_CYCLE_LIMIT:50) || !integer(a.battleTurns, 0, plan.maxCycles) ||
      !integer(a.victories, 0, repeats(plan)?REPEAT_CYCLE_LIMIT:50) || !integer(a.defeats, 0, 1) || !integer(a.retreats, 0, 1) || a.defeats + a.retreats > 1 ||
      ADVENTURE_MOVES.reduce((total, move) => total + a.moves[move], 0) !== a.battleTurns || a.moves.flee !== a.retreats)
    invalid('行旅或战策累计场次、回合或动作计数无效');
  const enemy = plan.kind === 'travel' ? null : C.enemies[plan.enemy], victories = a.victories;
  const expectedSpent: Record<string, number> = {};
  if (a.moves.heal) expectedSpent.healing_pill = a.moves.heal;
  if (a.moves.restore) expectedSpent.spirit_pill = a.moves.restore;
  const expectedGained = enemy && !enemy.trial && victories ? Object.fromEntries(Object.entries(enemy.loot).map(([key, amount]) => [key, amount * victories])) : {};
  const expectedMp = ADVENTURE_MOVES.reduce((total, move) => total + costsForAction(initial, { type: 'BATTLE', move }).mp * a.moves[move], 0);
  if (a.spentStones !== 0 || a.spentMonths !== a.encountersStarted * C.actionDurations.encounter ||
      !integer(a.spentMp) || a.spentMp !== expectedMp || !same(a.spentItems, expectedSpent) || !same(a.gainedItems, expectedGained) ||
      a.gainedStones !== (enemy && !enemy.trial ? enemy.stones * victories : 0) || !integer(a.gainedStones) ||
      a.gainedXp !== current.core.player.xp - initial.core.player.xp ||
      a.gainedXp !== (enemy && !enemy.trial ? Math.min(enemy.xp * victories, C.realms[a.realm].xpCap - initial.core.player.xp) : 0) ||
      current.wins !== initial.wins + victories || current.core.player.stones !== initial.core.player.stones + a.gainedStones ||
      current.core.world.elapsedMonths !== initial.core.world.elapsedMonths + a.spentMonths ||
      !integer(a.hpChange, -C.realms[a.realm].maxHp, C.realms[a.realm].maxHp) || a.hpChange !== current.core.player.hp - initial.core.player.hp ||
      !integer(a.mpChange, -C.realms[a.realm].maxMp, C.realms[a.realm].maxMp) || a.mpChange !== current.core.player.mp - initial.core.player.mp)
    invalid('战策累计费用、掉落、胜负或净体魄变化无效');
  for (const item of Object.keys(C.items)) if (current.core.inventory[item] !== initial.core.inventory[item] + (a.gainedItems[item] ?? 0) - (a.spentItems[item] ?? 0))
    invalid('战策库存变化与真实耗物/战利品不一致');
  if (n === 0 && !same(initial, current)) invalid('尚未执行的安排不能改变当前决定快照');
  if (plan.kind === 'travel') {
    if (gamePhase(initial) !== 'idle' || gamePhase(current) !== 'idle' || a.encountersStarted || a.battleTurns || victories || a.defeats || a.retreats ||
        current.core.world.location !== (n ? plan.location : initial.core.world.location) || a.hpChange || a.mpChange)
      invalid('行旅必须只抵达明确目的地，不改变战斗或体魄');
  } else if (plan.kind === 'encounter') {
    const finished = victories + a.defeats + a.retreats;
    if (gamePhase(initial) !== 'idle' || initial.core.world.location !== enemy!.location || !initial.school ||
        C.rank(a.realm) < C.rank(enemy!.min) || initial.core.player.hp < 30 || current.trial ||
        a.encountersStarted > plan.maxEncounters || a.spentMonths > plan.monthBudget || a.spentMp > plan.mpBudget ||
        n !== a.encountersStarted + a.battleTurns || a.encountersStarted - finished !== (current.battle ? 1 : 0) ||
        a.battleTurns > a.encountersStarted * 40 || current.battle && current.battle.enemy !== plan.enemy ||
        current.core.world.location !== (a.defeats || a.retreats ? 'cave' : enemy!.location)) invalid('历练场次、地点、阶段或有限授权不一致');
  } else {
    if (!initial.battle || initial.battle.enemy !== plan.enemy || (initial.trial?.stage ?? null) !== plan.trialStage ||
        a.encountersStarted || n !== a.battleTurns || victories + a.defeats + a.retreats > 1 ||
        n > 40 - initial.battle.round || (a.defeats || a.retreats ? current.battle !== null || current.trial !== null || current.core.world.location !== 'cave' :
          victories ? current.battle?.enemy === plan.enemy : !current.battle || current.battle.enemy !== plan.enemy || (current.trial?.stage ?? null) !== plan.trialStage))
      invalid('斗法必须限于原敌人和原天劫关卡，不自动重新开战');
    if (plan.mode === 'auto' && a.spentMp > plan.mpBudget || plan.mode === 'single' && ADVENTURE_MOVES.some(move => a.moves[move] !== (move === plan.move ? n : 0))) invalid('单步选择或灵力授权不一致');
  }
  if (plan.kind === 'encounter' || plan.kind === 'battle' && plan.mode === 'auto') {
    const s = plan.strategy;
    if ((a.spentItems.healing_pill ?? 0) > s.healingBudget || (a.spentItems.spirit_pill ?? 0) > s.spiritBudget ||
        current.core.inventory.healing_pill < Math.min(initial.core.inventory.healing_pill, s.healingReserve) ||
        current.core.inventory.spirit_pill < Math.min(initial.core.inventory.spirit_pill, s.spiritReserve)) invalid('累计服丹越过授权或库存保留线');
  }
  const decision = adventureDecision(a);
  if (a.status === 'paused' && a.stopReason) {
    const strategy = plan.kind === 'encounter' ? plan.strategy : plan.kind === 'battle' && plan.mode === 'auto' ? plan.strategy : null;
    if (strategy?.riskMode !== 'pause' || !same(decision.failure, a.stopReason) || !ADVENTURE_PAUSE_CODES.some(code => code === a.stopReason!.code))
      invalid('自动危险暂停必须保留原战策的真实原因');
  }
  if (a.status === 'stopped' && a.stopReason && !['STATE_CHANGED', 'ACTIVITY_TIME_LIMIT'].includes(a.stopReason.code) && !same(decision.failure, a.stopReason))
    invalid('停止原因与已保存的当前决定不一致');
  return decision.action !== null;
}
/** Full formal proof uses the exact current decision snapshot; signs and zero resource deltas are never guessed. */
export function validateAdventureResult(gameAfter: Game, a: AdventureActivity, result: ActionResult): void {
  validateAdventureTotals(a); validateGame(gameAfter);
  const decision = adventureDecision(a), command = a.nextCommand;
  if (!decision.action || !command || !same(command, { ...decision.action, commandId: `cycle:${a.id}:${a.generation}:${a.completedCycles + 1}`,
    runId: a.runId, expectedRevision: a.gameRevision })) invalid('当前周期指令不符合原决定或原战策');
  try {
    const expected = resolve(a.decisionGame, command);
    if (!same(expected.nextState, gameAfter) || !same(expected.result, result)) invalid();
  } catch { invalid('行旅或战策回执与正式完整Game/回合不一致'); }
}
export function completeAdventureMetadata(gameAfter: Game, a: AdventureActivity, result: ActionResult): Pick<AdventureActivity, 'decisionGame'> & AdventureTotals {
  const command = a.nextCommand!, move = command.type === 'BATTLE' ? command.move : null;
  const victory = result.delta.wins === 1, fled = move === 'flee';
  const defeated = command.type === 'BATTLE' && !fled && !victory && !!a.decisionGame.battle && !gameAfter.battle;
  const merge = (before: Record<string, number>, added: Record<string, number>) => {
    const next = { ...before }; for (const [key, amount] of Object.entries(added)) next[key] = (next[key] ?? 0) + amount; return next;
  };
  const loot = victory && a.plan.kind !== 'travel' && !C.enemies[a.plan.enemy].trial ? C.enemies[a.plan.enemy].loot : {};
  return { decisionGame: structuredClone(gameAfter), encountersStarted: a.encountersStarted + (command.type === 'ENCOUNTER' ? 1 : 0),
    battleTurns: a.battleTurns + (move ? 1 : 0), victories: a.victories + (victory ? 1 : 0), defeats: a.defeats + (defeated ? 1 : 0), retreats: a.retreats + (fled ? 1 : 0),
    moves: { ...a.moves, ...(move ? { [move]: a.moves[move] + 1 } : {}) }, spentMp: a.spentMp + result.costs.mp,
    spentItems: merge(a.spentItems, result.costs.items), gainedItems: merge(a.gainedItems, loot),
    gainedStones: a.gainedStones + Math.max(0, result.delta.stones), hpChange: a.hpChange + result.delta.hp, mpChange: a.mpChange + result.delta.mp };
}
export function adventurePreview(a: AdventureActivity, initial: AdventureDecision): AdventurePreview {
  return { initialAction: structuredClone(initial.action!), initialReason: initial.reason, encountersStarted: a.encountersStarted,
    battleTurns: a.battleTurns, victories: a.victories, defeats: a.defeats, retreats: a.retreats, spentMp: a.spentMp,
    hpChange: a.hpChange, mpChange: a.mpChange, hpAfter: a.decisionGame.core.player.hp, mpAfter: a.decisionGame.core.player.mp,
    enemyHpAfter: a.decisionGame.battle?.hp ?? null, finalPhase: gamePhase(a.decisionGame), finalLocation: a.decisionGame.core.world.location };
}
