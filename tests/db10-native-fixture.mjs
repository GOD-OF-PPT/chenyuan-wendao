import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const db10SourceCommit='666787985bf3bf148338b593515770b8e8a3a469';
/** Keep exact, accepted DB10 source available to the browser until its worker finishes. */
export function createDb10NativeFixture(){
  const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),requested=path.join(root,'web/.generated');
  fs.mkdirSync(requested,{recursive:true});const parent=fs.realpathSync(requested);
  assert.ok(parent.startsWith(root+path.sep),'historical source must stay inside this workspace');
  const folder=fs.mkdtempSync(path.join(parent,'q14-db10-666-'));
  const check=()=>assert.ok(path.dirname(path.resolve(folder))===parent&&path.basename(folder).startsWith('q14-db10-666-'));
  check();let closed=false;
  const cleanup=()=>{if(closed)return;check();assert.equal(fs.lstatSync(folder).isSymbolicLink(),false);fs.rmSync(folder,{recursive:true,force:true});closed=true;};
  process.once('exit',cleanup);
  try{
    const archive=execFileSync('git',['archive','--format=tar',db10SourceCommit,'src','web/src','tests/full-route.mjs'],{cwd:root,maxBuffer:30_000_000,timeout:30000});
    const file=path.join(folder,'source.tar');fs.writeFileSync(file,archive);execFileSync('tar',['-xf',file,'-C',folder],{timeout:30000});
    const tree=execFileSync('git',['rev-parse',db10SourceCommit+'^{tree}'],{cwd:root,encoding:'utf8'}).trim(),
      prefix='/.generated/'+path.basename(folder),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
    const identity={sourceCommit:db10SourceCommit,tree,archiveSha256:sha(archive),repositorySha256:sha(fs.readFileSync(path.join(folder,'web/src/full-persistence.ts')))};
    fs.writeFileSync(path.join(folder,'source-identity.json'),JSON.stringify(identity,null,2)+'\n');
    return{...identity,repositoryUrl:prefix+'/web/src/full-persistence.ts',routesUrl:prefix+'/tests/full-route.mjs',cleanup};
  }catch(error){cleanup();throw error;}
}
