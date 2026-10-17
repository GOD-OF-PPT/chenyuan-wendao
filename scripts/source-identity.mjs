import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const sha=value=>createHash('sha256').update(value).digest('hex');
export const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
export function sourceIdentity(){
 const head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}'),source=process.env.CANDIDATE_SOURCE_COMMIT??head;
 if(!/^[a-f0-9]{40}$/.test(source)||git('rev-parse',source+'^{tree}')!==tree)throw new Error('Candidate source and checkout trees differ');
 execFileSync('git',['merge-base','--is-ancestor',source,head],{cwd:root});
 const npmOnPath=execFileSync('npm',['--version'],{cwd:root,encoding:'utf8'}).trim(),npm=process.env.npm_execpath?execFileSync(process.execPath,[process.env.npm_execpath,'--version'],{cwd:root,encoding:'utf8'}).trim():npmOnPath;
 return{head,source,tree,dirty:!!git('status','--porcelain'),node:process.version,npm,npmOnPath};
}
export function filesUnder(relative){const result=[];function walk(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isSymbolicLink())throw new Error('Source symlink: '+file);if(e.isDirectory())walk(file);else if(e.isFile())result.push(file);}}walk(relative);return result.sort();}
export function validatePublicPaths(tracked,actual){if(new Set(tracked).size!==tracked.length||new Set(actual).size!==actual.length||JSON.stringify([...tracked].sort())!==JSON.stringify([...actual].sort()))throw new Error('Untracked or missing public files; refusing to copy private/unreviewed inputs');for(const file of tracked)if(!file.startsWith('web/public/')||file.includes('..')||!/^web\/public\/[a-zA-Z0-9_./-]+\.(webp|png|jpg|jpeg|svg|ico)$/.test(file))throw new Error('Unreviewed public file type: '+file);return[...tracked].sort();}
export function publicSources(){return validatePublicPaths(git('ls-files','-z','--','web/public').split('\0').filter(Boolean),filesUnder('web/public').filter(f=>!f.startsWith('web/public/demo-nodes/')));}
export function runtimeSources(){const files=[...filesUnder('src'),...filesUnder('web/src'),...publicSources(),'package.json','package-lock.json','tsconfig.json','web/package.json','web/package-lock.json','web/tsconfig.json','web/index.html','web/vite.config.ts','scripts/demo-nodes.mjs','scripts/source-identity.mjs','scripts/build-web.mjs','scripts/dev-web.mjs','scripts/record-web-build.mjs','tests/full-route.mjs'];return Object.fromEntries([...new Set(files)].sort().map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));}
