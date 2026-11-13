import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import postcss from '../web/node_modules/postcss/lib/postcss.js';
import {parse as parseVue} from '../web/node_modules/@vue/compiler-sfc/dist/compiler-sfc.cjs.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const literals=/(?:#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\blab\()/i;
const roles=new Set(['night','panel','raised','line','ink','muted','jade','gold','danger','dangerSurface','shadow','white'].map(name=>'--palette-'+name));

/** A rule-level migration ceiling, never a whole-file hash or a byte budget. */
export function inspectStyle(css,{file='inline.css',allowExistingSpecificity=false}={}){
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
  else if(literals.test(declaration.value))problems.push('Unscoped interface color: '+declaration.prop);
 });
 if(!allowExistingSpecificity&&important)problems.push('New !important declaration');
 if(!allowExistingSpecificity&&appSelectors)problems.push('New #app selector');
 return {problems,important,appSelectors,authorRules,definedRoles:[...definedRoles]};
}

export function checkStyles(directory=path.join(root,'web/src')){
 const problems=[],perFile=[],definedRoles=new Set();let important=0,appSelectors=0;
 for(const name of fs.readdirSync(directory).filter(name=>/\.(css|vue)$/.test(name)).sort()){
  const file=path.join(directory,name),source=fs.readFileSync(file,'utf8');
  const styles=name.endsWith('.css')?[source]:(()=>{const {descriptor,errors}=parseVue(source,{filename:file});if(errors.length)throw new Error('Invalid Vue styles: '+name);return descriptor.styles.filter(style=>!style.src).map(style=>style.content);})();
  for(const css of styles){const result=inspectStyle(css,{file,allowExistingSpecificity:true});important+=result.important;appSelectors+=result.appSelectors;result.definedRoles.forEach(role=>definedRoles.add(role));problems.push(...result.problems.map(problem=>name+': '+problem));perFile.push({file:name,important:result.important,appSelectors:result.appSelectors});}
 }
 if(important>828)problems.push('Existing important debt grew beyond 828');
 if(appSelectors>1021)problems.push('Existing #app selector debt grew beyond 1021');
 if(definedRoles.size!==12||[...definedRoles].some(role=>!roles.has(role)))problems.push('The twelve semantic color roles are incomplete');
 return {passed:problems.length===0,problems,important,appSelectors,definedRoles:[...definedRoles],styles:perFile.length,perFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=checkStyles();console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
