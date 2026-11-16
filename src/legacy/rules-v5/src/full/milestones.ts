import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import { legacyResult } from './rule-profile.ts';
import * as current from './milestones-current.ts';
import * as old from '../legacy/rules-v3/src/full/milestones.ts';
import * as previous from '../legacy/rules-v4/src/full/milestones.ts';
import {
  isLegacyRules,
  legacyCall,
  activityRulesVersion,
  LEGACY_RULES_VERSION,
} from './rule-profile.ts';
export * from './milestones-current.ts';
export const milestoneMetadata: typeof current.milestoneMetadata = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.milestoneMetadata(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.milestoneMetadata(game, ...args))
      : current.milestoneMetadata(game, ...args);
export const validateMilestoneStart: typeof current.validateMilestoneStart = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.validateMilestoneStart(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.validateMilestoneStart(game, ...args))
      : current.validateMilestoneStart(game, ...args);
export const milestoneStop: typeof current.milestoneStop = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.milestoneStop(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.milestoneStop(game, ...args))
      : current.milestoneStop(game, ...args);
export const validateMilestoneResult: typeof current.validateMilestoneResult = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() =>
        old.validateMilestoneResult(game, args[0], legacyResult(args[1])),
      )
    : isPreviousRules(game)
      ? legacyCall(() => previous.validateMilestoneResult(game, ...args))
      : current.validateMilestoneResult(game, ...args);
export const completeMilestoneMetadata: typeof current.completeMilestoneMetadata =
  (game, ...args) =>
    isLegacyRules(game)
      ? legacyCall(() =>
          old.completeMilestoneMetadata(game, args[0], legacyResult(args[1])),
        )
      : isPreviousRules(game)
        ? legacyCall(() => previous.completeMilestoneMetadata(game, ...args))
        : current.completeMilestoneMetadata(game, ...args);
export const validateMilestoneTotals: typeof current.validateMilestoneTotals = (
  activity,
  ...args
) =>
  activityRulesVersion(activity) === LEGACY_RULES_VERSION
    ? legacyCall(() => old.validateMilestoneTotals(activity, ...args))
    : activityRulesVersion(activity) === PREVIOUS_RULES_VERSION
      ? legacyCall(() => previous.validateMilestoneTotals(activity, ...args))
      : current.validateMilestoneTotals(activity, ...args);
