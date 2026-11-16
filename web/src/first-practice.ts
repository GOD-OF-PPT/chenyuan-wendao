import type { Action, Game } from '../../src/full/types.ts';
import type {
  CultivationPlan,
  SourcePlan,
  Activity,
} from '../../src/full/activity.ts';
import { previewActivity } from '../../src/full/activity.ts';
import {
  defaultEncounterPlan,
  ADVENTURE_CYCLE_MS,
} from '../../src/full/adventure.ts';
import { battleIntent, stats } from '../../src/full/engine.ts';
import { previewAction } from '../../src/full/queries.ts';
import { contentForGame } from '../../src/full/rule-content.ts';
import type { LocationId } from '../../src/full/content.ts';

export const practiceKinds = ['commission', 'assisted', 'encounter'] as const;
export type PracticeKind = (typeof practiceKinds)[number];

/** Existing rules and finite plans, with no tutorial reward or saved-completion flag. */
export function practiceLesson(game: Game, kind: PracticeKind) {
  if (!practiceKinds.includes(kind)) throw new Error('无法识别的练手篇章');
  const content = contentForGame(game);
  let action: Action;
  let plan:
    | SourcePlan
    | CultivationPlan
    | ReturnType<typeof defaultEncounterPlan>;
  let location: LocationId;
  let title: string;
  let purpose: string;
  let confirm: string;
  if (kind === 'commission') {
    const source = content.sources.work;
    action = { type: 'SOURCE', sourceId: 'work', count: 1 };
    plan = {
      kind: 'source',
      sourceId: 'work',
      maxCycles: 1,
      until: 'cycles',
      target: null,
      monthBudget: source.months,
      remainingMonthsReserve: 1,
    };
    location = source.location;
    title = '先挣一笔灵石';
    purpose =
      '做一趟宗门杂务，看看游戏年月换来什么。灵石到账后，再决定怎样花。';
    confirm = '确认做这一趟杂务';
  } else if (kind === 'assisted') {
    action = { type: 'CULTIVATE', method: 'assisted', count: 1 };
    const unit = previewAction(game, action);
    plan = {
      kind: 'cultivation',
      method: 'assisted',
      maxCycles: 1,
      until: 'cycles',
      stoneBudget: unit.costs?.stones ?? 0,
      stoneReserve: 0,
    };
    location = 'cave';
    title = '再花一轮，比较快慢';
    purpose =
      '把赚来的灵石用在一轮辅助修炼。比较自然吐纳与辅助的修为、费用，再决定以后是否长段安排。';
    confirm = '确认这一轮灵石辅助';
  } else {
    action = { type: 'ENCOUNTER', enemy: 'wolf' };
    const original = defaultEncounterPlan(game, 'wolf');
    plan = {
      ...original,
      maxCycles: 1,
      mpBudget: 0,
      strategy: { ...original.strategy, healingBudget: 0, spiritBudget: 0 },
    };
    location = content.enemies.wolf.location;
    title = '读一读妖狼的敌意';
    purpose =
      '先迎战看清敌意，再试一次护体，或核对战策放置本场。药物、气血与撤退都有取舍。';
    confirm = '确认只迎战，先看敌意';
  }
  return {
    kind,
    title,
    purpose,
    confirm,
    location,
    action,
    plan,
    source: { runId: game.core.runId, revision: game.core.revision },
    quote: previewActivity(game, plan),
    actionQuote: previewAction(game, action),
    natural:
      kind === 'assisted'
        ? previewAction(game, {
            type: 'CULTIVATE',
            method: 'natural',
            count: 1,
          })
        : null,
    travel: previewAction(game, { type: 'TRAVEL', location }),
    travelMs: ADVENTURE_CYCLE_MS.travel,
    gainedStones: kind === 'commission' ? content.sources.work.stones : 0,
    encounter:
      kind === 'encounter'
        ? {
            enemy: {
              ...content.enemies.wolf,
              loot: { ...content.enemies.wolf.loot },
            },
            playerHp: game.core.player.hp,
            playerMaxHp: stats(game).maxHp,
            minimumHp: previewAction(game, action).requirements.hp,
            healingCount: game.core.inventory.healing_pill,
            spiritCount: game.core.inventory.spirit_pill,
            battleMs: ADVENTURE_CYCLE_MS.battle,
          }
        : null,
  };
}
export type PracticeLesson = ReturnType<typeof practiceLesson>;

/** Only a matching committed activity can describe the just-finished practice. */
export function practiceResult(
  game: Game,
  kind: PracticeKind,
  activity: Activity | null,
) {
  if (
    !activity ||
    activity.runId !== game.core.runId ||
    activity.gameRevision !== game.core.revision ||
    activity.completedCycles < 1 ||
    activity.stopReason?.code === 'STATE_CHANGED'
  )
    return null;
  if (
    kind === 'commission' &&
    activity.version === 2 &&
    activity.plan.sourceId === 'work'
  )
    return {
      text: `当前杂务完成 ${activity.completedCycles} 趟，实得灵石 ${activity.gainedStones}，消耗 ${activity.spentMonths} 游戏月。`,
      cycles: activity.completedCycles,
    };
  if (
    kind === 'assisted' &&
    activity.version === 1 &&
    activity.plan.method === 'assisted'
  )
    return {
      text: `当前辅助完成 ${activity.completedCycles} 轮，实得修为 ${activity.gainedXp}，消耗灵石 ${activity.spentStones}、${activity.spentMonths} 游戏月。`,
      cycles: activity.completedCycles,
    };
  if (
    kind === 'encounter' &&
    activity.version === 6 &&
    activity.plan.kind === 'encounter' &&
    activity.plan.enemy === 'wolf'
  )
    return {
      text: `已迎战 ${activity.encountersStarted} 场，实际出招 ${activity.battleTurns} 回合；战局按当前进度保留。`,
      cycles: activity.completedCycles,
    };
  return null;
}

export function firstBattleHint(game: Game) {
  if (game.battle?.enemy !== 'wolf' || game.core.player.realm !== 'qi')
    return null;
  const intent = battleIntent(game);
  return {
    intent,
    guidance:
      intent.kind === 'prepare'
        ? '妖狼正在蓄势，下一招将重击；先比较护体与攻招，再决定。'
        : intent.kind === 'heavy'
          ? '这一招是重击。护体能减伤回灵，丹药也占回合；看牌面的实际变化再出手。'
          : '先看敌意与气血变化。护体会回灵；想自己试招可选手动，也可核对战策放置本场。',
    guard: previewAction(game, { type: 'BATTLE', move: 'guard' }),
    healingCount: game.core.inventory.healing_pill,
    healing: previewAction(game, { type: 'BATTLE', move: 'heal' }),
  };
}
