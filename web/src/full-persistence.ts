import { newGame, parseGame, resolve, validateCommand, validateGame } from '../../src/full/engine.ts';
import { RuleError } from '../../src/full/errors.ts';
import { currentVersions } from '../../src/full/versions.ts';
import type { Command, Game } from '../../src/full/types.ts';
import type { CommandReceipt, CommitOutcome, SaveCheckpoint } from '../../src/full/contracts.ts';

export const FULL_DB_NAME = 'chenyuan-playable-v1';
export const FULL_DB_VERSION = 2;
export const FULL_STATE_STORE = 'full-state';
export const FULL_RECEIPT_STORE = 'full-receipts';
export const FULL_BACKUP_STORE = 'full-backups';
const stores = [FULL_STATE_STORE, FULL_RECEIPT_STORE, FULL_BACKUP_STORE];

export interface SaveToken { runId: string; revision: number; }
/** runId is the fresh destination; expectedRunId/revision identify the replaced run. */
export interface SaveMutation {
  commandId: string; runId: string; expectedRunId: string | null; expectedRevision: number;
}
export interface ControlOutcome { state: Game; replayed: boolean; }
interface ControlReceipt {
  format: 'chenyuan-control-receipt'; version: 1; kind: 'CREATE' | 'IMPORT' | 'MIGRATE';
  mutation: SaveMutation; fingerprint: string;
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
function fingerprint(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(fingerprint).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key =>
    JSON.stringify(key) + ':' + fingerprint((value as Record<string, unknown>)[key])).join(',') + '}';
  return JSON.stringify(value) ?? 'undefined';
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
  if (error instanceof Error && error.name === 'QuotaExceededError') return new RuleError('STORAGE_QUOTA', '存储空间不足，本次操作未提交，原进度保留');
  return new RuleError('STORAGE_ABORTED', '存储事务失败，本次操作未提交，原进度保留');
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
      request.onupgradeneeded = () => {
        const transaction = request.transaction!, connection = request.result;
        if (abandoned) { transaction.abort(); return; }
        for (const store of stores) if (!connection.objectStoreNames.contains(store)) connection.createObjectStore(store);
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
              if (preparedCheckpoint) transaction.objectStore(FULL_STATE_STORE).put(preparedCheckpoint, 'checkpoint');
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
        accept(request.result);
      };
    });
    const repository = new FullSaveRepository(db);
    try { await repository.migrateContent(); return repository; }
    catch (error) { repository.close(); throw error; }
  }
  close(): void { if (!this.closed) { this.closed = true; this.db.close(); } }
  private assertOpen(): void {
    if (this.closed) throw new RuleError('STORAGE_CLOSED', '存档连接已更新或关闭，请重新载入');
  }
  private transaction<T>(mode: IDBTransactionMode, operation: (tx: IDBTransaction, complete: (value: T) => void, abort: (error: unknown) => void) => void): Promise<T> {
    return new Promise((accept, reject) => {
      this.assertOpen();
      const tx = this.db.transaction(stores, mode);
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
  loadCheckpoint(): Promise<SaveCheckpoint | null> { return this.read<SaveCheckpoint>('checkpoint', validateCheckpoint); }
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
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE), request = state.get('current');
      request.onsuccess = () => {
        try {
          if (request.result === undefined) {
            const count = state.count();
            count.onsuccess = () => {
              if (count.result) abort(new RuleError('MIGRATION_SOURCE_MISSING', '主存档缺失，已有备份保留，请先恢复或导出'));
              else complete(undefined);
            };
            return;
          }
          const raw = request.result;
          try { validateGame(raw); complete(undefined); return; }
          catch (error) { if (!(error instanceof RuleError) || error.code !== 'SAVE_VERSION') throw error; }
          const migrated = parseGame(JSON.stringify(raw));
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
                if (old.sourceRunId !== migrated.core.runId) throw new RuleError('CHECKPOINT_OWNERSHIP', '旧内容检查点属于另一人生，原记录保留');
                convertedCheckpoint = checkpoint(snapshot, old.kind);
                validateCheckpoint(convertedCheckpoint);
              }
              const mutation: SaveMutation = { commandId: crypto.randomUUID(), runId: crypto.randomUUID(), expectedRunId: migrated.core.runId, expectedRevision: migrated.core.revision };
              validateMutation(mutation);
              const backup = tx.objectStore(FULL_BACKUP_STORE), prefix = 'migration/' + mutation.commandId;
              backup.put(raw, prefix + '/current');
              if (previousRaw !== undefined) backup.put(previousRaw, prefix + '/previous');
              if (readCheckpoint.result !== undefined) backup.put(readCheckpoint.result, prefix + '/checkpoint');
              backup.put({ kind: 'content', mutation }, prefix + '/identity');
              state.put(reidentify(migrated, mutation.runId), 'current');
              if (convertedPrevious) state.put(convertedPrevious, 'previous'); else state.delete('previous');
              if (convertedCheckpoint) state.put(convertedCheckpoint, 'checkpoint');
              const receipt: ControlReceipt = { format: 'chenyuan-control-receipt', version: 1, kind: 'MIGRATE', mutation, fingerprint: fingerprint(raw) };
              const receipts = tx.objectStore(FULL_RECEIPT_STORE); receipts.clear(); receipts.put(receipt, mutation.runId + ':' + mutation.commandId);
              complete(undefined);
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    });
  }
  create(name: string, mutation: SaveMutation): Promise<ControlOutcome> {
    mutation = structuredClone(mutation); validateMutation(mutation);
    return this.replace('CREATE', mutation, newGame(name, mutation.runId), { name });
  }
  importText(raw: string, mutation: SaveMutation): Promise<ControlOutcome> {
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
          const receiptRead = receipts.get(mutation.runId + ':' + mutation.commandId);
          receiptRead.onsuccess = () => {
            try {
              if (receiptRead.result) {
                if (receiptRead.result.fingerprint !== print) throw new RuleError('COMMAND_ID_REUSED', '同一操作编号对应不同内容');
                if (!existing || existing.core.runId !== mutation.runId) throw new RuleError('RUN_MISMATCH', '当前存档已经切换');
                complete({ state: existing, replayed: true }); return;
              }
              if (existing ? existing.core.runId !== mutation.expectedRunId || existing.core.revision !== mutation.expectedRevision : mutation.expectedRunId !== null) {
                throw new RuleError('STALE_REVISION', '当前存档已变化，请重新读取并确认');
              }
              if (existing?.core.runId === mutation.runId) throw new RuleError('NEW_RUN_REQUIRED', '替换存档必须使用新的人生编号');
              if (existing) state.put(existing, 'previous');
              state.put(candidate, 'current'); state.delete('checkpoint'); receipts.clear();
              const receipt: ControlReceipt = { format: 'chenyuan-control-receipt', version: 1, kind, mutation: structuredClone(mutation), fingerprint: print };
              receipts.put(receipt, mutation.runId + ':' + mutation.commandId);
              complete({ state: candidate, replayed: false });
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    });
  }
  execute(command: Command): Promise<CommitOutcome> {
    validateCommand(command); command = structuredClone(command); validateCommand(command);
    const print = fingerprint(command);
    return this.transaction('readwrite', (tx, complete, abort) => {
      const state = tx.objectStore(FULL_STATE_STORE), receipts = tx.objectStore(FULL_RECEIPT_STORE);
      const read = state.get('current');
      read.onsuccess = () => {
        try {
          const current = read.result; validateGame(current);
          if (current.core.runId !== command.runId) throw new RuleError('RUN_MISMATCH', '当前存档已经切换，请重新读取');
          const readReceipt = receipts.get(command.runId + ':' + command.commandId);
          readReceipt.onsuccess = () => {
            try {
              if (readReceipt.result) {
                const receipt = readReceipt.result as CommandReceipt;
                if (receipt.format !== 'chenyuan-receipt' || receipt.version !== 1 || !receipt.result) throw new RuleError('RECEIPT_INVALID', '指令回执格式无效');
                if (receipt.fingerprint !== print) throw new RuleError('COMMAND_ID_REUSED', '同一指令编号对应不同内容');
                complete({ state: current, result: receipt.result, replayed: true }); return;
              }
              const outcome = resolve(current, command);
              state.put(current, 'previous'); state.put(outcome.nextState, 'current');
              if (outcome.checkpointKind) state.put(checkpoint(current, outcome.checkpointKind), 'checkpoint');
              const receipt: CommandReceipt = { format: 'chenyuan-receipt', version: 1, command: structuredClone(command), fingerprint: print, result: outcome.result };
              receipts.put(receipt, command.runId + ':' + command.commandId);
              complete({ state: outcome.nextState, result: outcome.result, replayed: false });
            } catch (error) { abort(error); }
          };
        } catch (error) { abort(error); }
      };
    });
  }
}
