import * as C from './content.ts';
import { stories } from './events.ts';
import { skillMechanisms, relicMechanisms } from './mechanisms.ts';

/** Build-time audit of this finite catalog, not a save parser or balance proof. */
export const fullCatalog = Object.freeze({
  realmIds: C.realmIds, realms: C.realms, locations: C.locations, items: C.items,
  sources: C.sources, recipes: C.recipes, skills: C.skills, relics: C.relics,
  enemies: C.enemies, cultivation: C.cultivation, assistedCosts: C.assistedCosts, maxBatch: C.maxBatch,
  maxQuantity: C.maxQuantity, actionDurations: C.actionDurations, startingLoadouts: C.startingLoadouts, stories,
});
export type ContentCatalog = typeof fullCatalog;

export class ContentError extends Error {
  readonly code: string;
  constructor(code: string, path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = 'ContentError';
    this.code = code;
  }
}

const trialIds = ['trial_heart', 'trial_thunder', 'trial_gate'];

export function validateContent(c: ContentCatalog = fullCatalog) {
  const fail = (code: string, path: string, detail: string): never => {
    throw new ContentError(code, path, detail);
  };
  const number = (value: number, path: string, minimum = 0) => {
    if (!Number.isSafeInteger(value) || value < minimum) {
      fail('CONTENT_NUMBER', path, `expected a safe integer >= ${minimum}`);
    }
  };
  const label = (value: string, path: string) => {
    if (typeof value !== 'string' || !value.trim()) fail('CONTENT_TEXT', path, 'empty text');
  };
  const reference = (table: object, id: string, path: string, code: string) => {
    if (!Object.hasOwn(table, id)) fail(code, path, `unknown reference ${id}`);
  };
  const rank = (realm: C.RealmId) => c.realmIds.indexOf(realm);
  const realm = (id: C.RealmId, path: string) => reference(c.realms, id, path, 'REALM_REFERENCE');
  const location = (id: C.LocationId, path: string) => reference(c.locations, id, path, 'LOCATION_REFERENCE');
  const materials = (values: Record<string, number>, path: string) => {
    for (const [id, quantity] of Object.entries(values)) {
      reference(c.items, id, path, 'ITEM_REFERENCE');
      number(quantity, `${path}.${id}`, 1);
      if (quantity > c.maxQuantity) fail('CONTENT_NUMBER', path, 'material requirement exceeds inventory capacity');
    }
  };
  const atRealm = (minimum: C.RealmId, current: C.RealmId) => rank(minimum) <= rank(current);
  const locationOpen = (id: C.LocationId, current: C.RealmId) => atRealm(c.locations[id].min, current);

  number(c.maxQuantity, 'maxQuantity', 1);
  number(c.maxBatch, 'maxBatch', 1);
  if (c.maxBatch > c.maxQuantity) fail('CONTENT_NUMBER', 'maxBatch', 'exceeds resource safety limit');
  if (new Set(c.realmIds).size !== c.realmIds.length ||
      c.realmIds.length !== Object.keys(c.realms).length ||
      c.realmIds[0] !== 'mortal' || c.realmIds.at(-1) !== 'ascended') {
    fail('REALM_CHAIN', 'realmIds', 'realm order must be complete and unique');
  }
  for (const [index, id] of c.realmIds.entries()) {
    realm(id, `realms.${id}`);
    const r = c.realms[id];
    label(r.name, `realms.${id}.name`);
    for (const field of ['xpCap', 'baseYield', 'power'] as const) number(r[field], `realms.${id}.${field}`);
    for (const field of ['maxHp', 'maxMp', 'lifespanMonths'] as const) number(r[field], `realms.${id}.${field}`, 1);
    if (id !== 'ascended' && (!r.xpCap || !r.baseYield)) fail('REALM_CHAIN', id, 'active realm needs cultivation');
    if (r.next !== null) realm(r.next, `realms.${id}.next`);
    const expected = id === 'spirit' || id === 'ascended' ? null : c.realmIds[index + 1];
    if (r.next !== expected) fail('REALM_CHAIN', id, 'ordinary breakthrough must follow realm order');
    if (r.pill !== null) reference(c.items, r.pill, `realms.${id}.pill`, 'ITEM_REFERENCE');
    if (!['mortal', 'ascended'].includes(id) && (r.pill === null || c.items[r.pill].kind !== 'breakthrough')) {
      fail('BREAKTHROUGH_ITEM', id, 'ordinary growth and trial require a real consumable');
    }
    if (id === 'spirit' && r.pill !== 'ascension_seal') fail('TRIAL_ITEM', id, 'START_TRIAL consumes ascension_seal');
  }
  for (const id of ['wilderness', 'cave', 'market', 'sect', 'secret', 'terrace'] as const) location(id, `locations.${id}`);
  for (const [id, value] of Object.entries(c.locations)) {
    realm(value.min, `locations.${id}.min`);
    label(value.name, `locations.${id}.name`);
  }
  for (const [id, value] of Object.entries(c.items)) {
    realm(value.min, `items.${id}.min`);
    label(value.name, `items.${id}.name`);
    if (!['material', 'medicine', 'breakthrough'].includes(value.kind)) fail('ITEM_KIND', id, 'unsupported item kind');
    number(value.buy, `items.${id}.buy`, 1);
    if (value.sell !== null) {
      number(value.sell, `items.${id}.sell`);
      if (value.sell > value.buy) fail('TRADE_PROFIT', id, 'purchase and sale create free currency');
    }
    for (const field of ['hp', 'mp'] as const) if (value[field] !== undefined) number(value[field], `items.${id}.${field}`, 1);
  }
  for (const [id, source] of Object.entries(c.sources)) {
    const path = `sources.${id}`;
    realm(source.min, `${path}.min`); location(source.location, `${path}.location`);
    number(source.months, `${path}.months`, 1);
    number(source.stones, `${path}.stones`); number(source.xp, `${path}.xp`);
    materials(source.items, `${path}.items`);
    if (!locationOpen(source.location, source.min)) fail('SOURCE_LOCATION_GATE', path, 'location unlocks after source');
    for (const item of Object.keys(source.items)) {
      if (!atRealm(c.items[item].min, source.min)) fail('SOURCE_ITEM_GATE', path, `${item} unlocks after source`);
    }
  }
  for (const [id, recipe] of Object.entries(c.recipes)) {
    const path = `recipes.${id}`;
    realm(recipe.min, `${path}.min`);
    reference(c.items, recipe.output, `${path}.output`, 'ITEM_REFERENCE');
    materials(recipe.inputs, `${path}.inputs`);
    if (!Object.keys(recipe.inputs).length) fail('RECIPE_INPUT', path, 'recipe needs material inputs');
    number(recipe.stones, `${path}.stones`); number(recipe.months, `${path}.months`, 1);
  }
  for (const [id, skill] of Object.entries(c.skills)) {
    realm(skill.min, `skills.${id}.min`); number(skill.price, `skills.${id}.price`);
    if (!['sword', 'talisman'].includes(skill.school) || !['mind', 'builder', 'finisher'].includes(skill.slot)) {
      fail('SKILL_SLOT', id, 'invalid school or slot');
    }
    if (!Object.hasOwn(skillMechanisms, skill.effect)) fail('SKILL_EFFECT', id, 'resolver does not support this mechanism');
    const binding = skillMechanisms[skill.effect];
    if (binding.school !== skill.school || binding.slot !== skill.slot) fail('SKILL_SLOT', id, 'mechanism expects a different school or slot');
  }
  for (const school of ['sword', 'talisman'] as const) {
    for (const slot of ['mind', 'builder', 'finisher'] as const) {
      const id = c.startingLoadouts[school][slot], skill = c.skills[id];
      if (!Object.hasOwn(c.skills, id) || skill.school !== school || skill.slot !== slot || !atRealm(skill.min, 'qi') || skill.price !== 0) {
        fail('DEFAULT_SKILL', id, 'SCHOOL needs its complete starting loadout');
      }
    }
  }
  for (const [id, relic] of Object.entries(c.relics)) {
    materials(relic.inputs, `relics.${id}.inputs`); number(relic.stones, `relics.${id}.stones`);
    if (!Object.hasOwn(relicMechanisms, relic.effect)) fail('RELIC_EFFECT', id, 'resolver does not support this mechanism');
  }
  for (const [id, enemy] of Object.entries(c.enemies)) {
    realm(enemy.min, `enemies.${id}.min`); location(enemy.location, `enemies.${id}.location`);
    for (const field of ['attack', 'heavy', 'xp', 'stones'] as const) number(enemy[field], `enemies.${id}.${field}`);
    number(enemy.hp, `enemies.${id}.hp`, 1); materials(enemy.loot, `enemies.${id}.loot`);
    if (!locationOpen(enemy.location, enemy.min)) fail('ENEMY_LOCATION_GATE', id, 'location unlocks after encounter');
    if (enemy.trial && !trialIds.includes(id)) fail('TRIAL_STAGE', id, 'unknown trial stage');
  }
  for (const id of trialIds) {
    const enemy = c.enemies[id];
    if (!Object.hasOwn(c.enemies, id) || !enemy.trial || enemy.min !== 'spirit' || enemy.location !== 'terrace') {
      fail('TRIAL_STAGE', id, 'three-stage resolver needs this trial encounter');
    }
  }
  for (const [id, months] of Object.entries(c.actionDurations)) number(months, `actionDurations.${id}`, 1);
  for (const [id, action] of Object.entries(c.cultivation)) {
    number(action.months, `cultivation.${id}.months`, 1);
    number(action.stones, `cultivation.${id}.stones`); number(action.bonus, `cultivation.${id}.bonus`);
  }
  if (c.cultivation.natural.stones !== 0) fail('ZERO_RESOURCE_CULTIVATION', 'natural', 'basic cultivation must remain possible without currency');
  if (Object.keys(c.assistedCosts).length !== c.realmIds.length || c.realmIds.some(id => !Object.hasOwn(c.assistedCosts, id))) fail('ASSISTED_COSTS', 'assistedCosts', 'every realm requires an explicit quote');
  for (const [id, cost] of Object.entries(c.assistedCosts)) { realm(id as C.RealmId, 'assistedCosts.' + id); number(cost, 'assistedCosts.' + id, 1); }
  if (c.assistedCosts.qi !== c.cultivation.assisted.stones) fail('ASSISTED_COSTS', 'assistedCosts.qi', 'base fee and qi fee must agree');


  for (const [id, story] of Object.entries(c.stories)) {
    if (story.id !== id) fail('STORY_ID', id, 'story identity differs from lookup key');
    realm(story.min, `stories.${id}.min`); location(story.location, `stories.${id}.location`);
    if (!locationOpen(story.location, story.min)) fail('STORY_LOCATION_GATE', id, 'location unlocks after story');
    if (story.requires) reference(c.stories, story.requires, `stories.${id}.requires`, 'STORY_REFERENCE');
    if (!story.options.length) fail('OPTION_ID', id, 'event needs an option');
    const ids = new Set<string>();
    for (const option of story.options) {
      if (!option.id || ids.has(option.id)) fail('OPTION_ID', id, 'duplicate or empty option identity');
      ids.add(option.id);
      label(option.label, `${id}.${option.id}.label`); label(option.result, `${id}.${option.id}.result`);
      materials(option.cost ?? {}, `${id}.${option.id}.cost`); materials(option.gain ?? {}, `${id}.${option.id}.gain`);
      for (const field of ['stones', 'reward', 'xp'] as const) if (option[field] !== undefined) number(option[field], `${id}.${option.id}.${field}`);
    }
  }
  const visited = new Set<string>(), visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) fail('STORY_CYCLE', id, 'cyclic story prerequisite');
    if (visited.has(id)) return;
    visiting.add(id);
    const previous = c.stories[id].requires;
    if (previous) visit(previous);
    visiting.delete(id); visited.add(id);
  };
  for (const id of Object.keys(c.stories)) visit(id);
  for (const story of Object.values(c.stories)) {
    if (story.requires && !atRealm(c.stories[story.requires].min, story.min)) {
      fail('STORY_REALM_GATE', story.id, 'prerequisite requires a later realm');
    }
  }

  const sourcesAt = (current: C.RealmId) => Object.entries(c.sources).filter(([, s]) => atRealm(s.min, current) && locationOpen(s.location, current));
  const incomeAt = (current: C.RealmId) => sourcesAt(current).filter(([, s]) => s.stones > 0).map(([id]) => id);
  const recipesAt = (current: C.RealmId) => Object.entries(c.recipes).filter(([, r]) => atRealm(r.min, current) && locationOpen('cave', current));
  const materialsAt = (current: C.RealmId) => {
    const reachable = new Set(sourcesAt(current).flatMap(([, s]) => Object.keys(s.items)));
    let changed = true;
    while (changed) {
      changed = false;
      for (const [, recipe] of recipesAt(current)) {
        if ((!recipe.stones || incomeAt(current).length) && Object.keys(recipe.inputs).every(id => reachable.has(id)) && !reachable.has(recipe.output)) {
          reachable.add(recipe.output); changed = true;
        }
      }
    }
    return reachable;
  };
  for (const [id, recipe] of Object.entries(c.recipes)) {
    if (recipe.stones && !incomeAt(recipe.min).length) fail('INCOME_ROUTE', id, 'no repeatable income for recipe fee');
    const reachable = materialsAt(recipe.min);
    for (const item of Object.keys(recipe.inputs)) {
      if (!reachable.has(item)) fail('RECIPE_MATERIAL_ROUTE', id, `no deterministic crafting material route for ${item}`);
    }
  }
  const forgeMaterials = materialsAt('golden');
  for (const [id, relic] of Object.entries(c.relics)) {
    if (relic.stones && !incomeAt('golden').length) fail('INCOME_ROUTE', id, 'no repeatable forge income');
    if (Object.keys(relic.inputs).some(item => !forgeMaterials.has(item))) fail('RELIC_MATERIAL_ROUTE', id, 'forge materials unavailable at golden realm');
  }
  const breakthroughs = [];
  for (const current of c.realmIds) {
    const item = c.realms[current].pill;
    if (!item) continue;
    const definition = c.items[item], income = incomeAt(current), reachable = materialsAt(current);
    if (definition.sell !== null) fail('BREAKTHROUGH_SALE', item, 'critical consumable must not be sold');
    if (!locationOpen('market', current) || !atRealm(definition.min, current)) fail('BREAKTHROUGH_PURCHASE_ROUTE', item, 'purchase requires a later realm');
    if (!income.length) fail('INCOME_ROUTE', item, 'no repeatable income for purchase');
    const crafting = recipesAt(current).filter(([, r]) => r.output === item && Object.keys(r.inputs).every(id => reachable.has(id))).map(([id]) => id);
    if (!crafting.length) fail('BREAKTHROUGH_CRAFT_ROUTE', item, 'crafting requires a later realm or unavailable materials');
    breakthroughs.push({ realm: current, item, crafting, income, purchase: { location: 'market', price: definition.buy } });
  }

  // Repeated relaxation includes chains of recipes, rather than checking only
  // each recipe against the purchase prices of its immediate inputs.
  for (const current of c.realmIds) {
    if (!locationOpen('market', current)) continue;
    const costs = new Map(Object.entries(c.items).filter(([, i]) => atRealm(i.min, current)).map(([id, i]) => [id, i.buy]));
    for (let pass = 0; pass < Object.keys(c.items).length; pass++) {
      let changed = false;
      for (const [, recipe] of recipesAt(current)) {
        if (!Object.keys(recipe.inputs).every(id => costs.has(id))) continue;
        const cost = recipe.stones + Object.entries(recipe.inputs).reduce((sum, [id, n]) => sum + costs.get(id)! * n, 0);
        number(cost, `recipes.${recipe.output}.purchaseCost`);
        if (!costs.has(recipe.output) || cost < costs.get(recipe.output)!) {
          costs.set(recipe.output, cost); changed = true;
        }
      }
      if (!changed) break;
    }
    for (const [id, cost] of costs) {
      const sell = c.items[id].sell;
      if (sell !== null && sell > cost) fail('CRAFT_PROFIT', id, 'purchase/crafting chain creates positive currency');
    }
  }
  return {
    contentVersion: C.VERSION, balanceVersion: C.BALANCE,
    counts: Object.fromEntries((['realms', 'locations', 'items', 'sources', 'recipes', 'skills', 'relics', 'enemies', 'stories'] as const).map(key => [key, Object.keys(c[key]).length])),
    breakthroughs,
    scope: 'Static unlock, deterministic material and currency routes; not lifespan, browser, migration, or balance acceptance.',
  };
}
