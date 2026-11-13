/** Overflow guard, never a gameplay target. Resource and safety boundaries stop real activities first. */
export const REPEAT_CYCLE_LIMIT = 1_000_000_000;
export interface RepeatingPlan {
  repeat?: true;
}
export function repeats(plan: object): boolean {
  return (
    Object.hasOwn(plan, 'repeat') && (plan as RepeatingPlan).repeat === true
  );
}
