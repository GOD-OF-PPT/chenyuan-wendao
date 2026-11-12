import base from './playwright.quality.config';

export default {
  ...base,
  testMatch: [...base.testMatch, 'idle-adventure.spec.ts', 'art30-npc-meeting.spec.ts',
    'cend06-f02b-travel-passage.spec.ts', 'cend13b-response-state.spec.ts',
    'ux27-equipment-context.spec.ts', 'matrix-ui-controls.spec.ts', 'idle-preparation.spec.ts'],
  grepInvert: /ART27-A5|ART29-A4|ART30-A3/,
};
