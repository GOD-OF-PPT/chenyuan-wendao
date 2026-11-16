import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {verifyRecoveryCoverage,flattenRecoveryReport} from './check-recovery-coverage.mjs';
import {verifyJourneyCoverage} from './check-journey-coverage.mjs';
import {assertPerformanceReport} from './performance-budget.mjs';
import {parseTap,coreCommands,coreLogName} from './validate-core.mjs';
import {sourceIdentity,root,sha,runtimeSources} from './source-identity.mjs';
import {currentVersions} from '../src/full/versions.ts';
import {demoCatalog,validateDemoNode} from '../src/demo.ts';
const browsers=['chromium','firefox','webkit'];
export const demoRequiredTitles=[...demoCatalog.map(n=>`demo node ${n.id} loads a lawful playable state in its own database`),
 'demo menu, actions, settings and return preserve every normal Game, record and tracking value',
 'demo reload, reset and typed export/import stay separate from normal saves',
 'unknown, ambiguous, damaged and missing demo nodes never open a normal or demo save',
 'a demo seed quota failure keeps the normal database intact and retries one stable import',
 'demo storage denial offers an explicit scoped reread without falling back to the normal Game',
 'demo menus and four viewport screenshots retain a visible scope and playable controls at 150 percent',
 'two first-load demo tabs share one seed receipt and sync their own committed turn',
 'demo trial entries create real repeatable complete checkpoints rather than importing invented ones',
 'both demo endings commit through the real confirmation and a node reset never touches normal progress'];
