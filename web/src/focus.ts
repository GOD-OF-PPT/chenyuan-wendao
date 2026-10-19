import {nextTick,onMounted,onUnmounted,type InjectionKey} from 'vue';
export const gameFocusKey:InjectionKey<ReturnType<typeof useFocus>>=Symbol('game-focus');

export function visibleFocusTarget(element:Element|null):element is HTMLElement{
 if(!(element instanceof HTMLElement)||!element.isConnected||element.closest('[inert]'))return false;
 if('disabled' in element&&(element as HTMLButtonElement).disabled)return false;
 const style=getComputedStyle(element),box=element.getBoundingClientRect();
 return style.visibility!=='hidden'&&style.display!=='none'&&box.width>0&&box.height>0;
}
/** Keep a keyboard target above author overlays; never advance game state. */
export function revealFocus(element:HTMLElement){
 if(!visibleFocusTarget(element))return;
 const dialog=element.closest<HTMLDialogElement>('dialog[open]');
 if(dialog){element.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});return;}
 const footer=document.querySelector<HTMLElement>('.bottom-nav'),bar=footer?.getBoundingClientRect();
 const top=Math.max(12,...[...document.querySelectorAll<HTMLElement>('.error-banner')].map(e=>e.getBoundingClientRect()).filter(r=>r.top<=8&&r.bottom>0).map(r=>r.bottom+12));
 const bottom=bar&&bar.height>0?Math.min(innerHeight-12,bar.top-12):innerHeight-12,box=element.getBoundingClientRect();
 if(box.top<top||box.bottom>bottom){
  if(box.height>bottom-top){element.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});scrollBy({top:-top,behavior:'instant'});}
  else scrollBy({top:box.top-(top+(bottom-top-box.height)/2),behavior:'instant'});
 }
}
export function useFocus(fallback:()=>HTMLElement|null){
 let pointerActive=false;
 function pointerStart(){pointerActive=true;}function pointerEnd(){pointerActive=false;}
 const listeners=new Map<HTMLDialogElement,{opener:HTMLElement|null;close:()=>void;key:(event:KeyboardEvent)=>void}>();
 function target(element:HTMLElement|null){if(!visibleFocusTarget(element))return; element.focus({preventScroll:true});revealFocus(element);}
 function capture(){const active=document.activeElement;return active instanceof HTMLElement&&active!==document.body&&active!==document.documentElement?active:null;}
 function restore(opener:HTMLElement|null){
  if(document.querySelector('dialog[open]'))return;
  const active=document.activeElement;
  if(active!==document.body&&visibleFocusTarget(active))return;
  target(visibleFocusTarget(opener)?opener:fallback());
 }
 function open(dialog:HTMLDialogElement|undefined,opener:HTMLElement|null=capture()){
  if(!dialog||dialog.open)return;
  let record=listeners.get(dialog);
  if(!record){
   const close=()=>{if(dialog.open)return;const source=listeners.get(dialog)?.opener??null;queueMicrotask(()=>restore(source));};
   const key=(event:KeyboardEvent)=>{if(event.key!=='Tab'||event.ctrlKey||event.metaKey)return;const targets=[...dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])')].filter(visibleFocusTarget);const at=targets.indexOf(document.activeElement as HTMLElement);if(!targets.length){event.preventDefault();target(dialog.querySelector<HTMLElement>('[data-dialog-initial]')??dialog);}else if(event.shiftKey&&at<=0){event.preventDefault();target(targets.at(-1)!);}else if(!event.shiftKey&&at===targets.length-1){event.preventDefault();target(targets[0]);}};
   record={opener,close,key};listeners.set(dialog,record);dialog.addEventListener('close',close);dialog.addEventListener('keydown',key);
  }else record.opener=opener;
  dialog.showModal();target(dialog.querySelector<HTMLElement>('[data-dialog-initial]')??dialog);
 }
 function release(dialog:HTMLDialogElement|undefined){if(!dialog)return;const r=listeners.get(dialog);if(!r)return;dialog.removeEventListener('close',r.close);dialog.removeEventListener('keydown',r.key);listeners.delete(dialog);if(dialog.open)dialog.close();}
 function onFocus(event:FocusEvent){if(pointerActive)return;const element=event.target;if(element instanceof HTMLElement)queueMicrotask(()=>{if(document.activeElement===element)revealFocus(element);});}
 onMounted(()=>{document.addEventListener('focusin',onFocus);document.addEventListener('pointerdown',pointerStart,true);document.addEventListener('pointerup',pointerEnd,true);document.addEventListener('pointercancel',pointerEnd,true);});onUnmounted(()=>{document.removeEventListener('focusin',onFocus);document.removeEventListener('pointerdown',pointerStart,true);document.removeEventListener('pointerup',pointerEnd,true);document.removeEventListener('pointercancel',pointerEnd,true);for(const [dialog,record]of listeners){dialog.removeEventListener('close',record.close);dialog.removeEventListener('keydown',record.key);}listeners.clear();});
 async function afterAction<T>(operation:()=>Promise<T>,stillOwns:()=>boolean){const opener=capture();const value=await operation();await nextTick();if(opener&&stillOwns()&&(document.activeElement===document.body||document.activeElement===opener&&!visibleFocusTarget(opener)))target(visibleFocusTarget(opener)?opener:fallback());return value;}
 return{target,capture,restore,open,release,afterAction};
}
