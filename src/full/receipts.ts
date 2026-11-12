import * as current from './receipts-current.ts';
import * as old from '../legacy/rules-v3/src/full/receipts.ts';
import {isLegacyRules,legacyCall} from './rule-profile.ts';
export * from './receipts-current.ts';
import type {Game} from './types.ts';
import type {CommandReceipt} from './contracts.ts';
export function validateCommandReceipt(value:unknown,game:Game):asserts value is CommandReceipt{if(isLegacyRules(game))legacyCall(()=>old.validateCommandReceipt(value,game));else current.validateCommandReceipt(value,game);}
