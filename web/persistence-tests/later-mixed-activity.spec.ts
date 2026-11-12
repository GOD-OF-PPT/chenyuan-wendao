import { test, expect } from '@playwright/test';
import { setupLaterMixed, expectReplays } from './later-mixed-support';

test.beforeEach(async ({ page }) => setupLaterMixed(page));

test('exact pre-review v6 completion activities and proof receipts remain readable without rewriting original records', async ({ page }) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h, rows = [];
    for (const kind of ['travel', 'encounter', 'battle']) {
      const d = h.legacyRuleRoutes.driver('help');
      if (kind !== 'travel') d.go('wilderness');
      if (kind === 'battle') d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
      const name = 'later-mixed-legacy-completion-' + kind, { repo } = await h.laterOpen(name, d.game);
      try {
        const game = (await repo.loadActivitySnapshot()).state;
        const plan = kind === 'travel' ? { kind, location: 'wilderness', maxCycles: 1 } : kind === 'encounter' ?
          { ...h.adventure.defaultEncounterPlan(game, 'wolf'), maxCycles: 1 } : h.adventure.singleBattlePlan(game, 'attack');
        const started = await h.laterStart(repo, plan), tick = h.milestoneTick(started), done = await h.laterSettle(repo, started);
        const key = tick.runId + ':' + tick.commandId, raw = await h.inspect(name);
        const receipt = structuredClone(raw[h.FULL_RECEIPT_STORE].find((r: any) => r.key === key).value), activity = structuredClone(done.activity);
        // Before CHECK-IDLE-02 these three plans saved this exact reason; all command/proof/Game bytes are unchanged.
        activity.stopReason.message = '已完成本段授权动作数，不再自动出招'; receipt.activity = structuredClone(activity);
        await h.put(name, h.FULL_STATE_STORE, 'activity', activity); await h.put(name, h.FULL_RECEIPT_STORE, key, receipt);
        const before = await h.inspect(name), snapshot = await repo.loadActivitySnapshot();
        const replay = await h.attempt(() => repo.settleActivity(tick)), history = await h.attempt(() => repo.loadActivityHistory(activity.id, 0, 1));
        const after = await h.inspect(name), forged = structuredClone(receipt); forged.proof.activityBefore.ownerId = 'forged-owner';
        await h.put(name, h.FULL_RECEIPT_STORE, key, forged);
        const rejected = await h.attempt(() => repo.settleActivity(tick));
        rows.push({ kind, done, activity, before, snapshot, replay, history, after, rejected });
      } finally { repo.close(); }
    }
    return rows;
  });
  for (const row of rows) {
    expect(row.snapshot.state.core.contentVersion).toBe('full-demo.3'); expect(row.activity).not.toHaveProperty('rulesVersion'); expect(row.snapshot).toEqual({ state: row.done.state, activity: row.activity }); expect(row.replay.ok).toBe(true);
    expect(row.replay.value.replayed).toBe(true); expect(row.replay.value.state).toEqual(row.done.state); expect(row.replay.value.activity).toEqual(row.activity);
    expect(row.replay.value.result).toEqual(row.done.result); expect(row.history.ok).toBe(true); expect(row.history.value.total).toBe(1);
    expect(row.history.value.rows[0].activity).toEqual(row.activity); expect(row.after).toEqual(row.before); expect(row.rejected.code).toBe('RECEIPT_INVALID');
  }
});

