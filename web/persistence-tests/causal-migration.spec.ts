import { test, expect } from '@playwright/test';
import { setupPersistence } from './support';
import { historicalCausalFixtures } from '../../tests/historical-full-runtime.mjs';
const fixtures = await historicalCausalFixtures();
test.beforeEach(async ({ page }) => setupPersistence(page));
async function seed(page: any, name: string, fixture: any, stage = 'resolved') {
  await page.evaluate(async ({ name, fixture, stage }: any) => {
    const h = (globalThis as any).h, repo = await h.FullSaveRepository.open(name); repo.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name); request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction([h.FULL_STATE_STORE, h.FULL_RECEIPT_STORE], 'readwrite');
        const state = tx.objectStore(h.FULL_STATE_STORE), record = fixture[stage];
        state.put(record.current, 'current'); state.put(record.previous, 'previous'); state.put(fixture.checkpoint, 'checkpoint'); state.put(record.owner, 'checkpoint-owner');
        const command = record.receipt.command; tx.objectStore(h.FULL_RECEIPT_STORE).put(record.receipt, command.runId + ':' + command.commandId);
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  }, { name, fixture, stage });
}
const normalize = (g: any) => {
  const copy = structuredClone(g); copy.core.runId = '<run>'; copy.core.revision = 0;
  copy.core.contentVersion = 'full-demo.3'; copy.core.balanceVersion = 'full-unbalanced.3';
  if (copy.core.activeEvent) copy.core.activeEvent.instanceId = '<run>:' + copy.core.activeEvent.id;
  return copy;
};

test('six exact old-source reunion choices migrate atomically with original receipts and usable repeated checkpoints', async ({ page }) => {
  for (const fixture of fixtures) {
    const name = 'old-choice-' + fixture.choice + '-' + fixture.school; await seed(page, name, fixture);
    const result = await page.evaluate(async ({ name, oldCommand }: any) => {
      const h = (globalThis as any).h, repo = await h.FullSaveRepository.open(name), current = await repo.load(), previous = await repo.loadPrevious(), cp = await repo.loadCheckpoint();
      const archives = await repo.archives(), rejected = await h.attempt(() => repo.execute(oldCommand)); repo.close();
      const reopen = await h.FullSaveRepository.open(name), again = await reopen.load(), archivesAgain = await reopen.archives();
      const first = await reopen.restoreCheckpoint(h.mutation(again)), second = await reopen.restoreCheckpoint(h.mutation(first.state)); reopen.close();
      return { current, previous, cp, archives, rejected, again, archivesAgain, first: first.state, second: second.state };
    }, { name, oldCommand: fixture.resolved.receipt.command });
    expect(result.current.core.runId).not.toBe(fixture.resolved.current.core.runId); expect(result.current.core.revision).toBe(0);
    expect(normalize(result.current)).toEqual(normalize(fixture.resolved.current)); expect(result.current.choices.shen_return).toBe('accept');
    expect(normalize(result.previous)).toEqual(normalize(fixture.resolved.previous)); expect(normalize(result.cp.snapshot)).toEqual(normalize(fixture.checkpoint.snapshot));
    for (const original of [fixture.resolved.current, fixture.resolved.previous, fixture.checkpoint, fixture.resolved.owner, fixture.resolved.receipt]) {
      expect(result.archives.some((entry: any) => JSON.stringify(entry.value) === JSON.stringify(original))).toBe(true);
    }
    expect(result.rejected.code).toBe('RUN_MISMATCH'); expect(result.again).toEqual(result.current); expect(result.archivesAgain).toEqual(result.archives);
    expect(normalize(result.first)).toEqual(normalize(fixture.checkpoint.snapshot)); expect(normalize(result.second)).toEqual(normalize(fixture.checkpoint.snapshot));
    expect(result.first.core.runId).not.toBe(result.second.core.runId);
  }
});

