import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { setupMilestones } from './milestone-support';
const root = fileURLToPath(new URL('../../', import.meta.url));

export async function setupLaterMixed(page: Page) {
  await setupMilestones(page);
  await page.evaluate(async root => {
    const h = (globalThis as any).h;
    h.laterContent = await import(`/@fs${root}src/full/content.ts`);
    // Fixtures follow formal resource routes. Rule-time settlement proves repository boundaries, not growth pace.
    h.laterReadyBreakthrough = () => {
      const d = h.routes.driver('help'); d.realm(); d.craft('golden'); d.funds(400); d.meditate();
      return d;
    };
    h.laterOpen = async (name: string, game: any) => {
      const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
    h.laterStart = async (repo: any, plan: any) => repo.startActivity(plan, h.milestoneMutation(await repo.loadActivitySnapshot()));
    h.laterSettle = async (repo: any, started: any) => {
      const realNow = Date.now; Date.now = () => started.activity.dueAt;
      try { return await repo.settleActivity(h.milestoneTick(started)); }
      finally { Date.now = realNow; }
    };
    h.laterConfiguration = (snapshot: any, action: any) => ({ command: h.command(snapshot.state, action),
      expectedActivityId: snapshot.activity?.id ?? null, expectedActivityRevision: snapshot.activity?.revision ?? null });
    h.laterExercise = async (repo: any, plan: any) => {
      const snapshot = await repo.loadActivitySnapshot(), start = h.milestoneMutation(snapshot);
      const started = await repo.startActivity(plan, start), staleTick = h.milestoneTick(started);
      const pause = h.milestoneMutation(started), paused = await repo.pauseActivity(pause);
      const resume = h.milestoneMutation(paused), resumed = await repo.resumeActivity(resume), tick = h.milestoneTick(resumed);
      const expected = h.engine.resolve(resumed.state, resumed.activity.nextCommand), done = await h.laterSettle(repo, resumed);
      const unsettledTick = done.activity.status === 'running' ? h.milestoneTick(done) : null;
      const current = done.activity.status === 'running' ? await repo.pauseActivity(h.milestoneMutation(done)) : done;
      return { plan, snapshot, start, started, pause, paused, resume, resumed, tick, staleTick, unsettledTick, expected, done, current };
    };
    h.laterReplays = async (repo: any, entry: any) => [
      await repo.startActivity(entry.plan, entry.start), await repo.pauseActivity(entry.pause),
      await repo.resumeActivity(entry.resume), await repo.settleActivity(entry.tick),
    ];
    h.laterFight = async (repo: any) => {
      let count = 0, snapshot = await repo.loadActivitySnapshot();
      while (snapshot.state.battle && count++ < 120) {
        const game = snapshot.state, b = game.battle, p = game.core.player, stats = h.engine.stats(game);
        const move = p.hp < stats.maxHp * .5 && !h.engine.reason(game, { type: 'BATTLE', move: 'heal' }) ? 'heal' :
          b.round % 3 === 2 ? 'guard' : !h.engine.reason(game, { type: 'BATTLE', move: 'release' }) ? 'release' :
            !h.engine.reason(game, { type: 'BATTLE', move: 'technique' }) ? 'technique' : 'attack';
        snapshot = await h.finishAction(repo, { type: 'BATTLE', move });
      }
      if (snapshot.state.trial?.stage !== 4) throw new Error('lawful mixed trial did not reach the explicit ending decision');
      return snapshot;
    };
  }, root);
}

export function expectReplays(expect: any, replays: any[], latest: any, original: any) {
  for (const [index, replay] of replays.entries()) {
    expect(replay.replayed).toBe(true); expect(replay.state).toEqual(latest.state); expect(replay.activity).toEqual(latest.activity);
    expect(replay.result).toEqual(index === 3 ? original.done.result : null);
  }
}
