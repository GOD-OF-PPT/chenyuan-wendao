import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await page.goto('/persistence-tests/harness.html');
  await page.evaluate(async () => {
    const local = await import('/src/local-experience.ts');
    const events = await import('/src/local-events.ts');
    const { useLocalExperience } = await import('/src/use-local-experience.ts');
    // Use the exact transformed Vue import used by the service, including Vite's query identity.
    const serviceSource = await (await fetch('/src/use-local-experience.ts')).text();
    const vueUrl = serviceSource.match(/from\s*["']([^"']*\/vue\.js(?:\?[^"']*)?)["']/)?.[1];
    if (!vueUrl) throw new Error('Cannot identify the service Vue module');
    const { effectScope } = await import(vueUrl);
    const { mountFaultApp } = await import('/persistence-tests/fault-app.ts');
    const restores: Array<() => void> = [], releases: Array<() => void> = [], disposes: Array<() => void> = [];
    const deferred = () => { let resolve!: (value?: any) => void; const promise = new Promise<any>(done => resolve = done); return { promise, resolve }; };
    const watched: any[] = [];
    function watch(repo: any) {
      const row = { repo, closes: 0 }, original = repo.close.bind(repo);
      repo.close = () => { row.closes++; original(); }; watched.push(row); return row;
    }
    function gate(kind: 'open' | 'meta') {
      const entered = deferred(), released = deferred(); releases.push(() => released.resolve());
      if (kind === 'open') {
        const original = local.LocalExperienceRepository.open;
        const restore = () => local.LocalExperienceRepository.open = original; restores.push(restore);
        local.LocalExperienceRepository.open = async (...args: any[]) => {
          restore(); const repo = await Reflect.apply(original, local.LocalExperienceRepository, args);
          watch(repo); entered.resolve(); const error = await released.promise; if (error) throw error; return repo;
        };
      } else {
        const original = local.LocalExperienceRepository.prototype.readMeta;
        const restore = () => local.LocalExperienceRepository.prototype.readMeta = original; restores.push(restore);
        local.LocalExperienceRepository.prototype.readMeta = async function(...args: any[]) {
          restore(); watch(this); const value = await Reflect.apply(original, this, args);
          entered.resolve(); const error = await released.promise; if (error) throw error; return value;
        };
      }
      return { entered: entered.promise, release: () => released.resolve(), fail: () => released.resolve(new local.LocalDataError('LOCAL_DENIED', 'late controlled failure')) };
    }
    const scopes = new Map<any, any>();
    function service() { const scope = effectScope(), value = scope.run(() => useLocalExperience())!; scopes.set(value, scope); disposes.push(() => scope.stop()); return value; }
    const state = (s: any) => ({ ready: s.ready.value, available: s.available.value, persisted: s.preferencesPersisted.value,
      preferences: { ...s.preferences.value }, count: s.count.value, status: s.status.value, pending: s.pending.value });
    (globalThis as any).boot = { ...local, ...events, deferred, gate, service, state, watched, watch, restores, dispose(s: any) { scopes.get(s)?.stop(); },
      async seed(preferences: any) { const r = await local.LocalExperienceRepository.open(), m = await r.readMeta(); await r.setPreferences({ commandId: crypto.randomUUID(), runId: m.epoch, expectedRevision: m.preferenceRevision }, preferences); r.close(); },
      mount() { const app = mountFaultApp(); disposes.push(() => app.dispose()); return app; },
      cleanup() { for (const restore of restores.reverse()) restore(); for (const release of releases) release(); for (const dispose of disposes.reverse()) dispose(); } };
  });
});
test.afterEach(async ({ page }) => { await page.evaluate(() => (globalThis as any).boot?.cleanup()); });

