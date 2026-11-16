import type { AdventureActivity } from '../../src/full/activity.ts';
import { adventureDecision } from '../../src/full/adventure.ts';
import { enemies, items, locations } from '../../src/full/content.ts';
import { repeats } from '../../src/full/repetition';
export function adventureView(a: AdventureActivity) {
  const p = a.plan,
    trip = p.kind === 'travel',
    decision = adventureDecision(a);
  const name = trip
    ? '行路至' + locations[p.location].name
    : enemies[p.enemy].name;
  const gains = Object.entries(a.gainedItems)
    .map(([id, n]) => items[id].name + ' +' + n)
    .join(' · ');
  const costs = Object.entries(a.spentItems)
    .map(([id, n]) => items[id].name + ' ×' + n)
    .join(' · ');
  return {
    name,
    noun: trip ? '行旅' : '斗法',
    unit: '次动作',
    type: a.nextCommand?.type ?? (trip ? 'TRAVEL' : 'BATTLE'),
    rows: trip
      ? ['抵达后停止，不自动采集、采购或挑战']
      : [
          `入场 ${a.encountersStarted} · 出招 ${a.battleTurns} · 胜 ${a.victories} / 败退 ${a.defeats} / 撤退 ${a.retreats}`,
          `累计耗灵 ${a.spentMp}${'mpBudget' in p ? ' / ' + p.mpBudget : ''} · 用药 ${costs || '暂无'}`,
          `灵石 +${a.gainedStones} · 修为 +${a.gainedXp}${gains ? ' · ' + gains : ''}`,
          `下一步：${decision.reason}`,
        ],
    summary: trip
      ? [`已完成 ${a.completedCycles} 次抵达`]
      : [
          `出招 ${a.battleTurns} · 胜 ${a.victories} / 败退 ${a.defeats} / 撤退 ${a.retreats}`,
          `耗灵 ${a.spentMp} · 用药 ${costs || '暂无'}`,
          `灵石 +${a.gainedStones} · 修为 +${a.gainedXp}`,
          gains || '暂无物资战利品',
          `气血净变化 ${a.hpChange} · 灵力净变化 ${a.mpChange}`,
        ],
    goal: trip
      ? '抵达目的地即停'
      : p.kind === 'encounter' && repeats(p)
        ? '持续当前对手，达标、触线或手动停下'
        : p.kind === 'encounter'
          ? `最多 ${p.maxEncounters} 场 · ${p.maxCycles} 次动作 · 游戏月预算 ${p.monthBudget}`
          : p.mode === 'single'
            ? '只出一招，不自动恢复旧战策'
            : '只执行当前敌人与关卡，危险或上限即停',
  };
}
