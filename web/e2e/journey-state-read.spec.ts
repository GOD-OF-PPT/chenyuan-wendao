import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {readJourneyState,readJourneyDatabase} from './idle-route-support';
import {snapshot,activitySnapshot} from './support';
import {importRecoveryFixture,recoveryCursorDatabase as recoveryDatabase,recoveryDatabase as currentDatabase,stored} from './idle-recovery-ui-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
async function probe(page:any){await page.route('**/journey-read-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated readonly verifier probe</title>'}));await page.goto('/journey-read-probe');}
async function observedRead(page:any,expected:'json'|'structured'){
 const evaluate=page.evaluate;let mode:string|undefined;page.evaluate=async function(...args:any[]){const value=await evaluate.apply(this,args);mode=value?.transport;return value;};
 try{const actual=await readJourneyDatabase(page);expect(mode).toBe(expected);expect(actual).toEqual(await readJourneyDatabase(page,'structured'));expect(actual).toEqual(await recoveryDatabase(page));return actual;}finally{page.evaluate=evaluate;}
}

test('JREAD-1 a readonly joint record read cannot create a missing Game database',async({page})=>{
 await probe(page);expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await expect(readJourneyState(page)).rejects.toThrow('Journey read cannot create Game DB');
 expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await expect(readJourneyDatabase(page)).rejects.toThrow('Readonly catalogue cannot create Game DB');
 await expect(readJourneyDatabase(page,'structured')).rejects.toThrow('Readonly catalogue cannot create Game DB');
 expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await expect(currentDatabase(page)).rejects.toThrow('Readonly catalogue cannot create Game DB');expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
 await expect(recoveryDatabase(page)).rejects.toThrow('Readonly M04 observer cannot create Game storage');expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
});

