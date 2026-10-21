import base from './playwright.config';

// Targeted gameplay verification only. Compatibility projects remain paused.
export default {
  ...base,
  testMatch: ['idle-cultivation.spec.ts', 'idle-sources.spec.ts', 'idle-production.spec.ts', 'idle-integration.spec.ts', 'idle-preparation.spec.ts', 'idle-preparation-drafts.spec.ts', 'idle-preparation-active.spec.ts', 'idle-adventure.spec.ts', 'idle-milestones.spec.ts', 'idle-review.spec.ts', 'idle-stage-ui.spec.ts', 'stage-r1.spec.ts', 'stage-r2.spec.ts'],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' as const } }],
  use: { ...base.use, viewport: { width: 1440, height: 900 } },
  outputDir: 'idle-results',
  reporter: [['list'], ['json', { outputFile: 'idle-report/ui.json' }]],
};
