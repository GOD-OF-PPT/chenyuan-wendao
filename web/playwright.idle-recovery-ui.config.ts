import base from './playwright.idle.config';

// Actual current consumers of FR01–FR20 and the two conditional notes entries.
// A single fixed desktop profile; the historical cross-browser/layout gate stays open.
export default {
  ...base,
  testMatch: ['idle-recovery-flow.spec.ts', 'idle-recovery-ui.spec.ts',
    'idle-recovery-choices.spec.ts', 'idle-recovery-context.spec.ts',
    'idle-cultivation.spec.ts', 'idle-adventure.spec.ts', 'idle-milestones.spec.ts',
    'idle-review.spec.ts', 'matrix-ui-controls.spec.ts', 'matrix-ui-local-recovery.spec.ts',
    'matrix-ui-boundaries.spec.ts', 'matrix-ui-focus.spec.ts',
    'check-matrix-guidance.spec.ts', 'check-matrix-keyboard.spec.ts',
    'check-matrix-records.spec.ts', 'stage-r4.spec.ts', 'art15-cultivation-notes.spec.ts',
    'check-art04-combinations.spec.ts', 'idle-full-route.spec.ts',
    'local-loading.spec.ts', 'store-sync-status.spec.ts'],
  outputDir: 'idle-recovery-ui-results',
  reporter: [['list'], ['json', { outputFile: 'idle-recovery-ui-report/ui.json' }]],
};
