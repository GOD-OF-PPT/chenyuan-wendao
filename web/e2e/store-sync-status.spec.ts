import {test,expect,type Page} from '@playwright/test';
import {snapshot,useJourneyClock,finishJourneyClock} from './support';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine.ts';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
async function database(page:Page){return page.evaluate(()=>new Promise<any>((resolve,reject)=>{
 const request=indexedDB.open('chenyuan-playable-v1');request.onupgradeneeded=()=>{request.transaction?.abort();reject(new Error('Cannot create observer Game DB'));};request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,rows:any={},tx=db.transaction([...db.objectStoreNames],'readonly');for(const name of db.objectStoreNames){rows[name]=[];const r=tx.objectStore(name).openCursor();r.onsuccess=()=>{const row=r.result;if(row){rows[name].push({key:row.key,value:row.value});row.continue();}};}tx.oncomplete=()=>{db.close();resolve(rows);};tx.onabort=()=>{db.close();reject(tx.error);};};
}));}
async function hooks(page:Page){await page.addInitScript(()=>{
 const target=window as any,open=IDBFactory.prototype.open,Native=BroadcastChannel;
 IDBFactory.prototype.open=function(...args:any[]){const request=Reflect.apply(open,this,args);if(args[0]==='chenyuan-playable-v1')request.addEventListener('success',()=>{if(!target.__m01PrimaryDB)target.__m01PrimaryDB=request.result;});return request;};
 (window as any).BroadcastChannel=new Proxy(Native,{construct(C,args){const channel=Reflect.construct(C,args);if(args[0]==='chenyuan-full-progress')channel.addEventListener('message',()=>target.__m01SyncSeen=(target.__m01SyncSeen??0)+1);return channel;}});
});}
async function armCheckpoint(page:Page){await page.evaluate(()=>{
 const target=window as any,descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!,get=IDBObjectStore.prototype.get,marked=new WeakSet<IDBTransaction>();
 const restore=()=>{IDBObjectStore.prototype.get=get;Object.defineProperty(IDBTransaction.prototype,'oncomplete',descriptor);};target.__m01RestoreCheckpoint=restore;
 IDBObjectStore.prototype.get=function(key:any){if(this.transaction.db===target.__m01PrimaryDB&&this.transaction.mode==='readonly'&&this.name==='full-state'&&key==='checkpoint')marked.add(this.transaction);return get.call(this,key);};
 Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(callback){const tx=this;descriptor.set!.call(tx,function(event:Event){if(marked.has(tx)){restore();target.__m01CheckpointHeld=true;target.__m01ReleaseCheckpoint=()=>callback?.call(tx,event);return;}callback?.call(tx,event);});}});
});}
async function armSyncFailure(page:Page,kind:'general'|'closed'){await page.evaluate(kind=>{
 const target=window as any;
 if(kind==='closed'){const db=target.__m01PrimaryDB as IDBDatabase;if(typeof db.onversionchange!=='function')throw new Error('Missing real repository lifecycle hook');db.dispatchEvent(new IDBVersionChangeEvent('versionchange',{oldVersion:db.version,newVersion:db.version+1}));return;}
 const get=IDBObjectStore.prototype.get;target.__m01RestoreRead=()=>IDBObjectStore.prototype.get=get;
 IDBObjectStore.prototype.get=function(key:any){const result=get.call(this,key);if(this.transaction.db===target.__m01PrimaryDB&&this.transaction.mode==='readonly'&&this.name==='full-state'&&key==='current'){target.__m01RestoreRead();target.__m01NativeAbort=true;this.transaction.abort();}return result;};
},kind);}
async function readable(page:Page){
 const nav=await page.locator('#primary-navigation button:visible').count();expect(nav).toBe(8);
 for(const button of await page.locator('[data-testid=error] button:visible').all()){
  const r=await button.boundingBox();expect(r!.height).toBeGreaterThanOrEqual(44);
  expect(await button.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),nav=document.querySelector('#primary-navigation')!.getBoundingClientRect();return !!hit&&(hit===el||el.contains(hit))&&r.bottom<=nav.top;})).toBe(true);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
}
for(const kind of ['general','closed'] as const)test(`a confirmed configuration keeps its real result when queued sync ${kind} fails and visible reconnect never reapplies it`,async({page},info)=>{
 await hooks(page);await useJourneyClock(page);await page.goto('/');await expect(page.getByTestId('save-status')).toHaveText('尚无存档',{timeout:15000});const d=driver();d.go('cave');
 await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-m01-sync.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d.game))});await finishJourneyClock(page);await expect(page.getByTestId('save-status')).toHaveText('已保存');const before=await snapshot(page);
 await page.getByTestId('hub-skills').click();await page.getByTestId('equipment-mode-school').click();await page.getByTestId('school-talisman').click();await armCheckpoint(page);await page.getByTestId('configuration-confirm').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__m01CheckpointHeld===true)).toBe(true);
 const committed=await database(page),after=await snapshot(page),record=committed['full-receipts'].find((row:any)=>row.value.intent?.command?.type==='SCHOOL'&&row.value.result?.revisionAfter===after.core.revision)?.value;
 expect(record).toBeTruthy();expect(after).toEqual(resolve(before,record.intent.command).nextState);expect(after.school).toBe('talisman');expect(after.core.revision).toBe(before.core.revision+1);
 await page.evaluate(()=>{const t=window as any;t.__m01SyncSender=new BroadcastChannel('chenyuan-full-progress');t.__m01SyncSender.postMessage({source:'test-saved-config-notification'});});
 await expect.poll(()=>page.evaluate(()=>(window as any).__m01SyncSeen??0)).toBeGreaterThan(0);
 await armSyncFailure(page,kind);await page.evaluate(()=>(window as any).__m01ReleaseCheckpoint());
 await expect(page.getByTestId('save-status')).toHaveText('同步待核对');await expect(page.getByTestId('error')).toContainText('无法同步存档');await expect(page.getByTestId('error')).not.toContainText('本次操作未提交');await expect(page.getByTestId('reload-storage')).toBeEnabled();await expect(page.getByTestId('retry')).toHaveCount(0);
 await expect(page.getByTestId('configuration-dialog')).toHaveCount(0);
 const result=page.getByTestId('stage-outcome');await expect(result).toContainText('进度同步待核对');await expect(result).toContainText('已确认');await expect(result).not.toContainText('本次未保存');await expect(result).not.toContainText('进度未结算');
 expect(await database(page)).toEqual(committed);expect(await snapshot(page)).toEqual(after);await readable(page);
 for(const art of await page.locator('[data-art-state]:visible').all())await expect(art).toHaveAttribute('data-art-state','ready');await page.screenshot({path:info.outputPath('sync-'+kind+'-pending.png')});
 await page.getByTestId('reload-storage').click();await expect(page.getByTestId('save-status')).toHaveText('已保存');await expect(page.getByTestId('error')).toHaveCount(0);
 expect(await database(page)).toEqual(committed);expect(await snapshot(page)).toEqual(after);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(committed);expect(await snapshot(page)).toEqual(after);await expect(page.getByTestId('action-motion')).toHaveCount(0);
 await page.evaluate(()=>{const t=window as any;t.__m01RestoreCheckpoint?.();t.__m01RestoreRead?.();t.__m01SyncSender?.close();});
 await info.attach('confirmed-config-sync-recovery',{body:JSON.stringify({kind,formalCommand:record.intent.command,formalResult:record.result,seam:'Native checkpoint transaction completed before gated delivery; real native BC queued during busy; later native read abort or real versionchange closes Store repository',allGameRowsUnchangedOnReconnect:true}),contentType:'application/json'});
});
