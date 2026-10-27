import {selectAlchemyRecipe} from './stage-support';
import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver,fullRoute} from '../../tests/full-route.mjs';
import type {Game,Move} from '../../src/full/types.ts';
import {resolve,validateGame} from '../../src/full/engine.ts';
import {previewAction} from '../../src/full/queries.ts';
import {completeActivity} from '../../src/full/activity.ts';
import {formatCosts} from '../src/presentation';
import {snapshot,activitySnapshot as activity,useJourneyClock,finishJourneyClock,openHubFeature,revealStoryChoice} from './support';
import {openProductionIntent,closeProductionSettings,openSourceSettings,closeSourceSettings} from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',error=>rows.push(error.message));});
test.afterEach(async({page},info)=>{
 await page.evaluate(()=>{const w=window as any;w.__m03CancelRestorePut?.();});
 await info.attach('m03-page-errors',{body:JSON.stringify(errors.get(page)),contentType:'application/json'});
 expect(errors.get(page)).toEqual([]);
});

// Same native readonly all-store record shape used by the existing object/cross-art suites.
async function database(page:Page){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{
 const request=indexedDB.open('chenyuan-playable-v1');request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};
  for(const name of db.objectStoreNames){rows[name]=[];const cursor=tx.objectStore(name).openCursor();cursor.onsuccess=()=>{if(cursor.result){rows[name].push({key:cursor.result.key,value:cursor.result.value});cursor.result.continue();}};}
  tx.oncomplete=()=>{db.close();resolve({version:db.version,rows});};tx.onabort=()=>{db.close();reject(tx.error);};
 };
}));}
async function load(page:Page,game:Game){
 validateGame(game);await page.emulateMedia({reducedMotion:'no-preference'});await useJourneyClock(page);await page.goto('/');
 await expect(page.getByLabel('导入已有存档',{exact:true})).toBeEnabled({timeout:15000});
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-m03-boundary.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});
 await finishJourneyClock(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');return snapshot(page) as Promise<Game>;
}
async function record(page:Page,info:TestInfo,name:string,payload:unknown){
 await info.attach(name,{body:JSON.stringify(payload),contentType:'application/json'});
 // The existing notice ResizeObserver owns this layout handshake; do not advance the game clock or poll a hit test.
 await expect.poll(()=>page.evaluate(()=>{const app=document.querySelector<HTMLElement>('.app-shell'),alerts=app?.querySelector<HTMLElement>('.stage-alerts');if(!app?.classList.contains('immersive-stage')||!alerts)return true;const h=alerts.getBoundingClientRect().height,n=parseFloat(app.style.getPropertyValue('--notice-height'));return Number.isFinite(n)&&Math.abs(n-(h?h+8:0))<=.5;}),{timeout:8000}).toBe(true);
 const geometry=await page.evaluate(()=>{
  const visible=(n:Element)=>{if(!n.getClientRects().length||getComputedStyle(n).visibility==='hidden')return false;for(let p=n.parentElement;p;p=p.parentElement)if(p instanceof HTMLDetailsElement&&!p.open&&!p.querySelector(':scope>summary')?.contains(n))return false;return true;};
  const rect=(n:Element)=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const inside=(a:ReturnType<typeof rect>,b:ReturnType<typeof rect>)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5;
  const modal=document.querySelector('dialog[open]'),nav=document.getElementById('primary-navigation'),navRect=nav&&rect(nav),limit=navRect?.top??innerHeight;
  const parents=(n:Element)=>{const r=rect(n),rows=[];for(let p=n.parentElement;p;p=p.parentElement){const style=getComputedStyle(p),box=rect(p),visualOnlyExpansion=n.matches('button.progress-inspect')&&!!n.closest('[data-testid=battle-presence]')&&p.matches('.progress-track,.battle-player');if(style.display!=='contents'&&box.width>0&&box.height>0)rows.push({id:p.getAttribute('data-testid')??p.id,class:p.className,rect:box,inside:inside(r,box),overflow:style.overflow,overflowX:style.overflowX,overflowY:style.overflowY,visualOnlyExpansion});if(p.matches('dialog[open]'))break;}return rows;};
  const controls=[...document.querySelectorAll<HTMLElement>(modal?'dialog[open] button,dialog[open] input:not([type=checkbox]):not([type=radio]),dialog[open] select':'main button,main summary,main input[type=number],main select,#primary-navigation button,.error-banner button')].filter(visible).map(n=>{
   const r=rect(n),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2),navigation=!!nav?.contains(n),status=n.closest('.battle-own-status,.enemy-status');
   return{id:n.getAttribute('data-testid')??n.getAttribute('aria-label')??n.textContent,rect:r,text:n.textContent,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=(modal||navigation?innerHeight:limit),navigationOverlap:!modal&&!navigation&&!!navRect&&r.left<navRect.right&&r.right>navRect.left&&r.top<navRect.bottom&&r.bottom>navRect.top,disabled:n.matches(':disabled'),hit:n.matches(':disabled')||!!hit&&(hit===n||n.contains(hit)),interceptor:hit?{id:hit.getAttribute('data-testid')??hit.id,class:hit.className}:null,clip:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1,progressInspect:n.matches('button.progress-inspect'),battleProgress:n.matches('button.progress-inspect')&&!!n.closest('[data-testid=battle-presence]'),status:status?{class:status.className,rect:rect(status),inside:inside(r,rect(status))}:null,parents:parents(n)};
  });
  const progressTargets=controls.filter(n=>n.progressInspect),progressPairs=progressTargets.flatMap((a,i)=>progressTargets.slice(i+1).map(b=>({first:a.id,second:b.id,firstRect:a.rect,secondRect:b.rect,overlap:a.rect.left<b.rect.right&&a.rect.right>b.rect.left&&a.rect.top<b.rect.bottom&&a.rect.bottom>b.rect.top})));
  const copy=(modal?[]:[...document.querySelectorAll<HTMLElement>('.battle-deck strong,.battle-deck small,.alchemy-product-tray>p,.adventure-object-details p,main small')]).filter(visible).map(n=>{
   const r=rect(n),range=document.createRange();range.selectNodeContents(n);const lines=[...range.getClientRects()].map(a=>({left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height}));
   const measured={text:n.textContent,rect:r,font:parseFloat(getComputedStyle(n).fontSize),minimum:n.matches('small')?14:18,clip:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1,linesInside:lines.every(line=>inside(line,r)),parents:parents(n)};
   const button=n.matches('small')&&n.closest('[data-testid=cultivation-site]')?n.closest<HTMLButtonElement>('button[data-testid^=cultivation-method-]'):null;
   if(!button)return{...measured,methodSmall:null};
   const style=getComputedStyle(n),buttonStyle=getComputedStyle(button),box=rect(button),safe={left:box.left+parseFloat(buttonStyle.borderLeftWidth),right:box.right-parseFloat(buttonStyle.borderRightWidth),top:box.top+parseFloat(buttonStyle.borderTopWidth),bottom:box.bottom-parseFloat(buttonStyle.borderBottomWidth),width:button.clientWidth,height:button.clientHeight};
   const strongText=[...button.querySelectorAll('strong')].flatMap(strong=>{const text=document.createRange();text.selectNodeContents(strong);return[...text.getClientRects()].map(a=>({left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height}));});
   const methodSmall={button:button.getAttribute('data-testid'),buttonRect:box,safeArea:safe,overflowX:style.overflowX,overflowY:style.overflowY,linesInButton:lines.every(line=>inside(line,safe)),strongText,overlapsStrong:lines.some(a=>strongText.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)),clipAncestors:measured.parents.filter(p=>p.overflowX!=='visible'||p.overflowY!=='visible').map(p=>({...p,linesInside:lines.every(line=>inside(line,p.rect))}))};
   return{...measured,ownLinebox:r,ownLinesInside:measured.linesInside,rawRangeRects:lines,methodSmall};
  });
  return{height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,modal:!!modal,nav:navRect,controls,progressPairs,copy};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(geometry),contentType:'application/json'});
 await page.screenshot({path:info.outputPath(name+'.png')});
 expect(geometry.height).toBeLessThanOrEqual(900);expect(geometry.width).toBeLessThanOrEqual(1440);
 for(const control of geometry.controls){expect(control.rect.height,control.id??'').toBeGreaterThanOrEqual(44);expect(control.rect.width,control.id??'').toBeGreaterThanOrEqual(44);expect(control.inside,control.id??'').toBe(true);expect(control.navigationOverlap,control.id??'').toBe(false);expect(control.hit,control.id??'').toBe(true);expect(control.clip,control.id??'').toBe(false);if(control.battleProgress){expect(control.status,control.id??'').not.toBeNull();expect(control.status?.inside,(control.id??'')+' in real battle status').toBe(true);}for(const parent of control.parents){if(parent.visualOnlyExpansion){expect(parent.overflowX,(control.id??'')+' expanded visual parent '+parent.class).toBe('visible');expect(parent.overflowY,(control.id??'')+' expanded visual parent '+parent.class).toBe('visible');}else expect(parent.inside,(control.id??'')+' in '+parent.class).toBe(true);}}
 for(const pair of geometry.progressPairs)expect(pair.overlap,pair.first+' overlaps '+pair.second).toBe(false);
 for(const copy of geometry.copy){expect(copy.font,copy.text??'').toBeGreaterThanOrEqual(copy.minimum);expect(copy.clip,copy.text??'').toBe(false);if(copy.methodSmall){const method=copy.methodSmall;expect(method.overflowX,copy.text??'').toBe('visible');expect(method.overflowY,copy.text??'').toBe('visible');expect(method.linesInButton,(copy.text??'')+' in '+method.button).toBe(true);expect(method.strongText.length,method.button??'').toBeGreaterThan(0);expect(method.overlapsStrong,(copy.text??'')+' overlaps strong').toBe(false);for(const parent of method.clipAncestors)expect(parent.linesInside,(copy.text??'')+' glyphs in clipping '+parent.class).toBe(true);}else expect(copy.linesInside,copy.text??'').toBe(true);for(const parent of copy.parents)expect(parent.inside,(copy.text??'')+' in '+parent.class).toBe(true);}
}
async function memoryGame(page:Page){
 await page.getByRole('button',{name:'设置',exact:true}).click();const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'导出当前进度',exact:true}).click();const stream=await(await download).createReadStream(),chunks:Buffer[]=[];
 for await(const chunk of stream!)chunks.push(chunk);await page.getByRole('button',{name:'关闭设置',exact:true}).click();return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function quota(page:Page,kind:'configuration'|'tick'|'restore'){
 await page.evaluate(kind=>{
  const w=window as any,put=IDBObjectStore.prototype.put;w.__m03CancelPutHits=[];
  w.__m03CancelRestorePut=()=>{IDBObjectStore.prototype.put=put;};
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
   const matches=kind==='configuration'?value?.format==='chenyuan-configuration-receipt':kind==='tick'?value?.input?.kind==='TICK':value?.format==='chenyuan-control-receipt'&&value.kind==='RESTORE';
   if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-receipts'&&matches){
    w.__m03CancelRejected={db:this.transaction.db.name,store:this.name,key,value:structuredClone(value)};w.__m03CancelPutHits.push(structuredClone(w.__m03CancelRejected));
    w.__m03CancelRestorePut();throw new DOMException('M03 original intent quota','QuotaExceededError');
   }
   return put.call(this,value,key!);
  };
 },kind);
}
async function rejected(page:Page){
 const rows=await page.evaluate(()=>(window as any).__m03CancelPutHits);expect(rows).toHaveLength(1);return rows[0];
}
async function begin(page:Page,id:string){
 await page.getByTestId(id).click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');
 const a=await activity(page);await expect(page.locator('[data-testid=training-activity][data-generation="'+a.generation+'"][data-running=true]')).toBeVisible();
 await expect(page.getByTestId('training-countdown')).toHaveText((a.cycleMs/1000).toFixed(1)+' 秒');return a;
}
async function settle(page:Page,a:any,before:Game,info:TestInfo,label:string){
 const started=await database(page);await page.clock.fastForward(a.cycleMs-1);
 expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(started);
 await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(1);
 await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const raw=await database(page),after=await snapshot(page),done=await activity(page),expected=resolve(before,a.nextCommand);
 const receipts=raw.rows['full-receipts'].filter((row:any)=>row.key===a.runId+':'+a.nextCommand.commandId);expect(receipts).toHaveLength(1);
 const receipt=receipts[0].value;expect(receipt.command).toEqual(a.nextCommand);expect(receipt.result).toEqual(expected.result);expect(after).toEqual(expected.nextState);
 expect(done.status).toBe('stopped');expect(done.completedCycles).toBe(1);expect(receipt.activity).toEqual(done);
 if(a.version>=5){expect(receipt.proof.activityBefore).toEqual(a);expect(receipt.proof.stateAfter).toEqual(after);expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);expect(done).toEqual(completeActivity(after,a,expected.result,{commandId:a.nextCommand.commandId,now:receipt.proof.resolvedAt}));}
 await info.attach(label+'-complete-game-and-native-records',{body:JSON.stringify({before,activity:a,started,after,done,raw,receipt,expected}),contentType:'application/json'});
 return {after,done,raw,receipt,expected};
}
async function freshStart(page:Page,id:string,before:Game,originalCommand:string,info:TestInfo,label:string){
 const previous=await activity(page);await expect(page.getByTestId(id)).toBeEnabled();const a=await begin(page,id),raw=await database(page);
 const starts=raw.rows['full-receipts'].filter((r:any)=>r.value.input?.kind==='START'&&r.value.activity.id===a.id);expect(starts).toHaveLength(1);
 const mutation=starts[0].value.input.mutation;expect(mutation.commandId).not.toBe(originalCommand);expect(mutation.runId).toBe(before.core.runId);expect(mutation.expectedRevision).toBe(before.core.revision);
 expect(mutation.expectedActivityId).toBe(previous?.id??null);expect(mutation.expectedActivityRevision).toBe(previous?.revision??null);expect(await snapshot(page)).toEqual(before);
 return settle(page,a,before,info,label);
}
function idleFixture(kind:'craft'|'source'|'encounter'){
 const d=driver('leave','sword');d.funds(400);d.resource('herb',6);d.go(kind==='craft'?'cave':'wilderness');return structuredClone(d.game) as Game;
}
async function target(page:Page,kind:'craft'|'source'|'encounter'){
 if(kind==='craft'){
  await openHubFeature(page,'forge');await selectAlchemyRecipe(page,'healing');await openProductionIntent(page);await page.getByLabel('炼丹炉次',{exact:true}).selectOption('1');await closeProductionSettings(page);return 'production-start';
 }
 await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-'+(kind==='source'?'source':'battle')).click();
 if(kind==='source'){await page.getByTestId('source-herbs').click();await openSourceSettings(page);await page.getByLabel('取材次数',{exact:true}).selectOption('1');await closeSourceSettings(page);return 'source-start';}
 await page.getByTestId('encounter-wolf').click();await page.getByTestId('adventure-page-limits').click();await page.getByLabel('历练总动作上限').fill('1');await page.getByTestId('adventure-page-object').click();return 'adventure-start';
}
async function failedConfiguration(page:Page,before:Game,info:TestInfo,label:string){
 expect(previewAction(before,{type:'SCHOOL',school:'talisman'}).allowed).toBe(true);
 await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-school').click();await page.getByTestId('school-talisman').click();
 await expect(page.getByTestId('configuration-dialog')).toBeVisible();const raw=await database(page);await quota(page,'configuration');await page.getByTestId('configuration-confirm').click();
 await expect(page.getByTestId('configuration-retry')).toBeVisible();await expect(page.getByTestId('error')).toContainText('存储空间不足');
 expect(await page.getByTestId('configuration-dialog').evaluate(el=>el.matches(':modal'))).toBe(true);
 expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);const rejectedRow=await rejected(page);
 await record(page,info,label+'-original-pending-modal',{before,raw,rejectedRow});
 // The original modal owns input; do not force another page through it to manufacture a gate failure.
 await page.getByTestId('configuration-cancel').click();await expect(page.getByTestId('configuration-dialog')).toHaveCount(0);
 await expect(page.getByTestId('retry')).toHaveCount(0);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(raw);
 return rejectedRow;
}
for(const kind of ['craft','source','encounter'] as const)test('M03-CANCEL '+kind+' keeps its original native failed confirmation until explicit cancel then accepts one fresh legal plan',async({page},info)=>{
 const before=await load(page,idleFixture(kind));
 const action=kind==='craft'?{type:'CRAFT' as const,recipeId:'healing'}:kind==='source'?{type:'SOURCE' as const,sourceId:'herbs',count:1}:{type:'ENCOUNTER' as const,enemy:'wolf'};
 expect(previewAction(before,action).allowed).toBe(true);const old=await failedConfiguration(page,before,info,kind),id=await target(page,kind);
 await record(page,info,kind+'-cancelled-history-error-fresh-entrance',{before,old,raw:await database(page),error:await page.getByTestId('error').innerText()});
 const done=await freshStart(page,id,before,old.value.intent.command.commandId,info,kind+'-fresh');expect(done.raw.rows['full-receipts'].find((r:any)=>r.key===old.key)).toBeUndefined();
 expect(done.after.school).toBe(before.school);expect(done.after.loadout).toEqual(before.loadout);expect(await memoryGame(page)).toEqual(done.after);const stable=done.raw;await page.clock.fastForward(120000);expect(await database(page)).toEqual(stable);expect(await snapshot(page)).toEqual(done.after);
});

