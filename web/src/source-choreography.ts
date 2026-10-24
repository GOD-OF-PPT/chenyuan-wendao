import * as C from '../../src/full/content.ts';
import type {Game} from '../../src/full/types.ts';
import type {Activity} from '../../src/full/activity.ts';
import type {ActionResult} from '../../src/full/contracts.ts';

export const SOURCE_ART:Record<string,string>={
 herbs:'art/v2/sources/herbs-cold-v1.webp',dew:'art/v2/sources/dew-cold-v1.webp',
 jade:'art/v2/sources/jade-cold-v1.webp',lotus:'art/v2/sources/lotus-cold-v1.webp',
 soul:'art/v2/sources/soul-cold-v1.webp',dao:'art/v2/sources/dao-cold-v1.webp',
};
export const COMMISSION_OBJECTS={work:'sweep',core:'escort',jade_task:'survey',work_foundation:'array',lotus_task:'garden',work_golden:'teach',soul_task:'repose',work_nascent:'anchor',dao_task:'rubbing',work_spirit:'province'} as const;
export const SOURCE_TOOLS:Record<string,string>={herbs:'药镰与束草绳',dew:'承露竹管',jade:'勘玉凿',lotus:'采莲长柄',soul:'凝魂拂尘',dao:'拂砂笔'};
export const COMMISSION_WORK:Record<string,string>={work:'清理案前杂务，逐轮承办',core:'核对路牒与护送封绳',jade_task:'比照拓图，校勘灵脉',work_foundation:'护持阵位，稳住阵令',lotus_task:'翻检药圃册，照看草木',work_golden:'摊开经卷，传法授业',soul_task:'持安魂信物，照应乡里',work_nascent:'稳固镇脉印，守护灵脉',dao_task:'铺纸拓碑，拂去石屑',work_spirit:'核对一州图令，护佑四方'};
export function projectSourceWork(state:string,value:number){
 const progress=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0,working=state==='working';
 const phase=state==='saving'?'sealing':!working?'still':progress<.18?'contact':progress<.82?'work':'gather';
 return{working,phase,progress,approach:working?(1-Math.min(1,progress/.18))*12:0,
  turn:working?Math.sin(progress*Math.PI*10)*5:0,draw:working?Math.max(0,Math.min(1,(progress-.18)/.64)):0,
  fold:working&&progress>.82?(progress-.82)/.18:state==='saving'?1:0};
}
export const sourceItemName=(id:string)=>id==='stones'?'灵石':C.items[id]?.name??id;
export function sourceHoldings(game:Game,id:string){
 const source=C.sources[id];return source?[...Object.keys(source.items),...(source.stones?['stones']:[])].map(item=>({id:item,name:sourceItemName(item),quantity:item==='stones'?game.core.player.stones:game.core.inventory[item]})):[];
}
export function sourcePeriodTotals(game:Game,id:string,activity:Activity|null){
 if(activity?.version!==2||activity.runId!==game.core.runId||activity.plan.sourceId!==id)return null;
 return{cycles:activity.completedCycles,items:activity.gainedItems,stones:activity.gainedStones,xp:activity.gainedXp,months:activity.spentMonths};
}
/** The parent owns complete proof and lifetime; this projection rejects a mismatched display target. */
export function savedSourceYield(game:Game,id:string,activity:Activity|null,result:ActionResult|null){
 if(!C.sources[id]||!result||result.type!=='SOURCE'||result.executedSteps!==1||result.requestedSteps!==1||result.runId!==game.core.runId||result.revisionAfter!==game.core.revision||activity?.version!==2||activity.plan.sourceId!==id||activity.runId!==game.core.runId||activity.gameRevision!==result.revisionAfter||result.commandId!==`cycle:${activity.id}:${activity.generation}:${activity.completedCycles}`)return null;
 const items=Object.entries(result.delta.inventory).filter(([,n])=>n>0).map(([item,n])=>({id:item,name:sourceItemName(item),quantity:n}));
 if(result.delta.stones>0)items.push({id:'stones',name:'灵石',quantity:result.delta.stones});
 return{items,xp:result.delta.xp,months:result.costs.months,key:result.commandId};
}
