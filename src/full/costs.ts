import { isV5Rules, PUBLISHED_V5_RULES_VERSION } from './rule-profile.ts';
import * as published from '../legacy/rules-v5/src/full/costs.ts';
import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import * as current from './costs-current.ts';
import * as old from '../legacy/rules-v3/src/full/costs.ts';
import * as previous from '../legacy/rules-v4/src/full/costs.ts';
import { isLegacyRules, legacyCall } from './rule-profile.ts';
export * from './costs-current.ts';
export const remainingMonths: typeof current.remainingMonths = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.remainingMonths(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.remainingMonths(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.remainingMonths(game, ...args))
        : current.remainingMonths(game, ...args);
export const requirementsForAction: typeof current.requirementsForAction = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.requirementsForAction(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.requirementsForAction(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.requirementsForAction(game, ...args))
        : current.requirementsForAction(game, ...args);
export const costsForAction: typeof current.costsForAction = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.costsForAction(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.costsForAction(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.costsForAction(game, ...args))
        : current.costsForAction(game, ...args);
