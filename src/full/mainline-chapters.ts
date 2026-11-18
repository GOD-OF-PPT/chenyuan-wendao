/**
 * 《尘缘问道》V2 · 七卷主线章回、四大故人因果谱与三维道心投影模块
 * 解决痛点：「游戏主线不清晰」—— 将零散事件与境界突破贯通为七卷叙事史诗，
 * 实时计算当前卷章进度、核心下一步行动建议、故人天劫助阵状态与三维道心倾向。
 */
import type { RealmId, LocationId } from './content.ts';

export type DaoAxis = 'benevolence' | 'edge' | 'serenity';

export interface DaoHeartState {
  /** 苍生仁心：提高成丹品质率、护体减伤与故人护阵强度 */
  benevolence: number;
  /** 破妄锋芒：提高直伤、暴击率与破招断势倍率 */
  edge: number;
  /** 逍遥本真：提高周天吐纳效率、灵力回复与寿元从容度 */
  serenity: number;
}

export interface ChapterObjective {
  id: string;
  label: string;
  hint: string;
  targetTab: 'cultivate' | 'story' | 'explore' | 'alchemy' | 'bag';
  targetLocation?: LocationId;
}

export interface MainlineChapter {
  index: number;
  id: string;
  volumeTitle: string;
  chapterTitle: string;
  realm: RealmId;
  epigraph: string;
  synopsis: string;
  keyNpc: string;
  locationFocus: LocationId;
  objectives: ChapterObjective[];
  breakthroughRewardNote: string;
}

