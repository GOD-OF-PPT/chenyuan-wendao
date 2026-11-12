import {test,expect,type Page,type Locator} from '@playwright/test';
import * as C from '../../src/full/content.ts';
import {createIdleRoute} from '../../scripts/economy/idle-scenarios.mjs';
import {snapshot,activitySnapshot,useJourneyClock,revealPaged} from '../e2e/support';
import {runVisibleIdleRoute,selectPlan,decision,settleVisibleActivity,home} from '../e2e/idle-route-support';
import {openSourceSettings,closeSourceSettings,openProductionIntent,closeProductionSettings} from '../e2e/stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const routes=[['help','sword','craft'],['trade','sword','purchase'],['leave','sword','craft'],['help','talisman','purchase'],['trade','talisman','craft'],['leave','talisman','purchase']] as const;
async function database(page:Page){return page.evaluate(()=>new Promise<any>((ok,no)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onupgradeneeded=()=>{q.transaction!.abort();no(Error('Readonly guide cannot create storage'));};q.onerror=()=>no(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};for(const n of db.objectStoreNames){rows[n]=[];const c=tx.objectStore(n).openCursor();c.onsuccess=()=>{if(c.result){rows[n].push({key:c.result.key,value:c.result.value});c.result.continue();}};}tx.oncomplete=()=>{db.close();ok({version:db.version,rows});};tx.onabort=()=>{db.close();no(tx.error);};};}));}
async function readonly(page:Page,work:()=>Promise<void>){const before=await database(page);await work();expect(await database(page)).toEqual(before);}
async function prepare(page:Page,route:string){await home(page);await page.getByTestId('tab-1').click();await page.getByTestId('feature-prepare').click();await expect(page.getByTestId('preparation-catalogue')).toBeVisible();if(await page.getByTestId('prepare-back').isVisible())await decision(page,page.getByTestId('prepare-back'));await page.getByTestId('prepare-'+route+'-route').click();await expect(page.getByTestId('prepare-'+route+'-route')).toHaveAttribute('aria-pressed','true');}
async function tripFromGuide(page:Page,button:Locator,location:string){
 const before=await snapshot(page),old=await activitySnapshot(page);
 if(before.core.world.location===location){await readonly(page,()=>decision(page,button));expect(await activitySnapshot(page)).toEqual(old);return;}
 await decision(page,button);expect(await snapshot(page)).toEqual(before);
 await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 expect((await activitySnapshot(page)).plan).toEqual({kind:'travel',location,maxCycles:1});
 const result=await settleVisibleActivity(page);expect(result.game.core.world.location).toBe(location);expect(result.cycles).toBe(1);
}
async function sourceFromGuide(page:Page,id:string|null,quantity:number,route:string){
 await readonly(page,async()=>{await prepare(page,route);await revealPaged(page,'prepare-source-'+(id??'stones'),'preparation-catalogue','筹备材料');await decision(page,page.getByTestId('prepare-source-'+(id??'stones')));});
 const game=await snapshot(page),selected=id?Object.entries(C.sources).find(([,s])=>(s.items[id]??0)>0&&C.rank(s.min)<=C.rank(game.core.player.realm))!:["work",C.sources.work] as const;
 const [sourceId,source]=selected,goId='prepare-go-source-'+sourceId;
 await readonly(page,()=>revealPaged(page,goId,'preparation-catalogue','来源'));
 await tripFromGuide(page,page.getByTestId(goId),source.location);
 await expect(page.getByTestId('source-planner')).toBeVisible();
 await readonly(page,async()=>{
  await openSourceSettings(page,true);await page.getByLabel('取材次数',{exact:true}).selectOption('target');
  await page.getByLabel('目标资源',{exact:true}).selectOption(id??'stones');await page.getByLabel('目标库存',{exact:true}).fill(String(quantity));
  await page.getByLabel('取材目标另设轮数上限',{exact:true}).check();await page.getByLabel('目标最多轮数',{exact:true}).fill('50');await page.getByLabel('累计游戏月预算',{exact:true}).fill(String(50*source.months));
  await page.getByLabel('余寿保留量',{exact:true}).fill('1');await closeSourceSettings(page);
 });
 const before=await snapshot(page),have=id?before.core.inventory[id]:before.core.player.stones;
 await decision(page,page.getByTestId('source-start'));await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 expect((await activitySnapshot(page)).plan).toEqual({kind:'source',sourceId,maxCycles:50,until:'target',target:id?{kind:'item',id,quantity}:{kind:'stones',quantity},monthBudget:50*source.months,remainingMonthsReserve:1});
 const result=await settleVisibleActivity(page);expect(result.cycles).toBe(Math.ceil((quantity-have)/(id?source.items[id]:source.stones)));
 expect(id?result.game.core.inventory[id]:result.game.core.player.stones).toBeGreaterThanOrEqual(quantity);
}

