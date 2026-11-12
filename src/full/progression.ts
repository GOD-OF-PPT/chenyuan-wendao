import * as current from './progression-current.ts';
import * as old from '../legacy/rules-v3/src/full/progression.ts';
import {isLegacyRules,legacyCall} from './rule-profile.ts';
export * from './progression-current.ts';
export const progressionOptions:typeof current.progressionOptions=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.progressionOptions(game,...args)):current.progressionOptions(game,...args);
export const projectProgression:typeof current.projectProgression=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.projectProgression(game,...args)):current.projectProgression(game,...args);
export const projectConfigurationCombat:typeof current.projectConfigurationCombat=(game,...args)=>isLegacyRules(game)?legacyCall(()=>old.projectConfigurationCombat(game,...args)):current.projectConfigurationCombat(game,...args);
