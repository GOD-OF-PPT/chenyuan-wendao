import base from './playwright.config';

// Targeted gameplay verification only. Compatibility projects remain paused.
export default {
  ...base,
  testMatch: ['art13-alchemy-stage.spec.ts', 'art10-equipment-stage.spec.ts', 'art11-inventory-stage.spec.ts', 'art12-narrative-stage.spec.ts', 'check-art03-combinations.spec.ts', 'check-art03-feedback-art.spec.ts', 'stage-ta-review.spec.ts', 'check-ta-03.spec.ts', 'equipment-actors.spec.ts', 'source-actors.spec.ts', 'battle-actors.spec.ts', 'check-matrix-keyboard.spec.ts', 'check-matrix-guidance.spec.ts', 'check-matrix-records.spec.ts', 'matrix-ui-enemy-asset.spec.ts', 'matrix-ui-focus.spec.ts', 'matrix-ui-milestone-feedback.spec.ts', 'matrix-ui-local-recovery.spec.ts', 'matrix-ui-boundaries.spec.ts', 'matrix-ui-controls.spec.ts', 'demo.spec.ts', 'matrix-ui-menus.spec.ts', 'matrix-ui-cancel.spec.ts', 'matrix-ui-intent.spec.ts', 'cultivation-objects.spec.ts', 'check-art-02.spec.ts', 'narrative-objects.spec.ts', 'inventory-objects.spec.ts', 'equipment-objects.spec.ts', 'check-art-01.spec.ts', 'adventure-objects.spec.ts', 'alchemy-workshop.spec.ts', 'idle-cultivation.spec.ts', 'idle-sources.spec.ts', 'idle-production.spec.ts', 'idle-integration.spec.ts', 'idle-preparation.spec.ts', 'idle-preparation-drafts.spec.ts', 'idle-preparation-active.spec.ts', 'idle-adventure.spec.ts', 'idle-milestones.spec.ts', 'idle-review.spec.ts', 'idle-stage-ui.spec.ts', 'stage-r1.spec.ts', 'stage-r2.spec.ts', 'stage-r3.spec.ts', 'stage-r3-layout.spec.ts', 'stage-check.spec.ts', 'stage-r4.spec.ts', 'stage-u8-b.spec.ts', 'idle-full-route.spec.ts', 'local-loading.spec.ts', 'check-u8.spec.ts', 'store-sync-status.spec.ts'],
  grepInvert: /demo menus and four viewport screenshots retain a visible scope and playable controls at 150 percent/,
  projects: [{ name: 'chromium', use: { browserName: 'chromium' as const } }],
  use: { ...base.use, viewport: { width: 1440, height: 900 } },
  outputDir: 'idle-results',
  reporter: [['list'], ['json', { outputFile: 'idle-report/ui.json' }]],
};
