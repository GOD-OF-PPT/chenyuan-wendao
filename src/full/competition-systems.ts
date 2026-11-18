/**
 * 《尘缘问道》V4 赛事金奖版 · 核心趣味流程与策略深度规则模块
 * 新增：
 * 1. 天时星象流转（5大动态世界星象：灵潮涌动 / 紫微临丹 / 百草丰年 / 贪狼破军 / 万宝云集）
 * 2. 三才冲脉破境仪式（天道一品道基 vs 地道上品道基，永久属性加成与高阶法则必出）
 * 3. 【起-承-绝】三段武学连携公式与【完美拆招·借力打力】主动防御反击机制
 * 4. 可视化五层连线分支秘境星图（含云游奇商、拔剑台、药谷、护宝妖王与终层法则台）
 * 5. 15种可叠乘大道法则、四大手绘本命灵兽、四大故人同心合击、太虚镇妖塔与12项赛事成就
 */

export interface CelestialOmen {
  id: 'tide' | 'alchemy_star' | 'harvest' | 'wolf_star' | 'fair';
  name: string;
  badge: string;
  desc: string;
}

export const CELESTIAL_OMENS: readonly CelestialOmen[] = Object.freeze([
  { id: 'tide', name: '灵潮涌动', badge: '宜吐纳闭关', desc: '天地灵脉潮汐大涨，周天吐纳与闭关修为收益 +45%！' },
  { id: 'alchemy_star', name: '紫微临丹', badge: '宜开炉控火', desc: '紫微星垂照丹庐，控火黄金温区拓宽 +10%，成丹额外获丹香修为！' },
  { id: 'harvest', name: '百草丰年', badge: '宜采集秘境', desc: '山川灵粹盎然，所有采集、委托与秘境药谷材料产出 +1！' },
  { id: 'wolf_star', name: '贪狼破军', badge: '宜除妖冲塔', desc: '杀伐星动，全招式暴击率 +18%，讨伐与镇妖塔灵石掉落 +40%！' },
  { id: 'fair', name: '万宝云集', badge: '宜坊市赌玉', desc: '九州商帮齐聚云岚坊市，全场采买 8 折，古玉鉴宝出仙髓率翻倍！' },
]);

export interface MartialComboSpec {
  id: string;
  name: string;
  sequence: readonly [string, string, string];
  desc: string;
}

export const MARTIAL_COMBOS: readonly MartialComboSpec[] = Object.freeze([
  { id: 'sky_sword', name: '天外飞仙', sequence: ['attack', 'builder', 'finisher'], desc: '平斩 → 起势 → 终结：终结技伤害额外 +45%，回复 12 灵力并触发剑雨特效！' },
  { id: 'nine_fire', name: '九宫焚天', sequence: ['builder', 'guard', 'finisher'], desc: '起势 → 御守 → 终结：终结爆发后保留1层剑意/符印并凝结 35 点护体金盾！' },
  { id: 'dharma_awe', name: '法天象地', sequence: ['builder', 'finisher', 'relic'], desc: '起势 → 终结 → 法宝/合击：神通威力额外 +40%，令敌方破绽延长 1 回合！' },
]);


export const BAGUA_RESONANCE_TIERS = [
  { minLaws: 2, name: "二仪生辉", dmgBonus: 0.10, critBonus: 0.05 },
  { minLaws: 4, name: "四象剑阵", dmgBonus: 0.18, critBonus: 0.10 },
  { minLaws: 6, name: "八卦通神", dmgBonus: 0.28, critBonus: 0.15 },
] as const;

export const MIST_BOARD_SPEC = {
  rows: 3,
  cols: 4,
  minRevealForExit: 5,
  boardsPerDaoLawDraft: 2,
} as const;
