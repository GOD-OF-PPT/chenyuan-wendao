import { VERSION, BALANCE } from './content.ts';

export const SAVE_FORMAT = 'chenyuan-full';
export const SAVE_VERSION = 2;
export const SCHEMA_VERSION = 2;
export const MAX_SAVE_BYTES = 1_000_000;
export const LEGACY_FULL_CONTENT = 'full-demo.1';
export const LEGACY_FULL_BALANCE = 'full-unbalanced.1';
export const currentVersions = Object.freeze({
  format: SAVE_FORMAT, version: SAVE_VERSION, schemaVersion: SCHEMA_VERSION,
  contentVersion: VERSION, balanceVersion: BALANCE,
});
export type SaveVersions = typeof currentVersions;
