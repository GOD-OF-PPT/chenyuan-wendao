import {computed,inject,ref,shallowRef,watch,onMounted,onActivated,onDeactivated,onScopeDispose} from 'vue';
import type {Game} from '../../src/full/types.ts';
import type {Activity} from '../../src/full/activity.ts';
import type {ActionResult} from '../../src/full/contracts.ts';
import type {ConfigurationCommand} from '../../src/full/configuration.ts';
import {resolve} from '../../src/full/engine.ts';
import {canonicalFingerprint as proof} from '../../src/full/receipts.ts';
import type {Observation} from './local-events.ts';
import type {useGame} from './store';
import {createActionFeedbackTracker} from './action-feedback.ts';
import {useActivityPresentation} from './use-activity-effect.ts';

type EquipmentKind='learn'|'study'|'forge';
export function equipmentActivityMatches(kind:EquipmentKind,id:string,a:Activity){
 return kind==='forge'?a.version===4&&a.plan.relicId===id:a.version===5&&a.plan.kind===kind&&(a.plan.kind==='learn'?a.plan.skills.includes(id):a.plan.kind==='study'&&a.plan.manual===id);
}
export function useEquipmentCycle(kind:EquipmentKind,id:()=>string){
 const store=inject<ReturnType<typeof useGame>>('game-scene');
 const p=useActivityPresentation(a=>equipmentActivityMatches(kind,id(),a),()=>store?.game?.core.runId+':'+kind+':'+id(),undefined,kind==='forge'?4:5);
 // Keep the running command while saved activity advances to its next scroll.
 const cycleCommand=shallowRef<Activity['nextCommand']>(null);
 watch(p.runtime,r=>{if(!r)cycleCommand.value=null;else if(r.phase==='running')cycleCommand.value=p.activity.value?.nextCommand??null;},{immediate:true,flush:'sync'});
 const engaged=computed(()=>{const c=cycleCommand.value;return !!p.runtime.value&&!!c&&(kind==='forge'?c.type==='FORGE'&&c.relic===id():kind==='learn'?c.type==='LEARN'&&c.skill===id():c.type==='STUDY'&&c.manual===id());});
 const effect=computed(()=>{const e=p.effect.value;return e&&(kind==='forge'?e.result.type==='FORGE'&&e.notice.icon.id===id():kind==='learn'?e.result.type==='LEARN'&&e.notice.icon.id===id():e.result.type==='STUDY'&&id()==='jinghong')?e:null;});
 return {...p,engaged,effect};
}

/** Private proof for one actual configuration; never changes a command or public record. */
export function createConfigurationEchoTracker(){
 const feedback=createActionFeedbackTracker();
 return {consume(o:Observation,g:Game|null,r:ActionResult|null,replayed:boolean,eligible:boolean,before:Game|null){
  if(!before||!g||!r||!o.result||!o.action||o.errorCode||!['SCHOOL','EQUIP','EQUIP_RELIC'].includes(r.type)||r.stopReason!==null||o.operation!==r.type||o.commandId!==r.commandId||o.sourceRunId!==g.core.runId)return null;
  try{
   const command={...o.action,type:r.type,commandId:r.commandId,runId:r.runId,expectedRevision:r.revisionBefore} as ConfigurationCommand;
   const resolved=resolve(before,command),{commandId,runId,type,versions,stopReason,...facts}=r;
   if(proof(resolved.nextState)!==proof(g)||proof(resolved.result)!==proof(r)||proof(o.result)!==proof({...facts,stopCode:null}))return null;
  }catch{return null;}
  const notice=feedback.consume(o,g,r,replayed,true,before);
  if(!notice||!eligible)return null;
  const slots=(['mind','builder','finisher','relic'] as const).filter(slot=>before.loadout[slot]!==g.loadout[slot]);
  return {notice,result:r,slots};
 }};
}

export function useConfigurationEcho(key:()=>string,active:()=>boolean=()=>true){
 const store=inject<ReturnType<typeof useGame>>('game-scene'),visible=ref(true),hidden=ref(document.hidden),tracker=createConfigurationEchoTracker();
 const effect=shallowRef<(NonNullable<ReturnType<typeof tracker.consume>>&{sequence:number})|null>(null);
 let before:Game|null=store?.game?structuredClone(store.game):null,sequence=0,stop=()=>{},timer:ReturnType<typeof setTimeout>|undefined;
 const eligible=computed(()=>visible.value&&!hidden.value&&active()&&!!store?.available&&!store.error&&!store.activityPausing);
 function clear(){effect.value=null;clearTimeout(timer);}
 watch(()=>store?.game,(_next,previous)=>{before=previous?structuredClone(previous):null;},{flush:'sync'});
 watch([key,visible,hidden,active,()=>store?.activity?.id,()=>store?.activity?.generation,()=>store?.activity?.ownerId,()=>store?.activityPausing],clear,{flush:'sync'});
 watch(eligible,value=>{if(!value)clear();},{flush:'sync'});
 function visibility(){hidden.value=document.hidden;}
 onMounted(()=>{stop=store?.observe(o=>{if(!store)return;const next=tracker.consume(o,store.game,store.lastResult,store.lastReplayed,eligible.value&&store.saved,before);if(!next)return;clearTimeout(timer);effect.value={...next,sequence:++sequence};timer=setTimeout(clear,1400);})??(()=>{});document.addEventListener('visibilitychange',visibility);});
 onActivated(()=>visible.value=true);onDeactivated(()=>visible.value=false);
 onScopeDispose(()=>{clear();stop();document.removeEventListener('visibilitychange',visibility);});
 return {store,effect,clear};
}
