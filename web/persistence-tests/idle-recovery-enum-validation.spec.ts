import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { repositoryFsRoot } from './fs-root';

test.beforeEach(async ({ page }) => setupPersistence(page));

test('four malformed current saved enums refuse import with every native store and original life preserved', async ({
  page,
}) => {
  const rows = await page.evaluate(async () => {
    const h = (window as any).h,
      repo = await h.FullSaveRepository.open('final-enum-import'),
      rows = [];
    try {
      await repo.importText(
        JSON.stringify(h.routes.driver('leave', 'sword').game),
        h.mutation(),
      );
      for (const key of ['status', 'mode', 'opening', 'school']) {
        const game = await repo.load(),
          bad = structuredClone(game);
        if (key === 'status') bad.status = ['active'];
        else if (key === 'mode') bad.core.mode = ['idle'];
        else if (key === 'opening') bad.core.openingChoice = ['leave'];
        else bad.school = ['sword'];
        const before = await h.inspect('final-enum-import'),
          raw = JSON.stringify(bad),
          failed = await h.attempt(() =>
            repo.importText(raw, h.mutation(game)),
          );
        rows.push({
          key,
          game,
          raw,
          failed,
          before,
          after: await h.inspect('final-enum-import'),
          loaded: await repo.load(),
        });
      }
      return rows;
    } finally {
      repo.close();
    }
  });
  expect(rows).toHaveLength(4);
  for (const row of rows) {
    expect(row.failed.ok).toBe(false);
    expect(row.failed.code).toMatch(/^SAVE_/);
    expect(row.after).toEqual(row.before);
    expect(row.loaded).toEqual(row.game);
  }
});

test('current array command enums cannot enter raw repository configuration or planned START writes', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (window as any).h,
      name = 'final-enum-command',
      repo = await h.FullSaveRepository.open(name),
      rows = [];
    try {
      const created = await repo.create('原卷', h.mutation()),
        game = created.state;
      for (const action of [
        { type: 'CHOOSE', choice: ['trade'] },
        { type: 'SCHOOL', school: ['sword'] },
        { type: 'BATTLE', move: ['attack'] },
        { type: 'ANSWER_TRIAL', answer: ['accept'] },
        { type: 'END', ending: ['transmit'] },
      ]) {
        const before = await h.inspect(name),
          failed = await h.attempt(() => repo.execute(h.command(game, action)));
        rows.push({ before, failed, after: await h.inspect(name) });
      }
      const before = await h.inspect(name),
        badStart = await h.attempt(() =>
          repo.startActivity(
            {
              kind: 'milestone',
              action: { type: 'CHOOSE', choice: ['trade'] },
              maxCycles: 1,
            },
            {
              commandId: repo.issueCommandId(),
              runId: game.core.runId,
              expectedRevision: game.core.revision,
              expectedActivityId: null,
              expectedActivityRevision: null,
              ownerId: 'enum-original',
            },
          ),
        );
      return {
        rows,
        before,
        badStart,
        after: await h.inspect(name),
        game: await repo.load(),
      };
    } finally {
      repo.close();
    }
  });
  for (const row of r.rows) {
    expect(row.failed.code).toBe('INVALID_COMMAND');
    expect(row.after).toEqual(row.before);
  }
  expect(r.badStart.ok).toBe(false);
  expect(r.badStart.code).toMatch(/INVALID_COMMAND|ACTIVITY_INVALID/);
  expect(r.after).toEqual(r.before);
  expect(r.game.core.inventory.healing_pill).toBe(1);
  expect(r.game.core.learnedSkills).toEqual([]);
});

