import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import type { useGame } from './store';
import type {
  ConfigurationAction,
  ConfigurationIntent,
} from '../../src/full/configuration.ts';
import type { Game } from '../../src/full/types.ts';

/** A compared configuration keeps its original Game and activity CAS intent. */
export function useConfigurationReview(store: ReturnType<typeof useGame>) {
  const error = ref(''),
    intent = shallowRef<ConfigurationIntent | null>(null),
    snapshot = shallowRef<Game | null>(null);
  let alive = true;
  onScopeDispose(() => {
    alive = false;
  });
  const stale = computed(
    () =>
      !!intent.value &&
      (!store.game ||
        store.game.core.runId !== intent.value.command.runId ||
        store.game.core.revision !== intent.value.command.expectedRevision ||
        (store.activity?.id ?? null) !== intent.value.expectedActivityId ||
        (store.activity?.revision ?? null) !==
          intent.value.expectedActivityRevision),
  );
  const retry = computed(
    () => !!intent.value && store.canRetryFor(intent.value.command.commandId),
  );
  function inspect(action: ConfigurationAction) {
    const prepared = store.prepareConfiguration(action);
    if (!prepared || !store.game) return;
    error.value = '';
    snapshot.value = structuredClone(store.game);
    intent.value = prepared;
  }
  function close() {
    if (store.busy) return;
    const current = intent.value;
    if (current) store.discardRetryFor(current.command.commandId);
    intent.value = null;
    snapshot.value = null;
  }
  function refresh() {
    const action = intent.value?.command;
    if (!action) return;
    close();
    inspect(
      action.type === 'SCHOOL'
        ? { type: 'SCHOOL', school: action.school }
        : action.type === 'EQUIP'
          ? { type: 'EQUIP', skill: action.skill }
          : { type: 'EQUIP_RELIC', relic: action.relic },
    );
  }
  async function confirm(retrying = false) {
    const current = intent.value;
    if (!alive || !current || (!retrying && stale.value) || store.busy) return;
    if (retrying) await store.retryFor(current.command.commandId);
    else await store.applyConfiguration(current);
    if (!alive) return;
    error.value = store.error;
    const committed =
      store.syncIssue &&
      store.lastResult?.commandId === current.command.commandId &&
      store.lastResult.runId === current.command.runId;
    if ((!store.error || committed) && intent.value === current) close();
  }
  return {
    configurationError: error,
    configurationIntent: intent,
    configurationSnapshot: snapshot,
    configurationStale: stale,
    configurationRetry: retry,
    inspectConfiguration: inspect,
    closeConfiguration: close,
    refreshConfiguration: refresh,
    confirmConfiguration: confirm,
  };
}
