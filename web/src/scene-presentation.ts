import type { Game } from '../../src/full/types.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import type { LocationId } from '../../src/full/content.ts';

const scenes = {
  wilderness: 'wilderness', cave: 'settlement', sect: 'settlement',
  market: 'settlement', secret: 'secret', terrace: 'terrace',
} as const satisfies Record<LocationId, string>;

/** Presentation only: no resource, time or progression calculation. */
export function scenePresentation(game: Game) {
  const location = game.core.world.location, phase = gamePhase(game);
  const gate: 'none'|'closed'|'storm'|'opened' = location !== 'terrace' ? 'none' :
    phase === 'trial-ending' || phase === 'ascended' ? 'opened' :
    phase === 'trial-battle' ? 'storm' : 'closed';
  return { key: scenes[location], artKey: phase === 'opening' ? 'opening' as const : location, location, phase, gate,
    compact: phase === 'opening' || phase === 'event' || !!game.battle || phase === 'trial-question' };
}
