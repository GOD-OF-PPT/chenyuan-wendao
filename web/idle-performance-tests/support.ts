import {expect,type Page,type TestInfo} from '@playwright/test';
import * as C from '../../src/full/content.ts';
import {resolve,stats} from '../../src/full/engine.ts';
import {completeActivity} from '../../src/full/activity.ts';
import {createIdleRoute} from '../../scripts/economy/idle-scenarios.mjs';
import {runVisibleIdleRoute} from '../e2e/idle-route-support';
import {snapshot,activitySnapshot} from '../e2e/support';
import {recoveryDatabase,stored,recoveryMove} from '../e2e/idle-recovery-ui-support';

export {snapshot,activitySnapshot,recoveryDatabase};
// One passive transaction replaces two pre-action connection/serialization round trips.
// The unmeasured seed verifies equality with both original independent readers.
export async function measurementStartSnapshot(page:Page){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{
 const request=indexedDB.open('chenyuan-playable-v1');request.onerror=()=>reject(request.error);request.onsuccess=()=>{
  const db=request.result,tx=db.transaction('full-state','readonly'),store=tx.objectStore('full-state');
  const current=store.get('current'),activity=store.get('activity');
  tx.oncomplete=()=>{db.close();resolve({game:current.result,activity:activity.result??null});};
  tx.onabort=()=>{db.close();reject(tx.error);};
 };
}));}
export async function seedIdleLateSave(page:Page,info:TestInfo){
 const options={choice:'leave',school:'sword',preparation:'purchase',cultivation:'natural',answer:'accept',ending:'transmit',advanced:false};
 const scenario=(o:any,identity:any)=>{
  const r=createIdleRoute(o,identity);r.begin();
  while(C.rank(r.game.core.player.realm)<C.rank('spirit')){r.project(o.preparation);r.project('natural');r.milestone({type:'BREAKTHROUGH'},'明确本次突破');}
  r.project(o.preparation);r.buy('healing_pill',12,'完整回春筹备');r.buy('spirit_pill',4,'完整回灵筹备');r.project('natural');r.go('cave','临劫完整恢复');
  const maximum=stats(r.game);if(r.game.core.player.hp<maximum.maxHp||r.game.core.player.mp<maximum.maxMp)r.run({kind:'rest',maxCycles:1,remainingMonthsReserve:1},'明确一次疗养');
  r.go('terrace','明确前往登仙台');r.milestone({type:'START_TRIAL'},'明确入劫');r.milestone({type:'ANSWER_TRIAL',answer:'accept'},'明确问心');
  return{success:true,failure:null,game:r.game,steps:r.activity.steps,onlineMs:r.activity.onlineMs};
 };
 await runVisibleIdleRoute(page,info,options,scenario,{terminalRealm:'spirit'});
 await recoveryMove(page,'flee');
 const raw=await recoveryDatabase(page),game=stored(raw,'current');
 expect(game.core.world.location).toBe('cave');expect(game.core.player.realm).toBe('spirit');
 expect(raw.rows['full-receipts'].length).toBeGreaterThan(60);
 expect(raw.rows['full-state'].map((r:any)=>r.key)).toEqual(expect.arrayContaining(['current','previous','checkpoint','checkpoint-owner']));
 return{game,raw,stores:Object.fromEntries(Object.entries(raw.rows).map(([name,rows]:any)=>[name,{records:rows.length,jsonBytes:Buffer.byteLength(JSON.stringify(rows)),...(name==='full-state'?{keys:rows.map((r:any)=>r.key)}:{})}]))};
}

// Passive timing witnesses only. Original put and native complete delivery run unchanged.
export async function installMeasurement(page:Page,kind:string){
 await page.addInitScript(({kind})=>{
  const w=window as any,data:any={timeOrigin:performance.timeOrigin,longTasks:[],layoutShifts:[],lcp:[],nativeWrites:[],clicks:[]};w.__idlePerformance=data;
  const clicked=(event:Event)=>{const n=(event.target as Element|null)?.closest('button');if(n)data.clicks.push({id:n.getAttribute('data-testid')??n.textContent?.trim().slice(0,60),ms:performance.now()});};document.addEventListener('click',clicked,true);
  for(const[type,key]of [['longtask','longTasks'],['layout-shift','layoutShifts'],['largest-contentful-paint','lcp']])new PerformanceObserver(list=>{for(const entry of list.getEntries())data[key].push(entry.toJSON());}).observe({type,buffered:true});
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
   if(this.name==='full-state'&&key==='current'||this.name==='full-receipts'&&value?.format==='chenyuan-activity-receipt'){
    const row:any={store:this.name,key:key??null,format:value?.format??null,kind:value?.input?.kind??null,commandId:value?.input?.mutation?.commandId??value?.input?.tick?.commandId??null,revision:value?.core?.revision??null,putMs:performance.now(),putEpoch:Date.now(),completeMs:null,completeEpoch:null};
    data.nativeWrites.push(row);this.transaction.addEventListener('complete',()=>{row.completeMs=performance.now();row.completeEpoch=Date.now();},{once:true});
   }
   return key===undefined?put.call(this,value):put.call(this,value,key);
  };
  w.__idlePerformanceCleanup=()=>{IDBObjectStore.prototype.put=put;document.removeEventListener('click',clicked,true);};
  const visible=(n:Element|null)=>!!n&&!!n.getClientRects().length;
  const loop=()=>{
   const control=kind==='new'?document.querySelector<HTMLButtonElement>('.welcome-form button[type=submit]'):document.querySelector<HTMLButtonElement>('[data-testid=tab-1]');
   if(!data.firstControlReadyMs&&control&&!control.disabled&&visible(control))data.firstControlReadyMs=performance.now();
   const saved=document.querySelector('[data-testid=save-status]')?.textContent?.includes('已保存');
   const ready=kind==='new'?document.querySelector<HTMLButtonElement>('[data-testid=leave]'):document.querySelector<HTMLElement>('[data-testid=training-activity][data-running=true]');
   if(saved&&visible(ready)&&!(ready instanceof HTMLButtonElement&&ready.disabled)){
    data.firstActionReadyMs=performance.now();return;
   }
   requestAnimationFrame(loop);
  };requestAnimationFrame(loop);
 },{kind});
}

