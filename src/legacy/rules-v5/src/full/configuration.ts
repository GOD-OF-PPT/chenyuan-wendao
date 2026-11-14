import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import * as current from './configuration-current.ts';
import * as old from '../legacy/rules-v3/src/full/configuration.ts';
import * as previous from '../legacy/rules-v4/src/full/configuration.ts';
import { isLegacyRules, legacyCall } from './rule-profile.ts';
export * from './configuration-current.ts';
export const configurationState: typeof current.configurationState = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.configurationState(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.configurationState(game, ...args))
      : current.configurationState(game, ...args);
export const configurationPreview: typeof current.configurationPreview = (
  game,
  ...args
) =>
  isLegacyRules(game)
    ? legacyCall(() => old.configurationPreview(game, ...args))
    : isPreviousRules(game)
      ? legacyCall(() => previous.configurationPreview(game, ...args))
      : current.configurationPreview(game, ...args);
