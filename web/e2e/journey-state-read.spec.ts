import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {readJourneyState,readJourneyDatabase} from './idle-route-support';
import {snapshot,activitySnapshot} from './support';
import {importRecoveryFixture,recoveryDatabase,stored} from './idle-recovery-ui-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
async function probe(page:any){await page.route('**/journey-read-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated readonly verifier probe</title>'}));await page.goto('/journey-read-probe');}

test('JREAD-1 a readonly joint record read cannot create a missing Game database',async({page})=>{
 await probe(page);expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await expect(readJourneyState(page)).rejects.toThrow('Journey read cannot create Game DB');
 expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await expect(readJourneyDatabase(page)).rejects.toThrow('Readonly catalogue cannot create Game DB');
 expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
});

test('JREAD-2 the whole pair preserves undefined dates arrays and nulls exactly like both original reads without writes',async({page})=>{
 await probe(page);
 await page.evaluate(()=>new Promise<void>((accept,reject)=>{const r=indexedDB.open('chenyuan-playable-v1',9);r.onupgradeneeded=()=>{r.result.createObjectStore('full-state');r.result.createObjectStore('probe-marker');};r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['full-state','probe-marker'],'readwrite');tx.objectStore('full-state').put({title:'完整读取 · 玉简',absent:undefined,at:new Date('2030-01-01T00:00:00Z'),list:[null,0,'一'],nested:{enabled:false}},'current');tx.objectStore('full-state').put({id:'probe-only',nextCommand:null,extra:undefined},'activity');tx.objectStore('probe-marker').put({unchanged:true},'marker');tx.oncomplete=()=>{db.close();accept();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
 // Raw value fixtures exercise the verifier protocol, never a normal gameplay route.
 const before=await recoveryDatabase(page),oldGame=await snapshot(page),oldActivity=await activitySnapshot(page),pair=await readJourneyState(page);
 expect(pair).toEqual({game:oldGame,activity:oldActivity});expect(pair.game).toHaveProperty('absent',undefined);expect(pair.game.at).toEqual(new Date('2030-01-01T00:00:00Z'));expect(pair.game.list).toEqual([null,0,'一']);expect(pair.activity).toHaveProperty('extra',undefined);expect(pair.activity.nextCommand).toBeNull();expect(await recoveryDatabase(page)).toEqual(before);
 expect(await readJourneyDatabase(page)).toEqual(before);
 await page.evaluate(()=>new Promise<void>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('probe-marker','readwrite'),store=tx.objectStore('probe-marker');
  for(const key of [17,new Date('2031-02-03T00:00:00Z'),new Uint8Array([0,255]).buffer,['完整',2]])store.put({key,absent:undefined,list:[null,0,false]},key);
  store.put(undefined,'undefined-value');tx.oncomplete=()=>{db.close();accept();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
 const complete=await recoveryDatabase(page),bulk=await readJourneyDatabase(page);
 expect(bulk).toEqual(complete);expect(bulk.rows['probe-marker']).toHaveLength(6);expect(bulk.rows['probe-marker'].find((r:any)=>r.key==='undefined-value')).toHaveProperty('value',undefined);
 await page.evaluate(()=>{const get=IDBObjectStore.prototype.getAll;IDBObjectStore.prototype.getAll=function(){IDBObjectStore.prototype.getAll=get;const request=get.call(this);this.transaction.abort();return request;};});
 await expect(readJourneyDatabase(page)).rejects.toThrow();expect(await recoveryDatabase(page)).toEqual(complete);expect(await readJourneyDatabase(page)).toEqual(complete);
});

test('JREAD-3 real accepted failed and retried activity pairs equal both original complete records and the formal saved Game',async({page})=>{
 const d=driver('leave','sword');d.go('cave');const game=await importRecoveryFixture(page,d.game);
 expect(await readJourneyState(page)).toEqual({game:await snapshot(page),activity:await activitySnapshot(page)});
 await page.getByTestId('cultivate').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const accepted=await readJourneyState(page),a=accepted.activity,before=await recoveryDatabase(page);expect(accepted.game).toEqual(game);expect(accepted).toEqual({game:await snapshot(page),activity:await activitySnapshot(page)});
 expect(await readJourneyDatabase(page)).toEqual(before);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(this.name==='full-receipts'&&v?.input?.kind==='TICK'){IDBObjectStore.prototype.put=put;throw new DOMException('JREAD isolated real tick quota','QuotaExceededError');}return k===undefined?put.call(this,v):put.call(this,v,k);};});
 await page.clock.fastForward(a.cycleMs-1);expect(await readJourneyState(page)).toEqual(accepted);expect(await recoveryDatabase(page)).toEqual(before);await page.clock.fastForward(1);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await readJourneyState(page)).toEqual(accepted);expect(await recoveryDatabase(page)).toEqual(before);
 expect(await readJourneyDatabase(page)).toEqual(before);
 await page.getByTestId('retry').click();await expect.poll(async()=>(await activitySnapshot(page)).completedCycles).toBe(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');const pair=await readJourneyState(page),raw=await recoveryDatabase(page),formal=resolve(game,a.nextCommand);expect(pair).toEqual({game:await snapshot(page),activity:await activitySnapshot(page)});expect(pair.game).toEqual(formal.nextState);expect(pair.game).toEqual(stored(raw,'current'));expect(pair.activity).toEqual(stored(raw,'activity'));const receipts=raw.rows['full-receipts'].filter((r:any)=>r.key===a.runId+':'+a.nextCommand.commandId);expect(receipts).toHaveLength(1);const receipt=receipts[0].value;expect(receipt.result).toEqual(formal.result);if(receipt.version===2)expect(receipt.proof.stateAfter).toEqual(pair.game);else{expect(receipt.version).toBe(1);expect(receipt).not.toHaveProperty('proof');expect(Object.keys(receipt).sort()).toEqual(['format','version','input','fingerprint','activity','command','result'].sort());}expect(receipt.activity).toEqual(pair.activity);
 expect(await readJourneyDatabase(page)).toEqual(raw);
});
