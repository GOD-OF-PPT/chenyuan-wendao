import {contentForGame} from '../../src/full/rule-content.ts';
import * as C from '../../src/full/content.ts';
import {gamePhase,type ActionResult} from '../../src/full/contracts.ts';
import type {Game} from '../../src/full/types.ts';

const text={
  welcome:{title:'从第一选择开始',hint:'三种开场都可入道，先看选项代价，再选择。',body:'先创建道号，再决定怎样处理破庙的一枚丹药。三种开场都有入道途径；约30分钟只用于理解玩法，不限定到达境界或通关时间。'},
  opening:{title:'破庙的一丹一念',hint:'三种选择都可入道。先核对代价，阅读不耗游戏月。',body:'先看赠丹、交易或保留的代价与条件；预选只查看，明确确认安排后才读秒，保存后才留下实际结果与因果。三种开场都有入道途径，不会直接赋予境界；读正文与查看资料不消耗游戏月。'},
  cultivation:{title:'修为与游戏年月',hint:'在洞府安排持续吐纳，比较辅助修炼的代价；修为满后筹备突破。',body:'引气入体前安排自然吐纳，入道后再比较灵石辅助的收益与代价。每轮读秒结束后自动保存真实成果与游戏月消耗；在线查看和切页时修炼继续，改做其他行动前先暂停。达到修为、次数或预算边界即停，不会自动突破。关闭或刷新保留已保存成果与安排，主动继续后重新计时，不补发离线收益；暂停后阅读不消耗寿元。'},
  materials:{title:'材料与取舍',hint:'行囊查用途、数量与来源，丹炉翻丹方；先比较，再安排取材或炼制。',body:'在「行囊」核对用途、数量与全部来源，在「丹炉」翻丹方、核对材料与炉次。查看来源不执行；标明「前往」的按钮会按所示耗时旅行，不自动取材、购买或炼制。灵石还用于辅助修炼与研习，安排前核对累计预算和保留量，避免花掉突破所需。'},
  equipment:{title:'功法与搭配',hint:'打开功法，在修法中比较剑修或符修，在配装中核对搭配；确认后才保存。',body:'打开「功法」：在「修法」比较剑修或符修，在「功法」查看研习，在「配装」比较已掌握经卷与槽位。剑修积蓄后释放，符修可持续灼伤或提前引爆。金丹后在「法宝」炼器，炼成后仍须比较并确认认主。择法与配装确认后直接保存，无需读秒；未决事件和战斗中不能换装。'},
  recovery:{title:'疗养与战败',hint:'战斗内丹药占回合；战后可回洞府疗养，零灵石也有恢复路线。',body:'受伤或缺灵力时，可在战斗中服用对应丹药，但会占一个回合。战斗结束后可回洞府疗养；零灵石、没有丹药也能在余寿足够时疗养，再采集或做委托。查看配装与来源不耗月，疗养和取材的游戏月成本仍需核对。'},
  breakthrough:{title:'核对突破清单',hint:'先核对当前目标的修为与消耗；达标后仍由你确认。',body:'在「修行」核对当前目标：凡人修为圆满即可引气，不要求突破丹；之后普通突破还需相应突破物。先比较取材、采购与炼制成本。材料齐备不会自动突破；核对清单只查看，确认后按页面所示时间破境，完成后记下消耗与境界变化。'},
  battle:{title:'战斗先辨意图',hint:'先辨敌意，在战策中核对招式、用药和危险停手，再安排本关自动斗法。',body:'先看敌方意图，在「战策」核对招式顺序、用药上限与危险停手，再安排当前一关自动斗法。每回合独立读秒并保存；可暂停，或用「手动操作」逐招干预。基础攻击和护体回灵，丹药占一回合；剑意满层终结可打断重击，符印可持续灼伤或提前引爆。刷新保留已提交回合，下一关与未知选择不会代选。'},
  causality:{title:'选择与回响',hint:'先看选项代价与条件；可查看行囊和人物，再返回遭遇。',body:'在「仙缘」查看人物与来往；遇到抉择，先读条件、代价与已知结果。预选不执行，明确确认安排后才读秒并保存回应。未决事件中仍可查看行囊和人物，但不能借旅行、修炼或换装绕开选择。仙缘与生平只记录实际来路；没有人物援助也保留主线。'},
  trial:{title:'突破与渡劫',hint:'入场前核对准备，入场后按问心、三关与收卷推进；未知选择由你决定。',body:'化神修为圆满后，在「修行」查看渡劫准备，再核对入场成本；确认并完成倒计时后，完整准备与入场一同保存。入场先问心，再安排当前天劫战策，三关后仍由你确认收卷。失败后可保留现状重新筹备；有有效检查点时也可查看完整恢复，让物品、年月、配装和人物选择一起回退，不只补渡劫引。'},
  ending:{title:'收卷与生平',hint:'此卷已保存。可查看生平、导出进度，或恢复已有检查点。',body:'此卷的结果已保存，可查看和导出生平。两种飞升选择都是完整收束，不开启上界新地图；主动归隐与寿尽分别记录。已有完整准备检查点时可选择恢复，新人生则需明确重新开始。'},
  save:{title:'本地存档与备份',hint:'本地存档不是云档，请主动导出备份。',body:'进度只在当前浏览器与站点保存，不是云档。请主动导出需要保留的进度；清理站点数据可能丢档。普通导出不包含独立准备检查点，导入后不会虚构可恢复的检查点；演示存档与正常进度分开。'},
}as const;
export type GuideId=keyof typeof text;
export type Guide=Readonly<{id:GuideId;title:string;hint:string;body:string}>;
export const guideCatalog:readonly Guide[]=Object.freeze(Object.entries(text).map(([id,value])=>Object.freeze({id:id as GuideId,...value})));
const guide=(id:GuideId)=>guideCatalog.find(value=>value.id===id)!;
const mortalCultivation=Object.freeze({...guide('cultivation'),hint:'先到洞府自然吐纳。修为满后核对引气条件，再确认入道。'});

/** Read committed facts only; guidance never grants resources or changes Game. */
export function guidanceFor(game:Game|null,result:ActionResult|null=null):Guide{
 const ruleContent=contentForGame(game);

  if(!game)return guide('welcome');
  const phase=gamePhase(game),current=result?.runId===game.core.runId&&result.revisionAfter===game.core.revision&&result.phaseAfter===phase?result:null;
  if(game.status!=='active')return guide('ending');
  if(phase==='opening')return guide('opening');
  if(game.battle)return guide('battle');
  if(game.trial)return guide('trial');
  if(phase==='event')return guide('causality');
  if(current&&['SCHOOL','LEARN','EQUIP','FORGE','EQUIP_RELIC'].includes(current.type))return guide('equipment');
  const cycle=current&&['SOURCE','BUY','CRAFT'].includes(current.type);
  if(current&&!cycle&&Object.entries(current.delta.inventory).some(([id,n])=>n>0&&ruleContent.items[id]?.kind==='material'))return guide('materials');
  const realm=ruleContent.realms[game.core.player.realm];
  if(game.core.player.hp<realm.maxHp||game.core.player.mp<realm.maxMp)return guide('recovery');
  if(game.core.player.xp===realm.xpCap)return guide(game.core.player.realm==='spirit'?'trial':'breakthrough');
  if(cycle)return guide('materials');
  if(game.school===null&&C.rank(game.core.player.realm)>=C.rank('qi'))return guide('equipment');
  return game.core.player.realm==='mortal'?mortalCultivation:guide('cultivation');
}
