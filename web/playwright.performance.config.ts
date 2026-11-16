import {assertWebBuild} from '../scripts/assert-web-build.mjs';
import {sourceIdentity} from '../scripts/source-identity.mjs';
import {defineConfig} from '@playwright/test';
assertWebBuild();
export default defineConfig({
  forbidOnly:!!process.env.CI,
  metadata:{chenyuan:sourceIdentity()},
 testDir:'./performance-tests',timeout:300000,expect:{timeout:8000},fullyParallel:false,workers:1,retries:0,
 reporter:[['list'],['json',{outputFile:'performance-report/results.json'}],['html',{outputFolder:'performance-report/html',open:'never'}]],outputDir:'performance-results',
 projects:[{name:'chromium',use:{browserName:'chromium'}}],
 use:{baseURL:'http://127.0.0.1:4177',viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000,trace:'off',screenshot:'only-on-failure'},
 webServer:{command:'npm run preview -- --port 4177 --strictPort',url:'http://127.0.0.1:4177',reuseExistingServer:false},
});
