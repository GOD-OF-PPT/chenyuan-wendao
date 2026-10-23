import {computed,shallowRef,watch} from 'vue';
import type {Activity} from '../../src/full/activity.ts';
import {useActivityPresentation} from './use-activity-effect.ts';

export type SupplyKind='buy'|'sell'|'use'|'rest';
export function supplyActivityMatches(kind:SupplyKind,id:string,a:Activity){
 return a.version===5&&a.plan.kind===kind&&(a.plan.kind==='rest'||'item'in a.plan&&a.plan.item===id);
}
export function supplyCommandMatches(kind:SupplyKind,id:string,c:Activity['nextCommand']){
 return !!c&&c.type===kind.toUpperCase()&&(c.type==='REST'||'item'in c&&c.item===id);
}
/** One visible, owned online cycle; the shared tracker proves the whole saved result. */
export function useSupplyCycle(kind:()=>SupplyKind,id:()=>string){
 const p=useActivityPresentation(a=>supplyActivityMatches(kind(),id(),a),()=>kind()+':'+(kind()==='rest'?'':id()),undefined,5);
 const command=shallowRef<Activity['nextCommand']>(null);
 watch(p.runtime,r=>{if(!r)command.value=null;else if(r.phase==='running')command.value=p.activity.value?.nextCommand??null;},{immediate:true,flush:'sync'});
 const engaged=computed(()=>!!p.runtime.value&&supplyCommandMatches(kind(),id(),command.value));
 const phase=computed(()=>engaged.value?p.phase.value:'idle');
 const effect=computed(()=>{const e=p.effect.value;return e&&e.result.type===kind().toUpperCase()&&(kind()==='rest'||e.notice.icon.id===id())?e:null;});
 return {...p,engaged,phase,effect,working:computed(()=>engaged.value&&p.working.value),progress:computed(()=>engaged.value?p.progress.value:0)};
}