test('v5 learning and v6 battle controls and configuration history replay across a separately confirmed v7 breakthrough', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'later-mixed-breakthrough', d = h.laterReadyBreakthrough(); d.go('sect');
    const { repo, snapshot } = await h.laterOpen(name, d.game);
    try {
      const learning = await h.laterExercise(repo, { kind: 'learn', skills: ['sword_still', 'sword_guard'], maxCycles: 2,
        stoneBudget: 180, stoneReserve: 0 });
      const config = h.laterConfiguration(learning.current, { type: 'EQUIP', skill: 'sword_still' }), configured = await repo.configure(config);
      await h.finishAction(repo, { type: 'TRAVEL', location: 'wilderness' }); await h.finishAction(repo, { type: 'ENCOUNTER', enemy: 'wolf' });
      const battle = await h.laterExercise(repo, h.adventure.singleBattlePlan((await repo.loadActivitySnapshot()).state, 'attack'));
      await h.finishAction(repo, { type: 'BATTLE', move: 'flee' });
      const prepared = await repo.loadActivitySnapshot(), breakthrough = await h.finishAction(repo, { type: 'BREAKTHROUGH' });
      const before = await h.inspect(name), learningReplays = await h.laterReplays(repo, learning), battleReplays = await h.laterReplays(repo, battle);
      const configurationReplay = await repo.configure(config), stale = await h.attempt(() => repo.settleActivity(learning.unsettledTick));
      const histories = [await repo.loadActivityHistory(learning.done.activity.id, 0, 1), await repo.loadActivityHistory(battle.done.activity.id, 0, 1)];
      return { snapshot, learning, configured, battle, prepared, breakthrough, before, learningReplays, battleReplays,
        configurationReplay, stale, histories, checkpoint: await repo.loadCheckpoint(), after: await h.inspect(name), persisted: await repo.loadActivitySnapshot() };
    } finally { repo.close(); }
  });
  expect(r.learning.done.state).toEqual(r.learning.expected.nextState); expect(r.learning.done.activity.spentStones).toBe(100);
  expect(r.learning.current.activity.status).toBe('paused'); expect(r.configured.activity.stopReason.code).toBe('STATE_CHANGED');
  expect(r.configured.state.loadout.mind).toBe('sword_still'); expect(r.battle.done.state).toEqual(r.battle.expected.nextState);
  expect(r.breakthrough.state.core.player.realm).toBe('golden'); expect(r.breakthrough.activity.status).toBe('stopped');
  expect(r.checkpoint.snapshot).toEqual(r.prepared.state); expect(r.breakthrough.state.core.inventory.golden_pill).toBe(r.prepared.state.core.inventory.golden_pill - 1);
  expectReplays(expect, r.learningReplays, r.breakthrough, r.learning); expectReplays(expect, r.battleReplays, r.breakthrough, r.battle);
  expect(r.configurationReplay.replayed).toBe(true); expect(r.configurationReplay.state).toEqual(r.breakthrough.state);
  expect(r.configurationReplay.activity).toEqual(r.breakthrough.activity); expect(r.configurationReplay.result).toEqual(r.configured.result);
  expect(r.stale.code).toBe('STALE_REVISION'); expect(r.after).toEqual(r.before); expect(r.persisted).toEqual({ state: r.breakthrough.state, activity: r.breakthrough.activity });
  for (const [index, original] of [r.learning, r.battle].entries()) {
    expect(r.histories[index].total).toBe(1); expect(r.histories[index].rows[0].result).toEqual(original.done.result);
    expect(r.histories[index].rows[0].activity).toEqual(original.done.activity);
  }
});

