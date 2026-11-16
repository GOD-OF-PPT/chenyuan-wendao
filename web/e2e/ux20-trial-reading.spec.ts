import {test,expect} from '@playwright/test';
import {resolve} from '../../src/full/engine.ts';
import {completeActivity} from '../../src/full/activity.ts';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {importRecoveryFixture,recoveryDatabase,stored} from './idle-recovery-ui-support';
import {activitySnapshot,snapshot} from './support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test('UX20 saving an already-confirmed ending still allows readonly stage inspection without cancelling its original outcome',async({page})=>{
 const g=await importRecoveryFixture(page,trialJourneyScenario().states.at(-1));
 await page.getByTestId('hub-goal').click();await page.getByTestId('trial-goal-inspect').click();await page.getByTestId('story-show-choices').click();await page.getByTestId('ending-transmit').click();await page.getByTestId('ascension-confirm').click();const a=await activitySnapshot(page);await expect(page.getByTestId('training-countdown')).toHaveText('12.0 秒');
 await page.evaluate(()=>new Promise<void>((ok,no)=>{const q=indexedDB.open('chenyuan-playable-v1');q.onerror=()=>no(q.error);q.onsuccess=()=>{const db=q.result,t=db.transaction('full-state','readwrite');let hold=true;(window as any).__ux20Release=()=>hold=false;const keep=()=>{const r=t.objectStore('full-state').get('current');r.onsuccess=()=>{if(hold)keep();};};keep();t.oncomplete=()=>db.close();ok();};}));
 try{await page.clock.fastForward(12000);await expect(page.getByTestId('save-status')).toHaveText('保存中');await page.getByTestId('hub-goal').click();await expect(page.getByTestId('trial-goal')).toContainText('尚未收卷');await expect(page.getByTestId('trial-goal-inspect')).toBeEnabled();await page.getByTestId('trial-goal-inspect').click();await expect(page.getByTestId('narrative-catalogue')).toBeVisible();}
 finally{await page.evaluate(()=>(window as any).__ux20Release());}
 await expect(page.getByTestId('save-status')).toHaveText('已保存');const raw=await recoveryDatabase(page),formal=resolve(g,a.nextCommand),receipts=raw.rows['full-receipts'].filter((r:any)=>r.value.command?.commandId===a.nextCommand.commandId);expect(receipts).toHaveLength(1);const r=receipts[0].value;expect(await snapshot(page)).toEqual(formal.nextState);expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);expect(r.proof.activityBefore).toEqual(a);expect(stored(raw,'activity')).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:r.proof.resolvedAt}));expect(stored(raw,'activity').completedCycles).toBe(1);expect(stored(raw,'activity').nextCommand).toBeNull();
});
