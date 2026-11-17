/**
 * 《尘缘问道》V2 · 高可玩性核心子系统规则模块
 * 解决痛点：「游戏可玩性低（纯等读秒、炼丹无聊、历练单一、战斗自动无爽感、零重玩）」
 * 包含：
 * 1. 周天灵窍共鸣（主动引气暴击与五行灵韵）
 * 2. 文武丹火三品精炼（凡品 / 灵品 / 仙品丹纹）
 * 3. 五层秘境奇遇棋局（3选1 Rogue-lite 风险博弈探索）
 * 4. 本命法宝主动神通技与破招易伤（Break/Stagger）机制
 * 5. 六维道果 S/A/B/C 结局评定与多周目【先天天命词条】系统
 */
import type { RealmId, LocationId } from './content.ts';

export type PillQuality = 'mortal' | 'spirit' | 'immortal';

export interface AlchemyResultSpec {
  quality: PillQuality;
  label: string;
  pillYield: number;
  bonusXpRatio: number;
  savedMonthsRatio: number;
}

export function evaluateAlchemyFire(heatZoneScore: number, benevolence: number): AlchemyResultSpec {
  const adjusted = heatZoneScore + Math.min(12, Math.floor(benevolence * 0.4));
  if (adjusted >= 85) {
    return {
      quality: 'immortal',
      label: '九转仙品 · 云纹丹成',
      pillYield: 2,
      bonusXpRatio: 0.35,
      savedMonthsRatio: 0.5,
    };
  }
  if (adjusted >= 58) {
    return {
      quality: 'spirit',
      label: '上品灵丹 · 丹香盈室',
      pillYield: 2,
      bonusXpRatio: 0.15,
      savedMonthsRatio: 0.25,
    };
  }
  return {
    quality: 'mortal',
    label: '成丹稳妥 · 药力纯正',
    pillYield: 1,
    bonusXpRatio: 0.05,
    savedMonthsRatio: 0,
  };
}

export interface RelicActiveSkill {
  relicId: string;
  name: string;
  cooldown: number;
  mpCost: number;
  summary: string;
}

export const RELIC_ACTIVE_SKILLS: Record<string, RelicActiveSkill> = Object.freeze({
  frost_sword: {
    relicId: 'frost_sword',
    name: '霜天万剑引',
    cooldown: 3,
    mpCost: 14,
    summary: '召唤青霜剑阵造成高额穿甲剑气，立即补满 3 层剑意并可强行破除敌方蓄势！',
  },
  jade_seal: {
    relicId: 'jade_seal',
    name: '玄武镇岳印',
    cooldown: 3,
    mpCost: 12,
    summary: '祭出玄玉大印震击敌方，获得巨额金钟护盾（本回合免伤大幅提升）并回复 18% 气血！',
  },
  soul_lamp: {
    relicId: 'soul_lamp',
    name: '九幽燃魂焰',
    cooldown: 3,
    mpCost: 14,
    summary: '催动照魂古灯瞬间叠满 3 枚高阶灼魂符印，并立即触发一次全额真火灼烧（无视反震与护阵）！',
  },
  cloud_mirror: {
    relicId: 'cloud_mirror',
    name: '流云返照诀',
    cooldown: 3,
    mpCost: 10,
    summary: '宝镜澄明映照周天，立即恢复 30% 气血与 35% 灵力，并令下一招术法伤害提升 35%！',
  },
});

export interface ExpeditionNodeCard {
  id: string;
  kind: 'herb_grove' | 'ancient_shrine' | 'elite_hunt' | 'heart_mirage' | 'treasure_trove';
  title: string;
  subtitle: string;
  riskLabel: '低险' | '中险' | '凶险';
  description: string;
}

export const EXPEDITION_CARD_TEMPLATES: readonly ExpeditionNodeCard[] = Object.freeze([
  {
    id: 'herb_grove',
    kind: 'herb_grove',
    title: '灵雾药谷',
    subtitle: '采集天地灵粹',
    riskLabel: '低险',
    description: '云雾深处灵草凝露，稳健收获当境核心药材并平复少许气血。',
  },
  {
    id: 'ancient_shrine',
    kind: 'ancient_shrine',
    title: '古修残碑',
    subtitle: '参悟前人遗刻',
    riskLabel: '低险',
    description: '消耗少许灵力拓印残碑道韵，大幅获取修为感悟与逍遥道心。',
  },
  {
    id: 'elite_hunt',
    kind: 'elite_hunt',
    title: '妖气盘踞之地',
    subtitle: '拔剑斩妖夺宝',
    riskLabel: '凶险',
    description: '直面盘踞秘境的护宝妖灵，取胜可夺双倍妖核/灵材与丰厚灵石！',
  },
  {
    id: 'heart_mirage',
    kind: 'heart_mirage',
    title: '问心幻雾',
    subtitle: '勘破执念化道',
    riskLabel: '中险',
    description: '以道心定力穿行幻阵，淬炼三维道心并有机会拾得成品灵丹。',
  },
  {
    id: 'treasure_trove',
    kind: 'treasure_trove',
    title: '洞天遗匣',
    subtitle: '破禁开启古匣',
    riskLabel: '中险',
    description: '折损少许气血强破禁制，开启前人遗留灵石匣与稀有破境材料。',
  },
]);

