import {CURRENT_RULES_VERSION,assertActivityRules} from './rule-profile.ts';
import * as C from './content.ts';
import type { RealmId } from './content.ts';
import { costsForAction, remainingMonths } from './costs.ts';
import { previewResolution, resolve, stats, validateCommand, validateGame } from './engine.ts';
import { RuleError } from './errors.ts';
import { canonicalFingerprint, validateCommandReceipt } from './receipts.ts';
import type { ActionResult, RuleFailure } from './contracts.ts';
import type { Command, Game } from './types.ts';
import type { CollectionTarget } from './goals.ts';
import {REPEAT_CYCLE_LIMIT,repeats,type RepeatingPlan} from './repetition.ts';
import { PREPARATION_CYCLE_MS, isPreparationPlan, validatePreparationPlan, preparationCycleAction,
  preparationSnapshot, emptyPreparationTotals, validatePreparationTotals, validatePreparationSnapshot,
  preparationStop, validatePreparationResult } from './preparation.ts';
import type { PreparationPlan, PreparationSnapshot, PreparationTotals } from './preparation.ts';
export { PREPARATION_CYCLE_MS, preparationCycleAction, validatePreparationResult } from './preparation.ts';
export type { LearnPlan, StudyPlan, BuyPlan, SellPlan, UsePlan, RestPlan, PreparationPlan } from './preparation.ts';
import { isAdventurePlan, validateAdventurePlan, adventureCycleMs, adventureDecision, adventureMetadata,
  validateAdventureTotals, validateAdventureStart, validateAdventureResult, completeAdventureMetadata, adventurePreview, ADVENTURE_PAUSE_CODES } from './adventure.ts';
import type { AdventurePlan, AdventureActivity, AdventurePreview } from './adventure.ts';
export { ADVENTURE_CYCLE_MS, ADVENTURE_MOVES, ADVENTURE_PAUSE_CODES, isAdventurePlan, validateAdventurePlan, adventureDecision,
  defaultBattleStrategy, defaultEncounterPlan, defaultBattlePlan, singleBattlePlan, validateAdventureResult } from './adventure.ts';
export type { AdventurePlan, AdventureActivity, AdventureDecision, AdventurePreview, BattleStrategy, PriorityMove, TravelPlan, EncounterPlan,
  BattlePlan, AutoBattlePlan, SingleBattlePlan } from './adventure.ts';
import { isMilestonePlan, validateMilestonePlan, milestoneCycleAction, milestoneMetadata, validateMilestoneStart,
  validateMilestoneTotals, milestoneStop, completeMilestoneMetadata, milestoneCompletionReason, MILESTONE_CYCLE_MS } from './milestones.ts';
import type { MilestonePlan, MilestoneActivity } from './milestones.ts';
export { isMilestoneAction, isMilestonePlan, validateMilestonePlan, milestoneCycleAction, milestoneMetadata, validateMilestoneStart,
  validateMilestoneTotals, milestoneStop, validateMilestoneResult, completeMilestoneMetadata, milestoneCompletionReason,
  MILESTONE_CYCLE_MS } from './milestones.ts';
export type { MilestoneAction, MilestonePlan, MilestoneMetadata, MilestoneActivity } from './milestones.ts';

export interface CultivationPlan {
  kind: 'cultivation';
  method: 'natural' | 'assisted';
  maxCycles: number;
  until: 'xp-cap' | 'cycles';
  stoneBudget: number;
  stoneReserve: number;
}
export interface SourcePlan extends RepeatingPlan {
  kind: 'source'; sourceId: string; maxCycles: number; until: 'cycles' | 'target';
  target: CollectionTarget | null; monthBudget: number; remainingMonthsReserve: number;
}
interface ProductionLimits {
  stoneBudget: number; stoneReserve: number; monthBudget: number;
  remainingMonthsReserve: number; itemReserves: Record<string, number>;
}
export interface CraftPlan extends ProductionLimits,RepeatingPlan {
  kind: 'craft'; recipeId: string; maxCycles: number; until: 'cycles' | 'target'; targetQuantity: number | null;
}
export interface ForgePlan extends ProductionLimits { kind: 'forge'; relicId: string; maxCycles: 1; }
export type ActivityPlan = CultivationPlan | SourcePlan | CraftPlan | ForgePlan | PreparationPlan | AdventurePlan | MilestonePlan;
export interface ActivityBase {
  rulesVersion?: string;
  format: 'chenyuan-activity'; id: string; revision: number; generation: number;
  ownerId: string; runId: string; realm: Exclude<RealmId, 'ascended'>; gameRevision: number;
  cycleMs: number; completedCycles: number; spentStones: number;
  gainedXp: number; spentMonths: number; status: 'running' | 'paused' | 'stopped';
  stopReason: RuleFailure | null; nextCommand: Command | null;
  startedAt: number | null; dueAt: number | null;
}
export interface CultivationActivity extends ActivityBase { version: 1; plan: CultivationPlan; }
export interface SourceActivity extends ActivityBase {
  version: 2; plan: SourcePlan; gainedItems: Record<string, number>; gainedStones: number;
}
interface ProductionTotals {
  spentItems: Record<string, number>; gainedItems: Record<string, number>; forgedRelics: string[];
}
export interface CraftActivity extends ActivityBase, ProductionTotals { version: 3; plan: CraftPlan; }
export interface ForgeActivity extends ActivityBase, ProductionTotals { version: 4; plan: ForgePlan; relicBefore: string | null; }
export interface PreparationActivity extends ActivityBase, PreparationSnapshot, PreparationTotals { version: 5; plan: PreparationPlan; }
export type Activity = CultivationActivity | SourceActivity | CraftActivity | ForgeActivity | PreparationActivity | AdventureActivity | MilestoneActivity;
export interface ActivityMutation {
  commandId: string; runId: string; expectedRevision: number;
  expectedActivityId: string | null; expectedActivityRevision: number | null; ownerId: string;
}
export interface ActivityTick {
  commandId: string; runId: string; expectedRevision: number; activityId: string;
  expectedActivityRevision: number; ownerId: string; generation: number;
}
export interface ActivityOutcome {
  state: Game; activity: Activity | null; replayed: boolean; result: ActionResult | null;
}
export interface ActivityStartOptions { id: string; ownerId: string; commandId: string; now: number; }
export interface ActivityResumeOptions { ownerId: string; commandId: string; now: number; }
export interface ActivityCompleteOptions { commandId: string; now: number; }
export interface ActivityPreview {
  truncated?: boolean;
  allowed: boolean; failure: RuleFailure | null; cycles: number; xp: number; stones: number;
  months: number; stopReason: RuleFailure | null; cycleMs: number;
  items: Record<string, number>; earnedStones: number; spentItems: Record<string, number>; relics: string[];
  hp: number; mp: number; skills: string[]; manuals: string[];
  adventure: AdventurePreview | null;
}

