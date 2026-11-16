import {test,expect,type Page,type Locator,type TestInfo} from '@playwright/test';
import {newGame,resolve,validateGame} from '../../src/full/engine.ts';
import type {Action,Game} from '../../src/full/types.ts';
import {completeActivity} from '../../src/full/activity.ts';
import {previewAction} from '../../src/full/queries.ts';
import * as C from '../../src/full/content.ts';
import {driver,fullRoute} from '../../tests/full-route.mjs';
import {guideCatalog,guidanceFor,type GuideId} from '../src/guidance';
import {formatCosts,formatDelta} from '../src/presentation';
import {useJourneyClock,finishJourneyClock,activitySnapshot as activity} from './support';
import {openSourceSettings,closeSourceSettings} from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(async({page},info)=>{await info.attach('contextual-guide-errors',{body:JSON.stringify(errors.get(page)),contentType:'application/json'});expect(errors.get(page)).toEqual([]);});

/** One native readonly transaction captures the whole Game database, not a projection. */
async function state(page:Page){return page.evaluate(()=>new Promise<{raw:any;game:Game;activity:any}>((accept,reject)=>{
 const request=indexedDB.open('chenyuan-playable-v1');request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,names=[...db.objectStoreNames],tx=db.transaction(names,'readonly'),raw:any={version:db.version,stores:names};
  for(const name of names){raw[name]=[];const cursor=tx.objectStore(name).openCursor();cursor.onsuccess=()=>{if(cursor.result){raw[name].push({key:cursor.result.key,value:cursor.result.value});cursor.result.continue();}};}
  tx.oncomplete=()=>{db.close();accept({raw,game:raw['full-state'].find((r:any)=>r.key==='current')?.value??null,activity:raw['full-state'].find((r:any)=>r.key==='activity')?.value??null});};tx.onabort=()=>{db.close();reject(tx.error);};
 };
}));}
async function unchanged(page:Page,before:Awaited<ReturnType<typeof state>>){const after=await state(page);expect(after.game).toEqual(before.game);expect(after.activity).toEqual(before.activity);expect(after.raw).toEqual(before.raw);}
async function evidence(info:TestInfo,name:string,data:unknown){await info.attach(name,{body:JSON.stringify(data),contentType:'application/json'});}

