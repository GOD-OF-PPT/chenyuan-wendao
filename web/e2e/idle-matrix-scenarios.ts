import * as C from '../../src/full/content.ts';
import {stats} from '../../src/full/engine.ts';
import {defaultBattlePlan} from '../../src/full/adventure.ts';
import {createIdleRoute} from '../../scripts/economy/idle-scenarios.mjs';

/** Test route composition only: every outcome comes from the original finite ActivityLedger. */
export function baselineIdleScenario(options:any,identity:any={},foundationOnly=false){
 const r=createIdleRoute(options,identity);let failure:any=null;
 try{
  r.begin();
  while(C.rank(r.game.core.player.realm)<C.rank(foundationOnly?'foundation':'spirit')){
   // This matrix keeps the original basic school: no paid learning or relic aid.
   if(foundationOnly)r.project('natural');
   r.project(options.preparation);r.project(options.cultivation);
   r.milestone({type:'BREAKTHROUGH'},'确认本次普通突破');
  }
  if(!foundationOnly){
   r.project(options.preparation);r.buy('healing_pill',12,'本次天劫回春预算');r.buy('spirit_pill',4,'本次天劫回灵预算');
   r.project(options.cultivation);r.go('cave','临劫恢复核对');
   const maximum=stats(r.game);
   if(r.game.core.player.hp<maximum.maxHp||r.game.core.player.mp<maximum.maxMp)
    r.run({kind:'rest',maxCycles:1,remainingMonthsReserve:1},'明确一次洞府疗养');
   r.go('terrace','明确前往登仙台');r.milestone({type:'START_TRIAL'},'确认本次入劫');
   r.milestone({type:'ANSWER_TRIAL',answer:options.answer},'明确本次问心回答');
   for(let stage=1;stage<=3;stage++){
    for(let segment=1;segment<=3;segment++){
     const plan=defaultBattlePlan(r.game);plan.strategy.healingBudget=Math.min(4,r.game.core.inventory.healing_pill);
     const a=r.run(plan,`明确第${stage}关第${segment}段有限战策`);
     if(r.game.trial?.stage===stage+1)break;
     if(a.stopReason?.code!=='ACTIVITY_BUDGET'||segment===3)
      throw Error('有限战策未完成本关：'+a.stopReason?.message);
    }
    if(r.game.trial?.stage!==stage+1)throw Error('原关卡尚未完成');
   }
   r.milestone({type:'END',ending:options.ending},'明确本次收卷选择');
  }
 }catch(error:any){failure={code:error.code??error.name,message:error.message,phase:r.phase};}
 return{id:r.id,options:{...options},success:failure===null,failure,game:r.game,steps:r.activity.steps,onlineMs:r.activity.onlineMs};
}
