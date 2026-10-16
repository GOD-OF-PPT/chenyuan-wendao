import { resolve, validateGame } from './engine.ts';
import { fail, RuleError } from './errors.ts';
import { canonicalFingerprint } from './receipts.ts';
import type { Action, Command, Game } from './types.ts';
import type { ActionCosts, ActionResult } from './contracts.ts';

export function economicSnapshot(game: Game) {
  return { runId: game.core.runId, contentVersion: game.core.contentVersion, balanceVersion: game.core.balanceVersion,
    realm: game.core.player.realm, location: game.core.world.location,
    revision: game.core.revision, months: game.core.world.elapsedMonths,
    stones: game.core.player.stones, xp: game.core.player.xp, hp: game.core.player.hp, mp: game.core.player.mp,
    inventory: { ...game.core.inventory }, wins: game.wins, status: game.status };
}
export type EconomicSnapshot = ReturnType<typeof economicSnapshot>;
export interface LedgerEntry {
  sequence: number; purpose: string; command: Command; result: ActionResult;
  before: EconomicSnapshot; after: EconomicSnapshot;
  received: { stones: number; mp: number; items: Record<string, number> };
}
export function summarizeEntries(entries: readonly LedgerEntry[]) {
  const costs: ActionCosts = { stones: 0, mp: 0, months: 0, items: {} };
  const received = { stones: 0, mp: 0, items: {} as Record<string, number> };
  const stops: Record<string, number> = {}, types: Record<string, number> = {}, sources: Record<string, number> = {};
  let steps = 0, battleTurns = 0, restMonths = 0, xpGained = 0, xpReset = 0;
  for (const entry of entries) {
    const r = entry.result; steps += r.executedSteps;
    costs.stones += r.costs.stones; costs.mp += r.costs.mp; costs.months += r.costs.months;
    received.stones += entry.received.stones; received.mp += entry.received.mp;
    for (const [id, n] of Object.entries(r.costs.items)) costs.items[id] = (costs.items[id] ?? 0) + n;
    for (const [id, n] of Object.entries(entry.received.items)) received.items[id] = (received.items[id] ?? 0) + n;
    if (r.stopReason) stops[r.stopReason.code] = (stops[r.stopReason.code] ?? 0) + 1;
    types[entry.command.type] = (types[entry.command.type] ?? 0) + 1;
    if (entry.command.type === 'SOURCE') sources[entry.command.sourceId] = (sources[entry.command.sourceId] ?? 0) + r.executedSteps;
    if (entry.command.type === 'BATTLE') battleTurns++;
    if (entry.command.type === 'REST') restMonths += r.costs.months;
    xpGained += Math.max(0, r.delta.xp); xpReset += Math.max(0, -r.delta.xp);
  }
  return { commands: entries.length, executedSteps: steps, costs, received, xpGained, xpReset,
    battleTurns, restMonths, stops, commandTypes: types, sourceSteps: sources };
}

