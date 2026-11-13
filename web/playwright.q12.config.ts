import {defineConfig} from '@playwright/test';
import {sourceIdentity,runtimeSources,sha} from '../scripts/source-identity.mjs';
import {assertWebBuild} from '../scripts/assert-web-build.mjs';
assertWebBuild();
export default defineConfig({
 metadata:{chenyuan:sourceIdentity(),runtimeDigest:sha(JSON.stringify(runtimeSources()))},
 testDir:'./e2e',testMatch:['quality-style-surfaces.spec.ts'],timeout:60000,expect:{timeout:8000},fullyParallel:true,workers:2,retries:0,
 projects:[{name:'chromium',use:{browserName:'chromium'}}],
 use:{baseURL:'http://127.0.0.1:4196',viewport:{width:1440,height:900},trace:'retain-on-failure'},
 reporter:[['list'],['json',{outputFile:'quality-report/q12.json'}]],
 webServer:{command:'npm run preview -- --port 4196 --strictPort',url:'http://127.0.0.1:4196',reuseExistingServer:false},
});
