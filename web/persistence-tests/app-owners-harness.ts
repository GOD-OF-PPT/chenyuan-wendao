/** UI ownership tests use the production Store and real native repository. */
import { createApp, effectScope, h, nextTick, provide, ref } from 'vue';
import { createActivityStoreHarness } from './activity-store-harness';
import { FullSaveRepository } from '../src/full-persistence';
import { normalScope } from '../src/session';
import { useSaveControls } from '../src/use-save-controls';
import { useConfigurationReview } from '../src/use-configuration-review';
import { useDirectActions } from '../src/use-direct-actions';
import { useActivityPlans } from '../src/use-activity-plans';
import { useStageNavigation } from '../src/use-stage-navigation';
import { useDestinations } from '../src/use-destinations';
import { useFocus, gameFocusKey } from '../src/focus';
import { useGameConfirmation } from '../src/use-game-confirmation';
import ClosureDecisions from '../src/ClosureDecisions.vue';
import type { Game } from '../../src/full/types.ts';

export function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export async function createOwners(game: Game) {
  const repo = await FullSaveRepository.open();
  try {
    await repo.importText(JSON.stringify(game), {
      commandId: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      expectedRunId: null,
      expectedRevision: 0,
    });
  } finally {
    repo.close();
  }
  const fixture = createActivityStoreHarness(),
    store = fixture.store;
  await store.init();
  const scope = effectScope(),
    calls: string[] = [],
    name = ref('原道号');
  const closure = ref<InstanceType<typeof ClosureDecisions>>();
  let navigation!: ReturnType<typeof useStageNavigation>;
  let plans!: ReturnType<typeof useActivityPlans>;
  let destinations!: ReturnType<typeof useDestinations>;
  let configuration!: ReturnType<typeof useConfigurationReview>;
  let saves!: ReturnType<typeof useSaveControls>;
  let direct!: ReturnType<typeof useDirectActions>;
  let confirmation!: ReturnType<typeof useGameConfirmation>;
  let focus!: ReturnType<typeof useFocus>;
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    setup() {
      focus = useFocus(() => host.querySelector('button'));
      provide(gameFocusKey, focus);
      scope.run(() => {
        confirmation = useGameConfirmation({
          focus,
          appearance: () => ({ fontScale: 1, reduceMotion: true }),
        });
        navigation = useStageNavigation(store, focus, {
          singleScreen: () => true,
          immersive: () => true,
          narrativeContext: () => 1,
          content: () => host.querySelector('button'),
          lifeElement: () => undefined,
          settings: () => undefined,
          settingsButton: () => undefined,
          help: async () => {
            calls.push('help');
          },
          browse: () => {},
          clearInspections: () => plans?.clearInspections(),
          dismissResume: () => {},
        });
        plans = useActivityPlans(store, focus, {
          owner: () => navigation.owner.value,
          advance: navigation.advance,
          select: navigation.selectTab,
          open: navigation.openHub,
          current: () => ({
            singleScreen: true,
            view: navigation.hubView.value,
          }),
          dismissResume: () => {},
          navigate: (...args) => destinations.navigate(...args),
          inspectMilestone: () => {
            calls.push('inspect');
          },
        });
        destinations = useDestinations(store, focus, navigation, plans, {
          singleScreen: () => true,
          nextKind: () => undefined,
          quantity: ref(1),
          batch: ref(1),
        });
        configuration = useConfigurationReview(store);
        const source = () => ({ current: () => true, mayReturn: () => true });
        saves = useSaveControls(store, normalScope, confirmation, name, {
          source,
          blocked: () => '',
          settings: () => undefined,
          importOpener: () => undefined,
          completed: () => {
            calls.push('save-completed');
          },
        });
        direct = useDirectActions(store, focus, confirmation, {
          owner: () => navigation.owner.value,
          viewIdentity: () => [navigation.hubView.value],
          source,
          blocked: () => '',
          openCurrent: async () => {
            calls.push('visit-open');
          },
          regular: () => {
            calls.push('regular');
          },
        });
      });

      return () => [
        h('button', { id: 'owners-anchor' }, '继续查看'),
        h(ClosureDecisions, {
          ref: closure,
          singleScreen: true,
          can: () => true,
          navigation: {
            owner: () => navigation.owner.value,
            leaveSettings: () => null,
            accepted: () => {
              calls.push('closure-accepted');
            },
            showTrialPreparation: async () => {
              calls.push('closure-return');
            },
          },
        }),
      ];
    },
  });
  app.provide('game-scene', store);
  app.mount(host);
  await nextTick();
  let stopped = false;
  function stopOwners() {
    if (stopped) return;
    stopped = true;
    scope.stop();
    app.unmount();
    host.remove();
  }
  return {
    fixture,
    store,
    scope,
    calls,
    configuration,
    saves,
    direct,
    confirmation,
    navigation,
    plans,
    destinations,
    closure,
    host,
    stopOwners,
    dispose() {
      stopOwners();
      fixture.dispose();
    },
  };
}
