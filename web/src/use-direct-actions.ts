import {computed,nextTick,onScopeDispose,watch} from 'vue';
import type {useGame} from './store';
import type {useFocus} from './focus';
import {visibleFocusTarget} from './focus';
import type {useGameConfirmation} from './use-game-confirmation';
import type {SaveControlNavigation} from './use-save-controls';
import type {DirectAction} from '../../src/full/direct-actions.ts';
import {isDirectAction} from '../../src/full/direct-actions.ts';
import type {Action} from '../../src/full/types.ts';
import {previewAction,getStoryContext} from '../../src/full/queries.ts';
import {contentForGame} from '../../src/full/rule-content.ts';
import {formatCosts,formatDelta} from './presentation';

export interface DirectActionNavigation {
 owner():number;
 viewIdentity():readonly unknown[];
 source:SaveControlNavigation['source'];
 blocked:SaveControlNavigation['blocked'];
 openCurrent():Promise<unknown>;
 regular(action:Action):unknown;
}

/** A visit handoff belongs to its original view and committed direct intent. */
export function useDirectActions(store:ReturnType<typeof useGame>,focus:ReturnType<typeof useFocus>,
 confirmation:ReturnType<typeof useGameConfirmation>,navigation:DirectActionNavigation){
 const game=computed(()=>store.game);let alive=true,viewEpoch=0;
 let visit:{command:string;run:string;event:string;view:number;sync:number}|null=null;
 const browse=()=>viewEpoch++;
 watch(navigation.viewIdentity,browse,{flush:'sync'});
 onScopeDispose(()=>{alive=false;visit=null;});
 async function finish(){
  const pending=visit;if(!pending)return;
  if(!alive||viewEpoch!==pending.view||store.syncEpoch!==pending.sync||game.value?.core.runId!==pending.run){visit=null;return;}
  if(store.busy||store.error||!store.wasConfirmedFor(pending.command,pending.run)||game.value.core.activeEvent?.id!==pending.event)return;
  visit=null;await navigation.openCurrent();
 }
 watch(()=>[store.busy,store.error,store.game,store.syncEpoch,...navigation.viewIdentity()],()=>{void finish();},{flush:'post'});
 async function execute(action:DirectAction,confirm=true){
  if(!alive||!game.value||store.unresolved||store.busy||store.activityRunning)return;
  const before=game.value,intent=store.prepareDirect(action);if(!intent)return;
  const source=navigation.source(),quote=previewAction(before,action);if(!quote.allowed)return;
  const content=contentForGame(before),consequence=store.activity?.status==='paused'?'本次行动将结束已暂停的原活动，已完成成果保留，未完成部分不再续行。':'';
  const event=action.type==='EVENT'?getStoryContext(before,action.event):action.type==='DECIDE'&&before.core.activeEvent?getStoryContext(before,before.core.activeEvent.id):null;
  const detail=action.type==='DECIDE'?event?.options.find(option=>option.id===action.option)?.detail:action.type==='EVENT'?event?.body:'';
  const label=action.type==='EVENT'?'拜访 · '+event?.name:action.type==='DECIDE'?event?.options.find(option=>option.id===action.option)?.label:action.type==='USE'?'服用1枚'+content.items[action.item].name:'售出1件'+content.items[action.item].name;
  if(confirm&&!await confirmation.ask({kind:'light-action',title:label??'确认本次行动',message:[detail,'本次投入：'+formatCosts(quote.actualCosts??quote.costs),'预计变化：'+(quote.delta?formatDelta(quote.delta):'无'),consequence].filter(Boolean).join('\n'),action:label??'确认行动',cancel:'再想想',current:source.current,blocked:navigation.blocked,mayReturn:source.mayReturn}))return;
  if(!alive||!source.current()||navigation.blocked())return;
  const owner=navigation.owner(),anchor=focus.capture();
  if(action.type==='EVENT')visit={command:intent.command.commandId,run:intent.command.runId,event:action.event,view:viewEpoch,sync:store.syncEpoch};
  await store.executeDirect(intent);if(!alive)return;await finish();
  if(!confirm&&owner===navigation.owner()&&!store.error){await nextTick();if(alive&&anchor&&!anchor.isConnected&&(document.activeElement===document.body||document.activeElement?.matches('[data-testid=inventory-library-open]')))focus.target(['[data-testid=inventory-main-source]','[data-testid=inventory-main-uses]','[data-testid=inventory-library-open]'].map(selector=>document.querySelector<HTMLElement>(selector)).find(visibleFocusTarget)??null);}
 }
 function storyAct(action:Action){if(!store.unresolved)return isDirectAction(action)&&['EVENT','DECIDE'].includes(action.type)?execute(action):navigation.regular(action);}
 function quickInventory(action:Action){if(isDirectAction(action)&&['USE','SELL'].includes(action.type))return execute(action,false);}
 return {storyAct,quickInventory,browse};
}
