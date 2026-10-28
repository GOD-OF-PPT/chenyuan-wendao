import {defineConfig} from '@playwright/test';
import {assertWebBuild} from '../scripts/assert-web-build.mjs';
import {sourceIdentity} from '../scripts/source-identity.mjs';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import {createHash} from 'node:crypto';
const build=assertWebBuild();
const serviceFile=fileURLToPath(new URL('../scripts/candidate/serve.py',import.meta.url));
export default defineConfig({
 forbidOnly:!!process.env.CI,metadata:{chenyuan:sourceIdentity(),runtimeDigest:build.sourceDigest,performanceService:{kind:'candidate-python',script:'scripts/candidate/serve.py',sha256:createHash('sha256').update(fs.readFileSync(serviceFile)).digest('hex')}},
 testDir:'./idle-performance-tests',timeout:300000,expect:{timeout:8000},fullyParallel:false,workers:1,retries:0,
 reporter:[['list'],['json',{outputFile:'idle-performance-report/results.json'}]],outputDir:'idle-performance-results',
 projects:[{name:'chromium',use:{browserName:'chromium'}}],
 use:{baseURL:'http://127.0.0.1:4177',viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000,trace:'off',screenshot:'only-on-failure'},
 webServer:{command:'python3 ../scripts/candidate/serve.py --directory dist --port 4177',cwd:fileURLToPath(new URL('.',import.meta.url)),url:'http://127.0.0.1:4177',reuseExistingServer:false},
});
