import type { Page } from '@playwright/test';
import type { Game } from '../../src/full/types.ts';
import type { MilestoneAction } from '../../src/full/milestones.ts';

/** Register lawful rule fixtures only; this does not advance a repository or prove online pacing. */
export async function registerPositiveMilestone(page: Page) {
  await page.evaluate(() => {
    const h = (globalThis as any).h;
    if (!h?.m02Rows || !Array.isArray(h.milestoneSamples)) {
      throw new Error('M02 milestone registration requires setupMilestones and m02Rows');
    }
    type Cost = { stones?: number; items?: Record<string, number>; mp?: number };
    const rows: Record<string, {
      game: Game;
      plan: { kind: 'milestone'; action: MilestoneAction; maxCycles: 1 };
      cost: Cost;
    }> = {};
    function register(id: string, game: Game, action: MilestoneAction, cost: Cost) {
      if (Object.hasOwn(h.m02Rows, id) || Object.hasOwn(rows, id)) throw new Error('Duplicate M02 row: ' + id);
      const fixture = structuredClone(game);
      h.engine.validateGame(fixture);
      const command = { ...action, commandId: 'm02-fixture-' + id, runId: fixture.core.runId,
        expectedRevision: fixture.core.revision };
      // resolve must accept the selected branch before an injection can be considered a positive case.
      const formal = h.engine.resolve(fixture, command);
      const actual = formal.result.costs;
      const expectedItems = Object.entries(cost.items ?? {}).sort(([a], [b]) => a.localeCompare(b));
      const actualItems = Object.entries(actual.items).sort(([a], [b]) => a.localeCompare(b));
      if (actual.stones !== (cost.stones ?? 0) || actual.mp !== (cost.mp ?? 0) ||
          JSON.stringify(actualItems) !== JSON.stringify(expectedItems) ||
          ![actual.stones, actual.mp, ...Object.values(actual.items) as number[]].some(value => value > 0)) {
        throw new Error('M02 row does not have its declared positive consumption: ' + id);
      }
      rows[id] = { game: fixture, plan: { kind: 'milestone', action: structuredClone(action), maxCycles: 1 },
        cost: structuredClone(cost) };
    }
    function sample(type: string): Game {
      const entry = h.milestoneSamples.find((row: any) => row.action.type === type);
      if (!entry) throw new Error('Missing lawful milestone sample: ' + type);
      return entry.game;
    }
    const opening = sample('CHOOSE');
    register('choose-help', opening, { type: 'CHOOSE', choice: 'help' }, { items: { healing_pill: 1 } });
    register('choose-trade', opening, { type: 'CHOOSE', choice: 'trade' }, { items: { healing_pill: 1 } });

    for (const option of ['bargain', 'assist'] as const) {
      const route = h.routes.driver(option === 'bargain' ? 'trade' : 'leave');
      route.realm();
      if (option === 'bargain') route.funds(18);
      else route.resource('herb', 2);
      route.go('sect');
      route.doAction({ type: 'EVENT', event: 'shen_return' });
      if (route.game.core.player.realm !== 'foundation' || route.game.core.activeEvent?.id !== 'shen_return') {
        throw new Error('M02 paid response fixture must be a lawful foundation reunion');
      }
      register('decide-' + option, route.game, { type: 'DECIDE', option },
        option === 'bargain' ? { stones: 18 } : { items: { herb: 2 } });
    }

    const breakthrough = sample('BREAKTHROUGH');
    if (breakthrough.core.player.realm !== 'qi' || breakthrough.core.inventory.foundation_pill < 1) {
      throw new Error('M02 breakthrough requires a prepared qi cultivator and an actual foundation pill');
    }
    register('breakthrough', breakthrough, { type: 'BREAKTHROUGH' }, { items: { foundation_pill: 1 } });
    const trial = sample('START_TRIAL');
    if (trial.core.player.realm !== 'spirit' || trial.core.world.location !== 'terrace' ||
        trial.core.inventory.ascension_seal < 1 || trial.trial !== null) {
      throw new Error('M02 trial entry requires the complete unconsumed preparation');
    }
    register('start-trial', trial, { type: 'START_TRIAL' }, { items: { ascension_seal: 1 } });
    Object.assign(h.m02Rows, rows);
  });
}
