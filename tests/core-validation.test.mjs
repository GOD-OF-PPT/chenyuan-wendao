import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTap,coreLogName} from '../scripts/validate-core.mjs';
const tap='TAP version 13\nok 1 - actual case\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
test('core evidence parser accepts actual complete TAP and refuses omitted or duplicated counters',()=>{assert.equal(parseTap(tap).pass,1);assert.throws(()=>parseTap(tap.replace('# tests 1\n','')));assert.throws(()=>parseTap(tap+'# pass 1\n'));assert.equal(coreLogName('m1'),'m1.log');assert.equal(coreLogName('tests'),'tests.tap');assert.throws(()=>coreLogName('../outside'));assert.throws(()=>coreLogName('unknown'));});
test('core evidence cannot promote skip, todo, cancellation, failure or bailout to success',()=>{for(const key of['fail','cancelled','skipped','todo'])assert.throws(()=>parseTap(tap.replace('# '+key+' 0','# '+key+' 1')));assert.throws(()=>parseTap(tap.replace('# pass 1','# pass 0')));assert.throws(()=>parseTap(tap+'not ok 2 - lost\n'));assert.throws(()=>parseTap(tap+'Bail out! broken\n'));});
