import * as current from './activity-persistence-current.ts';
import * as old from '../../src/legacy/rules-v3/web/src/activity-persistence.ts';
import {isLegacyRules,legacyCall} from '../../src/full/rule-profile.ts';
import type {Game} from '../../src/full/types.ts';
export * from './activity-persistence-current.ts';
export function validateActivityReceipt(value:unknown,game:Game):asserts value is current.ActivityReceipt{if(isLegacyRules(game))legacyCall(()=>old.validateActivityReceipt(value,game));else current.validateActivityReceipt(value,game);}
