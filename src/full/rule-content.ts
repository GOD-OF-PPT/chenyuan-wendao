import * as published from '../legacy/rules-v5/src/full/content.ts';
import { isV5Rules } from './rule-profile.ts';
import * as current from './content.ts';
import * as old from '../legacy/rules-v3/src/full/content.ts';
import * as previous from '../legacy/rules-v4/src/full/content.ts';
import type { Game } from './types.ts';
import {
  isLegacyRules,
  isPreviousRules,
  rulesVersion,
} from './rule-profile.ts';

/** Read-only facts belong to the selected life; no ambient mutable profile. */
export function contentForGame(game: Game | null | undefined) {
  if (!game) return current;
  rulesVersion(game);
  return isLegacyRules(game)
    ? old
    : isPreviousRules(game)
      ? previous
      : isV5Rules(game)
        ? published
        : current;
}
