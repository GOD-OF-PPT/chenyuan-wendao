import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

import {repositoryFsRoot as root} from './fs-root';
test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(async root => {
    const h = (globalThis as any).h, C = await import(`/@fs${root}src/full/content.ts`);
    h.mixedPlan = (kind: string) => {
      if (kind === 'cultivation') return { kind, method: 'natural', maxCycles: 3, until: 'cycles', stoneBudget: 0, stoneReserve: 0 };
      if (kind === 'source') return { kind, sourceId: 'herbs', maxCycles: 3, until: 'cycles', target: null, monthBudget: 3, remainingMonthsReserve: 1 };
      const entry = kind === 'craft' ? C.recipes.healing : C.relics.frost_sword, count = kind === 'craft' ? 3 : 1;
      return { kind, ...(kind === 'craft' ? { recipeId: 'healing', maxCycles: count, until: 'cycles', targetQuantity: null } : { relicId: 'frost_sword', maxCycles: 1 }),
        stoneBudget: entry.stones * count, stoneReserve: 0, monthBudget: (kind === 'craft' ? C.recipes.healing.months : C.actionDurations.forge) * count,
        remainingMonthsReserve: 1, itemReserves: {} };
    };
    h.mixedMutation = (snapshot: any) => ({ commandId: crypto.randomUUID(), runId: snapshot.state.core.runId,
      expectedRevision: snapshot.state.core.revision, expectedActivityId: snapshot.activity?.id ?? null,
      expectedActivityRevision: snapshot.activity?.revision ?? null, ownerId: 'mixed-page-a' });
    h.mixedTick = (snapshot: any) => ({ commandId: snapshot.activity.nextCommand.commandId,
      runId: snapshot.state.core.runId, expectedRevision: snapshot.state.core.revision, activityId: snapshot.activity.id,
      expectedActivityRevision: snapshot.activity.revision, ownerId: snapshot.activity.ownerId, generation: snapshot.activity.generation });
    h.mixedFixture = async (name: string) => {
      // All setup resources are obtained by the real engine's lawful route. This is a repository boundary test, not a new-player pace claim.
      const d = h.routes.driver();
      while (C.rank(d.game.core.player.realm) < C.rank('golden')) d.realm();
      d.resource('herb', 20); d.resource('jade', 8); d.resource('core', 4); d.funds(500); d.go('cave');
      const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(d.game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
  }, root);
});

for (const [firstKind, secondKind] of [['cultivation', 'craft'], ['craft', 'forge']]) {
  test(`${firstKind} to ${secondKind}: old start, pause and cycle receipts observe the new plan without restoring or settling the old one`, async ({ page }) => {
    const r = await page.evaluate(async ({ firstKind, secondKind }) => {
      const h = (globalThis as any).h, name = `mixed-${firstKind}-${secondKind}`, { repo, snapshot } = await h.mixedFixture(name);
      const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
      try {
        const planA = h.mixedPlan(firstKind), startA = h.mixedMutation(snapshot), a0 = await repo.startActivity(planA, startA);
        const tickA = h.mixedTick(a0), expectedA = h.engine.resolve(snapshot.state, a0.activity.nextCommand);
        now = a0.activity.dueAt; const a1 = await repo.settleActivity(tickA), unsettledA = h.mixedTick(a1);
        const pauseA = h.mixedMutation(a1), pausedA = await repo.pauseActivity(pauseA);
        const b0 = await repo.startActivity(h.mixedPlan(secondKind), h.mixedMutation(pausedA));
        const beforeReplays = await h.inspect(name), previousBefore = await repo.loadPrevious();
        const replayBefore = [await repo.startActivity(planA, startA), await repo.pauseActivity(pauseA), await repo.settleActivity(tickA)];
        const staleBefore = await h.attempt(() => repo.settleActivity(unsettledA)), afterReplays = await h.inspect(name);
        const tickB = h.mixedTick(b0), expectedB = h.engine.resolve(b0.state, b0.activity.nextCommand);
        now = b0.activity.dueAt; const b1 = await repo.settleActivity(tickB);
        const beforeLater = await h.inspect(name), replayAfter = [await repo.startActivity(planA, startA), await repo.pauseActivity(pauseA), await repo.settleActivity(tickA)];
        const staleAfter = await h.attempt(() => repo.settleActivity(unsettledA));
        return { firstKind, secondKind, snapshot, expectedA, a1, pausedA, b0, b1, expectedB, beforeReplays, afterReplays,
          previousBefore, replayBefore, replayAfter, staleBefore, staleAfter, beforeLater, afterLater: await h.inspect(name),
          previousAfter: await repo.loadPrevious(), persisted: await repo.loadActivitySnapshot(), archives: await repo.archives() };
      } finally { Date.now = realNow; repo.close(); }
    }, { firstKind, secondKind });
    expect(r.a1.state).toEqual(r.expectedA.nextState); expect(r.a1.result).toEqual(r.expectedA.result);
    expect(r.pausedA.activity.status).toBe('paused'); expect(r.pausedA.activity.completedCycles).toBe(1);
    expect(r.b0.state).toEqual(r.pausedA.state); expect(r.b0.state.core.revision).toBe(r.a1.state.core.revision);
    expect(r.b0.activity.id).not.toBe(r.pausedA.activity.id); expect(r.b0.activity.plan.kind).toBe(secondKind);
    expect(r.b0.activity.completedCycles).toBe(0); expect(r.b0.activity.spentStones).toBe(0);
    for (const [index, replay] of r.replayBefore.entries()) {
      expect(replay.replayed).toBe(true); expect(replay.state).toEqual(r.b0.state); expect(replay.activity).toEqual(r.b0.activity);
      expect(replay.result).toEqual(index === 2 ? r.a1.result : null);
    }
    expect(r.staleBefore.code).toBe('ACTIVITY_STALE'); expect(r.afterReplays).toEqual(r.beforeReplays);
    expect(r.previousBefore).toEqual(r.snapshot.state);
    expect(r.b1.state).toEqual(r.expectedB.nextState); expect(r.b1.result).toEqual(r.expectedB.result);
    expect(r.b1.activity.completedCycles).toBe(1); expect(r.previousAfter).toEqual(r.b0.state);
    for (const [index, replay] of r.replayAfter.entries()) {
      expect(replay.replayed).toBe(true); expect(replay.state).toEqual(r.b1.state); expect(replay.activity).toEqual(r.b1.activity);
      expect(replay.result).toEqual(index === 2 ? r.a1.result : null);
    }
    expect(r.staleAfter.code).toBe('STALE_REVISION'); expect(r.afterLater).toEqual(r.beforeLater);
    expect(r.persisted).toEqual({ state: r.b1.state, activity: r.b1.activity });
    expect(r.archives.some((row: any) => row.value?.id === r.pausedA.activity.id && JSON.stringify(row.value) === JSON.stringify(r.pausedA.activity))).toBe(true);
  });
}

