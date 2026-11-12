import {test,expect,type Page,type Browser,type TestInfo} from '@playwright/test';
import {paidResponseFixture,npcResponseFixtures,responseStageFixtures} from '../../tests/response-context-fixtures.mjs';
import {resolve} from '../../src/full/engine';
import type {Game,Action} from '../../src/full/types';
import {createActivity,completeActivity,pauseActivity,resumeActivity} from '../../src/full/activity';
import {canonicalFingerprint} from '../../src/full/receipts';
import {previewAction,getTrialJourney} from '../../src/full/queries';
import {narrativeFor} from '../src/story-pages';
import {formatCosts} from '../src/presentation';
import {validateActivityReceipt} from '../src/activity-persistence';
import {snapshot,activitySnapshot as activity} from './support';
import {decision,home} from './idle-route-support';
import {importRecoveryFixture,recoveryDatabase as database,recoveryReadonly as readonly,stored} from './idle-recovery-ui-support';
import {captureFixedPng} from './png-capture';

// Explicit old Store START compatibility uses the same frozen source through
// Vite. Current immediate choices also have separate production UI coverage.
test.use({baseURL:'http://127.0.0.1:4177',viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(120000);
const faults=new WeakMap<Page,string[]>();
function listen(page:Page){if(faults.has(page))return;const list:string[]=[];faults.set(page,list);page.on('pageerror',e=>list.push(e.message));}
test.beforeEach(({page})=>listen(page));
test.afterEach(async({context},info)=>{
 for(const p of context.pages())if(!p.isClosed())await p.evaluate(()=>{const w=window as any;w.__c13bRelease?.();w.__c13bRestore?.();w.__c13bAck?.restore();});
 await info.attach('browser-errors',{body:JSON.stringify(context.pages().map(p=>faults.get(p)??[])),contentType:'application/json'});
 for(const p of context.pages())expect(faults.get(p)??[]).toEqual([]);
});
const caption=(page:Page)=>page.getByTestId('response-table').locator('.response-presence>small');
const choiceId=(a:Action)=>a.type==='DECIDE'?'decide-'+a.option:a.type==='ANSWER_TRIAL'?'answer-'+a.answer:a.type==='END'?'ending-'+a.ending:'';
const confirmId=(a:Action)=>a.type==='END'?'ascension-confirm':'milestone-confirm';
const attach=(info:TestInfo,name:string,value:unknown)=>info.attach(name,{body:JSON.stringify(value),contentType:'application/json'});
async function fresh(browser:Browser,info:TestInfo){
 const context=await browser.newContext({baseURL:'http://127.0.0.1:4177',viewport:{width:1440,height:900}}),page=await context.newPage();
 page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(15000);listen(page);return{context,page};
}
async function nativeHooks(page:Page){await page.addInitScript(()=>{
 const w=window as any,put=IDBObjectStore.prototype.put;w.__c13bWrites=[];
 IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){
  if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-state'&&k==='current'){
   const row={wall:Date.now(),game:structuredClone(v),committed:false};w.__c13bWrites.push(row);this.transaction.addEventListener('complete',()=>row.committed=true);
  }return k===undefined?put.call(this,v):put.call(this,v,k);
 };
});}
async function load(page:Page,source:Game,virtual=true){
 await nativeHooks(page);
 if(virtual)return await importRecoveryFixture(page,source)as Game;
 await page.goto('/');await expect(page.getByTestId('save-status')).toHaveText('尚无存档',{timeout:15000});
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-response-state.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
 await expect(page.getByTestId('save-status')).toHaveText('已保存');const actual=await snapshot(page),expected=structuredClone(source);
 expected.core.runId=actual.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=actual.core.runId+':'+expected.core.activeEvent.id;
 expect(actual).toEqual(expected);return actual as Game;
}
async function openStory(page:Page){
 await home(page);
 if(!await page.getByTestId('narrative-catalogue').isVisible()){
  await page.getByTestId('tab-0').click();const entry=page.getByTestId('hub-current').getByRole('button',{name:/^(继续当前遭遇|查看问心选择|查看收卷选择|重新查看当前抉择)$/,exact:true});
  if(await entry.isVisible())await entry.click();else{const g=await snapshot(page);if(!g.core.activeEvent||g.core.activeEvent.id==='temple')throw Error('No original current-story entry for this phase');await page.getByTestId('tab-3').click();await page.getByTestId('fate-mode-events').click();await page.getByTestId('fate-resume-dialogue').click();}
 }await expect(page.getByTestId('narrative-catalogue')).toBeVisible();
}
async function select(page:Page,a:Action){
 if(a.type==='DECIDE'){
  await page.getByTestId('story-mode-choices').click();
  await readonly(page,async()=>{const g=await snapshot(page),choice=narrativeFor(g)!.choices.find(c=>c.id===choiceId(a))!;await page.getByRole('button',{name:'查看'+choice.label+'的代价与结果',exact:true}).click();await expect(page.locator('dialog[open].choice-inspection')).toContainText(choice.detail);await page.getByRole('button',{name:'关闭选择详情',exact:true}).click();});
  return;
 }
 await page.getByTestId('story-mode-choices').click();await readonly(page,async()=>{
  await page.getByTestId('response-choices-open').click();await expect(page.getByTestId('response-choices-dialog')).toBeVisible();
  await page.getByTestId('story-select-'+choiceId(a)).click();await expect(page.getByTestId('response-choices-dialog')).not.toBeVisible();
 });
}
async function prepare(page:Page,source:Game,a:Action,virtual=true){
 const g=await load(page,source,virtual);await openStory(page);await select(page,a);return{g,action:a,raw:await database(page)};
}
async function mutation(page:Page,g:Game,before:any,kind:'START'|'PAUSE'|'RESUME',info:TestInfo){
 const raw=await database(page),added=raw.rows['full-receipts'].filter((r:any)=>!before.rows['full-receipts'].some((x:any)=>x.key===r.key));expect(added).toHaveLength(1);
 const r=added[0].value;expect(r.input.kind).toBe(kind);expect(r.fingerprint).toBe(canonicalFingerprint(r.input));expect(()=>validateActivityReceipt(r,g)).not.toThrow();
 const opts={ownerId:r.input.mutation.ownerId,commandId:r.input.mutation.commandId,now:r.activity.startedAt};
 const formal=kind==='START'?createActivity(g,r.input.plan,{...opts,id:r.activity.id}):kind==='PAUSE'?pauseActivity(stored(before,'activity')):resumeActivity(g,stored(before,'activity'),opts);
 expect(r.activity).toEqual(formal);expect(await snapshot(page)).toEqual(g);expect(stored(raw,'current')).toEqual(g);expect(stored(raw,'activity')).toEqual(await activity(page));
 expect(raw.rows['full-state'].filter((x:any)=>x.key!=='activity')).toEqual(before.rows['full-state'].filter((x:any)=>x.key!=='activity'));
 expect(raw.rows['full-receipts'].filter((x:any)=>x.key!==added[0].key)).toEqual(before.rows['full-receipts']);
 for(const n of Object.keys(before.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[n],n).toEqual(before.rows[n]);
 await attach(info,kind+'-complete-formal-and-all-stores',{g,before,raw,receipt:r,formal});return{a:r.activity,raw,receipt:r};
}
async function start(page:Page,t:{g:Game;action:Action;raw:any},info:TestInfo){
 if(t.action.type==='DECIDE'){
  await beginLegacyResponse(page,t.action);
  await expect.poll(async()=>(await activity(page))?.status).toBe('running');await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const accepted=await mutation(page,t.g,t.raw,'START',info);expect(accepted.a.plan).toEqual({kind:'milestone',action:t.action,maxCycles:1});return{...t,...accepted};
 }
 await decision(page,page.getByTestId(choiceId(t.action)));expect(await database(page)).toEqual(t.raw);
 await decision(page,page.getByTestId(confirmId(t.action)));await expect.poll(async()=>(await activity(page))?.status).toBe('running');await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const accepted=await mutation(page,t.g,t.raw,'START',info);expect(accepted.a.plan).toEqual({kind:'milestone',action:t.action,maxCycles:1});return{...t,...accepted};
}
async function beginLegacyResponse(page:Page,action:Action,hold=false){
 await page.evaluate(async({action,hold})=>{
  const {useGame}=await import('/src/store.ts'),store=useGame(),intent=store.prepareMilestone(action as any);
  if(!intent)throw Error('Explicit legacy Store setup was not accepted');
  const pending=store.startPreparedMilestone(intent);
  if(hold)(window as any).__legacyResponseStart=pending;else await pending;
 },{action,hold});
}
async function committedTick(page:Page,g:Game,a:any,before:any,info:TestInfo){
 const raw=await database(page),formal=resolve(g,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId,rows=raw.rows['full-receipts'].filter((r:any)=>r.key===key);expect(rows).toHaveLength(1);
 const r=rows[0].value;expect(r.input).toEqual({kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}});
 expect(r.fingerprint).toBe(canonicalFingerprint(r.input));expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);expect(r.proof).toEqual({activityBefore:a,stateAfter:formal.nextState,resolvedAt:r.proof.resolvedAt});expect(r.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);
 const done=completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:r.proof.resolvedAt});expect(r.activity).toEqual(done);expect(await activity(page)).toEqual(done);expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(raw,'current')).toEqual(formal.nextState);expect(stored(raw,'previous')).toEqual(g);expect(()=>validateActivityReceipt(r,formal.nextState)).not.toThrow();
 expect(raw.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key))).toEqual(before.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key)));
 expect(raw.rows['full-receipts'].filter((x:any)=>x.key!==key)).toEqual(before.rows['full-receipts']);for(const n of Object.keys(raw.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[n],n).toEqual(before.rows[n]);
 await attach(info,'one-real-period-complete-game-activity-proof-all-stores',{g,a,before,raw,formal,receipt:r,done});return{g:formal.nextState,a:done,raw};
}
async function tick(page:Page,t:{g:Game;a:any;raw:any},info:TestInfo){
 const left=t.a.dueAt-await page.evaluate(()=>Date.now());expect(left).toBeGreaterThan(0);expect(left).toBeLessThanOrEqual(t.a.cycleMs);
 await page.clock.fastForward(left-1);expect(await snapshot(page)).toEqual(t.g);expect(await database(page)).toEqual(t.raw);
 await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page)).completedCycles).toBe(t.a.completedCycles+1);await expect(page.getByTestId('save-status')).toHaveText('已保存');return committedTick(page,t.g,t.a,t.raw,info);
}
async function frame(page:Page,info:TestInfo,name:string){
 await expect.poll(()=>page.evaluate(()=>{const app=document.querySelector<HTMLElement>('.app-shell'),alerts=app?.querySelector<HTMLElement>('.stage-alerts');if(!app||!alerts)return true;const h=alerts.getBoundingClientRect().height,n=parseFloat(app.style.getPropertyValue('--notice-height'));return Math.abs(n-(h?h+8:0))<=.5;})).toBe(true);
 await captureFixedPng(page,info.outputPath(name+'.png'));
 const data=await page.evaluate(()=>{
  const root=document.querySelector<HTMLElement>('[data-testid=narrative-catalogue]')!,nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),visible=(e:HTMLElement)=>e.checkVisibility()&&!e.closest('dialog:not([open])');
  const controls=[...root.querySelectorAll<HTMLElement>('button')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:e.innerText,height:r.height,width:r.width,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=nav.top,hit:e.matches(':disabled')||!!hit&&(hit===e||e.contains(hit))};});
  const text=[...root.querySelectorAll<HTMLElement>('.response-presence>small,.reading-text p,.narrative-choice-detail strong')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),p=e.parentElement!.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);return{text:e.innerText,font:parseFloat(getComputedStyle(e).fontSize),minimum:e.matches('small')?14:18,inside:r.left>=p.left-.5&&r.right<=p.right+.5&&r.top>=p.top-.5&&r.bottom<=p.bottom+.5&&r.bottom<=nav.top,range:[...range.getClientRects()].filter(x=>x.width&&x.height).every(x=>x.left>=r.left-1&&x.right<=r.right+1&&x.top>=r.top-1&&x.bottom<=r.bottom+1)};});
  return{controls,text,width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight};
 });await attach(info,name+'-actual-geometry',data);expect(data.width).toBeLessThanOrEqual(1440);expect(data.height).toBeLessThanOrEqual(900);
 for(const c of data.controls){expect(c.height,c.text).toBeGreaterThanOrEqual(44);expect(c.width,c.text).toBeGreaterThanOrEqual(44);expect(c.inside,c.text).toBe(true);expect(c.hit,c.text).toBe(true);}
 for(const t of data.text){expect(t.font,t.text).toBeGreaterThanOrEqual(t.minimum);expect(t.inside,t.text).toBe(true);expect(t.range,t.text).toBe(true);}
}
async function holdWrite(page:Page){await page.evaluate(()=>new Promise<void>((ok,no)=>{
 const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>no(q.error);q.onsuccess=()=>{const db=q.result,names=[...db.objectStoreNames],tx=db.transaction(names,'readwrite'),rows:any={};let hold=true,left=names.length;const w=window as any;w.__c13bRelease=()=>hold=false;
 const loop=()=>{const r=tx.objectStore('full-state').get('current');r.onsuccess=()=>{w.__c13bHeldGame=r.result;if(hold)loop();};};
 for(const n of names){rows[n]=[];const r=tx.objectStore(n).openCursor();r.onsuccess=()=>{if(r.result){rows[n].push({key:r.result.key,value:r.result.value});r.result.continue();}else if(--left===0){w.__c13bHeldDB={version:db.version,rows};loop();ok();}};}
 tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();no(tx.error);};};
}));}
async function holdStartReply(page:Page){await page.evaluate(()=>{
 const w=window as any,put=IDBObjectStore.prototype.put,descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!;if(!descriptor?.set||!descriptor.get||!descriptor.configurable)throw Error('Real completion seam required');const marked=new WeakSet<IDBTransaction>(),queue:Array<()=>void>=[];let armed=true;
 IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(armed&&this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-receipts'&&v?.input?.kind==='START'&&v.activity?.plan.action?.type==='DECIDE')marked.add(this.transaction);return k===undefined?put.call(this,v):put.call(this,v,k);};
 Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(callback:any){if(typeof callback!=='function')return descriptor.set!.call(this,callback);const tx=this;return descriptor.set!.call(tx,function(event:Event){if(armed&&marked.has(tx)){if(!event.isTrusted)throw Error('Expected native START completion');w.__c13bAck.held=true;queue.push(()=>Reflect.apply(callback,tx,[event]));return;}Reflect.apply(callback,tx,[event]);});}});
 const release=()=>{armed=false;for(const f of queue.splice(0))f();};w.__c13bAck={held:false,release,restore(){release();IDBObjectStore.prototype.put=put;Object.defineProperty(IDBTransaction.prototype,'oncomplete',descriptor);}};
});}

