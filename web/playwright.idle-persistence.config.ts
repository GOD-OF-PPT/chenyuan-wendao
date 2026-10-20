import base from './playwright.persistence.config';

// The real activity repository and Store use one fixed desktop browser.
export default {
  ...base,
  testMatch: ['activity.spec.ts', 'activity-store.spec.ts', 'source-activity.spec.ts'],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' as const } }],
  use: { ...base.use, viewport: { width: 1440, height: 900 } },
  outputDir: 'idle-persistence-results',
  reporter: [['list'], ['json', { outputFile: 'idle-report/persistence.json' }]],
};
