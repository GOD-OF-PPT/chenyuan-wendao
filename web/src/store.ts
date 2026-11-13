import type {
  ConfigurationAction,
  ConfigurationIntent,
} from '../../src/full/configuration.ts';
import type {
  DirectAction,
  DirectIntent,
} from '../../src/full/direct-actions.ts';
import { validateDirectIntent } from '../../src/full/direct-actions.ts';
import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { getTrialRecovery } from '../../src/full/queries.ts';
import type { Game } from '../../src/full/types.ts';
import type {
  ActionResult,
  CommitOutcome,
  SaveCheckpoint,
} from '../../src/full/contracts.ts';
import { FullSaveRepository, rawBackupText } from './full-persistence';
import type {
  ControlOutcome,
  SaveMutation,
  ScheduledOutcome,
} from './full-persistence';
import type { AwaySchedule } from '../../src/full/scheduled-activity.ts';
import type { AwaySummary } from './away-summary.ts';
import {
  loadedObservation,
  writeObservation,
  inputErrorObservation,
  storageErrorObservation,
  type Observation,
  type WriteObservationSource,
} from './local-events';
import { useSession } from './session';
import {
  createActionClock,
  actionSeconds,
  actionLabel,
  type Execution,
} from './action-timing';
import { createActivityClock } from './activity-clock';
import type {
  Activity,
  ActivityPlan,
  CultivationPlan,
  ActivityMutation,
  ActivityTick,
  ActivityOutcome,
} from '../../src/full/activity.ts';
import { isMilestoneAction } from '../../src/full/milestones.ts';
import type {
  MilestoneAction,
  MilestonePlan,
} from '../../src/full/milestones.ts';
import { canonicalFingerprint } from '../../src/full/receipts.ts';
export interface MilestoneIntent {
  plan: MilestonePlan;
  mutation: ActivityMutation;
}
type StoreOutcome =
  | CommitOutcome
  | ControlOutcome
  | ActivityOutcome
  | (ScheduledOutcome & { awayReturn: boolean });

export type CheckpointSummary = Pick<
  SaveCheckpoint,
  'kind' | 'sourceRunId' | 'sourceRevision' | 'versions'
> & {
  target: {
    name: string;
    realm: Game['core']['player']['realm'];
    months: number;
    hp: number;
    mp: number;
    inventory: Record<string, number>;
  };
};

