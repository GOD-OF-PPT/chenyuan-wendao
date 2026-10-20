import * as C from './content.ts';
import type { RealmId } from './content.ts';
import { costsForAction } from './costs.ts';
import { previewResolution, resolve, stats, validateCommand, validateGame } from './engine.ts';
import { RuleError } from './errors.ts';
import { canonicalFingerprint, validateCommandReceipt } from './receipts.ts';
import type { ActionResult, RuleFailure } from './contracts.ts';
import type { Command, Game } from './types.ts';

export interface ActivityPlan {
  kind: 'cultivation';
  method: 'natural' | 'assisted';
  maxCycles: number;
  until: 'xp-cap' | 'cycles';
  stoneBudget: number;
  stoneReserve: number;
}
export interface Activity {
  format: 'chenyuan-activity'; version: 1; id: string; revision: number; generation: number;
  ownerId: string; runId: string; realm: Exclude<RealmId, 'ascended'>; gameRevision: number;
  plan: ActivityPlan; cycleMs: number; completedCycles: number; spentStones: number;
  gainedXp: number; spentMonths: number; status: 'running' | 'paused' | 'stopped';
  stopReason: RuleFailure | null; nextCommand: Command | null;
  startedAt: number | null; dueAt: number | null;
}
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
  allowed: boolean; failure: RuleFailure | null; cycles: number; xp: number; stones: number;
  months: number; stopReason: RuleFailure | null; cycleMs: number;
}

/** Initial pacing only; these values have not passed long-term balance or player acceptance. */
export const CULTIVATION_CYCLE_MS = Object.freeze({
  mortal: 30_000, qi: 60_000, foundation: 90_000, golden: 120_000, nascent: 180_000, spirit: 240_000,
});
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const identity = (value: unknown, maximum = 100): value is string => typeof value === 'string' &&
  value.length <= maximum && value.trim().length > 0;
function invalid(message = '活动记录或指令无效，未执行修炼'): never { throw new RuleError('ACTIVITY_INVALID', message); }
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
  return { type: 'CULTIVATE', method: activity.plan.method, count: 1,
    commandId: `cycle:${activity.id}:${activity.generation}:${activity.completedCycles + 1}`,
    runId: activity.runId, expectedRevision: activity.gameRevision };
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
  shape(value, ['format', 'version', 'id', 'revision', 'generation', 'ownerId', 'runId', 'realm', 'gameRevision', 'plan',
    'cycleMs', 'completedCycles', 'spentStones', 'gainedXp', 'spentMonths', 'status', 'stopReason', 'nextCommand', 'startedAt', 'dueAt']);
  validateActivityPlan(value.plan);
  if (value.format !== 'chenyuan-activity' || value.version !== 1 || !identity(value.id, 64) ||
      !identity(value.ownerId) || !identity(value.runId) || !integer(value.revision) || !integer(value.generation) ||
      value.generation > value.revision || !integer(value.gameRevision) || typeof value.realm !== 'string' ||
      !Object.hasOwn(CULTIVATION_CYCLE_MS, value.realm) ||
      value.status !== 'running' && value.status !== 'paused' && value.status !== 'stopped') invalid();
  const realm = value.realm as Activity['realm'];
  const unitStones = value.plan.method === 'assisted' ? C.assistedCosts[realm] : C.cultivation.natural.stones;
  const largestCycleGain = Math.floor(C.realms[realm].baseYield * (125 + C.cultivation[value.plan.method].bonus) / 100);
  if (value.cycleMs !== CULTIVATION_CYCLE_MS[realm] || !integer(value.completedCycles, 0, value.plan.maxCycles) ||
      !integer(value.completedCycles + value.generation) || value.revision < value.completedCycles + value.generation ||
      !integer(value.spentStones, 0, value.plan.stoneBudget) || value.spentStones !== value.completedCycles * unitStones ||
      !integer(value.spentMonths) || value.spentMonths !== value.completedCycles * C.cultivation[value.plan.method].months ||
      !integer(value.gainedXp, 0, C.realms[realm].xpCap) ||
      value.gainedXp > value.completedCycles * largestCycleGain ||
      (value.completedCycles === 0 ? value.gainedXp !== 0 : value.gainedXp < value.completedCycles)) invalid('活动累计成果或预算无效');
  if (value.stopReason !== null) failure(value.stopReason);
  if (value.status === 'running') {
    if (value.stopReason !== null || value.completedCycles >= value.plan.maxCycles ||
        value.spentStones + unitStones > value.plan.stoneBudget || !integer(value.startedAt) ||
        !integer(value.dueAt) || value.dueAt - value.startedAt !== value.cycleMs) invalid('进行中活动的周期无效');
    try { validateCommand(value.nextCommand); } catch { invalid('下一周期指令无效'); }
    const command = value.nextCommand;
    const expected = cycleCommand(value as unknown as Activity);
    if (canonicalFingerprint(command) !== canonicalFingerprint(expected)) invalid('下一周期指令与活动身份不一致');
  } else if (value.nextCommand !== null || value.startedAt !== null || value.dueAt !== null ||
      value.status === 'paused' && (value.stopReason !== null || value.completedCycles >= value.plan.maxCycles) ||
      value.status === 'stopped' && value.stopReason === null) invalid('暂停或停止状态与周期不一致');
  if (game) {
    validateGame(game);
    if (value.runId !== game.core.runId || value.gameRevision > game.core.revision ||
        value.status !== 'stopped' && (value.realm !== game.core.player.realm || value.gameRevision !== game.core.revision)) invalid('活动与当前人生或进度不一致');
  }
}

