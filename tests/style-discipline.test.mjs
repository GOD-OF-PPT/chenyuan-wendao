import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectStyle,checkStyles} from '../scripts/check-style-discipline.mjs';

test('a new component uses semantic colors inside an explicit layer without specificity escalation',()=>{
 const valid='@layer game { .result { color:var(--palette-ink); background:color-mix(in srgb,var(--palette-panel) 90%,transparent); } }';
 assert.deepEqual(inspectStyle(valid).problems,[]);
 for(const [css,reason]of [
  ['.result {color:var(--palette-ink)}','outside a declared layer'],
  ['@layer game {.result {color:#fff}}','Unscoped interface color'],
  ['@layer game {.result {color:var(--palette-ink)!important}}','New !important'],
  ['@layer game {#app .result {color:var(--palette-ink)}}','New #app'],
 ])assert.ok(inspectStyle(css).problems.some(message=>message.includes(reason)),reason);
});

test('the actual component and global style sources retain twelve roles with no growing specificity debt',()=>{
 const report=checkStyles();assert.deepEqual(report.problems,[]);assert.equal(report.passed,true);assert.equal(report.definedRoles.length,12);assert.ok(report.styles>90);
});
