import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDirectIntent} from '../src/full/direct-actions.ts';
import {resolve} from '../src/full/engine.ts';
import {directReceipt,validateDirectReceipt} from '../web/src/direct-persistence.ts';
import {paidResponseFixture} from './response-context-fixtures.mjs';

const before=paidResponseFixture();
const input={command:{type:'DECIDE',option:'bargain',commandId:'direct-proof',runId:before.core.runId,expectedRevision:before.core.revision},expectedActivityId:null,expectedActivityRevision:null};
test('a direct intent has a closed action set, a single sale and exact activity CAS',()=>{
  validateDirectIntent(input);
  for(const action of [{type:'TRAVEL',location:'cave'},{type:'BREAKTHROUGH'},{type:'ANSWER_TRIAL',answer:'accept'},{type:'SELL',item:'herb',quantity:2}])assert.throws(()=>validateDirectIntent({...input,command:{...action,commandId:'x',runId:before.core.runId,expectedRevision:0}}));
  for(const patch of [{extra:true},{expectedActivityId:null,expectedActivityRevision:1},{expectedActivityId:'a',expectedActivityRevision:null},{expectedActivityId:'',expectedActivityRevision:0}])assert.throws(()=>validateDirectIntent({...input,...patch}));
});
test('the direct receipt reconstructs the full formal transition and remains valid at later same-life progress',()=>{
  const formal=resolve(before,input.command),receipt=directReceipt(input,before,formal.nextState,formal.result),copy=structuredClone(receipt);
  validateDirectReceipt(receipt,formal.nextState);
  const later=resolve(formal.nextState,{type:'EVENT',event:'lu_intro',commandId:'later',runId:before.core.runId,expectedRevision:formal.nextState.core.revision}).nextState;
  validateDirectReceipt(receipt,later);assert.deepEqual(receipt,copy);
  for(const mutate of [r=>r.after.core.player.stones++,r=>r.before.core.inventory.herb++,r=>r.intent.expectedActivityRevision=1,r=>r.fingerprint='bad',r=>r.result.delta.stones++,r=>r.intent.command.option='assist']){
    const forged=structuredClone(receipt);mutate(forged);assert.throws(()=>validateDirectReceipt(forged,later));
  }
  assert.throws(()=>validateDirectReceipt(receipt,{...later,core:{...later.core,runId:'replacement'}}));
});
