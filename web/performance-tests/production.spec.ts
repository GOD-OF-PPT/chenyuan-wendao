import {test,expect,type BrowserContext} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {advance} from '../../src/full/engine.ts';
import * as C from '../../src/full/content.ts';
import {assertPerformanceReport,assertPerformanceSample,inspectProduction,performanceCases,performanceBudget} from '../../scripts/performance-budget.mjs';
import {seedNormalLateSave,panelFeedback} from './support';
import {action,snapshot} from '../e2e/support';

test('actual production resources and 30 cold loads meet the documented byte, first-action and panel budgets',async({browser,baseURL},info)=>{
 const root=path.resolve('..'),environment={platform:`${os.platform()} ${os.release()} ${os.arch()}`,cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,memoryBytes:os.totalmem(),node:process.version,browser:browser.version(),playwright:JSON.parse(fs.readFileSync('node_modules/@playwright/test/package.json','utf8')).version};
 const report:any={format:'chenyuan-production-performance',version:1,sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceDirty:!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),harnessHashes:Object.fromEntries(['web/performance-tests/production.spec.ts','web/performance-tests/support.ts','web/playwright.performance.config.ts','scripts/performance-budget.mjs'].map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),environment,network:{downloadBitsPerSecond:10_000_000,downloadBytesPerSecond:1_250_000,uploadBytesPerSecond:1_250_000,latencyMs:150,method:'CDP Network.emulateNetworkConditions'},cache:'cold: new context + Network.setCacheDisabled',budgets:performanceBudget,server:'Vite production preview on loopback; actual content encodings recorded',trace:'off to measure production execution without DOM snapshot tracing',production:inspectProduction(path.resolve('dist')),samples:[]};
 report.sourceTree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim();
 report.runtimeSourceHashes=Object.fromEntries(['web/src/App.vue','src/full/goals.ts','src/full/engine.ts','web/src/store.ts','web/src/full-persistence.ts','web/src/local-events.ts','web/src/local-experience.ts','web/src/use-local-experience.ts','web/src/LocalExperiencePanel.vue'].map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
 let seed:BrowserContext|undefined;
 try{
  seed=await browser.newContext({baseURL,viewport:{width:1440,height:900}});const prep=await seed.newPage();report.seedStores=await seedNormalLateSave(prep);await expect(prep.getByTestId('save-status')).toContainText('已保存');await expect(prep.getByTestId('local-data-status')).not.toContainText('待处理');const seeded=await snapshot(prep);const storageState=await seed.storageState({indexedDB:true});await seed.close();seed=undefined;
  expect(report.seedStores['full-receipts'].records).toBeGreaterThan(60);expect(report.seedStores['full-state'].keys).toEqual(expect.arrayContaining(['current','previous','checkpoint','checkpoint-owner']));
  for(const profile of performanceCases()){
   const context=await browser.newContext({baseURL,viewport:profile.viewport,...(profile.kind==='resume'?{storageState}:{})});
   try{
    const page=await context.newPage(),cdp=await context.newCDPSession(page),errors:string[]=[],resources=new Map<string,any>();
    page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1_250_000,uploadThroughput:1_250_000,connectionType:'cellular4g'});await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});await cdp.send('Performance.enable');
    cdp.on('Network.requestWillBeSent',e=>resources.set(e.requestId,{url:e.request.url,status:0,encoding:null,fromCache:false,finished:false,bytes:0}));cdp.on('Network.responseReceived',e=>{const resource=resources.get(e.requestId);Object.assign(resource??{},{url:e.response.url,status:e.response.status,encoding:e.response.headers['Content-Encoding']??e.response.headers['content-encoding']??null,fromCache:!!(resource?.fromCache||e.response.fromDiskCache||e.response.fromPrefetchCache||e.response.fromServiceWorker)});});cdp.on('Network.requestServedFromCache',e=>{const resource=resources.get(e.requestId);if(resource)resource.fromCache=true;});cdp.on('Network.loadingFinished',e=>{const resource=resources.get(e.requestId);if(resource){resource.finished=true;resource.bytes=e.encodedDataLength;}});cdp.on('Network.loadingFailed',e=>errors.push('Network: '+e.errorText));
    await page.addInitScript(({kind,locationName})=>{
     const data:any={longTasks:[],layoutShifts:[],lcp:[]};(window as any).__measurement=data;
     for(const [type,key] of [['longtask','longTasks'],['layout-shift','layoutShifts'],['largest-contentful-paint','lcp']])new PerformanceObserver(list=>{for(const entry of list.getEntries())data[key].push(entry.toJSON());}).observe({type,buffered:true});
     const loop=()=>{const ready=kind==='new'?document.querySelector<HTMLButtonElement>('.welcome-form button[type=submit]'):document.querySelector<HTMLButtonElement>('[data-testid=tab-1]');if(ready&&!ready.disabled&&!data.firstControlReadyMs)data.firstControlReadyMs=performance.now();const saved=document.querySelector('[data-testid=save-status]')?.textContent?.includes('已保存');const complete=kind==='new'?!!document.querySelector('[data-testid=leave]'):document.querySelector('.where')?.textContent?.includes(locationName);if(saved&&complete){data.firstActionReadyMs=performance.now();return;}requestAnimationFrame(loop);};requestAnimationFrame(loop);
    },{kind:profile.kind,locationName:C.locations.wilderness.name});
    await page.goto('/',{waitUntil:'domcontentloaded'});
    if(profile.kind==='new')await page.getByRole('button',{name:'踏入仙途'}).click();else{await expect(page.getByTestId('realm')).toHaveText('化神');expect(await snapshot(page)).toEqual(seeded);await page.getByTestId('tab-1').click();await page.getByTestId('travel-wilderness').click();}
    await page.waitForFunction(()=>(window as any).__measurement.firstActionReadyMs);const committed=await snapshot(page);if(profile.kind==='resume')expect(committed).toEqual(advance(seeded,{type:'TRAVEL',location:'wilderness',commandId:'performance-expected',runId:seeded.core.runId,expectedRevision:seeded.core.revision}));else expect(committed.core.revision).toBe(0);
    await expect(page.locator('.scene-image')).toHaveAttribute('data-art-state','ready');await expect.poll(()=>[...resources.values()].filter(r=>!r.finished).map(r=>r.url)).toEqual([]);const initialResources=[...resources.values()].map(r=>({...r}));const firstMarks=await page.evaluate(()=>(window as any).__measurement);
    if(profile.kind==='new')await action(page,'leave');const beforeReading=await snapshot(page);const panels=[];for(const id of ['tab-0','tab-2','tab-3'])panels.push(await panelFeedback(page,id));const afterReading=await snapshot(page);expect(afterReading).toEqual(beforeReading);await page.waitForLoadState('networkidle');
    // Later chapters must not be downloaded by merely loading the first scene or a cave save.
    expect(initialResources.filter(r=>/\/art\/scenes\/(secret|terrace)/.test(r.url))).toEqual([]);
    const measured=await page.evaluate(()=>({paints:performance.getEntriesByType('paint').map(e=>e.toJSON()),navigation:performance.getEntriesByType('navigation').map(e=>e.toJSON()),observations:(window as any).__measurement}));const metrics=await cdp.send('Performance.getMetrics');
    const sample={...profile,origin:baseURL!,firstControlReadyMs:firstMarks.firstControlReadyMs,firstActionReadyMs:firstMarks.firstActionReadyMs,resources:initialResources,criticalTransferBytes:initialResources.reduce((s,r)=>s+r.bytes,0),errors,panelFeedback:panels,committed:true,readingPreservedGame:true,...measured,cdpMetrics:metrics.metrics};report.samples.push(sample);
    assertPerformanceSample(sample);console.log(JSON.stringify({format:'chenyuan-performance-sample',id:sample.id,firstActionReadyMs:sample.firstActionReadyMs,criticalTransferBytes:sample.criticalTransferBytes,maxPanelFeedbackMs:Math.max(...panels.map(p=>p.ms))}));
    if(profile.repeat===1&&profile.cpu===4)await page.screenshot({path:info.outputPath(`${profile.kind}-${profile.viewport.width}.png`),fullPage:false});
   }finally{await context.close();}
  }
  assertPerformanceReport(report);const summary={format:report.format,sourceHead:report.sourceHead,passed:report.samples.length,packageBytes:report.production.bytes,maxCriticalTransferBytes:Math.max(...report.samples.map((s:any)=>s.criticalTransferBytes)),maxFirstActionReadyMs:Math.max(...report.samples.map((s:any)=>s.firstActionReadyMs)),maxPanelFeedbackMs:Math.max(...report.samples.flatMap((s:any)=>s.panelFeedback.map((p:any)=>p.ms)))};console.log(JSON.stringify(summary));
 }finally{await seed?.close();fs.mkdirSync('performance-report',{recursive:true});fs.writeFileSync('performance-report/measurements.json',JSON.stringify(report,null,2));await info.attach('production-performance.json',{body:Buffer.from(JSON.stringify(report,null,2)),contentType:'application/json'});}
});