test('M03-PENDING a real source cycle quota keeps new work blocked without a modal and retries only the original command',async({page},info)=>{
 const before=await load(page,idleFixture('source'));await target(page,'source');const a=await begin(page,'source-start'),raw=await database(page);await quota(page,'tick');await page.clock.fastForward(a.cycleMs);
 await expect(page.getByTestId('training-retry')).toBeVisible();const hit=await rejected(page);expect(hit.key).toBe(a.runId+':'+a.nextCommand.commandId);expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
 await expect(page.getByTestId('source-start')).toBeDisabled();await page.getByTestId('explore-mode-battle').click();await page.getByTestId('encounter-wolf').click();await expect(page.getByTestId('adventure-start')).toBeDisabled();
 await record(page,info,'pending-source-blocks-new-encounter',{before,a,raw,hit});await page.getByTestId('training-retry').click();await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(1);
 await expect(page.getByTestId('save-status')).toHaveText('已保存');const done=await snapshot(page),after=await database(page),rows=after.rows['full-receipts'].filter((r:any)=>r.key===hit.key);
 expect(done).toEqual(resolve(before,a.nextCommand).nextState);expect(rows).toHaveLength(1);expect(rows[0].value.command).toEqual(a.nextCommand);expect((await activity(page)).plan).toEqual(a.plan);expect(await memoryGame(page)).toEqual(done);
 await page.clock.fastForward(120000);expect(await snapshot(page)).toEqual(done);expect(await database(page)).toEqual(after);
});

