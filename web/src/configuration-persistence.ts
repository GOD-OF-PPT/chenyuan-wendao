import * as current from './configuration-persistence-current.ts';
import * as old from '../../src/legacy/rules-v3/web/src/configuration-persistence.ts';
import {isLegacyRules,legacyCall} from '../../src/full/rule-profile.ts';
import type {Game} from '../../src/full/types.ts';
export * from './configuration-persistence-current.ts';
export function validateConfigurationReceipt(value:unknown,game:Game):asserts value is current.ConfigurationReceipt{if(isLegacyRules(game))legacyCall(()=>old.validateConfigurationReceipt(value,game));else current.validateConfigurationReceipt(value,game);}
