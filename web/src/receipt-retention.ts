import { issueReceiptId, receiptIdEpoch } from './receipt-command-id.ts';
export { issueReceiptId, receiptIdEpoch } from './receipt-command-id.ts';
import { RuleError } from '../../src/full/errors.ts';
import { canonicalFingerprint } from '../../src/full/receipts.ts';
import type { CommandReceipt } from '../../src/full/contracts.ts';
import type { ActivityReceipt } from './activity-persistence';
import type { ScheduledReceipt } from './scheduled-persistence';
import type { ConfigurationReceipt } from './configuration-persistence';
import type { DirectReceipt } from './direct-persistence';

export const RETENTION_STORE = 'full-retention';
export const HISTORY_INDEX = 'activity-cycle';
export const REPLAY_LIMIT = 512;
export const HISTORY_LIMIT = 256;
export const BACKUP_GROUP_LIMIT = 3;
declare const receiverBrand: unique symbol;
export type ReceiptReceiver = { readonly [receiverBrand]: true };
interface ReceiverState {
  id: string;
  offers: Map<string, Set<string>>;
  confirmed: Map<string, Set<string>>;
}
const receivers = new WeakMap<ReceiptReceiver, ReceiverState>();
/** One logical Store scope, retained across connection replacement, never persisted as a capability. */
export function createReceiptReceiver(): ReceiptReceiver {
  const token = Object.freeze({}) as ReceiptReceiver;
  receivers.set(token, {
    id: crypto.randomUUID(),
    offers: new Map(),
    confirmed: new Map(),
  });
  return token;
}
export function receiptReceiverState(token: ReceiptReceiver, database: string) {
  const state = receivers.get(token);
  if (!state) throw new RuleError('INVALID_MUTATION', '接收实例身份无效');
  let offers = state.offers.get(database);
  if (!offers) state.offers.set(database, (offers = new Set()));
  let confirmed = state.confirmed.get(database);
  if (!confirmed) state.confirmed.set(database, (confirmed = new Set()));
  return { id: state.id, offers, confirmed };
}
const RECEIPTS = 'full-receipts',
  STATE = 'full-state';
type ControlReceipt = {
  format: 'chenyuan-control-receipt';
  kind: 'CREATE' | 'IMPORT' | 'MIGRATE' | 'RESTORE';
  mutation: { runId: string; commandId: string };
  fingerprint: string;
};
export type RetentionReceipt =
  | CommandReceipt
  | ActivityReceipt
  | ScheduledReceipt
  | ConfigurationReceipt
  | DirectReceipt
  | ControlReceipt;
