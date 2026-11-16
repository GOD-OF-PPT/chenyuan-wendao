import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import {gunzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url)),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'chenyuan-http-')),web=path.join(temporary,'web');fs.mkdirSync(web);fs.mkdirSync(path.join(web,'assets'));fs.mkdirSync(path.join(web,'empty'));
const script=Buffer.from('export const clarity = "真实周期与保存";\n'.repeat(4096)),html=Buffer.from('<html><body>'+('问道 '.repeat(1024))+'</body></html>'),picture=Buffer.from([82,73,70,70,0,0,0,0,87,69,66,80,0,255,128,64]);
fs.writeFileSync(path.join(web,'index.html'),html);fs.writeFileSync(path.join(web,'assets/app.js'),script);fs.writeFileSync(path.join(web,'assets/mutable.css'),'p{color:#abc}\n'.repeat(512));fs.writeFileSync(path.join(web,'assets/scene.webp'),picture);fs.mkdirSync(path.join(temporary,'outside'));fs.writeFileSync(path.join(temporary,'outside/index.html'),'test-only outside root');fs.mkdirSync(path.join(web,'nested'));
let fileLinksAvailable=true;
try{
 fs.symlinkSync(path.join(temporary,'outside/index.html'),path.join(web,'outside-link.txt'));
 fs.symlinkSync(path.join(temporary,'outside/index.html'),path.join(web,'nested/index.html'));
}catch(error){
 if(process.platform!=='win32'||!['EPERM','EACCES','ENOSYS'].includes(error.code))throw error;
 fileLinksAvailable=false;
 for(const name of ['outside-link.txt','nested/index.html']){const file=path.join(web,name);if(fs.existsSync(file)||fs.lstatSync(path.dirname(file)).isSymbolicLink()){if(fs.lstatSync(file).isSymbolicLink())fs.unlinkSync(file);}}
 fs.symlinkSync(path.join(temporary,'outside'),path.join(web,'outside-link.txt'),'junction');
 fs.writeFileSync(path.join(web,'nested/index.html'),'local index fixture');
}
fs.mkdirSync(path.join(web,'legacy'));fs.writeFileSync(path.join(web,'legacy/index.htm'),html);
// Keep real file symlinks wherever permitted. On an unprivileged Windows host,
// simulate only the nested index alias's resolve() result in the owned server;
// the actual handler and its second boundary check must still return HTTP 404.
const indexAliasShim=`import pathlib,runpy,sys
index=pathlib.Path(sys.argv[1])/'nested/index.html'
outside=pathlib.Path(sys.argv[1]).parent/'outside/index.html'
original=pathlib.Path.resolve
def resolve(self,*args,**kwargs):
    return original(outside) if self==index else original(self,*args,**kwargs)
pathlib.Path.resolve=resolve
sys.argv=sys.argv[2:]
runpy.run_path(sys.argv[0],run_name='__main__')`;
const children=[];let origin,prefixed;
async function start(base='/'){
 const args=[path.join(root,'scripts/candidate/serve.py'),'--directory',web,'--port','0','--base',base];
 const child=spawn('python3',fileLinksAvailable?args:['-c',indexAliasShim,web,...args],{stdio:['ignore','pipe','pipe']});children.push(child);
 return new Promise((ok,no)=>{let output='',errors='';child.stdout.on('data',b=>{output+=b;const url=output.match(/http:\/\/127\.0\.0\.1:\d+\/[^\s]*/)?.[0];if(url)ok(url);});child.stderr.on('data',b=>errors+=b);child.once('error',no);child.once('exit',code=>no(Error('Owned candidate server exited '+code+': '+errors)));});
}
function request(url,headers={},method='GET'){return new Promise((ok,no)=>{const q=http.request(url,{headers,method},r=>{const chunks=[];r.on('data',b=>chunks.push(b));r.on('end',()=>ok({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));r.on('error',no);});q.on('error',no);q.end();});}
before(async()=>{origin=await start();prefixed=await start('/demo/');});
after(async()=>{await Promise.all(children.map(child=>new Promise(ok=>{if(child.exitCode!==null)return ok();child.once('exit',ok);child.kill('SIGTERM');})));fs.rmSync(temporary,{recursive:true,force:true});});
test('actual candidate GET negotiates gzip without changing a single decoded script byte',async()=>{const r=await request(origin+'assets/app.js',{'Accept-Encoding':'gzip'});assert.equal(r.status,200);assert.equal(r.headers['content-encoding'],'gzip');assert.match(r.headers.vary,/Accept-Encoding/i);assert.equal(Number(r.headers['content-length']),r.body.length);assert.ok(r.body.length<script.length);assert.deepEqual(gunzipSync(r.body),script);assert.equal(r.headers['cache-control'],'no-store');});
test('quality zero identity preference unsupported coding and no acceptable representation are explicit',async()=>{for(const value of ['', 'identity','br','gzip;q=0','gzip;q=0, *;q=1','gzip;q=0.5, identity;q=1']){const r=await request(origin+'assets/app.js',{'Accept-Encoding':value});assert.equal(r.status,200,value);assert.equal(r.headers['content-encoding'],undefined,value);assert.deepEqual(r.body,script,value);}const no=await request(origin+'assets/app.js',{'Accept-Encoding':'gzip;q=0, identity;q=0, *;q=0'});assert.equal(no.status,406);const yes=await request(origin+'assets/app.js',{'Accept-Encoding':'GZIP ; Q=1, identity;q=0'});assert.equal(yes.headers['content-encoding'],'gzip');assert.deepEqual(gunzipSync(yes.body),script);});
test('HEAD carries the same negotiated length and a conditional request has no body',async()=>{const g=await request(origin+'assets/app.js',{'Accept-Encoding':'gzip'}),h=await request(origin+'assets/app.js',{'Accept-Encoding':'gzip'},'HEAD');assert.equal(h.status,200);assert.equal(h.headers['content-encoding'],'gzip');assert.equal(h.headers['content-length'],g.headers['content-length']);assert.equal(h.body.length,0);const unchanged=await request(origin+'assets/app.js',{'Accept-Encoding':'gzip','If-Modified-Since':g.headers['last-modified']});assert.equal(unchanged.status,304);assert.equal(unchanged.body.length,0);});
test('already compressed paintings keep their exact original representation',async()=>{const r=await request(origin+'assets/scene.webp',{'Accept-Encoding':'gzip'});assert.equal(r.status,200);assert.equal(r.headers['content-encoding'],undefined);assert.deepEqual(r.body,picture);});
test('base path query handling loopback and web-root confinement retain their actual HTTP boundary',async()=>{assert.match(prefixed,/^http:\/\/127\.0\.0\.1:/);for(const encoding of ['identity','gzip'])assert.equal((await request(prefixed+'assets/app.js/',{'Accept-Encoding':encoding})).status,404,'A trailing slash must not become a different gzip-only file route');const good=await request(prefixed+'index.html?reading=1',{'Accept-Encoding':'gzip'});assert.equal(good.status,200);assert.equal(good.headers['content-encoding'],'gzip');assert.deepEqual(gunzipSync(good.body),html);for(const url of [new URL('/assets/app.js',prefixed).href,prefixed+'empty/',origin+'outside-link.txt',origin+'nested/',origin+'src/App.vue'])assert.equal((await request(url)).status,404,url);const legacy=await request(prefixed+'legacy/',{'Accept-Encoding':'gzip'});assert.equal(legacy.status,200);assert.deepEqual(gunzipSync(legacy.body),html);const redirect=await request(prefixed+'legacy?reading=1');assert.equal(redirect.status,301);assert.equal(redirect.headers.location,'/demo/legacy/?reading=1');const followed=await request(new URL(redirect.headers.location,prefixed),{'Accept-Encoding':'gzip'});assert.equal(followed.status,200);assert.deepEqual(gunzipSync(followed.body),html);});
test('a changed static file invalidates its compressed representation rather than serving stale bytes',async()=>{const url=origin+'assets/mutable.css',first=await request(url,{'Accept-Encoding':'gzip'});assert.equal(first.headers['content-encoding'],'gzip');const next=Buffer.from('p{color:#def;background:#123}\n'.repeat(1024));fs.writeFileSync(path.join(web,'assets/mutable.css'),next);const changed=await request(url,{'Accept-Encoding':'gzip'});assert.equal(changed.status,200);assert.equal(changed.headers['content-encoding'],'gzip');assert.notDeepEqual(changed.body,first.body);assert.deepEqual(gunzipSync(changed.body),next);});
