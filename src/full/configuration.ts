import * as current from './configuration-current.ts';
import * as old from '../legacy/rules-v3/src/full/configuration.ts';
import {isLegacyRules,legacyCall} from './rule-profile.ts';
export * from './configuration-current.ts';
export const configurationState:typeof current.configurationState=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.configurationState(game,...args)):current.configurationState(game,...args);
export const configurationPreview:typeof current.configurationPreview=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.configurationPreview(game,...args)):current.configurationPreview(game,...args);
