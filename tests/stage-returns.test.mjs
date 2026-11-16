import test from 'node:test';
import assert from 'node:assert/strict';
import {useStageReturns} from '../web/src/use-stage-returns.ts';

test('nested readonly details return to the first material page and original opener only once',()=>{
 let position={view:'journey',tab:'修行'};
 const opener={dataset:{testid:'material-page-three'}},returns=useStageReturns(()=>position,()=>opener);
 returns.enter('goal',true);position={view:'goal',tab:'修行'};
 returns.enter('character',true);position={view:'character',tab:'修行'};
 const next=returns.consume('same-life',2);
 assert.equal(next.back.view,'journey');assert.equal(next.back.tab,'修行');assert.equal(next.id,'material-page-three');assert.equal(next.opener,opener);
 assert.equal(returns.detailParent.value,null);position={view:next.back.view,tab:next.back.tab};
 assert.equal(returns.consume('same-life',2).back,null);
});

test('a life reading return belongs to its original life and narrative context',()=>{
 let position={view:'explore',tab:'历练'};const returns=useStageReturns(()=>position,()=>null);
 returns.enterReading('life-a',7);position={view:'life',tab:'仙缘'};
 assert.equal(returns.consume('life-b',7).back,null);assert.equal(returns.consume('life-a',8).back,null);
 const next=returns.consume('life-a',7);assert.equal(next.back.view,'explore');assert.equal(next.back.tab,'历练');
 assert.equal(returns.readingReturn.value,null);
});

test('reopening the same life from a nested detail preserves the initial gameplay return',()=>{
 let position={view:'cultivation',tab:'修行'};const returns=useStageReturns(()=>position,()=>null);
 returns.enterReading('life-a',9);position={view:'life',tab:'仙缘'};
 returns.enter('goal',true);position={view:'goal',tab:'仙缘'};
 returns.enterReading('life-a',9);position={view:'life',tab:'仙缘'};
 assert.equal(returns.consume('life-a',9).back.view,'cultivation');
});

test('reset discards every earlier detail and reading source without modifying the caller position',()=>{
 let position={view:'journey',tab:'修行'};const returns=useStageReturns(()=>position,()=>null);
 returns.captureTradeoff();returns.enterReading('life-a',2);returns.enter('goal',true);
 returns.reset();assert.deepEqual(position,{view:'journey',tab:'修行'});assert.equal(returns.detailParent.value,null);assert.equal(returns.readingReturn.value,null);
 position={view:'tradeoffs',tab:'修行'};assert.equal(returns.consume('life-b',3).back,null);
});
