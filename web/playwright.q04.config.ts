import base from './playwright.q03.config';
export default {...base,testMatch:['quality-continuing.spec.ts','quality-behavior.spec.ts','idle-sources.spec.ts','idle-production.spec.ts',
  'idle-adventure.spec.ts','store-sync-status.spec.ts'],grepInvert:/ART27-A5|ART29-A4|ART30-A3|ART28-A4|ART31-A5/};
