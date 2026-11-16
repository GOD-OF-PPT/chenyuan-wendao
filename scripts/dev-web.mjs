import path from 'node:path';
import {spawn} from 'node:child_process';
import {root} from './source-identity.mjs';
import {writeNodes} from './demo-nodes.mjs';
writeNodes();const child=spawn(process.execPath,[path.join(root,'web/node_modules/vite/bin/vite.js'),'--host','127.0.0.1',...process.argv.slice(2)],{cwd:path.join(root,'web'),stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.on(signal,()=>child.kill(signal));child.on('error',error=>{console.error(error);process.exitCode=1;});child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
