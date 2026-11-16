import { ref, shallowRef, onScopeDispose } from 'vue';
import { useSession } from './session';
import {
  parseTrackingTarget,
  type TrackingTarget,
} from '../../src/full/goals.ts';
import {
  LocalExperienceRepository,
  LocalDataError,
  type LocalMeta,
  type LocalCommand,
  type RecordEntry,
} from './local-experience';
import {
  defaultPreferences,
  parsePreferences,
  publicId,
  validateRecord,
  sessionObservation,
  LOCAL_BYTE_LIMIT,
  LOCAL_RECORD_LIMIT,
  recordBytes,
  type Preferences,
  type Observation,
  type LocalRecord,
} from './local-events';
import { initializeLocal } from './local-initialization';

type Connection = {
  controller: AbortController;
  candidate?: LocalExperienceRepository;
  channel?: BroadcastChannel;
  initializing: boolean;
};

export function useLocalExperience() {
  const session = useSession();
  const preferences = shallowRef<Preferences>({
      ...defaultPreferences,
      recording: false,
    }),
    preferencesPersisted = ref(false),
    ready = ref(false),
    busy = ref(false),
    pending = ref(0),
    status = ref('正在读取本地设置……'),
    available = ref(false);
  const count = ref<number | null>(null),
    dropped = ref(0),
    memory = shallowRef<LocalRecord[]>([]),
    listing = shallowRef<RecordEntry[]>([]),
    prepared = shallowRef<any | null>(null),
    missed = ref(0),
    memoryDropped = ref(0);
  const sessionId = crypto.randomUUID(),
    started = performance.now();
  let elapsed = 0,
    memoryBytes = 0,
    meta: LocalMeta | null = null,
    repo: LocalExperienceRepository | undefined,
    closed = false,
    generation = 0,
    queue = Promise.resolve(),
    didSession = false;
  let connection: Connection | null = null,
    initializing: Promise<void> | null = null,
    editVersion = 0,
    queueVersion = 0,
    refreshRequest = 0,
    listRequest = 0,
    exportRequest = 0;
  const now = () =>
    (elapsed = Math.max(
      elapsed,
      Math.max(0, Math.floor(performance.now() - started)),
    ));
  const current = (owner: Connection | null) => !closed && owner === connection;
  const live = (
    owner: Connection | null,
    candidate: LocalExperienceRepository | undefined,
  ) =>
    !!owner &&
    current(owner) &&
    !owner.controller.signal.aborted &&
    !!candidate &&
    repo === candidate &&
    owner.candidate === candidate;
  function notify(owner = connection) {
    if (!live(owner, repo)) return;
    try {
      owner?.channel?.postMessage({ changed: true });
    } catch {
      /* local database remains authoritative */
    }
  }
  function closeConnection(owner: Connection | null) {
    if (!owner) return;
    owner.controller.abort(
      new LocalDataError('LOCAL_STALE', '本次本地连接已结束，原数据保留。'),
    );
    owner.candidate?.close();
    owner.channel?.close();
  }
  function detachQueue() {
    generation++;
    queueVersion++;
    queue = Promise.resolve();
    pending.value = 0;
    prepared.value = null;
  }
  function stopRecording() {
    if (preferences.value.recording) generation++;
    preferences.value = { ...preferences.value, recording: false };
  }
  function invalidated(owner: Connection) {
    if (!current(owner)) return;
    connection = null;
    initializing = null;
    editVersion++;
    busy.value = false;
    detachQueue();
    closeConnection(owner);
    repo = undefined;
    meta = null;
    ready.value = true;
    available.value = false;
    preferencesPersisted.value = false;
    count.value = null;
    stopRecording();
    status.value =
      '本地记录库已升级，当前仅用临时显示设置；记录采集未开启，可手动重读，旧记录未覆盖。';
  }
  function apply(value: LocalMeta, force = false) {
    if (meta && value.revision < meta.revision) return;
    const invalidate =
      meta &&
      (meta.epoch !== value.epoch ||
        meta.preferenceRevision !== value.preferenceRevision);
    if (meta && meta.epoch !== value.epoch) generation++;
    meta = value;
    count.value = value.eventCount;
    dropped.value = value.droppedCount;
    if (force || (!busy.value && preferencesPersisted.value)) {
      if (preferences.value.recording !== value.preferences.recording)
        generation++;
      preferences.value = { ...value.preferences };
      preferencesPersisted.value = true;
    }
    if (invalidate) prepared.value = null;
  }
  function temporary(row: LocalRecord) {
    const rows = [...memory.value, row];
    memoryBytes += recordBytes(row);
    while (rows.length > LOCAL_RECORD_LIMIT || memoryBytes > LOCAL_BYTE_LIMIT) {
      memoryBytes -= recordBytes(rows.shift()!);
      memoryDropped.value++;
    }
    memory.value = rows;
  }
  function fault() {
    missed.value++;
    status.value = '部分试玩记录未能生成；游戏存档状态不受影响。';
  }
  async function refresh(owner = connection, candidate = repo) {
    const editing = editVersion,
      recording = generation,
      request = ++refreshRequest,
      owns = () =>
        live(owner, candidate) &&
        editing === editVersion &&
        recording === generation &&
        request === refreshRequest;
    if (!owns()) return;
    try {
      const value = await candidate!.readMeta(owner!.controller.signal);
      if (owns()) apply(value);
    } catch (e) {
      if (!owns()) return;
      available.value = false;
      preferencesPersisted.value = false;
      status.value =
        e instanceof LocalDataError
          ? e.message
          : '本地记录暂不可读，原数据未覆盖。';
    }
  }
  function record(observation: Observation) {
    if (closed || !preferences.value.recording) return;
    if (!ready.value) {
      missed.value++;
      return;
    }
    let row: LocalRecord;
    try {
      row = {
        id: crypto.randomUUID(),
        sessionId,
        elapsedMs: now(),
        seed: null,
        observation: structuredClone(observation),
      };
      validateRecord(row);
    } catch {
      fault();
      return;
    }
    if (pending.value >= 100) {
      missed.value++;
      status.value = '试玩记录排队过多，部分观察未记录；游戏仍可继续。';
      return;
    }
    const owner = generation,
      editing = editVersion,
      connectionOwner = connection,
      candidate = repo,
      queueOwner = queueVersion,
      captured = meta
        ? {
            commandId: row.id,
            runId: meta.epoch,
            expectedRevision: meta.controlRevision,
          }
        : null;
    const owns = () =>
      owner === generation &&
      editing === editVersion &&
      queueOwner === queueVersion &&
      current(connectionOwner);
    pending.value++;
    queue = queue
      .then(async () => {
        if (!owns()) return;
        if (
          live(connectionOwner, candidate) &&
          available.value &&
          preferencesPersisted.value &&
          captured
        ) {
          try {
            const value = await candidate!.append(row, captured);
            if (owns() && live(connectionOwner, candidate)) {
              apply(value);
              notify(connectionOwner);
            }
            return;
          } catch (e) {
            if (!owns()) return;
            if (
              e instanceof LocalDataError &&
              ['LOCAL_STALE', 'LOCAL_PAUSED'].includes(e.code)
            ) {
              await refresh(connectionOwner, candidate);
              return;
            }
            available.value = false;
            preferencesPersisted.value = false;
            status.value =
              (e instanceof LocalDataError ? e.message : '试玩记录未写入。') +
              ' 新记录仅在本页保留，旧记录未覆盖，请先导出。';
          }
        }
        if (owns()) temporary(row);
      })
      .catch(() => {
        if (owns()) fault();
      })
      .finally(() => {
        if (queueOwner === queueVersion) pending.value--;
      });
  }
  function init(): Promise<void> {
    if (closed) return Promise.resolve();
    if (initializing) return initializing;
    const old = connection;
    connection = null;
    closeConnection(old);
    detachQueue();
    repo = undefined;
    meta = null;
    const owner: Connection = {
        controller: new AbortController(),
        initializing: true,
      },
      editing = editVersion,
      unsavedEdit = editVersion > 0 && !preferencesPersisted.value;
    connection = owner;
    ready.value = false;
    count.value = null;
    listing.value = [];
    available.value = false;
    preferencesPersisted.value = false;
    status.value = '正在读取本地设置……';
    const job = (async () => {
      try {
        const result = await initializeLocal(
          owner.controller,
          async (signal) => {
            const candidate = await LocalExperienceRepository.open(
              session.localDatabase,
              () => invalidated(owner),
              signal,
            );
            owner.candidate = candidate;
            if (!current(owner) || signal.aborted) {
              candidate.close();
              throw new LocalDataError('LOCAL_STALE', '旧本地读取已结束。');
            }
            const value = await candidate.readMeta(signal);
            if (!current(owner) || signal.aborted) {
              candidate.close();
              throw new LocalDataError('LOCAL_STALE', '旧本地读取已结束。');
            }
            return { candidate, value };
          },
        );
        if (!current(owner) || owner.controller.signal.aborted) {
          result.candidate.close();
          return;
        }
        const restorePreferences = !unsavedEdit && editing === editVersion;
        repo = result.candidate;
        apply(result.value, restorePreferences);
        available.value = true;
        preferencesPersisted.value = restorePreferences;
        status.value = restorePreferences
          ? '显示设置已保存；试玩记录仅在本机，不上传。'
          : '旧设置已读取；本页选择仍为临时选择，尚未写回，请明确确认后保存。';
        if ('BroadcastChannel' in globalThis) {
          owner.channel = new BroadcastChannel(session.localChannel);
          owner.channel.onmessage = () => {
            if (live(owner, result.candidate))
              void refresh(owner, result.candidate);
          };
        }
      } catch (e) {
        owner.candidate?.close();
        if (!current(owner)) return;
        repo = undefined;
        meta = null;
        preferencesPersisted.value = false;
        available.value = false;
        count.value = null;
        if (!unsavedEdit && editing === editVersion) stopRecording();
        status.value =
          (e instanceof LocalDataError
            ? e.message
            : '本地设置无法读取，原数据已保留。') +
          ' 当前使用临时显示设置；' +
          (preferences.value.recording
            ? '记录仅按本页明确选择临时采集；'
            : '记录采集未开启；') +
          '旧记录数量未知，可手动重读。';
      } finally {
        if (current(owner)) {
          owner.initializing = false;
          ready.value = true;
        }
      }
      if (current(owner) && !didSession) {
        didSession = true;
        record(sessionObservation());
      }
    })();
    initializing = job;
    void job.then(
      () => {
        if (initializing === job) initializing = null;
      },
      () => {
        if (initializing === job) initializing = null;
      },
    );
    return job;
  }
  async function setPreferences(patch: Partial<Preferences>) {
    if (closed || busy.value) return;
    let desired: Preferences;
    try {
      desired = parsePreferences({ ...preferences.value, ...patch });
    } catch {
      status.value = '显示设置取值无效，未改变。';
      return;
    }
    const owner = connection,
      candidate = repo,
      editing = ++editVersion,
      owns = () => current(owner) && editing === editVersion;
    let releasedBusy = false;
    if (desired.recording !== preferences.value.recording) generation++;
    preferences.value = desired;
    preferencesPersisted.value = false;
    prepared.value = null;
    busy.value = true;
    status.value = '正在保存显示设置……';
    const intent: LocalCommand | undefined = meta
      ? {
          commandId: crypto.randomUUID(),
          runId: meta.epoch,
          expectedRevision: meta.preferenceRevision,
        }
      : undefined;
    try {
      if (!live(owner, candidate) || !intent)
        throw new LocalDataError('LOCAL_DENIED', '本地设置暂不可写。');
      const saved = await candidate!.setPreferences(intent, desired);
      if (!owns() || !live(owner, candidate)) return;
      const external =
        !!meta && meta.preferenceRevision > saved.preferenceRevision;
      apply(saved, true);
      if (meta) apply(meta, true);
      available.value = true;
      preferencesPersisted.value = true;
      status.value = external
        ? '本次设置已保存；另一页面随后改变设置，已显示刚核对的最新值。'
        : preferences.value.recording
          ? '显示设置已保存；试玩记录仅在本机，不上传。'
          : '设置已保存，本地试玩记录已关闭。';
      notify(owner);
    } catch (e) {
      if (!owns()) return;
      preferencesPersisted.value = false;
      if (
        e instanceof LocalDataError &&
        e.code === 'LOCAL_STALE' &&
        live(owner, candidate)
      ) {
        releasedBusy = true;
        busy.value = false;
        status.value =
          '设置尚未保存，正在核对另一页面的修改；可重新选择或重读。';
        const recording = generation,
          request = ++refreshRequest,
          reads = () =>
            owns() &&
            live(owner, candidate) &&
            recording === generation &&
            request === refreshRequest;
        try {
          const latest = await candidate!.readMeta(owner!.controller.signal);
          if (!reads()) return;
          apply(latest);
          status.value =
            '另一页面已改变设置，已读取最新记录；本次选择仅在本页保留，请重新确认。';
        } catch {
          if (reads())
            status.value = '设置冲突且暂不可读取；仅在本页保留当前选择。';
        }
      } else
        status.value =
          (e instanceof LocalDataError ? e.message : '显示设置未保存。') +
          ' 当前选择仅在本页使用，刷新后会恢复已保存值。';
    } finally {
      if (owns() && !releasedBusy) busy.value = false;
    }
  }
  async function showRecords() {
    const owner = connection,
      candidate = repo,
      editing = editVersion,
      recording = generation,
      request = ++listRequest,
      owns = () =>
        current(owner) && recording === generation && request === listRequest;
    await queue;
    if (!owns()) return;
    if (!live(owner, candidate) || !available.value) {
      listing.value = [];
      return;
    }
    try {
      const result = await candidate!.list(20);
      if (!owns() || !live(owner, candidate)) return;
      apply(result.meta);
      listing.value = result.entries;
    } catch (e) {
      if (owns() && live(owner, candidate) && editing === editVersion)
        status.value =
          e instanceof LocalDataError
            ? e.message
            : '记录无法读取，原数据已保留。';
    }
  }
  async function clear() {
    if (closed || busy.value) return;
    const owner = connection,
      candidate = repo,
      editing = editVersion,
      wasPersisted = preferencesPersisted.value;
    busy.value = true;
    generation++;
    prepared.value = null;
    const intent = meta
      ? {
          commandId: crypto.randomUUID(),
          runId: meta.epoch,
          expectedRevision: meta.preferenceRevision,
        }
      : null;
    try {
      if (!live(owner, candidate) || !available.value || !intent)
        throw new LocalDataError(
          'LOCAL_DENIED',
          '无法核对旧本地数据，未清空。',
        );
      const saved = await candidate!.clear(intent);
      if (!live(owner, candidate)) return;
      apply(saved, wasPersisted);
      if (wasPersisted && meta) apply(meta, true);
      preferencesPersisted.value = wasPersisted;
      memory.value = [];
      memoryBytes = 0;
      listing.value = [];
      memoryDropped.value = 0;
      missed.value = 0;
      status.value =
        '本地试玩记录已清空；显示设置和游戏存档保留。' +
        (wasPersisted ? '' : '本页显示选择仍为临时选择，未写回。');
      notify(owner);
    } catch (e) {
      if (current(owner) && editing === editVersion)
        status.value =
          e instanceof LocalDataError ? e.message : '清空未完成，原记录保留。';
    } finally {
      if (current(owner) && editing === editVersion) busy.value = false;
    }
  }
  function clearMemory() {
    generation++;
    memory.value = [];
    memoryBytes = 0;
    memoryDropped.value = 0;
    prepared.value = null;
    status.value = '本页临时记录已清除；旧本地数据未改变。';
  }
  async function prepareExport(scope: {
    runId: string | null;
    target: TrackingTarget;
  }) {
    const owner = generation,
      editing = editVersion,
      request = ++exportRequest,
      prior = prepared.value,
      connectionOwner = connection,
      candidate = repo,
      prefSnapshot = parsePreferences({ ...preferences.value }),
      target = parseTrackingTarget({ ...scope.target });
    const assertCurrent = () => {
      if (
        !current(connectionOwner) ||
        request !== exportRequest ||
        prepared.value !== prior ||
        editing !== editVersion ||
        owner !== generation ||
        JSON.stringify(prefSnapshot) !== JSON.stringify(preferences.value)
      )
        throw new LocalDataError(
          'LOCAL_STALE',
          '记录或设置已改变，请重新预览。',
        );
    };
    await queue;
    assertCurrent();
    let snapshot: { meta: LocalMeta; entries: RecordEntry[] } | null = null;
    if (live(connectionOwner, candidate))
      try {
        snapshot = await candidate!.dump();
        assertCurrent();
        if (!live(connectionOwner, candidate))
          throw new LocalDataError(
            'LOCAL_STALE',
            '本地连接已改变，请重新预览。',
          );
        apply(snapshot.meta);
      } catch (e) {
        assertCurrent();
        status.value =
          (e instanceof LocalDataError ? e.message : '旧本地记录不可读。') +
          ' 导出只含当前可核对数据。';
        snapshot = null;
      }
    if (snapshot && live(connectionOwner, candidate)) {
      const latest = await candidate!.readMeta(
        connectionOwner!.controller.signal,
      );
      assertCurrent();
      if (!live(connectionOwner, candidate))
        throw new LocalDataError('LOCAL_STALE', '本地连接已改变，请重新预览。');
      apply(latest);
    }
    assertCurrent();
    if (
      snapshot &&
      meta &&
      (snapshot.meta.epoch !== meta.epoch ||
        snapshot.meta.preferenceRevision !== meta.preferenceRevision)
    )
      throw new LocalDataError('LOCAL_STALE', '记录或设置已改变，请重新预览。');
    const data = {
      format: 'chenyuan-local-playtest',
      version: 1,
      notASave: true,
      sessionId,
      capturedAtSessionMs: now(),
      policy: {
        automaticallyUploaded: false,
        containsPlayerName: false,
        containsSave: false,
        containsDeviceFingerprint: false,
        seed: '本版本确定性规则没有随机种子，所有seed均为null。',
        time: 'elapsedMs是观察发生时相对该sessionId的真实毫秒；包括阅读停留，不输入Game规则。关闭网页不代表失败。',
        replay:
          'replay观察已有回执，不是再次行动；state是观察时状态，result是原指令结果，原行动时间未知。',
        coverage:
          '仅为开启采集且成功观察的必要行为；缺失/关闭/回收/退出可能导致不完整，不是完整存档或事实唯一依据。',
        snapshot: '导出为预览时快照，不含预览之后的新记录。',
      },
      preferences: {
        version: 1,
        values: prefSnapshot,
        persisted:
          preferencesPersisted.value &&
          !busy.value &&
          JSON.stringify(prefSnapshot) ===
            JSON.stringify(snapshot?.meta.preferences),
        tracking: {
          runId: publicId(scope.runId),
          identifiersRedacted: !!scope.runId && !publicId(scope.runId),
          target,
          meaning: '预览请求时的追踪显示快照；目标按人生隔离，不会恢复Game。',
        },
      },
      retention: {
        maxRecords: LOCAL_RECORD_LIMIT,
        maxBytes: LOCAL_BYTE_LIMIT,
        droppedPersisted: snapshot?.meta.droppedCount ?? null,
        droppedMemory: memoryDropped.value,
        missedObservationsInThisSession: missed.value,
      },
      persistent: {
        available: !!snapshot,
        revision: snapshot?.meta.revision ?? null,
        epoch: snapshot?.meta.epoch ?? null,
        preferenceRevision: snapshot?.meta.preferenceRevision ?? null,
        controlRevision: snapshot?.meta.controlRevision ?? null,
        entries: snapshot?.entries ?? [],
      },
      memoryOnly: structuredClone(memory.value),
    };
    for (const entry of data.persistent.entries) validateRecord(entry.record);
    for (const row of data.memoryOnly) validateRecord(row);
    const scoped =
      session.kind === 'demo'
        ? {
            ...data,
            captureContext: {
              kind: 'demo',
              nodeId: session.node!.nodeId,
              sourceDigest: session.node!.sourceDigest,
            },
          }
        : data;
    prepared.value = scoped;
    return scoped;
  }
  async function validatedDownload() {
    const data = prepared.value,
      owner = connection,
      candidate = repo;
    if (!data || closed) return null;
    if (data.persistent.available) {
      if (!live(owner, candidate))
        throw new LocalDataError('LOCAL_STALE', '本地连接已改变，请重新预览。');
      const latest = await candidate!.readMeta(owner!.controller.signal);
      if (!live(owner, candidate) || prepared.value !== data)
        throw new LocalDataError(
          'LOCAL_STALE',
          '记录或设置已改变，请重新预览。',
        );
      apply(latest);
      if (
        prepared.value !== data ||
        latest.epoch !== data.persistent.epoch ||
        latest.preferenceRevision !== data.persistent.preferenceRevision
      )
        throw new LocalDataError(
          'LOCAL_STALE',
          '记录或设置已改变，请重新预览。',
        );
    }
    return current(owner) && prepared.value === data ? data : null;
  }
  function reconnect() {
    if (closed || busy.value) return Promise.resolve();
    initializing = null;
    return init();
  }
  onScopeDispose(() => {
    closed = true;
    const old = connection;
    connection = null;
    detachQueue();
    closeConnection(old);
    repo = undefined;
    initializing = null;
  });
  return {
    preferences,
    preferencesPersisted,
    ready,
    busy,
    pending,
    status,
    available,
    count,
    dropped,
    memory,
    listing,
    prepared,
    missed,
    memoryDropped,
    init,
    record,
    fault,
    setPreferences,
    showRecords,
    clear,
    clearMemory,
    prepareExport,
    validatedDownload,
    reconnect,
    flush: () => queue,
    confirmationScope: () =>
      meta
        ? JSON.stringify([
            generation,
            meta.epoch,
            meta.preferenceRevision,
            meta.controlRevision,
            meta.eventCount,
            meta.eventBytes,
            meta.droppedCount,
          ])
        : null,
  };
}
