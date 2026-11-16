import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, resolve } from '../src/full/engine.ts';
import { createActivity, completeActivity } from '../src/full/activity.ts';
import { writeObservation } from '../web/src/local-events.ts';
import { createResultMomentTracker } from '../web/src/result-moments.ts';
function cultivation() {
    let g = newGame('收获测试', '00000000-0000-4000-8000-000000000001');
    for (const [i, action] of [{ type: 'CHOOSE', choice: 'leave' }, { type: 'TRAVEL', location: 'cave' }].entries())
        g = resolve(g, { ...action, runId: g.core.runId, expectedRevision: g.core.revision, commandId: 'q11-setup-' + i }).nextState;
    const a = createActivity(g, { kind: 'cultivation', method: 'natural', maxCycles: 2, until: 'cycles', stoneBudget: 0, stoneReserve: 0 }, { id: '00000000-0000-4000-8000-000000000002', ownerId: 'q11-local', commandId: 'q11-start', now: 100 });
    const next = resolve(g, a.nextCommand), done = completeActivity(next.nextState, a, next.result, { commandId: a.nextCommand.commandId, now: a.dueAt });
    return { before: g, game: next.nextState, result: next.result, activity: done, observation: writeObservation(g, next.nextState, { kind: 'action', command: a.nextCommand }, next.result, false) };
}
test('ordinary cultivation consumes each real committed cycle once without changing any Game or activity field', () => {
    const f = cultivation(), raw = JSON.stringify(f), tracker = createResultMomentTracker();
    const moment = tracker.consume(f.observation, f.game, f.result, f.activity, false, true);
    assert.ok(moment);
    assert.equal(moment.kind, 'harvest');
    assert.match(moment.change, /修为 \+5/);
    assert.equal(tracker.consume(f.observation, f.game, f.result, f.activity, false, true), null);
    assert.equal(JSON.stringify(f), raw);
    const a = f.activity, next = resolve(f.game, a.nextCommand), done = completeActivity(next.nextState, a, next.result, { commandId: a.nextCommand.commandId, now: a.dueAt });
    const o = writeObservation(f.game, next.nextState, { kind: 'action', command: a.nextCommand }, next.result, false), second = tracker.consume(o, next.nextState, next.result, done, false, true);
    assert.ok(second);
    assert.notEqual(second.key, moment.key);
    assert.equal(done.completedCycles, 2);
    assert.equal(done.status, 'stopped');
});
test('replay, away return, unsaved, foreign and mismatched completion data never become a new harvest', () => {
    const f = cultivation();
    const consume = (o = f.observation, g = f.game, r = f.result, a = f.activity, replayed = false, eligible = true) => createResultMomentTracker().consume(o, g, r, a, replayed, eligible);
    assert.equal(consume(f.observation, f.game, f.result, f.activity, true), null);
    assert.equal(consume(f.observation, f.game, f.result, f.activity, false, false), null);
    assert.equal(consume(f.observation, f.game, null), null); // Store deliberately clears lastResult during multi-cycle/return work.
    for (const patch of [{ kind: 'replay', replayed: true }, { errorCode: 'STORAGE_QUOTA' }, { observedRevision: f.game.core.revision + 1 }, { operation: 'CRAFT' }, { action: { ...f.observation.action, method: 'assisted' } }, { result: { ...f.observation.result, delta: { ...f.result.delta, xp: 999 } } }])
        assert.equal(consume({ ...f.observation, ...patch }), null, JSON.stringify(patch));
    assert.equal(consume(f.observation, { ...f.game, core: { ...f.game.core, runId: 'another-life' } }), null);
    for (const patch of [{ generation: f.activity.generation + 1 }, { completedCycles: f.activity.completedCycles + 1 }, { runId: 'another-life' }, { gameRevision: f.activity.gameRevision + 1 }])
        assert.equal(consume(f.observation, f.game, f.result, { ...f.activity, ...patch }), null, JSON.stringify(patch));
});