/** Initial pacing only; these values have not passed long-term balance or player acceptance. */
export const CULTIVATION_CYCLE_MS = Object.freeze({
  mortal: 30_000, qi: 60_000, foundation: 90_000, golden: 120_000, nascent: 180_000, spirit: 240_000,
});
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const plainRecord = (value: unknown): value is Record<string, unknown> => object(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const integer = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const identity = (value: unknown, maximum = 100): value is string => typeof value === 'string' &&
  value.length <= maximum && value.trim().length > 0;
function invalid(message = '活动记录或指令无效，未执行活动'): never { throw new RuleError('ACTIVITY_INVALID', message); }
function shape(value: unknown, fields: readonly string[]): asserts value is Record<string, unknown> {
  if (!object(value) || Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key))) invalid();
}
function failure(value: unknown): asserts value is RuleFailure {
  shape(value, ['code', 'message']);
  if (!identity(value.code) || !identity(value.message, 600)) invalid();
}
function increment(value: number): number {
  if (!integer(value, 0, Number.MAX_SAFE_INTEGER - 1)) invalid('活动版本已达安全上限');
  return value + 1;
}
function at(now: unknown, cycleMs: number): asserts now is number {
  if (!integer(now, 0, Number.MAX_SAFE_INTEGER - cycleMs)) invalid('活动时间无效');
}
function cycleCommand(activity: Activity): Command {
  const identity = { commandId: `cycle:${activity.id}:${activity.generation}:${activity.completedCycles + 1}`,
    runId: activity.runId, expectedRevision: activity.gameRevision };
  const plan = activity.plan;
  if (plan.kind === 'source') return { type: 'SOURCE', sourceId: plan.sourceId, count: 1,
    ...(plan.target?.kind === 'item' ? { target: { item: plan.target.id, quantity: plan.target.quantity } } : {}), ...identity };
  if (plan.kind === 'craft') return { type: 'CRAFT', recipeId: plan.recipeId, ...identity };
  if (plan.kind === 'forge') return { type: 'FORGE', relic: plan.relicId, ...identity };
  if (isMilestonePlan(plan)) return { ...milestoneCycleAction(plan), ...identity };
  if (isAdventurePlan(plan)) {
    const selected = adventureDecision(activity as AdventureActivity);
    if (!selected.action) invalid('当前没有满足原战策的下一动作');
    return { ...selected.action, ...identity };
  }
  if (isPreparationPlan(plan)) return { ...preparationCycleAction(plan, activity.completedCycles), ...identity };
  return { type: 'CULTIVATE', method: plan.method, count: 1, ...identity };
}
function resetCycle(activity: Activity, now: number): Activity {
  at(now, activity.cycleMs);
  const next = { ...activity, nextCommand: cycleCommand(activity), startedAt: now, dueAt: now + activity.cycleMs };
  validateActivity(next);
  return next;
}
function stop(activity: Activity, reason: RuleFailure): Activity {
  const next: Activity = { ...activity, status: 'stopped', stopReason: { ...reason }, nextCommand: null, startedAt: null, dueAt: null };
  validateActivity(next);
  return next;
}

