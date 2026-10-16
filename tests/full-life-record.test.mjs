import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { newGame, advance, resolve, parseGame, validateGame, biography } from '../src/full/engine.ts';
import { getLifeRecord, getLifeOverview, exportLifeText, previewAction } from '../src/full/queries.ts';
import { formatAgeMonths } from '../src/full/life-record.ts';
import { driver, fullRoute } from './full-route.mjs';
import { causalRoute } from './causal-route.mjs';
import { legalLifeBoundary } from './life-route.mjs';
import { createAdventure, advance as advanceLegacy } from '../src/game/adventure.ts';
const command = (g, action) => ({ ...action, commandId: 'life-' + g.core.revision, runId: g.core.runId, expectedRevision: g.core.revision });
const take = (g, action) => advance(g, command(g, action));

test('new and active biographies report only recorded facts, not future friendships or an ending', () => {
  const initial = newGame('初来', 'life-opening'), record = getLifeRecord(initial);
  assert.equal(record.overview.status, 'active'); assert.equal(record.overview.ageLabel, '18岁'); assert.equal(record.opening.choice, null);
  assert.equal(record.decisions.length, 0); assert.ok(record.people.every(person => !person.recorded));
  assert.ok(record.people.every(person => !person.facts.length)); assert.deepEqual(record.training.learned, []); assert.deepEqual(record.training.relics, []);
  assert.equal(record.battle.wins, 0); assert.equal(record.overview.remainingMonths, 864);
  assert.ok(!exportLifeText(initial).includes('此生寿元已尽')); assert.throws(() => take(initial, { type: 'RETIRE' }), e => e.code === 'PENDING');
});

for (const choice of ['help','trade','leave']) test(`${choice}: a normal eighteen-year-old retires without consuming remaining age or resources`, () => {
  const g = take(newGame('归隐', 'retired-' + choice), { type: 'CHOOSE', choice }), before = structuredClone(g);
  const out = resolve(g, command(g, { type: 'RETIRE' })), record = getLifeRecord(out.nextState);
  assert.equal(record.overview.reason, 'retired'); assert.equal(record.overview.ageMonths, 216); assert.equal(record.overview.remainingMonths, 864);
  assert.equal(out.result.costs.months, 0); assert.deepEqual(out.nextState.core.player, before.core.player); assert.deepEqual(out.nextState.core.inventory, before.core.inventory);
  assert.equal(out.nextState.core.world.elapsedMonths, before.core.world.elapsedMonths); assert.equal(record.overview.title, '尘世留名 · 主动归隐');
  assert.ok(!record.overview.conclusion.includes('寿元已尽')); assert.equal(record.opening.choice, choice);
  assert.throws(() => take(out.nextState, { type: 'RETIRE' }), e => e.code === 'ENDED'); assert.deepEqual(g, before);
});

for (const realm of ['qi','foundation','golden','nascent','spirit']) test(`${realm}: legally reached final months stop a batch, then end exactly at the real lifespan once`, () => {
  const r = legalLifeBoundary(realm, 2), before = r.ledger.game;
  assert.equal(getLifeOverview(before).remainingMonths, 2);
  assert.throws(() => r.act({ type: 'END_LIFE' }), e => e.code === 'LIFESPAN_REMAINING'); assert.deepEqual(r.ledger.game, before);
  const partial = r.act({ type: 'SOURCE', sourceId: 'work', count: 50 }); assert.equal(partial.executedSteps, 1); assert.equal(partial.costs.months, 1); assert.equal(partial.stopReason.code, 'AGE_LIMIT');
  const last = r.ledger.game, quote = previewAction(last, { type: 'END_LIFE' }); assert.equal(quote.allowed, true); assert.equal(quote.costs.months, 1);
  const ended = r.act({ type: 'END_LIFE' }), after = r.ledger.game, record = getLifeRecord(after);
  assert.equal(ended.costs.months, 1); assert.equal(ended.delta.months, 1); assert.equal(ended.delta.stones, 0); assert.deepEqual(ended.delta.inventory, {});
  assert.equal(after.core.player.startAgeMonths + after.core.world.elapsedMonths, C.realms[realm].lifespanMonths);
  assert.equal(record.overview.remainingMonths, 0); assert.equal(record.overview.reason, 'lifespan'); assert.ok(record.overview.conclusion.includes('最后一个游戏月'));
  assert.equal(record.overview.ageLabel, formatAgeMonths(C.realms[realm].lifespanMonths)); assert.equal(record.overview.title, '尘世留名 · 寿元已尽');
  assert.throws(() => r.act({ type: 'END_LIFE' }), e => e.code === 'ENDED'); r.ledger.report();
});

test('pending decisions, battles and a trial cannot be bypassed with either ending action', () => {
  const d = driver(); d.go('sect'); d.doAction({ type: 'EVENT', event: 'lu_intro' });
  const pending = d.game; for (const type of ['RETIRE','END_LIFE']) assert.throws(() => take(pending, { type }), e => e.code === 'PENDING');
  d.doAction({ type: 'DECIDE', option: 'decline' }); d.go('wilderness'); d.doAction({ type: 'ENCOUNTER', enemy: 'wolf' });
  for (const type of ['RETIRE','END_LIFE']) assert.throws(() => take(d.game, { type }), e => e.code === 'PENDING');
  const checkpoint = fullRoute().checkpoints.trial, trial = take(checkpoint, { type: 'START_TRIAL' });
  for (const type of ['RETIRE','END_LIFE']) assert.throws(() => take(trial, { type }), e => e.code === 'PENDING');
});