interface Counter {
  format: 'chenyuan-retention';
  version: 1;
  epoch: number;
  sequence: number;
  runId: string | null;
}
interface ReceiptMeta {
  format: 'chenyuan-retained-receipt';
  version: 1;
  kind: 'receipt';
  key: IDBValidKey;
  sequence: number;
  baseline: boolean;
  pending: boolean;
  parentKey: string | null;
  receiverId: string | null;
  runId: string | null;
  commandId: string | null;
  activityId: string | null;
  ordinal: number | null;
  role: 'control' | 'start' | 'cycle' | 'advance' | 'legacy';
  windowId: string | null;
  checkpointRevision: number | null;
  checksum: string | null;
  quarantined?: true;
}
interface HistoryMeta {
  format: 'chenyuan-retained-history';
  version: 1;
  kind: 'history';
  runId: string;
  activityId: string;
  total: number;
  deleted: number;
  baseline: boolean;
}
interface BackupMeta {
  format: 'chenyuan-retained-backup';
  version: 1;
  kind: 'backup';
  group: string;
  parents: string[];
  sequence: number;
  keys: string[];
}
interface Context {
  abort: (error: unknown) => void;
  counter: Counter | null;
  initializing: boolean;
  receiverId: string | null;
  offers: Set<string>;
  backups: Map<string, BackupMeta>;
  histories: Map<
    string,
    { value: HistoryMeta | null; maximum: number; baseline: boolean }
  >;
}
const contexts = new WeakMap<IDBTransaction, Context>();
const receiptKey = (key: IDBValidKey): IDBValidKey => ['receipt', key];
const historyKey = (runId: string, id: string): IDBValidKey => [
  'history',
  runId,
  id,
];
const integer = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
function invalid(message = '旧记载的留存信息需要核对，原件已保留'): never {
  throw new RuleError('RETENTION_INVALID', message);
}
function validateCounter(value: unknown): asserts value is Counter {
  if (!value || typeof value !== 'object') invalid();
  const r = value as Counter;
  if (
    r.format !== 'chenyuan-retention' ||
    r.version !== 1 ||
    !integer(r.epoch) ||
    !integer(r.sequence) ||
    Object.keys(r).sort().join(',') !== 'epoch,format,runId,sequence,version' ||
    (r.runId !== null && typeof r.runId !== 'string')
  )
    invalid();
}
function validateMeta(value: unknown): asserts value is ReceiptMeta {
  if (!value || typeof value !== 'object') invalid();
  const r = value as ReceiptMeta;
  if (
    r.format !== 'chenyuan-retained-receipt' ||
    r.version !== 1 ||
    r.kind !== 'receipt' ||
    !integer(r.sequence) ||
    r.sequence < 1 ||
    typeof r.baseline !== 'boolean' ||
    typeof r.pending !== 'boolean' ||
    !['control', 'start', 'cycle', 'advance', 'legacy'].includes(r.role)
  )
    invalid();
  for (const name of [
    'runId',
    'commandId',
    'activityId',
    'windowId',
    'parentKey',
    'receiverId',
  ] as const)
    if (r[name] !== null && (typeof r[name] !== 'string' || !r[name].length))
      invalid();
  if (
    (r.ordinal !== null && (!integer(r.ordinal) || r.ordinal < 1)) ||
    (r.checkpointRevision !== null && !integer(r.checkpointRevision)) ||
    (r.checksum !== null && typeof r.checksum !== 'string') ||
    (r.quarantined !== undefined && r.quarantined !== true)
  )
    invalid();
  if (
    !r.baseline &&
    (typeof r.key !== 'string' ||
      typeof r.runId !== 'string' ||
      typeof r.commandId !== 'string' ||
      typeof r.parentKey !== 'string' ||
      typeof r.receiverId !== 'string' ||
      typeof r.checksum !== 'string')
  )
    invalid();
}
function validateHistory(value: unknown): asserts value is HistoryMeta {
  if (!value || typeof value !== 'object') invalid();
  const h = value as HistoryMeta;
  if (
    h.format !== 'chenyuan-retained-history' ||
    h.version !== 1 ||
    h.kind !== 'history' ||
    typeof h.runId !== 'string' ||
    typeof h.activityId !== 'string' ||
    !integer(h.total) ||
    !integer(h.deleted) ||
    h.deleted > h.total ||
    typeof h.baseline !== 'boolean'
  )
    invalid();
}
function context(tx: IDBTransaction): Context & { counter: Counter } {
  const c = contexts.get(tx);
  if (!c?.counter) invalid();
  return c as Context & { counter: Counter };
}
function persistCounter(tx: IDBTransaction) {
  tx.objectStore(RETENTION_STORE).put(context(tx).counter, 'counter');
}
function nextSequence(tx: IDBTransaction) {
  const c = context(tx).counter;
  if (c.sequence === Number.MAX_SAFE_INTEGER)
    invalid('记载序号已到上限，请先导出原件');
  c.sequence++;
  persistCounter(tx);
  return c.sequence;
}
export function storedReceiptEpoch(tx: IDBTransaction) {
  return context(tx).counter.epoch;
}
export function rememberReceiptOffer(tx: IDBTransaction, key: string) {
  context(tx).offers.add(key);
}
export function offeredReceiptKeys(tx: IDBTransaction) {
  return [...context(tx).offers];
}

// A corruption check for recorded data, not a cryptographic/source-file gate.
export function receiptChecksum(value: unknown) {
  const text = canonicalFingerprint(value);
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < text.length; i++) {
    const n = text.charCodeAt(i);
    a = Math.imul(a ^ n, 16777619);
    b = Math.imul(b, 33) ^ n;
  }
  return (
    text.length + ':' + (a >>> 0).toString(16) + ':' + (b >>> 0).toString(16)
  );
}
export interface ReceiptAccess {
  runId: string;
  commandId: string;
  destination?: boolean;
  derived?: boolean;
}
/** Call only after looking for the original receipt. Never refresh the intent. */
export function requireCurrentReceiptId(
  tx: IDBTransaction,
  access: ReceiptAccess,
) {
  const state = context(tx).counter;
  if (access.derived && access.commandId.startsWith('cycle:')) return;
  const epoch = receiptIdEpoch(access.commandId);
  if (epoch === state.epoch || (epoch === null && state.epoch === 0)) return;
  throw new RuleError(
    'RECEIPT_EXPIRED',
    '这次操作已归入旧记载，请核对当前进度后重新选择；原操作未再次执行。',
  );
}