test('CEND13-B1 four actual pending NPC meetings keep all original choice details and readonly cancellation before any response is accepted',async({browser},info)=>{
 const fixtures=npcResponseFixtures();expect(fixtures.map(x=>x.person).sort()).toEqual(['lu','pei','shen','yan']);
 for(const f of fixtures){const{context,page}=await fresh(browser,info);try{
  const g=await load(page,f.game),before=await database(page),model=narrativeFor(g)!;await openStory(page);
  for(const choice of model.choices){await select(page,choice.action);await expect(caption(page)).toContainText('预选');await expect(caption(page)).not.toContainText('已安排');
   const card=page.getByTestId('narrative-catalogue').getByTestId(choice.id);await expect(card).toContainText(choice.label);await expect(card).toContainText(choice.detail);await readonly(page,async()=>{await page.getByRole('button',{name:'查看'+choice.label+'的代价与结果',exact:true}).click();const details=page.locator('dialog[open].choice-inspection');await expect(details).toBeVisible();await expect(details.locator('dl')).toContainText(formatCosts(previewAction(g,choice.action).actualCosts??previewAction(g,choice.action).costs));await expect(details.locator('dl')).toContainText(choice.detail);await page.getByRole('button',{name:'关闭选择详情',exact:true}).click();});
   if(previewAction(g,choice.action).allowed){await card.click();await expect(page.getByTestId('game-confirmation')).toBeVisible();expect(await database(page)).toEqual(before);await page.keyboard.press('Escape');}
   expect(await database(page)).toEqual(before);expect(await snapshot(page)).toEqual(g);
  }await frame(page,info,'B1-'+f.person+'-unaccepted-complete-response');expect(faults.get(page)).toEqual([]);
 }finally{await context.close();}}
});

