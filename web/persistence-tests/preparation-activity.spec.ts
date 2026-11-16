import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { repositoryFsRoot as root } from './fs-root';

test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(async (root) => {
    const h = (globalThis as any).h,
      C = await import(`/@fs${root}src/full/content.ts`);
    h.preparationContent = C;
    h.preparationAPI = await import(`/@fs${root}src/full/activity.ts`);
    h.receiptAPI = await import(`/@fs${root}src/full/receipts.ts`);
    h.preparationPlan = (kind: string, overrides: any = {}) => {
      const plans: Record<string, any> = {
        learn: {
          kind,
          skills: ['sword_still', 'talisman_mind'],
          maxCycles: 2,
          stoneBudget: 100,
          stoneReserve: 0,
        },
        study: {
          kind,
          manual: 'jinghong',
          maxCycles: 1,
          stoneBudget: 80,
          stoneReserve: 0,
        },
        buy: {
          kind,
          item: 'healing_pill',
          maxCycles: 3,
          until: 'cycles',
          targetQuantity: null,
          stoneBudget: 54,
          stoneReserve: 0,
        },
        sell: { kind, item: 'healing_pill', maxCycles: 3, itemReserve: 0 },
        use: {
          kind,
          item: 'healing_pill',
          maxCycles: 3,
          targetPercent: 100,
          itemReserve: 0,
        },
        rest: { kind, maxCycles: 1, remainingMonthsReserve: 1 },
      };
      return { ...plans[kind], ...overrides };
    };
    h.preparationMutation = (s: any, ownerId = 'preparation-page-a') => ({
      commandId: crypto.randomUUID(),
      runId: s.state.core.runId,
      expectedRevision: s.state.core.revision,
      expectedActivityId: s.activity?.id ?? null,
      expectedActivityRevision: s.activity?.revision ?? null,
      ownerId,
    });
    h.preparationTick = (s: any) => ({
      commandId: s.activity.nextCommand.commandId,
      runId: s.state.core.runId,
      expectedRevision: s.state.core.revision,
      activityId: s.activity.id,
      expectedActivityRevision: s.activity.revision,
      generation: s.activity.generation,
      ownerId: s.activity.ownerId,
    });
    h.preparationFixture = async (
      name: string,
      kind = 'learn',
      options: any = {},
    ) => {
      const d = (options.legacyRules ? h.legacyRuleRoutes : h.routes).driver(),
        target = options.realm ?? 'golden';
      while (C.rank(d.game.core.player.realm) < C.rank(target)) d.realm();
      // This covers the largest single quoted pill (2205) and the full 680-stone
      // skill queue through actual work, without an unnecessary 10000-stone route.
      d.buy('healing_pill', 10);
      d.buy('spirit_pill', 10);
      d.funds(2500);
      d.go(
        kind === 'buy' || kind === 'sell'
          ? 'market'
          : kind === 'learn' || kind === 'study'
            ? 'sect'
            : 'cave',
      );
      const game = structuredClone(d.game);
      // Explicit valid boundary fixtures exercise recovery/capacity, not a claimed normal player route.
      if (kind === 'use' || kind === 'rest') {
        game.core.player.hp = Math.max(
          1,
          Math.floor(C.realms[game.core.player.realm].maxHp * 0.1),
        );
        game.core.player.mp = 1;
      }
      if (options.hp !== undefined) game.core.player.hp = options.hp;
      if (options.mp !== undefined) game.core.player.mp = options.mp;
      if (options.inventory)
        Object.assign(game.core.inventory, options.inventory);
      if (options.stones !== undefined)
        game.core.player.stones = options.stones;
      h.engine.validateGame(game);
      const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
  }, root);
});