for (const kind of ['open', 'meta'] as const) test(`${kind}: optional local startup has one5000ms budget and cannot permanently block the actual Game App`, async ({ page }, info) => {
  await page.evaluate(async kind => {
    const h = (globalThis as any).boot; h.held = h.gate(kind); h.app = h.mount(); await h.held.entered;
  }, kind);
  await expect(page.getByTestId('local-data-status')).toHaveText('正在读取本地设置……');
  await expect(page.getByTestId('save-status')).toHaveText('读取中');
  await page.clock.runFor(4999);
  expect(await page.evaluate(() => (globalThis as any).boot.app.store.ready)).toBe(false);
  await page.clock.runFor(1);
  await expect(page.getByTestId('save-status')).toHaveText('尚无存档');
  const temporary = await page.evaluate(() => {
    const h = (globalThis as any).boot;
    return { ready: h.app.store.ready, game: h.app.store.game, available: h.app.store.available,
      recording: (document.querySelector('[data-testid=local-recording]') as HTMLInputElement).checked,
      status: document.querySelector('[data-testid=local-data-status]')?.textContent };
  });
  expect(temporary).toMatchObject({ ready: true, game: null, available: true, recording: false });
  expect(temporary.status).toMatch(/临时|默认/);
  await page.evaluate(() => (globalThis as any).boot.held.release());
  await expect.poll(() => page.evaluate(() => (globalThis as any).boot.watched.every((row: any) => row.repo.closed && row.closes > 0))).toBe(true);
  expect(await page.evaluate(() => (document.querySelector('[data-testid=local-recording]') as HTMLInputElement).checked)).toBe(false);
  expect(await page.evaluate(() => (globalThis as any).boot.app.store.game)).toBeNull();
  await info.attach('startup-boundary', { body: JSON.stringify({ kind, deadlineMs: 5000, temporary,
    scope: 'Single controlled method-delivery gate; native DB values, Game and game clocks are not altered. This does not identify the original native delay.' }), contentType: 'application/json' });
});

test('open and first read share the total budget, repeated init shares its Promise, late read cannot publish', async ({ page }) => {
  await page.evaluate(async () => { const h = (globalThis as any).boot; h.a = h.gate('open'); h.b = h.gate('meta'); h.s = h.service(); h.first = h.s.init(); h.same = h.first === h.s.init(); await h.a.entered; });
  await page.clock.runFor(4000);
  await page.evaluate(async () => { const h = (globalThis as any).boot; h.a.release(); await h.b.entered; });
  await page.clock.runFor(999);
  expect(await page.evaluate(() => (globalThis as any).boot.s.ready.value)).toBe(false);
  await page.clock.runFor(1);
  expect(await page.evaluate(async () => { const h = (globalThis as any).boot; await h.first; return { same: h.same, ...h.state(h.s) }; })).toMatchObject({ same: true, ready: true, available: false, persisted: false, count: null, preferences: { recording: false } });
  await page.evaluate(() => (globalThis as any).boot.b.release());
  await expect.poll(() => page.evaluate(() => (globalThis as any).boot.watched.every((r: any) => r.repo.closed))).toBe(true);
});

for (const kind of ['open', 'meta'] as const) test(`${kind}: edits during initial reading and before reconnect remain temporary until explicitly saved`, async ({ page }) => {
  await page.evaluate(async kind => { const h = (globalThis as any).boot; await h.seed({ fontScale: 1.5, reduceMotion: false, recording: false }); h.g = h.gate(kind); h.s = h.service(); h.starting = h.s.init(); await h.g.entered; await h.s.setPreferences({ fontScale: 2, reduceMotion: true }); h.g.release(); await h.starting; }, kind);
  expect(await page.evaluate(() => { const h = (globalThis as any).boot; return h.state(h.s); })).toMatchObject({ ready: true, available: true, persisted: false, count: 0, preferences: { fontScale: 2, reduceMotion: true, recording: false } });
  await page.evaluate(async () => { const h = (globalThis as any).boot; await h.s.reconnect(); });
  expect(await page.evaluate(() => { const h = (globalThis as any).boot; return h.state(h.s); })).toMatchObject({ ready: true, available: true, persisted: false, count: 0, preferences: { fontScale: 2, reduceMotion: true, recording: false } });
  await page.evaluate(async () => { const h = (globalThis as any).boot; await h.s.setPreferences({ ...h.s.preferences.value }); });
  expect(await page.evaluate(() => { const h = (globalThis as any).boot; return h.state(h.s); })).toMatchObject({ persisted: true, preferences: { fontScale: 2, reduceMotion: true, recording: false } });
});

test('reconnect supersedes a held old init; newer edits survive the reconnect read and older completion closes only itself', async ({ page }) => {
  await page.evaluate(async () => { const h = (globalThis as any).boot; await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.old = h.gate('open'); h.s = h.service(); h.initial = h.s.init(); await h.old.entered; h.fresh = h.gate('meta'); h.reconnecting = h.s.reconnect(); await h.fresh.entered; await h.s.setPreferences({ reduceMotion: true, recording: true }); h.fresh.release(); await h.reconnecting; h.old.release(); await h.initial; });
  expect(await page.evaluate(() => { const h = (globalThis as any).boot; return { state: h.state(h.s), oldClosed: h.watched[0].repo.closed, freshClosed: h.watched[1].repo.closed }; })).toMatchObject({ oldClosed: true, freshClosed: false, state: { ready: true, available: true, persisted: false, preferences: { reduceMotion: true, recording: true } } });
});

