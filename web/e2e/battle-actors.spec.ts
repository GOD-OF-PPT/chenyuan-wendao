import {test,expect,type Page,type TestInfo} from '@playwright/test';
import type {Game,Move} from '../../src/full/types.ts';
import {driver} from '../../tests/full-route.mjs';
import {intent,resolve,validateGame} from '../../src/full/engine.ts';
import {completeActivity,previewActivity} from '../../src/full/activity.ts';
import {defaultBattlePlan} from '../../src/full/adventure.ts';
import {validateActivityReceipt} from '../src/activity-persistence';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {previewAction} from '../../src/full/queries.ts';
import {formatCosts} from '../src/presentation';
import {snapshot,activitySnapshot as activity,useJourneyClock} from './support';

// 0033: existing desktop only. Imports are lawful fixtures, not normal-route or balance proof.
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const moveButtons:Record<Move,string>={attack:'attack',guard:'guard',technique:'technique',release:'release',heal:'battle-heal',restore:'battle-restore',flee:'flee'};
const diagnostics=new WeakMap<Page,{errors:string[];console:unknown[]}>();
function listen(page:Page){if(diagnostics.has(page))return;
 const rows={errors:[] as string[],console:[] as unknown[]};diagnostics.set(page,rows);
 page.on('pageerror',e=>rows.errors.push(e.message));page.on('console',e=>{if(e.type()==='error'||e.type()==='warning')rows.console.push({type:e.type(),text:e.text()});});
}
test.beforeEach(async({page})=>listen(page));
test.afterEach(async({context},info)=>{
 for(const [index,page] of context.pages().entries())if(!page.isClosed()){
  const responses=await page.evaluate(()=>(window as any).__ta07EnemyResponses??null);if(responses)await info.attach('ta07-native-enemy-observations',{body:JSON.stringify(responses),contentType:'application/json'});
  await page.evaluate(()=>{const w=window as any;w.__ta07ReleaseWrite?.();w.__ta07RestorePut?.();w.__ta07Observer?.disconnect();w.__ta07EnemyObserver?.disconnect();});
  await info.attach('ta07-browser-diagnostics-'+index,{body:JSON.stringify(diagnostics.get(page)),contentType:'application/json'});
  expect(diagnostics.get(page)?.errors??[]).toEqual([]);
 }
});
async function database(page:Page){return page.evaluate(()=>new Promise<any>((accept,reject)=>{
 const r=indexedDB.open('chenyuan-playable-v1');r.onupgradeneeded=()=>{r.transaction!.abort();reject(new Error('Readonly observation must not create a Game database'));};r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const db=r.result,tx=db.transaction([...db.objectStoreNames],'readonly'),rows:any={};
  for(const name of db.objectStoreNames){rows[name]=[];const cursor=tx.objectStore(name).openCursor();cursor.onsuccess=()=>{if(cursor.result){rows[name].push({key:cursor.result.key,value:cursor.result.value});cursor.result.continue();}};}
  tx.oncomplete=()=>{db.close();accept({version:db.version,rows});};tx.onabort=()=>{db.close();reject(tx.error);};
 };
}));}
function battleFixture(school:'sword'|'talisman'='sword',move:Move='attack'):Game{
 const d=driver('leave',school);d.funds(200);d.buy('healing_pill',3);d.buy('spirit_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});
 if(move==='release'||move==='heal'||move==='restore')d.doAction({type:'BATTLE',move:'technique'});
 if(move==='heal'||move==='restore')d.doAction({type:'BATTLE',move:'guard'});
 validateGame(d.game);return structuredClone(d.game) as Game;
}
async function load(page:Page,game:Game,virtual=true){
 listen(page);if(virtual)await useJourneyClock(page);await page.goto('/');await expect(page.getByLabel('导入已有存档',{exact:true})).toBeEnabled();
 await expect(page.locator('.app-shell')).toHaveAttribute('data-font-scale','1');const raw=await database(page);
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-ta07-battle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});
 await expect(page.getByTestId('action-execution')).toBeVisible();if(virtual){await expect(page.getByTestId('action-countdown')).toHaveText('0.6 秒');await page.clock.runFor(599);expect(await database(page)).toEqual(raw);await page.clock.runFor(1);}
 await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const before=await snapshot(page) as Game,expected=structuredClone(game);expected.core.runId=before.core.runId;expected.core.revision=0;
 if(expected.core.activeEvent)expected.core.activeEvent.instanceId=before.core.runId+':'+expected.core.activeEvent.id;
 expect(before).toEqual(expected);expect(await activity(page)).toBeNull();return before;
}
async function layoutReady(page:Page){await expect.poll(()=>page.evaluate(()=>{
 const app=document.querySelector<HTMLElement>('.app-shell'),alerts=app?.querySelector<HTMLElement>('.stage-alerts');if(!app?.classList.contains('immersive-stage')||!alerts)return true;
 const actual=alerts.getBoundingClientRect().height,known=parseFloat(app.style.getPropertyValue('--notice-height'));return Number.isFinite(known)&&Math.abs(known-(actual?actual+8:0))<=.5;
}),{timeout:8000}).toBe(true);}
async function initialObjects(page:Page,info:TestInfo){
 await layoutReady(page);
 const geometry=await page.evaluate(()=>{
  const rect=(node:Element)=>{const r=node.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const visible=(node:Element)=>node.getClientRects().length>0&&getComputedStyle(node).visibility!=='hidden';
  const group=(id:string)=>{const node=document.querySelector('[data-testid="'+id+'"]');return node?{id,visible:visible(node),rect:rect(node),buttons:[...node.querySelectorAll('button')].map(n=>n.getAttribute('data-testid'))}:null;};
  const buttons=[...document.querySelectorAll<HTMLElement>('[data-testid=battle-deck] button')].filter(visible).map(node=>{
   const r=rect(node),style=getComputedStyle(node),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
   const backgroundColor=style.backgroundColor,slashAlpha=backgroundColor.match(/\/\s*([\d.]+)(%)?\s*\)$/),rgba=backgroundColor.match(/^rgba\((.*)\)$/);
   const backgroundAlpha=backgroundColor==='transparent'?0:slashAlpha?Number(slashAlpha[1])/(slashAlpha[2]?100:1):rgba?Number(rgba[1].split(',').at(-1)):1;
   const glyph=node.querySelector('.ta07-command-object svg'),object=glyph?{rect:rect(glyph),paths:[...glyph.querySelectorAll('path')].map(n=>({d:n.getAttribute('d'),rect:rect(n),stroke:getComputedStyle(n).stroke}))}:null;
   return{id:node.getAttribute('data-testid'),text:node.textContent,rect:r,disabled:node.matches(':disabled'),hit:node.matches(':disabled')||!!hit&&(hit===node||node.contains(hit)),font:parseFloat(style.fontSize),background:style.backgroundImage,backgroundColor,backgroundAlpha,borderRadius:style.borderRadius,clipPath:style.clipPath,object,children:[...node.querySelectorAll('strong,small')].map(n=>{const range=document.createRange();range.selectNodeContents(n);return{tag:n.tagName,text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),rect:rect(n),textRects:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}))};})};
  });
  const asset=document.querySelector('[data-asset-id=battle-player-standing]'),img=asset?.querySelector('img')??(asset instanceof HTMLImageElement?asset:null),old=document.querySelector('.battle-player-art');
  return{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,nav:rect(document.getElementById('primary-navigation')!),console:group('battle-command-console'),strikes:group('battle-strike-slots'),medicine:group('battle-medicine-kit'),retreat:group('battle-retreat-lane'),buttons,standing:asset?{rect:rect(asset),visible:visible(asset),state:asset.getAttribute('data-art-state'),src:img?.getAttribute('src'),naturalWidth:img instanceof HTMLImageElement?img.naturalWidth:null,naturalHeight:img instanceof HTMLImageElement?img.naturalHeight:null,img:img?{rect:rect(img),fit:getComputedStyle(img).objectFit}:null}:null,oldPortrait:old?{rect:rect(old),src:old.querySelector('img')?.getAttribute('src')}:null};
 });
 await info.attach('ta07-initial-manual-physical-objects',{body:JSON.stringify(geometry),contentType:'application/json'});
 // Original image is saved before the new-object checks so a genuine baseline red keeps its actual screen.
 await page.screenshot({path:info.outputPath('ta07-initial-manual.png')});
 return geometry;
}
async function attach(info:TestInfo,name:string,data:unknown){await info.attach(name,{body:JSON.stringify(data),contentType:'application/json'});}
const dbState=(raw:any,key:string)=>raw.rows['full-state'].find((row:any)=>row.key===key)?.value??null;
async function manual(page:Page){const before=await database(page);await page.getByTestId('battle-manual-takeover').click();await expect(page.getByTestId('battle-deck')).toBeVisible();expect(await database(page)).toEqual(before);}
async function running(page:Page,virtual=true){
 await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);expect(a.version).toBe(6);expect(a.cycleMs).toBe(3000);
 await expect(page.locator('[data-testid=training-activity][data-running=true][data-generation="'+a.generation+'"]')).toBeVisible();
 if(virtual)await expect(page.getByTestId('training-countdown')).toHaveText('3.0 秒');
 else{const first=parseFloat(await page.getByTestId('training-countdown').innerText());expect(first).toBeGreaterThan(0);expect(first).toBeLessThanOrEqual(3);const live=await activity(page);expect(live.id).toBe(a.id);expect(live.generation).toBe(a.generation);expect(live.nextCommand).toEqual(a.nextCommand);expect(live.status).toBe('running');}
 return a;
}
async function begin(page:Page,id:string,virtual=true){await page.getByTestId(id).click();return running(page,virtual);}
async function formalResult(page:Page,a:any,before:Game,accepted:any,info:TestInfo,label:string){
 await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(a.completedCycles+1);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const raw=await database(page),after=await snapshot(page) as Game,formal=resolve(before,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId;
 expect(raw.version).toBe(9);expect(after).toEqual(formal.nextState);expect(dbState(raw,'current')).toEqual(after);expect(dbState(raw,'previous')).toEqual(before);
 const receipts=raw.rows['full-receipts'].filter((row:any)=>row.key===key);expect(receipts).toHaveLength(1);const receipt=receipts[0].value;
 expect(receipt.command).toEqual(a.nextCommand);expect(receipt.result).toEqual(formal.result);expect(receipt.proof.activityBefore).toEqual(a);expect(receipt.proof.stateAfter).toEqual(after);expect(receipt.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);
 const done=completeActivity(after,a,formal.result,{commandId:a.nextCommand.commandId,now:receipt.proof.resolvedAt});expect(done.version).toBe(6);if(done.version!==6)throw new Error('TA07 requires the complete formal adventure Activity');expect(dbState(raw,'activity')).toEqual(done);expect(await activity(page)).toEqual(done);expect(receipt.activity).toEqual(done);expect(()=>validateActivityReceipt(receipt,after)).not.toThrow();
 expect(raw.rows['full-receipts'].filter((row:any)=>row.key!==key)).toEqual(accepted.rows['full-receipts']);
 expect(raw.rows['full-state'].filter((row:any)=>!['current','previous','activity'].includes(row.key))).toEqual(accepted.rows['full-state'].filter((row:any)=>!['current','previous','activity'].includes(row.key)));
 for(const name of Object.keys(accepted.rows).filter(name=>!['full-state','full-receipts'].includes(name)))expect(raw.rows[name],name).toEqual(accepted.rows[name]);
 const saved={before,a,accepted,after,done,raw,receipt,formal,key};await attach(info,label+'-full-game-activity-all-stores-receipt',saved);return saved;
}
async function cycle(page:Page,a:any,before:Game,info:TestInfo,label:string){
 const accepted=await database(page),left=a.dueAt-await page.evaluate(()=>Date.now());expect(left).toBeGreaterThan(0);expect(left).toBeLessThanOrEqual(3000);
 expect(accepted.rows['full-receipts'].some((row:any)=>row.key===a.runId+':'+a.nextCommand.commandId)).toBe(false);
 await page.clock.fastForward(left-1);expect(await database(page)).toEqual(accepted);expect(await snapshot(page)).toEqual(before);
 await expect(page.getByTestId('battle-cast')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);
 await page.clock.fastForward(1);return formalResult(page,a,before,accepted,info,label);
}
async function observe(page:Page){await page.evaluate(()=>{
 const w=window as any,rows:any[]=[],seen=new Set<string>();
 const collect=()=>{for(const node of document.querySelectorAll('[data-testid=battle-cast]')){
  const key=node.closest('[data-testid=action-motion]')?.getAttribute('data-receipt');if(key&&!seen.has(key)){seen.add(key);rows.push({key,move:node.getAttribute('data-move'),school:node.getAttribute('data-school'),shape:node.getAttribute('data-shape'),wall:Date.now()});}
 }};
 const observer=new MutationObserver(collect);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-receipt','data-move','data-shape']});w.__ta07Observer=observer;w.__ta07Casts=rows;
});}
async function observed(page:Page){return page.evaluate(()=>(window as any).__ta07Casts??[]);}
async function paint(page:Page,a:any,move:Move,wantsCast=true){
 const key=JSON.stringify([a.runId,a.nextCommand.commandId]);await expect.poll(async()=>{await page.clock.runFor(16);return await page.locator('[data-testid=action-motion],[data-testid=hub-pulse]').evaluateAll((nodes,key)=>nodes.some(n=>n.getAttribute('data-operation')==='BATTLE'&&n.getAttribute('data-receipt')===key),key);},{timeout:8000}).toBe(true);
 const cast=page.getByTestId('battle-cast');if(wantsCast&&move!=='flee'&&await page.getByTestId('battle-presence').count()){
  await expect(cast).toBeVisible();await expect(cast).toHaveAttribute('data-move',move);await expect(cast).toHaveAttribute('data-school',/^(sword|talisman)$/);
 }return key;
}
async function noTransient(page:Page){
 await expect(page.getByTestId('battle-cast')).toHaveCount(0);await expect(page.getByTestId('action-motion')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('fx-skip')).toHaveCount(0);
 await expect(page.locator('.actor-impact,.actor-arrival,[data-cast-move],[data-cast-response]')).toHaveCount(0);
 await expect(page.locator('[data-testid=battle-presence] .progress-change')).toHaveCount(0);
 for(const node of await page.locator('[data-testid=battle-presence]:not([data-state=charging]):not([data-state=saving]) .battle-preparation').all())await expect(node).toHaveCSS('opacity','0');
}
async function holdWrite(page:Page){await page.evaluate(()=>new Promise<void>((accept,reject)=>{
 const r=indexedDB.open('chenyuan-playable-v1');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('full-state','readwrite');let holding=true,ready=false;
  (window as any).__ta07ReleaseWrite=()=>holding=false;const read=()=>{const q=tx.objectStore('full-state').get('current');q.onsuccess=()=>{(window as any).__ta07HeldGame=q.result;if(!ready){ready=true;accept();}if(holding)read();};};read();tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();reject(tx.error);};
 };
}));}
async function quota(page:Page){await page.evaluate(()=>{
 const w=window as any,put=IDBObjectStore.prototype.put;w.__ta07Rejected=[];w.__ta07RestorePut=()=>IDBObjectStore.prototype.put=put;
 IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
  if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-state'&&key==='current'){
   w.__ta07Rejected.push({db:this.transaction.db.name,store:this.name,key,value:structuredClone(value),wall:Date.now()});w.__ta07RestorePut();throw new DOMException('TA07 native cycle quota','QuotaExceededError');
  }return put.call(this,value,key!);
 };
});}
async function stable(page:Page,saved:any){await page.clock.fastForward(120000);expect(await snapshot(page)).toEqual(saved.after);expect(await database(page)).toEqual(saved.raw);await noTransient(page);}
async function preparation(page:Page,move:Move,before:Game,info:TestInfo,label:string){
 const presence=page.getByTestId('battle-presence');await expect(presence).toHaveAttribute('data-move',move);
 const measured=await presence.evaluate(node=>{
  const rect=(n:Element)=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const prep=node.querySelector<HTMLElement>('.battle-preparation'),actor=node.querySelector('.battle-player-art')!;
  const shapes=prep?[...prep.children].filter(n=>getComputedStyle(n).display!=='none').map(n=>{const s=getComputedStyle(n),p=getComputedStyle(n,'::before');return{class:n.className,box:rect(n),width:s.width,height:s.height,rotate:s.rotate,border:s.border,borderRadius:s.borderRadius,background:s.backgroundImage,shadow:s.boxShadow,animation:s.animationName,before:{content:p.content,width:p.width,height:p.height,border:p.border,rotate:p.rotate}};}):[];
  const physicalSignature=JSON.stringify(shapes.map(({class:kind,width,height,rotate,borderRadius,shadow,before})=>({kind,width,height,rotate,borderRadius,shadow,before})));
  return{state:node.getAttribute('data-state'),move:node.getAttribute('data-move'),school:node.getAttribute('data-school'),progress:parseFloat(getComputedStyle(node).getPropertyValue('--cast-progress')),actor:rect(actor),pose:actor.getAttribute('data-pose'),enemyIntent:node.querySelector('.enemy-art')?.getAttribute('data-intent'),preparation:prep?{box:rect(prep),opacity:parseFloat(getComputedStyle(prep).opacity),transform:getComputedStyle(prep).transform,move:prep.getAttribute('data-move'),school:prep.getAttribute('data-school')}:null,shapes,physicalSignature,enemy:node.querySelector('[data-testid=enemy-hp]')?.textContent,player:node.querySelector('[data-testid=battle-player]')?.textContent};
 });
 await attach(info,label+'-physical-preparation',measured);expect(measured.preparation).not.toBeNull();expect(measured.preparation?.move).toBe(move);expect(measured.preparation?.school).toBe(before.school);expect(measured.move).toBe(move);expect(measured.school).toBe(before.school);
 expect(measured.shapes).toHaveLength(1);const wanted={attack:'prep-weapon',guard:'prep-ward',technique:'prep-weapon',release:'prep-weapon',heal:'prep-medicine',restore:'prep-medicine',flee:'prep-return'}[move];expect(measured.shapes[0].class).toBe(wanted);expect(measured.shapes[0].box.width).toBeGreaterThan(0);expect(measured.shapes[0].box.height).toBeGreaterThan(0);
 expect(measured.progress).toBeGreaterThanOrEqual(0);expect(measured.progress).toBeLessThanOrEqual(1);
 expect(measured.preparation!.opacity).toBeCloseTo(measured.state==='charging' ? .2+measured.progress*.55 : measured.state==='saving' ? .22 : 0,3);
 expect(measured.pose).toBe(measured.state==='charging'?'preparing-'+move:measured.state==='saving'?'sealing':'idle');if(measured.state==='saving')expect(measured.preparation!.transform).toBe('none');expect(measured.enemyIntent).toBe(intent(before.battle!).kind);expect(measured.player).toContain(String(before.core.player.hp)+' /');expect(measured.enemy).toContain(String(before.battle!.hp)+' /');
 for(const shape of measured.shapes){expect(shape.box.left).toBeGreaterThanOrEqual(measured.actor.left-.5);expect(shape.box.right).toBeLessThanOrEqual(measured.actor.right+.5);expect(shape.box.top).toBeGreaterThanOrEqual(measured.actor.top-.5);expect(shape.box.bottom).toBeLessThanOrEqual(measured.actor.bottom+.5);}
 return measured;
}
async function staticAnimations(page:Page){
 const animations=await page.locator('.battle-preparation,.battle-preparation>i,.battle-player-art,.enemy-art,.battle-cast *').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({class:n.className,animation:getComputedStyle(n).animationName})));for(const row of animations)expect(row.animation,JSON.stringify(row.class)).toBe('none');
}
async function reducedSkipNavigation(page:Page,info:TestInfo,label:string){
 const raw=await database(page),game=await snapshot(page),links=page.locator('.skip-links a'),read=()=>links.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{text:n.textContent,href:n.getAttribute('href'),focused:n===document.activeElement,box:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},offscreen:r.bottom<=0||r.right<=0||r.left>=innerWidth||r.top>=innerHeight};}));
 const evidenceRows:unknown[]=[];await page.getByTestId('game-settings').focus();await expect(links).toHaveCount(3);
 for(const row of await read()){expect(row.focused,row.text??'').toBe(false);expect(row.offscreen,row.text??'').toBe(true);}
 for(const [name,focusSelector] of [['跳到当前内容','[data-testid=hub-current]'],['跳到主导航','#primary-navigation'],['跳到当前目标','#feature-title']] as const){
  const link=page.getByRole('link',{name,exact:true});await link.focus();await expect(link).toBeFocused();
  const focused=await link.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return{box:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:!!hit&&(hit===n||n.contains(hit))};});
  expect(focused.inside,name).toBe(true);expect(focused.hit,name).toBe(true);expect(focused.box.width,name).toBeGreaterThanOrEqual(44);expect(focused.box.height,name).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Enter');if(name==='跳到当前目标')await expect(page.getByTestId('goal-panel')).toBeVisible();await expect(page.locator(focusSelector)).toBeFocused();
  const after=await read();for(const row of after){expect(row.focused,row.text??'').toBe(false);expect(row.offscreen,row.text??'').toBe(true);}
  expect(await snapshot(page)).toEqual(game);expect(await database(page)).toEqual(raw);evidenceRows.push({name,focused,target:focusSelector,after});
  if(name==='跳到当前目标'){await page.getByTestId('hub-close').click();await expect(page.getByTestId('battle-presence')).toBeVisible();await page.getByTestId('game-settings').focus();for(const row of await read())expect(row.offscreen,row.text??'').toBe(true);}
 }
 expect(await snapshot(page)).toEqual(game);expect(await database(page)).toEqual(raw);await attach(info,label+'-reduced-skip-navigation',{scope:'Three explicit public focus and real Enter activations; this does not claim the complete Tab order',game,raw,evidenceRows});
}
async function savedGesture(page:Page,move:Move,school:Game['school'],info:TestInfo,label:string){
 const shape={attack:'thrust',guard:'ward',technique:'gather',release:'burst',heal:'elixir',restore:'spirit',flee:'withdraw'}[move],cast=page.getByTestId('battle-cast');await expect(cast).toHaveAttribute('data-shape',shape);await expect(cast).toHaveAttribute('data-school',school!);
 // Actual presentation frames, after a proven commit. This does not change the original game deadline.
 await expect.poll(async()=>{await page.clock.runFor(16);return cast.locator('svg>g').evaluate(n=>parseFloat(getComputedStyle(n).opacity));},{timeout:8000}).toBeGreaterThan(.1);
 const geometry=await cast.evaluate(node=>{
  const box=(n:Element)=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const motion=node.closest('[data-testid=action-motion]')!,scene=document.querySelector('[data-testid=battle-presence]')!,own=scene.querySelector('.battle-player-art')!,enemy=scene.querySelector('.enemy-art')!;
  const pieces=[...node.querySelectorAll<SVGElement>('svg>g,path')].map(n=>({tag:n.tagName,class:n.getAttribute('class'),d:n.getAttribute('d'),box:box(n),stroke:getComputedStyle(n).stroke,fill:getComputedStyle(n).fill,opacity:parseFloat(getComputedStyle(n).opacity),transform:getComputedStyle(n).transform,animation:getComputedStyle(n).animationName}));
  const effectPieces=[...node.querySelectorAll<HTMLElement>('svg,.cast-impact,.cast-dust')].filter(n=>getComputedStyle(n).display!=='none').map(n=>({class:n.getAttribute('class'),box:box(n),filter:getComputedStyle(n).filter,shadow:getComputedStyle(n).boxShadow}));
  // 3px drop-shadow uses a conservative 3-sigma band; 12px also contains the scaled SVG stroke.
  const bounds=[box(node),...effectPieces.map(n=>n.box),...pieces.map(n=>n.box)],outer={left:Math.min(...bounds.map(r=>r.left))-12,right:Math.max(...bounds.map(r=>r.right))+12,top:Math.min(...bounds.map(r=>r.top))-12,bottom:Math.max(...bounds.map(r=>r.bottom))+12};
  const protectedAreas=['.battle-own-status','.enemy-status','.battle-mode-heading','[data-testid=battle-deck]','.game-hud','#primary-navigation'].flatMap(selector=>[...document.querySelectorAll(selector)].filter(n=>n.getClientRects().length).map(n=>({selector,box:box(n)})));
  // Conservative upper-third of the actual contain drawing, agreed from the preserved standing source;
  // this is a composition protection band, not a claim of automatic face detection.
  const portrait=own.querySelector<HTMLImageElement>('[data-asset-id=battle-player-standing] img');
  let headBand:null|ReturnType<typeof box>=null;
  if(portrait){const r=box(portrait),scale=Math.min(r.width/portrait.naturalWidth,r.height/portrait.naturalHeight),w=portrait.naturalWidth*scale,h=portrait.naturalHeight*scale;headBand={left:r.left+(r.width-w)/2,right:r.left+(r.width+w)/2,top:r.top+(r.height-h)/2,bottom:r.top+(r.height-h)/2+h/3,width:w,height:h/3};protectedAreas.push({selector:'actual contain image upper-third conservative head band',box:headBand});}
  const exchange=scene.querySelector('.battle-exchange')!;for(const element of exchange.querySelectorAll('strong,small,span')){const range=document.createRange();range.selectNodeContents(element);for(const r of range.getClientRects())protectedAreas.push({selector:'actual exchange text '+element.textContent,box:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}});}
  return{move:node.getAttribute('data-move'),school:node.getAttribute('data-school'),shape:node.getAttribute('data-shape'),receipt:node.getAttribute('data-receipt'),motion:box(motion),scene:box(scene),own:box(own),enemy:box(enemy),headBand,pieces,effectPieces,outer,protectedAreas,actors:[...scene.querySelectorAll('[data-cast-move]')].map(n=>({class:n.className,move:n.getAttribute('data-cast-move'),school:n.getAttribute('data-cast-school'),role:n.getAttribute('data-cast-role'),animation:getComputedStyle(n).animationName,box:box(n)}))};
 });
 await attach(info,label+'-actual-svg-and-actor-geometry',geometry);expect(geometry.move).toBe(move);expect(geometry.school).toBe(school);expect(geometry.shape).toBe(shape);expect(geometry.receipt).not.toBeNull();
 expect(geometry.pieces.filter(n=>n.tag.toLowerCase()==='path').every(n=>!!n.d&&n.box.width>0&&n.box.height>0&&n.stroke!=='none')).toBe(true);expect(geometry.pieces.some(n=>n.tag.toLowerCase()==='path')).toBe(true);
 const target=['guard','heal','restore'].includes(move)?geometry.own:geometry.enemy,center={x:(geometry.motion.left+geometry.motion.right)/2,y:(geometry.motion.top+geometry.motion.bottom)/2};expect(center.x).toBeGreaterThanOrEqual(target.left);expect(center.x).toBeLessThanOrEqual(target.right);expect(center.y).toBeGreaterThanOrEqual(target.top);expect(center.y).toBeLessThanOrEqual(target.bottom);
 expect(geometry.outer.left).toBeGreaterThanOrEqual(geometry.scene.left);expect(geometry.outer.right).toBeLessThanOrEqual(geometry.scene.right);expect(geometry.outer.top).toBeGreaterThanOrEqual(geometry.scene.top);expect(geometry.outer.bottom).toBeLessThanOrEqual(geometry.scene.bottom);
 for(const region of geometry.protectedAreas){const a=geometry.outer,b=region.box;expect(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,'actual painted outer bound overlaps '+region.selector).toBe(false);}
 expect(geometry.actors.some(row=>row.role==='player'&&row.move===move&&row.school===school)).toBe(true);for(const row of geometry.actors){expect(row.move).toBe(move);expect(row.school).toBe(school);expect(row.animation).toMatch(/^ta07-/);}
 return geometry;
}
async function frame(page:Page,info:TestInfo,label:string){
 await layoutReady(page);const geometry=await page.evaluate(()=>{
  const box=(n:Element)=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  const inside=(a:ReturnType<typeof box>,b:ReturnType<typeof box>)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5;
  const visible=(n:Element)=>{if(!n.getClientRects().length||getComputedStyle(n).visibility==='hidden')return false;for(let p=n.parentElement;p;p=p.parentElement)if(p instanceof HTMLDetailsElement&&!p.open&&!p.querySelector(':scope>summary')?.contains(n))return false;return true;};
  const nav=box(document.getElementById('primary-navigation')!),modal=document.querySelector('dialog[open]');
  const parents=(node:Element)=>{const r=box(node),rows=[];for(let p=node.parentElement;p;p=p.parentElement){const style=getComputedStyle(p),b=box(p),visualOnlyExpansion=node.matches('button.progress-inspect')&&!!node.closest('[data-testid=battle-presence]')&&p.matches('.progress-track,.battle-player');if(style.display!=='contents'&&b.width>0&&b.height>0)rows.push({class:p.className,id:p.getAttribute('data-testid')??p.id,box:b,inside:inside(r,b),overflowX:style.overflowX,overflowY:style.overflowY,visualOnlyExpansion});if(p.matches('dialog[open]'))break;}return rows;};
  const controls=[...document.querySelectorAll<HTMLElement>(modal?'dialog[open] button,dialog[open] input:not([type=checkbox]),dialog[open] select':'[data-testid=battle-stage] button,[data-testid=battle-stage] input:not([type=checkbox]),[data-testid=battle-stage] select,.activity-rail button,.game-hud button,#primary-navigation button')].filter(visible).map(n=>{const r=box(n),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return{id:n.getAttribute('data-testid')??n.getAttribute('aria-label')??n.textContent,box:r,hit:n.matches(':disabled')||!!hit&&(hit===n||n.contains(hit)),disabled:n.matches(':disabled'),clip:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=(modal||n.closest('#primary-navigation')?innerHeight:nav.top),parents:parents(n)};});
   const copy=[...document.querySelectorAll<HTMLElement>('[data-testid=battle-deck] strong,[data-testid=battle-deck] small,[data-testid=battle-charge] strong,[data-testid=battle-charge] small,[data-testid=battle-charge] span,.intent strong,.intent b,.battle-current-authorization')].filter(visible).map(n=>{const b=box(n),range=document.createRange();range.selectNodeContents(n);const lines=[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));return{text:n.textContent,box:b,font:parseFloat(getComputedStyle(n).fontSize),minimum:n.matches('small,.battle-exchange span,.battle-current-authorization,.intent>b')?14:18,lines,linesInside:lines.every(r=>inside({...r,width:r.right-r.left,height:r.bottom-r.top},b)),clip:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1,parents:parents(n)};});
  return{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,controls,copy};
 });
 await attach(info,label+'-geometry',geometry);await page.screenshot({path:info.outputPath(label+'.png')});expect(geometry.width).toBeLessThanOrEqual(1440);expect(geometry.height).toBeLessThanOrEqual(900);
 for(const row of geometry.controls){expect(row.box.width,row.id??'').toBeGreaterThanOrEqual(44);expect(row.box.height,row.id??'').toBeGreaterThanOrEqual(44);expect(row.hit,row.id??'').toBe(true);expect(row.inside,row.id??'').toBe(true);expect(row.clip,row.id??'').toBe(false);for(const p of row.parents){if(p.visualOnlyExpansion){expect(p.overflowX,(row.id??'')+' visual-only expansion').toBe('visible');expect(p.overflowY,(row.id??'')+' visual-only expansion').toBe('visible');}else expect(p.inside,(row.id??'')+' in '+p.class).toBe(true);}}
 for(const row of geometry.copy){expect(row.font,row.text??'').toBeGreaterThanOrEqual(row.minimum);expect(row.clip,row.text??'').toBe(false);expect(row.linesInside,row.text??'').toBe(true);for(const p of row.parents)expect(p.inside,(row.text??'')+' in '+p.class).toBe(true);}
 return geometry;
}

