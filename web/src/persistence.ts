import { advance, createAdventure, parseAdventure, validateAdventure } from '../../src/game/adventure.ts';
import type { Adventure, GameCommand } from '../../src/game/adventure.ts';
import { RuleError } from '../../src/game/engine.ts';
export const DB_NAME='chenyuan-playable-v1';
type Token={runId:string;revision:number};
const token=(g:Adventure):Token=>({runId:g.core.runId,revision:g.core.revision});
const same=(g:Adventure|undefined,t:Token|null)=>g?!!t&&g.core.runId===t.runId&&g.core.revision===t.revision:t===null;
function fingerprint(v:unknown):string { if(Array.isArray(v))return '['+v.map(fingerprint).join(',')+']'; if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+fingerprint((v as Record<string,unknown>)[k])).join(',')+'}';return JSON.stringify(v)??'undefined'; }
/** All state and receipt writes share one readwrite transaction. No awaits inside it. */
export class SaveRepository {
  private db:IDBDatabase;
  private constructor(db:IDBDatabase){this.db=db;db.onversionchange=()=>db.close();}
  static async open():Promise<SaveRepository>{
    if(!globalThis.indexedDB)throw new Error('此浏览器无法保存进度，请使用允许本地存储的浏览器。');
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('state');db.createObjectStore('receipts');};
      req.onsuccess=()=>resolve(new SaveRepository(req.result));req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('存档被另一标签页占用，请关闭旧页面后重试。'));
    });
  }
  load():Promise<Adventure|null>{return new Promise((resolve,reject)=>{const tx=this.db.transaction('state','readonly');const req=tx.objectStore('state').get('current');let value:Adventure|null=null;let error:unknown;req.onsuccess=()=>{try{if(req.result){validateAdventure(req.result);value=req.result;}}catch(e){error=e;tx.abort();}};tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(error??tx.error);});}
  initialize(name:string):Promise<Adventure>{
    return this.write((store,_receipts,current)=>{if(current){validateAdventure(current);return current;}const fresh=createAdventure(name,crypto.randomUUID());store.put(fresh,'current');return fresh;});
  }
  execute(command:GameCommand):Promise<Adventure>{
    return new Promise((resolve,reject)=>{
      const tx=this.db.transaction(['state','receipts'],'readwrite');const store=tx.objectStore('state');const receipts=tx.objectStore('receipts');let result:Adventure;let failure:unknown;
      const stop=(e:unknown)=>{failure=e;tx.abort();};
      const currentReq=store.get('current');
      currentReq.onsuccess=()=>{try{
        const current:Adventure=currentReq.result;validateAdventure(current);
        if(command.runId!==current.core.runId)throw new RuleError('RUN_MISMATCH','已切换存档，请刷新进度');
        const key=command.runId+':'+command.commandId;const receiptReq=receipts.get(key);
        receiptReq.onsuccess=()=>{try{
          const print=fingerprint(command);
          if(receiptReq.result){if(receiptReq.result.fingerprint!==print)throw new RuleError('COMMAND_ID_REUSED','指令编号重复');result=current;return;}
          result=advance(current,command);
          if(command.type==='BREAKTHROUGH')store.put(current,'checkpoint');
          store.put(result,'current');receipts.put({fingerprint:print,revision:result.core.revision},key);
        }catch(e){stop(e);}};
      }catch(e){stop(e);}};
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure??tx.error??new Error('保存失败，未执行本次行动。'));tx.onerror=()=>{};
    });
  }
  private write(fn:(state:IDBObjectStore,receipts:IDBObjectStore,current:Adventure|undefined)=>Adventure):Promise<Adventure>{
    return new Promise((resolve,reject)=>{const tx=this.db.transaction(['state','receipts'],'readwrite');const store=tx.objectStore('state');const req=store.get('current');let result:Adventure;let failure:unknown;
      req.onsuccess=()=>{try{result=fn(store,tx.objectStore('receipts'),req.result);}catch(e){failure=e;tx.abort();}};
      tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure??tx.error??new Error('保存失败'));tx.onerror=()=>{};
    });
  }
  replace(imported:Adventure,expected:Token|null):Promise<Adventure>{
    validateAdventure(imported);
    return this.write((store,receipts,current)=>{
      if(!same(current,expected))throw new RuleError('STALE_REVISION','另一页面已推进进度，请重新确认');
      const next=parseAdventure(JSON.stringify(imported));next.core.runId=crypto.randomUUID();next.core.revision=0;
      if(next.core.activeEvent)next.core.activeEvent.instanceId=next.core.runId+':temple';
      validateAdventure(next);if(current)store.put(current,'previous');store.delete('checkpoint');receipts.clear();store.put(next,'current');return next;
    });
  }
  async restoreCheckpoint(expected:Token):Promise<Adventure>{
    const checkpoint=await new Promise<Adventure>((resolve,reject)=>{const tx=this.db.transaction('state','readonly');const req=tx.objectStore('state').get('checkpoint');req.onsuccess=()=>req.result?resolve(req.result):reject(new Error('尚无突破前检查点'));req.onerror=()=>reject(req.error);});
    return this.replace(checkpoint,expected);
  }
  close(){this.db.close();}
}
export { token };
