import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test.beforeEach(async ({ page }, info) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async (old) => {
    const w = window as any,
      h = w.h,
      model = await import('/persistence-tests/first-practice-harness.ts');
    const d = old
      ? h.routes.driver(
          'leave',
          'sword',
          h.legacyRuleEngine,
          h.legacyRuleContent,
        )
      : h.routes.driver();
    d.go('sect');
    w.practiceOwners = await model.createPracticeOwners(d.game);
    w.practiceRuleError = model.RuleError;
    w.practiceRestore = () => {};
  }, info.title.includes('published v3'));
});
test.afterEach(async ({ page }) => {
  if (!page.isClosed())
    await page.evaluate(() => {
      const w = window as any;
      w.practiceRestore?.();
      w.practiceOwners?.dispose();
    });
});

test('reading pointer and keyboard input preserves the real practice source while a changed page rejects the old confirmation', async ({
  page,
}) => {
  const before = await page.evaluate(async () => {
    const w = window as any,
      o = w.practiceOwners;
    await o.practice.open();
    w.practiceIntent = o.intent('commission');
    return {
      raw: await w.h.inspect(w.h.FULL_DB_NAME),
      owner: o.navigation.owner.value,
    };
  });
  await page.locator('#practice-native-page').click();
  await page.keyboard.press('Tab');
  const read = await page.evaluate(async () => {
    const w = window as any,
      o = w.practiceOwners;
    return {
      raw: await w.h.inspect(w.h.FULL_DB_NAME),
      owner: o.navigation.owner.value,
      blocked: o.practice.blocked.value,
    };
  });
  expect(read.raw).toEqual(before.raw);
  expect(read.owner).toBeGreaterThan(before.owner);
  expect(read.blocked).toBe('');
  const changed = await page.evaluate(async () => {
    const w = window as any,
      o = w.practiceOwners;
    await o.navigation.openHub('inventory');
    const before = await w.h.inspect(w.h.FULL_DB_NAME);
    await o.practice.start(w.practiceIntent);
    return {
      before,
      after: await w.h.inspect(w.h.FULL_DB_NAME),
      blocked: o.practice.blocked.value,
      activity: o.store.activity,
    };
  });
  expect(changed.after).toEqual(changed.before);
  expect(changed.activity).toBeNull();
  expect(changed.blocked).toContain('已离开原入口');
});

for (const change of ['revision', 'life'] as const)
  test(`a real peer ${change} change invalidates the old practice intent without a new write`, async ({
    page,
  }) => {
    const r = await page.evaluate(async (change) => {
      const w = window as any,
        o = w.practiceOwners,
        h = w.h;
      await o.practice.open();
      const intent = o.intent('commission'),
        g = o.store.game,
        peer = await h.FullSaveRepository.open();
      try {
        if (change === 'life') await peer.create('另一人生', h.mutation(g));
        else
          await peer.configure({
            command: {
              type: 'SCHOOL',
              school: 'talisman',
              commandId: peer.issueCommandId(),
              runId: g.core.runId,
              expectedRevision: g.core.revision,
            },
            expectedActivityId: null,
            expectedActivityRevision: null,
          });
        await o.store.init();
        const before = await h.inspect(h.FULL_DB_NAME);
        await o.practice.start(intent);
        return {
          before,
          after: await h.inspect(h.FULL_DB_NAME),
          open: o.dialog.open,
          blocked: o.practice.blocked.value,
          game: o.store.game,
        };
      } finally {
        peer.close();
      }
    }, change);
    expect(r.after).toEqual(r.before);
    if (change === 'life') {
      expect(r.open).toBe(false);
      expect(r.game.core.player.realm).toBe('mortal');
    } else expect(r.blocked).toContain('进度已变化');
  });

test('disposing the practice owner during its asynchronous handoff refuses the original start before any transaction', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const w = window as any,
      o = w.practiceOwners,
      h = w.h;
    await o.practice.open();
    const intent = o.intent('commission'),
      before = await h.inspect(h.FULL_DB_NAME),
      job = o.practice.start(intent);
    o.stopOwners();
    await job;
    return {
      before,
      after: await h.inspect(h.FULL_DB_NAME),
      activity: o.store.activity,
    };
  });
  expect(r.after).toEqual(r.before);
  expect(r.activity).toBeNull();
});

