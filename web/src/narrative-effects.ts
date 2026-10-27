import {computed,getCurrentInstance,inject,nextTick,ref,shallowRef,watch,onMounted,onActivated,onDeactivated,onScopeDispose,type InjectionKey} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import type {Activity} from '../../src/full/activity.ts';
import type {useGame} from './store';
import {getStoryContext} from '../../src/full/queries.ts';
import {useActivityPresentation} from './use-activity-effect.ts';
import {visibleFocusTarget} from './focus.ts';

export type NarrativeObjectKind='fate'|'response'|'life';
const operations=['EVENT','DECIDE','ANSWER_TRIAL','END','RETIRE','END_LIFE'];
const people:Record<string,string>={沈清禾:'shen',陆玄松:'lu',裴照:'pei',砚尘:'yan'};
export function narrativeActivityMatches(a:Activity){return a.version===7&&operations.includes(a.plan.action.type);}
/** Frozen identity for presentation only; no command is accepted or issued here. */
export function narrativeTarget(game:Game,action:Action){
 let personId='',modelKey='';
 if(action.type==='EVENT'||action.type==='DECIDE'){
  const event=action.type==='EVENT'?action.event:game.core.activeEvent?.id;
  if(event&&event!=='temple'){try{personId=people[getStoryContext(game,event).npc]??'';modelKey=event;}catch{return null;}}
 }else if(action.type==='ANSWER_TRIAL')modelKey='question';
 else if(action.type==='END')modelKey='ending';
 if(!operations.includes(action.type))return null;
 return {runId:game.core.runId,action:structuredClone(action),personId,modelKey};
}
export function narrativeObjectMatches(kind:NarrativeObjectKind,id:string,target:NonNullable<ReturnType<typeof narrativeTarget>>){
 if(kind==='life')return ['END','RETIRE','END_LIFE'].includes(target.action.type)&&id===target.runId;
 if(kind==='response')return target.modelKey===id&&['DECIDE','ANSWER_TRIAL','END'].includes(target.action.type);
 return ['EVENT','DECIDE'].includes(target.action.type)&&(id==='event:'+target.modelKey||!!target.personId&&id===target.personId);
}

export function useNarrativeStage(active:()=>boolean){
 const store=inject<ReturnType<typeof useGame>>('game-scene');
 const p=useActivityPresentation(narrativeActivityMatches,()=>store?.game?.core.runId??'',active,7);
 const witness=shallowRef<(NonNullable<ReturnType<typeof narrativeTarget>>&{commandId:string})|null>(null),claimed=new Set<number>();
 let delivery:number|null=null;
 watch(p.runtime,r=>{
  const a=p.activity.value;
  if(r?.phase==='running'&&a?.version===7&&a.nextCommand){const target=narrativeTarget(a.originGame,a.plan.action);witness.value=target?{...target,commandId:a.nextCommand.commandId}:null;}
 },{immediate:true,flush:'sync'});
 const effect=computed(()=>{const e=p.effect.value,w=witness.value;return e&&w&&e.result.commandId===w.commandId?{...e,...w}:null;});
 // One render delivery permits the actual response-to-life handoff, never later navigation.
 watch(effect,e=>{delivery=e?.sequence??null;if(e)void nextTick(()=>{if(delivery===e.sequence)delivery=null;});},{flush:'sync'});
 function claim(sequence:number){if(delivery!==sequence||claimed.has(sequence))return false;claimed.add(sequence);if(claimed.size>128)claimed.delete(claimed.values().next().value!);return true;}
 return {...p,witness,effect,claim};
}
export const narrativeStageKey:InjectionKey<ReturnType<typeof useNarrativeStage>>=Symbol('narrative-stage');

/** A scene may show only its current object; revisiting cannot replay a short result. */
export function useNarrativeObject(kind:()=>NarrativeObjectKind,id:()=>string,active:()=>boolean=()=>true){
 const instance=getCurrentInstance(),p=inject(narrativeStageKey)!,visible=ref(true),effect=shallowRef<NonNullable<typeof p.effect.value>|null>(null);
 const valid=computed(()=>visible.value&&active()&&!!p.store?.available&&!p.store.error&&!p.store.activityPausing);
 const engaged=computed(()=>{const w=p.witness.value;return valid.value&&!!p.runtime.value&&!!w&&narrativeObjectMatches(kind(),id(),w);});
 const runtime=computed(()=>engaged.value?p.runtime.value:null),phase=computed(()=>runtime.value?.phase??'idle');
 const seconds=computed(()=>runtime.value?runtime.value.totalMs/1000:0),remaining=computed(()=>runtime.value?Math.ceil(runtime.value.remainingMs/1000):0);
 let owner:{kind:NarrativeObjectKind;id:string}|null=null;
 function claimCurrent(){
  const e=p.effect.value,k=kind(),target=id();
  const element=instance?.vnode.el;
  if(!(element instanceof Element)||!visibleFocusTarget(element)||!e||!valid.value||!narrativeObjectMatches(k,target,e)){effect.value=null;owner=null;return;}
  if(effect.value===e&&owner?.kind===k&&owner.id===target)return;
  effect.value=null;owner=null;
  if(p.claim(e.sequence)){effect.value=e;owner={kind:k,id:target};}
 }
 watch([()=>p.effect.value,kind,id,valid],claimCurrent,{immediate:true,flush:'post'});
 onMounted(claimCurrent);
 onActivated(()=>{const resumed=!visible.value;visible.value=true;if(resumed)claimCurrent();});
 onDeactivated(()=>{visible.value=false;effect.value=null;owner=null;});
 onScopeDispose(()=>effect.value=null);
 return {store:p.store,phase,runtime,engaged,seconds,remaining,effect,action:computed(()=>engaged.value?p.witness.value?.action??null:null),working:computed(()=>engaged.value&&p.working.value),progress:computed(()=>engaged.value?p.progress.value:0)};
}
