import * as current from './direct-persistence-current.ts';
import * as old from '../../src/legacy/rules-v3/web/src/direct-persistence.ts';
import {isLegacyRules,legacyCall} from '../../src/full/rule-profile.ts';
import type {Game} from '../../src/full/types.ts';
export * from './direct-persistence-current.ts';
export function validateDirectReceipt(value:unknown,game:Game):asserts value is current.DirectReceipt{if(isLegacyRules(game))legacyCall(()=>old.validateDirectReceipt(value,game));else current.validateDirectReceipt(value,game);}
