import { VERSION, type RealmId } from './content.ts';
import { stories } from './events.ts';
import { RuleError } from './errors.ts';
import type { Game } from './types.ts';

export type InheritanceChoice = 'none' | 'ending-gift';
export interface Inheritance {
  sourceRunId: string;
  sourceRevision: number;
  sourceName: string;
  sourceEnding: 'transmit' | 'depart';
  contentVersion: string;
  balanceVersion: string;
}
export interface Incarnation {
  version: 1;
  seed: string;
  inheritance: Inheritance | null;
}
export function validateInheritanceChoice(
  value: unknown,
): asserts value is InheritanceChoice {
  if (value !== 'none' && value !== 'ending-gift')
    throw new RuleError(
      'INVALID_INHERITANCE',
      '请选择从头开卷，或携本卷对应的前缘赠礼',
    );
}
export function inheritanceFrom(source: Game): Inheritance {
  if (
    source.status !== 'ascended' ||
    (source.ending !== 'transmit' && source.ending !== 'depart')
  )
    throw new RuleError(
      'INHERITANCE_UNAVAILABLE',
      '此卷尚无已确认的飞升前缘，可从头开启新人生',
    );
  return {
    sourceRunId: source.core.runId,
    sourceRevision: source.core.revision,
    sourceName: source.core.player.name,
    sourceEnding: source.ending,
    contentVersion: source.core.contentVersion,
    balanceVersion: source.core.balanceVersion,
  };
}
export function inheritanceOffer(source: Game) {
  if (
    source.status !== 'ascended' ||
    (source.ending !== 'transmit' && source.ending !== 'depart')
  )
    return null;
  return source.ending === 'transmit'
    ? {
        choice: 'ending-gift' as const,
        label: '传灯药囊',
        summary: '新卷开局额外回春丹1枚，合计2枚；仍从凡人18岁开始。',
        stones: 0,
        items: { healing_pill: 1 },
      }
    : {
        choice: 'ending-gift' as const,
        label: '远游路资',
        summary: '新卷开局额外20灵石，合计60灵石；仍从凡人18岁开始。',
        stones: 20,
        items: {},
      };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= 100;
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).length === allowed.length &&
  Object.keys(v).every((k) => allowed.includes(k));
function invalid(): never {
  throw new RuleError(
    'SAVE_INCARNATION',
    '此卷种子或前缘记录无效，请保留原存档',
  );
}

export function validateIncarnation(
  value: unknown,
  runId: string,
): asserts value is Incarnation {
  if (
    !object(value) ||
    !keys(value, ['version', 'seed', 'inheritance']) ||
    value.version !== 1 ||
    !text(value.seed)
  )
    invalid();
  const origin = value.inheritance;
  if (origin === null) return;
  if (
    !object(origin) ||
    !keys(origin, [
      'sourceRunId',
      'sourceRevision',
      'sourceName',
      'sourceEnding',
      'contentVersion',
      'balanceVersion',
    ]) ||
    !text(origin.sourceRunId) ||
    origin.sourceRunId === runId ||
    !text(origin.sourceName) ||
    !Number.isSafeInteger(origin.sourceRevision) ||
    Number(origin.sourceRevision) < 0 ||
    !['transmit', 'depart'].includes(String(origin.sourceEnding)) ||
    !['3', '4', '5', '6'].some(
      (v) =>
        origin.contentVersion === 'full-demo.' + v &&
        origin.balanceVersion === 'full-unbalanced.' + v,
    )
  )
    invalid();
}

/** A finite deterministic ordering, with no clock, random generator or mutable cursor. */
function rank(seed: string, id: string): number {
  let n = 2166136261;
  const input = seed + '\0' + id;
  for (let i = 0; i < input.length; i++)
    n = Math.imul(n ^ input.charCodeAt(i), 16777619);
  return n >>> 0;
}
export function localStoryIdsForSeed(seed: string): string[] {
  if (!text(seed)) invalid();
  const groups = new Map<RealmId, string[]>();
  for (const [id, s] of Object.entries(stories))
    if (id.startsWith('local_')) {
      const group = groups.get(s.min) ?? [];
      group.push(id);
      groups.set(s.min, group);
    }
  const selected = new Set<string>();
  for (const ids of groups.values())
    for (const id of ids
      .slice()
      .sort(
        (a, b) => rank(seed, a) - rank(seed, b) || (a < b ? -1 : a > b ? 1 : 0),
      )
      .slice(0, 2))
      selected.add(id);
  return Object.keys(stories).filter((id) => selected.has(id));
}
export function storyInIncarnation(game: Game, id: string): boolean {
  if (!id.startsWith('local_') || game.core.contentVersion !== VERSION)
    return true;
  if (!game.incarnation) invalid();
  return localStoryIdsForSeed(game.incarnation.seed).includes(id);
}
