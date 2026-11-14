import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { repositoryFsRoot } from './fs-root';

test('a confirmed saved ending creates one opted-in gift and keeps the entire sealed source as previous', async ({
  page,
}) => {
  await setupPersistence(page);
  const rows = await page.evaluate(async () => {
    const h = (window as any).h,
      rows = [];
    for (const ending of ['transmit', 'depart']) {
      const game = h.routes.fullRoute(
          'leave',
          'sword',
          'craft',
          false,
          ending,
        ).game,
        repo = await h.FullSaveRepository.open('q17-birth-' + ending);
      try {
        await repo.importText(JSON.stringify(game), h.mutation());
        const source = await repo.loadActivitySnapshot(),
          mutation = h.mutation(source.state),
          before = await h.inspect('q17-birth-' + ending);
        const born = await repo.create('来世修士', mutation, 'ending-gift'),
          previous = await repo.loadPrevious(),
          beforeReplay = await h.inspect('q17-birth-' + ending),
          replayed = await repo.create('来世修士', mutation, 'ending-gift');
        rows.push({
          ending,
          source,
          mutation,
          before,
          born,
          previous,
          beforeReplay,
          replayed,
          after: await h.inspect('q17-birth-' + ending),
        });
      } finally {
        repo.close();
      }
    }
    return rows;
  });
  for (const r of rows) {
    expect(r.born.state.core.contentVersion).toBe('full-demo.6');
    expect(r.born.state.core.player.realm).toBe('mortal');
    expect(r.born.state.core.player.stones).toBe(
      r.ending === 'depart' ? 60 : 40,
    );
    expect(r.born.state.core.inventory.healing_pill).toBe(
      r.ending === 'transmit' ? 2 : 1,
    );
    expect(r.born.state.incarnation.inheritance.sourceRunId).toBe(
      r.source.state.core.runId,
    );
    expect(r.previous).toEqual(r.source.state);
    expect(r.replayed.replayed).toBe(true);
    expect(r.replayed.state).toEqual(r.born.state);
    expect(r.after).toEqual(r.beforeReplay);
  }
});

test('a real preserved v5 ending stays byte-identical until its explicit v6 birth, and its actual client refuses the new life', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async (root) => {
    const h = (window as any).h,
      published = await import(`/@fs${root}src/legacy/rules-v5/index.ts`),
      old = await import(
        `/@fs${root}src/legacy/rules-v5/web/src/full-persistence.ts`
      ),
      name = 'q17-real-v5',
      repo = await old.FullSaveRepository.open(name);
    let current: any, reader: any;
    try {
      const d = h.routes.driver(
        'leave',
        'sword',
        published.engine,
        published.content,
      );
      d.go('wilderness');
      d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
      d.fight();
      d.realm();
      d.realm();
      d.resource('jade', 4);
      d.funds(140);
      d.go('cave');
      d.doAction({ type: 'FORGE', relic: 'jade_seal' });
      d.doAction({ type: 'EQUIP_RELIC', relic: 'jade_seal' });
      d.realm();
      d.realm();
      h.routes.finishTrial(d, 'craft', 'transmit');
      await repo.importText(JSON.stringify(d.game), h.mutation());
      const source = await repo.loadActivitySnapshot(),
        before = await h.inspect(name);
      repo.close();
      current = await h.FullSaveRepository.open(name);
      const opened = await h.inspect(name),
        loaded = await current.loadActivitySnapshot();
      const born = await current.create(
          '旧卷新生',
          h.mutation(loaded.state),
          'ending-gift',
        ),
        previous = await current.loadPrevious(),
        beforeOld = await h.inspect(name),
        refused = await h.attempt(async () => {
          reader = await old.FullSaveRepository.open(name);
          await reader.load();
        });
      return {
        source,
        before,
        opened,
        loaded,
        born,
        previous,
        beforeOld,
        refused,
        afterOld: await h.inspect(name),
      };
    } finally {
      reader?.close();
      current?.close();
      repo.close();
    }
  }, repositoryFsRoot);
  expect(r.source.state.core.contentVersion).toBe('full-demo.5');
  expect(r.loaded).toEqual(r.source);
  expect(r.opened).toEqual(r.before);
  expect(r.previous).toEqual(r.source.state);
  expect(r.born.state.core.contentVersion).toBe('full-demo.6');
  expect(r.born.state.core.inventory.healing_pill).toBe(2);
  expect(r.born.state.incarnation.inheritance.contentVersion).toBe(
    'full-demo.5',
  );
  expect(r.refused.code).toBe('SAVE_SHAPE');
  expect(r.afterOld).toEqual(r.beforeOld);
});

