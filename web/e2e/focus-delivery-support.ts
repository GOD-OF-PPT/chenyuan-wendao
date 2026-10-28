import {expect,type Page} from '@playwright/test';

/** Hold consumption of the original trusted UI-close and completed readonly-IDB
 * events. Native transactions and the accepted Game cycle remain unchanged. */
export async function installRetirementDeliveryGate(page:Page){
 await page.addInitScript(()=>{
  const w=window as any,add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,get=IDBObjectStore.prototype.get;
  const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');if(!descriptor?.get||!descriptor.set||!descriptor.configurable)throw Error('Expected the fixed native transaction event seam');
  const marked=new WeakSet<IDBTransaction>(),bindings:any[]=[],closePending:Array<()=>void>=[],readPending:Array<()=>void>=[];
  const state={closeArmed:false,readArmed:false,closeHeld:[]as any[],readHeld:[]as any[],inputs:[]as any[]};
  EventTarget.prototype.addEventListener=function(type:any,listener:any,options?:any){
   if(type==='close'&&this instanceof HTMLDialogElement&&typeof listener==='function'&&Function.prototype.toString.call(listener).includes('queueMicrotask')){
    const target=this,wrapped=function(event:Event){
     if(state.closeArmed&&target.dataset.testid==='life-confirmation'&&!target.open&&event.isTrusted){state.closeHeld.push({trusted:event.isTrusted,type:event.type,dialog:target.dataset.testid});closePending.push(()=>Reflect.apply(listener,target,[event]));return;}
     Reflect.apply(listener,target,[event]);
    };bindings.push({target,type,listener,wrapped,options});return add.call(target,type,wrapped,options);
   }return add.call(this,type,listener,options);
  };
  EventTarget.prototype.removeEventListener=function(type:any,listener:any,options?:any){const at=bindings.findIndex(r=>r.target===this&&r.type===type&&r.listener===listener),row=at<0?null:bindings.splice(at,1)[0];return remove.call(this,type,row?.wrapped??listener,options);};
  IDBObjectStore.prototype.get=function(...args:any[]){if(state.readArmed&&this.transaction.db.name==='chenyuan-playable-v1'&&this.transaction.mode==='readonly'&&this.name==='full-state'&&args[0]==='checkpoint')marked.add(this.transaction);return Reflect.apply(get,this,args);};
  Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(callback:any){
   if(typeof callback!=='function')return descriptor.set!.call(this,callback);const tx=this;
   return descriptor.set!.call(tx,function(event:Event){if(state.readArmed&&marked.has(tx)){
    state.readHeld.push({trusted:event.isTrusted,type:event.type,mode:tx.mode,database:tx.db.name});readPending.push(()=>Reflect.apply(callback,tx,[event]));return;
   }Reflect.apply(callback,tx,[event]);});
  }});
  const input=(e:KeyboardEvent)=>{if(state.readArmed)state.inputs.push({key:e.key,trusted:e.isTrusted});};add.call(document,'keydown',input,true);
  const release=(rows:Array<()=>void>)=>{for(const callback of rows.splice(0))callback();};
  w.__m04LifeDelivery={state,armClose(){state.closeArmed=true;},armRead(){state.readArmed=true;},releaseClose(){state.closeArmed=false;release(closePending);},releaseRead(){state.readArmed=false;release(readPending);},cleanup(){state.closeArmed=false;state.readArmed=false;EventTarget.prototype.addEventListener=add;EventTarget.prototype.removeEventListener=remove;IDBObjectStore.prototype.get=get;Object.defineProperty(IDBTransaction.prototype,'oncomplete',descriptor);remove.call(document,'keydown',input,true);for(const r of bindings){remove.call(r.target,r.type,r.wrapped,r.options);add.call(r.target,r.type,r.listener,r.options);}release(closePending);release(readPending);}};
 });
}
export async function armRetirementClose(page:Page){await page.evaluate(()=>{(window as any).__m04OldSettings=document.querySelector('[data-testid=game-settings]');(window as any).__m04LifeDelivery.armClose();});}
export async function armRetirementRead(page:Page){await page.evaluate(()=>(window as any).__m04LifeDelivery.armRead());}
export async function releaseRetirementInOrder(page:Page,newInput=false){
 await expect.poll(()=>page.evaluate(()=>(window as any).__m04LifeDelivery.state.readHeld.length)).toBe(1);
 await expect.poll(()=>page.evaluate(()=>(window as any).__m04LifeDelivery.state.closeHeld.length)).toBeGreaterThan(0);
 await expect(page.getByTestId('hub-current')).toContainText('主动归隐');await expect.poll(()=>page.evaluate(()=>(window as any).__m04OldSettings?.isConnected)).toBe(false);await expect(page.getByTestId('sealed-life-hud')).toBeVisible();await expect(page.getByTestId('game-settings')).toHaveCount(1);
 await page.evaluate(()=>(window as any).__m04LifeDelivery.releaseClose());await expect(page.getByTestId('hub-current')).toBeFocused();
 if(newInput)await page.keyboard.press('Tab');const selected=await page.evaluateHandle(()=>document.activeElement);
 const evidence=await page.evaluate(()=>(window as any).__m04LifeDelivery.state);expect(evidence.closeHeld.every((r:any)=>r.trusted&&r.type==='close')).toBe(true);expect(evidence.readHeld).toEqual([{trusted:true,type:'complete',mode:'readonly',database:'chenyuan-playable-v1'}]);if(newInput)expect(evidence.inputs).toEqual([{key:'Tab',trusted:true}]);else expect(evidence.inputs).toEqual([]);
 await page.evaluate(()=>(window as any).__m04LifeDelivery.releaseRead());const surface=page.locator('main[aria-busy]:visible').first();await expect(surface).toBeVisible();await expect(surface).toHaveAttribute('aria-busy','false');return{selected,evidence};
}
export async function cleanupRetirementGate(page:Page){if(!page.isClosed())await page.evaluate(()=>(window as any).__m04LifeDelivery?.cleanup());}
