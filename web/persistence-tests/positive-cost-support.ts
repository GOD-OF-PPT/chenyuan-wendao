import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { setupMilestones } from './milestone-support';
import { registerPositivePreparation } from './positive-cost-preparation';
import { registerPositiveBattle } from './positive-cost-battle';
import { registerPositiveMilestone } from './positive-cost-milestone';

export const positiveCostIds = ['assisted', 'craft', 'forge', 'learn', 'study', 'buy', 'sell', 'use-healing', 'use-spirit',
  'battle-technique', 'battle-heal', 'battle-restore', 'choose-help', 'choose-trade', 'decide-bargain', 'decide-assist',
  'breakthrough', 'start-trial'] as const;

export async function setupPositiveCosts(page: Page) {
  await setupMilestones(page);
  await page.evaluate(() => { (globalThis as any).h.m02Rows = {}; });
  await registerPositivePreparation(page);
  await registerPositiveBattle(page);
  await registerPositiveMilestone(page);
  await page.evaluate(() => {
    const h = (globalThis as any).h;
    h.m02ReplacementPlan = (game: any) => {
      if (game.battle) return { kind: 'battle', enemy: game.battle.enemy, trialStage: game.trial?.stage ?? null,
        mode: 'single', move: 'attack', maxCycles: 1 };
      if (game.trial) return { kind: 'milestone', action: { type: 'ANSWER_TRIAL', answer: 'accept' }, maxCycles: 1 };
      return { kind: 'travel', location: game.core.world.location === 'cave' ? 'sect' : 'cave', maxCycles: 1 };
    };
    h.m02Open = async (id: string, name: string) => {
      const row = h.m02Rows[id];
      if (!row || !Object.values(row.cost).some((value: any) => typeof value === 'number' ? value > 0 : Object.values(value).some((n: any) => n > 0)))
        throw new Error('M02 requires an explicit positive cost: ' + id);
      h.engine.validateGame(row.game);
      const repo = await h.FullSaveRepository.open(name);
      try {
        await repo.importText(JSON.stringify(row.game), h.mutation());
        const snapshot = await repo.loadActivitySnapshot();
        const started = await repo.startActivity(row.plan, h.milestoneMutation(snapshot));
        const expected = h.engine.resolve(started.state, started.activity.nextCommand);
        const expectedActivity = h.milestoneModel.completeActivity(expected.nextState, started.activity, expected.result,
          { commandId: started.activity.nextCommand.commandId, now: started.activity.dueAt });
        return { repo, row, snapshot, started, expected, expectedActivity, tick: h.milestoneTick(started) };
      } catch (error) { repo.close(); throw error; }
    };
    // Test-only faults use real native transactions and restore the method after the first actual target hit.
    h.m02Fault = (mode: string, name: string, tick: any) => {
      const put = IDBObjectStore.prototype.put;
      const hits: any[] = [];
      const restore = () => { IDBObjectStore.prototype.put = put; };
      IDBObjectStore.prototype.put = function(value: any, key?: IDBValidKey) {
        const target = this.transaction.db.name === name && (mode === 'quota' ? this.name === h.FULL_RECEIPT_STORE : this.name === h.FULL_STATE_STORE && key === 'current');
        if (target) {
          restore();
          const hit = { mode, database: this.transaction.db.name, store: this.name, key, tick: structuredClone(tick),
            value: structuredClone(value), requestSucceeded: false, abortCalled: false };
          hits.push(hit);
          if (mode === 'quota') throw new DOMException('M02 receipt quota', 'QuotaExceededError');
          const request = put.call(this, value, key!);
          request.addEventListener('success', () => { hit.requestSucceeded = true; this.transaction.abort(); hit.abortCalled = true; });
          return request;
        }
        return put.call(this, value, key!);
      };
      return { hits, restore };
    };
  });
}

export function expectPositiveCost(actual: any, cost: any) {
  expect(Object.keys(cost).length).toBeGreaterThan(0);
  for (const [key, value] of Object.entries(cost)) {
    if (key === 'items') for (const [id, amount] of Object.entries(value as Record<string, number>)) {
      expect(amount, id).toBeGreaterThan(0); expect(actual.items[id], id).toBe(amount);
    } else { expect(value, key).toBeGreaterThan(0); expect(actual[key], key).toBe(value); }
  }
  expect(actual.stones).toBe(cost.stones ?? 0); expect(actual.mp).toBe(cost.mp ?? 0);
  expect(actual.items).toEqual(cost.items ?? {});
}

export function expectImported(fixture: any, actual: any) {
  const expected = structuredClone(fixture);
  expected.core.runId = actual.core.runId; expected.core.revision = 0;
  if (expected.core.activeEvent) expected.core.activeEvent.instanceId = actual.core.runId + ':' + expected.core.activeEvent.id;
  expect(actual).toEqual(expected);
}

export function expectCommitted(row: any) {
  expectPositiveCost(row.expected.result.costs, row.cost);
  expect(row.completed.state).toEqual(row.expected.nextState);
  expect(row.completed.result).toEqual(row.expected.result);
  expect(row.completed.activity.completedCycles).toBe(1);
  expect(row.completed.activity.status).toBe('stopped');
  expect(row.completed.activity).toEqual(row.expectedActivity);
  expectImported(row.fixture, row.started.state);
  expect(row.previous).toEqual(row.started.state);
  const key = row.tick.runId + ':' + row.tick.commandId;
  const receipts = row.committed['full-receipts'].filter((entry: any) => entry.key === key);
  expect(receipts).toHaveLength(1);
  expect(receipts[0].value.command).toEqual(row.started.activity.nextCommand);
  expect(receipts[0].value.result).toEqual(row.expected.result);
  expect(receipts[0].value.activity).toEqual(row.completed.activity);
  if (row.started.activity.version >= 5) expect(receipts[0].value.proof).toEqual({ activityBefore: row.started.activity,
    stateAfter: row.expected.nextState, resolvedAt: row.started.activity.dueAt });
  const state = row.committed['full-state'];
  expect(state.find((entry: any) => entry.key === 'current').value).toEqual(row.expected.nextState);
  expect(state.find((entry: any) => entry.key === 'activity').value).toEqual(row.completed.activity);
  if (row.expected.checkpointKind) {
    const checkpoint = state.find((entry: any) => entry.key === 'checkpoint').value;
    const owner = state.find((entry: any) => entry.key === 'checkpoint-owner').value;
    expect(checkpoint.kind).toBe(row.expected.checkpointKind);
    expect(checkpoint.snapshot).toEqual(row.started.state);
    expect(checkpoint.sourceRunId).toBe(row.tick.runId);
    expect(checkpoint.sourceRevision).toBe(row.started.state.core.revision);
    expect(owner).toEqual({ format: 'chenyuan-checkpoint-scope', version: 1, runId: row.tick.runId,
      sourceRunId: row.tick.runId, sourceRevision: row.started.state.core.revision, kind: row.expected.checkpointKind });
  }
}

export async function savePositiveEvidence(info: TestInfo, value: unknown) {
  const path = info.outputPath('positive-cost-evidence.json');
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
  await info.attach('positive-cost-evidence', { path, contentType: 'application/json' });
}
