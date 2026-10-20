import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivityClock} from '../web/src/activity-clock.ts';
function fake(){let now=0,id=0;const tasks=new Map();return{clock:{now:()=>now,set:(fn,ms)=>{tasks.set(++id,{fn,at:now+ms});return id;},clear:key=>tasks.delete(key)},advance(ms){now+=ms;for(const [key,value]of [...tasks])if(value.at<=now){tasks.delete(key);value.fn();}},tasks};}
test('a long online cycle has no early completion and a late callback completes only this cycle',async()=>{
 const f=fake(),timer=createActivityClock(f.clock),ticks=[];let done=false;const wait=timer.wait(30000,n=>ticks.push(n)).then(value=>{done=value;});
 f.advance(29999);await Promise.resolve();assert.equal(done,false);assert.equal(ticks.at(-1),1);
 f.advance(240000);await wait;assert.equal(done,true);assert.equal(ticks.at(-1),0);assert.equal(f.tasks.size,0);
});
test('pause, replacement and an expired callback cannot complete an abandoned cycle',async()=>{
 const f=fake(),timer=createActivityClock(f.clock);const first=timer.wait(60000,()=>{});const late=[...f.tasks.values()][0].fn;timer.cancel();assert.equal(await first,false);const second=timer.wait(30000,()=>{});late();f.advance(30000);assert.equal(await second,true);
});
test('the next cycle waits a full period after persistence instead of catching up',async()=>{
 const f=fake(),timer=createActivityClock(f.clock);const first=timer.wait(30000,()=>{});f.advance(60000);assert.equal(await first,true);f.advance(5000);let done=false;const second=timer.wait(30000,()=>{}).then(x=>{done=x;});f.advance(29999);await Promise.resolve();assert.equal(done,false);f.advance(1);await second;assert.equal(done,true);
});
test('invalid durations and a broken monotonic clock fail without a successful cycle',async()=>{
 const f=fake(),timer=createActivityClock(f.clock);for(const n of [0,-1,NaN,Infinity,.5,240001])assert.throws(()=>timer.wait(n,()=>{}));let now=20,callback;const bad=createActivityClock({now:()=>now,set:fn=>{callback=fn;return 1;},clear:()=>{}});const wait=bad.wait(30000,()=>{});now=10;callback();await assert.rejects(wait,/计时发生变化/);
});
test('an independent wall deadline waits only its actual remainder and handles another wall-clock rewind',async()=>{
 const f=fake();let wall=100000;const timer=createActivityClock(f.clock,()=>wall),ticks=[];let done=false;
 const wait=timer.waitUntil(100001,n=>ticks.push(n)).then(x=>{done=x;});
 assert.equal(ticks.at(-1),1);f.advance(1);await Promise.resolve();assert.equal(done,false);
 wall=99999;f.advance(1);await Promise.resolve();assert.equal(done,false);assert.equal(ticks.at(-1),2);
 wall=100001;f.advance(2);await wait;assert.equal(done,true);assert.equal(ticks.at(-1),0);assert.equal(f.tasks.size,0);
});
test('the wall gate is cancellable and reaching it never bypasses the separate monotonic period',async()=>{
 const f=fake();let wall=100000;const timer=createActivityClock(f.clock,()=>wall);let done=false;
 const full=timer.wait(30000,()=>{}).then(x=>{done=x;});wall+=86400000;f.advance(29999);await Promise.resolve();assert.equal(done,false);
 f.advance(1);await full;assert.equal(done,true);
 const waiting=timer.waitUntil(wall+1,()=>{}),late=[...f.tasks.values()][0].fn;timer.cancel();assert.equal(await waiting,false);
 wall+=1;late();assert.equal(f.tasks.size,0);
 const next=timer.wait(30000,()=>{});f.advance(29999);assert.equal(f.tasks.size,1);f.advance(1);assert.equal(await next,true);
});
test('invalid deadlines and invalid wall clocks cannot report that a cycle is due',async()=>{
 const f=fake(),timer=createActivityClock(f.clock,()=>NaN);for(const deadline of [-1,NaN,Infinity,.5])assert.throws(()=>timer.waitUntil(deadline,()=>{}));
 await assert.rejects(timer.waitUntil(100,()=>{}),/活动时间不可用/);assert.equal(f.tasks.size,0);
});
