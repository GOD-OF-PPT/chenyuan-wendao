import test from 'node:test';
import assert from 'node:assert/strict';
import {driver} from './full-route.mjs';
import {getRelationships,previewAction} from '../src/full/queries.ts';
import {describeVisitRoute} from '../web/src/navigation.ts';
const free={enabled:true,busy:false,running:false};
test('a reachable foreign visit exposes its formal travel budget and online time without acting',()=>{
 const d=driver(),before=structuredClone(d.game),next=getRelationships(d.game).map(p=>p.next).find(n=>n?.unlocked&&n.location!==d.game.core.world.location),view=describeVisitRoute(d.game,next,free),quote=previewAction(d.game,{type:'TRAVEL',location:next.location});
 assert(view.allowed);assert.equal(quote.allowed,true);assert.equal(quote.actualCosts.months,0);assert(view.text.includes('不消耗物资'));assert(view.text.includes('6秒行旅'));assert(view.text.includes('拜访另行确认'));assert.deepEqual(d.game,before);
});
test('locked next meetings explain their actual minimum realm rather than a generic disabled button',()=>{
 const d=driver(),next=getRelationships(d.game).find(p=>p.id==='shen').next,view=describeVisitRoute(d.game,next,free);assert.equal(view.allowed,false);assert(view.text.includes('需筑基境界'));assert(view.text.includes('6秒行旅'));
});
test('same-place viewing stays free during an activity while foreign travel requires pausing',()=>{
 const d=driver(),next=getRelationships(d.game).map(p=>p.next).find(n=>n?.unlocked);d.go(next.location);const here=describeVisitRoute(d.game,next,{...free,running:true});assert(here.allowed);assert(here.text.includes('已在此地，查看不耗时'));d.go('cave');const away=describeVisitRoute(d.game,next,{...free,running:true});assert.equal(away.allowed,false);assert(away.text.includes('先暂停'));
});
test('storage and pending-story restrictions are explicit and do not change the snapshot',()=>{
 const d=driver(),next=getRelationships(d.game).map(p=>p.next).find(n=>n?.unlocked);assert.equal(describeVisitRoute(d.game,next,{...free,enabled:false}).text.startsWith('存档未就绪'),true);assert.equal(describeVisitRoute(d.game,next,{...free,busy:true}).text.startsWith('保存中'),true);d.go(next.location);d.doAction({type:'EVENT',event:next.id});const before=structuredClone(d.game),view=describeVisitRoute(d.game,next,free);assert.equal(view.allowed,false);assert(view.text.includes('先处理当前遭遇'));assert.deepEqual(d.game,before);
});
