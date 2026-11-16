import type { Page } from '@playwright/test';
import { setupPersistence } from './support';

import {repositoryFsRoot as root} from './fs-root';

export interface IdleRouteOptions {
  choice: 'help' | 'trade' | 'leave';
  school: 'sword' | 'talisman';
  preparation: 'gather' | 'commission' | 'purchase';
  cultivation: 'natural' | 'assisted';
  answer: 'accept' | 'release';
  ending: 'transmit' | 'depart';
  advanced: boolean;
}

/** Real repository transactions with explicit virtual deadlines, not an online pacing test. */
export async function setupIdleProgression(page: Page) {
  await setupPersistence(page);
  await page.evaluate(async root => {
    const h = (globalThis as any).h;
    const scenarios = await import(`/@fs${root}scripts/economy/idle-scenarios.mjs`);
    const { canonicalFingerprint } = await import(`/@fs${root}src/full/receipts.ts`);
    const same = (actual: unknown, expected: unknown, message: string) => {
      if (canonicalFingerprint(actual) !== canonicalFingerprint(expected)) throw new Error(message);
    };
    const require = (value: unknown, message: string) => {
      if (!value) throw new Error(message);
    };
    h.runPersistedIdleScenario = async (options: IdleRouteOptions, caseId: string) => {
      const name = '放置路线', runId = 'idle-route-' + caseId;
      const expected = scenarios.runIdleScenario(options, { runId, name });
      require(expected.success, `pure route failed: ${caseId}: ${JSON.stringify(expected.failure)}`);
      require(expected.steps.length > 0, 'pure route has no authorized steps');
      const database = 'u8-b-idle-route-' + caseId, realNow = Date.now;
      let now = 1_700_000_000_000, repo = await h.FullSaveRepository.open(database);
      const earlyKinds = new Set<string>(), kinds = new Set<string>(), realms = new Set<string>();
      const receipts: any[] = [], arrangements: any[] = [], configurations: any[] = [];
      let cycles = 0, onlineMs = 0, earlyChecks = 0, lastPrevious: any = null;
      Date.now = () => now;
      try {
        same(await repo.loadActivitySnapshot(), { state: null, activity: null }, 'route must start with an empty repository');
        const created = await repo.create(name, { commandId: 'create-' + caseId, runId,
          expectedRunId: null, expectedRevision: 0 });
        const initial = h.engine.newGame(name, runId);
        same(created.state, initial, 'repository CREATE must produce the exact fresh Game');
        require(created.replayed === false, 'new life cannot replay another create');
        same(await repo.loadActivitySnapshot(), { state: initial, activity: null }, 'fresh Game must be persisted before the route');
        let current = await repo.loadActivitySnapshot();
        for (const [index, step] of expected.steps.entries()) {
          const label = `${caseId} step ${index} ${step.label}`;
          require(current.state !== null, label + ': missing persisted Game');
          realms.add(current.state.core.player.realm);
          require(current.activity?.status !== 'running', label + ': a later step cannot replace a running authorization');
          if (step.kind === 'configuration') {
            require(step.action !== null && step.plan === null, label + ': configuration requires only its selected action');
            require(step.onlineMs === 0 && step.cycleMs === 0 && step.cycles === 1,
              label + ': configuration is one immediate decision, not an online cycle');
            const command = { ...step.action, commandId: `configure-${caseId}-${index}`,
              runId, expectedRevision: current.state.core.revision };
            const intent = { command, expectedActivityId: current.activity?.id ?? null,
              expectedActivityRevision: current.activity?.revision ?? null };
            const formal = h.engine.resolve(current.state, command), before = current.state;
            const applied = await repo.configure(intent);
            require(applied.replayed === false, label + ': selected configuration must execute once');
            same(applied.state, formal.nextState, label + ': configuration Game differs from formal rule');
            same(applied.result, formal.result, label + ': configuration result differs from formal rule');
            same(await repo.loadPrevious(), before, label + ': configuration previous Game was not saved atomically');
            same(await repo.loadActivitySnapshot(), { state: applied.state, activity: applied.activity }, label + ': configuration snapshot differs from delivery');
            const replay = await repo.configure(intent);
            require(replay.replayed === true, label + ': configuration receipt cannot execute twice');
            same(replay.result, applied.result, label + ': configuration replay changed its result');
            same(await repo.loadActivitySnapshot(), { state: applied.state, activity: applied.activity }, label + ': configuration replay changed persisted Game or activity');
            configurations.push({ action: step.action, revision: applied.state.core.revision });
            lastPrevious = before; current = applied; continue;
          }
          require(step.kind === 'activity' && step.plan !== null && step.action === null, label + ': unknown route authorization');
          require(Number.isSafeInteger(step.cycles) && step.cycles > 0, label + ': activity must have actual finite cycles');
          const before = current.state, started = await repo.startActivity(step.plan, {
            commandId: `start-${caseId}-${index}`, runId, expectedRevision: before.core.revision,
            expectedActivityId: current.activity?.id ?? null,
            expectedActivityRevision: current.activity?.revision ?? null, ownerId: 'idle-route-owner-' + caseId,
          });
          require(started.replayed === false && started.result === null, label + ': arrangement is not a reward');
          same(started.state, before, label + ': arranging changed Game before a deadline');
          same(started.activity.plan, step.plan, label + ': saved authorization differs from the selected plan');
          same(await repo.loadActivitySnapshot(), { state: before, activity: started.activity }, label + ': arrangement must be persisted without rewards');
          current = started;
          let stepCycles = 0, stepOnlineMs = 0, firstTick: any = null, firstResult: any = null;
          const expectedHistory: any[] = [];
          while (current.activity.status === 'running') {
            require(stepCycles < step.cycles, label + ': repository scheduled an unauthorized extra cycle');
            const a = current.activity, prior = current.state;
            kinds.add(a.plan.kind); realms.add(prior.core.player.realm);
            require(a.nextCommand !== null && a.dueAt !== null, label + ': running cycle lacks a command or deadline');
            require(a.dueAt - a.startedAt === a.cycleMs, label + ': cycle is not a full declared period');
            const tick = { commandId: a.nextCommand.commandId, runId, expectedRevision: prior.core.revision,
              activityId: a.id, expectedActivityRevision: a.revision, ownerId: a.ownerId, generation: a.generation };
            const earlyKey = prior.core.player.realm + ':' + a.plan.kind;
            if (!earlyKinds.has(earlyKey)) {
              now = a.dueAt - 1;
              const early = await h.attempt(() => repo.settleActivity(tick));
              require(early.ok === false && early.code === 'ACTIVITY_NOT_DUE', label + ': a deadline has been bypassed');
              same(await repo.loadActivitySnapshot(), { state: prior, activity: a }, label + ': early rejection changed saved progress');
              earlyKinds.add(earlyKey); earlyChecks++;
            }
            const formal = h.engine.resolve(prior, a.nextCommand);
            now = a.dueAt;
            const applied = await repo.settleActivity(tick);
            require(applied.replayed === false, label + ': a new cycle cannot use an old reward');
            same(applied.state, formal.nextState, label + ': saved cycle Game differs from formal command');
            same(applied.result, formal.result, label + ': saved cycle result differs from formal command');
            require(applied.activity.completedCycles === a.completedCycles + 1, label + ': cycle count skipped or duplicated');
            same(await repo.loadPrevious(), prior, label + ': previous Game was not saved with the cycle');
            same(await repo.loadActivitySnapshot(), { state: applied.state, activity: applied.activity }, label + ': persisted cycle differs from its delivery');
            if (!firstTick) { firstTick = tick; firstResult = applied.result; }
            expectedHistory.push({ command: a.nextCommand, result: applied.result, activity: applied.activity });
            lastPrevious = prior; current = applied; stepCycles++; cycles++;
            stepOnlineMs += a.cycleMs; onlineMs += a.cycleMs;
          }
          require(current.activity.status === 'stopped', label + ': route left an unresolved paused activity');
          require(stepCycles === step.cycles && current.activity.completedCycles === step.cycles, label + ': completed count differs from the pure activity route');
          require(stepOnlineMs === step.onlineMs, label + ': online period sum differs from the pure activity route');
          if (step.plan.kind === 'battle') {
            require(before.trial?.stage === step.plan.trialStage, label + ': battle authorization belongs to another trial gate');
            if (current.activity.stopReason.code === 'ACTIVITY_BUDGET') {
              require(current.state.trial?.stage === step.plan.trialStage && current.state.battle !== null && current.activity.victories === 0,
                label + ': exhausted finite authorization must retain the current battle without a victory');
            } else {
              require(current.state.trial?.stage === step.plan.trialStage + 1 && current.activity.victories === 1,
                label + ': the selected gate must complete once before the next gate authorization');
              require(current.activity.stopReason.code === (step.plan.trialStage === 3 ? 'WAITING_DECISION' : 'STAGE_COMPLETE'),
                label + ': victory silently continued into another gate or ending');
            }
            require(current.activity.gainedStones === 0 && current.activity.gainedXp === 0,
              label + ': trial victory granted ordinary battle currency or XP');
            same(current.activity.gainedItems, {}, label + ': trial victory granted ordinary battle loot');
          }
          const history: any[] = [];
          let page = 0, total = -1, pages = 1;
          do {
            const result = await repo.loadActivityHistory(current.activity.id, page, 20);
            require(result.page === page, label + ': history returned another page');
            require(total === -1 || total === result.total, label + ': history changed while readonly');
            total = result.total; pages = result.pages; history.push(...result.rows); page++;
          } while (page < pages);
          same(history, expectedHistory, label + ': persisted per-command receipts are incomplete or changed');
          require(total === stepCycles, label + ': receipt count differs from actual cycles');
          const beforeReplay = await repo.loadActivitySnapshot(), replay = await repo.settleActivity(firstTick);
          require(replay.replayed === true, label + ': old cycle receipt did not replay');
          same(replay.result, firstResult, label + ': replay lost its original cycle result');
          same(await repo.loadActivitySnapshot(), beforeReplay, label + ': old cycle replay duplicated a later reward');
          receipts.push({ activityId: current.activity.id, cycles: total, replayed: true });
          arrangements.push({ kind: step.plan.kind, activityId: current.activity.id,
            actionType: step.plan.kind === 'milestone' ? step.plan.action.type : null,
            trialStage: step.plan.kind === 'battle' ? step.plan.trialStage : null,
            cycles: stepCycles, onlineMs: stepOnlineMs, stopReason: current.activity.stopReason.code });
        }
        same(current.state, expected.game, caseId + ': full persisted Game differs from the pure normal route');
        require(onlineMs === expected.onlineMs, caseId + ': full period sum differs from pure route');
        require(current.state.status === 'ascended' && current.activity.status === 'stopped', caseId + ': route did not explicitly seal this life');
        const beforeReopen = await repo.loadActivitySnapshot();
        repo.close(); now += 86_400_000;
        repo = await h.FullSaveRepository.open(database);
        const reopened = await repo.loadActivitySnapshot();
        same(reopened, beforeReopen, caseId + ': reopening granted offline progress or replaced the sealed life');
        same(await repo.loadPrevious(), lastPrevious, caseId + ': reopening changed the final previous Game');
        return { initial, game: reopened.state, expectedGame: expected.game, activity: reopened.activity,
          steps: expected.steps.length, arrangements, configurations, cycles, receipts,
          onlineMs, expectedOnlineMs: expected.onlineMs, earlyChecks, earlyKinds: [...earlyKinds], kinds: [...kinds], realms: [...realms],
          limitation: 'Virtual repository deadlines prove the rule/storage route, not real online pacing or human acceptance.' };
      } finally { Date.now = realNow; repo.close(); }
    };
  }, root);
}
