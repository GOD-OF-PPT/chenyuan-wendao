import base from './playwright.idle.config';

// Current finite activities at one fixed desktop setting. The historical 72-route
// three-browser gate remains separate; this profile does not accept compatibility.
export default {
  ...base,
  testDir: './journey-tests',
  testMatch: ['idle-normal-matrix.spec.ts', 'idle-foundation-guide.spec.ts', 'idle-trial-reopen.spec.ts'],
  grepInvert: undefined,
  webServer: {command:'npm run preview -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false},
  outputDir: 'idle-journey-results',
  reporter: [['list'], ['json', { outputFile: 'idle-journey-report/results.json' }]],
};
