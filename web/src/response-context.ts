import type { Action, Game } from '../../src/full/types';
import type { Activity } from '../../src/full/activity';
import { gamePhase } from '../../src/full/contracts.ts';
import { canonicalFingerprint as proof } from '../../src/full/receipts.ts';
import { narrativeTarget } from './narrative-effects.ts';

type Input = {
  game: Game;
  identity: string;
  mode: string;
  action: Action | null;
  activity: Activity | null;
  runtime: { id: string; generation: number; phase: string } | null;
  owned: boolean;
  busy: boolean;
  blocked: boolean;
  pausing: boolean;
};
/** Readonly UI context. Existing activity/effect owners alone execute or claim results. */
export function responseContext(i: Input) {
  const g = i.game,
    a = i.activity,
    noun =
      i.identity === 'question'
        ? '作答'
        : i.identity === 'ending'
          ? '收卷'
          : '回应';
  const draft = () => ({
    state: 'draft',
    caption:
      i.mode === 'choices'
        ? '先择一签 · 预选不' + (noun === '回应' ? '作回应' : noun)
        : '先读来由，再决定如何' + noun,
  });
  if (i.blocked)
    return { state: 'blocked', caption: '进度待核对 · 请看上方提示' };
  const pending = () => ({
    state: 'pending',
    caption: i.busy ? '正在处理进度 · 请稍候' : noun + '已安排 · 接续见上方',
  });
  if (
    a?.version !== 7 ||
    a.runId !== g.core.runId ||
    a.originGame.core.runId !== g.core.runId ||
    a.gameRevision !== g.core.revision ||
    !['DECIDE', 'ANSWER_TRIAL', 'END'].includes(a.plan.action.type) ||
    narrativeTarget(a.originGame, a.plan.action)?.modelKey !== i.identity
  )
    return i.busy ? pending() : draft();
  const different =
      i.mode === 'choices' &&
      (!i.action || proof(i.action) !== proof(a.plan.action)),
    view = () => ({ state: 'view', caption: '此签仅查看 · 原安排不变' });
  if (a.status === 'stopped')
    return a.completedCycles > 0 &&
      a.stopReason?.code !== 'STATE_CHANGED' &&
      a.outcomeGame?.core.revision === g.core.revision
      ? different
        ? view()
        : { state: 'saved', caption: '本次' + noun + '已保存' }
      : draft();
  const action = a.plan.action,
    phase = gamePhase(g),
    origin = a.originGame;
  const current =
    action.type === 'DECIDE'
      ? g.core.activeEvent?.id === i.identity &&
        g.core.activeEvent.instanceId === origin.core.activeEvent?.instanceId
      : action.type === 'ANSWER_TRIAL'
        ? phase === 'trial-question' &&
          gamePhase(origin) === phase &&
          g.trial?.stage === origin.trial?.stage
        : action.type === 'END'
          ? phase === 'trial-ending' &&
            gamePhase(origin) === phase &&
            g.trial?.stage === origin.trial?.stage
          : false;
  if (!current) return i.busy ? pending() : draft();
  if (different) return view();
  if (i.pausing)
    return { state: 'pausing', caption: noun + '已安排 · 正在停手' };
  if (a.status === 'paused')
    return { state: 'paused', caption: noun + '已暂停 · 沿用原安排' };
  const r = i.runtime;
  if (
    a.status === 'running' &&
    i.owned &&
    r?.id === a.id &&
    r.generation === a.generation &&
    (r.phase === 'running' || r.phase === 'saving')
  )
    return {
      state: r.phase === 'saving' ? 'saving' : 'running',
      caption: '本次' + noun + '已安排',
    };
  return pending();
}
