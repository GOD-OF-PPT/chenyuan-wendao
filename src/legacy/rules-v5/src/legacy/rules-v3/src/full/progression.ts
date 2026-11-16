import * as C from './content.ts';
import { createActivity, completeActivity, defaultEncounterPlan } from './activity.ts';
import type { Activity, ActivityPlan } from './activity.ts';
import { configurationPreview } from './configuration.ts';
import type { ConfigurationAction } from './configuration.ts';
import { EngineLedger, economicSnapshot, summarizeEntries } from './economy-ledger.ts';
import type { EconomicSnapshot, LedgerEntry } from './economy-ledger.ts';
import { stats } from './engine.ts';
import { gamePhase } from './contracts.ts';
import type { ActionCosts, ActionResult, RuleFailure } from './contracts.ts';
import { RuleError } from './errors.ts';
import type { Game } from './types.ts';

export type ProgressionKind = 'cultivation' | 'preparation';
export type ProgressionVariant = 'natural' | 'assisted' | 'mind' | 'gather' | 'commission' | 'purchase';
export interface ProjectedStep {
  kind: 'activity' | 'configuration'; label: string; location: C.LocationId;
  plan: ActivityPlan | null; action: ConfigurationAction | null;
  cycles: number; cycleMs: number; onlineMs: number; costs: ActionCosts;
  gainedXp: number; gainedStones: number; gainedItems: Record<string, number>;
}
export interface ProgressionPreview {
  variant: ProgressionVariant; name: string; target: string; complete: boolean; failure: RuleFailure | null;
  steps: ProjectedStep[]; onlineMs: number; arrangements: number; initial: EconomicSnapshot; closing: EconomicSnapshot;
  totals: { costs: ActionCosts; received: { stones: number; mp: number; items: Record<string, number> }; xpGained: number; xpReset: number };
  notes: string[];
}
const reason = (error: unknown): RuleFailure => {
  if (!(error instanceof RuleError)) throw error;
  return { code: error.code, message: error.message };
};
function blocked(message: string, code = 'PROJECTION_STOP'): never { throw new RuleError(code, message); }

