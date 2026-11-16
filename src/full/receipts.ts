import { isV5Rules, PUBLISHED_V5_RULES_VERSION } from './rule-profile.ts';
import * as published from '../legacy/rules-v5/src/full/receipts.ts';
import { isPreviousRules, PREVIOUS_RULES_VERSION } from './rule-profile.ts';
import * as current from './receipts-current.ts';
import * as old from '../legacy/rules-v3/src/full/receipts.ts';
import * as previous from '../legacy/rules-v4/src/full/receipts.ts';
import { isLegacyRules, legacyCall } from './rule-profile.ts';
export * from './receipts-current.ts';
import type { Game } from './types.ts';
import type { CommandReceipt } from './contracts.ts';
export function validateCommandReceipt(
  value: unknown,
  game: Game,
): asserts value is CommandReceipt {
  if (isLegacyRules(game))
    legacyCall(() => old.validateCommandReceipt(value, game));
  else if (isPreviousRules(game))
    legacyCall(() => previous.validateCommandReceipt(value, game));
  else if (isV5Rules(game))
    legacyCall(() => published.validateCommandReceipt(value, game));
  else current.validateCommandReceipt(value, game);
}
