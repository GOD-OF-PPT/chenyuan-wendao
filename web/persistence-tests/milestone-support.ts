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
    const C = await import(`/@fs${root}src/full/content.ts`);
    const route = h.routes.fullRoute('help'), story = h.routes.driver('help'); story.realm(); story.go('sect');
    const storyStart = structuredClone(story.game); story.doAction({ type: 'EVENT', event: 'shen_return' });
    const trialStart = structuredClone(route.checkpoints.trial);
    const trialQuestion = h.engine.advance(trialStart, h.command(trialStart, { type: 'START_TRIAL' }));
    const aged = h.routes.driver(); aged.go('sect');
    const ageLimit = C.realms[aged.game.core.player.realm].lifespanMonths;
    while (aged.game.core.player.startAgeMonths + aged.game.core.world.elapsedMonths < ageLimit - 1) {
      aged.doAction({ type: 'SOURCE', sourceId: 'work', count: Math.min(50, ageLimit - 1 - aged.game.core.player.startAgeMonths - aged.game.core.world.elapsedMonths) });
    }
    h.milestoneSamples = [
      { action: { type: 'CHOOSE', choice: 'help' }, game: h.engine.newGame('破庙保存', 'milestone-opening') },
      { action: { type: 'EVENT', event: 'shen_return' }, game: storyStart },
      { action: { type: 'DECIDE', option: 'accept' }, game: structuredClone(story.game) },
      { action: { type: 'BREAKTHROUGH' }, game: structuredClone(route.checkpoints.qi) },
      { action: { type: 'START_TRIAL' }, game: trialStart },
      { action: { type: 'ANSWER_TRIAL', answer: 'accept' }, game: trialQuestion },
      { action: { type: 'END', ending: 'transmit' }, game: structuredClone(route.checkpoints.ending) },
      { action: { type: 'RETIRE' }, game: h.routes.driver().game },
      { action: { type: 'END_LIFE' }, game: structuredClone(aged.game) },
    ];
    h.milestoneMutation = (s: any, ownerId = 'milestone-page-a') => ({ commandId: crypto.randomUUID(), runId: s.state.core.runId,
      expectedRevision: s.state.core.revision, expectedActivityId: s.activity?.id ?? null, expectedActivityRevision: s.activity?.revision ?? null, ownerId });
    h.milestoneTick = (s: any) => ({ commandId: s.activity.nextCommand.commandId, runId: s.state.core.runId,
      expectedRevision: s.state.core.revision, activityId: s.activity.id, expectedActivityRevision: s.activity.revision,
      ownerId: s.activity.ownerId, generation: s.activity.generation });
    h.milestoneFixture = async (name: string, type: string) => {
      const sample = h.milestoneSamples.find((entry: any) => entry.action.type === type), repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(sample.game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot(), action: structuredClone(sample.action) };
    };
    h.milestonePlan = (action: any) => ({ kind: 'milestone', action: structuredClone(action), maxCycles: 1 });
  }, root);
}
