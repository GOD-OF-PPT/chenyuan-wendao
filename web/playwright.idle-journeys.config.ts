import base from './playwright.idle.config';

// Current finite activities at one fixed desktop setting. The historical 72-route
// three-browser gate remains separate; this profile does not accept compatibility.
export default {
  ...base,
  testDir: './journey-tests',
  testMatch: ['idle-normal-matrix.spec.ts', 'idle-foundation-guide.spec.ts', 'idle-trial-reopen.spec.ts'],
  grepInvert: undefined,
  // Keep explicit screenshots, full Game/cycle assertions and ledgers. Automatic
  // DOM/video tracing is diagnostic overhead, not part of the rule clock.
  use: {...base.use,trace:'off' as const},
  webServer: {command:'npm run preview -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false},
  outputDir: 'idle-journey-results',
  reporter: [['list'], ['json', { outputFile: 'idle-journey-report/results.json' }]],
};
