import {driver} from './full-route.mjs';
import {feedbackExamples} from './action-feedback-fixtures.mjs';

// Legal command prefixes only. These isolated fixtures do not prove earned pacing.
export function paidResponseFixture(){
 const d=driver('trade','sword');d.realm();d.funds(100);d.go('sect');d.doAction({type:'EVENT',event:'shen_return'});return structuredClone(d.game);
}
export function npcResponseFixtures(){
 return [['shen','foundation','sect','shen_return'],['lu','qi','sect','lu_intro'],['pei','foundation','sect','pei_meet'],['yan','spirit','secret','yan_stone']].map(([person,realm,place,event])=>{
  const d=driver('help','sword');while(d.game.core.player.realm!==realm)d.realm();d.funds(100);d.go(place);d.doAction({type:'EVENT',event});return{person,game:structuredClone(d.game)};
 });
}
let stages;
export function responseStageFixtures(){
 if(!stages){const f=feedbackExamples().actions;stages={question:f.get('ANSWER_TRIAL').before,ending:f.get('END').before};}
 return structuredClone(stages);
}