test('TA07-A1 four direct strike objects medicine kit and retreat lane have distinct physical hierarchy beside a complete cold standing actor',async({page},info)=>{
 const before=await load(page,battleFixture()),raw=await database(page);
 await expect(page.getByTestId('battle-presence')).toBeVisible();await expect(page.getByTestId('intent')).toContainText('原始伤害');
 await page.getByTestId('battle-manual-takeover').click();await expect(page.getByTestId('battle-deck')).toBeVisible();
 if(await page.locator('[data-asset-id=battle-player-standing]').count())await expect(page.locator('[data-asset-id=battle-player-standing]')).toHaveAttribute('data-art-state','ready');
 const geometry=await initialObjects(page,info);
 for(const move of Object.keys(moveButtons) as Move[]){
  const button=page.getByTestId('battle-deck').getByTestId(moveButtons[move]);await expect(button).toBeVisible();
  const preview=previewAction(before,{type:'BATTLE',move});expect(await button.isEnabled()).toBe(preview.allowed);
  if(preview.allowed&&move!=='flee')await expect(button).toContainText(formatCosts(preview.costs!));
  await expect(button).toContainText('3 秒');
 }
 expect(await snapshot(page)).toEqual(before);expect(await activity(page)).toBeNull();expect(await database(page)).toEqual(raw);
 await info.attach('ta07-readonly-complete-game-and-database',{body:JSON.stringify({before,raw}),contentType:'application/json'});
 expect(geometry.width).toBeLessThanOrEqual(1440);expect(geometry.height).toBeLessThanOrEqual(900);
 for(const button of geometry.buttons){expect(button.rect.width,button.id??'').toBeGreaterThanOrEqual(44);expect(button.rect.height,button.id??'').toBeGreaterThanOrEqual(44);expect(button.hit,button.id??'').toBe(true);expect(button.rect.bottom,button.id??'').toBeLessThanOrEqual(geometry.nav.top);for(const copy of button.children){expect(copy.font,copy.text??'').toBeGreaterThanOrEqual(copy.tag==='SMALL'?14:18);expect(copy.rect.left).toBeGreaterThanOrEqual(button.rect.left);expect(copy.rect.right).toBeLessThanOrEqual(button.rect.right);expect(copy.rect.top).toBeGreaterThanOrEqual(button.rect.top);expect(copy.rect.bottom).toBeLessThanOrEqual(button.rect.bottom);for(const line of copy.textRects){expect(line.left).toBeGreaterThanOrEqual(copy.rect.left-.5);expect(line.right).toBeLessThanOrEqual(copy.rect.right+.5);expect(line.top).toBeGreaterThanOrEqual(copy.rect.top-.5);expect(line.bottom).toBeLessThanOrEqual(copy.rect.bottom+.5);}}}
 expect.soft(geometry.console,'new command objects must be physically present, not retained hidden markers').not.toBeNull();
 expect.soft(geometry.strikes?.buttons,'four original direct actions belong to the strike rack').toEqual(['attack','guard','technique','release']);
 expect.soft(geometry.medicine?.buttons,'the two real supply actions belong to the lower-weight medicine kit').toEqual(['battle-heal','battle-restore']);
 expect.soft(geometry.retreat?.buttons,'retreat has a separate physical route').toEqual(['flee']);
 expect.soft(geometry.standing,'a complete standing actor replaces the cropped half portrait').not.toBeNull();
 if(geometry.standing){expect(geometry.standing.visible).toBe(true);expect(geometry.standing.state).toBe('ready');expect(geometry.standing.naturalWidth).toBe(512);expect(geometry.standing.naturalHeight).toBe(512);expect(geometry.standing.rect.bottom).toBeLessThan(geometry.nav.top);expect(geometry.standing.img?.fit).toBe('contain');}
 const strikes=geometry.buttons.filter(row=>['attack','guard','technique','release'].includes(row.id??'')),secondary=geometry.buttons.filter(row=>['battle-heal','battle-restore','flee'].includes(row.id??''));
 const outlines=strikes.map(row=>{expect(row.object).not.toBeNull();expect(row.object!.rect.width).toBeGreaterThan(0);expect(row.object!.rect.height).toBeGreaterThan(0);expect(row.object!.paths.length).toBeGreaterThan(0);for(const path of row.object!.paths){expect(path.d).not.toBeNull();expect(path.rect.width+path.rect.height).toBeGreaterThan(0);expect(path.stroke).not.toBe('none');}return row.object!.paths.map(path=>path.d).join('|');});expect(new Set(outlines).size).toBe(4);
 expect(Math.min(...strikes.map(row=>row.rect.width*row.rect.height))).toBeGreaterThan(Math.max(...secondary.map(row=>row.rect.width*row.rect.height)));
 for(const strike of strikes){expect(strike.background,strike.id??'').toBe('none');expect(strike.backgroundAlpha,strike.id+' computed '+strike.backgroundColor).toBe(0);}
 const groups=[geometry.strikes!,geometry.medicine!,geometry.retreat!],surface=geometry.console!.rect;
 for(const group of groups){expect(group.visible,group.id).toBe(true);expect(group.rect.width,group.id).toBeGreaterThan(0);expect(group.rect.height,group.id).toBeGreaterThan(0);expect(group.rect.left,group.id).toBeGreaterThanOrEqual(surface.left-.5);expect(group.rect.right,group.id).toBeLessThanOrEqual(surface.right+.5);expect(group.rect.top,group.id).toBeGreaterThanOrEqual(surface.top-.5);expect(group.rect.bottom,group.id).toBeLessThanOrEqual(surface.bottom+.5);}
 for(let i=0;i<groups.length;i++)for(const next of groups.slice(i+1)){const a=groups[i].rect,b=next.rect;expect(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,groups[i].id+' overlaps '+next.id).toBe(false);}
 const proposed=previewActivity(before,defaultBattlePlan(before)).adventure!.initialAction;expect(proposed?.type).toBe('BATTLE');await expect(page.getByTestId('battle-command-console')).toHaveAttribute('data-proposed-move',(proposed as {move:Move}).move);await expect(page.locator('.ta07-proposed')).toHaveCount(1);
 for(const id of ['attack','guard','technique','flee']){const button=page.getByTestId(id);await button.hover();if(await button.isEnabled()){await button.focus();await expect(button).toBeFocused();}}
 expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);expect(await activity(page)).toBeNull();await frame(page,info,'readonly-four-strikes-and-secondary-kit');
});

