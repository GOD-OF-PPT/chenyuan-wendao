import { legacyResult } from './rule-profile.ts';
import * as current from './preparation-current.ts';
import * as old from '../legacy/rules-v3/src/full/preparation.ts';
import {
  isLegacyRules,
  legacyCall,
  activityRulesVersion,
  LEGACY_RULES_VERSION,
} from './rule-profile.ts';
export * from './preparation-current.ts';
export const preparationSnapshot: typeof current.preparationSnapshot = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.preparationSnapshot(game, ...args))
    : current.preparationSnapshot(game, ...args);
export const validatePreparationSnapshot: typeof current.validatePreparationSnapshot =
  (game, ...args) =>
    isLegacyRules(game)
      ? legacyCall(() => old.validatePreparationSnapshot(game, ...args))
      : current.validatePreparationSnapshot(game, ...args);
export const preparationStop: typeof current.preparationStop = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.preparationStop(game, ...args))
    : current.preparationStop(game, ...args);
export const validatePreparationResult: typeof current.validatePreparationResult =
  (game, ...args) =>
    isLegacyRules(game)
      ? legacyCall(() =>
          old.validatePreparationResult(game, args[0], legacyResult(args[1])),
        )
      : current.validatePreparationResult(game, ...args);
export const validatePreparationTotals: typeof current.validatePreparationTotals =
  (activity, ...args) =>
    activityRulesVersion(activity) === LEGACY_RULES_VERSION
      ? legacyCall(() => old.validatePreparationTotals(activity, ...args))
      : current.validatePreparationTotals(activity, ...args);