for (const kind of ['open', 'meta'] as const) test(`${kind}: disposing the scope prevents late preferences and channel resurrection`, async ({ page }) => {
  const result = await page.evaluate(async kind => { const h = (globalThis as any).boot; h.g = h.gate(kind); h.s = h.service(); h.starting = h.s.init(); await h.g.entered; h.dispose(h.s); const before = h.state(h.s); h.g.release(); await h.starting; return { before, after: h.state(h.s) }; }, kind);
  expect(result.after).toEqual(result.before);
  await expect.poll(() => page.evaluate(() => (globalThis as any).boot.watched.every((r: any) => r.repo.closed))).toBe(true);
});

test('an old held observation queue cannot block reconnect or publish into its new owner', async ({ page }) => {
  await page.evaluate(async () => { const h = (globalThis as any).boot; h.s = h.service(); await h.s.init(); await h.s.flush(); const original = h.LocalExperienceRepository.prototype.append; const entered = h.deferred(), release = h.deferred(); h.release = release.resolve; h.entered = entered.promise; h.LocalExperienceRepository.prototype.append = async function(...args: any[]) { h.LocalExperienceRepository.prototype.append = original; const value = await Reflect.apply(original, this, args); entered.resolve(); await release.promise; return value; }; h.s.record(h.sessionObservation()); h.oldQueue = h.s.flush(); await h.entered; await h.s.reconnect(); h.s.record(h.sessionObservation()); await h.s.flush(); h.before = h.state(h.s); h.release(); await h.oldQueue; });
  const result = await page.evaluate(() => { const h = (globalThis as any).boot; return { before: h.before, after: h.state(h.s) }; });
  expect(result.after).toEqual(result.before);
  expect(result.after).toMatchObject({ ready: true, available: true, persisted: true, pending: 0 });
});

test('versionchange revokes owner before a held preference failure, old broadcast and invalidation cannot touch the new connection', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot, channels: any[] = [], Original = globalThis.BroadcastChannel;
    (globalThis as any).BroadcastChannel = class { onmessage: any; closed = false; constructor() { channels.push(this); } postMessage() {} close() { this.closed = true; } };
    h.restores.push(() => (globalThis as any).BroadcastChannel = Original);
    h.s = h.service(); await h.s.init(); await h.s.flush(); const repo = h.watched.length ? h.watched[0].repo : null;
    const original = h.LocalExperienceRepository.prototype.setPreferences, entered = h.deferred(), release = h.deferred(); let old: any;
    h.LocalExperienceRepository.prototype.setPreferences = async function() { h.LocalExperienceRepository.prototype.setPreferences = original; old = this; entered.resolve(); await release.promise; throw new h.LocalDataError('LOCAL_DENIED', 'late old failure'); };
    h.writing = h.s.setPreferences({ reduceMotion: true }); await entered.promise;
    const oldChannel = channels[0], oldVersion = old.db.onversionchange; oldVersion(new Event('versionchange'));
    const invalidated = h.state(h.s); release.resolve(); await h.writing; const afterFailure = h.state(h.s);
    await h.s.reconnect(); await h.s.flush(); const afterReconnect = h.state(h.s); oldChannel.onmessage(new MessageEvent('message')); oldVersion(new Event('versionchange'));
    return { invalidated, afterFailure, afterReconnect, afterOldCallbacks: h.state(h.s), newChannelClosed: channels.at(-1).closed };
  });
  expect(result.invalidated).toMatchObject({ ready: true, available: false, persisted: false, count: null, preferences: { recording: false } });
  expect(result.afterFailure).toEqual(result.invalidated);
  expect(result.afterOldCallbacks).toEqual(result.afterReconnect);
  expect(result.newChannelClosed).toBe(false);
});

test('a same-connection old broadcast read failure cannot overwrite a later saved preference result', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot, channels: any[] = [], Original = globalThis.BroadcastChannel;
    (globalThis as any).BroadcastChannel = class { onmessage: any; constructor() { channels.push(this); } postMessage() {} close() {} };
    h.restores.push(() => (globalThis as any).BroadcastChannel = Original);
    await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const original = h.LocalExperienceRepository.prototype.readMeta, entered = h.deferred(), release = h.deferred(), finished = h.deferred();
    h.LocalExperienceRepository.prototype.readMeta = async function(...args: any[]) { h.LocalExperienceRepository.prototype.readMeta = original; await Reflect.apply(original, this, args); entered.resolve(); await release.promise; finished.resolve(); throw new h.LocalDataError('LOCAL_DENIED', 'late broadcast read failed'); };
    channels[0].onmessage(new MessageEvent('message')); await entered.promise; await h.s.setPreferences({ reduceMotion: true }); const before = h.state(h.s); release.resolve(); await finished.promise; await Promise.resolve(); return { before, after: h.state(h.s) };
  });
  expect(result.before).toMatchObject({ persisted: true, available: true, preferences: { reduceMotion: true, recording: false } });
  expect(result.after).toEqual(result.before);
});