for(const move of ['attack','guard','technique','release','heal','restore','flee'] as const)test('TA07-A2 '+move+' has its own physical preparation and saved gesture after exactly one formal three-second turn',async({page},info)=>{
 const before=await load(page,battleFixture('sword',move));await manual(page);await observe(page);
 const action={type:'BATTLE' as const,move},preview=previewAction(before,action);expect(preview.allowed).toBe(true);
 if(move==='technique')expect(preview.costs!.mp).toBeGreaterThan(0);
 if(move==='heal'||move==='restore')expect(preview.costs!.items).toEqual({[move==='heal'?'healing_pill':'spirit_pill']:1});
 const a=await begin(page,moveButtons[move]);expect(a.plan).toMatchObject({kind:'battle',mode:'single',move,maxCycles:1});expect(a.nextCommand.type).toBe('BATTLE');expect(a.nextCommand.move).toBe(move);
 const accepted=await database(page);await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-move',move);await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state','charging');
 const initial=await preparation(page,move,before,info,'move-'+move+'-preparation');expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(accepted);
 await page.clock.fastForward(1000);const middle=await preparation(page,move,before,info,'move-'+move+'-one-second-preparation');expect(middle.progress).toBeGreaterThan(initial.progress);expect(middle.preparation!.opacity).toBeGreaterThan(initial.preparation!.opacity);expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(accepted);
 const saved=await cycle(page,a,before,info,'move-'+move);expect(saved.done.status).toBe('stopped');expect(saved.done.battleTurns).toBe(1);expect(saved.done.moves[move]).toBe(1);expect(saved.done.spentMp).toBe(preview.costs!.mp??0);expect(saved.done.spentItems).toEqual(preview.costs!.items??{});
 const key=await paint(page,a,move);
 if(move==='flee'){
  expect(saved.after.battle).toBeNull();expect(saved.after.core.world.location).toBe('cave');expect(saved.after.wins).toBe(before.wins);expect(saved.after.core.inventory).toEqual(before.core.inventory);expect(saved.after.core.player.hp).toBe(Math.max(1,before.core.player.hp-8));await expect(page.getByTestId('battle-cast')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);
 }else{
  await savedGesture(page,move,before.school,info,'move-'+move+'-saved');const observedRows=await observed(page);expect(observedRows).toHaveLength(1);expect(observedRows[0]).toMatchObject({key,move,school:before.school});
  await expect(page.getByTestId('enemy-hp')).toContainText(String(saved.after.battle!.hp)+' /');await expect(page.getByTestId('battle-player')).toContainText(String(saved.after.core.player.hp)+' /');
 }
 await expect(page.getByTestId('training-summary')).toContainText('已完成 1 次动作 · 上限 1 次动作');await frame(page,info,'move-'+move+'-saved-scene');
 await stable(page,saved);if(move!=='flee')expect(await observed(page)).toHaveLength(1);
});