export function beginReceiptRetention(
  tx: IDBTransaction,
  abort: (error: unknown) => void,
  receiverId: string,
) {
  const meta = tx.objectStore(RETENTION_STORE),
    receipts = tx.objectStore(RECEIPTS);
  const matches = (index: IDBIndex, path: string | string[]) =>
    canonicalFingerprint(index.keyPath) === canonicalFingerprint(path) &&
    !index.unique &&
    !index.multiEntry;
  if (
    meta.keyPath !== null ||
    meta.autoIncrement ||
    meta.indexNames.length !== 3 ||
    !meta.indexNames.contains('order') ||
    !meta.indexNames.contains('parent') ||
    !meta.indexNames.contains('run') ||
    !matches(meta.index('order'), ['kind', 'sequence']) ||
    !matches(meta.index('parent'), 'parentKey') ||
    !matches(meta.index('run'), ['kind', 'runId']) ||
    receipts.keyPath !== null ||
    receipts.autoIncrement ||
    receipts.indexNames.length !== 1 ||
    !receipts.indexNames.contains(HISTORY_INDEX) ||
    !matches(receipts.index(HISTORY_INDEX), [
      'input.kind',
      'activity.runId',
      'activity.id',
      'activity.completedCycles',
    ])
  )
    invalid();
  const c: Context = {
    abort,
    counter: null,
    initializing: false,
    receiverId,
    offers: new Set(),
    backups: new Map(),
    histories: new Map(),
  };
  contexts.set(tx, c);
  const read = tx.objectStore(RETENTION_STORE).get('counter');
  read.onsuccess = () => {
    try {
      validateCounter(read.result);
      c.counter = read.result;
    } catch (error) {
      abort(error);
    }
  };
}
function identity(receipt: RetentionReceipt) {
  switch (receipt.format) {
    case 'chenyuan-control-receipt':
      return receipt.mutation;
    case 'chenyuan-receipt':
      return receipt.command;
    case 'chenyuan-configuration-receipt':
    case 'chenyuan-direct-receipt':
      return receipt.intent.command;
    case 'chenyuan-scheduled-receipt':
      return receipt.input.mutation;
    case 'chenyuan-activity-receipt':
      return receipt.input.kind === 'TICK'
        ? receipt.input.tick
        : receipt.input.mutation;
  }
}
function project(receipt: RetentionReceipt) {
  const id = identity(receipt);
  if (!id || typeof id.runId !== 'string' || typeof id.commandId !== 'string')
    invalid();
  let activityId: string | null = null,
    ordinal: number | null = null,
    role: ReceiptMeta['role'] = 'control',
    windowId: string | null = null,
    checkpointRevision: number | null = null;
  if (receipt.format === 'chenyuan-activity-receipt') {
    activityId = receipt.activity.id;
    role =
      receipt.input.kind === 'START'
        ? 'start'
        : receipt.input.kind === 'TICK'
          ? 'cycle'
          : 'control';
    if (role === 'cycle' && receipt.result && receipt.command) {
      ordinal = receipt.activity.completedCycles;
      if (['BREAKTHROUGH', 'START_TRIAL'].includes(receipt.command.type))
        checkpointRevision = receipt.result.revisionBefore;
    }
  } else if (receipt.format === 'chenyuan-scheduled-receipt') {
    activityId = receipt.proof.recordAfter.activity.id;
    role = ['START', 'ADOPT'].includes(receipt.input.kind)
      ? 'start'
      : receipt.input.kind === 'ADVANCE'
        ? 'advance'
        : 'control';
    if (role === 'advance' && receipt.proof.cycles > 0)
      windowId =
        receipt.proof.scheduleBefore?.window?.id ??
        receipt.input.mutation.commandId;
  }
  return { ...id, activityId, ordinal, role, windowId, checkpointRevision };
}
function recordHistory(tx: IDBTransaction, row: ReceiptMeta) {
  if (row.role !== 'cycle' || !row.runId || !row.activityId || !row.ordinal)
    return;
  const c = context(tx),
    token = JSON.stringify([row.runId, row.activityId]);
  let h = c.histories.get(token);
  if (h) {
    h.maximum = Math.max(h.maximum, row.ordinal);
    h.baseline ||= row.baseline;
    if (h.value) {
      h.value.total = Math.max(h.value.total, h.maximum);
      h.value.baseline ||= h.baseline;
      tx.objectStore(RETENTION_STORE).put(
        h.value,
        historyKey(row.runId, row.activityId),
      );
    }
    return;
  }
  h = { value: null, maximum: row.ordinal, baseline: row.baseline };
  c.histories.set(token, h);
  const held = h,
    runId = row.runId,
    activityId = row.activityId,
    read = tx.objectStore(RETENTION_STORE).get(historyKey(runId, activityId));
  read.onsuccess = () => {
    try {
      if (read.result !== undefined) validateHistory(read.result);
      const value: HistoryMeta = read.result ?? {
        format: 'chenyuan-retained-history',
        version: 1,
        kind: 'history',
        runId,
        activityId,
        total: 0,
        deleted: 0,
        baseline: false,
      };
      value.total = Math.max(value.total, held.maximum);
      value.baseline ||= held.baseline;
      held.value = value;
      tx.objectStore(RETENTION_STORE).put(value, historyKey(runId, activityId));
    } catch (error) {
      context(tx).abort(error);
    }
  };
}
function record(
  tx: IDBTransaction,
  key: IDBValidKey,
  value: unknown,
  baseline: boolean,
  parentKey?: string,
) {
  let fields: ReturnType<typeof project> | null = null;
  try {
    fields = project(value as RetentionReceipt);
  } catch (error) {
    if (!baseline) throw error;
  }
  const row: ReceiptMeta = {
    format: 'chenyuan-retained-receipt',
    version: 1,
    kind: 'receipt',
    key,
    sequence: nextSequence(tx),
    baseline,
    pending: !baseline,
    parentKey: parentKey ?? (typeof key === 'string' ? key : null),
    receiverId: baseline ? null : context(tx).receiverId,
    runId: fields?.runId ?? null,
    commandId: fields?.commandId ?? null,
    activityId: fields?.activityId ?? null,
    ordinal: fields?.ordinal ?? null,
    role: fields?.role ?? 'legacy',
    windowId: fields?.windowId ?? null,
    checkpointRevision: fields?.checkpointRevision ?? null,
    checksum: baseline ? null : receiptChecksum(value),
  };
  if (
    !baseline &&
    (typeof key !== 'string' || key !== row.runId + ':' + row.commandId)
  )
    invalid();
  tx.objectStore(RETENTION_STORE).put(row, receiptKey(key));
  recordHistory(tx, row);
}
/** Receipt and undelivered protection are queued in the original Game transaction. */
export function putRetainedReceipt(
  tx: IDBTransaction,
  value: RetentionReceipt,
  key: string,
  parentKey?: string,
) {
  tx.objectStore(RECEIPTS).put(value, key);
  const c = context(tx);
  if (value.format === 'chenyuan-control-receipt') {
    c.counter.runId = value.mutation.runId;
    persistCounter(tx);
  }
  record(tx, key, value, c.initializing, parentKey);
  if (!parentKey || parentKey === key) rememberReceiptOffer(tx, key);
  for (const backup of c.backups.values()) {
    backup.parents = [...c.offers];
    tx.objectStore(RETENTION_STORE).put(backup, ['backup', backup.group]);
  }
}
export function createReceiptRetention(
  db: IDBDatabase,
  tx: IDBTransaction,
  abort: (error: unknown) => void,
) {
  const meta = tx.objectStore(RETENTION_STORE);
  meta.createIndex('order', ['kind', 'sequence']);
  meta.createIndex('parent', 'parentKey');
  meta.createIndex('run', ['kind', 'runId']);
  tx.objectStore(RECEIPTS).createIndex(HISTORY_INDEX, [
    'input.kind',
    'activity.runId',
    'activity.id',
    'activity.completedCycles',
  ]);
  const c: Context = {
    abort,
    counter: {
      format: 'chenyuan-retention',
      version: 1,
      epoch: 0,
      sequence: 0,
      runId: null,
    },
    initializing: true,
    receiverId: null,
    offers: new Set(),
    backups: new Map(),
    histories: new Map(),
  };
  contexts.set(tx, c);
  persistCounter(tx);
  const state = tx.objectStore(STATE).get('current');
  state.onsuccess = () => {
    if (state.result?.core?.runId) {
      context(tx).counter.runId = state.result.core.runId;
      persistCounter(tx);
    }
  };
  const receipts = tx.objectStore(RECEIPTS).openCursor();
  receipts.onsuccess = () => {
    try {
      if (!receipts.result) return;
      record(tx, receipts.result.key, receipts.result.value, true);
      receipts.result.continue();
    } catch (error) {
      abort(error);
    }
  };
  const backups = tx.objectStore('full-backups').openCursor();
  backups.onsuccess = () => {
    if (!backups.result) return;
    meta.put(
      {
        format: 'chenyuan-baseline-backup',
        version: 1,
        key: backups.result.key,
      },
      ['baseline-backup', backups.result.key],
    );
    backups.result.continue();
  };
}

