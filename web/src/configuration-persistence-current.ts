import { validateConfigurationIntent } from '../../src/full/configuration.ts';
import type { ConfigurationIntent } from '../../src/full/configuration.ts';
import { resolve, validateGame } from '../../src/full/engine.ts';
import {
  canonicalFingerprint as fingerprint,
  validateCommandReceipt,
} from '../../src/full/receipts.ts';
import { RuleError } from '../../src/full/errors.ts';
import type { ActionResult } from '../../src/full/contracts.ts';
import type { Game } from '../../src/full/types.ts';
import { rulesVersion } from '../../src/full/rule-profile.ts';

export interface ConfigurationReceipt {
  format: 'chenyuan-configuration-receipt';
  version: 1;
  intent: ConfigurationIntent;
  fingerprint: string;
  before: Game;
  after: Game;
  result: ActionResult;
}
/** Validate the original transition, rather than demanding that a later legitimate loadout match history. */
export function validateConfigurationReceipt(
  value: unknown,
  current: Game,
): asserts value is ConfigurationReceipt {
  const invalid = (): never => {
    throw new RuleError(
      'RECEIPT_INVALID',
      '配装回执或原变化证明损坏，未重新应用配置',
    );
  };
  try {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length !== 7 ||
      Object.keys(value).some(
        (key) =>
          ![
            'format',
            'version',
            'intent',
            'fingerprint',
            'before',
            'after',
            'result',
          ].includes(key),
      )
    )
      invalid();
    const receipt = value as ConfigurationReceipt;
    if (
      receipt.format !== 'chenyuan-configuration-receipt' ||
      receipt.version !== 1
    )
      invalid();
    validateConfigurationIntent(receipt.intent);
    validateGame(receipt.before);
    validateGame(receipt.after);
    validateGame(current);
    if (
      rulesVersion(receipt.before) !== rulesVersion(current) ||
      rulesVersion(receipt.after) !== rulesVersion(current)
    )
      invalid();
    if (
      receipt.fingerprint !== fingerprint(receipt.intent) ||
      receipt.intent.command.runId !== current.core.runId ||
      receipt.after.core.runId !== current.core.runId ||
      receipt.after.core.revision > current.core.revision
    )
      invalid();
    validateCommandReceipt(
      {
        format: 'chenyuan-receipt',
        version: 1,
        command: receipt.intent.command,
        fingerprint: fingerprint(receipt.intent.command),
        result: receipt.result,
      },
      receipt.after,
    );
    const resolved = resolve(receipt.before, receipt.intent.command);
    if (
      fingerprint(resolved.nextState) !== fingerprint(receipt.after) ||
      fingerprint(resolved.result) !== fingerprint(receipt.result)
    )
      invalid();
  } catch {
    invalid();
  }
}
export function configurationReceipt(
  intent: ConfigurationIntent,
  before: Game,
  after: Game,
  result: ActionResult,
): ConfigurationReceipt {
  return {
    format: 'chenyuan-configuration-receipt',
    version: 1,
    intent: structuredClone(intent),
    fingerprint: fingerprint(intent),
    before: structuredClone(before),
    after: structuredClone(after),
    result: structuredClone(result),
  };
}
