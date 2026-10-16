import * as C from './content.ts';
import { stories } from './events.ts';
import { conditionMatches, storyView, relationshipViews, causalAid } from './story-context.ts';
import { resolve, validateCommand, validateGame } from './engine.ts';
import { RuleError, fail } from './errors.ts';
import { costsForAction, multiplyCosts, requirementsForAction, remainingMonths } from './costs.ts';
import type { ActionRequirements } from './costs.ts';
import { gamePhase } from './contracts.ts';
import type { ActionCosts, RuleFailure, StateDelta } from './contracts.ts';
import type { Action, Command, Game } from './types.ts';

const previewCommand = (game: Game, action: Action): Command => ({
  ...action, commandId: 'preview', runId: game.core.runId, expectedRevision: game.core.revision,
});
export interface ActionPreview {
  action: Action; allowed: boolean; failure: RuleFailure | null;
  requirements: ActionRequirements; costs: ActionCosts | null; maximumCosts: ActionCosts | null;
  actualCosts: ActionCosts | null; delta: StateDelta | null;
  deficits: ResourceDeficit[];
  requestedSteps: number; executedSteps: number; stopReason: RuleFailure | null;
}
export function previewAction(game: Game, action: Action): ActionPreview {
  validateGame(game);
  const command = previewCommand(game, action);
  let requirements: ActionRequirements = {}, costs: ActionCosts | null = null;
  let requestedSteps = 0;
  try {
    const resolved = resolve(game, command);
    requirements = requirementsForAction(game, action);
    costs = costsForAction(game, action);
    requestedSteps = resolved.result.requestedSteps;
    return { action: structuredClone(action), allowed: true, failure: null, requirements, costs,
      maximumCosts: multiplyCosts(costs, requestedSteps), actualCosts: resolved.result.costs,
      delta: resolved.result.delta, requestedSteps, executedSteps: resolved.result.executedSteps,
      deficits: costDeficits(game, costs, requirements, action.type === 'END_LIFE'),
      stopReason: resolved.result.stopReason };
  } catch (error) {
    if (!(error instanceof RuleError)) throw error;
    // Preserve the resolver's first failure. Metadata must not replace it with
    // a secondary quote error (for example DECIDE after the run has ended).
    try {
      validateCommand(command);
      requestedSteps = action.type === 'CULTIVATE' || action.type === 'SOURCE' ? action.count ?? 1 : 1;
      requirements = requirementsForAction(game, action);
      costs = costsForAction(game, action);
    } catch (metadataError) {
      if (!(metadataError instanceof RuleError)) throw metadataError;
    }
    return { action: structuredClone(action), allowed: false, failure: { code: error.code, message: error.message },
      requirements, costs, maximumCosts: costs ? multiplyCosts(costs, requestedSteps) : null,
      actualCosts: null, delta: null, deficits: costs ? costDeficits(game, costs, requirements, action.type === 'END_LIFE') : [],
      requestedSteps, executedSteps: 0, stopReason: null };
  }
}
export interface ResourceDeficit {
  kind: 'stones' | 'mp' | 'months' | 'item' | 'xp' | 'hp';
  id?: string; required: number; have: number; missing: number;
}
export function costDeficits(game: Game, costs: ActionCosts, requirements: ActionRequirements = {}, endingLife = false): ResourceDeficit[] {
  validateGame(game);
  const deficits: ResourceDeficit[] = [];
  const add = (kind: ResourceDeficit['kind'], required: number, have: number, id?: string) => {
    const missing = Math.max(0, required - have);
    if (missing) deficits.push({ kind, ...(id ? { id } : {}), required, have, missing });
  };
  add('stones', costs.stones, game.core.player.stones);
  add('mp', costs.mp, game.core.player.mp);
  add('months', costs.months, Math.max(0, remainingMonths(game) - (endingLife ? 0 : 1)));
  for (const [id, n] of Object.entries(costs.items)) {
    if (!Object.hasOwn(C.items, id)) fail('INVALID_QUERY', '未知物品');
    add('item', n, game.core.inventory[id], id);
  }
  if (requirements.xp !== undefined) add('xp', requirements.xp, game.core.player.xp);
  if (requirements.hp !== undefined) add('hp', requirements.hp, game.core.player.hp);
  return deficits;
}