async function press(control:Locator){
 await expect(control).toBeEnabled();
 const g=await control.evaluate(n=>{const r=n.getBoundingClientRect(),nav=document.getElementById('primary-navigation'),bar=nav?.getBoundingClientRect(),modal=n.closest('dialog[open]'),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=(modal||nav?.contains(n)?innerHeight:bar?.top??innerHeight),hit:!!hit&&(hit===n||n.contains(hit))};});
 expect(g.width).toBeGreaterThanOrEqual(44);expect(g.height).toBeGreaterThanOrEqual(44);expect(g.inside).toBe(true);expect(g.hit).toBe(true);await control.click();
}
async function catalogue(page:Page){
 if(await page.getByTestId('life-panel').isVisible())return;
 await press(page.getByRole('button',{name:'设置',exact:true}));await press(page.getByTestId('settings-life'));await expect(page.getByTestId('life-panel')).toBeVisible();
}
const guideDialog=(page:Page)=>page.getByRole('dialog',{name:'行道指引',exact:true});
async function openGuide(page:Page,id:GuideId){
 if(!await page.getByTestId('guide-open').isVisible())await catalogue(page);await expect.poll(()=>page.evaluate(()=>{const app=document.querySelector<HTMLElement>('.app-shell'),alerts=app?.querySelector<HTMLElement>('.stage-alerts');if(!app?.classList.contains('immersive-stage')||!alerts)return true;const h=alerts.getBoundingClientRect().height,n=parseFloat(app.style.getPropertyValue('--notice-height'));return Number.isFinite(n)&&Math.abs(n-(h?h+8:0))<=.5;})).toBe(true);await press(page.getByTestId('guide-open'));const dialog=guideDialog(page),panel=dialog.getByTestId('gameplay-guide'),entry=guideCatalog.find(g=>g.id===id)!;
 await expect(dialog).toBeVisible();await expect(panel).toHaveAttribute('data-guide',id);await expect(panel.locator('h3')).toHaveText('◇'+entry.title);await expect(panel.locator(':scope>p').first()).toHaveText(entry.hint);return{dialog,panel,entry};
}
async function guideGeometry(page:Page,panel:Locator,info:TestInfo,name:string){
 const g=await panel.evaluate(n=>{const rect=(e:Element)=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},inside=(a:ReturnType<typeof rect>,b:ReturnType<typeof rect>)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5;return{height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,copy:[...n.querySelectorAll<HTMLElement>('h3,p')].map(e=>{const r=rect(e),parents=[];for(let p=e.parentElement;p;p=p.parentElement){const b=rect(p),style=getComputedStyle(p);if(style.display!=='contents'&&b.width&&b.height)parents.push({class:p.className,rect:b,inside:inside(r,b)});if(p.matches('dialog[open]'))break;}return{text:e.textContent,font:parseFloat(getComputedStyle(e).fontSize),rect:r,clip:e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1,parents};})};});
 await evidence(info,name+'-geometry',g);expect(g.height).toBeLessThanOrEqual(900);expect(g.width).toBeLessThanOrEqual(1440);for(const row of g.copy){expect(row.font,row.text??'').toBeGreaterThanOrEqual(18);expect(row.clip,row.text??'').toBe(false);for(const p of row.parents)expect(p.inside,(row.text??'')+' in '+p.class).toBe(true);}
 for(const control of await panel.locator('button').all()){const b=await control.boundingBox();expect(b!.width).toBeGreaterThanOrEqual(44);expect(b!.height).toBeGreaterThanOrEqual(44);}
}
async function manualReread(page:Page,id:GuideId,before:Awaited<ReturnType<typeof state>>){
 await press(page.getByRole('button',{name:'设置',exact:true}));await press(page.getByTestId('gameplay-help-entry'));const help=page.getByRole('dialog',{name:'玩法帮助',exact:true}),pager=help.getByRole('navigation',{name:'帮助主题翻页',exact:true}),entry=guideCatalog.find(g=>g.id===id)!;
 await expect(help.locator('#gameplay-help-title')).toBeFocused();await expect(help.getByTestId('guide-toggle')).toHaveAttribute('aria-pressed','true');
 const chapter=help.locator('.help-chapter');let reached=false;
 for(let i=0;i<guideCatalog.length;i++){if(await chapter.locator('h3').innerText()===entry.title){reached=true;break;}await press(pager.getByTestId('catalogue-next'));}
 expect(reached,'the exact skipped class remains in the readable manual').toBe(true);await expect(chapter.locator('h3')).toHaveText(entry.title);await expect(chapter.locator('p')).toHaveText(entry.body);await expect(help.getByTestId('guide-toggle')).toHaveAttribute('aria-pressed','true');await unchanged(page,before);
 await page.keyboard.press('Escape');await expect(help).toBeHidden();await expect(page.getByRole('button',{name:'设置',exact:true})).toBeFocused();await expect(page.getByTestId('guide-open')).toHaveCount(0);await unchanged(page,before);
}
async function inspectAndSkip(page:Page,id:GuideId,info:TestInfo,name:string,picture=false){
 const before=await state(page),{panel,entry,dialog}=await openGuide(page,id);await unchanged(page,before);
 await expect(panel.getByTestId('guide-detail')).toHaveCount(0);await press(panel.getByTestId('guide-expand'));await expect(panel.getByTestId('guide-expand')).toHaveAttribute('aria-expanded','true');await expect(panel.getByTestId('guide-detail')).toHaveText(entry.body);await guideGeometry(page,panel,info,name);
 if(picture)await page.screenshot({path:info.outputPath(name+'.png')});
 await press(panel.getByTestId('guide-expand'));await expect(panel.getByTestId('guide-detail')).toHaveCount(0);await expect(panel.getByTestId('guide-expand')).toHaveAttribute('aria-expanded','false');await unchanged(page,before);
 await press(panel.getByTestId('guide-skip'));await expect(dialog).toBeHidden();await expect(page.getByTestId('guide-open')).toHaveCount(0);expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog[open]'))).toBe(false);await unchanged(page,before);
 await manualReread(page,id,before);await evidence(info,name+'-read-only',{id,before,after:await state(page)});return before;
}

