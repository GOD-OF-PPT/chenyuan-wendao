import {expect,type Page} from '@playwright/test';
import {LOCAL_DB_NAME} from '../src/local-experience';
export type GameConfirmationKind='import'|'restart'|'restore'|'clear-local'|'clear-memory';

/** Answer the exact visible game consent after its real triggering action. */
export async function answerGameConfirmation(page:Page,kind:GameConfirmationKind,accept=true){
 const dialog=page.getByTestId('game-confirmation');await expect(dialog).toBeVisible();await expect(dialog).toHaveAttribute('data-kind',kind);await expect(page.locator('dialog[open]')).toHaveCount(1);
 const control=page.getByTestId(accept?'game-confirmation-confirm':'game-confirmation-cancel');await expect(control).toBeEnabled();await control.click();await expect(dialog).toHaveCount(0);
}
export async function localConfirmationSnapshot(page:Page){return page.evaluate(name=>new Promise<any>((resolve,reject)=>{
 const request=indexedDB.open(name);request.onupgradeneeded=()=>{request.transaction!.abort();reject(Error('Readonly consent observer cannot create local records'));};request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction(['meta','events'],'readonly'),meta=tx.objectStore('meta').get('state'),rows=tx.objectStore('events').getAll();tx.oncomplete=()=>{db.close();resolve({meta:meta.result,rows:rows.result});};tx.onabort=()=>{db.close();reject(tx.error);};};
}),LOCAL_DB_NAME);}
