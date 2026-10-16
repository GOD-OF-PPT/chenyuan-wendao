import { newGame, parseGame, resolve, validateCommand, validateGame } from '../../src/full/engine.ts';
import { RuleError } from '../../src/full/errors.ts';
import { canonicalFingerprint as fingerprint, validateCommandReceipt } from '../../src/full/receipts.ts';
import { currentVersions } from '../../src/full/versions.ts';
import type { Command, Game } from '../../src/full/types.ts';
import type { CommandReceipt, CommitOutcome, SaveCheckpoint } from '../../src/full/contracts.ts';

export const FULL_DB_NAME = 'chenyuan-playable-v1';
export const FULL_DB_VERSION = 3;
export const FULL_STATE_STORE = 'full-state';
export const FULL_RECEIPT_STORE = 'full-receipts';
export const FULL_BACKUP_STORE = 'full-backups';
const stores = [FULL_STATE_STORE, FULL_RECEIPT_STORE, FULL_BACKUP_STORE];
function readReceipt(store: IDBObjectStore, key: string, use: (value: unknown) => void, abort: (error: unknown) => void): void {
  const request = store.get(key);
  const deliver = (value: unknown) => { try { use(value); } catch (error) { abort(error); } };
  request.onsuccess = () => {
    if (request.result !== undefined) { deliver(request.result); return; }
    const present = store.count(key);
    present.onsuccess = () => present.result ? abort(new RuleError('RECEIPT_INVALID', '回执记录存在但内容缺失，未重新执行')) : deliver(undefined);
  };
}

