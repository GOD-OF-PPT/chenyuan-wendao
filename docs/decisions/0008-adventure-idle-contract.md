# U6 行旅与逐回合战策合同

2026-10-21，实施前确定；基线 c2c758a，codex/goal-3-idle-adventure。只改 TRAVEL / ENCOUNTER / BATTLE 三类，承接 Goal3；U7 的机缘、入劫、问心、收卷不代选。兼容/环境性能开发与测试继续暂停。数值与下列秒数均未平衡，不是长期节奏或真人认可。

## 来源与项目推导

- [Melvor 官方 v1.2 历史更新](https://news.melvoridle.com/major-update-v1-2/)把自动进食阈值直接放入战斗界面，并改进气血可读性。本项目采用药物阈值/授权余量就近可见，不采用其数值。
- [Stone Story 官方教程](https://stonestoryrpg.com/stonescript/intro_tutorial.html)通过气血/敌种条件及顺序控制自动行动，资源限制执行；[官方手册](https://stonestoryrpg.com/stonescript/manual.html)提供敌方状态，暂停与离开分别处理。本项目采用封闭、可解释战策和有限药物预算，不引入脚本语言、30fps结算或竞品经济。
- 上述为资料调查，不是竞品完整试玩。下面周期、安全阈值和实现细节为本项目推导。

## 参数与规则

复用正式 resolve/intent/stats 和已有活动/双时钟/原子事务，禁止新引擎或第二调度器。行旅一次6秒，到达即停；遭遇一次30秒，仍消耗正式1游戏月；斗法每正式回合3秒。无离线补发。查看、选敌、配置、详情即时；接受后真实递减，到期保存，保存成功才改变状态。

Activity v6，旧 v1—v5 形状不变。计划封闭联合：

- TravelPlan：kind travel、location、maxCycles=1。
- EncounterPlan：kind encounter、enemy（六种普通敌人之一）、maxEncounters 1—50、maxCycles 1—2050（每场入场加最多40回合）、target（该敌正式掉落的物品及库存数量或 null）、monthBudget、remainingMonthsReserve、mpBudget、strategy。默认一场、41动作、目标null、月预算1、余寿保留1、灵力预算480；多场须玩家明确扩大授权。不旅行，不换敌，不战外服丹或自动疗养。满修为仍可合法取战利品。
- BattlePlan：kind battle、enemy、trialStage（当前关或null）、mode auto/single、maxCycles。single 还带 move（七正式招式），maxCycles=1；auto 带 mpBudget、strategy，默认当前关剩余最多40回合。固定敌人与当前天劫关；阶段改变即停，不连打下一关。

strategy：priority 四种 attack/guard/technique/release 的严格全排列；respondHeavy boolean；releaseAt 1—3；healBelowPercent/restoreBelowPercent 0—100；healingBudget/spiritBudget 0—50；healingReserve/spiritReserve 0—999999；retreatBelowPercent 0—99；riskMode pause/flee。默认剑意3/符印1释放，优先release→technique→attack→guard，响应重击；药物各最多min(库存,1)枚，库存保留0；有药授权时气血50%/灵力25%启用，没授权时对应阈值0；危险线20%，默认暂停。所有当前默认预算与危险策略开始前可见，可编辑，不收入回补累计预算。

顺序：身份/场次/总动作/目标/游戏月与余寿边界→危险线→授权服丹→应对重击（满剑意正式打断，否则护体）→授权回灵→优先级中合法招式。技能/剑意/符印不足可选下一招；容量、人生/境界/阶段等真实错误必须停止，不能退化为无限护体。使用正式预演判定净伤害/败退风险；自动已知会败退时按显式pause/flee策略处理。单步保留玩家明确的合法冒险，不把暂停当撤退。flee 正式扣8气血（最低1）、回洞府并结束本轮天劫，必须提前明示。

累计真实 costs.mp/items，不从净灵力或净气血倒推；分别记录入场、出招、胜利、败退、撤退、药物/灵力消耗、战利品/灵石与净气血灵力。普通胜利才发战利品；天劫胜利按正式规则生成下一关且无普通奖励，本活动在该边界停止。敌意显示“原始伤害”，不可误称未计护体/法宝/打断的净伤害。最近8行按实称呼，不伪称完整战报；完整原子回执仍可查，必要的本安排回合记录通过已有回执存储只读分页，不另建存储。

## 持久化与接线

v6保留原始/当前决定 Game 快照（固定大小，不累计整场Game历史）；正式前后 resolve 精确证明命令、敌人、回合、剑意/符印、阶段与实际费用成果，下一指令从真实当前状态与有限战策派生并校验。状态变更失效保留原决定证据，不能拿后来Game重验旧奖励。沿用stable cycle id/run/revision/owner/generation/CAS；v6周期回执沿用v2 proof，v1—v5旧校验不削弱。DB8隔离仍允许三类短写的旧DB7客户端，保留原件/检查点/活动/配置与历史回执。合法旧普通回执先重放，新普通三类写入拒绝。

App把旅行后查看意图绑定travel activityId/runId/navigation token，只在真实抵达提交后恢复原页面/草案。查看/追踪不旅行；玩家明确旅行后也不暗中采集/采购/开战。导航改变、暂停/失败/接管/人生变化不得让旧回调抢页。战中保留专属敌方舞台、双方状态、剑意/符印、下一招原因、有限战策与手动接管；读秒/暂停/已存累计复用既有活动控件。普通回合克制反馈，胜败/危险/待决定突出；降低动效仍有静态结果。复用现有九敌画与场景；新U6专属UI预算45000B，旧全部预算不放宽，不添加依赖。

## 验收与回滚

纯规则覆盖六普通敌、剑符/招式/四法宝真实效果、七手动动作、预算累计与保留/目标/无收益/容量、胜败/撤退/40回合、天劫关末与待决定。实际IndexedDB/Store覆盖DB7保留、截止前零变更、原子失败/中止/丢回复/同命令重放、暂停/刷新/接管/旧代际/换人生。固定1440×900单Chromium实走选择→有限安排→真读秒→回合→停止、手动接管与旅行草案恢复；至少真实6秒行旅和3秒回合、30秒遭遇，长组合虚拟时钟只证明规则。相关现有回归、类型/构建/资产预算及实拍逐张复核；不跑兼容/环境性能矩阵。

只U6完成检查后本地独立提交；更新tasks/杠精审查并以源码/受测/提交/冻结/HTTP hash核对更新56884。更新前后只读原用户进度，不用其Game测试。原8修改+5未跟踪、原输入/v0.3/旧失败与冻结保留。回滚以新提交停止v6调度/退UI但保留DB8读取与原件，不能降库/直接旧程序。不给整体游戏、美术、长期平衡、候选或真人验收签字；原生Goal blocked保持真实。