test('all 24 legal ascension summaries retain their actual choices, assets and ending without inventing old friends', () => {
  let paths = 0;
  for (const choice of ['help','trade','leave']) for (const school of ['sword','talisman']) for (const strategy of ['craft','purchase']) for (const ending of ['transmit','depart']) {
    const d = fullRoute(choice, school, strategy, false, ending), rec = getLifeRecord(d.game), text = exportLifeText(d.game);
    assert.equal(rec.overview.reason, ending); assert.equal(rec.overview.status, 'ascended'); assert.equal(rec.overview.limitMonths, null); assert.equal(rec.overview.remainingMonths, null);
    assert.equal(rec.training.school, school === 'sword' ? '剑修' : '符修'); assert.deepEqual(rec.training.relics.map(r=>r.id), d.game.ownedRelics);
    assert.deepEqual(rec.training.learned.map(s=>s.id).sort(), [...d.game.learned].sort()); assert.equal(rec.decisions.length, 0);
    assert.ok(!text.includes('挥别故人')); assert.ok(!d.game.journal.at(-1).includes('旧友'));
    assert.ok(text.includes('通过天劫三关')); assert.ok(text.includes('不继续推断上界寿元')); assert.equal(rec.source.revision, d.game.core.revision);
    paths++;
  }
  assert.equal(paths, 24);
});

test('choices and acquired abilities survive the 100-line journal window, while promises stay promises', () => {
  const route = causalRoute({ returnVisit: false, meet: 'rival', echo: 'solo', finish: false }), d = route.driver;
  d.funds(80); d.go('sect'); d.doAction({ type: 'STUDY', manual: 'jinghong' });
  for (let i=0;i<110;i++) d.go(i%2?'sect':'cave');
  assert.equal(d.game.journal.length, 100); assert.ok(!d.game.journal.some(s=>s.includes('破庙')));
  const record = getLifeRecord(d.game); assert.equal(record.decisions.length, Object.keys(d.game.choices).length);
  assert.deepEqual(record.decisions.map(d=>d.id).sort(),Object.keys(d.game.choices).sort());
  assert.ok(record.training.manual.includes('已研读')); assert.ok(record.pledges.text.includes('不推断每一次实际命中'));
  assert.ok(record.decisions.some(d=>d.option==='rebuild')); assert.ok(record.decisions.some(d=>d.option==='renew'));
  assert.ok(biography(d.game).some(line=>line.includes('重新建立'))); assert.ok(!record.people.find(p=>p.id==='lu').recorded);
});

test('legacy and partial realm records never become invented exact breakthrough dates', () => {
  let old = createAdventure('旧记录', 'old-life-record');
  for (const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:1}]) old=advanceLegacy(old,{...action,commandId:'legacy-'+old.core.revision,runId:old.core.runId,expectedRevision:old.core.revision});
  const converted = parseGame(JSON.stringify(old)), rec = getLifeRecord(converted);
  assert.equal(rec.realms[0].month, 1); assert.ok(rec.realms[0].text.includes('第1游戏月')); assert.ok(!rec.realms[0].text.includes('开卷时'));
  const d=driver();d.realm();const partial=structuredClone(d.game);partial.milestones={foundation:partial.core.world.elapsedMonths};validateGame(partial);
  const record=getLifeRecord(partial);assert.equal(record.realms.length,1);assert.ok(record.realms[0].text.includes('已达筑基'));assert.ok(!record.realms[0].text.includes('踏入'));
  assert.ok(record.scope.includes('不推断精确突破月'));
});

test('contradictory milestone order rejects instead of printing a false chronology', () => {
  const d=fullRoute(), bad=structuredClone(d.game);bad.milestones.qi=bad.core.world.elapsedMonths;
  assert.throws(()=>getLifeRecord(bad),e=>e.code==='SAVE_MILESTONE');
});

test('record queries and text export are isolated, local and never mutate the save or use wall clocks', () => {
  const d=driver('trade'), before=JSON.stringify(d.game), now=Date.now, random=Math.random;
  try {
    Date.now=()=>{throw new Error('wall clock');};Math.random=()=>{throw new Error('random');};
    const record=getLifeRecord(d.game);record.training.learned.length=0;record.overview.name='改写';
    const text=exportLifeText(d.game);assert.ok(text.includes(d.game.core.player.name));assert.ok(text.includes('不含完整进度'));assert.ok(text.includes(d.game.core.runId));
    assert.equal(JSON.stringify(d.game),before);assert.ok(getLifeRecord(d.game).training.learned.length>0);
    assert.throws(()=>parseGame(JSON.stringify(getLifeRecord(d.game))),e=>e.code==='SAVE_VERSION');
  } finally {Date.now=now;Math.random=random;}
});