test('TA07-A3 a native positive-MP technique really counts down three seconds and its first native write and sole whole-game result respect the deadline',async({page},info)=>{
 const before=await load(page,battleFixture('sword','technique'),false);await manual(page);const preview=previewAction(before,{type:'BATTLE',move:'technique'});expect(preview.allowed).toBe(true);expect(preview.costs!.mp).toBeGreaterThan(0);
 await page.evaluate(()=>{
  const w=window as any,enemy=document.querySelector<HTMLElement>('.battle-presence[data-active=true] .enemy-art');if(!enemy)throw new Error('The native technique requires its current visible enemy actor');w.__ta07EnemyResponses=[];
  const observer=new MutationObserver(()=>{const scene=enemy.closest<HTMLElement>('[data-testid=battle-presence]'),style=getComputedStyle(enemy);w.__ta07EnemyResponses.push({wall:Date.now(),mono:performance.now(),connected:enemy.isConnected,enemy:scene?.dataset.enemy,run:scene?.dataset.run,revision:scene?.dataset.revision,response:enemy.dataset.castResponse??null,move:enemy.dataset.castMove??null,school:enemy.dataset.castSchool??null,role:enemy.dataset.castRole??null,animation:style.animationName,animations:enemy.getAnimations().map(a=>({name:a instanceof CSSAnimation?a.animationName:null,state:a.playState,frames:a.effect instanceof KeyframeEffect?a.effect.getKeyframes().map(f=>({offset:f.computedOffset,transform:typeof f.transform==='string'?f.transform:null,x:typeof f.transform==='string'?(f.transform==='none'?0:new DOMMatrixReadOnly(f.transform).m41):null})):[]}))});});
  observer.observe(enemy,{attributes:true,attributeFilter:['data-cast-response','data-cast-move','data-cast-school','data-cast-role','class']});w.__ta07EnemyObserver=observer;
 });
 await page.evaluate(()=>{
  const w=window as any,put=IDBObjectStore.prototype.put;w.__ta07Writes=[];w.__ta07RestorePut=()=>IDBObjectStore.prototype.put=put;
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.transaction.db.name==='chenyuan-playable-v1'&&this.name==='full-state'&&key==='current')w.__ta07Writes.push({key,value:structuredClone(value),wall:Date.now(),mono:performance.now(),mode:this.transaction.mode});return put.call(this,value,key!);};
 });
 const began=await page.evaluate(()=>({wall:Date.now(),mono:performance.now()})),a=await begin(page,'technique',false),accepted=await database(page),first=parseFloat(await page.getByTestId('training-countdown').innerText());
 expect(first).toBeGreaterThan(0);expect(first).toBeLessThanOrEqual(3);await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state','charging');
 await expect.poll(async()=>parseFloat(await page.getByTestId('training-countdown').innerText())).toBeLessThan(first);expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(accepted);await expect(page.getByTestId('battle-cast')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__ta07Writes)).toEqual([]);
 const saved=await formalResult(page,a,before,accepted,info,'native-technique'),ended=await page.evaluate(()=>({wall:Date.now(),mono:performance.now(),writes:(window as any).__ta07Writes}));
 expect(ended.mono-began.mono).toBeGreaterThanOrEqual(3000);expect(ended.wall).toBeGreaterThanOrEqual(a.dueAt);expect(ended.writes).toHaveLength(1);expect(ended.writes[0].wall).toBeGreaterThanOrEqual(a.dueAt);expect(ended.writes[0].value).toEqual(saved.after);expect(ended.writes[0].mode).toBe('readwrite');
 expect(saved.after.core.player.mp).toBe(resolve(before,a.nextCommand).nextState.core.player.mp);await expect(page.getByTestId('training-summary')).toContainText('已完成 1 次动作 · 上限 1 次动作');
 await attach(info,'native-cycle-before-response-assertion',{began,a,first,ended,firstNativeWrite:ended.writes[0],receipt:saved.receipt});
 expect(saved.formal.result.delta.hp).toBeLessThan(0);const response=saved.after.battle!.hp<before.battle!.hp?'exchange':'counter';
 await expect.poll(()=>page.evaluate(({move,school,run,enemy,response,revision})=>(window as any).__ta07EnemyResponses.filter((row:any)=>row.connected&&row.move===move&&row.school===school&&row.role==='enemy'&&row.run===run&&row.enemy===enemy&&row.revision===revision&&row.response===response).length,{move:'technique',school:before.school,run:before.core.runId,enemy:before.battle!.enemy,revision:String(saved.after.core.revision),response}),{timeout:8000}).toBeGreaterThan(0);
 const responses=await page.evaluate(()=>(window as any).__ta07EnemyResponses),matching=responses.filter((row:any)=>row.connected&&row.move==='technique'&&row.school===before.school&&row.role==='enemy'&&row.run===before.core.runId&&row.enemy===before.battle!.enemy&&row.revision===String(saved.after.core.revision)&&row.response===response);
 expect(matching.some((row:any)=>row.animation==='ta07-enemy-'+response)).toBe(true);expect(matching.some((row:any)=>row.animations.some((animation:any)=>animation.name==='ta07-enemy-'+response&&animation.frames.some((frame:any)=>typeof frame.x==='number'&&frame.x<0)))).toBe(true);
 await attach(info,'native-enemy-response-formal-ownership',{scope:'Readonly MutationObserver and actual getAnimations/keyframes; no clock or animation hold added',response,actualHpDelta:saved.formal.result.delta.hp,enemyHpBefore:before.battle!.hp,enemyHpAfter:saved.after.battle!.hp,originalCommand:a.nextCommand,matching,responses});
 await frame(page,info,'native-three-second-technique-saved');await attach(info,'ta07-native-cycle-timing',{clock:'native Chromium wall/monotonic, no installed or advanced virtual clock; put time is request issuance, sole receipt proves actual completed transaction',began,a,first,ended,firstNativeWrite:ended.writes[0],receipt:saved.receipt});
});

