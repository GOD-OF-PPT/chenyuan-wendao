import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import { advance, reason, validateGame } from '../src/full/engine.ts';
import { stories } from '../src/full/events.ts';
import { getStoryContext, getRelationships, getItemSources, previewAction, getCausalAid } from '../src/full/queries.ts';
import { validateContent, fullCatalog } from '../src/full/validate-content.ts';
import { driver, prepareTrial } from './full-route.mjs';
import { causalRoute } from './causal-route.mjs';
import { runner } from '../scripts/economy/scenarios.mjs';
const command = (game, action) => ({ ...action, commandId: 'causal-' + game.core.revision, runId: game.core.runId, expectedRevision: game.core.revision });
const take = (game, action) => advance(game, command(game, action));
const baseOptions = { choice: 'leave', school: 'sword', preparation: 'gather', cultivation: 'natural', advancedMind: false };

for (const choice of ['help', 'trade', 'leave']) for (const school of ['sword', 'talisman']) {
  test(`${choice}/${school}: reunion offers the actual opening branch and pays only its known cost`, () => {
    const d = driver(choice, school); d.realm();
    if (choice === 'trade') d.funds(18); if (choice === 'leave') d.resource('herb', 2);
    d.go('sect'); d.doAction({ type: 'EVENT', event: 'shen_return' });
    const option = choice === 'help' ? 'accept' : choice === 'trade' ? 'bargain' : 'assist';
    const view = getStoryContext(d.game, 'shen_return');
    assert.deepEqual(view.options.map(o => o.id), [option, 'decline']);
    assert.ok(view.body.includes(choice === 'help' ? '雨夜赠丹' : choice === 'trade' ? '旧账早已两清' : '才正式通报姓名'));
    const before = structuredClone(d.game), quote = previewAction(d.game, { type: 'DECIDE', option });
    assert.equal(quote.allowed, true);
    for (const forbidden of ['accept', 'bargain', 'assist'].filter(id => id !== option)) {
      assert.throws(() => take(d.game, { type: 'DECIDE', option: forbidden }), e => e.code === 'OPTION_CONDITION');
      assert.deepEqual(d.game, before);
    }
    d.doAction({ type: 'DECIDE', option });
    assert.equal(d.game.core.inventory.healing_pill, before.core.inventory.healing_pill + 1);
    assert.equal(d.game.core.player.stones, before.core.player.stones - (choice === 'trade' ? 18 : 0));
    assert.equal(d.game.core.inventory.herb, before.core.inventory.herb - (choice === 'leave' ? 2 : 0));
    assert.equal(d.game.core.player.realm, before.core.player.realm); assert.equal(d.game.core.player.xp, before.core.player.xp);
    assert.equal(d.game.core.world.elapsedMonths, before.core.world.elapsedMonths);
    assert.ok(d.game.journal.at(-1).includes(view.options[0].result));
    assert.equal(getRelationships(d.game)[0].facts.at(-1).choice, option);
  });
  test(`${choice}/${school}: all 24 causal combinations finish, including repaired and unsupported routes`, () => {
    let passed = 0;
    for (const meet of ['cooperate', 'rival', 'decline']) for (const echo of ['joint', 'solo'])
      for (const returnVisit of [true, false]) for (const aid of [true, false]) {
        const route = causalRoute({ choice, school, meet, echo, returnVisit, shenAid: aid, peiAid: aid });
        const g = route.driver.game; validateGame(g); assert.equal(g.status, 'ascended'); assert.ok(getRelationships(g).every(person => person.next === null));
        assert.equal(route.driver.actions.filter(a => a.type === 'BREAKTHROUGH').length, 5);
        assert.equal(route.driver.actions.filter(a => a.type === 'END').length, 1);
        assert.equal(g.choices.shen_pact, aid ? returnVisit ? 'lend' : 'rebuild' : 'decline');
        assert.equal(g.choices.pei_pact, aid ? echo === 'joint' ? 'ally' : 'renew' : 'decline');
        assert.deepEqual(getCausalAid(g), aid ? { allDamageReduction: 6, thunderDamageReduction: 8 } : { allDamageReduction: 0, thunderDamageReduction: 0 });
        assert.equal(getRelationships(g).find(p => p.id === 'lu').label, '未识');
        assert.equal(getRelationships(g).find(p => p.id === 'yan').label, '未识');
        assert.equal(g.core.inventory.ascension_seal, 0); passed++;
      }
    assert.equal(passed, 24);
  });
}

