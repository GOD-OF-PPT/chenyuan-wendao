import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { repositoryFsRoot as root } from './fs-root';

test.beforeEach(async ({ page }) => {
  await setupPersistence(page);
  await page.evaluate(async (root) => {
    const h = (globalThis as any).h,
      C = await import(`/@fs${root}src/full/content.ts`);
    h.configurationContent = C;
    h.configurationAPI = await import(`/@fs${root}src/full/configuration.ts`);
    h.receiptAPI = await import(`/@fs${root}src/full/receipts.ts`);
    h.configurationIntent = (s: any, action: any) => ({
      command: h.command(s.state, action),
      expectedActivityId: s.activity?.id ?? null,
      expectedActivityRevision: s.activity?.revision ?? null,
    });
    h.configurationMutation = (s: any) => ({
      commandId: crypto.randomUUID(),
      runId: s.state.core.runId,
      expectedRevision: s.state.core.revision,
      expectedActivityId: s.activity?.id ?? null,
      expectedActivityRevision: s.activity?.revision ?? null,
      ownerId: 'configuration-page-a',
    });
    h.configurationFixture = async (
      name: string,
      battle = false,
      legacyRules = false,
    ) => {
      const d = (legacyRules ? h.legacyRuleRoutes : h.routes).driver();
      while (C.rank(d.game.core.player.realm) < C.rank('golden')) d.realm();
      d.funds(1500);
      d.go('sect');
      for (const id of Object.keys(h.legacyRuleContent.skills))
        if (!d.game.learned.includes(id))
          d.doAction({ type: 'LEARN', skill: id });
      for (const [id, relic] of Object.entries(C.relics) as [string, any][]) {
        for (const [item, amount] of Object.entries(relic.inputs))
          d.resource(item, amount as number);
        d.funds(relic.stones);
        d.go('cave');
        d.doAction({ type: 'FORGE', relic: id });
      }
      d.resource('dew', 4);
      d.funds(100);
      if (battle) {
        d.go('wilderness');
        d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
      } else d.go('cave');
      const repo = await h.FullSaveRepository.open(name);
      await repo.importText(JSON.stringify(d.game), h.mutation());
      return { repo, snapshot: await repo.loadActivitySnapshot() };
    };
  }, root);
});

test('read-only configuration compares real school, slots and relic effects and applies each selected change once', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      { repo, snapshot } = await h.configurationFixture(
        'configuration-compare',
      ),
      rows = [];
    try {
      let current = snapshot;
      for (const action of [
        { type: 'SCHOOL', school: 'talisman' },
        { type: 'EQUIP', skill: 'talisman_calm' },
        { type: 'EQUIP_RELIC', relic: 'jade_seal' },
      ]) {
        const before = await h.inspect('configuration-compare'),
          preview = h.configurationAPI.configurationPreview(
            current.state,
            action,
          ),
          afterPreview = await h.inspect('configuration-compare');
        const intent = h.configurationIntent(current, action),
          expected = h.engine.resolve(current.state, intent.command),
          applied = await repo.configure(intent);
        const beforeReplay = await h.inspect('configuration-compare'),
          replay = await repo.configure(intent),
          afterReplay = await h.inspect('configuration-compare');
        rows.push({
          action,
          before,
          afterPreview,
          preview,
          expected,
          applied,
          replay,
          beforeReplay,
          afterReplay,
          previous: await repo.loadPrevious(),
          original: current.state,
        });
        current = applied;
      }
      return { snapshot, rows, persisted: await repo.loadActivitySnapshot() };
    } finally {
      repo.close();
    }
  });
  for (const row of r.rows) {
    expect(row.preview.allowed).toBe(true);
    expect(row.afterPreview).toEqual(row.before);
    expect(row.applied.state).toEqual(row.expected.nextState);
    expect(row.applied.result).toEqual(row.expected.result);
    expect(row.applied.replayed).toBe(false);
    expect(row.previous).toEqual(row.original);
    expect(row.replay.replayed).toBe(true);
    expect(row.replay.state).toEqual(row.applied.state);
    expect(row.afterReplay).toEqual(row.beforeReplay);
    expect(row.applied.state.core.inventory).toEqual(
      row.original.core.inventory,
    );
    expect(row.applied.state.core.world).toEqual(row.original.core.world);
  }
  expect(r.rows[0].preview.after.school).toBe('talisman');
  expect(r.rows[0].preview.after.learned).toEqual(r.snapshot.state.learned);
  expect(r.rows[0].preview.after.loadout.relic).toBe(
    r.snapshot.state.loadout.relic,
  );
  expect(r.rows[1].preview.after.cultivationBonus).toBe(25);
  expect(r.persisted.state.loadout.relic).toBe('jade_seal');
});