async function trialBattle(page:Page,info:TestInfo){
 let before=await load(page,fullRoute('help').checkpoints.trial);expect(previewAction(before,{type:'START_TRIAL'}).allowed).toBe(true);
 await page.getByTestId('breakthrough').click();await page.getByTestId('trial-review-entry').click();await expect(page.getByTestId('trial-entry-confirmation')).toBeVisible();
 const entry=await begin(page,'trial-confirm-entry');before=(await settle(page,entry,before,info,'battle-cancel-entry')).after;
 await revealStoryChoice(page,'answer-accept');await page.getByTestId('answer-accept').click();await expect(page.getByTestId('milestone-review')).toBeVisible();
 const answer=await begin(page,'milestone-confirm');before=(await settle(page,answer,before,info,'battle-cancel-answer')).after;
 await page.getByTestId('tab-0').click();await page.getByTestId('battle-manual-takeover').click();await expect(page.getByTestId('battle-deck')).toBeVisible();return before;
}
test('M03-CANCEL a lawful battle restore confirmation can fail and be cancelled while a new manual turn keeps the current battle and checkpoint',async({page},info)=>{
 const before=await trialBattle(page,info);expect(previewAction(before,{type:'BATTLE',move:'guard'}).allowed).toBe(true);const original=await database(page),checkpoint=original.rows['full-state'].find((r:any)=>r.key==='checkpoint');expect(checkpoint).toBeTruthy();
 await page.getByTestId('battle-recent').click();await page.getByTestId('trial-mode-checkpoint').click();await page.getByTestId('trial-restore-open').click();await expect(page.getByTestId('trial-restore-confirmation')).toBeVisible();
 await quota(page,'restore');await page.getByTestId('trial-restore-confirm').click();await expect(page.getByTestId('action-execution')).toBeVisible();await expect(page.getByTestId('action-countdown')).toHaveText('0.6 秒');await expect(page.getByTestId('action-execution').getByRole('progressbar')).toHaveAttribute('max','600');
 await page.clock.fastForward(600);await expect(page.getByTestId('trial-restore-retry')).toBeVisible();const old=await rejected(page);
 expect(await database(page)).toEqual(original);expect(await snapshot(page)).toEqual(before);expect(await page.getByTestId('trial-restore-confirmation').evaluate(el=>el.matches(':modal'))).toBe(true);
 // The retained main battle is hidden by the read surface/modal; inspect disabled only, never force a click.
 await expect(page.getByTestId('guard')).toBeDisabled();await record(page,info,'battle-original-restore-pending',{before,original,old});
 await page.getByTestId('trial-restore-cancel').click();await expect(page.getByTestId('trial-restore-confirmation')).toBeHidden();await expect(page.getByTestId('retry')).toHaveCount(0);
 await page.getByTestId('tab-0').click();await page.getByTestId('battle-manual-takeover').click();await expect(page.getByTestId('error')).toContainText('存储空间不足');
 await record(page,info,'battle-cancelled-history-error-fresh-turn',{before,old,raw:await database(page)});
 const done=await freshStart(page,'guard',before,old.value.mutation.commandId,info,'battle-cancel-fresh');expect(done.raw.rows['full-state'].find((r:any)=>r.key==='checkpoint')).toEqual(checkpoint);expect(done.raw.rows['full-receipts'].find((r:any)=>r.key===old.key)).toBeUndefined();expect(await memoryGame(page)).toEqual(done.after);
});

