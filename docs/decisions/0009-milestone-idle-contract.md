# U7：机缘、破境、问心与收卷的有限安排

2026-10-21。实施前合同；承接Goal3 U6（实现4b8cd67、资料d1eca99），本轮仅U7。兼容、环境/性能矩阵继续暂停，不提前执行CHECK-IDLE-02或U8。沿用0005/0006/0007/0008、已有正式规则/活动时钟/原子仓库/主题资产/游戏界面及试玩Skill，不创建新引擎或工作流。下列秒数是未平衡初值，不承诺成长用时。

## 授权与参数

只覆盖剩余九类正式Action：CHOOSE、EVENT、DECIDE、BREAKTHROUGH、START_TRIAL、ANSWER_TRIAL、END、RETIRE、END_LIFE。新v7计划为`{kind:'milestone',action:MilestoneAction,maxCycles:1}`；MilestoneAction严格收窄为这九类，不能夹带command/run/revision、额外字段或下一动作。内容、成本、实际条件由正式previewResolution/resolve生成；恰好一次的授权等于这一动作实际成本，不引入无限预算。阅读、翻页和预选即时；玩家明确确认后才开始在线周期。CHOOSE/EVENT/DECIDE/ANSWER_TRIAL各6秒，BREAKTHROUGH30秒，START_TRIAL15秒，END/RETIRE/END_LIFE各12秒。

EVENT只拜访当前合法地点并停为待决定，不旅行/奖励/代选。CHOOSE/DECIDE只执行当前选项，完整显示真实丹药/物资/灵石成本和因果/选择作用。BREAKTHROUGH仅本境一次，仍验证洞府/圆满/正式突破物，完成后停止，不自动修炼或下一突破。START_TRIAL保留渡劫引、满修为、地点、择法和八成气血条件，入场后停为待问心。ANSWER_TRIAL只保存预选答案并进入第一关，不自动出招，当前天劫后续战策仍由U6明确安排。END只在三关完成后保存所选两种结尾之一；RETIRE/END_LIFE必须明示不可撤销的收卷确认，寿尽仍仅余1游戏月合法。结束后保留生平，不开启新人生。

暂停、刷新、接管、换人生、失败/原命令重试沿用共享合同：暂停取消未完成周期，继续重新计时；关闭/刷新不补离线。保存中暂停以事务真实完成边界为准；已提交结果不能回退，未授权下一活动不能开始。收到外部进度或玩家换页后旧导航意图取消。新活动确认绑定Game与活动CAS，不把旧确认自动变成新授权。

## 严格数据与原子边界

v7保存完整originGame、outcomeGame（未完成为null）和真实spentItems/gainedItems/gainedStones/hpChange/mpChange/xpChange。ActivityBase的gainedXp只记非负新增，破境/飞升负修为由xpChange及正式回执显示；realm保留起始境界，不放宽为ascended。完成分支必须用originGame与稳定周期command重新resolve，逐字段证明完整Game/result/成本/选择/因果/trial/ending/milestones，完成即stopped、无下一command。旧v1—v6校验保持，STATE_CHANGED历史记录可读。

DB升9以关闭旧8连接；Game/内容/数值版本不变，原件/旧活动/配置/回执/检查点保留。v7回执强制带已有v2事务proof（activityBefore/stateAfter/resolvedAt），只在v7正式证明允许境界变化，旧guard不松。TICK同一事务写previous/current/activity/receipt；当resolve.checkpointKind非空，同时保存行动前Game及checkpoint-owner，不能第二事务补写。生平仍由已提交Game派生，不另造奖品或非原子历史。九类新普通execute/Store短路径拒绝ACTIVITY_REQUIRED；既有合法旧回执先按原合同重放并返回当前snapshot，不重复发奖或回退。

## 专属交互与反馈

复用NarrativePanel/ChoiceCard/FateCatalogue/TrialCatalogue/LifeCatalogue及既有画作：机缘先读正文与一项选择、选中再明确安排；破境围绕当前境界/缺口/本次投入与凝神；问心保留两答案实际作用和完整正文；收卷先读已走过的生平与结尾，明确安排一次。低频参数不增加通用表单，不要求逐周期领奖。一屏保留入口/正文翻页/返回，青黛墨绿、玉色行动、旧金关键进度，正文18px/辅助14px/控件44px不削减。

opening/event/question/ending等实际phase均显示当前v7读秒/暂停/继续；跨页仍能识别活动。已存原安排与未确认草案分开，查看旧安排不执行、不变成修炼。新完成才给真实阶段反馈；公共记录脱敏保持，旧回执/刷新不演为新奖励。重大凝神/问心/收卷效果只绑定可信当前周期，降低动效仍有读秒/真实结果；不遮按钮、不把动画当结算。新U7专属UI新增预算30000B，既有共享与其他UI预算不放宽，优先精简重复展示并复用原结构。

## 实施、验证和回滚

顺序：本合同/原话/plan/tasks先保存→纯v7适配与九类规则→DB9/检查点原子proof/Store确认→专属当前选择及阶段反馈→定向纯模型/真实IDB/Store/固定1440×900单Chromium/逐图审阅→独立本地提交→受测/提交/冻结/HTTP逐hash及试玩只读进度→tasks与杠精记录。只本任务，下一轮独立CHECK-IDLE-02。

九类都验证：安排不改变Game、提前1ms零结算、到期正式一次、真实成本/净变化、完成停止、未选分支无代选。破境全境及飞升负修为/realm/HPMP、故事合法与已完成、问心两作用/不接战、两飞升结尾/归隐/寿尽；篡改快照/命令/回执/旧owner/代际/时限拒绝。检查点与owner精准等于行动前Game；checkpoint/owner/activity/receipt故障或put后abort全部原子回滚并同命令重试；丢回复不重复。刷新无补发、暂停/接管/换人生/恢复、DB8→9旧记录保留和旧连接关闭；实际生命周期和恢复不以改物资冒充正常玩法。

仅运行当前改动和已有放置回归固定单Chromium，保留原超时/0retry/预算，不运行暂停矩阵。至少一条真实6秒选择与30秒破境；其余虚拟时钟只验证规则。根/Vue类型、构建、相关纯规则和资产正负守卫；截图图像ready后完整解码并实际审阅。所有失败/未执行保留。原13在途hash、输入/v0.3/用户档/旧冻结不变，不用用户档测试。构建期间不并行改运行源码；保持原dirty受测身份，提交Git归档与冻结/HTTP逐字节证明，不冒称干净候选。空间低300MiB停止重I/O，不删历史。

回滚用新提交关闭新调度或退UI，保留DB9读取与原件/旧活动/回执，不能直接降到DB8程序。仅本地codex分支，不推送/PR/合并/公开部署/改权限。原生Goal仍blocked、不重建绕过；复用automation-3。25动作适配、局部测试不等于整体美术/长期平衡/最终候选/真人认可。

[杠精审查] 实施前合同通过：九类有限意图与未知选择、正式资源/因果/检查点/收卷、真实计时/保存/专属交互及旧档边界均逐项覆盖；不是自动速通、软件审批表或单纯拖长动画。实现与验收尚未完成。