test('all learned slots and all owned relics stay selectable without repeated fees or automatic school changes', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      C = h.configurationContent,
      { repo, snapshot } = await h.configurationFixture(
        'configuration-catalogue',
      ),
      rows = [];
    try {
      let current = snapshot;
      for (const school of ['sword', 'talisman']) {
        if (current.state.school !== school)
          current = await repo.configure(
            h.configurationIntent(current, { type: 'SCHOOL', school }),
          );
        for (const [id, skill] of Object.entries(C.skills).filter(([id]) =>
          snapshot.state.learned.includes(id),
        ) as [string, any][])
          if (skill.school === school) {
            if (current.state.loadout[skill.slot] === id) continue;
            const before = current.state,
              intent = h.configurationIntent(current, {
                type: 'EQUIP',
                skill: id,
              });
            current = await repo.configure(intent);
            rows.push({
              kind: 'skill',
              id,
              slot: skill.slot,
              before,
              after: current.state,
            });
          }
      }
      for (const relic of Object.keys(C.relics)) {
        const before = current.state;
        current = await repo.configure(
          h.configurationIntent(current, { type: 'EQUIP_RELIC', relic }),
        );
        rows.push({ kind: 'relic', id: relic, before, after: current.state });
      }
      return { snapshot, rows };
    } finally {
      repo.close();
    }
  });
  expect(
    new Set(
      r.rows.filter((x: any) => x.kind === 'skill').map((x: any) => x.slot),
    ),
  ).toEqual(new Set(['mind', 'builder', 'finisher']));
  expect(r.rows.filter((x: any) => x.kind === 'relic')).toHaveLength(4);
  for (const row of r.rows) {
    expect(row.after.core.player.stones).toBe(
      row.before.core.player.stones -
        (row.kind === 'relic' && row.before.loadout.relic ? 24 : 0),
    );
    expect(row.after.learned).toEqual(row.before.learned);
    expect(row.after.school).toBe(row.before.school);
    expect(
      row.kind === 'skill'
        ? row.after.loadout[row.slot]
        : row.after.loadout.relic,
    ).toBe(row.id);
  }
});

test('configuration binds the paused activity revision and cannot stop another arrangement at the same Game revision', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      { repo, snapshot } = await h.configurationFixture('configuration-cas');
    const plan = {
      kind: 'cultivation',
      method: 'natural',
      maxCycles: 3,
      until: 'cycles',
      stoneBudget: 0,
      stoneReserve: 0,
    };
    try {
      const a = await repo.startActivity(
          plan,
          h.configurationMutation(snapshot),
        ),
        runningBefore = await h.inspect('configuration-cas');
      const running = await h.attempt(() =>
          repo.configure(
            h.configurationIntent(a, { type: 'EQUIP', skill: 'sword_still' }),
          ),
        ),
        runningAfter = await h.inspect('configuration-cas');
      const pausedA = await repo.pauseActivity(h.configurationMutation(a)),
        draft = h.configurationIntent(pausedA, {
          type: 'EQUIP',
          skill: 'sword_still',
        });
      const b = await repo.startActivity(
          plan,
          h.configurationMutation(pausedA),
        ),
        pausedB = await repo.pauseActivity(h.configurationMutation(b));
      const before = await h.inspect('configuration-cas'),
        stale = await h.attempt(() => repo.configure(draft)),
        after = await h.inspect('configuration-cas');
      const applied = await repo.configure(
        h.configurationIntent(pausedB, { type: 'EQUIP', skill: 'sword_still' }),
      );
      return {
        runningBefore,
        running,
        runningAfter,
        pausedA,
        pausedB,
        stale,
        before,
        after,
        applied,
        persisted: await repo.loadActivitySnapshot(),
      };
    } finally {
      repo.close();
    }
  });
  expect(r.running.code).toBe('ACTIVITY_RUNNING');
  expect(r.runningAfter).toEqual(r.runningBefore);
  expect(r.pausedB.state).toEqual(r.pausedA.state);
  expect(r.stale.code).toBe('ACTIVITY_STALE');
  expect(r.after).toEqual(r.before);
  expect(r.applied.activity.id).toBe(r.pausedB.activity.id);
  expect(r.applied.activity.status).toBe('stopped');
  expect(r.applied.activity.stopReason.code).toBe('STATE_CHANGED');
  expect(r.persisted).toEqual({
    state: r.applied.state,
    activity: r.applied.activity,
  });
  expect(r.applied.state.loadout.mind).toBe('sword_still');
});

