import base from './playwright.idle-recovery.config';
export default {...base,testMatch:['idle-recovery-scheduled.spec.ts','idle-recovery-scheduled-store.spec.ts','idle-recovery-scheduled-ui.spec.ts'],grepInvert:undefined,
 use:{...base.use,baseURL:'http://127.0.0.1:4186'},
 webServer:{command:'npm run dev -- --port 4186 --strictPort',url:'http://127.0.0.1:4186/persistence-tests/harness.html',reuseExistingServer:false}};
