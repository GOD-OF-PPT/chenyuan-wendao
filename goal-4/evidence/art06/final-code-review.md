# ART06 source3：单独静态复核

**阅读更正：原文“完成后可能失去当前正文”遗漏了App的FateCatalogue分支，推导不成立；已获原A17真实结果为转入仙缘回看，并非空白。原判断按历史保留，当前结论以文末“开场分支更正与source4待验接线复核”为准。**

2026-10-24。基线237686d，当前冻结sourceDigest `a1124e01285b89c9f4da65ecb35b24ec39b9ef4adceaacb5e5a8faf00c7a96cf`，合同0029。本次只读当前diff、正式调用链和冻结清单，未运行测试、类型构建或浏览器，未接触56884用户存档。审阅者参与了helper/Host/Gate实现；对这些是自审，对App/Training接线是交叉复核，不能冒称第三方独立验收。

## 当前发现：开场普通详情仍需实测核对

P2，App.vue约679行的普通`current`开场分支仍为原`opening-heading/story/ChoiceCard/opening-details`，没有MilestoneGate。正常入口是主舞台“查看三种选择与剑简说明”。完整三选/成本/原确认仍保留，但药匣对象及Gate本地6秒状态没有覆盖这个查看面。

更具体的后续条件：该页安排CHOOSE后，如果保留`hubView='current'`直到完成，phase从opening变idle；App137的storyView变true，NarrativePanel要求`narrativeFor(game)`而idle返回null；TrialCatalogue的current分支排除idle；旧content-panel要求!storyView；handoff又只在hubMain启用。因此静态条件推导会失去当前正文，只剩页头和返回等外层入口。未发现phase变化后自动返回home的代码。推荐实际路线为“home查看完整三选→current确认一次CHOOSE→原6秒首次提交→核完整Game、当前正文/明确下一步和返回”；**本次没有运行该路线，不能将推导登记为已复现红例，也不能据此改写现有真实红绿证据。** 已向root报告，修复/补验由当前冻结流程协调。

## 已核对的接线和不变量

- Host无key且slot-only，位于App常驻外层，覆盖主舞台/realm-keyed TrainingPlanner/入劫准备。提供两个独立窄域见证：v1只CULTIVATE；v7只CHOOSE/BREAKTHROUGH/START_TRIAL，没有扩大ART05原六域。
- v1冻结真正running周期的command、method、原realm与完整Game；saving不从前移的nextCommand改写原对象。Site按run+realm+method筛选。target小表最多8项，短成果不会因为下一合法周期开始而失去原来源，也不作为命令、存档或奖励。
- v7冻结originGame/真实action；完整原始/结果Game、公共结果和completeActivity仍由原共享proof核对。阶段交接仅输出真实phase/realm变化后的文字，不把旧境界成果光挂在新actor上。Host在本轮post flush锁定sequence；handoff/active撤下清锁，返回不重新认领窗口内旧结果。Gate的不同choice使用canonical比较；预选/阅读本身不执行。
- 原共享`activity-effects.ts`与`use-activity-effect.ts`只有extra类型联合各增加`|1`（合计+4B）。默认extra=0、显式4/5/7、默认2/3/6、version0拒绝、完整proof及私有脱敏回执守卫均未修改。
- 原hook的hidden/active/available/error/activityPausing及活动id/generation/owner失效清理保持。局部valid也按实际错误/暂停阻断；不每Game revision清合法末轮成果。clock/progress来自原runtime，不参与结算。当前仅静态核对这些连接，不据此宣称所有浏览器生命周期已通过。
- App startTraining/阶段新确认使用`error && (canRetry || syncIssue)`门槛；原retry、显式cancel后fresh确认不被历史error永久锁住。原MilestoneReview、入劫准备检查点、完整原确认和各自时长没有改写。Site主按钮调用原startCultivation；无新的发奖、消耗或存储observer。
- TrainingPlanner原plan构造、savedPlan精确回填、目标1/5/20/50与非默认轮数、累计预算/保留、离线说明均仍在原文件。完整参数通过slot呈现，未搬出原规则以逃旧预算。普通详情真实祖先不是game-content，相关样式使用实际app/详情宿主。

