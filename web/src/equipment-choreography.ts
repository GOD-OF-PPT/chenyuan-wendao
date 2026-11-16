import { contentForGame } from '../../src/full/rule-content.ts';
import * as C from '../../src/full/content';
import type { Game } from '../../src/full/types';
import type { Activity } from '../../src/full/activity';

export const JADE_FORMS: Record<string, { form: string; variant: string }> = {
  sword_mind: { form: 'heart', variant: 'base' },
  sword_still: { form: 'heart', variant: 'advanced' },
  sword_build: { form: 'blade', variant: 'base' },
  sword_guard: { form: 'blade', variant: 'advanced' },
  sword_release: { form: 'scroll', variant: 'base' },
  sword_echo: { form: 'scroll', variant: 'advanced' },
  talisman_mind: { form: 'knot', variant: 'base' },
  talisman_calm: { form: 'knot', variant: 'advanced' },
  talisman_build: { form: 'seal', variant: 'base' },
  talisman_frost: { form: 'seal', variant: 'advanced' },
  talisman_release: { form: 'fan', variant: 'base' },
  talisman_return: { form: 'fan', variant: 'advanced' },
  sword_pierce: { form: 'heart', variant: 'advanced' },
  sword_surge: { form: 'blade', variant: 'advanced' },
  sword_shatter: { form: 'scroll', variant: 'advanced' },
  talisman_clear: { form: 'knot', variant: 'advanced' },
  talisman_ember: { form: 'seal', variant: 'advanced' },
  talisman_rupture: { form: 'fan', variant: 'advanced' },
};
export const MANUAL_FORM = 'manual';
export const RELIC_FORMS = {
  frost_sword: 'sword',
  jade_seal: 'seal',
  soul_lamp: 'lamp',
  cloud_mirror: 'mirror',
} as const;
export type QueueDomain = 'draft' | 'saved' | 'slots';
export type QueueView = {
  runId: string;
  domain: QueueDomain;
  pages: Record<QueueDomain, number>;
  touched: boolean;
};
const clamp = (n: number) =>
  Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
export function projectStudyForm(
  state: string,
  value: number,
  mastered: boolean,
) {
  const progress = clamp(value),
    working = state === 'reading';
  const phase =
    state === 'saving'
      ? 'sealing'
      : working
        ? progress < 0.2
          ? 'unfolding'
          : progress < 0.8
            ? 'inscribing'
            : 'gathering'
        : mastered
          ? 'mastered'
          : 'still';
  return {
    phase,
    working,
    progress,
    spread: working ? Math.min(1, progress / 0.2) : mastered ? 1 : 0,
    draw: working ? clamp((progress - 0.2) / 0.6) : 0,
    fold: working && progress > 0.8 ? (progress - 0.8) / 0.2 : 0,
  };
}
export function projectRelicForm(
  state: string,
  allowed: boolean,
  value: number,
  owned: boolean,
  bound: boolean,
) {
  const progress = clamp(value),
    working =
      allowed &&
      !['failed', 'pausing', 'paused', 'stopping', 'saving'].includes(state);
  const phase =
    state === 'saving'
      ? 'sealing'
      : working
        ? progress < 0.08
          ? 'preparing'
          : progress < 0.2
            ? 'contact'
            : progress < 0.8
              ? 'engraving'
              : 'forming'
        : owned
          ? bound
            ? 'bound'
            : 'owned'
          : 'still';
  return {
    phase,
    working,
    progress,
    approach: working ? (1 - Math.min(1, progress / 0.2)) * 12 : 0,
    draw: working ? clamp((progress - 0.2) / 0.6) : 0,
    fold: working && progress > 0.8 ? (progress - 0.8) / 0.2 : 0,
    finished: owned,
  };
}
/** Display projection only. The parent owns the frozen command and complete proof. */
export function projectStudyQueue(
  game: Game,
  draft: string[],
  activity: Activity | null,
  command: Activity['nextCommand'],
  domain: 'draft' | 'saved',
) {
  const ruleContent = contentForGame(game);

  const saved =
    activity?.version === 5 &&
    activity.plan.kind === 'learn' &&
    activity.runId === game.core.runId
      ? activity
      : null;
  const ids =
    domain === 'saved' && saved
      ? saved.plan.kind === 'learn'
        ? saved.plan.skills
        : []
      : domain === 'draft'
        ? draft
        : [];
  const current =
    domain === 'saved' &&
    saved &&
    command?.type === 'LEARN' &&
    command.runId === game.core.runId &&
    ids.includes(command.skill)
      ? command.skill
      : null;
  return ids
    .filter((id) => Object.hasOwn(ruleContent.skills, id))
    .map((id) => ({
      id,
      name: ruleContent.skills[id].name,
      school: ruleContent.skills[id].school,
      form: JADE_FORMS[id].form,
      known: game.learned.includes(id),
      current: current === id && !game.learned.includes(id),
      status: game.learned.includes(id)
        ? '已掌握'
        : domain === 'draft'
          ? '选择待确认'
          : current === id
            ? '本轮研习'
            : '原安排待研',
    }));
}
