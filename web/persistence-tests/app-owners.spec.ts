import {confirmedDelivery} from './support';
import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';

test.use({ viewport: { width: 1440, height: 900 } });
test.beforeEach(async ({ page }, info) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await setupPersistence(page);
  await page.evaluate(async (adventure) => {
    const w = window as any,
      d = w.h.routes.driver();
    d.go(adventure ? 'wilderness' : 'sect');
    const module = await import('/persistence-tests/app-owners-harness.ts');
    w.ownersModule = module;
    w.owners = await module.createOwners(d.game);
  }, info.title.includes('accepted adventure'));
});
test.afterEach(async ({ page }) => {
  if (!page.isClosed())
    await page.evaluate(() => (window as any).owners?.dispose());
});

test('a file read finishing after its owner unmounts cannot ask for consent or import', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h;
    const before = await h.inspect(h.FULL_DB_NAME),
      gate = w.ownersModule.deferred();
    const file = new File([JSON.stringify(o.store.game)], 'late.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: () => gate.promise });
    const input = document.createElement('input');
    input.type = 'file';
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    const job = o.saves.importFile({ target: input });
    o.stopOwners();
    gate.resolve(JSON.stringify(o.store.game));
    await job;
    return {
      before,
      after: await h.inspect(h.FULL_DB_NAME),
      request: o.confirmation.request.value,
      notice: o.saves.importNotice.value,
      calls: o.calls,
      input: input.value,
    };
  });
  expect(result.after).toEqual(result.before);
  expect(result.request).toBeNull();
  expect(result.calls).toEqual([]);
  expect(result.notice).toBe('');
  expect(result.input).toBe('');
});

test('unmount cancels an unanswered restart without a replacement life or control receipt', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      before = await h.inspect(h.FULL_DB_NAME);
    const job = o.saves.reset(),
      kind = o.confirmation.request.value?.kind;
    o.stopOwners();
    await job;
    return {
      before,
      after: await h.inspect(h.FULL_DB_NAME),
      kind,
      calls: o.calls,
      request: o.confirmation.request.value,
    };
  });
  expect(result.kind).toBe('restart');
  expect(result.request).toBeNull();
  expect(result.after).toEqual(result.before);
  expect(result.calls).toEqual([]);
});

test('a committed configuration reply arriving after disposal cannot mutate the old comparison owner', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      gate = w.ownersModule.deferred(),
      entered = w.ownersModule.deferred();
    const proto = h.FullSaveRepository.prototype,
      original = proto.configure;
    proto.configure = async function (...args: any[]) {
      proto.configure = original;
      const value = await Reflect.apply(original, this, args);
      w.q15OwnerDelivery=structuredClone(args[0]?.command??args[1]);
      entered.resolve();
      await gate.promise;
      return value;
    };
    o.configuration.inspectConfiguration({
      type: 'SCHOOL',
      school: 'talisman',
    });
    const intent = structuredClone(o.configuration.configurationIntent.value);
    const job = o.configuration.confirmConfiguration();
    await entered.promise;
    const committed = await h.inspect(h.FULL_DB_NAME);
    o.stopOwners();
    gate.resolve();
    await job;
    return {
      intent,
      oldIntent: o.configuration.configurationIntent.value,
      committed,
      delivery:w.q15OwnerDelivery,
      after: await h.inspect(h.FULL_DB_NAME),
      game: o.store.game,
      calls: o.calls,
    };
  });
  expect(result.game.school).toBe('talisman');
  expect(result.oldIntent).toEqual(result.intent);
  expect(result.after).toEqual(confirmedDelivery(result.committed,result.delivery));
  expect(result.calls).toEqual([]);
  const receipts = result.after['full-receipts'].filter(
    (r: any) => r.value.format === 'chenyuan-configuration-receipt',
  );
  expect(receipts).toHaveLength(1);
  expect(receipts[0].value.intent).toEqual(result.intent);
});

