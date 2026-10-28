import type {Game} from '../../src/full/types.ts';
import {getTrialJourney} from '../../src/full/queries.ts';

/** Current committed trial facts only; viewing never creates an action or authorization. */
export function trialGuidance(game:Game){
 if(game.status!=='active'||!game.trial)return null;
 const journey=getTrialJourney(game)!,stage=journey.stage;
 return{stage,steps:journey.steps,
  mark:['心','一','二','三','卷'][stage],
  title:stage===0?'回答问心':stage===4?'选择此生结尾':'渡过当前天劫',
  subject:journey.title,
  state:`已过 ${journey.completed} / 3 关 · ${stage===0?'待答问心':stage===4?'尚未收卷':'当前第 '+stage+' 关'}`,
  verb:stage===0?'查看问心选择':stage===4?'查看收卷选择':'查看当前战局',
  detail:stage===0?'入场已保存。先读两种问心选择，答复需另行确认6秒安排；不自动接续战策。':stage===4?'无需再筹渡劫引。先读两种结尾，明确确认后才安排12秒收卷；不自动开启新人生。':'当前天劫尚未完成。查看敌方意图与本关战策；出招、用药或撤退仍由原安排执行。',
 };
}
