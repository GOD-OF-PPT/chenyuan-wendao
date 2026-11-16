import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as legacy from '../src/legacy/rules-v3/index.ts';

const root=fileURLToPath(new URL('../src/legacy/rules-v3/',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
test('the frozen old-rule adapter is a closed source graph with its actual committed provenance',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8'));
 assert.equal(manifest.sourceCommit,'f0323f927310e102ea33c8501741f41351b38c38');
 assert.equal(manifest.contentVersion,'full-demo.3');assert.equal(manifest.balanceVersion,'full-unbalanced.3');
 assert.equal(sha(fs.readFileSync(path.join(root,'index.ts'))),manifest.entrySha256);
 for(const [file,record]of Object.entries(manifest.files)){
  const bytes=fs.readFileSync(path.join(root,file));assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);
  for(const m of bytes.toString('utf8').matchAll(/(?:from\s*|import\s*(?:\(\s*)?)(['"])(\.[^'"]+)\1/g)){
   const value=path.posix.normalize(path.posix.join(path.posix.dirname(file),m[2]));
   assert.ok([value,value+'.ts',value+'.mjs',value+'.js',value+'/index.ts'].some(p=>Object.hasOwn(manifest.files,p)),file+' -> '+m[2]);
  }
 }
});

test('the genuine v3 engine activity and receipt retain their old quantities and proof without a new marker',()=>{
 let game=legacy.engine.newGame('旧约修士','old-rule-control');
 for(const action of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'},{type:'TRAVEL',location:'sect'}])game=legacy.engine.advance(game,{...action,commandId:'old:'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});
 const original=structuredClone(game),a=legacy.activity.createActivity(game,{kind:'source',sourceId:'work',maxCycles:1,until:'cycles',target:null,monthBudget:1,remainingMonthsReserve:1},{id:'old-source',ownerId:'old-owner',commandId:'old-start',now:10000});
 assert.equal(a.cycleMs,30000);assert.equal(Object.hasOwn(a,'rulesVersion'),false);
 const formal=legacy.engine.resolve(game,a.nextCommand),done=legacy.activity.completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:a.dueAt});
 const input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}};
 const receipt={format:'chenyuan-activity-receipt',version:1,input,fingerprint:legacy.receipts.canonicalFingerprint(input),activity:done,command:a.nextCommand,result:formal.result};
 legacy.activityReceipt.validateActivityReceipt(receipt,formal.nextState);
 assert.equal(formal.result.versions.contentVersion,'full-demo.3');assert.equal(formal.result.costs.months,1);assert.equal(done.spentMonths,1);assert.equal(done.gainedStones,20);
 assert.deepEqual(game,original);const broken=structuredClone(receipt);broken.result.versions.balanceVersion='full-unbalanced.4';assert.throws(()=>legacy.activityReceipt.validateActivityReceipt(broken,formal.nextState));
});