test('old pending events keep identity context while newly confirmed decisions use the new branch once', async ({ page }) => {
  for (const fixture of fixtures.filter((f: any) => f.school === 'sword')) {
    const name = 'pending-' + fixture.choice; await seed(page, name, fixture, 'pending');
    const option = fixture.choice === 'help' ? 'accept' : fixture.choice === 'trade' ? 'bargain' : 'assist';
    const result = await page.evaluate(async ({ name, option }: any) => {
      const h = (globalThis as any).h, repo = await h.FullSaveRepository.open(name), before = await repo.load();
      const beforeWrong = await h.inspect(name), wrong = await h.attempt(() => repo.execute(h.command(before, { type: 'DECIDE', option: option === 'accept' ? 'bargain' : 'accept' }))), afterWrong = await h.inspect(name);
      const command = h.command(before, { type: 'DECIDE', option });
      const first = await repo.execute(command), retry = await repo.execute(command), raw = await h.inspect(name); repo.close();
      return { before, first, retry, raw, wrong, beforeWrong, afterWrong };
    }, { name, option });
    expect(normalize(result.before)).toEqual(normalize(fixture.pending.current)); expect(result.before.core.activeEvent.instanceId).toBe(result.before.core.runId + ':shen_return');
    expect(result.wrong.code).toBe('OPTION_CONDITION'); expect(result.afterWrong).toEqual(result.beforeWrong);
    expect(result.first.state.choices.shen_return).toBe(option); expect(result.first.state.core.player.stones).toBe(result.before.core.player.stones - (fixture.choice === 'trade' ? 18 : 0));
    expect(result.first.state.core.inventory.herb).toBe(result.before.core.inventory.herb - (fixture.choice === 'leave' ? 2 : 0));
    expect(result.first.state.core.inventory.healing_pill).toBe(result.before.core.inventory.healing_pill + 1);
    expect(result.first.state.core.contentVersion).toBe('full-demo.3'); expect(result.first.state.core.balanceVersion).toBe('full-unbalanced.3');
    expect(result.retry.replayed).toBe(true); expect(result.retry.state).toEqual(result.first.state); expect(result.retry.result).toEqual(result.first.result);
  }
});

test('failure while committing the new content identity preserves the entire exact old source database for retry', async ({ page }) => {
  const fixture = fixtures.find((f: any) => f.choice === 'trade' && f.school === 'talisman'); await seed(page, 'causal-abort', fixture);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, before = await h.inspect('causal-abort'), put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === h.FULL_RECEIPT_STORE) throw new DOMException('migration quota', 'QuotaExceededError');
      return put.call(this, value, key!);
    };
    let failed;
    try { failed = await h.attempt(() => h.FullSaveRepository.open('causal-abort')); }
    finally { IDBObjectStore.prototype.put = put; }
    const after = await h.inspect('causal-abort'), repo = await h.FullSaveRepository.open('causal-abort'), retried = await repo.load(); repo.close();
    return { before, after, failed, retried };
  });
  expect(result.failed.code).toBe('STORAGE_QUOTA'); expect(result.after).toEqual(result.before);
  expect(result.retried.core.contentVersion).toBe('full-demo.3'); expect(normalize(result.retried)).toEqual(normalize(fixture.resolved.current));
});

test('never-published content/balance cross pairs are refused without overwriting records', async ({ page }) => {
  const fixture = fixtures[0]; await seed(page, 'causal-unknown', fixture);
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, repoRaw = await h.inspect('causal-unknown');
    const raw = repoRaw[h.FULL_STATE_STORE].find((entry: any) => entry.key === 'current').value;
    raw.core.contentVersion = 'full-demo.3'; // balance2 never belonged to content3.
    await h.put('causal-unknown', h.FULL_STATE_STORE, 'current', raw);
    const before = await h.inspect('causal-unknown'), failed = await h.attempt(() => h.FullSaveRepository.open('causal-unknown'));
    return { before, failed, after: await h.inspect('causal-unknown') };
  });
  expect(result.failed.code).toBe('SAVE_VERSION'); expect(result.after).toEqual(result.before);
});


test('later sword study commits ownership and payment together, retrying one intent only once', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const h = (globalThis as any).h, d = h.routes.driver('leave', 'talisman'); d.realm(); d.funds(80); d.go('sect');
    const repo = await h.FullSaveRepository.open('manual-atomic'), imported = await repo.importText(JSON.stringify(d.game), h.mutation());
    const command = h.command(imported.state, { type: 'STUDY', manual: 'jinghong' }), before = await h.inspect('manual-atomic'), original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) { if(this.name===h.FULL_RECEIPT_STORE) throw new DOMException('manual quota','QuotaExceededError'); return original.call(this,value,key!); };
    let failed;
    try { failed = await h.attempt(() => repo.execute(command)); } finally { IDBObjectStore.prototype.put = original; }
    const afterFailure = await h.inspect('manual-atomic'), first = await repo.execute(command), retry = await repo.execute(command);
    const duplicate = await h.attempt(() => repo.execute(h.command(retry.state, { type:'STUDY',manual:'jinghong' }))); repo.close();
    const reopened = await h.FullSaveRepository.open('manual-atomic'), loaded = await reopened.load(); reopened.close();
    return { before, afterFailure, failed, original: imported.state, first, retry, duplicate, loaded };
  });
  expect(result.failed.code).toBe('STORAGE_QUOTA'); expect(result.afterFailure).toEqual(result.before);
  expect(result.first.state.core.learnedSkills).toEqual(['skill_jinghong_slash']); expect(result.first.state.core.player.stones).toBe(result.original.core.player.stones-80);
  expect(result.first.result.costs.stones).toBe(80); expect(result.retry.replayed).toBe(true); expect(result.retry.state).toEqual(result.first.state); expect(result.retry.result).toEqual(result.first.result);
  expect(result.duplicate.code).toBe('ALREADY_LEARNED'); expect(result.loaded).toEqual(result.first.state);
});
