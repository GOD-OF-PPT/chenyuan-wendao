import {openSupplySettings,closeSupplySettings} from './stage-support';
import {test,expect,type Page,type TestInfo,type Locator} from '@playwright/test';
import {snapshot,activitySnapshot as activity,useJourneyClock,finishJourneyClock,revealPaged} from './support';
import {advance} from '../../src/full/engine.ts';
import {previewAction} from '../../src/full/queries.ts';
import {formatCosts} from '../src/presentation';
import type {Game} from '../../src/full/types.ts';
import {driver,prepareTrial} from '../../tests/full-route.mjs';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
async function seed(page:Page,game:Game){
 await useJourneyClock(page);await page.goto('/');
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-check-idle-02.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});
 await finishJourneyClock(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const actual=await snapshot(page),expected=structuredClone(game);expect(actual.core.runId).not.toBe(game.core.runId);expected.core.runId=actual.core.runId;expected.core.revision=0;
 if(expected.core.activeEvent)expected.core.activeEvent.instanceId=actual.core.runId+':'+expected.core.activeEvent.id;
 expect(actual,'only the documented import identity changes').toEqual(expected);return actual;
}
async function tick(page:Page){
 const a=await activity(page),before=await snapshot(page);expect(a.status).toBe('running');
 await page.clock.fastForward(a.cycleMs-1);expect(await snapshot(page)).toEqual(before);await page.clock.fastForward(1);
 await expect.poll(async()=>(await activity(page)).completedCycles).toBe(a.completedCycles+1);
 const after=await snapshot(page);expect(after).toEqual(advance(before,a.nextCommand));return after;
}
async function hit(control:Locator){
 await expect(control).toBeInViewport({ratio:1});
 expect(await control.evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.getElementById('primary-navigation')?.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return(!nav||!!el.closest('#primary-navigation')||r.bottom<=nav.top)&&!!target&&(target===el||el.contains(target));}),'the actual control center receives the pointer and content stays above navigation').toBe(true);
}
async function shot(page:Page,info:TestInfo,name:string){
 for(const art of await page.locator('[data-art-state]:visible').all())await expect(art).toHaveAttribute('data-art-state','ready');
 for(const control of await page.locator('dialog[open] button:visible,.adventure-planner button:visible,.battle-automation button:visible,.market-planner button:visible').all())await hit(control);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);await page.screenshot({path:info.outputPath(name+'.png')});
}
async function database(page:Page){return page.evaluate(()=>new Promise<Record<string,{key:IDBValidKey;value:unknown}[]>>((resolve,reject)=>{
 const open=indexedDB.open('chenyuan-playable-v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
  const db=open.result,names=[...db.objectStoreNames],rows:Record<string,{key:IDBValidKey;value:unknown}[]>={},tx=db.transaction(names,'readonly');
  for(const name of names){rows[name]=[];const read=tx.objectStore(name).openCursor();read.onsuccess=()=>{const row=read.result;if(row){rows[name].push({key:row.key,value:row.value});row.continue();}};}
  tx.oncomplete=()=>{db.close();resolve(rows);};tx.onabort=()=>{db.close();reject(tx.error);};
 };}));}
function preparedTrial(){const d=driver();for(let n=0;n<4;n++)d.realm();prepareTrial(d);return d;}
async function enterTrial(page:Page){
 const d=preparedTrial(),prepared=await seed(page,d.checkpoints.trial);
 await page.getByTestId('breakthrough').click();await page.getByTestId('trial-review-entry').click();await page.getByTestId('trial-confirm-entry').click();await tick(page);
 await expect(page.getByTestId('game-hub')).toBeVisible();await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇'}).click();await page.getByTestId('story-show-choices').click();
 await page.getByTestId('answer-accept').click();await page.getByTestId('milestone-confirm').click();await tick(page);await page.getByTestId('hub-close').click();
 await page.getByTestId('battle-manual-takeover').click();await page.getByTestId('technique').click();await tick(page);return prepared;
}
async function restoreReview(page:Page){await page.getByTestId('battle-recent').click();await page.getByTestId('trial-mode-checkpoint').click();await page.getByTestId('trial-restore-open').click();await expect(page.getByTestId('trial-restore-confirmation')).toBeVisible();}
async function loseRestoreDelivery(page:Page){await page.evaluate(()=>{
 const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!,put=IDBObjectStore.prototype.put,marked=new WeakSet<IDBTransaction>();
 (window as any).restoreDeliveryLost=false;
 IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.format==='chenyuan-control-receipt'&&value.kind==='RESTORE')marked.add(this.transaction);return put.call(this,value,key!);};
 Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(callback){const tx=this;descriptor.set!.call(this,function(event:Event){
  if(marked.has(tx)){IDBObjectStore.prototype.put=put;Object.defineProperty(IDBTransaction.prototype,'oncomplete',descriptor);(window as any).restoreDeliveryLost=true;tx.onabort?.call(tx,new Event('abort'));return;}
  callback?.call(tx,event);
 });}});
});}