test('all six preparation kinds settle real one-command costs and outcomes, and only completed cycles are saved', async ({
  page,
}) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      rows = [],
      realNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;
    try {
      for (const kind of ['learn', 'study', 'buy', 'sell', 'use', 'rest']) {
        const { repo, snapshot } = await h.preparationFixture(
          'preparation-formal-' + kind,
          kind,
        );
        try {
          const started = await repo.startActivity(
              h.preparationPlan(kind),
              h.preparationMutation(snapshot),
            ),
            tick = h.preparationTick(started);
          const expected = h.engine.resolve(
              snapshot.state,
              started.activity.nextCommand,
            ),
            before = await h.inspect('preparation-formal-' + kind);
          const early = await h.attempt(() => repo.settleActivity(tick)),
            afterEarly = await h.inspect('preparation-formal-' + kind);
          now = started.activity.dueAt;
          const completed = await repo.settleActivity(tick),
            replay = await repo.settleActivity(tick);
          const raw = await h.inspect('preparation-formal-' + kind),
            receipt = raw[h.FULL_RECEIPT_STORE].find(
              (r: any) => r.key === tick.runId + ':' + tick.commandId,
            ).value;
          rows.push({
            kind,
            snapshot,
            started,
            expected,
            early,
            before,
            afterEarly,
            completed,
            replay,
            receipt,
            previous: await repo.loadPrevious(),
          });
        } finally {
          repo.close();
        }
      }
      return rows;
    } finally {
      Date.now = realNow;
    }
  });
  expect(rows).toHaveLength(6);
  for (const r of rows) {
    expect(r.started.activity.version).toBe(5);
    expect(r.started.state).toEqual(r.snapshot.state);
    expect(r.early.code).toBe('ACTIVITY_NOT_DUE');
    expect(r.afterEarly).toEqual(r.before);
    expect(r.completed.state).toEqual(r.expected.nextState);
    expect(r.completed.result).toEqual(r.expected.result);
    expect(r.completed.result.requestedSteps).toBe(1);
    expect(r.completed.result.executedSteps).toBe(1);
    expect(r.completed.activity.completedCycles).toBe(1);
    expect(r.completed.state.school).toBe(r.snapshot.state.school);
    expect(r.completed.state.loadout).toEqual(r.snapshot.state.loadout);
    expect(r.previous).toEqual(r.snapshot.state);
    expect(r.receipt.version).toBe(2);
    expect(r.receipt.proof.activityBefore).toEqual(r.started.activity);
    expect(r.receipt.proof.stateAfter).toEqual(r.completed.state);
    expect(r.replay.replayed).toBe(true);
    expect(r.replay.state).toEqual(r.completed.state);
    expect(r.replay.activity).toEqual(r.completed.activity);
    expect(r.replay.result).toEqual(r.completed.result);
    if (r.kind === 'buy' || r.kind === 'sell')
      expect(r.started.activity.nextCommand.quantity).toBe(1);
    if (r.kind === 'learn')
      expect(r.completed.activity.learnedSkills).toEqual(['sword_still']);
    if (r.kind === 'study')
      expect(r.completed.activity.studiedManuals).toEqual(['jinghong']);
    if (r.kind === 'use')
      expect(r.completed.activity.restoredHp).toBe(r.completed.result.delta.hp);
    if (r.kind === 'rest') {
      expect(r.completed.activity.status).toBe('stopped');
      expect(r.completed.result.costs.months).toBe(12);
    }
  }
});