test('a genuinely committed visit delivered after unmount preserves its one result without opening an old dialogue', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      gate = w.ownersModule.deferred(),
      entered = w.ownersModule.deferred();
    const proto = h.FullSaveRepository.prototype,
      original = proto.executeDirect;
    proto.executeDirect = async function (...args: any[]) {
      proto.executeDirect = original;
      const value = await Reflect.apply(original, this, args);
      w.q15OwnerDelivery=structuredClone(args[0]?.command??args[1]);
      entered.resolve();
      await gate.promise;
      return value;
    };
    const before = structuredClone(o.store.game),
      job = o.direct.storyAct({ type: 'EVENT', event: 'lu_intro' });
    const kind = o.confirmation.request.value?.kind;
    o.confirmation.answer(true);
    await entered.promise;
    const committed = await h.inspect(h.FULL_DB_NAME);
    o.stopOwners();
    gate.resolve();
    await job;
    return {
      before,
      kind,
      committed,
      delivery:w.q15OwnerDelivery,
      after: await h.inspect(h.FULL_DB_NAME),
      game: o.store.game,
      calls: o.calls,
    };
  });
  expect(result.kind).toBe('light-action');
  expect(result.game.core.activeEvent.id).toBe('lu_intro');
  expect(result.game.core.revision).toBe(result.before.core.revision + 1);
  expect(result.after).toEqual(confirmedDelivery(result.committed,result.delivery));
  expect(result.calls).toEqual([]);
});

test('an accepted adventure reply cannot navigate after its plan owner unmounts', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      gate = w.ownersModule.deferred(),
      entered = w.ownersModule.deferred();
    const proto = h.FullSaveRepository.prototype,
      original = proto.startScheduledActivity;
    proto.startScheduledActivity = async function (...args: any[]) {
      proto.startScheduledActivity = original;
      const value = await Reflect.apply(original, this, args);
      w.q15OwnerDelivery=structuredClone(args[0]?.command??args[1]);
      entered.resolve();
      await gate.promise;
      return value;
    };
    o.navigation.hubView.value = 'explore';
    const plan = {
      ...h.adventure.defaultEncounterPlan(o.store.game, 'wolf'),
      maxCycles: 1,
    };
    const job = o.plans.startAdventure(plan);
    await entered.promise;
    const committed = await h.inspect(h.FULL_DB_NAME);
    o.stopOwners();
    gate.resolve();
    await job;
    return {
      committed,
      delivery:w.q15OwnerDelivery,
      after: await h.inspect(h.FULL_DB_NAME),
      view: o.navigation.hubView.value,
      calls: o.calls,
    };
  });
  expect(result.view).toBe('explore');
  expect(result.calls).toEqual([]);
  expect(result.after).toEqual(confirmedDelivery(result.committed,result.delivery));
});

test('a destination callback queued before unmount cannot touch a replacement screen', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      before = await h.inspect(h.FULL_DB_NAME);
    let arrived = 0;
    const target = document.createElement('button');
    target.dataset.testid = 'replacement-destination';
    target.textContent = '新的页面';
    document.body.append(target);
    const job = o.destinations.navigate(
      { location: 'sect', tab: '历练', focusId: target.dataset.testid },
      () => arrived++,
    );
    o.stopOwners();
    await job;
    return {
      arrived,
      focused: document.activeElement === target,
      before,
      after: await h.inspect(h.FULL_DB_NAME),
    };
  });
  expect(result.arrived).toBe(0);
  expect(result.focused).toBe(false);
  expect(result.after).toEqual(result.before);
});

