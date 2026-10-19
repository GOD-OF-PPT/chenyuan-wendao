import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {snapshot,action} from './support';
test.use({actionTimeout:8000,navigationTimeout:15000});
async function cave(page:Page){await page.goto('/');await page.getByRole('button',{name:'踏入仙途'}).click();await action(page,'leave');await action(page,'return-cave');await expect(page.getByTestId('save-status')).toHaveText('已保存');}

test('paper and ink resources actually load, stay decorative, and preserve the dark character surface',async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});await cave(page);const before=await snapshot(page);
 for(const id of ['hub-goal-mountains','hub-meditation'])await expect(page.locator(`[data-asset-id=${id}]`)).toHaveAttribute('data-art-state','ready');
 const material=await page.locator('.hub-current').evaluate(el=>getComputedStyle(el).backgroundImage);const paperURL=material.match(/url\("?([^"\)]+)"?\)/)![1];
 const response=await page.request.get(paperURL);expect(response.status()).toBe(200);expect(await response.body()).toEqual(readFileSync('public/art/v2/ui/xuan-paper-v2.webp'));
 const pixels=await page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let r=0,g=0,b=0,min=255;for(let i=0;i<p.length;i+=4){r+=p[i];g+=p[i+1];b+=p[i+2];min=Math.min(min,p[i],p[i+1],p[i+2]);}const n=p.length/4;return{width:c.width,height:c.height,mean:[r/n,g/n,b/n],min};},paperURL);
 expect(pixels.width).toBe(512);expect(pixels.height).toBe(512);expect(pixels.mean[0]-pixels.mean[2],'restrained paper yellow cast').toBeLessThan(20);expect(pixels.mean[2]).toBeGreaterThan(210);
 expect(await page.locator('.character-sheet').first().evaluate(el=>getComputedStyle(el).backgroundImage)).not.toContain('xuan-paper');
 for(const size of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080}]){
  await page.setViewportSize(size);const artwork=page.locator('[data-asset-id=hub-meditation]'),bounds=await artwork.boundingBox();expect(bounds!.width).toBeGreaterThanOrEqual(130);
  for(const id of ['cultivate','breakthrough','cultivate-assisted','rest']){const control=page.getByTestId(id),box=await control.boundingBox();expect(box!.x>=bounds!.x+bounds!.width||box!.y+box!.height<=bounds!.y||box!.y>=bounds!.y+bounds!.height,id+' remains outside illustration').toBe(true);expect(await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||!!hit&&el.contains(hit);})).toBe(true);}
  await page.screenshot({path:info.outputPath(`paper-hub-${size.width}.png`)});
 }
 await page.getByTestId('hub-goal-open').click();await page.getByTestId('hub-close').click();expect(await snapshot(page)).toEqual(before);
 await info.attach('paper-pixels.json',{body:Buffer.from(JSON.stringify(pixels)),contentType:'application/json'});
});

async function readable(page:Page,control:Locator){
 return control.evaluate(button=>{
  const rgb=(value:string)=>value.match(/[\d.]+/g)!.map(Number),lum=(c:number[])=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  let surface:Element|null=button,colors:string[]=[];
  while(surface){const s=getComputedStyle(surface),gradient=s.backgroundImage.match(/rgba?\([^)]+\)/g);if(gradient){colors=gradient;break;}if((rgb(s.backgroundColor)[3]??1)>0){colors=[s.backgroundColor];break;}surface=surface.parentElement;}
  return [button,...button.querySelectorAll('small')].filter(el=>el.textContent!.trim()).map(text=>{const a=lum(rgb(getComputedStyle(text).color));return{text:text.textContent,ratio:Math.min(...colors.map(color=>{const b=lum(rgb(color));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);} ))};});
 });
}
test('paper controls keep readable normal hover pressed focused and disabled states without passive growth',async({page},info)=>{
 await cave(page);const before=await snapshot(page),records=[];
 for(const id of ['cultivate','hub-goal-open','hub-cultivation-details','cultivate-assisted','rest','breakthrough']){
  const button=page.getByTestId(id),disabled=await button.isDisabled();
  for(const state of disabled?['disabled']:['normal','hover','press','focus']){
   if(state==='normal')await page.mouse.move(0,0);
   if(state==='hover'||state==='press')await button.hover();
   if(state==='press')await page.mouse.down();
   if(state==='focus'){await page.mouse.move(0,0);await button.focus();await expect(button).toBeFocused();}
   try{await button.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));const rows=await readable(page,button);for(const row of rows)expect(row.ratio,id+'/'+state+'/'+row.text).toBeGreaterThanOrEqual(4.5);records.push({id,state,rows});}
   finally{if(state==='press'){await page.mouse.move(0,0);await page.mouse.up();}}
  }
 }
 expect(await snapshot(page)).toEqual(before);await info.attach('paper-control-contrast.json',{body:Buffer.from(JSON.stringify(records,null,2)),contentType:'application/json'});
});

test('missing decorative materials leave truthful readable controls and the original cultivation command usable',async({page})=>{
 await page.route('**/art/v2/ui/*',route=>route.abort());await cave(page);const before=await snapshot(page);
 for(const id of ['hub-goal-mountains','hub-meditation'])await expect(page.locator(`[data-asset-id=${id}]`)).toHaveAttribute('data-art-state','failed');
 await expect(page.getByTestId('cultivate')).toBeEnabled();await expect(page.getByTestId('rest')).toBeDisabled();await expect(page.getByTestId('breakthrough')).toContainText('修为尚未圆满');
 const paper=await page.locator('.hub-current').evaluate(el=>getComputedStyle(el).backgroundColor);expect(paper).toBe('rgb(239, 238, 229)');
 await action(page,'cultivate');const after=await snapshot(page);expect(after.core.revision).toBe(before.core.revision+1);expect(after.core.player.xp).toBe(before.core.player.xp+5);expect(after.core.world.elapsedMonths).toBe(before.core.world.elapsedMonths+1);
});

test('enemy name retains a light readable heading over the illustrated stage when paper headings change',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await cave(page);await page.getByLabel('吐纳行动次数').selectOption('5');await action(page,'cultivate');await action(page,'breakthrough');await page.getByTestId('choose-school').click();await action(page,'school-sword');await page.getByTestId('hub-close').click();await page.getByTestId('tab-1').click();await action(page,'travel-wilderness');await action(page,'encounter-wolf');const before=await snapshot(page);
 const name=page.locator('.hub-current .enemy-status h2');await expect(name).toHaveText('雾隐妖狼');
 const luminance=await name.evaluate(el=>getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0));
 expect(luminance,'illustrated battle heading must not inherit dark paper ink').toBeGreaterThan(.8);expect(await snapshot(page)).toEqual(before);
});