test('the complete skill queue and every legal trade item keep formal fees, free cross-school learning and medicine sales', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      C = h.preparationContent,
      rows = [],
      realNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;
    try {
      const learning = await h.preparationFixture(
        'preparation-all-skills',
        'learn',
      );
      try {
        const skills = Object.keys(h.legacyRuleContent.skills).filter(
            (id) => !learning.snapshot.state.learned.includes(id),
          ),
          budget = skills.reduce((n, id) => n + C.skills[id].price, 0);
        let result = await learning.repo.startActivity(
          h.preparationPlan('learn', {
            skills,
            maxCycles: skills.length,
            stoneBudget: budget,
          }),
          h.preparationMutation(learning.snapshot),
        );
        const commands = [];
        for (
          let i = 0;
          i < skills.length && result.activity.status === 'running';
          i++
        ) {
          commands.push(result.activity.nextCommand);
          now = result.activity.dueAt;
          result = await learning.repo.settleActivity(
            h.preparationTick(result),
          );
        }
        rows.push({
          kind: 'learn',
          before: learning.snapshot,
          result,
          skills,
          budget,
          commands,
        });
      } finally {
        learning.repo.close();
      }
      for (const kind of ['buy', 'sell'])
        for (const [item, entry] of Object.entries(C.items) as [
          string,
          any,
        ][]) {
          if (kind === 'sell' && entry.sell === null) continue;
          const { repo, snapshot } = await h.preparationFixture(
            `preparation-trade-${kind}-${item}`,
            kind,
            {
              realm: 'spirit',
              ...(kind === 'sell' ? { inventory: { [item]: 1 } } : {}),
            },
          );
          try {
            const started = await repo.startActivity(
              h.preparationPlan(kind, {
                item,
                maxCycles: 1,
                ...(kind === 'buy' ? { stoneBudget: entry.buy } : {}),
              }),
              h.preparationMutation(snapshot),
            );
            const expected = h.engine.resolve(
              snapshot.state,
              started.activity.nextCommand,
            );
            now = started.activity.dueAt;
            rows.push({
              kind,
              item,
              entry,
              snapshot,
              expected,
              completed: await repo.settleActivity(h.preparationTick(started)),
            });
          } finally {
            repo.close();
          }
        }
      return rows;
    } finally {
      Date.now = realNow;
    }
  });
  const learn = r.find((x: any) => x.kind === 'learn');
  expect(learn.result.activity.learnedSkills).toEqual(learn.skills);
  expect(learn.result.activity.spentStones).toBe(learn.budget);
  expect(learn.result.state.learned).toEqual([
    ...learn.before.state.learned,
    ...learn.skills,
  ]);
  expect(learn.result.state.loadout).toEqual(learn.before.state.loadout);
  expect(learn.result.state.school).toBe('sword');
  expect(learn.skills).toContain('talisman_mind');
  for (const row of r.filter((x: any) => x.kind !== 'learn')) {
    expect(row.completed.state).toEqual(row.expected.nextState);
    expect(row.completed.result).toEqual(row.expected.result);
  }
  expect(
    r.some((x: any) => x.kind === 'sell' && x.item === 'healing_pill'),
  ).toBe(true);
  expect(
    r.some((x: any) => x.kind === 'sell' && x.item === 'spirit_pill'),
  ).toBe(true);
});