test('cancelling an active native readonly transaction aborts it and cleans the abort listener without mutating metadata', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot, repo = await h.LocalExperienceRepository.open('startup-native-cancel'), before = await repo.readMeta(), controller = new AbortController(), original = IDBDatabase.prototype.transaction;
    let aborts = 0, adds = 0, removes = 0; const add = controller.signal.addEventListener.bind(controller.signal), remove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener = (...args: any[]) => { adds++; return Reflect.apply(add, null, args); };
    controller.signal.removeEventListener = (...args: any[]) => { removes++; return Reflect.apply(remove, null, args); };
    IDBDatabase.prototype.transaction = function(...args: any[]) { const tx = Reflect.apply(original, this, args); if (this.name === 'startup-native-cancel' && args[1] === 'readonly') { IDBDatabase.prototype.transaction = original; tx.addEventListener('abort', () => aborts++); queueMicrotask(() => controller.abort()); } return tx; };
    let code: any; try { await repo.readMeta(controller.signal); } catch (e: any) { code = e.code; } finally { IDBDatabase.prototype.transaction = original; }
    const after = await repo.readMeta(); repo.close(); return { before, after, code, aborts, adds, removes };
  });
  expect(result).toMatchObject({ code: 'LOCAL_ABORTED', aborts: 1, adds: 1, removes: 1 });
  expect(result.after).toEqual(result.before);
});

for (const kind of ['open', 'meta'] as const) test(`${kind}: late failed delivery after timeout cannot overwrite a new explicit temporary edit`, async ({ page }) => {
  await page.evaluate(async kind => { const h = (globalThis as any).boot; h.g = h.gate(kind); h.s = h.service(); h.starting = h.s.init(); await h.g.entered; }, kind);
  await page.clock.runFor(5000);
  const result = await page.evaluate(async () => { const h = (globalThis as any).boot; await h.starting; await h.s.setPreferences({ reduceMotion: true, recording: true }); const before = h.state(h.s); h.g.fail(); await Promise.resolve(); await Promise.resolve(); return { before, after: h.state(h.s) }; });
  expect(result.before).toMatchObject({ ready: true, available: false, persisted: false, count: null, preferences: { reduceMotion: true, recording: true } });
  expect(result.after).toEqual(result.before);
});

test('pre-aborted repository open and readonly calls never start a native operation', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot, controller = new AbortController(); controller.abort();
    const open = indexedDB.open.bind(indexedDB); let opens = 0; indexedDB.open = (...args: any[]) => { opens++; return Reflect.apply(open, null, args); };
    let openCode: any; try { await h.LocalExperienceRepository.open('pre-aborted', undefined, controller.signal); } catch (e: any) { openCode = e.code; } finally { indexedDB.open = open; }
    const repo = await h.LocalExperienceRepository.open('pre-aborted-read'), transaction = IDBDatabase.prototype.transaction; let transactions = 0;
    IDBDatabase.prototype.transaction = function(...args: any[]) { transactions++; return Reflect.apply(transaction, this, args); };
    let readCode: any; try { await repo.readMeta(controller.signal); } catch (e: any) { readCode = e.code; } finally { IDBDatabase.prototype.transaction = transaction; repo.close(); }
    return { opens, transactions, openCode, readCode };
  });
  expect(result).toEqual({ opens: 0, transactions: 0, openCode: 'LOCAL_ABORTED', readCode: 'LOCAL_ABORTED' });
});

test('native open cancellation closes a held late success and does not deliver a repository', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot, entered = h.deferred(), release = h.deferred(), controller = new AbortController(), open = indexedDB.open.bind(indexedDB), descriptor = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess')!, close = IDBDatabase.prototype.close;
    let closes = 0; IDBDatabase.prototype.close = function() { if (this.name === 'native-open-late') closes++; return close.call(this); };
    indexedDB.open = (...args: any[]) => { const request = Reflect.apply(open, null, args); indexedDB.open = open; Object.defineProperty(request, 'onsuccess', { configurable: true, set(handler) { descriptor.set!.call(request, async (event: Event) => { entered.resolve(); await release.promise; handler.call(request, event); }); } }); return request; };
    const pending = h.LocalExperienceRepository.open('native-open-late', undefined, controller.signal).then(() => 'delivered', (e: any) => e.code);
    await entered.promise; controller.abort(); const code = await pending; release.resolve(); await Promise.resolve(); await Promise.resolve(); IDBDatabase.prototype.close = close; indexedDB.open = open; return { code, closes };
  });
  expect(result).toEqual({ code: 'LOCAL_ABORTED', closes: 1 });
});