test('a single completed forge stays finite while its earlier controls and completion replay over a new cultivation plan', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'mixed-forge-cultivation', { repo, snapshot } = await h.mixedFixture(name);
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const planA = h.mixedPlan('forge'), startA = h.mixedMutation(snapshot), a0 = await repo.startActivity(planA, startA), neverCompleted = h.mixedTick(a0);
      // A forge ends after one completion, so exercise its real pause before that completion instead of inventing a second forge cycle.
      const pauseA = h.mixedMutation(a0), pausedA = await repo.pauseActivity(pauseA);
      const resumeA = h.mixedMutation(pausedA), resumedA = await repo.resumeActivity(resumeA), tickA = h.mixedTick(resumedA);
      now = resumedA.activity.dueAt; const a1 = await repo.settleActivity(tickA);
      const b0 = await repo.startActivity(h.mixedPlan('cultivation'), h.mixedMutation(a1)), expectedB = h.engine.resolve(b0.state, b0.activity.nextCommand);
      const before = await h.inspect(name), replays = [await repo.startActivity(planA, startA), await repo.pauseActivity(pauseA), await repo.resumeActivity(resumeA), await repo.settleActivity(tickA)];
      const stale = await h.attempt(() => repo.settleActivity(neverCompleted)), after = await h.inspect(name);
      now = b0.activity.dueAt; const b1 = await repo.settleActivity(h.mixedTick(b0)), laterBefore = await h.inspect(name);
      const later = await repo.settleActivity(tickA);
      return { snapshot, a1, b0, b1, expectedB, before, replays, stale, after, laterBefore, later, laterAfter: await h.inspect(name), archives: await repo.archives() };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.a1.activity.status).toBe('stopped'); expect(r.a1.activity.completedCycles).toBe(1);
  expect(r.a1.activity.forgedRelics).toEqual(['frost_sword']); expect(r.a1.state.loadout).toEqual(r.snapshot.state.loadout);
  expect(r.b0.state).toEqual(r.a1.state); expect(r.b0.activity.plan.kind).toBe('cultivation'); expect(r.b0.activity.completedCycles).toBe(0);
  for (const [index, replay] of r.replays.entries()) {
    expect(replay.replayed).toBe(true); expect(replay.state).toEqual(r.b0.state); expect(replay.activity).toEqual(r.b0.activity);
    expect(replay.result).toEqual(index === 3 ? r.a1.result : null);
  }
  expect(r.stale.code).toBe('STALE_REVISION'); expect(r.after).toEqual(r.before);
  expect(r.b1.state).toEqual(r.expectedB.nextState); expect(r.b1.result).toEqual(r.expectedB.result);
  expect(r.later.replayed).toBe(true); expect(r.later.state).toEqual(r.b1.state); expect(r.later.activity).toEqual(r.b1.activity);
  expect(r.later.result).toEqual(r.a1.result); expect(r.laterAfter).toEqual(r.laterBefore);
  expect(r.archives.some((row: any) => row.value?.id === r.a1.activity.id && JSON.stringify(row.value) === JSON.stringify(r.a1.activity))).toBe(true);
});

