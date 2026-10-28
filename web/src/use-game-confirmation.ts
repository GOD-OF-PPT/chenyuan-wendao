import {inject,nextTick,onScopeDispose,shallowRef} from 'vue';
import {gameFocusKey,type useFocus} from './focus';

export type ConfirmationAppearance={fontScale:number;reduceMotion:boolean};
export type ConfirmationOptions={kind:string;title:string;message:string;action:string;cancel?:string;current:()=>boolean;blocked?:()=>string;mayReturn?:()=>boolean;opener?:HTMLElement|null};
export type GameConfirmation=ConfirmationOptions&{id:number;appearance:()=>ConfirmationAppearance};

/** UI consent only. Callers retain their frozen intent and all writing authority. */
export function useGameConfirmation(options:{focus?:ReturnType<typeof useFocus>;appearance:()=>ConfirmationAppearance}){
 const focus=options.focus??inject(gameFocusKey,undefined),request=shallowRef<GameConfirmation|null>(null);
 let serial=0,disposed=false,pending:{request:GameConfirmation;resolve:(value:boolean)=>void;parent:HTMLDialogElement|null;opener:HTMLElement|null}|null=null;
 function settle(value:boolean,restore=true){
  const source=pending;if(!source)return;
  if(value&&(!source.request.current()||source.request.blocked?.()))return;
  pending=null;request.value=null;
  if(!restore){source.resolve(value);return;}
  void nextTick(()=>{
   if(disposed||pending){source.resolve(false);return;}
   try{
    if(source.request.mayReturn?.()===false){focus?.restore(null);return;}
    const parent=source.parent;
    if(parent?.isConnected&&!document.querySelector('dialog[open]')){
     if(!parent.open)parent.showModal();
     const target=source.opener?.isConnected&&parent.contains(source.opener)?source.opener:parent.querySelector<HTMLElement>('button:not([disabled]),[data-dialog-initial]');
     if(focus)focus.target(target);else target?.focus({preventScroll:true});
    }else if(!document.querySelector('dialog[open]'))focus?.restore(source.opener);
   }catch{focus?.restore(null);}
   finally{source.resolve(value);}
  });
 }
 function ask(input:ConfirmationOptions):Promise<boolean>{
  if(disposed)return Promise.resolve(false);
  const previous=pending,opener=input.opener??previous?.opener??focus?.capture()??(document.activeElement instanceof HTMLElement?document.activeElement:null);
  const candidate=opener?.closest<HTMLDialogElement>('dialog[open]')??null,parent=candidate?.matches('[data-testid=game-confirmation]')?previous?.parent??null:candidate;
  settle(false,false);
  return new Promise(resolve=>{
   const value={...input,id:++serial,appearance:options.appearance};pending={request:value,resolve,parent,opener};
   parent?.close();request.value=value;
  });
 }
 onScopeDispose(()=>{disposed=true;settle(false,false);});
 return{request,ask,answer:settle};
}
