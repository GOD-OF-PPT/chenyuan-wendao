import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as C from '../src/full/content.ts';
import {compoundSourceComparisons,preparationComparisons,sustainableCombat} from './economy/joint-balance.mjs';
import {sourceIdentity,filesUnder,root,sha} from './source-identity.mjs';

const inputs=()=>Object.fromEntries([...filesUnder('src'),...filesUnder('scripts/economy'),'scripts/audit-joint-balance.mjs'].sort().map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
export function auditJointBalance(){
 const source=sourceIdentity(),sourceHashes=inputs();
 const sources=compoundSourceComparisons(),preparations=preparationComparisons(),combat=sustainableCombat();
 assert.deepEqual(inputs(),sourceHashes,'Joint numeric inputs changed during the audit');
 const missing=sources.flatMap(c=>c.candidates.filter(v=>!v.complete).map(v=>({id:c.id,school:c.school,capped:c.capped,batches:c.batches,method:v.method,failure:v.failure})));
 const dominated=sources.filter(c=>c.commissionDominatedBy.length).map(({id,school,capped,batches,commissionDominatedBy})=>({id,school,capped,batches,commissionDominatedBy}));
 return{schema:'chenyuan-joint-balance.1',contentVersion:C.VERSION,balanceVersion:C.BALANCE,numericStatus:'unbalanced',source,sourceHashes,
  scope:'Actual finite Activity/resolve integer cycles from normal rule-earned checkpoints, same inventory/cash/XP targets and cave endpoint. Includes real sale prices and best-time bounded integer mixtures of unlocked pure income. Not a proof of global optimality, browser delivery, real waiting, human experience or finished balance.',
  sources,preparations,combat,summary:{compoundCases:sources.length,compoundCandidates:sources.reduce((n,c)=>n+c.candidates.length,0),missing,dominated,preparationCases:preparations.length,preparationFailures:preparations.flatMap(c=>c.candidates.filter(v=>!v.complete).map(v=>({school:c.school,realm:c.realm,capital:c.capital,capped:c.capped,method:v.method,failure:v.failure}))),combatCases:combat.length,combatVictories:combat.reduce((n,c)=>n+c.victories,0),combatFailures:combat.filter(c=>!c.complete).map(c=>({school:c.school,enemy:c.enemy,failure:c.failure}))}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--report');assert.ok(i>=0&&process.argv[i+1],'Use --report with a new local artifact path');
 const destination=path.resolve(process.argv[i+1]);assert.ok(!fs.existsSync(destination),'Preserve the earlier report; choose a new path');
 const report=auditJointBalance();fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({report:destination,...report.summary}));
 if(report.summary.missing.length||report.summary.dominated.length||report.summary.preparationFailures.length||report.summary.combatFailures.length)process.exitCode=1;
}
