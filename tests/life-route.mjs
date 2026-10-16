import * as C from '../src/full/content.ts';
import { runner } from '../scripts/economy/scenarios.mjs';
export function legalLifeBoundary(realm = 'qi', remaining = 1, choice = 'leave', school = 'sword') {
  const r = runner({ choice, school, preparation: 'gather', cultivation: 'natural', advancedMind: false });
  r.grow(realm, false); r.go('sect');
  const endMonth = C.realms[realm].lifespanMonths - r.ledger.game.core.player.startAgeMonths - remaining;
  while (r.ledger.game.core.world.elapsedMonths < endMonth) r.act({ type: 'SOURCE', sourceId: 'work', count: Math.min(50, endMonth - r.ledger.game.core.world.elapsedMonths) }, 'lifespan-boundary-fixture');
  return r;
}
