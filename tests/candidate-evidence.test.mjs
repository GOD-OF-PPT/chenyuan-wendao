import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {matchIdentity,demoRequiredTitles,accessibilityRequiredTitles} from '../scripts/candidate-evidence.mjs';
test('candidate evidence rejects dirty, stale and different checkout identities',()=>{const source={head:'a'.repeat(40),source:'b'.repeat(40),tree:'c'.repeat(40)};matchIdentity({...source,dirty:false},source);matchIdentity({...source,head:source.source,dirty:false},source);for(const patch of[{dirty:true},{head:'d'.repeat(40)},{source:'d'.repeat(40)},{tree:'d'.repeat(40)}])assert.throws(()=>matchIdentity({...source,dirty:false,...patch},source));assert.equal(demoRequiredTitles.length,18);assert.equal(new Set(demoRequiredTitles).size,18);assert.equal(accessibilityRequiredTitles.length,96);assert.equal(new Set(accessibilityRequiredTitles).size,96);});
test('standalone candidate verifier exercises integrity-only fixtures and rejects tampering, traversal and overwrite',()=>{execFileSync('python3',['tests/candidate_integrity_test.py'],{stdio:'pipe'});});
