import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { repositoryFsRoot } from './fs-root';

test('a real accepted v4 repository keeps its checkpoint, twelve volumes, scheduled proof and original replies under the new client', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async (root) => {
    const h = (window as any).h;
    const prior = await import(`/@fs${root}src/legacy/rules-v4/index.ts`);
    const old = await import(
      `/@fs${root}src/legacy/rules-v4/web/src/full-persistence.ts`
    );
    const name = 'q16-real-v4',
      repo = await old.FullSaveRepository.open(name);
    let reader: any;
    const now = Date.now;
    const mutation = (s: any) => ({
      commandId: crypto.randomUUID(),
      runId: s.state.core.runId,
      expectedRevision: s.state.core.revision,
      expectedActivityId: s.activity?.id ?? null,
      expectedActivityRevision: s.activity?.revision ?? null,
      ownerId: 'q16-v4',
    });
    try {
      const d = h.routes.driver('leave', 'sword', prior.engine, prior.content);
      d.realm();
      d.realm();
      d.funds(1500);
      d.go('sect');
      for (const id of Object.keys(prior.content.skills))
        if (!d.game.learned.includes(id))
          d.doAction({ type: 'LEARN', skill: id });
      d.resource('jade', 7);
      d.resource('core', 1);
      d.go('cave');
      d.doAction({ type: 'FORGE', relic: 'frost_sword' });
      d.doAction({ type: 'FORGE', relic: 'jade_seal' });
      d.craft(
        Object.keys(prior.content.recipes).find(
          (id) =>
            prior.content.recipes[id].output ===
            prior.content.realms.golden.pill,
        ),
      );
      d.meditate();
      await repo.importText(JSON.stringify(d.game), h.mutation());
      await h.finishAction(repo, { type: 'BREAKTHROUGH' });
      const intent = async (action: any) => {
        const s = await repo.loadActivitySnapshot();
        return {
          command: h.command(s.state, action),
          expectedActivityId: s.activity?.id ?? null,
          expectedActivityRevision: s.activity?.revision ?? null,
        };
      };
      await repo.configure(
        await intent({ type: 'EQUIP_RELIC', relic: 'frost_sword' }),
      );
      const swap = await intent({ type: 'EQUIP_RELIC', relic: 'jade_seal' }),
        swapped = await repo.configure(swap);
      await h.finishAction(repo, { type: 'TRAVEL', location: 'sect' });
      let s = await repo.loadActivitySnapshot();
      const plan = {
        kind: 'source',
        sourceId: 'work',
        maxCycles: 2,
        until: 'cycles',
        target: null,
        monthBudget: 24,
        remainingMonthsReserve: 1,
      };
      const started = await repo.startScheduledActivity(plan, mutation(s));
      Date.now = () => started.activity.dueAt;
      const advance = mutation(await repo.loadActivitySnapshot()),
        completed = await repo.advanceScheduledActivity(advance);
      const before = await h.inspect(name),
        checkpoint = await repo.loadCheckpoint();
      reader = await h.FullSaveRepository.open(name);
      const opened = await h.inspect(name),
        snapshot = await reader.loadActivitySnapshot();
      const replay = await reader.advanceScheduledActivity(advance),
        converted = await reader.configure(swap);
      return {
        before,
        opened,
        after: await h.inspect(name),
        snapshot,
        swapped,
        converted,
        completed,
        replay,
        checkpoint,
        learned: d.game.learned,
      };
    } finally {
      Date.now = now;
      reader?.close();
      repo.close();
    }
  }, repositoryFsRoot);
  expect(r.learned).toHaveLength(12);
  expect(r.checkpoint.kind).toBe('breakthrough');
  expect(r.checkpoint.snapshot.core.contentVersion).toBe('full-demo.4');
  expect(r.snapshot.state.core.contentVersion).toBe('full-demo.4');
  expect(r.opened).toEqual(r.before);
  expect(r.after).toEqual(r.before);
  expect(r.swapped.result.costs).toEqual({
    stones: 0,
    mp: 0,
    months: 0,
    items: {},
  });
  expect(r.replay.replayed).toBe(true);
  expect(r.replay.result).toEqual(r.completed.result);
  expect(r.replay.state).toEqual(r.snapshot.state);
  expect(r.converted.replayed).toBe(true);
  expect(r.converted.result).toEqual(r.swapped.result);
});

