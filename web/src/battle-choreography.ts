import {computed,onScopeDispose,shallowRef,watch} from 'vue';
import type {Activity} from '../../src/full/activity';
import type {Game,Move} from '../../src/full/types';
import type {ActionNotice} from './action-feedback';
import type {Observation} from './local-events';
import type {useGame} from './store';
import type {ActionResult} from '../../src/full/contracts';
import {createActivityEffectTracker} from './activity-effects.ts';
import {useActivityPresentation} from './use-activity-effect.ts';

type Store=ReturnType<typeof useGame>;
type Runtime=Store['activityRuntime'];
export type BattleSchool='sword'|'talisman';
export const BATTLE_SHAPES={attack:'thrust',guard:'ward',technique:'gather',release:'burst',heal:'elixir',restore:'spirit',flee:'withdraw'} as const;
type FrozenCast={id:string;generation:number;owner:string;commandId:string;runId:string;revision:number;enemy:string;stage:number|null;move:Move;school:BattleSchool;enemyHp:number};
export type BattleCue=FrozenCast&{key:string;variant:string;enemyHurt:boolean;hurt:boolean};
const matching=(a:Activity)=>a.version===6&&a.plan.kind!=='travel';
function freeze(a:Activity|null,g:Game|null,r:Runtime):FrozenCast|null{
 if(!a||a.version!==6||a.plan.kind==='travel'||!g?.battle||!g.school||a.status!=='running'||a.runId!==g.core.runId||a.gameRevision!==g.core.revision||r?.phase!=='running'||r.id!==a.id||r.generation!==a.generation||a.nextCommand?.type!=='BATTLE'||a.plan.enemy!==g.battle.enemy)return null;
 if(a.plan.kind==='battle'&&a.plan.trialStage!==(g.trial?.stage??null))return null;
 return{id:a.id,generation:a.generation,owner:a.ownerId,commandId:a.nextCommand.commandId,runId:g.core.runId,revision:g.core.revision,enemy:g.battle.enemy,stage:g.trial?.stage??null,move:a.nextCommand.move,school:g.school,enemyHp:g.battle.hp};
}

/** Preparation only; the shared hook's result is deliberately not rendered here. */
export function useBattlePreparation(game:()=>Game,active:()=>boolean){
 const identity=()=>game().core.runId+':'+game().battle?.enemy+':'+game().trial?.stage;
 const p=useActivityPresentation(a=>a.version===6&&a.plan.kind!=='travel'&&a.plan.enemy===game().battle?.enemy&&a.gameRevision===game().core.revision&&(a.plan.kind!=='battle'||a.plan.trialStage===(game().trial?.stage??null)),identity,active);
 const armed=shallowRef<FrozenCast|null>(null);
 watch(p.runtime,r=>{const next=freeze(p.activity.value,p.store?.game??null,r);if(next&&next.commandId!==armed.value?.commandId)armed.value=next;},{immediate:true,flush:'sync'});
 const command=computed(()=>{const c=armed.value,a=p.activity.value;return p.runtime.value&&c&&a&&c.id===a.id&&c.generation===a.generation&&c.owner===a.ownerId&&c.runId===game().core.runId&&c.enemy===game().battle?.enemy&&c.stage===(game().trial?.stage??null)?c:null;});
 return{...p,command};
}

/** No observer, clock or mutation: the existing global observer delivers the saved fact. */
export function createBattleWitness(){
 const tracker=createActivityEffectTracker(matching);
 let armed:FrozenCast|null=null,verified:BattleCue|null=null;
 function reset(){tracker.clear();armed=null;verified=null;}
 return{
  arm(a:Activity|null,g:Game|null,r:Runtime){
   const next=freeze(a,g,r);
   if(!next||next.commandId===armed?.commandId)return;
   tracker.arm(a,g!,r!.id,r!.generation);armed=next;
  },
  capture(o:Observation,g:Game|null,a:Activity|null,result:ActionResult|null,replayed:boolean,eligible:boolean){
   const prior=armed;if(o.errorCode){verified=null;return null;}
   const notice=tracker.consume(o,g,a,result,replayed,eligible);
   if(!notice||!prior||notice.operation!=='BATTLE'||notice.key!==JSON.stringify([prior.runId,prior.commandId])||!g||!result)return null;
   verified={...prior,key:notice.key,variant:notice.variant,revision:result.revisionAfter,enemyHurt:g.battle?.enemy===prior.enemy&&g.battle.hp<prior.enemyHp,hurt:result.delta.hp<0};armed=null;return verified;
  },
  forNotice(n:ActionNotice){return n.operation==='BATTLE'&&verified?.key===n.key&&verified.variant===n.variant?verified:null;},
  clear:reset,
 };
}

/** Capture is synchronous inside the original observer, before the next cycle can arm. */
export function useBattleWitness(getStore:()=>Store,view:()=>string,active:()=>boolean){
 const witness=createBattleWitness();
 let identity='';
 function arm(){const s=getStore();if(active()&&!document.hidden&&!s.activityPausing&&s.available&&!s.error)witness.arm(s.activity,s.game,s.activityRuntime);}
 watch(()=>{const s=getStore(),r=s.activityRuntime;return[JSON.stringify([view(),active(),s.game?.core.runId,s.activity?.id,s.activity?.generation,s.activity?.ownerId,s.activityPausing,s.activity?.status==='paused']),r?.id,r?.generation,r?.phase] as const;},([key])=>{
  if(identity!==key){witness.clear();identity=key;}arm();
 },{immediate:true,flush:'sync'});
 function visibility(){if(document.hidden)witness.clear();else arm();}
 document.addEventListener('visibilitychange',visibility);
 onScopeDispose(()=>{witness.clear();document.removeEventListener('visibilitychange',visibility);});
 return{
  capture(o:Observation){
   const s=getStore();return witness.capture(o,s.game,s.activity,s.lastResult,s.lastReplayed,active()&&s.saved&&s.available&&!s.error&&!s.activityPausing&&!document.hidden);
  },
  forNotice:witness.forNotice,
 };
}