test('TA07-A4 native saving and quota keep actors uncommitted while an explicit retry saves the exact original command and cost only once',async({page},info)=>{
 const before=await load(page,battleFixture('sword','technique'));await manual(page);await observe(page);const a=await begin(page,'technique'),accepted=await database(page);
 await page.clock.fastForward(2999);expect(await database(page)).toEqual(accepted);await holdWrite(page);
 try{
  await page.clock.fastForward(1);await expect(page.getByTestId('save-status')).toHaveText('保存中');await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state','saving');await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-move','technique');
  expect(await page.evaluate(()=>(window as any).__ta07HeldGame)).toEqual(before);await expect(page.getByTestId('battle-cast')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('battle-charge')).toContainText('保存中');await preparation(page,'technique',before,info,'held-saving-not-a-hit');await frame(page,info,'native-saving-cold-result');
 }finally{await page.evaluate(()=>(window as any).__ta07ReleaseWrite());}
 const first=await formalResult(page,a,before,accepted,info,'held-saving-first');await paint(page,a,'technique');await savedGesture(page,'technique',before.school,info,'held-saving-first-actual');expect(await observed(page)).toHaveLength(1);
 await page.clock.runFor(1601);await noTransient(page);const next=await begin(page,'guard'),pending=await database(page);await quota(page);await page.clock.fastForward(3000);
 await expect(page.getByTestId('error')).toContainText('存储空间不足');await expect(page.getByTestId('retry')).toBeVisible();await noTransient(page);expect(await snapshot(page)).toEqual(first.after);expect(await database(page)).toEqual(pending);expect((await activity(page)).nextCommand).toEqual(next.nextCommand);
 const rejected=await page.evaluate(()=>(window as any).__ta07Rejected);expect(rejected).toHaveLength(1);expect(rejected[0].value).toEqual(resolve(first.after,next.nextCommand).nextState);expect(rejected[0].wall).toBeGreaterThanOrEqual(next.dueAt);
 for(const id of Object.values(moveButtons))await expect(page.getByTestId(id)).toBeDisabled();await frame(page,info,'quota-original-intent-all-seven-disabled');
 await page.getByTestId('battle-view-strategy').click();await expect(page.getByTestId('battle-strategy-editor')).toBeVisible();expect(await database(page)).toEqual(pending);await page.getByTestId('battle-view-scene').click();await expect(page.getByTestId('battle-presence')).toBeVisible();expect(await database(page)).toEqual(pending);expect((await activity(page)).nextCommand).toEqual(next.nextCommand);
 await page.getByTestId('retry').click();const retried=await formalResult(page,next,first.after,pending,info,'quota-exact-original-retry');await paint(page,next,'guard');await savedGesture(page,'guard',before.school,info,'quota-first-actual-success');await page.screenshot({path:info.outputPath('quota-exact-original-retry-saved.png')});expect(retried.receipt.command).toEqual(next.nextCommand);expect((await observed(page)).map((row:any)=>row.move)).toEqual(['technique','guard']);await stable(page,retried);expect(await observed(page)).toHaveLength(2);
});

