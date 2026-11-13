import type { DirectIntent } from '../../src/full/direct-actions.ts';
import { validateDirectIntent } from '../../src/full/direct-actions.ts';
import type { Game } from '../../src/full/types.ts';
import type { ActionResult } from '../../src/full/contracts.ts';
import { resolve, validateGame } from '../../src/full/engine.ts';
import {
  canonicalFingerprint as fingerprint,
  validateCommandReceipt,
} from '../../src/full/receipts.ts';
import { RuleError } from '../../src/full/errors.ts';
import { rulesVersion } from '../../src/full/rule-profile.ts';

export interface DirectReceipt {
  format: 'chenyuan-direct-receipt';
  version: 1;
  intent: DirectIntent;
  fingerprint: string;
  before: Game;
  after: Game;
  result: ActionResult;
}
export function validateDirectReceipt(
  value: unknown,
  current: Game,
): asserts value is DirectReceipt {
  const invalid = (): never => {
    throw new RuleError(
      'RECEIPT_INVALID',
      '行动记录或原变化证明损坏，未重复行动',
    );
  };
  try {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length !== 7 ||
      Object.keys(value).some(
        (k) =>
          ![
            'format',
            'version',
            'intent',
            'fingerprint',
            'before',
            'after',
            'result',
          ].includes(k),
      )
    )
      invalid();
    const r = value as DirectReceipt;
    if (r.format !== 'chenyuan-direct-receipt' || r.version !== 1) invalid();
    validateDirectIntent(r.intent);
    validateGame(r.before);
    validateGame(r.after);
    validateGame(current);
    if (
      rulesVersion(r.before) !== rulesVersion(current) ||
      rulesVersion(r.after) !== rulesVersion(current)
    )
      invalid();
    if (
      r.fingerprint !== fingerprint(r.intent) ||
      r.intent.command.runId !== current.core.runId ||
      r.after.core.runId !== current.core.runId ||
      r.after.core.revision > current.core.revision
    )
      invalid();
    validateCommandReceipt(
      {
        format: 'chenyuan-receipt',
        version: 1,
        command: r.intent.command,
        fingerprint: fingerprint(r.intent.command),
        result: r.result,
      },
      r.after,
    );
    const formal = resolve(r.before, r.intent.command);
    if (
      fingerprint(formal.nextState) !== fingerprint(r.after) ||
      fingerprint(formal.result) !== fingerprint(r.result)
    )
      invalid();
  } catch {
    invalid();
  }
}
export function directReceipt(
  intent: DirectIntent,
  before: Game,
  after: Game,
  result: ActionResult,
): DirectReceipt {
  return {
    format: 'chenyuan-direct-receipt',
    version: 1,
    intent: structuredClone(intent),
    fingerprint: fingerprint(intent),
    before: structuredClone(before),
    after: structuredClone(after),
    result: structuredClone(result),
  };
}