test('cancellation at native upgrade aborts the upgrade instead of committing fresh metadata', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot, controller = new AbortController(), open = indexedDB.open.bind(indexedDB), complete = h.deferred(); let aborted = 0;
    indexedDB.open = (...args: any[]) => { const request = Reflect.apply(open, null, args); indexedDB.open = open; request.addEventListener('upgradeneeded', () => { request.transaction!.addEventListener('abort', () => aborted++); controller.abort(); }); request.addEventListener('error', () => complete.resolve()); return request; };
    const code = await h.LocalExperienceRepository.open('native-upgrade-aborted', undefined, controller.signal).then(() => 'delivered', (e: any) => e.code); await complete.promise;
    const databases = await indexedDB.databases(); return { code, aborted, committed: databases.some(d => d.name === 'native-upgrade-aborted' && d.version === 1) };
  });
  expect(result).toEqual({ code: 'LOCAL_ABORTED', aborted: 1, committed: false });
});

test('an old observation write failure cannot relabel newer saved preferences as temporary', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot; h.s = h.service(); await h.s.init(); await h.s.flush();
    const original = h.LocalExperienceRepository.prototype.append, entered = h.deferred(), release = h.deferred();
    h.LocalExperienceRepository.prototype.append = async function() { h.LocalExperienceRepository.prototype.append = original; entered.resolve(); await release.promise; throw new h.LocalDataError('LOCAL_QUOTA', 'late old observation failed'); };
    h.s.record(h.sessionObservation()); const old = h.s.flush(); await entered.promise; await h.s.setPreferences({ reduceMotion: true }); const before = h.state(h.s); release.resolve(); await old; return { before, after: h.state(h.s) };
  });
  expect(result.before).toMatchObject({ available: true, persisted: true, preferences: { reduceMotion: true, recording: true } });
  expect(result.after).toEqual({ ...result.before, pending: 0 });
});

test('clearing records after a reconnect preserves unconfirmed temporary display choices', async ({ page }) => {
  await page.evaluate(async () => { const h = (globalThis as any).boot; await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.g = h.gate('meta'); h.s = h.service(); h.starting = h.s.init(); await h.g.entered; });
  await page.clock.runFor(5000);
  const result = await page.evaluate(async () => { const h = (globalThis as any).boot; await h.starting; await h.s.setPreferences({ reduceMotion: true }); await h.s.reconnect(); const before = h.state(h.s); await h.s.clear(); const after = h.state(h.s), repo = await h.LocalExperienceRepository.open(), saved = await repo.readMeta(); repo.close(); h.g.release(); return { before, after, saved }; });
  expect(result.before).toMatchObject({ available: true, persisted: false, preferences: { reduceMotion: true, recording: false } });
  expect(result.after).toMatchObject({ available: true, persisted: false, count: 0, preferences: result.before.preferences });
  expect(result.saved.preferences).toEqual({ fontScale: 1, reduceMotion: false, recording: false });
});

test('a delayed settings success uses newer already-read foreign preferences rather than falsely marking old choices saved', async ({ page }) => {
  await page.evaluate(async () => {
    const h = (globalThis as any).boot, Original = globalThis.BroadcastChannel; h.channels = [];
    (globalThis as any).BroadcastChannel = class { onmessage: any; constructor() { h.channels.push(this); } postMessage() {} close() {} }; h.restores.push(() => (globalThis as any).BroadcastChannel = Original);
    await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const original = h.LocalExperienceRepository.prototype.setPreferences, entered = h.deferred(), release = h.deferred(); h.release = release.resolve;
    h.LocalExperienceRepository.prototype.setPreferences = async function(...args: any[]) { h.LocalExperienceRepository.prototype.setPreferences = original; const value = await Reflect.apply(original, this, args); entered.resolve(); await release.promise; return value; };
    h.writing = h.s.setPreferences({ reduceMotion: true }); await entered.promise;
    const foreign = await h.LocalExperienceRepository.open(), meta = await foreign.readMeta(); h.foreign = { fontScale: 1.5, reduceMotion: false, recording: true };
    const changed = await foreign.setPreferences({ commandId: crypto.randomUUID(), runId: meta.epoch, expectedRevision: meta.preferenceRevision }, h.foreign), row = { id: crypto.randomUUID(), sessionId: crypto.randomUUID(), elapsedMs: 1, seed: null, observation: h.sessionObservation() };
    await foreign.append(row, { commandId: row.id, runId: changed.epoch, expectedRevision: changed.controlRevision }); foreign.close(); h.channels[0].onmessage(new MessageEvent('message'));
  });
  await expect.poll(() => page.evaluate(() => (globalThis as any).boot.s.count.value)).toBe(1);
  const result = await page.evaluate(async () => { const h = (globalThis as any).boot; h.release(); await h.writing; return { state: h.state(h.s), foreign: h.foreign }; });
  expect(result.state).toMatchObject({ persisted: true, available: true, preferences: result.foreign });
  expect(result.state.status).toMatch(/另一页面|外部/);
});

