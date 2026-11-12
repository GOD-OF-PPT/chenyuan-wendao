import {VERSION,BALANCE} from './content.ts';
import type {Game} from './types.ts';
import {RuleError} from './errors.ts';
import {RuleError as LegacyRuleError} from '../legacy/rules-v3/src/full/errors.ts';
import type {ActionResult,SaveCheckpoint} from './contracts.ts';
import type {ActionResult as OldResult,SaveCheckpoint as OldCheckpoint} from '../legacy/rules-v3/src/full/contracts.ts';

export const LEGACY_RULES_VERSION='full-demo.3/full-unbalanced.3';
export const CURRENT_RULES_VERSION=VERSION+'/'+BALANCE;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function isLegacyRules(value:unknown):boolean{
 return object(value)&&object(value.core)&&value.core.contentVersion==='full-demo.3'&&value.core.balanceVersion==='full-unbalanced.3';
}
export function rulesVersion(game:Game):string{
 if(isLegacyRules(game))return LEGACY_RULES_VERSION;
 if(game.core.contentVersion===VERSION&&game.core.balanceVersion===BALANCE)return CURRENT_RULES_VERSION;
 throw new RuleError('SAVE_VERSION','内容或数值版本不匹配，请保留原存档');
}
export function versionsForGame(game:Game){
 rulesVersion(game);
 return{format:game.format,version:game.version,schemaVersion:game.core.schemaVersion,contentVersion:game.core.contentVersion,balanceVersion:game.core.balanceVersion};
}
export function activityRulesVersion(value:unknown):string{
 if(!object(value))throw new RuleError('ACTIVITY_INVALID','活动规则标记无效，原记录保留');
 if(!Object.hasOwn(value,'rulesVersion'))return LEGACY_RULES_VERSION;
 if(value.rulesVersion===CURRENT_RULES_VERSION)return CURRENT_RULES_VERSION;
 throw new RuleError('ACTIVITY_INVALID','活动规则标记无效，原记录保留');
}
export function assertActivityRules(value:unknown,game?:Game):void{
 const id=activityRulesVersion(value);
 if(game&&id!==rulesVersion(game))throw new RuleError('ACTIVITY_INVALID','活动规则与所属人生不一致，原记录保留');
 if(object(value))for(const field of ['originGame','decisionGame','outcomeGame']){
  const snapshot=value[field];if(snapshot!==undefined&&snapshot!==null&&rulesVersion(snapshot as Game)!==id)throw new RuleError('ACTIVITY_INVALID','活动证明状态的规则不一致，原记录保留');
 }
}
export function legacyCall<T>(read:()=>T):T{
 try{return read();}catch(error){if(error instanceof LegacyRuleError)throw new RuleError(error.code,error.message);throw error;}
}
export function legacyResult(value:ActionResult):OldResult{
 if(value.versions.contentVersion!=='full-demo.3'||value.versions.balanceVersion!=='full-unbalanced.3')throw new RuleError('RECEIPT_INVALID','旧活动不能接受另一规则的结果');
 return value as OldResult;
}
export function legacyCheckpoint(value:SaveCheckpoint|null):OldCheckpoint|null{
 if(value&&(value.versions.contentVersion!=='full-demo.3'||value.versions.balanceVersion!=='full-unbalanced.3'||!isLegacyRules(value.snapshot)))throw new RuleError('CHECKPOINT_INVALID','旧人生检查点规则不一致');
 return value as OldCheckpoint|null;
}
