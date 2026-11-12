import type { Page } from '@playwright/test';
import type { ActivityPlan } from '../../src/full/activity.ts';
import type { RealmId } from '../../src/full/content.ts';
import type { Game } from '../../src/full/types.ts';

import {repositoryFsRoot as root} from './fs-root';
type PositiveCost = { stones?: number; items?: Record<string, number>; mp?: number };
type PreparationId = 'assisted' | 'craft' | 'forge' | 'learn' | 'study' | 'buy' | 'sell' | 'use-healing' | 'use-spirit';

/** Isolated rule-route fixtures, not evidence of online growth or human pacing. */
export async function registerPositivePreparation(page: Page) {
  await page.evaluate(async root => {
    const h = (globalThis as any).h;
    const C = await import(`/@fs${root}src/full/content.ts`);
    const route = (realm: RealmId = 'qi') => {
      const d = h.routes.driver('leave', 'sword');
      while (C.rank(d.game.core.player.realm) < C.rank(realm)) d.realm();
      return d;
    };
    const register = (id: PreparationId, game: Game, plan: ActivityPlan, cost: PositiveCost) => {
      if (h.m02Rows[id]) throw new Error('Duplicate M02 fixture: ' + id);
      h.engine.validateGame(game);
      h.m02Rows[id] = { game: structuredClone(game), plan: structuredClone(plan), cost: structuredClone(cost) };
    };

    const assisted = route(); assisted.funds(20); assisted.go('cave');
    register('assisted', assisted.game, { kind: 'cultivation', method: 'assisted', maxCycles: 1,
      until: 'cycles', stoneBudget: 20, stoneReserve: 0 }, { stones: 20 });

    const craft = route(); craft.resource('herb', 2); craft.funds(2); craft.go('cave');
    register('craft', craft.game, { kind: 'craft', recipeId: 'healing', maxCycles: 1, until: 'cycles',
      targetQuantity: null, stoneBudget: 2, stoneReserve: 0, monthBudget: 1,
      remainingMonthsReserve: 1, itemReserves: {} }, { stones: 2, items: { herb: 2 } });

    const forge = route('golden'); forge.resource('jade', 3); forge.resource('core', 1); forge.funds(140); forge.go('cave');
    register('forge', forge.game, { kind: 'forge', relicId: 'frost_sword', maxCycles: 1,
      stoneBudget: 140, stoneReserve: 0, monthBudget: 2, remainingMonthsReserve: 1,
      itemReserves: {} }, { stones: 140, items: { jade: 3, core: 1 } });

    const learn = route('foundation'); learn.funds(100); learn.go('sect');
    register('learn', learn.game, { kind: 'learn', skills: ['sword_still'], maxCycles: 1,
      stoneBudget: 100, stoneReserve: 0 }, { stones: 100 });

    const study = route('foundation'); study.funds(80); study.go('sect');
    register('study', study.game, { kind: 'study', manual: 'jinghong', maxCycles: 1,
      stoneBudget: 80, stoneReserve: 0 }, { stones: 80 });

    const buy = route(); buy.funds(18); buy.go('market');
    register('buy', buy.game, { kind: 'buy', item: 'healing_pill', maxCycles: 1, until: 'cycles',
      targetQuantity: null, stoneBudget: 18, stoneReserve: 0 }, { stones: 18 });

    const sell = route(); sell.buy('healing_pill', sell.game.core.inventory.healing_pill + 1); sell.go('market');
    register('sell', sell.game, { kind: 'sell', item: 'healing_pill', maxCycles: 1,
      itemReserve: 0 }, { items: { healing_pill: 1 } });

    const healing = route(); healing.buy('healing_pill', healing.game.core.inventory.healing_pill + 1); healing.go('cave');
    // Only injury/low-MP are explicit validated boundary inputs; all stock comes
    // from the lawful route. These are not claimed naturally earned injuries.
    const injured = structuredClone(healing.game); injured.core.player.hp = 1;
    register('use-healing', injured, { kind: 'use', item: 'healing_pill', maxCycles: 1,
      targetPercent: 100, itemReserve: 0 }, { items: { healing_pill: 1 } });

    const spirit = route(); spirit.buy('spirit_pill', 1); spirit.go('cave');
    const depleted = structuredClone(spirit.game); depleted.core.player.mp = 1;
    register('use-spirit', depleted, { kind: 'use', item: 'spirit_pill', maxCycles: 1,
      targetPercent: 100, itemReserve: 0 }, { items: { spirit_pill: 1 } });
  }, root);
}
