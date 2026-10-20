import {expect,type Page} from '@playwright/test';
import * as C from '../../src/full/content.ts';
const virtualJourneys=new WeakSet<Page>();
/** Long-route tests advance the real browser timer; game commands and persistence remain unchanged. */
export async function useJourneyClock(page:Page){await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));virtualJourneys.add(page);}
export async function finishJourneyClock(page:Page){if(virtualJourneys.has(page)){await expect(page.getByTestId('action-execution')).toBeVisible();await page.clock.fastForward(2500);}}
export async function revealPaged(page:Page,id:string,panelId:string,label?:string){const target=page.getByTestId(id),panel=page.getByTestId(panelId);if(await target.isVisible()||!await panel.isVisible())return;const pager=label?panel.getByRole('navigation',{name:label+'翻页'}):panel.locator('.catalogue-pager').last();const prev=pager.getByTestId('catalogue-prev'),next=pager.getByTestId('catalogue-next');for(let i=0;i<30&&await prev.isEnabled();i++)await prev.click();for(let i=0;i<30&&!await target.isVisible()&&await next.isEnabled();i++)await next.click();await expect(target).toBeVisible();}
export async function revealItem(page:Page,id:string){await revealPaged(page,'item-'+id,'inventory-catalogue');}
export async function revealStoryChoice(page:Page,id:string){
 if(await page.getByTestId(id).isVisible())return;
 const resume=page.getByRole('button',{name:'继续当前遭遇',exact:true});if(await resume.isVisible())await resume.click();
 if(await page.getByTestId('narrative-catalogue').isVisible()){await page.getByTestId('story-mode-choices').click();await revealPaged(page,id,'narrative-catalogue','剧情');}
}
export async function revealLifeField(page:Page,id:string){
 if(await page.getByTestId(id).isVisible())return;
 const mode=/^(retire|end-life|life-(restore|restart|inventory|recovery-note))/.test(id)?'seal':/^life-(skills|loadout|relics)/.test(id)?'training':/^life-(decisions|pledges|battles|no-decisions)/.test(id)?'decisions':'life';
 const button=page.getByTestId('life-mode-'+mode);if(await button.isVisible()){await button.click();await revealPaged(page,id,'life-panel','生平');}
}
export async function revealAction(page:Page,id:string){
 if(/^(decide-|answer-|ending-)/.test(id))await revealStoryChoice(page,id);
 if(/^(retire$|end-life$|life-restore$|life-restart$)/.test(id))await revealLifeField(page,id);
 if(id.startsWith('event-')&&await page.getByTestId('fate-catalogue').isVisible()){await page.getByTestId('fate-mode-events').click();await revealPaged(page,id,'fate-catalogue','仙缘');return;}
 if(/^(travel-|source-|encounter-|buy-)/.test(id)&&await page.locator('.single-screen').count()){
  if(!await page.getByTestId('explore-catalogue').isVisible())await page.getByTestId('tab-1').click();
  const mode=id.startsWith('travel-')?'travel':id.startsWith('source-')?'source':id.startsWith('encounter-')?'battle':'purchase';await page.getByTestId('explore-mode-'+mode).click();await revealPaged(page,id,'explore-catalogue');return;
 }
 if(id.startsWith('craft-')&&await page.locator('.single-screen').count()){
  if(!await page.getByTestId('recipe-catalogue').isVisible())await openHubFeature(page,'forge');await revealPaged(page,id,'recipe-catalogue');return;
 }
 if(/^(school-|learn-|equip-|forge-|study-manual)/.test(id)){
  await openEquipment(page);const kind=id.startsWith('school-')?'school':id==='study-manual'?'manual':/^(forge-|equip-relic-)/.test(id)?'relics':'skills';const mode=page.getByTestId('equipment-mode-'+kind);if(await mode.isVisible())await mode.click();
  const skillId=id.replace(/^(learn-|equip-)/,'');if(kind==='skills'&&C.skills[skillId])await page.getByLabel('功法流派').selectOption(C.skills[skillId].school);
  await revealPaged(page,id,'equipment-panel');
 }
}
export async function snapshot(page:Page){return page.evaluate(async()=>new Promise<any>((resolve,reject)=>{const req=indexedDB.open('chenyuan-playable-v1');req.onsuccess=()=>{const db=req.result;const tx=db.transaction('full-state','readonly');const read=tx.objectStore('full-state').get('current');read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);tx.oncomplete=()=>db.close();};req.onerror=()=>reject(req.error);}));}
export async function openHubFeature(page:Page,id:string){if(id==='goal'&&await page.getByTestId('feature-goal').isVisible()){await page.getByTestId('feature-goal').click();await expect(page.locator('#feature-title')).toBeVisible();return;}if(await page.getByTestId('hub-close').isVisible())await page.getByTestId('hub-close').click();await page.getByTestId('hub-'+id).click();await expect(page.locator('#feature-title')).toBeVisible();}
export async function openEquipment(page:Page){if(await page.locator('.single-screen').count()&&!await page.getByTestId('equipment-panel').isVisible())await openHubFeature(page,'skills');const section=page.getByTestId('equipment-section');if(!await section.evaluate(el=>(el as HTMLDetailsElement).open))await page.getByTestId('equipment-toggle').click();await expect(page.getByTestId('equipment-panel')).toBeVisible();}
export async function selectGoal(page:Page,value:string){if(await page.locator('.single-screen').count()&&!await page.getByTestId('goal-panel').isVisible())await openHubFeature(page,'goal');const back=page.getByRole('button',{name:'回到目标',exact:true});if(await back.isVisible())await back.click();const panel=page.getByTestId('goal-management');if(!await panel.evaluate(el=>(el as HTMLDetailsElement).open))await page.getByTestId('goal-management-toggle').click();await page.getByLabel('追踪目标',{exact:true}).selectOption(value);await page.getByTestId('goal-management-toggle').click();}
export async function inspectNeed(page:Page,id:string){const button=page.getByTestId('inspect-'+id);if(!await button.isVisible())await revealPaged(page,'inspect-'+id,'goal-panel','目标条件');await button.click();}
export async function action(page:Page,id:string){await expect(page.getByTestId('save-status')).toHaveText('已保存');if(/^(answer-|ending-)/.test(id)&&!await page.getByTestId(id).isVisible()&&await page.getByRole('button',{name:'继续当前遭遇',exact:true}).isVisible())await page.getByRole('button',{name:'继续当前遭遇',exact:true}).click();if(await page.locator('.single-screen').count()&&!await page.getByTestId(id).isVisible()){if(id.startsWith('craft-'))await openHubFeature(page,'forge');else if(/^(cultivate|rest$|breakthrough$|return-cave$|attack$|guard$|technique$|release$|flee$|battle-)/.test(id))await page.getByTestId('tab-0').click();}if(/^(school-|learn-|equip-|forge-|study-manual)/.test(id)&&!await page.getByTestId(id).isVisible())await openEquipment(page);await revealAction(page,id);const before=(await snapshot(page)).core.revision;await page.getByTestId(id).click();await finishJourneyClock(page);await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before+1);await expect(page.getByTestId('error')).toHaveCount(0);}
export async function start(page:Page,choice='leave'){await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();await finishJourneyClock(page);await expect(page.getByTestId('realm')).toHaveText('凡人');await action(page,choice);await action(page,'return-cave');await page.getByLabel('行动次数').selectOption('5');await action(page,'cultivate');await expect(page.getByTestId('xp')).toHaveText('10 / 10');await action(page,'breakthrough');await expect(page.getByTestId('realm')).toHaveText('炼气');await page.getByLabel('行动次数').selectOption('1');}
export async function travel(page:Page,id:string){await page.getByTestId('tab-1').click();await action(page,`travel-${id}`);}
export async function fight(page:Page,school:string){await action(page,`school-${school}`);await travel(page,'wilderness');await action(page,'encounter-wolf');for(let i=0;i<30;i++){const g=await snapshot(page);if(!g.battle)return;if(g.battle.round%3===2)await action(page,'guard');else if(await page.getByTestId('release').isEnabled())await action(page,'release');else if(await page.getByTestId('technique').isEnabled())await action(page,'technique');else await action(page,'attack');}throw new Error('战斗未结束');}
