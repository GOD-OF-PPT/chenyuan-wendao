import base from './playwright.persistence.config';
import {runtimeSources,sha} from '../scripts/source-identity.mjs';

// The real activity repository and Store use one fixed desktop browser.
export default {
  ...base,
  metadata: {...base.metadata, runtimeDigest: sha(JSON.stringify(runtimeSources()))},
  testMatch: ['receipt-retention-review.spec.ts', 'receipt-retention.spec.ts', 'app-owners.spec.ts', 'idle-recovery-current.spec.ts', 'idle-recovery-restore.spec.ts', 'idle-recovery-lifespan.spec.ts', 'idle-recovery-controls.spec.ts', 'idle-recovery-boundaries.spec.ts', 'positive-cost.spec.ts', 'positive-cost-store.spec.ts', 'check-art-02-store.spec.ts', 'activity.spec.ts', 'activity-store.spec.ts', 'source-activity.spec.ts', 'production-activity.spec.ts', 'mixed-activity.spec.ts', 'preparation-activity.spec.ts', 'configuration.spec.ts', 'configuration-store.spec.ts', 'adventure.spec.ts', 'adventure-store.spec.ts', 'adventure-upgrade.spec.ts', 'milestone.spec.ts', 'milestone-store.spec.ts', 'milestone-upgrade.spec.ts', 'later-mixed-activity.spec.ts', 'store-reconnect.spec.ts', 'idle-progression-route.spec.ts', 'local-experience.spec.ts', 'local-startup.spec.ts', 'online-recovery.spec.ts', 'history-ui.spec.ts', 'store-lifecycle.spec.ts', 'store-sync-queue.spec.ts'],
  // Keep the positive-cost cells in the same fixed-browser native suite.
  projects: [{ name: 'chromium', use: { browserName: 'chromium' as const } }],
  use: { ...base.use, viewport: { width: 1440, height: 900 } },
  outputDir: 'idle-persistence-results',
  reporter: [['list'], ['json', { outputFile: 'idle-report/persistence.json' }]],
};