test('thresholds, inventory goals, gross budgets, reserves, known skills and forbidden sales stop without hidden follow-up', async ({
  page,
}) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      C = h.preparationContent,
      rows = [],
      realNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;
    try {
      for (const mode of [
        'buy-target',
        'buy-budget',
        'buy-reserve',
        'sell-reserve',
        'use-threshold',
        'use-reserve',
        'known',
        'forbidden',
        'full',
        'capacity',
      ]) {
        const kind =
          mode.startsWith('buy') || mode === 'capacity'
            ? 'buy'
            : mode.startsWith('sell') || mode === 'forbidden'
              ? 'sell'
              : mode === 'known'
                ? 'learn'
                : 'use';
        const opts =
          mode === 'full'
            ? { hp: C.realms.golden.maxHp }
            : mode === 'capacity'
              ? { inventory: { healing_pill: C.maxQuantity } }
              : mode === 'forbidden'
                ? { inventory: { foundation_pill: 1 } }
                : {};
        const { repo, snapshot } = await h.preparationFixture(
          'preparation-stop-' + mode,
          kind,
          opts,
        );
        try {
          const overrides =
            mode === 'buy-target'
              ? {
                  until: 'target',
                  targetQuantity:
                    snapshot.state.core.inventory.healing_pill + 1,
                }
              : mode === 'buy-budget'
                ? { stoneBudget: 18 }
                : mode === 'buy-reserve'
                  ? { stoneReserve: snapshot.state.core.player.stones - 18 }
                  : mode === 'sell-reserve' || mode === 'use-reserve'
                    ? {
                        itemReserve:
                          snapshot.state.core.inventory.healing_pill - 1,
                      }
                    : mode === 'use-threshold'
                      ? { targetPercent: 40 }
                      : mode === 'known'
                        ? {
                            skills: ['sword_mind'],
                            maxCycles: 1,
                            stoneBudget: 0,
                          }
                        : mode === 'forbidden'
                          ? { item: 'foundation_pill' }
                          : {};
          const before = await h.inspect('preparation-stop-' + mode),
            attempt = await h.attempt(() =>
              repo.startActivity(
                h.preparationPlan(kind, overrides),
                h.preparationMutation(snapshot),
              ),
            );
          let completed = null;
          if (attempt.ok) {
            now = attempt.value.activity.dueAt;
            completed = await repo.settleActivity(
              h.preparationTick(attempt.value),
            );
          }
          rows.push({
            mode,
            snapshot,
            attempt,
            completed,
            before,
            after: await h.inspect('preparation-stop-' + mode),
          });
        } finally {
          repo.close();
        }
      }
      return rows;
    } finally {
      Date.now = realNow;
    }
  });
  const codes: Record<string, string> = {
    'buy-target': 'TARGET_MET',
    'buy-budget': 'ACTIVITY_BUDGET',
    'buy-reserve': 'ACTIVITY_RESERVE',
    'sell-reserve': 'ACTIVITY_RESERVE',
    'use-threshold': 'TARGET_MET',
    'use-reserve': 'ACTIVITY_RESERVE',
  };
  for (const row of rows) {
    if (codes[row.mode]) {
      expect(row.completed.activity.status).toBe('stopped');
      expect(row.completed.activity.completedCycles).toBe(1);
      expect(row.completed.activity.stopReason.code).toBe(codes[row.mode]);
    } else {
      expect(row.attempt.ok, row.mode).toBe(false);
      expect(row.after).toEqual(row.before);
      if (row.mode === 'forbidden')
        expect(row.attempt.code).toBe('LOCKED_ITEM');
    }
  }
});

for (const mode of ['quota', 'abort', 'lost-delivery'])
  test(`each new preparation kind keeps atomic effects and stable replay after ${mode}`, async ({
    page,
  }) => {
    const rows = await page.evaluate(async (mode) => {
      const h = (globalThis as any).h,
        rows = [],
        realNow = Date.now;
      let now = 1_700_000_000_000;
      Date.now = () => now;
      try {
        for (const kind of ['learn', 'study', 'buy', 'sell', 'use', 'rest']) {
          const name = `preparation-fault-${mode}-${kind}`,
            { repo, snapshot } = await h.preparationFixture(name, kind);
          try {
            const started = await repo.startActivity(
                h.preparationPlan(kind),
                h.preparationMutation(snapshot),
              ),
              tick = h.preparationTick(started),
              before = await h.inspect(name);
            now = started.activity.dueAt;
            const put = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (
              value: any,
              key?: IDBValidKey,
            ) {
              if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE)
                throw new DOMException(
                  'preparation quota',
                  'QuotaExceededError',
                );
              const request = put.call(this, value, key!);
              if (
                mode === 'abort' &&
                this.name === h.FULL_STATE_STORE &&
                key === 'activity'
              )
                request.addEventListener('success', () =>
                  this.transaction.abort(),
                );
              return request;
            };
            let failed;
            try {
              failed = await h.attempt(async () => {
                const out = await repo.settleActivity(tick);
                if (mode === 'lost-delivery')
                  throw new Error('reply lost after commit');
                return out;
              });
            } finally {
              IDBObjectStore.prototype.put = put;
            }
            const after = await h.inspect(name),
              retried = await repo.settleActivity(tick),
              replay = await repo.settleActivity(tick);
            rows.push({
              kind,
              mode,
              snapshot,
              before,
              after,
              failed,
              expected: h.engine.resolve(
                snapshot.state,
                started.activity.nextCommand,
              ),
              retried,
              replay,
            });
          } finally {
            repo.close();
          }
        }
        return rows;
      } finally {
        Date.now = realNow;
      }
    }, mode);
    for (const row of rows) {
      expect(row.failed.ok).toBe(false);
      if (mode !== 'lost-delivery') {
        expect(row.failed.code).toBe(
          mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED',
        );
        expect(row.after).toEqual(row.before);
      }
      expect(row.retried.state).toEqual(row.expected.nextState);
      expect(row.retried.result).toEqual(row.expected.result);
      expect(row.retried.replayed).toBe(mode === 'lost-delivery');
      expect(row.retried.activity.completedCycles).toBe(1);
      expect(row.replay.replayed).toBe(true);
      expect(row.replay.state).toEqual(row.retried.state);
      expect(row.replay.activity).toEqual(row.retried.activity);
    }
  });

