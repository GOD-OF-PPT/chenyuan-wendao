# UX20 天劫阶段目标与收卷查看合同

2026-10-28；基线57cdd18807a05a202b066fa5894167a4df3ac91b/codex/goal-4-online-recovery，上一UX19为progress，get_goal当前active。原话/本合同/plan/tasks/13保护先于实现。仅本项P1-02及相关P2-01；UX21完整恢复、帮助旧称/封卷构图等保后续，不扩大新玩法。

## 真实阶段与展示边界

默认追踪breakthrough且无来源focus时，active trial阶段应有专属当前事实与一个查看动词：问心0→查看问心选择；当前一至三关→查看当前战局；stage4→查看收卷选择。使用正式gamePhase/getTrialJourney（完成关数/当前/未开始/问心原记录），不能按境界pill渲染已消费渡劫引或按满XP冒已飞升。仅stage4说明三关已过、尚未收卷、无需再筹入场引；两结尾不判高低、不代选。已封卷不冒待选。

新增trial-goal.ts与TrialGoal.vue合计≤6000B纯展示，只为本次新阶段物件/事实/动词，不迁移旧控制器、规则或成果时钟；0bitmap/新Store/DB。旧GoalBoard/七表现45000B保持，GoalPanel19000B保持（当前18259）；playable-flow59993/60000本项不动。以阶段印记/当前天门事实组织对象，青黛/玉色/旧金沿既有主题；全文18、辅助14、44操作与八入口一屏，不内滚/缩字/裁切。

GoalPanel新专属查看通过显式只读current事件交回App：非战中打开原current/NarrativePanel，战中回原主舞台BattlePanel。不经会自动安排异地旅行的通用navigate；不调用act/BEGIN/END/Store写入。App主舞台/当前阅读标题使用同一纯阶段模型，普通机缘/开场/封卷原返回保持。切换目标物/来源时仍原完整GoalBoard/全部目录、预算/来源/只读栈；新阶段视图不能吞其它追踪目标。普通突破目标的XP条补实际可见“修为x/cap·已圆满/积累中”，明确与丹药缺口分开，不改进度值。

阅读、查看/切页/预选即时；问心6秒、逐招3秒、结尾12秒沿原冻结确认/有限一次安排、保存失败/原命令重试与完整原子结果。有限授权不代选/续关/发奖/新人生，旧回执不重演。运行/暂停/停止与刷新仍当前事实，不伪造未提交成果。

## 验收顺序

1. 新具名检查在旧源实际复现目标页渡劫引/缺少阶段查看；先保真实红。三问心/天劫关与stage4按正式合法fixture，不伪称正常赚取；另保原正常全路线责任。
2. 同源固定1440×900/font1/单Chromium验证五阶段实际事实/唯一查看/全部Game及全DB只读、返回与焦点/八入口；普通目标/物品追踪保全。三关后两结尾都沿原Narrative预选、取消、确认12秒/11999不结算/完整正式Game/唯一回执/刷新；实际一轮12秒在线收卷另验。真实quota原意图重试定向检查，不放宽原时限/断言。
3. 新纯模型与相关旧规则/正式queries，旧milestone/mainline/目标面/UX19当前回归、资源正向/受影响旧cap与新固定cap守卫/类型构建；当前仅必要实际改动检查，不跑兼容/环境性能。源冻结后验证，不让HMR/测试编辑冒新源绿。
4. 本地独立提交，核Git运行blob/受测-重建-冻结/HTTP同源；原试玩更新前后只读核保存与停手及进度，不用用户档测试。tasks/GJ据证更新；接着强制CHECK-ART18-UX（ART18/UX19/UX20三项），再UX21。整体艺术/长期/真人、ART17性能四红/全部最终矩阵/干净包/最大review仍未完成。

## 风险/回滚

阶段印记不能冒飞升、完整旧GoalBoard不能被v-if误隐藏物资追踪/来源栈；普通XP说明不能使完整内容/按钮越界。只展示当前Game，不按revision额外清阅读或重建活动时钟。原查看归属/父返回由App负责，新组件只发Event；范围变化不沿旧view写入。错误与运行中仍可阅读，原执行门槛/重试不动。新模块预算因新增阶段展示独立设定，不能搬旧实现/抬旧帽；实际bytes/hash与consumer须守卫。

回滚仅本项纯展示/测试/ledger，用revert保旧源可读，不改DB9/原存档/13在途/原图/历史/失败。研究复用game-studio→game-ui-frontend与XAG109目标、XAG114可预知上下文；具体阶段/6-3-12秒/6000B/印记构图皆本项目规则/推导，非来源规定或认证。

[杠精审查] 计划通过：需真实目标与主舞台消费、合法五阶段/两结尾与12秒原子检查，不能只换文案/图框或以合法导入冒正常全路线/玩家理解；其它P1/P2仍保留。

## 本轮真实保存等待补充

原生full-state事务被持有时，已安排END的12000ms届满进入保存中；新只读阶段入口因误用执行enabled被禁用，reading-red-report保存真实红。只移除新TrialGoal的执行enabled属性/禁用绑定，仍用原App的只读openHub/selectTab；原Narrative与Store的busy/running/available/原意图写门槛不变。保持原收卷command/完整Game，释放事务后只提交原一次成果。该例不冒原生abort或长期节奏；旧d43a0f56回归运行包与新待验源码分开，当前preview无HMR，不把旧包绿灯称新源通过。后续重新冻结/同源当前检查。

一手回读链接：[XAG109目标清晰度](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109)、[XAG114界面上下文](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114)。本轮取当前目标、已完成事实和交互前可预知的行为；不据这些来源推导本游戏成长速度或已通过用户验收。