export const MAINLINE_CHAPTERS: readonly MainlineChapter[] = Object.freeze([
  {
    index: 1,
    id: 'vol_1_rain_temple',
    volumeTitle: '第一卷',
    chapterTitle: '山雨入道 · 一丹问尘缘',
    realm: 'mortal',
    epigraph: '山雨欲来破庙寒，一粒回春定前缘。',
    synopsis:
      '十八岁那年山雨倾盆，你怀揣唯一一枚回春丹踏入破庙，偶遇重伤医修沈清禾。救人、易物或独善其身，一念之差将开启截然不同的问道因果，随后步入听雨洞府引气入体。',
    keyNpc: '沈清禾',
    locationFocus: 'cave',
    objectives: [
      {
        id: 'v1_opening',
        label: '破庙抉择：回应沈清禾求药之请',
        hint: '抉择将奠定初始道心（仁心/锋芒/本真）与后续药庐因果',
        targetTab: 'story',
        targetLocation: 'wilderness',
      },
      {
        id: 'v1_qi_cap',
        label: '洞府吐纳：运转周天攒满凡人灵气（10/10）',
        hint: '在洞府静修或点击灵窍共鸣加速感悟',
        targetTab: 'cultivate',
        targetLocation: 'cave',
      },
      {
        id: 'v1_break_qi',
        label: '引气入体：冲破凡胎踏入【炼气期】',
        hint: '无需突破丹药，灵气圆满即可破境开脉',
        targetTab: 'cultivate',
        targetLocation: 'cave',
      },
    ],
    breakthroughRewardNote: '开启青云宗、云岚坊市、剑/符二道修法与百草丹炉',
  },
  {
    index: 2,
    id: 'vol_2_qingyun_path',
    volumeTitle: '第二卷',
    chapterTitle: '青云择法 · 百草炼筑基',
    realm: 'qi',
    epigraph: '钟鸣云海问仙途，剑气符光各殊途。',
    synopsis:
      '初入炼气，山门钟声引你拜访青云宗执事陆玄松。你需要择定一生修法根基（青锋剑修或太清符修），深入青岚山野试剑斩妖、采药凝露，亲手开炉控火炼制第一枚筑基丹。',
    keyNpc: '陆玄松',
    locationFocus: 'sect',
    objectives: [
      {
        id: 'v2_school',
        label: '择定道统：在洞府或宗门选定【剑修】或【符修】',
        hint: '剑修蓄意断势爆发极高；符修叠印灼烧攻守兼备',
        targetTab: 'cultivate',
      },
      {
        id: 'v2_lu_intro',
        label: '执事问道：赴青云宗拜会执事【陆玄松】',
        hint: '结识山门引路人，获赠凝气灵草并洞悉三线筹备之法',
        targetTab: 'story',
        targetLocation: 'sect',
      },
      {
        id: 'v2_foundation_pill',
        label: '丹成筑基：筹齐筑基丹且炼气修为圆满（1000）并破境',
        hint: '推荐山野秘境采草猎狼 + 丹炉文武控火精炼筑基丹',
        targetTab: 'alchemy',
        targetLocation: 'cave',
      },
    ],
    breakthroughRewardNote: '寿元大增，开启【照影古境】秘境与二阶互斥专精功法',
  },
  {
    index: 3,
    id: 'vol_3_ancient_stele',
    volumeTitle: '第三卷',
    chapterTitle: '古境叩碑 · 故人续前缘',
    realm: 'foundation',
    epigraph: '古碑无字照初心，药庐重逢故人情。',
    synopsis:
      '筑基既成，你在山门遇同辈俊杰裴照论剑争渡，于药庐重逢沈清禾印证当年雨夜之约，更踏入云雾缭绕的照影古境，在守碑人砚尘见证下于残碑刻下求道真意，采灵玉以凝金丹。',
    keyNpc: '砚尘 · 裴照',
    locationFocus: 'secret',
    objectives: [
      {
        id: 'v3_bonds',
        label: '尘缘重逢：结交【裴照】、叙旧【沈清禾】、叩碑【砚尘】',
        hint: '前往青云宗与照影古境触发三位核心人物剧情',
        targetTab: 'story',
        targetLocation: 'secret',
      },
      {
        id: 'v3_branch_skill',
        label: '道法分流：研习并装配至少一门筑基专精功法',
        hint: '止水/破妄、太清/清虚等互斥分支决定核心流派',
        targetTab: 'cultivate',
        targetLocation: 'sect',
      },
      {
        id: 'v3_golden_pill',
        label: '凝结金丹：炼成【凝金丹】且筑基圆满（3000）破境',
        hint: '深入照影古境采集地脉灵玉，开炉凝炼金丹',
        targetTab: 'alchemy',
        targetLocation: 'cave',
      },
    ],
    breakthroughRewardNote: '金丹大道成！解锁【本命法宝铸造】与法宝主动神通技',
  },
  {
    index: 4,
    id: 'vol_4_golden_relic',
    volumeTitle: '第四卷',
    chapterTitle: '金丹铸器 · 寒池映月华',
    realm: 'golden',
    epigraph: '炉中日月铸神兵，寒池分莲见道情。',
    synopsis:
      '踏入金丹真人之列，古境深处寒池月华初绽，剑傀反震凶险异常。你将与裴照在断阶重逢共分月华莲，回青云宗替陆玄松传道授业，并开炉锻造与心神相通的本命法宝。',
    keyNpc: '裴照 · 陆玄松',
    locationFocus: 'secret',
    objectives: [
      {
        id: 'v4_relic',
        label: '本命神兵：铸造并装备一件【本命法宝】',
        hint: '青霜剑/玄玉印/照魂灯/流云镜均赋予独特主动神通技',
        targetTab: 'alchemy',
        targetLocation: 'cave',
      },
      {
        id: 'v4_stories',
        label: '承前启后：完成【古境重逢·裴照】与【授业·陆玄松】',
        hint: '在照影古境与青云宗印证同道情谊与宗门薪火',
        targetTab: 'story',
        targetLocation: 'secret',
      },
      {
        id: 'v4_nascent_pill',
        label: '碎丹成婴：筹备【结婴丹】且金丹圆满（7200）破境',
        hint: '攻克古境剑傀反震机制，收集月华莲炼制结婴丹',
        targetTab: 'cultivate',
        targetLocation: 'cave',
      },
    ],
    breakthroughRewardNote: '元婴初成！神识通明，解锁元婴深层秘境与临劫盟约',
  },
  {
    index: 5,
    id: 'vol_5_mirror_heart',
    volumeTitle: '第五卷',
    chapterTitle: '照影问心 · 一诺重千山',
    realm: 'nascent',
    epigraph: '古镜照见少年影，山村疫起诺千金。',
    synopsis:
      '元婴大成之际，人间山村疫气蔓延，沈清禾登门求药，一纸借丹之诺将化作日后九霄雷劫下的护命药阵；而在照影古镜之前，砚尘请你看清昔日雨中那个弱小却赤诚的自己。',
    keyNpc: '沈清禾 · 砚尘',
    locationFocus: 'cave',
    objectives: [
      {
        id: 'v5_shen_pact',
        label: '一诺千山：回应【沈清禾】山村求药，缔结雷劫药阵之约',
        hint: '此约将在最终渡劫第二关【九霄雷劫】提供强力减伤护持',
        targetTab: 'story',
        targetLocation: 'cave',
      },
      {
        id: 'v5_yan_mirror',
        label: '照见本心：在照影古境与【砚尘】共观古镜旧影',
        hint: '接纳来路获赠凝魂晶，圆满问心因果线',
        targetTab: 'story',
        targetLocation: 'secret',
      },
      {
        id: 'v5_spirit_seed',
        label: '元神化神：炼成【化神丹】且元婴圆满（15000）破境',
        hint: '智取照影心魇噬血机制，采集凝魂晶突破化神',
        targetTab: 'cultivate',
        targetLocation: 'cave',
      },
    ],
    breakthroughRewardNote: '臻至化神尊者！开启终焉之地【登仙台】与四方护阵收束',
  },
  {
    index: 6,
    id: 'vol_6_terrace_pact',
    volumeTitle: '第六卷',
    chapterTitle: '千山立约 · 云台聚道蕴',
    realm: 'spirit',
    epigraph: '临行回首万山青，故人剑气护天门。',
    synopsis:
      '化神圆满在望，登仙台上长风浩荡。远行叩天门之前，回青云宗饮下陆玄松的送行药，邀裴照于云台共布剑阵，在天门石阶前揖别守碑人砚尘，将半生尘缘凝作一枚渡劫引。',
    keyNpc: '四大故人齐聚',
    locationFocus: 'terrace',
    objectives: [
      {
        id: 'v6_farewells',
        label: '四方收束：完成【云台相约·裴照】【山门送别·陆玄松】【天门之前·砚尘】',
        hint: '集齐故人护持可大幅降低九霄天劫三连战凶险',
        targetTab: 'story',
        targetLocation: 'sect',
      },
      {
        id: 'v6_ascension_seal',
        label: '炼制渡劫引：集齐道蕴砂、凝魂晶与妖核炼成【渡劫引】',
        hint: '登仙台云台参道或击败云台守灵可获道蕴砂',
        targetTab: 'alchemy',
        targetLocation: 'terrace',
      },
      {
        id: 'v6_start_trial',
        label: '叩问天门：修为圆满（28000）、气血充沛，在登仙台激发渡劫引',
        hint: '开启第七卷终章三劫连战，系统自动生成渡劫前安全存档点',
        targetTab: 'cultivate',
        targetLocation: 'terrace',
      },
    ],
    breakthroughRewardNote: '引动九霄雷云，正式踏入【第七卷 · 九霄叩天门】终局试炼',
  },
  {
    index: 7,
    id: 'vol_7_heaven_gate',
    volumeTitle: '第七卷',
    chapterTitle: '九霄叩天门 · 此生收卷时',
    realm: 'ascended',
    epigraph: '天门开处问归途，留道人间或独行。',
    synopsis:
      '渡劫引化金光冲霄！先答本心之问（接纳旧我或放下旧念），再以毕生功法、法宝与故人护阵连闯【往昔心魔 → 九霄雷劫 → 天门道影】三关，最终决定是将道统留传人间，还是独赴上界。',
    keyNpc: '本心 · 天门道影',
    locationFocus: 'terrace',
    objectives: [
      {
        id: 'v7_question',
        label: '临劫问心：在接纳旧我（稳守反震）与放下旧念（锐攻抢先）间抉择',
        hint: '问心答案直接改变天劫加成与第三关天门道影机制',
        targetTab: 'cultivate',
        targetLocation: 'terrace',
      },
      {
        id: 'v7_three_trials',
        label: '连破三劫：依次击败【往昔心魔】【九霄雷劫】【天门道影】',
        hint: '善用破招断势、本命法宝神通与灵丹妙药维持续航',
        targetTab: 'cultivate',
        targetLocation: 'terrace',
      },
      {
        id: 'v7_ending',
        label: '飞升收卷：抉择【留道传承】或【独赴上界】，生成道果评定与轮回天命',
        hint: '达成 S/A 级道果可解锁强力先天天命词条开启多周目新人生',
        targetTab: 'story',
        targetLocation: 'terrace',
      },
    ],
    breakthroughRewardNote: '功德圆满 · 解锁此生六维道果雷达评定与轮回天命传承',
  },
]);

