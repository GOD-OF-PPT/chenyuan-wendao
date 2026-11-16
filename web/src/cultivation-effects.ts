import {
  computed,
  inject,
  nextTick,
  ref,
  shallowRef,
  watch,
  onActivated,
  onDeactivated,
  onScopeDispose,
  type InjectionKey,
} from 'vue';
import type { Action, Game } from '../../src/full/types.ts';
import type { Activity } from '../../src/full/activity.ts';
import type { useGame } from './store';
import { canonicalFingerprint as proof } from '../../src/full/receipts.ts';
import { useActivityPresentation } from './use-activity-effect.ts';

export type CultivationMethod = 'natural' | 'assisted';
export type CultivationMilestoneKind = 'opening' | 'breakthrough' | 'trial';
export function cultivationActivityMatches(a: Activity) {
  return a.version === 1 && a.plan.kind === 'cultivation';
}
export function cultivationMilestoneMatches(a: Activity) {
  return (
    a.version === 7 &&
    ['CHOOSE', 'BREAKTHROUGH', 'START_TRIAL'].includes(a.plan.action.type)
  );
}
/** A running witness is private presentation state, never an authorization or a save. */
export function cultivationTarget(game: Game, a: Activity) {
  if (!a.nextCommand || a.runId !== game.core.runId) return null;
  const command = a.nextCommand;
  if (
    cultivationActivityMatches(a) &&
    a.version === 1 &&
    command.type === 'CULTIVATE' &&
    command.count === 1 &&
    command.method === a.plan.method &&
    a.realm === game.core.player.realm
  ) {
    return {
      runId: a.runId,
      realm: a.realm,
      action: { type: 'CULTIVATE', method: command.method, count: 1 } as Action,
      game: structuredClone(game),
      commandId: command.commandId,
    };
  }
  if (
    cultivationMilestoneMatches(a) &&
    a.version === 7 &&
    proof(a.plan.action) ===
      proof(
        (({ commandId, runId, expectedRevision, ...action }) => action)(
          command,
        ),
      )
  ) {
    return {
      runId: a.runId,
      realm: a.realm,
      action: structuredClone(a.plan.action) as Action,
      game: structuredClone(a.originGame),
      commandId: command.commandId,
    };
  }
  return null;
}
type Target = NonNullable<ReturnType<typeof cultivationTarget>>;
export function cultivationObjectMatches(
  method: CultivationMethod,
  game: Game,
  target: Target,
) {
  return (
    target.runId === game.core.runId &&
    target.realm === game.core.player.realm &&
    target.action.type === 'CULTIVATE' &&
    target.action.method === method
  );
}
export function cultivationGateMatches(
  kind: CultivationMilestoneKind,
  runId: string,
  target: Target,
  selected: Action | null = null,
) {
  const type = {
    opening: 'CHOOSE',
    breakthrough: 'BREAKTHROUGH',
    trial: 'START_TRIAL',
  }[kind];
  return (
    target.runId === runId &&
    target.action.type === type &&
    (!selected || proof(selected) === proof(target.action))
  );
}