test('TA07-A5 readonly strategy hidden scene and a pending native pause clear preparation without replacing the finite draft or counting a second turn',async({page},info)=>{
 const before=await load(page,battleFixture());await page.getByTestId('battle-view-strategy').click();const raw=await database(page);
 await page.getByLabel('本关最多斗法回合').fill('4');await page.getByLabel('斗法累计灵力预算').fill('32');await page.getByTestId('strategy-tab-supplies').click();
 const fields=[['自动回春气血阈值','45'],['战斗回春丹总预算','2'],['战斗回春丹保留量','1'],['自动回灵灵力阈值','30'],['战斗回灵丹总预算','2'],['战斗回灵丹保留量','1']] as const;
 for(const [name,value] of fields)await page.getByLabel(name).fill(value);await page.getByTestId('strategy-tab-safety').click();await page.getByLabel('自动斗法气血危险线').fill('5');await page.getByTestId('strategy-risk-pause').click();
 expect(await database(page)).toEqual(raw);expect(await snapshot(page)).toEqual(before);await page.getByTestId('battle-view-scene').click();const a=await begin(page,'battle-auto-start'),accepted=await database(page);
 expect(a.plan).toMatchObject({kind:'battle',mode:'auto',maxCycles:4,mpBudget:32,strategy:{healBelowPercent:45,healingBudget:2,healingReserve:1,restoreBelowPercent:30,spiritBudget:2,spiritReserve:1,retreatBelowPercent:5,riskMode:'pause'}});
 await page.clock.fastForward(1000);await page.getByTestId('hub-goal').click();await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state','inactive');await noTransient(page);expect(await database(page)).toEqual(accepted);expect(await activity(page)).toEqual(a);
 await page.getByTestId('hub-close').click();await expect(page.getByTestId('battle-presence')).toHaveAttribute('data-state','charging');expect((await activity(page)).nextCommand).toEqual(a.nextCommand);
 await holdWrite(page);try{
  await page.getByTestId('training-pause').click();await expect(page.locator('[data-testid=training-activity][data-running=false]')).toBeVisible();await noTransient(page);await expect(page.getByTestId('battle-charge')).toContainText(/正在.*停手|保存后暂停/);
  expect(await page.evaluate(()=>(window as any).__ta07HeldGame)).toEqual(before);await frame(page,info,'pause-request-clears-actor-before-native-pause-commit');
 }finally{await page.evaluate(()=>(window as any).__ta07ReleaseWrite());}
 await expect.poll(async()=>(await activity(page))?.status).toBe('paused');expect(await snapshot(page)).toEqual(before);const paused=await activity(page);expect(paused.nextCommand).toBeNull();expect(paused.completedCycles).toBe(0);expect(paused.plan).toEqual(a.plan);
 const resumed=await begin(page,'training-resume');expect(resumed.id).toBe(a.id);expect(resumed.plan).toEqual(a.plan);expect(resumed.generation).toBeGreaterThan(a.generation);const resumedRaw=await database(page);
 await page.getByTestId('battle-view-strategy').click();await expect(page.getByTestId('battle-presence')).toHaveCount(0);expect(await activity(page)).toEqual(resumed);expect(await database(page)).toEqual(resumedRaw);
 const saved=await cycle(page,resumed,before,info,'no-scene-original-finite-turn');expect(saved.done.completedCycles).toBe(1);expect(saved.done.status).toBe('running');
 await expect.poll(async()=>{await page.clock.runFor(16);return page.getByTestId('action-feedback-layer').getAttribute('data-state');},{timeout:8000}).toBe('success');await noTransient(page);
 await page.getByTestId('battle-view-scene').click();await expect(page.getByTestId('battle-presence')).toBeVisible();await expect(page.getByTestId('battle-cast')).toHaveCount(0);await expect(page.locator('[data-cast-move]')).toHaveCount(0);
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');expect(await snapshot(page)).toEqual(saved.after);
 await page.getByTestId('battle-view-strategy').click();await expect(page.getByLabel('本关最多斗法回合')).toHaveValue('4');await expect(page.getByLabel('斗法累计灵力预算')).toHaveValue('32');await page.getByTestId('strategy-tab-supplies').click();for(const [name,value] of fields)await expect(page.getByLabel(name)).toHaveValue(value);await page.getByTestId('strategy-tab-safety').click();await expect(page.getByLabel('自动斗法气血危险线')).toHaveValue('5');await expect(page.getByTestId('strategy-risk-pause')).toHaveAttribute('aria-pressed','true');
 await frame(page,info,'finite-original-draft-after-stop');const stopped=await database(page);await page.clock.fastForward(120000);expect(await database(page)).toEqual(stopped);expect(await snapshot(page)).toEqual(saved.after);await noTransient(page);
});

