# Full规则、查询与提交契约

日期：2026-10-16。T03落实纯规则/查询契约，T04—T06接通真实事务与正式网页，T07补充目标查询与显示偏好；各阶段验收见独立实施记录。

## 版本与来源

统一常量位于`src/full/versions.ts`：format=`chenyuan-full`，外层version=2，schemaVersion=2，contentVersion=`full-demo.3`，balanceVersion=`full-unbalanced.3`。存储结构仍为原Game字段；没有为显示阶段、目标偏好或检查点向Game添加副本。数值初值保持未平衡。

content版本更新记录本轮结束语义与机制分派变化。数值版本未变；根/web依赖锁也未变。未知format/version/schema/content/balance明确拒绝，不能清空重开。输入先限1000000个UTF-8字节，再解析与验证；字符数不能代替字节上限。

`parseGame`纯转换支持已知M1/Adventure、full-demo.1 / full-unbalanced.1，以及full-demo.2 / full-unbalanced.1。T10将这些已知格式升级到full-unbalanced.2；保留物资、游戏年月、境界、配装及选择，不追补费用或奖励。其他版本组合拒绝。原v1合法RETIRE唯一写出ended/lifespan，年龄仍小于寿限；转换时保留年龄、资源、事件/战斗与历史文本，将该已知错误标签改为retired。当前full-demo.2只有实际达到寿限的终态才能标lifespan。不推测未知版本、数值兼容或旧档没有的经历。数据库层必须保留原档后在副本上调用此函数，成功验证后再提交；纯函数通过不等于数据库迁移完成。

## 一个状态与派生阶段

持久化真源是`Game`。`gamePhase(game)`从status、trial、battle和core.mode派生：opening / event / idle / battle / trial-question / trial-battle / trial-ending / ascended / ended。UI的busy、saved、error和显示偏好属于会话层，不能写入另一套成长状态。

```mermaid
stateDiagram-v2
  opening --> idle: CHOOSE
  idle --> event: EVENT
  event --> idle: DECIDE
  idle --> battle: ENCOUNTER
  battle --> idle: 胜利或败退
  idle --> trial_question: START_TRIAL
  trial_question --> trial_battle: ANSWER_TRIAL
  trial_battle --> trial_battle: 关卡推进
  trial_battle --> idle: 败退后准备
  trial_battle --> trial_ending: 三关通过
  trial_ending --> ascended: END
  idle --> ended: RETIRE或END_LIFE
```

问心阶段必须存在同一run的trial_question实例；中间三关必须有对应battle；结束选择阶段必须idle、无未决事件/战斗且有trial_completed。不能导入“有trial但问心丢失”等无法继续的组合。

RETIRE明确表示主动归隐，不增加游戏年月。END_LIFE只在剩余一个最小游戏月且没有事件/战斗/渡劫时可确认寿尽，推进最后一个游戏月并停止此生；不读取现实时间，也不替玩家选择。仍能突破或准备时可自行选择其他合法行动。T12负责正式界面的原因、确认和恢复入口，不在本轮宣称已接线。

revision与expectedRevision使用非负安全整数，独立于背包/货币数量上限；不能因资源安全上限而使长期存档在第1000000次指令后无法提交。

## 纯结算与结构化结果

所有写入仍提交`Command = Action + commandId + runId + expectedRevision`。一次用户意图重试保留原身份和参数。非法指令、跨run或过期revision拒绝，原快照不变。

`resolve(game, command)`返回`Resolution { nextState, result, checkpointKind }`，不访问DOM、数据库、网络、随机源或现实时间。`advance`保留原有Game返回接口，内部调用同一个resolve。

ActionResult包含指令身份/类型、前后revision、请求/实际步数、实际停止code/message、前后阶段、版本、实际毛成本和净变化。净变化包含灵石/修为/气血/灵力/游戏月/胜场、变化物品以及境界前后值。回灵、同物品返还等不会把毛成本“冲成零”；文本日志不是奖励或扣费真源。

批次逐次计算，已执行步骤才计成本；如50次辅助修炼因预算只执行2次，结果记2次/40灵石并保留INSUFFICIENT_STONES停止原因，revision只增加一次。无成功步骤则失败，不产生假成功回执。

