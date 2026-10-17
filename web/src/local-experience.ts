import {defaultPreferences,parsePreferences,publicId,validateRecord,recordKey,recordProof,recordBytes,LOCAL_RECORD_LIMIT,LOCAL_BYTE_LIMIT,type Preferences,type LocalRecord} from './local-events';

export const LOCAL_DB_NAME='chenyuan-local-experience-v1';
const META='meta',EVENTS='events';
export class LocalDataError extends Error{constructor(public code:string,message:string){super(message);this.name='LocalDataError';}}
const invalid=()=>new LocalDataError('LOCAL_DATA_INVALID','本地记录或设置格式无法核对，原数据已保留。');
function failure(value:unknown){if(value instanceof LocalDataError)return value;const name=value&&typeof value==='object'&&'name'in value?String(value.name):'';return new LocalDataError(name==='QuotaExceededError'?'LOCAL_QUOTA':name==='AbortError'?'LOCAL_ABORTED':name==='VersionError'?'LOCAL_VERSION':'LOCAL_DENIED',name==='QuotaExceededError'?'本地记录空间不足，未写入本次记录。':name==='VersionError'?'本地记录来自较新版本，原数据未覆盖。':'本地记录存储暂不可用，游戏存档状态单独显示。');}
export type LocalMeta={format:'chenyuan-local-state';version:1;epoch:string;revision:number;preferenceRevision:number;controlRevision:number;preferences:Preferences;eventCount:number;eventBytes:number;droppedCount:number;lastControl:{id:string;kind:'preferences'|'clear';payload:string}|null};
export type LocalCommand={commandId:string;runId:string;expectedRevision:number};
type StoredRecord={id:string;sourceKey:string;bytes:number;data:LocalRecord};
export type RecordEntry={sequence:number;record:LocalRecord};
function fresh():LocalMeta{return{format:'chenyuan-local-state',version:1,epoch:crypto.randomUUID(),revision:0,preferenceRevision:0,controlRevision:0,preferences:{...defaultPreferences},eventCount:0,eventBytes:0,droppedCount:0,lastControl:null};}
function parseMeta(value:unknown):LocalMeta{
 const v=value as LocalMeta;const keys=['format','version','epoch','revision','preferenceRevision','controlRevision','preferences','eventCount','eventBytes','droppedCount','lastControl'];
 if(!v||typeof v!=='object'||Object.keys(v).sort().join(',')!==keys.sort().join(',')||v.format!=='chenyuan-local-state'||v.version!==1||!publicId(v.epoch))throw invalid();
 for(const n of [v.revision,v.preferenceRevision,v.controlRevision,v.eventCount,v.eventBytes,v.droppedCount])if(!Number.isSafeInteger(n)||n<0)throw invalid();
 if(v.eventCount>LOCAL_RECORD_LIMIT||v.eventBytes>LOCAL_BYTE_LIMIT)throw invalid();
 try{parsePreferences(v.preferences);if(v.lastControl){if(Object.keys(v.lastControl).sort().join(',')!=='id,kind,payload'||!publicId(v.lastControl.id)||!['preferences','clear'].includes(v.lastControl.kind))throw invalid();if(v.lastControl.kind==='preferences')parsePreferences(JSON.parse(v.lastControl.payload));else if(v.lastControl.payload!=='')throw invalid();}}catch{throw invalid();}
 return structuredClone(v);
}
function command(value:LocalCommand){if(!value||Object.keys(value).sort().join(',')!=='commandId,expectedRevision,runId'||!publicId(value.commandId)||!publicId(value.runId)||!Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0)throw invalid();}
function stored(value:unknown):StoredRecord{const v=value as StoredRecord;try{if(!v||Object.keys(v).sort().join(',')!=='bytes,data,id,sourceKey')throw invalid();validateRecord(v.data);if(v.id!==v.data.id||v.sourceKey!==recordKey(v.data)||v.bytes!==recordBytes(v.data))throw invalid();return v;}catch{throw invalid();}}
function next(meta:LocalMeta){if(meta.revision===Number.MAX_SAFE_INTEGER)throw invalid();return{...meta,revision:meta.revision+1};}
export class LocalExperienceRepository{
 private closed=false;
 private constructor(private db:IDBDatabase,private invalidated?:()=>void){db.onversionchange=()=>{this.close();this.invalidated?.();};}
 static open(name=LOCAL_DB_NAME,onInvalidated?:()=>void):Promise<LocalExperienceRepository>{return new Promise((resolve,reject)=>{
  let request:IDBOpenDBRequest,terminal=false;
  try{request=indexedDB.open(name,1);}catch(e){reject(failure(e));return;}
  const stop=(e:unknown)=>{if(!terminal){terminal=true;reject(failure(e));}};
  request.onblocked=()=>stop(new LocalDataError('LOCAL_BLOCKED','另一页面占用本地记录库，游戏仍可继续。'));
  request.onerror=()=>stop(request.error);
  request.onupgradeneeded=()=>{try{if(terminal){request.transaction?.abort();return;}const db=request.result;db.createObjectStore(META).put(fresh(),'state');const events=db.createObjectStore(EVENTS,{autoIncrement:true});events.createIndex('id','id',{unique:true});events.createIndex('sourceKey','sourceKey',{unique:true});}catch(e){request.transaction?.abort();stop(e);}};
  request.onsuccess=()=>{const db=request.result;try{if(terminal){db.close();return;}if(!db.objectStoreNames.contains(META)||!db.objectStoreNames.contains(EVENTS))throw invalid();const tx=db.transaction(EVENTS,'readonly');if(!tx.objectStore(EVENTS).indexNames.contains('id')||!tx.objectStore(EVENTS).indexNames.contains('sourceKey'))throw invalid();terminal=true;resolve(new LocalExperienceRepository(db,onInvalidated));}catch(e){db.close();stop(e);}};
 });}
 close(){if(!this.closed){this.closed=true;this.db.close();}}
 private transaction<T>(mode:IDBTransactionMode,work:(tx:IDBTransaction,meta:LocalMeta,done:(value:T)=>void,abort:(error:unknown)=>void)=>void):Promise<T>{
  if(this.closed)return Promise.reject(new LocalDataError('LOCAL_CLOSED','本地记录连接已关闭，原数据未覆盖。'));
  return new Promise((resolve,reject)=>{let tx:IDBTransaction,value:T,ready=false,error:unknown;try{tx=this.db.transaction([META,EVENTS],mode);}catch(e){reject(failure(e));return;}
   const abort=(e:unknown)=>{error=e;try{tx.abort();}catch{reject(failure(e));}};
   tx.onerror=()=>{error??=tx.error;};tx.onabort=()=>reject(failure(error??tx.error??new DOMException('本地事务中断','AbortError')));tx.oncomplete=()=>ready?resolve(value):reject(invalid());
   const read=tx.objectStore(META).get('state');read.onsuccess=()=>{try{work(tx,parseMeta(read.result),v=>{value=v;ready=true;},abort);}catch(e){abort(e);}};
  });
 }
 readMeta(){return this.transaction<LocalMeta>('readonly',(_tx,meta,done)=>done(meta));}
 append(input:LocalRecord,token:LocalCommand){const record=structuredClone(input),intent={...token};validateRecord(record);command(intent);if(intent.commandId!==record.id)throw invalid();
  return this.transaction<LocalMeta>('readwrite',(tx,meta,done,abort)=>{
   if(meta.epoch!==intent.runId||meta.controlRevision!==intent.expectedRevision)throw new LocalDataError('LOCAL_STALE','采集范围已改变，旧排队记录未重新写入。');
   if(!meta.preferences.recording)throw new LocalDataError('LOCAL_PAUSED','本地试玩记录已关闭。');
   const events=tx.objectStore(EVENTS),byId=events.index('id').get(record.id);
   byId.onsuccess=()=>{try{if(byId.result){if(JSON.stringify(stored(byId.result).data)!==JSON.stringify(record))throw new LocalDataError('LOCAL_ID_REUSED','记录编号已被另一内容使用。');done(meta);return;}const existing=events.index('sourceKey').get(recordKey(record));existing.onsuccess=()=>{try{
    if(existing.result){if(recordProof(stored(existing.result).data)!==recordProof(record))throw new LocalDataError('LOCAL_ID_REUSED','同一指令记录不一致，未覆盖旧记录。');done(meta);return;}
    const bytes=recordBytes(record),updated=next(meta);updated.eventCount++;updated.eventBytes+=bytes;events.add({id:record.id,sourceKey:recordKey(record),bytes,data:record} satisfies StoredRecord);
    const oldest=events.openCursor();oldest.onsuccess=()=>{try{const cursor=oldest.result;if(updated.eventCount>LOCAL_RECORD_LIMIT||updated.eventBytes>LOCAL_BYTE_LIMIT){if(!cursor)throw invalid();const old=stored(cursor.value);updated.eventCount--;updated.eventBytes-=old.bytes;updated.droppedCount++;cursor.delete();cursor.continue();}else{parseMeta(updated);tx.objectStore(META).put(updated,'state');done(updated);}}catch(e){abort(e);}};
   }catch(e){abort(e);}};}catch(e){abort(e);}};
  });
 }
 private control(intent:LocalCommand,kind:'preferences'|'clear',prefs?:Preferences){command(intent);const payload=prefs?JSON.stringify(parsePreferences(prefs)):'';
  return this.transaction<LocalMeta>('readwrite',(tx,meta,done)=>{
   if(meta.lastControl?.id===intent.commandId){if(meta.lastControl.kind!==kind||meta.lastControl.payload!==payload)throw new LocalDataError('LOCAL_ID_REUSED','设置编号已用于其他内容。');done(meta);return;}
   if(meta.epoch!==intent.runId||meta.preferenceRevision!==intent.expectedRevision)throw new LocalDataError('LOCAL_STALE','另一页面已改变设置，请读取后重试。');
   const updated=next(meta);updated.preferenceRevision++;updated.lastControl={id:intent.commandId,kind,payload};
   if(kind==='clear'){tx.objectStore(EVENTS).clear();updated.epoch=crypto.randomUUID();updated.controlRevision++;updated.eventCount=0;updated.eventBytes=0;updated.droppedCount=0;}
   else{updated.preferences=JSON.parse(payload);if(meta.preferences.recording!==updated.preferences.recording)updated.controlRevision++;}
   parseMeta(updated);tx.objectStore(META).put(updated,'state');done(updated);
  });
 }
 setPreferences(intent:LocalCommand,preferences:Preferences){return this.control({...intent},'preferences',preferences);}
 clear(intent:LocalCommand){return this.control({...intent},'clear');}
 list(limit=20){if(!Number.isSafeInteger(limit)||limit<1||limit>LOCAL_RECORD_LIMIT)throw invalid();return this.transaction<{meta:LocalMeta;entries:RecordEntry[]}>('readonly',(tx,meta,done,abort)=>{const entries:RecordEntry[]=[],request=tx.objectStore(EVENTS).openCursor(null,'prev');request.onsuccess=()=>{try{const cursor=request.result;if(!cursor||entries.length===limit){done({meta,entries});return;}entries.push({sequence:Number(cursor.key),record:structuredClone(stored(cursor.value).data)});cursor.continue();}catch(e){abort(e);}};});}
 dump(){return this.transaction<{meta:LocalMeta;entries:RecordEntry[]}>('readonly',(tx,meta,done,abort)=>{const entries:RecordEntry[]=[],request=tx.objectStore(EVENTS).openCursor();let bytes=0;request.onsuccess=()=>{try{const cursor=request.result;if(!cursor){if(entries.length!==meta.eventCount||bytes!==meta.eventBytes)throw invalid();done({meta,entries});return;}const row=stored(cursor.value);entries.push({sequence:Number(cursor.key),record:structuredClone(row.data)});bytes+=row.bytes;cursor.continue();}catch(e){abort(e);}};});}
}
