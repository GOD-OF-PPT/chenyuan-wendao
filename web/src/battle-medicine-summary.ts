import type{BattleStrategy}from'../../src/full/adventure.ts';
export function medicineSummary(s:BattleStrategy){
 const one=(name:string,resource:string,p:number,n:number,k:number)=>p===0&&n===0&&k===0?'':`${name}最多 ${n} / 保留 ${k}（${resource} ${p}%${p===0?' · 未启用':n===0?' · 触用药线停手':''}）`;
 return[one('回春','气血',s.healBelowPercent,s.healingBudget,s.healingReserve),one('回灵','灵力',s.restoreBelowPercent,s.spiritBudget,s.spiritReserve)].filter(Boolean).join('；')||'不自动用药';
}