function battleFixture(move:Move):Game{
 const d=driver('leave','sword');d.funds(200);d.buy('healing_pill',3);d.buy('spirit_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});
 if(move==='release'||move==='heal'||move==='restore')d.doAction({type:'BATTLE',move:'technique'});
 if(move==='heal'||move==='restore')d.doAction({type:'BATTLE',move:'guard'});
 return structuredClone(d.game) as Game;
}
const battleButton:Record<Move,string>={attack:'attack',guard:'guard',technique:'technique',release:'release',heal:'battle-heal',restore:'battle-restore',flee:'flee'};
for(const move of ['attack','guard','technique','release','heal','restore','flee'] as const)test('M03-MOVE '+move+' exposes its formal cost and saves exactly one three-second selected turn with current actors and no history replay',async({page},info)=>{
 const before=await load(page,battleFixture(move)),action={type:'BATTLE' as const,move},preview=previewAction(before,action);expect(preview.allowed).toBe(true);
 await expect(page.getByTestId('battle-presence')).toBeVisible();await expect(page.getByTestId('battle-player')).toContainText(before.core.player.name);await expect(page.getByTestId('battle-stage')).toHaveAttribute('data-enemy',before.battle!.enemy);
 const opposed=await page.getByTestId('battle-presence').evaluate(n=>{const own=n.querySelector('.battle-player-art')!.getBoundingClientRect(),enemy=n.querySelector('.enemy-art')!.getBoundingClientRect();return{own:(own.left+own.right)/2,enemy:(enemy.left+enemy.right)/2};});expect(opposed.own).toBeLessThan(opposed.enemy);
 await page.getByTestId('battle-manual-takeover').click();const button=page.getByTestId('battle-deck').getByTestId(battleButton[move]);await expect(button).toBeEnabled();
 // Soft text failures still collect the actual legal turn; no timing, Game or save assertion is softened.
 expect.soft(await button.innerText()).toContain('3 秒');
 if(move==='heal'||move==='restore'){const item=move==='heal'?'healing_pill':'spirit_pill';expect(preview.costs!.items).toEqual({[item]:1});expect.soft(await button.innerText()).toContain(formatCosts(preview.costs));}
 else if(move==='flee'){expect.soft(await button.innerText()).toContain('气血 -8');expect.soft(await button.innerText()).toContain('最低1');expect.soft(await button.innerText()).toContain('无掉落');}
 else expect(await button.innerText()).toContain(formatCosts(preview.costs));
 await record(page,info,'move-'+move+'-cost-and-actors',{before,preview,opposed,button:await button.innerText(),raw:await database(page)});
 const a=await begin(page,battleButton[move]);expect(a.plan).toMatchObject({kind:'battle',mode:'single',move,maxCycles:1});expect(a.cycleMs).toBe(3000);
 await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state','charging');await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-move',move);
 const done=await settle(page,a,before,info,'move-'+move),receiptKey=JSON.stringify([a.runId,a.nextCommand.commandId]);
 await expect.poll(async()=>{await page.clock.runFor(16);return await page.locator('[data-testid=action-motion],[data-testid=hub-pulse]').evaluateAll((nodes,key)=>nodes.some(n=>n.getAttribute('data-operation')==='BATTLE'&&n.getAttribute('data-receipt')===key),receiptKey);}).toBe(true);
 if(done.after.battle){await expect(page.getByTestId('battle-stage')).toHaveAttribute('data-enemy',done.after.battle.enemy);await expect(page.getByTestId('enemy-hp')).toContainText(String(done.after.battle.hp));}
 else{await expect(page.getByTestId('battle-presence')).toHaveCount(0);if(move==='flee'){expect(done.after.core.world.location).toBe('cave');expect(done.after.wins).toBe(before.wins);expect(done.after.core.inventory).toEqual(before.core.inventory);}}
 await expect(page.getByTestId('training-summary')).toContainText('已完成 1 / 1');await record(page,info,'move-'+move+'-saved-feedback',{before,a,...done,receiptKey});expect(await memoryGame(page)).toEqual(done.after);
 const stable=await database(page);await page.getByTestId('hub-receipt').click();await expect(page.getByTestId('adventure-history')).toBeVisible();expect(await snapshot(page)).toEqual(done.after);expect(await database(page)).toEqual(stable);
 await page.getByTestId('tab-0').click();await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('hub-pulse')).toHaveCount(0);await expect(page.locator('.actor-impact,.actor-arrival')).toHaveCount(0);
 await page.clock.fastForward(120000);expect(await snapshot(page)).toEqual(done.after);expect(await database(page)).toEqual(stable);
});
