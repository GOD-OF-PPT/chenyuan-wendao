import test from 'node:test';
import assert from 'node:assert/strict';
import {playerCopy,playerMessage} from '../web/src/player-copy.ts';
import {newGame,resolve} from '../src/full/engine.ts';
import {createActivity,completeActivity} from '../src/full/activity.ts';

test('a real committed opening can use game language without changing its stored completion proof',()=>{
  const g=newGame('回响','copy-proof'),a=createActivity(g,{kind:'milestone',action:{type:'CHOOSE',choice:'leave'},maxCycles:1},{id:'copy',ownerId:'page',commandId:'start',now:1000});
  const formal=resolve(g,a.nextCommand),done=completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:a.dueAt});
  const before=structuredClone({g,a,formal,done});
  assert.equal(playerMessage(done.stopReason.message),'此行已成，下一步由你决定');
  assert.match(done.stopReason.message,/已保存本次明确安排/);
  assert.deepEqual({g,a,formal,done},before);
});

test('unknown errors and specific cost failures stay complete rather than being word-filtered',()=>{
  for(const s of ['原子存档失败：磁盘已满','缺少回春丹 ×2，库存0','未知活动授权，runId不匹配','存储空间不足，本次操作未提交，原进度保留',''])assert.equal(playerMessage(s),s);
  assert.equal(playerCopy.receipt,'收获明细');
  assert.equal(Object.isFrozen(playerCopy),true);
});