test('a committed closure start reply delivered after unmount cannot hand focus to the old life', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      gate = w.ownersModule.deferred(),
      entered = w.ownersModule.deferred();
    const proto = h.FullSaveRepository.prototype,
      original = proto.startScheduledActivity;
    proto.startScheduledActivity = async function (...args: any[]) {
      proto.startScheduledActivity = original;
      const value = await Reflect.apply(original, this, args);
      w.q15OwnerDelivery=structuredClone(args[0]?.command??args[1]);
      entered.resolve();
      await gate.promise;
      return value;
    };
    w.ownerGate = { gate, entered };
    await o.closure.value.requestEnd('RETIRE');
  });
  await expect(page.getByTestId('life-confirmation')).toBeVisible();
  await page.getByTestId('life-confirm-end').click();
  const committed = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h;
    await w.ownerGate.entered.promise;
    const committed = await h.inspect(h.FULL_DB_NAME);
    o.stopOwners();
    w.ownerGate.gate.resolve();
    return committed;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).owners.store.busy))
    .toBe(false);
  const result = await page.evaluate(async () => {
    const w = window as any;
    return {
      after: await w.h.inspect(w.h.FULL_DB_NAME),
      delivery:w.q15OwnerDelivery,
      calls: w.owners.calls,
      dialogs: document.querySelectorAll('dialog[open]').length,
    };
  });
  expect(result.after).toEqual(confirmedDelivery(committed,result.delivery));
  expect(result.calls).toEqual([]);
  expect(result.dialogs).toBe(0);
});

test('a route continuation queued before unmount cannot focus another mounted screen', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      before = await h.inspect(h.FULL_DB_NAME);
    const target = document.createElement('button');
    target.id = 'feature-title';
    target.textContent = '新页面';
    document.body.append(target);
    const job = o.navigation.openHub('goal');
    o.stopOwners();
    await job;
    return {
      focused: document.activeElement === target,
      before,
      after: await h.inspect(h.FULL_DB_NAME),
    };
  });
  expect(result.focused).toBe(false);
  expect(result.after).toEqual(result.before);
});

test('a deferred public content-focus callback becomes inert after its owner is disposed', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      before = await h.inspect(h.FULL_DB_NAME);
    const job = Promise.resolve().then(() => o.stageFocus.focusContent());
    o.stopOwners();
    const replacement = document.createElement('button');
    replacement.id = 'welcome-content';
    replacement.textContent = '另一页面';
    document.body.append(replacement);
    await job;
    return {
      focused: document.activeElement === replacement,
      before,
      after: await h.inspect(h.FULL_DB_NAME),
    };
  });
  expect(result.focused).toBe(false);
  expect(result.after).toEqual(result.before);
});

test('unmounting a failed closure keeps its original retry after the native close event', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h,
      proto = h.FullSaveRepository.prototype,
      original = proto.startScheduledActivity;
    proto.startScheduledActivity = async function (...args: any[]) {
      proto.startScheduledActivity = original;
      w.ownerFailed = args[1];
      throw new w.ownersModule.RuleError(
        'STORAGE_ABORTED',
        'deliberate closure delivery failure',
      );
    };
    await o.closure.value.requestEnd('RETIRE');
  });
  await page.getByTestId('life-confirm-end').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).owners.store.error))
    .not.toBe('');
  const before = await page.evaluate(async () => {
    const w = window as any,
      o = w.owners,
      h = w.h;
    const dialog = document.querySelector('[data-testid=life-confirmation]')!;
    w.ownerNativeClose = false;
    dialog.addEventListener(
      'close',
      (event) => {
        w.ownerNativeClose = event.isTrusted;
      },
      { once: true },
    );
    const retry = o.store.canRetryFor(w.ownerFailed.commandId),
      raw = await h.inspect(h.FULL_DB_NAME);
    o.stopOwners();
    return { retry, raw };
  });
  expect(before.retry).toBe(true);
  await expect
    .poll(() => page.evaluate(() => (window as any).ownerNativeClose))
    .toBe(true);
  const after = await page.evaluate(async () => {
    const w = window as any;
    return {
      retry: w.owners.store.canRetryFor(w.ownerFailed.commandId),
      raw: await w.h.inspect(w.h.FULL_DB_NAME),
    };
  });
  expect(after.raw).toEqual(before.raw);
  expect(after.retry).toBe(true);
});
