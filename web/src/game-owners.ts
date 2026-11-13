import type { InjectionKey } from 'vue';
import type { useStageNavigation } from './use-stage-navigation';
import type { useDestinations } from './use-destinations';
import type { usePlayerActions } from './use-player-actions';
import type { useDirectActions } from './use-direct-actions';
import type { useSaveControls } from './use-save-controls';
import type { useTracking } from './use-tracking';
import type { useMilestoneReview } from './milestone-view';
import type { AscensionEnding } from '../../src/full/ascension.ts';

// These are individual owned modules, shared once by the composition root.
export const stageNavigationKey: InjectionKey<ReturnType<typeof useStageNavigation>> = Symbol('stage-navigation');
export const destinationsKey: InjectionKey<ReturnType<typeof useDestinations>> = Symbol('destinations');
export const playerActionsKey: InjectionKey<ReturnType<typeof usePlayerActions>> = Symbol('player-actions');
export const directActionsKey: InjectionKey<ReturnType<typeof useDirectActions>> = Symbol('direct-actions');
export const saveControlsKey: InjectionKey<ReturnType<typeof useSaveControls>> = Symbol('save-controls');
export const trackingKey: InjectionKey<ReturnType<typeof useTracking>> = Symbol('tracking');
export const milestoneReviewKey: InjectionKey<ReturnType<typeof useMilestoneReview>> = Symbol('milestone-review');
export interface ClosureCommands {
  requestEnd(type: 'RETIRE' | 'END_LIFE'): unknown;
  reviewTrial(): unknown;
  reviewAscension(ending: AscensionEnding): unknown;
  requestTrialRestore(): unknown;
}
export const closureCommandsKey: InjectionKey<ClosureCommands> = Symbol('closure-commands');
