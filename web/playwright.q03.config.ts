import base from './playwright.q02.config';
export default {
  ...base,
  testMatch:[...base.testMatch,'quality-player-copy.spec.ts','idle-recovery-ui.spec.ts','art28-alchemy-scene.spec.ts',
    'cend08-study-intent.spec.ts','cend07-f02b-relic-focus.spec.ts','uir35-04-battle-medicine.spec.ts'],
};
