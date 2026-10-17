import * as C from '../../src/full/content.ts';
import {stories} from '../../src/full/events.ts';
import {currentVersions,type SaveVersions} from '../../src/full/versions.ts';
import {previewAction,type ResourceDeficit} from '../../src/full/queries.ts';
import type {Action,Command,Game} from '../../src/full/types.ts';
import type {ActionResult} from '../../src/full/contracts.ts';

export const LOCAL_RECORD_LIMIT=1000,LOCAL_BYTE_LIMIT=1_000_000;
export type Preferences={fontScale:1|1.5|2;reduceMotion:boolean;recording:boolean};
type ObservationVersions=Omit<SaveVersions,'contentVersion'|'balanceVersion'>&{contentVersion:string;balanceVersion:string};
export const defaultPreferences:Readonly<Preferences>=Object.freeze({fontScale:1,reduceMotion:false,recording:true});
export type ObservationKind='session'|'resume'|'sync'|'new_game'|'restart'|'import'|'restore'|'action'|'replay'|'save_error'|'input_error';
export type PublicState={realm:C.RealmId;location:C.LocationId;months:number;xp:number;hp:number;mp:number;stones:number;wins:number;inventory:Record<string,number>};
type PublicAction=Record<string,string|number|{item:string;quantity:number}>;
type PublicResult=Omit<ActionResult,'commandId'|'runId'|'type'|'versions'|'stopReason'>&{stopCode:string|null};
export type Observation={kind:ObservationKind;operation:'CREATE'|'IMPORT'|'RESTORE'|Action['type']|null;commandId:string|null;runId:string|null;sourceRunId:string|null;revisionBefore:number|null;revisionAfter:number|null;observedRevision:number|null;identifiersRedacted:boolean;versions:ObservationVersions;state:PublicState|null;eventId:string|null;enemyId:string|null;action:PublicAction|null;result:PublicResult|null;errorCode:string|null;replayed:boolean;gaps:ResourceDeficit[];flags:('realm_changed'|'battle_won'|'battle_lost'|'battle_withdrawn'|'ending')[]};
export type LocalRecord={id:string;sessionId:string;elapsedMs:number;seed:null;observation:Observation};
export type WriteObservationSource={kind:'action';command:Command}|{kind:'new_game'|'restart'|'import'|'restore';commandId:string;runId:string;sourceRunId:string|null;expectedRevision:number};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const publicId=(value:unknown):string|null=>typeof value==='string'&&uuid.test(value)?value:null;
const kinds:ObservationKind[]=['session','resume','sync','new_game','restart','import','restore','action','replay','save_error','input_error'];
const actionFields:Record<Action['type'],string[]>={CHOOSE:['choice'],TRAVEL:['location'],CULTIVATE:['method','count'],SOURCE:['sourceId','count','target'],BUY:['item','quantity'],SELL:['item','quantity'],CRAFT:['recipeId'],USE:['item'],REST:[],BREAKTHROUGH:[],SCHOOL:['school'],STUDY:['manual'],LEARN:['skill'],EQUIP:['skill'],FORGE:['relic'],EQUIP_RELIC:['relic'],ENCOUNTER:['enemy'],BATTLE:['move'],EVENT:['event'],DECIDE:['option'],START_TRIAL:[],ANSWER_TRIAL:['answer'],END:['ending'],RETIRE:[],END_LIFE:[]};
const errorCodes=new Set(['AGE_LIMIT','ALREADY_LEARNED','ALREADY_OWNED','ASSISTED_COSTS','BREAKTHROUGH_CRAFT_ROUTE','BREAKTHROUGH_ITEM','BREAKTHROUGH_PURCHASE_ROUTE','BREAKTHROUGH_SALE','CAPACITY','CHECKPOINT_INVALID','CHECKPOINT_OWNERSHIP','COMMAND_ID_REUSED','CONTENT_NUMBER','CONTENT_TEXT','CRAFT_PROFIT','DB_SCHEMA','DB_VERSION','DEFAULT_SKILL','ENDED','ENEMY_LOCATION_GATE','EVENT_RESOLVED','EVENT_UNAVAILABLE','HP_REQUIRED','INCOME_ROUTE','INPUT_REJECTED','INSUFFICIENT_ITEM','INSUFFICIENT_STONES','INVALID_COMMAND','INVALID_GOAL','INVALID_MUTATION','INVALID_OPTION','INVALID_QUERY','IN_BATTLE','IN_TRIAL','ITEM_KIND','LEDGER_CLOSING','LEDGER_DUPLICATE','LEDGER_FLOW','LEDGER_SEQUENCE','LIFESPAN_REMAINING','LOCATION_REQUIRED','LOCKED_ITEM','MANUAL_CONTRACT','MARK_CAP','MARK_REQUIRED','MIGRATION_SOURCE_MISSING','MP_REQUIRED','NEW_RUN_REQUIRED','NOT_LEARNED','NOT_OWNED','NOT_USABLE','NO_BATTLE','NO_CHANGE','NO_CHECKPOINT','NO_EVENT','NO_QUESTION','OPTION_AID','OPTION_CONDITION','OPTION_ID','OPTION_XP','OTHER','PENDING','PENDING_EVENT','RAW_BACKUP_UNSUPPORTED','RAW_EXPORT_UNSUPPORTED','REALM_CHAIN','REALM_REQUIRED','RECEIPT_INVALID','RECIPE_INPUT','RECIPE_MATERIAL_ROUTE','RELIC_EFFECT','RELIC_MATERIAL_ROUTE','RUN_MISMATCH','SAVE_AGE','SAVE_BATTLE','SAVE_CHOICE','SAVE_ENDING','SAVE_EQUIPMENT','SAVE_EVENT','SAVE_ID','SAVE_ITEMS','SAVE_JOURNAL','SAVE_JSON','SAVE_LEGACY','SAVE_LEGACY_SKILL','SAVE_LOADOUT','SAVE_LOCATION','SAVE_MILESTONE','SAVE_PLAYER','SAVE_RANGE','SAVE_SCHOOL','SAVE_SHAPE','SAVE_SIZE','SAVE_STORIES','SAVE_TRIAL','SAVE_VERSION','SCHOOL_REQUIRED','SKILL_EFFECT','SKILL_SLOT','SOURCE_ITEM_GATE','SOURCE_LOCATION_GATE','STALE_REVISION','STORAGE_ABORTED','STORAGE_BLOCKED','STORAGE_CLOSED','STORAGE_DENIED','STORAGE_QUOTA','STORAGE_UNAVAILABLE','STORY_CONDITION','STORY_CONDITION_ORDER','STORY_CYCLE','STORY_EXIT','STORY_ID','STORY_ITEM_GATE','STORY_LOCATION_GATE','STORY_REALM_GATE','STORY_TEXT_LIMIT','STORY_VARIANT','STORY_VARIANT_OVERLAP','SWORD_REQUIRED','TARGET_MET','TARGET_UNREACHABLE','TRADE_PROFIT','TRIAL_ITEM','TRIAL_REQUIRED','TRIAL_STAGE','XP_CAP','XP_REQUIRED','ZERO_RESOURCE_CULTIVATION']);
export const publicError=(code:unknown)=>typeof code==='string'&&errorCodes.has(code)?code:'OTHER';
function valid(condition:unknown,message='本地记录格式无效'):asserts condition{if(!condition)throw new Error(message);}
function object(value:unknown):asserts value is Record<string,any>{valid(!!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null));}
function keys(value:unknown,expected:string[]):asserts value is Record<string,any>{object(value);valid(Object.keys(value).sort().join(',')===[...expected].sort().join(','));}
function integer(value:unknown,signed=false):asserts value is number{valid(Number.isSafeInteger(value)&&(signed||Number(value)>=0));}
export function parsePreferences(value:unknown):Preferences{keys(value,['fontScale','reduceMotion','recording']);valid([1,1.5,2].includes(value.fontScale)&&typeof value.reduceMotion==='boolean'&&typeof value.recording==='boolean','显示偏好格式无效');return{fontScale:value.fontScale,reduceMotion:value.reduceMotion,recording:value.recording};}
function versions(game?:Game|null):ObservationVersions{return game?{format:game.format,version:game.version,schemaVersion:game.core.schemaVersion,contentVersion:game.core.contentVersion,balanceVersion:game.core.balanceVersion}:{...currentVersions};}
function state(game:Game|null):PublicState|null{return game?{realm:game.core.player.realm,location:game.core.world.location,months:game.core.world.elapsedMonths,xp:game.core.player.xp,hp:game.core.player.hp,mp:game.core.player.mp,stones:game.core.player.stones,wins:game.wins,inventory:Object.fromEntries(Object.keys(C.items).map(id=>[id,game.core.inventory[id]]))}:null;}
function publicAction(command:Command):PublicAction{
 const fields=actionFields[command.type];valid(fields,'未知行动');const result:PublicAction={};
 for(const field of fields){const value=(command as any)[field];if(value!==undefined)result[field]=field==='target'?{item:value.item,quantity:value.quantity}:value;}
 return result;
}
function base(kind:ObservationKind,game:Game|null):Observation{return{kind,operation:null,commandId:null,runId:publicId(game?.core.runId),sourceRunId:null,revisionBefore:null,revisionAfter:null,observedRevision:game?.core.revision??null,identifiersRedacted:!!game&&!publicId(game.core.runId),versions:versions(game),state:state(game),eventId:null,enemyId:null,action:null,result:null,errorCode:null,replayed:false,gaps:[],flags:[]};}
export function sessionObservation():Observation{return base('session',null);}
export function loadedObservation(game:Game,kind:'resume'|'sync'):Observation{return base(kind,game);}
export function writeObservation(before:Game|null,after:Game|null,source:WriteObservationSource,result:ActionResult|null,replayed:boolean,errorCode?:string):Observation{
 const kind:ObservationKind=errorCode?'save_error':replayed?'replay':source.kind==='action'?'action':source.kind;
 const value=base(kind,after??before);value.replayed=replayed;value.commandId=publicId(source.kind==='action'?source.command.commandId:source.commandId);value.sourceRunId=publicId(source.kind==='action'?source.command.runId:source.sourceRunId);value.runId=publicId(source.kind==='action'?source.command.runId:source.runId);value.identifiersRedacted ||= !value.commandId||!value.runId;
 value.revisionBefore=source.kind==='action'?source.command.expectedRevision:source.expectedRevision;
 value.operation=source.kind==='action'?source.command.type:source.kind==='import'?'IMPORT':source.kind==='restore'?'RESTORE':'CREATE';
 value.errorCode=errorCode?publicError(errorCode):null;
 if(source.kind==='action'){
  value.action=publicAction(source.command);const ownsBefore=before?.core.runId===source.command.runId&&before?.core.revision===source.command.expectedRevision;
  const story=ownsBefore?before?.core.activeEvent?.id:null;value.eventId=story&&(story==='temple'||Object.hasOwn(stories,story))?story:null;const enemy=ownsBefore?before?.battle?.enemy:null;value.enemyId=enemy&&Object.hasOwn(C.enemies,enemy)?enemy:null;
  if(before&&ownsBefore&&(source.command.type==='BREAKTHROUGH'||source.command.type==='START_TRIAL'))value.gaps=previewAction(before,source.command).deficits.map(gap=>({...gap}));
 }
 if(result){
  value.runId=publicId(result.runId);value.versions={...result.versions};value.revisionBefore=result.revisionBefore;value.revisionAfter=result.revisionAfter;
  value.result={revisionBefore:result.revisionBefore,revisionAfter:result.revisionAfter,requestedSteps:result.requestedSteps,executedSteps:result.executedSteps,phaseBefore:result.phaseBefore,phaseAfter:result.phaseAfter,costs:structuredClone(result.costs),delta:structuredClone(result.delta),stopCode:result.stopReason?publicError(result.stopReason.code):null};
  if(result.delta.realm.before!==result.delta.realm.after)value.flags.push('realm_changed');
  if(result.delta.wins>0)value.flags.push('battle_won');
  else if(['battle','trial-battle'].includes(result.phaseBefore)&&!['battle','trial-battle'].includes(result.phaseAfter))value.flags.push(source.kind==='action'&&source.command.type==='BATTLE'&&source.command.move==='flee'?'battle_withdrawn':'battle_lost');
  if(['ascended','ended'].includes(result.phaseAfter))value.flags.push('ending');
 }else if(!errorCode)value.revisionAfter=replayed?null:after?.core.revision??null;
 // A replay's state is the latest observation, not the original receipt's resulting state.
 return value;
}
export function inputErrorObservation(game:Game|null):Observation{const value=base('input_error',game);value.errorCode='INPUT_REJECTED';return value;}
export function storageErrorObservation(game:Game|null,code:unknown):Observation{const value=base('save_error',game);value.errorCode=publicError(code);return value;}
export function recordKey(record:LocalRecord){const o=record.observation;return o.commandId&&o.runId&&['action','replay','new_game','restart','import','restore'].includes(o.kind)?`command:${o.runId}:${o.commandId}`:o.kind==='resume'&&o.runId?`resume:${record.sessionId}:${o.runId}`:`event:${record.id}`;}
export function recordProof(record:LocalRecord){const o=record.observation;return JSON.stringify({operation:o.operation,commandId:o.commandId,runId:o.runId,action:o.action,result:o.result});}
export const recordBytes=(record:LocalRecord)=>new TextEncoder().encode(JSON.stringify(record)).length;
const phases=['opening','event','idle','battle','trial-question','trial-battle','trial-ending','ascended','ended'];
function inventory(value:unknown,signed=false){object(value);valid(Object.keys(value).every(id=>Object.hasOwn(C.items,id)));for(const n of Object.values(value))integer(n,signed);}
export function validateRecord(record:unknown):asserts record is LocalRecord{
 keys(record,['id','sessionId','elapsedMs','seed','observation']);valid(publicId(record.id)&&publicId(record.sessionId)&&record.seed===null);integer(record.elapsedMs);
 const o=record.observation;keys(o,['kind','operation','commandId','runId','sourceRunId','revisionBefore','revisionAfter','observedRevision','identifiersRedacted','versions','state','eventId','enemyId','action','result','errorCode','replayed','gaps','flags']);valid(kinds.includes(o.kind)&&typeof o.replayed==='boolean'&&typeof o.identifiersRedacted==='boolean');
 for(const id of [o.commandId,o.runId,o.sourceRunId])valid(id===null||publicId(id));for(const rev of [o.revisionBefore,o.revisionAfter,o.observedRevision])if(rev!==null)integer(rev);
 valid(o.operation===null||['CREATE','IMPORT','RESTORE',...Object.keys(actionFields)].includes(o.operation));valid(o.eventId===null||o.eventId==='temple'||Object.hasOwn(stories,o.eventId));valid(o.enemyId===null||Object.hasOwn(C.enemies,o.enemyId));valid(o.errorCode===null||errorCodes.has(o.errorCode));
 keys(o.versions,['format','version','schemaVersion','contentVersion','balanceVersion']);valid(o.versions.format===currentVersions.format&&o.versions.version===currentVersions.version&&o.versions.schemaVersion===currentVersions.schemaVersion&&/^full-demo\.\d+$/.test(o.versions.contentVersion)&&/^full-unbalanced\.\d+$/.test(o.versions.balanceVersion));
 if(o.state!==null){keys(o.state,['realm','location','months','xp','hp','mp','stones','wins','inventory']);valid(Object.hasOwn(C.realms,o.state.realm)&&Object.hasOwn(C.locations,o.state.location));for(const key of ['months','xp','hp','mp','stones','wins'])integer(o.state[key]);inventory(o.state.inventory);}
 if(o.action!==null){object(o.action);valid(o.operation&&Object.hasOwn(actionFields,o.operation));const fields=actionFields[o.operation as Action['type']];valid(Object.keys(o.action).every(key=>fields.includes(key)));valid(fields.filter(key=>!['count','target'].includes(key)).every(key=>Object.hasOwn(o.action,key)));for(const [key,value]of Object.entries(o.action)){if(['count','quantity'].includes(key)){integer(value);valid(Number(value)>0);}else if(key==='target'){keys(value,['item','quantity']);valid(Object.hasOwn(C.items,value.item));integer(value.quantity);}else{
   const catalog:Record<string,object>={location:C.locations,sourceId:C.sources,item:C.items,recipeId:C.recipes,skill:C.skills,relic:C.relics,enemy:C.enemies,event:stories};const lists:Record<string,string[]>={choice:['help','trade','leave'],method:['natural','assisted'],school:['sword','talisman'],manual:['jinghong'],move:['attack','guard','technique','release','heal','restore','flee'],answer:['accept','release'],ending:['transmit','depart']};
   valid(typeof value==='string'&&(catalog[key]?Object.hasOwn(catalog[key],value):lists[key]?lists[key].includes(value):key==='option'&&Object.values(stories).some(story=>story.options.some(option=>option.id===value))));
  }} }
 if(o.result!==null){const r=o.result;keys(r,['revisionBefore','revisionAfter','requestedSteps','executedSteps','phaseBefore','phaseAfter','costs','delta','stopCode']);for(const key of ['revisionBefore','revisionAfter','requestedSteps','executedSteps'])integer(r[key]);valid(['action','replay'].includes(o.kind)&&o.state!==null&&r.revisionAfter===r.revisionBefore+1&&o.revisionBefore===r.revisionBefore&&o.revisionAfter===r.revisionAfter&&r.executedSteps<=r.requestedSteps);valid(phases.includes(r.phaseBefore)&&phases.includes(r.phaseAfter)&&(r.stopCode===null||errorCodes.has(r.stopCode)));keys(r.costs,['stones','mp','months','items']);for(const key of ['stones','mp','months'])integer(r.costs[key]);inventory(r.costs.items);keys(r.delta,['stones','xp','hp','mp','months','wins','inventory','realm']);for(const key of ['stones','xp','hp','mp','months','wins'])integer(r.delta[key],true);inventory(r.delta.inventory,true);keys(r.delta.realm,['before','after']);valid(Object.hasOwn(C.realms,r.delta.realm.before)&&Object.hasOwn(C.realms,r.delta.realm.after));}
 valid(Array.isArray(o.gaps)&&o.gaps.length<=16);for(const gap of o.gaps){object(gap);valid(Object.keys(gap).every(k=>['kind','id','required','have','missing'].includes(k)));valid(['stones','mp','months','item','xp','hp'].includes(gap.kind));valid(gap.id===undefined||Object.hasOwn(C.items,gap.id));for(const key of ['required','have','missing'])integer(gap[key]);}
 valid(Array.isArray(o.flags)&&o.flags.every((flag:unknown)=>['realm_changed','battle_won','battle_lost','battle_withdrawn','ending'].includes(String(flag))));valid(recordBytes(record as LocalRecord)<=16_000,'单条本地记录过大');
}
export const observationLabels:Record<ObservationKind,string>={session:'会话开始',resume:'继续原档',sync:'同步观察',new_game:'新建人生',restart:'主动重开',import:'导入人生',restore:'完整检查点恢复',action:'已提交行动',replay:'观察已有回执',save_error:'存档操作失败',input_error:'输入检查未通过'};
