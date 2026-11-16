import {writeFile} from 'node:fs/promises';
import {expect,type Page} from '@playwright/test';

/** Lossless evidence for the fixed Chromium quota scene; never changes its clock or Game. */
export async function captureFixedPng(page:Page,file:string){
 const viewport=page.viewportSize();
 if(page.context().browser()?.browserType().name()!=='chromium'||viewport?.width!==1440||viewport.height!==900)throw Error('Fixed Chromium1440x900 evidence required');
 await page.evaluate(async()=>{if(devicePixelRatio!==1)throw Error('Evidence requires device scale1');await document.fonts.ready;});
 await expect.poll(()=>page.locator('[data-art-state="loading"]').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).length),{timeout:8000}).toBe(0);
 const session=await page.context().newCDPSession(page);
 try{
  const result=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,optimizeForSpeed:true});
  const bytes=Buffer.from(result.data,'base64');
  if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)!==1440||bytes.readUInt32BE(20)!==900)throw Error('Incomplete fixed PNG evidence');
  await writeFile(file,bytes);
  return{width:1440,height:900,bytes:bytes.length};
 }finally{if(!page.isClosed())await session.detach();}
}
