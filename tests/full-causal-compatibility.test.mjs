import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalFullRuntime, historicalCausalFixtures } from './historical-full-runtime.mjs';
import { newGame, parseGame, validateGame } from '../src/full/engine.ts';
import { getRelationships, getCausalAid, getStoryContext } from '../src/full/queries.ts';
import { HISTORICAL_FULL_OPTIONS } from '../src/full/versions.ts';
import * as C from '../src/full/content.ts';
const upgraded = g => ({ ...g, core: { ...g.core, contentVersion: C.VERSION, balanceVersion: C.BALANCE } });

test('exact T10 source preserves six completed and six pending reunion states without rewriting resources or choices', async () => {
  const fixtures = await historicalCausalFixtures(); assert.equal(fixtures.length, 6);
  for (const fixture of fixtures) for (const stage of ['pending', 'resolved']) {
    const raw = JSON.stringify(fixture[stage].current), converted = parseGame(raw);
    assert.deepEqual(converted, upgraded(fixture[stage].current)); assert.equal(JSON.stringify(fixture[stage].current), raw);
    assert.deepEqual(parseGame(JSON.stringify(converted)), converted);
    const person = getRelationships(converted)[0];
    if (stage === 'resolved') {
      assert.equal(converted.choices.shen_return, 'accept');
      assert.equal(person.facts.at(-1).text, '你在药庐坐下叙旧，收下一份药囊。');
      assert.deepEqual(getCausalAid(converted), { allDamageReduction: 0, thunderDamageReduction: 0 });
    } else {
      assert.equal(converted.core.activeEvent.id, 'shen_return');
      const visible = getStoryContext(converted, 'shen_return').options.map(o => o.id);
      assert.deepEqual(visible, [fixture.choice === 'help' ? 'accept' : fixture.choice === 'trade' ? 'bargain' : 'assist', 'decline']);
    }
  }
});

test('legacy legally paid pledges after refusals remain historical facts and aid after migration', async () => {
  const old = await historicalFullRuntime(), d = old.routes.driver('leave', 'talisman'); d.realm();
  d.event('shen_return', 'decline'); d.event('pei_meet', 'rival'); d.realm(); d.resource('lotus', 1); d.event('pei_echo', 'share');
  d.realm(); d.buy('healing_pill', 2); d.event('shen_pact', 'lend'); d.realm(); d.resource('dao', 1); d.event('pei_pact', 'ally');
  const before = JSON.stringify(d.game), current = parseGame(before); assert.deepEqual(current, upgraded(d.game));
  assert.equal(getRelationships(current)[0].label, '相约护阵'); assert.equal(getRelationships(current)[1].label, '相约护阵');
  assert.deepEqual(getCausalAid(current), { allDamageReduction: 6, thunderDamageReduction: 8 });
  assert.equal(JSON.stringify(d.game), before);
});

test('the exact previous full engine rejects the new content and balance pair without changing its input', async () => {
  const old = await historicalFullRuntime(), g = newGame('版本保护', 'causal-old-writer'), raw = JSON.stringify(g);
  assert.throws(() => old.engine.advance(g, { type: 'CHOOSE', choice: 'leave', commandId: 'old-command', runId: g.core.runId, expectedRevision: 0 }), e => e.code === 'SAVE_VERSION');
  assert.equal(JSON.stringify(g), raw);
  for (const [content, balance] of [['full-demo.3', 'full-unbalanced.2'], ['full-demo.2', 'full-unbalanced.3'], ['full-demo.1', 'full-unbalanced.2']]) {
    const value = structuredClone(g); value.core.contentVersion = content; value.core.balanceVersion = balance;
    assert.throws(() => parseGame(JSON.stringify(value)), e => e.code === 'SAVE_VERSION');
  }
});


test('the frozen historical option roster matches exact old source and rejects new options disguised as old content', async () => {
  const old = await historicalFullRuntime();
  assert.deepEqual(Object.keys(HISTORICAL_FULL_OPTIONS).sort(), Object.keys(old.events.stories).sort());
  for (const [id, options] of Object.entries(HISTORICAL_FULL_OPTIONS)) assert.deepEqual([...options].sort(), old.events.stories[id].options.map(o=>o.id).sort());
  const fixtures = await historicalCausalFixtures(), trade = structuredClone(fixtures.find(f=>f.choice==='trade').resolved.current);
  trade.choices.shen_return='bargain'; assert.throws(()=>parseGame(JSON.stringify(trade)),e=>e.code==='SAVE_STORIES');
  const current=parseGame(JSON.stringify(fixtures.find(f=>f.choice==='help').resolved.current));
  current.choices.shen_return='assist'; assert.throws(()=>validateGame(current),e=>e.code==='SAVE_STORIES');
});
