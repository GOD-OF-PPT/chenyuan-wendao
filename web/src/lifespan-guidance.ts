import type { Game } from '../../src/full/types.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import {
  getLifeOverview,
  getBreakthroughGoal,
  previewAction,
} from '../../src/full/queries.ts';
import { contentForGame } from '../../src/full/rule-content.ts';
import { isLegacyRules } from '../../src/full/rule-profile.ts';
/** Display context only. Reading this projection cannot change a tracked goal or accept an action. */
export function lifespanGuidance(game: Game) {
  const life = getLifeOverview(game);
  if (
    game.status !== 'active' ||
    life.remainingMonths === null ||
    life.remainingMonths > 12
  )
    return null;
  const last = life.remainingMonths <= (isLegacyRules(game) ? 1 : 12),
    idle = gamePhase(game) === 'idle';
  const breakthrough = last && idle ? getBreakthroughGoal(game).preview : null;
  const cultivating =
    game.core.player.xp <
    contentForGame(game).realms[game.core.player.realm].xpCap;
  const blocked =
    last &&
    idle &&
    cultivating &&
    previewAction(game, { type: 'CULTIVATE', method: 'natural', count: 1 })
      .failure?.code === 'AGE_LIMIT' &&
    !breakthrough?.allowed;
  const hint =
    last && idle
      ? '余寿' +
        life.remainingMonths +
        '月 · ' +
        (breakthrough?.allowed
          ? '仍可核对突破'
          : cultivating
            ? '先查看此生去向'
            : '核对当前筹备')
      : null;
  return { life, last, blocked, hint };
}