export const useGame = defineStore('game', () => {
  const session = useSession();
  const game = shallowRef<Game | null>(null),
    busy = ref(false),
    ready = ref(false),
    available = ref(false);
  const error = ref(''),
    warning = ref(''),
    saved = ref(false),
    syncIssue = ref(false),
    hasCheckpoint = ref(false);
  const checkpointSummary = shallowRef<CheckpointSummary | null>(null);
  const trialRecovery = shallowRef<ReturnType<typeof getTrialRecovery>>(null);
  const lastResult = shallowRef<ActionResult | null>(null),
    lastReplayed = ref(false),
    canRetry = ref(false);
  const unresolved = computed(
    () => !!error.value && (canRetry.value || syncIssue.value),
  );
  const execution = shallowRef<Execution | null>(null),
    actionClock = createActionClock();
  const activity = shallowRef<Activity | null>(null),
    activityNotice = ref(''),
    lastFromActivity = ref(false);
  const activitySchedule = shallowRef<AwaySchedule | null>(null);
  const awaySummary = shallowRef<AwaySummary | null>(null);
  const syncEpoch = ref(0);
  const activityRuntime = shallowRef<{
    id: string;
    generation: number;
    remainingMs: number;
    totalMs: number;
    phase: 'running' | 'saving' | 'pausing';
  } | null>(null);
  const activityOwner = crypto.randomUUID(),
    activityClock = createActivityClock();
  const activityRunning = computed(() => activity.value?.status === 'running');
  const activityLocal = computed(
    () => !!activityRuntime.value && activity.value?.ownerId === activityOwner,
  );
  const activityOwned = computed(
    () => activity.value?.ownerId === activityOwner,
  );
  const activityPausing = ref(false);
  let activityEpoch = 0,
    activityInFlight: Promise<void> | null = null;
  let writeInFlight: Promise<void> | null = null;
  let repository: FullSaveRepository | undefined,
    channel: BroadcastChannel | undefined;
  let connectionEpoch = 0,
    readEpoch = 0;
  const ownsConnection = (source: FullSaveRepository, epoch: number) =>
    !disposed && repository === source && connectionEpoch === epoch;
  let pending: (() => Promise<StoreOutcome>) | null = null;
  let pendingInstant = false;
  let pendingCycle: Activity | null = null;
  let pendingCommandId: string | undefined;
  let pendingObservation: WriteObservationSource | undefined;
  // Local acknowledgement of the exact request, not proof of the current activity.
  const confirmedCommands = new Map<string, string>();
  function wasConfirmedFor(commandId: string, runId: string) {
    return confirmedCommands.get(commandId) === runId;
  }
  const observers = new Set<{
    next: (value: Observation) => void;
    fault: () => void;
  }>();
  function observe(
    next: (value: Observation) => void,
    fault: () => void = () => {},
  ) {
    const observer = { next, fault };
    observers.add(observer);
    return () => observers.delete(observer);
  }
  function emit(make: () => Observation) {
    if (!observers.size) return;
    let value: Observation;
    try {
      value = make();
    } catch {
      for (const o of observers)
        try {
          o.fault();
        } catch {}
      return;
    }
    for (const o of observers)
      try {
        o.next(structuredClone(value));
      } catch {
        try {
          o.fault();
        } catch {}
      }
  }
  let failedIntent = false,
    refreshQueued = false,
    disposed = false;
  const message = (value: unknown) =>
    value instanceof Error ? value.message : String(value);
  const codeOf = (value: unknown) =>
    value && typeof value === 'object' && 'code' in value
      ? String(value.code)
      : '';
  const mutation = (): SaveMutation => ({
    commandId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    expectedRunId: game.value?.core.runId ?? null,
    expectedRevision: game.value?.core.revision ?? 0,
  });

  function stopActivityRuntime() {
    activityEpoch++;
    activityClock.cancel();
    activityRuntime.value = null;
  }
  function acceptActivity(next: Activity | null, schedule?: AwaySchedule) {
    const runtime = activityRuntime.value;
    if (
      runtime &&
      (!next ||
        next.id !== runtime.id ||
        next.generation !== runtime.generation ||
        next.ownerId !== activityOwner ||
        next.status !== 'running')
    )
      stopActivityRuntime();
    if (!schedule || next?.id !== activity.value?.id) awaySummary.value = null;
    activity.value = next;
    activitySchedule.value = schedule ?? null;
  }
  function activityMutation(): ActivityMutation | null {
    if (!game.value || !repository || !available.value) return null;
    return {
      commandId: crypto.randomUUID(),
      runId: game.value.core.runId,
      expectedRevision: game.value.core.revision,
      expectedActivityId: activity.value?.id ?? null,
      expectedActivityRevision: activity.value?.revision ?? null,
      ownerId: activityOwner,
    };
  }
  async function submitActivityWhenDue(
    current: Activity,
    operation: () => Promise<ActivityOutcome>,
    commandId: string,
    observation: WriteObservationSource,
    owner: number,
  ) {
    const base = {
      id: current.id,
      generation: current.generation,
      totalMs: current.cycleMs,
    };
    while (!disposed && owner === activityEpoch) {
      const due = await activityClock.waitUntil(current.dueAt!, (remaining) => {
        if (owner === activityEpoch && !disposed)
          activityRuntime.value = {
            ...base,
            remainingMs: remaining,
            phase: 'running',
          };
      });
      if (!due || disposed || owner !== activityEpoch) return;
      activityRuntime.value = { ...base, remainingMs: 0, phase: 'saving' };
      let notDue = false;
      const saving = write(
        operation,
        commandId,
        observation,
        true,
        current,
        () => {
          notDue = true;
        },
      );
      activityInFlight = saving;
      await saving;
      if (activityInFlight === saving) activityInFlight = null;
      if (disposed || owner !== activityEpoch) return;
      // Date.now can move between the gate and the transaction. Retain this exact command and only wait its remainder.
      if (!notDue) return;
    }
  }
  function beginActivityRuntime() {
    const current = activity.value;
    if (
      disposed ||
      !repository ||
      !available.value ||
      error.value ||
      !current ||
      current.status !== 'running' ||
      current.ownerId !== activityOwner ||
      !current.nextCommand ||
      activityPausing.value
    )
      return;
    stopActivityRuntime();
    const owner = activityEpoch;
    const base = {
      id: current.id,
      generation: current.generation,
      totalMs: current.cycleMs,
    };
    activityRuntime.value = {
      ...base,
      remainingMs: activitySchedule.value
        ? Math.max(0, current.dueAt! - Date.now())
        : current.cycleMs,
      phase: 'running',
    };
    void (async () => {
      try {
        if (activitySchedule.value) {
          const awayReturn = activitySchedule.value.window !== null;
          const due = await activityClock.waitUntil(
            current.dueAt!,
            (remaining) => {
              if (owner === activityEpoch && !disposed)
                activityRuntime.value = {
                  ...base,
                  remainingMs: remaining,
                  phase: 'running',
                };
            },
          );
          if (
            !due ||
            disposed ||
            owner !== activityEpoch ||
            activity.value?.revision !== current.revision
          )
            return;
          const intent: ActivityMutation = {
            commandId: crypto.randomUUID(),
            runId: current.runId,
            expectedRevision: current.gameRevision,
            expectedActivityId: current.id,
            expectedActivityRevision: current.revision,
            ownerId: activityOwner,
          };
          const source = repository!;
          activityRuntime.value = { ...base, remainingMs: 0, phase: 'saving' };
          await write(
            async () => ({
              ...(await source.advanceScheduledActivity(intent)),
              awayReturn,
            }),
            intent.commandId,
            undefined,
            true,
          );
          if (!disposed && !error.value && !activityPausing.value)
            beginActivityRuntime();
          return;
        }
        const due = await activityClock.wait(current.cycleMs, (remaining) => {
          if (owner === activityEpoch && !disposed)
            activityRuntime.value = {
              ...base,
              remainingMs: remaining,
              phase: 'running',
            };
        });
        if (
          !due ||
          disposed ||
          owner !== activityEpoch ||
          activity.value?.revision !== current.revision
        )
          return;
        const command = current.nextCommand!;
        const tick: ActivityTick = {
          commandId: command.commandId,
          runId: current.runId,
          expectedRevision: current.gameRevision,
          activityId: current.id,
          expectedActivityRevision: current.revision,
          ownerId: activityOwner,
          generation: current.generation,
        };
        await submitActivityWhenDue(
          current,
          () => repository!.settleActivity(tick),
          tick.commandId,
          { kind: 'action', command },
          owner,
        );
        if (disposed || owner !== activityEpoch) return;
        activityRuntime.value = null;
        if (!error.value && !activityPausing.value) beginActivityRuntime();
      } catch (value) {
        if (owner !== activityEpoch || disposed) return;
        stopActivityRuntime();
        activityNotice.value = message(value);
      }
    })();
  }

  async function checkpointInfo(owns: () => boolean = () => !disposed) {
    const current = game.value,
      source = repository;
    const currentRead = () =>
      owns() && repository === source && game.value === current;
    if (!currentRead()) return;
    if (!source || !current) {
      hasCheckpoint.value = false;
      checkpointSummary.value = null;
      trialRecovery.value = null;
      return;
    }
    let cp: SaveCheckpoint | null = null;
    try {
      cp = await source.loadCheckpoint();
      if (!currentRead()) return;
      source.ensureOpen();
      hasCheckpoint.value = !!cp;
      checkpointSummary.value = cp
        ? {
            kind: cp.kind,
            sourceRunId: cp.sourceRunId,
            sourceRevision: cp.sourceRevision,
            versions: { ...cp.versions },
            target: {
              name: cp.snapshot.core.player.name,
              realm: cp.snapshot.core.player.realm,
              months: cp.snapshot.core.world.elapsedMonths,
              hp: cp.snapshot.core.player.hp,
              mp: cp.snapshot.core.player.mp,
              inventory: { ...cp.snapshot.core.inventory },
            },
          }
        : null;
      warning.value = '';
    } catch (value) {
      if (!currentRead()) return;
      if (codeOf(value) === 'STORAGE_CLOSED') throw value;
      hasCheckpoint.value = false;
      checkpointSummary.value = null;
      warning.value = '检查点无法读取：' + message(value);
    }
    if (!currentRead()) return;
    try {
      const previous = await source.loadPrevious();
      if (currentRead()) {
        source.ensureOpen();
        trialRecovery.value = getTrialRecovery(current, previous, cp);
      }
    } catch (value) {
      if (currentRead()) {
        if (codeOf(value) === 'STORAGE_CLOSED') throw value;
        trialRecovery.value = null;
        warning.value += ' 上一行动无法核对：' + message(value);
      }
    }
  }
  async function awayInfo(owns: () => boolean = () => !disposed) {
    const source = repository,
      current = game.value,
      a = activity.value;
    if (!source || !current || !a || !activitySchedule.value) {
      awaySummary.value = null;
      return;
    }
    const summary = await source.loadAwaySummary();
    if (
      !owns() ||
      source !== repository ||
      game.value !== current ||
      activity.value !== a
    )
      return;
    if (
      summary &&
      (summary.runId !== current.core.runId ||
        summary.revision !== current.core.revision ||
        summary.activityId !== a.id ||
        summary.activityRevision !== a.revision)
    )
      return;
    awaySummary.value = summary;
  }
  async function refresh(reason?: 'sync') {
    const source = repository,
      connection = connectionEpoch,
      read = ++readEpoch;
    if (!source || disposed) return false;
    const owns = () => ownsConnection(source, connection) && readEpoch === read;
    try {
      const snapshot = await source.loadActivitySnapshot(),
        current = snapshot.state;
      if (!owns()) return false;
      source.ensureOpen();
      const changed =
        current?.core.runId !== game.value?.core.runId ||
        current?.core.revision !== game.value?.core.revision;
      const changedActivity =
        snapshot.activity?.id !== activity.value?.id ||
        snapshot.activity?.revision !== activity.value?.revision;
      if (changedActivity && activityRuntime.value?.phase === 'running')
        stopActivityRuntime();
      if (changed) {
        lastResult.value = null;
        lastReplayed.value = false;
        lastFromActivity.value = false;
      }
      game.value = current;
      acceptActivity(snapshot.activity, snapshot.schedule);
      await checkpointInfo(owns);
      await awayInfo(owns);
      if (!owns()) return false;
      if (!failedIntent && !busy.value && available.value)
        saved.value = !!current;
      if (reason === 'sync' && changed && current)
        emit(() => loadedObservation(current, 'sync'));
      return true;
    } catch (value) {
      if (owns()) throw value;
      return false;
    }
  }
  function synchronizationFailed(
    value: unknown,
    source: FullSaveRepository,
    connection: number,
    read?: number,
  ) {
    if (
      !ownsConnection(source, connection) ||
      (read !== undefined && readEpoch !== read)
    )
      return;
    stopActivityRuntime();
    readEpoch++;
    refreshQueued = false;
    const reason =
      (
        {
          STORAGE_ABORTED: '读取中断，最新进度尚未核对',
          STORAGE_QUOTA: '本机存储空间不足，暂时无法核对进度',
          STORAGE_DENIED: '浏览器未允许读取本机存档',
          STORAGE_BLOCKED: '存档正在被其他页面占用',
          STORAGE_UNAVAILABLE: '本机存档暂时无法读取',
          STORAGE_CLOSED: '存档连接已更新或关闭',
        } as Record<string, string>
      )[codeOf(value)] ?? message(value);
    syncIssue.value = true;
    error.value =
      '无法同步存档：' + reason + '；请重新读取当前进度，已确认的成果保留。';
    saved.value = false;
    available.value = false;
    canRetry.value = false;
    emit(() => storageErrorObservation(game.value, codeOf(value)));
  }
  function synchronize() {
    const source = repository,
      connection = connectionEpoch;
    if (!source || !available.value || disposed) return;
    const reading = refresh('sync'),
      read = readEpoch;
    void reading.catch((value) =>
      synchronizationFailed(value, source, connection, read),
    );
  }
  async function init() {
    if (disposed || busy.value) return;
    const connection = ++connectionEpoch;
    readEpoch++;
    refreshQueued = false;
    const owns = () => !disposed && connectionEpoch === connection;
    const hadUnconfirmedIntent = failedIntent;
    stopActivityRuntime();
    activityNotice.value = '';
    busy.value = true;
    ready.value = false;
    available.value = false;
    syncIssue.value = false;
    error.value = '';
    warning.value = '';
    repository?.close();
    channel?.close();
    repository = undefined;
    channel = undefined;
    lastResult.value = null;
    lastReplayed.value = false;
    lastFromActivity.value = false;
    pending = null;
    pendingCommandId = undefined;
    pendingObservation = undefined;
    pendingCycle = null;
    canRetry.value = false;
    try {
      const opened = await FullSaveRepository.open(session.gameDatabase);
      if (!owns()) {
        opened.close();
        return;
      }
      repository = opened;
      available.value = true;
      const applied = await refresh();
      if (!owns() || !applied) return;
      failedIntent = false;
      saved.value = !!game.value;
      if (hadUnconfirmedIntent)
        warning.value = [
          warning.value,
          '已重新读取已保存进度；上次未确认的操作未自动重试，请核对当前成果后再安排。',
        ]
          .filter(Boolean)
          .join(' ');
      if (game.value) emit(() => loadedObservation(game.value!, 'resume'));
      if (!owns()) return;
      opened.ensureOpen();
      if ('BroadcastChannel' in globalThis) {
        const connected = new BroadcastChannel(session.gameChannel);
        channel = connected;
        connected.onmessage = () => {
          if (
            !ownsConnection(opened, connection) ||
            channel !== connected ||
            !available.value
          )
            return;
          // Viewing intents must be invalidated immediately, even while a local write is finishing.
          syncEpoch.value++;
          if (busy.value) {
            refreshQueued = true;
            return;
          }
          synchronize();
        };
      }
    } catch (value) {
      if (!owns()) return;
      error.value = '无法读取存档：' + message(value);
      saved.value = false;
      available.value = false;
      emit(() => storageErrorObservation(game.value, codeOf(value)));
      repository?.close();
      repository = undefined;
    } finally {
      if (owns()) {
        ready.value = true;
        busy.value = false;
      }
    }
    if (
      owns() &&
      available.value &&
      activitySchedule.value &&
      activity.value?.status === 'running'
    )
      await reconcileScheduled();
  }
  async function reconcileScheduled() {
    if (
      disposed ||
      busy.value ||
      !repository ||
      !activitySchedule.value ||
      activity.value?.status !== 'running'
    )
      return;
    const intent = activityMutation();
    if (!intent) return;
    const source = repository;
    stopActivityRuntime();
    await write(
      async () => ({
        ...(await source.advanceScheduledActivity(intent)),
        awayReturn: true,
      }),
      intent.commandId,
      undefined,
      true,
    );
    if (!error.value) beginActivityRuntime();
  }
  function write(
    operation: () => Promise<StoreOutcome>,
    commandId?: string,
    observation?: WriteObservationSource,
    instant = false,
    cycle: Activity | null = null,
    onNotDue?: () => void,
  ): Promise<void> {
    if (disposed || busy.value || !repository || !available.value)
      return Promise.resolve();
    const current = performWrite(
      operation,
      commandId,
      observation,
      instant,
      cycle,
      onNotDue,
    );
    writeInFlight = current;
    return current.finally(() => {
      if (writeInFlight === current) writeInFlight = null;
    });
  }
  async function performWrite(
    operation: () => Promise<StoreOutcome>,
    commandId?: string,
    observation?: WriteObservationSource,
    instant = false,
    cycle: Activity | null = null,
    onNotDue?: () => void,
  ) {
    if (disposed || busy.value || !repository || !available.value) return;
    const source = repository,
      connection = connectionEpoch,
      owns = () => ownsConnection(source, connection);
    readEpoch++;
    const before = game.value,
      wasSaved = saved.value,
      wasFailed = failedIntent;
    busy.value = true;
    syncIssue.value = false;
    error.value = '';
    saved.value = false;
    canRetry.value = false;
    pending = operation;
    pendingCommandId = commandId;
    pendingObservation = observation;
    pendingInstant = instant;
    pendingCycle = cycle;
    let confirmed = false;
    try {
      const action =
        observation?.kind === 'action' ? observation.command : null;
      const seconds = action ? actionSeconds(action) : 0.6,
        totalMs = Number.isFinite(seconds) ? seconds * 1000 : 0;
      const label = action
        ? actionLabel(action)
        : observation?.kind === 'restore'
          ? '恢复准备'
          : observation?.kind === 'import'
            ? '载入进度'
            : '展开新的人生';
      const initial: Execution = {
        id: commandId ?? '',
        label,
        totalMs,
        remainingMs: totalMs,
        phase: 'acting',
        batch:
          !!action &&
          (('count' in action && (action.count ?? 1) > 1) ||
            ('quantity' in action && action.quantity > 1)),
      };
      if (!instant) {
        const completed = await actionClock.wait(totalMs, (remaining) => {
          execution.value = { ...initial, remainingMs: remaining };
        });
        if (!completed || disposed) return;
        execution.value = { ...initial, remainingMs: 0, phase: 'saving' };
      }
      const operationRead = readEpoch,
        outcome = await operation();
      if (!owns()) return;
      confirmed = true;
      if (commandId) {
        confirmedCommands.delete(commandId);
        confirmedCommands.set(commandId, outcome.state.core.runId);
        if (confirmedCommands.size > 128)
          confirmedCommands.delete(confirmedCommands.keys().next().value!);
      }
      // A delayed reply can follow a newer read, including a new activity at the same Game revision.
      const replayNeedsSnapshot =
        outcome.replayed && 'activity' in outcome && !('committed' in outcome);
      const concurrentRead = operationRead !== readEpoch || replayNeedsSnapshot;
      let replyCurrent = !concurrentRead;
      if (concurrentRead) {
        const applied = await refresh();
        if (!owns()) return;
        if (!applied) refreshQueued = true;
        replyCurrent =
          applied &&
          canonicalFingerprint(game.value) ===
            canonicalFingerprint(outcome.state) &&
          (!('activity' in outcome) ||
            canonicalFingerprint(activity.value) ===
              canonicalFingerprint(outcome.activity));
      } else {
        readEpoch++;
        game.value = outcome.state;
        if ('activity' in outcome)
          acceptActivity(
            outcome.activity,
            'committed' in outcome ? outcome.schedule : undefined,
          );
        else if (activity.value?.runId !== outcome.state.core.runId)
          acceptActivity(null);
      }
      if ('committed' in outcome) {
        const fresh =
          replyCurrent &&
          !outcome.replayed &&
          !outcome.awayReturn &&
          outcome.cycles === 1;
        lastResult.value = fresh ? outcome.result : null;
        lastFromActivity.value = fresh;
        lastReplayed.value = !fresh;
      } else if (!replyCurrent) {
        lastResult.value = null;
        lastFromActivity.value = false;
        lastReplayed.value = true;
      } else if ('result' in outcome && outcome.result) {
        lastResult.value = outcome.result;
        lastFromActivity.value = cycle !== null;
        lastReplayed.value = outcome.replayed;
      } else if (!instant) {
        lastResult.value = null;
        lastFromActivity.value = false;
        lastReplayed.value = outcome.replayed;
      }
      failedIntent = false;
      pending = null;
      pendingCommandId = undefined;
      pendingObservation = undefined;
      pendingCycle = null;
      saved.value = available.value && !refreshQueued && !!game.value;
      if ('committed' in outcome)
        for (const row of outcome.committed)
          emit(() =>
            writeObservation(
              row.before,
              row.after,
              { kind: 'action', command: row.command },
              row.result,
              false,
            ),
          );
      if (
        observation &&
        (!concurrentRead || game.value?.core.runId === outcome.state.core.runId)
      )
        emit(() =>
          writeObservation(
            before,
            game.value,
            observation,
            'result' in outcome ? outcome.result : null,
            !replyCurrent || outcome.replayed,
          ),
        );
      if (!owns()) return;
      if (!concurrentRead && !('activity' in outcome)) {
        const read = ++readEpoch;
        try {
          const snapshot = await source.loadActivitySnapshot();
          if (!owns()) return;
          if (readEpoch === read) {
            source.ensureOpen();
            game.value = snapshot.state;
            acceptActivity(snapshot.activity, snapshot.schedule);
          }
        } catch (value) {
          if (!owns()) return;
          if (readEpoch === read) throw value;
        }
      }
      await checkpointInfo(owns);
      if (
        'committed' in outcome &&
        !outcome.more &&
        (outcome.awayReturn || outcome.cycles !== 1)
      )
        await awayInfo(owns);
      if (!owns()) return;
      try {
        if (game.value)
          channel?.postMessage({
            runId: game.value.core.runId,
            revision: game.value.core.revision,
          });
      } catch {
        warning.value = '进度已保存，其他页面暂未收到同步提示';
      }
    } catch (value) {
      if (!owns()) return;
      // The operation's successful reply is authoritative even if a later read
      // loses the connection. Retain that result and require synchronization.
      if (confirmed) {
        synchronizationFailed(value, source, connection);
        return;
      }
      if (onNotDue && codeOf(value) === 'ACTIVITY_NOT_DUE') {
        // Nothing committed. This is still the same running cycle, not a failed save or a new reward.
        saved.value = wasSaved;
        failedIntent = wasFailed;
        onNotDue();
        return;
      }
      failedIntent = true;
      error.value = message(value);
      saved.value = false;
      lastResult.value = null;
      const code = codeOf(value);
      if (observation)
        emit(() =>
          writeObservation(
            before,
            null,
            observation,
            null,
            false,
            code || 'OTHER',
          ),
        );
      if (code === 'STORAGE_CLOSED') available.value = false;
      canRetry.value = [
        'STORAGE_QUOTA',
        'STORAGE_ABORTED',
        'STORAGE_DENIED',
      ].includes(code);
      if (!canRetry.value) {
        pending = null;
        pendingCommandId = undefined;
        pendingObservation = undefined;
        pendingCycle = null;
      }
      try {
        await refresh();
      } catch (readError) {
        if (owns()) warning.value = '原进度暂时无法重读：' + message(readError);
      }
    } finally {
      if (owns()) {
        execution.value = null;
        busy.value = false;
        if (refreshQueued) {
          refreshQueued = false;
          synchronize();
        }
      }
    }
  }
  function validationError(text: string) {
    failedIntent = true;
    error.value = text;
    saved.value = false;
    canRetry.value = false;
    pending = null;
    pendingCommandId = undefined;
    pendingObservation = undefined;
    emit(() => inputErrorObservation(game.value));
    pendingCycle = null;
  }
  async function start(name: string) {
    if (!repository || game.value) return;
    const intent = mutation();
    await write(
      () => repository!.create(name.trim(), intent),
      intent.commandId,
      {
        kind: 'new_game',
        commandId: intent.commandId,
        runId: intent.runId,
        sourceRunId: intent.expectedRunId,
        expectedRevision: intent.expectedRevision,
      },
    );
  }
  function prepareDirect(action: DirectAction): DirectIntent | null {
    if (
      disposed ||
      !game.value ||
      !repository ||
      !available.value ||
      busy.value ||
      unresolved.value ||
      activityRunning.value
    )
      return null;
    const intent: DirectIntent = {
      command: {
        ...action,
        commandId: crypto.randomUUID(),
        runId: game.value.core.runId,
        expectedRevision: game.value.core.revision,
      },
      expectedActivityId: activity.value?.id ?? null,
      expectedActivityRevision: activity.value?.revision ?? null,
    };
    validateDirectIntent(intent);
    return structuredClone(intent);
  }
  async function executeDirect(input: DirectIntent) {
    if (
      disposed ||
      busy.value ||
      !repository ||
      !available.value ||
      unresolved.value ||
      activityRunning.value
    )
      return;
    const intent = structuredClone(input);
    validateDirectIntent(intent);
    await write(
      () => repository!.executeDirect(intent),
      intent.command.commandId,
      { kind: 'action', command: intent.command },
      true,
    );
  }
  function prepareConfiguration(
    action: ConfigurationAction,
  ): ConfigurationIntent | null {
    if (
      disposed ||
      !game.value ||
      !repository ||
      !available.value ||
      busy.value
    )
      return null;
    if (activityRunning.value) {
      activityNotice.value = '请先暂停当前活动，再核对配装。';
      return null;
    }
    return structuredClone({
      command: {
        ...action,
        commandId: crypto.randomUUID(),
        runId: game.value.core.runId,
        expectedRevision: game.value.core.revision,
      },
      expectedActivityId: activity.value?.id ?? null,
      expectedActivityRevision: activity.value?.revision ?? null,
    });
  }
  async function applyConfiguration(input: ConfigurationIntent) {
    if (disposed || !repository || !available.value) return;
    if (activityRunning.value) {
      activityNotice.value = '请先暂停当前活动，再确认配装。';
      return;
    }
    const intent = structuredClone(input);
    await write(
      () => repository!.configure(intent),
      intent.command.commandId,
      { kind: 'action', command: intent.command },
      true,
    );
  }
  function prepareImport(): SaveMutation | null {
    if (disposed || !repository || !available.value || busy.value) return null;
    return structuredClone(mutation());
  }
  async function importPrepared(raw: string, input: SaveMutation) {
    if (disposed || !repository || !available.value) return;
    stopActivityRuntime();
    const intent = structuredClone(input);
    await write(() => repository!.importText(raw, intent), intent.commandId, {
      kind: 'import',
      commandId: intent.commandId,
      runId: intent.runId,
      sourceRunId: intent.expectedRunId,
      expectedRevision: intent.expectedRevision,
    });
  }
  async function importText(raw: string) {
    const intent = prepareImport();
    if (intent) await importPrepared(raw, intent);
  }
  async function restart(name: string) {
    if (!repository || !game.value) return;
    stopActivityRuntime();
    const intent = mutation();
    await write(
      () => repository!.create(name.trim(), intent),
      intent.commandId,
      {
        kind: 'restart',
        commandId: intent.commandId,
        runId: intent.runId,
        sourceRunId: intent.expectedRunId,
        expectedRevision: intent.expectedRevision,
      },
    );
  }
  function prepareCheckpoint(): SaveMutation | null {
    if (
      !repository ||
      !game.value ||
      !available.value ||
      busy.value ||
      !hasCheckpoint.value
    )
      return null;
    return structuredClone(mutation());
  }
  async function restorePrepared(input: SaveMutation) {
    if (!repository) return;
    stopActivityRuntime();
    const intent = structuredClone(input);
    await write(() => repository!.restoreCheckpoint(intent), intent.commandId, {
      kind: 'restore',
      commandId: intent.commandId,
      runId: intent.runId,
      sourceRunId: intent.expectedRunId,
      expectedRevision: intent.expectedRevision,
    });
  }
  async function checkpoint() {
    const intent = prepareCheckpoint();
    if (intent) await restorePrepared(intent);
  }
  async function retry() {
    if (!pending || !canRetry.value || busy.value) return;
    const operation = pending,
      commandId = pendingCommandId,
      observation = pendingObservation,
      instant = pendingInstant,
      cycle = pendingCycle;
    if (cycle && commandId && observation) {
      canRetry.value = false;
      error.value = '';
      stopActivityRuntime();
      const owner = activityEpoch;
      try {
        await submitActivityWhenDue(
          cycle,
          operation as () => Promise<ActivityOutcome>,
          commandId,
          observation,
          owner,
        );
        if (owner !== activityEpoch || disposed) return;
        activityRuntime.value = null;
      } catch (value) {
        if (owner !== activityEpoch || disposed) return;
        stopActivityRuntime();
        activityNotice.value = message(value);
        return;
      }
    } else await write(operation, commandId, observation, instant);
    if (instant && !error.value) beginActivityRuntime();
  }
  function canRetryFor(commandId: string) {
    return canRetry.value && pendingCommandId === commandId;
  }
  async function retryFor(commandId: string) {
    if (canRetryFor(commandId)) await retry();
  }
  function discardRetryFor(commandId: string) {
    if (pendingCommandId !== commandId) return;
    pending = null;
    pendingCommandId = undefined;
    pendingObservation = undefined;
    pendingCycle = null;
    canRetry.value = false;
  }
  async function rawText(): Promise<string | null> {
    try {
      const backup = await FullSaveRepository.exportRaw(session.gameDatabase);
      return backup ? rawBackupText(backup) : null;
    } catch (value) {
      emit(() => storageErrorObservation(game.value, codeOf(value)));
      throw value;
    }
  }
  async function startPlannedActivity(plan: ActivityPlan) {
    return startPlan(plan, false);
  }
  async function startOnlinePlannedActivity(plan: ActivityPlan) {
    return startPlan(plan, true);
  }
  async function startPlan(plan: ActivityPlan, online: boolean) {
    if (disposed || busy.value || !repository) return;
    if (activityRunning.value) {
      activityNotice.value = '请先暂停当前活动，再重新安排。';
      return;
    }
    const intent = activityMutation();
    if (!intent) return;
    const selected = structuredClone(plan);
    activityNotice.value = '';
    stopActivityRuntime();
    await write(
      () =>
        online
          ? repository!.startActivity(selected, intent)
          : repository!
              .startScheduledActivity(selected, intent)
              .then((out) => ({ ...out, awayReturn: false })),
      intent.commandId,
      undefined,
      true,
    );
    if (!error.value) beginActivityRuntime();
  }
  function prepareMilestone(action: MilestoneAction): MilestoneIntent | null {
    if (
      disposed ||
      busy.value ||
      !repository ||
      !available.value ||
      !game.value
    )
      return null;
    if (!isMilestoneAction(action)) {
      validationError('本次安排必须是已明确选定的一项正式选择。');
      return null;
    }
    if (activityRunning.value) {
      activityNotice.value = '请先暂停当前活动，再核对本次选择。';
      return null;
    }
    const intent = activityMutation();
    if (!intent) return null;
    return structuredClone({
      plan: { kind: 'milestone', action, maxCycles: 1 },
      mutation: intent,
    });
  }
  async function startPreparedMilestone(input: MilestoneIntent) {
    return startMilestone(input, false);
  }
  async function startOnlinePreparedMilestone(input: MilestoneIntent) {
    return startMilestone(input, true);
  }
  async function startMilestone(input: MilestoneIntent, online: boolean) {
    if (disposed || busy.value || !repository || !available.value) return;
    const intent = structuredClone(input);
    activityNotice.value = '';
    stopActivityRuntime();
    await write(
      () =>
        online
          ? repository!.startActivity(intent.plan, intent.mutation)
          : repository!
              .startScheduledActivity(intent.plan, intent.mutation)
              .then((out) => ({ ...out, awayReturn: false })),
      intent.mutation.commandId,
      undefined,
      true,
    );
    if (!error.value) beginActivityRuntime();
  }
  async function loadActivityHistory(id: string, page = 0, pageSize = 4) {
    if (disposed || !repository || !game.value) throw new Error('存档未就绪');
    return repository.loadActivityHistory(id, page, pageSize);
  }
  const startCultivation = (plan: CultivationPlan) =>
    startPlannedActivity(plan);
  async function pauseCultivation() {
    if (disposed || !repository || activityPausing.value || !activity.value)
      return;
    activityPausing.value = true;
    stopActivityRuntime();
    try {
      const writing = writeInFlight ?? activityInFlight;
      if (writing) await writing;
      const intent = activityMutation();
      if (!intent || !activity.value || activity.value.status !== 'running')
        return;
      const source = repository!;
      await write(
        () =>
          activitySchedule.value
            ? source
                .pauseScheduledActivity(intent)
                .then((out) => ({ ...out, awayReturn: false }))
            : source.pauseActivity(intent),
        intent.commandId,
        undefined,
        true,
      );
      if (!error.value)
        activityNotice.value = '活动已暂停。未完成的这一轮在继续时重新计时。';
    } finally {
      activityPausing.value = false;
    }
  }
  async function resumeCultivation() {
    if (disposed || busy.value || !repository) return;
    const intent = activityMutation();
    if (!intent) return;
    activityNotice.value = '';
    stopActivityRuntime();
    const source = repository,
      scheduled = activitySchedule.value,
      current = activity.value;
    await write(
      async () => ({
        ...(await (!scheduled
          ? source.adoptScheduledActivity(intent)
          : current?.status === 'paused'
            ? source.resumeScheduledActivity(intent)
            : source.advanceScheduledActivity(intent))),
        awayReturn: true,
      }),
      intent.commandId,
      undefined,
      true,
    );
    if (!error.value) beginActivityRuntime();
  }
  async function resumeOnlineCultivation() {
    if (disposed || busy.value || !repository) return;
    const intent = activityMutation();
    if (!intent) return;
    activityNotice.value = '';
    stopActivityRuntime();
    await write(
      () => repository!.resumeActivity(intent),
      intent.commandId,
      undefined,
      true,
    );
    if (!error.value) beginActivityRuntime();
  }
  const saveLabel = computed(() =>
    !ready.value
      ? '读取中'
      : syncIssue.value
        ? '同步待核对'
        : execution.value?.phase === 'acting'
          ? '行动中'
          : busy.value
            ? '保存中'
            : saved.value
              ? '已保存'
              : failedIntent
                ? '本次未保存'
                : available.value
                  ? '尚无存档'
                  : '存储不可用',
  );
  onScopeDispose(() => {
    disposed = true;
    connectionEpoch++;
    readEpoch++;
    refreshQueued = false;
    stopActivityRuntime();
    actionClock.cancel();
    execution.value = null;
    repository?.close();
    channel?.close();
    repository = undefined;
    channel = undefined;
    ready.value = false;
    available.value = false;
    busy.value = false;
    observers.clear();
  });
  return {
    game,
    busy,
    ready,
    available,
    error,
    warning,
    saved,
    syncIssue,
    unresolved,
    hasCheckpoint,
    checkpointSummary,
    trialRecovery,
    canRetry,
    lastResult,
    lastReplayed,
    saveLabel,
    execution,
    activity,
    activitySchedule,
    awaySummary,
    activityRuntime,
    activityRunning,
    activityLocal,
    activityOwned,
    activityPausing,
    activityNotice,
    lastFromActivity,
    syncEpoch,
    loadActivityHistory,
    startPlannedActivity,
    startOnlinePlannedActivity,
    prepareMilestone,
    startPreparedMilestone,
    startOnlinePreparedMilestone,
    startCultivation,
    pauseCultivation,
    resumeCultivation,
    resumeOnlineCultivation,
    init,
    refresh,
    start,
    prepareDirect,
    executeDirect,
    prepareConfiguration,
    applyConfiguration,
    discardRetryFor,
    importText,
    prepareImport,
    importPrepared,
    restart,
    checkpoint,
    prepareCheckpoint,
    restorePrepared,
    retry,
    canRetryFor,
    retryFor,
    wasConfirmedFor,
    rawText,
    validationError,
    observe,
  };
});
