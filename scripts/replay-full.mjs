import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fullRoute } from '../tests/full-route.mjs';
import { parseGame } from '../src/full/engine.ts';
import { VERSION, BALANCE } from '../src/full/content.ts';
import { validateContent } from '../src/full/validate-content.ts';

validateContent();
const runs = [];
for (const choice of ['help', 'trade', 'leave']) {
  for (const school of ['sword', 'talisman']) {
    for (const strategy of ['craft', 'purchase']) {
      for (const ending of ['transmit', 'depart']) {
        const route = fullRoute(choice, school, strategy, false, ending);
        const game = parseGame(JSON.stringify(route.game));
        assert.equal(game.status, 'ascended');
        assert.equal(game.ending, ending);
        assert.equal(game.core.inventory.ascension_seal, 0);
        runs.push({
          choice, school, strategy, ending, mandatoryAllies: false,
          commands: route.actions.length, gameMonths: game.core.world.elapsedMonths,
          stones: game.core.player.stones, wins: game.wins,
          actionsSha256: createHash('sha256').update(JSON.stringify(route.actions)).digest('hex'),
        });
      }
    }
  }
}
console.log(JSON.stringify({
  contentVersion: VERSION, balanceVersion: BALANCE, passed: runs.length,
  scope: 'Pure engine replay through real commands; not browser, database, balance or human acceptance.',
  runs,
}, null, 2));
