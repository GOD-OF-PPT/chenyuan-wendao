import base from './playwright.idle-persistence.config';
import {idleNativeMigration} from '../tests/idle-recovery-native-migration.mjs';
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// Published-source migrations and current finite recovery share the real native
// repository. Exactly named obsolete instant setups retain their source/history
// and have explicit replacement obligations; unrelated failures cannot disappear.
export default {
  ...base,
  testMatch: [...base.testMatch, 'idle-recovery-*.spec.ts', 'ascension.spec.ts',
    'causal-migration.spec.ts', 'economy-migration.spec.ts', 'fault-matrix.spec.ts',
    'life-record.spec.ts', 'recovery.spec.ts', 'repository.spec.ts',
    'trial-entry.spec.ts', 'trial-journey.spec.ts'],
  grepInvert: new RegExp('(?:'+idleNativeMigration.supersededLegacyTests.map(r=>escaped(r.title)).join('|')+')$'),
  outputDir: 'idle-recovery-results',
  reporter: [['list'], ['json', { outputFile: 'idle-recovery-report/persistence.json' }]],
};