test('JREAD-2 the whole pair preserves undefined dates arrays and nulls exactly like both original reads without writes',async({page})=>{
 await probe(page);
 await page.evaluate(()=>new Promise<void>((accept,reject)=>{const r=indexedDB.open('chenyuan-playable-v1',9);r.onupgradeneeded=()=>{r.result.createObjectStore('full-state');r.result.createObjectStore('probe-marker');};r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['full-state','probe-marker'],'readwrite');tx.objectStore('full-state').put({title:'完整读取 · 玉简',absent:undefined,at:new Date('2030-01-01T00:00:00Z'),list:[null,0,'一'],nested:{enabled:false}},'current');tx.objectStore('full-state').put({id:'probe-only',nextCommand:null,extra:undefined},'activity');tx.objectStore('probe-marker').put({unchanged:true},'marker');tx.oncomplete=()=>{db.close();accept();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
 // Raw value fixtures exercise the verifier protocol, never a normal gameplay route.
 const before=await recoveryDatabase(page),oldGame=await snapshot(page),oldActivity=await activitySnapshot(page),pair=await readJourneyState(page);
 expect(pair).toEqual({game:oldGame,activity:oldActivity});expect(pair.game).toHaveProperty('absent',undefined);expect(pair.game.at).toEqual(new Date('2030-01-01T00:00:00Z'));expect(pair.game.list).toEqual([null,0,'一']);expect(pair.activity).toHaveProperty('extra',undefined);expect(pair.activity.nextCommand).toBeNull();expect(await recoveryDatabase(page)).toEqual(before);
 expect(await readJourneyDatabase(page)).toEqual(before);
 await page.evaluate(()=>new Promise<void>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('probe-marker','readwrite'),store=tx.objectStore('probe-marker');
  for(const key of [17,new Date('2031-02-03T00:00:00Z'),new Uint8Array([0,255]).buffer,['完整',2]])store.put({key,bytes:new Uint8Array([0,255]),absent:undefined,list:[null,0,false]},key);
  store.put(undefined,'undefined-value');tx.oncomplete=()=>{db.close();accept();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
 const complete=await recoveryDatabase(page);
 // Check binary key bytes before the browser transport serializes ArrayBuffer keys.
 await page.evaluate(()=>{const get=IDBObjectStore.prototype.getAllKeys,w=window as any;w.__jreadRestoreKeys=()=>{IDBObjectStore.prototype.getAllKeys=get;};IDBObjectStore.prototype.getAllKeys=function(){const request=get.call(this);if(this.name==='probe-marker')request.addEventListener('success',()=>{w.__jreadBinaryKey=request.result.map((key,index)=>key instanceof ArrayBuffer?{index,bytes:[...new Uint8Array(key)]}:null).filter(Boolean);});return request;};});
 let bulk:any;try{bulk=await readJourneyDatabase(page);}finally{await page.evaluate(()=>{(window as any).__jreadRestoreKeys();});}
 const binary=await page.evaluate(()=>(window as any).__jreadBinaryKey);expect(binary).toHaveLength(1);expect(binary[0].bytes).toEqual([0,255]);expect(bulk.rows['probe-marker'][binary[0].index].value.bytes).toEqual(new Uint8Array([0,255]));
 expect(bulk).toEqual(complete);expect(bulk.rows['probe-marker']).toHaveLength(6);expect(bulk.rows['probe-marker'].find((r:any)=>r.key==='undefined-value')).toHaveProperty('value',undefined);
 await page.evaluate(()=>{const get=IDBObjectStore.prototype.getAll;IDBObjectStore.prototype.getAll=function(){IDBObjectStore.prototype.getAll=get;const request=get.call(this);this.transaction.abort();return request;};});
 await expect(readJourneyDatabase(page)).rejects.toThrow();expect(await recoveryDatabase(page)).toEqual(complete);expect(await readJourneyDatabase(page)).toEqual(complete);
 expect(await currentDatabase(page)).toEqual(complete);
 await observedRead(page,'structured');
 // After every original typed assertion, replace only this disposable raw fixture to exercise the JSON-only transport.
 await page.evaluate(()=>new Promise<void>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction([...db.objectStoreNames],'readwrite');for(const name of db.objectStoreNames)tx.objectStore(name).clear();tx.objectStore('full-state').put({text:'完整\u0000玉简\ud800',cost:31.25,nested:{enabled:false,empty:null},list:[0,false,null,'<img src=x>']},'current');tx.objectStore('probe-marker').put({literal:{retained:true},text:'null is not undefined'},['nested',2]);tx.oncomplete=()=>{db.close();accept();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
 const json=await observedRead(page,'json');expect(json.rows['full-state'][0].value.text).toBe('完整\u0000玉简\ud800');expect(json.rows['probe-marker'][0].value).toHaveProperty('literal',{retained:true});expect(Object.prototype).not.toHaveProperty('literal');
 for(const kind of ['undefined','date','binary','nonfinite','negative-zero','sparse','shared','cycle','prototype-key']as const){
  await page.evaluate(kind=>new Promise<void>((accept,reject)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('probe-marker','readwrite'),shared={same:true},cycle:any={};cycle.self=cycle;const values={undefined:{key:undefined},date:new Date('2035-01-01'),binary:new Uint8Array([1,255]),nonfinite:[NaN,Infinity,-Infinity],'negative-zero':-0,sparse:[,1],shared:{a:shared,b:shared},cycle,'prototype-key':{['__proto__']:{literal:true}}};tx.objectStore('probe-marker').put(values[kind],'fallback');tx.oncomplete=()=>{db.close();accept();};tx.onabort=()=>{db.close();reject(tx.error);};};}),kind);
  await observedRead(page,'structured');
 }
});

test('JREAD-3 real accepted failed and retried activity pairs equal both original complete records and the formal saved Game',async({page})=>{
 const d=driver('leave','sword');d.go('cave');const game=await importRecoveryFixture(page,d.game);
 expect(await readJourneyState(page)).toEqual({game:await snapshot(page),activity:await activitySnapshot(page)});
 await page.getByTestId('cultivate').click();await expect.poll(async()=>(await activitySnapshot(page))?.status).toBe('running');const accepted=await readJourneyState(page),a=accepted.activity,before=await recoveryDatabase(page);expect(accepted.game).toEqual(game);expect(accepted).toEqual({game:await snapshot(page),activity:await activitySnapshot(page)});
 expect(await readJourneyDatabase(page)).toEqual(before);
 expect(await currentDatabase(page)).toEqual(before);
 await observedRead(page,'json');
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v:any,k?:IDBValidKey){if(this.name==='full-receipts'&&v?.input?.kind==='TICK'){IDBObjectStore.prototype.put=put;throw new DOMException('JREAD isolated real tick quota','QuotaExceededError');}return k===undefined?put.call(this,v):put.call(this,v,k);};});
 await page.clock.fastForward(a.cycleMs-1);expect(await readJourneyState(page)).toEqual(accepted);expect(await recoveryDatabase(page)).toEqual(before);await page.clock.fastForward(1);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await readJourneyState(page)).toEqual(accepted);expect(await recoveryDatabase(page)).toEqual(before);
 expect(await readJourneyDatabase(page)).toEqual(before);
 expect(await currentDatabase(page)).toEqual(before);
 await page.getByTestId('retry').click();await expect.poll(async()=>(await activitySnapshot(page)).completedCycles).toBe(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');const pair=await readJourneyState(page),raw=await recoveryDatabase(page),formal=resolve(game,a.nextCommand);expect(pair).toEqual({game:await snapshot(page),activity:await activitySnapshot(page)});expect(pair.game).toEqual(formal.nextState);expect(pair.game).toEqual(stored(raw,'current'));expect(pair.activity).toEqual(stored(raw,'activity'));const receipts=raw.rows['full-receipts'].filter((r:any)=>r.key===a.runId+':'+a.nextCommand.commandId);expect(receipts).toHaveLength(1);const receipt=receipts[0].value;expect(receipt.result).toEqual(formal.result);if(receipt.version===2)expect(receipt.proof.stateAfter).toEqual(pair.game);else{expect(receipt.version).toBe(1);expect(receipt).not.toHaveProperty('proof');expect(Object.keys(receipt).sort()).toEqual(['format','version','input','fingerprint','activity','command','result'].sort());}expect(receipt.activity).toEqual(pair.activity);
 expect(await readJourneyDatabase(page)).toEqual(raw);
 expect(await currentDatabase(page)).toEqual(raw);
 await observedRead(page,'json');
});