for(const[choice,school,route]of routes)test(`guided idle foundation ${choice}/${school}/${route}`,async({page},info)=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const options={choice,school,preparation:route==='craft'?'gather':'purchase',cultivation:'natural',answer:school==='sword'?'accept':'release',ending:'transmit',advanced:false};
 const prefix=(o:any,identity:any)=>{const r=createIdleRoute(o,identity);r.begin();r.project('natural');return{success:true,failure:null,game:r.game,steps:r.activity.steps,onlineMs:r.activity.onlineMs};};
 const qi=await runVisibleIdleRoute(page,info,options,prefix,{terminalRealm:'qi'});
 expect(qi.core.player.xp).toBe(C.realms.qi.xpCap);expect(qi.core.inventory.foundation_pill).toBe(0);
 await readonly(page,()=>prepare(page,route));await expect(page.getByTestId('preparation-catalogue')).toContainText('筑基丹');
 await page.screenshot({path:info.outputPath('guided-current-needs.png')});
 if(route==='craft'){
  for(const[id,n]of Object.entries(C.recipes.foundation.inputs))if((await snapshot(page)).core.inventory[id]<n)await sourceFromGuide(page,id,n,route);
  if((await snapshot(page)).core.player.stones<C.recipes.foundation.stones)await sourceFromGuide(page,null,C.recipes.foundation.stones,route);
 }else if((await snapshot(page)).core.player.stones<C.items.foundation_pill.buy!)await sourceFromGuide(page,null,C.items.foundation_pill.buy!,route);
 await readonly(page,()=>prepare(page,route));
 const finish=route==='craft'?'cave':'market',before=await snapshot(page);
 if(before.core.world.location!==finish)await tripFromGuide(page,page.getByTestId('prepare-go-finish'),finish);
 await readonly(page,()=>prepare(page,route));await readonly(page,()=>decision(page,page.getByTestId(route==='craft'?'prepare-confirm-craft':'prepare-confirm-buy')));
 const open=page.getByTestId(route==='craft'?'production-start':'preparation-start');
 if(route==='craft')await readonly(page,async()=>{await openProductionIntent(page);await page.getByLabel('炼丹目标另设炉次上限',{exact:true}).check();await page.getByLabel('目标最多炉次',{exact:true}).fill('50');await closeProductionSettings(page);});
 await decision(page,open);await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');
 const a=await activitySnapshot(page);expect(a.plan.kind).toBe(route==='craft'?'craft':'buy');expect(route==='craft'?a.plan.recipeId:a.plan.item).toBe(route==='craft'?'foundation':'foundation_pill');if(route==='craft')expect(a.plan).toEqual({kind:'craft',recipeId:'foundation',maxCycles:50,until:'target',targetQuantity:1,stoneBudget:C.recipes.foundation.stones,stoneReserve:0,monthBudget:C.recipes.foundation.months,remainingMonthsReserve:1,itemReserves:{}});else expect(a.plan.maxCycles).toBe(1);
 const stocked=await settleVisibleActivity(page);expect(stocked.game.core.inventory.foundation_pill).toBe(1);
 if(stocked.game.core.world.location!=='cave'){
  const old=await activitySnapshot(page),state=await snapshot(page),selected=await selectPlan(page,{kind:'travel',location:'cave',maxCycles:1});
  expect(await snapshot(page)).toEqual(state);expect(await activitySnapshot(page)).toEqual(old);await decision(page,selected.control);await settleVisibleActivity(page);
 }
 const prepared=await snapshot(page),selected=await selectPlan(page,{kind:'milestone',action:{type:'BREAKTHROUGH'},maxCycles:1});
 expect(await snapshot(page)).toEqual(prepared);await decision(page,selected.control);const done=await settleVisibleActivity(page);
 expect(done.game.core.player.realm).toBe('foundation');expect(done.game.core.inventory.foundation_pill).toBe(0);expect(done.game.core.player.stones).toBe(prepared.core.player.stones);
 expect(done.game.choices).toEqual({});expect(done.game.ownedRelics).toEqual([]);expect(done.game.core.runId).toBe(qi.core.runId);expect(errors).toEqual([]);
 await page.screenshot({path:info.outputPath('guided-idle-foundation.png')});
 await info.attach('guided-finite-foundation-summary',{body:JSON.stringify({choice,school,route,createdNormally:true,imported:false,actualRealm:done.game.core.player.realm,originalGuideSourcesAndTravelUsed:true}),contentType:'application/json'});
});
