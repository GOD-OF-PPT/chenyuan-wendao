import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTap,coreLogName,coreCommands,installValidationDependencies} from '../scripts/validate-core.mjs';
const tap='TAP version 13\nok 1 - actual case\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
test('core evidence parser accepts actual complete TAP and refuses omitted or duplicated counters',()=>{assert.equal(parseTap(tap).pass,1);assert.throws(()=>parseTap(tap.replace('# tests 1\n','')));assert.throws(()=>parseTap(tap+'# pass 1\n'));assert.equal(coreLogName('m1'),'m1.log');assert.equal(coreLogName('tests'),'tests.tap');assert.throws(()=>coreLogName('../outside'));assert.throws(()=>coreLogName('unknown'));});
test('core evidence cannot promote skip, todo, cancellation, failure or bailout to success',()=>{for(const key of['fail','cancelled','skipped','todo'])assert.throws(()=>parseTap(tap.replace('# '+key+' 0','# '+key+' 1')));assert.throws(()=>parseTap(tap.replace('# pass 1','# pass 0')));assert.throws(()=>parseTap(tap+'not ok 2 - lost\n'));assert.throws(()=>parseTap(tap+'Bail out! broken\n'));});

test('core prepares both reviewed locks before source tests can import real Vue models',()=>{
 const calls=[];const result=installValidationDependencies((command,args,options)=>{calls.push({command,args,cwd:options.cwd});return{status:0,stdout:'',stderr:''};});
 assert.deepEqual(calls.map(c=>[c.command,c.args]),[['npm',['ci','--ignore-scripts','--no-audit','--no-fund']],['npm',['--prefix','web','ci','--ignore-scripts','--no-audit','--no-fund']]]);assert.equal(calls[0].cwd,calls[1].cwd);assert.equal(result,undefined);
});
test('a failed root lock install cannot proceed to web installation or any validation',()=>{
 let calls=0;assert.throws(()=>installValidationDependencies(()=>{calls++;return{status:1,stdout:'',stderr:'isolated install rejection'};}),/Dependency installation failed/);assert.equal(calls,1);
});
test('a failed web install or spawn error cannot become successful dependency preparation',()=>{
 for(const last of [{status:1},{status:null,error:new Error('isolated spawn error')}]){let calls=0;assert.throws(()=>installValidationDependencies(()=>{calls++;return calls===1?{status:0}:last;}));assert.equal(calls,2);}
});
test('dependency preparation preserves all ten strict core gates and the original test inventory arguments',()=>{
 const commands=coreCommands(['tests/actual.test.mjs']);assert.deepEqual(commands.map(c=>c[0]),['lock','install','typecheck','content','tests','m1','full','economy','documents','design-documents']);assert.deepEqual(commands[1],['install','node',['scripts/validate-core.mjs','--install-dependencies']]);assert.deepEqual(commands[4],['tests','node',['--experimental-strip-types','--test','--test-reporter=tap','tests/actual.test.mjs']]);assert.deepEqual(commands.filter(c=>!['install','tests'].includes(c[0])),[['lock','node',['scripts/check_lock.mjs']],['typecheck','npm',['run','typecheck']],['content','npm',['run','check:content']],['m1','npm',['run','replay']],['full','npm',['run','replay:full']],['economy','npm',['run','audit:economy']],['documents','python3',['scripts/check_docs.py']],['design-documents','python3',['docs/v0.4/tools/check_documents.py']]]);
});
