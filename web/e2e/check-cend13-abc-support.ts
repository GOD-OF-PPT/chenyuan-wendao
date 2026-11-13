import{proveControl,proveCycle}from'./scheduled-proof-support';
import {currentPageTool} from './readonly-navigation-support';
import{expect,type Page,type Locator,type TestInfo}from'@playwright/test';
import type{Game}from'../../src/full/types';





import{snapshot,activitySnapshot as activity,openHubFeature}from'./support';
import{recoveryDatabase as database,stored}from'./idle-recovery-ui-support';
import{home,decision}from'./idle-route-support';
import{captureFixedPng}from'./png-capture';

export{snapshot,activity,database,stored,home,decision};
export async function attach(info:TestInfo,name:string,value:unknown){await info.attach(name,{body:JSON.stringify(value),contentType:'application/json'});}
export async function readonly(page:Page,work:()=>Promise<void>){const g=await snapshot(page),raw=await database(page);await work();expect(await snapshot(page)).toEqual(g);expect(await database(page)).toEqual(raw);}
export async function openTrial(page:Page){if(await page.getByTestId('trial-preparation').isVisible())return;await home(page);await page.getByTestId('tab-0').click();if(!await page.getByTestId('breakthrough').isVisible())await openHubFeature(page,'cultivation-details');await decision(page,page.getByTestId('breakthrough'));await expect(page.getByTestId('trial-preparation')).toBeVisible();}
export async function openPreparation(page:Page){if(await page.getByTestId('preparation-catalogue').isVisible())return;if(!await page.getByTestId('feature-menu-open').isVisible()){await home(page);await page.getByTestId('hub-goal').click();}await decision(page,await currentPageTool(page,'feature-prepare'));await expect(page.getByTestId('preparation-catalogue')).toBeVisible();}
export async function readPages(root:Locator,label:string){
 const pager=root.getByRole('navigation',{name:label+'翻页',exact:true}),previous=pager.getByRole('button',{name:'上一页',exact:true}),next=pager.getByRole('button',{name:'下一页',exact:true});
 while(await previous.count()&&await previous.isEnabled())await previous.click();const rows=new Map<string,string>();
 for(let i=0;i<120;i++){const r=root.locator('.reading-text').first(),key=await r.getAttribute('data-page-key'),text=await r.locator('p').innerText();expect(key).toBeTruthy();rows.set(key!,(rows.get(key!)??'')+text);if(!await next.count()||await next.isDisabled()){while(await previous.count()&&await previous.isEnabled())await previous.click();return rows;}await next.click();}
 throw Error('Finite current reading did not terminate');
}
export async function readTrial(page:Page,mode:string){const root=page.getByTestId('trial-preparation');await root.getByTestId('trial-mode-'+mode).click();return readPages(root,'渡劫');}
export async function lastMs(page:Page,a:any,g:Game,raw:any){const left=a.dueAt-await page.evaluate(()=>Date.now());expect(left).toBeGreaterThan(0);expect(left).toBeLessThanOrEqual(a.cycleMs);await page.clock.fastForward(left-1);expect(await snapshot(page)).toEqual(g);expect(await database(page)).toEqual(raw);}
export async function mutation(page:Page,g:Game,before:any,kind:'START'|'PAUSE'|'RESUME',info:TestInfo){
 const raw=await database(page),proof=proveControl(raw,before,g,kind);expect(await activity(page)).toEqual(proof.a);expect(await snapshot(page)).toEqual(g);await attach(info,kind+'-full-formal-mutation',{g,before,...proof});return proof;
}
export async function saved(page:Page,g:Game,a:any,before:any,info:TestInfo){
 await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(a.completedCycles+1);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 const raw=await database(page),proof=proveCycle(raw,before,g,a);expect(await snapshot(page)).toEqual(proof.after);expect(await activity(page)).toEqual(proof.done);await attach(info,'full-official-cycle-all-stores',proof);return{g:proof.after,raw,a:proof.done,r:proof.receipt};
}
export async function fault(page:Page,kind:'start'|'checkpoint'|'abort-checkpoint'|'travel'){
 await page.evaluate(kind=>{const put=IDBObjectStore.prototype.put,w=window as any;w.__abcRestore=()=>IDBObjectStore.prototype.put=put;w.__abcRejected=null;
  IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.transaction.db.name!=='chenyuan-playable-v1')return key===undefined?put.call(this,value):put.call(this,value,key);
   const hit=kind==='start'?this.name==='full-receipts'&&value?.input?.kind==='START':kind==='travel'?this.name==='full-receipts'&&value?.input?.kind==='TICK':this.name==='full-state'&&key==='checkpoint';
   if(!hit)return key===undefined?put.call(this,value):put.call(this,value,key);w.__abcRejected={store:this.name,key,value:structuredClone(value),requestSuccess:false,abortCalled:false};w.__abcRestore();
   if(kind==='abort-checkpoint'){const tx=this.transaction,r=key===undefined?put.call(this,value):put.call(this,value,key);r.addEventListener('success',()=>{w.__abcRejected.requestSuccess=true;tx.abort();w.__abcRejected.abortCalled=true;});return r;}
   throw new DOMException('ABC original '+kind+' quota','QuotaExceededError');
  };
 },kind);
}
export async function frame(page:Page,info:TestInfo,name:string,root?:Locator){
 const dialog=page.locator('dialog[open]');if(await dialog.count())root=dialog.last();if(!root){for(const id of ['preparation-catalogue','trial-preparation','narrative-catalogue','cultivation-site'])if(await page.getByTestId(id).isVisible()){root=page.getByTestId(id);break;}}if(!root)throw Error('No actual current surface for '+name);
 await expect.poll(()=>page.locator('[data-art-state=loading]').evaluateAll(ns=>ns.filter(n=>n.checkVisibility()).length)).toBe(0);
 const data=await root.evaluate(scope=>{const box=(e:Element)=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},nav=box(document.getElementById('primary-navigation')!);return{root:box(scope),nav,screen:document.documentElement.scrollHeight<=innerHeight,rows:[...scope.querySelectorAll('button,p,small,strong,h2,h3')].filter(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(n=>{const b=box(n),r=document.createRange();r.selectNodeContents(n);const hit=document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2),button=n.closest('button'),navigation=!!button&&(!button.matches('.primary')&&!!button.closest('header,.story-inline-actions,.story-footer')||button.matches('[data-testid=trial-review-entry],.choice-peek')),aux=n.matches('small,.small')||!!n.closest('.catalogue-tabs,.catalogue-pager')||navigation;return{text:n.textContent,box:b,font:parseFloat(getComputedStyle(n).fontSize),minimum:aux?14:18,range:[...r.getClientRects()].filter(x=>x.width&&x.height).every(x=>x.left>=b.left-1&&x.right<=b.right+1&&x.top>=b.top-1&&x.bottom<=b.bottom+1),button:n.matches('button'),enabled:!n.matches(':disabled'),hit:hit===n||!!hit&&n.contains(hit)};})};});
 await attach(info,name+'-geometry',data);await captureFixedPng(page,info.outputPath(name+'.png'));expect(data.screen).toBe(true);for(const r of data.rows){expect(r.font,r.text??'').toBeGreaterThanOrEqual(r.minimum);expect(r.range,r.text??'').toBe(true);expect(r.box.left,r.text??'').toBeGreaterThanOrEqual(data.root.left);expect(r.box.right,r.text??'').toBeLessThanOrEqual(data.root.right+1);expect(r.box.top,r.text??'').toBeGreaterThanOrEqual(data.root.top);expect(r.box.bottom,r.text??'').toBeLessThanOrEqual(Math.min(data.root.bottom,data.nav.top));if(r.button){expect(r.box.height,r.text??'').toBeGreaterThanOrEqual(44);if(r.enabled)expect(r.hit,r.text??'').toBe(true);}}
}