test('a committed full restore with lost delivery keeps its original modal retry enabled and replay leaves every database record unchanged',async({page},info)=>{
 const prepared=await enterTrial(page),battle=await snapshot(page);await restoreReview(page);await loseRestoreDelivery(page);
 await page.getByTestId('trial-restore-confirm').click();await page.clock.fastForward(1000);await expect(page.getByTestId('trial-restore-error')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).restoreDeliveryLost),'the real restore transaction completed before its reply was lost').toBe(true);
 const restored=await snapshot(page),expected=structuredClone(prepared);expect(restored.core.runId).not.toBe(battle.core.runId);expected.core.runId=restored.core.runId;expected.core.revision=0;expect(restored).toEqual(expected);
 await expect(page.getByTestId('trial-restore-error')).toHaveText('恢复回复未能确认，请重试同一次恢复核对已保存进度。');await expect(page.getByTestId('trial-restore-error')).not.toContainText('未提交');await expect(page.getByTestId('trial-restore-confirmation').getByRole('alert')).toHaveCount(1);
 const committed=await database(page),receipts=committed['full-receipts'];expect(receipts).toHaveLength(1);expect((receipts[0].value as any).kind).toBe('RESTORE');
 await expect(page.getByTestId('trial-restore-confirm')).toBeDisabled();await shot(page,info,'restore-committed-reply-lost');
 await expect(page.getByTestId('trial-restore-retry'),'the original receipt replay remains usable after the restore changes run identity').toBeEnabled();
 await page.getByTestId('trial-restore-retry').click();await page.clock.fastForward(1000);await expect(page.getByTestId('trial-restore-confirmation')).not.toBeVisible();
 await expect(page.getByTestId('trial-preparation')).toBeVisible();await expect(page.getByTestId('save-status')).toHaveText('已保存');
 expect(await database(page),'all state, backups, ownership and receipt records stay identical on original-intent replay').toEqual(committed);await expect(page.getByTestId('action-motion')).toHaveCount(0);await shot(page,info,'restore-original-receipt-replayed');
});
test('a fresh stale full restore confirmation still rejects another page actual new battle turn without writing',async({page,context},info)=>{
 await enterTrial(page);await restoreReview(page);const other=await context.newPage();await useJourneyClock(other);await other.goto('/');
 await other.getByTestId('battle-manual-takeover').click();await other.getByTestId('guard').click();await tick(other);
 await expect(page.getByTestId('trial-restore-stale')).toBeVisible();await expect(page.getByTestId('trial-restore-confirm')).toBeDisabled();await expect(page.getByTestId('trial-restore-retry')).toHaveCount(0);
 const current=await database(page);await page.getByTestId('trial-restore-confirm').evaluate((button:HTMLButtonElement)=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 await page.waitForTimeout(50);expect(await database(page)).toEqual(current);await shot(page,info,'restore-new-stale-confirmation-rejected');await other.close();
});
test('a travel preview and actual one-arrival stop use travel language and inspecting does not start another action',async({page},info)=>{
 const d=driver();d.go('cave');const before=await seed(page,d.game);await page.getByTestId('tab-1').click();await page.getByTestId('travel-wilderness').click();
 expect(await snapshot(page)).toEqual(before);expect(await activity(page)).toBeNull();await expect(page.getByTestId('adventure-preview')).not.toContainText('出招');await shot(page,info,'travel-stop-preview');
 await page.getByTestId('adventure-start').click();await tick(page);const arrived=await snapshot(page),saved=await activity(page);expect(saved.status).toBe('stopped');expect(saved.completedCycles).toBe(1);expect(saved.stopReason.code).toBe('CYCLES_COMPLETE');await expect(page.getByTestId('training-stop')).not.toContainText('出招');
 await page.getByTestId('training-review').click();await expect(page.getByTestId('adventure-plan-state')).toContainText('已保存安排');expect(await snapshot(page)).toEqual(arrived);expect(await activity(page)).toEqual(saved);await shot(page,info,'travel-stop-saved');
});
for(const available of [true,false])test(`manual recovery medicines ${available?'available':'unavailable'} retain their reason without an empty trailing separator`,async({page},info)=>{
 const d=driver(available?'leave':'help');if(available){d.buy('healing_pill',2);d.buy('spirit_pill',2);}d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'technique'});
 const before=await seed(page,d.game);await page.getByTestId('battle-manual-takeover').click();
 for(const [id,move]of [['battle-heal','heal'],['battle-restore','restore']]as const){const button=page.getByTestId(id),preview=previewAction(before,{type:'BATTLE',move}),reason=preview.failure?.message??'',item=move==='heal'?'healing_pill':'spirit_pill';expect(preview.costs?.items).toEqual({[item]:1});expect(await button.locator('small').innerText()).not.toMatch(/·\s*$/);await expect(button.locator('small')).toHaveText(formatCosts(preview.costs)+' · 3 秒 / 回合'+(reason?' · '+reason:''));if(available)await expect(button).toBeEnabled();else{await expect(button).toBeDisabled();expect(reason).not.toBe('');}}
 expect(await snapshot(page)).toEqual(before);expect(await activity(page)).toBeNull();await shot(page,info,'manual-medicines-'+(available?'available':'blocked'));
});
test('a current trial victory toast lets actual view buttons receive clicks and never authorizes the next gate',async({page},info)=>{
 const d=preparedTrial();await seed(page,d.game);await page.getByTestId('battle-view-strategy').click();await page.getByTestId('strategy-tab-supplies').click();await page.getByLabel('战斗回春丹总预算').fill('12');await page.getByLabel('战斗回灵丹总预算').fill('4');await page.getByTestId('battle-auto-start').click();
 for(let n=0;n<40&&(await activity(page)).status==='running';n++)await tick(page);
 await page.clock.runFor(20); // Let the saved result's awaited animation frame render; this does not advance a new gate.
 const after=await snapshot(page),saved=await activity(page);expect(saved.status).toBe('stopped');expect(saved.victories).toBe(1);expect(after.trial.stage).toBe(2);await expect(page.getByTestId('hub-pulse')).toContainText('战斗胜利');await expect(page.getByTestId('action-motion')).toHaveCount(0);const toast=await page.getByTestId('hub-pulse').boundingBox(),header=await page.locator('.topbar').boundingBox();expect(toast!.y).toBeGreaterThanOrEqual(header!.y+header!.height);for(const id of ['battle-view-strategy','battle-view-scene']){const box=await page.getByTestId(id).boundingBox();expect(toast!.y+toast!.height).toBeLessThanOrEqual(box!.y);}await shot(page,info,'victory-toast-hit-targets');
 await hit(page.getByTestId('battle-view-strategy'));await page.getByTestId('battle-view-strategy').click();await expect(page.getByTestId('battle-view-strategy')).toHaveAttribute('aria-pressed','true');await expect(page.getByTestId('hub-pulse')).toBeVisible();expect(await snapshot(page)).toEqual(after);expect(await activity(page)).toEqual(saved);
 await hit(page.getByTestId('battle-view-scene'));await page.getByTestId('battle-view-scene').click();await expect(page.getByTestId('battle-view-scene')).toHaveAttribute('aria-pressed','true');expect(await snapshot(page)).toEqual(after);expect(await activity(page)).toEqual(saved);await shot(page,info,'victory-toast-after-real-view-clicks');
});
test('an explicit preparation purchase retains its travel draft then trial entry stops for the player question',async({page},info)=>{
 const d=preparedTrial(),before=await seed(page,d.checkpoints.trial);await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await revealPaged(page,'buy-healing_pill','explore-catalogue');await page.getByTestId('buy-healing_pill').click();
 await openSupplySettings(page);await page.getByLabel('交易最多件数').fill('2');await page.getByLabel('交易最多件数').blur();await openSupplySettings(page);await page.getByLabel('累计采购灵石预算').fill('41');await page.getByLabel('采购灵石保留量').fill('3');
 await closeSupplySettings(page);expect(await snapshot(page)).toEqual(before);await shot(page,info,'preparation-travel-expanded-budgets');await page.getByTestId('preparation-travel').click();await tick(page);await expect(page.getByTestId('market-planner')).toBeVisible();await expect(page.getByTestId('preparation-plan-state')).toContainText('待确认');
 await openSupplySettings(page);await expect(page.getByLabel('交易最多件数')).toHaveValue('2');await openSupplySettings(page);await expect(page.getByLabel('累计采购灵石预算')).toHaveValue('41');await expect(page.getByLabel('采购灵石保留量')).toHaveValue('3');
 await closeSupplySettings(page);const arrived=await snapshot(page);expect(arrived.core.inventory).toEqual(before.core.inventory);await shot(page,info,'preparation-draft-after-travel');await page.getByTestId('preparation-start').click();await tick(page);await tick(page);
 const bought=await snapshot(page);expect(bought.core.inventory.healing_pill).toBe(before.core.inventory.healing_pill+2);expect((await activity(page)).status).toBe('stopped');
 await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-travel').click();await revealPaged(page,'travel-terrace','explore-catalogue');await page.getByTestId('travel-terrace').click();expect(await snapshot(page)).toEqual(bought);await page.getByTestId('adventure-start').click();await tick(page);
 await page.getByTestId('hub-close').click();await page.getByTestId('breakthrough').click();await page.getByTestId('trial-review-entry').click();await page.getByTestId('trial-confirm-entry').click();await tick(page);
 const question=await snapshot(page),saved=await activity(page);expect(question.trial.stage).toBe(0);expect(question.core.activeEvent.id).toBe('trial_question');expect(question.battle).toBeNull();expect(saved.stopReason.code).toBe('WAITING_DECISION');
 await expect(page.getByTestId('game-hub')).toBeVisible();await page.getByTestId('hub-current').getByRole('button',{name:'继续当前遭遇'}).click();await page.getByTestId('story-show-choices').click();await page.getByTestId('narrative-catalogue').getByRole('button',{name:'下一页',exact:true}).click();expect(await snapshot(page)).toEqual(question);expect(await activity(page)).toEqual(saved);await shot(page,info,'prepared-trial-question-still-undecided');
});
test('the actual storage reconnect reports the saved paused activity and never retries or grants an offline cycle',async({page},info)=>{
 await page.addInitScript(()=>{
  const open=IDBFactory.prototype.open;
  IDBFactory.prototype.open=function(name:string,version?:number){
   const request=version===undefined?open.call(this,name):open.call(this,name,version);
   if(name==='chenyuan-playable-v1')request.addEventListener('success',()=>{if(!(window as any).reviewFullConnection){(window as any).reviewFullConnection=request.result;IDBFactory.prototype.open=open;}});
   return request;
  };
 });
 const d=driver();d.go('cave');const before=await seed(page,d.game);await page.getByTestId('cultivate').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');const paused=await activity(page),persisted=await database(page);expect(await snapshot(page)).toEqual(before);
 expect(await page.evaluate(()=>{const db=(window as any).reviewFullConnection as IDBDatabase;if(!db||typeof db.onversionchange!=='function')throw new Error('The real repository connection was not captured');const version=db.version;db.dispatchEvent(new IDBVersionChangeEvent('versionchange',{oldVersion:version,newVersion:version+1}));return version;})).toBe(9);
 await page.getByTestId('training-resume').click();await expect(page.getByTestId('error')).toContainText('存档连接已更新或关闭');await expect(page.getByTestId('reload-storage')).toBeEnabled();await hit(page.getByTestId('reload-storage'));expect(await database(page)).toEqual(persisted);
 await page.getByTestId('reload-storage').click();await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect(page.getByTestId('error')).toHaveCount(0);await expect(page.getByTestId('retry')).toHaveCount(0);
 const warning=page.locator('.error-banner[role="status"]');await expect(warning).toContainText('已重新读取已保存进度；上次未确认的操作未自动重试，请核对当前成果后再安排。');await expect(warning).toBeInViewport({ratio:1});
 expect(await database(page)).toEqual(persisted);expect(await activity(page)).toEqual(paused);expect(await snapshot(page)).toEqual(before);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(persisted);await expect(page.getByTestId('action-motion')).toHaveCount(0);
 expect(await page.evaluate(()=>new Promise<number>((resolve,reject)=>{const request=indexedDB.open('chenyuan-playable-v1');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result;resolve(db.version);db.close();};}))).toBe(9);
 await hit(page.getByTestId('training-resume'));for(const nav of await page.locator('#primary-navigation button').all())await hit(nav);await shot(page,info,'reconnected-paused-saved-snapshot');
 await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activity(page)).status).toBe('running');expect(await snapshot(page)).toEqual(before);await tick(page);const after=await snapshot(page);expect(after.core.revision).toBe(before.core.revision+1);await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page)).status).toBe('paused');await shot(page,info,'reconnected-explicit-cycle-completed');
});