test('v5 sale and v6 round history plus v7 question controls survive explicit trial gates and the chosen ascension ending', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'later-mixed-ascension', game = h.milestoneSamples.find((s: any) => s.action.type === 'START_TRIAL').game;
    const { repo } = await h.laterOpen(name, game);
    try {
      await h.finishAction(repo, { type: 'TRAVEL', location: 'market' });
      const sale = await h.laterExercise(repo, { kind: 'sell', item: 'healing_pill', maxCycles: 2, itemReserve: 10 });
      const firstConfig = h.laterConfiguration(sale.current, { type: 'SCHOOL', school: 'talisman' }), firstConfigured = await repo.configure(firstConfig);
      const secondConfig = h.laterConfiguration(firstConfigured, { type: 'SCHOOL', school: 'sword' }), secondConfigured = await repo.configure(secondConfig);
      await h.finishAction(repo, { type: 'TRAVEL', location: 'terrace' }); await h.finishAction(repo, { type: 'START_TRIAL' });
      const question = await h.laterExercise(repo, h.milestonePlan({ type: 'ANSWER_TRIAL', answer: 'accept' }));
      const battle = await h.laterExercise(repo, h.adventure.singleBattlePlan(question.done.state, 'attack'));
      const endingDecision = await h.laterFight(repo), ended = await h.finishAction(repo, { type: 'END', ending: 'transmit' });
      const before = await h.inspect(name), saleReplays = await h.laterReplays(repo, sale), battleReplays = await h.laterReplays(repo, battle), questionReplays = await h.laterReplays(repo, question);
      const configurationReplays = [await repo.configure(firstConfig), await repo.configure(secondConfig)];
      const histories = [await repo.loadActivityHistory(sale.done.activity.id, 0, 1), await repo.loadActivityHistory(battle.done.activity.id, 0, 1), await repo.loadActivityHistory(question.done.activity.id, 0, 1)];
      const newAction = await h.attempt(() => h.laterStart(repo, { kind: 'travel', location: 'cave', maxCycles: 1 }));
      return { sale, firstConfigured, secondConfigured, question, battle, endingDecision, ended, before, saleReplays, battleReplays,
        questionReplays, configurationReplays, histories, newAction, after: await h.inspect(name), persisted: await repo.loadActivitySnapshot() };
    } finally { repo.close(); }
  });
  expect(r.sale.done.activity.spentItems).toEqual({ healing_pill: 1 }); expect(r.sale.done.activity.gainedStones).toBeGreaterThan(0);
  expect(r.question.done.state.trial).toEqual({ stage: 1, answer: 'accept' }); expect(r.question.done.activity.status).toBe('stopped');
  expect(r.endingDecision.state.trial.stage).toBe(4); expect(r.endingDecision.state.battle).toBeNull();
  expect(r.ended.state.status).toBe('ascended'); expect(r.ended.state.ending).toBe('transmit'); expect(r.ended.activity.nextCommand).toBeNull();
  expectReplays(expect, r.saleReplays, r.ended, r.sale); expectReplays(expect, r.battleReplays, r.ended, r.battle); expectReplays(expect, r.questionReplays, r.ended, r.question);
  for (const [index, replay] of r.configurationReplays.entries()) {
    expect(replay.replayed).toBe(true); expect(replay.state).toEqual(r.ended.state); expect(replay.activity).toEqual(r.ended.activity);
    expect(replay.result).toEqual([r.firstConfigured, r.secondConfigured][index].result);
  }
  for (const [index, original] of [r.sale, r.battle, r.question].entries()) {
    expect(r.histories[index].total).toBe(1); expect(r.histories[index].rows[0].result).toEqual(original.done.result);
  }
  expect(r.newAction.ok).toBe(false); expect(r.after).toEqual(r.before); expect(r.persisted).toEqual({ state: r.ended.state, activity: r.ended.activity });
});

