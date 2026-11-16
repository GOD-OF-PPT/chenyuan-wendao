import type { Activity } from '../../src/full/activity.ts';
import type { Game } from '../../src/full/types.ts';
import type { ActionResult } from '../../src/full/contracts.ts';
import {
  AWAY_LIMIT_MS,
  type AwaySchedule,
} from '../../src/full/scheduled-activity.ts';
import { canonicalFingerprint as fingerprint } from '../../src/full/receipts.ts';
import { RuleError } from '../../src/full/errors.ts';
import {
  replayScheduledReceipt,
  type ScheduledReceipt,
} from './scheduled-persistence.ts';

export interface AwaySummary {
  id: string;
  runId: string;
  revision: number;
  activityId: string;
  activityRevision: number;
  observedAt: number;
  cycles: number;
  discardedMs: number;
  more: boolean;
  costs: ActionResult['costs'];
  delta: ActionResult['delta'];
  stopReason: Activity['stopReason'];
}
/** Derived exclusively from committed, replayable receipts; reading creates no rewards or second ledger. */
export function summarizeAway(
  current: Game,
  activity: Activity,
  schedule: AwaySchedule,
  values: unknown[],
): AwaySummary | null {
  const candidates = values
    .map((value) => replayScheduledReceipt(value, current))
    .filter(
      (row) =>
        row.receipt.input.kind === 'ADVANCE' &&
        row.receipt.proof.recordAfter.activity.id === activity.id &&
        row.progress.cycles.length > 0,
    );
  if (!candidates.length) return null;
  const groupId = (r: ScheduledReceipt) =>
    r.proof.scheduleBefore?.window?.id ?? r.input.mutation.commandId;
  candidates.sort(
    (a, b) =>
      a.receipt.proof.stateAfter.core.revision -
      b.receipt.proof.stateAfter.core.revision,
  );
  const id = groupId(candidates.at(-1)!.receipt),
    rows = candidates.filter((row) => groupId(row.receipt) === id);
  const first = rows[0].receipt,
    p = first.proof;
  if (p.scheduleBefore?.window || first.input.mutation.commandId !== id)
    throw new RuleError(
      'RECEIPT_INVALID',
      '累计摘要缺少首次受理回执，原件保留',
    );
  const cycles = rows.flatMap((row) => row.progress.cycles),
    costs: ActionResult['costs'] = { stones: 0, mp: 0, months: 0, items: {} };
  const delta: ActionResult['delta'] = {
    stones: 0,
    xp: 0,
    hp: 0,
    mp: 0,
    months: 0,
    wins: 0,
    inventory: {},
    realm: {
      before: p.stateBefore.core.player.realm,
      after: rows.at(-1)!.receipt.proof.stateAfter.core.player.realm,
    },
  };
  let previous = p.stateBefore;
  for (const row of rows) {
    if (fingerprint(previous) !== fingerprint(row.receipt.proof.stateBefore))
      throw new RuleError(
        'RECEIPT_INVALID',
        '累计摘要的逐批进度不连续，原件保留',
      );
    previous = row.receipt.proof.stateAfter;
  }
  for (const cycle of cycles) {
    for (const key of ['stones', 'mp', 'months'] as const)
      costs[key] += cycle.result.costs[key];
    for (const [key, amount] of Object.entries(cycle.result.costs.items))
      costs.items[key] = (costs.items[key] ?? 0) + amount;
    for (const key of ['stones', 'xp', 'hp', 'mp', 'months', 'wins'] as const)
      delta[key] += cycle.result.delta[key];
    for (const [key, amount] of Object.entries(cycle.result.delta.inventory))
      delta.inventory[key] = (delta.inventory[key] ?? 0) + amount;
  }
  for (const key of Object.keys(delta.inventory))
    if (delta.inventory[key] === 0) delete delta.inventory[key];
  return {
    id,
    runId: current.core.runId,
    revision: current.core.revision,
    activityId: activity.id,
    activityRevision: activity.revision,
    observedAt: p.observedAt,
    cycles: cycles.length,
    discardedMs: Math.max(
      0,
      p.observedAt - p.scheduleBefore!.lastObservedAt - AWAY_LIMIT_MS,
    ),
    more: schedule.window?.id === id,
    costs,
    delta,
    stopReason: activity.stopReason,
  };
}