export function reconcileLedger(initial: EconomicSnapshot, entries: readonly LedgerEntry[], closing: EconomicSnapshot, firstSequence = 1) {
  const totals = summarizeEntries(entries), ids = new Set<string>();
  let prior = initial;
  for (const [index, entry] of entries.entries()) {
    if (ids.has(entry.command.commandId)) fail('LEDGER_DUPLICATE', '账本重复记入同一指令');
    ids.add(entry.command.commandId);
    if (entry.sequence !== firstSequence + index || !Number.isSafeInteger(entry.sequence) || entry.sequence < 1 ||
        entry.after.runId !== prior.runId || entry.after.contentVersion !== prior.contentVersion || entry.after.balanceVersion !== prior.balanceVersion ||
        entry.result.versions.contentVersion !== prior.contentVersion || entry.result.versions.balanceVersion !== prior.balanceVersion ||
        canonicalFingerprint(entry.before) !== canonicalFingerprint(prior) || entry.command.expectedRevision !== prior.revision ||
        entry.command.runId !== prior.runId || entry.result.commandId !== entry.command.commandId || entry.result.runId !== prior.runId ||
        entry.result.type !== entry.command.type || entry.result.revisionBefore !== prior.revision || entry.after.revision !== prior.revision + 1 ||
        entry.result.revisionAfter !== entry.after.revision) fail('LEDGER_SEQUENCE', '账本指令与状态顺序不一致');
    const r = entry.result, a = entry.after, b = entry.before;
    if (a.stones - b.stones !== r.delta.stones || a.xp - b.xp !== r.delta.xp || a.hp - b.hp !== r.delta.hp ||
        a.mp - b.mp !== r.delta.mp || a.months - b.months !== r.delta.months || r.costs.months !== r.delta.months ||
        a.wins - b.wins !== r.delta.wins || r.delta.realm.before !== b.realm || r.delta.realm.after !== a.realm ||
        entry.received.stones - r.costs.stones !== r.delta.stones || entry.received.mp - r.costs.mp !== r.delta.mp) fail('LEDGER_FLOW', '账本毛收支与实际净变化不符');
    for (const id of [...Object.keys(r.costs.items), ...Object.keys(r.delta.inventory), ...Object.keys(entry.received.items)]) {
      if (!Object.hasOwn(b.inventory, id)) fail('LEDGER_FLOW', '账本含未知物品');
    }
    for (const id of Object.keys(b.inventory)) {
      const delta = a.inventory[id] - b.inventory[id];
      if (delta !== (r.delta.inventory[id] ?? 0) || (entry.received.items[id] ?? 0) - (r.costs.items[id] ?? 0) !== delta) fail('LEDGER_FLOW', '物品毛收支与实际净变化不符');
    }
    prior = a;
  }
  if (canonicalFingerprint(prior) !== canonicalFingerprint(closing) ||
      closing.stones !== initial.stones + totals.received.stones - totals.costs.stones ||
      closing.mp !== initial.mp + totals.received.mp - totals.costs.mp ||
      closing.months !== initial.months + totals.costs.months ||
      closing.xp !== initial.xp + totals.xpGained - totals.xpReset) fail('LEDGER_CLOSING', '账本期末余额不平');
  for (const id of Object.keys(initial.inventory)) {
    if (closing.inventory[id] !== initial.inventory[id] + (totals.received.items[id] ?? 0) - (totals.costs.items[id] ?? 0)) fail('LEDGER_CLOSING', '物品期末余额不平');
  }
  return totals;
}

/** Pure-engine audit controller. It never grants resources or publishes a durable save. */
export class EngineLedger {
  #game: Game;
  #initial: EconomicSnapshot;
  #entries: LedgerEntry[] = [];
  #attempts = 0;
  #failures: Array<{ purpose: string; action: Action; code: string; message: string; revision: number }> = [];
  constructor(game: Game) { validateGame(game); this.#game = structuredClone(game); this.#initial = economicSnapshot(game); }
  get game() { return structuredClone(this.#game); }
  get count() { return this.#entries.length; }
  get entries() { return structuredClone(this.#entries); }
  get failures() { return structuredClone(this.#failures); }
  apply(action: Action, purpose = 'progression') {
    const command: Command = { ...action, commandId: `economy-${++this.#attempts}`, runId: this.#game.core.runId, expectedRevision: this.#game.core.revision };
    const before = economicSnapshot(this.#game);
    try {
      const resolution = resolve(this.#game, command), result = resolution.result;
      const received = { stones: result.delta.stones + result.costs.stones, mp: result.delta.mp + result.costs.mp,
        items: Object.fromEntries(Object.keys(before.inventory).map(id => [id, (result.delta.inventory[id] ?? 0) + (result.costs.items[id] ?? 0)]).filter(([, n]) => Number(n) !== 0)) };
      if (received.stones < 0 || received.mp < 0 || Object.values(received.items).some(n => Number(n) < 0)) fail('LEDGER_FLOW', '毛获得不能是负数，需扩充账本契约');
      const entry: LedgerEntry = { sequence: this.#entries.length + 1, purpose, command, result,
        before, after: economicSnapshot(resolution.nextState), received: received as LedgerEntry['received'] };
      // Validate a new row against its immediate real before/after, without O(n²) replaying the journal.
      reconcileLedger(before, [entry], entry.after, entry.sequence);
      this.#entries.push(structuredClone(entry)); this.#game = resolution.nextState;
      return structuredClone(result);
    } catch (error) {
      if (error instanceof RuleError) this.#failures.push({ purpose, action: structuredClone(action), code: error.code, message: error.message, revision: before.revision });
      throw error;
    }
  }
  report(includeEntries = false) {
    const closing = economicSnapshot(this.#game), totals = reconcileLedger(this.#initial, this.#entries, closing);
    const realms = [...new Set(this.#entries.map(entry => entry.before.realm))].map(realm => {
      const rows = this.#entries.filter(entry => entry.before.realm === realm);
      return { realm, opening: rows[0].before, closing: rows.at(-1)!.after, ...summarizeEntries(rows) };
    });
    return structuredClone({ initial: this.#initial, closing, totals, realms, failures: this.#failures,
      ...(includeEntries ? { entries: this.#entries } : {}) });
  }
}