/** Explicit life replacement retires acknowledged history only. Originals stay in their raw store. */
export function clearRetainedReceipts(tx: IDBTransaction) {
  const receipts = tx.objectStore(RECEIPTS),
    meta = tx.objectStore(RETENTION_STORE),
    checkpoint = tx.objectStore(STATE).get('checkpoint'),
    values = receipts.getAll(),
    keys = receipts.getAllKeys(),
    rows = meta
      .index('order')
      .getAll(
        IDBKeyRange.bound(['receipt', 0], ['receipt', Number.MAX_SAFE_INTEGER]),
      );
  let ready = 0;
  const captured = () => {
    if (++ready !== 4) return;
    try {
      const old = rows.result as ReceiptMeta[];
      old.forEach(validateMeta);
      if (!context(tx).initializing && old.length !== keys.result.length)
        invalid();
      for (let i = 0; i < keys.result.length; i++) {
        const key = keys.result[i],
          row = old.find((r) => indexedDB.cmp(r.key, key) === 0);
        if (!row) {
          if (!context(tx).initializing) invalid();
          record(tx, key, values.result[i], true);
          continue;
        }
        if (
          row.baseline ||
          row.pending ||
          protectsCheckpoint(row, checkpoint.result)
        )
          continue;
        if (receiptChecksum(values.result[i]) !== row.checksum) {
          row.baseline = true;
          row.quarantined = true;
          meta.put(row, receiptKey(key));
          continue;
        }
        retireEpoch(tx, row);
        receipts.delete(key);
        meta.delete(receiptKey(key));
      }
      persistCounter(tx);
    } catch (error) {
      context(tx).abort(error);
    }
  };
  values.onsuccess = captured;
  keys.onsuccess = captured;
  rows.onsuccess = captured;
  checkpoint.onsuccess = captured;
}
function protectsCheckpoint(row: ReceiptMeta, checkpoint: unknown) {
  if (checkpoint === undefined) return false;
  if (
    !checkpoint ||
    typeof checkpoint !== 'object' ||
    !('sourceRunId' in checkpoint) ||
    typeof checkpoint.sourceRunId !== 'string' ||
    !('sourceRevision' in checkpoint) ||
    !integer(checkpoint.sourceRevision)
  )
    invalid();
  return (
    row.runId === checkpoint.sourceRunId &&
    row.checkpointRevision === checkpoint.sourceRevision
  );
}
function retireEpoch(tx: IDBTransaction, row: ReceiptMeta) {
  const epoch = row.commandId ? receiptIdEpoch(row.commandId) : null,
    state = context(tx).counter;
  if (epoch === state.epoch || (epoch === null && state.epoch === 0)) {
    if (state.epoch === Number.MAX_SAFE_INTEGER) invalid();
    state.epoch++;
  }
}