for (const mode of ['quota', 'abort', 'lost-reply', 'race'] as const)
  test(`inheritance ${mode} preserves the original whole-life transaction and never grants twice`, async ({
    page,
  }) => {
    await setupPersistence(page);
    const r = await page.evaluate(async (mode) => {
      const h = (window as any).h,
        name = 'q17-inherit-' + mode,
        repo = await h.FullSaveRepository.open(name),
        put = IDBObjectStore.prototype.put;
      let peer: any;
      try {
        const sourceGame = h.routes.fullRoute(
          'leave',
          'sword',
          'craft',
          false,
          'transmit',
        ).game;
        await repo.importText(JSON.stringify(sourceGame), h.mutation());
        const source = await repo.loadActivitySnapshot(),
          mutation = h.mutation(source.state),
          before = await h.inspect(name);
        let failed: any, first: any;
        if (mode === 'race') {
          peer = await h.FullSaveRepository.open(name);
          first = await Promise.all([
            repo.create('继来者', mutation, 'ending-gift'),
            peer.create('继来者', mutation, 'ending-gift'),
          ]);
        } else {
          IDBObjectStore.prototype.put = function (
            value: any,
            key?: IDBValidKey,
          ) {
            if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE)
              throw new DOMException('q17 quota', 'QuotaExceededError');
            const request = put.call(this, value, key!);
            if (
              mode === 'abort' &&
              this.name === h.FULL_STATE_STORE &&
              key === 'current'
            )
              request.addEventListener('success', () =>
                this.transaction.abort(),
              );
            return request;
          };
          try {
            failed = await h.attempt(async () => {
              const out = await repo.create('继来者', mutation, 'ending-gift');
              if (mode === 'lost-reply') throw new Error('reply lost');
              return out;
            });
          } finally {
            IDBObjectStore.prototype.put = put;
          }
        }
        const afterFailure = await h.inspect(name);
        repo.close();
        const current = await h.FullSaveRepository.open(name);
        try {
          const retry = await current.create('继来者', mutation, 'ending-gift'),
            beforeReplay = await h.inspect(name),
            replay = await current.create('继来者', mutation, 'ending-gift'),
            afterReplay = await h.inspect(name);
          const wrong = await h.attempt(() =>
            current.create('继来者', mutation, 'none'),
          );
          return {
            mode,
            source,
            mutation,
            before,
            failed,
            first,
            afterFailure,
            retry,
            replay,
            beforeReplay,
            afterReplay,
            wrong,
            afterWrong: await h.inspect(name),
            previous: await current.loadPrevious(),
          };
        } finally {
          current.close();
        }
      } finally {
        IDBObjectStore.prototype.put = put;
        peer?.close();
        repo.close();
      }
    }, mode);
    if (mode === 'quota' || mode === 'abort')
      expect(r.afterFailure).toEqual(r.before);
    if (mode === 'race')
      expect(r.first.map((x: any) => x.replayed).sort()).toEqual([false, true]);
    expect(r.retry.state.core.inventory.healing_pill).toBe(2);
    expect(r.retry.state.core.player.stones).toBe(40);
    expect(r.previous).toEqual(r.source.state);
    expect(r.replay.replayed).toBe(true);
    expect(r.replay.state).toEqual(r.retry.state);
    expect(r.afterReplay).toEqual(r.beforeReplay);
    expect(r.wrong.code).toBe('COMMAND_ID_REUSED');
    expect(r.afterWrong).toEqual(r.beforeReplay);
  });

