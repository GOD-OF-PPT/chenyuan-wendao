import {computed} from 'vue';
import type {Action} from '../../src/full/types.ts';
import type {ActionPreview} from '../../src/full/queries.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {useGame} from './store';
import {formatCosts} from './presentation';

/** Shared readonly quotes and the existing player-facing availability contract. */
export function useActionView(store:ReturnType<typeof useGame>){
 const context=computed(()=>({state:store.game,cache:new Map<string,ActionPreview>()}));
 function quote(action:Action){
  const current=context.value;if(!current.state)return null;const key=JSON.stringify(action);
  if(!current.cache.has(key))current.cache.set(key,previewAction(current.state,action));return current.cache.get(key)!;
 }
 const can=(action:Action)=>store.available&&!store.busy&&!store.activityRunning&&!!quote(action)?.allowed;
 const why=(action:Action)=>!store.available?'存储尚未就绪，请重新读取或导出原件':store.busy?(store.execution?.phase==='acting'?'当前行动正在进行，请稍候':'正在保存，请稍候'):store.activityRunning?'当前活动进行中，请先暂停再行动':quote(action)?.failure?.message??'';
 function cost(action:Action){const preview=quote(action),value=preview?.costs;if(!value)return '';const text=formatCosts(value);return preview&&preview.requestedSteps>1?'每次 '+text:text;}
 return {quote,can,why,cost};
}
