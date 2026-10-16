import * as C from './content.ts';
import { stories } from './events.ts';
import { relationshipViews, causalAid } from './story-context.ts';
import type { Game } from './types.ts';

export function formatAgeMonths(months: number): string {
  const years = Math.floor(months / 12), remainder = months % 12;
  return `${years}岁${remainder ? `${remainder}个月` : ''}`;
}
export function lifeOverview(game: Game) {
  const p = game.core.player, ageMonths = p.startAgeMonths + game.core.world.elapsedMonths;
  const limitMonths = game.status === 'ascended' ? null : C.realms[p.realm].lifespanMonths;
  const reason = game.ending;
  const title = game.status === 'active' ? '此生仍在继续' : reason === 'retired' ? '尘世留名 · 主动归隐' :
    reason === 'lifespan' ? '尘世留名 · 寿元已尽' : reason === 'transmit' ? '飞升 · 留道传承' : '飞升 · 独赴上界';
  const conclusion = game.status === 'active' ? '以下是当前已保存的来路，尚未作出此生的结束选择。' :
    reason === 'retired' ? '你主动收起行囊，此生未飞升。余下的岁月仍未耗尽，这是一场由你决定的作别。' :
    reason === 'lifespan' ? '你确认度过了最后一个游戏月，年龄达到当前境界的寿限，此生收卷。' :
    reason === 'transmit' ? '你选择把道法留在人间，而后踏入天门。' : '你选择独赴上界，来路收于此卷。';
  return { name: p.name, status: game.status, reason, title, conclusion,
    realm: p.realm, realmName: C.realms[p.realm].name, elapsedMonths: game.core.world.elapsedMonths,
    startAgeMonths: p.startAgeMonths, ageMonths, ageLabel: formatAgeMonths(ageMonths),
    limitMonths, limitLabel: limitMonths === null ? '本卷不设上界寿限' : formatAgeMonths(limitMonths),
    remainingMonths: limitMonths === null ? null : Math.max(0, limitMonths - ageMonths) };
}
/** A derived snapshot, never an action journal or proof of undocumented acquisition dates. Caller validates Game. */
export function buildLifeRecord(game: Game) {
  const overview = lifeOverview(game), choice = game.core.openingChoice;
  const opening = { choice, text: choice === 'help' ? '山雨破庙，你选择赠丹相助。' :
    choice === 'trade' ? '山雨破庙，你以丹换取剑简，彼此两清。' : choice === 'leave' ?
    '山雨破庙，你选择保留丹药，各自离开。' : '破庙的选择尚未确定。' };
  const realms = C.realmIds.filter(id => Object.hasOwn(game.milestones, id)).map(id => ({
    id, month: game.milestones[id], name: C.realms[id].name,
    text: id === 'mortal' && game.milestones[id] === 0 ? '开卷时的境界记录：凡人。' : `第${game.milestones[id]}游戏月的境界记录：已达${C.realms[id].name}。`,
  }));
  const people = relationshipViews(game).map(person => ({ id: person.id, name: person.name,
    label: person.label, recorded: person.facts.some(fact => fact.id !== 'temple') || person.id === 'shen' && ['help', 'trade'].includes(choice ?? ''),
    facts: person.facts, note: person.facts.length ? '' : '存档没有记录与此人的来往，不补写交情。' }));
  const decisions = Object.entries(stories).filter(([id]) => Object.hasOwn(game.choices, id)).map(([id, story]) => {
    const selected = story.options.find(option => option.id === game.choices[id])!;
    return { id, title: story.name, npc: story.npc, option: selected.id, label: selected.label,
      text: selected.memory ?? `在「${story.name}」时，你选择了「${selected.label}」。` };
  });
  const school = game.school === 'sword' ? '剑修' : game.school === 'talisman' ? '符修' : '尚未择法';
  const learned = Object.keys(C.skills).filter(id => game.learned.includes(id)).map(id => ({ id, name: C.skills[id].name }));
  const relics = Object.keys(C.relics).filter(id => game.ownedRelics.includes(id)).map(id => ({ id, name: C.relics[id].name }));
  const loadout = (['mind', 'builder', 'finisher'] as const).map(slot => ({ slot, id: game.loadout[slot], name: game.loadout[slot] ? C.skills[game.loadout[slot]!].name : '未装备' }));
  const aid = causalAid(game);
  const trial = Object.hasOwn(game.milestones, 'trial_completed') ? `存档记录：第${game.milestones.trial_completed}游戏月已通过天劫三关。` : '存档尚无通过天劫三关的记录。';
  return { format: 'chenyuan-life-record' as const, version: 1 as const,
    source: { runId: game.core.runId, revision: game.core.revision, format: game.format, version: game.version,
      schemaVersion: game.core.schemaVersion, contentVersion: game.core.contentVersion, balanceVersion: game.core.balanceVersion },
    overview, opening, realms, people, decisions, training: { school, learned, relics, loadout,
      equippedRelic: game.loadout.relic ? C.relics[game.loadout.relic].name : '未装备',
      manual: game.core.learnedSkills.includes(C.swordManual.id) ? `当前已研读${C.swordManual.name}。` : `存档尚无研读${C.swordManual.name}的记录。` },
    battle: { wins: game.wins, text: `存档累计记录胜出${game.wins}场。普通历练与天劫共用此计数，未记录的逐场明细不补写。`, trial },
    pledges: { ...aid, text: aid.allDamageReduction || aid.thunderDamageReduction ?
      `已约定的护阵：天劫各击减伤${aid.allDamageReduction}，雷击另减${aid.thunderDamageReduction}。这表示已立约，不推断每一次实际命中。` : '存档未记录已立下的护阵之约。' },
    snapshot: { stones: game.core.player.stones, xp: game.core.player.xp, hp: game.core.player.hp, mp: game.core.player.mp,
      inventory: Object.keys(C.items).filter(id => game.core.inventory[id] > 0).map(id => ({ id, name: C.items[id].name, quantity: game.core.inventory[id] })) },
    scope: '境界年月为存档已有记录，部分旧档只保留载入时境界，不推断精确突破月。功法、法宝与行囊只列当前状态，不推断取得时间或累计收入。事件按篇章整理，不推断跨人物的发生年月。近期手记不是唯一依据。',
  };
}
export type LifeRecord = ReturnType<typeof buildLifeRecord>;
export function lifeRecordLines(record: LifeRecord): string[] {
  const r = record;
  return [r.overview.title, `${r.overview.name}，${r.overview.ageLabel}，${r.overview.realmName}。`, r.overview.conclusion,
    r.overview.status === 'ascended' ? `行道${r.overview.elapsedMonths}游戏月；本卷不继续推断上界寿元。` :
      `行道${r.overview.elapsedMonths}游戏月；${r.overview.status === 'active' ? '当前' : '封卷时'}境界寿限${r.overview.limitLabel}，余寿${r.overview.remainingMonths}游戏月。`,
    r.opening.text, ...r.realms.map(realm => realm.text), `当前修法：${r.training.school}。`, r.training.manual,
    `已掌握功法：${r.training.learned.map(skill => skill.name).join('、') || '尚无记录'}。`,
    `已拥有法宝：${r.training.relics.map(relic => relic.name).join('、') || '尚无记录'}；当前装备：${r.training.equippedRelic}。`,
    `当前功法槽：${r.training.loadout.map(slot => slot.name).join(' / ')}。`,
    ...r.decisions.map(decision => `${decision.npc} · ${decision.title}：${decision.text}`), r.pledges.text,
    r.battle.text, r.battle.trial];
}
export function lifeRecordText(record: LifeRecord): string {
  return [...lifeRecordLines(record), '', '记录范围：' + record.scope,
    '存档身份：' + record.source.runId + ' / revision ' + record.source.revision,
    '规则版本：' + record.source.contentVersion + ' / ' + record.source.balanceVersion,
    '这是生平文本，不含完整进度；恢复请另行导出存档。'].join('\n') + '\n';
}
