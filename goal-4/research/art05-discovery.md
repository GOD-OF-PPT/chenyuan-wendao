# ART05 只读调查结论

2026-10-24；HEAD291eed98695b1bbce9e61a1669ff9de752f27ee8，当前只有原13在途。已完整回读Goal4 input/plan/tasks、根AGENTS、0017与0009，实际查阅Riot清晰度、XAG114与inkle选择语义手册，来源事实/项目推导/局限分列于art05-sources.json。未改运行源、规则或测试，未运行UI/build、不读用户56884存档，也未查看图片。0027合同与分工尚待主控确定。

## 真实接线与不可丢的边界

| 玩法 | 现在的真实调用链 | 必须保持 |
| --- | --- | --- |
| 人物来往/机缘 | FateCatalogue的getRelationships/getStoryContext/availableEvents派生真实人物事实；`act(EVENT)`→App.storyAct→act→selectMilestone→MilestoneReview→confirmMilestone→Store.startPreparedMilestone | 查看人物、翻页、同地定位不行动。正式EVENT仅当前地点6秒拜访，完成停为待回应，不旅行/代选/提前领奖。待会面只在gamePhase=event查询NPC，不能把问心当NPC。 |
| 回应/问心 | NarrativePanel的narrativeFor给当前DECIDE/ANSWER_TRIAL/END；选项按钮只设page，ChoiceCard核对→storyAct，前两类走原里程碑确认 | 全选项名称/完整代价/正文/详情可读，6秒一次回应/问心；条件变化不改选，不自动接下一关战策。ChoiceCard的identity/epoch/停用关闭及迟到打开取消保持。 |
| 两个飞升结尾 | END→App.reviewAscension→冻结PreparedMilestone及getAscensionChoices→confirmAscension→startPreparedMilestone | 两结尾均12秒，完整生平与结尾说明/取消/原命令retry保留；实际status/ending成功后才封卷，不附赠上界玩法或自动新人生。 |
| 归隐/寿尽 | LifeCatalogue.end→requestEnd→冻结record与PreparedMilestone→原lifeDialog→confirmEnd；retryEnd只重试原command | RETIRE不耗余寿，END_LIFE仅余1游戏月且耗最后一月，均12秒、明确不可撤销确认；关闭原确认才显式discardRetryFor，不因换页清原意图。 |
| 生平导出/恢复/新人生 | getLifeRecord/lifeReadings为只读，exportLife只导出文本；restore/reset沿App原确认与Store.checkpoint/restart | 全四篇、库存/身份/版本/恢复范围全文保留。导出生平不是完整存档，恢复回退完整准备；不得自动恢复或开启人生。 |

CHOOSE开场当前仍在App主页的ChoiceCard，不在narrativeFor返回域；START_TRIAL也沿独立Trial确认。ART05改NarrativePanel不能自动宣称覆盖这两个入口，范围由0027明确，不擅自扩写。

阅读部分应留在原父组件：textPages按140码点保留全部字符与标点；useReadingMemory按context与row.key+part保留，post核对避免Game先到/观察后到竞态。人物/分类同选不归零，人生/真实phase/activeEvent.instanceId/同步才更新叙事context。journalAnchors只用可连续核对的本地正式非重放行动计数（EVENT0，胜利BATTLE2，其余当前1），含100条截断与重复文本；外部未知进度明确回落，不凭revision差或indexOf伪造同一条。

App.showLife/closeHub的readingReturn同时携带run/context、原view/tab/opener与一层普通parent；普通详情→生平→返回的原顺序必须保持。Fate/Narrative/Life各自KeepAlive key按人生/readingGeneration，Life还按真实status；不要把它们改成每revision或每选择重建。主导航仍清临时返回，不增加无限导航栈，不缓存命令。

## 对象化建议与实际风险

仙缘可用人物帖/可辨肖像与当前来往信物，真正操作是翻已记事实、看下一来往、查看拜访安排；不造交情数值表或假送礼玩法。对话可用当前人物与回应签，所有预选仍只读、原ChoiceCard作为唯一核对入口；已保存回应与未来预览分别标记。生平可用可翻卷册/四书签与真实收卷印，完整正文仍由现有Reading DOM呈现，归隐/寿尽/两结尾保留原确认。优先复用既有四人物/玩家肖像、场景与SVG，不把半身画声称全身动画。

技术上新wrapper宜只接对象/只读阶段和slots，原reading/page/quote/action/cache留父；不是搬旧逻辑逃预算。每个玩法可以有轻微按下触感、运行中的专属灵息、原子成功后的局部落墨；不把一次阅读强加耗时或逐条领奖。当前全局ActionFeedbackStage已有dialogue/closure短印章与nextTick/rAF绘制握手，新局部TA须在0027明确唯一归属与回退，避免两个相同印章抢正文；阶段完成后短效消失仍有真实事实/生平可查。

两条需先真实红例的静态风险：

1. App.immersive仅active，真正归隐/寿尽/飞升后LifeCatalogue仍在但不再有immersive-stage；新卷册若只按该祖先写CSS会漏真正封卷态。固定桌面两种实际status都须验，不能用活跃态预选收卷代替结束画面。
2. 当前Fate/Narrative/Life输入、App.can与Store.prepareMilestone不检查error且(canRetry或syncIssue)。接受安排失败且尚无running活动时，可能新开另一意图并覆盖原待重试闭包；应复用ART03/04同样的新执行门槛，只读/预选不挡，原retry保留，显式cancel已释放pending后历史error不永久锁。此处尚未跑浏览器红，不把静态风险冒称已证产品缺陷。

v7完整originGame/outcomeGame已由milestones.ts正式resolve与validateMilestoneTotals/Result证明。现共享hook显式extra只0/4/5、默认2/3/6；不能直接宽放7或只比较delta/公开观察就给新叙事对象发光。DECIDE成功后Narrative会停用，END后又切Life，因此若采用局部proof，须明确其提交前可见的真实本地runtime与跨语义完成的展示归属；刚挂载的结果页不得凭旧v7快照补演。原有global反馈可作为复用入口，但它不替代新局部完整证明与生命周期验收。

## 当前预算与待验

实际文件合计：story-journey47711/48000B（余289），stage-r413962/14000B（余38），idle-milestones15744/30000B（余14256），ART0244997/45000B（余3）。旧cap均不涨；新对象/TA代码范围须在0027先落实，不能把旧分页/缓存移到新预算。当前没有提出新玩法、引擎迁移、兼容或环境性能任务。

后续至少保持原四人物/全部事实与未来全文、100手记/重复及0/1/2日志、四篇全部字符、普通/生平逆序返回、同人生问心重入、原确认与原意图retry、真实6秒拜访/回应及12秒封卷、保存前零Game/完整原子结果、暂停/接管/刷新/外页/图失效/减动效。新对象的错误横幅、长文每一页18px、14px辅助、44px目标、正文与印章外缘/页码/主导航均须实测矩形与逐张像素；机器通过不代表整体艺术或用户认可。当前均为未执行的验收义务。