test('another saved life invalidates an old inheritance confirmation with every store unchanged', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async () => {
    const h = (window as any).h,
      name = 'q17-source-changed',
      repo = await h.FullSaveRepository.open(name);
    try {
      await repo.importText(
        JSON.stringify(
          h.routes.fullRoute('leave', 'sword', 'craft', false, 'depart').game,
        ),
        h.mutation(),
      );
      const source = await repo.loadActivitySnapshot(),
        old = h.mutation(source.state);
      const next = await repo.create('另一新卷', h.mutation(source.state)),
        before = await h.inspect(name),
        rejected = await h.attempt(() =>
          repo.create('旧确认', old, 'ending-gift'),
        );
      return { next, before, rejected, after: await h.inspect(name) };
    } finally {
      repo.close();
    }
  });
  expect(r.next.state.core.player.stones).toBe(40);
  expect(r.rejected.code).toBe('STALE_REVISION');
  expect(r.after).toEqual(r.before);
});

test('import, actual breakthrough checkpoint, reopen and full restore keep the original incarnation seed across new run identities', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async () => {
    const h = (window as any).h,
      name = 'q17-seed-checkpoint',
      d = h.routes.driver();
    d.realm();
    const original = d.checkpoints.qi,
      repo = await h.FullSaveRepository.open(name);
    let reopened: any;
    try {
      const imported = await repo.importText(
          JSON.stringify(original),
          h.mutation(),
        ),
        broken = await h.finishAction(repo, { type: 'BREAKTHROUGH' }),
        checkpoint = await repo.loadCheckpoint();
      repo.close();
      reopened = await h.FullSaveRepository.open(name);
      const loaded = await reopened.loadActivitySnapshot(),
        restored = await reopened.restoreCheckpoint(h.mutation(loaded.state)),
        after = await reopened.loadActivitySnapshot();
      return {
        original,
        imported,
        broken,
        checkpoint,
        loaded,
        restored,
        after,
      };
    } finally {
      reopened?.close();
      repo.close();
    }
  });
  for (const game of [
    r.imported.state,
    r.broken.state,
    r.checkpoint.snapshot,
    r.loaded.state,
    r.restored.state,
    r.after.state,
  ])
    expect(game.incarnation.seed).toBe(r.original.incarnation.seed);
  expect(r.imported.state.core.runId).not.toBe(r.original.core.runId);
  expect(r.restored.state.core.runId).not.toBe(r.loaded.state.core.runId);
  expect(r.checkpoint.snapshot).toEqual(r.imported.state);
  expect(r.restored.state.core.player).toEqual(
    r.checkpoint.snapshot.core.player,
  );
  expect(r.restored.state.core.inventory).toEqual(
    r.checkpoint.snapshot.core.inventory,
  );
});

test('empty, active, retired and lifespan source states cannot claim an ending gift or change any store', async ({
  page,
}) => {
  await setupPersistence(page);
  const rows = await page.evaluate(async () => {
    const h = (window as any).h,
      rows = [];
    for (const kind of ['empty', 'active', 'retired', 'lifespan']) {
      const name = 'q17-ineligible-' + kind,
        repo = await h.FullSaveRepository.open(name);
      try {
        let mutation;
        if (kind === 'empty') mutation = h.mutation();
        else {
          const d = h.routes.driver();
          let game = d.game;
          if (kind === 'retired')
            game = h.engine.resolve(
              game,
              h.command(game, { type: 'RETIRE' }),
            ).nextState;
          if (kind === 'lifespan') {
            const C = h.currentContent;
            game = structuredClone(game);
            game.core.world.elapsedMonths =
              C.realms[game.core.player.realm].lifespanMonths -
              game.core.player.startAgeMonths -
              1;
            game = h.engine.resolve(
              game,
              h.command(game, { type: 'END_LIFE' }),
            ).nextState;
          }
          await repo.importText(JSON.stringify(game), h.mutation());
          mutation = h.mutation((await repo.loadActivitySnapshot()).state);
        }
        const before = await h.inspect(name),
          rejected = await h.attempt(() =>
            repo.create('不可携缘', mutation, 'ending-gift'),
          );
        rows.push({ kind, before, rejected, after: await h.inspect(name) });
      } finally {
        repo.close();
      }
    }
    return rows;
  });
  for (const r of rows) {
    expect(r.rejected.code, r.kind).toBe('INHERITANCE_UNAVAILABLE');
    expect(r.after, r.kind).toEqual(r.before);
  }
});
