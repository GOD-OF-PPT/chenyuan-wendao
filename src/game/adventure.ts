import { content as C } from '../content/m1.ts';
import { newGame, resolve, validateState, RuleError } from './engine.ts';
import type { Action, Command, State } from './types.ts';

export type School = 'sword' | 'talisman';
export type Move = 'attack' | 'guard' | 'technique' | 'release' | 'heal' | 'restore' | 'flee';
export const enemies = Object.freeze({
  wolf: { name: '雾隐妖狼', hp: 76, attack: 13, heavy: 32, xp: 35, stones: 10 },
  warden: { name: '守山石卫', hp: 112, attack: 17, heavy: 40, xp: 55, stones: 18 }
});
export type EnemyId = keyof typeof enemies;
export interface Battle { enemy: EnemyId; hp: number; round: number; sword: number; marks: number[]; log: string[] }
export interface Adventure {
  format: 'chenyuan-playable'; version: 1; core: State; school: School | null;
  battle: Battle | null; journal: string[]; wins: number;
}
export type GameAction = Action | { type: 'SCHOOL'; school: School } | { type: 'ENCOUNTER'; enemy: EnemyId } | { type: 'BATTLE'; move: Move };
export type GameCommand = GameAction & { commandId: string; runId: string; expectedRevision: number };
function err(code: string, message: string): never { throw new RuleError(code, message); }
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const strings = (v: unknown, max: number) => Array.isArray(v) && v.length <= max && v.every(s => typeof s === 'string' && s.length <= 600);
const keys = (v: object, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
export function validateAdventure(v: unknown): asserts v is Adventure {
  if (!isObject(v) || !keys(v, ['format','version','core','school','battle','journal','wins']) || v.format !== 'chenyuan-playable' || v.version !== 1) err('SAVE_FORMAT', '不支持的试玩存档格式');
  validateState(v.core);
  if (v.school !== null && v.school !== 'sword' && v.school !== 'talisman') err('SAVE_SCHOOL', '修法无效');
  if ((v.core.player.realm === 'mortal' || v.core.mode === 'event') && v.school !== null) err('SAVE_SCHOOL', '尚未入道，不能装备修法');
  if (!strings(v.journal, 60) || !num(v.wins,0,1000000)) err('SAVE_LOG', '经历记录无效');
  if (v.battle !== null) {
    const b = v.battle;
    if (!isObject(b) || !keys(b,['enemy','hp','round','sword','marks','log']) || typeof b.enemy !== 'string' || !Object.hasOwn(enemies,b.enemy)) err('SAVE_BATTLE','敌人无效');
    if (!num(b.hp,1,enemies[b.enemy as EnemyId].hp) || !num(b.round,0,39) || !num(b.sword,0,3) || !Array.isArray(b.marks) || b.marks.length > 3 || !b.marks.every(n=>num(n,1,2)) || !strings(b.log,8)) err('SAVE_BATTLE','战斗数据无效');
    if (v.core.mode !== 'idle' || !v.school || v.core.player.realm === 'mortal' || v.core.world.location !== 'wilderness') err('SAVE_BATTLE','战斗与地点不一致');
    if ((v.school === 'sword' && b.marks.length > 0) || (v.school === 'talisman' && b.sword !== 0)) err('SAVE_BATTLE','修法状态不一致');
  }
}
export function createAdventure(name: string, runId: string): Adventure {
  return { format:'chenyuan-playable', version:1, core:newGame(name,runId), school:null, battle:null, journal:['山雨初歇。你带着一枚回春丹，踏上了求道之路。'], wins:0 };
}
export function parseAdventure(text: string): Adventure {
  if (typeof text !== 'string' || text.length > 1000000) err('SAVE_SIZE','存档过大');
  let v: unknown;
  try { v=JSON.parse(text); } catch { err('SAVE_JSON','文件不是有效 JSON'); }
  if (isObject(v) && v.schemaVersion === 1) { validateState(v); v={format:'chenyuan-playable',version:1,core:v,school:null,battle:null,journal:['已导入 M1 经济原型存档。'],wins:0}; }
  validateAdventure(v); return structuredClone(v);
}
export function intent(b: Battle): { kind: 'attack'|'prepare'|'heavy'; name: string; damage: number } {
  const e=enemies[b.enemy]; const k=b.round%3;
  return k===1 ? {kind:'prepare',name:'正在蓄势 · 下回合重击',damage:0} : k===2 ? {kind:'heavy',name:'蓄势重击',damage:e.heavy} : {kind:'attack',name:'试探进攻',damage:e.attack};
}
function log(g: Adventure, text: string) { g.journal=[...g.journal,text].slice(-60); }
function payMana(g: Adventure, amount: number) { if (g.core.player.mp<amount) err('MP_REQUIRED','灵力不足，普通攻击或护体可回灵'); g.core.player.mp-=amount; }
function battleTurn(g: Adventure, move: Move) {
  const b=g.battle!; const e=enemies[b.enemy]; const p=g.core.player; const r=C.realms[p.realm];
  const forecast=intent(b); let block=0, damage=0, interrupted=false; const lines:string[]=[];
  const power=p.realm==='foundation'?6:0;
  if (move==='flee') { p.hp=Math.max(1,p.hp-8); g.battle=null; g.core.world.location='cave'; log(g,'你舍弃战利品，遁回洞府。气血 -8；可免费疗养。'); return; }
  if (move==='attack') { damage=13+power; p.mp=Math.min(r.maxMp,p.mp+6); if(g.school==='sword') b.sword=Math.min(3,b.sword+1); lines.push(`普通攻击 ${damage}，回灵 6。`); }
  if (move==='guard') { block=24; p.mp=Math.min(r.maxMp,p.mp+5); lines.push('凝神护体：减伤 24，回灵 5。'); }
  if (move==='technique') {
    payMana(g,8);
    if(g.school==='sword') { damage=16+power; b.sword=Math.min(3,b.sword+2); lines.push(`青锋起势 ${damage}，剑意 +2。`); }
    else { if(b.marks.length>=3) err('MARK_CAP','符印已满，请引爆或等待消散'); b.marks.push(2); block=12; lines.push('镇灵符：叠加二回合符印，当前减伤 12。'); }
  }
  if (move==='release') {
    if(g.school==='sword') { if(!b.sword) err('SWORD_REQUIRED','尚无剑意'); payMana(g,12); damage=18+power+10*b.sword+(g.core.learnedSkills.length?4:0); interrupted=b.sword===3 && forecast.kind==='heavy'; b.sword=0; lines.push(`惊鸿斩 ${damage}${interrupted?'，打断重击':''}。`); }
    else { if(!b.marks.length) err('MARK_REQUIRED','先用镇灵符留下符印'); payMana(g,10); damage=16+power+b.marks.reduce((a,n)=>a+9*n,0); b.marks=[]; lines.push(`燃符诀 ${damage}，一次结算余下符印。`); }
  }
  if(move==='heal' || move==='restore') {
    const item=move==='heal'?'healing_pill':'spirit_pill';
    if(!g.core.inventory[item]) err('INSUFFICIENT_ITEM','行囊中没有这种丹药');
    if((move==='heal'&&p.hp===r.maxHp)||(move==='restore'&&p.mp===r.maxMp)) err('NO_CHANGE','已恢复圆满');
    g.core.inventory[item]--; if(move==='heal') p.hp=Math.min(r.maxHp,p.hp+35); else p.mp=Math.min(r.maxMp,p.mp+25);
    lines.push(move==='heal'?'服回春丹，恢复 35 气血。':'服回灵丹，恢复 25 灵力。');
  }
  const tick=b.marks.length*9; damage+=tick;
  if(tick) lines.push(`符印灼伤 ${tick}。`);
  b.marks=b.marks.map(n=>n-1).filter(n=>n>0); b.hp-=damage;
  if(b.hp<=0) {
    g.core.inventory.core++; p.stones+=e.stones; p.xp=Math.min(r.xpCap,p.xp+e.xp); g.wins++; g.battle=null;
    log(g,`${lines.join(' ')}击败${e.name}，获得妖核 ×1、灵石 ${e.stones}、修为 ${e.xp}（受上限约束）。`); return;
  }
  const loss=interrupted?0:Math.max(0,forecast.damage-block); p.hp-=loss;
  lines.push(forecast.kind==='prepare'?'敌人蓄势，暂未攻击。':`承受 ${loss} 点伤害。`);
  b.round++; b.log=[...b.log,...lines].slice(-8);
  if(p.hp<=0 || b.round>=40) {
    const lost=p.hp<=0; p.hp=Math.max(1,p.hp); g.battle=null; g.core.world.location='cave';
    log(g,lost?'你未能抵住攻击，被护山阵送回洞府。功法与物品保留；疗养后可再战。':'缠斗过久，你退回洞府，本次无战利品。');
  } else log(g,lines.join(' '));
}
/** Extends, rather than duplicates, the previously tested economic resolver. */
export function advance(game: Adventure, command: GameCommand): Adventure {
  validateAdventure(game);
  if(!isObject(command) || typeof command.commandId!=='string' || !command.commandId.trim() || command.commandId.length>100 || command.runId!==game.core.runId || command.expectedRevision!==game.core.revision) err('STALE_COMMAND','指令过期，请读取最新存档');
  const g=structuredClone(game);
  if(command.type==='SCHOOL' || command.type==='ENCOUNTER' || command.type==='BATTLE') {
    const field=command.type==='SCHOOL'?'school':command.type==='ENCOUNTER'?'enemy':'move';
    if(!keys(command,['type','commandId','runId','expectedRevision',field])) err('INVALID_COMMAND','指令含未知字段');
    if(g.core.mode!=='idle') err('PENDING_EVENT','请先决定破庙中的相遇');
    if(command.type==='SCHOOL') {
      if(g.battle) err('IN_BATTLE','战斗中不能改换修法');
      if(g.core.player.realm==='mortal') err('REALM_REQUIRED','请先引气入体');
      if(command.school!=='sword' && command.school!=='talisman') err('INVALID_COMMAND','修法无效');
      if(g.school===command.school) err('NO_CHANGE','已装备此修法');
      g.school=command.school; log(g,command.school==='sword'?'你修习青锋剑诀。积蓄剑意，择机破敌。':'你修习镇灵符诀。以符印制敌，静候时机。');
    } else if(command.type==='ENCOUNTER') {
      if(g.battle) err('IN_BATTLE','已有战斗尚未结束');
      if(typeof command.enemy!=='string' || !Object.hasOwn(enemies,command.enemy)) err('INVALID_COMMAND','敌人无效');
      if(!g.school || g.core.player.realm==='mortal') err('SCHOOL_REQUIRED','入道后先选择修法');
      if(g.core.world.location!=='wilderness') err('LOCATION_REQUIRED','请先前往山野');
      if(g.core.player.hp<30) err('HP_REQUIRED','气血低于 30，先回洞府疗养');
      if(g.core.player.startAgeMonths+g.core.world.elapsedMonths+1>=C.realms[g.core.player.realm].lifespanMonths) err('AGE_LIMIT','寿元不足以继续历练');
      g.core.world.elapsedMonths++; g.battle={enemy:command.enemy,hp:enemies[command.enemy].hp,round:0,sword:0,marks:[],log:[]};
      log(g,`你在山野遭遇${enemies[command.enemy].name}。敌方意图已显露。`);
    } else {
      if(!g.battle) err('NO_BATTLE','当前没有战斗');
      if(!['attack','guard','technique','release','heal','restore','flee'].includes(command.move)) err('INVALID_COMMAND','战斗行动无效');
      battleTurn(g,command.move);
    }
    g.core.revision++;
  } else {
    if(g.battle) err('IN_BATTLE','先结束战斗；可在战斗面板服丹或撤退');
    const result=resolve(g.core,command as Command); g.core=result.state;
    const d=result.receipt.delta;
    const parts:string[]=[];
    if(command.type==='CHOOSE') parts.push(command.choice==='help'?'你赠丹相助，结下赠药之缘。':command.choice==='trade'?'以丹换来惊鸿剑简，彼此两清。':'你保留丹药，告别破庙。');
    if(command.type==='BREAKTHROUGH') parts.push(`灵台一清，你已踏入${C.realms[g.core.player.realm].name}。`);
    if(command.type==='TRAVEL') parts.push('你整顿行囊，抵达新的地点。');
    if(d.months) parts.push(`游戏岁月 +${d.months} 月`);
    if(d.xp) parts.push(`修为 ${d.xp>0?'+':''}${d.xp}`);
    if(d.stones) parts.push(`灵石 ${d.stones>0?'+':''}${d.stones}`);
    if(d.hp) parts.push(`气血 ${d.hp>0?'+':''}${d.hp}`);
    if(d.mp) parts.push(`灵力 ${d.mp>0?'+':''}${d.mp}`);
    for(const [id,n] of Object.entries(d.inventory)) if(n) parts.push(`${C.items[id as keyof typeof C.items].name} ${n>0?'+':''}${n}`);
    if(result.receipt.stopReason) parts.push(`批量已自动停止（${result.receipt.steps} 次已结算）`);
    log(g,parts.join(' · ')||'行动已结算。');
  }
  validateAdventure(g); return g;
}