test('same-revision v5 to v6 to v7 replacements fence configuration CAS and a newly confirmed breakthrough checkpoints the new loadout', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'later-mixed-configuration-cas', d = h.laterReadyBreakthrough();
    d.go('wilderness'); d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' }); d.doAction({ type: 'BATTLE', move: 'flee' });
    const { repo, snapshot } = await h.laterOpen(name, d.game);
    try {
      const rest = await h.laterStart(repo, { kind: 'rest', maxCycles: 1, remainingMonthsReserve: 1 }), restTick = h.milestoneTick(rest);
      const restPaused = await repo.pauseActivity(h.milestoneMutation(rest));
      const oldConfig = h.laterConfiguration(restPaused, { type: 'SCHOOL', school: 'talisman' });
      const travel = await h.laterStart(repo, { kind: 'travel', location: 'wilderness', maxCycles: 1 }), travelTick = h.milestoneTick(travel);
      const travelPaused = await repo.pauseActivity(h.milestoneMutation(travel)), middleConfig = h.laterConfiguration(travelPaused, { type: 'SCHOOL', school: 'talisman' });
      const beforeFirst = await h.inspect(name), firstRejected = await h.attempt(() => repo.configure(oldConfig)), afterFirst = await h.inspect(name);
      const finitePlan = h.milestonePlan({ type: 'BREAKTHROUGH' }), finiteStart = h.milestoneMutation(travelPaused);
      const finite = await repo.startActivity(finitePlan, finiteStart), finiteTick = h.milestoneTick(finite);
      const finitePaused = await repo.pauseActivity(h.milestoneMutation(finite)), oldResume = h.milestoneMutation(finitePaused);
      const beforeSecond = await h.inspect(name), secondRejected = await h.attempt(() => repo.configure(middleConfig)), afterSecond = await h.inspect(name);
      const config = h.laterConfiguration(finitePaused, { type: 'SCHOOL', school: 'talisman' }), configured = await repo.configure(config);
      const beforeStale = await h.inspect(name), stale = [];
      for (const tick of [restTick, travelTick, finiteTick]) stale.push(await h.attempt(() => repo.settleActivity(tick)));
      stale.push(await h.attempt(() => repo.resumeActivity(oldResume)));
      const stoppedResume = await h.attempt(() => repo.resumeActivity(h.milestoneMutation(configured))), afterStale = await h.inspect(name);
      const fresh = await h.laterStart(repo, h.milestonePlan({ type: 'BREAKTHROUGH' })), expected = h.engine.resolve(fresh.state, fresh.activity.nextCommand);
      const done = await h.laterSettle(repo, fresh), checkpoint = await repo.loadCheckpoint();
      const beforeReplay = await h.inspect(name), oldStart = await repo.startActivity(finitePlan, finiteStart);
      return { snapshot, restPaused, travelPaused, finitePaused, beforeFirst, firstRejected, afterFirst, beforeSecond, secondRejected, afterSecond,
        configured, beforeStale, stale, stoppedResume, afterStale, fresh, expected, done, checkpoint, beforeReplay, oldStart, afterReplay: await h.inspect(name) };
    } finally { repo.close(); }
  });
  for (const entry of [r.restPaused, r.travelPaused, r.finitePaused]) expect(entry.state).toEqual(r.snapshot.state);
  expect(r.firstRejected.code).toBe('ACTIVITY_STALE'); expect(r.secondRejected.code).toBe('ACTIVITY_STALE');
  expect(r.afterFirst).toEqual(r.beforeFirst); expect(r.afterSecond).toEqual(r.beforeSecond);
  expect(r.configured.state.school).toBe('talisman'); expect(r.configured.activity.status).toBe('stopped'); expect(r.configured.activity.stopReason.code).toBe('STATE_CHANGED');
  for (const attempt of r.stale) expect(attempt.code).toBe('STALE_REVISION'); expect(r.stoppedResume.code).toBe('ACTIVITY_STOPPED'); expect(r.afterStale).toEqual(r.beforeStale);
  expect(r.fresh.activity.id).not.toBe(r.finitePaused.activity.id); expect(r.fresh.state).toEqual(r.configured.state);
  expect(r.done.state).toEqual(r.expected.nextState); expect(r.done.result).toEqual(r.expected.result); expect(r.checkpoint.snapshot).toEqual(r.configured.state);
  expect(r.checkpoint.snapshot.loadout).toEqual(r.configured.state.loadout); expect(r.done.state.core.player.realm).toBe('golden');
  expect(r.oldStart.replayed).toBe(true); expect(r.oldStart.state).toEqual(r.done.state); expect(r.oldStart.activity).toEqual(r.done.activity); expect(r.afterReplay).toEqual(r.beforeReplay);
});