test('a late record list failure cannot cover the result of a newer saved settings edit', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot; await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const original = h.LocalExperienceRepository.prototype.list, entered = h.deferred(), release = h.deferred();
    h.LocalExperienceRepository.prototype.list = async function() { h.LocalExperienceRepository.prototype.list = original; entered.resolve(); await release.promise; throw new h.LocalDataError('LOCAL_DENIED', 'late old listing failed'); };
    const listing = h.s.showRecords(); await entered.promise; await h.s.setPreferences({ reduceMotion: true }); const before = h.state(h.s); release.resolve(); await listing; return { before, after: h.state(h.s) };
  });
  expect(result.before).toMatchObject({ available: true, persisted: true, preferences: { reduceMotion: true } });
  expect(result.after).toEqual(result.before);
});

test('a held old record list success cannot resurrect entries after an atomic clear', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot; h.s = h.service(); await h.s.init(); await h.s.flush();
    const original = h.LocalExperienceRepository.prototype.list, entered = h.deferred(), release = h.deferred();
    h.LocalExperienceRepository.prototype.list = async function(...args: any[]) { h.LocalExperienceRepository.prototype.list = original; const value = await Reflect.apply(original, this, args); entered.resolve(value.entries.length); await release.promise; return value; };
    const listing = h.s.showRecords(), captured = await entered.promise; await h.s.clear(); const afterClear = { state: h.state(h.s), listing: structuredClone(h.s.listing.value) }; release.resolve(); await listing;
    return { captured, afterClear, afterLate: { state: h.state(h.s), listing: structuredClone(h.s.listing.value) } };
  });
  expect(result.captured).toBeGreaterThan(0);
  expect(result.afterClear.listing).toEqual([]);
  expect(result.afterLate).toEqual(result.afterClear);
});

test('a held older broadcast failure cannot overwrite a newer same-edit read success', async ({ page }) => {
  await page.evaluate(async () => {
    const h = (globalThis as any).boot, Original = globalThis.BroadcastChannel; h.channels = [];
    (globalThis as any).BroadcastChannel = class { onmessage: any; constructor() { h.channels.push(this); } postMessage() {} close() {} }; h.restores.push(() => (globalThis as any).BroadcastChannel = Original);
    h.s = h.service(); await h.s.init(); await h.s.flush();
    const original = h.LocalExperienceRepository.prototype.readMeta, entered = h.deferred(), release = h.deferred(), finished = h.deferred(); h.release = release.resolve; h.finished = finished.promise;
    h.LocalExperienceRepository.prototype.readMeta = async function(...args: any[]) { h.LocalExperienceRepository.prototype.readMeta = original; await Reflect.apply(original, this, args); entered.resolve(); await release.promise; finished.resolve(); throw new h.LocalDataError('LOCAL_DENIED', 'older read failed late'); };
    h.channels[0].onmessage(new MessageEvent('message')); await entered.promise;
    const foreign = await h.LocalExperienceRepository.open(), meta = await foreign.readMeta(), row = { id: crypto.randomUUID(), sessionId: crypto.randomUUID(), elapsedMs: 1, seed: null, observation: h.sessionObservation() };
    await foreign.append(row, { commandId: row.id, runId: meta.epoch, expectedRevision: meta.controlRevision }); foreign.close(); h.channels[0].onmessage(new MessageEvent('message'));
  });
  await expect.poll(() => page.evaluate(() => (globalThis as any).boot.s.count.value)).toBe(2);
  const result = await page.evaluate(async () => { const h = (globalThis as any).boot, before = h.state(h.s); h.release(); await h.finished; await Promise.resolve(); return { before, after: h.state(h.s) }; });
  expect(result.before).toMatchObject({ available: true, persisted: true, count: 2 });
  expect(result.after).toEqual(result.before);
});

