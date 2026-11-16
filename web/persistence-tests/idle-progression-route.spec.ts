import { test, expect } from '@playwright/test';
import { setupIdleProgression, type IdleRouteOptions } from './idle-progression-support';

// Each case creates a real empty repository. No imported stage, resource assignment or legacy batch.
const routes: Array<{ id: string; options: IdleRouteOptions }> = [
  { id: 'sword-gather', options: { school: 'sword', preparation: 'gather', choice: 'help', cultivation: 'natural', answer: 'accept', ending: 'transmit', advanced: true } },
  { id: 'sword-commission', options: { school: 'sword', preparation: 'commission', choice: 'trade', cultivation: 'assisted', answer: 'release', ending: 'depart', advanced: true } },
  { id: 'sword-purchase', options: { school: 'sword', preparation: 'purchase', choice: 'leave', cultivation: 'natural', answer: 'release', ending: 'transmit', advanced: true } },
  { id: 'talisman-gather', options: { school: 'talisman', preparation: 'gather', choice: 'trade', cultivation: 'assisted', answer: 'accept', ending: 'depart', advanced: true } },
  { id: 'talisman-commission', options: { school: 'talisman', preparation: 'commission', choice: 'leave', cultivation: 'natural', answer: 'accept', ending: 'transmit', advanced: true } },
  { id: 'talisman-purchase', options: { school: 'talisman', preparation: 'purchase', choice: 'help', cultivation: 'assisted', answer: 'release', ending: 'depart', advanced: true } },
];

test.beforeEach(async ({ page }) => { await setupIdleProgression(page); });

for (const route of routes) test(`normal idle new life ${route.id} persists every authorized cycle through explicit ascension`, async ({ page }, info) => {
  test.setTimeout(180_000);
  const result = await page.evaluate(async ({ options, id }) => (globalThis as any).h.runPersistedIdleScenario(options, id), route);
  expect(result.initial.core.revision).toBe(0);
  expect(result.initial.core.player.realm).toBe('mortal');
  expect(result.game).toEqual(result.expectedGame);
  expect(result.game.core.runId).toBe(result.initial.core.runId);
  expect(result.game.core.player.realm).toBe('ascended');
  expect(result.game.school).toBe(route.options.school);
  expect(result.game.core.openingChoice).toBe(route.options.choice);
  expect(result.game.ending).toBe(route.options.ending);
  expect(result.game.status).toBe('ascended');
  expect(result.game.wins).toBe(3);
  expect(result.game.choices).toEqual({});
  expect(result.activity.status).toBe('stopped');
  expect(result.activity.plan).toMatchObject({ kind: 'milestone', action: { type: 'END', ending: route.options.ending }, maxCycles: 1 });
  expect(result.activity.completedCycles).toBe(1);
  expect(result.onlineMs).toBe(result.expectedOnlineMs);
  expect(result.onlineMs).toBeGreaterThan(0);
  expect(result.cycles).toBe(result.receipts.reduce((total: number, receipt: any) => total + receipt.cycles, 0));
  expect(result.steps).toBe(result.arrangements.length + result.configurations.length);
  expect(new Set(result.realms)).toEqual(new Set(['mortal', 'qi', 'foundation', 'golden', 'nascent', 'spirit']));
  expect(result.kinds).toEqual(expect.arrayContaining(['milestone', 'travel', 'cultivation', 'source', 'forge', 'learn', 'buy', 'battle']));
  const trialGates = result.arrangements.filter((entry: any) => entry.kind === 'battle');
  const stages = trialGates.map((entry: any) => entry.trialStage);
  expect(stages.filter((stage: number, index: number) => index === 0 || stage !== stages[index - 1])).toEqual([1, 2, 3]);
  expect(new Set(trialGates.map((entry: any) => entry.activityId)).size).toBe(trialGates.length);
  for (const stage of [1, 2, 3]) {
    const segments = trialGates.filter((entry: any) => entry.trialStage === stage);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments.length).toBeLessThanOrEqual(3);
    expect(segments.map((entry: any) => entry.stopReason)).toEqual([
      ...Array(segments.length - 1).fill('ACTIVITY_BUDGET'), stage === 3 ? 'WAITING_DECISION' : 'STAGE_COMPLETE',
    ]);
  }
  expect(result.arrangements.filter((entry: any) => entry.actionType === 'BREAKTHROUGH')).toHaveLength(5);
  for (const action of ['CHOOSE', 'START_TRIAL', 'ANSWER_TRIAL', 'END'])
    expect(result.arrangements.filter((entry: any) => entry.actionType === action)).toHaveLength(1);
  expect(result.earlyChecks).toBe(result.earlyKinds.length);
  expect(result.earlyChecks).toBeGreaterThanOrEqual(6);
  const { initial, game, expectedGame, activity, ...summary } = result;
  await info.attach('virtual-idle-repository-route', { body: JSON.stringify({ options: route.options, ...summary,
    final: { runId: game.core.runId, revision: game.core.revision, status: game.status, ending: game.ending,
      school: game.school, elapsedMonths: game.core.world.elapsedMonths, finalActivity: activity.status } }, null, 2), contentType: 'application/json' });
});