for (const mode of ['quota', 'abort', 'lost-delivery'])
  test(`configuration ${mode} preserves all records and stable intent retry applies once`, async ({
    page,
  }) => {
    const r = await page.evaluate(async (mode) => {
      const h = (globalThis as any).h,
        name = 'configuration-fault-' + mode,
        { repo, snapshot } = await h.configurationFixture(name);
      const intent = h.configurationIntent(snapshot, {
          type: 'EQUIP',
          skill: 'sword_still',
        }),
        expected = h.engine.resolve(snapshot.state, intent.command),
        before = await h.inspect(name),
        put = IDBObjectStore.prototype.put;
      try {
        IDBObjectStore.prototype.put = function (
          value: any,
          key?: IDBValidKey,
        ) {
          if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE)
            throw new DOMException('configuration quota', 'QuotaExceededError');
          const request = put.call(this, value, key!);
          if (
            mode === 'abort' &&
            this.name === h.FULL_STATE_STORE &&
            key === 'current'
          )
            request.addEventListener('success', () => this.transaction.abort());
          return request;
        };
        let failed;
        try {
          failed = await h.attempt(async () => {
            const out = await repo.configure(intent);
            if (mode === 'lost-delivery')
              throw new Error('configuration delivery lost');
            return out;
          });
        } finally {
          IDBObjectStore.prototype.put = put;
        }
        const afterFailure = await h.inspect(name),
          retried = await repo.configure(intent),
          beforeReplay = await h.inspect(name),
          replay = await repo.configure(intent);
        return {
          before,
          failed,
          afterFailure,
          expected,
          retried,
          beforeReplay,
          replay,
          afterReplay: await h.inspect(name),
          previous: await repo.loadPrevious(),
          snapshot,
        };
      } finally {
        IDBObjectStore.prototype.put = put;
        repo.close();
      }
    }, mode);
    expect(r.failed.ok).toBe(false);
    if (mode !== 'lost-delivery') {
      expect(r.failed.code).toBe(
        mode === 'quota' ? 'STORAGE_QUOTA' : 'STORAGE_ABORTED',
      );
      expect(r.afterFailure).toEqual(r.before);
    }
    expect(r.retried.state).toEqual(r.expected.nextState);
    expect(r.retried.result).toEqual(r.expected.result);
    expect(r.retried.replayed).toBe(mode === 'lost-delivery');
    expect(r.previous).toEqual(r.snapshot.state);
    expect(r.replay.replayed).toBe(true);
    expect(r.afterReplay).toEqual(r.beforeReplay);
  });

test('historic configuration replay returns the latest later loadout and original result without equipping again', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      { repo, snapshot } = await h.configurationFixture(
        'configuration-history',
      );
    try {
      const intentA = h.configurationIntent(snapshot, {
          type: 'EQUIP',
          skill: 'sword_still',
        }),
        a = await repo.configure(intentA);
      const b = await repo.configure(
        h.configurationIntent(a, { type: 'SCHOOL', school: 'talisman' }),
      );
      const c = await repo.configure(
        h.configurationIntent(b, {
          type: 'EQUIP_RELIC',
          relic: 'cloud_mirror',
        }),
      );
      const before = await h.inspect('configuration-history'),
        replay = await repo.configure(intentA),
        after = await h.inspect('configuration-history');
      return { a, c, replay, before, after };
    } finally {
      repo.close();
    }
  });
  expect(r.replay.replayed).toBe(true);
  expect(r.replay.state).toEqual(r.c.state);
  expect(r.replay.activity).toEqual(r.c.activity);
  expect(r.replay.result).toEqual(r.a.result);
  expect(r.after).toEqual(r.before);
  expect(r.replay.state.school).toBe('talisman');
  expect(r.replay.state.loadout.relic).toBe('cloud_mirror');
});