test('CEND13-B2 a genuinely accepted native six-second paid response replaces the contradictory preview caption before exactly one atomic outcome',async({page},info)=>{
 const t=await prepare(page,paidResponseFixture(),{type:'DECIDE',option:'bargain'},false);await page.evaluate(()=>(window as any).__c13bWrites=[]);const accepted=await start(page,t,info);expect(accepted.a.cycleMs).toBe(6000);
 await frame(page,info,'B2-native-accepted-response');
 await expect(caption(page)).toHaveText('本次回应已安排');await expect(caption(page)).not.toContainText('预选');await expect(page.locator('.story-footer>small')).toHaveText('查看不更改已存安排。');
 const initial=parseFloat(await page.getByTestId('response-clock').innerText());await expect.poll(async()=>parseFloat(await page.getByTestId('response-clock').innerText())).toBeLessThan(initial);
 expect(await snapshot(page)).toEqual(t.g);expect(await page.evaluate(()=>(window as any).__c13bWrites)).toEqual([]);
 await expect.poll(async()=>(await activity(page)).completedCycles,{timeout:11000}).toBe(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');const done=await committedTick(page,t.g,accepted.a,accepted.raw,info);
 const writes=await page.evaluate(()=>(window as any).__c13bWrites);expect(writes).toHaveLength(1);expect(writes[0].wall).toBeGreaterThanOrEqual(accepted.a.dueAt);expect(writes[0].committed).toBe(true);expect(writes[0].game).toEqual(done.g);expect(done.a.status).toBe('stopped');
});

test('CEND13-B3 another response is only a readonly signature while pause and explicit continuation preserve the original six-second authority',async({page},info)=>{
 const t=await prepare(page,paidResponseFixture(),{type:'DECIDE',option:'bargain'}),accepted=await start(page,t,info);await page.clock.fastForward(2000);const raw=await database(page);
 await select(page,{type:'DECIDE',option:'decline'});await expect(caption(page)).toHaveText('本次回应已安排');await expect(page.getByTestId('decide-decline').locator('..')).not.toHaveAttribute('data-current-response','true');await expect(page.getByTestId('decide-bargain').locator('..')).toHaveAttribute('data-current-response','true');await expect(page.getByTestId('response-clock')).toHaveText('4 / 6 秒');await expect(page.getByTestId('response-table')).toHaveAttribute('data-engaged','true');expect(await database(page)).toEqual(raw);expect((await activity(page)).plan).toEqual(accepted.a.plan);
 await select(page,t.action);await expect(caption(page)).toHaveText('本次回应已安排');await expect(page.getByTestId('response-clock')).toHaveText('4 / 6 秒');
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');const paused=await mutation(page,t.g,raw,'PAUSE',info);await expect(caption(page)).toHaveText('回应已暂停 · 沿用原安排');await frame(page,info,'B3-paused-original-response');
 await readonly(page,async()=>{await page.getByTestId('story-mode-story').click();await page.getByTestId('story-mode-memory').click();await page.getByTestId('story-mode-choices').click();});await expect(caption(page)).toHaveText('回应已暂停 · 沿用原安排');
 await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activity(page)).generation).toBe(paused.a.generation+1);const resumed=await mutation(page,t.g,paused.raw,'RESUME',info);expect(resumed.a.id).toBe(accepted.a.id);expect(resumed.a.plan).toEqual(accepted.a.plan);await expect(page.getByTestId('response-clock')).toHaveText('6 / 6 秒');await tick(page,{g:t.g,...resumed},info);
});

