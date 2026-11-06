import type {Activity,ActivityPlan} from '../../src/full/activity.ts';
import type {RuleFailure} from '../../src/full/contracts.ts';
import {preparationView} from './preparation-view';
import {adventureView} from './adventure-view';
import {milestoneView} from './milestone-view';
import type {Game} from '../../src/full/types.ts';
import {items,recipes,relics,sources} from '../../src/full/content.ts';
const gains=(values:Record<string,number>)=>Object.entries(values).map(([id,n])=>items[id].name+' +'+n).join(' · ');
const quantities=(values:Record<string,number>)=>Object.entries(values).map(([id,n])=>items[id].name+' ×'+n).join(' · ');
// Keep persisted v6 reasons and their exact receipt proofs unchanged.
export function stopMessage(plan:ActivityPlan,reason:RuleFailure|null|undefined){
 if(['buy','learn','study'].includes(plan.kind)){
  if(reason?.code==='ACTIVITY_BUDGET')return'本段用石额度不足';
  if(reason?.code==='INSUFFICIENT_STONES')return'灵石不足';
 }
 if((plan.kind==='sell'||plan.kind==='use')&&reason?.code==='INSUFFICIENT_ITEM'&&Object.hasOwn(items,plan.item))return items[plan.item].name+'不足';
 if(reason?.code==='CYCLES_COMPLETE'){
  if(plan.kind==='travel')return'已抵达目的地，本次行旅结束';
  if(plan.kind==='encounter')return'已完成本段历练动作上限，后续由你另行安排';
  if(plan.kind==='battle')return'已完成本段斗法动作上限，不再自动出招';
 }
 return reason?.message??'';
}
const recoveryCauses=new Map([
 ['存储空间不足，本次操作未提交，原进度保留','存储空间不足'],
 ['存储事务失败，本次操作未提交，原进度保留','存储事务失败'],
 ['本地存储不可访问，已有数据未改动','本地存储不可访问'],
]);
/** Only uncertain known storage reports are projected; their original values stay untouched. */
export function recoveryMessage(value:string,unconfirmed:boolean){return unconfirmed?recoveryCauses.get(value)??value:value;}
export function activityView(a:Activity,game:Game|null){
 if(a.version===7)return milestoneView(a);
 if(a.version===6)return adventureView(a);
 if(a.version===5)return preparationView(a);
 const p=a.plan;
 if(a.version===1&&p.kind==='cultivation')return{name:p.method==='natural'?'自然吐纳':'灵石辅助',noun:'修炼',unit:'轮',type:'CULTIVATE',rows:[`累计修为 +${a.gainedXp}`,`灵石已用 ${a.spentStones} / ${p.stoneBudget}`,`游戏岁月 +${a.spentMonths} 月 · 保留灵石 ${p.stoneReserve}`],summary:[`完成 ${a.completedCycles} 轮 · 修为 +${a.gainedXp}`,`灵石消耗 ${a.spentStones} · 岁月 +${a.spentMonths} 月`],goal:p.until==='xp-cap'?'修为圆满即停':'完成所选轮数即停'};
 if(a.version===2&&p.kind==='source'){const income=[gains(a.gainedItems),a.gainedStones?'灵石 +'+a.gainedStones:''].filter(Boolean).join(' · ');const t=p.target,stock=t&&game?(t.kind==='stones'?game.core.player.stones:game.core.inventory[t.id]):null;return{name:sources[p.sourceId].name,noun:sources[p.sourceId].location==='sect'?'委托':'取材',unit:'轮',type:'SOURCE',rows:[`累计修为 +${a.gainedXp}`,income||'尚无已保存物资',`游戏月已用 ${a.spentMonths} / ${p.monthBudget} · 余寿保留 ${p.remainingMonthsReserve} 月`,...(t?[`${t.kind==='stones'?'灵石':items[t.id].name}库存 ${stock} / ${t.quantity}`]:[])],summary:[`完成 ${a.completedCycles} 轮 · 修为 +${a.gainedXp}`,income||'暂无物资产出',`岁月 +${a.spentMonths} 月`],goal:p.until==='target'?'达到库存目标即停':'完成所选轮数即停'};}
 if((a.version===3||a.version===4)&&(p.kind==='craft'||p.kind==='forge')){const gain=a.version===3?gains(a.gainedItems):a.forgedRelics.map(id=>relics[id].name).join('、'),cost=quantities(a.spentItems);return{name:p.kind==='craft'?recipes[p.recipeId].name:relics[p.relicId].name,noun:p.kind==='craft'?'炼丹':'炼器',unit:p.kind==='craft'?'炉':'件',type:p.kind==='craft'?'CRAFT':'FORGE',rows:[gain?(p.kind==='craft'?'成丹：':'器成：')+gain:'尚无已保存成品',`灵石已用 ${a.spentStones} / ${p.stoneBudget} · 保留 ${p.stoneReserve}`,`游戏月已用 ${a.spentMonths} / ${p.monthBudget} · 余寿留 ${p.remainingMonthsReserve} 月`,`耗材：${cost||'暂无'}`],summary:[`完成 ${a.completedCycles} ${p.kind==='craft'?'炉':'件'}`,gain||'尚无成品',`灵石消耗 ${a.spentStones} · 岁月 +${a.spentMonths} 月`,`耗材：${cost||'暂无'}`,...(p.kind==='forge'?[`当前本命：${game?.loadout.relic?relics[game.loadout.relic].name:'尚未装备'}`]:[])],goal:p.kind==='forge'?'炼成一件即停，不自动装备':p.until==='target'?`成品库存达到 ${p.targetQuantity} 即停`:'完成所选炉次即停'};}
 throw new Error('未知活动显示类型');
}
