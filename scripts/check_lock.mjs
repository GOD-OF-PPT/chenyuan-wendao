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
assert.equal(digest,'93c3b5bcba911d71c42876cf18f89e137e359f5532d74433a276fb478ebfb1ce','Generated lock differs from reviewed dependency lock');
console.log('LOCK VERIFIED',digest,Object.keys(lock.packages).length,'entries');
