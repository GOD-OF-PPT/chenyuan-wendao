import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {postcss,parseVue,colorNames,canonicalSelector,canonicalCssValue} from '../web/style-tools.mjs';
import {isPaintedStyle} from '../web/src/painted-style-scope.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const literals=/(?:#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|device-cmyk)\()/i;
const roles=new Set(['night','panel','raised','line','ink','muted','jade','gold','danger','dangerSurface','shadow','white'].map(name=>'--palette-'+name));
const baseline='77a8a3933a19e04a2a9e413443f30a5d08dfc996';
const named=new Set(Object.keys(colorNames));
function hasLiteral(value){
 const withoutUrls=value.replace(/url\([^)]*\)/gi,'').replace(/--[\w-]+/g,'').replace(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g,'');
 return literals.test(withoutUrls)||[...withoutUrls.matchAll(/\b[a-z]+\b/gi)].some(match=>named.has(match[0].toLowerCase()));
}
function specificity(css){
 const debt=new Map(),add=key=>debt.set(key,(debt.get(key)??0)+1),ast=postcss.parse(css);
 const context=node=>{const conditions=[];for(let parent=node.parent;parent;parent=parent.parent)if(parent.type==='atrule'&&parent.name!=='layer')conditions.unshift([parent.name,canonicalCssValue(parent.params)]);return conditions;};
 ast.walkRules(rule=>{if(/#app\b/.test(rule.selector))add(JSON.stringify(['selector',context(rule),canonicalSelector(rule.selector)]));});
 ast.walkDecls(d=>{if(d.important)add(JSON.stringify(['important',context(d.parent),d.parent.selector?canonicalSelector(d.parent.selector):'@'+d.parent.name,d.prop]));});return debt;
}

/** A rule-level migration ceiling, never a whole-file hash or a byte budget. */
export function inspectStyle(css,{file='inline.css',legacyCss=''}={}){
 const problems=[],ast=postcss.parse(css,{from:file});let important=0,appSelectors=0,authorRules=0;const definedRoles=new Set();
 ast.walkRules(rule=>{
  // Keyframe steps inherit the keyframes container and are not selector rules.
  if(rule.parent.type==='atrule'&&/keyframes$/i.test(rule.parent.name))return;
  authorRules++;
  let parent=rule.parent,layered=false;while(parent){if(parent.type==='atrule'&&parent.name==='layer')layered=true;parent=parent.parent;}
  if(!layered)problems.push('Author selector outside a declared layer: '+rule.selector);
  appSelectors+=(rule.selector.match(/#app\b/g)??[]).length;
 });
 ast.walkDecls(declaration=>{
  if(declaration.important)important++;
  const paletteDefinition=path.basename(file)==='palette.css'&&roles.has(declaration.prop);
  if(paletteDefinition)definedRoles.add(declaration.prop);
  else if(hasLiteral(declaration.value)&&!isPaintedStyle(path.basename(file),declaration.parent.selector,declaration.prop,canonicalSelector))problems.push('Unscoped interface color: '+declaration.prop);
 });
 const old=specificity(legacyCss);
 for(const [key,count]of specificity(css))if(count>(old.get(key)??0)){
  const kind=JSON.parse(key)[0];problems.push((kind==='selector'?'New #app selector specificity':'New !important declaration specificity')+': '+key);
 }
 return {problems,important,appSelectors,authorRules,definedRoles:[...definedRoles]};
}

export function checkStyles(directory=path.join(root,'web/src')){
 const problems=[],perFile=[],definedRoles=new Set();let important=0,appSelectors=0;
 for(const name of fs.readdirSync(directory).filter(name=>/\.(css|vue)$/.test(name)).sort()){
  const file=path.join(directory,name),source=fs.readFileSync(file,'utf8');
  const styles=name.endsWith('.css')?[source]:(()=>{const {descriptor,errors}=parseVue(source,{filename:file});if(errors.length)throw new Error('Invalid Vue styles: '+name);return descriptor.styles.filter(style=>!style.src).map(style=>style.content);})();
  const relative=path.relative(root,file).replaceAll('\\','/');
  const listed=execFileSync('git',['ls-tree','-r','--name-only',baseline,'--',relative],{cwd:root,encoding:'utf8'}).trim();
  const previous=listed?execFileSync('git',['show',baseline+':'+relative],{cwd:root,encoding:'utf8',maxBuffer:10_000_000}):'';
  const oldStyles=name.endsWith('.css')?[previous]:parseVue(previous,{filename:file}).descriptor.styles.filter(style=>!style.src).map(style=>style.content);
  for(const [index,css]of styles.entries()){const result=inspectStyle(css,{file,legacyCss:oldStyles[index]??''});important+=result.important;appSelectors+=result.appSelectors;result.definedRoles.forEach(role=>definedRoles.add(role));problems.push(...result.problems.map(problem=>name+': '+problem));perFile.push({file:name,important:result.important,appSelectors:result.appSelectors});}
 }
 if(important>828)problems.push('Existing important debt grew beyond 828');
 if(appSelectors>1021)problems.push('Existing #app selector debt grew beyond 1021');
 if(definedRoles.size!==12||[...definedRoles].some(role=>!roles.has(role)))problems.push('The twelve semantic color roles are incomplete');
 return {passed:problems.length===0,problems,important,appSelectors,definedRoles:[...definedRoles],styles:perFile.length,perFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=checkStyles();console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
