import {test,expect,type Page,type Locator,type TestInfo} from '@playwright/test';
import {newGame,advance,resolve} from '../../src/full/engine.ts';
import {importRecoveryFixture,recoveryDatabase,stored,control600} from './idle-recovery-ui-support';
import {activitySnapshot as activity} from './support';
import {answerGameConfirmation,localConfirmationSnapshot} from './game-confirmation-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
function prepared(){let game=newGame('听雨客','art18-ready');for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2}]as const)game=advance(game,{...action,commandId:'prepare-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});return game;}
async function localPanel(page:Page){await settings(page);const panel=page.getByTestId('local-records-panel');if(!await panel.evaluate(n=>(n as HTMLDetailsElement).open))await panel.locator('summary').click();await expect(page.getByTestId('local-data-status')).not.toContainText('待处理');}
async function settings(page:Page){await page.getByRole('button',{name:'设置',exact:true}).click();await expect(page.locator('dialog.game-settings')).toBeVisible();}
async function frame(page:Page,dialog:Locator,info:TestInfo,name:string){
 await expect(dialog).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(1);
 const result=await dialog.evaluate(root=>{
  const r=root.getBoundingClientRect(),frame=getComputedStyle(root,'::before').borderImageSource;
  return{content:getComputedStyle(root,'::before').content,overflow:root.scrollHeight>root.clientHeight,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,frame,rows:[...root.querySelectorAll<HTMLElement>('h2,h3,p,small,button,label,summary')].filter(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(n=>{
   const b=n.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2),range=document.createRange();range.selectNodeContents(n);
   return{text:n.textContent?.trim().slice(0,100),font:parseFloat(getComputedStyle(n).fontSize),minimum:n.matches('small,.small,.eyebrow')?14:18,button:n.matches('button'),height:b.height,inside:b.left>=0&&b.top>=0&&b.right<=innerWidth&&b.bottom<=innerHeight,hit:!!hit&&(hit===n||n.contains(hit)),textInside:[...range.getClientRects()].filter(x=>x.width&&x.height).every(x=>x.left>=b.left-1&&x.right<=b.right+1&&x.top>=b.top-1&&x.bottom<=b.bottom+1)};
  })};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(result),contentType:'application/json'});expect(result.content).not.toBe('none');expect(result.overflow).toBe(false);expect(result.inside).toBe(true);expect(result.frame).toContain('dialog-jade-frame-v1.webp');
 for(const row of result.rows){expect(row.font,row.text).toBeGreaterThanOrEqual(row.minimum);expect(row.inside,row.text).toBe(true);expect(row.textInside,row.text).toBe(true);if(row.button){expect(row.height,row.text).toBeGreaterThanOrEqual(44);expect(row.hit,row.text).toBe(true);}}
 await page.screenshot({path:info.outputPath(name+'.png')});
}
test('ART18-E1 game materials preserve readonly menus, one consent surface, keyboard cancel and the original milestone',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await importRecoveryFixture(page,prepared());const before=await recoveryDatabase(page);
 await settings(page);await frame(page,page.locator('dialog.game-settings'),info,'settings-material');
 await page.getByTestId('restart').click();const prompt=page.getByTestId('game-confirmation');await expect(prompt).toHaveAttribute('data-kind','restart');await frame(page,prompt,info,'restart-material');
 expect(await page.getByTestId('game-confirmation-confirm').evaluate(node=>getComputedStyle(node,'::before').borderImageSource)).toContain('action-jade-frame-v1.webp');
 await page.keyboard.press('Tab');expect(await prompt.evaluate(node=>node.contains(document.activeElement))).toBe(true);await page.keyboard.press('Shift+Tab');expect(await prompt.evaluate(node=>node.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Escape');await expect(prompt).toHaveCount(0);await expect(page.locator('dialog.game-settings')).toBeVisible();await expect(page.getByTestId('restart')).toBeFocused();expect(await recoveryDatabase(page)).toEqual(before);
 await page.getByRole('button',{name:'关闭设置',exact:true}).click();await page.getByTestId('breakthrough').click();await frame(page,page.getByTestId('milestone-review'),info,'milestone-material');await page.getByTestId('milestone-cancel').click();expect(await recoveryDatabase(page)).toEqual(before);expect(errors).toEqual([]);
});
test('ART18-E3 explicit restart keeps its original short countdown and creates only the requested new life',async({page})=>{
 await importRecoveryFixture(page,prepared());await settings(page);const before=await recoveryDatabase(page);
 await page.getByTestId('restart').click();await expect(page.getByTestId('game-confirmation-cancel')).toHaveText('继续此生');expect(await recoveryDatabase(page)).toEqual(before);
 await answerGameConfirmation(page,'restart');await control600(page,before);const actual=stored(await recoveryDatabase(page),'current');expect(actual).toEqual(newGame('听雨客',actual.core.runId));expect(actual.core.runId).not.toBe(stored(before,'current').core.runId);
});
test('ART18-E4 an arranged online cycle continues under consent and the changed state cannot be restarted by the old decision',async({page})=>{
 let game=newGame('静候客','art18-online');for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'}]as const)game=advance(game,{...action,commandId:'p'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
 await importRecoveryFixture(page,game);const before=stored(await recoveryDatabase(page),'current');await page.getByTestId('cultivate').click();await expect(page.locator('[data-testid=training-activity][data-running=true]')).toBeVisible();const a=await activity(page);
 await settings(page);await page.getByTestId('restart').click();await expect(page.getByTestId('game-confirmation-confirm')).toBeEnabled();await page.clock.fastForward(a.cycleMs);await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 await expect(page.getByTestId('game-confirmation-confirm')).toBeDisabled();await expect(page.getByTestId('game-confirmation-blocked')).toContainText('已变化');const settled=await recoveryDatabase(page);expect(stored(settled,'current')).toEqual(resolve(before,a.nextCommand).nextState);
 await page.keyboard.press('Enter');expect(await recoveryDatabase(page)).toEqual(settled);await answerGameConfirmation(page,'restart',false);await expect(page.locator('dialog.game-settings')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(settled);
});
test('ART18-E5 cancelling a checkpoint keeps all records and explicit restore uses the complete original checkpoint',async({page},info)=>{
 await importRecoveryFixture(page,prepared());const original=stored(await recoveryDatabase(page),'current');await page.getByTestId('breakthrough').click();await page.getByTestId('milestone-confirm').click();await expect(page.locator('[data-testid=training-activity][data-running=true]')).toBeVisible();const a=await activity(page);await page.clock.fastForward(a.cycleMs);await expect.poll(async()=>(await activity(page))?.completedCycles).toBe(1);await expect(page.getByTestId('save-status')).toHaveText('已保存');
 await settings(page);await expect(page.getByTestId('restore-checkpoint')).toBeEnabled();const before=await recoveryDatabase(page),checkpoint=stored(before,'checkpoint');expect(checkpoint.snapshot).toEqual(original);
 await page.getByTestId('restore-checkpoint').click();await frame(page,page.getByTestId('game-confirmation'),info,'restore-material');await answerGameConfirmation(page,'restore',false);expect(await recoveryDatabase(page)).toEqual(before);await expect(page.getByTestId('restore-checkpoint')).toBeFocused();
 await page.getByTestId('restore-checkpoint').click();await answerGameConfirmation(page,'restore');await control600(page,before);const after=await recoveryDatabase(page),actual=stored(after,'current'),expected=structuredClone(checkpoint.snapshot);expected.core.runId=actual.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=actual.core.runId+':'+expected.core.activeEvent.id;expect(actual).toEqual(expected);expect(stored(after,'checkpoint')).toEqual(checkpoint);
});
test('ART18-E2 cancelling import preserves all stores and the explicit game confirmation alone authorizes the original save',async({page},info)=>{
 await importRecoveryFixture(page,prepared());await settings(page);const before=await recoveryDatabase(page),incoming=newGame('清雨客','art18-import');
 const select=()=>page.getByTestId('import').setInputFiles({name:'art18-lawful-import.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
 await select();await expect(page.getByTestId('game-confirmation')).toHaveAttribute('data-kind','import');await frame(page,page.getByTestId('game-confirmation'),info,'import-material');
 expect(await recoveryDatabase(page)).toEqual(before);await page.getByTestId('game-confirmation-cancel').click();await expect(page.getByTestId('import-open')).toBeFocused();expect(await recoveryDatabase(page)).toEqual(before);
 await select();await expect(page.getByTestId('game-confirmation')).toBeVisible();await page.getByTestId('game-confirmation-confirm').click();await control600(page,before);
 const actual=stored(await recoveryDatabase(page),'current'),expected=structuredClone(incoming);expected.core.runId=actual.core.runId;expected.core.revision=0;if(expected.core.activeEvent)expected.core.activeEvent.instanceId=actual.core.runId+':'+expected.core.activeEvent.id;
 expect(actual).toEqual(expected);expect(actual.core.runId).not.toBe(stored(before,'current').core.runId);await expect(page.getByTestId('game-confirmation')).toHaveCount(0);
});
test('ART18-E6 local-record consent preserves cancel and only clears records after its exact confirmation',async({page},info)=>{
 await importRecoveryFixture(page,prepared());await localPanel(page);const game=await recoveryDatabase(page),local=await localConfirmationSnapshot(page);expect(local.rows.length).toBeGreaterThan(0);
 await page.getByTestId('local-clear').click();await expect(page.getByTestId('game-confirmation-confirm')).toBeEnabled();await frame(page,page.getByTestId('game-confirmation'),info,'local-clear-material');await answerGameConfirmation(page,'clear-local',false);await expect(page.getByTestId('local-clear')).toBeFocused();expect(await localConfirmationSnapshot(page)).toEqual(local);expect(await recoveryDatabase(page)).toEqual(game);
 await page.getByTestId('local-clear').click();await answerGameConfirmation(page,'clear-local');await expect(page.getByTestId('local-data-status')).toContainText('已清空');const after=await localConfirmationSnapshot(page);expect(after.rows).toEqual([]);expect(after.meta.preferences).toEqual(local.meta.preferences);expect(after.meta.epoch).not.toBe(local.meta.epoch);expect(await recoveryDatabase(page)).toEqual(game);expect(await page.locator('dialog.game-settings').evaluate(n=>n.contains(document.activeElement))).toBe(true);
});
test('ART18-E7 memory-only consent cannot clear persistent records or the actual Game',async({page},info)=>{
 await page.addInitScript(()=>{const add=IDBObjectStore.prototype.add;let failed=false;(window as any).__art18RestoreLocalAdd=()=>IDBObjectStore.prototype.add=add;IDBObjectStore.prototype.add=function(...args:any[]){if(!failed&&this.transaction.db.name==='chenyuan-local-experience-v1'&&this.name==='events'){failed=true;throw new DOMException('ART18 local record quota','QuotaExceededError');}return add.apply(this,args as any);};});
 try{
  await importRecoveryFixture(page,prepared());await localPanel(page);await expect(page.getByTestId('local-clear-memory')).toBeVisible();const game=await recoveryDatabase(page),local=await localConfirmationSnapshot(page);
  await page.getByTestId('local-clear-memory').click();await frame(page,page.getByTestId('game-confirmation'),info,'memory-clear-material');await answerGameConfirmation(page,'clear-memory',false);await expect(page.getByTestId('local-clear-memory')).toBeFocused();expect(await localConfirmationSnapshot(page)).toEqual(local);expect(await recoveryDatabase(page)).toEqual(game);
  await page.getByTestId('local-clear-memory').click();await answerGameConfirmation(page,'clear-memory');await expect(page.getByTestId('local-data-status')).toContainText('临时记录已清除');await expect(page.getByTestId('local-clear-memory')).toHaveCount(0);expect(await localConfirmationSnapshot(page)).toEqual(local);expect(await recoveryDatabase(page)).toEqual(game);expect(await page.locator('dialog.game-settings').evaluate(n=>n.contains(document.activeElement))).toBe(true);
 }finally{await page.evaluate(()=>(window as any).__art18RestoreLocalAdd?.());}
});
test('ART18-E8 selected filenames remain literal text and cannot create executable dialog content',async({page})=>{
 await importRecoveryFixture(page,prepared());await settings(page);const before=await recoveryDatabase(page),filename='<img src=x onerror="window.art18Unexpected=1">.json';await page.getByTestId('import').setInputFiles({name:filename,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(newGame('清雨客','safe-art18')))});
 await expect(page.getByTestId('game-confirmation-message')).toContainText(filename);await expect(page.getByTestId('game-confirmation-message').locator('img,script')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).art18Unexpected)).toBeUndefined();await answerGameConfirmation(page,'import',false);expect(await recoveryDatabase(page)).toEqual(before);
});
for(const mode of ['missing-material','system-reduction','saved-reduction']as const)test('ART18-E9 '+mode+' keeps readable consent real press focus and cancellation',async({browser},info)=>{
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1440,height:900},reducedMotion:mode==='system-reduction'?'reduce':'no-preference'}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  if(mode==='missing-material')await page.route('**/art/v2/ui/*-jade-frame-v1.webp',r=>r.abort());
  await importRecoveryFixture(page,prepared());await settings(page);
  if(mode==='saved-reduction'){await page.getByTestId('reduce-effects').check();await expect(page.getByTestId('local-data-status')).toContainText('已保存');}
  const before=await recoveryDatabase(page);await page.getByTestId('restart').click();const dialog=page.getByTestId('game-confirmation');await frame(page,dialog,info,mode);
  await expect(page.getByTestId('game-confirmation-message')).toContainText('确认后才重开人生');
  if(mode!=='missing-material')expect(await dialog.evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
  const cancel=page.getByTestId('game-confirmation-cancel');await cancel.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');expect(await cancel.evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');
  const b=await cancel.boundingBox();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.mouse.down();expect(await cancel.evaluate(n=>getComputedStyle(n).transform)).not.toBe('none');await page.mouse.up();await expect(dialog).toHaveCount(0);await expect(page.getByTestId('restart')).toBeFocused();expect(await recoveryDatabase(page)).toEqual(before);expect(errors).toEqual([]);
 }finally{await context.close();}
});
