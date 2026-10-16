import { content as C } from '../content/m1.ts';
import type { Action, Choice, Command, ItemId, LocationId, RealmId, State, Transition } from './types.ts';

export class RuleError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.name = 'RuleError'; this.code = code; }
}
function fail(code: string, text: string): never { throw new RuleError(code, text); }
const itemIds = Object.keys(C.items) as ItemId[];
const realms: RealmId[] = ['mortal', 'qi', 'foundation'];
const locations: LocationId[] = ['wilderness', 'cave', 'sect', 'market'];
const choices: Choice[] = ['help', 'trade', 'leave'];
function integer(n: unknown, min = 0, max = C.modifiers.maxQuantity): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
}
function object(v: unknown): v is Record<string, unknown> { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function text(v: unknown, max = 100): v is string { return typeof v === 'string' && v.trim().length > 0 && v.length <= max; }
function has(o: object, k: unknown): k is string { return typeof k === 'string' && Object.hasOwn(o, k); }
function keys(o: Record<string, unknown>, expected: string[]): boolean { return Object.keys(o).every(k => expected.includes(k)); }
function requireRealm(s: State, min: RealmId): void {
  if (realms.indexOf(s.player.realm) < realms.indexOf(min)) fail('REALM_REQUIRED', `需要${C.realms[min].name}境界`);
}
function requirePlace(s: State, place: LocationId): void { if (s.world.location !== place) fail('LOCATION_REQUIRED', `需要前往 ${place}`); }
function spendTime(s: State, months: number): void {
  if (s.player.startAgeMonths + s.world.elapsedMonths + months >= C.realms[s.player.realm].lifespanMonths) fail('AGE_LIMIT', '寿元余量不足；该批次未继续执行');
  s.world.elapsedMonths += months;
}
function spend(s: State, stones: number, items: Partial<Record<ItemId, number>> = {}): void {
  if (s.player.stones < stones) fail('INSUFFICIENT_STONES', '灵石不足');
  for (const [id, count] of Object.entries(items)) if (s.inventory[id as ItemId] < count) fail('INSUFFICIENT_ITEM', `缺少${C.items[id as ItemId].name}`);
  s.player.stones -= stones;
  for (const [id, count] of Object.entries(items)) s.inventory[id as ItemId] -= count;
}
function gainXp(s: State, xp: number): void { s.player.xp = Math.min(C.realms[s.player.realm].xpCap, s.player.xp + xp); }

/** Validate imported snapshots BEFORE publishing or replacing any current state. */
export function validateState(v: unknown): asserts v is State {
  if (!object(v) || !keys(v, ['schemaVersion','contentVersion','balanceVersion','runId','revision','mode','player','world','inventory','openingChoice','learnedSkills','activeEvent'])) fail('INVALID_STATE', '存档结构无效');
  if (v.schemaVersion !== 1 || v.contentVersion !== C.version || v.balanceVersion !== C.balanceVersion) fail('VERSION_MISMATCH', '不支持此存档或数值版本');
  if (!text(v.runId) || !integer(v.revision) || !['idle','event'].includes(String(v.mode))) fail('INVALID_STATE', '存档标识或状态无效');
  const p = v.player, w = v.world, inv = v.inventory;
  if (!object(p) || !object(w) || !object(inv)) fail('INVALID_STATE', '存档缺少角色、世界或行囊');
  if (!keys(p, ['name','realm','xp','hp','mp','stones','startAgeMonths']) || !keys(w, ['location','elapsedMonths'])) fail('INVALID_STATE', '存档含未知字段');
  if (!text(p.name, 16) || !has(C.realms, p.realm)) fail('INVALID_STATE', '道号或境界无效');
  const r = C.realms[p.realm as RealmId];
  if (!integer(p.xp, 0, r.xpCap) || !integer(p.hp, 1, r.maxHp) || !integer(p.mp, 0, r.maxMp) || !integer(p.stones) || !integer(p.startAgeMonths, 1) || !integer(w.elapsedMonths) || !locations.includes(w.location as LocationId)) fail('INVALID_STATE', '属性或游戏时间超出范围');
  if ((p.startAgeMonths as number) + (w.elapsedMonths as number) >= r.lifespanMonths) fail('INVALID_STATE', '已超寿限');
  if (Object.keys(inv).length !== itemIds.length || itemIds.some(id => !Object.hasOwn(inv, id) || !integer(inv[id]))) fail('INVALID_STATE', '物品 ID 或数量无效');
  if (v.openingChoice !== null && !choices.includes(v.openingChoice as Choice)) fail('INVALID_STATE', '开场选择无效');
  if (!Array.isArray(v.learnedSkills) || v.learnedSkills.length > 1 || v.learnedSkills.some(x => x !== 'skill_jinghong_slash')) fail('INVALID_STATE', '技能引用无效');
  if (v.learnedSkills.length !== (v.openingChoice === 'trade' ? 1 : 0)) fail('INVALID_STATE', '技能与当前内容进度不一致');
  if (v.mode === 'event') {
    if (!object(v.activeEvent) || !keys(v.activeEvent, ['id','instanceId']) || v.activeEvent.id !== 'temple' || v.activeEvent.instanceId !== `${v.runId}:temple` || v.openingChoice !== null || p.realm !== 'mortal' || p.xp !== 0 || w.location !== 'wilderness') fail('INVALID_STATE', '未决事件不一致');
  } else if (v.activeEvent !== null || v.openingChoice === null) fail('INVALID_STATE', '开场尚未解决');
}
export function newGame(name: string, runId: string): State {
  const s: State = {
    schemaVersion: 1, contentVersion: C.version, balanceVersion: C.balanceVersion, runId, revision: 0, mode: 'event',
    player: { name, realm: 'mortal', xp: 0, hp: 60, mp: 20, stones: 40, startAgeMonths: 216 },
    world: { location: 'wilderness', elapsedMonths: 0 },
    inventory: { herb: 0, dew: 0, core: 0, healing_pill: 1, spirit_pill: 0, foundation_pill: 0 },
    openingChoice: null, learnedSkills: [], activeEvent: { id: 'temple', instanceId: `${runId}:temple` }
  };
  validateState(s); return s;
}
export function validateCommand(c: unknown): asserts c is Command {
  if (!object(c) || !text(c.commandId) || !text(c.runId) || !integer(c.expectedRevision) || !text(c.type)) fail('INVALID_COMMAND', '指令标识无效');
  const extra: Record<string, string[]> = { CHOOSE:['choice'], TRAVEL:['location'], CULTIVATE:['method','count'], SOURCE:['sourceId','count','target'], BUY:['item','quantity'], SELL:['item','quantity'], CRAFT:['recipeId'], USE:['item'], REST:[], BREAKTHROUGH:[] };
  if (!has(extra, c.type) || !keys(c, ['commandId','runId','expectedRevision','type', ...extra[c.type]])) fail('INVALID_COMMAND', '指令类型或字段无效');
  if (c.type === 'CHOOSE' && !choices.includes(c.choice as Choice)) fail('INVALID_COMMAND', '开场选项无效');
  if (c.type === 'TRAVEL' && !locations.includes(c.location as LocationId)) fail('INVALID_COMMAND', '地点无效');
  if (c.type === 'CULTIVATE' && !has(C.cultivation, c.method)) fail('INVALID_COMMAND', '修炼方式无效');
  if (c.type === 'SOURCE' && !has(C.sources, c.sourceId)) fail('INVALID_COMMAND', '资源来源无效');
  if (c.type === 'CRAFT' && !has(C.recipes, c.recipeId)) fail('INVALID_COMMAND', '配方无效');
  if (['BUY','SELL','USE'].includes(c.type) && !has(C.items, c.item)) fail('INVALID_COMMAND', '物品无效');
  if (['BUY','SELL'].includes(c.type) && !integer(c.quantity, 1)) fail('INVALID_COMMAND', '交易数量须为正整数');
  if (c.count !== undefined && !integer(c.count, 1, C.modifiers.maxBatch)) fail('INVALID_COMMAND', '批量数量超出范围');
  if (c.target !== undefined && (!object(c.target) || !keys(c.target,['item','quantity']) || !has(C.items,c.target.item) || !integer(c.target.quantity,1))) fail('INVALID_COMMAND', '批量目标无效');
}

function one(s: State, a: Action): void {
  if (a.type === 'CHOOSE') {
    if (s.mode !== 'event' || s.openingChoice !== null) fail('EVENT_ALREADY_RESOLVED', '这段因果已经结算');
    if (a.choice !== 'leave') spend(s, 0, { healing_pill: 1 });
    s.openingChoice = a.choice;
    if (a.choice === 'trade') s.learnedSkills.push('skill_jinghong_slash');
    s.activeEvent = null; s.mode = 'idle'; return;
  }
  if (s.mode !== 'idle') fail('PENDING_EVENT', '请先处理当前遭遇');
  switch (a.type) {
    case 'TRAVEL':
      if (a.location === s.world.location) fail('NO_CHANGE', '已在此地');
      s.world.location = a.location; break;
    case 'CULTIVATE': {
      requirePlace(s, 'cave'); const rule = C.cultivation[a.method]; requireRealm(s, rule.minRealm);
      if (s.player.xp >= C.realms[s.player.realm].xpCap) fail('XP_CAP', '修为已满，请准备突破');
      spend(s, rule.stones); spendTime(s, rule.months);
      gainXp(s, Math.floor(C.realms[s.player.realm].baseYield * (100 + Math.min(rule.bonusPercent, C.modifiers.cultivationBonusCapPercent)) / 100));
      break;
    }
    case 'SOURCE': {
      const r = C.sources[a.sourceId]; requirePlace(s, r.location); requireRealm(s, r.minRealm);
      if (a.target && !Object.hasOwn(r.items, a.target.item)) fail('TARGET_UNREACHABLE', '这个来源不产出目标物资');
      if (a.target && s.inventory[a.target.item] >= a.target.quantity) fail('TARGET_MET', '物资目标已完成');
      spendTime(s, r.months); s.player.stones += r.stones; gainXp(s, r.xp);
      for (const [id, amount] of Object.entries(r.items)) s.inventory[id as ItemId] += amount;
      break;
    }
    case 'BUY': {
      requirePlace(s, 'market'); requireRealm(s, C.items[a.item].minRealm);
      spend(s, C.items[a.item].buy * a.quantity); s.inventory[a.item] += a.quantity; break;
    }
    case 'SELL': {
      requirePlace(s, 'market'); const price = C.items[a.item].sell;
      if (price === null) fail('ITEM_LOCKED', '突破物不可出售');
      spend(s, 0, { [a.item]: a.quantity }); s.player.stones += price * a.quantity; break;
    }
    case 'CRAFT': {
      requirePlace(s, 'cave'); const r = C.recipes[a.recipeId]; requireRealm(s, r.minRealm);
      spend(s, r.stones, r.inputs); spendTime(s, r.months); s.inventory[r.output]++; break;
    }
    case 'USE': {
      const item = C.items[a.item], r = C.realms[s.player.realm];
      if (!item.healHp && !item.healMp) fail('NOT_USABLE', '此物不是恢复丹药');
      if ((item.healHp && s.player.hp >= r.maxHp) || (item.healMp && s.player.mp >= r.maxMp)) fail('NO_CHANGE', '已恢复圆满，无需消耗丹药');
      spend(s, 0, { [a.item]: 1 }); s.player.hp = Math.min(r.maxHp, s.player.hp + (item.healHp ?? 0)); s.player.mp = Math.min(r.maxMp, s.player.mp + (item.healMp ?? 0)); break;
    }
    case 'REST': {
      requirePlace(s, 'cave'); const r = C.realms[s.player.realm];
      if (s.player.hp === r.maxHp && s.player.mp === r.maxMp) fail('NO_CHANGE', '无需疗养');
      spendTime(s, 1); s.player.hp = r.maxHp; s.player.mp = r.maxMp; break;
    }
    case 'BREAKTHROUGH': {
      requirePlace(s, 'cave'); const r = C.realms[s.player.realm];
      if (!r.next) fail('CONTENT_BOUNDARY', '当前工程仅验证入道至筑基，后续尚未实现');
      if (s.player.xp < r.xpCap) fail('XP_REQUIRED', '修为尚未圆满');
      spend(s, 0, r.breakthroughCost);
      s.player.realm = r.next; s.player.xp = 0;
      s.player.hp = C.realms[r.next].maxHp; s.player.mp = C.realms[r.next].maxMp; break;
    }
  }
}

/** Pure calculation. No I/O, time-of-day, RNG, DOM or storage access. */
export function resolve(state: State, command: Command): Transition {
  validateState(state); validateCommand(command);
  if (command.runId !== state.runId) fail('RUN_MISMATCH', '不是当前存档的指令');
  if (command.expectedRevision !== state.revision) fail('STALE_REVISION', '存档已改变，请重新读取');
  let next = structuredClone(state), steps = 0, stopReason: string | null = null;
  const count = command.type === 'CULTIVATE' || command.type === 'SOURCE' ? command.count ?? 1 : 1;
  const stoppable = ['XP_CAP','INSUFFICIENT_STONES','INSUFFICIENT_ITEM','AGE_LIMIT','TARGET_MET'];
  for (let i = 0; i < count; i++) {
    const candidate = structuredClone(next);
    try { one(candidate, command); validateState(candidate); next = candidate; steps++; }
    catch (error) {
      if (steps && error instanceof RuleError && stoppable.includes(error.code)) { stopReason = error.code; break; }
      throw error;
    }
  }
  next.revision++; validateState(next);
  const deltaItems = Object.fromEntries(itemIds.map(id => [id, next.inventory[id] - state.inventory[id]])) as Record<ItemId, number>;
  return { state: next, receipt: { commandId: command.commandId, revisionBefore: state.revision, revisionAfter: next.revision, steps, stopReason,
    delta: { xp: next.player.xp-state.player.xp, hp: next.player.hp-state.player.hp, mp: next.player.mp-state.player.mp,
      stones: next.player.stones-state.player.stones, months: next.world.elapsedMonths-state.world.elapsedMonths, inventory: deltaItems } } };
}
export function parseSnapshot(json: string): State {
  if (typeof json !== 'string' || json.length > 1000000) fail('INVALID_STATE', '存档过大或不是文本');
  let parsed: unknown; try { parsed = JSON.parse(json); } catch { fail('INVALID_STATE', '存档不是有效 JSON'); }
  validateState(parsed); return structuredClone(parsed);
}
