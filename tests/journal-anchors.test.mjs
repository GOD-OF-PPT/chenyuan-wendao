import test from 'node:test';
import assert from 'node:assert/strict';
import {journalAnchors} from '../web/src/journal-anchors.ts';
import {driver} from './full-route.mjs';
import {availableEvents} from '../src/full/engine.ts';
const writes=(revision,added=1,run='life')=>[{run,revision,added}];
test('identical repeated entries retain distinct local reading identities when a new entry arrives',()=>{
 const old=journalAnchors(undefined,['work','work'],'life',2),next=journalAnchors(old,['work','work','work'],'life',3,writes(3));
 assert.equal(new Set(next.keys).size,3);assert.deepEqual(next.keys.slice(0,2),old.keys);assert.notEqual(next.keys[2],old.keys[1]);
});
test('a full hundred identical entries discard only the oldest identity for one new command',()=>{
 const text=Array(100).fill('work'),old=journalAnchors(undefined,text,'life',100),next=journalAnchors(old,text,'life',101,writes(101));
 assert.equal(next.keys.length,100);assert.deepEqual(next.keys.slice(0,99),old.keys.slice(1));assert(!next.keys.includes(old.keys[0]));assert.equal(new Set(next.keys).size,100);
});
test('a multi-command update of the capped repeated log preserves the retained suffix',()=>{
 const text=Array(100).fill('work'),old=journalAnchors(undefined,text,'life',100),next=journalAnchors(old,text,'life',103,[...writes(101),...writes(102),...writes(103)]);
 assert.deepEqual(next.keys.slice(0,97),old.keys.slice(3));assert.equal(new Set(next.keys).size,100);
});
test('one victory command can append several distinct log entries without replacing retained identities',()=>{
 const old=journalAnchors(undefined,['arrival','attack'],'life',20),next=journalAnchors(old,['arrival','attack','victory','loot'],'life',21,writes(21,2));
 assert.deepEqual(next.keys.slice(0,2),old.keys);assert.equal(new Set(next.keys).size,4);
});
test('control-only snapshot rereads do not manufacture a new log identity',()=>{
 const old=journalAnchors(undefined,['work','work'],'life',9),next=journalAnchors(old,[...old.texts],'life',9);
 assert.deepEqual(next.keys,old.keys);assert.equal(next.next,old.next);
});
test('replacement life and rewound history do not inherit the old reading identities',()=>{
 const old=journalAnchors(undefined,['work','work'],'life',9);
 for(const next of [journalAnchors(old,['work'],'other-life',1),journalAnchors(old,['work'],'life',3)])assert(next.keys.every(key=>!old.keys.includes(key)));
});
test('reconciliation preserves readonly source arrays and returns independent bounded reading state',()=>{
 const old=journalAnchors(undefined,['work','attack'],'life',3),texts=Object.freeze(['work','attack','victory']);Object.freeze(old.keys);Object.freeze(old.texts);Object.freeze(old);
 const next=journalAnchors(old,texts,'life',4,writes(4));assert.deepEqual(old.texts,['work','attack']);assert.deepEqual(texts,['work','attack','victory']);assert.equal(next.keys[1],old.keys[1]);assert.notEqual(next.texts,texts);assert.equal(next.keys.length,texts.length);
});
test('a formal EVENT increments Game revision while adding zero logs and preserves all reading tokens',()=>{
 const d=driver();d.go('sect');for(let n=0;n<100;n++)d.doAction({type:'SOURCE',sourceId:'work',count:1});const before=d.game,old=journalAnchors(undefined,before.journal,before.core.runId,before.core.revision);d.doAction({type:'EVENT',event:availableEvents(before)[0].id});const after=d.game;
 assert.equal(after.core.revision,before.core.revision+1);assert.deepEqual(after.journal,before.journal);const next=journalAnchors(old,after.journal,after.core.runId,after.core.revision,writes(after.core.revision,0,after.core.runId));assert.deepEqual(next.keys,old.keys);assert.equal(next.next,old.next);
});
test('unknown external progress does not invent an exact chronological identity for identical capped logs',()=>{
 const text=Array(100).fill('work'),old=journalAnchors(undefined,text,'life',100),next=journalAnchors(old,text,'life',101);
 assert(next.keys.every(key=>!old.keys.includes(key)));assert.equal(new Set(next.keys).size,100);
});