## 共享成本、门槛与查询

`costs.ts`提供`costsForAction`、`requirementsForAction`和剩余游戏月查询。正式结算与预览共同使用，覆盖配方/采购/学习/炼制/突破/渡劫/战斗消耗；UI不重写门槛或收益公式。

| API | 语义 |
| --- | --- |
| previewAction | 调同一个resolver，返回真实allowed/failure、首步成本、请求最大成本、实际成本/步数、净变化与缺口；不暴露伪造的preview指令身份 |
| costDeficits | 规则层资源缺口工具；ActionPreview已结合动作语义返回deficits，UI优先读取该结果 |
| getItemSources | 当前配置的重复来源、炼制、采购、战斗胜利奖励和一次性事件选项；T09增加可选第四参数kinds，缺省行为不变，可在预演前仅选择所需来源类别；未知物品/数量/类别拒绝 |
| getCurrencySources | 当前配置中稳定收入行动，包含真实地点门槛、行动成本、收益和前往步骤 |
| getActionResources | 任意动作的材料/灵石缺口及对应来源，可用于功法、法宝和配方筹备 |
| getBreakthroughGoal | 下一突破/渡劫的真实缺口；已进入渡劫时显示当前阶段，不再要求已经消耗的渡劫引 |

来源规划只在内存副本按合法指令预览“前往→行动”，从不自动执行采购、选择或合成。navigation只是一个待用户点击的前往指令。available表示列出的准备步骤当前可合法执行，不证明战斗必胜；战斗奖励始终标conditionalOnVictory。事件标记一次性，已领取不再可用。

未来境界无法进入的地点保留真实失败原因；无法算到最终动作时costs为null，不把未知成本写成0。最大预算不是批次启动的硬条件；allowed、executedSteps和stopReason来自resolver。所有返回值与输入Game、冻结配置之间无可变资源别名。

## 追踪目标与有界取材（T07）

`goals.ts`的`TrackingTarget`只描述显示偏好：下一突破、物资/目标库存、功法、法宝或事件。`parseTrackingTarget`拒绝未知/额外字段、非法ID/数量；`getTrackedGoal`复用共享查询，完成状态取自真实库存、learned、ownedRelics、choices或人生状态，不预留/补发物资。`trackingConsumption`只预演合法指令，返回会变大的材料缺口；`preparationConsumption`同样提示所选配方筹备受其他消费影响，不锁定实际行动。

`planCollection`返回待点击的SOURCE指令，不执行它：物资目标使用既有target参数与50次单批边界；灵石按共享缺口与配置每次收入规划最多50次，已齐或不产该资源则无指令。物资可能按单次固定产出超过库存目标，不能截掉本应得到的物资。实际步数、成本及停止原因始终来自resolver；灵石计划次数用尽只显示本批完成，不伪造TARGET_MET回执。

网页追踪偏好位于`chenyuan-tracked-goal-v1`（version/runId/target），不写Game或revision。坏偏好回退默认，偏好存储失败不改变游戏的已保存状态。来源面板使用浅层不可变导航栈，避免响应式代理进入纯引擎的structuredClone边界。跨标签页收到较新存档时清除本页旧操作反馈，不把旧回执当作另一页的新结算。

## 本境筹备信息（T09）

`getGrowthStage`读取当前境界、共享突破预览、实际库存/境界记录与配方，派生突破物准备情况、配方最高阶材料及确定/采购来源；材料缺口仍用costDeficits，来源仍用getItemSources。已持有足够突破物不再请求其配方材料；已开始渡劫/结束的人生不虚构新的渡劫引需求。记录数值来自已有milestones，不引入现实时间、奖励、材料预留或新的Game字段。

GrowthPanel自筑基起渐进展示这些信息，不自动替换玩家置顶目标。点击前往复用TRAVEL与普通导航，所有采购/取材/炼制/突破仍另行确认并通过同一原子存档。T09验证止于化神和本境材料，不代替T13—T15渡劫专用流程。

## 效果扩展边界