export interface ItemSource {
  resource: { kind: 'item'; id: string } | { kind: 'stones' };
  kind: 'source' | 'recipe' | 'purchase' | 'battle' | 'event';
  id: string; label: string; location: C.LocationId; rewardCount: number;
  repeatable: boolean; conditionalOnVictory: boolean;
  navigation: Action | null; steps: Action[]; previews: ActionPreview[];
  available: boolean; failure: RuleFailure | null; costs: ActionCosts | null;
  deficits: ResourceDeficit[];
}
function sourcePlan(game: Game, source: Omit<ItemSource, 'navigation' | 'steps' | 'previews' | 'available' | 'failure' | 'costs' | 'deficits'>, actions: Action[]): ItemSource {
  const navigation: Action | null = game.core.world.location === source.location ? null : { type: 'TRAVEL', location: source.location };
  const steps = navigation ? [navigation, ...actions] : actions;
  const previews: ActionPreview[] = [];
  let projected = game, failure: RuleFailure | null = null, deficits: ResourceDeficit[] = [];
  const total: ActionCosts = { stones: 0, mp: 0, months: 0, items: {} };
  for (const action of steps) {
    const preview = previewAction(projected, action);
    previews.push(preview);
    if (preview.maximumCosts) {
      total.stones += preview.maximumCosts.stones; total.mp += preview.maximumCosts.mp; total.months += preview.maximumCosts.months;
      for (const [id, n] of Object.entries(preview.maximumCosts.items)) total.items[id] = (total.items[id] ?? 0) + n;
      deficits = preview.deficits;
    }
    if (!preview.allowed) { failure = preview.failure; break; }
    projected = resolve(projected, previewCommand(projected, action)).nextState;
  }
  const completePreview = previews.length === steps.length && previews.every(preview => preview.costs !== null);
  return { ...source, navigation, steps, previews, available: failure === null, failure,
    costs: completePreview ? total : null, deficits };
}

/** One configured acquisition at a time. Battle rewards require a future win. */
export function getItemSources(game: Game, item: string, purchaseQuantity = 1, kinds?: readonly ItemSource['kind'][]): ItemSource[] {
  validateGame(game);
  if (!Object.hasOwn(C.items, item) || !Number.isSafeInteger(purchaseQuantity) || purchaseQuantity < 1 || purchaseQuantity > C.maxQuantity) fail('INVALID_QUERY', '物品或采购数量无效');
  const allKinds: ItemSource['kind'][] = ['source', 'recipe', 'purchase', 'battle', 'event'];
  if (kinds !== undefined && (!Array.isArray(kinds) || kinds.some(kind => !allKinds.includes(kind)))) fail('INVALID_QUERY', '来源类别无效');
  const selected = new Set(kinds ?? allKinds);
  const result: ItemSource[] = [];
  for (const [id, source] of Object.entries(C.sources)) {
    if (!selected.has('source') || !source.items[item]) continue;
    result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'source', id, label: source.name, location: source.location,
      rewardCount: source.items[item], repeatable: true, conditionalOnVictory: false }, [{ type: 'SOURCE', sourceId: id }]));
  }
  for (const [id, recipe] of Object.entries(C.recipes)) {
    if (!selected.has('recipe') || recipe.output !== item) continue;
    result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'recipe', id, label: recipe.name, location: 'cave',
      rewardCount: 1, repeatable: true, conditionalOnVictory: false }, [{ type: 'CRAFT', recipeId: id }]));
  }
  if (selected.has('purchase')) result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'purchase', id: item, label: `购买${C.items[item].name}`, location: 'market',
    rewardCount: purchaseQuantity, repeatable: true, conditionalOnVictory: false }, [{ type: 'BUY', item, quantity: purchaseQuantity }]));
  for (const [id, enemy] of Object.entries(C.enemies)) {
    if (!selected.has('battle') || !enemy.loot[item] || enemy.trial) continue;
    result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'battle', id, label: enemy.name, location: enemy.location,
      rewardCount: enemy.loot[item], repeatable: true, conditionalOnVictory: true }, [{ type: 'ENCOUNTER', enemy: id }]));
  }
  for (const [id, story] of Object.entries(stories)) {
    if (!selected.has('event')) continue;
    for (const option of story.options) {
      if (!conditionMatches(game, option.condition)) continue;
      const rewardCount = option.gain?.[item];
      if (!rewardCount) continue;
      const actions: Action[] = game.core.activeEvent?.id === id ? [] : [{ type: 'EVENT', event: id }];
      actions.push({ type: 'DECIDE', option: option.id });
      result.push(sourcePlan(game, { resource: { kind: 'item', id: item }, kind: 'event', id: `${id}:${option.id}`, label: `${story.name} · ${option.label}`,
        location: story.location, rewardCount, repeatable: false, conditionalOnVictory: false }, actions));
    }
  }
  return result;
}