for (const outcome of ['newer-preview', 'cancel'] as const) test(`held export ${outcome}: an obsolete read cannot replace or reopen the latest preview`, async ({ page }) => {
  const result = await page.evaluate(async outcome => {
    const h = (globalThis as any).boot; await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    await h.s.prepareExport({ runId: crypto.randomUUID(), target: { kind: 'breakthrough' } });
    const original = h.LocalExperienceRepository.prototype.dump, entered = h.deferred(), release = h.deferred();
    h.LocalExperienceRepository.prototype.dump = async function(...args: any[]) { h.LocalExperienceRepository.prototype.dump = original; const value = await Reflect.apply(original, this, args); entered.resolve(); await release.promise; return value; };
    const old = h.s.prepareExport({ runId: crypto.randomUUID(), target: { kind: 'breakthrough' } }).then(() => ({ ok: true }), (e: any) => ({ ok: false, code: e.code })); await entered.promise;
    if (outcome === 'newer-preview') await h.s.prepareExport({ runId: crypto.randomUUID(), target: { kind: 'breakthrough' } }); else h.s.prepared.value = null;
    const latest = structuredClone(h.s.prepared.value); release.resolve(); const oldResult = await old; return { oldResult, latest, after: structuredClone(h.s.prepared.value) };
  }, outcome);
  expect(result.oldResult).toEqual({ ok: false, code: 'LOCAL_STALE' });
  expect(result.after).toEqual(result.latest);
});

test('a delayed clear success applies newer read foreign preferences only when the display choices were saved', async ({ page }) => {
  await page.evaluate(async () => {
    const h = (globalThis as any).boot, Original = globalThis.BroadcastChannel; h.channels = [];
    (globalThis as any).BroadcastChannel = class { onmessage: any; constructor() { h.channels.push(this); } postMessage() {} close() {} }; h.restores.push(() => (globalThis as any).BroadcastChannel = Original);
    await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const original = h.LocalExperienceRepository.prototype.clear, entered = h.deferred(), release = h.deferred(); h.release = release.resolve;
    h.LocalExperienceRepository.prototype.clear = async function(...args: any[]) { h.LocalExperienceRepository.prototype.clear = original; const value = await Reflect.apply(original, this, args); entered.resolve(); await release.promise; return value; };
    h.clearing = h.s.clear(); await entered.promise;
    const foreign = await h.LocalExperienceRepository.open(), meta = await foreign.readMeta(); h.foreign = { fontScale: 1.5, reduceMotion: true, recording: true };
    const changed = await foreign.setPreferences({ commandId: crypto.randomUUID(), runId: meta.epoch, expectedRevision: meta.preferenceRevision }, h.foreign), row = { id: crypto.randomUUID(), sessionId: crypto.randomUUID(), elapsedMs: 1, seed: null, observation: h.sessionObservation() };
    await foreign.append(row, { commandId: row.id, runId: changed.epoch, expectedRevision: changed.controlRevision }); foreign.close(); h.channels[0].onmessage(new MessageEvent('message'));
  });
  await expect.poll(() => page.evaluate(() => (globalThis as any).boot.s.count.value)).toBe(1);
  const result = await page.evaluate(async () => { const h = (globalThis as any).boot; h.release(); await h.clearing; return { state: h.state(h.s), foreign: h.foreign }; });
  expect(result.state).toMatchObject({ persisted: true, available: true, preferences: result.foreign, count: 1 });
});

test('a held conflict reread cannot release the busy state or publish over a newer clear operation', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot; await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const foreign = await h.LocalExperienceRepository.open(), meta = await foreign.readMeta(); await foreign.setPreferences({ commandId: crypto.randomUUID(), runId: meta.epoch, expectedRevision: meta.preferenceRevision }, { fontScale: 1.5, reduceMotion: false, recording: false }); foreign.close();
    const read = h.LocalExperienceRepository.prototype.readMeta, readEntered = h.deferred(), readRelease = h.deferred();
    h.LocalExperienceRepository.prototype.readMeta = async function(...args: any[]) { h.LocalExperienceRepository.prototype.readMeta = read; const value = await Reflect.apply(read, this, args); readEntered.resolve(); await readRelease.promise; return value; };
    const writing = h.s.setPreferences({ reduceMotion: true }); await readEntered.promise;
    const clear = h.LocalExperienceRepository.prototype.clear, clearEntered = h.deferred(), clearRelease = h.deferred();
    h.LocalExperienceRepository.prototype.clear = async function(...args: any[]) { h.LocalExperienceRepository.prototype.clear = clear; let error: any; try { await Reflect.apply(clear, this, args); } catch (e) { error = e; } clearEntered.resolve(); await clearRelease.promise; if (error) throw error; };
    const clearing = h.s.clear(); await clearEntered.promise; const before = { ...h.state(h.s), busy: h.s.busy.value }; readRelease.resolve(); await writing; const afterOld = { ...h.state(h.s), busy: h.s.busy.value }; clearRelease.resolve(); await clearing; return { before, afterOld };
  });
  expect(result.before.busy).toBe(true);
  expect(result.afterOld).toEqual(result.before);
});

