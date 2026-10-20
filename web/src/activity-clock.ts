export type ActivityClock = {now:()=>number;set:(callback:()=>void,ms:number)=>unknown;clear:(id:unknown)=>void};
const realClock:ActivityClock={now:()=>performance.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id as ReturnType<typeof setTimeout>)};
/** Online elapsed time only. The caller must still pass the database deadline and ownership checks. */
export function createActivityClock(clock:ActivityClock=realClock){
 let generation=0,handle:unknown,settle:((value:boolean)=>void)|null=null;
 function cancel(){generation++;if(handle!==undefined)clock.clear(handle);handle=undefined;const done=settle;settle=null;done?.(false);}
 function wait(milliseconds:number,onTick:(remaining:number)=>void):Promise<boolean>{
  if(!Number.isSafeInteger(milliseconds)||milliseconds<1||milliseconds>240000)throw new Error('修炼周期无效');
  cancel();const owner=generation,start=clock.now();let last=start;
  if(!Number.isFinite(start))throw new Error('计时不可用，请重新接续修炼');
  return new Promise((resolve,reject)=>{
   settle=resolve;
   function tick(){
    if(owner!==generation)return;
    try{const now=clock.now();if(!Number.isFinite(now)||now<last)throw new Error('计时发生变化，请重新接续修炼');last=now;
     const remaining=Math.max(0,milliseconds-(now-start));onTick(remaining);
     if(owner!==generation)return;
     if(!remaining){handle=undefined;settle=null;resolve(true);}else handle=clock.set(tick,Math.min(100,remaining));
    }catch(error){handle=undefined;settle=null;generation++;reject(error);}
   }
   tick();
  });
 }
 return{wait,cancel};
}