/** Passive isolated-test startup metadata; restore wrappers before assertions continue. */
export async function observeStartup(page:Page){await page.addInitScript(()=>{
 const w=window as any,events:any[]=[],factory=IDBFactory.prototype,db=IDBDatabase.prototype,store=IDBObjectStore.prototype,open=factory.open,transaction=db.transaction,get=store.get;
 const note=(event:string,fields:Record<string,unknown>)=>{if(events.length<80)events.push({sequence:events.length,event,...fields});};
 const opening=function(this:IDBFactory,...args:any[]){const request=Reflect.apply(open,this,args);note('open',{database:args[0],version:args[1]??null});for(const event of ['success','error','blocked','upgradeneeded'])request.addEventListener(event,()=>note('open.'+event,{database:args[0],errorName:event==='error'?request.error?.name??null:null}));return request;};
 const transacting=function(this:IDBDatabase,...args:any[]){const tx=Reflect.apply(transaction,this,args);note('transaction',{database:this.name,mode:tx.mode});for(const event of ['complete','abort','error'])tx.addEventListener(event,()=>note('transaction.'+event,{database:this.name,mode:tx.mode,errorName:tx.error?.name??null}));return tx;};
 const getting=function(this:IDBObjectStore,...args:any[]){const request=Reflect.apply(get,this,args),database=this.transaction.db.name,name=this.name;note('read',{database,store:name});for(const event of ['success','error'])request.addEventListener(event,()=>note('read.'+event,{database,store:name,errorName:event==='error'?request.error?.name??null:null}));return request;};
 factory.open=opening;db.transaction=transacting;store.get=getting;
 w.__abcStartup={events,stop(){if(factory.open===opening)factory.open=open;if(db.transaction===transacting)db.transaction=transaction;if(store.get===getting)store.get=get;}};
});}
export async function startupEvidence(page:Page,info:TestInfo){if(page.isClosed())return;const observed=await page.evaluate(()=>{const w=window as any;w.__abcStartup?.stop();return{save:document.querySelector('[data-testid=save-status]')?.textContent,local:document.querySelector('[data-testid=local-data-status]')?.textContent,events:w.__abcStartup?.events??[]};});await attach(info,'second-page-native-startup-metadata',observed);}
