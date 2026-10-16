import * as C from './content.ts';
import { stories } from './events.ts';
import { resolve, validateGame } from './engine.ts';
import { fail, RuleError } from './errors.ts';
import { costDeficits, getActionResources, getBreakthroughGoal, getItemSources, previewAction } from './queries.ts';
import type { Action, Game } from './types.ts';

export type TrackingTarget = { kind: 'breakthrough' } |
  { kind: 'item'; id: string; quantity: number } | { kind: 'skill' | 'relic' | 'event'; id: string };
export type CollectionTarget = { kind: 'item'; id: string; quantity: number } | { kind: 'stones'; quantity: number };

export function planCollection(game: Game, sourceId: string, target: CollectionTarget): Action | null {
  validateGame(game);
  if (!target || typeof target !== 'object' || Array.isArray(target) || !Object.hasOwn(C.sources, sourceId) || !Number.isSafeInteger(target.quantity) || target.quantity < 1 || target.quantity > C.maxQuantity) fail('INVALID_GOAL', '取材目标无效');
  const source = C.sources[sourceId];
  if (target.kind === 'item') {
    parseTrackingTarget(target);
    return source.items[target.id] ? { type: 'SOURCE', sourceId, count: C.maxBatch, target: { item: target.id, quantity: target.quantity } } : null;
  }
  if (target.kind !== 'stones' || Object.keys(target).sort().join(',') !== 'kind,quantity') fail('INVALID_GOAL', '取材目标无效');
  const shortage = costDeficits(game, { stones: target.quantity, mp: 0, months: 0, items: {} })[0];
  return source.stones > 0 && shortage ? { type: 'SOURCE', sourceId, count: Math.min(C.maxBatch, Math.ceil(shortage.missing / source.stones)) } : null;
}

export function parseTrackingTarget(value: unknown): TrackingTarget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_GOAL', '追踪目标无效');
  const v = value as Record<string, unknown>, keys = Object.keys(v).sort().join(',');
  if (v.kind === 'breakthrough' && keys === 'kind') return { kind: 'breakthrough' };
  if (v.kind === 'item' && keys === 'id,kind,quantity' && typeof v.id === 'string' && Object.hasOwn(C.items, v.id) &&
      Number.isSafeInteger(v.quantity) && Number(v.quantity) >= 1 && Number(v.quantity) <= C.maxQuantity) {
    return { kind: 'item', id: v.id, quantity: Number(v.quantity) };
  }
  if (keys === 'id,kind' && typeof v.id === 'string') {
    const catalog = v.kind === 'skill' ? C.skills : v.kind === 'relic' ? C.relics : v.kind === 'event' ? stories : null;
    if (catalog && Object.hasOwn(catalog, v.id)) return { kind: v.kind as 'skill' | 'relic' | 'event', id: v.id };
  }
  return fail('INVALID_GOAL', '追踪目标或数量无效');
}

/** Display-only target. Reading or selecting it never reserves inventory. */
export function getTrackedGoal(game: Game, input: TrackingTarget) {
  validateGame(game);
  const target = parseTrackingTarget(input);
  if (target.kind === 'breakthrough') {
    const goal = getBreakthroughGoal(game), resources = goal.action ? getActionResources(game, goal.action) : null;
    return { target, title: goal.title, completed: game.status !== 'active', action: goal.action,
      preview: goal.preview, deficits: goal.deficits, materials: resources?.materials ?? [], currency: resources?.currency ?? [],
      requiredItems: goal.preview?.costs?.items ?? {}, sources: [] };
  }
  if (target.kind === 'item') {
    const requiredItems = { [target.id]: target.quantity };
    const deficits = costDeficits(game, { stones: 0, mp: 0, months: 0, items: requiredItems });
    return { target, title: `筹备${C.items[target.id].name} ×${target.quantity}`, completed: !deficits.length,
      action: null, preview: null, deficits, materials: [], currency: [], requiredItems,
      sources: getItemSources(game, target.id, deficits[0]?.missing ?? 1) };
  }
  const action: Action = target.kind === 'skill' ? { type: 'LEARN', skill: target.id } :
    target.kind === 'relic' ? { type: 'FORGE', relic: target.id } : { type: 'EVENT', event: target.id };
  const completed = target.kind === 'skill' ? game.learned.includes(target.id) :
    target.kind === 'relic' ? game.ownedRelics.includes(target.id) : Object.hasOwn(game.choices, target.id);
  const title = target.kind === 'skill' ? `研习${C.skills[target.id].name}` :
    target.kind === 'relic' ? `炼成${C.relics[target.id].name}` : `拜访 · ${stories[target.id].name}`;
  const resources = getActionResources(game, action);
  return { target, title, completed, action, preview: resources.preview,
    deficits: completed ? [] : resources.preview.deficits, materials: completed ? [] : resources.materials,
    currency: completed ? [] : resources.currency, requiredItems: completed ? {} : resources.preview.costs?.items ?? {}, sources: [] };
}

/** Warn only about a real legal action making an actively tracked shortage worse. */
export function trackingConsumption(game: Game, target: TrackingTarget, action: Action) {
  const goal = getTrackedGoal(game, target);
  if (goal.action && JSON.stringify(goal.action) === JSON.stringify(action)) return [];
  return consumptionDeficits(game, goal.requiredItems, action);
}

export function preparationConsumption(game: Game, preparation: Action, action: Action) {
  if (JSON.stringify(preparation) === JSON.stringify(action)) return [];
  return consumptionDeficits(game, previewAction(game, preparation).costs?.items ?? {}, action);
}

function consumptionDeficits(game: Game, requiredItems: Record<string, number>, action: Action) {
  try {
    const after = resolve(game, { ...action, commandId: 'tracking-preview', runId: game.core.runId, expectedRevision: game.core.revision }).nextState;
    const cost = { stones: 0, mp: 0, months: 0, items: requiredItems };
    const before = costDeficits(game, cost);
    return costDeficits(after, cost).filter(gap => gap.missing > (before.find(old => old.id === gap.id)?.missing ?? 0));
  } catch (error) { if (error instanceof RuleError) return []; throw error; }
}
