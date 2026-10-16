import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import type { Action, Command, Game } from '../../src/full/types.ts';
import type { ActionResult, CommitOutcome } from '../../src/full/contracts.ts';
import { FullSaveRepository, rawBackupText } from './full-persistence';
import type { ControlOutcome, SaveMutation } from './full-persistence';

export const useGame = defineStore('game', () => {
  const game = shallowRef<Game | null>(null), busy = ref(false), ready = ref(false), available = ref(false);
  const error = ref(''), warning = ref(''), saved = ref(false), hasCheckpoint = ref(false);
  const lastResult = shallowRef<ActionResult | null>(null), lastReplayed = ref(false), canRetry = ref(false);
  let repository: FullSaveRepository | undefined, channel: BroadcastChannel | undefined;
  let pending: (() => Promise<CommitOutcome | ControlOutcome>) | null = null;
  let pendingCommandId: string | undefined;
  let failedIntent = false, refreshQueued = false, disposed = false;
  const message = (value: unknown) => value instanceof Error ? value.message : String(value);
  const codeOf = (value: unknown) => value && typeof value === 'object' && 'code' in value ? String(value.code) : '';
  const mutation = (): SaveMutation => ({ commandId: crypto.randomUUID(), runId: crypto.randomUUID(),
    expectedRunId: game.value?.core.runId ?? null, expectedRevision: game.value?.core.revision ?? 0 });

  async function checkpointInfo() {
    if (!repository || !game.value) { hasCheckpoint.value = false; return; }
    try { hasCheckpoint.value = !!await repository.loadCheckpoint(); warning.value = ''; }
    catch (value) { hasCheckpoint.value = false; warning.value = '检查点无法读取：' + message(value); }
  }
  async function refresh() {
    if (!repository) return;
    const current = await repository.load();
    if (disposed) return;
    if (current?.core.runId !== game.value?.core.runId || current?.core.revision !== game.value?.core.revision) {
      lastResult.value = null; lastReplayed.value = false;
    }
    game.value = current;
    await checkpointInfo();
    if (!failedIntent && !busy.value) saved.value = !!current;
  }
  async function init() {
    if (busy.value) return;
    busy.value = true; ready.value = false; available.value = false; error.value = ''; warning.value = '';
    repository?.close(); channel?.close(); repository = undefined; channel = undefined;
    pending = null; pendingCommandId = undefined; canRetry.value = false;
    try {
      const opened = await FullSaveRepository.open();
      if (disposed) { opened.close(); return; }
      repository = opened; available.value = true;
      await refresh();
      saved.value = !!game.value && !failedIntent;
      if ('BroadcastChannel' in globalThis) {
        channel = new BroadcastChannel('chenyuan-full-progress');
        channel.onmessage = () => {
          if (busy.value) { refreshQueued = true; return; }
          refresh().catch(value => {
            error.value = '无法同步存档：' + message(value); saved.value = false;
            if (codeOf(value) === 'STORAGE_CLOSED') available.value = false;
          });
        };
      }
    } catch (value) {
      error.value = '无法读取存档：' + message(value); saved.value = false; available.value = false;
      repository?.close(); repository = undefined;
    } finally { ready.value = true; busy.value = false; }
  }
  async function write(operation: () => Promise<CommitOutcome | ControlOutcome>, commandId?: string) {
    if (busy.value || !repository) return;
    busy.value = true; error.value = ''; saved.value = false; canRetry.value = false; pending = operation; pendingCommandId = commandId;
    try {
      const outcome = await operation();
      if (disposed) return;
      game.value = outcome.state; lastResult.value = 'result' in outcome ? outcome.result : null; lastReplayed.value = outcome.replayed;
      failedIntent = false; pending = null; pendingCommandId = undefined; saved.value = true;
      await checkpointInfo();
      try { channel?.postMessage({ runId: outcome.state.core.runId, revision: outcome.state.core.revision }); }
      catch { warning.value = '进度已保存，其他页面暂未收到同步提示'; }
    } catch (value) {
      failedIntent = true; error.value = message(value); saved.value = false; lastResult.value = null;
      const code = codeOf(value);
      if (code === 'STORAGE_CLOSED') available.value = false;
      canRetry.value = ['STORAGE_QUOTA', 'STORAGE_ABORTED', 'STORAGE_DENIED'].includes(code);
      if (!canRetry.value) { pending = null; pendingCommandId = undefined; }
      try { await refresh(); } catch (readError) { warning.value = '原进度暂时无法重读：' + message(readError); }
    } finally {
      busy.value = false;
      if (refreshQueued) { refreshQueued = false; refresh().catch(value => { warning.value = message(value); }); }
    }
  }
  function validationError(text: string) {
    failedIntent = true; error.value = text; saved.value = false; canRetry.value = false; pending = null; pendingCommandId = undefined;
  }
  async function start(name: string) {
    if (!repository || game.value) return;
    const intent = mutation(); await write(() => repository!.create(name.trim(), intent));
  }
  function prepareAction(action: Action): Command | null {
    if (!game.value || !repository || !available.value || busy.value) return null;
    return structuredClone({ ...action, commandId: crypto.randomUUID(), runId: game.value.core.runId, expectedRevision: game.value.core.revision });
  }
  async function actPrepared(input: Command) {
    if (!repository) return;
    const command = structuredClone({ ...input });
    await write(() => repository!.execute(command), command.commandId);
  }
  async function act(action: Action) {
    const command = prepareAction(action);
    if (command) await actPrepared(command);
  }
  async function importText(raw: string) {
    if (!repository) return;
    const intent = mutation(); await write(() => repository!.importText(raw, intent));
  }
  async function restart(name: string) {
    if (!repository || !game.value) return;
    const intent = mutation(); await write(() => repository!.create(name.trim(), intent));
  }
  async function checkpoint() {
    if (!repository || !game.value) return;
    const intent = mutation(); await write(() => repository!.restoreCheckpoint(intent));
  }
  async function retry() { if (pending && canRetry.value) await write(pending, pendingCommandId); }
  function discardRetryFor(commandId: string) {
    if (pendingCommandId !== commandId) return;
    pending = null; pendingCommandId = undefined; canRetry.value = false;
  }
  async function rawText(): Promise<string | null> {
    const backup = await FullSaveRepository.exportRaw(); return backup ? rawBackupText(backup) : null;
  }
  const saveLabel = computed(() => !ready.value ? '读取中' : busy.value ? '保存中' : saved.value ? '已保存' : failedIntent ? '本次未保存' : available.value ? '尚无存档' : '存储不可用');
  onScopeDispose(() => { disposed = true; repository?.close(); channel?.close(); });
  return { game, busy, ready, available, error, warning, saved, hasCheckpoint, canRetry, lastResult, lastReplayed, saveLabel,
    init, refresh, start, act, prepareAction, actPrepared, discardRetryFor, importText, restart, checkpoint, retry, rawText, validationError };
});