export function validateActivityPlan(value: unknown): asserts value is ActivityPlan {
  if (isMilestonePlan(value)) { validateMilestonePlan(value); return; }
  if (isAdventurePlan(value)) { validateAdventurePlan(value); return; }
  if (isPreparationPlan(value)) { validatePreparationPlan(value); return; }
  if (object(value) && (value.kind === 'craft' || value.kind === 'forge')) {
    const craft = value.kind === 'craft';
    shape(value, ['kind', craft ? 'recipeId' : 'relicId', 'maxCycles', 'stoneBudget', 'stoneReserve', 'monthBudget',
      'remainingMonthsReserve', 'itemReserves', ...(craft ? ['until', 'targetQuantity',...(Object.hasOwn(value,'repeat')?['repeat']:[])] : [])]);
    const id = craft ? value.recipeId : value.relicId, table = craft ? C.recipes : C.relics;
    if (Object.hasOwn(value,'repeat')&&(value.repeat!==true||value.maxCycles!==REPEAT_CYCLE_LIMIT)) invalid('持续生产标识或安全轮界无效');
    if (!identity(id) || !Object.hasOwn(table, id) || !integer(value.maxCycles, 1, craft ? repeats(value)?REPEAT_CYCLE_LIMIT:C.maxBatch : 1) ||
        !integer(value.stoneBudget) || !integer(value.stoneReserve) || !integer(value.monthBudget) ||
        !integer(value.remainingMonthsReserve)) invalid('生产安排须有正式配方或法宝、有限次数、累计预算与保留线');
    const inputs = table[id].inputs;
    if (!plainRecord(value.itemReserves) || Object.entries(value.itemReserves).some(([item, amount]) =>
      !Object.hasOwn(inputs, item) || !integer(amount, 0, C.maxQuantity))) invalid('材料保留只可指定本次配方实际投入的物资');
    if (craft && (value.until !== 'cycles' && value.until !== 'target' ||
      (value.until === 'cycles' ? value.targetQuantity !== null : !integer(value.targetQuantity, 1, C.maxQuantity))))
      invalid('炼丹须明确炉数或成品库存目标，不能携带隐含目标');
    return;
  }
  if (object(value) && value.kind === 'source') {
    shape(value, ['kind', 'sourceId', 'maxCycles', 'until', 'target', 'monthBudget', 'remainingMonthsReserve',...(Object.hasOwn(value,'repeat')?['repeat']:[])]);
    if (Object.hasOwn(value,'repeat')&&(value.repeat!==true||value.maxCycles!==REPEAT_CYCLE_LIMIT)) invalid('持续取材标识或安全轮界无效');
    if (!identity(value.sourceId) || !Object.hasOwn(C.sources, value.sourceId) || !integer(value.maxCycles, 1, repeats(value)?REPEAT_CYCLE_LIMIT:C.maxBatch) ||
        value.until !== 'cycles' && value.until !== 'target' || !integer(value.monthBudget) || !integer(value.remainingMonthsReserve))
      invalid('取材安排须有来源、1至50轮、累计游戏月预算与余寿保留线');
    if (value.until === 'cycles') { if (value.target !== null) invalid('按轮数安排不得携带隐含库存目标'); }
    else {
      const target = value.target, source = C.sources[value.sourceId];
      if (!object(target)) invalid('须指定来源可产出的库存目标');
      if (target.kind === 'item') {
        shape(target, ['kind', 'id', 'quantity']);
        if (!identity(target.id) || !Object.hasOwn(source.items, target.id) || !integer(target.quantity, 1, C.maxQuantity))
          invalid('此来源不能达到该物资库存目标');
      } else {
        shape(target, ['kind', 'quantity']);
        if (target.kind !== 'stones' || source.stones <= 0 || !integer(target.quantity, 1, C.maxQuantity))
          invalid('此来源不能达到该灵石库存目标');
      }
    }
    return;
  }
  shape(value, ['kind', 'method', 'maxCycles', 'until', 'stoneBudget', 'stoneReserve']);
  if (value.kind !== 'cultivation' || value.method !== 'natural' && value.method !== 'assisted' ||
      !integer(value.maxCycles, 1, C.maxBatch) || value.until !== 'xp-cap' && value.until !== 'cycles' ||
      !integer(value.stoneBudget) || !integer(value.stoneReserve)) invalid('修炼安排须有1至50个周期、明确目标、累计灵石预算与保留线');
}
export function validateActivityMutation(value: unknown): asserts value is ActivityMutation {
  shape(value, ['commandId', 'runId', 'expectedRevision', 'expectedActivityId', 'expectedActivityRevision', 'ownerId']);
  if (!identity(value.commandId) || !identity(value.runId) || !identity(value.ownerId) || !integer(value.expectedRevision) ||
      !(value.expectedActivityId === null ? value.expectedActivityRevision === null :
        identity(value.expectedActivityId, 64) && integer(value.expectedActivityRevision))) invalid('活动控制指令身份无效');
}
export function validateActivityTick(value: unknown): asserts value is ActivityTick {
  shape(value, ['commandId', 'runId', 'expectedRevision', 'activityId', 'expectedActivityRevision', 'ownerId', 'generation']);
  if (!identity(value.commandId) || !identity(value.runId) || !identity(value.activityId, 64) || !identity(value.ownerId) ||
      !integer(value.expectedRevision) || !integer(value.expectedActivityRevision) || !integer(value.generation)) invalid('周期结算指令身份无效');
}
/** Exact schema and identity checks; this is not a substitute for the repository transaction guard. */
export function validateActivity(value: unknown, game?: Game): asserts value is Activity {
  assertActivityRules(value,game);
  const sourceVersion = object(value) && value.version === 2;
  const craftVersion = object(value) && value.version === 3, forgeVersion = object(value) && value.version === 4;
  const productionVersion = craftVersion || forgeVersion;
  const preparationVersion = object(value) && value.version === 5;
  const adventureVersion = object(value) && value.version === 6;
  const milestoneVersion = object(value) && value.version === 7;
  shape(value, ['rulesVersion', 'format', 'version', 'id', 'revision', 'generation', 'ownerId', 'runId', 'realm', 'gameRevision', 'plan',
    'cycleMs', 'completedCycles', 'spentStones', 'gainedXp', 'spentMonths', 'status', 'stopReason', 'nextCommand', 'startedAt', 'dueAt',
    ...(sourceVersion ? ['gainedItems', 'gainedStones'] : []),
    ...(productionVersion ? ['spentItems', 'gainedItems', 'forgedRelics'] : []), ...(forgeVersion ? ['relicBefore'] : []),
    ...(preparationVersion ? ['spentItems', 'gainedItems', 'gainedStones', 'restoredHp', 'restoredMp', 'learnedSkills', 'studiedManuals',
      'startingHp', 'startingMp', 'maxHp', 'maxMp', 'schoolBefore', 'loadoutBefore', 'learnedBefore', 'manualsBefore', 'relicsBefore'] : []),
    ...(adventureVersion ? ['originGame', 'decisionGame', 'encountersStarted', 'battleTurns', 'victories', 'defeats', 'retreats', 'moves',
      'spentMp', 'spentItems', 'gainedItems', 'gainedStones', 'hpChange', 'mpChange'] : []),
    ...(milestoneVersion ? ['originGame', 'outcomeGame', 'spentItems', 'gainedItems', 'gainedStones', 'hpChange', 'mpChange', 'xpChange'] : [])]);
  validateActivityPlan(value.plan);
  if (value.rulesVersion !== CURRENT_RULES_VERSION || value.format !== 'chenyuan-activity' || (sourceVersion ? value.plan.kind !== 'source' : craftVersion ? value.plan.kind !== 'craft' :
      forgeVersion ? value.plan.kind !== 'forge' : preparationVersion ? !isPreparationPlan(value.plan) : adventureVersion ? !isAdventurePlan(value.plan) : milestoneVersion ? !isMilestonePlan(value.plan) :
        value.version !== 1 || value.plan.kind !== 'cultivation') || !identity(value.id, 64) ||
      !identity(value.ownerId) || !identity(value.runId) || !integer(value.revision) || !integer(value.generation) ||
      value.generation > value.revision || !integer(value.gameRevision) || typeof value.realm !== 'string' ||
      !Object.hasOwn(CULTIVATION_CYCLE_MS, value.realm) ||
      value.status !== 'running' && value.status !== 'paused' && value.status !== 'stopped') invalid();
  const realm = value.realm as Activity['realm'];
  if (!integer(value.completedCycles, 0, value.plan.maxCycles) ||
      !integer(value.completedCycles + value.generation) || value.revision < value.completedCycles + value.generation ||
      !integer(value.gainedXp, 0, C.realms[realm].xpCap)) invalid('活动累计成果或版本无效');
  let unitStones = 0, cycleBudgetAvailable = true;
  if (milestoneVersion) {
    cycleBudgetAvailable = validateMilestoneTotals(value as unknown as MilestoneActivity);
  } else if (adventureVersion) {
    cycleBudgetAvailable = validateAdventureTotals(value as unknown as AdventureActivity);
  } else if (preparationVersion) {
    cycleBudgetAvailable = validatePreparationTotals(value as unknown as PreparationActivity);
  } else if (value.plan.kind === 'cultivation') {
    const plan = value.plan;
    unitStones = plan.method === 'assisted' ? C.assistedCosts[realm] : C.cultivation.natural.stones;
    const largestCycleGain = Math.floor(C.realms[realm].baseYield * (125 + C.cultivation[plan.method].bonus) / 100);
    if (value.cycleMs !== CULTIVATION_CYCLE_MS[realm] || !integer(value.spentStones, 0, plan.stoneBudget) ||
        value.spentStones !== value.completedCycles * unitStones || !integer(value.spentMonths) ||
        value.spentMonths !== value.completedCycles * C.cultivation[plan.method].months ||
        value.gainedXp > value.completedCycles * largestCycleGain ||
        (value.completedCycles === 0 ? value.gainedXp !== 0 : value.gainedXp < value.completedCycles)) invalid('活动累计成果或预算无效');
    cycleBudgetAvailable = value.spentStones + unitStones <= plan.stoneBudget;
  } else if (value.plan.kind === 'source') {
    const plan = value.plan, source = C.sources[plan.sourceId], completed = value.completedCycles;
    const expectedItems = completed === 0 ? {} : Object.fromEntries(Object.entries(source.items).map(([id, count]) => [id, count * completed]));
    if (C.rank(realm) < C.rank(source.min) || value.cycleMs !== source.months * 30_000 || value.cycleMs > 180_000 ||
        value.spentStones !== 0 || !integer(value.spentMonths, 0, plan.monthBudget) ||
        value.spentMonths !== value.completedCycles * source.months ||
        !integer(value.gainedStones) || value.gainedStones !== value.completedCycles * source.stones ||
        !object(value.gainedItems) || ![Object.prototype, null].includes(Object.getPrototypeOf(value.gainedItems)) ||
        canonicalFingerprint(value.gainedItems) !== canonicalFingerprint(expectedItems) ||
        value.gainedXp > value.completedCycles * source.xp) invalid('来源活动累计物资、灵石或月预算无效');
    cycleBudgetAvailable = value.spentMonths + source.months <= plan.monthBudget;
  } else if (value.plan.kind === 'craft' || value.plan.kind === 'forge') {
    const plan = value.plan, completed = value.completedCycles;
    const recipe = plan.kind === 'craft' ? C.recipes[plan.recipeId] : null;
    const unit = recipe ?? C.relics[(plan as ForgePlan).relicId];
    const unitMonths = recipe?.months ?? C.actionDurations.forge;
    const expectedSpent = completed ? scaledItems(unit.inputs, completed) : {};
    const expectedGained = recipe && completed ? { [recipe.output]: completed } : {};
    const expectedRelics = plan.kind === 'forge' && completed ? [plan.relicId] : [];
    if (C.rank(realm) < C.rank(recipe?.min ?? 'golden') || value.cycleMs !== unitMonths * 30_000 ||
        value.gainedXp !== 0 || !integer(value.spentStones, 0, plan.stoneBudget) ||
        value.spentStones !== completed * unit.stones || !integer(value.spentMonths, 0, plan.monthBudget) ||
        value.spentMonths !== completed * unitMonths || !plainRecord(value.spentItems) || !plainRecord(value.gainedItems) ||
        canonicalFingerprint(value.spentItems) !== canonicalFingerprint(expectedSpent) ||
        canonicalFingerprint(value.gainedItems) !== canonicalFingerprint(expectedGained) ||
        !Array.isArray(value.forgedRelics) || Object.getPrototypeOf(value.forgedRelics) !== Array.prototype ||
        Object.keys(value.forgedRelics).length !== expectedRelics.length ||
        canonicalFingerprint(value.forgedRelics) !== canonicalFingerprint(expectedRelics) ||
        forgeVersion && value.relicBefore !== null && (!identity(value.relicBefore) || !Object.hasOwn(C.relics, value.relicBefore)) ||
        forgeVersion && value.relicBefore === (plan as ForgePlan).relicId)
      invalid('生产活动累计投入、成品、法宝或预算无效');
    cycleBudgetAvailable = value.spentStones + unit.stones <= plan.stoneBudget && value.spentMonths + unitMonths <= plan.monthBudget;
  } else invalid('活动类型与版本不一致');
  if (value.stopReason !== null) failure(value.stopReason);
  if (value.status === 'running') {
    if (value.stopReason !== null || value.completedCycles >= value.plan.maxCycles ||
        !cycleBudgetAvailable || !integer(value.startedAt) ||
        !integer(value.dueAt) || value.dueAt - value.startedAt !== value.cycleMs) invalid('进行中活动的周期无效');
    try { validateCommand(value.nextCommand); } catch { invalid('下一周期指令无效'); }
    const command = value.nextCommand;
    const expected = cycleCommand(value as unknown as Activity);
    if (canonicalFingerprint(command) !== canonicalFingerprint(expected)) invalid('下一周期指令与活动身份不一致');
  } else if (value.nextCommand !== null || value.startedAt !== null || value.dueAt !== null ||
      value.status === 'paused' && (value.stopReason !== null && !(adventureVersion && ADVENTURE_PAUSE_CODES.some(code => code === (value.stopReason as RuleFailure).code)) || value.completedCycles >= value.plan.maxCycles) ||
      value.status === 'stopped' && value.stopReason === null) invalid('暂停或停止状态与周期不一致');
  if (game) {
    validateGame(game);
    if (value.runId !== game.core.runId || value.gameRevision > game.core.revision ||
        value.status !== 'stopped' && (value.realm !== game.core.player.realm || value.gameRevision !== game.core.revision)) invalid('活动与当前人生或进度不一致');
    const invalidatedByLaterCommand = value.status === 'stopped' && value.stopReason?.code === 'STATE_CHANGED';
    if (forgeVersion && !invalidatedByLaterCommand && value.gameRevision === game.core.revision && (game.loadout.relic !== value.relicBefore ||
        game.ownedRelics.includes((value.plan as ForgePlan).relicId) !== (value.completedCycles === 1)))
      invalid('炼器安排与当前法宝或配装不一致');
    if (preparationVersion && !invalidatedByLaterCommand && value.gameRevision === game.core.revision)
      validatePreparationSnapshot(game, value as unknown as PreparationActivity);
    if (adventureVersion && !invalidatedByLaterCommand && value.gameRevision === game.core.revision &&
        canonicalFingerprint((value as unknown as AdventureActivity).decisionGame) !== canonicalFingerprint(game)) invalid('当前Game与已保存决定快照不一致');
    if (milestoneVersion && !invalidatedByLaterCommand && value.gameRevision === game.core.revision) {
      const milestone = value as unknown as MilestoneActivity;
      if (canonicalFingerprint(milestone.outcomeGame ?? milestone.originGame) !== canonicalFingerprint(game))
        invalid('当前Game与有限安排的正式保存快照不一致');
    }
  }
}

