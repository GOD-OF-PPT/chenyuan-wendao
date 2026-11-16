import * as C from './content.ts';
import { costsForAction, remainingMonths } from './costs.ts';
import { previewResolution, resolve, validateGame } from './engine.ts';
import { RuleError } from './errors.ts';
import { canonicalFingerprint, validateCommandReceipt } from './receipts.ts';
import type { Action, Game } from './types.ts';
import type { ActionResult, RuleFailure } from './contracts.ts';
import type { PreparationActivity } from './activity.ts';

interface StoneLimits { stoneBudget: number; stoneReserve: number; }
export interface LearnPlan extends StoneLimits { kind: 'learn'; skills: string[]; maxCycles: number; }
export interface StudyPlan extends StoneLimits { kind: 'study'; manual: 'jinghong'; maxCycles: 1; }
export interface BuyPlan extends StoneLimits {
  kind: 'buy'; item: string; maxCycles: number; until: 'cycles' | 'target'; targetQuantity: number | null;
}
export interface SellPlan { kind: 'sell'; item: string; maxCycles: number; itemReserve: number; }
export interface UsePlan {
  kind: 'use'; item: 'healing_pill' | 'spirit_pill'; maxCycles: number; targetPercent: number; itemReserve: number;
}
export interface RestPlan { kind: 'rest'; maxCycles: 1; remainingMonthsReserve: number; }
export type PreparationPlan = LearnPlan | StudyPlan | BuyPlan | SellPlan | UsePlan | RestPlan;
export interface PreparationSnapshot {
  startingHp: number; startingMp: number; maxHp: number; maxMp: number;
  schoolBefore: Game['school']; loadoutBefore: Game['loadout']; learnedBefore: string[];
  manualsBefore: string[]; relicsBefore: string[];
}
export interface PreparationTotals {
  spentItems: Record<string, number>; gainedItems: Record<string, number>; gainedStones: number;
  restoredHp: number; restoredMp: number; learnedSkills: string[]; studiedManuals: string[];
}
/** Initial pacing, unbalanced. It does not determine rewards or replace the persisted deadline. */
export const PREPARATION_CYCLE_MS = Object.freeze({ learn: 30_000, study: 60_000, buy: 15_000, sell: 15_000, use: 6_000, rest: 30_000 });
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const ownId = (v: unknown, table: object): v is string => typeof v === 'string' && Object.hasOwn(table, v);
const same = (a: unknown, b: unknown) => canonicalFingerprint(a) === canonicalFingerprint(b);
function invalid(message = '补给或研习安排与正式规则不符'): never { throw new RuleError('ACTIVITY_INVALID', message); }
function shape(value: unknown, fields: string[]): asserts value is Record<string, unknown> {
  if (!object(value) || Object.keys(value).length !== fields.length || Object.keys(value).some(k => !fields.includes(k))) invalid();
}
function exactList(value: unknown): value is unknown[] {
  return Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype &&
    Object.keys(value).length === value.length && Object.keys(value).every((key, i) => key === String(i));
}
function knownList(value: unknown, table: object): value is string[] {
  return exactList(value) && value.length <= Object.keys(table).length && new Set(value).size === value.length && value.every(id => ownId(id, table));
}
function itemRecord(value: unknown): boolean {
  return object(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
    Object.entries(value).every(([id, n]) => ownId(id, C.items) && integer(n, 1, C.maxQuantity));
}
export function isPreparationPlan(value: unknown): value is PreparationPlan {
  return object(value) && typeof value.kind === 'string' && Object.hasOwn(PREPARATION_CYCLE_MS, value.kind);
}
export function validatePreparationPlan(value: unknown): asserts value is PreparationPlan {
  if (!isPreparationPlan(value)) invalid();
  const limits = ['stoneBudget', 'stoneReserve'];
  const fields = value.kind === 'learn' ? ['skills', ...limits] : value.kind === 'study' ? ['manual', ...limits] :
    value.kind === 'buy' ? ['item', 'until', 'targetQuantity', ...limits] : value.kind === 'sell' ? ['item', 'itemReserve'] :
      value.kind === 'use' ? ['item', 'targetPercent', 'itemReserve'] : ['remainingMonthsReserve'];
  shape(value, ['kind', 'maxCycles', ...fields]);
  if (!integer(value.maxCycles, 1, value.kind === 'learn' ? Object.keys(C.skills).length : value.kind === 'study' || value.kind === 'rest' ? 1 : C.maxBatch)) invalid('补给或研习必须有明确的有限次数');
  if ('stoneBudget' in value && (!integer(value.stoneBudget) || !integer(value.stoneReserve))) invalid('须明确累计灵石预算和保留线');
  if (value.kind === 'learn' && (!knownList(value.skills, C.skills) || !value.skills.length || value.maxCycles !== value.skills.length)) invalid('研习清单须为去重的已选功法，次数等于卷数');
  if (value.kind === 'study' && value.manual !== 'jinghong') invalid('未知剑简');
  if ((value.kind === 'buy' || value.kind === 'sell') && !ownId(value.item, C.items)) invalid('未知交易物资');
  if (value.kind === 'buy' && (value.until !== 'cycles' && value.until !== 'target' ||
      (value.until === 'cycles' ? value.targetQuantity !== null : !integer(value.targetQuantity, 1, C.maxQuantity)))) invalid('采购须明确件数或最终库存目标');
  if (value.kind === 'sell' || value.kind === 'use') {
    if (!integer(value.itemReserve, 0, C.maxQuantity)) invalid('物品保留量无效');
  }
  if (value.kind === 'use' && (value.item !== 'healing_pill' && value.item !== 'spirit_pill' || !integer(value.targetPercent, 1, 100))) invalid('仅能安排合法恢复丹与1至100%的恢复目标');
  if (value.kind === 'rest' && !integer(value.remainingMonthsReserve, 1)) invalid('疗养至少保留一个游戏月余寿');
}
export function preparationCycleAction(plan: PreparationPlan, completedCycles: number): Action {
  validatePreparationPlan(plan);
  if (!integer(completedCycles, 0, plan.maxCycles - 1)) invalid('没有下一项已授权的补给或研习动作');
  switch (plan.kind) {
    case 'learn': return { type: 'LEARN', skill: plan.skills[completedCycles] };
    case 'study': return { type: 'STUDY', manual: plan.manual };
    case 'buy': return { type: 'BUY', item: plan.item, quantity: 1 };
    case 'sell': return { type: 'SELL', item: plan.item, quantity: 1 };
    case 'use': return { type: 'USE', item: plan.item };
    case 'rest': return { type: 'REST' };
  }
}
export function preparationSnapshot(game: Game): PreparationSnapshot {
  const p = game.core.player, realm = C.realms[p.realm];
  return { startingHp: p.hp, startingMp: p.mp, maxHp: realm.maxHp, maxMp: realm.maxMp,
    schoolBefore: game.school, loadoutBefore: { ...game.loadout }, learnedBefore: [...game.learned],
    manualsBefore: [...game.core.learnedSkills], relicsBefore: [...game.ownedRelics] };
}
export function emptyPreparationTotals(): PreparationTotals {
  return { spentItems: {}, gainedItems: {}, gainedStones: 0, restoredHp: 0, restoredMp: 0, learnedSkills: [], studiedManuals: [] };
}
function unitRecovery(plan: UsePlan, max: number): number {
  const item = C.items[plan.item]; return Math.max(item.hp ?? item.mp ?? 0, Math.floor(max * .35));
}
/** The totals are exact gross accounting and a bounded recovery/learning proof, not cosmetic deltas. */
export function validatePreparationTotals(activity: PreparationActivity): boolean {
  const a = activity, p = a.plan, n = a.completedCycles, realm = C.realms[a.realm];
  validatePreparationPlan(p);
  if (!realm || !integer(n, 0, p.maxCycles)) invalid('补给或研习进度无效');
  if (a.cycleMs !== PREPARATION_CYCLE_MS[p.kind] || a.gainedXp !== 0 || a.maxHp !== realm.maxHp || a.maxMp !== realm.maxMp ||
      !integer(a.startingHp, 1, a.maxHp) || !integer(a.startingMp, 0, a.maxMp) ||
      !knownList(a.learnedBefore, C.skills) || !knownList(a.manualsBefore, { [C.swordManual.id]: true }) ||
      !knownList(a.relicsBefore, C.relics) || a.schoolBefore !== null && a.schoolBefore !== 'sword' && a.schoolBefore !== 'talisman') invalid('活动起始体魄或研习证明无效');
  shape(a.loadoutBefore, ['mind', 'builder', 'finisher', 'relic']);
  for (const slot of ['mind', 'builder', 'finisher'] as const) {
    const id = a.loadoutBefore[slot];
    if (a.schoolBefore === null ? id !== null : !ownId(id, C.skills) || !a.learnedBefore.includes(id) || C.skills[id].school !== a.schoolBefore || C.skills[id].slot !== slot) invalid('活动起始配置无效');
  }
  if (a.loadoutBefore.relic !== null && (!ownId(a.loadoutBefore.relic, C.relics) || !a.relicsBefore.includes(a.loadoutBefore.relic)) ||
      a.learnedBefore.some(id => C.rank(C.skills[id].min) > C.rank(a.realm)) ||
      a.relicsBefore.length > 0 && C.rank(a.realm) < C.rank('golden')) invalid('活动起始掌握或法宝证明无效');
  let stones = 0, months = 0, gainStones = 0, hp = 0, mp = 0;
  let spent: Record<string, number> = {}, gained: Record<string, number> = {}, skills: string[] = [], manuals: string[] = [];
  if (p.kind === 'learn') {
    if (p.skills.some(id => a.learnedBefore.includes(id) || C.rank(C.skills[id].min) > C.rank(a.realm))) invalid('研习清单包含已掌握或境界未达的功法');
    skills = p.skills.slice(0, n); stones = skills.reduce((sum, id) => sum + C.skills[id].price, 0);
  } else if (p.kind === 'study') {
    if (a.manualsBefore.includes(C.swordManual.id) || C.rank(a.realm) < C.rank(C.swordManual.min)) invalid('剑简已研读或境界未达');
    manuals = n ? ['jinghong'] : []; stones = n * C.swordManual.price;
  } else if (p.kind === 'buy') { gained = n ? { [p.item]: n } : {}; stones = n * C.items[p.item].buy;
  } else if (p.kind === 'sell') { spent = n ? { [p.item]: n } : {}; gainStones = n * (C.items[p.item].sell ?? 0);
    if (n > 0 && C.items[p.item].sell === null) invalid('不可出售的物品没有合法成交成果');
  } else if (p.kind === 'use') {
    spent = n ? { [p.item]: n } : {};
    const item = C.items[p.item];
    if (item.hp) hp = Math.min(a.maxHp - a.startingHp, n * unitRecovery(p, a.maxHp));
    if (item.mp) mp = Math.min(a.maxMp - a.startingMp, n * unitRecovery(p, a.maxMp));
  } else { months = n * C.actionDurations.rest; if (n) { hp = a.maxHp - a.startingHp; mp = a.maxMp - a.startingMp; } }
  let nextEffectAvailable = true;
  if (p.kind === 'use') {
    const item = C.items[p.item], maximum = item.hp ? a.maxHp : a.maxMp, starting = item.hp ? a.startingHp : a.startingMp;
    const required = Math.max(0, Math.ceil((Math.ceil(maximum * p.targetPercent / 100) - starting) / unitRecovery(p, maximum)));
    if (n > required) invalid('恢复达标后不能继续消耗丹药');
    nextEffectAvailable = n < required;
  }
  if (p.kind === 'rest' && n > 0 && hp === 0 && mp === 0) invalid('体魄圆满时不能产生疗养消耗');
  if (p.kind === 'rest' && a.startingHp === a.maxHp && a.startingMp === a.maxMp) nextEffectAvailable = false;
  if (!integer(a.spentStones) || a.spentStones !== stones || !integer(a.spentMonths) || a.spentMonths !== months ||
      !integer(a.gainedStones) || a.gainedStones !== gainStones || !integer(a.restoredHp) || a.restoredHp !== hp || !integer(a.restoredMp) || a.restoredMp !== mp ||
      !itemRecord(a.spentItems) || !itemRecord(a.gainedItems) || !same(a.spentItems, spent) || !same(a.gainedItems, gained) ||
      !exactList(a.learnedSkills) || !same(a.learnedSkills, skills) || !exactList(a.studiedManuals) || !same(a.studiedManuals, manuals)) invalid('补给或研习累计成本、恢复或掌握成果无效');
  if ('stoneBudget' in p && stones > p.stoneBudget) invalid('补给或研习累计成本超过已授权预算');
  const nextCost = p.kind === 'learn' ? C.skills[p.skills[n]]?.price ?? 0 : p.kind === 'study' ? C.swordManual.price : p.kind === 'buy' ? C.items[p.item].buy : 0;
  return nextEffectAvailable && (!('stoneBudget' in p) || stones + nextCost <= p.stoneBudget);
}
function sameConfiguration(game: Game, a: PreparationActivity): boolean {
  return game.school === a.schoolBefore && same(game.loadout, a.loadoutBefore) && same(game.ownedRelics, a.relicsBefore) &&
    same(game.learned, [...a.learnedBefore, ...a.learnedSkills]) &&
    same(game.core.learnedSkills, a.studiedManuals.length ? [C.swordManual.id] : a.manualsBefore);
}
export function validatePreparationSnapshot(game: Game, a: PreparationActivity): void {
  if (game.core.player.hp !== a.startingHp + a.restoredHp || game.core.player.mp !== a.startingMp + a.restoredMp || !sameConfiguration(game, a)) invalid('当前体魄、掌握或配置与活动实际成果不一致');
}
export function preparationStop(game: Game, a: PreparationActivity): RuleFailure | null {
  const p = a.plan, player = game.core.player;
  if (p.kind === 'buy' && p.targetQuantity !== null && game.core.inventory[p.item] >= p.targetQuantity) return { code: 'TARGET_MET', message: '库存已达到采购目标' };
  if (p.kind === 'use') {
    const item = C.items[p.item], current = item.hp ? player.hp : player.mp, maximum = item.hp ? a.maxHp : a.maxMp;
    if (current * 100 >= maximum * p.targetPercent) return { code: 'TARGET_MET', message: '已达到安排的恢复目标，不再消耗丹药' };
  }
  if (a.completedCycles >= p.maxCycles) return { code: 'CYCLES_COMPLETE', message: '已完成本次安排的有限次数' };
  if (p.kind === 'learn' && p.skills.slice(a.completedCycles).some(id => game.learned.includes(id))) return { code: 'ALREADY_LEARNED', message: '待研习清单中已有掌握的功法，请重新选择' };
  const action = preparationCycleAction(p, a.completedCycles), cost = costsForAction(game, action);
  if ('stoneBudget' in p) {
    if (a.spentStones + cost.stones > p.stoneBudget) return { code: 'ACTIVITY_BUDGET', message: '累计灵石预算不足以继续下一件或下一卷' };
    if (player.stones < cost.stones) return { code: 'INSUFFICIENT_STONES', message: '灵石不足，安排停止' };
    if (player.stones - cost.stones < p.stoneReserve) return { code: 'ACTIVITY_RESERVE', message: '下一次投入会低于灵石保留线' };
  }
  if (p.kind === 'sell' || p.kind === 'use') {
    if (game.core.inventory[p.item] < 1) return { code: 'INSUFFICIENT_ITEM', message: `${C.items[p.item].name}不足，安排停止` };
    if (game.core.inventory[p.item] - 1 < p.itemReserve) return { code: 'ACTIVITY_RESERVE', message: `下一次会低于${C.items[p.item].name}保留量` };
  }
  if (p.kind === 'rest' && remainingMonths(game) - cost.months < p.remainingMonthsReserve) return { code: 'ACTIVITY_RESERVE', message: '疗养后会低于余寿保留线' };
  const preview = previewResolution(game, action);
  if (!preview.ok) return { code: preview.error.code, message: preview.error.message };
  const next = preview.value.nextState;
  const changed = p.kind === 'learn' ? next.learned.includes(p.skills[a.completedCycles]) && !game.learned.includes(p.skills[a.completedCycles]) :
    p.kind === 'study' ? next.core.learnedSkills.includes(C.swordManual.id) && !game.core.learnedSkills.includes(C.swordManual.id) :
      p.kind === 'buy' ? next.core.inventory[p.item] > game.core.inventory[p.item] : p.kind === 'sell' ? next.core.player.stones > player.stones :
        next.core.player.hp > player.hp || next.core.player.mp > player.mp;
  return changed ? null : { code: 'NO_CHANGE', message: '下一次不会产生实际补给或掌握效果，安排停止' };
}
/** Validates a formal single-cycle receipt and returns its reconstructed before snapshot for repository reuse. */
export function validatePreparationResult(gameAfter: Game, a: PreparationActivity, result: ActionResult): Game {
  validateGame(gameAfter); validatePreparationPlan(a.plan); validatePreparationTotals(a);
  const command = a.nextCommand;
  const expected = { ...preparationCycleAction(a.plan, a.completedCycles), commandId: `cycle:${a.id}:${a.generation}:${a.completedCycles + 1}`,
    runId: a.runId, expectedRevision: a.gameRevision };
  if (!command || !same(command, expected)) invalid('补给或研习周期指令与安排不一致');
  try { validateCommandReceipt({ format: 'chenyuan-receipt', version: 1, command, fingerprint: canonicalFingerprint(command), result }, gameAfter); } catch { invalid('补给或研习回执身份无效'); }
  const d = result.delta, cost = costsForAction(gameAfter, command);
  if (a.status !== 'running' || gameAfter.core.runId !== a.runId || gameAfter.core.revision !== a.gameRevision + 1 ||
      gameAfter.core.player.realm !== a.realm || gameAfter.status !== 'active' || gameAfter.core.mode !== 'idle' || gameAfter.battle || gameAfter.trial ||
      result.requestedSteps !== 1 || result.executedSteps !== 1 || result.stopReason !== null || !same(result.costs, cost) ||
      d.xp !== 0 || d.wins !== 0 || d.hp < 0 || d.mp < 0 ||
      a.plan.kind !== 'use' && a.plan.kind !== 'rest' && (d.hp !== 0 || d.mp !== 0)) invalid('补给或研习回执的阶段或变化无效');
  const before = structuredClone(gameAfter);
  before.core.revision--; before.core.player.stones -= d.stones; before.core.player.hp -= d.hp; before.core.player.mp -= d.mp;
  before.core.world.elapsedMonths -= d.months;
  for (const [id, n] of Object.entries(d.inventory)) before.core.inventory[id] -= n;
  if (a.plan.kind === 'learn') { const learned = a.plan.skills[a.completedCycles]; before.learned = before.learned.filter(id => id !== learned); }
  if (a.plan.kind === 'study') before.core.learnedSkills = before.core.learnedSkills.filter(id => id !== C.swordManual.id);
  try {
    validateGame(before); validatePreparationSnapshot(before, a);
    if (preparationStop(before, a) !== null || !same(resolve(before, command).result, result)) invalid();
    const after = resolve(before, command).nextState;
    if (!same(after.core.inventory, gameAfter.core.inventory) || !same(after.learned, gameAfter.learned) || !same(after.core.learnedSkills, gameAfter.core.learnedSkills) ||
        !same(after.loadout, gameAfter.loadout) || !same(after.ownedRelics, gameAfter.ownedRelics) || after.school !== gameAfter.school) invalid();
  } catch { invalid('补给或研习前后状态与正式单次规则不一致'); }
  return before;
}