test('the actual v4 client refuses a v5 life without changing any store', async ({
  page,
}) => {
  await setupPersistence(page);
  const r = await page.evaluate(async (root) => {
    const h = (window as any).h,
      old = await import(
        `/@fs${root}src/legacy/rules-v4/web/src/full-persistence.ts`
      );
    const repo = await h.FullSaveRepository.open('q16-old-client');
    let reader: any;
    try {
      const created = await repo.create('新约', h.mutation()),
        before = await h.inspect('q16-old-client');
      const error = await h.attempt(async () => {
        reader = await old.FullSaveRepository.open('q16-old-client');
        await reader.load();
      });
      return {
        created,
        before,
        error,
        after: await h.inspect('q16-old-client'),
      };
    } finally {
      reader?.close();
      repo.close();
    }
  }, repositoryFsRoot);
  expect(r.created.state.core.contentVersion).toBe('full-demo.5');
  expect(r.error.code).toBe('SAVE_VERSION');
  expect(r.after).toEqual(r.before);
});

for (const mode of ['quota', 'abort', 'lost-reply', 'race'] as const)
  test(`real relic conversion ${mode} retains one 24-stone one-dew debit and the exact original intent`, async ({
    page,
  }) => {
    await setupPersistence(page);
    const r = await page.evaluate(async (mode) => {
      const h = (window as any).h,
        d = h.routes.driver();
      d.realm();
      d.realm();
      d.resource('jade', 7);
      d.resource('core', 1);
      d.resource('dew', 2);
      d.funds(1000);
      d.go('cave');
      d.doAction({ type: 'FORGE', relic: 'frost_sword' });
      d.doAction({ type: 'FORGE', relic: 'jade_seal' });
      d.doAction({ type: 'EQUIP_RELIC', relic: 'frost_sword' });
      const name = 'q16-conversion-' + mode,
        repo = await h.FullSaveRepository.open(name);
      let peer: any;
      const put = IDBObjectStore.prototype.put;
      try {
        await repo.importText(JSON.stringify(d.game), h.mutation());
        const s = await repo.loadActivitySnapshot();
        const intent = {
          command: h.command(s.state, {
            type: 'EQUIP_RELIC',
            relic: 'jade_seal',
          }),
          expectedActivityId: s.activity?.id ?? null,
          expectedActivityRevision: s.activity?.revision ?? null,
        };
        const formal = h.engine.resolve(s.state, intent.command),
          before = await h.inspect(name);
        let failed: any, first: any;
        if (mode === 'race') {
          peer = await h.FullSaveRepository.open(name);
          first = await Promise.all([
            repo.configure(intent),
            peer.configure(intent),
          ]);
        } else {
          IDBObjectStore.prototype.put = function (
            value: any,
            key?: IDBValidKey,
          ) {
            if (mode === 'quota' && this.name === h.FULL_RECEIPT_STORE)
              throw new DOMException('q16 quota', 'QuotaExceededError');
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
              const out = await repo.configure(intent);
              if (mode === 'lost-reply') throw new Error('lost reply');
              return out;
            });
          } finally {
            IDBObjectStore.prototype.put = put;
          }
        }
        const afterFailure = await h.inspect(name),
          retried = await repo.configure(intent),
          beforeReplay = await h.inspect(name),
          replayed = await repo.configure(intent);
        return {
          mode,
          s,
          formal,
          before,
          failed,
          first,
          afterFailure,
          retried,
          replayed,
          beforeReplay,
          after: await h.inspect(name),
        };
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
    expect(r.retried.state).toEqual(r.formal.nextState);
    expect(r.retried.result).toEqual(r.formal.result);
    expect(r.retried.state.core.player.stones).toBe(
      r.s.state.core.player.stones - 24,
    );
    expect(r.retried.state.core.inventory.dew).toBe(
      r.s.state.core.inventory.dew - 1,
    );
    expect(r.replayed.replayed).toBe(true);
    expect(r.after).toEqual(r.beforeReplay);
  });
