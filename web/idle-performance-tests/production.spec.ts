import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {newGame} from '../../src/full/engine.ts';
import {performanceBudget,inspectProduction} from '../../scripts/performance-budget.mjs';
import {idlePerformanceCases,assertIdlePerformanceSample,assertIdlePerformanceReport} from '../../scripts/idle-performance-budget.mjs';
import {seedIdleLateSave,installMeasurement,acceptMeasuredAction,completeMeasuredAction,panelFeedback,snapshot,recoveryDatabase} from './support';

let late:any,storageState:any;
test.beforeAll(async({browser,baseURL},info)=>{
 const context=await browser.newContext({baseURL,viewport:{width:1440,height:900}});
 try{const page=await context.newPage();late=await seedIdleLateSave(page,info);storageState=await context.storageState({indexedDB:true});}
 finally{await context.close();}
});

test('twelve current desktop cold samples preserve the original budgets and complete real finite actions',async({browser,baseURL},info)=>{
 const root=path.resolve('..'),build=JSON.parse(fs.readFileSync('build-report/build.json','utf8'));
 const hash=(file:string)=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 const serving=info.config.metadata.performanceService;expect(serving?.kind).toBe('candidate-python');expect(serving.sha256).toBe(hash(serving.script));
 const report:any={format:'chenyuan-idle-production-performance',version:2,runtimeDigest:build.sourceDigest,serving,
  sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceDirty:!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),
  harnessHashes:Object.fromEntries(['web/idle-performance-tests/production.spec.ts','web/idle-performance-tests/support.ts','web/playwright.idle-performance.config.ts','scripts/performance-budget.mjs','scripts/idle-performance-budget.mjs',serving.script].map(f=>[f,hash(f)])),runtimeSourceHashes:build.runtimeSources,
  environment:{platform:`${os.platform()} ${os.release()} ${os.arch()}`,cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,memoryBytes:os.totalmem(),node:process.version,browser:browser.version(),playwright:JSON.parse(fs.readFileSync('node_modules/@playwright/test/package.json','utf8')).version},
  network:{downloadBitsPerSecond:10_000_000,downloadBytesPerSecond:1_250_000,uploadBytesPerSecond:1_250_000,latencyMs:150,method:'CDP Network.emulateNetworkConditions'},cache:'cold: new context + Network.setCacheDisabled',budgets:performanceBudget,
  server:'Actual repository '+serving.script+' on loopback; actual response encodings recorded',trace:'off, unchanged production measurement policy',production:inspectProduction(path.resolve('dist')),samples:[],attempts:[],
  seedStores:late.stores,seedPreparation:'Normal visible finite actions with virtual periods only in the separate unmeasured240s preparation. Full IndexedDB state passed in memory. No import or user profile.',deferredOriginalProfiles:18,originalThirtyAccepted:false,compatibilityAccepted:false};
 try{
  for(const profile of idlePerformanceCases()){
   const context=await browser.newContext({baseURL,viewport:profile.viewport,...(profile.kind==='resume'?{storageState}:{})});
   const errors:string[]=[],resources=new Map<string,any>();let currentPage:Page|undefined;
   let outcome:any={id:profile.id,status:'measurement-error',error:'Profile did not finish'};
   try{
    const page=await context.newPage(),cdp=await context.newCDPSession(page);currentPage=page;
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1_250_000,uploadThroughput:1_250_000,connectionType:'cellular4g'});await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});await cdp.send('Performance.enable');
    cdp.on('Network.requestWillBeSent',e=>resources.set(e.requestId,{url:e.request.url,status:0,encoding:null,fromCache:false,finished:false,bytes:0,requestTimestamp:e.timestamp,requestWallTime:e.wallTime}));
    cdp.on('Network.responseReceived',e=>{const r=resources.get(e.requestId);if(r)Object.assign(r,{url:e.response.url,status:e.response.status,encoding:e.response.headers['Content-Encoding']??e.response.headers['content-encoding']??null,responseTimestamp:e.timestamp,timing:e.response.timing??null,fromCache:!!(r.fromCache||e.response.fromDiskCache||e.response.fromPrefetchCache||e.response.fromServiceWorker)});});
    cdp.on('Network.requestServedFromCache',e=>{const r=resources.get(e.requestId);if(r)r.fromCache=true;});cdp.on('Network.loadingFinished',e=>{const r=resources.get(e.requestId);if(r){r.finished=true;r.bytes=e.encodedDataLength;r.finishTimestamp=e.timestamp;}});cdp.on('Network.loadingFailed',e=>errors.push('Network: '+e.errorText));
    await installMeasurement(page,profile.kind);await page.goto('/',{waitUntil:'domcontentloaded'});
    if(profile.kind==='new')await page.getByRole('button',{name:/^踏入仙途/}).click();
    await expect(page.getByTestId('save-status')).toHaveText('已保存');
    const initial=await snapshot(page);
    if(profile.kind==='resume')expect(initial).toEqual(late.game);else expect(initial).toEqual(newGame(initial.core.player.name,initial.core.runId));
    // The actual late-save action remains TRAVEL; its START and six-second outcome are separate witnesses.
    const accepted=await acceptMeasuredAction(page,profile.kind,initial);
    await page.waitForFunction(()=>(window as any).__idlePerformance.firstActionReadyMs);
    if(profile.kind==='resume'){
     const started=await recoveryDatabase(page);
     const startRows=started.rows['full-receipts'].filter((r:any)=>r.value?.input?.kind==='START'&&r.value.activity?.id===accepted.a.id);expect(startRows).toHaveLength(1);
     const startIntent=startRows[0].value.input.mutation;
     for(const[name,rows]of Object.entries(late.raw.rows)as any){
      if(name==='full-state')expect(started.rows[name].filter((r:any)=>r.key!=='activity')).toEqual(rows.filter((r:any)=>r.key!=='activity'));
      else if(name==='full-receipts'){expect(started.rows[name]).toHaveLength(rows.length+1);for(const row of rows)expect(started.rows[name].find((r:any)=>r.key===row.key)).toEqual(row);}
      else if(name==='full-backups'){
       expect(started.rows[name]).toHaveLength(rows.length+1);for(const row of rows)expect(started.rows[name].find((r:any)=>r.key===row.key)).toEqual(row);
       expect(started.rows[name].find((r:any)=>r.key==='activity/'+startIntent.runId+'/'+startIntent.commandId+'/previous')?.value).toEqual(late.raw.rows['full-state'].find((r:any)=>r.key==='activity').value);
      }else expect(started.rows[name]).toEqual(rows);
     }
    }
    const done=await completeMeasuredAction(page,accepted);
    await expect(page.locator('.world-ambience')).toHaveAttribute('data-art-state','ready');
    await expect.poll(()=>[...resources.values()].filter(r=>!r.finished).map(r=>r.url)).toEqual([]);
    const initialResources=[...resources.entries()].map(([requestId,r])=>({requestId,...r}));
    expect(initialResources.filter(r=>/\/art\/(?:v2\/)?scenes\/(secret|terrace)/.test(r.url))).toEqual([]);
    const marks=await page.evaluate(()=>(window as any).__idlePerformance),fullOutcomeMs=await page.evaluate(()=>performance.now());
    const currentWrites=marks.nativeWrites.filter((r:any)=>r.store==='full-state'&&r.key==='current'&&r.revision===done.game.core.revision);
    expect(currentWrites).toHaveLength(1);const write=currentWrites[0];
    const starts=marks.nativeWrites.filter((r:any)=>r.kind==='START'&&r.commandId===done.start.input.mutation.commandId);expect(starts).toHaveLength(1);
    const first=profile.kind==='new'?marks.nativeWrites.find((r:any)=>r.store==='full-state'&&r.key==='current'&&r.revision===0):starts[0];expect(first.completeMs).not.toBeNull();expect(write.completeMs).not.toBeNull();
    const beforeReading=done.raw,panels=[];
    for(const id of ['tab-0','tab-2','tab-3'])panels.push(await panelFeedback(page,id));
    expect(await recoveryDatabase(page)).toEqual(beforeReading);
    for(const resource of initialResources){
     const response=await cdp.send('Network.getResponseBody',{requestId:resource.requestId});
     resource.decodedSHA256=createHash('sha256').update(Buffer.from(response.body,response.base64Encoded?'base64':'utf8')).digest('hex');
     resource.productionPath=decodeURIComponent(new URL(resource.url).pathname.slice(1))||'index.html';
     expect(resource.decodedSHA256).toBe(build.files.find((f:any)=>f.path===resource.productionPath)?.sha256);
    }
    const measured=await page.evaluate(()=>({paints:performance.getEntriesByType('paint').map(e=>e.toJSON()),navigation:performance.getEntriesByType('navigation').map(e=>e.toJSON()),observations:(window as any).__idlePerformance}));
    const metrics=await cdp.send('Performance.getMetrics');
    const sample={...profile,fontScale:1,origin:baseURL!,measurementClock:'real',metricsMeaning:profile.kind==='new'?'created Game and enabled opening':'saved finite TRAVEL START and public running',firstControlReadyMs:marks.firstControlReadyMs,firstActionReadyMs:marks.firstActionReadyMs,fullOutcomeMs,resources:initialResources,criticalTransferBytes:initialResources.reduce((s,r)=>s+r.bytes,0),errors,panelFeedback:panels,committed:true,readingPreservedGame:true,
     witness:{actualNativeCommit:true,fullFormalGame:true,completeActivity:true,uniqueReceipt:true,allStoresReadOnly:true,cycleMs:accepted.a.cycleMs,dueAt:accepted.a.dueAt,firstAcceptanceCompleteMs:first.completeMs,firstOutcomePutEpoch:write.putEpoch,outcomeCompleteEpoch:write.completeEpoch,outcomeCompleteMs:write.completeMs},...measured,cdpMetrics:metrics.metrics};
    report.samples.push(sample);
    try{assertIdlePerformanceSample(sample);outcome={id:profile.id,status:'passed'};}catch(e){outcome={id:profile.id,status:'failed',error:e instanceof Error?e.message:String(e)};}
    console.log(JSON.stringify({format:'chenyuan-idle-performance-sample',id:sample.id,firstActionReadyMs:sample.firstActionReadyMs,fullOutcomeMs,criticalTransferBytes:sample.criticalTransferBytes,maxPanelFeedbackMs:Math.max(...panels.map(p=>p.ms)),status:outcome.status,error:outcome.error??null}));
    if(profile.repeat===1&&profile.cpu===4)await page.screenshot({path:info.outputPath(profile.kind+'-1440.png'),fullPage:false});
   }catch(e){
    let observed:any=null;try{if(currentPage&&!currentPage.isClosed())observed=await currentPage.evaluate(()=>({timing:(window as any).__idlePerformance??null,body:document.body.innerText.slice(0,4000)}));}catch(error){observed={observationError:String(error)};}
    outcome={id:profile.id,status:'measurement-error',error:e instanceof Error?e.stack??e.message:String(e),partial:{observed,resources:[...resources.values()],errors}};
    console.log(JSON.stringify({format:'chenyuan-idle-performance-error',id:profile.id,error:outcome.error.split('\n')[0]}));
   }
   finally{report.attempts.push(outcome);await context.close();}
  }
  assertIdlePerformanceReport(report);
 }finally{
  fs.mkdirSync('idle-performance-report',{recursive:true});fs.writeFileSync('idle-performance-report/measurements.json',JSON.stringify(report,null,2)+'\n');
  await info.attach('idle-production-performance.json',{body:JSON.stringify(report),contentType:'application/json'});
 }
});
