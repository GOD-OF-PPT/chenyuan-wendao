import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as C from '../src/full/content.ts';
import {ENEMY_ASSETS,PORTRAIT_ASSETS,SCENE_ASSETS,CAVE_MEDITATION_ASSET,sceneAssetPath} from '../web/src/assets.ts';
import {scenePresentation} from '../web/src/scene-presentation.ts';
import {driver} from './full-route.mjs';
const m=JSON.parse(readFileSync(new URL('../art/redesign/character-battle-manifest.json',import.meta.url),'utf8'));
test('every configured enemy has a distinct current image bound to the selected original and runtime bytes',()=>{
 assert.deepEqual(Object.keys(ENEMY_ASSETS).sort(),Object.keys(C.enemies).sort());
 assert.equal(new Set(m.enemies.map(x=>x.source.sha256)).size,9);
 for(const row of m.enemies){assert.equal(ENEMY_ASSETS[row.id],row.runtime.path.replace('web/public/',''));assert.ok(row.runtime.bytes<=120000);}
});
test('all five current character identities bind independent source originals and preserved generated alpha',()=>{
 assert.deepEqual(Object.keys(PORTRAIT_ASSETS).sort(),m.activeCharacterIds.toSorted());
 for(const row of m.characters){assert.equal(PORTRAIT_ASSETS[row.id],row.runtime.path.replace('web/public/',''));assert.ok(row.runtime.bytes<=80000);const r=JSON.parse(readFileSync(new URL('../'+row.receipt.path,import.meta.url)));assert.equal(r.referenceImages[0].path,`art/production/portraits/${row.id}.png`);assert.equal(r.alphaProof.min,0);assert.ok(r.alphaProof.transparentPixels>10000);assert.ok(r.alphaProof.solidPixels>10000);}
});
test('all selected character and enemy files retain the recorded real source geometry and export identity',()=>{
 for(const row of [...m.characters,...m.enemies,...m.presentationVariants])for(const field of ['source','runtime']){const f=row[field],data=readFileSync(new URL('../'+f.path,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),f.sha256);assert.equal(data.length,f.bytes);assert.equal(f.alpha,row.id!=='cave-meditation');if(field==='source'){assert.equal(data.readUInt32BE(16),f.dimensions.width);assert.equal(data.readUInt32BE(20),f.dimensions.height);}else{assert.ok(f.dimensions.width<=row.source.dimensions.width);assert.ok(f.dimensions.height<=row.source.dimensions.height);}}
});

test('meditation is a cave presentation variant with its original parent and no new location or passive Game change',()=>{
 const d=driver(),scene=scenePresentation(d.game),before=JSON.stringify(d.game),row=m.presentationVariants[0];assert.equal(row.id,'cave-meditation');assert.equal(sceneAssetPath(scene,true),CAVE_MEDITATION_ASSET);assert.equal(sceneAssetPath(scene),SCENE_ASSETS.cave);assert.equal(JSON.stringify(d.game),before);assert.equal(row.sourceParentSHA256,createHash('sha256').update(readFileSync(new URL('../art/redesign/scenes/cave-v1.png',import.meta.url))).digest('hex'));d.go('wilderness');assert.equal(sceneAssetPath(scenePresentation(d.game),true),SCENE_ASSETS.wilderness);
});
