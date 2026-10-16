import * as C from './content.ts';
import { validateCommand } from './engine.ts';
import { RuleError } from './errors.ts';
import { GAME_PHASES, BATCH_STOP_CODES } from './contracts.ts';
import { currentVersions } from './versions.ts';
import type { CommandReceipt } from './contracts.ts';
import type { Game } from './types.ts';

export function canonicalFingerprint(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalFingerprint).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key =>
    JSON.stringify(key) + ':' + canonicalFingerprint((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value) ?? 'undefined';
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const int = (value: unknown, minimum = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
function invalid(): never { throw new RuleError('RECEIPT_INVALID', '指令回执损坏或版本不匹配，未重复执行原指令'); }
function shape(value: unknown, fields: string[]): asserts value is Record<string, unknown> {
  if (!object(value) || Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key))) invalid();
}
function materials(value: unknown, signed = false): void {
  if (!object(value)) invalid();
  for (const [id, amount] of Object.entries(value)) {
    if (!Object.hasOwn(C.items, id) || !int(amount, signed ? -Number.MAX_SAFE_INTEGER : 1) || signed && amount === 0) invalid();
  }
}

/** Structural/identity validation, not client-side anti-cheat or a historic replay. */
export function validateCommandReceipt(value: unknown, current: Game): asserts value is CommandReceipt {
  shape(value, ['format', 'version', 'command', 'fingerprint', 'result']);
  if (value.format !== 'chenyuan-receipt' || value.version !== 1) invalid();
  try { validateCommand(value.command); } catch { invalid(); }
  const command = value.command;
  if (value.fingerprint !== canonicalFingerprint(command) || command.runId !== current.core.runId) invalid();
  shape(value.result, ['commandId', 'runId', 'type', 'revisionBefore', 'revisionAfter', 'requestedSteps', 'executedSteps', 'stopReason', 'phaseBefore', 'phaseAfter', 'costs', 'delta', 'versions']);
  const result = value.result;
  if (result.commandId !== command.commandId || result.runId !== command.runId || result.type !== command.type ||
      result.revisionBefore !== command.expectedRevision || !int(result.revisionAfter, 1) ||
      result.revisionAfter !== command.expectedRevision + 1 || result.revisionAfter > current.core.revision) invalid();
  const requested = command.type === 'SOURCE' || command.type === 'CULTIVATE' ? command.count ?? 1 : 1;
  if (result.requestedSteps !== requested || !int(result.executedSteps, 1) || result.executedSteps > requested) invalid();
  if (result.stopReason !== null) {
    shape(result.stopReason, ['code', 'message']);
    if (!BATCH_STOP_CODES.includes(String(result.stopReason.code)) || typeof result.stopReason.message !== 'string' || !result.stopReason.message.trim()) invalid();
  }
  if (result.executedSteps < requested && result.stopReason === null) invalid();
  if (result.executedSteps === requested && result.stopReason !== null) invalid();
  const phase = (value: unknown) => GAME_PHASES.some(known => known === value);
  if (!phase(result.phaseBefore) || !phase(result.phaseAfter) ||
      canonicalFingerprint(result.versions) !== canonicalFingerprint(currentVersions)) invalid();
  shape(result.costs, ['stones', 'mp', 'months', 'items']);
  for (const field of ['stones', 'mp', 'months']) if (!int(result.costs[field])) invalid();
  materials(result.costs.items);
  shape(result.delta, ['stones', 'xp', 'hp', 'mp', 'months', 'wins', 'inventory', 'realm']);
  for (const field of ['stones', 'xp', 'hp', 'mp']) if (!int(result.delta[field], -Number.MAX_SAFE_INTEGER)) invalid();
  for (const field of ['months', 'wins']) if (!int(result.delta[field])) invalid();
  materials(result.delta.inventory, true);
  shape(result.delta.realm, ['before', 'after']);
  if (!Object.hasOwn(C.realms, result.delta.realm.before as string) || !Object.hasOwn(C.realms, result.delta.realm.after as string)) invalid();
  if (result.delta.months !== result.costs.months || !int(result.delta.wins) || result.delta.wins > (command.type === 'BATTLE' ? 1 : 0)) invalid();
  const before = result.phaseBefore, after = result.phaseAfter;
  const expected: Partial<Record<typeof command.type, [string[], string[]]>> = {
    CHOOSE: [['opening'], ['idle']], EVENT: [['idle'], ['event']], DECIDE: [['event'], ['idle']],
    START_TRIAL: [['idle'], ['trial-question']], ANSWER_TRIAL: [['trial-question'], ['trial-battle']],
    END: [['trial-ending'], ['ascended']], RETIRE: [['idle'], ['ended']], END_LIFE: [['idle'], ['ended']],
    BATTLE: [['battle', 'trial-battle'], ['battle', 'trial-battle', 'trial-ending', 'idle']],
  };
  const phases = expected[command.type] ?? [['idle'], ['idle']];
  if (!phases[0].includes(String(before)) || !phases[1].includes(String(after)) || before === 'battle' && ['trial-battle', 'trial-ending'].includes(String(after))) invalid();
  const realm = result.delta.realm;
  if (command.type === 'BREAKTHROUGH') {
    if (realm.after !== C.realms[realm.before as C.RealmId].next) invalid();
  } else if (command.type === 'END') {
    if (realm.before !== 'spirit' || realm.after !== 'ascended') invalid();
  } else if (realm.before !== realm.after) invalid();
}