test('clearing temporary observations invalidates a held conflict reread without replacing the clear feedback', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot; await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const foreign = await h.LocalExperienceRepository.open(), meta = await foreign.readMeta(); await foreign.setPreferences({ commandId: crypto.randomUUID(), runId: meta.epoch, expectedRevision: meta.preferenceRevision }, { fontScale: 1.5, reduceMotion: false, recording: false }); foreign.close();
    const read = h.LocalExperienceRepository.prototype.readMeta, entered = h.deferred(), release = h.deferred();
    h.LocalExperienceRepository.prototype.readMeta = async function(...args: any[]) { h.LocalExperienceRepository.prototype.readMeta = read; const value = await Reflect.apply(read, this, args); entered.resolve(); await release.promise; return value; };
    const writing = h.s.setPreferences({ reduceMotion: true }); await entered.promise; h.s.clearMemory(); const before = h.state(h.s); release.resolve(); await writing; return { before, after: h.state(h.s), busy: h.s.busy.value };
  });
  expect(result.after).toEqual(result.before);
  expect(result.busy).toBe(false);
});

test('a held settings-conflict recovery read cannot block explicit reconnect indefinitely', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot; await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const foreign = await h.LocalExperienceRepository.open(), meta = await foreign.readMeta(); await foreign.setPreferences({ commandId: crypto.randomUUID(), runId: meta.epoch, expectedRevision: meta.preferenceRevision }, { fontScale: 1.5, reduceMotion: false, recording: false }); foreign.close();
    h.g = h.gate('meta'); const writing = h.s.setPreferences({ reduceMotion: true }); await h.g.entered; await h.s.reconnect(); const beforeLate = { ...h.state(h.s), busy: h.s.busy.value, oldClosed: h.watched[0].repo.closed }; h.g.release(); await writing;
    return { beforeLate, afterLate: { ...h.state(h.s), busy: h.s.busy.value, oldClosed: h.watched[0].repo.closed } };
  });
  expect(result.beforeLate).toMatchObject({ ready: true, available: true, persisted: false, busy: false, oldClosed: true, preferences: { reduceMotion: true } });
  expect(result.afterLate).toEqual(result.beforeLate);
});

test('a conflict recovery read shares metadata request ownership with newer successful broadcasts', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).boot, Original = globalThis.BroadcastChannel; h.channels = [];
    (globalThis as any).BroadcastChannel = class { onmessage: any; constructor() { h.channels.push(this); } postMessage() {} close() {} }; h.restores.push(() => (globalThis as any).BroadcastChannel = Original);
    await h.seed({ fontScale: 1, reduceMotion: false, recording: false }); h.s = h.service(); await h.s.init();
    const foreign = await h.LocalExperienceRepository.open(), meta = await foreign.readMeta(); await foreign.setPreferences({ commandId: crypto.randomUUID(), runId: meta.epoch, expectedRevision: meta.preferenceRevision }, { fontScale: 1.5, reduceMotion: false, recording: false }); foreign.close();
    const read = h.LocalExperienceRepository.prototype.readMeta, entered = h.deferred(), release = h.deferred();
    h.LocalExperienceRepository.prototype.readMeta = async function(...args: any[]) { h.LocalExperienceRepository.prototype.readMeta = read; await Reflect.apply(read, this, args); entered.resolve(); await release.promise; throw new h.LocalDataError('LOCAL_DENIED', 'obsolete conflict reread failed'); };
    const writing = h.s.setPreferences({ reduceMotion: true }); await entered.promise;
    const fresh = h.deferred(); h.LocalExperienceRepository.prototype.readMeta = async function(...args: any[]) { h.LocalExperienceRepository.prototype.readMeta = read; const value = await Reflect.apply(read, this, args); fresh.resolve(); return value; };
    h.channels[0].onmessage(new MessageEvent('message')); await fresh.promise; await Promise.resolve(); const before = h.state(h.s); release.resolve(); await writing; return { before, after: h.state(h.s) };
  });
  expect(result.before).toMatchObject({ available: true, persisted: false, preferences: { reduceMotion: true } });
  expect(result.after).toEqual(result.before);
});