## 身份、预算与证据边界

只读重算：新七文件44156/45000B，ART02 44996/45000B，旧修行组21251/22000B，原playable组59787/60000B，GoalPanel17254/19000B。未提高原cap；新位图独立预算由root资产证据负责。本次未重新执行资产守卫或把ledger存在当作视觉合格证明。

`source3-a1-inputs/build.json`与`source3-focused-inputs/build.json`的234个runtimeSources均与本次读取的现文件逐hash一致，sourceDigest同为a1124e01全值。`git diff --name-only -- src/full web/src/store.ts web/src/activity-runtime.ts src/persistence`无输出；正式引擎/费用/规则/Store/DB链没有本轮diff。此比对是源身份/静态范围证据，不代归档/HTTP交付、实际原子保存或完整矩阵。

root通知的新16/原生/核心检查尚在本轮执行；本报告不写当前通过数量、不将旧纯规则绿灯重贴为当前完整轮。两张实际像素另见final-art-review.md。上述普通current开场待核对项关闭前，本报告不作“本项无已知未决问题”的结论。整体游戏感/美术、长期平衡、最终完整矩阵与真人复验仍开放。

## 开场分支更正与source4待验接线复核

2026-10-24后续。root已反馈source3原A17为真实失败；saved帧实际显示仙缘回看。初次静态审查漏读`FateCatalogue v-if="storyView&&(hubView==='fate'||hubView==='current'&&phase==='idle')&&game.status==='active'"`，因此“正文空白”推导错误，不能继续作为产品缺陷。实际问题应表述为开场普通详情没有药匣对象，完成后进入仙缘而下一步不明确。未修改原失败、断言或Game来匹配误判。

本次只读核对root的新改动，不跑UI/测试/构建：

- 普通current的opening分支现已用MilestoneGate包住原标题、完整正文、三张原ChoiceCard、各自成本/详情/原因及剑简说明。Gate没有添加写handler；原MilestoneReview/确认/CAS仍沿原链。kind=opening时，只接真正CHOOSE运行见证；总6秒和剩余秒来自原runtime，未将预选变成执行或加假等待。实际祖先/18字/展开说明/保存中布局仍须新冻结UI证明。
- 新导航只在当前current、真正非重放action CHOOSE、phase opening→idle、lastFromActivity、owned v7 CHOOSE、当前run和结果revisionAfter等于当前Game时调用selectTab('修行')。该函数只清本地查看返回/inspection和改变导航，不执行Game、不接受新命令。这里的普通完成后返回主舞台没有自动修炼或旅行。
- current→home两边都在Host.active允许集合中，布尔active保持true，runId不变；原共享watch不会仅因hubView字符串换成home清tracker。Host常驻无key，保存的running target不依赖旧Gate继续挂载；App observer即使先改变导航，后续同轮可信observation仍可在同Host消费。本次停止status不触发每revision清理。handoff从false变true后，Host post-flush只接本次effect sequence，输出文字而非给新actor/新Gate补旧光。上述为代码时序核对，尚不代真实6秒与绘制帧验证。
- captureStageReturn只把cultivation加入原允许来源。stageOrigin仍保view/tab/原detailParent/opener和outer opener，closeHub仍优先恢复local再恢复其parent；因此从修行详情进入goal/character/receipt返回会先回修行详情，再沿原parent返回，不把写命令或新授权存入返回上下文。没有新增每revision清草案、隐藏表单重建时钟或新存储写入。

当前未发现上述小改动中的具体代码阻断。source4尚待统一冻结和真实复验，不能把本静态结论写成A17、原返回例或全部阶段UI已通过。原source3两张像素仍只代表原source3，不继承给新App/后续美术调整。
