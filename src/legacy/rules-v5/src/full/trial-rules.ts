import type { Game } from './types.ts';
import { isLegacyRules, isPreviousRules } from './rule-profile.ts';
import * as previous from '../legacy/rules-v4/src/full/trial-rules.ts';
/** Shared by resolution and presentation; these are unbalanced effects. */
export const TRIAL_STAGES = Object.freeze([
  'trial_heart',
  'trial_thunder',
  'trial_gate',
] as const);
interface TrialAnswer {
  label: string;
  damageReduction: number;
  attackBonus: number;
  record: string;
}
export const TRIAL_ANSWERS: Readonly<
  Record<'accept' | 'release', Readonly<TrialAnswer>>
> = Object.freeze({
  accept: Object.freeze({
    label: '接纳旧我',
    damageReduction: 10,
    attackBonus: 0,
    record:
      '你接纳曾经的自己，天劫每击减伤 10；第三关有镜照反震期，可护体或以符印应对。',
  }),
  release: Object.freeze({
    label: '放下旧念',
    damageReduction: 0,
    attackBonus: 8,
    record: '你放下旧念，天劫直接攻击额外伤害 8；第三关开场即蓄势，重击提前。',
  }),
});
export function trialAnswersForGame(game: Game) {
  return isLegacyRules(game) || isPreviousRules(game)
    ? previous.TRIAL_ANSWERS
    : TRIAL_ANSWERS;
}