export interface SaveToken { runId: string; revision: number; }
/** runId is the fresh destination; expectedRunId/revision identify the replaced run. */
export interface SaveMutation {
  commandId: string; runId: string; expectedRunId: string | null; expectedRevision: number;
}
export interface ControlOutcome { state: Game; replayed: boolean; }
interface ControlReceipt {
  format: 'chenyuan-control-receipt'; version: 1; kind: 'CREATE' | 'IMPORT' | 'MIGRATE' | 'RESTORE';
  mutation: SaveMutation; fingerprint: string;
}
interface CheckpointScope {
  format: 'chenyuan-checkpoint-scope'; version: 1; runId: string;
  sourceRunId: string; sourceRevision: number; kind: SaveCheckpoint['kind'];
}
export interface RawDatabaseBackup {
  format: 'chenyuan-raw-database-backup'; version: 1;
  database: { name: string; version: number };
  stores: { name: string; entries: { key: IDBValidKey; value: unknown }[] }[];
}
function validateControlReceipt(value: unknown): asserts value is ControlReceipt {
  if (!value || typeof value !== 'object') throw new RuleError('RECEIPT_INVALID', '存档操作回执损坏');
  const receipt = value as ControlReceipt;
  if (Object.keys(value).length !== 5 || receipt.format !== 'chenyuan-control-receipt' || receipt.version !== 1 ||
      !['CREATE', 'IMPORT', 'MIGRATE', 'RESTORE'].includes(receipt.kind) || typeof receipt.fingerprint !== 'string' || !receipt.fingerprint.length) {
    throw new RuleError('RECEIPT_INVALID', '存档操作回执损坏');
  }
  try { validateMutation(receipt.mutation); } catch { throw new RuleError('RECEIPT_INVALID', '存档操作回执身份损坏'); }
}
function checkpointScope(cp: SaveCheckpoint, runId: string): CheckpointScope {
  return { format: 'chenyuan-checkpoint-scope', version: 1, runId,
    sourceRunId: cp.sourceRunId, sourceRevision: cp.sourceRevision, kind: cp.kind };
}
function validateScope(value: unknown, cp: SaveCheckpoint, current: Game): void {
  if (fingerprint(value) !== fingerprint(checkpointScope(cp, current.core.runId))) {
    throw new RuleError('CHECKPOINT_OWNERSHIP', '检查点与当前人生的归属不一致，原件保留');
  }
}
function ensureCheckpointScope(tx: IDBTransaction, current: Game, done: () => void, abort: (error: unknown) => void): void {
  const state = tx.objectStore(FULL_STATE_STORE), read = state.get('checkpoint');
  read.onsuccess = () => {
    try {
      const cp = read.result;
      if (cp !== undefined) validateCheckpoint(cp);
      const owner = state.get('checkpoint-owner');
      owner.onsuccess = () => {
        try {
          if (cp === undefined) {
            if (owner.result !== undefined) throw new RuleError('CHECKPOINT_INVALID', '检查点归属记录缺少对应快照');
            done(); return;
          }
          if (owner.result !== undefined) { validateScope(owner.result, cp, current); done(); return; }
          const writeScope = () => {
            const mutation: SaveMutation = { commandId: crypto.randomUUID(), runId: current.core.runId,
              expectedRunId: current.core.runId, expectedRevision: current.core.revision };
            validateMutation(mutation);
            state.put(checkpointScope(cp, current.core.runId), 'checkpoint-owner');
            tx.objectStore(FULL_BACKUP_STORE).put({ kind: 'checkpoint-scope', mutation, checkpoint: cp }, 'scope/' + mutation.commandId);
            done();
          };
          if (cp.sourceRunId === current.core.runId) { writeScope(); return; }
          // T04 migrations changed the active run but kept the checkpoint source.
          // Only its archived original records can establish that relationship.
          const backups = tx.objectStore(FULL_BACKUP_STORE), cursor = backups.openCursor();
          cursor.onsuccess = () => {
            try {
              if (!cursor.result) throw new RuleError('CHECKPOINT_OWNERSHIP', '无法确认旧检查点归属，原记录保留');
              const value = cursor.result.value, key = cursor.result.key;
              if (typeof key !== 'string' || !key.endsWith('/identity') || !['legacy-v1', 'content'].includes(value?.kind) ||
                  value.mutation?.runId !== current.core.runId || value.mutation?.expectedRunId !== cp.sourceRunId || value.mutation.expectedRevision < cp.sourceRevision) {
                cursor.result.continue(); return;
              }
              validateMutation(value.mutation);
              const prefix = key.slice(0, -'/identity'.length), original = backups.get(prefix + '/current');
              original.onsuccess = () => {
                try {
                  const source = parseGame(JSON.stringify(original.result));
                  if (source.core.runId !== cp.sourceRunId || source.core.revision < cp.sourceRevision) throw new RuleError('CHECKPOINT_OWNERSHIP', '旧检查点归档身份不一致');
                  const originalCP = backups.get(prefix + '/checkpoint');
                  originalCP.onsuccess = () => {
                    try {
                      const raw = value.kind === 'content' ? originalCP.result?.snapshot : originalCP.result;
                      if (fingerprint(parseGame(JSON.stringify(raw))) !== fingerprint(cp.snapshot)) throw new RuleError('CHECKPOINT_OWNERSHIP', '旧检查点与原件不一致');
                      writeScope();
                    } catch (error) { abort(error); }
                  };
                } catch (error) { abort(error); }
              };
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    } catch (error) { abort(error); }
  };
}

/** Current archives are JSON records; unsupported structured values reject rather than silently disappear. */
export function rawBackupText(backup: RawDatabaseBackup): string {
  const path = new Set<object>();
  const check = (value: unknown): void => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return;
    if (!value || typeof value !== 'object' || path.has(value) ||
        !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new RuleError('RAW_EXPORT_UNSUPPORTED', '原件包含此版本无法无损编码的数据，请使用匹配版本导出；原件未改动');
    }
    path.add(value);
    if (Array.isArray(value) && (Object.keys(value).length !== value.length || Array.from({ length: value.length }, (_, i) => i).some(i => !Object.hasOwn(value, i)))) throw new RuleError('RAW_EXPORT_UNSUPPORTED', '原件数组无法无损编码，原件未改动');
    for (const child of Object.values(value)) check(child);
    path.delete(value);
  };
  const stores = backup.stores.map(store => ({ name: store.name, entries: store.entries.map(entry => {
    check(entry.key);
    if (entry.value === undefined) return { key: entry.key, valueEncoding: 'undefined' };
    check(entry.value); return { key: entry.key, valueEncoding: 'json', value: entry.value };
  }) }));
  return JSON.stringify({ ...backup, stores });
}
export const saveToken = (game: Game): SaveToken => ({ runId: game.core.runId, revision: game.core.revision });
function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 100;
}
function validateMutation(value: SaveMutation): void {
  if (!value || Object.keys(value).length !== 4 || Object.keys(value).some(key => !['commandId', 'runId', 'expectedRunId', 'expectedRevision'].includes(key)) || !validText(value.commandId) || !validText(value.runId) ||
      value.expectedRunId !== null && !validText(value.expectedRunId) ||
      !Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < 0 ||
      value.expectedRunId === null && value.expectedRevision !== 0) {
    throw new RuleError('INVALID_MUTATION', '存档操作的身份或版本无效');
  }
}
function reidentify(game: Game, runId: string): Game {
  const next = structuredClone(game);
  next.core.runId = runId; next.core.revision = 0;
  if (next.core.activeEvent) next.core.activeEvent.instanceId = runId + ':' + next.core.activeEvent.id;
  validateGame(next);
  return next;
}
function checkpoint(snapshot: Game, kind: SaveCheckpoint['kind']): SaveCheckpoint {
  return { format: 'chenyuan-checkpoint', version: 1, kind,
    sourceRunId: snapshot.core.runId, sourceRevision: snapshot.core.revision,
    versions: { ...currentVersions }, snapshot: structuredClone(snapshot) };
}
function validateCheckpoint(value: unknown): asserts value is SaveCheckpoint {
  if (!value || typeof value !== 'object') throw new RuleError('CHECKPOINT_INVALID', '检查点格式无效');
  const c = value as SaveCheckpoint;
  if (c.format !== 'chenyuan-checkpoint' || c.version !== 1 || !['breakthrough', 'trial'].includes(c.kind)) {
    throw new RuleError('CHECKPOINT_INVALID', '检查点版本或用途无效');
  }
  validateGame(c.snapshot);
  if (c.sourceRunId !== c.snapshot.core.runId || c.sourceRevision !== c.snapshot.core.revision ||
      fingerprint(c.versions) !== fingerprint(currentVersions)) {
    throw new RuleError('CHECKPOINT_INVALID', '检查点身份或内容版本不一致');
  }
  try {
    const out = resolve(c.snapshot, { type: c.kind === 'trial' ? 'START_TRIAL' : 'BREAKTHROUGH',
      commandId: 'checkpoint-validation', runId: c.sourceRunId, expectedRevision: c.sourceRevision });
    if (out.checkpointKind !== c.kind) throw new Error('checkpoint kind mismatch');
  } catch { throw new RuleError('CHECKPOINT_INVALID', '检查点不是有效的行动前准备状态'); }
}
function storageFailure(error: unknown): Error {
  if (error instanceof RuleError) return error;
  if (error && typeof error === 'object' && 'name' in error && error.name === 'QuotaExceededError') return new RuleError('STORAGE_QUOTA', '存储空间不足，本次操作未提交，原进度保留');
  if (error && typeof error === 'object' && 'name' in error && error.name === 'SecurityError') return new RuleError('STORAGE_DENIED', '本地存储不可访问，已有数据未改动');
  return new RuleError('STORAGE_ABORTED', '存储事务失败，本次操作未提交，原进度保留');
}

function migrateTransaction(tx: IDBTransaction, complete: (value: void) => void, abort: (error: unknown) => void): void {
      const state = tx.objectStore(FULL_STATE_STORE), request = state.get('current');
      request.onsuccess = () => {
        try {
          if (request.result === undefined) {
            const count = state.count();
            count.onsuccess = () => {
              if (count.result) abort(new RuleError('MIGRATION_SOURCE_MISSING', '主存档缺失，已有备份保留，请先恢复或导出'));
            else if (tx.db.objectStoreNames.contains('state')) {
              const legacy = tx.objectStore('state').count();
              legacy.onsuccess = () => legacy.result ? abort(new RuleError('MIGRATION_SOURCE_MISSING', 'full主档缺失但旧资料仍在，未将其当作新空档')) : complete(undefined);
            } else complete(undefined);
            };
            return;
          }
          const raw = request.result;
          try { validateGame(raw); ensureCheckpointScope(tx, raw, () => complete(undefined), abort); return; }
          catch (error) { if (!(error instanceof RuleError) || error.code !== 'SAVE_VERSION') throw error; }
          const migrated = parseGame(JSON.stringify(raw));
          const ownerRead = state.get('checkpoint-owner');
          let oldOwner: unknown; ownerRead.onsuccess = () => { oldOwner = ownerRead.result; };
          const readPrevious = state.get('previous');
          let previousRaw: unknown;
          readPrevious.onsuccess = () => { previousRaw = readPrevious.result; };
          const readCheckpoint = state.get('checkpoint');
          readCheckpoint.onsuccess = () => {
            try {
              const convertedPrevious = previousRaw === undefined ? null : parseGame(JSON.stringify(previousRaw));
              let convertedCheckpoint: SaveCheckpoint | null = null;
              if (readCheckpoint.result !== undefined) {
                const old = readCheckpoint.result as SaveCheckpoint;
                if (old.format !== 'chenyuan-checkpoint' || old.version !== 1 || !['breakthrough', 'trial'].includes(old.kind)) throw new RuleError('CHECKPOINT_INVALID', '旧检查点格式无效');
                const snapshot = parseGame(JSON.stringify(old.snapshot));
                const originalVersions = { format: old.snapshot.format, version: old.snapshot.version, schemaVersion: old.snapshot.core.schemaVersion, contentVersion: old.snapshot.core.contentVersion, balanceVersion: old.snapshot.core.balanceVersion };
                if (fingerprint(old.versions) !== fingerprint(originalVersions)) throw new RuleError('CHECKPOINT_INVALID', '旧检查点版本标记不一致');
                if (old.sourceRunId !== snapshot.core.runId || old.sourceRevision !== snapshot.core.revision) throw new RuleError('CHECKPOINT_INVALID', '旧检查点身份不一致');
                convertedCheckpoint = checkpoint(snapshot, old.kind);
                if (oldOwner !== undefined) validateScope(oldOwner, convertedCheckpoint, migrated);
                else if (old.sourceRunId !== migrated.core.runId) throw new RuleError('CHECKPOINT_OWNERSHIP', '旧内容检查点属于另一人生，原记录保留');
                validateCheckpoint(convertedCheckpoint);
              }
              const mutation: SaveMutation = { commandId: crypto.randomUUID(), runId: crypto.randomUUID(), expectedRunId: migrated.core.runId, expectedRevision: migrated.core.revision };
              validateMutation(mutation);
              const backup = tx.objectStore(FULL_BACKUP_STORE), prefix = 'migration/' + mutation.commandId;
              backup.put(raw, prefix + '/current');
              if (oldOwner !== undefined) backup.put(oldOwner, prefix + '/checkpoint-owner');
              if (previousRaw !== undefined) backup.put(previousRaw, prefix + '/previous');
              if (readCheckpoint.result !== undefined) backup.put(readCheckpoint.result, prefix + '/checkpoint');
              backup.put({ kind: 'content', mutation }, prefix + '/identity');
              state.put(reidentify(migrated, mutation.runId), 'current');
              if (convertedPrevious) state.put(convertedPrevious, 'previous'); else state.delete('previous');
              if (convertedCheckpoint) { state.put(convertedCheckpoint, 'checkpoint'); state.put(checkpointScope(convertedCheckpoint, mutation.runId), 'checkpoint-owner'); }
              else if (oldOwner !== undefined) throw new RuleError('CHECKPOINT_INVALID', '旧归属记录缺少检查点');
              const receipt: ControlReceipt = { format: 'chenyuan-control-receipt', version: 1, kind: 'MIGRATE', mutation, fingerprint: fingerprint(raw) };
              const receipts = tx.objectStore(FULL_RECEIPT_STORE); receipts.clear(); receipts.put(receipt, mutation.runId + ':' + mutation.commandId);
              complete(undefined);
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
}

/** No state is returned until the containing transaction completes. */
export class FullSaveRepository {
  private closed = false;
  private constructor(private readonly db: IDBDatabase) {
    db.onversionchange = () => this.close();
  }
  static async open(name = FULL_DB_NAME): Promise<FullSaveRepository> {
    if (!globalThis.indexedDB) throw new RuleError('STORAGE_UNAVAILABLE', '浏览器未提供本地存储，未创建临时存档');
    const db = await new Promise<IDBDatabase>((accept, reject) => {
      const request = indexedDB.open(name, FULL_DB_VERSION);
      let abandoned = false, failure: unknown;
      request.onblocked = () => {
        abandoned = true;
        reject(new RuleError('STORAGE_BLOCKED', '存档被旧页面占用，请关闭旧页面后重试'));
      };
      request.onupgradeneeded = (event) => {
        const transaction = request.transaction!, connection = request.result;
        if (abandoned) { transaction.abort(); return; }
        if (event.oldVersion >= 2 && stores.some(store => !connection.objectStoreNames.contains(store)) ||
            event.oldVersion === 1 && (!connection.objectStoreNames.contains('state') || !connection.objectStoreNames.contains('receipts'))) {
          failure = new RuleError('DB_SCHEMA', '数据库结构不匹配，原件保留，请导出或使用匹配版本'); transaction.abort(); return;
        }
        for (const store of stores) if (!connection.objectStoreNames.contains(store)) connection.createObjectStore(store);
        if (event.oldVersion >= 2) {
          migrateTransaction(transaction, () => {}, error => { failure = error; transaction.abort(); });
          return;
        }
        if (!connection.objectStoreNames.contains('state')) return;
        const old = transaction.objectStore('state'), records: Record<string, unknown> = {};
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
                  if (count.result) { failure = new RuleError('MIGRATION_SOURCE_MISSING', '主存档缺失，旧记录保留，请先恢复或导出'); transaction.abort(); }
                };
                return;
              }
              const source = parseGame(JSON.stringify(records.current));
              const previous = records.previous === undefined ? null : parseGame(JSON.stringify(records.previous));
              const priorCheckpoint = records.checkpoint === undefined ? null : parseGame(JSON.stringify(records.checkpoint));
              if (priorCheckpoint && priorCheckpoint.core.runId !== source.core.runId) throw new RuleError('CHECKPOINT_OWNERSHIP', '旧检查点属于另一人生，原记录保留');
              const preparedCheckpoint = priorCheckpoint ? checkpoint(priorCheckpoint, 'breakthrough') : null;
              if (preparedCheckpoint) validateCheckpoint(preparedCheckpoint);
              const mutation: SaveMutation = { commandId: crypto.randomUUID(), runId: crypto.randomUUID(),
                expectedRunId: source.core.runId, expectedRevision: source.core.revision };
              validateMutation(mutation);
              const backup = transaction.objectStore(FULL_BACKUP_STORE), prefix = 'migration/' + mutation.commandId;
              for (const [key, raw] of Object.entries(records)) if (raw !== undefined) backup.put(raw, prefix + '/' + key);
              backup.put({ kind: 'legacy-v1', mutation }, prefix + '/identity');
              transaction.objectStore(FULL_STATE_STORE).put(reidentify(source, mutation.runId), 'current');
              if (previous) transaction.objectStore(FULL_STATE_STORE).put(previous, 'previous');
              if (preparedCheckpoint) {
                transaction.objectStore(FULL_STATE_STORE).put(preparedCheckpoint, 'checkpoint');
                transaction.objectStore(FULL_STATE_STORE).put(checkpointScope(preparedCheckpoint, mutation.runId), 'checkpoint-owner');
              }
              const receipt: ControlReceipt = { format: 'chenyuan-control-receipt', version: 1, kind: 'MIGRATE', mutation, fingerprint: fingerprint(records.current) };
              transaction.objectStore(FULL_RECEIPT_STORE).put(receipt, mutation.runId + ':' + mutation.commandId);
            } catch (error) { failure = error; transaction.abort(); }
          };
        }
      };
      request.onerror = () => reject(failure ? storageFailure(failure) : (request.error?.name === 'VersionError' ?
        new RuleError('DB_VERSION', '存档数据库版本较新，请保留数据并使用匹配版本') : storageFailure(request.error)));
      request.onsuccess = () => {
        if (abandoned) { request.result.close(); return; }
        if (stores.some(store => !request.result.objectStoreNames.contains(store))) {
          request.result.close(); reject(new RuleError('DB_SCHEMA', '数据库结构不匹配，未建立空档')); return;
        }
        accept(request.result);
      };
    }).catch(error => { throw storageFailure(error); });
    const repository = new FullSaveRepository(db);
    try { await repository.migrateContent(); return repository; }
    catch (error) { repository.close(); throw error; }
  }
  close(): void { if (!this.closed) { this.closed = true; this.db.close(); } }
  /** Read without choosing a database version or running any migration. */
  static async exportRaw(name = FULL_DB_NAME): Promise<RawDatabaseBackup | null> {
    if (!globalThis.indexedDB) throw new RuleError('STORAGE_UNAVAILABLE', '浏览器未提供本地存储');
    return new Promise<RawDatabaseBackup | null>((accept, reject) => {
      let absent = false, abandoned = false;
      const request = indexedDB.open(name);
      request.onupgradeneeded = () => { absent = true; request.transaction!.abort(); };
      request.onblocked = () => { abandoned = true; reject(new RuleError('STORAGE_BLOCKED', '数据库正在更新，请关闭占用页面后再导出')); };
      request.onerror = () => absent ? accept(null) : reject(storageFailure(request.error));
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) { db.close(); return; }
        db.onversionchange = () => db.close();
        const names = Array.from(db.objectStoreNames);
        const result: RawDatabaseBackup = { format: 'chenyuan-raw-database-backup', version: 1,
          database: { name, version: db.version }, stores: names.map(name => ({ name, entries: [] })) };
        if (!names.length) { db.close(); accept(result); return; }
        const tx = db.transaction(names, 'readonly');
        for (const store of result.stores) {
          const cursor = tx.objectStore(store.name).openCursor();
          cursor.onsuccess = () => {
            if (!cursor.result) return;
            store.entries.push({ key: cursor.result.key, value: cursor.result.value }); cursor.result.continue();
          };
        }
        tx.oncomplete = () => { db.close(); accept(result); };
        tx.onabort = () => { db.close(); reject(storageFailure(tx.error)); };
      };
    }).catch(error => { throw storageFailure(error); });
  }
  private assertOpen(): void {
    if (this.closed) throw new RuleError('STORAGE_CLOSED', '存档连接已更新或关闭，请重新载入');
  }
  private transaction<T>(mode: IDBTransactionMode, operation: (tx: IDBTransaction, complete: (value: T) => void, abort: (error: unknown) => void) => void): Promise<T> {
    return new Promise((accept, reject) => {
      this.assertOpen();
      let tx: IDBTransaction;
      try { tx = this.db.transaction(this.db.objectStoreNames.contains('state') ? [...stores, 'state'] : stores, mode); }
      catch (error) { reject(storageFailure(error)); return; }
      let value: T, failure: unknown;
      const complete = (result: T) => { value = result; };
      tx.oncomplete = () => accept(value);
      tx.onabort = () => reject(storageFailure(failure ?? tx.error));
      tx.onerror = () => {};
      const abort = (error: unknown) => { failure = error; tx.abort(); };
      try { operation(tx, complete, abort); }
      catch (error) { abort(error); }
    });
  }
  private read<T>(key: string, validate: (value: unknown) => void): Promise<T | null> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const request = tx.objectStore(FULL_STATE_STORE).get(key);
      request.onsuccess = () => {
        try { if (request.result !== undefined) validate(request.result); complete(request.result ?? null); }
        catch (error) { abort(error); }
      };
    });
  }
  load(): Promise<Game | null> { return this.read<Game>('current', validateGame); }
  loadCheckpoint(): Promise<SaveCheckpoint | null> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE), read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result; if (current !== undefined) validateGame(current);
          const cpRead = state.get('checkpoint');
          cpRead.onsuccess = () => {
            try {
              if (cpRead.result === undefined) { complete(null); return; }
              validateCheckpoint(cpRead.result); const cp = cpRead.result;
              validateGame(current);
              const owner = state.get('checkpoint-owner');
              owner.onsuccess = () => { try { validateScope(owner.result, cp, current); complete(cp); } catch (error) { abort(error); } };
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    });
  }
  loadPrevious(): Promise<Game | null> { return this.read<Game>('previous', validateGame); }
  archives(): Promise<{ key: IDBValidKey; value: unknown }[]> {
    return this.transaction('readonly', (tx, complete, abort) => {
      const values: { key: IDBValidKey; value: unknown }[] = [];
      const cursor = tx.objectStore(FULL_BACKUP_STORE).openCursor();
      cursor.onsuccess = () => {
        if (!cursor.result) { complete(values); return; }
        values.push({ key: cursor.result.key, value: cursor.result.value }); cursor.result.continue();
      };
    });
  }
  private migrateContent(): Promise<void> {
    return this.transaction('readwrite', migrateTransaction);
  }
  async create(name: string, mutation: SaveMutation): Promise<ControlOutcome> {
    mutation = structuredClone(mutation); validateMutation(mutation);
    return this.replace('CREATE', mutation, newGame(name, mutation.runId), { name });
  }
  async importText(raw: string, mutation: SaveMutation): Promise<ControlOutcome> {
    mutation = structuredClone(mutation); validateMutation(mutation);
    const imported = parseGame(raw);
    if (imported.core.runId === mutation.runId) throw new RuleError('NEW_RUN_REQUIRED', '导入存档必须使用新的人生编号');
    return this.replace('IMPORT', mutation, reidentify(imported, mutation.runId), { raw });
  }
  private replace(kind: 'CREATE' | 'IMPORT', mutation: SaveMutation, candidate: Game, payload: unknown): Promise<ControlOutcome> {
    const print = fingerprint({ kind, mutation, payload });
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE), receipts = tx.objectStore(FULL_RECEIPT_STORE);
      const read = state.get('current');
      read.onsuccess = () => {
        const existing: Game | undefined = read.result;
        try {
          if (existing !== undefined) validateGame(existing);
          readReceipt(receipts, mutation.runId + ':' + mutation.commandId, (storedReceipt) => {
            try {
              if (storedReceipt !== undefined) {
                if (storedReceipt && typeof storedReceipt === 'object' && 'format' in storedReceipt && storedReceipt.format === 'chenyuan-receipt') { validateCommandReceipt(storedReceipt, existing!); throw new RuleError('COMMAND_ID_REUSED', '同一编号已用于游戏指令'); }
                validateControlReceipt(storedReceipt);
                if (storedReceipt.kind !== kind || storedReceipt.fingerprint !== print) throw new RuleError('COMMAND_ID_REUSED', '同一操作编号对应不同内容');
                if (fingerprint(storedReceipt.mutation) !== fingerprint(mutation)) throw new RuleError('RECEIPT_INVALID', '存档操作回执身份损坏');
                if (!existing || existing.core.runId !== mutation.runId) throw new RuleError('RUN_MISMATCH', '当前存档已经切换');
                complete({ state: existing, replayed: true }); return;
              }
              if (existing ? existing.core.runId !== mutation.expectedRunId || existing.core.revision !== mutation.expectedRevision : mutation.expectedRunId !== null) {
                throw new RuleError('STALE_REVISION', '当前存档已变化，请重新读取并确认');
              }
              if (existing?.core.runId === mutation.runId) throw new RuleError('NEW_RUN_REQUIRED', '替换存档必须使用新的人生编号');
              if (existing) state.put(existing, 'previous');
              state.put(candidate, 'current'); state.delete('checkpoint'); state.delete('checkpoint-owner'); receipts.clear();
              const receipt: ControlReceipt = { format: 'chenyuan-control-receipt', version: 1, kind, mutation: structuredClone(mutation), fingerprint: print };
              receipts.put(receipt, mutation.runId + ':' + mutation.commandId);
              complete({ state: candidate, replayed: false });
            } catch (error) { abort(error); }
          }, abort);
        } catch (error) { abort(error); }
      };
    });
  }
  async restoreCheckpoint(mutation: SaveMutation): Promise<ControlOutcome> {
    mutation = structuredClone(mutation); validateMutation(mutation);
    if (mutation.expectedRunId === null) throw new RuleError('INVALID_MUTATION', '恢复检查点需要当前存档身份');
    const print = fingerprint({ kind: 'RESTORE', mutation, checkpoint: 'active' });
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE), receipts = tx.objectStore(FULL_RECEIPT_STORE), currentRead = state.get('current');
      currentRead.onsuccess = () => {
        try {
          const current = currentRead.result; validateGame(current);
          readReceipt(receipts, mutation.runId + ':' + mutation.commandId, (storedReceipt) => {
            try {
              if (storedReceipt !== undefined) {
                if (storedReceipt && typeof storedReceipt === 'object' && 'format' in storedReceipt && storedReceipt.format === 'chenyuan-receipt') { validateCommandReceipt(storedReceipt, current); throw new RuleError('COMMAND_ID_REUSED', '同一编号已用于游戏指令'); }
                validateControlReceipt(storedReceipt);
                if (storedReceipt.kind !== 'RESTORE' || storedReceipt.fingerprint !== print) throw new RuleError('COMMAND_ID_REUSED', '同一编号对应不同恢复意图');
                if (fingerprint(storedReceipt.mutation) !== fingerprint(mutation)) throw new RuleError('RECEIPT_INVALID', '恢复回执身份损坏');
                if (current.core.runId !== mutation.runId) throw new RuleError('RUN_MISMATCH', '当前人生已经切换');
                complete({ state: current, replayed: true }); return;
              }
              if (current.core.runId !== mutation.expectedRunId || current.core.revision !== mutation.expectedRevision) throw new RuleError('STALE_REVISION', '存档已变化，请重新确认恢复');
              if (current.core.runId === mutation.runId) throw new RuleError('NEW_RUN_REQUIRED', '恢复需要新的人生编号');
              const readCP = state.get('checkpoint');
              readCP.onsuccess = () => {
                try {
                  if (readCP.result === undefined) throw new RuleError('NO_CHECKPOINT', '尚无可恢复的准备检查点');
                  validateCheckpoint(readCP.result); const cp = readCP.result;
                  const owner = state.get('checkpoint-owner');
                  owner.onsuccess = () => {
                    try {
                      validateScope(owner.result, cp, current);
                      const restored = reidentify(cp.snapshot, mutation.runId);
                      state.put(current, 'previous'); state.put(restored, 'current');
                      state.put(checkpointScope(cp, restored.core.runId), 'checkpoint-owner');
                      // The complete original checkpoint remains reusable.
                      receipts.clear();
                      const receipt: ControlReceipt = { format: 'chenyuan-control-receipt', version: 1, kind: 'RESTORE', mutation, fingerprint: print };
                      receipts.put(receipt, mutation.runId + ':' + mutation.commandId);
                      complete({ state: restored, replayed: false });
                    } catch (error) { abort(error); }
                  };
                } catch (error) { abort(error); }
              };
            } catch (error) { abort(error); }
          }, abort);
        } catch (error) { abort(error); }
      };
    });
  }
  async execute(command: Command): Promise<CommitOutcome> {
    validateCommand(command); command = structuredClone(command); validateCommand(command);
    const print = fingerprint(command);
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE), receipts = tx.objectStore(FULL_RECEIPT_STORE);
      const read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result; validateGame(current);
          if (current.core.runId !== command.runId) throw new RuleError('RUN_MISMATCH', '当前存档已经切换，请重新读取');
          readReceipt(receipts, command.runId + ':' + command.commandId, (storedReceipt) => {
            try {
              if (storedReceipt !== undefined) {
                if (storedReceipt && typeof storedReceipt === 'object' && 'format' in storedReceipt && storedReceipt.format === 'chenyuan-control-receipt') { validateControlReceipt(storedReceipt); throw new RuleError('COMMAND_ID_REUSED', '同一编号已用于存档操作'); }
                validateCommandReceipt(storedReceipt, current);
                const receipt = storedReceipt;
                if (receipt.fingerprint !== print) throw new RuleError('COMMAND_ID_REUSED', '同一指令编号对应不同内容');
                complete({ state: current, result: receipt.result, replayed: true }); return;
              }
              const outcome = resolve(current, command);
              state.put(current, 'previous'); state.put(outcome.nextState, 'current');
              if (outcome.checkpointKind) {
                const prepared = checkpoint(current, outcome.checkpointKind);
                state.put(prepared, 'checkpoint'); state.put(checkpointScope(prepared, current.core.runId), 'checkpoint-owner');
              }
              const receipt: CommandReceipt = { format: 'chenyuan-receipt', version: 1, command: structuredClone(command), fingerprint: print, result: outcome.result };
              receipts.put(receipt, command.runId + ':' + command.commandId);
              complete({ state: outcome.nextState, result: outcome.result, replayed: false });
            } catch (error) { abort(error); }
          }, abort);
        } catch (error) { abort(error); }
      };
    });
  }
}
