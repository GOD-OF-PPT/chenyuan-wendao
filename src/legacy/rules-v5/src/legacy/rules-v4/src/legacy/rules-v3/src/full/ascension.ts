export type AscensionEnding = 'transmit' | 'depart';
/** Existing successful endings; both close this life without starting upper-world play. */
export const ASCENSION_ENDINGS = Object.freeze({
  transmit: Object.freeze({ label: '留道传承', title: '飞升 · 留道传承',
    description: '将此生所学留在人间，而后踏入天门。传承记录来自你实际走过的路，不要求先结下人物盟约。',
    conclusion: '你选择把道法留在人间，而后踏入天门。',
    record: '你将道法留在人间，而后踏入天门。此后万山之间，仍有人传诵你的来路。' }),
  depart: Object.freeze({ label: '独赴上界', title: '飞升 · 独赴上界',
    description: '独自踏入天门，将来路收于此卷。本卷到此结束，不开启新的地图或上界修炼。',
    conclusion: '你选择独赴上界，来路收于此卷。',
    record: '你选择独赴上界。云海合拢，新的故事不在这部旧卷之中。' }),
});