`mechanisms.ts`登记有限的效果和合法流派/槽位。引擎按配置的effect分派，实体ID仅作稳定引用。相同效果可用新事件、物品/配方、技能或法宝ID复用；新机制仍须实现resolver及行为测试。未知effect和错槽/错流派在配置检查中拒绝。

自动测试在隔离目录只改内容配置，加入一个事件、一种配方/药品、一门复用心法和一件复用法宝，使用相同引擎/查询正常取得、使用和保存；原engine、types、queries与主界面文件不变。该证据证明规则/查询扩展性；正式网页切换后仍需复验通用组件能展示新增内容，不提前代替UI验收。

现有故事requires只表示前置事件发生，不代表曾帮助或结盟。具体选项条件/文本变体由T11落实，本轮不增加未执行的条件字段。

## 事务适配器边界（T04/T05承接）

`contracts.ts`定义CommandReceipt、CommitOutcome和SaveCheckpoint：

1. 同一readwrite事务读取最新快照和原commandId回执。相同身份/参数返回原result并附当前最新state，避免重复奖励和界面倒退；同ID异参数拒绝。原expectedRevision随重试保留，已提交回执先于过期revision判断。
2. 未提交意图按当前状态调用resolve，再在同一事务写完整nextState、原Command/规范化fingerprint/result，以及需要的行动前检查点。事务内部不跨网络await。
3. BREAKTHROUGH与START_TRIAL成功分别返回breakthrough/trial检查点用途；检查点外置完整快照，绑定源run/revision/版本，不递归嵌入Game。失败不得保存半次状态或检查点。
4. 仅事务complete后发布CommitOutcome。abort时保持旧档并明确本次未保存，不能因重读旧档而改报本次成功。
5. 恢复完整准备快照时生成新runId、重建真实event.id实例、清理旧回执；准备检查点保留可重复使用。存在检查点是仓库会话数据，不从Game虚构。

真实数据库事务与正式Store已由T04—T06实施，详见[持久化契约](full-persistence.md)和[T06/CHECK-02](../implementation/goal-1-full-ui-cutover.md)。类型、纯解析或预览不能代替真实事务/页面故障测试。


## 经济审计与数值版本（T10）

灵石辅助每次仍耗1游戏月，炼气20、筑基30、金丹44、元婴58、化神72灵石；以共享costs/getActionCosts为唯一行动费用，UI预算/预览/实际扣费同步。数字仍是未平衡初值。自然吐纳、基础产量、物价、配方、战斗和寿元未因现实时间改奖。

EngineLedger只封装真实resolve，逐次记录指令身份、实际毛扣费/净变化/毛获得及期初期末；毛获得=净变化+实际消耗，不再次叠加配置奖励。突破清零修为另记xpReset，护体回灵与消耗分别记账；HP仅记录净变化，不能用净变化冒充总承伤。失败指令另列，不记成功资源流。完整存档回滚建立新的账本段，不把恢复快照当作收入。账本不表示事务已保存。

`npm run audit:economy`重新执行120组正常引擎路线并逐字校验版本、源码摘要、分境账本、对照/转换/战斗/失败恢复报告。它不证明完整网页飞升、全局最优策略、真人平衡或真实分钟时长，范围及剩余风险见[T10记录](../implementation/goal-1-economy-ledger.md)。


## T11：选择条件、人物事实与后学剑简

`Story.requires`仅表示前置节点已经选择（包括作别）；`Option.condition`表示开场/祖先节点实际选项必须匹配。条件只引用声明的因果祖先，文本变体互斥，不能让后来的选择改写先前事实。UI、资源来源、预览与DECIDE使用同一个条件与文本投影；不匹配的新指令在扣费前拒绝OPTION_CONDITION。每节点必须保留无条件、无资源效果的退出选项。感悟选项requireXpRoom在修为圆满时拒绝，不消耗灵材。

沈清禾：赠丹者收药叙旧；交易者另付药价；自保者付草新结信任。药庐作别者可在元婴以新的药物重新立约。裴照：山门同行/竞争/作别，对应古境不同交易与文字；古境独行者可在化神另付灵材建立护阵之约。护阵效果写在已选Option.aid中，causalAid汇总后用于真实战斗；约定与实际命中不是同一事实。四人物记录只从openingChoice和choices派生，不另存关系分，不虚构年月；收卷后不再推荐未发生的会面。

