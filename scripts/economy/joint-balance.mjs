import assert from 'node:assert/strict';
import * as C from '../../src/full/content.ts';
import {stats} from '../../src/full/engine.ts';
import {ActivityLedger,projectProgression} from '../../src/full/progression.ts';
import {defaultEncounterPlan} from '../../src/full/adventure.ts';
import {createIdleRoute} from './idle-scenarios.mjs';

const options=school=>({choice:'leave',school,preparation:'gather',cultivation:'natural',answer:'accept',ending:'transmit',advanced:false});
const equal=(a,b)=>assert.deepEqual(a,b);
const stop=(message,code='AUDIT_TARGET')=>{const e=new Error(message);e.code=code;throw e;};
function normal(school,realm){
 const r=createIdleRoute(options(school));r.begin();r.grow(realm);return r;
}
function flow(game,prefix='joint'){
 const a=new ActivityLedger(game,prefix,1500);
 const run=(plan,label)=>{const out=a.run(plan,label);if(out.status!=='stopped'||!['CYCLES_COMPLETE','TARGET_MET','XP_CAP','ENCOUNTERS_COMPLETE'].includes(out.stopReason?.code))stop(out.stopReason?.message??'Plan did not complete',out.stopReason?.code);return out;};
 const go=location=>{if(a.game.core.world.location!==location)run({kind:'travel',location,maxCycles:1},'明确往返');};
 const source=(id,count)=>{while(count>0){const n=Math.min(50,count);go(C.sources[id].location);run({kind:'source',sourceId:id,maxCycles:n,until:'cycles',target:null,monthBudget:n*C.sources[id].months,remainingMonthsReserve:1},id);count-=n;}};
 const trade=(kind,item,count,reserve=0)=>{while(count>0){const n=Math.min(50,count);go('market');run(kind==='buy'?{kind,item,maxCycles:n,until:'cycles',targetQuantity:null,stoneBudget:n*C.items[item].buy,stoneReserve:reserve}:{kind,item,maxCycles:n,itemReserve:reserve},kind+' '+item);count-=n;}};
 const fund=target=>{
  const missing=Math.max(0,target-a.game.core.player.stones);if(!missing)return;
  const income=bestIncome(a.game.core.player.realm,missing);
  for(const [id,n]of Object.entries(income.counts))source(id,n);
  assert.ok(a.game.core.player.stones>=target);
 };
 const xp=target=>{
  while(a.game.core.player.xp<target){
   const s=stats(a.game),n=Math.min(50,Math.ceil((target-a.game.core.player.xp)/Math.floor(s.baseYield*(100+s.cultivationBonus)/100)));
   go('cave');run({kind:'cultivation',method:'natural',maxCycles:n,until:'cycles',stoneBudget:0,stoneReserve:0},'补足相同修为目标');
  }
 };
 const replay=projection=>{if(!projection.complete)stop(projection.failure?.message??'Incomplete projection',projection.failure?.code);for(const s of projection.steps)s.kind==='configuration'?a.configure(s.action,s.label):run(s.plan,s.label);equal(a.ledger.report().closing,projection.closing);};
 return{a,run,go,source,trade,fund,xp,replay};
}

// Bounded integer mixtures of all unlocked pure-income sources. The cheapest
// online mixture is replayed as actual whole cycles; no buy-price valuation is income.
const incomeCache=new Map();
function bestIncome(realm,missing){
 const key=realm+':'+missing;if(incomeCache.has(key))return incomeCache.get(key);
 const sources=Object.entries(C.sources).filter(([,s])=>!Object.keys(s.items).length&&s.stones>0&&C.rank(s.min)<=C.rank(realm));
 const limit=Math.ceil(missing+Math.max(...sources.map(([,s])=>s.stones))),dp=Array(limit+1).fill(null);
 dp[0]={ms:0,months:0,xp:0,cycles:0,counts:{}};
 const better=(a,b)=>!b||a.ms<b.ms||a.ms===b.ms&&(a.xp>b.xp||a.xp===b.xp&&a.cycles<b.cycles);
 for(let cash=1;cash<=limit;cash++)for(const [id,s]of sources){
  const previous=dp[cash-s.stones];if(!previous)continue;
  const next={ms:previous.ms+s.onlineMs,months:previous.months+s.months,xp:previous.xp+s.xp,cycles:previous.cycles+1,counts:{...previous.counts,[id]:(previous.counts[id]??0)+1}};
  if(better(next,dp[cash]))dp[cash]=next;
 }
 let best=null;
 for(let cash=Math.ceil(missing);cash<=limit;cash++)if(dp[cash]&&(better(dp[cash],best)||best&&dp[cash].ms===best.ms&&cash>best.cash))best={...dp[cash],cash};
 assert.ok(best);incomeCache.set(key,best);return best;
}
function dominates(a,b){
 if(!a.complete||!b.complete)return false;
 const x=a.ledger.closing,y=b.ledger.closing;
 const notWorse=a.onlineMs<=b.onlineMs&&a.ledger.totals.costs.months<=b.ledger.totals.costs.months&&x.stones>=y.stones&&x.xp>=y.xp&&Object.keys(C.items).every(id=>x.inventory[id]>=y.inventory[id]);
 return notWorse&&(a.onlineMs<b.onlineMs||a.ledger.totals.costs.months<b.ledger.totals.costs.months||x.stones>y.stones||x.xp>y.xp||Object.keys(C.items).some(id=>x.inventory[id]>y.inventory[id]));
}
function capture(f,target,work){
 let failure=null;try{work();f.go('cave');const g=f.a.game;assert.ok(g.core.player.stones>=target.stones&&g.core.player.xp>=target.xp&&Object.entries(target.inventory).every(([id,n])=>g.core.inventory[id]>=n));}catch(e){failure={code:e.code??e.name,message:e.message};}
 return{complete:!failure,failure,onlineMs:f.a.onlineMs,steps:f.a.steps,ledger:f.a.ledger.report(true)};
}

