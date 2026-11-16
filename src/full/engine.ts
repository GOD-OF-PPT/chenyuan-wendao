import { isV5Rules, PUBLISHED_V5_RULES_VERSION } from './rule-profile.ts';
import * as published from '../legacy/rules-v5/src/full/engine.ts';
import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import * as current from './engine-current.ts';
import { VERSION } from './content.ts';
import * as old from '../legacy/rules-v3/src/full/engine.ts';
import * as previous from '../legacy/rules-v4/src/full/engine.ts';
import { isLegacyRules, legacyCall } from './rule-profile.ts';
export * from './engine-current.ts';
/** A forecast belongs to the full life, including its rule profile and trial answer. */
export function battleIntent(game: Game) {
  if (isLegacyRules(game)) {
    validateGame(game);
    if (!game.battle) throw new RuleError('NO_BATTLE', '当前没有战斗');
    return legacyCall(() => old.intent(game.battle!));
  }
  if (isPreviousRules(game)) {
    validateGame(game);
    if (!game.battle) throw new RuleError('NO_BATTLE', '当前没有战斗');
    return legacyCall(() => previous.intent(game.battle!));
  }
  return isV5Rules(game)
    ? legacyCall(() => published.battleIntent(game))
    : current.battleIntent(game);
}
import type { Game } from './types.ts';
import { RuleError } from './errors.ts';
import {
  inheritanceFrom,
  inheritanceOffer,
  validateInheritanceChoice,
  type InheritanceChoice,
} from './incarnation.ts';
/** Source validation and fresh birth are explicit; the old life is never edited. */
export function reincarnate(
  source: Game,
  name: string,
  runId: string,
  choice: InheritanceChoice,
): Game {
  validateInheritanceChoice(choice);
  validateGame(source);
  if (source.core.runId === runId)
    throw new RuleError('NEW_RUN_REQUIRED', '新人生须使用新的编号');
  const next = current.newGame(name, runId);
  if (choice === 'ending-gift') {
    const inheritance = inheritanceFrom(source),
      offer = inheritanceOffer(source)!;
    next.incarnation = { version: 1, seed: runId, inheritance };
    next.core.player.stones += offer.stones;
    for (const [id, quantity] of Object.entries(offer.items))
      next.core.inventory[id] += quantity;
    next.journal.unshift(`前缘${offer.label}随你开卷。${offer.summary}`);
  }
  current.validateGame(next);
  return next;
}
export function validateGame(value: unknown): asserts value is Game {
  if (
    value &&
    typeof value === 'object' &&
    'core' in value &&
    value.core &&
    typeof value.core === 'object' &&
    'contentVersion' in value.core &&
    'balanceVersion' in value.core
  ) {
    const core = value.core;
    if (
      !['3', '4', '5', '6'].some(
        (v) =>
          core.contentVersion === 'full-demo.' + v &&
          core.balanceVersion === 'full-unbalanced.' + v,
      )
    )
      throw new RuleError(
        'SAVE_VERSION',
        '内容或数值版本不匹配，请先显式导入旧存档',
      );
  }
  if (isLegacyRules(value)) legacyCall(() => old.validateGame(value));
  else if (isPreviousRules(value))
    legacyCall(() => previous.validateGame(value));
  else if (isV5Rules(value)) legacyCall(() => published.validateGame(value));
  else current.validateGame(value);
}
export const parseGame: typeof current.parseGame = (raw) => {
  if (
    typeof raw !== 'string' ||
    raw.length > 1000000 ||
    new TextEncoder().encode(raw).byteLength > 1000000
  )
    throw new RuleError('SAVE_SIZE', '存档过大');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new RuleError('SAVE_JSON', '文件不是有效 JSON');
  }
  const c =
    value && typeof value === 'object' && 'core' in value
      ? (
          value as {
            core?: { contentVersion?: unknown; balanceVersion?: unknown };
          }
        ).core
      : null;
  if (
    value &&
    typeof value === 'object' &&
    'format' in value &&
    value.format === 'chenyuan-full'
  ) {
    const pairs = [
      ['1', '1'],
      ['2', '1'],
      ['2', '2'],
      ['3', '3'],
      ['4', '4'],
      ['5', '5'],
      ['6', '6'],
    ];
    if (
      !pairs.some(
        ([content, balance]) =>
          c?.contentVersion === 'full-demo.' + content &&
          c?.balanceVersion === 'full-unbalanced.' + balance,
      )
    )
      throw new RuleError('SAVE_VERSION', '内容或数值版本不匹配，请保留原存档');
  }
  if (isPreviousRules(value)) return legacyCall(() => previous.parseGame(raw));
  if (isV5Rules(value)) return legacyCall(() => published.parseGame(raw));
  return c?.contentVersion === VERSION
    ? current.parseGame(raw)
    : legacyCall(() => old.parseGame(raw));
};
export const previewResolution: typeof current.previewResolution = (
  game,
  action,
) => {
  const result = isLegacyRules(game)
    ? legacyCall(() => old.previewResolution(game, action))
    : isPreviousRules(game)
      ? legacyCall(() => previous.previewResolution(game, action))
      : isV5Rules(game)
        ? legacyCall(() => published.previewResolution(game, action))
        : current.previewResolution(game, action);
  return result.ok
    ? result
    : {
        ...result,
        error: new RuleError(result.error.code, result.error.message),
      };
};
export const resolve: typeof current.resolve = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.resolve(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.resolve(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.resolve(game, ...args))
        : current.resolve(game, ...args);
export const advance: typeof current.advance = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.advance(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.advance(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.advance(game, ...args))
        : current.advance(game, ...args);
export const reason: typeof current.reason = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.reason(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.reason(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.reason(game, ...args))
        : current.reason(game, ...args);
export const stats: typeof current.stats = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.stats(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.stats(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.stats(game, ...args))
        : current.stats(game, ...args);
export const availableEvents: typeof current.availableEvents = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.availableEvents(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.availableEvents(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.availableEvents(game, ...args))
        : current.availableEvents(game, ...args);
export const biography: typeof current.biography = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.biography(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.biography(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.biography(game, ...args))
        : current.biography(game, ...args);