export function getCurrencySources(game: Game): ItemSource[] {
  validateGame(game);
  return Object.entries(C.sources).filter(([, source]) => source.stones > 0).map(([id, source]) =>
    sourcePlan(game, { resource: { kind: 'stones' }, kind: 'source', id, label: source.name,
      location: source.location, rewardCount: source.stones, repeatable: true, conditionalOnVictory: false },
    [{ type: 'SOURCE', sourceId: id }]));
}

/** Preparation data also serves skill/relic targets without another UI formula. */
export function getActionResources(game: Game, action: Action) {
  const preview = previewAction(game, action);
  return { preview,
    materials: preview.deficits.flatMap(deficit => deficit.kind === 'item' && deficit.id ?
      [{ deficit, sources: getItemSources(game, deficit.id, deficit.missing) }] : []),
    currency: preview.deficits.some(deficit => deficit.kind === 'stones') ? getCurrencySources(game) : [] };
}

export function getBreakthroughGoal(game: Game) {
  validateGame(game);
  const phase = gamePhase(game), realm = C.realms[game.core.player.realm];
  if (game.status !== 'active') return { phase, title: game.status === 'ascended' ? '此生已飞升' : game.ending === 'retired' ? '此生主动归隐' : '此生寿元已尽',
    action: null, preview: null, deficits: [], sources: [], targetRealm: null };
  if (game.trial) return { phase, title: phase === 'trial-question' ? '回答问心' : phase === 'trial-ending' ? '选择此生结尾' : '渡过当前天劫',
    action: null, preview: null, deficits: [], sources: [], targetRealm: 'ascended' as C.RealmId };
  const action: Action = { type: game.core.player.realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH' };
  const preview = previewAction(game, action);
  return { phase, title: game.core.player.realm === 'mortal' ? '引气入体' : game.core.player.realm === 'spirit' ? '筹备渡劫' : `筹备${C.realms[realm.next!].name}`,
    action, preview, deficits: preview.deficits,
    sources: realm.pill ? getItemSources(game, realm.pill) : [], targetRealm: realm.next ?? 'ascended' };
}


export function getStoryContext(game: Game, id: string) {
  validateGame(game);
  if (!Object.hasOwn(stories, id)) fail('INVALID_QUERY', '未知人物事件');
  return structuredClone(storyView(game, stories[id]));
}
export function getRelationships(game: Game) { validateGame(game); return structuredClone(relationshipViews(game)); }
export function getCausalAid(game: Game) { validateGame(game); return causalAid(game); }