export const accessibilityRequiredTitles=[[1280,720],[1440,900],[1920,1080],[390,844]].flatMap(([w,h])=>[1,1.5,2].flatMap(scale=>['opening','event','battle','inventory','breakthrough','question','ending','sealed'].map(state=>`${w}x${h}/${scale}: ${state} retains readable content, controls and save dialogs`)));
export function matchIdentity(value,source){assert.ok(value&&!value.dirty,'Dirty or missing validation identity');assert.equal(value.tree,source.tree,'Evidence tree differs');assert.ok([source.head,source.source].includes(value.head),'Evidence from an earlier/different checkout');assert.equal(value.source,source.source,'Evidence source commit differs');}
function findFiles(directory,name){const out=[];const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,entry.name);assert.ok(!entry.isSymbolicLink(),'Evidence symlink');if(entry.isDirectory())walk(f);else if(entry.isFile()&&entry.name===name)out.push(f);}};walk(directory);return out.sort();}
function exactDemoTests(tests,browser){for(const title of demoRequiredTitles)assert.equal(tests.filter(t=>t.projectName===browser&&t.file==='demo.spec.ts'&&t.title===title).length,1,browser+': missing/duplicate '+title);}
function exactAccessibilityTests(tests,browser){for(const title of accessibilityRequiredTitles)assert.equal(tests.filter(t=>t.projectName===browser&&t.file==='accessibility.spec.ts'&&t.title===title).length,1,browser+': missing/duplicate layout '+title);}
export function requireTestInventory(actual,declared){
 const key=t=>JSON.stringify([t.projectName,t.suite,t.file,t.title]);
 const expected=declared.map(key),observed=actual.map(key);
 assert.ok(expected.length>0,'No current declared browser tests');
 for(const browser of browsers)for(const suite of ['ui','persistence'])assert.ok(declared.some(t=>t.projectName===browser&&t.suite===suite),'Missing declared '+browser+'/'+suite);
 assert.equal(new Set(expected).size,expected.length,'Duplicate declared test identity');
 assert.equal(new Set(observed).size,observed.length,'Duplicate executed test identity');
 assert.deepEqual(observed.sort(),expected.sort(),'Executed reports do not cover the complete current test inventory');
}
function currentTestInventory(){
 const env={...process.env};for(const key of ['PLAYWRIGHT_JSON_OUTPUT_DIR','PLAYWRIGHT_JSON_OUTPUT_NAME','PLAYWRIGHT_JSON_OUTPUT_FILE'])delete env[key];
 return ['playwright.config.ts','playwright.persistence.config.ts'].flatMap(config=>{
  const raw=execFileSync(process.execPath,[path.join(root,'web/node_modules/@playwright/test/cli.js'),'test','--config',config,'--list','--forbid-only','--reporter=json'],{cwd:path.join(root,'web'),env,encoding:'utf8',maxBuffer:40_000_000});
  return flattenRecoveryReport(JSON.parse(raw)).tests.map(({suite,file,title,projectName})=>({suite,file,title,projectName}));
 });
}
export function candidateEvidence(browserDirectory,journeyDirectory){
 const source=sourceIdentity();assert.ok(!source.dirty,'Candidate certification requires a clean checkout');const files=[],add=(from,to)=>{assert.ok(!files.some(f=>f.to===to));const bytes=fs.readFileSync(from);files.push({from:path.resolve(from),to,bytes:bytes.length,sha256:sha(bytes)});};
 const recovery=verifyRecoveryCoverage(browserDirectory),journeys=verifyJourneyCoverage(journeyDirectory),totals={},executed=[];
 for(const kind of ['ui','persistence']){
  const reports=findFiles(browserDirectory,kind+'.json');assert.equal(reports.length,3,'Exactly one '+kind+' report per actual browser is required');
  for(const filename of reports){const report=JSON.parse(fs.readFileSync(filename,'utf8'));matchIdentity(report.config?.metadata?.chenyuan,source);const flat=flattenRecoveryReport(report),names=[...new Set(flat.tests.map(t=>t.projectName))];assert.equal(names.length,1);const browser=names[0];assert.ok(browsers.includes(browser));totals[browser]??={};assert.equal(totals[browser][kind],undefined);totals[browser][kind]=flat.tests.length;executed.push(...flat.tests);if(kind==='ui'){exactDemoTests(flat.tests,browser);exactAccessibilityTests(flat.tests,browser);}add(filename,`evidence/${kind}-${browser}.json`);}
 }
 const declared=currentTestInventory();requireTestInventory(executed,declared);
 const inventoryPath=path.join(root,'web/build-report/test-inventory.json');fs.writeFileSync(inventoryPath,JSON.stringify({format:'chenyuan-test-inventory',version:1,source,tests:declared},null,2)+'\n');add(inventoryPath,'evidence/test-inventory.json');
 for(const filename of findFiles(journeyDirectory,'results.json')){const report=JSON.parse(fs.readFileSync(filename,'utf8'));matchIdentity(report.config?.metadata?.chenyuan,source);add(filename,`evidence/journeys/${String(files.filter(f=>f.to.startsWith('evidence/journeys/')).length+1).padStart(2,'0')}.json`);}
 const cores=findFiles(browserDirectory,'validation.json');assert.equal(cores.length,3,'Three actual core validation reports required');let coreCount;
 for(let index=0;index<cores.length;index++){
  const filename=cores[index],report=JSON.parse(fs.readFileSync(filename,'utf8'));assert.equal(report.format,'chenyuan-core-validation');assert.equal(report.version,1);assert.equal(report.passed,true);matchIdentity(report.source,source);assert.deepEqual(report.results.map(r=>r.id),['lock','install','typecheck','content','tests','m1','full','economy','documents','design-documents']);
  const currentTests=fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>'tests/'+n);assert.deepEqual(report.tests,currentTests);assert.deepEqual(report.results.map(r=>[r.id,r.command,r.args]),coreCommands(currentTests));
  for(const r of report.results){assert.equal(r.exitCode,0);assert.equal(r.file,coreLogName(r.id));const f=path.join(path.dirname(filename),r.file),raw=fs.readFileSync(f);assert.equal(sha(raw),r.sha256);assert.equal(raw.length,r.bytes);if(r.id==='tests'){assert.deepEqual(r.args,['--experimental-strip-types','--test','--test-reporter=tap',...currentTests]);const counts=parseTap(raw.toString());assert.deepEqual(counts,report.counts);if(coreCount!==undefined)assert.equal(counts.pass,coreCount);coreCount=counts.pass;}add(f,`evidence/core-${index+1}/${r.file}`);}
  add(filename,`evidence/core-${index+1}/validation.json`);
 }
 const buildPath=path.join(root,'web/build-report/build.json'),build=JSON.parse(fs.readFileSync(buildPath,'utf8'));assert.equal(build.format,'chenyuan-web-build');matchIdentity(build.source,source);assert.deepEqual(build.versions,currentVersions);assert.deepEqual(build.runtimeSources,runtimeSources());assert.equal(sha(JSON.stringify(build.runtimeSources)),build.sourceDigest);
 const actualFiles=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){assert.ok(!e.isSymbolicLink());const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else actualFiles.push({path:path.relative(path.join(root,'web/dist'),f).split(path.sep).join('/'),bytes:fs.statSync(f).size,sha256:sha(fs.readFileSync(f))});}};walk(path.join(root,'web/dist'));actualFiles.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);assert.deepEqual(actualFiles,build.files);assert.equal(build.bytes,actualFiles.reduce((n,f)=>n+f.bytes,0));
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'web/dist/demo-nodes/manifest.json'),'utf8'));assert.equal(catalog.sourceDigest,build.sourceDigest);assert.deepEqual(catalog.nodes.map(n=>n.id),demoCatalog.map(n=>n.id));
 for(const spec of catalog.nodes){const raw=fs.readFileSync(path.join(root,'web/dist/demo-nodes',spec.id+'.json'));assert.equal(raw.length,spec.bytes);assert.equal(sha(raw),spec.sha256);validateDemoNode(JSON.parse(raw),spec.id,build.sourceDigest);}
 const performanceFiles=findFiles(browserDirectory,'measurements.json');assert.equal(performanceFiles.length,1,'One actual Chromium performance report per candidate run');const performance=JSON.parse(fs.readFileSync(performanceFiles[0],'utf8'));assertPerformanceReport(performance);assert.equal(performance.sourceDirty,false);assert.equal(performance.sourceTree,source.tree);assert.ok([source.head,source.source].includes(performance.sourceHead));
 for(const [file,digest]of Object.entries({...performance.harnessHashes,...performance.runtimeSourceHashes}))assert.equal(sha(fs.readFileSync(path.join(root,file))),digest,'Stale performance code: '+file);
 const payload=list=>Object.fromEntries(list.map(f=>[f.path,{bytes:f.bytes,sha256:f.sha256}]));assert.deepEqual(payload(performance.production.files),payload(build.files));assert.equal(performance.production.bytes,build.bytes);add(performanceFiles[0],'evidence/performance.json');add(buildPath,'evidence/build.json');
 const chromium=findFiles(browserDirectory,'ui.json').find(f=>flattenRecoveryReport(JSON.parse(fs.readFileSync(f,'utf8'))).tests[0].projectName==='chromium');const artifactRoot=path.dirname(path.dirname(chromium));
 for(const [width,height]of[[1280,720],[1440,900],[1920,1080],[390,844]]){const found=findFiles(path.join(artifactRoot,'test-results'),'demo-'+width+'.png');assert.equal(found.length,1,'Missing/duplicate representative screenshot');const data=fs.readFileSync(found[0]);assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),width);assert.equal(data.readUInt32BE(20),height);add(found[0],`screenshots/demo-${width}.png`);}
 return{format:'chenyuan-candidate-inputs',version:1,source,versions:currentVersions,build,summary:{core:coreCount,browsers:totals,normalRoutes:journeys.passed,recoveryRequirements:recovery.requirementCount,recoveryPairs:60,demoNodes:demoCatalog.length,demoCasesPerBrowser:demoRequiredTitles.length,layoutViewsPerBrowser:accessibilityRequiredTitles.length,performanceSamples:performance.samples.length},files};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const report=candidateEvidence(path.resolve(process.argv[2]),path.resolve(process.argv[3]));fs.writeFileSync(process.argv[4],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({format:report.format,source:report.source,summary:report.summary}));}