test('a legal trade commits its exact pill and sword scroll once and replays the same original cycle after reopening', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (window as any).h,
      name = 'final-enum-valid',
      repo = await h.FullSaveRepository.open(name);
    let reopened: any;
    try {
      const game = (await repo.create('正当交易', h.mutation())).state;
      const started = await repo.startActivity(
          {
            kind: 'milestone',
            action: { type: 'CHOOSE', choice: 'trade' },
            maxCycles: 1,
          },
          {
            commandId: repo.issueCommandId(),
            runId: game.core.runId,
            expectedRevision: 0,
            expectedActivityId: null,
            expectedActivityRevision: null,
            ownerId: 'legal-trade',
          },
        ),
        a = started.activity;
      const tick = {
          commandId: a.nextCommand.commandId,
          runId: a.runId,
          expectedRevision: a.gameRevision,
          activityId: a.id,
          expectedActivityRevision: a.revision,
          ownerId: a.ownerId,
          generation: a.generation,
        },
        now = Date.now;
      let completed;
      Date.now = () => a.dueAt;
      try {
        completed = await repo.settleActivity(tick);
      } finally {
        Date.now = now;
      }
      repo.close();
      reopened = await h.FullSaveRepository.open(name);
      const before = await h.inspect(name),
        replay = await reopened.settleActivity(tick);
      return {
        game,
        completed,
        replay,
        before,
        after: await h.inspect(name),
        loaded: await reopened.load(),
      };
    } finally {
      repo.close();
      reopened?.close();
    }
  });
  expect(r.completed.state.core.openingChoice).toBe('trade');
  expect(r.completed.state.core.inventory.healing_pill).toBe(0);
  expect(r.completed.state.core.learnedSkills).toEqual([
    'skill_jinghong_slash',
  ]);
  expect(r.replay.replayed).toBe(true);
  expect(r.replay.result).toEqual(r.completed.result);
  expect(r.loaded).toEqual(r.completed.state);
  expect(r.after).toEqual(r.before);
});

test('all three published profiles route legal trades through their unchanged original behavior', async ({
  page,
}) => {
  const r = await page.evaluate(async (root) => {
    const h = (window as any).h,
      rows = [];
    for (const version of [3, 4, 5]) {
      const old = await import(
          `/@fs${root}src/legacy/rules-v${version}/index.ts`
        ),
        game = old.engine.newGame('原约', 'original-' + version),
        original = structuredClone(game);
      const command = {
        type: 'CHOOSE',
        choice: 'trade',
        commandId: 'old-choice',
        runId: game.core.runId,
        expectedRevision: 0,
      };
      const direct = old.engine.resolve(game, command),
        routed = h.engine.resolve(game, command);
      rows.push({
        version,
        original,
        game,
        direct,
        routed,
        parsed: h.engine.parseGame(JSON.stringify(game)),
      });
    }
    return rows;
  }, repositoryFsRoot);
  for (const row of r) {
    expect(row.game).toEqual(row.original);
    expect(row.parsed).toEqual(row.original);
    expect(row.routed).toEqual(row.direct);
    expect(row.routed.nextState.core.inventory.healing_pill).toBe(0);
    expect(row.routed.nextState.core.learnedSkills).toEqual([
      'skill_jinghong_slash',
    ]);
  }
});

test('a previously corrupted current enum already in IndexedDB is kept intact and never silently replaced by an empty life', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const h = (window as any).h,
      name = 'final-enum-existing-corruption',
      repo = await h.FullSaveRepository.open(name);
    await repo.importText(JSON.stringify(h.routes.driver().game), h.mutation());
    const game = await repo.load();
    repo.close();
    const bad = structuredClone(game);
    bad.status = ['active'];
    await h.put(name, h.FULL_STATE_STORE, 'current', bad);
    const before = await h.inspect(name);
    let reader: any;
    const failed = await h.attempt(async () => {
      reader = await h.FullSaveRepository.open(name);
      await reader.load();
    });
    reader?.close();
    return { game, bad, before, failed, after: await h.inspect(name) };
  });
  expect(r.failed.ok).toBe(false);
  expect(r.failed.code).toBe('SAVE_ENDING');
  expect(r.after).toEqual(r.before);
  expect(
    r.after['full-state'].find((row: any) => row.key === 'current').value,
  ).toEqual(r.bad);
});