test('restoring complete preparation after v6 consumption and v5 healing preserves new activities when the original RESTORE receipt replays', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h, name = 'later-mixed-restore', game = h.milestoneSamples.find((s: any) => s.action.type === 'START_TRIAL').game;
    const { repo, snapshot } = await h.laterOpen(name, game);
    try {
      await h.finishAction(repo, { type: 'START_TRIAL' }); const checkpoint = await repo.loadCheckpoint();
      await h.finishAction(repo, { type: 'ANSWER_TRIAL', answer: 'accept' });
      const spent = await h.finishAction(repo, { type: 'BATTLE', move: 'technique' }); await h.finishAction(repo, { type: 'BATTLE', move: 'flee' });
      const heal = await h.laterStart(repo, { kind: 'use', item: 'healing_pill', maxCycles: 1, targetPercent: 100, itemReserve: 0 });
      const healTick = h.milestoneTick(heal), healed = await h.laterSettle(repo, heal);
      const config = h.laterConfiguration(healed, { type: 'SCHOOL', school: 'talisman' }), configured = await repo.configure(config);
      const restore = h.mutation(configured.state), restored = await repo.restoreCheckpoint(restore), restoredSnapshot = await repo.loadActivitySnapshot();
      const travel = await h.laterStart(repo, { kind: 'travel', location: 'cave', maxCycles: 1 });
      const beforeFirst = await h.inspect(name), firstReplay = await repo.restoreCheckpoint(restore), afterFirst = await h.inspect(name), stillTraveling = await repo.loadActivitySnapshot();
      const arrived = await h.laterSettle(repo, travel), beforeSecond = await h.inspect(name), secondReplay = await repo.restoreCheckpoint(restore);
      const oldTick = await h.attempt(() => repo.settleActivity(healTick));
      return { snapshot, checkpoint, spent, healed, configured, restored, restoredSnapshot, travel, beforeFirst, firstReplay, afterFirst, stillTraveling,
        arrived, beforeSecond, secondReplay, oldTick, afterSecond: await h.inspect(name), current: await repo.loadActivitySnapshot(),
        history: await repo.loadActivityHistory(arrived.activity.id, 0, 1), currentCheckpoint: await repo.loadCheckpoint(), archives: await repo.archives() };
    } finally { repo.close(); }
  });
  expect(r.checkpoint.snapshot).toEqual(r.snapshot.state); expect(r.spent.result.costs.mp).toBe(8);
  expect(r.healed.activity.spentItems).toEqual({ healing_pill: 1 }); expect(r.configured.state.school).toBe('talisman');
  const normalize = (state: any) => { const copy = structuredClone(state); copy.core.runId = '<run>'; copy.core.revision = 0; return copy; };
  expect(normalize(r.restored.state)).toEqual(normalize(r.snapshot.state)); expect(r.restored.state.core.runId).not.toBe(r.configured.state.core.runId);
  expect(r.restoredSnapshot.activity).toBeNull(); expect(r.firstReplay.replayed).toBe(true); expect(r.firstReplay.state).toEqual(r.travel.state);
  expect(r.stillTraveling).toEqual({ state: r.travel.state, activity: r.travel.activity }); expect(r.afterFirst).toEqual(r.beforeFirst);
  expect(r.secondReplay.replayed).toBe(true); expect(r.secondReplay.state).toEqual(r.arrived.state); expect(r.afterSecond).toEqual(r.beforeSecond);
  expect(r.current).toEqual({ state: r.arrived.state, activity: r.arrived.activity }); expect(r.oldTick.code).toBe('RUN_MISMATCH');
  expect(r.history.total).toBe(1); expect(r.history.rows[0].result).toEqual(r.arrived.result); expect(r.currentCheckpoint).toEqual(r.checkpoint);
  expect(r.archives.some((entry: any) => entry.value?.id === r.configured.activity.id)).toBe(true);
});
