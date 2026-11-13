import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {inspectStyle,checkStyles} from '../scripts/check-style-discipline.mjs';
import {postcss,parseVue,canonicalSelector,canonicalCssValue} from '../web/style-tools.mjs';
import {isPaintedStyle,paintedStyleScope} from '../web/src/painted-style-scope.mjs';

test('a new component uses semantic colors inside an explicit layer without specificity escalation',()=>{
 const valid='@layer game { .result { color:var(--palette-ink); background:color-mix(in srgb,var(--palette-panel) 90%,transparent); } }';
 assert.deepEqual(inspectStyle(valid).problems,[]);
 for(const [css,reason]of [
  ['.result {color:var(--palette-ink)}','outside a declared layer'],
  ['@layer game {.result {color:#fff}}','Unscoped interface color'],
  ['@layer game {.result {color:red}}','Unscoped interface color'],
  ['@layer game {.result {background:rebeccapurple}}','Unscoped interface color'],
  ...['color(srgb 1 0 0)','hwb(0 0% 0%)','oklab(50% .2 .1)','lch(50% 40 30)','light-dark(red,blue)'].map(value=>['@layer game {.result {color:'+value+'}}','Unscoped interface color']),
  ['@layer game {.result {color:var(--palette-ink)!important}}','New !important'],
  ['@layer game {#app .result {color:var(--palette-ink)}}','New #app'],
 ])assert.ok(inspectStyle(css).problems.some(message=>message.includes(reason)),reason);
});

test('retiring an old important rule does not authorize it in another selector or a new file',()=>{
 const legacy='@layer game {#app .old {color:var(--palette-ink)!important}}';
 assert.deepEqual(inspectStyle(legacy,{file:'old.css',legacyCss:legacy}).problems,[]);
 const moved='@layer game {#app .new {color:var(--palette-ink)!important}}';
 assert.ok(inspectStyle(moved,{file:'old.css',legacyCss:legacy}).problems.some(p=>p.includes('specificity')));
 assert.ok(inspectStyle(moved,{file:'new.css',legacyCss:''}).problems.some(p=>p.includes('specificity')));
 const conditional='@media(min-width:2000px){#app .old {color:var(--palette-ink)!important}}';
 assert.ok(inspectStyle(legacy,{file:'old.css',legacyCss:conditional}).problems.some(p=>p.includes('specificity')));
});

test('selector formatting preserves existing debt while changed combinators and literal values cannot borrow it',()=>{
 const original='@layer game {#app .old>button,#app [data-word="a b"] {color:var(--palette-ink)!important}}';
 const formatted='@layer game { #app .old > button,\n #app [data-word="a b"] { color: var(--palette-ink) !important; } }';
 assert.deepEqual(inspectStyle(formatted,{legacyCss:original}).problems,[]);
 for(const changed of [formatted.replace(' > ',' + '),formatted.replace('a b','a  b')])
  assert.ok(inspectStyle(changed,{legacyCss:original}).problems.some(p=>p.includes('specificity')));
});

test('the actual component and global style sources retain twelve roles with no growing specificity debt',()=>{
 const report=checkStyles();assert.deepEqual(report.problems,[]);assert.equal(report.passed,true);assert.equal(report.definedRoles.length,12);assert.ok(report.styles>90);
});

test('a documented SVG painting can retain its paint without exempting nearby interface text',()=>{
 assert.deepEqual(inspectStyle('@layer game {.scene-moon {fill:#f4dfac}}',{file:'ScenePanel.vue'}).problems,[]);
 assert.ok(inspectStyle('@layer game {.scene-copy {color:red}}',{file:'ScenePanel.vue'}).problems.some(p=>p.includes('Unscoped interface color')));
 assert.ok(inspectStyle('@layer game {.scene-moon {color:red}}',{file:'ScenePanel.vue'}).problems.some(p=>p.includes('Unscoped interface color')));
});

test('actual scene and object painting retains every original scoped paint declaration through interface recoloring',()=>{
 function paintValues(file,source){
  const styles=file.endsWith('.css')?[source]:parseVue(source,{filename:file}).descriptor.styles.filter(s=>!s.src).map(s=>s.content),values=[];
  for(const css of styles)postcss.parse(css).walkDecls(d=>{if(isPaintedStyle(file.split('/').at(-1),d.parent.selector,d.prop,canonicalSelector))values.push([canonicalSelector(d.parent.selector),d.prop,canonicalCssValue(d.value),!!d.important]);});return values;
 }
 for(const name of Object.keys(paintedStyleScope)){
  const file='web/src/'+name,baseline=execFileSync('git',['show','3443283:'+file],{encoding:'utf8',maxBuffer:10_000_000});
  assert.deepEqual(paintValues(file,fs.readFileSync(file,'utf8')),paintValues(file,baseline),file);
 }
});