`STUDY {manual:'jinghong'}`在青云宗、筑基起可付80灵石（未平衡）研读既有惊鸿剑简，剑修终结术法同样获得既有+4，符修当前不获此伤害加成。交易开场保留提前取得的资格，不重复付费。仍使用既有core.learnedSkills，最多一个稳定ID，不新增功法槽或第十三个配装功法；当前内容允许非交易者在筑基后取得，旧M1/full版本仍按旧限制验证，禁止伪造当时不存在的后学记录。所有研读写入仍走标准身份/回执/原子事务。

新增分支成本与后学途径使content/balance均升.3；外层version2、schema2和DB3不变。精确已知full-demo.1 / full-unbalanced.1及full-demo.2 / full-unbalanced.1、.2验证后转为.3/.3，保留资源、选择、已研读资格与未决事件ID。历史上合法的选项不以新增条件追溯否定，不补收费、不补物；未决事件新确认按当前分支显示，迁移刷新run防止旧意图误提交。不存在的跨版本组合明确拒绝。


旧full1/full2的选择ID按冻结的HISTORICAL_FULL_OPTIONS校验，不能借用当前选项超集接受当时不存在的选择。该清单已与精确旧源逐项比较，full1/full2事件定义原件逐字相同。当前新引入选项必须满足不可变的前置选择；已在旧版本存在的选项保留历史合法路径，不追溯套用新门槛。关系事实中的旧选项使用中性描述，不能把曾经独行后的首次结约说成延续多年盟约。


## T12：派生生平与收卷

`getLifeRecord`返回独立`chenyuan-life-record / version1`，只从有效Game的openingChoice、choices、milestones、当前所学/配装/法宝、胜场与结束原因派生；`exportLifeText`生成本地文本，不可当作Game导入。近期journal不作为唯一依据。正文不猜测逐场战斗、物品累计收入、获得年月或跨人物时间排序；护阵许诺不冒充实际命中。旧格式的境界月可能只是载入时已达记录，统一采用“第X月已有某境界记录”，不一概写为精确突破日。飞升收卷不把占位属性当作上界寿限。

归隐与寿尽仍使用既有RETIRE/END_LIFE：归隐不推进游戏月，最后一月寿尽只消耗1月，不能在未决事件/战斗/试炼中绕过锁。普通耗时行动留出最后一月，余寿显示精确整数月；查看、导出和现实等待不推进。新增确认固定review时的commandId/runId/revision，不在确认时重新取另一个人生的身份。事务完成前不发布结束；失败可同意图重试，取消失败的收卷则丢弃该重试意图。

T12不增加Game字段、不调整游戏初值/目录/数值版本，schema2/外层2/content3/balance3/DB3继续使用。新增的是派生记录格式与展示；完整代码身份由提交与审计源码摘要绑定。历史版本经济报告保留，`audit:economy`改校验独立`docs/economy/current-report.json`，不覆写T11的.3报告。


## T13：渡劫准备查询与入场确认

`getTrialPreparation`从有效Game派生清单，`previewAction(START_TRIAL)`是资格与失败原因的唯一权威，必需资源取共享requirements/costs，不在UI复制气血阈值或材料费用。当前境界、修为、修法/合法槽位、气血、地点和空闲状态逐项列出；丹药、灵力、法宝与causalAid只给准备建议，不转为硬门槛。快照概览只陈述当前事实，不承诺战胜三关。查看/取消不写Game，前往只提交普通旅行。

页面先prepareAction固定commandId/runId/expectedRevision和预览信息，确认通过actPrepared执行；不同进度不自动重新绑定，后端同样校验。确认窗重试必须与自己的commandId匹配，不能重放之前另一行动的失败意图；取消只丢弃匹配的重试。完整START_TRIAL检查点仍由既有事务写入，不新增保存旁路或Game字段，不调整content/balance/schema/DB版本和数值。
