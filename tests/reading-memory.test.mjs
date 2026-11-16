import test from 'node:test';
import assert from 'node:assert/strict';
import {computed,effectScope,nextTick,shallowRef} from '../web/node_modules/vue/index.mjs';
import {useReadingMemory} from '../web/src/reading-memory.ts';
import {journalAnchors} from '../web/src/journal-anchors.ts';

for(const added of [0,1,2])test('saved snapshot and its synchronous observation retain the reader with '+added+' new logs',async t=>{
 const snapshot=shallowRef({revision:10,texts:['old','work','work']}),writes=shallowRef([]),trace=[];let ledger;
 const ids=computed(()=>{const g=snapshot.value;trace.push({revision:g.revision,knownWrites:writes.value.length});ledger=journalAnchors(ledger,g.texts,'life',g.revision,writes.value);return [...ledger.keys].reverse();});
 const scope=effectScope();const cursor=scope.run(()=>useReadingMemory(()=> 'journal',()=>ids.value));
 try{
  cursor.page.value=1;const original=ids.value[1];
  // Store assigns the committed snapshot, then emits its observation in the same turn.
  snapshot.value={revision:11,texts:[...snapshot.value.texts,...Array(added).fill('work')]};
  writes.value=[{run:'life',revision:11,added}];
  await nextTick();t.diagnostic(JSON.stringify(trace));
  assert.equal(cursor.page.value,1+added);assert.equal(ids.value[cursor.page.value],original);assert.equal(cursor.relocated.value,false);
 }finally{scope.stop();}
});
