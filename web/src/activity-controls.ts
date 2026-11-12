import {computed,inject,type InjectionKey,type ComputedRef} from 'vue';

// This is presentation ownership only. The Store retains its original runtime,
// timer, due command and all persistence decisions.
export const primaryActivityControls:InjectionKey<ComputedRef<boolean>>=Symbol('primary-activity-controls');
export function useLocalActivityControls(){
  const primary=inject(primaryActivityControls,undefined);
  return computed(()=>!primary?.value);
}
