import base from './playwright.idle-recovery.config';
export default {...base,testMatch:['idle-recovery-rule-profiles.spec.ts'],grepInvert:undefined,
 use:{...base.use,baseURL:'http://127.0.0.1:4184'},
 webServer:{command:'npm run dev -- --port 4184 --strictPort',url:'http://127.0.0.1:4184/persistence-tests/harness.html',reuseExistingServer:false}};
