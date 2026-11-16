import type { Action, Command } from './types.ts';
import { validateCommand } from './engine.ts';
import { RuleError } from './errors.ts';

export type DirectAction =
  | Extract<Action, { type: 'EVENT' | 'DECIDE' | 'USE' }>
  | { type: 'SELL'; item: string; quantity: 1 };
export function isDirectAction(action: Action): action is DirectAction {
  return (
    ['EVENT', 'DECIDE', 'USE'].includes(action.type) ||
    (action.type === 'SELL' && action.quantity === 1)
  );
}
export interface DirectIntent {
  command: DirectAction &
    Pick<Command, 'commandId' | 'runId' | 'expectedRevision'>;
  expectedActivityId: string | null;
  expectedActivityRevision: number | null;
}
export function validateDirectIntent(
  value: unknown,
): asserts value is DirectIntent {
  const invalid = (): never => {
    throw new RuleError('INVALID_COMMAND', '本次轻量行动或活动归属无效');
  };
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 3 ||
    Object.keys(value).some(
      (k) =>
        !['command', 'expectedActivityId', 'expectedActivityRevision'].includes(
          k,
        ),
    )
  )
    invalid();
  const i = value as DirectIntent;
  validateCommand(i.command);
  if (
    !['EVENT', 'DECIDE', 'USE', 'SELL'].includes(i.command.type) ||
    (i.command.type === 'SELL' && i.command.quantity !== 1)
  )
    invalid();
  if (
    i.expectedActivityId === null
      ? i.expectedActivityRevision !== null
      : typeof i.expectedActivityId !== 'string' ||
        !i.expectedActivityId.trim() ||
        i.expectedActivityId.length > 64 ||
        !Number.isSafeInteger(i.expectedActivityRevision) ||
        Number(i.expectedActivityRevision) < 0
  )
    invalid();
}