export interface HistoryWindow<T> {
  rows: T[];
  page: number;
  pages: number;
  total: number;
  retained: number;
  folded: number;
}
/** Counts stay in the index. Deserialize and validate only the requested bounded page. */
export function readRetainedHistory<T>(
  tx: IDBTransaction,
  runId: string,
  activityId: string,
  page: number,
  pageSize: number,
  validate: (value: unknown, key: IDBValidKey) => T,
  done: (page: HistoryWindow<T>) => void,
  abort: (error: unknown) => void,
) {
  const meta = tx
    .objectStore(RETENTION_STORE)
    .get(historyKey(runId, activityId));
  meta.onsuccess = () => {
    try {
      if (meta.result !== undefined) validateHistory(meta.result);
      const h: HistoryMeta | undefined = meta.result;
      if (h && (h.runId !== runId || h.activityId !== activityId)) invalid();
      const index = tx.objectStore(RECEIPTS).index(HISTORY_INDEX),
        range = IDBKeyRange.bound(
          ['TICK', runId, activityId, 0],
          ['TICK', runId, activityId, Number.MAX_SAFE_INTEGER],
        ),
        runPrefix = runId + ':',
        runRawCount = tx
          .objectStore(RECEIPTS)
          .count(IDBKeyRange.bound(runPrefix, runPrefix + '\uffff')),
        runMetaCount = tx
          .objectStore(RETENTION_STORE)
          .index('run')
          .count(['receipt', runId]),
        count = index.count(range);
      count.onsuccess = () => {
        try {
          const total = h?.total ?? 0;
          if (
            runRawCount.result !== runMetaCount.result ||
            count.result !== total - (h?.deleted ?? 0)
          )
            throw new RuleError(
              'RECEIPT_INVALID',
              '活动明细与原件数量不符，请核对原记录',
            );
          const retained = Math.min(HISTORY_LIMIT, count.result),
            folded = total - retained,
            pages = Math.max(1, Math.ceil(retained / pageSize)),
            selected = Math.min(page, pages - 1),
            result: HistoryWindow<T> = {
              rows: [],
              page: selected,
              pages,
              total,
              retained,
              folded,
            };
          if (!retained) {
            done(result);
            return;
          }
          // Current activity's latest HISTORY_LIMIT ordinals are protected from
          // collection. Older pending/baseline originals remain raw-exportable.
          const visible = IDBKeyRange.bound(
              ['TICK', runId, activityId, total - retained + 1],
              ['TICK', runId, activityId, total],
            ),
            visibleCount = index.count(visible);
          visibleCount.onsuccess = () => {
            try {
              if (visibleCount.result !== retained) invalid();
              const cursor = index.openCursor(visible);
              let skipped = false;
              cursor.onsuccess = () => {
                try {
                  const entry = cursor.result;
                  if (!entry) invalid();
                  if (!skipped && selected * pageSize) {
                    skipped = true;
                    entry.advance(selected * pageSize);
                    return;
                  }
                  const expected =
                    folded + selected * pageSize + result.rows.length + 1;
                  if (!Array.isArray(entry.key) || entry.key[3] !== expected)
                    invalid();
                  result.rows.push(validate(entry.value, entry.primaryKey));
                  if (
                    result.rows.length ===
                    Math.min(pageSize, retained - selected * pageSize)
                  )
                    done(result);
                  else entry.continue();
                } catch (error) {
                  abort(error);
                }
              };
            } catch (error) {
              abort(error);
            }
          };
        } catch (error) {
          abort(error);
        }
      };
    } catch (error) {
      abort(error);
    }
  };
}