test('cooperation, rivalry and renewed acquaintance have distinct trades and truthful midgame text', () => {
  for (const meet of ['cooperate', 'rival', 'decline']) {
    const d = driver(); d.realm(); if (meet === 'cooperate') d.funds(15); d.event('pei_meet', meet); d.realm(); d.resource('lotus', 1); d.go('secret');
    const option = meet === 'cooperate' ? 'share' : meet === 'rival' ? 'contest' : 'reconnect';
    const view = getStoryContext(d.game, 'pei_echo'); assert.equal(view.options[0].id, option);
    const plans = getItemSources(d.game, 'jade', 1, ['event']);
    assert.ok(plans.some(plan => plan.id === 'pei_echo:' + option));
    for (const other of ['share', 'contest', 'reconnect'].filter(id => id !== option)) assert.ok(!plans.some(plan => plan.id === 'pei_echo:' + other));
    d.doAction({ type: 'EVENT', event: 'pei_echo' }); const before = structuredClone(d.game);
    const quote = previewAction(d.game, { type: 'DECIDE', option }); assert.equal(quote.allowed, true);
    d.doAction({ type: 'DECIDE', option });
    assert.equal(d.game.core.inventory.lotus, before.core.inventory.lotus - 1);
    assert.equal(d.game.core.inventory.jade, before.core.inventory.jade + (meet === 'cooperate' ? 3 : 2));
    assert.equal(d.game.core.player.stones - before.core.player.stones, meet === 'rival' ? 20 : 0);
    assert.ok(d.game.journal.at(-1).includes(view.options[0].result));
  }
});

test('earlier refusals require a new paid pledge rather than a fabricated old alliance', () => {
  const r = causalRoute({ returnVisit: false, meet: 'decline', echo: 'solo', finish: false });
  for (const [id, forbidden, proper, expected] of [
    ['shen_pact', 'lend', 'rebuild', { healing_pill: 2, herb: 2 }],
    ['pei_pact', 'ally', 'renew', { dao: 1, lotus: 1 }],
  ]) {
    let g = r.before[id]; const story = stories[id];
    if (g.core.world.location !== story.location) g = take(g, { type: 'TRAVEL', location: story.location });
    g = take(g, { type: 'EVENT', event: id }); const original = structuredClone(g);
    assert.throws(() => take(g, { type: 'DECIDE', option: forbidden }), e => e.code === 'OPTION_CONDITION'); assert.deepEqual(g, original);
    const quote = previewAction(g, { type: 'DECIDE', option: proper }); assert.deepEqual(quote.costs.items, expected); assert.equal(quote.allowed, true);
    const result = take(g, { type: 'DECIDE', option: proper });
    for (const [item, n] of Object.entries(expected)) assert.equal(result.core.inventory[item], g.core.inventory[item] - n);
    assert.equal(result.core.player.realm, g.core.player.realm); assert.equal(result.core.world.elapsedMonths, g.core.world.elapsedMonths);
  }
});

test('viewing a condition or history is pure, isolated and cannot promise an unchosen aid', () => {
  const d = driver('trade'); d.realm(); const before = JSON.stringify(d.game);
  const people = getRelationships(d.game); assert.equal(people[0].label, '相识'); assert.equal(people[1].label, '未识');
  assert.equal(people[0].facts.length, 1); assert.deepEqual(getCausalAid(d.game), { allDamageReduction: 0, thunderDamageReduction: 0 });
  people[0].facts[0].text = '改写'; getStoryContext(d.game, 'shen_return').options[0].stones = 0;
  assert.ok(!getRelationships(d.game)[0].facts[0].text.includes('改写')); assert.equal(getStoryContext(d.game, 'shen_return').options[0].stones, 18);
  assert.equal(JSON.stringify(d.game), before); assert.throws(() => getStoryContext(d.game, '__proto__'), e => e.code === 'INVALID_QUERY');
});

test('all 18 local nodes execute their varied alternatives once through the real ledger', () => {
  const origin = runner(baseOptions); origin.grow('spirit', false); const templates = new Set(); let choices = 0;
  for (const [id, story] of Object.entries(stories).filter(([id]) => id.startsWith('local_'))) for (const option of story.options) {
    const r = runner(baseOptions, origin.ledger.game);
    for (const [item, n] of Object.entries(option.cost ?? {})) r.resource(item, n);
    r.funds(option.stones ?? 0); r.go(story.location); r.act({ type: 'EVENT', event: id });
    const before = r.ledger.game, preview = previewAction(before, { type: 'DECIDE', option: option.id }); assert.equal(preview.allowed, true, id + ':' + option.id);
    const actual = r.act({ type: 'DECIDE', option: option.id }); assert.deepEqual(actual.costs, preview.actualCosts); assert.deepEqual(actual.delta, preview.delta);
    assert.equal(r.ledger.game.core.player.realm, before.core.player.realm); assert.equal(r.ledger.game.choices[id], option.id);
    assert.throws(() => r.act({ type: 'EVENT', event: id }), e => e.code === 'EVENT_UNAVAILABLE'); r.ledger.report();
    if (option.id !== 'decline') templates.add(option.id); choices++;
  }
  assert.deepEqual([...templates].sort(), ['aid', 'barter', 'exchange', 'plan', 'remember']); assert.equal(choices, 50);
});

