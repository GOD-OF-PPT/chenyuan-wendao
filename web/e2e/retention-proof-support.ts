import { expect } from '@playwright/test';
import { canonicalFingerprint } from '../../src/full/receipts.ts';
import { receiptChecksum } from '../src/receipt-retention.ts';

type Row = { key: any; value: any };
const same = (a: any, b: any) =>
  canonicalFingerprint(a) === canonicalFingerprint(b);
const value = (raw: any, store: string, key: any) =>
  raw.rows[store].find((r: Row) => same(r.key, key))?.value;
const uuid = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const epochOf = (id: string) => {
  const m =
    /^r([0-9a-z]+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.exec(
      id,
    );
  if (!m || id.length > 100) return null;
  const n = Number.parseInt(m[1], 36);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};
const keyRank = (k: any) =>
  typeof k === 'number'
    ? 0
    : k instanceof Date
      ? 1
      : typeof k === 'string'
        ? 2
        : Array.isArray(k)
          ? 4
          : 3;
function compare(a: any, b: any): number {
  const rank = keyRank(a) - keyRank(b);
  if (rank) return rank;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const n = compare(a[i], b[i]);
      if (n) return n;
    }
    return a.length - b.length;
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'string' || typeof a === 'number')
    return a < b ? -1 : a > b ? 1 : 0;
  const x = new Uint8Array(a.buffer ?? a, a.byteOffset ?? 0, a.byteLength),
    y = new Uint8Array(b.buffer ?? b, b.byteOffset ?? 0, b.byteLength);
  for (let i = 0; i < Math.min(x.length, y.length); i++)
    if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/** Test-side storage contract. Raw Game/receipt/archive values are supplied by the
 * existing formal proof; this accounts for every metadata row and allowed prune.
 * The opaque receiver and unordered backup-member list are checked before reuse.
 * No database is written and no store is filtered from the final equality. */