/** Every backup entry from one atomic write is an indivisible group. No path parsing or random-key chronology. */
export function putRetainedBackup(
  tx: IDBTransaction,
  value: unknown,
  key: string,
) {
  const c = context(tx);
  if (typeof key !== 'string' || !key.length) invalid();
  let row = c.backups.get('transaction');
  if (!row) {
    const sequence = nextSequence(tx);
    row = {
      format: 'chenyuan-retained-backup',
      version: 1,
      kind: 'backup',
      group: 'transaction:' + sequence,
      parents: [],
      sequence,
      keys: [],
    };
    c.backups.set('transaction', row);
  }
  if (!row.keys.includes(key)) {
    row.keys.push(key);
    const existing = tx.objectStore('full-backups').count(key);
    existing.onsuccess = () => {
      if (existing.result)
        c.abort(new RuleError('RETENTION_INVALID', '备份键已存在，未覆盖原件'));
    };
  }
  row.parents = [...c.offers];
  tx.objectStore('full-backups').put(value, key);
  tx.objectStore(RETENTION_STORE).put(row, ['backup', row.group]);
}
function validateBackup(value: unknown): asserts value is BackupMeta {
  if (!value || typeof value !== 'object') invalid();
  const r = value as BackupMeta;
  if (
    r.format !== 'chenyuan-retained-backup' ||
    r.version !== 1 ||
    r.kind !== 'backup' ||
    typeof r.group !== 'string' ||
    !integer(r.sequence) ||
    r.group !== 'transaction:' + r.sequence ||
    !Array.isArray(r.parents) ||
    r.parents.some((k) => typeof k !== 'string') ||
    !Array.isArray(r.keys) ||
    !r.keys.length ||
    r.keys.some((k) => typeof k !== 'string') ||
    new Set(r.keys).size !== r.keys.length
  )
    invalid();
}
function collectBackups(
  tx: IDBTransaction,
  done: () => void,
  abort: (error: unknown) => void,
) {
  const meta = tx.objectStore(RETENTION_STORE),
    read = meta
      .index('order')
      .getAll(
        IDBKeyRange.bound(['backup', 0], ['backup', Number.MAX_SAFE_INTEGER]),
      ),
    receipts = meta
      .index('order')
      .getAll(
        IDBKeyRange.bound(['receipt', 0], ['receipt', Number.MAX_SAFE_INTEGER]),
      ),
    baseline = meta.getAll(
      IDBKeyRange.bound(['baseline-backup'], ['baseline-backup', []]),
    ),
    actual = tx.objectStore('full-backups').getAllKeys();
  let ready = 0;
  const run = () => {
    if (++ready !== 4) return;
    try {
      read.result.forEach(validateBackup);
      receipts.result.forEach(validateMeta);
      const originals: IDBValidKey[] = [];
      for (const b of baseline.result) {
        if (
          b?.format !== 'chenyuan-baseline-backup' ||
          b.version !== 1 ||
          b.key === undefined
        )
          invalid();
        originals.push(b.key);
      }
      const all = [
        ...originals,
        ...(read.result as BackupMeta[]).flatMap((r) => r.keys),
      ];
      if (
        new Set(all.map((k) => canonicalFingerprint(k))).size !== all.length ||
        fingerprintKeys(all) !== fingerprintKeys(actual.result)
      )
        invalid();
      const pending = new Set(
          receipts.result.filter((r) => r.pending).map((r) => r.key),
        ),
        old = (read.result as BackupMeta[])
          .filter((r) => !r.parents.some((p) => pending.has(p)))
          .sort((a, b) => b.sequence - a.sequence)
          .slice(BACKUP_GROUP_LIMIT);
      for (const r of old) {
        for (const key of r.keys) tx.objectStore('full-backups').delete(key);
        meta.delete(['backup', r.group]);
      }
      done();
    } catch (error) {
      abort(error);
    }
  };
  read.onsuccess = run;
  receipts.onsuccess = run;
  baseline.onsuccess = run;
  actual.onsuccess = run;
}
const fingerprintKeys = (keys: IDBValidKey[]) =>
  canonicalFingerprint([...keys].sort((a, b) => indexedDB.cmp(a, b)));

