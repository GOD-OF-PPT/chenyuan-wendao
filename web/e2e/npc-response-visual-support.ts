import {expect,type Page,type TestInfo} from '@playwright/test';

/** 0158 replaces the floating stamp with one bounded, readable committed result. */
export async function resultMomentClearance(page:Page,info:TestInfo){
 const moment=page.getByTestId('result-moment');await expect(moment).toBeVisible();
 const facts=await moment.evaluate(root=>{
  const object=root.querySelector('.result-moment-object')!,b=object.getBoundingClientRect(),outer={left:b.left-30,right:b.right+30,top:b.top-30,bottom:b.bottom+30};
  const overlap=(a:any,b:any)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const nodes=[...root.querySelectorAll('strong,p,small,button'),...document.querySelectorAll('.fate-book .catalogue-tabs button,.fate-book .reading-text,.fate-book .encounter-decision button,#primary-navigation button')].filter(e=>e.checkVisibility());
  const nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),r=root.getBoundingClientRect();
  return {art:b.toJSON(),outer,card:r.toJSON(),navTop:nav.top,bodyHeight:document.documentElement.scrollHeight,collisions:nodes.filter(e=>overlap(outer,e.getBoundingClientRect())).map(e=>({text:(e as HTMLElement).innerText,box:e.getBoundingClientRect().toJSON()})),buttonHits:[...root.querySelectorAll('button')].map(n=>{const q=n.getBoundingClientRect(),hit=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);return q.width>=44&&q.height>=44&&!!hit&&(hit===n||n.contains(hit));})};
 });
 await info.attach('saved-npc-result-30px-clearance',{body:JSON.stringify(facts),contentType:'application/json'});
 expect(facts.collisions).toEqual([]);expect(facts.card.bottom).toBeLessThanOrEqual(facts.navTop);expect(facts.bodyHeight).toBeLessThanOrEqual(900);expect(facts.buttonHits.every(Boolean)).toBe(true);
}