export interface DestinyPerk {
  id: string;
  name: string;
  badge: string;
  description: string;
  unlockGrade: 'C' | 'B' | 'A' | 'S';
  bonuses: {
    stones?: number;
    xpMultiplier?: number;
    attackBonus?: number;
    alchemyBonus?: number;
    lifespanBonusMonths?: number;
  };
}

export const DESTINY_PERKS: readonly DestinyPerk[] = Object.freeze([
  {
    id: 'mortal_grit',
    name: '山野坚心',
    badge: '凡尘本色',
    description: '开局额外携带 40 灵石与回春丹 ×2，吐纳效率 +15%。',
    unlockGrade: 'C',
    bonuses: { stones: 40, xpMultiplier: 1.15 },
  },
  {
    id: 'sword_bone',
    name: '先天剑骨',
    badge: '锋芒命格',
    description: '所有招式直接伤害 +8，破招断势额外造成 25% 伤害，开局锋芒道心 +15。',
    unlockGrade: 'B',
    bonuses: { attackBonus: 8, xpMultiplier: 1.1 },
  },
  {
    id: 'medicine_sage',
    name: '药王遗泽',
    badge: '丹道命格',
    description: '开炉控火黄金区拓宽 25%，仙品成丹率大幅提高，开局携凝气草 ×6、灵露 ×4。',
    unlockGrade: 'B',
    bonuses: { alchemyBonus: 20, stones: 30 },
  },
  {
    id: 'immortal_echo',
    name: '九世道胎',
    badge: '无上仙缘',
    description: '周天修行速度 +35%，各境界寿元上限 +360 月，开局全属性道心 +12、灵石 +80！',
    unlockGrade: 'A',
    bonuses: { stones: 80, xpMultiplier: 1.35, attackBonus: 6, alchemyBonus: 15, lifespanBonusMonths: 360 },
  },
]);

export interface VerdictDimension {
  label: string;
  score: number; // 0..100
}

export function computeLifeVerdict(params: {
  realmRank: number;
  ascended: boolean;
  npcBondsCompleted: number;
  relicsOwned: number;
  wins: number;
  daoTotal: number;
  immortalPillsCrafted: number;
}): {
  grade: 'S' | 'A' | 'B' | 'C';
  title: string;
  totalScore: number;
  dimensions: VerdictDimension[];
} {
  const dRealm = Math.min(100, Math.round((params.realmRank / 6) * 85 + (params.ascended ? 15 : 0)));
  const dKarma = Math.min(100, Math.round((params.npcBondsCompleted / 11) * 100));
  const dMartial = Math.min(100, Math.round(Math.min(1, params.wins / 12) * 70 + (params.relicsOwned > 0 ? 30 : 0)));
  const dCraft = Math.min(100, Math.round(Math.min(1, params.relicsOwned / 2) * 50 + Math.min(50, params.immortalPillsCrafted * 15)));
  const dHeart = Math.min(100, Math.round(Math.min(1, params.daoTotal / 90) * 100));
  const totalScore = Math.round(dRealm * 0.3 + dKarma * 0.2 + dMartial * 0.2 + dCraft * 0.15 + dHeart * 0.15);

  const grade =
    params.ascended && totalScore >= 82
      ? 'S'
      : totalScore >= 68
        ? 'A'
        : totalScore >= 45
          ? 'B'
          : 'C';

  const titles: Record<'S' | 'A' | 'B' | 'C', string> = {
    S: '万古长青 · 尘缘圆满真仙',
    A: '大道独行 · 破劫飞升上仙',
    B: '千山留痕 · 问道有成真人',
    C: '山雨一梦 · 红尘历劫散修',
  };

  return {
    grade,
    title: titles[grade],
    totalScore,
    dimensions: [
      { label: '境界道果', score: dRealm },
      { label: '尘缘羁绊', score: dKarma },
      { label: '斗法神通', score: dMartial },
      { label: '丹器造诣', score: dCraft },
      { label: '本心澄明', score: dHeart },
    ],
  };
}