/** Pure audit of explicitly supplied plans. No repository, timer or game write port. */
export class ActivityLedger {
  #ledger: EngineLedger;
  #steps: ProjectedStep[] = [];
  #serial = 0;
  #cycles = 0;
  #onlineMs = 0;
  #prefix: string;
  #limit: number;
  constructor(game: Game, prefix = 'projection', limit = 256) {
    this.#ledger = new EngineLedger(game);
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(prefix) || !Number.isSafeInteger(limit) || limit < 1 || limit > 1500)
      blocked('预测身份或有限周期上限无效');
    this.#prefix = prefix; this.#limit = limit;
  }
  get game() { return this.#ledger.game; }
  get onlineMs() { return this.#onlineMs; }
  get steps() { return structuredClone(this.#steps); }
  get ledger() { return this.#ledger; }
  #checkLimit() { if (this.#cycles >= this.#limit) blocked('已到本次只读推演上限；剩余路程未计算', 'PROJECTION_LIMIT'); }
  run(plan: ActivityPlan, label: string = plan.kind): Activity {
    this.#checkLimit();
    const id = `${this.#prefix}-${++this.#serial}`;
    let activity = createActivity(this.game, plan, { id, ownerId: this.#prefix, commandId: `start-${id}`, now: this.#onlineMs });
    const rows: LedgerEntry[] = [], firstCycleMs = activity.cycleMs;
    let elapsed = 0;
    try {
      while (activity.status === 'running') {
        this.#checkLimit();
        const command = activity.nextCommand!, duration = activity.cycleMs, dueAt = activity.dueAt!;
        const result = this.#ledger.applyCommand(command, label);
        rows.push(this.#ledger.lastEntry!);
        activity = completeActivity(this.game, activity, result, { commandId: command.commandId, now: dueAt });
        this.#cycles++; this.#onlineMs += duration; elapsed += duration;
      }
      return activity;
    } finally {
      if (rows.length) {
        const totals = summarizeEntries(rows);
        this.#steps.push({ kind: 'activity', label, location: this.game.core.world.location,
          plan: structuredClone(plan), action: null, cycles: rows.length, cycleMs: firstCycleMs, onlineMs: elapsed,
          costs: totals.costs, gainedXp: totals.xpGained, gainedStones: totals.received.stones, gainedItems: totals.received.items });
      }
    }
  }
  configure(action: ConfigurationAction, label = '确认配装'): ActionResult {
    this.#checkLimit();
    const preview = configurationPreview(this.game, action);
    if (!preview.allowed) throw new RuleError(preview.failure!.code, preview.failure!.message);
    const result = this.#ledger.apply(action, label), row = this.#ledger.lastEntry!;
    this.#cycles++;
    this.#steps.push({ kind: 'configuration', label, location: this.game.core.world.location,
      plan: null, action: structuredClone(action), cycles: 1, cycleMs: 0, onlineMs: 0,
      costs: row.result.costs, gainedXp: 0, gainedStones: row.received.stones, gainedItems: row.received.items });
    return result;
  }
}

const names: Record<ProgressionVariant, string> = {
  natural: '自然潜修', assisted: '灵石辅助', mind: '投资心法', gather: '自采炼制', commission: '委托炼制', purchase: '直接购丹',
};
function preparation(game: Game) {
  const item = C.realms[game.core.player.realm].pill;
  const entry = item ? Object.entries(C.recipes).find(([, recipe]) => recipe.output === item) : null;
  return { item, recipe: entry?.[1] ?? null, recipeId: entry?.[0] ?? null };
}
function advancedMind(game: Game) {
  return Object.entries(C.skills).find(([, skill]) => skill.school === game.school && skill.slot === 'mind' && skill.price > 0 && C.rank(skill.min) <= C.rank(game.core.player.realm));
}
export function progressionOptions(game: Game, kind: ProgressionKind): ProgressionVariant[] {
  if (kind === 'cultivation') return advancedMind(game) ? ['natural', 'assisted', 'mind'] : ['natural', 'assisted'];
  const { recipe } = preparation(game);
  if (!recipe) return [];
  const alternative = Object.keys(recipe.inputs).some(item => Object.entries(C.sources).some(([id, source]) =>
    id.endsWith('_task') && source.items[item] && C.rank(source.min) <= C.rank(game.core.player.realm)));
  return alternative ? ['gather', 'commission', 'purchase'] : ['gather', 'purchase'];
}
function idle(game: Game) {
  if (game.status !== 'active' || gamePhase(game) !== 'idle') blocked('先完成眼前抉择或战局，再比较本境安排', 'PROJECTION_PHASE');
}
function travel(audit: ActivityLedger, location: C.LocationId) {
  if (audit.game.core.world.location !== location)
    audit.run({ kind: 'travel', location, maxCycles: 1 }, `行旅至${C.locations[location].name}`);
}
function harvest(audit: ActivityLedger, sourceId: string, target: { kind: 'item'; id: string; quantity: number } | { kind: 'stones'; quantity: number }) {
  const source = C.sources[sourceId]; travel(audit, source.location);
  const have = () => target.kind === 'item' ? audit.game.core.inventory[target.id] : audit.game.core.player.stones;
  const unit = target.kind === 'item' ? source.items[target.id] : source.stones;
  if (!unit || unit < 0) blocked('该安全来源不能产生目标物资');
  while (have() < target.quantity) {
    const before = have(), count = Math.min(C.maxBatch, Math.ceil((target.quantity - before) / unit));
    const activity = audit.run({ kind: 'source', sourceId, maxCycles: count, until: 'target', target,
      monthBudget: count * source.months, remainingMonthsReserve: 1 }, source.name);
    if (have() <= before || activity.stopReason && !['TARGET_MET', 'CYCLES_COMPLETE'].includes(activity.stopReason.code))
      blocked(activity.stopReason?.message ?? '来源未产生目标成果', activity.stopReason?.code);
  }
}
function fund(audit: ActivityLedger, stones: number) {
  if (audit.game.core.player.stones >= stones) return;
  const realm = audit.game.core.player.realm;
  const source = Object.entries(C.sources).filter(([, source]) => C.rank(source.min) <= C.rank(realm) && source.stones > 0 && !Object.keys(source.items).length)
    .sort(([, a], [, b]) => b.stones / b.months - a.stones / a.months)[0];
  if (!source) blocked('当前境界尚无安全收入来源；先自然潜修入道', 'REALM_REQUIRED');
  harvest(audit, source[0], { kind: 'stones', quantity: stones });
}
function cultivate(audit: ActivityLedger, method: 'natural' | 'assisted') {
  const needed = () => {
    const game = audit.game, actual = stats(game), bonus = C.cultivation[method].bonus;
    return Math.ceil((actual.xpCap - game.core.player.xp) / Math.floor(actual.baseYield * (100 + bonus + actual.cultivationBonus) / 100));
  };
  if (method === 'assisted') fund(audit, needed() * C.assistedCosts[audit.game.core.player.realm]);
  travel(audit, 'cave');
  while (needed() > 0) {
    const count = Math.min(C.maxBatch, needed()), before = audit.game.core.player.xp;
    const activity = audit.run({ kind: 'cultivation', method, maxCycles: count, until: 'xp-cap',
      stoneBudget: method === 'assisted' ? count * C.assistedCosts[audit.game.core.player.realm] : 0, stoneReserve: 0 }, names[method]);
    if (audit.game.core.player.xp <= before || activity.stopReason && !['XP_CAP', 'CYCLES_COMPLETE'].includes(activity.stopReason.code))
      blocked(activity.stopReason?.message ?? '未能继续积累修为', activity.stopReason?.code);
  }
}

export function projectProgression(game: Game, variant: ProgressionVariant): ProgressionPreview {
  const audit = new ActivityLedger(game), initial = economicSnapshot(game), material = preparation(game);
  const cultivation = ['natural', 'assisted', 'mind'].includes(variant);
  const target = cultivation ? `${C.realms[game.core.player.realm].name}修为圆满 · 返回洞府` :
    material.item ? `${C.items[material.item].name}库存 1 · 返回洞府` : '本境没有待筹备的突破物';
  const notes = ['只读分段推演，不安排活动；下一段仍须在原玩法确认。', '按实际完整周期计算；安排段数不是点击次数。时长与数值尚未平衡。'];
  let failure: RuleFailure | null = null, complete = false;
  try {
    idle(game);
    if (!progressionOptions(game, cultivation ? 'cultivation' : 'preparation').includes(variant)) blocked('当前境界没有这条可比较路线');
    if (cultivation) {
      if (variant === 'mind') {
        const [id, skill] = advancedMind(game)!;
        if (!audit.game.learned.includes(id)) {
          fund(audit, skill.price); travel(audit, 'sect');
          audit.run({ kind: 'learn', skills: [id], maxCycles: 1, stoneBudget: skill.price, stoneReserve: 0 }, `研习${skill.name}`);
        }
        if (audit.game.loadout.mind !== id) audit.configure({ type: 'EQUIP', skill: id }, `装配${skill.name}`);
        notes.push('心法为一次永久投资；已学与已装配不会重复计费。');
      }
      cultivate(audit, variant === 'assisted' ? 'assisted' : 'natural');
      notes.push(variant === 'assisted' ? '先筹资，再按委托附带修为重算吐纳；未花灵石留在行囊。' : '取材与委托也能附带修为；本比较只到当前境圆满，不自动破境。');
      complete = audit.game.core.player.xp === C.realms[game.core.player.realm].xpCap;
    } else {
      const { item, recipe, recipeId } = material;
      if (!item || !recipe || !recipeId) blocked('当前境界不需要突破物');
      if (audit.game.core.inventory[item] < 1) {
        if (variant === 'purchase') {
          fund(audit, C.items[item].buy); travel(audit, 'market');
          audit.run({ kind: 'buy', item, maxCycles: 1, until: 'target', targetQuantity: 1,
            stoneBudget: C.items[item].buy, stoneReserve: 0 }, `购买${C.items[item].name}`);
        } else {
          for (const [id, quantity] of Object.entries(recipe.inputs)) {
            if (audit.game.core.inventory[id] >= quantity) continue;
            const sources = Object.entries(C.sources).filter(([, source]) => source.items[id] > 0 && C.rank(source.min) <= C.rank(game.core.player.realm));
            const selected = variant === 'commission' ? sources.find(([key]) => key.endsWith('_task')) ?? sources[0] : sources[0];
            if (!selected) blocked(`当前境界没有${C.items[id].name}的安全来源`);
            harvest(audit, selected[0], { kind: 'item', id, quantity });
          }
          fund(audit, recipe.stones); travel(audit, 'cave');
          audit.run({ kind: 'craft', recipeId, maxCycles: 1, until: 'target', targetQuantity: 1,
            stoneBudget: recipe.stones, stoneReserve: 0, monthBudget: recipe.months, remainingMonthsReserve: 1, itemReserves: {} }, recipe.name);
        }
      } else notes.push('已有一份成品，本次无需再次购买或开炉。');
      travel(audit, 'cave'); complete = audit.game.core.inventory[item] >= 1;
      const allBought = Object.entries(recipe.inputs).reduce((sum, [id, n]) => sum + C.items[id].buy * n, recipe.stones);
      notes.push(`若材料全部购入，本配方含炉费 ${allBought} 灵石；成品 ${C.items[item].buy} 灵石。已有库存与自采需另计投入。`);
      if (variant === 'commission') notes.push('有替代委托的材料优先在宗门筹备；只有一个安全来源的材料仍需前往原地点。');
      if (game.core.player.realm === 'spirit') notes.push('引已齐不等于可入劫：化神修为28000、气血至少480、合法修法及登仙台仍须核对，入劫另行确认；灵力是战策建议。');
    }
  } catch (error) { failure = reason(error); }
  return { variant, name: names[variant], target, complete: complete && !failure, failure,
    steps: audit.steps, onlineMs: audit.onlineMs, arrangements: audit.steps.length,
    initial, closing: economicSnapshot(audit.game), totals: audit.ledger.report().totals, notes };
}

export interface EncounterOutlook {
  complete: boolean; failure: RuleFailure | null; onlineMs: number; turns: number; victories: number;
  hp: number; mp: number; spentMp: number; spentItems: Record<string, number>; gainedItems: Record<string, number>; stopReason: string;
}
function encounterOutlook(game: Game, enemy: string | null): EncounterOutlook {
  const audit = new ActivityLedger(game, 'combat-outlook'); let failure: RuleFailure | null = null, victories = 0, stopReason = '';
  try {
    idle(game);
    if (!enemy) blocked('当前境界尚无已开放的历练对手', 'REALM_REQUIRED');
    travel(audit, C.enemies[enemy].location);
    const activity = audit.run(defaultEncounterPlan(audit.game, enemy), `历练${C.enemies[enemy].name}`);
    if (activity.version !== 6) blocked('未得到正式战策成果');
    victories = activity.victories; stopReason = activity.stopReason?.message ?? '当前战策待调整';
    if (!victories) failure = activity.stopReason ?? { code: 'PROJECTION_STOP', message: stopReason };
  } catch (error) { failure = reason(error); stopReason = failure.message; }
  const totals = audit.ledger.report().totals, player = audit.game.core.player;
  return { complete: victories === 1, failure, onlineMs: audit.onlineMs, turns: totals.battleTurns,
    victories, hp: player.hp, mp: player.mp, spentMp: totals.costs.mp,
    spentItems: totals.costs.items, gainedItems: totals.received.items, stopReason };
}
export function projectConfigurationCombat(game: Game, action: ConfigurationAction) {
  const enemy = Object.entries(C.enemies).filter(([, enemy]) => !enemy.trial && C.rank(enemy.min) <= C.rank(game.core.player.realm))
    .sort(([, a], [, b]) => C.rank(b.min) - C.rank(a.min) || b.hp - a.hp)[0]?.[0] ?? null;
  const before = encounterOutlook(game, enemy), quote = configurationPreview(game, action);
  if (!quote.allowed) return { enemy, configurationAllowed: false, failure: quote.failure, before, after: null };
  const audit = new ActivityLedger(game, 'configuration-outlook'); audit.configure(action);
  return { enemy, configurationAllowed: true, failure: null, before, after: encounterOutlook(audit.game, enemy) };
}
