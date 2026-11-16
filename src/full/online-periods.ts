import * as initial from '../legacy/rules-v3/src/full/content.ts';
import * as current from './content.ts';
import type { Game } from './types.ts';
import { isLegacyRules, rulesVersion } from './rule-profile.ts';
import { RuleError } from './errors.ts';

// Explicit online facts retain their published v3 duration. Calendar month
// prices can change independently without stretching a player's waiting gate.
export const ONLINE_FORGE_MS = 60000;
export function currentSourcePeriodMs(id: string) {
  if (!Object.hasOwn(current.sources, id))
    throw new RuleError('INVALID_COMMAND', '来源周期尚未定义');
  return current.sources[id].onlineMs;
}
export function currentRecipePeriodMs(id: string) {
  if (!Object.hasOwn(current.recipes, id))
    throw new RuleError('INVALID_COMMAND', '丹方周期尚未定义');
  return current.recipes[id].onlineMs;
}
export function sourcePeriodMs(game: Game, id: string) {
  rulesVersion(game);
  return isLegacyRules(game)
    ? initial.sources[id].months * 30000
    : currentSourcePeriodMs(id);
}
export function recipePeriodMs(game: Game, id: string) {
  rulesVersion(game);
  return isLegacyRules(game)
    ? initial.recipes[id].months * 30000
    : currentRecipePeriodMs(id);
}
export function forgePeriodMs(game: Game) {
  rulesVersion(game);
  return isLegacyRules(game)
    ? initial.actionDurations.forge * 30000
    : ONLINE_FORGE_MS;
}