test('full cultivation rejects material insight without consumption and still has a free exit', () => {
  const r = runner(baseOptions); r.grow('spirit', false); r.resource('soul', 1); r.meditate(); r.go('secret'); r.act({ type: 'EVENT', event: 'local_echo' });
  const before = r.ledger.game; assert.equal(previewAction(before, { type: 'DECIDE', option: 'remember' }).failure.code, 'XP_CAP');
  assert.throws(() => r.act({ type: 'DECIDE', option: 'remember' }), e => e.code === 'XP_CAP'); assert.deepEqual(r.ledger.game, before);
  r.act({ type: 'DECIDE', option: 'decline' }); assert.equal(r.ledger.game.core.inventory.soul, before.core.inventory.soul);
});

test('selected aid changes actual first-round damage only in its promised stages', () => {
  for (const school of ['sword', 'talisman']) {
    const samples = {};
    for (const [key, shenAid, peiAid] of [['none', false, false], ['shen', true, false], ['pei', false, true], ['both', true, true]]) {
      const { driver: d } = causalRoute({ school, returnVisit: false, meet: 'rival', echo: 'solo', shenAid, peiAid, finish: false });
      prepareTrial(d); const hits = {};
      for (let turn = 0; d.game.battle && turn < 120; turn++) {
        const g = d.game, b = g.battle; let move = 'attack';
        if (b.round === 0) { const hp = g.core.player.hp; d.doAction({ type: 'BATTLE', move }); hits[b.enemy] = hp - d.game.core.player.hp; continue; }
        if (g.core.player.hp < C.realms.spirit.maxHp / 2 && !reason(g, { type: 'BATTLE', move: 'heal' })) move = 'heal';
        else if (b.round % 3 === 2) move = 'guard';
        else if (!reason(g, { type: 'BATTLE', move: 'release' })) move = 'release';
        else if (!reason(g, { type: 'BATTLE', move: 'technique' })) move = 'technique';
        d.doAction({ type: 'BATTLE', move });
      }
      assert.equal(d.game.trial?.stage, 4); assert.equal(Object.keys(hits).length, 3); samples[key] = hits;
    }
    for (const enemy of ['trial_heart', 'trial_thunder', 'trial_gate']) {
      assert.equal(samples.none[enemy] - samples.shen[enemy], enemy === 'trial_thunder' ? 8 : 0);
      assert.equal(samples.none[enemy] - samples.pei[enemy], 6);
      assert.equal(samples.none[enemy] - samples.both[enemy], 6 + (enemy === 'trial_thunder' ? 8 : 0));
    }
  }
});

test('condition and variant audits reject ambiguity, impossible references, future rewrites and trapped events', () => {
  const failures = [
    [c => c.stories.shen_return.options[0].condition.opening = ['unknown'], 'STORY_CONDITION'],
    [c => c.stories.shen_pact.options[0].condition.choices.shen_return = ['unknown'], 'STORY_CONDITION'],
    [c => c.stories.shen_return.options[0].condition = { choices: { shen_pact: ['lend'] } }, 'STORY_CONDITION_ORDER'],
    [c => c.stories.pei_echo.options[0].condition = {}, 'STORY_CONDITION'],
    [c => c.stories.shen_return.variants.push(structuredClone(c.stories.shen_return.variants[0])), 'STORY_VARIANT_OVERLAP'],
    [c => c.stories.shen_return.variants[0].results = { nonexistent: '不存在' }, 'STORY_VARIANT'],
    [c => c.stories.shen_return.options.pop(), 'STORY_EXIT'],
    [c => c.stories.shen_return.variants[0].results = { accept: '长'.repeat(600) }, 'STORY_TEXT_LIMIT'],
    [c => c.stories.shen_pact.options[0].aid = { unknown: 8 }, 'OPTION_AID'],
    [c => c.stories.shen_pact.options[0].aid.thunderDamageReduction = -1, 'CONTENT_NUMBER'],
  ];
  for (const [mutate, code] of failures) { const c = structuredClone(fullCatalog); mutate(c); assert.throws(() => validateContent(c), e => e.code === code); }
});