test('source and furnace swaps use formal travel, invalidate the paused plans and preserve old receipts over both adapters', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'mixed-source-craft-source', { repo, snapshot } = await h.mixedFixture(name);
    const realNow = Date.now; let now = 1_700_000_000_000; Date.now = () => now;
    try {
      const outward = await h.finishAction(repo, { type: 'TRAVEL', location: 'wilderness' });
      const planA = h.mixedPlan('source'), startA = h.mixedMutation(await repo.loadActivitySnapshot()), a0 = await repo.startActivity(planA, startA), tickA = h.mixedTick(a0);
      now = a0.activity.dueAt; const a1 = await repo.settleActivity(tickA), unsettledA = h.mixedTick(a1);
      const pauseA = h.mixedMutation(a1), pausedA = await repo.pauseActivity(pauseA);
      const travelInCommand = { type: 'TRAVEL', location: 'cave' }, travelIn = await h.finishAction(repo, travelInCommand), stoppedA = await repo.loadActivitySnapshot();
      const planB = h.mixedPlan('craft'), startB = h.mixedMutation(stoppedA), b0 = await repo.startActivity(planB, startB), tickB = h.mixedTick(b0);
      const beforeAReplays = await h.inspect(name), replayA = [await repo.startActivity(planA, startA), await repo.pauseActivity(pauseA), await repo.settleActivity(tickA)];
      const staleA = await h.attempt(() => repo.settleActivity(unsettledA)), afterAReplays = await h.inspect(name);
      now = b0.activity.dueAt; const b1 = await repo.settleActivity(tickB), unsettledB = h.mixedTick(b1);
      const pauseB = h.mixedMutation(b1), pausedB = await repo.pauseActivity(pauseB);
      const travelOutCommand = { type: 'TRAVEL', location: 'wilderness' }, travelOut = await h.finishAction(repo, travelOutCommand), stoppedB = await repo.loadActivitySnapshot();
      const c0 = await repo.startActivity(h.mixedPlan('source'), h.mixedMutation(stoppedB)), beforeBReplays = await h.inspect(name);
      const replayB = [await repo.startActivity(planB, startB), await repo.pauseActivity(pauseB), await repo.settleActivity(tickB)];
      const staleB = await h.attempt(() => repo.settleActivity(unsettledB));
      return { snapshot, outward, a0, a1, pausedA, stoppedA, travelInCommand, travelIn, b0, b1, pausedB, stoppedB, travelOutCommand, travelOut, c0,
        replayA, staleA, beforeAReplays, afterAReplays, replayB, staleB, beforeBReplays, afterBReplays: await h.inspect(name),
        persisted: await repo.loadActivitySnapshot(), archives: await repo.archives() };
    } finally { Date.now = realNow; repo.close(); }
  });
  expect(r.outward.state.core.world.location).toBe('wilderness'); expect(r.a0.state).toEqual(r.outward.state);
  expect(r.a1.activity.gainedItems).toEqual({ herb: 2 }); expect(r.a1.activity.completedCycles).toBe(1);
  for (const [stopped, traveled, beforeTravel] of [[r.stoppedA, r.travelIn, r.a1], [r.stoppedB, r.travelOut, r.b1]]) {
    expect(stopped.state).toEqual(traveled.state); expect(stopped.activity.status).toBe('stopped'); expect(stopped.activity.plan.kind).toBe('travel'); expect(stopped.activity.stopReason.code).toBe('CYCLES_COMPLETE');
    expect(traveled.state.core.player).toEqual(beforeTravel.state.core.player); expect(traveled.state.core.inventory).toEqual(beforeTravel.state.core.inventory);
    expect(traveled.state.core.world.elapsedMonths).toBe(beforeTravel.state.core.world.elapsedMonths);
    expect(traveled.state.core.revision).toBe(beforeTravel.state.core.revision + 1);
  }
  expect(r.travelIn.state.core.world.location).toBe('cave'); expect(r.travelOut.state.core.world.location).toBe('wilderness');
  expect(r.b0.state).toEqual(r.travelIn.state); expect(r.c0.state).toEqual(r.travelOut.state);
  for (const [replays, current, historical] of [[r.replayA, r.b0, r.a1], [r.replayB, r.c0, r.b1]]) {
    for (const [index, replay] of replays.entries()) {
      expect(replay.replayed).toBe(true); expect(replay.state).toEqual(current.state); expect(replay.activity).toEqual(current.activity);
      expect(replay.result).toEqual(index === 2 ? historical.result : null);
    }
  }
  expect(r.staleA.code).toBe('STALE_REVISION'); expect(r.staleB.code).toBe('STALE_REVISION');
  expect(r.afterAReplays).toEqual(r.beforeAReplays); expect(r.afterBReplays).toEqual(r.beforeBReplays);
  expect(r.persisted).toEqual({ state: r.c0.state, activity: r.c0.activity }); expect(r.c0.activity.completedCycles).toBe(0);
  for (const old of [r.stoppedA.activity, r.stoppedB.activity]) expect(r.archives.some((row: any) => JSON.stringify(row.value) === JSON.stringify(old))).toBe(true);
  for (const old of [r.pausedA.activity, r.pausedB.activity]) expect(r.archives.find((row: any) => row.value?.id === old.id)?.value).toEqual(old);
});
