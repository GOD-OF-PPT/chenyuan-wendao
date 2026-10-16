/** Shared by resolution and presentation; these are existing, unbalanced effects. */
export const TRIAL_STAGES = Object.freeze(['trial_heart', 'trial_thunder', 'trial_gate'] as const);
export const TRIAL_ANSWERS = Object.freeze({
  accept: Object.freeze({ label: '接纳旧我', damageReduction: 10, attackBonus: 0,
    record: '你接纳曾经的自己，天劫每击减伤 10。' }),
  release: Object.freeze({ label: '放下旧念', damageReduction: 0, attackBonus: 8,
    record: '你放下旧念，天劫直接攻击额外伤害 8。' }),
});
