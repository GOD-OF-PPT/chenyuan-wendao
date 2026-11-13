import {expect, type Page} from '@playwright/test';
import {repositoryFsRoot as root} from './fs-root';

/** Exact expected ACK-only transition. Keep every store, raw proof and metadata field in equality. */
export function confirmedDelivery(snapshot:any, identity:{runId:string;commandId:string}|string) {
  const copy=structuredClone(snapshot),key=typeof identity==='string'?identity:identity.runId+':'+identity.commandId;
  const rows=copy.format==='chenyuan-raw-database-backup'
    ? copy.stores.find((s:any)=>s.name==='full-retention')?.entries : copy.rows?.['full-retention']??copy['full-retention'];
  expect(Array.isArray(rows),'schema11 delivery proof must include the entire retention store').toBe(true);
  const root=rows.find((r:any)=>Array.isArray(r.key)&&r.key[0]==='receipt'&&r.key[1]===key);
  expect(root?.value).toMatchObject({format:'chenyuan-retained-receipt',version:1,kind:'receipt',key,
    parentKey:key,baseline:false,pending:true});
  expect(root.value.runId+':'+root.value.commandId).toBe(key);
  expect(typeof root.value.receiverId).toBe('string');expect(typeof root.value.checksum).toBe('string');
  const siblings=rows.filter((r:any)=>r.value?.kind==='receipt'&&r.value.parentKey===key);
  expect(siblings.length).toBeGreaterThan(0);
  for(const row of siblings){
    expect(row.key).toEqual(['receipt',row.value.key]);
    expect(row.value).toMatchObject({format:'chenyuan-retained-receipt',version:1,runId:root.value.runId,
      parentKey:key,receiverId:root.value.receiverId,baseline:false,pending:true});
    // Only delivery changes. No collection is expected in these original small fixtures.
    row.value.pending=false;
  }
  return copy;
}

export async function setupPersistence(page: Page) {
  await page.goto('/persistence-tests/harness.html');
  await page.evaluate(async (root) => {
    const persistence = await import('/src/full-persistence.ts');
    const engine = await import(`/@fs${root}src/full/engine.ts`);
    const queries = await import(`/@fs${root}src/full/queries.ts`);
    const receipts = await import(`/@fs${root}src/full/receipts.ts`);
    const legacy = await import(`/@fs${root}src/game/adventure.ts`);
    const routes = await import(`/@fs${root}tests/full-route.mjs`);
    const adventure = await import(`/@fs${root}src/full/adventure.ts`);
    const currentContent = await import(`/@fs${root}src/full/content.ts`);
    const legacyRuleRoutes = await import('/persistence-tests/legacy-rule-route.mjs');
    const legacyRuleEngine = await import(`/@fs${root}src/legacy/rules-v3/src/full/engine.ts`);
    const legacyRuleContent = await import(`/@fs${root}src/legacy/rules-v3/src/full/content.ts`);
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
    // Historical schema fixtures have the original stores only. A DB10 clock
    // must never be copied into a claimed pre10 database, even when it is empty.
    const legacyDatabaseFixture = (snapshot:any,version:number) => {
      if(!Number.isSafeInteger(version)||version<2||version>=10)throw new Error('expected an explicit historical database schema');
      const clock=persistence.FULL_SCHEDULE_STORE;
      if(snapshot[clock]?.length)throw new Error('a live away clock cannot be removed to manufacture a legacy fixture');
      const original=structuredClone(snapshot);
      // This constructs an explicitly historical schema, not a current all-store
      // comparison. Current retention metadata has no place in DB2..9 fixtures.
      if(original['full-retention'] && original.version!==11)throw new Error('unrecognized source retention schema');
      delete original[clock];delete original['full-retention'];original.stores=original.stores.filter((name:string)=>name!==clock&&name!=='full-retention');original.version=version;
      return original;
    };
    const emptyLegacyDatabase=async(name:string)=>new Promise<void>((yes,no)=>{
      const request=indexedDB.open(name,10);let created=false;
      request.onerror=()=>no(request.error);
      request.onupgradeneeded=(event)=>{
        if(event.oldVersion!==0){request.transaction!.abort();return;}
        created=true;for(const store of ['full-state','full-receipts','full-backups','full-schedules'])request.result.createObjectStore(store);
      };
      request.onsuccess=()=>{request.result.close();created?yes():no(Error('historical fixture requires a fresh test database'));};
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
    // Explicit rule-time adapter for authorized fixture actions. UI wall-clock tests remain separate.
    const finishAction = async (repo: any, action: any) => {
      if (['commandId','runId','expectedRevision'].some(key => key in action)) throw new Error('fixture helper requires a pure action; stale identities must be tested directly');
      const snapshot = await repo.loadActivitySnapshot(), game = snapshot.state;
      const plan = ['CHOOSE','EVENT','DECIDE','BREAKTHROUGH','START_TRIAL','ANSWER_TRIAL','END','RETIRE','END_LIFE'].includes(action.type)
        ? { kind: 'milestone', action: structuredClone(action), maxCycles: 1 } :
        action.type === 'TRAVEL' ? { kind: 'travel', location: action.location, maxCycles: 1 } :
        action.type === 'ENCOUNTER' ? { ...adventure.defaultEncounterPlan(game, action.enemy), maxCycles: 1 } :
        action.type === 'BATTLE' ? { kind: 'battle', enemy: game.battle.enemy, trialStage: game.trial?.stage ?? null,
          mode: 'single', move: action.move, maxCycles: 1 } : null;
      if (!plan) throw new Error('finishAction only accepts adventure or milestone actions');
      const started = await repo.startActivity(plan, { commandId: crypto.randomUUID(), runId: game.core.runId,
        expectedRevision: game.core.revision, expectedActivityId: snapshot.activity?.id ?? null,
        expectedActivityRevision: snapshot.activity?.revision ?? null, ownerId: 'fixture-action' });
      const a = started.activity, realNow = Date.now;
      Date.now = () => a.dueAt;
      try { return await repo.settleActivity({ commandId: a.nextCommand.commandId, runId: a.runId,
        expectedRevision: a.gameRevision, activityId: a.id, expectedActivityRevision: a.revision,
        ownerId: a.ownerId, generation: a.generation }); }
      finally { Date.now = realNow; }
    };
    (globalThis as any).h = { ...persistence, engine, queries, receipts, routes, adventure, currentContent, legacyRuleRoutes, legacyRuleEngine, legacyRuleContent, legacy, seed, inspect, legacyDatabaseFixture, emptyLegacyDatabase, put, legacySamples, mutation, command, attempt, finishAction };
  }, root);
}