for (const mode of ['quota', 'abort', 'lost-reply'] as const)
  test(`first practice ${mode} keeps its one original finite START and pays only one real work cycle`, async ({
    page,
  }) => {
    const first = await page.evaluate(async (mode) => {
      const w = window as any,
        o = w.practiceOwners,
        h = w.h,
        proto = h.FullSaveRepository.prototype,
        original = proto.startScheduledActivity,
        put = IDBObjectStore.prototype.put;
      await o.practice.open();
      const intent = o.intent('commission'),
        before = await h.inspect(h.FULL_DB_NAME),
        game = structuredClone(o.store.game);
      let captured: any,
        committed: any,
        hit = false;
      w.practiceRestore = () => {
        proto.startScheduledActivity = original;
        IDBObjectStore.prototype.put = put;
      };
      proto.startScheduledActivity = async function (...args: any[]) {
        captured = structuredClone(args[1]);
        try {
          const result = await Reflect.apply(original, this, args);
          committed = result;
          if (mode === 'lost-reply')
            throw new w.practiceRuleError(
              'STORAGE_ABORTED',
              'lost practice response',
            );
          return result;
        } finally {
          proto.startScheduledActivity = original;
        }
      };
      if (mode !== 'lost-reply')
        IDBObjectStore.prototype.put = function (
          value: any,
          key?: IDBValidKey,
        ) {
          if (
            this.transaction.db.name === h.FULL_DB_NAME &&
            this.name === h.FULL_RECEIPT_STORE &&
            !hit
          ) {
            hit = true;
            IDBObjectStore.prototype.put = put;
            if (mode === 'quota')
              throw new DOMException('practice quota', 'QuotaExceededError');
            const request = put.call(this, value, key!);
            request.addEventListener('success', () => this.transaction.abort());
            return request;
          }
          return put.call(this, value, key!);
        };
      try {
        await o.practice.start(intent);
      } finally {
        w.practiceRestore();
      }
      const failed = await h.inspect(h.FULL_DB_NAME),
        error = o.store.error,
        retry = o.store.canRetry;
      await o.store.retryFor(captured.commandId);
      return {
        game,
        before,
        failed,
        error,
        retry,
        captured,
        committed,
        started: await o.fixture.persisted(),
        raw: await h.inspect(h.FULL_DB_NAME),
        hit,
      };
    }, mode);
    expect(first.retry).toBe(true);
    expect(first.error).not.toBe('');
    if (mode !== 'lost-reply') {
      expect(first.hit).toBe(true);
      expect(first.failed).toEqual(first.before);
    }
    expect(first.started.state).toEqual(first.game);
    expect(first.started.activity.plan.maxCycles).toBe(1);
    const starts = first.raw['full-receipts'].filter(
      (r: any) =>
        r.value.format === 'chenyuan-scheduled-receipt' &&
        r.value.input.kind === 'START',
    );
    expect(starts).toHaveLength(1);
    expect(starts[0].value.input.mutation).toEqual(first.captured);
    await page.clock.fastForward(first.started.activity.cycleMs - 1);
    expect(
      await page.evaluate(() => (window as any).practiceOwners.store.game),
    ).toEqual(first.game);
    await page.clock.fastForward(1);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).practiceOwners.store.activity?.completedCycles,
        ),
      )
      .toBe(1);
    const final = await page.evaluate(async () => {
      const w = window as any,
        o = w.practiceOwners;
      return {
        state: await o.fixture.persisted(),
        raw: await w.h.inspect(w.h.FULL_DB_NAME),
      };
    });
    expect(final.state.state.core.player.stones).toBe(
      first.game.core.player.stones + 20,
    );
    expect(final.state.state.core.world.elapsedMonths).toBe(
      first.game.core.world.elapsedMonths + 12,
    );
    expect(final.state.activity.status).toBe('stopped');
    expect(final.state.activity.completedCycles).toBe(1);
    expect(
      final.raw['full-receipts'].filter(
        (r: any) =>
          r.value.format === 'chenyuan-scheduled-receipt' &&
          r.value.input.kind === 'START',
      ),
    ).toHaveLength(1);
  });

