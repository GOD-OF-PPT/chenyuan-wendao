import {expect,type Page} from '@playwright/test';
import type {Action,Game} from '../../src/full/types';
import {resolve} from '../../src/full/engine';
import {validateDirectReceipt} from '../src/direct-persistence';
import {snapshot,activitySnapshot} from './support';
import {recoveryDatabase,stored} from './idle-recovery-ui-support';

export async function expectDirectOutcome(page:Page,before:Game,rawBefore:any,action:Action){
  await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  await expect(page.getByTestId('save-status')).toHaveText('已保存');
  const raw=await recoveryDatabase(page),added=raw.rows['full-receipts'].filter((r:any)=>!rawBefore.rows['full-receipts'].some((x:any)=>x.key===r.key));
  expect(added).toHaveLength(1);const receipt=added[0].value,command=receipt.intent.command;
  expect(receipt.format).toBe('chenyuan-direct-receipt');expect(command).toMatchObject({...action,runId:before.core.runId,expectedRevision:before.core.revision});
  expect(added[0].key).toBe(before.core.runId+':'+command.commandId);
  const formal=resolve(before,command);expect(receipt.before).toEqual(before);expect(receipt.after).toEqual(formal.nextState);expect(receipt.result).toEqual(formal.result);
  expect(()=>validateDirectReceipt(receipt,formal.nextState)).not.toThrow();
  expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(raw,'current')).toEqual(formal.nextState);expect(stored(raw,'previous')).toEqual(before);
  expect(await activitySnapshot(page)).toBeNull();expect(stored(raw,'activity')).toBeNull();
  expect(raw.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key))).toEqual(rawBefore.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key)));
  expect(raw.rows['full-receipts'].filter((x:any)=>x.key!==added[0].key)).toEqual(rawBefore.rows['full-receipts']);
  for(const name of Object.keys(rawBefore.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[name],name).toEqual(rawBefore.rows[name]);
  return{g:formal.nextState,raw,receipt};
}
