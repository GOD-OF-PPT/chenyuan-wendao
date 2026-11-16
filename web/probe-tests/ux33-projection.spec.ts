import {test,expect} from '@playwright/test';
import {stopMessage,recoveryMessage} from '../src/activity-view';
import type {ActivityPlan} from '../../src/full/activity';

// Pure source projections under the existing TS runner; not browser, timing or storage coverage.
const plans:ActivityPlan[]=[
 {kind:'buy',item:'healing_pill',maxCycles:1,until:'cycles',targetQuantity:null,stoneBudget:0,stoneReserve:0},
 {kind:'learn',skills:['sword_still'],maxCycles:1,stoneBudget:0,stoneReserve:0},
 {kind:'study',manual:'jinghong',maxCycles:1,stoneBudget:0,stoneReserve:0},
];
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
test('UX33-P1 only uncertain exact known storage reports lose unsupported commitment claims',()=>{
 for(const [raw,cause]of [['存储空间不足，本次操作未提交，原进度保留','存储空间不足'],['存储事务失败，本次操作未提交，原进度保留','存储事务失败'],['本地存储不可访问，已有数据未改动','本地存储不可访问']]){expect(recoveryMessage(raw,true)).toBe(cause);expect(recoveryMessage(raw,false)).toBe(raw);expect(recoveryMessage(raw+' other',true)).toBe(raw+' other');}
 for(const raw of ['toString','__proto__','新的存储原因','需要筑基境界'])expect(recoveryMessage(raw,true)).toBe(raw);
});
test('UX33-P2 paid preparation budgets and cash reasons preserve frozen input and complete original messages',()=>{
 for(const plan of plans)for(const [code,message,expected]of [['ACTIVITY_BUDGET','累计灵石预算不足以继续下一件或下一卷','本段用石额度不足'],['INSUFFICIENT_STONES','灵石不足，安排停止','灵石不足']]){const input=freeze({plan:structuredClone(plan),reason:{code,message}}),before=JSON.stringify(input);expect(stopMessage(input.plan,input.reason)).toBe(expected);expect(JSON.stringify(input)).toBe(before);}
});
test('UX33-P3 source and production month budgets cannot be mislabelled as stone budgets',()=>{
 const reason=freeze({code:'ACTIVITY_BUDGET',message:'本段游戏月预算不足'});for(const kind of ['source','craft','forge'])expect(stopMessage({kind} as ActivityPlan,reason)).toBe(reason.message);
 const unknown={code:'NEW_CODE',message:'累计灵石预算不足以继续下一件或下一卷'};expect(stopMessage(plans[0],unknown)).toBe(unknown.message);expect(stopMessage(plans[0],null)).toBe('');
});
test('UX33-P4 actual medicine and sale shortages stay specific and unknown item keys preserve the original reason',()=>{
 const reason=freeze({code:'INSUFFICIENT_ITEM',message:'回春丹不足，安排停止'});for(const kind of ['sell','use']){expect(stopMessage({kind,item:'healing_pill'} as ActivityPlan,reason)).toBe('回春丹不足');for(const item of ['unknown','constructor','__proto__'])expect(stopMessage({kind,item} as ActivityPlan,reason)).toBe(reason.message);}
});
test('UX33-P5 existing travel battle encounter and waiting-decision meanings remain exact',()=>{
 const reason={code:'CYCLES_COMPLETE',message:'original'};for(const [kind,text]of [['travel','已抵达目的地，本次行旅结束'],['encounter','已完成本段历练动作上限，后续由你另行安排'],['battle','已完成本段斗法动作上限，不再自动出招']])expect(stopMessage({kind} as ActivityPlan,reason)).toBe(text);const waiting={code:'WAITING_DECISION',message:'等待问心选择'};expect(stopMessage({kind:'milestone'} as ActivityPlan,waiting)).toBe(waiting.message);
});
