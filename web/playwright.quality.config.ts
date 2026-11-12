import base from './playwright.idle.config';

// Functional handoff for source-guard retirement. Every declared applicable case
// runs; the two complete mixed media-preference cases remain explicitly deferred.
export default {
  ...base,
  testMatch: ['quality-ui-bugs.spec.ts', 'quality-behavior.spec.ts', 'check-cend13-abc.spec.ts',
    'art27-relic-workshop.spec.ts', 'art29-inventory-scene.spec.ts', 'store-sync-status.spec.ts'],
  grepInvert: /ART27-A5|ART29-A4/,
  outputDir: 'quality-results',
  reporter: [['list'], ['json', {outputFile: 'quality-report/ui.json'}]],
};