function cleanHistoryDescriptors(
  tx: IDBTransaction,
  done: () => void,
  abort: (error: unknown) => void,
) {
  const meta = tx.objectStore(RETENTION_STORE),
    rows = meta
      .index('order')
      .getAll(
        IDBKeyRange.bound(['receipt', 0], ['receipt', Number.MAX_SAFE_INTEGER]),
      ),
    activity = tx.objectStore(STATE).get('activity');
  let ready = 0;
  const run = () => {
    if (++ready !== 2) return;
    try {
      rows.result.forEach(validateMeta);
      const retained = new Set(
          rows.result
            .filter((r) => r.activityId && r.runId && r.ordinal)
            .map((r) => JSON.stringify([r.runId, r.activityId])),
        ),
        cursor = meta.openCursor(
          IDBKeyRange.bound(['history'], ['history', []]),
        );
      cursor.onsuccess = () => {
        try {
          if (!cursor.result) {
            done();
            return;
          }
          const h = cursor.result.value;
          validateHistory(h);
          if (
            !h.baseline &&
            !retained.has(JSON.stringify([h.runId, h.activityId])) &&
            !(
              h.runId === activity.result?.runId &&
              h.activityId === activity.result?.id
            )
          )
            cursor.result.delete();
          cursor.result.continue();
        } catch (error) {
          abort(error);
        }
      };
    } catch (error) {
      abort(error);
    }
  };
  rows.onsuccess = run;
  activity.onsuccess = run;
}

