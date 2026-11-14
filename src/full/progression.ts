import { isV5Rules, PUBLISHED_V5_RULES_VERSION } from './rule-profile.ts';
import * as published from '../legacy/rules-v5/src/full/progression.ts';
import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import * as current from './progression-current.ts';
import * as old from '../legacy/rules-v3/src/full/progression.ts';
import * as previous from '../legacy/rules-v4/src/full/progression.ts';
import { isLegacyRules, legacyCall } from './rule-profile.ts';
export * from './progression-current.ts';
export const progressionOptions: typeof current.progressionOptions = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.progressionOptions(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.progressionOptions(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.progressionOptions(game, ...args))
        : current.progressionOptions(game, ...args);
export const projectProgression: typeof current.projectProgression = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.projectProgression(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.projectProgression(game, ...args))
      : isV5Rules(game)
        ? legacyCall(() => published.projectProgression(game, ...args))
        : current.projectProgression(game, ...args);
export const projectConfigurationCombat: typeof current.projectConfigurationCombat =
  (game, ...args) =>
    isLegacyRules(game)
      ? legacyCall(() => old.projectConfigurationCombat(game, ...args))
      : isPreviousRules(game)
        ? legacyCall(() => previous.projectConfigurationCombat(game, ...args))
        : isV5Rules(game)
          ? legacyCall(() =>
              published.projectConfigurationCombat(game, ...args),
            )
          : current.projectConfigurationCombat(game, ...args);
