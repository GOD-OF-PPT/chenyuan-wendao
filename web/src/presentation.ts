import type {Game} from '../../src/full/types.ts';
import type {Observation} from './local-events.ts';
import { items, realms, skills, relics } from '../../src/full/content.ts';
import type { ActionCosts, StateDelta, ActionResult } from '../../src/full/contracts.ts';
import type { ResourceDeficit } from '../../src/full/queries.ts';

export const resourceName = (gap: ResourceDeficit) => gap.kind === 'item' && gap.id ? items[gap.id].name :
  ({ stones: '灵石', mp: '灵力', months: '可用游戏月', xp: '修为', hp: '气血', item: '物品' })[gap.kind];
export function formatCosts(cost: ActionCosts | null) {
  if (!cost) return '条件满足后才能确认成本';
  return [cost.stones ? `灵石 ${cost.stones}` : '', cost.mp ? `灵力 ${cost.mp}` : '',
    ...Object.entries(cost.items).map(([id, n]) => `${items[id].name} ×${n}`), cost.months ? `${cost.months} 游戏月` : ''].filter(Boolean).join(' · ') || '不消耗物资';
}
export function formatDelta(delta: StateDelta) {
  const sign = (n: number) => n > 0 ? '+' + n : String(n);
  return [delta.stones ? `灵石 ${sign(delta.stones)}` : '', delta.xp ? `修为 ${sign(delta.xp)}` : '',
    delta.hp ? `气血 ${sign(delta.hp)}` : '', delta.mp ? `灵力 ${sign(delta.mp)}` : '',
    ...Object.entries(delta.inventory).map(([id, n]) => `${items[id].name} ${sign(n)}`),
    delta.months ? `游戏月 +${delta.months}` : '', delta.wins ? `胜场 +${delta.wins}` : '',
    delta.realm.before !== delta.realm.after ? `${realms[delta.realm.before].name} → ${realms[delta.realm.after].name}` : ''].filter(Boolean).join(' · ') || '物资未变化';
}

/** Read a confirmed current outcome; never infer an old slot or alter the receipt. */
export function outcome(result:ActionResult,game:Game,action?:Observation['action']) {
 const fallback=()=>formatDelta(result.delta);
 if(result.runId!==game.core.runId||result.revisionAfter!==game.core.revision||result.executedSteps!==1)return fallback();
 if(result.type==='SCHOOL'&&game.school){const id=game.loadout.mind;return(game.school==='sword'?'剑修':'符修')+' · '+(id?skills[id].description:'配装已保存');}
 if(result.type==='EQUIP_RELIC'&&game.loadout.relic){const r=relics[game.loadout.relic];return r.name+' · '+r.description;}
 if(result.type==='EQUIP'){
  const id=typeof action?.skill==='string'?action.skill:null,s=id?skills[id]:null;
  if(s&&game.loadout[s.slot]===id)return({mind:'心法',builder:'起手',finisher:'终结'}[s.slot])+'：'+s.name+' · '+s.description;
  return game.journal.at(-1)??fallback();
 }
 return fallback();
}