function collectReceipts(
  tx: IDBTransaction,
  done: () => void,
  abort: (error: unknown) => void,
) {
  const meta = tx.objectStore(RETENTION_STORE),
    read = meta
      .index('order')
      .getAll(
        IDBKeyRange.bound(['receipt', 0], ['receipt', Number.MAX_SAFE_INTEGER]),
      ),
    activity = tx.objectStore(STATE).get('activity'),
    checkpoint = tx.objectStore(STATE).get('checkpoint'),
    actualCount = tx.objectStore(RECEIPTS).count();
  let ready = 0;
  const run = () => {
    if (++ready !== 4) return;
    try {
      const rows = read.result as ReceiptMeta[];
      rows.forEach(validateMeta);
      if (
        rows.length !== actualCount.result ||
        new Set(rows.map((r) => r.sequence)).size !== rows.length ||
        rows.some((r) => r.sequence > context(tx).counter.sequence)
      )
        invalid();
      const a = activity.result,
        cp = checkpoint.result,
        protect = new Set<ReceiptMeta>(
          rows.filter((r) => r.baseline || r.pending),
        );
      const current = rows.filter(
        (r) => r.runId === a?.runId && r.activityId === a?.id,
      );
      for (const r of current.filter((r) => r.role === 'start')) protect.add(r);
      for (const r of current
        .filter((r) => r.role === 'cycle')
        .sort((x, y) => y.sequence - x.sequence)
        .slice(0, HISTORY_LIMIT))
        protect.add(r);
      const latest = current
        .filter((r) => r.windowId !== null)
        .sort((x, y) => y.sequence - x.sequence)[0];
      if (latest)
        for (const r of current)
          if (r.windowId === latest.windowId) protect.add(r);
      if (cp !== undefined)
        for (const r of rows) if (protectsCheckpoint(r, cp)) protect.add(r);
      const ordinary = rows
          .filter((r) => !protect.has(r))
          .sort((x, y) => y.sequence - x.sequence),
        remove = ordinary.slice(REPLAY_LIMIT),
        pruned = new Map<
          string,
          { runId: string; activityId: string; count: number }
        >();
      let pending = remove.length;
      if (!pending) {
        done();
        return;
      }
      const finish = () => {
        if (--pending) return;
        for (const p of pruned.values()) {
          const request = meta.get(historyKey(p.runId, p.activityId));
          request.onsuccess = () => {
            try {
              validateHistory(request.result);
              request.result.deleted += p.count;
              if (request.result.deleted > request.result.total) invalid();
              meta.put(request.result, historyKey(p.runId, p.activityId));
            } catch (error) {
              abort(error);
            }
          };
        }
        persistCounter(tx);
        done();
      };
      for (const row of remove) {
        const raw = tx.objectStore(RECEIPTS).get(row.key);
        raw.onsuccess = () => {
          try {
            if (raw.result === undefined) invalid();
            if (receiptChecksum(raw.result) !== row.checksum) {
              row.baseline = true;
              row.quarantined = true;
              meta.put(row, receiptKey(row.key));
              finish();
              return;
            }
            retireEpoch(tx, row);
            tx.objectStore(RECEIPTS).delete(row.key);
            meta.delete(receiptKey(row.key));
            if (
              row.role === 'cycle' &&
              row.runId &&
              row.activityId &&
              row.ordinal
            ) {
              const key = JSON.stringify([row.runId, row.activityId]),
                p = pruned.get(key);
              if (p) p.count++;
              else
                pruned.set(key, {
                  runId: row.runId,
                  activityId: row.activityId,
                  count: 1,
                });
            }
            finish();
          } catch (error) {
            abort(error);
          }
        };
      }
    } catch (error) {
      abort(error);
    }
  };
  read.onsuccess = run;
  activity.onsuccess = run;
  checkpoint.onsuccess = run;
  actualCount.onsuccess = run;
}
export function confirmReceiptDelivery(
  tx: IDBTransaction,
  runId: string,
  commandId: string,
  done: () => void,
  abort: (error: unknown) => void,
) {
  const meta = tx.objectStore(RETENTION_STORE),
    key = runId + ':' + commandId,
    read = meta.get(receiptKey(key));
  read.onsuccess = () => {
    try {
      validateMeta(read.result);
      const row = read.result;
      if (row.runId !== runId || row.commandId !== commandId) invalid();
      if (!row.baseline && row.receiverId !== context(tx).receiverId)
        throw new RuleError(
          'RECEIPT_NOT_DELIVERED',
          '原回复尚未交到这个接收实例，未代替确认。',
        );
      if (row.baseline || !row.pending) {
        done();
        return;
      }
      const raw = tx.objectStore(RECEIPTS).get(key);
      raw.onsuccess = () => {
        try {
          if (
            raw.result === undefined ||
            receiptChecksum(raw.result) !== row.checksum
          )
            invalid();
          const siblings = meta.index('parent').getAll(key);
          siblings.onsuccess = () => {
            try {
              if (!siblings.result.length) invalid();
              for (const r of siblings.result) {
                validateMeta(r);
                if (r.runId !== runId) invalid();
                r.pending = false;
                meta.put(r, receiptKey(r.key));
              }
              collectReceipts(
                tx,
                () =>
                  collectBackups(
                    tx,
                    () => cleanHistoryDescriptors(tx, done, abort),
                    abort,
                  ),
                abort,
              );
            } catch (error) {
              abort(error);
            }
          };
        } catch (error) {
          abort(error);
        }
      };
    } catch (error) {
      abort(error);
    }
  };
}