export function castForNotice(n:ActionNotice){
 if(n.operation!=='BATTLE'||n.terminal||typeof n.variant!=='string'||n.variant.split('-').length!==2)return null;
 const [school,move]=n.variant.split('-') as [BattleSchool,Move];
 return(school==='sword'||school==='talisman')&&Object.hasOwn(BATTLE_SHAPES,move)?{school,move,shape:BATTLE_SHAPES[move]}:null;
}
function actors(c:BattleCue){
 const scene=[...document.querySelectorAll<HTMLElement>('.battle-presence[data-active=true]')].find(n=>n.dataset.run===c.runId&&n.dataset.enemy===c.enemy&&n.dataset.stage===String(c.stage??'ordinary')&&n.dataset.revision===String(c.revision)&&n.getBoundingClientRect().width>0);
 return{player:scene?.querySelector<HTMLElement>('.battle-player-art')??null,enemy:scene?.querySelector<HTMLElement>('.enemy-art')??null};
}
type CastRect=Pick<DOMRect,'left'|'right'|'top'|'bottom'>;
/** Fit the complete painted frame, including its glow, into actual unoccupied actor space. */
export function fitBattleCast(actor:CastRect,scene:CastRect,obstacles:CastRect[]){
 const area={left:Math.max(actor.left,scene.left),right:Math.min(actor.right,scene.right),top:Math.max(actor.top,scene.top),bottom:Math.min(actor.bottom,scene.bottom)};
 let spaces=[area];
 for(const raw of obstacles){
  const cut={left:raw.left-4,right:raw.right+4,top:raw.top-4,bottom:raw.bottom+4};
  spaces=spaces.flatMap(r=>{
   if(cut.right<=r.left||cut.left>=r.right||cut.bottom<=r.top||cut.top>=r.bottom)return[r];
   return[{...r,bottom:Math.max(r.top,cut.top)},{...r,top:Math.min(r.bottom,cut.bottom)},{...r,right:Math.max(r.left,cut.left)},{...r,left:Math.min(r.right,cut.right)}].filter(v=>v.right-v.left>=88&&v.bottom-v.top>=88);
  });
 }
 const preferred={x:(actor.left+actor.right)/2,y:actor.top+(actor.bottom-actor.top)*.72};
 return spaces.map(r=>{
  const size=Math.floor(Math.min(128,r.right-r.left-24,r.bottom-r.top-24)),half=size/2+12;
  const x=Math.max(r.left+half,Math.min(r.right-half,preferred.x)),y=Math.max(r.top+half,Math.min(r.bottom-half,preferred.y));
  return{x,y,size,distance:Math.hypot(x-preferred.x,y-preferred.y)};
 }).filter(p=>p.size>=64).sort((a,b)=>b.size-a.size||a.distance-b.distance)[0]??null;
}
export function battleSpot(c:BattleCue|null){
 if(!c)return null;const a=actors(c),self=['guard','heal','restore'].includes(c.move),target=self?a.player:a.enemy,scene=target?.closest('.battle-presence');
 if(!target||!scene)return null;
 const image=target.querySelector('img'),r=(image??target).getBoundingClientRect();
 const scale=image?.naturalWidth&&image.naturalHeight?Math.min(r.width/image.naturalWidth,r.height/image.naturalHeight):1;
 const width=image?.naturalWidth?image.naturalWidth*scale:r.width,height=image?.naturalHeight?image.naturalHeight*scale:r.height;
 const actor={left:r.left+(r.width-width)/2,right:r.left+(r.width+width)/2,top:r.top+(r.height-height)/2,bottom:r.top+(r.height+height)/2};
 const obstacles:CastRect[]=[...scene.querySelectorAll('.battle-own-status,.enemy-status')].map(n=>n.getBoundingClientRect());
 for(const element of scene.querySelectorAll('.battle-exchange strong,.battle-exchange small,.battle-exchange span')){const range=document.createRange();range.selectNodeContents(element);obstacles.push(...range.getClientRects());}
 if(self)obstacles.push({...actor,bottom:actor.top+height/3});
 const spot=fitBattleCast(actor,scene.getBoundingClientRect(),obstacles);return spot?{...spot,target}:null;
}
export function clearBattlePose(n:HTMLElement){n.removeAttribute('data-cast-move');n.removeAttribute('data-cast-school');n.removeAttribute('data-cast-role');n.removeAttribute('data-cast-response');}
export function castActors(n:ActionNotice,c:BattleCue|null,mark:(n:HTMLElement|null,kind:string,ms:number)=>void){
 if(n.terminal)return;
 if(n.operation==='ENCOUNTER'){const enemy=[...document.querySelectorAll<HTMLElement>('.battle-presence[data-active=true] .enemy-art')].find(e=>e.getBoundingClientRect().width>0);mark(enemy??null,'actor-arrival',650);return;}
 if(!c||!castForNotice(n))return;
 const a=actors(c);
 for(const [role,element] of Object.entries(a)){
  if(!element||role==='enemy'&&!c.enemyHurt&&!c.hurt)continue;
  const self=['guard','heal','restore'].includes(c.move);
  mark(element,(role==='enemy'?c.enemyHurt:c.hurt&&!self)?'actor-impact':'actor-arrival',650);
  element.dataset.castMove=c.move;element.dataset.castSchool=c.school;element.dataset.castRole=role;
  if(role==='enemy')element.dataset.castResponse=c.hurt?(c.enemyHurt?'exchange':'counter'):'hit';
 }
}
