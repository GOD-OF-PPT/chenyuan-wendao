import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {newGame} from '../../src/full/engine.ts';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import * as stage from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
function fixture(){const d=driver('trade','sword');d.realm();d.funds(300);d.go('cave');return d.game;}
async function bounded(page:Page,info:TestInfo,name:string){
 const dialog=page.locator('dialog[open]');await expect(dialog).toHaveCount(1);
 const result=await dialog.evaluate(root=>{
  const r=root.getBoundingClientRect();return{overflow:root.scrollHeight>root.clientHeight||root.scrollWidth>root.clientWidth,inside:r.left>=0&&r.top>=0&&r.right<=1440&&r.bottom<=900,rows:[...root.querySelectorAll<HTMLElement>('button,input,select,summary,p,h2,h3,label')].filter(e=>e.checkVisibility()).map(e=>{
   const b=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
   return{text:e.textContent?.slice(0,100),contained:b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom,textInside:[...range.getClientRects()].filter(x=>x.width&&x.height).every(x=>x.left>=b.left-1&&x.right<=b.right+1&&x.top>=b.top-1&&x.bottom<=b.bottom+1),button:e.matches('button'),height:b.height,hit:!!hit&&(hit===e||e.contains(hit))};
  })};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(result),contentType:'application/json'});expect(result.overflow).toBe(false);expect(result.inside).toBe(true);
 for(const r of result.rows){expect(r.contained,r.text).toBe(true);expect(r.textInside,r.text).toBe(true);if(r.button){expect(r.height,r.text).toBeGreaterThanOrEqual(44);expect(r.hit,r.text).toBe(true);}}
 await page.screenshot({path:info.outputPath(name+'.png')});
}
test('ART37 expanded settings and destructive press are readable, distinct and readonly',async({page},info)=>{
 await importRecoveryFixture(page,fixture());const before=await recoveryDatabase(page);
 await page.getByRole('button',{name:'设置',exact:true}).click();await bounded(page,info,'settings');
 const reset=page.getByTestId('restart'),help=page.getByTestId('gameplay-help-entry');expect(await reset.evaluate(n=>getComputedStyle(n).backgroundImage)).not.toBe(await help.evaluate(n=>getComputedStyle(n).backgroundImage));
 const local=page.getByTestId('local-records-panel');await local.locator(':scope>summary').click();await bounded(page,info,'local-overview');
 for(const [id,name]of [['local-refresh','local-records'],['local-export-preview','local-export']]as const){await page.getByTestId(id).click();await expect(page.getByTestId(id)).toHaveAttribute('aria-pressed','true');await bounded(page,info,name);}
 await local.locator(':scope>summary').click();await reset.click();await bounded(page,info,'danger-confirmation');
 const cancel=page.getByTestId('game-confirmation-cancel');await cancel.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');expect(await cancel.evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');
 const b=(await cancel.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);const shadow=await cancel.evaluate(n=>getComputedStyle(n).boxShadow);await page.mouse.down();expect(await cancel.evaluate(n=>getComputedStyle(n).boxShadow)).not.toBe(shadow);await page.screenshot({path:info.outputPath('cancel-pressed.png')});await page.mouse.up();
 await expect(page.getByTestId('game-confirmation')).toHaveCount(0);await expect(reset).toBeFocused();expect(await recoveryDatabase(page)).toEqual(before);
});
test('ART37 a long literal selected filename wraps completely and cancelling import retains every store',async({page},info)=>{
 await importRecoveryFixture(page,fixture());const before=await recoveryDatabase(page);await page.getByRole('button',{name:'设置',exact:true}).click();
 const name='听雨洞府原始存档'.repeat(12)+'<img src=x onerror=unexpected()>.json';await page.getByTestId('import').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(newGame('长卷客','art37-import')))});
 await expect(page.getByTestId('game-confirmation-message')).toContainText(name);await expect(page.getByTestId('game-confirmation-message').locator('img,script')).toHaveCount(0);await bounded(page,info,'long-filename');
 await page.keyboard.press('Escape');await expect(page.getByTestId('import-open')).toBeFocused();expect(await recoveryDatabase(page)).toEqual(before);
});
test('ART37 expanded target production and its full limits keep both return actions reachable without opening the furnace',async({page},info)=>{
 await importRecoveryFixture(page,fixture());const before=await recoveryDatabase(page);await page.getByTestId('hub-forge').click();await stage.openProductionSettings(page);await page.getByLabel('炼丹炉次',{exact:true}).selectOption('target');await page.getByLabel('成品目标库存',{exact:true}).fill('999999');await page.getByLabel('目标最多炉次',{exact:true}).fill('50');await bounded(page,info,'production-target');
 await page.getByTestId('production-limits').click();await bounded(page,info,'production-limits');await page.getByRole('button',{name:'取消调整',exact:true}).click();await expect(page.getByTestId('alchemy-settings')).toBeVisible();await bounded(page,info,'production-return');await stage.closeProductionSettings(page);expect(await recoveryDatabase(page)).toEqual(before);
});
async function allPages(page:Page,info:TestInfo,name:string){
 const dialog=page.locator('dialog[open]');let count=0;
 for(;;){await bounded(page,info,name+'-'+(++count));const next=dialog.getByTestId('catalogue-next');if(!await next.count()||await next.isDisabled())break;expect(count).toBeLessThan(20);await next.click();}
 while(await dialog.getByTestId('catalogue-prev').count()&&await dialog.getByTestId('catalogue-prev').isEnabled())await dialog.getByTestId('catalogue-prev').click();
 return count;
}
for(const kind of ['study','alchemy','relic','market','inventory','wilderness','commission']as const)test('ART37 '+kind+' complete directory pages preserve visible text, controls and the Game',async({page},info)=>{
 const d=driver('trade','sword');d.realm();d.funds(300);d.go(kind==='wilderness'?'wilderness':kind==='commission'?'sect':'cave');await importRecoveryFixture(page,d.game);const before=await recoveryDatabase(page);
 if(kind==='study'){await page.getByTestId('hub-skills').click();await stage.openLearningLibrary(page);await page.getByLabel('功法流派',{exact:true}).selectOption('all');await page.getByLabel('显示后续功法法宝',{exact:true}).check();}
 else if(kind==='alchemy'){await page.getByTestId('hub-forge').click();await stage.openAlchemyLibrary(page);await page.getByLabel('显示后续生产目录',{exact:true}).check();}
 else if(kind==='relic'){await page.getByTestId('hub-relics').click();await stage.openRelicLibrary(page);await page.getByLabel('显示后续生产目录',{exact:true}).check();}
 else if(kind==='market'){await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await stage.openMarketLibrary(page);await page.getByLabel('显示后续坊市货物',{exact:true}).check();}
 else if(kind==='inventory'){await page.getByTestId('tab-2').click();await stage.openInventoryLibrary(page);}
 else{await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-source').click();await stage.openSourceLibrary(page);}
 const count=await allPages(page,info,kind);if(kind==='study')expect(count).toBe(3);await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);expect(await recoveryDatabase(page)).toEqual(before);
});
for(const mode of ['system','saved']as const)test('ART37 '+mode+' reduced effects keep static dialog text and focus',async({browser},info)=>{
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1440,height:900},reducedMotion:mode==='system'?'reduce':'no-preference'}),page=await context.newPage();
 try{await importRecoveryFixture(page,fixture());await page.getByRole('button',{name:'设置',exact:true}).click();if(mode==='saved'){await page.getByTestId('reduce-effects').check();await expect(page.getByTestId('local-data-status')).toContainText('已保存');}const before=await recoveryDatabase(page);await page.getByTestId('restart').click();await bounded(page,info,mode+'-reduced');expect(await page.getByTestId('game-confirmation').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');await page.keyboard.press('Escape');await expect(page.getByTestId('restart')).toBeFocused();expect(await recoveryDatabase(page)).toEqual(before);}finally{await context.close();}
});
