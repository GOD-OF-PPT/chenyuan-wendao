import {ref,shallowRef,onScopeDispose} from 'vue';
import {useSession} from './session';
import {parseTrackingTarget,type TrackingTarget} from '../../src/full/goals.ts';
import {LocalExperienceRepository,LocalDataError,type LocalMeta,type LocalCommand,type RecordEntry} from './local-experience';
import {defaultPreferences,parsePreferences,publicId,validateRecord,sessionObservation,LOCAL_BYTE_LIMIT,LOCAL_RECORD_LIMIT,recordBytes,type Preferences,type Observation,type LocalRecord} from './local-events';

export function useLocalExperience(){
 const session=useSession();
 const preferences=shallowRef<Preferences>({...defaultPreferences}),preferencesPersisted=ref(false),ready=ref(false),busy=ref(false),pending=ref(0),status=ref('正在读取本地设置……'),available=ref(false);
 const count=ref<number|null>(null),dropped=ref(0),memory=shallowRef<LocalRecord[]>([]),listing=shallowRef<RecordEntry[]>([]),prepared=shallowRef<any|null>(null),missed=ref(0),memoryDropped=ref(0);
 const sessionId=crypto.randomUUID(),started=performance.now();let elapsed=0,memoryBytes=0,meta:LocalMeta|null=null,repo:LocalExperienceRepository|undefined,channel:BroadcastChannel|undefined,closed=false,generation=0,queue=Promise.resolve(),didSession=false;
 const now=()=>elapsed=Math.max(elapsed,Math.max(0,Math.floor(performance.now()-started)));
 function notify(){try{channel?.postMessage({changed:true});}catch{/* local database remains authoritative */}}
 function apply(value:LocalMeta,force=false){if(meta&&value.revision<meta.revision)return;const invalidate=meta&&(meta.epoch!==value.epoch||meta.preferenceRevision!==value.preferenceRevision);if(meta&&meta.epoch!==value.epoch)generation++;meta=value;count.value=value.eventCount;dropped.value=value.droppedCount;if(force||!busy.value&&preferencesPersisted.value){if(preferences.value.recording!==value.preferences.recording)generation++;preferences.value={...value.preferences};preferencesPersisted.value=true;}if(invalidate)prepared.value=null;}
 function temporary(row:LocalRecord){const rows=[...memory.value,row];memoryBytes+=recordBytes(row);while(rows.length>LOCAL_RECORD_LIMIT||memoryBytes>LOCAL_BYTE_LIMIT){memoryBytes-=recordBytes(rows.shift()!);memoryDropped.value++;}memory.value=rows;}
 function fault(){missed.value++;status.value='部分试玩记录未能生成；游戏存档状态不受影响。';}
 async function refresh(){if(!repo)return;try{apply(await repo.readMeta());}catch(e){available.value=false;status.value=e instanceof LocalDataError?e.message:'本地记录暂不可读，原数据未覆盖。';}}
 function record(observation:Observation){
  if(closed||!preferences.value.recording)return;if(!ready.value){missed.value++;return;}
  let row:LocalRecord;try{row={id:crypto.randomUUID(),sessionId,elapsedMs:now(),seed:null,observation:structuredClone(observation)};validateRecord(row);}catch{fault();return;}
  if(pending.value>=100){missed.value++;status.value='试玩记录排队过多，部分观察未记录；游戏仍可继续。';return;}
  const owner=generation,captured=meta?{commandId:row.id,runId:meta.epoch,expectedRevision:meta.controlRevision}:null;
  pending.value++;
  queue=queue.then(async()=>{if(owner!==generation||closed)return;if(repo&&available.value&&preferencesPersisted.value&&captured){try{apply(await repo.append(row,captured));notify();return;}catch(e){if(e instanceof LocalDataError&&['LOCAL_STALE','LOCAL_PAUSED'].includes(e.code)){await refresh();return;}available.value=false;status.value=(e instanceof LocalDataError?e.message:'试玩记录未写入。')+' 新记录仅在本页保留，请先导出。';}}
   if(owner===generation&&!closed)temporary(row);
  }).catch(()=>fault()).finally(()=>pending.value--);
 }
 async function init(){
  ready.value=false;count.value=null;listing.value=[];prepared.value=null;available.value=false;preferencesPersisted.value=false;
  try{repo=await LocalExperienceRepository.open(session.localDatabase,()=>{generation++;available.value=false;preferencesPersisted.value=false;preferences.value={...preferences.value,recording:false};prepared.value=null;count.value=null;status.value='本地记录库已升级，已停止采集；可在本页明确开启临时记录。';});if(closed){repo.close();return;}const value=await repo.readMeta();apply(value,true);preferencesPersisted.value=true;available.value=true;status.value='显示设置已保存；试玩记录仅在本机，不上传。';
   if('BroadcastChannel'in globalThis){channel=new BroadcastChannel(session.localChannel);channel.onmessage=()=>{void refresh();};}
  }catch(e){preferences.value={...defaultPreferences,recording:false};preferencesPersisted.value=false;available.value=false;status.value=(e instanceof LocalDataError?e.message:'本地设置无法读取，原数据已保留。')+' 当前使用默认显示设置，记录采集未开启。';}
  finally{ready.value=true;}
  if(!didSession){didSession=true;record(sessionObservation());}
 }
 async function setPreferences(patch:Partial<Preferences>){
  if(busy.value)return;let desired:Preferences;try{desired=parsePreferences({...preferences.value,...patch});}catch{status.value='显示设置取值无效，未改变。';return;}
  if(desired.recording!==preferences.value.recording)generation++;
  preferences.value=desired;prepared.value=null;busy.value=true;status.value='正在保存显示设置……';
  const intent:LocalCommand|undefined=meta?{commandId:crypto.randomUUID(),runId:meta.epoch,expectedRevision:meta.preferenceRevision}:undefined;
  try{if(!repo||!intent)throw new LocalDataError('LOCAL_DENIED','本地设置暂不可写。');const saved=await repo.setPreferences(intent,desired);apply(saved,true);available.value=true;preferencesPersisted.value=true;status.value=desired.recording?'显示设置已保存；试玩记录仅在本机，不上传。':'设置已保存，本地试玩记录已关闭。';notify();}
  catch(e){preferencesPersisted.value=false;if(e instanceof LocalDataError&&e.code==='LOCAL_STALE'&&repo){try{apply(await repo.readMeta(),true);preferencesPersisted.value=true;status.value='另一页面已改变设置，已读取最新值；本次选择未覆盖，请重新选择。';}catch{status.value='设置冲突且暂不可读取；仅在本页保留当前选择。';}}else status.value=(e instanceof LocalDataError?e.message:'显示设置未保存。')+' 当前选择仅在本页使用，刷新后会恢复已保存值。';}
  finally{busy.value=false;if(preferencesPersisted.value&&meta)apply(meta,true);}
 }
 async function showRecords(){await queue;if(!repo||!available.value){listing.value=[];return;}try{const result=await repo.list(20);apply(result.meta);listing.value=result.entries;}catch(e){status.value=e instanceof LocalDataError?e.message:'记录无法读取，原数据已保留。';}}
 async function clear(){if(busy.value)return;busy.value=true;generation++;prepared.value=null;const intent=meta?{commandId:crypto.randomUUID(),runId:meta.epoch,expectedRevision:meta.preferenceRevision}:null;
  try{if(!repo||!available.value||!intent)throw new LocalDataError('LOCAL_DENIED','无法核对旧本地数据，未清空。');apply(await repo.clear(intent),true);memory.value=[];memoryBytes=0;listing.value=[];memoryDropped.value=0;missed.value=0;status.value='本地试玩记录已清空；显示设置和游戏存档保留。';notify();}
  catch(e){status.value=e instanceof LocalDataError?e.message:'清空未完成，原记录保留。';}
  finally{busy.value=false;}
 }
 function clearMemory(){generation++;memory.value=[];memoryBytes=0;memoryDropped.value=0;prepared.value=null;status.value='本页临时记录已清除；旧本地数据未改变。';}
 async function prepareExport(scope:{runId:string|null;target:TrackingTarget}){
  const owner=generation,prefSnapshot=parsePreferences({...preferences.value}),target=parseTrackingTarget({...scope.target});
  await queue;let snapshot:{meta:LocalMeta;entries:RecordEntry[]}|null=null;
  if(repo)try{snapshot=await repo.dump();apply(snapshot.meta);}catch(e){status.value=(e instanceof LocalDataError?e.message:'旧本地记录不可读。')+' 导出只含当前可核对数据。';}
  if(snapshot&&repo)apply(await repo.readMeta());
  if(closed||owner!==generation||JSON.stringify(prefSnapshot)!==JSON.stringify(preferences.value)||snapshot&&meta&&(snapshot.meta.epoch!==meta.epoch||snapshot.meta.preferenceRevision!==meta.preferenceRevision))throw new LocalDataError('LOCAL_STALE','记录或设置已改变，请重新预览。');
  const data={format:'chenyuan-local-playtest',version:1,notASave:true,sessionId,capturedAtSessionMs:now(),policy:{automaticallyUploaded:false,containsPlayerName:false,containsSave:false,containsDeviceFingerprint:false,seed:'本版本确定性规则没有随机种子，所有seed均为null。',time:'elapsedMs是观察发生时相对该sessionId的真实毫秒；包括阅读停留，不输入Game规则。关闭网页不代表失败。',replay:'replay观察已有回执，不是再次行动；state是观察时状态，result是原指令结果，原行动时间未知。',coverage:'仅为开启采集且成功观察的必要行为；缺失/关闭/回收/退出可能导致不完整，不是完整存档或事实唯一依据。',snapshot:'导出为预览时快照，不含预览之后的新记录。'},preferences:{version:1,values:prefSnapshot,persisted:preferencesPersisted.value&&!busy.value&&JSON.stringify(prefSnapshot)===JSON.stringify(snapshot?.meta.preferences),tracking:{runId:publicId(scope.runId),identifiersRedacted:!!scope.runId&&!publicId(scope.runId),target,meaning:'预览请求时的追踪显示快照；目标按人生隔离，不会恢复Game。'}},retention:{maxRecords:LOCAL_RECORD_LIMIT,maxBytes:LOCAL_BYTE_LIMIT,droppedPersisted:snapshot?.meta.droppedCount??null,droppedMemory:memoryDropped.value,missedObservationsInThisSession:missed.value},persistent:{available:!!snapshot,revision:snapshot?.meta.revision??null,epoch:snapshot?.meta.epoch??null,preferenceRevision:snapshot?.meta.preferenceRevision??null,controlRevision:snapshot?.meta.controlRevision??null,entries:snapshot?.entries??[]},memoryOnly:structuredClone(memory.value)};
  for(const entry of data.persistent.entries)validateRecord(entry.record);for(const row of data.memoryOnly)validateRecord(row);const scoped=session.kind==='demo'?{...data,captureContext:{kind:'demo',nodeId:session.node!.nodeId,sourceDigest:session.node!.sourceDigest}}:data;prepared.value=scoped;return scoped;
 }
 async function validatedDownload(){const data=prepared.value;if(!data)return null;if(data.persistent.available&&repo){const latest=await repo.readMeta();apply(latest);if(prepared.value!==data||latest.epoch!==data.persistent.epoch||latest.preferenceRevision!==data.persistent.preferenceRevision)throw new LocalDataError('LOCAL_STALE','记录或设置已改变，请重新预览。');}return data;}
 async function reconnect(){if(busy.value||!ready.value)return;ready.value=false;await queue;repo?.close();channel?.close();repo=undefined;channel=undefined;meta=null;await init();}
 onScopeDispose(()=>{closed=true;generation++;repo?.close();channel?.close();});
 return{preferences,preferencesPersisted,ready,busy,pending,status,available,count,dropped,memory,listing,prepared,missed,memoryDropped,init,record,fault,setPreferences,showRecords,clear,clearMemory,prepareExport,validatedDownload,reconnect,flush:()=>queue};
}