test('TA07-A6 same battle id foreign ownership and generation clear saved gestures while refresh and original history never borrow the old actor',async({page,context},info)=>{
 const before=await load(page,battleFixture());await observe(page);const other=await context.newPage();listen(other);await useJourneyClock(other);await other.goto('/');await expect(other.getByTestId('save-status')).toHaveText('已保存');
 try{
  const a=await begin(page,'battle-auto-start'),first=await cycle(page,a,before,info,'before-visible-page-takeover');expect(first.after.battle).not.toBeNull();await paint(page,a,a.nextCommand.move);await savedGesture(page,a.nextCommand.move,before.school,info,'owned-result-before-foreign-takeover');expect(await observed(page)).toHaveLength(1);
  await expect(other.getByTestId('enemy-hp')).toContainText(String(first.after.battle!.hp)+' /');expect(await page.evaluate(()=>document.hidden)).toBe(false);const old=await activity(page);
  await other.getByTestId('training-resume').click();await expect.poll(async()=>(await activity(other))?.generation).toBeGreaterThan(old.generation);const taken=await activity(other);expect(taken.id).toBe(old.id);expect(taken.ownerId).not.toBe(old.ownerId);expect(taken.status).toBe('running');
  await expect(page.locator('[data-testid=training-activity][data-generation="'+taken.generation+'"]')).toBeVisible();expect(await page.evaluate(()=>document.hidden)).toBe(false);await noTransient(page);await expect(page.getByTestId('battle-presence')).not.toHaveAttribute('data-state','charging');expect(await snapshot(page)).toEqual(first.after);expect(await snapshot(other)).toEqual(first.after);
  const own=await begin(page,'training-resume');expect(own.id).toBe(taken.id);expect(own.ownerId).not.toBe(taken.ownerId);expect(own.generation).toBeGreaterThan(taken.generation);await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');await noTransient(page);
  const settled=await database(page);expect(dbState(settled,'current')).toEqual(first.after);expect(settled.rows['full-receipts'].filter((row:any)=>row.key===first.key)).toEqual(first.raw.rows['full-receipts'].filter((row:any)=>row.key===first.key));
  await page.reload();await expect(page.getByTestId('save-status')).toHaveText('已保存');await noTransient(page);expect(await database(page)).toEqual(settled);await page.clock.fastForward(120000);expect(await snapshot(page)).toEqual(first.after);expect(await database(page)).toEqual(settled);
  const receiptEntry=page.locator('.game-hud .activity-rail').getByRole('button',{name:'本段回执',exact:true});await expect(receiptEntry).toHaveAttribute('data-testid','adventure-receipts');await expect(receiptEntry).toBeVisible();await expect(receiptEntry).toBeEnabled();await receiptEntry.click();await expect(page.getByTestId('adventure-history')).toBeVisible();expect(await database(page)).toEqual(settled);await page.getByTestId('hub-close').click();await noTransient(page);expect(await snapshot(page)).toEqual(first.after);await frame(page,info,'same-id-old-receipt-is-only-readable');await attach(info,'ta07-generation-owner-transition',{a,first,old,taken,own,settled});
 }finally{await other.close();}
});

