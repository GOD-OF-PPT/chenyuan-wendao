import test from 'node:test';
import assert from 'node:assert/strict';
import * as current from '../src/full/engine.ts';
import * as old from '../src/legacy/rules-v3/index.ts';
import {configurationReceipt,validateConfigurationReceipt} from '../web/src/configuration-persistence.ts';
import {directReceipt,validateDirectReceipt} from '../web/src/direct-persistence.ts';
function prepared(engine){let g=engine.newGame('版本边界','same-profile-run');for(const a of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'},{type:'TRAVEL',location:'sect'}])g=engine.advance(g,{...a,commandId:'p:'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision});return g;}
for(const [kind,action,make,validate]of [['direct',{type:'EVENT',event:'lu_intro'},directReceipt,validateDirectReceipt],['configuration',{type:'SCHOOL',school:'talisman'},configurationReceipt,validateConfigurationReceipt]])test(kind+' requires receipt snapshots and current life to share one rule profile',()=>{
 const beforeOld=prepared(old.engine),beforeNew=prepared(current),command={...action,commandId:'same-intent',runId:beforeOld.core.runId,expectedRevision:beforeOld.core.revision},intent={command,expectedActivityId:null,expectedActivityRevision:null};
 const a=current.resolve(beforeOld,command),b=current.resolve(beforeNew,command),receipt=make(intent,beforeOld,a.nextState,a.result),fresh=make(intent,beforeNew,b.nextState,b.result);
 validate(receipt,a.nextState);validate(fresh,b.nextState);
 assert.throws(()=>validate(receipt,b.nextState),e=>e.code==='RECEIPT_INVALID');
 assert.throws(()=>validate(fresh,a.nextState),e=>e.code==='RECEIPT_INVALID');
});
