import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DESKTOP_UI_ASSETS} from '../web/src/assets.ts';
test('desktop cultivation vignette binds its real transparent source and runtime, with no new character identity',()=>{
 const m=JSON.parse(readFileSync(new URL('../art/redesign/desktop-ui-manifest.json',import.meta.url),'utf8')),row=m.assets[0];
 assert.equal(m.assets.length,1);assert.equal(DESKTOP_UI_ASSETS.meditation,row.runtime.path.replace('web/public/',''));
 for(const f of[row.source,row.runtime]){const data=readFileSync(new URL('../'+f.path,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),f.sha256);assert.equal(data.length,f.bytes);assert.equal(f.alpha,true);}
 const r=JSON.parse(readFileSync(new URL('../'+row.receipt.path,import.meta.url),'utf8'));assert.equal(r.referenceImages[0].path,'art/redesign/characters/player-v1.png');assert.equal(r.runtimeAlphaProof.min,0);assert.ok(r.runtimeAlphaProof.transparentPixels>10000);assert.ok(row.runtime.bytes<=160000);assert.equal(m.rights.userAcceptance,false);
});