function scaledItems(items: Record<string, number>, count: number): Record<string, number> {
  return Object.fromEntries(Object.entries(items).map(([id, quantity]) => [id, quantity * count]));
}

/** The next cycle must be affordable and legal before any timer or command is accepted. */
export function activityStop(game: Game, activity: Activity): RuleFailure | null {
  validateGame(game); validateActivity(activity);
  if (activity.runId !== game.core.runId) return { code: 'RUN_MISMATCH', message: '已经切换人生，此安排不再执行' };
  if (activity.version === 7) return milestoneStop(game, activity);
  if (activity.realm !== game.core.player.realm || activity.gameRevision !== game.core.revision)
    return { code: 'STATE_CHANGED', message: '修行进度已变化，请重新安排活动' };
  if (game.status !== 'active') return { code: 'ENDED', message: '此生已经结束，活动停止' };
  if (activity.version === 6) {
    if (canonicalFingerprint(game) !== canonicalFingerprint(activity.decisionGame)) return { code: 'STATE_CHANGED', message: '当前进度与原战策决定已变化，请重新安排' };
    return adventureDecision(activity).failure;
  }
  if (activity.version === 5) return preparationStop(game, activity);
  if (activity.version === 3 || activity.version === 4) {
    const plan = activity.plan, craft = plan.kind === 'craft';
    if (activity.version === 4 && game.loadout.relic !== activity.relicBefore)
      return { code: 'STATE_CHANGED', message: '当前法宝配装已变化，请重新安排炼器' };
    if (plan.kind === 'forge' && game.ownedRelics.includes(plan.relicId))
      return { code: activity.completedCycles ? 'CYCLES_COMPLETE' : 'ALREADY_OWNED', message: activity.completedCycles ? '法宝已炼成，请自行选择是否装备' : '已拥有此法宝，不再重复投入炼制' };
    if (plan.kind === 'craft' && plan.targetQuantity !== null && game.core.inventory[C.recipes[plan.recipeId].output] >= plan.targetQuantity)
      return { code: 'TARGET_MET', message: '成品库存已达到安排目标，丹火已收' };
    if (activity.completedCycles >= plan.maxCycles)
      return { code: 'CYCLES_COMPLETE', message: craft ? '已完成安排的炼丹炉数' : '已完成本次炼器' };
    const cost = costsForAction(game, cycleCommand(activity));
    if (activity.spentStones + cost.stones > plan.stoneBudget || activity.spentMonths + cost.months > plan.monthBudget)
      return { code: 'ACTIVITY_BUDGET', message: '累计灵石或游戏月预算不足以支持下一次生产' };
    if (game.core.player.stones < cost.stones) return { code: 'INSUFFICIENT_STONES', message: '灵石不足，炉火停止' };
    if (game.core.player.stones - cost.stones < plan.stoneReserve)
      return { code: 'ACTIVITY_RESERVE', message: '下一次投入会低于灵石保留线，炉火停止' };
    if (remainingMonths(game) - cost.months < plan.remainingMonthsReserve)
      return { code: 'ACTIVITY_RESERVE', message: '下一次生产会低于余寿保留线，炉火停止' };
    for (const [id, amount] of Object.entries(cost.items)) {
      if (game.core.inventory[id] < amount) return { code: 'INSUFFICIENT_ITEM', message: `${C.items[id].name}不足，炉火停止` };
      if (game.core.inventory[id] - amount < (plan.itemReserves[id] ?? 0))
        return { code: 'ACTIVITY_RESERVE', message: `下一次投入会低于${C.items[id].name}保留线，炉火停止` };
    }
    const preview = previewResolution(game, cycleCommand(activity));
    if (!preview.ok) return { code: preview.error.code, message: preview.error.message };
    if (plan.kind === 'craft' ? preview.value.nextState.core.inventory[C.recipes[plan.recipeId].output] <= game.core.inventory[C.recipes[plan.recipeId].output] :
      !preview.value.nextState.ownedRelics.includes(plan.relicId))
      return { code: 'NO_CHANGE', message: '本次生产不会获得成品，炉火停止' };
    return null;
  }
  if (activity.version === 2) {
    const plan = activity.plan, source = C.sources[plan.sourceId], target = plan.target;
    if (target && (target.kind === 'stones' ? game.core.player.stones : game.core.inventory[target.id]) >= target.quantity)
      return { code: 'TARGET_MET', message: '当前库存已达到安排目标，取材停止' };
    if (activity.completedCycles >= plan.maxCycles) return { code: 'CYCLES_COMPLETE', message: '已完成安排的取材轮数' };
    if (activity.spentMonths + source.months > plan.monthBudget)
      return { code: 'ACTIVITY_BUDGET', message: '累计游戏月预算不足以支持下一轮' };
    if (remainingMonths(game) - source.months < plan.remainingMonthsReserve)
      return { code: 'ACTIVITY_RESERVE', message: '下一轮会低于余寿保留线，取材停止' };
    const preview = previewResolution(game, cycleCommand(activity));
    if (!preview.ok) return { code: preview.error.code, message: preview.error.message };
    const delta = preview.value.result.delta;
    if (delta.xp <= 0 && delta.stones <= 0 && !Object.values(delta.inventory).some(count => count > 0))
      return { code: 'NO_CHANGE', message: '本轮不会获得物资、灵石或修为，取材停止' };
    return null;
  }
  if (game.core.player.xp >= C.realms[activity.realm].xpCap) return { code: 'XP_CAP', message: '修为已圆满，停止修炼并筹备突破' };
  if (activity.completedCycles >= activity.plan.maxCycles) return { code: 'CYCLES_COMPLETE', message: '已完成安排的修炼周期' };
  const cost = costsForAction(game, { type: 'CULTIVATE', method: activity.plan.method, count: 1 });
  if (activity.spentStones + cost.stones > activity.plan.stoneBudget)
    return { code: 'ACTIVITY_BUDGET', message: '累计灵石预算不足以支持下一周期' };
  if (game.core.player.stones < cost.stones) return { code: 'INSUFFICIENT_STONES', message: '灵石不足，修炼停止' };
  if (game.core.player.stones - cost.stones < activity.plan.stoneReserve)
    return { code: 'ACTIVITY_RESERVE', message: '下一周期会低于灵石保留线，修炼停止' };
  const preview = previewResolution(game, { type: 'CULTIVATE', method: activity.plan.method, count: 1 });
  if (!preview.ok) return { code: preview.error.code, message: preview.error.message };
  if (preview.value.result.delta.xp <= 0) return { code: 'NO_CHANGE', message: '本周期不会获得修为，修炼停止' };
  return null;
}
function requireEligible(game: Game, activity: Activity): void {
  const reason = activityStop(game, activity);
  if (reason) throw new RuleError(reason.code, reason.message);
}
export function createActivity(game: Game, plan: ActivityPlan, options: ActivityStartOptions): Activity {
  validateGame(game); validateActivityPlan(plan);
  shape(options, ['id', 'ownerId', 'commandId', 'now']);
  if (!identity(options.id, 64) || !identity(options.ownerId) || !identity(options.commandId)) invalid('活动起始身份无效');
  if (isAdventurePlan(plan)) validateAdventureStart(game, plan);
  if (isMilestonePlan(plan)) validateMilestoneStart(game, plan);
  const realm = game.core.player.realm;
  if (!Object.hasOwn(CULTIVATION_CYCLE_MS, realm)) throw new RuleError('ENDED', '飞升后不再安排修炼');
  if (plan.kind === 'source' && C.rank(realm) < C.rank(C.sources[plan.sourceId].min))
    throw new RuleError('REALM_REQUIRED', `此来源需要${C.realms[C.sources[plan.sourceId].min].name}境界`);
  const productionMin = plan.kind === 'craft' ? C.recipes[plan.recipeId].min : plan.kind === 'forge' ? 'golden' : null;
  if (productionMin && C.rank(realm) < C.rank(productionMin))
    throw new RuleError('REALM_REQUIRED', `此生产需要${C.realms[productionMin].name}境界`);
  if (plan.kind === 'forge' && game.ownedRelics.includes(plan.relicId))
    throw new RuleError('ALREADY_OWNED', '已拥有此法宝，不再重复投入炼制');
  if (plan.kind === 'learn') {
    if (plan.skills.some(id => game.learned.includes(id))) throw new RuleError('ALREADY_LEARNED', '研习清单中已有掌握的功法，不会重复收费');
    if (plan.skills.some(id => C.rank(C.skills[id].min) > C.rank(realm))) throw new RuleError('REALM_REQUIRED', '研习清单中有尚未达到境界的功法');
  }
  if (plan.kind === 'study') {
    if (game.core.learnedSkills.includes(C.swordManual.id)) throw new RuleError('ALREADY_LEARNED', '这份剑简已研读，不会重复收费');
    if (C.rank(realm) < C.rank(C.swordManual.min)) throw new RuleError('REALM_REQUIRED', '筑基后方可研读这份剑简');
  }
  const base: ActivityBase = { rulesVersion:CURRENT_RULES_VERSION, format: 'chenyuan-activity', id: options.id, revision: 0, generation: 0,
    ownerId: options.ownerId, runId: game.core.runId, realm: realm as Activity['realm'], gameRevision: game.core.revision,
    cycleMs: plan.kind === 'source' ? C.sources[plan.sourceId].months * 30_000 : plan.kind === 'craft' ? C.recipes[plan.recipeId].months * 30_000 :
      plan.kind === 'forge' ? C.actionDurations.forge * 30_000 : isMilestonePlan(plan) ? MILESTONE_CYCLE_MS[plan.action.type] : isAdventurePlan(plan) ? adventureCycleMs(plan, game) : isPreparationPlan(plan) ? PREPARATION_CYCLE_MS[plan.kind] :
        CULTIVATION_CYCLE_MS[realm as Activity['realm']], completedCycles: 0, spentStones: 0,
    gainedXp: 0, spentMonths: 0, status: 'paused', stopReason: null, nextCommand: null, startedAt: null, dueAt: null };
  const activity: Activity = plan.kind === 'source' ? { ...base, version: 2, plan: structuredClone(plan), gainedItems: {}, gainedStones: 0 } :
    plan.kind === 'craft' ? { ...base, version: 3, plan: structuredClone(plan), spentItems: {}, gainedItems: {}, forgedRelics: [] } :
      plan.kind === 'forge' ? { ...base, version: 4, plan: structuredClone(plan), spentItems: {}, gainedItems: {}, forgedRelics: [], relicBefore: game.loadout.relic } :
        isMilestonePlan(plan) ? { ...base, version: 7, plan: structuredClone(plan), ...milestoneMetadata(game) } :
        isAdventurePlan(plan) ? { ...base, version: 6, plan: structuredClone(plan), ...adventureMetadata(game) } :
          isPreparationPlan(plan) ? { ...base, version: 5, plan: structuredClone(plan), ...preparationSnapshot(game), ...emptyPreparationTotals() } :
          { ...base, version: 1, plan: { ...plan } };
  at(options.now, activity.cycleMs);
  requireEligible(game, activity);
  return resetCycle({ ...activity, status: 'running' }, options.now);
}
export function pauseActivity(activity: Activity): Activity {
  validateActivity(activity);
  if (activity.status !== 'running') throw new RuleError('ACTIVITY_NOT_RUNNING', '当前没有正在执行的周期');
  const next: Activity = { ...structuredClone(activity), revision: increment(activity.revision), generation: increment(activity.generation),
    status: 'paused', nextCommand: null, startedAt: null, dueAt: null };
  validateActivity(next);
  return next;
}
export function resumeActivity(game: Game, activity: Activity, options: ActivityResumeOptions): Activity {
  validateGame(game); validateActivity(activity);
  shape(options, ['ownerId', 'commandId', 'now']);
  if (!identity(options.ownerId) || !identity(options.commandId)) invalid('活动继续身份无效');
  if (activity.status === 'stopped') throw new RuleError('ACTIVITY_STOPPED', '此安排已经停止，请按当前条件重新安排');
  at(options.now, activity.cycleMs);
  requireEligible(game, activity);
  return resetCycle({ ...structuredClone(activity), ownerId: options.ownerId, status: 'running',
    stopReason: null, revision: increment(activity.revision), generation: increment(activity.generation) }, options.now);
}
export function completeActivity(gameAfter: Game, activity: Activity, result: ActionResult, options: ActivityCompleteOptions): Activity {
  validateGame(gameAfter); validateActivity(activity);
  shape(options, ['commandId', 'now']);
  at(options.now, 0);
  if (activity.status !== 'running' || !activity.nextCommand || activity.dueAt === null)
    throw new RuleError('ACTIVITY_NOT_RUNNING', '当前没有可结算的修炼周期');
  if (options.commandId !== activity.nextCommand.commandId) throw new RuleError('ACTIVITY_STALE', '修炼周期已经变化，旧指令未结算');
  if (options.now < activity.dueAt) throw new RuleError('ACTIVITY_NOT_DUE', '本周期尚未结束');
  const command = activity.nextCommand;
  try { validateCommandReceipt({ format: 'chenyuan-receipt', version: 1, command,
    fingerprint: canonicalFingerprint(command), result }, gameAfter); } catch { invalid('周期回执与正式指令不一致'); }
  if (activity.version === 3 || activity.version === 4) return completeProduction(gameAfter, activity, result, options);
  if (activity.version === 5) return completePreparation(gameAfter, activity, result, options);
  if (activity.version === 6) return completeAdventure(gameAfter, activity, result, options);
  if (activity.version === 7) return completeMilestone(gameAfter, activity, result);
  const cost = costsForAction(gameAfter, command), delta = result.delta;
  const beforeXp = gameAfter.core.player.xp - delta.xp;
  const source = activity.version === 2 ? C.sources[activity.plan.sourceId] : null;
  const yieldXp = source ? source.xp : activity.version === 1
    ? Math.floor(stats(gameAfter).baseYield * (100 + C.cultivation[activity.plan.method].bonus + stats(gameAfter).cultivationBonus) / 100) : 0;
  const expectedItems = source?.items ?? {}, expectedStones = source ? source.stones : -cost.stones;
  const target = activity.version === 2 ? activity.plan.target : null;
  const targetAlreadyMet = target && (target.kind === 'stones'
    ? gameAfter.core.player.stones - delta.stones
    : gameAfter.core.inventory[target.id] - (delta.inventory[target.id] ?? 0)) >= target.quantity;
  if (gameAfter.core.runId !== activity.runId || gameAfter.core.player.realm !== activity.realm ||
      gameAfter.core.revision !== activity.gameRevision + 1 || gameAfter.status !== 'active' ||
      gameAfter.core.mode !== 'idle' || gameAfter.core.world.location !== (source?.location ?? 'cave') || result.type !== (source ? 'SOURCE' : 'CULTIVATE') ||
      result.requestedSteps !== 1 || result.executedSteps !== 1 || result.stopReason !== null ||
      canonicalFingerprint(result.costs) !== canonicalFingerprint(cost) || delta.stones !== expectedStones ||
      delta.months !== cost.months || delta.hp !== 0 || delta.mp !== 0 || delta.wins !== 0 ||
      canonicalFingerprint(delta.inventory) !== canonicalFingerprint(expectedItems) ||
      beforeXp < 0 || beforeXp > C.realms[activity.realm].xpCap || !source && delta.xp <= 0 ||
      delta.xp !== Math.min(yieldXp, C.realms[activity.realm].xpCap - beforeXp) ||
      targetAlreadyMet ||
      (activity.version === 1 ? activity.spentStones + cost.stones > activity.plan.stoneBudget ||
        gameAfter.core.player.stones < activity.plan.stoneReserve :
        activity.spentMonths + cost.months > activity.plan.monthBudget || remainingMonths(gameAfter) < activity.plan.remainingMonthsReserve))
    invalid('周期回执的消耗、成果或进度无效');
  const next: Activity = { ...structuredClone(activity), revision: increment(activity.revision), gameRevision: gameAfter.core.revision,
    completedCycles: activity.completedCycles + 1, spentStones: activity.spentStones + result.costs.stones,
    gainedXp: activity.gainedXp + delta.xp, spentMonths: activity.spentMonths + result.costs.months,
    ...(activity.version === 2 ? {
      gainedStones: activity.gainedStones + delta.stones,
      gainedItems: Object.fromEntries(Object.keys(expectedItems).map(id => [id, (activity.gainedItems[id] ?? 0) + delta.inventory[id]])),
    } : {}),
    status: 'paused', nextCommand: null, startedAt: null, dueAt: null };
  // The just-completed cycle may have reached a limit; inspect it before validating a new running cycle.
  const reason = activityStopAfterCompletion(gameAfter, next);
  if (reason) return stop(next, reason);
  if (options.now > Number.MAX_SAFE_INTEGER - activity.cycleMs)
    return stop(next, { code: 'ACTIVITY_TIME_LIMIT', message: '无法安全安排下一周期，已保存本次活动成果' });
  return resetCycle({ ...next, status: 'running' }, options.now);
}

