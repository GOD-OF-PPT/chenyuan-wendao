import { resolve, validateCommand, validateState, RuleError } from './engine.ts';
import type { Command, Receipt, State } from './types.ts';

function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stable((value as Record<string,unknown>)[k])).join(',') + '}';
  return JSON.stringify(value) ?? 'undefined';
}
/** Test/reference adapter only; does NOT persist to disk or claim IndexedDB safety. */
export class MemorySession {
  private current: State;
  private receipts = new Map<string, { fingerprint: string; receipt: Receipt }>();
  constructor(state: State) { validateState(state); this.current = structuredClone(state); }
  snapshot(): State { return structuredClone(this.current); }
  execute(command: Command, beforeCommit: () => void = () => {}): { state: State; receipt: Receipt; duplicate: boolean } {
    validateCommand(command);
    if (command.runId !== this.current.runId) throw new RuleError('RUN_MISMATCH', '不是当前存档');
    const fingerprint = stable(command), prior = this.receipts.get(command.commandId);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new RuleError('COMMAND_ID_REUSED', '同一指令 ID 不能用于不同请求');
      return { state: this.snapshot(), receipt: structuredClone(prior.receipt), duplicate: true };
    }
    const result = resolve(this.current, command);
    beforeCommit(); // Inject a failure in tests BEFORE publishing anything.
    if (this.current.revision !== command.expectedRevision) throw new RuleError('STALE_REVISION', '提交期间状态已改变');
    this.current = result.state;
    this.receipts.set(command.commandId, { fingerprint, receipt: structuredClone(result.receipt) });
    return { state: this.snapshot(), receipt: structuredClone(result.receipt), duplicate: false };
  }
}