function useWitness(active: () => boolean, milestone: boolean) {
  const store = inject<ReturnType<typeof useGame>>('game-scene');
  const p = useActivityPresentation(
    milestone ? cultivationMilestoneMatches : cultivationActivityMatches,
    () => store?.game?.core.runId ?? '',
    active,
    milestone ? 7 : 1,
  );
  const witness = shallowRef<Target | null>(null),
    targets = new Map<string, Target>(),
    claimed = new Set<number>();
  let delivery: number | null = null;
  watch(
    p.runtime,
    (r) => {
      const a = p.activity.value,
        g = p.store?.game;
      if (r?.phase !== 'running' || !a?.nextCommand || !g) return;
      let target = targets.get(a.nextCommand.commandId);
      if (!target) {
        target = cultivationTarget(g, a) ?? undefined;
        if (!target) return;
        targets.set(target.commandId, target);
        if (targets.size > 8) targets.delete(targets.keys().next().value!);
      }
      witness.value = target;
    },
    { immediate: true, flush: 'sync' },
  );
  const effect = computed(() => {
    const e = p.effect.value,
      t = e ? targets.get(e.result.commandId) : null;
    return e && t ? { ...e, ...t } : null;
  });
  // The current Vue delivery admits a genuine phase/realm handoff, never a later visit.
  watch(
    effect,
    (e) => {
      delivery = e?.sequence ?? null;
      if (e)
        void nextTick(() => {
          if (delivery === e.sequence) delivery = null;
        });
    },
    { flush: 'sync' },
  );
  watch(
    () => p.store?.game?.core.runId,
    () => {
      targets.clear();
      witness.value = null;
    },
    { flush: 'sync' },
  );
  function claim(sequence: number) {
    if (delivery !== sequence || claimed.has(sequence)) return false;
    claimed.add(sequence);
    if (claimed.size > 128) claimed.delete(claimed.values().next().value!);
    return true;
  }
  return { ...p, witness, effect, claim };
}
export function useCultivationStage(active: () => boolean) {
  return {
    cultivation: useWitness(active, false),
    milestone: useWitness(active, true),
  };
}
export const cultivationStageKey: InjectionKey<
  ReturnType<typeof useCultivationStage>
> = Symbol('cultivation-stage');

function useObject(
  milestone: boolean,
  identity: () => string,
  matches: (target: Target) => boolean,
  active: () => boolean,
) {
  const stage = inject(cultivationStageKey)!,
    p = milestone ? stage.milestone : stage.cultivation,
    visible = ref(true);
  const result = shallowRef<NonNullable<typeof p.effect.value> | null>(null);
  const valid = computed(
    () =>
      visible.value &&
      active() &&
      !!p.store?.available &&
      !p.store.error &&
      !p.store.activityPausing,
  );
  const engaged = computed(
    () =>
      valid.value &&
      !!p.runtime.value &&
      !!p.witness.value &&
      matches(p.witness.value),
  );
  const runtime = computed(() => (engaged.value ? p.runtime.value : null)),
    phase = computed(() => runtime.value?.phase ?? 'idle');
  watch(
    [() => p.effect.value, identity, valid],
    () => {
      result.value = null;
      const e = p.effect.value;
      if (e && valid.value && matches(e) && p.claim(e.sequence))
        result.value = e;
    },
    { immediate: true, flush: 'post' },
  );
  onActivated(() => (visible.value = true));
  onDeactivated(() => {
    visible.value = false;
    result.value = null;
  });
  onScopeDispose(() => (result.value = null));
  const effect = computed(() => (valid.value ? result.value : null)),
    origin = computed(() => (engaged.value ? p.witness.value : effect.value));
  return {
    store: p.store,
    activity: p.activity,
    runtime,
    phase,
    engaged,
    effect,
    origin,
    action: computed(() => origin.value?.action ?? null),
    working: computed(() => engaged.value && p.working.value),
    progress: computed(() => (engaged.value ? p.progress.value : 0)),
    seconds: computed(() => (runtime.value ? runtime.value.totalMs / 1000 : 0)),
    remaining: computed(() =>
      runtime.value ? Math.ceil(runtime.value.remainingMs / 1000) : 0,
    ),
  };
}
export function useCultivationObject(
  method: () => CultivationMethod,
  active: () => boolean = () => true,
) {
  const stage = inject(cultivationStageKey)!,
    game = () => stage.cultivation.store?.game;
  const p = useObject(
    false,
    () => [game()?.core.runId, game()?.core.player.realm, method()].join(':'),
    (t) => !!game() && cultivationObjectMatches(method(), game()!, t),
    active,
  );
  return {
    ...p,
    method: computed(() =>
      p.action.value?.type === 'CULTIVATE' ? p.action.value.method : null,
    ),
  };
}
export function useCultivationMilestone(
  kind: () => CultivationMilestoneKind,
  action: () => Action | null = () => null,
  active: () => boolean = () => true,
) {
  const stage = inject(cultivationStageKey)!,
    run = () => stage.milestone.store?.game?.core.runId ?? '';
  return useObject(
    true,
    () => [run(), kind(), proof(action())].join(':'),
    (t) => cultivationGateMatches(kind(), run(), t, action()),
    active,
  );
}