function completeMilestone(gameAfter: Game, activity: MilestoneActivity, result: ActionResult): MilestoneActivity {
  const next: MilestoneActivity = { ...structuredClone(activity), ...completeMilestoneMetadata(gameAfter, activity, result),
    revision: increment(activity.revision), gameRevision: gameAfter.core.revision, completedCycles: 1,
    spentStones: result.costs.stones, spentMonths: result.costs.months, gainedXp: Math.max(0, result.delta.xp),
    status: 'stopped', stopReason: milestoneCompletionReason(activity.plan.action), nextCommand: null, startedAt: null, dueAt: null };
  validateActivity(next, gameAfter); return next;
}

function completeAdventure(gameAfter: Game, activity: AdventureActivity, result: ActionResult, options: ActivityCompleteOptions): Activity {
  validateAdventureResult(gameAfter, activity, result);
  const next: AdventureActivity = { ...structuredClone(activity), ...completeAdventureMetadata(gameAfter, activity, result),
    revision: increment(activity.revision), gameRevision: gameAfter.core.revision, completedCycles: activity.completedCycles + 1,
    spentStones: activity.spentStones + result.costs.stones, spentMonths: activity.spentMonths + result.costs.months,
    gainedXp: activity.gainedXp + result.delta.xp, cycleMs: adventureCycleMs(activity.plan, gameAfter),
    status: 'paused', stopReason: null, nextCommand: null, startedAt: null, dueAt: null };
  const decision = adventureDecision(next);
  if (decision.failure) {
    const strategy = next.plan.kind === 'encounter' ? next.plan.strategy : next.plan.kind === 'battle' && next.plan.mode === 'auto' ? next.plan.strategy : null;
    if (strategy?.riskMode === 'pause' && ADVENTURE_PAUSE_CODES.some(code => code === decision.failure!.code)) {
      const paused: AdventureActivity = { ...next, status: 'paused', stopReason: decision.failure };
      validateActivity(paused, gameAfter); return paused;
    }
    return stop(next, decision.failure);
  }
  if (options.now > Number.MAX_SAFE_INTEGER - next.cycleMs) return stop(next, { code: 'ACTIVITY_TIME_LIMIT', message: '无法安全安排下一动作，已保存本次真实成果' });
  return resetCycle({ ...next, status: 'running' }, options.now);
}

