import { createActivityEffectTracker } from './activity-effects.ts';
import * as C from '../../src/full/content.ts';
/** Original alchemy API; shared full-Game proof also serves resource and travel scenes. */
export function createAlchemyFeedbackTracker() {
  const tracker = createActivityEffectTracker((a) => a.version === 3);
  return {
    ...tracker,
    consume(...args: Parameters<typeof tracker.consume>) {
      const notice = tracker.consume(...args),
        a = args[2],
        r = args[3];
      if (!notice || a?.version !== 3 || !r || notice.family !== 'craft')
        return null;
      const item = C.recipes[a.plan.recipeId].output,
        quantity = r.delta.inventory[item] ?? 0;
      return quantity > 0 ? { item, quantity, label: notice.label } : null;
    },
  };
}
