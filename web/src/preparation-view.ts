import type {PreparationActivity} from '../../src/full/activity.ts';
import {items,skills} from '../../src/full/content.ts';
export function preparationView(a:PreparationActivity){
 const p=a.plan,names={learn:'研习玉简',study:'参悟惊鸿剑简',buy:'坊市采购',sell:'坊市寄售',use:'药匣调息',rest:'洞府疗养'};
 const material=(x:Record<string,number>)=>Object.entries(x).map(([id,n])=>`${items[id].name} ×${n}`).join(' · ');
 const effects=[a.learnedSkills.length?'掌握：'+a.learnedSkills.map(id=>skills[id].name).join('、'):'',a.studiedManuals.length?'已参悟惊鸿剑简':'',a.restoredHp?`气血恢复 +${a.restoredHp}`:'',a.restoredMp?`灵力恢复 +${a.restoredMp}`:'',a.gainedStones?`灵石收入 +${a.gainedStones}`:'',material(a.gainedItems)?'入匣：'+material(a.gainedItems):'',material(a.spentItems)?'已用：'+material(a.spentItems):''].filter(Boolean);
 const cost=`累计用石 ${a.spentStones}${'stoneBudget'in p?' / '+p.stoneBudget:''} · 岁月 +${a.spentMonths} 月`;
 const goal=p.kind==='use'?`恢复至 ${p.targetPercent}% 或最多 ${p.maxCycles} 枚即停`:p.kind==='buy'&&p.until==='target'?`库存达到 ${p.targetQuantity} 即停`:p.kind==='learn'?'所选玉简各研习一次，不自动装备':p.kind==='study'?'参悟一次即停':p.kind==='rest'?'疗养一次即停':'完成所选件数即停';
 return{name:names[p.kind]+('item'in p?' · '+items[p.item].name:''),noun:names[p.kind],unit:p.kind==='learn'?'卷':p.kind==='use'?'枚':p.kind==='buy'||p.kind==='sell'?'件':'次',type:p.kind.toUpperCase(),rows:[...effects,cost],summary:[`完成 ${a.completedCycles} / ${p.maxCycles}`,...effects,cost],goal};
}