test('historical recovery and learning receipts remain readable after later legal healing and configuration', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      { repo, snapshot } = await h.preparationFixture(
        'preparation-history',
        'use',
      ),
      realNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;
    try {
      const a = await repo.startActivity(
          h.preparationPlan('use', { maxCycles: 1 }),
          h.preparationMutation(snapshot),
        ),
        tick = h.preparationTick(a);
      now = a.activity.dueAt;
      const healed = await repo.settleActivity(tick);
      const rest = await repo.startActivity(
        h.preparationPlan('rest'),
        h.preparationMutation(healed),
      );
      now = rest.activity.dueAt;
      const rested = await repo.settleActivity(h.preparationTick(rest)),
        before = await h.inspect('preparation-history'),
        replay = await repo.settleActivity(tick),
        after = await h.inspect('preparation-history');
      await h.finishAction(repo, { type: 'TRAVEL', location: 'sect' });
      const learning = await repo.startActivity(
        h.preparationPlan('learn', { skills: ['sword_still'], maxCycles: 1 }),
        h.preparationMutation(await repo.loadActivitySnapshot()),
      );
      const learnTick = h.preparationTick(learning);
      now = learning.activity.dueAt;
      const learned = await repo.settleActivity(learnTick);
      const configured = await repo.configure({
        command: h.command(learned.state, {
          type: 'EQUIP',
          skill: 'sword_still',
        }),
        expectedActivityId: learned.activity.id,
        expectedActivityRevision: learned.activity.revision,
      });
      const beforeLearnReplay = await h.inspect('preparation-history'),
        learnReplay = await repo.settleActivity(learnTick),
        afterLearnReplay = await h.inspect('preparation-history');
      return {
        healed,
        rested,
        replay,
        before,
        after,
        learned,
        configured,
        learnReplay,
        beforeLearnReplay,
        afterLearnReplay,
      };
    } finally {
      Date.now = realNow;
      repo.close();
    }
  });
  expect(r.rested.state.core.player.hp).toBeGreaterThan(
    r.healed.state.core.player.hp,
  );
  expect(r.replay.replayed).toBe(true);
  expect(r.replay.state).toEqual(r.rested.state);
  expect(r.replay.activity).toEqual(r.rested.activity);
  expect(r.replay.result).toEqual(r.healed.result);
  expect(r.after).toEqual(r.before);
  expect(r.learned.activity.learnedSkills).toEqual(['sword_still']);
  expect(r.configured.state.loadout.mind).toBe('sword_still');
  expect(r.learnReplay.replayed).toBe(true);
  expect(r.learnReplay.state).toEqual(r.configured.state);
  expect(r.learnReplay.activity).toEqual(r.configured.activity);
  expect(r.learnReplay.result).toEqual(r.learned.result);
  expect(r.afterLearnReplay).toEqual(r.beforeLearnReplay);
});