async function load(page:Page,game:Game){
 validateGame(game);await useJourneyClock(page);await page.goto('/');await expect(page.getByLabel('导入已有存档',{exact:true})).toBeEnabled({timeout:15000});
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'check-matrix-lawful-guide.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});await finishJourneyClock(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const actual=await state(page),expected=structuredClone(game);expect(actual.game.core.runId).not.toBe(game.core.runId);expected.core.runId=actual.game.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=actual.game.core.runId+':'+expected.core.activeEvent.id;
 expect(actual.game).toEqual(expected);expect(actual.activity).toBeNull();await expect(page.locator('.app-shell')).toHaveAttribute('data-font-scale','1');return actual;
}
async function opening(page:Page){
 await useJourneyClock(page);await page.goto('/');await expect(page.getByRole('button',{name:'踏入仙途'})).toBeEnabled({timeout:15000});await page.getByLabel('你的道号',{exact:true}).fill('指引核对客');await press(page.getByRole('button',{name:'踏入仙途'}));await expect(page.getByTestId('action-countdown')).toHaveText('0.6 秒');await page.clock.fastForward(600);await expect(page.getByTestId('save-status')).toHaveText('已保存');const created=await state(page);expect(created.game).toEqual(newGame('指引核对客',created.game.core.runId));expect(created.activity).toBeNull();return created;
}
function advanceFixture(game:Game,action:Action){return resolve(game,{...action,commandId:'guide-fixture-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision}).nextState;}
function cave(){const d=driver('leave','sword');d.go('cave');return d.game;}
function fight(){const d=driver('leave','sword');d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});return d.game;}
let journey:ReturnType<typeof fullRoute>|undefined;
function route(){return journey??=fullRoute('help','sword','craft',true);}
const contexts:{number:number;label:string;id:GuideId;fixture?:()=>Game}[]=[
 {number:1,label:'opening',id:'opening'},
 {number:2,label:'cultivation',id:'cultivation',fixture:cave},
 {number:3,label:'breakthrough',id:'breakthrough',fixture:()=>{const d=driver();d.meditate();return d.game;}},
 {number:4,label:'equipment with qi and no chosen school',id:'equipment',fixture:()=>advanceFixture(driver().checkpoints.mortal,{type:'BREAKTHROUGH'})},
 {number:6,label:'ordinary battle',id:'battle',fixture:fight},
 {number:7,label:'recovery after actual attack and retreat',id:'recovery',fixture:fight},
 {number:8,label:'causality awaiting an actual decision',id:'causality',fixture:()=>{const d=driver();d.go('sect');d.doAction({type:'EVENT',event:'lu_intro'});return d.game;}},
 {number:9,label:'trial preparation',id:'trial',fixture:()=>route().checkpoints.trial},
 {number:10,label:'actually sealed ending',id:'ending',fixture:()=>route().game},
 {number:11,label:'trial battle has battle priority',id:'battle',fixture:()=>advanceFixture(advanceFixture(route().checkpoints.trial,{type:'START_TRIAL'}),{type:'ANSWER_TRIAL',answer:'accept'})},
 {number:12,label:'third gate won but END still undecided has trial priority',id:'trial',fixture:()=>route().checkpoints.ending},
];

async function settle(page:Page,id:string,period:number,kind:string,info:TestInfo){
 const before=await state(page);await press(page.getByTestId(id));await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);expect(a.plan.maxCycles).toBe(1);expect(a.cycleMs).toBe(period);await expect(page.locator('[data-testid=training-activity][data-generation="'+a.generation+'"][data-running=true]')).toBeVisible();await expect(page.getByTestId('training-countdown')).toHaveText((period/1000).toFixed(1)+' 秒');const started=await state(page);expect(started.game).toEqual(before.game);
 await page.clock.fastForward(period-1);await unchanged(page,started);await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');const after=await state(page),formal=resolve(before.game,a.nextCommand),receipts=after.raw['full-receipts'].filter((r:any)=>r.key===a.runId+':'+a.nextCommand.commandId);
 expect(after.game).toEqual(formal.nextState);expect(after.activity.status).toBe('stopped');expect(after.activity.id).toBe(a.id);expect(receipts).toHaveLength(1);expect(receipts[0].value.command).toEqual(a.nextCommand);expect(receipts[0].value.result).toEqual(formal.result);expect(receipts[0].value.activity).toEqual(after.activity);expect(after.activity).toEqual(completeActivity(after.game,a,formal.result,{commandId:a.nextCommand.commandId,now:receipts[0].value.proof?.resolvedAt??a.dueAt}));
 expect(['SOURCE','TRAVEL','BATTLE']).toContain(a.nextCommand.type);const receiptKey=a.runId+':'+a.nextCommand.commandId;
 expect(after.raw.version).toBe(started.raw.version);expect(after.raw.stores).toEqual(started.raw.stores);expect(started.raw['full-receipts'].some((r:any)=>r.key===receiptKey)).toBe(false);expect(after.raw['full-receipts']).toHaveLength(started.raw['full-receipts'].length+1);expect(after.raw['full-receipts'].filter((r:any)=>r.key!==receiptKey)).toEqual(started.raw['full-receipts']);
 const changedStateKeys=['current','previous','activity'];expect(after.raw['full-state'].filter((r:any)=>!changedStateKeys.includes(r.key))).toEqual(started.raw['full-state'].filter((r:any)=>!changedStateKeys.includes(r.key)));for(const key of changedStateKeys)expect(after.raw['full-state'].filter((r:any)=>r.key===key)).toHaveLength(1);expect(after.raw['full-state'].find((r:any)=>r.key==='previous').value).toEqual(before.game);
 for(const key of ['checkpoint','checkpoint-owner'])expect(after.raw['full-state'].filter((r:any)=>r.key===key)).toEqual(started.raw['full-state'].filter((r:any)=>r.key===key));expect(after.activity.ownerId).toBe(a.ownerId);expect(after.activity.generation).toBe(a.generation);for(const name of started.raw.stores)if(name!=='full-state'&&name!=='full-receipts')expect(after.raw[name]).toEqual(started.raw[name]);
 if(a.version===6){expect(receipts[0].value.proof.activityBefore).toEqual(a);expect(receipts[0].value.proof.stateAfter).toEqual(after.game);expect(receipts[0].value.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);}
 await evidence(info,kind+'-formal-period',{before,started,a,after,formal,receipt:receipts[0]});return{after,a,result:formal.result};
}
for(const context of contexts)test('CHECK-G'+context.number+' '+context.label+' keeps exact contextual identity and single-class skip through manual rereading and refresh without changing Game',async({page},info)=>{
 let baseline=context.fixture?await load(page,context.fixture()):await opening(page);
 if(context.number===7){await press(page.getByTestId('battle-manual-takeover'));expect(previewAction(baseline.game,{type:'BATTLE',move:'attack'}).allowed).toBe(true);const attacked=await settle(page,'attack',3000,'recovery-attack',info);expect(previewAction(attacked.after.game,{type:'BATTLE',move:'flee'}).allowed).toBe(true);await settle(page,'flee',3000,'recovery-retreat',info);baseline=await state(page);expect(baseline.game.core.world.location).toBe('cave');expect(baseline.game.battle).toBeNull();}
 if(context.number===4){expect(baseline.game.core.player.realm).toBe('qi');expect(baseline.game.school).toBeNull();}
 if(context.number===11){expect(baseline.game.trial).not.toBeNull();expect(baseline.game.battle).not.toBeNull();}
 if(context.number===12){expect(baseline.game.status).toBe('active');expect(baseline.game.trial!.stage).toBe(4);expect(baseline.game.battle).toBeNull();}
 expect(guidanceFor(baseline.game).id).toBe(context.id);await inspectAndSkip(page,context.id,info,'guide-'+context.number,context.number===1);await unchanged(page,baseline);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存',{timeout:15000});await unchanged(page,baseline);const {dialog,panel}=await openGuide(page,context.id);await expect(panel.getByTestId('guide-expand')).toHaveAttribute('aria-expanded','false');await press(dialog.getByRole('button',{name:'关闭行道指引',exact:true}));await unchanged(page,baseline);
});

