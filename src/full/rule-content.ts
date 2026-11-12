import * as current from './content.ts';
import * as old from '../legacy/rules-v3/src/full/content.ts';
import type {Game} from './types.ts';
import {isLegacyRules,rulesVersion} from './rule-profile.ts';

/** Read-only facts belong to the selected life; no ambient mutable profile. */
export function contentForGame(game:Game|null|undefined){
 if(!game)return current;
 rulesVersion(game);return isLegacyRules(game)?old:current;
}
