import { ASCENSION_ENDINGS } from './ascension.ts';
import { inheritanceOffer } from './incarnation.ts';
import type { LifeRecord } from './life-record.ts';
import type { Game } from './types.ts';

/** A detached reading of recorded facts; no invented action totals or rewards. */
export function buildLifeLedger(game: Game, record: LifeRecord) {
  const ended = game.status === 'ascended',
    ending = ended ? game.ending : null;
  const school = record.training.school,
    opening = record.opening.text;
  const epilogue =
    ending === 'transmit'
      ? [
          `山间的灯火次第亮起。${record.overview.name}把这卷${school}的来路留在人间，书页记着每一道实际跨过的门槛。`,
          `后来人翻到山雨中的第一页，读见：${opening}那些已经作出的选择留在纸上，未走过的路仍等待别的行者。`,
          '天门在身后合拢，传下的道法却没有熄灭。后辈封起一只小药囊，愿将来再开新卷的人，仍记得伸手相助的分量。',
        ]
      : ending === 'depart'
        ? [
            `${record.overview.name}背起行囊，沿天门外的云阶向前。此生${school}的攻守与停手都已写定，远方第一次没有熟悉的路标。`,
            `回望云海，山雨中的一念仍然清楚：${opening}你将这些已经走过的选择收进旧卷，带着它们继续远行。`,
            '新的山川隐在云后，新的相逢尚未发生。若有另一卷人生，一份远游路资愿为启程留一点从容，去看这卷没有走过的风景。',
          ]
        : [];
  const alternate =
    ending === 'transmit' ? 'depart' : ending === 'depart' ? 'transmit' : null;
  return structuredClone({
    format: 'chenyuan-life-ledger' as const,
    version: 1 as const,
    source: record.source,
    identity: record.overview,
    duration: {
      gameMonths: record.overview.elapsedMonths,
      age: record.overview.ageLabel,
      actualOnlineMs: null,
      note: '行道年月来自本卷已保存的游戏月；存档未记录完整实际在线时长与累计收支。',
    },
    route: {
      opening: game.core.openingChoice,
      openingText: opening,
      school: game.school,
      schoolLabel: school,
      realms: record.realms,
      learned: record.training.learned,
      relics: record.training.relics,
      loadout: record.training.loadout,
      equippedRelic: record.training.equippedRelic,
      decisions: record.decisions,
      trialAnswer: game.trial?.answer ?? null,
    },
    battle: record.battle,
    stock: record.snapshot,
    epilogue,
    alternateEnding: alternate
      ? {
          id: alternate,
          label: ASCENSION_ENDINGS[alternate].label,
          text: '本卷未选结尾：' + ASCENSION_ENDINGS[alternate].label,
        }
      : null,
    inheritance: inheritanceOffer(game),
    origin: game.incarnation?.inheritance ?? null,
    scope: record.scope,
  });
}
export type LifeLedger = ReturnType<typeof buildLifeLedger>;