/** The next cycle must be affordable and legal before any timer or command is accepted. */
export function activityStop(game: Game, activity: Activity): RuleFailure | null {
  validateGame(game); validateActivity(activity);
  if (activity.runId !== game.core.runId) return { code: 'RUN_MISMATCH', message: '已经切换人生，此安排不再执行' };
  if (activity.realm !== game.core.player.realm || activity.gameRevision !== game.core.revision)
    return { code: 'STATE_CHANGED', message: '修行进度已变化，请重新安排活动' };
  if (game.status !== 'active') return { code: 'ENDED', message: '此生已经结束，修炼停止' };
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
  const realm = game.core.player.realm;
  if (!Object.hasOwn(CULTIVATION_CYCLE_MS, realm)) throw new RuleError('ENDED', '飞升后不再安排修炼');
  const activity: Activity = { format: 'chenyuan-activity', version: 1, id: options.id, revision: 0, generation: 0,
    ownerId: options.ownerId, runId: game.core.runId, realm: realm as Activity['realm'], gameRevision: game.core.revision,
    plan: { ...plan }, cycleMs: CULTIVATION_CYCLE_MS[realm as Activity['realm']], completedCycles: 0, spentStones: 0,
    gainedXp: 0, spentMonths: 0, status: 'paused', stopReason: null, nextCommand: null, startedAt: null, dueAt: null };
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
    revision: increment(activity.revision), generation: increment(activity.generation) }, options.now);
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
  const cost = costsForAction(gameAfter, command), delta = result.delta;
  const beforeXp = gameAfter.core.player.xp - delta.xp;
  const yieldXp = Math.floor(stats(gameAfter).baseYield * (100 + C.cultivation[activity.plan.method].bonus + stats(gameAfter).cultivationBonus) / 100);
  if (gameAfter.core.runId !== activity.runId || gameAfter.core.player.realm !== activity.realm ||
      gameAfter.core.revision !== activity.gameRevision + 1 || gameAfter.status !== 'active' ||
      gameAfter.core.mode !== 'idle' || gameAfter.core.world.location !== 'cave' || result.type !== 'CULTIVATE' ||
      result.requestedSteps !== 1 || result.executedSteps !== 1 || result.stopReason !== null ||
      canonicalFingerprint(result.costs) !== canonicalFingerprint(cost) || delta.stones !== -cost.stones ||
      delta.months !== cost.months || delta.hp !== 0 || delta.mp !== 0 || delta.wins !== 0 || Object.keys(delta.inventory).length !== 0 ||
      beforeXp < 0 || delta.xp <= 0 || delta.xp !== Math.min(yieldXp, C.realms[activity.realm].xpCap - beforeXp) ||
      activity.spentStones + cost.stones > activity.plan.stoneBudget || gameAfter.core.player.stones < activity.plan.stoneReserve)
    invalid('周期回执的消耗、成果或进度无效');
  const next: Activity = { ...structuredClone(activity), revision: increment(activity.revision), gameRevision: gameAfter.core.revision,
    completedCycles: activity.completedCycles + 1, spentStones: activity.spentStones + result.costs.stones,
    gainedXp: activity.gainedXp + delta.xp, spentMonths: activity.spentMonths + result.costs.months,
    status: 'paused', nextCommand: null, startedAt: null, dueAt: null };
  // The just-completed cycle may have reached a limit; inspect it before validating a new running cycle.
  const reason = activityStopAfterCompletion(gameAfter, next);
  if (reason) return stop(next, reason);
  if (options.now > Number.MAX_SAFE_INTEGER - activity.cycleMs)
    return stop(next, { code: 'ACTIVITY_TIME_LIMIT', message: '无法安全安排下一周期，已保存本次修炼成果' });
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
  const cycleMs = Object.hasOwn(CULTIVATION_CYCLE_MS, game.core.player.realm)
    ? CULTIVATION_CYCLE_MS[game.core.player.realm as Activity['realm']] : 0;
  try {
    let activity = createActivity(game, plan, { id: 'preview-activity', ownerId: 'preview-owner', commandId: 'preview-start', now: 0 });
    let current = game;
    for (let i = 0; i < C.maxBatch && activity.status === 'running'; i++) {
      const command = activity.nextCommand!;
      const resolution = resolve(current, command);
      activity = completeActivity(resolution.nextState, activity, resolution.result,
        { commandId: command.commandId, now: activity.dueAt! });
      current = resolution.nextState;
    }
    if (activity.status !== 'stopped') invalid('活动预览未达到安全停止边界');
    return { allowed: true, failure: null, cycles: activity.completedCycles, xp: activity.gainedXp,
      stones: activity.spentStones, months: activity.spentMonths, stopReason: activity.stopReason, cycleMs: activity.cycleMs };
  } catch (error) {
    if (!(error instanceof RuleError)) throw error;
    return { allowed: false, failure: { code: error.code, message: error.message }, cycles: 0, xp: 0,
      stones: 0, months: 0, stopReason: null, cycleMs };
  }
}
