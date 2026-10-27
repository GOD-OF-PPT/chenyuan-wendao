import base from './playwright.idle.config';

// Current finite activities at one fixed desktop setting. The historical 72-route
// three-browser gate remains separate; this profile does not accept compatibility.
export default {
  ...base,
  testDir: './journey-tests',
  testMatch: ['idle-normal-matrix.spec.ts', 'idle-foundation-guide.spec.ts', 'idle-trial-reopen.spec.ts'],
  grepInvert: undefined,
  outputDir: 'idle-journey-results',
  reporter: [['list'], ['json', { outputFile: 'idle-journey-report/results.json' }]],
};
