import type { Page } from '@playwright/test';
import { setupPersistence } from './support';
import {repositoryFsRoot as root} from './fs-root';

/** Lawful rule routes for boundary persistence tests; elapsed wall time is tested separately in Store/UI. */
export async function setupMilestones(page: Page) {
  await setupPersistence(page);
  await page.evaluate(async root => {
    const h = (globalThis as any).h;
    h.milestoneReceipts = await import(`/@fs${root}src/full/receipts.ts`);
    h.milestoneModel = await import(`/@fs${root}src/full/activity.ts`);
    const samples = (routes: any, C: any, engine: any) => {
      const route = routes.fullRoute('help'), story = routes.driver('help'); story.realm(); story.go('sect');
      const storyStart = structuredClone(story.game); story.doAction({ type: 'EVENT', event: 'shen_return' });
      const trialStart = structuredClone(route.checkpoints.trial);
      const trialQuestion = engine.advance(trialStart, h.command(trialStart, { type: 'START_TRIAL' }));
      const aged = routes.driver(); aged.go('sect');
      const ageLimit = C.realms[aged.game.core.player.realm].lifespanMonths;
      // Honor each profile's actual productive step and final remainder; never
      // ask a batch to cross the lifespan limit.
      while (ageLimit - aged.game.core.player.startAgeMonths - aged.game.core.world.elapsedMonths > C.actionDurations.endLife) {
        const remaining = ageLimit - aged.game.core.player.startAgeMonths - aged.game.core.world.elapsedMonths;
        aged.doAction({ type: 'SOURCE', sourceId: 'work', count: Math.min(50, Math.floor((remaining - 1) / C.sources.work.months)) });
      }
      return [
        { action: { type: 'CHOOSE', choice: 'help' }, game: engine.newGame('破庙保存', 'milestone-opening') },
        { action: { type: 'EVENT', event: 'shen_return' }, game: storyStart },
        { action: { type: 'DECIDE', option: 'accept' }, game: structuredClone(story.game) },
        { action: { type: 'BREAKTHROUGH' }, game: structuredClone(route.checkpoints.qi) },
        { action: { type: 'START_TRIAL' }, game: trialStart },
        { action: { type: 'ANSWER_TRIAL', answer: 'accept' }, game: trialQuestion },
        { action: { type: 'END', ending: 'transmit' }, game: structuredClone(route.checkpoints.ending) },
        { action: { type: 'RETIRE' }, game: routes.driver().game },
        { action: { type: 'END_LIFE' }, game: structuredClone(aged.game) },
      ];
    };
    h.milestoneSamples = samples(h.routes, h.currentContent, h.engine);
    h.legacyMilestoneSamples = samples(h.legacyRuleRoutes, h.legacyRuleContent, h.legacyRuleEngine);
    h.milestoneMutation = (s: any, ownerId = 'milestone-page-a') => ({ commandId: crypto.randomUUID(), runId: s.state.core.runId,
      expectedRevision: s.state.core.revision, expectedActivityId: s.activity?.id ?? null, expectedActivityRevision: s.activity?.revision ?? null, ownerId });
    h.milestoneTick = (s: any) => ({ commandId: s.activity.nextCommand.commandId, runId: s.state.core.runId,
      expectedRevision: s.state.core.revision, activityId: s.activity.id, expectedActivityRevision: s.activity.revision,
      ownerId: s.activity.ownerId, generation: s.activity.generation });
    h.milestoneFixture = async (name: string, type: string, legacyRules = false) => {
      const sample = (legacyRules ? h.legacyMilestoneSamples : h.milestoneSamples).find((entry: any) => entry.action.type === type), repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(sample.game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot(), action: structuredClone(sample.action) };
    };
    h.milestonePlan = (action: any) => ({ kind: 'milestone', action: structuredClone(action), maxCycles: 1 });
  }, root);
}