test('new activity proof corruption cannot change its cost, recovery, learned skill, owner or original timing', async ({
  page,
}) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      rows = [],
      realNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;
    try {
      for (const kind of ['learn', 'use']) {
        const name = 'preparation-proof-' + kind,
          { repo, snapshot } = await h.preparationFixture(name, kind);
        try {
          const a = await repo.startActivity(
              h.preparationPlan(kind),
              h.preparationMutation(snapshot),
            ),
            tick = h.preparationTick(a);
          now = a.activity.dueAt;
          const done = await repo.settleActivity(tick),
            key = tick.runId + ':' + tick.commandId,
            raw = await h.inspect(name),
            original = raw[h.FULL_RECEIPT_STORE].find(
              (r: any) => r.key === key,
            ).value;
          for (const field of ['result', 'owner', 'proof', 'time']) {
            const bad = structuredClone(original);
            if (field === 'result') bad.result.costs.stones++;
            if (field === 'owner')
              bad.proof.activityBefore.ownerId = 'forged-owner';
            if (field === 'proof') {
              if (kind === 'use') bad.proof.stateAfter.core.player.hp--;
              else bad.proof.stateAfter.learned.pop();
            }
            if (field === 'time')
              bad.proof.resolvedAt = bad.proof.activityBefore.dueAt - 1;
            await h.put(name, h.FULL_RECEIPT_STORE, key, bad);
            const before = await h.inspect(name),
              rejected = await h.attempt(() => repo.settleActivity(tick)),
              after = await h.inspect(name);
            rows.push({ kind, field, before, after, rejected });
          }
          await h.put(name, h.FULL_RECEIPT_STORE, key, original);
          const replay = await repo.settleActivity(tick);
          if (
            !replay.replayed ||
            JSON.stringify(replay.state) !== JSON.stringify(done.state)
          )
            throw new Error('original receipt was not preserved');
        } finally {
          repo.close();
        }
      }
      return rows;
    } finally {
      Date.now = realNow;
    }
  });
  for (const row of rows) {
    expect(row.rejected.code, row.kind + row.field).toBe('RECEIPT_INVALID');
    expect(row.after).toEqual(row.before);
  }
});

test('six former short-action receipts replay strictly but fresh ordinary writes cannot bypass their activity', async ({
  page,
}) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      rows = [];
    for (const kind of ['learn', 'study', 'buy', 'sell', 'use', 'rest']) {
      const name = 'preparation-legacy-command-' + kind,
        { repo, snapshot } = await h.preparationFixture(name, kind, {
          legacyRules: true,
        });
      try {
        const action = h.preparationAPI.preparationCycleAction(
            h.preparationPlan(kind),
            0,
          ),
          command = h.command(snapshot.state, action),
          expected = h.engine.resolve(snapshot.state, command);
        // Exact legal v6 command/receipt records, produced by the unchanged deterministic engine.
        await h.put(name, h.FULL_STATE_STORE, 'previous', snapshot.state);
        await h.put(name, h.FULL_STATE_STORE, 'current', expected.nextState);
        await h.put(
          name,
          h.FULL_RECEIPT_STORE,
          command.runId + ':' + command.commandId,
          {
            format: 'chenyuan-receipt',
            version: 1,
            command,
            fingerprint: h.receiptAPI.canonicalFingerprint(command),
            result: expected.result,
          },
        );
        const before = await h.inspect(name),
          replay = await repo.execute(command),
          blocked = await h.attempt(() =>
            repo.execute(h.command(expected.nextState, action)),
          ),
          after = await h.inspect(name);
        rows.push({ kind, expected, replay, blocked, before, after });
      } finally {
        repo.close();
      }
    }
    return rows;
  });
  for (const row of rows) {
    expect(row.replay.replayed).toBe(true);
    expect(row.replay.state).toEqual(row.expected.nextState);
    expect(row.replay.result).toEqual(row.expected.result);
    expect(row.blocked.code).toBe('ACTIVITY_REQUIRED');
    expect(row.after).toEqual(row.before);
  }
});