function completePreparation(gameAfter: Game, activity: PreparationActivity, result: ActionResult, options: ActivityCompleteOptions): Activity {
  validatePreparationResult(gameAfter, activity, result);
  const d = result.delta, plan = activity.plan;
  const merge = (old: Record<string, number>, items: Record<string, number>) => {
    const next = { ...old }; for (const [id, amount] of Object.entries(items)) next[id] = (next[id] ?? 0) + amount; return next;
  };
  const next: PreparationActivity = { ...structuredClone(activity), revision: increment(activity.revision), gameRevision: gameAfter.core.revision,
    completedCycles: activity.completedCycles + 1, spentStones: activity.spentStones + result.costs.stones,
    spentMonths: activity.spentMonths + result.costs.months, spentItems: merge(activity.spentItems, result.costs.items),
    gainedItems: merge(activity.gainedItems, Object.fromEntries(Object.entries(d.inventory).filter(([, n]) => n > 0))),
    gainedStones: activity.gainedStones + Math.max(0, d.stones), restoredHp: activity.restoredHp + d.hp, restoredMp: activity.restoredMp + d.mp,
    learnedSkills: plan.kind === 'learn' ? [...activity.learnedSkills, plan.skills[activity.completedCycles]] : [...activity.learnedSkills],
    studiedManuals: plan.kind === 'study' ? [...activity.studiedManuals, 'jinghong'] : [...activity.studiedManuals],
    status: 'paused', nextCommand: null, startedAt: null, dueAt: null };
  const reason = activityStopAfterCompletion(gameAfter, next);
  if (reason) return stop(next, reason);
  if (options.now > Number.MAX_SAFE_INTEGER - activity.cycleMs)
    return stop(next, { code: 'ACTIVITY_TIME_LIMIT', message: '无法安全安排下一周期，已保存本次实际成果' });
  return resetCycle({ ...next, status: 'running' }, options.now);
}

