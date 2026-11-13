import { versionsForGame, rulesVersion } from '../../src/full/rule-profile.ts';
import {
  newGame,
  parseGame,
  resolve,
  validateCommand,
  validateGame,
} from '../../src/full/engine.ts';
import { RuleError } from '../../src/full/errors.ts';
import {
  canonicalFingerprint as fingerprint,
  validateCommandReceipt,
} from '../../src/full/receipts.ts';
import type { Command, Game } from '../../src/full/types.ts';
import type {
  ActionResult,
  CommandReceipt,
  CommitOutcome,
  SaveCheckpoint,
} from '../../src/full/contracts.ts';
import {
  createActivity,
  pauseActivity as pauseModelActivity,
  resumeActivity as resumeModelActivity,
  completeActivity,
  validateActivity,
  validateActivityMutation,
  validateActivityPlan,
  validateActivityTick,
} from '../../src/full/activity.ts';
import type {
  Activity,
  ActivityMutation,
  ActivityOutcome,
  ActivityPlan,
  ActivityTick,
} from '../../src/full/activity.ts';
import {
  activityReceipt,
  scheduledActivityReceipt,
  validateActivityReceipt,
  type ActivityReceiptInput,
} from './activity-persistence';
import { validateScheduledActivity } from '../../src/full/scheduled-activity.ts';
import type { AwaySchedule } from '../../src/full/scheduled-activity.ts';
import {
  scheduledProgress,
  scheduledReceipt,
  validateScheduledReceipt,
  type ScheduledInput,
} from './scheduled-persistence.ts';
import { summarizeAway, type AwaySummary } from './away-summary.ts';
import {
  validateConfigurationIntent,
  type ConfigurationIntent,
} from '../../src/full/configuration.ts';
import {
  configurationReceipt,
  validateConfigurationReceipt,
} from './configuration-persistence';
import type { DirectIntent } from '../../src/full/direct-actions.ts';
import { validateDirectIntent } from '../../src/full/direct-actions.ts';
import { directReceipt, validateDirectReceipt } from './direct-persistence';
import {
  RETENTION_STORE,
  REPLAY_LIMIT,
  beginReceiptRetention,
  createReceiptRetention,
  storedReceiptEpoch,
  rememberReceiptOffer,
  offeredReceiptKeys,
  issueReceiptId,
  requireCurrentReceiptId,
  putRetainedReceipt,
  clearRetainedReceipts,
  confirmReceiptDelivery,
  createReceiptReceiver,
  receiptReceiverState,
  type ReceiptReceiver,
  readRetainedHistory,
  putRetainedBackup,
  type ReceiptAccess,
} from './receipt-retention';
export { createReceiptReceiver } from './receipt-retention';
export type {
  ActivityMutation,
  ActivityOutcome,
  ActivityPlan,
  ActivityTick,
} from '../../src/full/activity.ts';

export const FULL_DB_NAME = 'chenyuan-playable-v1';
export const FULL_DB_VERSION = 11;
export const FULL_STATE_STORE = 'full-state';
export const FULL_RECEIPT_STORE = 'full-receipts';
export const FULL_BACKUP_STORE = 'full-backups';
export const FULL_SCHEDULE_STORE = 'full-schedules';
const legacyStores = [FULL_STATE_STORE, FULL_RECEIPT_STORE, FULL_BACKUP_STORE];
const preRetentionStores = [...legacyStores, FULL_SCHEDULE_STORE];
const stores = [...preRetentionStores, RETENTION_STORE];
export interface ScheduledOutcome extends ActivityOutcome {
  schedule?: AwaySchedule;
  cycles: number;
  more: boolean;
  committed: Array<{
    before: Game;
    after: Game;
    command: Command;
    result: ActionResult;
  }>;
}
function rejectScheduledReceipt(value: unknown, current: Game): void {
  if (
    value &&
    typeof value === 'object' &&
    'format' in value &&
    value.format === 'chenyuan-scheduled-receipt'
  ) {
    validateScheduledReceipt(value, current);
    throw new RuleError('COMMAND_ID_REUSED', '同一编号已用于离开安排');
  }
}
function readStoredActivity(
  tx: IDBTransaction,
  current: Game | undefined,
  use: (activity: Activity | null, schedule?: AwaySchedule) => void,
  abort: (error: unknown) => void,
): void {
  const state = tx.objectStore(FULL_STATE_STORE),
    read = state.get('activity');
  const deliverSchedule = (activity: Activity | null) => {
    const clock = tx.objectStore(FULL_SCHEDULE_STORE),
      request = clock.get('current');
    request.onsuccess = () => {
      const count = clock.count();
      count.onsuccess = () => {
        try {
          if (count.result !== (request.result === undefined ? 0 : 1))
            throw new RuleError(
              'SCHEDULE_INVALID',
              '离开时钟包含缺失内容或无法确认的记录，原件保留',
            );
          if (request.result !== undefined) {
            if (!activity || !current)
              throw new RuleError(
                'SCHEDULE_INVALID',
                '离开时钟缺少所属活动，原件保留',
              );
            const record = { activity, schedule: request.result };
            validateScheduledActivity(record, current);
            use(activity, record.schedule);
            return;
          }
          use(activity);
        } catch (error) {
          abort(error);
        }
      };
    };
  };
  const deliver = (raw: unknown) => {
    try {
      if (!current)
        throw new RuleError('ACTIVITY_INVALID', '活动缺少所属人生，原记录保留');
      validateActivity(raw, current);
      deliverSchedule(raw);
    } catch (error) {
      abort(error);
    }
  };
  read.onsuccess = () => {
    if (read.result !== undefined) {
      deliver(read.result);
      return;
    }
    const count = state.count('activity');
    count.onsuccess = () => {
      try {
        if (count.result)
          throw new RuleError(
            'ACTIVITY_INVALID',
            '活动记录存在但内容缺失，原记录保留',
          );
        deliverSchedule(null);
      } catch (error) {
        abort(error);
      }
    };
  };
}
function archiveSchedule(
  tx: IDBTransaction,
  prefix: string,
  current: Game | undefined,
  activity: Activity | null,
  abort: (error: unknown) => void,
) {
  const clocks = tx.objectStore(FULL_SCHEDULE_STORE),
    read = clocks.get('current');
  read.onsuccess = () => {
    if (read.result !== undefined)
      putRetainedBackup(tx, read.result, prefix + '/schedule');
  };
  // Queue the read before the caller can clear receipts. Its result belongs to
  // this same transaction even when the archive callback runs after that clear.
  if (current && activity) {
    const runPrefix = current.core.runId + ':',
      records = tx
        .objectStore(FULL_RECEIPT_STORE)
        .getAll(IDBKeyRange.bound(runPrefix, runPrefix + '\uffff'));
    records.onsuccess = () => {
      try {
        if (read.result === undefined) return;
        const values = records.result.filter(
          (value) => value?.format === 'chenyuan-scheduled-receipt',
        );
        const summary = summarizeAway(current, activity, read.result, values);
        if (summary) {
          const receipts = values.filter(
            (value) =>
              value.input.kind === 'ADVANCE' &&
              value.proof.recordAfter.activity.id === activity.id &&
              (value.proof.scheduleBefore?.window?.id ??
                value.input.mutation.commandId) === summary.id &&
              value.proof.cycles > 0,
          );
          putRetainedBackup(
            tx,
            {
              format: 'chenyuan-away-summary-archive',
              version: 1,
              summary,
              receipts,
            },
            prefix + '/away-summary',
          );
        }
      } catch (error) {
        abort(error);
      }
    };
  }
  clocks.delete('current');
}
function archiveActivity(
  tx: IDBTransaction,
  activity: Activity | null,
  prefix: string,
  current: Game | undefined,
  abort: (error: unknown) => void,
): void {
  if (activity)
    putRetainedBackup(tx, structuredClone(activity), prefix + '/activity');
  archiveSchedule(tx, prefix, current, activity, abort);
  tx.objectStore(FULL_STATE_STORE).delete('activity');
}
function invalidateActivity(activity: Activity, state: Game): Activity {
  const stopped: Activity = {
    ...activity,
    revision: activity.revision + 1,
    generation: activity.generation + 1,
    gameRevision: state.core.revision,
    status: 'stopped',
    nextCommand: null,
    startedAt: null,
    dueAt: null,
    stopReason: {
      code: 'STATE_CHANGED',
      message: '进度已改变，请重新安排活动；已完成的积累保留',
    },
  };
  validateActivity(stopped, state);
  return stopped;
}
function readReceipt(
  store: IDBObjectStore,
  key: string,
  access: ReceiptAccess,
  use: (value: unknown) => void,
  abort: (error: unknown) => void,
): void {
  const request = store.get(key);
  const deliver = (value: unknown) => {
    try {
      if (value === undefined)
        requireCurrentReceiptId(store.transaction, access);
      use(value);
      if (value !== undefined) rememberReceiptOffer(store.transaction, key);
    } catch (error) {
      abort(error);
    }
  };
  request.onsuccess = () => {
    if (request.result !== undefined) {
      deliver(request.result);
      return;
    }
    const present = store.count(key);
    present.onsuccess = () =>
      present.result
        ? abort(
            new RuleError(
              'RECEIPT_INVALID',
              '回执记录存在但内容缺失，未重新执行',
            ),
          )
        : deliver(undefined);
  };
}

