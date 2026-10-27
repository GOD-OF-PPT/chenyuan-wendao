import {test} from '@playwright/test';
import {ascensionMatrix} from '../../tests/ascension-matrix.mjs';
import {baselineIdleScenario} from '../e2e/idle-matrix-scenarios';
import {runVisibleIdleRoute} from '../e2e/idle-route-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
for(const route of ascensionMatrix)test('normal idle '+route.id,async({page},info)=>{
 const options={choice:route.choice,school:route.school,preparation:route.strategy==='craft'?'gather':'purchase',cultivation:'natural',answer:route.school==='sword'?'accept':'release',ending:route.ending,advanced:false};
 await runVisibleIdleRoute(page,info,options,baselineIdleScenario,{reopenStages:true});
});
