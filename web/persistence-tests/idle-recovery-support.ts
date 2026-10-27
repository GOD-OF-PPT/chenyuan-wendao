import type {Page} from '@playwright/test';
import {setupMilestones} from './milestone-support';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));

/** Explicit rule-time fixture composition; it never substitutes for a GUI or wall-clock route. */
export async function setupCurrentRecovery(page:Page){
 await setupMilestones(page);
 const trialSamples={sword:trialJourneyScenario('sword','accept'),talisman:trialJourneyScenario('talisman','release')};
 await page.evaluate(async ({root,trialSamples})=>{
  const h=(window as any).h;
  h.m04C=await import(`/@fs${root}src/full/content.ts`);
  h.m04TrialSamples=trialSamples;
  h.m04RealNow=Date.now;h.m04Now=Date.now();Date.now=()=>h.m04Now;
  h.m04Same=(a:any,b:any,label:string)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error('M04 full equality: '+label);};
  h.m04Run=async(repo:any,plan:any)=>{
   const before=await repo.loadActivitySnapshot(),startIntent=h.milestoneMutation(before,'m04-fixture'),started=await repo.startActivity(plan,startIntent);
   let a=started.activity,state=started.state,count=0,lastOutcome:any=null;const records=[];
   while(a.status==='running'){
    if(count++>=50)throw Error('M04 finite fixture exceeded fifty cycles');
    const tick=h.milestoneTick({state,activity:a}),formal=h.engine.resolve(state,a.nextCommand);
    h.m04Now=a.dueAt-1;const early=await h.attempt(()=>repo.settleActivity(tick));
    if(early.code!=='ACTIVITY_NOT_DUE')throw Error('M04 fixture lost complete cycle');
    h.m04Same((await repo.loadActivitySnapshot()).state,state,'before due');
    h.m04Now=a.dueAt;const done=await repo.settleActivity(tick);
    h.m04Same(done.state,formal.nextState,'formal fixture Game');h.m04Same(done.result,formal.result,'formal fixture result');
    h.m04Same(done.activity,h.milestoneModel.completeActivity(formal.nextState,a,formal.result,{commandId:tick.commandId,now:h.m04Now}),'formal fixture Activity');
    records.push({tick,cycleMs:a.cycleMs,early:early.code});lastOutcome=done;a=done.activity;state=done.state;
   }
   return{before,started,startIntent,state,activity:a,records,lastOutcome};
  };
  h.m04Plan=(game:any,action:any)=>{
   if(['commandId','runId','expectedRevision'].some(k=>k in action))throw Error('M04 fixture action must not replace a reviewed intent');
   const C=h.m04C;
   if(['CHOOSE','EVENT','DECIDE','BREAKTHROUGH','START_TRIAL','ANSWER_TRIAL','END','RETIRE','END_LIFE'].includes(action.type))return h.milestonePlan(action);
   if(action.type==='TRAVEL')return{kind:'travel',location:action.location,maxCycles:1};
   if(action.type==='BATTLE')return h.adventure.singleBattlePlan(game,action.move);
   if(action.type==='CULTIVATE')return{kind:'cultivation',method:'natural',maxCycles:50,until:'xp-cap',stoneBudget:0,stoneReserve:0};
   if(action.type==='BUY')return{kind:'buy',item:action.item,maxCycles:action.quantity,until:'target',targetQuantity:game.core.inventory[action.item]+action.quantity,stoneBudget:action.quantity*C.items[action.item].buy,stoneReserve:0};
   if(action.type==='REST')return{kind:'rest',maxCycles:1,remainingMonthsReserve:1};
   throw Error('Unsupported explicit fixture action '+action.type);
  };
  h.m04Action=async(repo:any,action:any)=>h.m04Run(repo,h.m04Plan(await repo.load(),action));
  h.m04Travel=async(repo:any,location:string)=>{if((await repo.load()).core.world.location!==location)await h.m04Action(repo,{type:'TRAVEL',location});};
  h.m04GoodTrial=async(name:string)=>{
   const d=h.routes.driver();d.realm();d.realm();d.realm();d.funds(4000);d.realm();
   const repo=await h.FullSaveRepository.open(name);await repo.importText(JSON.stringify(d.checkpoints.nascent),h.mutation());
   const broken=await h.m04Action(repo,{type:'BREAKTHROUGH'}),prior=await repo.loadCheckpoint();
   h.m04Same(prior.snapshot,broken.before.state,'actual ordinary checkpoint');
   if(prior.kind!=='breakthrough')throw Error('M04 needs an actual prior ordinary checkpoint');
   await h.m04Travel(repo,'market');
   for(const[item,quantity]of [['ascension_seal',1],['healing_pill',12],['spirit_pill',4]])await h.m04Action(repo,{type:'BUY',item,quantity});
   await h.m04Travel(repo,'cave');
   for(let n=0;(await repo.load()).core.player.xp<h.engine.stats(await repo.load()).xpCap;n++){
    if(n>=6)throw Error('M04 fixture cultivation cap');await h.m04Action(repo,{type:'CULTIVATE'});
   }
   const state=await repo.load(),maximum=h.engine.stats(state);
   if(state.core.player.hp<maximum.maxHp||state.core.player.mp<maximum.maxMp)await h.m04Action(repo,{type:'REST'});
   await h.m04Travel(repo,'terrace');const snapshot=await repo.loadActivitySnapshot();
   h.engine.resolve(snapshot.state,h.command(snapshot.state,{type:'START_TRIAL'}));
   h.m04Same(await repo.loadCheckpoint(),prior,'prior good checkpoint survived real preparations');
   return{repo,snapshot,prior};
  };
 },{root,trialSamples});
}