export function proveRetentionDelta(
  before: any,
  expected: any,
  actual: any,
  writes: Row[],
  replace = false,
) {
  expect(before.version).toBe(11);
  expect(actual.version).toBe(11);
  expect(expected.version).toBe(11);
  expect(before.rows['full-retention']).toBeDefined();
  expect(actual.rows['full-retention']).toBeDefined();
  expect(writes.length).toBeGreaterThan(0);
  const originalCounter = value(before, 'full-retention', 'counter');
  expect(originalCounter).toMatchObject({
    format: 'chenyuan-retention',
    version: 1,
  });
  let sequence = originalCounter.sequence,
    epoch = originalCounter.epoch;
  const metadata: Row[] = structuredClone(before.rows['full-retention']),
    root = writes.at(-1)!,
    rootKey = root.key;
  const meta = (key: any) => metadata.find((r) => same(r.key, key))?.value;
  const set = (key: any, v: any) => {
    const old = metadata.find((r) => same(r.key, key));
    if (old) old.value = v;
    else metadata.push({ key, value: v });
  };
  const removeMeta = (key: any) => {
    const i = metadata.findIndex((r) => same(r.key, key));
    expect(i).toBeGreaterThanOrEqual(0);
    metadata.splice(i, 1);
  };
  const removeRaw = (store: string, key: any) => {
    const i = expected.rows[store].findIndex((r: Row) => same(r.key, key));
    expect(i).toBeGreaterThanOrEqual(0);
    expected.rows[store].splice(i, 1);
  };
  const retire = (r: any) => {
    const e = epochOf(r.commandId);
    if (e === epoch || (e === null && epoch === 0)) epoch++;
  };
  const actualRoot = value(actual, 'full-retention', ['receipt', rootKey]);
  expect(uuid(actualRoot?.receiverId)).toBe(true);
  const receiverId = actualRoot.receiverId;
  const oldBackupKeys = new Set(
      before.rows['full-backups'].map((r: Row) => canonicalFingerprint(r.key)),
    ),
    additions = expected.rows['full-backups'].filter(
      (r: Row) => !oldBackupKeys.has(canonicalFingerprint(r.key)),
    );
  if (additions.length) {
    const n = ++sequence,
      group = 'transaction:' + n,
      observed = value(actual, 'full-retention', ['backup', group]);
    expect(observed?.keys).toHaveLength(additions.length);
    expect(observed.keys).toEqual(
      expect.arrayContaining(additions.map((r: Row) => r.key)),
    );
    expect(new Set(observed.keys.map(canonicalFingerprint)).size).toBe(
      observed.keys.length,
    );
    set(['backup', group], {
      format: 'chenyuan-retained-backup',
      version: 1,
      kind: 'backup',
      group,
      parents: [rootKey],
      sequence: n,
      keys: observed.keys,
    });
  }
  for (const write of writes) {
    const r = write.value;
    let id: any,
      activityId = null,
      ordinal = null,
      role = 'control',
      windowId = null,
      checkpointRevision = null;
    if (r.format === 'chenyuan-control-receipt') id = r.mutation;
    else if (r.format === 'chenyuan-receipt') id = r.command;
    else if (
      ['chenyuan-direct-receipt', 'chenyuan-configuration-receipt'].includes(
        r.format,
      )
    )
      id = r.intent.command;
    else if (r.format === 'chenyuan-activity-receipt') {
      id = r.input.kind === 'TICK' ? r.input.tick : r.input.mutation;
      activityId = r.activity.id;
      role =
        r.input.kind === 'START'
          ? 'start'
          : r.input.kind === 'TICK'
            ? 'cycle'
            : 'control';
      if (role === 'cycle' && r.result && r.command) {
        ordinal = r.activity.completedCycles;
        if (['BREAKTHROUGH', 'START_TRIAL'].includes(r.command.type))
          checkpointRevision = r.result.revisionBefore;
      }
    } else if (r.format === 'chenyuan-scheduled-receipt') {
      id = r.input.mutation;
      activityId = r.proof.recordAfter.activity.id;
      role = ['START', 'ADOPT'].includes(r.input.kind)
        ? 'start'
        : r.input.kind === 'ADVANCE'
          ? 'advance'
          : 'control';
      if (role === 'advance' && r.proof.cycles > 0)
        windowId = r.proof.scheduleBefore?.window?.id ?? id.commandId;
    } else throw Error('Unreviewed new receipt family');
    expect(write.key).toBe(id.runId + ':' + id.commandId);
    if (write.key === rootKey && !id.commandId.startsWith('cycle:'))
      expect(epochOf(id.commandId)).toBe(originalCounter.epoch);
    const row = {
      format: 'chenyuan-retained-receipt',
      version: 1,
      kind: 'receipt',
      key: write.key,
      sequence: ++sequence,
      baseline: false,
      pending: false,
      parentKey: rootKey,
      receiverId,
      runId: id.runId,
      commandId: id.commandId,
      activityId,
      ordinal,
      role,
      windowId,
      checkpointRevision,
      checksum: receiptChecksum(r),
    };
    expect(value(actual, 'full-retention', ['receipt', write.key])).toEqual(
      row,
    );
    set(['receipt', write.key], row);
    if (ordinal) {
      const key = ['history', id.runId, activityId],
        h = meta(key) ?? {
          format: 'chenyuan-retained-history',
          version: 1,
          kind: 'history',
          runId: id.runId,
          activityId,
          total: 0,
          deleted: 0,
          baseline: false,
        };
      h.total = Math.max(h.total, ordinal);
      set(key, h);
    }
  }
  const activity = value(expected, 'full-state', 'activity'),
    checkpoint = value(expected, 'full-state', 'checkpoint'),
    checkpointProof = (r: any) =>
      !!checkpoint &&
      r.runId === checkpoint.sourceRunId &&
      r.checkpointRevision === checkpoint.sourceRevision;
  if (replace) {
    for (const entry of before.rows['full-retention'].filter(
      (r: Row) => r.value.kind === 'receipt',
    )) {
      const r = entry.value;
      if (r.baseline || r.pending || checkpointProof(r)) continue;
      expect(receiptChecksum(value(expected, 'full-receipts', r.key))).toBe(
        r.checksum,
      );
      retire(r);
      removeRaw('full-receipts', r.key);
      removeMeta(entry.key);
    }
  }
  const receipts = metadata
      .filter((r) => r.value.kind === 'receipt')
      .map((r) => r.value),
    protectedKeys = new Set(
      receipts
        .filter((r) => r.baseline || r.pending || checkpointProof(r))
        .map((r) => r.key),
    ),
    current = receipts.filter(
      (r) => r.runId === activity?.runId && r.activityId === activity?.id,
    );
  for (const r of current.filter((r) => r.role === 'start'))
    protectedKeys.add(r.key);
  for (const r of current
    .filter((r) => r.role === 'cycle')
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, 256))
    protectedKeys.add(r.key);
  const latest = current
    .filter((r) => r.windowId !== null)
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (latest)
    for (const r of current.filter((r) => r.windowId === latest.windowId))
      protectedKeys.add(r.key);
  const pruned = receipts
    .filter((r) => !protectedKeys.has(r.key))
    .sort((a, b) => b.sequence - a.sequence)
    .slice(512);
  for (const r of pruned) {
    expect(receiptChecksum(value(expected, 'full-receipts', r.key))).toBe(
      r.checksum,
    );
    retire(r);
    removeRaw('full-receipts', r.key);
    removeMeta(['receipt', r.key]);
    if (r.role === 'cycle' && r.ordinal) {
      const key = ['history', r.runId, r.activityId],
        h = meta(key);
      expect(h).toBeDefined();
      h.deleted++;
      expect(h.deleted).toBeLessThanOrEqual(h.total);
    }
  }
  const remaining = metadata
      .filter((r) => r.value.kind === 'receipt')
      .map((r) => r.value),
    pending = new Set(remaining.filter((r) => r.pending).map((r) => r.key)),
    groups = metadata
      .filter((r) => r.value.kind === 'backup')
      .map((r) => r.value),
    retiredGroups = groups
      .filter((r) => !r.parents.some((key: string) => pending.has(key)))
      .sort((a, b) => b.sequence - a.sequence)
      .slice(3);
  for (const group of retiredGroups) {
    for (const key of group.keys) removeRaw('full-backups', key);
    removeMeta(['backup', group.group]);
  }
  const historyKeys = metadata
    .filter((r) => r.value.kind === 'history')
    .map((r) => r.key);
  for (const key of historyKeys) {
    const h = meta(key);
    if (
      !h.baseline &&
      !remaining.some(
        (r) =>
          r.runId === h.runId && r.activityId === h.activityId && r.ordinal,
      ) &&
      !(activity?.runId === h.runId && activity?.id === h.activityId)
    )
      removeMeta(key);
  }
  set('counter', {
    ...originalCounter,
    epoch,
    sequence,
    runId: value(expected, 'full-state', 'current').core.runId,
  });
  metadata.sort((a, b) => compare(a.key, b.key));
  expected.rows['full-retention'] = metadata;
  expect(expected.rows['full-receipts']).toHaveLength(remaining.length);
  const backupInventory = metadata.flatMap((r) =>
    r.value.kind === 'backup'
      ? r.value.keys
      : r.value.format === 'chenyuan-baseline-backup'
        ? [r.value.key]
        : [],
  );
  expect(expected.rows['full-backups']).toHaveLength(backupInventory.length);
  expect(expected.rows['full-backups'].map((r: Row) => r.key)).toEqual(
    expect.arrayContaining(backupInventory),
  );
  expect(actual).toEqual(expected);
}