async function source(page:Page,info:TestInfo,label:string){
 expect(previewAction((await state(page)).game,{type:'SOURCE',sourceId:'herbs',count:1}).allowed).toBe(true);await press(page.getByTestId('tab-1'));await press(page.getByTestId('explore-mode-source'));await press(page.getByTestId('source-library-open'));await press(page.getByTestId('source-herbs'));await openSourceSettings(page);await page.getByLabel('取材次数',{exact:true}).selectOption('1');await closeSourceSettings(page);const result=await settle(page,'source-start',30000,label,info);expect(result.a.plan).toMatchObject({kind:'source',sourceId:'herbs',maxCycles:1,until:'cycles',monthBudget:1});expect(result.result.costs.months).toBe(1);expect(guidanceFor(result.after.game,result.result).id).toBe('materials');return result;
}
async function travel(page:Page,location:'cave'|'wilderness',info:TestInfo){
 expect(previewAction((await state(page)).game,{type:'TRAVEL',location}).allowed).toBe(true);await press(page.getByTestId('tab-1'));await press(page.getByTestId('explore-mode-travel'));await press(page.getByTestId('travel-'+location));const result=await settle(page,'adventure-start',6000,'explicit-travel-'+location,info);expect(result.a.plan).toEqual({kind:'travel',location,maxCycles:1});expect(result.after.game.core.world.location).toBe(location);return result;
}
test('CHECK-G5 actual finite SOURCE results suppress only materials and refreshing or reading its old receipt never fabricates a new contextual outcome',async({page},info)=>{
 const d=driver();d.go('wilderness');await load(page,d.game);const first=await source(page,info,'first-materials');await inspectAndSkip(page,'materials',info,'guide-materials',true);await unchanged(page,first.after);
 const arrived=await travel(page,'cave',info),other=await openGuide(page,'cultivation');await press(other.dialog.getByRole('button',{name:'关闭行道指引',exact:true}));await unchanged(page,arrived.after);
 await travel(page,'wilderness',info);const second=await source(page,info,'second-materials-still-skipped');await catalogue(page);await expect(page.getByTestId('guide-open')).toHaveCount(0);await unchanged(page,second.after);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存',{timeout:15000});await unchanged(page,second.after);await press(page.getByTestId('hub-receipt'));await expect(page.getByTestId('activity-history')).toBeVisible();const historyRow=page.getByTestId('activity-history-row');await expect(historyRow).toHaveCount(1);await expect(historyRow).toHaveAttribute('data-command-id',second.a.nextCommand.commandId);await expect(historyRow.locator('h3')).toHaveText('第 1 次 · '+C.sources.herbs.name);await expect(historyRow.locator('.history-note')).toHaveText('单周期 30 秒 · 已执行 1 / 1 次');await expect(historyRow.getByTestId('activity-history-costs')).toHaveText(formatCosts(second.result.costs));await expect(historyRow.getByTestId('activity-history-delta')).toHaveText(formatDelta(second.result.delta));const oldReceipt=await openGuide(page,'cultivation');await expect(oldReceipt.panel).not.toHaveAttribute('data-guide','materials');await press(oldReceipt.dialog.getByRole('button',{name:'关闭行道指引',exact:true}));await unchanged(page,second.after);
 const third=await source(page,info,'new-materials-after-refresh');expect(third.a.id).not.toBe(second.a.id);expect(third.a.nextCommand.commandId).not.toBe(second.a.nextCommand.commandId);const shown=await openGuide(page,'materials');await expect(shown.panel).toHaveAttribute('data-guide','materials');await press(shown.dialog.getByRole('button',{name:'关闭行道指引',exact:true}));await unchanged(page,third.after);
});
