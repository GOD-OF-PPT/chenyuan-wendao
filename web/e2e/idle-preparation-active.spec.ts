import {selectLearningSkill} from './stage-support';
import {test,expect,type Page} from '@playwright/test';
import {snapshot,useJourneyClock,finishJourneyClock} from './support';
import {driver} from '../../tests/full-route.mjs';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
for(const [kind,ms,label] of [['learn',30000,'研习玉简'],['study',60000,'参悟惊鸿剑简'],['buy',15000,'坊市采购'],['sell',15000,'坊市寄售'],['use',6000,'药匣调息'],['rest',30000,'洞府疗养']] as const){
 test('active '+kind+' shows its own object and decreasing cycle before any persisted effect',async({page},info)=>{
  const d=driver();if(kind==='learn'||kind==='study')d.realm();d.funds(200);
  if(kind==='sell'||kind==='use')d.buy('healing_pill',3);
  if(kind==='use'||kind==='rest'){d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'technique'});d.doAction({type:'BATTLE',move:'flee'});}
  d.go(kind==='learn'||kind==='study'?'sect':kind==='buy'||kind==='sell'?'market':'cave');
  await useJourneyClock(page);await page.goto('/');await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'lawful-u5-active.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d.game))});await finishJourneyClock(page);
  if(kind==='learn'||kind==='study'){
   await page.getByTestId('hub-skills').click();
   if(kind==='study')await page.getByTestId('equipment-mode-manual').click();
   else{await selectLearningSkill(page,'sword_still');await page.getByTestId('learn-sword_still').click();}
  }else if(kind==='buy'||kind==='sell'){
   await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await page.getByTestId('buy-healing_pill').click();if(kind==='sell')await page.getByTestId('market-mode-sell').click();
  }else{
   await page.getByTestId('tab-2').click();await page.getByRole('navigation',{name:'行囊分类'}).getByRole('button',{name:'丹药',exact:true}).click();await page.getByTestId('inspect-use-healing_pill').click();if(kind==='rest')await page.getByTestId('recovery-rest').click();
  }
  const before=await snapshot(page);await page.getByTestId('preparation-start').click();const countdown=page.getByTestId('training-countdown');await expect(countdown).toBeVisible();await expect(countdown).toContainText((ms/1000).toFixed(1));await expect(page.getByRole('region',{name:'当前活动',exact:true})).toContainText(label);
  await page.clock.fastForward(500);await expect(countdown).toContainText(((ms-500)/1000).toFixed(1));expect(await snapshot(page)).toEqual(before);await expect(page.getByTestId('training-pause')).toBeInViewport({ratio:1});
  for(const art of await page.locator('[data-asset-id=portrait-player]:visible,.catalogue-art:visible [data-art-state]').all())await expect(art).toHaveAttribute('data-art-state','ready');await page.screenshot({path:info.outputPath('active-'+kind+'.png')});
  await page.getByTestId('training-pause').click();await expect(page.getByTestId('training-resume')).toBeVisible();expect(await snapshot(page)).toEqual(before);
 });
}
