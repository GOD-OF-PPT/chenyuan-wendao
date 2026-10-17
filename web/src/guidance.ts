import * as C from '../../src/full/content.ts';
import {gamePhase,type ActionResult} from '../../src/full/contracts.ts';
import type {Game} from '../../src/full/types.ts';

const text={
  welcome:{title:'从第一选择开始',hint:'三种开场都可入道，先看选项代价，再选择。',body:'先创建道号，再决定怎样处理破庙的一枚丹药。三种开场都有入道途径；约30分钟只用于理解玩法，不限定到达境界或通关时间。'},
  opening:{title:'破庙的一丹一念',hint:'三种选择都可入道。先核对代价，阅读不耗游戏月。',body:'先看选项旁的代价，再选择赠丹、交易或保留。选择会留下不同因果，但不会直接赋予境界；读正文与查看资料都不消耗游戏月。'},
  cultivation:{title:'修为与游戏年月',hint:'到洞府积累修为，比较辅助修炼的代价；修为满后筹备突破。',body:'引气入体前先在洞府自然吐纳，入道后再比较灵石辅助的收益与代价。行动立即结算，游戏月由行动消耗；阅读、切换页面和离线都不推进成长或寿元。修为满后会停止批次，仍需核对下一步准备。'},
  materials:{title:'材料与取舍',hint:'在行囊看用途与配方，追踪短缺物可找到来源。',body:'在行囊查看用途、配方和当前数量；追踪物资可逐层找到缺口与来源。前往只旅行或定位，不会代买或自动炼制。灵石也用于辅助修炼、采购和研习，花费前可比较要为突破保留的预算。'},
  equipment:{title:'功法与搭配',hint:'在修行页择法、查看配装；比较剑意释放与符印引爆。',body:'在修行页选择剑修或符修，再查看已掌握、已装备与境界条件。剑修比较积蓄与释放，符修比较持续灼伤与提前引爆；金丹后可炼成本命法宝，炼成后还需装备。未决事件和战斗中不能换装。'},
  recovery:{title:'疗养与战败',hint:'战斗内丹药占回合；战后可回洞府疗养，零灵石也有恢复路线。',body:'受伤或缺灵力时，可在战斗中服用对应丹药，但会占一个回合。战斗结束后可回洞府疗养；零灵石、没有丹药也能在余寿足够时疗养，再采集或做委托。查看配装与来源不耗月，疗养和取材的游戏月成本仍需核对。'},
  breakthrough:{title:'核对突破清单',hint:'先核对当前目标的修为与消耗；达标后仍由你确认。',body:'引气入体先修满凡人修为，这一步不要求突破丹；之后普通突破需同时满足修为与相应突破物。先核对当前目标，再比较确定取材、替代采购和炼制成本。材料齐备不会自动突破；点击确认后，消耗与境界变化一起保存。'},
  battle:{title:'战斗先辨意图',hint:'先看下一回合意图；攻击与护体可回灵，丹药占回合。',body:'先看敌方下一回合意图，再选择攻击、护体或术法。基础攻击和护体可回灵；丹药占一个回合。剑意满层终结可打断重击，符印可等持续收益或提前引爆；刷新会保留已提交回合。'},
  causality:{title:'选择与回响',hint:'先看选项代价与条件；可查看行囊和人物，再返回遭遇。',body:'选项的代价、条件和已知即刻结果可先核对。未决事件中仍能查看行囊和人物，但不能借旅行、修炼或换装绕开选择。仙缘与生平只记录实际来路；没有人物援助也保留主线。'},
  trial:{title:'突破与渡劫',hint:'先核对必需与可选准备；正式入场会保存完整检查点。',body:'化神修为圆满后，从修行页核对必需条件与可选准备。正式入场前会确认消耗；完整准备与入场一同保存。失败后恢复会让物品、年月、配装和人物选择一起回退，不会只补发渡劫引；三关仍要实际完成。'},
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
  if(!game)return guide('welcome');
  const phase=gamePhase(game),current=result?.runId===game.core.runId&&result.revisionAfter===game.core.revision&&result.phaseAfter===phase?result:null;
  if(game.status!=='active')return guide('ending');
  if(phase==='opening')return guide('opening');
  if(game.battle)return guide('battle');
  if(game.trial)return guide('trial');
  if(phase==='event')return guide('causality');
  if(current&&['SCHOOL','LEARN','EQUIP','FORGE','EQUIP_RELIC'].includes(current.type))return guide('equipment');
  if(current&&['SOURCE','BUY','CRAFT'].includes(current.type))return guide('materials');
  const realm=C.realms[game.core.player.realm];
  if(game.core.player.hp<realm.maxHp||game.core.player.mp<realm.maxMp)return guide('recovery');
  if(game.core.player.xp===realm.xpCap)return guide(game.core.player.realm==='spirit'?'trial':'breakthrough');
  if(game.school===null&&C.rank(game.core.player.realm)>=C.rank('qi'))return guide('equipment');
  return game.core.player.realm==='mortal'?mortalCultivation:guide('cultivation');
}
