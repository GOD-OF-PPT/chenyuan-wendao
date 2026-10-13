import type { Content } from '../game/types.ts';

/** Six control tables. Initial values, NOT a balanced full game economy. */
export const content: Content = {
  version: 'm1-economic-slice.1', balanceVersion: 'm1-unbalanced.1',
  realms: {
    mortal: { name: '凡人', xpCap: 10, baseYield: 5, maxHp: 60, maxMp: 20, lifespanMonths: 1080, next: 'qi', breakthroughCost: {} },
    qi: { name: '炼气', xpCap: 1000, baseYield: 50, maxHp: 100, maxMp: 60, lifespanMonths: 1440, next: 'foundation', breakthroughCost: { foundation_pill: 1 } },
    foundation: { name: '筑基', xpCap: 3000, baseYield: 120, maxHp: 170, maxMp: 100, lifespanMonths: 2880, next: null, breakthroughCost: {} }
  },
  items: {
    herb: { name: '凝气草', minRealm: 'qi', buy: 5, sell: 2 },
    dew: { name: '灵露', minRealm: 'qi', buy: 10, sell: 4 },
    core: { name: '妖核', minRealm: 'qi', buy: 50, sell: 15 },
    healing_pill: { name: '回春丹', minRealm: 'mortal', buy: 18, sell: 5, healHp: 35 },
    spirit_pill: { name: '回灵丹', minRealm: 'qi', buy: 18, sell: 5, healMp: 25 },
    foundation_pill: { name: '筑基丹', minRealm: 'qi', buy: 160, sell: null }
  },
  sources: {
    herbs: { name: '山野采药', location: 'wilderness', minRealm: 'qi', months: 1, stones: 0, xp: 5, items: { herb: 2 } },
    dew: { name: '晨间凝露', location: 'wilderness', minRealm: 'qi', months: 1, stones: 0, xp: 5, items: { dew: 1 } },
    work: { name: '宗门杂务', location: 'sect', minRealm: 'qi', months: 1, stones: 20, xp: 0, items: {} },
    core: { name: '宗门护送委托', location: 'sect', minRealm: 'qi', months: 4, stones: 0, xp: 20, items: { core: 1 } }
  },
  recipes: {
    healing: { name: '炼制回春丹', minRealm: 'qi', inputs: { herb: 2 }, stones: 2, months: 1, output: 'healing_pill' },
    spirit: { name: '炼制回灵丹', minRealm: 'qi', inputs: { herb: 1, dew: 1 }, stones: 3, months: 1, output: 'spirit_pill' },
    foundation: { name: '炼制筑基丹', minRealm: 'qi', inputs: { herb: 8, dew: 2, core: 1 }, stones: 20, months: 1, output: 'foundation_pill' }
  },
  cultivation: {
    natural: { minRealm: 'mortal', months: 1, stones: 0, bonusPercent: 0 },
    assisted: { minRealm: 'qi', months: 1, stones: 20, bonusPercent: 100 }
  },
  modifiers: { cultivationBonusCapPercent: 100, maxBatch: 50, maxQuantity: 1000000 }
};
function deepFreeze(value: object): void {
  for (const item of Object.values(value)) if (item && typeof item === 'object') deepFreeze(item);
  Object.freeze(value);
}
deepFreeze(content);