export async function acceptMeasuredAction(page:Page,kind:string,before:any,originalActivity?:any){
 const old=originalActivity===undefined?await activitySnapshot(page):originalActivity;
 const plan=kind==='new'?{kind:'milestone',action:{type:'CHOOSE',choice:'leave'},maxCycles:1}:{kind:'travel',location:'wilderness',maxCycles:1};
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 // These contexts are cold and already verified. Keep every actual player click,
 // without the long-route helper's unrelated closed-dialog discovery reads.
 if(kind==='new'){
  await page.getByTestId('leave').click();await page.getByTestId('milestone-confirm').click();
 }else{
  await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-travel').click();
  const control=page.getByTestId('travel-wilderness');
  const [, ,geometry]=await Promise.all([expect(control).toBeVisible(),expect(control).toBeEnabled(),control.evaluate(node=>{
   const r=node.getBoundingClientRect(),nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return{aboveNav:r.bottom<=nav.top,visible:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:!!hit&&(hit===node||node.contains(hit)),oneScreen:document.documentElement.scrollHeight<=innerHeight};
  })]);
  expect(geometry).toEqual({aboveNav:true,visible:true,hit:true,oneScreen:true});
  await control.click();await page.getByTestId('adventure-start').click();
 }
 await expect.poll(async()=>{const a=await activitySnapshot(page);return a?.id!==old?.id&&a?.status==='running';}).toBe(true);
 const a=await activitySnapshot(page);expect(a.plan).toEqual(plan);expect(a.cycleMs).toBe(6000);
 await expect(page.locator('[data-testid=training-activity][data-running=true]')).toBeVisible();
 expect(await snapshot(page)).toEqual(before);return{before,a};
}

export async function completeMeasuredAction(page:Page,accepted:any){
 const{before,a}=accepted;
 await expect.poll(async()=>(await activitySnapshot(page))?.completedCycles).toBe(1);
 await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const raw=await recoveryDatabase(page),game=stored(raw,'current'),activity=stored(raw,'activity'),formal=resolve(before,a.nextCommand);
 expect(game).toEqual(formal.nextState);expect(activity.status).toBe('stopped');
 const starts=raw.rows['full-receipts'].filter((r:any)=>r.value?.format==='chenyuan-activity-receipt'&&r.value.input.kind==='START'&&r.value.activity.id===a.id);
 const ticks=raw.rows['full-receipts'].filter((r:any)=>r.value?.format==='chenyuan-activity-receipt'&&r.value.input.kind==='TICK'&&r.value.command?.commandId===a.nextCommand.commandId);
 expect(starts).toHaveLength(1);expect(starts[0].value.activity).toEqual(a);expect(starts[0].value.input.plan).toEqual(a.plan);
 expect(ticks).toHaveLength(1);const receipt=ticks[0].value;
 expect(receipt.command).toEqual(a.nextCommand);expect(receipt.result).toEqual(formal.result);expect(receipt.proof.activityBefore).toEqual(a);expect(receipt.proof.stateAfter).toEqual(formal.nextState);expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);
 expect(activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:receipt.proof.resolvedAt}));
 return{raw,game,activity,start:starts[0].value};
}

export async function panelFeedback(page:Page,id:string){
 const surface=id==='tab-0'?'#game-content':`[data-testid=${id==='tab-2'?'inventory-catalogue':'fate-catalogue'}]`;
 await page.getByTestId(id).evaluate((el,selector)=>{const w=window as any;w.__idlePanelFeedback=null;el.addEventListener('click',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>{const n=document.querySelector(selector);w.__idlePanelFeedback={ms:performance.now()-start,surfaceVisible:!!n&&!!n.getClientRects().length,selected:el.getAttribute('aria-current')==='page'};}));},{once:true,capture:true});},surface);
 await page.getByTestId(id).click();await page.waitForFunction(()=>Number.isFinite((window as any).__idlePanelFeedback?.ms));
 const measured=await page.evaluate(()=>(window as any).__idlePanelFeedback);await expect(page.getByTestId(id)).toHaveAttribute('aria-current','page');
 await expect(page.locator(surface)).toBeVisible();return{id,...measured};
}
