import base from './playwright.config';

// Targeted gameplay verification only. Compatibility projects remain paused.
export default {
  ...base,
  testMatch: ['idle-cultivation.spec.ts'],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' as const } }],
  use: { ...base.use, viewport: { width: 1440, height: 900 } },
  outputDir: 'idle-results',
  reporter: [['list'], ['json', { outputFile: 'idle-report/ui.json' }]],
};
