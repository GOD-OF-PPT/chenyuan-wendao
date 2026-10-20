/** Store/IndexedDB delivery faults for isolated tests; never imported by the production entry. */
import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { useGame } from '../src/store';
import { FullSaveRepository } from '../src/full-persistence';
import { RuleError } from '../../src/full/errors.ts';
import type { ActivityOutcome, ActivityTick } from '../../src/full/activity.ts';

export function createActivityStoreHarness() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useGame(pinia);
  const restores: Array<() => void> = [];
  let delivered: { tick: ActivityTick; outcome: ActivityOutcome } | null = null;
  let release: (() => void) | null = null;
  const originalDateNow = Date.now;
  let wallOffset = 0, wallInstalled = false;
  let earlyRejected: { tick: ActivityTick; code: string; now: number } | null = null;
  function shiftWallClock(milliseconds: number) {
    if (!Number.isSafeInteger(milliseconds)) throw new Error('invalid test clock offset');
    wallOffset += milliseconds;
    if (!wallInstalled) {
      wallInstalled = true; Date.now = () => originalDateNow() + wallOffset;
      restores.push(() => { Date.now = originalDateNow; });
    }
  }
  function rewindBeforeNextCycle(milliseconds: number) {
    const prototype = FullSaveRepository.prototype, original = prototype.settleActivity;
    const restore = () => { prototype.settleActivity = original; }; restores.push(restore);
    prototype.settleActivity = async function(tick: ActivityTick): Promise<ActivityOutcome> {
      restore(); shiftWallClock(-milliseconds);
      try { return await original.call(this, tick); }
      catch (error) {
        earlyRejected = { tick: structuredClone(tick), code: error instanceof RuleError ? error.code : 'OTHER', now: Date.now() };
        throw error;
      }
    };
  }

  function interceptNextCycle(mode: 'lost' | 'held') {
    const prototype = FullSaveRepository.prototype, original = prototype.settleActivity;
    const restore = () => { prototype.settleActivity = original; };
    restores.push(restore);
    prototype.settleActivity = async function(tick: ActivityTick): Promise<ActivityOutcome> {
      let outcome: ActivityOutcome;
      try { outcome = await original.call(this, tick); }
      finally { restore(); }
      delivered = { tick: structuredClone(tick), outcome: structuredClone(outcome) };
      if (mode === 'lost') throw new RuleError('STORAGE_ABORTED', '测试注入：修炼已原子提交，但回复丢失。');
      await new Promise<void>(resolve => { release = resolve; });
      return outcome;
    };
  }
  return {
    store,
    loseNextCycleDelivery() { interceptNextCycle('lost'); },
    holdNextCycleDelivery() { interceptNextCycle('held'); },
    releaseHeldCycle() { const done = release; release = null; done?.(); },
    get delivered() { return delivered; },
    get holding() { return release !== null; },
    shiftWallClock,
    rewindBeforeNextCycle,
    get earlyRejected() { return earlyRejected; },
    async persisted() {
      const repo = await FullSaveRepository.open();
      try { return await repo.loadActivitySnapshot(); }
      finally { repo.close(); }
    },
    state() {
      return structuredClone({ game: store.game, activity: store.activity, runtime: store.activityRuntime,
        busy: store.busy, saved: store.saved, error: store.error, canRetry: store.canRetry,
        lastResult: store.lastResult, lastReplayed: store.lastReplayed, lastFromActivity: store.lastFromActivity,
        pausing: store.activityPausing });
    },
    dispose() {
      const done = release; release = null; done?.();
      for (const restore of restores) restore();
      disposePinia(pinia);
    },
  };
}
