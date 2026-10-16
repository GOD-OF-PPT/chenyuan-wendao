import test from 'node:test';
import assert from 'node:assert/strict';
import { content as C } from '../src/content/m1.ts';
import { newGame, resolve, parseSnapshot, validateState } from '../src/game/engine.ts';
import { MemorySession } from '../src/game/session.ts';
const command = (s, action, id = `test:${s.revision}`) => ({ ...action, commandId: id, runId: s.runId, expectedRevision: s.revision });
const act = (s, a) => resolve(s, command(s, a)).state;
const errorCode = code => error => error?.code === code;
function qi(choice = 'leave') {
  let s = newGame('顾长青', 'test-run');
  for (const a of [{type:'CHOOSE',choice},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'}]) s = act(s,a);
  return s;
}
function fullMaterials() {
  const s = qi(); s.player.xp = 1000;
  s.inventory.herb = 8; s.inventory.dew = 2; s.inventory.core = 1;
  return s;
}
for (const choice of ['help','trade','leave']) test(`opening ${choice}: one consequence, no free realm`, () => {
  const s = newGame('顾长青','opening'); const n = act(s,{type:'CHOOSE',choice});
  assert.equal(n.player.realm,'mortal'); assert.equal(n.player.xp,0);
  assert.equal(n.inventory.healing_pill,choice === 'leave' ? 1 : 0);
  assert.equal(n.learnedSkills.length,choice === 'trade' ? 1 : 0);
  assert.equal(n.openingChoice,choice); assert.equal(n.activeEvent,null);
  assert.equal(s.openingChoice,null);
  assert.throws(()=>act(n,{type:'CHOOSE',choice}),errorCode('EVENT_ALREADY_RESOLVED'));
});
test('pending event cannot be bypassed by travel',()=>assert.throws(()=>act(newGame('道友','pending'),{type:'TRAVEL',location:'cave'}),errorCode('PENDING_EVENT')));
test('mortal cultivation stops at cap, without automatic realm advance',()=>{
  let s=act(newGame('道友','mortal'),{type:'CHOOSE',choice:'leave'});s=act(s,{type:'TRAVEL',location:'cave'});
  const r=resolve(s,command(s,{type:'CULTIVATE',method:'natural',count:50}));
  assert.equal(r.receipt.steps,2);assert.equal(r.receipt.stopReason,'XP_CAP');assert.equal(r.state.player.realm,'mortal');assert.equal(r.state.player.xp,10);
});
test('recipe charges all inputs and produces one pill',()=>{
  const s=fullMaterials(),r=resolve(s,command(s,{type:'CRAFT',recipeId:'foundation'}));
  assert.equal(r.state.inventory.foundation_pill,1);assert.equal(r.state.inventory.herb,0);assert.equal(r.state.inventory.core,0);assert.equal(r.state.inventory.dew,0);
  assert.equal(r.state.player.stones,20);assert.equal(r.receipt.delta.months,1);assert.equal(s.inventory.herb,8);
});
for (const missing of ['herb','dew','core','stones']) test(`craft missing ${missing} leaves original unchanged`,()=>{
  const s=fullMaterials();if(missing==='stones')s.player.stones=0;else s.inventory[missing]=0;
  const before=structuredClone(s);assert.throws(()=>act(s,{type:'CRAFT',recipeId:'foundation'}));assert.deepEqual(s,before);
});
test('enough xp without breakthrough item is rejected',()=>{
  const s=qi();s.player.xp=1000;assert.throws(()=>act(s,{type:'BREAKTHROUGH'}),errorCode('INSUFFICIENT_ITEM'));
});
test('breakthrough item without xp is rejected without consuming item',()=>{
  const s=qi();s.inventory.foundation_pill=1;assert.throws(()=>act(s,{type:'BREAKTHROUGH'}),errorCode('XP_REQUIRED'));assert.equal(s.inventory.foundation_pill,1);
});
test('breakthrough consumes exactly one pill, resets xp and raises limits',()=>{
  let s=fullMaterials();s=act(s,{type:'CRAFT',recipeId:'foundation'});s.inventory.foundation_pill=2;
  const n=act(s,{type:'BREAKTHROUGH'});assert.equal(n.player.realm,'foundation');assert.equal(n.player.xp,0);assert.equal(n.inventory.foundation_pill,1);assert.equal(n.player.hp,170);assert.equal(n.player.stones,s.player.stones);
  assert.throws(()=>act(n,{type:'BREAKTHROUGH'}),errorCode('CONTENT_BOUNDARY'));
});
test('assisted batch at cap charges only executed actions',()=>{
  const s=qi();s.player.xp=950;const r=resolve(s,command(s,{type:'CULTIVATE',method:'assisted',count:50}));
  assert.equal(r.receipt.steps,1);assert.equal(r.receipt.stopReason,'XP_CAP');assert.equal(r.receipt.delta.stones,-20);assert.equal(r.receipt.delta.xp,50);assert.equal(r.receipt.delta.months,1);
});
test('insufficient funds stop batch without partial charge',()=>{
  const s=qi();s.player.stones=25;const r=resolve(s,command(s,{type:'CULTIVATE',method:'assisted',count:4}));
  assert.equal(r.receipt.steps,1);assert.equal(r.receipt.stopReason,'INSUFFICIENT_STONES');assert.equal(r.state.player.stones,5);assert.equal(r.state.player.xp,100);
});
test('batch and sequential cultivation produce same economy',()=>{
  let s=qi();s.player.stones=200;const batch=act(s,{type:'CULTIVATE',method:'assisted',count:6});
  for(let i=0;i<6;i++)s=act(s,{type:'CULTIVATE',method:'assisted'});
  batch.revision=s.revision;assert.deepEqual(batch,s);
});
test('batch source stops at requested item quantity',()=>{
  let s=qi();s=act(s,{type:'TRAVEL',location:'wilderness'});const r=resolve(s,command(s,{type:'SOURCE',sourceId:'herbs',count:20,target:{item:'herb',quantity:8}}));
  assert.equal(r.receipt.steps,4);assert.equal(r.state.inventory.herb,8);assert.equal(r.receipt.stopReason,'TARGET_MET');
});
test('source cannot claim to reach an unrelated item target',()=>{
  let s=qi();s=act(s,{type:'TRAVEL',location:'wilderness'});assert.throws(()=>act(s,{type:'SOURCE',sourceId:'herbs',target:{item:'core',quantity:1}}),errorCode('TARGET_UNREACHABLE'));
});
test('current location and realm are enforced',()=>{
  assert.throws(()=>act(qi(),{type:'SOURCE',sourceId:'herbs'}),errorCode('LOCATION_REQUIRED'));
  let s=act(newGame('道友','realm'),{type:'CHOOSE',choice:'leave'});s=act(s,{type:'TRAVEL',location:'market'});
  assert.throws(()=>act(s,{type:'BUY',item:'foundation_pill',quantity:1}),errorCode('REALM_REQUIRED'));
});
test('zero stones and no medicines still allow cave recovery and work',()=>{
  let s=qi();s.player.stones=0;s.player.hp=1;s.player.mp=0;for(const id in s.inventory)s.inventory[id]=0;
  s=act(s,{type:'REST'});assert.equal(s.player.hp,100);assert.equal(s.player.mp,60);assert.equal(s.player.stones,0);
  s=act(s,{type:'TRAVEL',location:'sect'});s=act(s,{type:'SOURCE',sourceId:'work'});assert.equal(s.player.stones,20);
});
test('buy and sell have real budget and stock changes',()=>{
  let s=act(qi(),{type:'TRAVEL',location:'market'});s=act(s,{type:'BUY',item:'herb',quantity:3});assert.equal(s.player.stones,25);assert.equal(s.inventory.herb,3);
  s=act(s,{type:'SELL',item:'herb',quantity:2});assert.equal(s.player.stones,29);assert.equal(s.inventory.herb,1);
  assert.throws(()=>act(s,{type:'SELL',item:'herb',quantity:2}),errorCode('INSUFFICIENT_ITEM'));
});
test('breakthrough item cannot be sold',()=>{
  const s=act(qi(),{type:'TRAVEL',location:'market'});s.inventory.foundation_pill=1;assert.throws(()=>act(s,{type:'SELL',item:'foundation_pill',quantity:1}),errorCode('ITEM_LOCKED'));
});
test('medicine is capped and cannot be wasted at full hp',()=>{
  const s=qi();s.player.hp=90;const n=act(s,{type:'USE',item:'healing_pill'});assert.equal(n.player.hp,100);assert.equal(n.inventory.healing_pill,0);
  assert.throws(()=>act(s,{type:'USE',item:'herb'}),errorCode('NOT_USABLE'));
  const full=qi();assert.throws(()=>act(full,{type:'USE',item:'healing_pill'}),errorCode('NO_CHANGE'));assert.equal(full.inventory.healing_pill,1);
});
test('age limit aborts attempted action without losing money',()=>{
  const s=qi();s.world.elapsedMonths=1440-s.player.startAgeMonths-1;const before=structuredClone(s);
  assert.throws(()=>act(s,{type:'CULTIVATE',method:'assisted'}),errorCode('AGE_LIMIT'));assert.deepEqual(s,before);
});
test('age risk stops batch after last affordable month',()=>{
  const s=qi();s.world.elapsedMonths=1440-s.player.startAgeMonths-2;
  const r=resolve(s,command(s,{type:'CULTIVATE',method:'assisted',count:5}));assert.equal(r.receipt.steps,1);assert.equal(r.receipt.stopReason,'AGE_LIMIT');assert.equal(r.receipt.delta.stones,-20);
});
for (const bad of [-1,0,1.5,NaN,Infinity,51,'2']) test(`invalid batch ${String(bad)} rejected`,()=>{
  assert.throws(()=>act(qi(),{type:'CULTIVATE',method:'natural',count:bad}),errorCode('INVALID_COMMAND'));
});
for (const action of [{type:'BUY',item:'herb',quantity:-1},{type:'SELL',item:'herb',quantity:NaN},{type:'SOURCE',sourceId:'__proto__'},{type:'CRAFT',recipeId:'constructor'},{type:'CULTIVATE',method:'natural',minutes:30},{type:'SET_REALM',realm:'foundation'}]) test(`invalid input ${JSON.stringify(action)} rejected`,()=>{
  assert.throws(()=>act(qi(),action),errorCode('INVALID_COMMAND'));
});
test('wrong run and outdated revision are rejected',()=>{
  const s=qi(),c=command(s,{type:'CULTIVATE',method:'natural'});
  assert.throws(()=>resolve(s,{...c,runId:'other'}),errorCode('RUN_MISMATCH'));
  assert.throws(()=>resolve(s,{...c,expectedRevision:0}),errorCode('STALE_REVISION'));
});
test('preview is pure and wall-clock does not enter rules',()=>{
  const s=qi(),before=JSON.stringify(s),c=command(s,{type:'CULTIVATE',method:'natural'});const now=Date.now;
  try{Date.now=()=>0;const a=resolve(s,c);Date.now=()=>9000000000000;assert.deepEqual(resolve(s,c),a);}finally{Date.now=now;}
  assert.equal(JSON.stringify(s),before);
});
test('snapshot roundtrip preserves unresolved event and economic state',()=>{
  for(const s of [newGame('道友','saved'),qi('trade')])assert.deepEqual(parseSnapshot(JSON.stringify(s)),s);
});
for(const mutate of [s=>s.player.stones=-1,s=>s.player.xp=999999,s=>s.inventory.fake=1,s=>delete s.inventory.herb,s=>s.schemaVersion=999,s=>s.balanceVersion='future',s=>s.mode='battle',s=>s.activeEvent={id:'temple',instanceId:'x'},s=>s.learnedSkills.push('hack'),s=>s.player.hp=101])test(`bad snapshot rejected: ${mutate}`,()=>{
  const s=qi();mutate(s);assert.throws(()=>parseSnapshot(JSON.stringify(s)));
});
test('invalid JSON and oversized snapshots rejected',()=>{
  assert.throws(()=>parseSnapshot('{'));assert.throws(()=>parseSnapshot(' '.repeat(1000001)));assert.throws(()=>parseSnapshot('null'));
});
test('same command retry does not double reward or rewind later state',()=>{
  const start=qi(),session=new MemorySession(start),first=command(start,{type:'CULTIVATE',method:'natural'},'first');
  const a=session.execute(first);session.execute(command(session.snapshot(),{type:'CULTIVATE',method:'natural'},'second'));
  const retry=session.execute(first);assert.equal(retry.duplicate,true);assert.equal(retry.state.player.xp,100);assert.deepEqual(retry.receipt,a.receipt);
});
test('same command ID with different payload rejected',()=>{
  const s=qi(),session=new MemorySession(s),c=command(s,{type:'CULTIVATE',method:'natural'},'collision');session.execute(c);
  assert.throws(()=>session.execute({...c,method:'assisted'}),errorCode('COMMAND_ID_REUSED'));
});
test('injected commit failure publishes nothing and allows same retry',()=>{
  const s=qi(),session=new MemorySession(s),c=command(s,{type:'CULTIVATE',method:'natural'});
  assert.throws(()=>session.execute(c,()=>{throw Error('simulated failure');}));assert.deepEqual(session.snapshot(),s);
  assert.equal(session.execute(c).state.player.xp,50);
});
test('reentrant commit cannot overwrite newly committed state',()=>{
  const s=qi(),session=new MemorySession(s),c=command(s,{type:'CULTIVATE',method:'natural'},'outer');
  assert.throws(()=>session.execute(c,()=>session.execute(command(s,{type:'CULTIVATE',method:'assisted'},'inner'))),errorCode('STALE_REVISION'));
  assert.equal(session.snapshot().player.xp,100);assert.equal(session.snapshot().player.stones,20);
});
test('snapshots and returned receipts cannot mutate the session',()=>{
  const session=new MemorySession(qi());let s=session.snapshot();s.player.stones=9999;assert.equal(session.snapshot().player.stones,40);
  const c=command(session.snapshot(),{type:'CULTIVATE',method:'natural'}),r=session.execute(c);r.state.player.xp=999;r.receipt.steps=999;
  assert.equal(session.snapshot().player.xp,50);assert.equal(session.execute(c).receipt.steps,1);
});
test('all recipes reference real items and all direct trades lose value',()=>{
  for(const item of Object.values(C.items))assert.ok(item.sell===null || item.sell<item.buy);
  for(const recipe of Object.values(C.recipes)){
    assert.ok(C.items[recipe.output]);assert.ok(recipe.months>0);
    let inputValue=recipe.stones;for(const[id,n]of Object.entries(recipe.inputs)){assert.ok(C.items[id]);assert.ok(Number.isInteger(n)&&n>0);inputValue+=C.items[id].buy*n;}
    if(C.items[recipe.output].sell!==null)assert.ok(C.items[recipe.output].sell<=inputValue);
  }
});
test('balance cannot be accidentally changed by UI',()=>assert.throws(()=>{C.items.herb.buy=0;}));

for (const choice of ['help','trade','leave']) for (const strategy of ['craft','purchase']) test(`reachable foundation without RNG: ${choice}/${strategy}`,()=>{
  let s=qi(choice);const actions=[];
  if(strategy==='craft')actions.push(
    {type:'TRAVEL',location:'wilderness'},{type:'SOURCE',sourceId:'herbs',count:4},{type:'SOURCE',sourceId:'dew',count:2},
    {type:'TRAVEL',location:'sect'},{type:'SOURCE',sourceId:'core'},{type:'TRAVEL',location:'cave'},{type:'CRAFT',recipeId:'foundation'});
  else actions.push({type:'TRAVEL',location:'sect'},{type:'SOURCE',sourceId:'work',count:6},{type:'TRAVEL',location:'market'},{type:'BUY',item:'foundation_pill',quantity:1},{type:'TRAVEL',location:'cave'});
  actions.push({type:'CULTIVATE',method:'natural',count:50},{type:'BREAKTHROUGH'});
  for(const a of actions)s=act(s,a);
  assert.equal(s.player.realm,'foundation');assert.equal(s.inventory.foundation_pill,0);validateState(s);
});
