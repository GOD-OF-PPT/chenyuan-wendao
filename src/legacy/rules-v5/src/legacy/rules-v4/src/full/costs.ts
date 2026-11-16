import * as current from './costs-current.ts';
import * as old from '../legacy/rules-v3/src/full/costs.ts';
import { isLegacyRules, legacyCall } from './rule-profile.ts';
export * from './costs-current.ts';
export const remainingMonths: typeof current.remainingMonths = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.remainingMonths(game, ...args))
    : current.remainingMonths(game, ...args);
export const requirementsForAction: typeof current.requirementsForAction = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.requirementsForAction(game, ...args))
    : current.requirementsForAction(game, ...args);
export const costsForAction: typeof current.costsForAction = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.costsForAction(game, ...args))
    : current.costsForAction(game, ...args);
