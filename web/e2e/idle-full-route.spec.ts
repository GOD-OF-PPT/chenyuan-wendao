import {test} from '@playwright/test';
import {runVisibleIdleRoute} from './idle-route-support';
const options = { choice: 'leave', school: 'talisman', preparation: 'purchase', cultivation: 'natural',
  answer: 'accept', ending: 'transmit', advanced: true };

test('a normal new life follows visible finite idle plans from the welcome through the explicitly selected ascension',async({page},info)=>{await runVisibleIdleRoute(page,info,options);});