function defeatFixture():Game{
 const d=driver('leave','sword');d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});
 for(let i=0;i<80;i++){
  const before=structuredClone(d.game) as Game,command={type:'BATTLE' as const,move:'guard' as const,commandId:'c'+before.core.revision,runId:before.core.runId,expectedRevision:before.core.revision},next=resolve(before,command).nextState;
  if(!next.battle&&next.wins===before.wins){validateGame(before);return before;}d.doAction({type:'BATTLE',move:'guard'});
 }throw new Error('The formal guard prefix did not reach a legal defeat boundary');
}
test('TA07-A7 a saved terminal turn never paints the next enemy and a legal defeat never borrows a victory actor',async({page,browser},info)=>{
 const scenario=trialJourneyScenario(),index=scenario.states.findIndex((g:Game,i:number)=>g.battle?.enemy==='trial_heart'&&scenario.states[i+1]?.battle?.enemy==='trial_thunder');expect(index).toBeGreaterThan(0);
 const fixture=scenario.states[index] as Game,action=scenario.actions[index];expect(action.type).toBe('BATTLE');const before=await load(page,fixture);expect(previewAction(before,action).allowed).toBe(true);await manual(page);
 const a=await begin(page,moveButtons[action.move as Move]),saved=await cycle(page,a,before,info,'previous-heart-actual-victory');expect(saved.done.status).toBe('stopped');expect(saved.after.battle!.enemy).toBe('trial_thunder');expect(saved.after.battle!.round).toBe(0);expect(saved.after.trial!.stage).toBe(2);await paint(page,a,action.move as Move,false);
 await expect(page.getByTestId('battle-stage')).toHaveAttribute('data-enemy','trial_thunder');await expect(page.locator('[data-asset-id=enemy-trial_thunder]')).toHaveAttribute('data-art-state','ready');await expect(page.getByTestId('battle-cast')).toHaveCount(0);await expect(page.locator('[data-cast-move],.actor-impact,.actor-arrival')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await frame(page,info,'terminal-heart-does-not-strike-new-thunder');await stable(page,saved);
 const isolated=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:900},reducedMotion:'no-preference'}),p=await isolated.newPage();listen(p);
 try{
  const losing=await load(p,defeatFixture());expect(previewAction(losing,{type:'BATTLE',move:'guard'}).allowed).toBe(true);await manual(p);const turn=await begin(p,'guard'),defeated=await cycle(p,turn,losing,info,'actual-formal-defeat');
  expect(defeated.after.battle).toBeNull();expect(defeated.after.wins).toBe(losing.wins);expect(defeated.after.core.world.location).toBe('cave');await paint(p,turn,'guard',false);await expect(p.getByTestId('battle-cast')).toHaveCount(0);await expect(p.locator('[data-cast-move],.actor-impact,.actor-arrival')).toHaveCount(0);await expect(p.getByTestId('action-number')).toHaveCount(0);await frame(p,info,'defeat-is-fact-not-victory-pose');await stable(p,defeated);expect(diagnostics.get(p)?.errors).toEqual([]);
 }finally{await isolated.close();}
});

test('TA07-A8 talisman preparation survives missing standing art and both reduction settings keep real actions and readable static results',async({page,browser},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/art/v2/actors/player-standing-cold-v1.webp',route=>route.fulfill({status:200,contentType:'image/webp',body:'TA07 explicit unavailable character image fixture'}));
 let before=await load(page,battleFixture('talisman'));await manual(page);await expect(page.locator('[data-asset-id=battle-player-standing]')).toHaveAttribute('data-art-state','failed');await expect(page.locator('.battle-person-fallback')).toBeVisible();
 for(const id of Object.values(moveButtons))await expect(page.getByTestId(id)).toBeVisible();const signatures:any[]=[];
 for(const move of ['technique','release','guard','attack'] as const){
  const preview=previewAction(before,{type:'BATTLE',move});expect(preview.allowed).toBe(true);const a=await begin(page,moveButtons[move]);signatures.push(await preparation(page,move,before,info,'reduced-talisman-'+move));
  const saved=await cycle(page,a,before,info,'reduced-talisman-'+move);await paint(page,a,move,false);await expect(page.getByTestId('battle-cast')).toHaveCount(0);await expect(page.getByTestId('action-number')).toHaveCount(0);await expect(page.getByTestId('fx-skip')).toHaveCount(0);await expect(page.getByTestId('training-summary')).toContainText('已完成 1 次动作 · 上限 1 次动作');
  if(saved.after.battle){await expect(page.getByTestId('enemy-hp')).toContainText(String(saved.after.battle.hp)+' /');await staticAnimations(page);}
  await page.clock.runFor(1601);before=saved.after;
 }
 expect(new Set(signatures.map(row=>row.physicalSignature)).size).toBe(4);await reducedSkipNavigation(page,info,'system-reduction');await frame(page,info,'talisman-fallback-and-system-reduced-static-result');
 const isolated=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:900},reducedMotion:'no-preference'}),p=await isolated.newPage();listen(p);
 try{
  const origin=await load(p,battleFixture('sword','technique'));await p.getByTestId('game-settings').click();await p.getByTestId('reduce-effects').check();await expect(p.getByTestId('reduce-effects')).toBeChecked();await p.getByRole('button',{name:'关闭设置',exact:true}).click();await reducedSkipNavigation(p,info,'preference-reduction');await manual(p);
  const a=await begin(p,'technique');await preparation(p,'technique',origin,info,'preference-reduced-sword');await staticAnimations(p);const saved=await cycle(p,a,origin,info,'preference-reduced-sword');await paint(p,a,'technique',false);await expect(p.getByTestId('battle-cast')).toHaveCount(0);await expect(p.getByTestId('action-number')).toHaveCount(0);await expect(p.getByTestId('fx-skip')).toHaveCount(0);await expect(p.getByTestId('training-summary')).toContainText('已完成 1 次动作 · 上限 1 次动作');await frame(p,info,'preference-reduced-sword-actual-saved');await stable(p,saved);expect(diagnostics.get(p)?.errors).toEqual([]);
 }finally{await isolated.close();}
});
