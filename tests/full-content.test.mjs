import test from 'node:test';
import assert from 'node:assert/strict';
import { fullCatalog, validateContent } from '../src/full/validate-content.ts';

const catalog = () => structuredClone(fullCatalog);
function rejects(change, code) {
  const value = catalog();
  change(value);
  assert.throws(() => validateContent(value), error => error.code === code);
}

test('full content audit proves five pre-breakthrough crafting and purchase alternatives', () => {
  const before = JSON.stringify(fullCatalog);
  const result = validateContent();
  assert.deepEqual(result.counts, {
    realms: 7, locations: 6, items: 14, sources: 16, recipes: 7,
    skills: 12, relics: 4, enemies: 9, stories: 35,
  });
  assert.deepEqual(result.breakthroughs.map(row => row.realm),
    ['qi', 'foundation', 'golden', 'nascent', 'spirit']);
  for (const row of result.breakthroughs) {
    assert.ok(row.crafting.length > 0);
    assert.ok(row.income.length > 0);
    assert.equal(row.purchase.location, 'market');
    assert.ok(row.purchase.price > 0);
  }
  assert.equal(JSON.stringify(fullCatalog), before);
});

test('audit rejects a source whose location is gated after its advertised realm', () => {
  rejects(c => { c.sources.herbs.location = 'terrace'; }, 'SOURCE_LOCATION_GATE');
});

test('audit rejects unknown item references in source, recipe, enemy, event and relic', () => {
  for (const change of [
    c => { c.sources.herbs.items.unknown = 1; },
    c => { c.recipes.foundation.inputs.unknown = 1; },
    c => { c.enemies.wolf.loot.unknown = 1; },
    c => { c.stories.shen_return.options[0].gain.unknown = 1; },
    c => { c.relics.jade_seal.inputs.unknown = 1; },
  ]) rejects(change, 'ITEM_REFERENCE');
});

test('audit rejects negative, fractional, nonfinite and unsafe configuration numbers', () => {
  for (const change of [
    c => { c.recipes.foundation.stones = -1; },
    c => { c.sources.herbs.items.herb = 0.5; },
    c => { c.items.herb.buy = Number.NaN; },
    c => { c.realms.qi.baseYield = Number.POSITIVE_INFINITY; },
    c => { c.skills.sword_still.price = Number.MAX_SAFE_INTEGER + 1; },
    c => { c.sources.work.months = 0; },
  ]) rejects(change, 'CONTENT_NUMBER');
});

test('audit rejects a future-realm source for a low-realm item', () => {
  rejects(c => { c.sources.herbs.min = 'mortal'; }, 'SOURCE_ITEM_GATE');
});

test('audit rejects an ordinary realm loop and an unknown next realm', () => {
  rejects(c => { c.realms.qi.next = 'mortal'; }, 'REALM_CHAIN');
  rejects(c => { c.realms.qi.next = 'missing'; }, 'REALM_REFERENCE');
});

test('audit rejects a recipe output with an unknown item', () => {
  rejects(c => { c.recipes.foundation.output = 'missing'; }, 'ITEM_REFERENCE');
});

test('critical crafting route cannot depend on buying its only missing material', () => {
  rejects(c => {
    delete c.sources.herbs.items.herb;
    c.sources.herbs.items.dew = 1;
  }, 'RECIPE_MATERIAL_ROUTE');
});

test('audit rejects a breakthrough recipe locked behind the breakthrough itself', () => {
  rejects(c => { c.recipes.foundation.min = 'foundation'; }, 'BREAKTHROUGH_CRAFT_ROUTE');
});

test('audit rejects a breakthrough purchase locked behind the breakthrough itself', () => {
  rejects(c => { c.items.foundation_pill.min = 'foundation'; }, 'BREAKTHROUGH_PURCHASE_ROUTE');
});

test('audit requires a repeatable income route before a paid recipe or purchase', () => {
  rejects(c => {
    for (const [id, source] of Object.entries(c.sources)) {
      if (source.stones > 0) delete c.sources[id];
    }
  }, 'INCOME_ROUTE');
});

test('critical breakthrough consumables cannot be sold', () => {
  rejects(c => { c.items.foundation_pill.sell = 1; }, 'BREAKTHROUGH_SALE');
});

test('breakthrough and trial configuration cannot silently bypass real consumables', () => {
  rejects(c => { c.realms.qi.pill = null; }, 'BREAKTHROUGH_ITEM');
  rejects(c => { c.realms.qi.pill = 'healing_pill'; }, 'BREAKTHROUGH_ITEM');
  rejects(c => { c.realms.spirit.pill = 'spirit_seed'; }, 'TRIAL_ITEM');
});

test('zero-currency cultivation and default school loadouts remain available', () => {
  rejects(c => { c.cultivation.natural.stones = 1; }, 'ZERO_RESOURCE_CULTIVATION');
  rejects(c => { c.skills.sword_build.price = 10; }, 'DEFAULT_SKILL');
});

test('audit rejects buy-sell and chained buy-craft-sell positive currency loops', () => {
  rejects(c => { c.items.herb.sell = c.items.herb.buy + 1; }, 'TRADE_PROFIT');
  rejects(c => {
    c.recipes.healing.inputs = { spirit_pill: 1 };
    c.recipes.healing.stones = 0;
    c.recipes.spirit.inputs = { herb: 1 };
    c.recipes.spirit.stones = 0;
    c.items.healing_pill.sell = 6;
  }, 'CRAFT_PROFIT');
});

test('audit detects missing, cyclic and future story prerequisites', () => {
  rejects(c => { c.stories.shen_pact.requires = 'missing'; }, 'STORY_REFERENCE');
  rejects(c => { c.stories.shen_return.requires = 'shen_pact'; }, 'STORY_CYCLE');
  rejects(c => { c.stories.lu_intro.requires = 'yan_gate'; }, 'STORY_REALM_GATE');
});

test('story IDs and option IDs remain unambiguous', () => {
  rejects(c => { c.stories.shen_return.id = 'wrong'; }, 'STORY_ID');
  rejects(c => {
    c.stories.shen_return.options[1].id = c.stories.shen_return.options[0].id;
  }, 'OPTION_ID');
});

test('engine-required default skills and trial stages cannot silently disappear', () => {
  rejects(c => { delete c.skills.sword_build; }, 'DEFAULT_SKILL');
  rejects(c => { delete c.enemies.trial_gate; }, 'TRIAL_STAGE');
});

test('audit rejects unsupported skill and relic effect identifiers', () => {
  rejects(c => { c.skills.sword_still.effect = 'unimplemented'; }, 'SKILL_EFFECT');
  rejects(c => { c.relics.jade_seal.effect = 'unimplemented'; }, 'RELIC_EFFECT');
});

test('known skill effects cannot be moved to a school or slot ignored by the resolver', () => {
  rejects(c => { c.skills.sword_still.slot = 'builder'; }, 'SKILL_SLOT');
  rejects(c => { c.skills.talisman_frost.school = 'sword'; }, 'SKILL_SLOT');
});
