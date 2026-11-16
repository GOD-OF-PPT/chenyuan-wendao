import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import { legacyResult } from './rule-profile.ts';
import * as current from './activity-current.ts';
import * as old from '../legacy/rules-v3/src/full/activity.ts';
import * as previous from '../legacy/rules-v4/src/full/activity.ts';
import {
  isLegacyRules,
  legacyCall,
  assertActivityRules,
  activityRulesVersion,
  LEGACY_RULES_VERSION,
  rulesVersion,
} from './rule-profile.ts';
export * from './activity-current.ts';
import type { Activity } from './activity-current.ts';
import type { Game } from './types.ts';
export function validateActivity(
  value: unknown,
  game?: Game,
): asserts value is Activity {
  assertActivityRules(value, game);
  if (activityRulesVersion(value) === LEGACY_RULES_VERSION)
    legacyCall(() => old.validateActivity(value, game));
  else if (activityRulesVersion(value) === PREVIOUS_RULES_VERSION)
    legacyCall(() => previous.validateActivity(value, game));
  else current.validateActivity(value, game);
}
export const createActivity: typeof current.createActivity = (game, ...args) =>
  isLegacyRules(game)
    ? legacyCall(() => old.createActivity(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.createActivity(game, ...args))
      : current.createActivity(game, ...args);
export const pauseActivity: typeof current.pauseActivity = (activity) =>
  activityRulesVersion(activity) === LEGACY_RULES_VERSION
    ? legacyCall(() => old.pauseActivity(activity))
    : activityRulesVersion(activity) === PREVIOUS_RULES_VERSION
      ? legacyCall(() => previous.pauseActivity(activity))
      : current.pauseActivity(activity);
export const activityStop: typeof current.activityStop = (game, activity) => {
  if (activityRulesVersion(activity) !== rulesVersion(game))
    return {
      code: 'STATE_CHANGED',
      message: '活动规则与当前人生不一致，请查看原记录',
    };
  return isLegacyRules(game)
    ? legacyCall(() => old.activityStop(game, activity))
    : isPreviousRules(game)
      ? legacyCall(() => previous.activityStop(game, activity))
      : current.activityStop(game, activity);
};
export const resumeActivity: typeof current.resumeActivity = (
  game,
  activity,
  ...args
) => {
  assertActivityRules(activity, game);
  return isLegacyRules(game)
    ? legacyCall(() => old.resumeActivity(game, activity, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.resumeActivity(game, activity, ...args))
      : current.resumeActivity(game, activity, ...args);
};
export const completeActivity: typeof current.completeActivity = (
  game,
  activity,
  result,
  options,
) => {
  assertActivityRules(activity, game);
  return isLegacyRules(game)
    ? legacyCall(() =>
        old.completeActivity(game, activity, legacyResult(result), options),
      )
    : isPreviousRules(game)
      ? legacyCall(() =>
          previous.completeActivity(game, activity, result, options),
        )
      : current.completeActivity(game, activity, result, options);
};
export const previewActivity: typeof current.previewActivity = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.previewActivity(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.previewActivity(game, ...args))
      : current.previewActivity(game, ...args);