test('CEND13-B4 a native tick quota and held retry keep the accepted response distinct from a preview and commit only the original full outcome',async({page},info)=>{
 const t=await prepare(page,paidResponseFixture(),{type:'DECIDE',option:'bargain'}),accepted=await start(page,t,info);
 await page.evaluate(()=>{const w=window as any,put=IDBObjectStore.prototype.put;w.__c13bRestore=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-receipts'&&v?.input?.kind==='TICK'){w.__c13bRejected=structuredClone(v.input);w.__c13bRestore();throw new DOMException('CEND13B native quota','QuotaExceededError');}return k===undefined?put.call(this,v):put.call(this,v,k);};});
 await page.clock.fastForward(5999);expect(await database(page)).toEqual(accepted.raw);await page.clock.fastForward(1);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(accepted.raw);await expect(caption(page)).toHaveText('进度待核对 · 请看上方提示');await frame(page,info,'B4-original-response-quota');
 const rejected=await page.evaluate(()=>(window as any).__c13bRejected);await holdWrite(page);
 try{await page.getByTestId('retry').click();await expect(page.getByTestId('save-status')).toHaveText('保存中');await expect(caption(page)).not.toContainText('预选');await expect(caption(page)).not.toContainText('已保存');expect(await page.evaluate(()=>(window as any).__c13bHeldDB)).toEqual(accepted.raw);await frame(page,info,'B4-native-retry-before-atomic-save');}
 finally{await page.evaluate(()=>(window as any).__c13bRelease());}
 await expect.poll(async()=>(await activity(page)).completedCycles).toBe(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');const done=await committedTick(page,t.g,accepted.a,accepted.raw,info);const r=done.raw.rows['full-receipts'].find((x:any)=>x.key===accepted.a.runId+':'+accepted.a.nextCommand.commandId).value;expect(r.input).toEqual(rejected);
});

test('CEND13-B5 a genuinely committed but delayed start reply and another pages generation never create a local borrowed response clock or duplicate reward',async({page,context},info)=>{
 const t=await prepare(page,paidResponseFixture(),{type:'DECIDE',option:'bargain'});await holdStartReply(page);await beginLegacyResponse(page,t.action,true);await expect.poll(()=>page.evaluate(()=>(window as any).__c13bAck.held)).toBe(true);
 await expect(caption(page)).not.toContainText('已安排');await expect(page.getByTestId('response-clock')).toHaveCount(0);const committed=await database(page),a=stored(committed,'activity');expect(a.version).toBe(7);expect(a.status).toBe('running');expect(stored(committed,'current')).toEqual(t.g);
 const peer=await context.newPage();listen(peer);try{
  await peer.goto('/');await expect(peer.getByTestId('save-status')).toHaveText('已保存');await openStory(peer);await select(peer,t.action);await expect(caption(peer)).toHaveText('回应已安排 · 接续见上方');await expect(peer.getByTestId('response-clock')).toHaveCount(0);
  await peer.getByTestId('training-resume').click();await expect.poll(async()=>(await activity(peer)).generation).toBe(a.generation+1);const resumed=await mutation(peer,t.g,committed,'RESUME',info);expect(resumed.a.ownerId).not.toBe(a.ownerId);
  await page.evaluate(()=>(window as any).__c13bAck.release());await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect.poll(async()=>(await activity(page)).generation).toBe(resumed.a.generation);await expect(page.getByTestId('milestone-confirm')).not.toBeVisible();await expect(caption(page)).toHaveText('回应已安排 · 接续见上方');await expect(page.getByTestId('response-clock')).toHaveCount(0);await frame(page,info,'B5-foreign-generation-no-borrowed-local-clock');
  expect(await database(page)).toEqual(resumed.raw);await tick(peer,{g:t.g,...resumed},info);expect(await database(page)).toEqual(await database(peer));await expect(page.getByTestId('response-result')).toHaveCount(0);expect(faults.get(peer)).toEqual([]);
 }finally{await peer.close();}
});

test('CEND13-B6 both real question answers and both endings identify their own accepted action without choosing the next battle or a new life',async({browser},info)=>{
 const f=responseStageFixtures();for(const action of [{type:'ANSWER_TRIAL',answer:'accept'},{type:'ANSWER_TRIAL',answer:'release'},{type:'END',ending:'transmit'},{type:'END',ending:'depart'}]as const){
  const{context,page}=await fresh(browser,info);try{
   const t=await prepare(page,action.type==='END'?f.ending:f.question,action),noun=action.type==='END'?'收卷':'作答';await expect(caption(page)).toContainText('预选');const accepted=await start(page,t,info);expect(accepted.a.cycleMs).toBe(action.type==='END'?12000:6000);await expect(caption(page)).toHaveText('本次'+noun+'已安排');await expect(page.getByTestId('narrative-catalogue').getByTestId('trial-stage-summary')).not.toContainText(/待答|待择/);await frame(page,info,'B6-'+action.type+'-'+Object.values(action)[1]+'-accepted');await readonly(page,async()=>{await page.getByRole('button',{name:'渡劫行程',exact:true}).click();await expect(page.getByTestId('trial-progress')).toContainText(getTrialJourney(t.g)!.title);await page.getByTestId('hub-close').click();});await expect(page.getByTestId('game-hub')).toBeVisible();expect(await database(page)).toEqual(accepted.raw);const done=await tick(page,{g:t.g,...accepted},info);expect(done.a.status).toBe('stopped');expect(done.a.completedCycles).toBe(1);
   if(action.type==='END'){expect(done.g.status).toBe('ascended');expect(done.g.ending).toBe(action.ending);expect(done.g.core.runId).toBe(t.g.core.runId);}else{expect(done.g.trial?.answer).toBe(action.answer);expect(done.g.battle).not.toBeNull();expect(done.g.core.revision).toBe(t.g.core.revision+1);expect(done.a.nextCommand).toBeNull();}
   expect(faults.get(page)).toEqual([]);
  }finally{await context.close();}
 }
});

test('CEND13-B7 failed art and actual keyboard signature viewing retain full readable text the original choices and one visible authorized response',async({page},info)=>{
 let missing=0;await page.route('**/art/**',route=>{missing++;return route.abort();});const g=await load(page,paidResponseFixture()),model=narrativeFor(g)!;await openStory(page);await page.getByTestId('story-mode-story').click();const raw=await database(page);let text='';
 for(let n=0;n<40;n++){
  const p=page.getByTestId('narrative-catalogue').locator('.reading-text p');text+=(await p.textContent())??'';await frame(page,info,'B7-full-reading-'+n);const next=page.getByTestId('narrative-catalogue').getByTestId('catalogue-next');if(await next.isDisabled())break;await next.click();
 }expect(text).toBe(model.body);expect(await database(page)).toEqual(raw);await page.getByTestId('story-mode-choices').click();const choice=model.choices.find(c=>c.id==='decide-bargain')!,peek=page.getByRole('button',{name:'查看'+choice.label+'的代价与结果',exact:true});await peek.focus();await page.keyboard.press('Enter');await expect(page.locator('dialog[open].choice-inspection')).toBeVisible();await page.keyboard.press('Escape');await expect(peek).toBeFocused();expect(await database(page)).toEqual(raw);
 const accepted=await start(page,{g,action:{type:'DECIDE',option:'bargain'},raw},info);await expect(caption(page)).toHaveText('本次回应已安排');expect(missing).toBeGreaterThan(0);await frame(page,info,'B7-paint-fallback-accepted-response');await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');const kept=await database(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await openStory(page);await select(page,{type:'DECIDE',option:'bargain'});await expect(caption(page)).toHaveText('回应已暂停 · 沿用原安排');expect((await activity(page)).plan).toEqual(accepted.a.plan);expect(await database(page)).toEqual(kept);await frame(page,info,'B7-refresh-keeps-original-paused-response');
});
