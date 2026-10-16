import * as C from './content.ts';
import { stories } from './events.ts';
import type { Action, Game } from './types.ts';
import type { ActionCosts } from './contracts.ts';
import { fail } from './errors.ts';

export interface ActionRequirements {
  location?: C.LocationId; minRealm?: C.RealmId; xp?: number; hp?: number;
  schoolRequired?: boolean;
}
export function remainingMonths(game: Game): number {
  return C.realms[game.core.player.realm].lifespanMonths - game.core.player.startAgeMonths - game.core.world.elapsedMonths;
}
export function requirementsForAction(game: Game, action: Action): ActionRequirements {
  switch (action.type) {
    case 'CULTIVATE': return { location: 'cave', ...(action.method === 'assisted' ? { minRealm: 'qi' } : {}) };
    case 'SOURCE': return { location: C.sources[action.sourceId].location, minRealm: C.sources[action.sourceId].min };
    case 'BUY': return { location: 'market', minRealm: C.items[action.item].min };
    case 'SELL': return { location: 'market' };
    case 'CRAFT': return { location: 'cave', minRealm: C.recipes[action.recipeId].min };
    case 'REST': return { location: 'cave' };
    case 'BREAKTHROUGH': return { location: 'cave', xp: C.realms[game.core.player.realm].xpCap };
    case 'STUDY': return { location: 'sect', minRealm: C.swordManual.min };
    case 'LEARN': return { location: 'sect', minRealm: C.skills[action.skill].min };
    case 'FORGE': return { location: 'cave', minRealm: 'golden' };
    case 'ENCOUNTER': return { location: C.enemies[action.enemy].location, minRealm: C.enemies[action.enemy].min, hp: 30, schoolRequired: true };
    case 'START_TRIAL': return { location: 'terrace', minRealm: 'spirit', xp: C.realms.spirit.xpCap, hp: Math.floor(C.realms.spirit.maxHp * .8), schoolRequired: true };
    case 'TRAVEL': return { minRealm: C.locations[action.location].min };
    case 'EVENT': return { location: stories[action.event].location, minRealm: stories[action.event].min };
    default: return {};
  }
}

/** Caller validates command identities/references first. No state is modified. */
export function costsForAction(game: Game, action: Action): ActionCosts {
  const cost: ActionCosts = { stones: 0, mp: 0, months: 0, items: {} };
  switch (action.type) {
    case 'CHOOSE': if (action.choice !== 'leave') cost.items.healing_pill = 1; break;
    case 'CULTIVATE': Object.assign(cost, { stones: action.method === 'assisted' ? C.assistedCosts[game.core.player.realm] : C.cultivation.natural.stones, months: C.cultivation[action.method].months }); break;
    case 'SOURCE': cost.months = C.sources[action.sourceId].months; break;
    case 'BUY': cost.stones = C.items[action.item].buy * action.quantity; break;
    case 'SELL': cost.items[action.item] = action.quantity; break;
    case 'CRAFT': {
      const r = C.recipes[action.recipeId];
      Object.assign(cost, { stones: r.stones, months: r.months, items: { ...r.inputs } }); break;
    }
    case 'USE': cost.items[action.item] = 1; break;
    case 'REST': cost.months = C.actionDurations.rest; break;
    case 'END_LIFE': cost.months = C.actionDurations.endLife; break;
    case 'BREAKTHROUGH': {
      const pill = C.realms[game.core.player.realm].pill;
      if (pill) cost.items[pill] = 1;
      break;
    }
    case 'STUDY': cost.stones = C.swordManual.price; break;
    case 'LEARN': cost.stones = C.skills[action.skill].price; break;
    case 'FORGE': Object.assign(cost, { stones: C.relics[action.relic].stones, items: { ...C.relics[action.relic].inputs }, months: C.actionDurations.forge }); break;
    case 'ENCOUNTER': cost.months = C.actionDurations.encounter; break;
    case 'START_TRIAL': cost.items.ascension_seal = 1; break;
    case 'DECIDE': {
      const story = game.core.activeEvent && stories[game.core.activeEvent.id];
      if (!story) fail('NO_EVENT', '没有待处理的机缘');
      const option = story.options.find(option => option.id === action.option);
      if (!option) fail('INVALID_OPTION', '选项无效');
      cost.stones = option.stones ?? 0; cost.items = { ...option.cost }; break;
    }
    case 'BATTLE': {
      if (action.move === 'technique') {
        const builder = game.loadout.builder && C.skills[game.loadout.builder];
        cost.mp = game.school === 'talisman' && builder && builder.effect === 'frost' ? 10 : 8;
      }
      if (action.move === 'release') cost.mp = game.school === 'sword' ? 12 : 10;
      if (action.move === 'heal') cost.items.healing_pill = 1;
      if (action.move === 'restore') cost.items.spirit_pill = 1;
      break;
    }
  }
  return cost;
}

export function multiplyCosts(cost: ActionCosts, count: number): ActionCosts {
  return { stones: cost.stones * count, mp: cost.mp * count, months: cost.months * count,
    items: Object.fromEntries(Object.entries(cost.items).map(([id, n]) => [id, n * count])) };
}