test('DB7 preserves every v6 legacy activity, real checkpoint and receipt byte-for-byte and closes the old client', async ({
  page,
}) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      rows = [],
      realNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;
    try {
      for (const kind of ['cultivation', 'source', 'craft', 'forge']) {
        const name = 'preparation-upgrade-v6-' + kind,
          repo = await h.FullSaveRepository.open(name + '-source'),
          d = h.legacyRuleRoutes.driver();
        try {
          d.realm();
          d.resource('herb', 12);
          d.resource('jade', 7);
          d.resource('core', 4);
          d.funds(1000);
          d.buy('golden_pill', 1);
          d.meditate();
          d.go('cave');
          const imported = await repo.importText(
            JSON.stringify(d.game),
            h.mutation(),
          );
          let current = await h.finishAction(repo, { type: 'BREAKTHROUGH' });
          if (kind === 'source')
            current = await h.finishAction(repo, {
              type: 'TRAVEL',
              location: 'wilderness',
            });
          const plan =
            kind === 'cultivation'
              ? {
                  kind,
                  method: 'natural',
                  maxCycles: 3,
                  until: 'cycles',
                  stoneBudget: 0,
                  stoneReserve: 0,
                }
              : kind === 'source'
                ? {
                    kind,
                    sourceId: 'herbs',
                    maxCycles: 3,
                    until: 'cycles',
                    target: null,
                    monthBudget: 3,
                    remainingMonthsReserve: 1,
                  }
                : {
                    kind,
                    ...(kind === 'craft'
                      ? {
                          recipeId: 'healing',
                          maxCycles: 3,
                          until: 'cycles',
                          targetQuantity: null,
                        }
                      : { relicId: 'frost_sword', maxCycles: 1 }),
                    stoneBudget: kind === 'craft' ? 6 : 140,
                    stoneReserve: 0,
                    monthBudget: kind === 'craft' ? 3 : 2,
                    remainingMonthsReserve: 1,
                    itemReserves: {},
                  };
          const started = await repo.startActivity(
              plan,
              h.preparationMutation(await repo.loadActivitySnapshot()),
            ),
            tick = h.preparationTick(started);
          now = started.activity.dueAt;
          const completed = await repo.settleActivity(tick),
            checkpoint = await repo.loadCheckpoint(),
            original = h.legacyDatabaseFixture(
              await h.inspect(name + '-source'),
              6,
            );
          repo.close();
          const old = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(name, 6);
            request.onupgradeneeded = () => {
              for (const store of original.stores)
                request.result.createObjectStore(store);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          await new Promise<void>((resolve, reject) => {
            const tx = old.transaction(original.stores, 'readwrite');
            for (const store of original.stores)
              for (const row of original[store])
                tx.objectStore(store).put(row.value, row.key);
            tx.oncomplete = () => resolve();
            tx.onabort = () => reject(tx.error);
          });
          let closed = false;
          old.onversionchange = () => {
            closed = true;
            old.close();
          };
          now += 86_400_000;
          const upgraded = await h.FullSaveRepository.open(name);
          try {
            const loaded = await upgraded.loadActivitySnapshot(),
              after = await h.inspect(name),
              replay = await upgraded.settleActivity(tick);
            const staleClient = await h.attempt(
              () =>
                new Promise((resolve, reject) => {
                  const request = indexedDB.open(name, 6);
                  request.onsuccess = () => {
                    request.result.close();
                    resolve(true);
                  };
                  request.onerror = () => reject(request.error);
                }),
            );
            rows.push({
              kind,
              closed,
              original,
              completed,
              checkpoint,
              after,
              loaded,
              replay,
              staleClient,
              checkpointAfter: await upgraded.loadCheckpoint(),
            });
          } finally {
            upgraded.close();
            old.close();
          }
        } finally {
          repo.close();
        }
      }
      return rows;
    } finally {
      Date.now = realNow;
    }
  });
  for (const row of rows) {
    expect(row.loaded.state.core.contentVersion).toBe('full-demo.3');
    expect(row.loaded.activity).not.toHaveProperty('rulesVersion');
    expect(row.closed).toBe(true);
    expect(row.after.version).toBe(11);
    expect(row.checkpoint).not.toBeNull();
    for (const store of row.original.stores)
      expect(row.after[store]).toEqual(row.original[store]);
    expect(row.loaded).toEqual({
      state: row.completed.state,
      activity: row.completed.activity,
    });
    expect(row.checkpointAfter).toEqual(row.checkpoint);
    expect(row.replay.replayed).toBe(true);
    expect(row.replay.state).toEqual(row.completed.state);
    expect(row.replay.activity).toEqual(row.completed.activity);
    expect(row.staleClient.name).toBe('VersionError');
  }
});