function completeProduction(gameAfter: Game, activity: CraftActivity | ForgeActivity, result: ActionResult,
  options: ActivityCompleteOptions): Activity {
  const command = activity.nextCommand!, plan = activity.plan;
  const cost = costsForAction(gameAfter, command), delta = result.delta;
  const recipe = plan.kind === 'craft' ? C.recipes[plan.recipeId] : null;
  const expectedGained = recipe ? { [recipe.output]: 1 } : {};
  const expectedDelta = scaledItems(cost.items, -1);
  for (const [id, amount] of Object.entries(expectedGained)) expectedDelta[id] = (expectedDelta[id] ?? 0) + amount;
  for (const id of Object.keys(expectedDelta)) if (expectedDelta[id] === 0) delete expectedDelta[id];
  const targetAlreadyMet = recipe && plan.kind === 'craft' && plan.targetQuantity !== null &&
    gameAfter.core.inventory[recipe.output] - (delta.inventory[recipe.output] ?? 0) >= plan.targetQuantity;
  if (gameAfter.core.runId !== activity.runId || gameAfter.core.player.realm !== activity.realm ||
      gameAfter.core.revision !== activity.gameRevision + 1 || gameAfter.status !== 'active' ||
      gameAfter.core.mode !== 'idle' || gameAfter.core.world.location !== 'cave' || gameAfter.battle || gameAfter.trial ||
      result.type !== (recipe ? 'CRAFT' : 'FORGE') || result.requestedSteps !== 1 || result.executedSteps !== 1 || result.stopReason !== null ||
      canonicalFingerprint(result.costs) !== canonicalFingerprint(cost) || delta.stones !== -cost.stones ||
      delta.months !== cost.months || delta.xp !== 0 || delta.hp !== 0 || delta.mp !== 0 || delta.wins !== 0 ||
      canonicalFingerprint(delta.inventory) !== canonicalFingerprint(expectedDelta) || targetAlreadyMet ||
      activity.spentStones + cost.stones > plan.stoneBudget || activity.spentMonths + cost.months > plan.monthBudget ||
      gameAfter.core.player.stones < plan.stoneReserve || remainingMonths(gameAfter) < plan.remainingMonthsReserve ||
      Object.keys(cost.items).some(id => gameAfter.core.inventory[id] < (plan.itemReserves[id] ?? 0)) ||
      activity.version === 4 && (!gameAfter.ownedRelics.includes(activity.plan.relicId) || gameAfter.loadout.relic !== activity.relicBefore))
    invalid('生产回执的实际投入、成品、法宝或配装无效');
  // Reconstruct only the fields this formal action can change, then check the real single-cycle rule.
  // This rejects impossible pre-stock/capacity or lifespan instead of trusting a positive output delta.
  const before = structuredClone(gameAfter);
  before.core.revision--;
  before.core.player.stones -= delta.stones;
  before.core.world.elapsedMonths -= delta.months;
  for (const [id, amount] of Object.entries(delta.inventory)) before.core.inventory[id] -= amount;
  if (activity.version === 4) before.ownedRelics = before.ownedRelics.filter(id => id !== activity.plan.relicId);
  try {
    validateGame(before);
    if (activityStop(before, activity) !== null || canonicalFingerprint(resolve(before, command).result) !== canonicalFingerprint(result)) invalid();
  } catch { invalid('生产前后库存或正式回执无法对应'); }
  const next: Activity = { ...structuredClone(activity), revision: increment(activity.revision), gameRevision: gameAfter.core.revision,
    completedCycles: activity.completedCycles + 1, spentStones: activity.spentStones + cost.stones,
    spentMonths: activity.spentMonths + cost.months, spentItems: scaledItems(cost.items, activity.completedCycles + 1),
    gainedItems: scaledItems(expectedGained, activity.completedCycles + 1),
    forgedRelics: activity.version === 4 ? [activity.plan.relicId] : [],
    status: 'paused', nextCommand: null, startedAt: null, dueAt: null };
  const reason = activityStopAfterCompletion(gameAfter, next);
  if (reason) return stop(next, reason);
  if (options.now > Number.MAX_SAFE_INTEGER - activity.cycleMs)
    return stop(next, { code: 'ACTIVITY_TIME_LIMIT', message: '无法安全安排下一炉，已保存本次生产成果' });
  return resetCycle({ ...next, status: 'running' }, options.now);
}
function activityStopAfterCompletion(game: Game, activity: Activity): RuleFailure | null {
  // A temporary stopped state permits the completed-count boundary while keeping the same public schema checks.
  const boundary: Activity = { ...activity, status: 'stopped', stopReason: { code: 'CHECKING', message: '核对下一周期' } };
  return activityStop(game, boundary);
}