export interface SaveToken {
  runId: string;
  revision: number;
}
/** runId is the fresh destination; expectedRunId/revision identify the replaced run. */
export interface SaveMutation {
  commandId: string;
  runId: string;
  expectedRunId: string | null;
  expectedRevision: number;
}
export interface ControlOutcome {
  state: Game;
  replayed: boolean;
}
export interface ActivityHistoryPage {
  rows: Array<{ command: Command; result: ActionResult; activity: Activity }>;
  page: number;
  pages: number;
  total: number;
  retained: number;
  folded: number;
}
interface ControlReceipt {
  format: 'chenyuan-control-receipt';
  version: 1;
  kind: 'CREATE' | 'IMPORT' | 'MIGRATE' | 'RESTORE';
  mutation: SaveMutation;
  fingerprint: string;
}
interface CheckpointScope {
  format: 'chenyuan-checkpoint-scope';
  version: 1;
  runId: string;
  sourceRunId: string;
  sourceRevision: number;
  kind: SaveCheckpoint['kind'];
}
export interface RawDatabaseBackup {
  format: 'chenyuan-raw-database-backup';
  version: 1;
  database: { name: string; version: number };
  stores: { name: string; entries: { key: IDBValidKey; value: unknown }[] }[];
}
function validateControlReceipt(
  value: unknown,
): asserts value is ControlReceipt {
  if (!value || typeof value !== 'object')
    throw new RuleError('RECEIPT_INVALID', '存档操作回执损坏');
  const receipt = value as ControlReceipt;
  if (
    Object.keys(value).length !== 5 ||
    receipt.format !== 'chenyuan-control-receipt' ||
    receipt.version !== 1 ||
    !['CREATE', 'IMPORT', 'MIGRATE', 'RESTORE'].includes(receipt.kind) ||
    typeof receipt.fingerprint !== 'string' ||
    !receipt.fingerprint.length
  ) {
    throw new RuleError('RECEIPT_INVALID', '存档操作回执损坏');
  }
  try {
    validateMutation(receipt.mutation);
  } catch {
    throw new RuleError('RECEIPT_INVALID', '存档操作回执身份损坏');
  }
}
function checkpointScope(cp: SaveCheckpoint, runId: string): CheckpointScope {
  return {
    format: 'chenyuan-checkpoint-scope',
    version: 1,
    runId,
    sourceRunId: cp.sourceRunId,
    sourceRevision: cp.sourceRevision,
    kind: cp.kind,
  };
}
function validateScope(
  value: unknown,
  cp: SaveCheckpoint,
  current: Game,
): void {
  if (
    rulesVersion(cp.snapshot) !== rulesVersion(current) ||
    fingerprint(value) !== fingerprint(checkpointScope(cp, current.core.runId))
  ) {
    throw new RuleError(
      'CHECKPOINT_OWNERSHIP',
      '检查点与当前人生的归属不一致，原件保留',
    );
  }
}
function ensureCheckpointScope(
  tx: IDBTransaction,
  current: Game,
  done: () => void,
  abort: (error: unknown) => void,
): void {
  const state = tx.objectStore(FULL_STATE_STORE),
    read = state.get('checkpoint');
  read.onsuccess = () => {
    try {
      const cp = read.result;
      if (cp !== undefined) {
        validateCheckpoint(cp);
        if (rulesVersion(cp.snapshot) !== rulesVersion(current))
          throw new RuleError(
            'CHECKPOINT_OWNERSHIP',
            '检查点与当前人生的规则不一致，原件保留',
          );
      }
      const owner = state.get('checkpoint-owner');
      owner.onsuccess = () => {
        try {
          if (cp === undefined) {
            if (owner.result !== undefined)
              throw new RuleError(
                'CHECKPOINT_INVALID',
                '检查点归属记录缺少对应快照',
              );
            done();
            return;
          }
          if (owner.result !== undefined) {
            validateScope(owner.result, cp, current);
            done();
            return;
          }
          const writeScope = () => {
            const mutation: SaveMutation = {
              commandId: crypto.randomUUID(),
              runId: current.core.runId,
              expectedRunId: current.core.runId,
              expectedRevision: current.core.revision,
            };
            validateMutation(mutation);
            state.put(
              checkpointScope(cp, current.core.runId),
              'checkpoint-owner',
            );
            putRetainedBackup(
              tx,
              { kind: 'checkpoint-scope', mutation, checkpoint: cp },
              'scope/' + mutation.commandId,
            );
            done();
          };
          if (cp.sourceRunId === current.core.runId) {
            writeScope();
            return;
          }
          // T04 migrations changed the active run but kept the checkpoint source.
          // Only its archived original records can establish that relationship.
          const backups = tx.objectStore(FULL_BACKUP_STORE),
            cursor = backups.openCursor();
          cursor.onsuccess = () => {
            try {
              if (!cursor.result)
                throw new RuleError(
                  'CHECKPOINT_OWNERSHIP',
                  '无法确认旧检查点归属，原记录保留',
                );
              const value = cursor.result.value,
                key = cursor.result.key;
              if (
                typeof key !== 'string' ||
                !key.endsWith('/identity') ||
                !['legacy-v1', 'content'].includes(value?.kind) ||
                value.mutation?.runId !== current.core.runId ||
                value.mutation?.expectedRunId !== cp.sourceRunId ||
                value.mutation.expectedRevision < cp.sourceRevision
              ) {
                cursor.result.continue();
                return;
              }
              validateMutation(value.mutation);
              const prefix = key.slice(0, -'/identity'.length),
                original = backups.get(prefix + '/current');
              original.onsuccess = () => {
                try {
                  const source = parseGame(JSON.stringify(original.result));
                  if (
                    source.core.runId !== cp.sourceRunId ||
                    source.core.revision < cp.sourceRevision
                  )
                    throw new RuleError(
                      'CHECKPOINT_OWNERSHIP',
                      '旧检查点归档身份不一致',
                    );
                  const originalCP = backups.get(prefix + '/checkpoint');
                  originalCP.onsuccess = () => {
                    try {
                      const raw =
                        value.kind === 'content'
                          ? originalCP.result?.snapshot
                          : originalCP.result;
                      if (
                        fingerprint(parseGame(JSON.stringify(raw))) !==
                        fingerprint(cp.snapshot)
                      )
                        throw new RuleError(
                          'CHECKPOINT_OWNERSHIP',
                          '旧检查点与原件不一致',
                        );
                      writeScope();
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
    } catch (error) {
      abort(error);
    }
  };
}

/** Current archives are JSON records; unsupported structured values reject rather than silently disappear. */
export function rawBackupText(backup: RawDatabaseBackup): string {
  const path = new Set<object>();
  const check = (value: unknown): void => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean'
    )
      return;
    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      !Object.is(value, -0)
    )
      return;
    if (
      !value ||
      typeof value !== 'object' ||
      path.has(value) ||
      (!Array.isArray(value) &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null)
    ) {
      throw new RuleError(
        'RAW_EXPORT_UNSUPPORTED',
        '原件包含此版本无法无损编码的数据，请使用匹配版本导出；原件未改动',
      );
    }
    path.add(value);
    if (
      Array.isArray(value) &&
      (Object.keys(value).length !== value.length ||
        Array.from({ length: value.length }, (_, i) => i).some(
          (i) => !Object.hasOwn(value, i),
        ))
    )
      throw new RuleError(
        'RAW_EXPORT_UNSUPPORTED',
        '原件数组无法无损编码，原件未改动',
      );
    for (const child of Object.values(value)) check(child);
    path.delete(value);
  };
  const stores = backup.stores.map((store) => ({
    name: store.name,
    entries: store.entries.map((entry) => {
      check(entry.key);
      if (entry.value === undefined)
        return { key: entry.key, valueEncoding: 'undefined' };
      check(entry.value);
      return { key: entry.key, valueEncoding: 'json', value: entry.value };
    }),
  }));
  return JSON.stringify({ ...backup, stores });
}
export const saveToken = (game: Game): SaveToken => ({
  runId: game.core.runId,
  revision: game.core.revision,
});
function validText(value: unknown): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= 100
  );
}
function validateMutation(value: SaveMutation): void {
  if (
    !value ||
    Object.keys(value).length !== 4 ||
    Object.keys(value).some(
      (key) =>
        !['commandId', 'runId', 'expectedRunId', 'expectedRevision'].includes(
          key,
        ),
    ) ||
    !validText(value.commandId) ||
    !validText(value.runId) ||
    (value.expectedRunId !== null && !validText(value.expectedRunId)) ||
    !Number.isSafeInteger(value.expectedRevision) ||
    value.expectedRevision < 0 ||
    (value.expectedRunId === null && value.expectedRevision !== 0)
  ) {
    throw new RuleError('INVALID_MUTATION', '存档操作的身份或版本无效');
  }
}
function reidentify(game: Game, runId: string): Game {
  const next = structuredClone(game);
  next.core.runId = runId;
  next.core.revision = 0;
  if (next.core.activeEvent)
    next.core.activeEvent.instanceId = runId + ':' + next.core.activeEvent.id;
  validateGame(next);
  return next;
}
function checkpoint(
  snapshot: Game,
  kind: SaveCheckpoint['kind'],
): SaveCheckpoint {
  return {
    format: 'chenyuan-checkpoint',
    version: 1,
    kind,
    sourceRunId: snapshot.core.runId,
    sourceRevision: snapshot.core.revision,
    versions: versionsForGame(snapshot),
    snapshot: structuredClone(snapshot),
  };
}
function validateCheckpoint(value: unknown): asserts value is SaveCheckpoint {
  if (!value || typeof value !== 'object')
    throw new RuleError('CHECKPOINT_INVALID', '检查点格式无效');
  const c = value as SaveCheckpoint;
  if (
    c.format !== 'chenyuan-checkpoint' ||
    c.version !== 1 ||
    !['breakthrough', 'trial'].includes(c.kind)
  ) {
    throw new RuleError('CHECKPOINT_INVALID', '检查点版本或用途无效');
  }
  validateGame(c.snapshot);
  if (
    c.sourceRunId !== c.snapshot.core.runId ||
    c.sourceRevision !== c.snapshot.core.revision ||
    fingerprint(c.versions) !== fingerprint(versionsForGame(c.snapshot))
  ) {
    throw new RuleError('CHECKPOINT_INVALID', '检查点身份或内容版本不一致');
  }
  try {
    const out = resolve(c.snapshot, {
      type: c.kind === 'trial' ? 'START_TRIAL' : 'BREAKTHROUGH',
      commandId: 'checkpoint-validation',
      runId: c.sourceRunId,
      expectedRevision: c.sourceRevision,
    });
    if (out.checkpointKind !== c.kind)
      throw new Error('checkpoint kind mismatch');
  } catch {
    throw new RuleError('CHECKPOINT_INVALID', '检查点不是有效的行动前准备状态');
  }
}
function storageFailure(error: unknown): Error {
  if (error instanceof RuleError) return error;
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'QuotaExceededError'
  )
    return new RuleError(
      'STORAGE_QUOTA',
      '存储空间不足，本次操作未提交，原进度保留',
    );
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'SecurityError'
  )
    return new RuleError('STORAGE_DENIED', '本地存储不可访问，已有数据未改动');
  return new RuleError(
    'STORAGE_ABORTED',
    '存储事务失败，本次操作未提交，原进度保留',
  );
}

function migrateTransaction(
  tx: IDBTransaction,
  complete: (value: void) => void,
  abort: (error: unknown) => void,
): void {
  const state = tx.objectStore(FULL_STATE_STORE),
    request = state.get('current');
  request.onsuccess = () => {
    try {
      if (request.result === undefined) {
        const schedules = tx.objectStore(FULL_SCHEDULE_STORE).count();
        schedules.onsuccess = () => {
          if (schedules.result)
            abort(
              new RuleError(
                'SCHEDULE_INVALID',
                '离开时钟缺少所属人生，原件保留',
              ),
            );
        };
        const count = state.count();
        count.onsuccess = () => {
          if (count.result)
            abort(
              new RuleError(
                'MIGRATION_SOURCE_MISSING',
                '主存档缺失，已有备份保留，请先恢复或导出',
              ),
            );
          else if (tx.db.objectStoreNames.contains('state')) {
            const legacy = tx.objectStore('state').count();
            legacy.onsuccess = () =>
              legacy.result
                ? abort(
                    new RuleError(
                      'MIGRATION_SOURCE_MISSING',
                      'full主档缺失但旧资料仍在，未将其当作新空档',
                    ),
                  )
                : complete(undefined);
          } else complete(undefined);
        };
        return;
      }
      const raw = request.result;
      try {
        validateGame(raw);
        readStoredActivity(
          tx,
          raw,
          () =>
            ensureCheckpointScope(tx, raw, () => complete(undefined), abort),
          abort,
        );
        return;
      } catch (error) {
        if (!(error instanceof RuleError) || error.code !== 'SAVE_VERSION')
          throw error;
      }
      const migrated = parseGame(JSON.stringify(raw));
      const ownerRead = state.get('checkpoint-owner');
      let oldOwner: unknown;
      ownerRead.onsuccess = () => {
        oldOwner = ownerRead.result;
      };
      const readPrevious = state.get('previous');
      let previousRaw: unknown;
      readPrevious.onsuccess = () => {
        previousRaw = readPrevious.result;
      };
      const readActivity = state.get('activity');
      let activityRaw: unknown;
      readActivity.onsuccess = () => {
        activityRaw = readActivity.result;
      };
      const readCheckpoint = state.get('checkpoint');
      readCheckpoint.onsuccess = () => {
        try {
          const convertedPrevious =
            previousRaw === undefined
              ? null
              : parseGame(JSON.stringify(previousRaw));
          let convertedCheckpoint: SaveCheckpoint | null = null;
          if (readCheckpoint.result !== undefined) {
            const old = readCheckpoint.result as SaveCheckpoint;
            if (
              old.format !== 'chenyuan-checkpoint' ||
              old.version !== 1 ||
              !['breakthrough', 'trial'].includes(old.kind)
            )
              throw new RuleError('CHECKPOINT_INVALID', '旧检查点格式无效');
            const snapshot = parseGame(JSON.stringify(old.snapshot));
            const originalVersions = {
              format: old.snapshot.format,
              version: old.snapshot.version,
              schemaVersion: old.snapshot.core.schemaVersion,
              contentVersion: old.snapshot.core.contentVersion,
              balanceVersion: old.snapshot.core.balanceVersion,
            };
            if (fingerprint(old.versions) !== fingerprint(originalVersions))
              throw new RuleError(
                'CHECKPOINT_INVALID',
                '旧检查点版本标记不一致',
              );
            if (
              old.sourceRunId !== snapshot.core.runId ||
              old.sourceRevision !== snapshot.core.revision
            )
              throw new RuleError('CHECKPOINT_INVALID', '旧检查点身份不一致');
            convertedCheckpoint = checkpoint(snapshot, old.kind);
            if (oldOwner !== undefined)
              validateScope(oldOwner, convertedCheckpoint, migrated);
            else if (old.sourceRunId !== migrated.core.runId)
              throw new RuleError(
                'CHECKPOINT_OWNERSHIP',
                '旧内容检查点属于另一人生，原记录保留',
              );
            validateCheckpoint(convertedCheckpoint);
          }
          const mutation: SaveMutation = {
            commandId: crypto.randomUUID(),
            runId: crypto.randomUUID(),
            expectedRunId: migrated.core.runId,
            expectedRevision: migrated.core.revision,
          };
          validateMutation(mutation);
          const backup = tx.objectStore(FULL_BACKUP_STORE),
            prefix = 'migration/' + mutation.commandId;
          // A running plan cannot survive a content migration or a new run identity.
          if (activityRaw !== undefined) {
            validateActivity(activityRaw);
            if (activityRaw.runId !== migrated.core.runId)
              throw new RuleError(
                'ACTIVITY_INVALID',
                '旧活动不属于迁移来源，原记录保留',
              );
            putRetainedBackup(tx, activityRaw, prefix + '/activity');
          }
          const activityPresent = state.count('activity');
          activityPresent.onsuccess = () => {
            if (activityRaw === undefined && activityPresent.result)
              abort(
                new RuleError(
                  'ACTIVITY_INVALID',
                  '旧活动记录内容缺失，迁移未提交',
                ),
              );
          };
          state.delete('activity');
          putRetainedBackup(tx, raw, prefix + '/current');
          if (oldOwner !== undefined)
            putRetainedBackup(tx, oldOwner, prefix + '/checkpoint-owner');
          if (previousRaw !== undefined)
            putRetainedBackup(tx, previousRaw, prefix + '/previous');
          if (readCheckpoint.result !== undefined)
            putRetainedBackup(
              tx,
              readCheckpoint.result,
              prefix + '/checkpoint',
            );
          putRetainedBackup(
            tx,
            { kind: 'content', mutation },
            prefix + '/identity',
          );
          state.put(reidentify(migrated, mutation.runId), 'current');
          if (convertedPrevious) state.put(convertedPrevious, 'previous');
          else state.delete('previous');
          if (convertedCheckpoint) {
            state.put(convertedCheckpoint, 'checkpoint');
            state.put(
              checkpointScope(convertedCheckpoint, mutation.runId),
              'checkpoint-owner',
            );
          } else if (oldOwner !== undefined)
            throw new RuleError('CHECKPOINT_INVALID', '旧归属记录缺少检查点');
          const receipt: ControlReceipt = {
            format: 'chenyuan-control-receipt',
            version: 1,
            kind: 'MIGRATE',
            mutation,
            fingerprint: fingerprint(raw),
          };
          const receipts = tx.objectStore(FULL_RECEIPT_STORE),
            cursor = receipts.openCursor();
          let receiptIndex = 0;
          cursor.onsuccess = () => {
            try {
              if (cursor.result) {
                const index = receiptIndex++;
                putRetainedBackup(
                  tx,
                  cursor.result.value,
                  prefix + '/receipts/' + index,
                );
                putRetainedBackup(
                  tx,
                  cursor.result.key,
                  prefix + '/receipt-keys/' + index,
                );
                cursor.result.continue();
              } else {
                clearRetainedReceipts(tx);
                putRetainedReceipt(
                  tx,
                  receipt,
                  mutation.runId + ':' + mutation.commandId,
                );
                complete(undefined);
              }
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

/** No state is returned until the containing transaction completes. */
export class FullSaveRepository {
  private closed = false;
  private receiptEpoch = 0;
  issueCommandId(): string {
    this.assertOpen();
    return issueReceiptId(this.receiptEpoch);
  }
  confirmDelivery(runId: string, commandId: string): Promise<void> {
    this.assertOpen();
    if (!validText(runId) || !validText(commandId))
      throw new RuleError('INVALID_MUTATION', '本次记录身份无效');
    const key = runId + ':' + commandId;
    const receiver = receiptReceiverState(this.receiver, this.db.name);
    // A committed cleanup whose response was lost is idempotent within the
    // same logical receiver, including reconnect; no second storage write.
    if (receiver.confirmed.has(key)) return Promise.resolve();
    if (!receiver.offers.has(key))
      throw new RuleError(
        'RECEIPT_NOT_DELIVERED',
        '这个接收实例尚未取得原回复，未代替确认。',
      );
    return this.transaction('readwrite', (tx, complete, abort) =>
      confirmReceiptDelivery(
        tx,
        runId,
        commandId,
        () => complete(undefined),
        abort,
      ),
    ).then(() => {
      receiver.offers.delete(key);
      receiver.confirmed.delete(key);
      receiver.confirmed.add(key);
      if (receiver.confirmed.size > REPLAY_LIMIT)
        receiver.confirmed.delete(receiver.confirmed.values().next().value!);
    });
  }
  private constructor(
    private readonly db: IDBDatabase,
    private readonly receiver: ReceiptReceiver,
  ) {
    db.onversionchange = () => this.close();
  }
  static async open(
    name = FULL_DB_NAME,
    receiver = createReceiptReceiver(),
  ): Promise<FullSaveRepository> {
    receiptReceiverState(receiver, name);
    if (!globalThis.indexedDB)
      throw new RuleError(
        'STORAGE_UNAVAILABLE',
        '浏览器未提供本地存储，未创建临时存档',
      );
    const db = await new Promise<IDBDatabase>((accept, reject) => {
      const request = indexedDB.open(name, FULL_DB_VERSION);
      let abandoned = false,
        failure: unknown;
      request.onblocked = () => {
        abandoned = true;
        reject(
          new RuleError(
            'STORAGE_BLOCKED',
            '存档被旧页面占用，请关闭旧页面后重试',
          ),
        );
      };
      request.onupgradeneeded = (event) => {
        const transaction = request.transaction!,
          connection = request.result;
        if (abandoned) {
          transaction.abort();
          return;
        }
        const required =
          event.oldVersion >= 10 ? preRetentionStores : legacyStores;
        if (
          (event.oldVersion >= 2 &&
            required.some(
              (store) => !connection.objectStoreNames.contains(store),
            )) ||
          (event.oldVersion === 1 &&
            (!connection.objectStoreNames.contains('state') ||
              !connection.objectStoreNames.contains('receipts')))
        ) {
          failure = new RuleError(
            'DB_SCHEMA',
            '数据库结构不匹配，原件保留，请导出或使用匹配版本',
          );
          transaction.abort();
          return;
        }
        if (
          event.oldVersion > 0 &&
          event.oldVersion < 11 &&
          connection.objectStoreNames.contains(RETENTION_STORE)
        ) {
          failure = new RuleError(
            'DB_SCHEMA',
            '旧数据库含有无法确认的留存信息，原件保留',
          );
          transaction.abort();
          return;
        }
        if (
          event.oldVersion > 0 &&
          event.oldVersion < 10 &&
          connection.objectStoreNames.contains(FULL_SCHEDULE_STORE)
        ) {
          failure = new RuleError(
            'DB_SCHEMA',
            '旧数据库含有无法确认的离开时钟，原件保留',
          );
          transaction.abort();
          return;
        }
        for (const store of stores)
          if (!connection.objectStoreNames.contains(store))
            connection.createObjectStore(store);
        createReceiptRetention(connection, transaction, (error) => {
          failure = error;
          transaction.abort();
        });
        if (event.oldVersion >= 2) {
          migrateTransaction(
            transaction,
            () => {},
            (error) => {
              failure = error;
              transaction.abort();
            },
          );
          return;
        }
        if (!connection.objectStoreNames.contains('state')) return;
        const old = transaction.objectStore('state'),
          records: Record<string, unknown> = {};
        let remaining = 3;
        for (const key of ['current', 'previous', 'checkpoint']) {
          const read = old.get(key);
          read.onsuccess = () => {
            records[key] = read.result;
            if (--remaining) return;
            try {
              // Validate everything that will become active before enqueuing writes.
              if (records.current === undefined) {
                const count = old.count();
                count.onsuccess = () => {
                  if (count.result) {
                    failure = new RuleError(
                      'MIGRATION_SOURCE_MISSING',
                      '主存档缺失，旧记录保留，请先恢复或导出',
                    );
                    transaction.abort();
                  }
                };
                return;
              }
              const source = parseGame(JSON.stringify(records.current));
              const previous =
                records.previous === undefined
                  ? null
                  : parseGame(JSON.stringify(records.previous));
              const priorCheckpoint =
                records.checkpoint === undefined
                  ? null
                  : parseGame(JSON.stringify(records.checkpoint));
              if (
                priorCheckpoint &&
                priorCheckpoint.core.runId !== source.core.runId
              )
                throw new RuleError(
                  'CHECKPOINT_OWNERSHIP',
                  '旧检查点属于另一人生，原记录保留',
                );
              const preparedCheckpoint = priorCheckpoint
                ? checkpoint(priorCheckpoint, 'breakthrough')
                : null;
              if (preparedCheckpoint) validateCheckpoint(preparedCheckpoint);
              const mutation: SaveMutation = {
                commandId: crypto.randomUUID(),
                runId: crypto.randomUUID(),
                expectedRunId: source.core.runId,
                expectedRevision: source.core.revision,
              };
              validateMutation(mutation);
              const backup = transaction.objectStore(FULL_BACKUP_STORE),
                prefix = 'migration/' + mutation.commandId;
              for (const [key, raw] of Object.entries(records))
                if (raw !== undefined)
                  putRetainedBackup(transaction, raw, prefix + '/' + key);
              putRetainedBackup(
                transaction,
                { kind: 'legacy-v1', mutation },
                prefix + '/identity',
              );
              transaction
                .objectStore(FULL_STATE_STORE)
                .put(reidentify(source, mutation.runId), 'current');
              if (previous)
                transaction
                  .objectStore(FULL_STATE_STORE)
                  .put(previous, 'previous');
              if (preparedCheckpoint) {
                transaction
                  .objectStore(FULL_STATE_STORE)
                  .put(preparedCheckpoint, 'checkpoint');
                transaction
                  .objectStore(FULL_STATE_STORE)
                  .put(
                    checkpointScope(preparedCheckpoint, mutation.runId),
                    'checkpoint-owner',
                  );
              }
              const receipt: ControlReceipt = {
                format: 'chenyuan-control-receipt',
                version: 1,
                kind: 'MIGRATE',
                mutation,
                fingerprint: fingerprint(records.current),
              };
              putRetainedReceipt(
                transaction,
                receipt,
                mutation.runId + ':' + mutation.commandId,
              );
            } catch (error) {
              failure = error;
              transaction.abort();
            }
          };
        }
      };
      request.onerror = () =>
        reject(
          failure
            ? storageFailure(failure)
            : request.error?.name === 'VersionError'
              ? new RuleError(
                  'DB_VERSION',
                  '存档数据库版本较新，请保留数据并使用匹配版本',
                )
              : storageFailure(request.error),
        );
      request.onsuccess = () => {
        if (abandoned) {
          request.result.close();
          return;
        }
        if (
          stores.some(
            (store) => !request.result.objectStoreNames.contains(store),
          )
        ) {
          request.result.close();
          reject(new RuleError('DB_SCHEMA', '数据库结构不匹配，未建立空档'));
          return;
        }
        accept(request.result);
      };
    }).catch((error) => {
      throw storageFailure(error);
    });
    const repository = new FullSaveRepository(db, receiver);
    try {
      await repository.migrateContent();
      return repository;
    } catch (error) {
      repository.close();
      throw error;
    }
  }
  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.db.close();
    }
  }
  /** Check this repository's lifecycle without opening or cancelling a transaction. */
  ensureOpen(): void {
    this.assertOpen();
  }
  /** Read without choosing a database version or running any migration. */
  static async exportRaw(
    name = FULL_DB_NAME,
  ): Promise<RawDatabaseBackup | null> {
    if (!globalThis.indexedDB)
      throw new RuleError('STORAGE_UNAVAILABLE', '浏览器未提供本地存储');
    // Opening an absent name can leave a version-0 catalog entry in WebKit even
    // when its upgrade aborts. Enumerate first so backup never probes empty names.
    if (typeof indexedDB.databases !== 'function')
      throw new RuleError(
        'RAW_BACKUP_UNSUPPORTED',
        '浏览器不支持只读数据库查询，请保留数据并使用支持的浏览器导出',
      );
    let databases: IDBDatabaseInfo[];
    try {
      databases = await indexedDB.databases();
    } catch (error) {
      throw storageFailure(error);
    }
    if (!databases.some((database) => database.name === name)) return null;
    return new Promise<RawDatabaseBackup | null>((accept, reject) => {
      let absent = false,
        abandoned = false;
      const request = indexedDB.open(name);
      request.onupgradeneeded = () => {
        absent = true;
        request.transaction!.abort();
      };
      request.onblocked = () => {
        abandoned = true;
        reject(
          new RuleError(
            'STORAGE_BLOCKED',
            '数据库正在更新，请关闭占用页面后再导出',
          ),
        );
      };
      request.onerror = () =>
        absent ? accept(null) : reject(storageFailure(request.error));
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) {
          db.close();
          return;
        }
        db.onversionchange = () => db.close();
        const names = Array.from(db.objectStoreNames);
        const result: RawDatabaseBackup = {
          format: 'chenyuan-raw-database-backup',
          version: 1,
          database: { name, version: db.version },
          stores: names.map((name) => ({ name, entries: [] })),
        };
        if (!names.length) {
          db.close();
          accept(result);
          return;
        }
        const tx = db.transaction(names, 'readonly');
        for (const store of result.stores) {
          const cursor = tx.objectStore(store.name).openCursor();
          cursor.onsuccess = () => {
            if (!cursor.result) return;
            store.entries.push({
              key: cursor.result.key,
              value: cursor.result.value,
            });
            cursor.result.continue();
          };
        }
        tx.oncomplete = () => {
          db.close();
          accept(result);
        };
        tx.onabort = () => {
          db.close();
          reject(storageFailure(tx.error));
        };
      };
    }).catch((error) => {
      throw storageFailure(error);
    });
  }
  private assertOpen(): void {
    if (this.closed)
      throw new RuleError('STORAGE_CLOSED', '存档连接已更新或关闭，请重新载入');
  }
  private transaction<T>(
    mode: IDBTransactionMode,
    operation: (
      tx: IDBTransaction,
      complete: (value: T) => void,
      abort: (error: unknown) => void,
    ) => void,
  ): Promise<T> {
    return new Promise((accept, reject) => {
      this.assertOpen();
      let tx: IDBTransaction;
      try {
        tx = this.db.transaction(
          this.db.objectStoreNames.contains('state')
            ? [...stores, 'state']
            : stores,
          mode,
        );
      } catch (error) {
        reject(storageFailure(error));
        return;
      }
      let value: T, failure: unknown;
      const complete = (result: T) => {
        value = result;
      };
      tx.oncomplete = () => {
        this.receiptEpoch = storedReceiptEpoch(tx);
        const receiver = receiptReceiverState(this.receiver, this.db.name);
        for (const key of offeredReceiptKeys(tx)) receiver.offers.add(key);
        accept(value);
      };
      tx.onabort = () => reject(storageFailure(failure ?? tx.error));
      tx.onerror = () => {};
      const abort = (error: unknown) => {
        failure = error;
        tx.abort();
      };
      try {
        beginReceiptRetention(
          tx,
          abort,
          receiptReceiverState(this.receiver, this.db.name).id,
        );
        operation(tx, complete, abort);
      } catch (error) {
        abort(error);
      }
    });
  }
  private read<T>(
    key: string,
    validate: (value: unknown) => void,
  ): Promise<T | null> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const request = tx.objectStore(FULL_STATE_STORE).get(key);
      request.onsuccess = () => {
        try {
          if (request.result !== undefined) validate(request.result);
          complete(request.result ?? null);
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  load(): Promise<Game | null> {
    return this.read<Game>('current', validateGame);
  }
  loadActivitySnapshot(): Promise<{
    state: Game | null;
    activity: Activity | null;
    schedule?: AwaySchedule;
  }> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        read = state.get('current');
      read.onsuccess = () => {
        try {
          if (read.result !== undefined) {
            validateGame(read.result);
            const current = read.result;
            readStoredActivity(
              tx,
              current,
              (activity, schedule) =>
                complete({
                  state: current,
                  activity,
                  ...(schedule ? { schedule } : {}),
                }),
              abort,
            );
          } else {
            const count = state.count('current');
            count.onsuccess = () => {
              try {
                if (count.result)
                  throw new RuleError(
                    'SAVE_SHAPE',
                    '主存档记录内容缺失，原记录保留',
                  );
                readStoredActivity(
                  tx,
                  undefined,
                  (activity) => complete({ state: null, activity }),
                  abort,
                );
              } catch (error) {
                abort(error);
              }
            };
          }
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  loadAwaySummary(): Promise<AwaySummary | null> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const read = tx.objectStore(FULL_STATE_STORE).get('current');
      read.onsuccess = () => {
        try {
          const current = read.result;
          if (current !== undefined) validateGame(current);
          readStoredActivity(
            tx,
            current,
            (activity, schedule) => {
              if (!current || !activity || !schedule) {
                complete(null);
                return;
              }
              const values: unknown[] = [],
                runPrefix = current.core.runId + ':',
                cursor = tx
                  .objectStore(FULL_RECEIPT_STORE)
                  .openCursor(
                    IDBKeyRange.bound(runPrefix, runPrefix + '\uffff'),
                  );
              cursor.onsuccess = () => {
                try {
                  if (!cursor.result) {
                    complete(
                      summarizeAway(current, activity, schedule, values),
                    );
                    return;
                  }
                  const value = cursor.result.value;
                  if (value?.format === 'chenyuan-scheduled-receipt') {
                    if (
                      cursor.result.key !==
                      value.input?.mutation?.runId +
                        ':' +
                        value.input?.mutation?.commandId
                    )
                      throw new RuleError(
                        'RECEIPT_INVALID',
                        '累计回执键与原意图不符',
                      );
                    values.push(value);
                  }
                  cursor.result.continue();
                } catch (error) {
                  abort(error);
                }
              };
            },
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  /** Indexed bounded detail window; cumulative totals remain on the saved activity. */
  loadActivityHistory(
    activityId: string,
    page = 0,
    pageSize = 4,
  ): Promise<ActivityHistoryPage> {
    if (
      typeof activityId !== 'string' ||
      !activityId.trim() ||
      activityId.length > 64 ||
      !Number.isSafeInteger(page) ||
      page < 0 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 20
    )
      throw new RuleError('INVALID_QUERY', '活动记录分页参数无效');
    return this.transaction('readonly', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        read = state.get('current');
      read.onsuccess = () => {
        try {
          if (read.result === undefined) {
            const count = state.count('current');
            count.onsuccess = () => {
              if (count.result)
                abort(
                  new RuleError('SAVE_SHAPE', '主存档内容缺失，原记录保留'),
                );
              else
                complete({
                  rows: [],
                  page: 0,
                  pages: 1,
                  total: 0,
                  retained: 0,
                  folded: 0,
                });
            };
            return;
          }
          validateGame(read.result);
          const current = read.result;
          readRetainedHistory(
            tx,
            current.core.runId,
            activityId,
            page,
            pageSize,
            (value, key) => {
              validateActivityReceipt(value, current);
              const receipt = value;
              if (
                receipt.input.kind !== 'TICK' ||
                receipt.activity.id !== activityId ||
                receipt.activity.runId !== current.core.runId ||
                !receipt.command ||
                !receipt.result ||
                key !==
                  receipt.input.tick.runId + ':' + receipt.input.tick.commandId
              )
                throw new RuleError(
                  'RECEIPT_INVALID',
                  '活动周期归属或正式结果不完整',
                );
              return {
                command: receipt.command,
                result: receipt.result,
                activity: receipt.activity,
              };
            },
            complete,
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }

  startActivity(
    plan: ActivityPlan,
    mutation: ActivityMutation,
  ): Promise<ActivityOutcome> {
    validateActivityPlan(plan);
    validateActivityMutation(mutation);
    return this.writeActivity({
      kind: 'START',
      plan: structuredClone(plan),
      mutation: structuredClone(mutation),
    });
  }
  pauseActivity(mutation: ActivityMutation): Promise<ActivityOutcome> {
    validateActivityMutation(mutation);
    return this.writeActivity({
      kind: 'PAUSE',
      mutation: structuredClone(mutation),
    });
  }
  resumeActivity(mutation: ActivityMutation): Promise<ActivityOutcome> {
    validateActivityMutation(mutation);
    return this.writeActivity({
      kind: 'RESUME',
      mutation: structuredClone(mutation),
    });
  }
  settleActivity(tick: ActivityTick): Promise<ActivityOutcome> {
    validateActivityTick(tick);
    return this.writeActivity({ kind: 'TICK', tick: structuredClone(tick) });
  }
  startScheduledActivity(
    plan: ActivityPlan,
    mutation: ActivityMutation,
  ): Promise<ScheduledOutcome> {
    validateActivityPlan(plan);
    validateActivityMutation(mutation);
    return this.writeScheduledActivity(
      structuredClone({ kind: 'START', plan, mutation }),
    );
  }
  advanceScheduledActivity(
    mutation: ActivityMutation,
  ): Promise<ScheduledOutcome> {
    validateActivityMutation(mutation);
    return this.writeScheduledActivity(
      structuredClone({ kind: 'ADVANCE', mutation }),
    );
  }
  pauseScheduledActivity(
    mutation: ActivityMutation,
  ): Promise<ScheduledOutcome> {
    validateActivityMutation(mutation);
    return this.writeScheduledActivity(
      structuredClone({ kind: 'PAUSE', mutation }),
    );
  }
  resumeScheduledActivity(
    mutation: ActivityMutation,
  ): Promise<ScheduledOutcome> {
    validateActivityMutation(mutation);
    return this.writeScheduledActivity(
      structuredClone({ kind: 'RESUME', mutation }),
    );
  }
  adoptScheduledActivity(
    mutation: ActivityMutation,
  ): Promise<ScheduledOutcome> {
    validateActivityMutation(mutation);
    return this.writeScheduledActivity(
      structuredClone({ kind: 'ADOPT', mutation }),
    );
  }
  private writeScheduledActivity(
    input: ScheduledInput,
  ): Promise<ScheduledOutcome> {
    const mutation = input.mutation,
      print = fingerprint(input);
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        receipts = tx.objectStore(FULL_RECEIPT_STORE),
        read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result;
          validateGame(current);
          if (mutation.runId !== current.core.runId)
            throw new RuleError('RUN_MISMATCH', '安排所属人生已经变化');
          readStoredActivity(
            tx,
            current,
            (activity, schedule) => {
              try {
                readReceipt(
                  receipts,
                  mutation.runId + ':' + mutation.commandId,
                  { runId: mutation.runId, commandId: mutation.commandId },
                  (stored) => {
                    try {
                      if (stored !== undefined) {
                        if (
                          !stored ||
                          typeof stored !== 'object' ||
                          !('format' in stored) ||
                          stored.format !== 'chenyuan-scheduled-receipt'
                        )
                          throw new RuleError(
                            'COMMAND_ID_REUSED',
                            '同一编号已用于其他行动',
                          );
                        validateScheduledReceipt(stored, current);
                        if (stored.fingerprint !== print)
                          throw new RuleError(
                            'COMMAND_ID_REUSED',
                            '同一离开安排编号对应不同意图',
                          );
                        complete({
                          state: current,
                          activity,
                          ...(schedule ? { schedule } : {}),
                          result: stored.proof.result,
                          replayed: true,
                          cycles: stored.proof.cycles,
                          more: !!schedule?.window,
                          committed: [],
                        });
                        return;
                      }
                      const now = Date.now(),
                        progress = scheduledProgress(
                          current,
                          activity,
                          schedule,
                          input,
                          now,
                          input.kind === 'START'
                            ? crypto.randomUUID()
                            : undefined,
                        );
                      if (input.kind === 'START')
                        archiveActivity(
                          tx,
                          activity,
                          'activity/' +
                            mutation.runId +
                            '/' +
                            mutation.commandId +
                            '/previous',
                          current,
                          abort,
                        );
                      let previous = current;
                      const committed: ScheduledOutcome['committed'] = [];
                      for (const cycle of progress.cycles) {
                        const before = cycle.activityBefore,
                          command = cycle.command;
                        const tick: ActivityTick = {
                          commandId: command.commandId,
                          runId: command.runId,
                          expectedRevision: command.expectedRevision,
                          activityId: before.id,
                          expectedActivityRevision: before.revision,
                          ownerId: before.ownerId,
                          generation: before.generation,
                        };
                        state.put(previous, 'previous');
                        if (cycle.checkpoint) {
                          const cp = checkpoint(
                            cycle.checkpoint.snapshot,
                            cycle.checkpoint.kind,
                          );
                          state.put(cp, 'checkpoint');
                          state.put(
                            checkpointScope(cp, current.core.runId),
                            'checkpoint-owner',
                          );
                        }
                        const receipt = scheduledActivityReceipt(
                          { kind: 'TICK', tick },
                          cycle.activityAfter,
                          command,
                          cycle.result,
                          {
                            activityBefore: before,
                            stateAfter: cycle.stateAfter,
                            resolvedAt: cycle.observedAt,
                            logicalAt: cycle.logicalAt,
                          },
                        );
                        validateActivityReceipt(receipt, cycle.stateAfter);
                        const key = command.runId + ':' + command.commandId;
                        if (key === mutation.runId + ':' + mutation.commandId)
                          throw new RuleError(
                            'COMMAND_ID_REUSED',
                            '安排编号不能占用周期回执身份',
                          );
                        const present = receipts.count(key);
                        present.onsuccess = () => {
                          if (present.result)
                            abort(
                              new RuleError(
                                'COMMAND_ID_REUSED',
                                '该周期编号已有记录，未覆盖原回执',
                              ),
                            );
                        };
                        putRetainedReceipt(
                          tx,
                          receipt,
                          key,
                          mutation.runId + ':' + mutation.commandId,
                        );
                        committed.push({
                          before: previous,
                          after: cycle.stateAfter,
                          command,
                          result: cycle.result,
                        });
                        previous = cycle.stateAfter;
                      }
                      const receipt = scheduledReceipt(
                        input,
                        current,
                        activity,
                        schedule,
                        now,
                        progress,
                      );
                      validateScheduledReceipt(receipt, progress.state);
                      putRetainedReceipt(
                        tx,
                        receipt,
                        mutation.runId + ':' + mutation.commandId,
                      );
                      state.put(progress.state, 'current');
                      state.put(progress.record.activity, 'activity');
                      tx.objectStore(FULL_SCHEDULE_STORE).put(
                        progress.record.schedule,
                        'current',
                      );
                      complete({
                        state: progress.state,
                        ...progress.record,
                        result: progress.cycles.at(-1)?.result ?? null,
                        replayed: false,
                        cycles: progress.cycles.length,
                        more: progress.more,
                        committed,
                      });
                    } catch (error) {
                      abort(error);
                    }
                  },
                  abort,
                );
              } catch (error) {
                abort(error);
              }
            },
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  private writeActivity(input: ActivityReceiptInput): Promise<ActivityOutcome> {
    const intent = input.kind === 'TICK' ? input.tick : input.mutation,
      print = fingerprint(input);
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        receipts = tx.objectStore(FULL_RECEIPT_STORE),
        read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result;
          validateGame(current);
          if (current.core.runId !== intent.runId)
            throw new RuleError(
              'RUN_MISMATCH',
              '活动所属人生已经切换，请读取最新进度',
            );
          readStoredActivity(
            tx,
            current,
            (activity, schedule) => {
              readReceipt(
                receipts,
                intent.runId + ':' + intent.commandId,
                {
                  runId: intent.runId,
                  commandId: intent.commandId,
                  derived: input.kind === 'TICK',
                },
                (stored) => {
                  try {
                    if (stored !== undefined) {
                      rejectScheduledReceipt(stored, current);
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-direct-receipt'
                      ) {
                        validateDirectReceipt(stored, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于轻量行动',
                        );
                      }
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-receipt'
                      ) {
                        validateCommandReceipt(stored, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于游戏指令',
                        );
                      }
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-control-receipt'
                      ) {
                        validateControlReceipt(stored);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于存档操作',
                        );
                      }
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-configuration-receipt'
                      ) {
                        validateConfigurationReceipt(stored, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于配装确认',
                        );
                      }
                      validateActivityReceipt(stored, current);
                      if (stored.fingerprint !== print)
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一活动编号对应不同意图',
                        );
                      complete({
                        state: current,
                        activity,
                        result: stored.result,
                        replayed: true,
                      });
                      return;
                    }
                    if (schedule)
                      throw new RuleError(
                        'SCHEDULE_MODE',
                        '该安排已允许离开累计，请沿原离开安排继续或暂停',
                      );
                    if (current.core.revision !== intent.expectedRevision)
                      throw new RuleError(
                        'STALE_REVISION',
                        '进度已变化，请重新查看活动安排',
                      );
                    const expectedId =
                      input.kind === 'TICK'
                        ? input.tick.activityId
                        : input.mutation.expectedActivityId;
                    const expectedActivityRevision =
                      input.kind === 'TICK'
                        ? input.tick.expectedActivityRevision
                        : input.mutation.expectedActivityRevision;
                    if (
                      (activity?.id ?? null) !== expectedId ||
                      (activity?.revision ?? null) !== expectedActivityRevision
                    ) {
                      throw new RuleError(
                        'ACTIVITY_STALE',
                        '活动已被暂停、继续或替换，请读取当前安排',
                      );
                    }
                    let next: Activity;
                    if (input.kind === 'START') {
                      if (activity?.status === 'running')
                        throw new RuleError(
                          'ACTIVITY_RUNNING',
                          '先暂停当前活动，再安排新的活动',
                        );
                      next = createActivity(current, input.plan, {
                        id: crypto.randomUUID(),
                        ownerId: input.mutation.ownerId,
                        commandId: input.mutation.commandId,
                        now: Date.now(),
                      });
                      if (activity)
                        putRetainedBackup(
                          tx,
                          activity,
                          'activity/' +
                            intent.runId +
                            '/' +
                            intent.commandId +
                            '/previous',
                        );
                    } else {
                      if (!activity)
                        throw new RuleError(
                          'ACTIVITY_REQUIRED',
                          '尚无可以继续或暂停的活动',
                        );
                      if (input.kind === 'TICK') {
                        if (
                          activity.ownerId !== input.tick.ownerId ||
                          activity.generation !== input.tick.generation
                        )
                          throw new RuleError(
                            'ACTIVITY_OWNER',
                            '该周期已由其他页面接管，旧回调未执行',
                          );
                        if (
                          activity.status !== 'running' ||
                          !activity.nextCommand ||
                          activity.nextCommand.commandId !==
                            input.tick.commandId
                        )
                          throw new RuleError(
                            'ACTIVITY_STALE',
                            '当前周期已停止或变化',
                          );
                        const now = Date.now();
                        if (activity.dueAt === null || now < activity.dueAt)
                          throw new RuleError(
                            'ACTIVITY_NOT_DUE',
                            '当前活动周期尚未完成',
                          );
                        const command = activity.nextCommand,
                          outcome = resolve(current, command);
                        next = completeActivity(
                          outcome.nextState,
                          activity,
                          outcome.result,
                          { commandId: command.commandId, now },
                        );
                        state.put(current, 'previous');
                        state.put(outcome.nextState, 'current');
                        state.put(next, 'activity');
                        if (outcome.checkpointKind) {
                          const prepared = checkpoint(
                            current,
                            outcome.checkpointKind,
                          );
                          state.put(prepared, 'checkpoint');
                          state.put(
                            checkpointScope(prepared, current.core.runId),
                            'checkpoint-owner',
                          );
                        }
                        putRetainedReceipt(
                          tx,
                          activityReceipt(
                            input,
                            next,
                            command,
                            outcome.result,
                            activity.version === 5 ||
                              activity.version === 6 ||
                              activity.version === 7
                              ? {
                                  activityBefore: activity,
                                  stateAfter: outcome.nextState,
                                  resolvedAt: now,
                                }
                              : undefined,
                          ),
                          intent.runId + ':' + intent.commandId,
                        );
                        complete({
                          state: outcome.nextState,
                          activity: next,
                          result: outcome.result,
                          replayed: false,
                        });
                        return;
                      }
                      if (input.kind === 'PAUSE') {
                        if (activity.ownerId !== input.mutation.ownerId)
                          throw new RuleError(
                            'ACTIVITY_OWNER',
                            '请先继续并接管当前活动，再暂停',
                          );
                        next = pauseModelActivity(activity);
                      } else
                        next = resumeModelActivity(current, activity, {
                          ownerId: input.mutation.ownerId,
                          commandId: input.mutation.commandId,
                          now: Date.now(),
                        });
                    }
                    validateActivity(next, current);
                    state.put(next, 'activity');
                    putRetainedReceipt(
                      tx,
                      activityReceipt(input, next),
                      intent.runId + ':' + intent.commandId,
                    );
                    complete({
                      state: current,
                      activity: next,
                      result: null,
                      replayed: false,
                    });
                  } catch (error) {
                    abort(error);
                  }
                },
                abort,
              );
            },
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  async configure(input: ConfigurationIntent): Promise<ActivityOutcome> {
    validateConfigurationIntent(input);
    const intent = structuredClone(input),
      command = intent.command,
      print = fingerprint(intent);
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        receipts = tx.objectStore(FULL_RECEIPT_STORE),
        read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result;
          validateGame(current);
          if (current.core.runId !== command.runId)
            throw new RuleError(
              'RUN_MISMATCH',
              '确认所属人生已变化，请重新查看配装',
            );
          readStoredActivity(
            tx,
            current,
            (activity) => {
              readReceipt(
                receipts,
                command.runId + ':' + command.commandId,
                { runId: command.runId, commandId: command.commandId },
                (stored) => {
                  try {
                    if (stored !== undefined) {
                      rejectScheduledReceipt(stored, current);
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-direct-receipt'
                      ) {
                        validateDirectReceipt(stored, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于轻量行动',
                        );
                      }
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-receipt'
                      ) {
                        validateCommandReceipt(stored, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于游戏指令',
                        );
                      }
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-control-receipt'
                      ) {
                        validateControlReceipt(stored);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于存档操作',
                        );
                      }
                      if (
                        stored &&
                        typeof stored === 'object' &&
                        'format' in stored &&
                        stored.format === 'chenyuan-activity-receipt'
                      ) {
                        validateActivityReceipt(stored, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于活动安排或周期',
                        );
                      }
                      validateConfigurationReceipt(stored, current);
                      if (stored.fingerprint !== print)
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一配装编号对应不同确认内容',
                        );
                      complete({
                        state: current,
                        activity,
                        result: stored.result,
                        replayed: true,
                      });
                      return;
                    }
                    if (current.core.revision !== command.expectedRevision)
                      throw new RuleError(
                        'STALE_REVISION',
                        '进度已变化，请重新核对本次配装',
                      );
                    if (
                      (activity?.id ?? null) !== intent.expectedActivityId ||
                      (activity?.revision ?? null) !==
                        intent.expectedActivityRevision
                    )
                      throw new RuleError(
                        'ACTIVITY_STALE',
                        '活动安排已变化，旧配装确认未应用',
                      );
                    if (activity?.status === 'running')
                      throw new RuleError(
                        'ACTIVITY_RUNNING',
                        '请先明确暂停当前活动，再应用配装',
                      );
                    const outcome = resolve(current, command),
                      nextActivity = activity
                        ? invalidateActivity(activity, outcome.nextState)
                        : null;
                    archiveSchedule(
                      tx,
                      'configuration/' +
                        command.runId +
                        '/' +
                        command.commandId,
                      current,
                      activity,
                      abort,
                    );
                    state.put(current, 'previous');
                    state.put(outcome.nextState, 'current');
                    if (nextActivity) state.put(nextActivity, 'activity');
                    putRetainedReceipt(
                      tx,
                      configurationReceipt(
                        intent,
                        current,
                        outcome.nextState,
                        outcome.result,
                      ),
                      command.runId + ':' + command.commandId,
                    );
                    complete({
                      state: outcome.nextState,
                      activity: nextActivity,
                      result: outcome.result,
                      replayed: false,
                    });
                  } catch (error) {
                    abort(error);
                  }
                },
                abort,
              );
            },
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  async executeDirect(input: DirectIntent): Promise<ActivityOutcome> {
    validateDirectIntent(input);
    const intent = structuredClone(input),
      command = intent.command,
      print = fingerprint(intent);
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        receipts = tx.objectStore(FULL_RECEIPT_STORE),
        read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result;
          validateGame(current);
          if (current.core.runId !== command.runId)
            throw new RuleError('RUN_MISMATCH', '当前人生已变化，请重新查看');
          readStoredActivity(
            tx,
            current,
            (activity) =>
              readReceipt(
                receipts,
                command.runId + ':' + command.commandId,
                { runId: command.runId, commandId: command.commandId },
                (stored) => {
                  try {
                    if (stored !== undefined) {
                      if (
                        !stored ||
                        typeof stored !== 'object' ||
                        !('format' in stored) ||
                        stored.format !== 'chenyuan-direct-receipt'
                      )
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于其他行动',
                        );
                      validateDirectReceipt(stored, current);
                      if (stored.fingerprint !== print)
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号对应不同轻量行动',
                        );
                      complete({
                        state: current,
                        activity,
                        result: stored.result,
                        replayed: true,
                      });
                      return;
                    }
                    if (current.core.revision !== command.expectedRevision)
                      throw new RuleError(
                        'STALE_REVISION',
                        '进度已变化，请重新查看本次行动',
                      );
                    if (
                      (activity?.id ?? null) !== intent.expectedActivityId ||
                      (activity?.revision ?? null) !==
                        intent.expectedActivityRevision
                    )
                      throw new RuleError(
                        'ACTIVITY_STALE',
                        '活动已变化，本次行动未执行',
                      );
                    if (activity?.status === 'running')
                      throw new RuleError(
                        'ACTIVITY_RUNNING',
                        '请先暂停当前活动，再确认本次行动',
                      );
                    const outcome = resolve(current, command),
                      nextActivity = activity
                        ? invalidateActivity(activity, outcome.nextState)
                        : null;
                    archiveSchedule(
                      tx,
                      'direct/' + command.runId + '/' + command.commandId,
                      current,
                      activity,
                      abort,
                    );
                    state.put(current, 'previous');
                    state.put(outcome.nextState, 'current');
                    if (nextActivity) state.put(nextActivity, 'activity');
                    putRetainedReceipt(
                      tx,
                      directReceipt(
                        intent,
                        current,
                        outcome.nextState,
                        outcome.result,
                      ),
                      command.runId + ':' + command.commandId,
                    );
                    complete({
                      state: outcome.nextState,
                      activity: nextActivity,
                      result: outcome.result,
                      replayed: false,
                    });
                  } catch (error) {
                    abort(error);
                  }
                },
                abort,
              ),
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  loadCheckpoint(): Promise<SaveCheckpoint | null> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result;
          if (current !== undefined) validateGame(current);
          const cpRead = state.get('checkpoint');
          cpRead.onsuccess = () => {
            try {
              if (cpRead.result === undefined) {
                complete(null);
                return;
              }
              validateCheckpoint(cpRead.result);
              const cp = cpRead.result;
              validateGame(current);
              const owner = state.get('checkpoint-owner');
              owner.onsuccess = () => {
                try {
                  validateScope(owner.result, cp, current);
                  complete(cp);
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
    });
  }
  loadPrevious(): Promise<Game | null> {
    return this.read<Game>('previous', validateGame);
  }
  archives(): Promise<{ key: IDBValidKey; value: unknown }[]> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const values: { key: IDBValidKey; value: unknown }[] = [];
      const cursor = tx.objectStore(FULL_BACKUP_STORE).openCursor();
      cursor.onsuccess = () => {
        if (!cursor.result) {
          complete(values);
          return;
        }
        values.push({ key: cursor.result.key, value: cursor.result.value });
        cursor.result.continue();
      };
    });
  }
  private migrateContent(): Promise<void> {
    return this.transaction('readwrite', migrateTransaction);
  }
  async create(name: string, mutation: SaveMutation): Promise<ControlOutcome> {
    mutation = structuredClone(mutation);
    validateMutation(mutation);
    return this.replace('CREATE', mutation, newGame(name, mutation.runId), {
      name,
    });
  }
  async importText(
    raw: string,
    mutation: SaveMutation,
  ): Promise<ControlOutcome> {
    mutation = structuredClone(mutation);
    validateMutation(mutation);
    const imported = parseGame(raw);
    if (imported.core.runId === mutation.runId)
      throw new RuleError('NEW_RUN_REQUIRED', '导入存档必须使用新的人生编号');
    return this.replace(
      'IMPORT',
      mutation,
      reidentify(imported, mutation.runId),
      { raw },
    );
  }
  private replace(
    kind: 'CREATE' | 'IMPORT',
    mutation: SaveMutation,
    candidate: Game,
    payload: unknown,
  ): Promise<ControlOutcome> {
    const print = fingerprint({ kind, mutation, payload });
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        receipts = tx.objectStore(FULL_RECEIPT_STORE);
      const read = state.get('current');
      read.onsuccess = () => {
        const existing: Game | undefined = read.result;
        try {
          if (existing !== undefined) validateGame(existing);
          readStoredActivity(
            tx,
            existing,
            (activity) => {
              readReceipt(
                receipts,
                mutation.runId + ':' + mutation.commandId,
                {
                  runId: mutation.runId,
                  commandId: mutation.commandId,
                  destination: true,
                },
                (storedReceipt) => {
                  try {
                    if (storedReceipt !== undefined) {
                      if (existing)
                        rejectScheduledReceipt(storedReceipt, existing);
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-direct-receipt'
                      ) {
                        validateDirectReceipt(storedReceipt, existing!);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于轻量行动',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-receipt'
                      ) {
                        validateCommandReceipt(storedReceipt, existing!);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于游戏指令',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-activity-receipt'
                      ) {
                        validateActivityReceipt(storedReceipt, existing!);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于活动安排',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format ===
                          'chenyuan-configuration-receipt'
                      ) {
                        validateConfigurationReceipt(storedReceipt, existing!);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于配装确认',
                        );
                      }
                      validateControlReceipt(storedReceipt);
                      if (
                        storedReceipt.kind !== kind ||
                        storedReceipt.fingerprint !== print
                      )
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一操作编号对应不同内容',
                        );
                      if (
                        fingerprint(storedReceipt.mutation) !==
                        fingerprint(mutation)
                      )
                        throw new RuleError(
                          'RECEIPT_INVALID',
                          '存档操作回执身份损坏',
                        );
                      if (!existing || existing.core.runId !== mutation.runId)
                        throw new RuleError('RUN_MISMATCH', '当前存档已经切换');
                      complete({ state: existing, replayed: true });
                      return;
                    }
                    if (
                      existing
                        ? existing.core.runId !== mutation.expectedRunId ||
                          existing.core.revision !== mutation.expectedRevision
                        : mutation.expectedRunId !== null
                    ) {
                      throw new RuleError(
                        'STALE_REVISION',
                        '当前存档已变化，请重新读取并确认',
                      );
                    }
                    if (existing?.core.runId === mutation.runId)
                      throw new RuleError(
                        'NEW_RUN_REQUIRED',
                        '替换存档必须使用新的人生编号',
                      );
                    archiveActivity(
                      tx,
                      activity,
                      'replacement/' + mutation.commandId,
                      existing,
                      abort,
                    );
                    if (existing) state.put(existing, 'previous');
                    state.put(candidate, 'current');
                    state.delete('checkpoint');
                    state.delete('checkpoint-owner');
                    clearRetainedReceipts(tx);
                    const receipt: ControlReceipt = {
                      format: 'chenyuan-control-receipt',
                      version: 1,
                      kind,
                      mutation: structuredClone(mutation),
                      fingerprint: print,
                    };
                    putRetainedReceipt(
                      tx,
                      receipt,
                      mutation.runId + ':' + mutation.commandId,
                    );
                    complete({ state: candidate, replayed: false });
                  } catch (error) {
                    abort(error);
                  }
                },
                abort,
              );
            },
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  async restoreCheckpoint(mutation: SaveMutation): Promise<ControlOutcome> {
    mutation = structuredClone(mutation);
    validateMutation(mutation);
    if (mutation.expectedRunId === null)
      throw new RuleError('INVALID_MUTATION', '恢复检查点需要当前存档身份');
    const print = fingerprint({
      kind: 'RESTORE',
      mutation,
      checkpoint: 'active',
    });
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        receipts = tx.objectStore(FULL_RECEIPT_STORE),
        currentRead = state.get('current');
      currentRead.onsuccess = () => {
        try {
          const current = currentRead.result;
          validateGame(current);
          readStoredActivity(
            tx,
            current,
            (activity) => {
              readReceipt(
                receipts,
                mutation.runId + ':' + mutation.commandId,
                {
                  runId: mutation.runId,
                  commandId: mutation.commandId,
                  destination: true,
                },
                (storedReceipt) => {
                  try {
                    if (storedReceipt !== undefined) {
                      rejectScheduledReceipt(storedReceipt, current);
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-direct-receipt'
                      ) {
                        validateDirectReceipt(storedReceipt, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于轻量行动',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-receipt'
                      ) {
                        validateCommandReceipt(storedReceipt, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于游戏指令',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-activity-receipt'
                      ) {
                        validateActivityReceipt(storedReceipt, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于活动安排',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format ===
                          'chenyuan-configuration-receipt'
                      ) {
                        validateConfigurationReceipt(storedReceipt, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于配装确认',
                        );
                      }
                      validateControlReceipt(storedReceipt);
                      if (
                        storedReceipt.kind !== 'RESTORE' ||
                        storedReceipt.fingerprint !== print
                      )
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号对应不同恢复意图',
                        );
                      if (
                        fingerprint(storedReceipt.mutation) !==
                        fingerprint(mutation)
                      )
                        throw new RuleError(
                          'RECEIPT_INVALID',
                          '恢复回执身份损坏',
                        );
                      if (current.core.runId !== mutation.runId)
                        throw new RuleError('RUN_MISMATCH', '当前人生已经切换');
                      complete({ state: current, replayed: true });
                      return;
                    }
                    if (
                      current.core.runId !== mutation.expectedRunId ||
                      current.core.revision !== mutation.expectedRevision
                    )
                      throw new RuleError(
                        'STALE_REVISION',
                        '存档已变化，请重新确认恢复',
                      );
                    if (current.core.runId === mutation.runId)
                      throw new RuleError(
                        'NEW_RUN_REQUIRED',
                        '恢复需要新的人生编号',
                      );
                    const readCP = state.get('checkpoint');
                    readCP.onsuccess = () => {
                      try {
                        if (readCP.result === undefined)
                          throw new RuleError(
                            'NO_CHECKPOINT',
                            '尚无可恢复的准备检查点',
                          );
                        validateCheckpoint(readCP.result);
                        const cp = readCP.result;
                        const owner = state.get('checkpoint-owner');
                        owner.onsuccess = () => {
                          try {
                            validateScope(owner.result, cp, current);
                            const restored = reidentify(
                              cp.snapshot,
                              mutation.runId,
                            );
                            archiveActivity(
                              tx,
                              activity,
                              'restoration/' + mutation.commandId,
                              current,
                              abort,
                            );
                            state.put(current, 'previous');
                            state.put(restored, 'current');
                            state.put(
                              checkpointScope(cp, restored.core.runId),
                              'checkpoint-owner',
                            );
                            // The complete original checkpoint remains reusable.
                            clearRetainedReceipts(tx);
                            const receipt: ControlReceipt = {
                              format: 'chenyuan-control-receipt',
                              version: 1,
                              kind: 'RESTORE',
                              mutation,
                              fingerprint: print,
                            };
                            putRetainedReceipt(
                              tx,
                              receipt,
                              mutation.runId + ':' + mutation.commandId,
                            );
                            complete({ state: restored, replayed: false });
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
                },
                abort,
              );
            },
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
  async execute(command: Command): Promise<CommitOutcome> {
    validateCommand(command);
    command = structuredClone(command);
    validateCommand(command);
    const print = fingerprint(command);
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE),
        receipts = tx.objectStore(FULL_RECEIPT_STORE);
      const read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result;
          validateGame(current);
          if (current.core.runId !== command.runId)
            throw new RuleError('RUN_MISMATCH', '当前存档已经切换，请重新读取');
          readStoredActivity(
            tx,
            current,
            (activity) => {
              readReceipt(
                receipts,
                command.runId + ':' + command.commandId,
                { runId: command.runId, commandId: command.commandId },
                (storedReceipt) => {
                  try {
                    if (storedReceipt !== undefined) {
                      rejectScheduledReceipt(storedReceipt, current);
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-direct-receipt'
                      ) {
                        validateDirectReceipt(storedReceipt, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于轻量行动',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-control-receipt'
                      ) {
                        validateControlReceipt(storedReceipt);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于存档操作',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format === 'chenyuan-activity-receipt'
                      ) {
                        validateActivityReceipt(storedReceipt, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于活动周期或安排',
                        );
                      }
                      if (
                        storedReceipt &&
                        typeof storedReceipt === 'object' &&
                        'format' in storedReceipt &&
                        storedReceipt.format ===
                          'chenyuan-configuration-receipt'
                      ) {
                        validateConfigurationReceipt(storedReceipt, current);
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一编号已用于配装确认',
                        );
                      }
                      validateCommandReceipt(storedReceipt, current);
                      const receipt = storedReceipt;
                      if (receipt.fingerprint !== print)
                        throw new RuleError(
                          'COMMAND_ID_REUSED',
                          '同一指令编号对应不同内容',
                        );
                      complete({
                        state: current,
                        result: receipt.result,
                        replayed: true,
                      });
                      return;
                    }
                    if (
                      [
                        'CULTIVATE',
                        'SOURCE',
                        'CRAFT',
                        'FORGE',
                        'BUY',
                        'SELL',
                        'USE',
                        'REST',
                        'LEARN',
                        'STUDY',
                        'TRAVEL',
                        'ENCOUNTER',
                        'BATTLE',
                        'CHOOSE',
                        'EVENT',
                        'DECIDE',
                        'BREAKTHROUGH',
                        'START_TRIAL',
                        'ANSWER_TRIAL',
                        'END',
                        'RETIRE',
                        'END_LIFE',
                      ].includes(command.type)
                    ) {
                      throw new RuleError(
                        'ACTIVITY_REQUIRED',
                        '请先明确安排本次行动，按完整周期保存实际结果',
                      );
                    }
                    if (
                      ['SCHOOL', 'EQUIP', 'EQUIP_RELIC'].includes(command.type)
                    )
                      throw new RuleError(
                        'CONFIGURATION_REQUIRED',
                        '请预选并确认本次修法或配装变化',
                      );
                    if (activity?.status === 'running')
                      throw new RuleError(
                        'ACTIVITY_RUNNING',
                        '先暂停当前活动，再执行其他行动',
                      );
                    const outcome = resolve(current, command);
                    archiveSchedule(
                      tx,
                      'command/' + command.runId + '/' + command.commandId,
                      current,
                      activity,
                      abort,
                    );
                    state.put(current, 'previous');
                    state.put(outcome.nextState, 'current');
                    if (activity) {
                      state.put(
                        invalidateActivity(activity, outcome.nextState),
                        'activity',
                      );
                    }
                    if (outcome.checkpointKind) {
                      const prepared = checkpoint(
                        current,
                        outcome.checkpointKind,
                      );
                      state.put(prepared, 'checkpoint');
                      state.put(
                        checkpointScope(prepared, current.core.runId),
                        'checkpoint-owner',
                      );
                    }
                    const receipt: CommandReceipt = {
                      format: 'chenyuan-receipt',
                      version: 1,
                      command: structuredClone(command),
                      fingerprint: print,
                      result: outcome.result,
                    };
                    putRetainedReceipt(
                      tx,
                      receipt,
                      command.runId + ':' + command.commandId,
                    );
                    complete({
                      state: outcome.nextState,
                      result: outcome.result,
                      replayed: false,
                    });
                  } catch (error) {
                    abort(error);
                  }
                },
                abort,
              );
            },
            abort,
          );
        } catch (error) {
          abort(error);
        }
      };
    });
  }
}
