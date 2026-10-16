import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./journey-tests',timeout:300000,expect:{timeout:8000},fullyParallel:true,workers:2,retries:0,
  reporter:[['list'],['json',{outputFile:'journey-report/results.json'}],['html',{outputFolder:'journey-report/html',open:'never'}]],
  outputDir:'journey-results',
  projects:['chromium','firefox','webkit'].map(name=>({name,use:{browserName:name as 'chromium'|'firefox'|'webkit',...(name==='firefox'?{launchOptions:{firefoxUserPrefs:{'network.proxy.type':0}}}:{})}})),
  use:{baseURL:'http://127.0.0.1:4175',viewport:{width:1440,height:1000},actionTimeout:8000,navigationTimeout:15000,trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'npm run preview -- --port 4175 --strictPort',url:'http://127.0.0.1:4175',reuseExistingServer:false},
});
