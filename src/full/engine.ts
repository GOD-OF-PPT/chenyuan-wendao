import * as current from './engine-current.ts';
import {VERSION} from './content.ts';
import * as old from '../legacy/rules-v3/src/full/engine.ts';
import {isLegacyRules,legacyCall} from './rule-profile.ts';
export * from './engine-current.ts';
import type {Game} from './types.ts';
import {RuleError} from './errors.ts';
export function validateGame(value:unknown):asserts value is Game{if(isLegacyRules(value))legacyCall(()=>old.validateGame(value));else current.validateGame(value);}
export const parseGame:typeof current.parseGame=raw=>{
 if(typeof raw!=='string'||raw.length>1000000||new TextEncoder().encode(raw).byteLength>1000000)throw new RuleError('SAVE_SIZE','存档过大');
 let value:unknown;try{value=JSON.parse(raw);}catch{throw new RuleError('SAVE_JSON','文件不是有效 JSON');}
 const c=value&&typeof value==='object'&&'core'in value?(value as {core?:{contentVersion?:unknown}}).core:null;
 return c?.contentVersion===VERSION?current.parseGame(raw):legacyCall(()=>old.parseGame(raw));
};
export const previewResolution:typeof current.previewResolution=(game,action)=>{
 if(!isLegacyRules(game))return current.previewResolution(game,action);
 const result=legacyCall(()=>old.previewResolution(game,action));
 return result.ok?result:{...result,error:new RuleError(result.error.code,result.error.message)};
};
export const resolve:typeof current.resolve=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.resolve(game,...args)):current.resolve(game,...args);
export const advance:typeof current.advance=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.advance(game,...args)):current.advance(game,...args);
export const reason:typeof current.reason=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.reason(game,...args)):current.reason(game,...args);
export const stats:typeof current.stats=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.stats(game,...args)):current.stats(game,...args);
export const availableEvents:typeof current.availableEvents=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.availableEvents(game,...args)):current.availableEvents(game,...args);
export const biography:typeof current.biography=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.biography(game,...args)):current.biography(game,...args);
