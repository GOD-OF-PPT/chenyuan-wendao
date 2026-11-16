import base from './playwright.idle-recovery.config';
export default {...base,
 testMatch:['activity-store.spec.ts','adventure-store.spec.ts','configuration-store.spec.ts','check-art-02-store.spec.ts','milestone-store.spec.ts','positive-cost-store.spec.ts','store-reconnect.spec.ts','store-sync-queue.spec.ts'],
 use:{...base.use,baseURL:'http://127.0.0.1:4186'},
 webServer:{command:'npm run dev -- --port 4186 --strictPort',url:'http://127.0.0.1:4186/persistence-tests/harness.html',reuseExistingServer:false}};
