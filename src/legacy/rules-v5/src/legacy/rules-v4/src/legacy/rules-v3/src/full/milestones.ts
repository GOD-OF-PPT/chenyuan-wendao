import type { Action, Command, Game } from './types.ts';
import type { ActionResult, RuleFailure } from './contracts.ts';
import type { ActivityBase } from './activity.ts';
import { previewResolution, resolve, validateCommand, validateGame } from './engine.ts';
import { canonicalFingerprint as fingerprint } from './receipts.ts';
import { RuleError } from './errors.ts';

export type MilestoneAction = Extract<Action, { type: 'CHOOSE' | 'EVENT' | 'DECIDE' | 'BREAKTHROUGH' | 'START_TRIAL' |
  'ANSWER_TRIAL' | 'END' | 'RETIRE' | 'END_LIFE' }>;
export interface MilestonePlan { kind: 'milestone'; action: MilestoneAction; maxCycles: 1; }
export interface MilestoneMetadata {
  originGame: Game; outcomeGame: Game | null;
  spentItems: Record<string, number>; gainedItems: Record<string, number>; gainedStones: number;
  hpChange: number; mpChange: number; xpChange: number;
}
export interface MilestoneActivity extends ActivityBase, MilestoneMetadata { version: 7; plan: MilestonePlan; }
/** Initial online periods, not balanced growth durations. The formal engine owns all outcomes. */
export const MILESTONE_CYCLE_MS = Object.freeze({
  CHOOSE: 6_000, EVENT: 6_000, DECIDE: 6_000, BREAKTHROUGH: 30_000, START_TRIAL: 15_000,
  ANSWER_TRIAL: 6_000, END: 12_000, RETIRE: 12_000, END_LIFE: 12_000,
});
const fields: Record<MilestoneAction['type'], readonly string[]> = Object.freeze({
  CHOOSE: ['type', 'choice'], EVENT: ['type', 'event'], DECIDE: ['type', 'option'], BREAKTHROUGH: ['type'],
  START_TRIAL: ['type'], ANSWER_TRIAL: ['type', 'answer'], END: ['type', 'ending'], RETIRE: ['type'], END_LIFE: ['type'],
});
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);
function invalid(message = '有限安排的内容或正式结果无效，未执行动作'): never { throw new RuleError('ACTIVITY_INVALID', message); }
function shape(v: unknown, keys: readonly string[]): asserts v is Record<string, unknown> {
  if (!object(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v)) ||
      Object.keys(v).length !== keys.length || Object.keys(v).some(key => !keys.includes(key))) invalid();
}
/** A strict action guard: command identities, extra fields and other action families never enter this plan. */
export function isMilestoneAction(v: unknown): v is MilestoneAction {
  try {
    if (!object(v) || typeof v.type !== 'string' || !Object.hasOwn(fields, v.type)) return false;
    shape(v, fields[v.type as MilestoneAction['type']]);
    validateCommand({ ...v, commandId: 'milestone-validation', runId: 'milestone-validation', expectedRevision: 0 });
    return true;
  } catch { return false; }
}
export function isMilestonePlan(v: unknown): v is MilestonePlan { return object(v) && v.kind === 'milestone'; }
export function validateMilestonePlan(v: unknown): asserts v is MilestonePlan {
  shape(v, ['kind', 'action', 'maxCycles']);
  if (v.kind !== 'milestone' || v.maxCycles !== 1 || !isMilestoneAction(v.action))
    invalid('只可安排已明确选定的九类正式动作之一，且恰好执行一次');
}
export function milestoneCycleAction(plan: MilestonePlan): MilestoneAction {
  validateMilestonePlan(plan); return structuredClone(plan.action);
}
export function milestoneMetadata(game: Game): MilestoneMetadata {
  validateGame(game);
  return { originGame: structuredClone(game), outcomeGame: null, spentItems: {}, gainedItems: {}, gainedStones: 0,
    hpChange: 0, mpChange: 0, xpChange: 0 };
}
export function validateMilestoneStart(game: Game, plan: MilestonePlan): void {
  validateGame(game); validateMilestonePlan(plan);
  const preview = previewResolution(game, plan.action);
  if (!preview.ok) throw preview.error;
}
export function milestoneCompletionReason(action: MilestoneAction): RuleFailure {
  switch (action.type) {
    case 'EVENT': return { code: 'WAITING_DECISION', message: '拜访已保存，当前机缘等待玩家选择回应；未自动旅行或代选' };
    case 'START_TRIAL': return { code: 'WAITING_DECISION', message: '渡劫入场已保存，问心等待玩家选择；未自动作答或出招' };
    case 'ANSWER_TRIAL': return { code: 'WAITING_DECISION', message: '问心答案已保存，当前天劫关卡等待另行安排战策；未自动出招' };
    default: return { code: 'ACTION_COMPLETE', message: '已保存本次明确安排的一次行动，未自动接续其他活动' };
  }
}
function proofCommand(a: MilestoneActivity): Command {
  return { ...milestoneCycleAction(a.plan), commandId: 'milestone-validation', runId: a.runId,
    expectedRevision: a.originGame.core.revision };
}
function completedMetadata(gameAfter: Game, a: MilestoneActivity, result: ActionResult): MilestoneMetadata {
  const gainedItems: Record<string, number> = {};
  const keys = new Set([...Object.keys(result.costs.items), ...Object.keys(result.delta.inventory)]);
  for (const id of keys) {
    const amount = (result.delta.inventory[id] ?? 0) + (result.costs.items[id] ?? 0);
    if (amount) gainedItems[id] = amount;
  }
  return { originGame: structuredClone(a.originGame), outcomeGame: structuredClone(gameAfter),
    spentItems: { ...result.costs.items }, gainedItems, gainedStones: result.delta.stones + result.costs.stones,
    hpChange: result.delta.hp, mpChange: result.delta.mp, xpChange: result.delta.xp };
}
/** The complete saved Game proves choices, milestones and endings that numeric deltas cannot describe. */
export function validateMilestoneTotals(a: MilestoneActivity): boolean {
  validateMilestonePlan(a.plan);
  try { validateGame(a.originGame); } catch { invalid('有限安排的原始Game损坏'); }
  const n = a.completedCycles, origin = a.originGame, invalidated = a.status === 'stopped' && a.stopReason?.code === 'STATE_CHANGED';
  if (n !== 0 && n !== 1 || origin.core.runId !== a.runId || origin.core.player.realm !== a.realm ||
      a.cycleMs !== MILESTONE_CYCLE_MS[a.plan.action.type] ||
      !object(a.spentItems) || ![Object.prototype, null].includes(Object.getPrototypeOf(a.spentItems)) ||
      !object(a.gainedItems) || ![Object.prototype, null].includes(Object.getPrototypeOf(a.gainedItems)) ||
      (invalidated ? a.gameRevision <= origin.core.revision + n : a.gameRevision !== origin.core.revision + n))
    invalid('有限安排的原始身份、周期或进度不一致');
  let expected;
  try { expected = resolve(origin, proofCommand(a)); } catch { invalid('原始Game不能合法执行所选一次行动'); }
  const metadata = n ? completedMetadata(expected.nextState, a, expected.result) : milestoneMetadata(origin);
  for (const key of Object.keys(metadata) as (keyof MilestoneMetadata)[]) if (!same(a[key], metadata[key]))
    invalid('有限安排的完整结果、耗物或净变化与正式规则不一致');
  if (a.spentStones !== (n ? expected.result.costs.stones : 0) || a.spentMonths !== (n ? expected.result.costs.months : 0) ||
      a.gainedXp !== (n ? Math.max(0, expected.result.delta.xp) : 0) ||
      n === 1 && a.status !== 'stopped' ||
      a.status === 'stopped' && !invalidated && (n !== 1 || !same(a.stopReason, milestoneCompletionReason(a.plan.action))))
    invalid('有限安排必须按正式成本完成一次后停止');
  return n === 0;
}
export function milestoneStop(game: Game, a: MilestoneActivity): RuleFailure | null {
  const current = a.outcomeGame ?? a.originGame;
  if (a.gameRevision !== game.core.revision || !same(current, game))
    return { code: 'STATE_CHANGED', message: '当前进度与原有限安排已变化，请重新选择并确认' };
  if (a.completedCycles === 1) return milestoneCompletionReason(a.plan.action);
  const preview = previewResolution(game, a.plan.action);
  return preview.ok ? null : { code: preview.error.code, message: preview.error.message };
}
export function validateMilestoneResult(gameAfter: Game, a: MilestoneActivity, result: ActionResult): void {
  validateMilestoneTotals(a); validateGame(gameAfter);
  const command = a.nextCommand;
  if (a.completedCycles !== 0 || !command || !same(command, { ...milestoneCycleAction(a.plan),
    commandId: `cycle:${a.id}:${a.generation}:1`, runId: a.runId, expectedRevision: a.gameRevision }))
    invalid('有限安排的周期命令与原选择或身份不一致');
  try {
    const expected = resolve(a.originGame, command);
    if (!same(expected.nextState, gameAfter) || !same(expected.result, result)) invalid();
  } catch { invalid('有限安排的完整Game、回执或选择与正式结果不一致'); }
}
export function completeMilestoneMetadata(gameAfter: Game, a: MilestoneActivity, result: ActionResult): MilestoneMetadata {
  validateMilestoneResult(gameAfter, a, result);
  return completedMetadata(gameAfter, a, result);
}