test('configuration receipts reject altered scope, forged change proof and cross-purpose command reuse', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      name = 'configuration-proof',
      { repo, snapshot } = await h.configurationFixture(name);
    try {
      const intent = h.configurationIntent(snapshot, {
          type: 'EQUIP',
          skill: 'sword_still',
        }),
        applied = await repo.configure(intent),
        key = intent.command.runId + ':' + intent.command.commandId;
      const altered = await h.attempt(() =>
        repo.configure({
          ...intent,
          expectedActivityId: 'different-activity',
          expectedActivityRevision: 0,
        }),
      );
      const cross = await h.attempt(() => repo.execute(intent.command)),
        raw = await h.inspect(name),
        original = raw[h.FULL_RECEIPT_STORE].find(
          (r: any) => r.key === key,
        ).value,
        rows = [];
      for (const field of ['before', 'after', 'result', 'intent']) {
        const damaged = structuredClone(original);
        if (field === 'before') damaged.before.loadout.mind = 'sword_still';
        if (field === 'after') damaged.after.loadout.mind = 'sword_mind';
        if (field === 'result') damaged.result.delta.stones = -10;
        if (field === 'intent') damaged.intent.command.skill = 'sword_guard';
        await h.put(name, h.FULL_RECEIPT_STORE, key, damaged);
        const before = await h.inspect(name),
          rejected = await h.attempt(() => repo.configure(intent)),
          after = await h.inspect(name);
        rows.push({ field, rejected, before, after });
      }
      await h.put(name, h.FULL_RECEIPT_STORE, key, original);
      return {
        altered,
        cross,
        rows,
        applied,
        replay: await repo.configure(intent),
      };
    } finally {
      repo.close();
    }
  });
  expect(r.altered.code).toBe('COMMAND_ID_REUSED');
  expect(r.cross.code).toBe('COMMAND_ID_REUSED');
  for (const row of r.rows) {
    expect(row.rejected.code, row.field).toBe('RECEIPT_INVALID');
    expect(row.after).toEqual(row.before);
  }
  expect(r.replay.replayed).toBe(true);
  expect(r.replay.state).toEqual(r.applied.state);
});

test('configuration has no short-write bypass, and battle or invalid action confirmations cannot mutate the save', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      rows = [];
    for (const battle of [false, true]) {
      const name = 'configuration-guards-' + battle,
        { repo, snapshot } = await h.configurationFixture(name, battle);
      try {
        const before = await h.inspect(name);
        const direct = await h.attempt(() =>
          repo.execute(
            h.command(snapshot.state, { type: 'EQUIP', skill: 'sword_still' }),
          ),
        );
        const bad = await h.attempt(() =>
          repo.configure(
            h.configurationIntent(snapshot, {
              type: 'BUY',
              item: 'herb',
              quantity: 1,
            }),
          ),
        );
        const inBattle = battle
          ? await h.attempt(() =>
              repo.configure(
                h.configurationIntent(snapshot, {
                  type: 'EQUIP',
                  skill: 'sword_still',
                }),
              ),
            )
          : null;
        rows.push({
          battle,
          before,
          after: await h.inspect(name),
          direct,
          bad,
          inBattle,
        });
      } finally {
        repo.close();
      }
    }
    return rows;
  });
  for (const row of r) {
    expect(row.direct.code).toBe('CONFIGURATION_REQUIRED');
    expect(row.bad.code).toBe('INVALID_COMMAND');
    expect(row.after).toEqual(row.before);
    if (row.battle) expect(row.inBattle.code).toBe('IN_BATTLE');
  }
});

test('legal old configuration receipts still replay through ordinary execute while new writes require scoped confirmation', async ({
  page,
}) => {
  const rows = await page.evaluate(async () => {
    const h = (globalThis as any).h,
      rows = [];
    for (const action of [
      { type: 'SCHOOL', school: 'talisman' },
      { type: 'EQUIP', skill: 'sword_still' },
      { type: 'EQUIP_RELIC', relic: 'jade_seal' },
    ]) {
      const name = 'configuration-old-' + action.type,
        { repo, snapshot } = await h.configurationFixture(name, false, true);
      try {
        const command = h.command(snapshot.state, action),
          expected = h.engine.resolve(snapshot.state, command);
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
        rows.push({ expected, replay, blocked, before, after });
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
    expect(row.blocked.code).toBe('CONFIGURATION_REQUIRED');
    expect(row.after).toEqual(row.before);
  }
});