/** Read-only projection through the same single-cycle rules, budgets and automatic stops as execution. */
export function previewActivity(game: Game, plan: ActivityPlan): ActivityPreview {
  validateGame(game);
  const cycleMs = plan?.kind === 'source' && Object.hasOwn(C.sources, plan.sourceId)
    ? C.sources[plan.sourceId].months * 30_000 : plan?.kind === 'craft' && Object.hasOwn(C.recipes, plan.recipeId)
      ? C.recipes[plan.recipeId].months * 30_000 : plan?.kind === 'forge' && Object.hasOwn(C.relics, plan.relicId)
        ? C.actionDurations.forge * 30_000 : isMilestonePlan(plan) && plan.action && Object.hasOwn(MILESTONE_CYCLE_MS, plan.action.type) ? MILESTONE_CYCLE_MS[plan.action.type] : isAdventurePlan(plan) ? adventureCycleMs(plan, game) : isPreparationPlan(plan) ? PREPARATION_CYCLE_MS[plan.kind] : Object.hasOwn(CULTIVATION_CYCLE_MS, game.core.player.realm)
      ? CULTIVATION_CYCLE_MS[game.core.player.realm as Activity['realm']] : 0;
  try {
    let activity = createActivity(game, plan, { id: 'preview-activity', ownerId: 'preview-owner', commandId: 'preview-start', now: 0 });
    const initialAdventure = activity.version === 6 ? adventureDecision(activity) : null;
    let current = game;
    const limit = repeats(plan)?C.maxBatch:activity.version === 6 ? activity.plan.maxCycles : C.maxBatch;
    for (let i = 0; i < limit && activity.status === 'running'; i++) {
      const command = activity.nextCommand!;
      const resolution = resolve(current, command);
      activity = completeActivity(resolution.nextState, activity, resolution.result,
        { commandId: command.commandId, now: activity.dueAt! });
      current = resolution.nextState;
    }
    const truncated=repeats(plan)&&activity.status==='running';
    if (!truncated&&activity.status !== 'stopped' && !(activity.version === 6 && activity.status === 'paused' && activity.stopReason)) invalid('活动预览未达到安全停止边界');
    return { allowed: true, failure: null,...(repeats(plan)?{truncated}:{}), cycles: activity.completedCycles, xp: activity.gainedXp,
      stones: activity.spentStones, months: activity.spentMonths, stopReason: activity.stopReason, cycleMs: activity.cycleMs,
      items: activity.version !== 1 ? { ...activity.gainedItems } : {}, earnedStones: activity.version === 2 || activity.version === 5 || activity.version === 6 || activity.version === 7 ? activity.gainedStones : 0,
      spentItems: activity.version >= 3 ? { ...(activity as CraftActivity | ForgeActivity | PreparationActivity | AdventureActivity | MilestoneActivity).spentItems } : {},
      relics: activity.version === 3 || activity.version === 4 ? [...activity.forgedRelics] : [],
      hp: activity.version === 5 ? activity.restoredHp : activity.version === 7 ? activity.hpChange : 0,
      mp: activity.version === 5 ? activity.restoredMp : activity.version === 7 ? activity.mpChange : 0,
      skills: activity.version === 5 ? [...activity.learnedSkills] : [], manuals: activity.version === 5 ? [...activity.studiedManuals] : [],
      adventure: activity.version === 6 ? adventurePreview(activity, initialAdventure!) : null };
  } catch (error) {
    if (!(error instanceof RuleError)) throw error;
    return { allowed: false, failure: { code: error.code, message: error.message }, cycles: 0, xp: 0,
      stones: 0, months: 0, stopReason: null, cycleMs, items: {}, earnedStones: 0, spentItems: {}, relics: [], hp: 0, mp: 0, skills: [], manuals: [], adventure: null };
  }
}