export function compoundSourceComparisons(){
 const cases=[];
 for(const school of ['sword','talisman'])for(const realm of ['qi','foundation','golden','nascent','spirit']){
  const r=normal(school,realm);
  for(const capped of [false,true]){
   if(capped)r.project('natural');const game=r.game,original=structuredClone(game);
   for(const [id,s]of Object.entries(C.sources).filter(([id,s])=>(id==='core'||id.endsWith('_task'))&&s.min===realm))for(const n of id==='dao_task'?[1,2,6,36]:[1,2,6]){
    const item=Object.keys(s.items)[0],quantity=s.items[item]*n,cash=s.stones*n;
    const target={location:'cave',inventory:{...game.core.inventory,[item]:game.core.inventory[item]+quantity},stones:game.core.player.stones+cash,xp:Math.min(C.realms[realm].xpCap,game.core.player.xp+s.xp*n)};
    const gather=Object.entries(C.sources).find(([key,v])=>key!==id&&!key.endsWith('_task')&&v.items[item]>0&&C.rank(v.min)<=C.rank(realm));
    const candidates=[];
    for(const method of ['commission','gather-income','gather-sell','income-buy']){
     if(method.startsWith('gather')&&!gather)continue;
     const f=flow(game);
     candidates.push({method,...capture(f,target,()=>{
      if(method==='commission')f.source(id,n);
      else if(method==='income-buy'){f.fund(target.stones+quantity*C.items[item].buy);f.trade('buy',item,quantity,target.stones);}
      else{
       const [key,source]=gather;
       if(method==='gather-income'){f.source(key,Math.ceil(quantity/source.items[item]));f.fund(target.stones);}
       else{const extra=Math.ceil(cash/C.items[item].sell);f.source(key,Math.ceil((quantity+extra)/source.items[item]));f.trade('sell',item,extra,target.inventory[item]);}
      }
      f.xp(target.xp);
     })});
    }
    const commission=candidates.find(c=>c.method==='commission');
    cases.push({school,realm,capped,id,batches:n,target,initial:game,candidates,commissionDominatedBy:candidates.filter(c=>c!==commission&&dominates(c,commission)).map(c=>c.method)});
   }
   equal(r.game,original);
  }
 }
 return cases;
}

export function preparationComparisons(){
 const rows=[];
 for(const school of ['sword','talisman'])for(const realm of ['qi','foundation','golden','nascent','spirit'])for(const capital of ['working-balance','earned-prefunding'])for(const capped of [false,true]){
  const r=normal(school,realm),pill=C.realms[realm].pill;
  if(capital==='earned-prefunding')r.funds(C.items[pill].buy,'共同起点先实际筹资');
  if(capped)r.project('natural');r.go('cave');const game=r.game,original=structuredClone(game);
  const candidates=[];
  for(const method of ['gather','commission','purchase']){
   const actual=realm==='qi'&&method==='commission'?'gather':method,f=flow(game,'prep');
   const target={inventory:{[pill]:Math.max(1,game.core.inventory[pill])},stones:0,xp:C.realms[realm].xpCap};
   const result=capture(f,target,()=>{f.replay(projectProgression(f.a.game,actual));f.replay(projectProgression(f.a.game,'natural'));});
   candidates.push({method,actualVariant:actual,...result});
  }
  rows.push({school,realm,capital,capped,commonPreparation:r.activity.ledger.report(),initial:game,candidates:candidates.map(c=>({...c,dominatedBy:candidates.filter(other=>other!==c&&other.actualVariant!==c.actualVariant&&dominates(other,c)).map(other=>other.method)}))});
  equal(r.game,original);
 }
 return rows;
}

export function sustainableCombat(){
 const rows=[];
 for(const school of ['sword','talisman'])for(const [enemy,e]of Object.entries(C.enemies).filter(([,e])=>!e.trial)){
  const r=createIdleRoute({...options(school),choice:'help'});r.begin();
  while(r.game.core.player.realm!==e.min){r.project('gather');r.project('natural');r.milestone({type:'BREAKTHROUGH'},'正常境界准备');}
  const game=r.game,f=flow(game,'combat');let failure=null,victories=0;
  assert.equal(game.core.inventory.healing_pill,0);assert.equal(game.core.inventory.spirit_pill,0);
  try{
   for(let n=0;n<5;n++){
    f.go(e.location);const result=f.run(defaultEncounterPlan(f.a.game,enemy),'当前敌人五次独立安排');assert.equal(result.victories,1);victories++;
    f.go('cave');const g=f.a.game,s=stats(g);if(g.core.player.hp<s.maxHp||g.core.player.mp<s.maxMp)f.run({kind:'rest',maxCycles:1,remainingMonthsReserve:1},'实际恢复消耗');
   }
  }catch(error){failure={code:error.code??error.name,message:error.message};}
  const ledger=f.a.ledger.report(true);
  assert.equal(f.a.game.core.player.xp,game.core.player.xp);assert.equal(ledger.totals.xpGained,0);
  rows.push({school,enemy,complete:!failure,failure,victories,onlineMs:f.a.onlineMs,steps:f.a.steps,ledger});
 }
 return rows;
}
