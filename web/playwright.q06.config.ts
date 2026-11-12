import base from './playwright.quality-group.config';
export default {...base,testMatch:[...base.testMatch,'quality-navigation.spec.ts']};
