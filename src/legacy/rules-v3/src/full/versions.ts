import { VERSION, BALANCE } from './content.ts';

export const SAVE_FORMAT = 'chenyuan-full';
export const SAVE_VERSION = 2;
export const SCHEMA_VERSION = 2;
export const MAX_SAVE_BYTES = 1_000_000;
export const LEGACY_FULL_CONTENT = 'full-demo.1';
export const LEGACY_FULL_BALANCE = 'full-unbalanced.1';
export const PREVIOUS_FULL_CONTENT = 'full-demo.2';
export const PREVIOUS_FULL_BALANCES = Object.freeze(['full-unbalanced.1', 'full-unbalanced.2']);
/** Immutable option identities published by full-demo.1/.2, not the current expanded catalog. */
const historicalOptions:Record<string,string[]>={
 shen_return:['accept','decline'],shen_pact:['lend','decline'],pei_meet:['cooperate','rival','decline'],
 pei_echo:['share','solo','decline'],pei_pact:['ally','decline'],lu_intro:['listen','decline'],
 lu_teach:['teach','decline'],lu_farewell:['remember','decline'],yan_stone:['name','story','decline'],
 yan_mirror:['accept','decline'],yan_gate:['resolve','decline']
};
for(const id of ['rain','tea','letter','pine','deer','cloud','bell','scroll','heir','stall','jade','lantern','steps','pool','echo','wind','crane','dawn'])historicalOptions['local_'+id]=['exchange','decline'];
for(let index=0;index<6;index++)historicalOptions['omen_'+index]=['observe','decline'];
for(const options of Object.values(historicalOptions))Object.freeze(options);
export const HISTORICAL_FULL_OPTIONS:Readonly<Record<string,readonly string[]>>=Object.freeze(historicalOptions);
export const currentVersions = Object.freeze({
  format: SAVE_FORMAT, version: SAVE_VERSION, schemaVersion: SCHEMA_VERSION,
  contentVersion: VERSION, balanceVersion: BALANCE,
});
export type SaveVersions = typeof currentVersions;
