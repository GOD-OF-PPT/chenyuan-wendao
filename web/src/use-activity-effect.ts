import {computed,inject,ref,shallowRef,watch,onMounted,onActivated,onDeactivated,onScopeDispose} from 'vue';
import type {Activity} from '../../src/full/activity.ts';
import type {ActionResult} from '../../src/full/contracts.ts';
import type {useGame} from './store';
import type {ActionNotice} from './action-feedback';
import {createActivityEffectTracker} from './activity-effects.ts';

export function useActivityPresentation(matches:(a:Activity)=>boolean,key:()=>string,active:()=>boolean=()=>true,extra:0|1|4|5|7=0){
 const store=inject<ReturnType<typeof useGame>>('game-scene'),visible=ref(true),hidden=ref(document.hidden);
 const tracker=createActivityEffectTracker(matches,extra),effect=shallowRef<{sequence:number;notice:ActionNotice;result:ActionResult}|null>(null);
 let stop=()=>{},timer:ReturnType<typeof setTimeout>|undefined,sequence=0;
 const eligible=computed(()=>visible.value&&!hidden.value&&active()&&!store?.activityPausing&&!!store?.available&&!store.error);
 const activity=computed(()=>store?.game&&store.activity?.runId===store.game.core.runId&&matches(store.activity)?store.activity:null);
 const runtime=computed(()=>eligible.value&&activity.value?.status==='running'&&store?.activityRuntime?.id===activity.value.id&&store.activityRuntime.generation===activity.value.generation?store.activityRuntime:null);
 const phase=computed(()=>runtime.value?.phase??'idle'),working=computed(()=>phase.value==='running');
 const progress=computed(()=>runtime.value?Math.max(0,Math.min(1,1-runtime.value.remainingMs/runtime.value.totalMs)):0);
 function clearEffect(){effect.value=null;clearTimeout(timer);}
 function clear(){tracker.clear();clearEffect();}
 function arm(){const r=runtime.value;if(r?.phase==='running'&&store?.game)tracker.arm(activity.value,store.game,r.id,r.generation);}
 watch([()=>store?.activityRuntime?.id,()=>store?.activityRuntime?.generation,()=>store?.activityRuntime?.phase],arm,{immediate:true,flush:'sync'});
 watch([key,visible,hidden,active],()=>{clear();arm();},{flush:'sync'});
 watch(eligible,v=>{if(v)arm();else clearEffect();},{flush:'sync'});
 watch([()=>activity.value?.id,()=>activity.value?.generation,()=>activity.value?.ownerId,()=>activity.value?.status==='paused',()=>store?.activityPausing],()=>{clear();arm();},{flush:'sync'});
 function visibility(){hidden.value=document.hidden;}
 onMounted(()=>{stop=store?.observe(o=>{if(!store)return;const notice=tracker.consume(o,store.game,store.activity,store.lastResult,store.lastReplayed,eligible.value&&store.saved);if(!notice||!store.lastResult)return;clearTimeout(timer);effect.value={sequence:++sequence,notice,result:store.lastResult};timer=setTimeout(()=>effect.value=null,1400);})??(()=>{});document.addEventListener('visibilitychange',visibility);});
 onActivated(()=>{visible.value=true;});onDeactivated(()=>{visible.value=false;});
 onScopeDispose(()=>{clear();stop();document.removeEventListener('visibilitychange',visibility);});
 return {store,activity,runtime,working,progress,phase,effect,clear};
}
