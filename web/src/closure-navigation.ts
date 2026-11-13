import type {PreparedMilestone} from './milestone-view';

/** The stage owns navigation/focus handoff; closure decisions own their intents. */
export interface ClosureNavigation {
 owner():number;
 leaveSettings():HTMLElement|null;
 accepted(review:PreparedMilestone,owner:number,sync:number,target:'stage'|'life'):void;
 showTrialPreparation():Promise<void>;
}
