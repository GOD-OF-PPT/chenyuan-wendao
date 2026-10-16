import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));

export async function setupPersistence(page: Page) {
  await page.goto('/persistence-tests/harness.html');
  await page.evaluate(async (root) => {
    const persistence = await import('/src/full-persistence.ts');
    const engine = await import(`/@fs${root}src/full/engine.ts`);
    const queries = await import(`/@fs${root}src/full/queries.ts`);
    const legacy = await import(`/@fs${root}src/game/adventure.ts`);
    const routes = await import(`/@fs${root}tests/full-route.mjs`);
    const seed = async (name: string, current: unknown, previous?: unknown, checkpoint?: unknown) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(name, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore('state'); req.result.createObjectStore('receipts'); };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result, tx = db.transaction(['state', 'receipts'], 'readwrite');
          tx.objectStore('state').put(current, 'current');
          if (previous !== undefined) tx.objectStore('state').put(previous, 'previous');
          if (checkpoint !== undefined) tx.objectStore('state').put(checkpoint, 'checkpoint');
          tx.objectStore('receipts').put({ original: true }, 'old-receipt');
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
    };
    const inspect = async (name: string) => new Promise<any>((resolve, reject) => {
      const req = indexedDB.open(name);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result, names = Array.from(db.objectStoreNames), tx = db.transaction(names, 'readonly');
        const result: any = { version: db.version, stores: names };
        for (const name of names) {
          const cursor = tx.objectStore(name).openCursor(), records: any[] = [];
          result[name] = records;
          cursor.onsuccess = () => { if (cursor.result) { records.push({ key: cursor.result.key, value: cursor.result.value }); cursor.result.continue(); } };
        }
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    const legacySamples = (choice = 'leave', school = 'sword') => {
      let game = legacy.createAdventure('旧档测试', `legacy-${choice}-${school}`);
      const samples = [game];
      for (const payload of [
        { type: 'CHOOSE', choice }, { type: 'TRAVEL', location: 'cave' },
        { type: 'CULTIVATE', method: 'natural', count: 5 }, { type: 'BREAKTHROUGH' },
        { type: 'SCHOOL', school }, { type: 'TRAVEL', location: 'wilderness' },
        { type: 'ENCOUNTER', enemy: 'wolf' }, { type: 'BATTLE', move: 'technique' },
      ]) {
        game = legacy.advance(game, { ...payload, commandId: `legacy-${game.core.revision}`, runId: game.core.runId, expectedRevision: game.core.revision });
        samples.push(game);
      }
      return samples;
    };
    const mutation = (current: any = null) => ({ commandId: crypto.randomUUID(), runId: crypto.randomUUID(),
      expectedRunId: current?.core.runId ?? null, expectedRevision: current?.core.revision ?? 0 });
    const command = (game: any, action: any) => ({ ...action, commandId: crypto.randomUUID(), runId: game.core.runId, expectedRevision: game.core.revision });
    const attempt = async (operation: () => any) => {
      try { return { ok: true, value: await operation() }; }
      catch (error: any) { return { ok: false, code: error.code, name: error.name, message: error.message }; }
    };
    const put = async (name: string, storeName: string, key: string, value: unknown, remove = false) => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(name); req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction(storeName, 'readwrite'), store = tx.objectStore(storeName);
        if (remove) store.delete(key); else store.put(value, key);
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    (globalThis as any).h = { ...persistence, engine, queries, routes, legacy, seed, inspect, put, legacySamples, mutation, command, attempt };
  }, root);
}
