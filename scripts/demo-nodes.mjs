import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGame,advance} from '../src/full/engine.ts';
import {currentVersions} from '../src/full/versions.ts';
import {demoCatalog,validateDemoNode} from '../src/demo.ts';
import {fullRoute} from '../tests/full-route.mjs';
import {root,sha,runtimeSources} from './source-identity.mjs';
export function generateNodes(sourceDigest){
 const nodes=new Map();
 const make=(id,game,seed,commands)=>{const node={format:'chenyuan-demo-node',version:1,nodeId:id,sourceDigest,versions:currentVersions,seed,commands:structuredClone(commands),game:structuredClone(game)};validateDemoNode(node,id,sourceDigest);nodes.set(id,node);};
 const seed={name:'演示顾长青',runId:'demo-opening-v1'};make('opening',newGame(seed.name,seed.runId),seed,[]);
 for(const [school,choice,strategy,ending]of [['sword','help','craft','transmit'],['talisman','trade','purchase','depart']]){
  const route=fullRoute(choice,school,strategy,true,ending),seed={name:'演示顾长青',runId:'demo-'+school+'-v1'},commands=[];let game=newGame(seed.name,seed.runId);
  for(const action of route.actions){
   if(action.type==='START_TRIAL')make('trial-'+school,game,seed,commands);
   if(action.type==='END')make('ending-'+school,game,seed,commands);
   const command={...action,commandId:'demo-'+school+'-'+commands.length,runId:game.core.runId,expectedRevision:game.core.revision};game=advance(game,command);commands.push(command);
   if(action.type==='ENCOUNTER'&&game.battle?.enemy==='wolf'&&!nodes.has('battle-'+school))make('battle-'+school,game,seed,commands);
   if(action.type==='EVENT'&&action.event==='shen_return')make('causal-'+choice,game,seed,commands);
  }
 }
 if(nodes.size!==demoCatalog.length||demoCatalog.some(spec=>!nodes.has(spec.id)))throw new Error('Incomplete lawful demo catalog');return demoCatalog.map(spec=>nodes.get(spec.id));
}
const defaultOutput=path.join(root,'web/public/demo-nodes');
export function writeNodes(output=defaultOutput){
 const sources=runtimeSources(),sourceDigest=sha(JSON.stringify(sources)),nodes=generateNodes(sourceDigest);
 const files=Object.fromEntries(nodes.map(node=>{const text=JSON.stringify(node)+'\n';return[node.nodeId+'.json',{text,sha256:sha(text),bytes:Buffer.byteLength(text)}];}));
 const manifest={format:'chenyuan-demo-catalog',version:1,sourceDigest,versions:currentVersions,nodes:demoCatalog.map(spec=>({...spec,path:spec.id+'.json',sha256:files[spec.id+'.json'].sha256,bytes:files[spec.id+'.json'].bytes}))};
 if(fs.existsSync(output)){
  if(fs.lstatSync(output).isSymbolicLink())throw new Error('Refusing a symlink output');const prior=JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8'));if(prior.format!=='chenyuan-demo-catalog'||!Array.isArray(prior.nodes))throw new Error('Refusing to overwrite an unowned demo directory');
  const owned=new Set(['manifest.json',...prior.nodes.map(n=>n.id+'.json')]);for(const name of fs.readdirSync(output))if(!owned.has(name)||!fs.lstatSync(path.join(output,name)).isFile())throw new Error('Unknown generated demo file: '+name);
 }
 const staging=fs.mkdtempSync(path.join(root,'web/.generated-demo-'));let keepStaging=false;
 try{
  for(const [name,value]of Object.entries(files))fs.writeFileSync(path.join(staging,name),value.text);fs.writeFileSync(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.mkdirSync(path.dirname(output),{recursive:true});const old=path.join(staging,'previous');const fresh=path.join(staging,'fresh');fs.mkdirSync(fresh);for(const name of fs.readdirSync(staging))if(name!=='fresh')fs.renameSync(path.join(staging,name),path.join(fresh,name));
  if(fs.existsSync(output))fs.renameSync(output,old);try{fs.renameSync(fresh,output);}catch(error){if(fs.existsSync(old))try{fs.renameSync(old,output);}catch(restoreError){keepStaging=true;throw new AggregateError([error,restoreError],'Previous generated data retained at '+old);}throw error;}
 }finally{if(!keepStaging&&fs.existsSync(staging))fs.rmSync(staging,{recursive:true});}
 if(path.resolve(output)===defaultOutput){const meta=path.join(root,'web/.generated');fs.mkdirSync(meta,{recursive:true});fs.writeFileSync(path.join(meta,'demo-meta.ts'),'// Generated from lawful rule replay; never committed.\nexport default '+JSON.stringify(manifest)+' as const;\n');}
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const manifest=writeNodes(process.argv[2]?path.resolve(process.argv[2]):undefined);console.log(JSON.stringify({format:manifest.format,sourceDigest:manifest.sourceDigest,nodes:manifest.nodes.length,bytes:manifest.nodes.reduce((n,x)=>n+x.bytes,0)}));}
