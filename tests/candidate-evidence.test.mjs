import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {matchIdentity,demoRequiredTitles,accessibilityRequiredTitles,requireTestInventory} from '../scripts/candidate-evidence.mjs';
test('candidate evidence rejects dirty, stale and different checkout identities',()=>{const source={head:'a'.repeat(40),source:'b'.repeat(40),tree:'c'.repeat(40)};matchIdentity({...source,dirty:false},source);matchIdentity({...source,head:source.source,dirty:false},source);for(const patch of[{dirty:true},{head:'d'.repeat(40)},{source:'d'.repeat(40)},{tree:'d'.repeat(40)}])assert.throws(()=>matchIdentity({...source,dirty:false,...patch},source));assert.equal(demoRequiredTitles.length,18);assert.equal(new Set(demoRequiredTitles).size,18);assert.equal(accessibilityRequiredTitles.length,96);assert.equal(new Set(accessibilityRequiredTitles).size,96);});
test('standalone candidate verifier exercises integrity-only fixtures and rejects tampering, traversal and overwrite',()=>{execFileSync('python3',['tests/candidate_integrity_test.py'],{stdio:'pipe'});});
const declared=['chromium','firefox','webkit'].flatMap(projectName=>['ui','persistence'].map(suite=>({projectName,suite,file:suite+'.spec.ts',title:'a required current scenario'})));
test('candidate browser coverage binds every declared suite, browser and scenario independent of report ordering',()=>{
 const actual=structuredClone(declared).reverse(),before=structuredClone(actual);requireTestInventory(actual,declared);assert.deepEqual(actual,before);
});
test('candidate browser coverage refuses partial grep runs, duplicated, substituted and unexpected test identities',()=>{
 for(const actual of [declared.slice(1),[...declared,declared[0]],[...declared.slice(1),{...declared[0],title:'different scenario'}],[...declared,{...declared[0],file:'extra.spec.ts'}]])assert.throws(()=>requireTestInventory(actual,declared));
 assert.throws(()=>requireTestInventory([],[]));assert.throws(()=>requireTestInventory(declared,[...declared,declared[0]]));
});
