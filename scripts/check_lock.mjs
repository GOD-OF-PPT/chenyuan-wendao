import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const lock=JSON.parse(fs.readFileSync('web/package-lock.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('web/package.json','utf8'));
assert.equal(lock.lockfileVersion,3);
for(const key of ['dependencies','devDependencies']) assert.deepEqual(lock.packages[''][key],pkg[key]);
for(const [path,p] of Object.entries(lock.packages)) {
  if(!path)continue;
  assert.ok(p.resolved.startsWith('https://registry.npmjs.org/'),path);
  assert.match(p.integrity,/^sha512-[A-Za-z0-9+/]+=*$/,path);
}
const digest=crypto.createHash('sha256').update(JSON.stringify(lock)+'\n').digest('hex');
assert.equal(digest,'aba4e4e785162ed5bca45c92ec80c3f8546e586b4469509d0a0ae04b85cffcd9','Generated lock differs from reviewed CI output');
console.log('LOCK VERIFIED',digest,Object.keys(lock.packages).length,'entries');
