import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { getTrialRecovery } from '../../src/full/queries.ts';
import type { Action, Command, Game } from '../../src/full/types.ts';
import type { ActionResult, CommitOutcome, SaveCheckpoint } from '../../src/full/contracts.ts';
import { FullSaveRepository, rawBackupText } from './full-persistence';
import type { ControlOutcome, SaveMutation } from './full-persistence';
import {loadedObservation,writeObservation,inputErrorObservation,storageErrorObservation,type Observation,type WriteObservationSource} from './local-events';

export type CheckpointSummary = Pick<SaveCheckpoint, 'kind' | 'sourceRunId' | 'sourceRevision' | 'versions'> & { target: { name: string; realm: Game['core']['player']['realm']; months: number; hp: number; mp: number; inventory: Record<string, number> } };

export const useGame = defineStore('game', () => {
  const game = shallowRef<Game | null>(null), busy = ref(false), ready = ref(false), available = ref(false);
  const error = ref(''), warning = ref(''), saved = ref(false), hasCheckpoint = ref(false);
  const checkpointSummary = shallowRef<CheckpointSummary | null>(null);
  const trialRecovery = shallowRef<ReturnType<typeof getTrialRecovery>>(null);
  const lastResult = shallowRef<ActionResult | null>(null), lastReplayed = ref(false), canRetry = ref(false);
  let repository: FullSaveRepository | undefined, channel: BroadcastChannel | undefined;
  let pending: (() => Promise<CommitOutcome | ControlOutcome>) | null = null;
  let pendingCommandId: string | undefined;
  let pendingObservation: WriteObservationSource | undefined;
  const observers=new Set<{next:(value:Observation)=>void;fault:()=>void}>();
  function observe(next:(value:Observation)=>void,fault:()=>void=()=>{}){const observer={next,fault};observers.add(observer);return()=>observers.delete(observer);}
  function emit(make:()=>Observation){if(!observers.size)return;let value:Observation;try{value=make();}catch{for(const o of observers)try{o.fault();}catch{}return;}for(const o of observers)try{o.next(structuredClone(value));}catch{try{o.fault();}catch{}}}
  let failedIntent = false, refreshQueued = false, disposed = false;
  const message = (value: unknown) => value instanceof Error ? value.message : String(value);
  const codeOf = (value: unknown) => value && typeof value === 'object' && 'code' in value ? String(value.code) : '';
  const mutation = (): SaveMutation => ({ commandId: crypto.randomUUID(), runId: crypto.randomUUID(),
    expectedRunId: game.value?.core.runId ?? null, expectedRevision: game.value?.core.revision ?? 0 });

  async function checkpointInfo() {
    const current = game.value;
    if (!repository || !current) { hasCheckpoint.value = false; checkpointSummary.value = null; trialRecovery.value = null; return; }
    let cp: SaveCheckpoint | null = null;
    try {
      cp = await repository.loadCheckpoint();
      if (game.value !== current) return;
      hasCheckpoint.value = !!cp;
      checkpointSummary.value = cp ? { kind: cp.kind, sourceRunId: cp.sourceRunId, sourceRevision: cp.sourceRevision, versions: { ...cp.versions },
        target: { name: cp.snapshot.core.player.name, realm: cp.snapshot.core.player.realm, months: cp.snapshot.core.world.elapsedMonths,
          hp: cp.snapshot.core.player.hp, mp: cp.snapshot.core.player.mp, inventory: { ...cp.snapshot.core.inventory } } } : null;
      warning.value = '';
    } catch (value) { if (game.value !== current) return; hasCheckpoint.value = false; checkpointSummary.value = null; warning.value = '检查点无法读取：' + message(value); }
    try {
      const previous = await repository.loadPrevious();
      if (game.value === current) trialRecovery.value = getTrialRecovery(current, previous, cp);
    } catch (value) { if (game.value === current) { trialRecovery.value = null; warning.value += ' 上一行动无法核对：' + message(value); } }
  }
  async function refresh(reason?:'sync') {
    if (!repository) return;
    const current = await repository.load();
    if (disposed) return;
    const changed=current?.core.runId !== game.value?.core.runId || current?.core.revision !== game.value?.core.revision;
    if (changed) {
      lastResult.value = null; lastReplayed.value = false;
    }
    game.value = current;
    await checkpointInfo();
    if (!failedIntent && !busy.value) saved.value = !!current;
    if(reason==='sync'&&changed&&current)emit(()=>loadedObservation(current,'sync'));
  }
  async function init() {
    if (busy.value) return;
    busy.value = true; ready.value = false; available.value = false; error.value = ''; warning.value = '';
    repository?.close(); channel?.close(); repository = undefined; channel = undefined;
    pending = null; pendingCommandId = undefined; pendingObservation=undefined; canRetry.value = false;
    try {
      const opened = await FullSaveRepository.open();
      if (disposed) { opened.close(); return; }
      repository = opened; available.value = true;
      await refresh();
      saved.value = !!game.value && !failedIntent;
      if(game.value)emit(()=>loadedObservation(game.value!,'resume'));
      if ('BroadcastChannel' in globalThis) {
        channel = new BroadcastChannel('chenyuan-full-progress');
        channel.onmessage = () => {
          if (busy.value) { refreshQueued = true; return; }
          refresh('sync').catch(value => {
            error.value = '无法同步存档：' + message(value); saved.value = false;
            emit(()=>storageErrorObservation(game.value,codeOf(value)));
            if (codeOf(value) === 'STORAGE_CLOSED') available.value = false;
          });
        };
      }
    } catch (value) {
      error.value = '无法读取存档：' + message(value); saved.value = false; available.value = false;
      emit(()=>storageErrorObservation(game.value,codeOf(value)));
      repository?.close(); repository = undefined;
    } finally { ready.value = true; busy.value = false; }
  }
  async function write(operation: () => Promise<CommitOutcome | ControlOutcome>, commandId?: string, observation?:WriteObservationSource) {
    if (busy.value || !repository) return;
    const before=game.value;
    busy.value = true; error.value = ''; saved.value = false; canRetry.value = false; pending = operation; pendingCommandId = commandId;
    pendingObservation=observation;
    try {
      const outcome = await operation();
      if (disposed) return;
      game.value = outcome.state; lastResult.value = 'result' in outcome ? outcome.result : null; lastReplayed.value = outcome.replayed;
      failedIntent = false; pending = null; pendingCommandId = undefined; pendingObservation=undefined; saved.value = true;
      if(observation)emit(()=>writeObservation(before,outcome.state,observation,'result'in outcome?outcome.result:null,outcome.replayed));
      await checkpointInfo();
      try { channel?.postMessage({ runId: outcome.state.core.runId, revision: outcome.state.core.revision }); }
      catch { warning.value = '进度已保存，其他页面暂未收到同步提示'; }
    } catch (value) {
      failedIntent = true; error.value = message(value); saved.value = false; lastResult.value = null;
      const code = codeOf(value);
      if(observation)emit(()=>writeObservation(before,null,observation,null,false,code||'OTHER'));
      if (code === 'STORAGE_CLOSED') available.value = false;
      canRetry.value = ['STORAGE_QUOTA', 'STORAGE_ABORTED', 'STORAGE_DENIED'].includes(code);
      if (!canRetry.value) { pending = null; pendingCommandId = undefined; pendingObservation=undefined; }
      try { await refresh(); } catch (readError) { warning.value = '原进度暂时无法重读：' + message(readError); }
    } finally {
      busy.value = false;
      if (refreshQueued) { refreshQueued = false; refresh('sync').catch(value => { warning.value = message(value);emit(()=>storageErrorObservation(game.value,codeOf(value))); }); }
    }
  }
  function validationError(text: string) {
    failedIntent = true; error.value = text; saved.value = false; canRetry.value = false; pending = null; pendingCommandId = undefined;
    pendingObservation=undefined;emit(()=>inputErrorObservation(game.value));
  }
  async function start(name: string) {
    if (!repository || game.value) return;
    const intent = mutation(); await write(() => repository!.create(name.trim(), intent),intent.commandId,{kind:'new_game',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  function prepareAction(action: Action): Command | null {
    if (!game.value || !repository || !available.value || busy.value) return null;
    return structuredClone({ ...action, commandId: crypto.randomUUID(), runId: game.value.core.runId, expectedRevision: game.value.core.revision });
  }
  async function actPrepared(input: Command) {
    if (!repository) return;
    const command = structuredClone({ ...input });
    await write(() => repository!.execute(command), command.commandId,{kind:'action',command});
  }
  async function act(action: Action) {
    const command = prepareAction(action);
    if (command) await actPrepared(command);
  }
  async function importText(raw: string) {
    if (!repository) return;
    const intent = mutation(); await write(() => repository!.importText(raw, intent),intent.commandId,{kind:'import',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  async function restart(name: string) {
    if (!repository || !game.value) return;
    const intent = mutation(); await write(() => repository!.create(name.trim(), intent),intent.commandId,{kind:'restart',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  function prepareCheckpoint(): SaveMutation | null {
    if (!repository || !game.value || !available.value || busy.value || !hasCheckpoint.value) return null;
    return structuredClone(mutation());
  }
  async function restorePrepared(input: SaveMutation) {
    if (!repository) return;
    const intent = structuredClone(input);
    await write(() => repository!.restoreCheckpoint(intent), intent.commandId,{kind:'restore',commandId:intent.commandId,runId:intent.runId,sourceRunId:intent.expectedRunId,expectedRevision:intent.expectedRevision});
  }
  async function checkpoint() {
    const intent = prepareCheckpoint(); if (intent) await restorePrepared(intent);
  }
  async function retry() { if (pending && canRetry.value) await write(pending, pendingCommandId,pendingObservation); }
  function canRetryFor(commandId: string) { return canRetry.value && pendingCommandId === commandId; }
  async function retryFor(commandId: string) { if (canRetryFor(commandId)) await retry(); }
  function discardRetryFor(commandId: string) {
    if (pendingCommandId !== commandId) return;
    pending = null; pendingCommandId = undefined; pendingObservation=undefined; canRetry.value = false;
  }
  async function rawText(): Promise<string | null> {
    try{const backup = await FullSaveRepository.exportRaw(); return backup ? rawBackupText(backup) : null;}catch(value){emit(()=>storageErrorObservation(game.value,codeOf(value)));throw value;}
  }
  const saveLabel = computed(() => !ready.value ? '读取中' : busy.value ? '保存中' : saved.value ? '已保存' : failedIntent ? '本次未保存' : available.value ? '尚无存档' : '存储不可用');
  onScopeDispose(() => { disposed = true; repository?.close(); channel?.close();observers.clear(); });
  return { game, busy, ready, available, error, warning, saved, hasCheckpoint, checkpointSummary, trialRecovery, canRetry, lastResult, lastReplayed, saveLabel,
    init, refresh, start, act, prepareAction, actPrepared, discardRetryFor, importText, restart, checkpoint, prepareCheckpoint, restorePrepared, retry, canRetryFor, retryFor, rawText, validationError,observe };
});
