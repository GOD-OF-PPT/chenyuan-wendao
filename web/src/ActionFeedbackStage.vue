<script setup lang="ts">
import {computed,nextTick,onMounted,onScopeDispose,ref,shallowRef,watch} from 'vue';
import type {useGame} from './store';
import type {Game} from '../../src/full/types.ts';
import type {Observation} from './local-events';
import {createActionFeedbackTracker,type ActionNotice} from './action-feedback';
import GameIcon from './GameIcon.vue';
const props=defineProps<{store:ReturnType<typeof useGame>;reduceMotion:boolean;viewKey:string}>();
const root=ref<HTMLElement>(),notice=shallowRef<ActionNotice|null>(null),observation=shallowRef<Observation|null>(null),before=shallowRef<Game|null>(null),state=ref('idle');
const media=window.matchMedia('(prefers-reduced-motion: reduce)'),systemReduced=ref(media.matches),reduced=computed(()=>props.reduceMotion||systemReduced.value),tracker=createActionFeedbackTracker();
const point=ref({x:innerWidth/2,y:innerHeight/2}),floats=ref<{x:number;y:number;value:number;label:string;target:'player'|'enemy'}[]>([]),showMotion=ref(false);
type Activation={element:HTMLElement;at:number;epoch:number;run:string;revision:number;enemy:{x:number;y:number}|null};
let last:Activation|null=null,pending:Activation|null=null,epoch=0,generation=0,timer:ReturnType<typeof setTimeout>|undefined,stop=()=>{},lastFailure='',noticeEpoch=0;
const marks=new Map<HTMLElement,{timer:ReturnType<typeof setTimeout>|undefined;className:string}>();
function center(element:Element|null){if(!element)return null;const r=element.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight?{x:r.x+r.width/2,y:r.y+r.height/2}:null;}
function visible(selector:string){return [...document.querySelectorAll(selector)].find(e=>center(e))??null;}
function mark(element:HTMLElement|null,className:string,duration=900){if(!element?.isConnected)return;const prior=marks.get(element);if(prior){clearTimeout(prior.timer);element.classList.remove(prior.className);}element.classList.add(className);element.dataset.commandState=className==='command-pending'?'pending':className==='command-success'?'success':className==='command-error'?'error':'pressed';const t=duration?setTimeout(()=>{element.classList.remove(className);element.removeAttribute('data-command-state');marks.delete(element);},duration):undefined;marks.set(element,{timer:t,className});if(marks.size>32){const first=marks.keys().next().value!;const item=marks.get(first)!;clearTimeout(item.timer);first.classList.remove(item.className);first.removeAttribute('data-command-state');marks.delete(first);}}
function unmarkPending(){if(!pending)return;const item=marks.get(pending.element);if(item?.className==='command-pending'){clearTimeout(item.timer);pending.element.classList.remove(item.className);pending.element.removeAttribute('data-command-state');marks.delete(pending.element);}}
function clear(){generation++;if(timer)clearTimeout(timer);timer=undefined;notice.value=null;showMotion.value=false;floats.value=[];state.value='idle';}
function activate(event:Event){const element=event.target instanceof Element?event.target.closest<HTMLElement>('button,summary,a[href],.file-button'):null;if(!element||!root.value?.closest('.app-shell')?.contains(element)||element.matches(':disabled,[aria-disabled=true]'))return;epoch++;const game=props.store.game;last={element,at:performance.now(),epoch,run:game?.core.runId??'',revision:game?.core.revision??0,enemy:center(visible('.enemy-art'))};mark(element,'interaction-press',240);}
function pointer(event:PointerEvent){if(event.button===0)activate(event);}
function click(event:MouseEvent){if(event.detail===0)activate(event);else{const element=event.target instanceof Element?event.target.closest<HTMLElement>('button,summary,a[href],.file-button'):null;if(element&&last?.element!==element)activate(event);}}
function mediaChange(){systemReduced.value=media.matches;if(reduced.value){showMotion.value=false;floats.value=[];}}
function hidden(){if(document.hidden)clear();}
function keyIntent(){epoch++;}
watch(()=>props.store.game,(after,old)=>{before.value=after&&old&&after.core.runId===old.core.runId&&after.core.revision===old.core.revision+1?old:null;if(after?.core.runId!==old?.core.runId){clear();lastFailure='';}},{flush:'sync'});
watch(()=>props.store.busy,(busy,old)=>{if(busy&&!old){clear();lastFailure='';const g=props.store.game;pending=last&&performance.now()-last.at<1200&&last.run===(g?.core.runId??'')&&last.revision===(g?.core.revision??0)?last:null;if(pending)mark(pending.element,'command-pending',0);state.value='pending';}},{flush:'sync'});
watch(()=>[observation.value,props.store.busy,props.store.saved,props.store.available,props.store.error,props.store.lastResult,props.store.lastReplayed,props.store.game?.core.runId,props.store.game?.core.revision]as const,async()=>{
 const store=props.store;if(store.busy)return;
 unmarkPending();
 if(store.error){const key=JSON.stringify([observation.value?.commandId,store.error]);if(key!==lastFailure){clear();lastFailure=key;state.value='error';mark(pending?.element??null,'command-error');timer=setTimeout(()=>{state.value='idle';},1400);}return;}
 const next=tracker.consume(observation.value,store.game,store.lastResult,store.lastReplayed,store.saved&&store.available,before.value);if(!next){if(state.value==='pending')state.value='idle';return;}if(document.hidden){state.value='idle';return;}
 const owner=++generation,origin=pending;await nextTick();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(owner!==generation||store.busy||store.error||document.hidden)return;
 notice.value=next;noticeEpoch=epoch;state.value='success';mark(origin?.element??null,'command-success');
 const blocked=!!document.querySelector('dialog[open]'),fresh=!origin||origin.epoch===epoch;
 const selector=next.family==='battle'&&!next.terminal?(next.variant.endsWith('guard')||next.variant.endsWith('heal')||next.variant.endsWith('restore')?'.character-portrait':'.enemy-art'):next.family==='equipment'?'.character-portrait':next.family==='recovery'?'.character-portrait':'.hub-stage,.center-column .scene,[data-primary-region]';
 const at=center(visible(selector))??center(origin?.element??null)??{x:innerWidth/2,y:innerHeight*.38};point.value={x:Math.max(110,Math.min(innerWidth-110,at.x)),y:Math.max(150,Math.min(innerHeight-150,at.y))};
 showMotion.value=!reduced.value&&!blocked&&fresh;
 floats.value=showMotion.value?next.numbers.map(n=>{const pos=center(visible(n.target==='enemy'?'.enemy-status':'.character-vitals'))??(n.target==='enemy'?origin?.enemy:null)??at;return{...n,x:Math.max(80,Math.min(innerWidth-80,pos.x)),y:Math.max(100,Math.min(innerHeight-110,pos.y))};}):[];
 if(showMotion.value&&next.family==='battle'&&!next.terminal){const medicine=next.variant.endsWith('heal')||next.variant.endsWith('restore'),actor=visible(medicine||next.variant.endsWith('guard')?'.character-portrait':'.enemy-art');if(actor instanceof HTMLElement)mark(actor,next.variant==='challenge'||medicine?'actor-arrival':'actor-impact',650);}
 if(showMotion.value&&next.family==='travel'){const scene=visible('.scene-image');if(scene instanceof HTMLElement)mark(scene,'scene-arrival',650);}
 if(timer)clearTimeout(timer);timer=setTimeout(()=>{notice.value=null;showMotion.value=false;floats.value=[];state.value='idle';},1600);
});
watch(()=>props.viewKey,()=>{if(notice.value&&epoch!==noticeEpoch)clear();});
watch(reduced,value=>{if(value){showMotion.value=false;floats.value=[];}});
onMounted(()=>{stop=props.store.observe(value=>observation.value=value);document.addEventListener('pointerdown',pointer,true);document.addEventListener('click',click,true);document.addEventListener('visibilitychange',hidden);document.addEventListener('keydown',keyIntent,true);media.addEventListener('change',mediaChange);});
onScopeDispose(()=>{clear();stop();document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',keyIntent,true);media.removeEventListener('change',mediaChange);for(const [element,item]of marks){clearTimeout(item.timer);element.classList.remove(item.className);element.removeAttribute('data-command-state');}marks.clear();});
</script>
<template>
 <div ref="root" class="action-feedback-layer" :data-state="state" data-testid="action-feedback-layer">
  <div v-if="notice&&(!notice.major||notice.terminal||reduced)" :key="notice.key" class="hub-pulse action-feedback-toast" :class="{still:reduced}" role="status" data-testid="hub-pulse" :data-receipt="notice.key" :data-family="notice.family" :data-operation="notice.operation"><strong>{{notice.label}}</strong><span>{{notice.delta}}</span><small>{{notice.summary}}</small></div>
  <div v-if="notice&&showMotion" :key="'art-'+notice.key" class="action-motion" :class="'motion-'+notice.family" :data-family="notice.family" :data-operation="notice.operation" :data-variant="notice.variant" :data-receipt="notice.key" :style="{left:point.x+'px',top:point.y+'px'}" aria-hidden="true" data-testid="action-motion">
   <i class="motion-ring ring-one"/><i class="motion-ring ring-two"/><span class="motion-sigil"><GameIcon :kind="notice.icon.kind" :id="notice.icon.id"/></span>
   <span class="motion-particles"><i v-for="i in 12" :key="i" :style="{'--angle':i*137.5+'deg','--delay':i*14+'ms','--radius':(45+i%4*14)+'px'}"/></span>
   <svg v-if="notice.family==='craft'||notice.family==='forge'" class="motion-flame" viewBox="0 0 80 100"><path d="M40 5C55 30 27 36 47 49C69 31 72 65 66 79C58 101 21 102 11 78C0 51 29 40 22 22C34 33 39 24 40 5ZM40 58C36 71 24 76 31 88C37 98 54 92 51 82C48 75 40 72 40 58Z"/></svg>
   <svg v-if="notice.family==='dialogue'||notice.family==='closure'" class="motion-seal" viewBox="0 0 100 100"><path d="M15 15H85V85H15ZM27 27H73V73H27ZM38 39H62M38 51H62M50 27V73"/></svg>
   <span v-if="notice.family==='battle'" class="motion-slash slash-one"/><span v-if="notice.family==='battle'" class="motion-slash slash-two"/>
  </div>
  <span v-for="(n,index) in floats" :key="notice?.key+'-'+index" class="action-number" :class="{damage:n.value<0}" :style="{left:n.x+'px',top:n.y+'px'}" aria-hidden="true" :data-target="n.target" data-testid="action-number">{{n.value>0?'+':''}}{{n.value}}<small>{{n.label}}</small></span>
  <div v-if="state==='error'" class="action-failure-glow" aria-hidden="true"/>
 </div>
</template>