test('a competing real START wins its activity CAS without the old practice replacing it or spending a cycle', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const w = window as any,
      o = w.practiceOwners,
      h = w.h;
    await o.practice.open();
    const intent = o.intent('commission'),
      proto = h.FullSaveRepository.prototype,
      original = proto.startScheduledActivity,
      peer = await h.FullSaveRepository.open();
    let peerRaw: any, peerActivity: any;
    proto.startScheduledActivity = async function (plan: any, mutation: any) {
      proto.startScheduledActivity = original;
      const rival = {
        ...mutation,
        commandId: peer.issueCommandId(),
        ownerId: 'q19-actual-peer',
      };
      const winner = await Reflect.apply(original, peer, [plan, rival]);
      peerActivity = winner.activity;
      peerRaw = await h.inspect(h.FULL_DB_NAME);
      return Reflect.apply(original, this, [plan, mutation]);
    };
    try {
      await o.practice.start(intent);
      return {
        peerRaw,
        peerActivity,
        after: await h.inspect(h.FULL_DB_NAME),
        error: o.store.error,
        game: o.store.game,
      };
    } finally {
      proto.startScheduledActivity = original;
      peer.close();
    }
  });
  expect(r.after).toEqual(r.peerRaw);
  expect(r.error).not.toBe('');
  const activity = r.after['full-state'].find(
    (r: any) => r.key === 'activity',
  ).value;
  expect(activity.id).toBe(r.peerActivity.id);
  expect(activity.ownerId).toBe('q19-actual-peer');
  expect(activity.completedCycles).toBe(0);
});

test('published v3 practice uses the real old source cost and timing while the repository keeps the old profile', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const w = window as any,
      o = w.practiceOwners,
      h = w.h,
      { practiceLesson } = await import('../src/first-practice');
    await o.practice.open();
    const lesson = practiceLesson(o.store.game, 'commission'),
      before = structuredClone(o.store.game);
    await o.practice.start(o.intent('commission'));
    return { before, lesson, started: await o.fixture.persisted() };
  });
  expect(r.started.state.core.contentVersion).toBe('full-demo.3');
  expect(r.started.state).toEqual(r.before);
  expect(r.started.activity.plan).toEqual(r.lesson.plan);
  expect(r.started.activity.cycleMs).toBe(r.lesson.quote.cycleMs);
  expect(r.lesson.plan.monthBudget).toBe(1);
  expect(r.lesson.plan.maxCycles).toBe(1);
});

test('an external paused activity change fences the old book and only a fresh explicit confirmation can replace it', async ({
  page,
}) => {
  const r = await page.evaluate(async () => {
    const w = window as any,
      o = w.practiceOwners,
      h = w.h,
      { practiceLesson } = await import('../src/first-practice');
    await o.practice.open();
    const old = o.intent('commission'),
      original = structuredClone(o.store.game),
      peer = await h.FullSaveRepository.open();
    try {
      const snap = await peer.loadActivitySnapshot(),
        mutation = {
          commandId: peer.issueCommandId(),
          runId: snap.state.core.runId,
          ownerId: 'q19-paused-peer',
          expectedRevision: snap.state.core.revision,
          expectedActivityId: null,
          expectedActivityRevision: null,
        };
      const started = await peer.startScheduledActivity(
        practiceLesson(snap.state, 'commission').plan,
        mutation,
      );
      const paused = await peer.pauseScheduledActivity({
        ...mutation,
        commandId: peer.issueCommandId(),
        expectedActivityId: started.activity.id,
        expectedActivityRevision: started.activity.revision,
      });
      await o.store.init();
      const before = await h.inspect(h.FULL_DB_NAME),
        blocked = o.practice.blocked.value;
      await o.practice.start(old);
      const after = await h.inspect(h.FULL_DB_NAME);
      o.dialog.close();
      await o.practice.open();
      const fresh = o.intent('commission');
      await o.practice.start(fresh);
      return {
        original,
        paused,
        before,
        after,
        blocked,
        replacement: await o.fixture.persisted(),
        raw: await h.inspect(h.FULL_DB_NAME),
      };
    } finally {
      peer.close();
    }
  });
  expect(r.after).toEqual(r.before);
  expect(r.blocked).toContain('原活动已变化');
  expect(r.replacement.state).toEqual(r.original);
  expect(r.replacement.activity.id).not.toBe(r.paused.activity.id);
  const start = r.raw['full-receipts'].find(
    (v: any) =>
      v.value.format === 'chenyuan-scheduled-receipt' &&
      v.value.input.kind === 'START' &&
      v.value.proof.recordAfter.activity.id === r.replacement.activity.id,
  ).value;
  expect(start.proof.activityBefore).toEqual(r.paused.activity);
  expect(r.replacement.activity.plan.maxCycles).toBe(1);
});