export interface NpcBondMeta {
  id: 'shen' | 'lu' | 'pei' | 'yan';
  name: string;
  title: string;
  theme: string;
  tribulationAidLabel: string;
  storyChain: readonly string[];
}

export const NPC_BONDS: readonly NpcBondMeta[] = Object.freeze([
  {
    id: 'shen',
    name: '沈清禾',
    title: '青云药庐 · 悬壶医修',
    theme: '雨夜一丹起因果，千山疫火见仁心',
    tribulationAidLabel: '【灵枢药阵】九霄雷劫关每回合雷击减伤 +8，每回合微回气血',
    storyChain: ['shen_return', 'shen_pact'],
  },
  {
    id: 'pei',
    name: '裴照',
    title: '青云剑阁 · 同辈剑首',
    theme: '山门论道争高下，云台并肩斩天风',
    tribulationAidLabel: '【并肩剑痕】天劫三关全阶段承受伤害减免 +6，破招伤害提升',
    storyChain: ['pei_meet', 'pei_echo', 'pei_pact'],
  },
  {
    id: 'lu',
    name: '陆玄松',
    title: '青云山门 · 传功执事',
    theme: '不问灵根问筹备，半生薪火照后人',
    tribulationAidLabel: '【山门薪火】临劫获赠双份上品回灵丹，宗门委托收益提升',
    storyChain: ['lu_intro', 'lu_teach', 'lu_farewell'],
  },
  {
    id: 'yan',
    name: '砚尘',
    title: '照影古境 · 守碑老人',
    theme: '残碑留住凡人语，古镜照回少年心',
    tribulationAidLabel: '【古镜澄明】问心试炼额外感悟道蕴，心魔关精神侵蚀削弱',
    storyChain: ['yan_stone', 'yan_mirror', 'yan_gate'],
  },
]);
