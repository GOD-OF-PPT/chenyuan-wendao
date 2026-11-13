import { legacyResult } from './rule-profile.ts';
import * as current from './adventure-current.ts';
import * as old from '../legacy/rules-v3/src/full/adventure.ts';
import {
  isLegacyRules,
  legacyCall,
  activityRulesVersion,
  LEGACY_RULES_VERSION,
} from './rule-profile.ts';
export * from './adventure-current.ts';
export const defaultBattleStrategy: typeof current.defaultBattleStrategy = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.defaultBattleStrategy(game, ...args))
    : current.defaultBattleStrategy(game, ...args);
export const defaultEncounterPlan: typeof current.defaultEncounterPlan = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.defaultEncounterPlan(game, ...args))
    : current.defaultEncounterPlan(game, ...args);
export const defaultBattlePlan: typeof current.defaultBattlePlan = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.defaultBattlePlan(game, ...args))
    : current.defaultBattlePlan(game, ...args);
export const singleBattlePlan: typeof current.singleBattlePlan = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.singleBattlePlan(game, ...args))
    : current.singleBattlePlan(game, ...args);
export const adventureCycleMs: typeof current.adventureCycleMs = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.adventureCycleMs(game, ...args))
    : current.adventureCycleMs(game, ...args);
export const validateAdventureStart: typeof current.validateAdventureStart = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.validateAdventureStart(game, ...args))
    : current.validateAdventureStart(game, ...args);
export const adventureMetadata: typeof current.adventureMetadata = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.adventureMetadata(game, ...args))
    : current.adventureMetadata(game, ...args);
export const validateAdventureResult: typeof current.validateAdventureResult = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() =>
        old.validateAdventureResult(game, args[0], legacyResult(args[1])),
      )
    : current.validateAdventureResult(game, ...args);
export const completeAdventureMetadata: typeof current.completeAdventureMetadata =
  (game, ...args) =>
    isLegacyRules(game)
      ? legacyCall(() =>
          old.completeAdventureMetadata(game, args[0], legacyResult(args[1])),
        )
      : current.completeAdventureMetadata(game, ...args);
export const adventureDecision: typeof current.adventureDecision = (
  activity,
  ...args
) =>
  activityRulesVersion(activity) === LEGACY_RULES_VERSION
    ? legacyCall(() => old.adventureDecision(activity, ...args))
    : current.adventureDecision(activity, ...args);
export const validateAdventureTotals: typeof current.validateAdventureTotals = (
  activity,
  ...args
) =>
  activityRulesVersion(activity) === LEGACY_RULES_VERSION
    ? legacyCall(() => old.validateAdventureTotals(activity, ...args))
    : current.validateAdventureTotals(activity, ...args);
export const adventurePreview: typeof current.adventurePreview = (
  activity,
  ...args
) =>
  activityRulesVersion(activity) === LEGACY_RULES_VERSION
    ? legacyCall(() => old.adventurePreview(activity, ...args))
    : current.adventurePreview(activity, ...args);
