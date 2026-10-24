# B1 source5 输入丢失的只读诊断

本次只读完整B1 trace中的调用记录／DOM snapshots、当前源码和原full／leaf报告，只新增本文；未运行UI或测试、未改生产／断言／675冻结输入、未加载PNG／图片。trace的增量节点依据本地Playwright snapshotter的后序nodeCounter与`[[snapshotDelta,nodeIndex]]`还原，不能把value属性和实际DOM值混为一谈。

## 已发生的事实

source5 runtime `2ef1fcd1532f6815bdd5402cff363d9a8f24dedd6da115c65dbdd3c348c4b05d`。原full414终态411pass＋3failed/unexpected，675前后相同；B1在`matrix-ui-boundaries.spec.ts:102`首个目标标题断言实际×1而预期×3。它发生在reload／restart前，不是新人生重置或读取旧偏好导致。

原B1流程：导入合法qi洞府Game→公开目标页→选择`item:herb`（正式默认quantity1）→selectGoal helper先收起管理→target helper立即重开→fill目标数量3→blur→收起→断言×3。全程尚无新Game行动。

| 原trace调用／时序 | DETAILS实际open | 管理SUMMARY文字／响应式状态 | 目标数量实际DOM property | 其它事实 |
| --- | --- | --- | --- | --- |
| after call@29913，先收起 | false | 完成编辑，返回目标（仍滞后） | 1 | 原helper刚选herb默认1 |
| after call@29919，重开 | true | 更换追踪目标（仍对应managerOpen=false） | 1 | GoalBoard仍挂载，标题×1 |
| before／after call@29921，fill | true | 更换追踪目标 | before1 → **after3** | fill实际成功；`__playwright_value_="3"`，绑定attribute `value="1"`仍为未提交props |
| after call@29923，blur | true | **完成编辑，返回目标**（managerOpen现在true） | **1** | GoalBoard随managerOpen=true卸载，quantity3已被覆盖 |
| after call@29925，收起 | false | 更换追踪目标 | 1 | 原断言12次读取均为“筹备凝气草 ×1” |

真实底层调用时间：click重开结束1373004.050ms；fill从1373014.254至1373033.783ms；blur从1373042.592至1373066.297ms；最后收起结束1373231.974ms。没有fill错误／超时，3是在填入之后、提交change之前的面板响应式更新窗口丢失。上表来自DOM property和原文，不是截图目测。

此full失败停在首个`.toHaveText`，同一行随后完整DB断言以及偏好、reload、新人生后续断言均未执行，不能把它们记作此失败调用已经通过。单独的 [b1-source5-report](../../../artifacts/goal-4/check-matrix-01/b1-source5-report.json)确实同源原例passed/retry0（用例3567ms、总9876.510ms，主控核675exact），那一次才完整走完原约束；它不证明丢值机理已经修好或“只是flaky”。

## 源码支持的具体机理

`GoalPanel.vue:103`把原生details同时交给`:open="managerOpen"`和延后投递的`@toggle="managerOpen=event.target.open"`。原生click已改变open，但toggle回填尚未进入Vue，因此snapshot里能真实出现open=true、标题仍“更换追踪目标”、GoalBoard仍挂载。

`:111`目标数量只有`:value="target.quantity" @change="quantityChange"`，没有保住尚未change提交的本地输入草案。用户已经填3，但props.target.quantity还是1是正常的待提交状态；在迟到toggle改变managerOpen引起重渲染时，该绑定会把实际input重新设回1。之后blur无法提交已经丢掉的3，正式追踪仍为1。

这条解释同时符合“SUMMARY从closed文案变open文案／GoalBoard卸载”和“property3变1”的同一snapshot区间。**已实证输入丢失及状态更新窗口，具体native toggle任务的投递／change事件全序尚无被动事件探针，因此严格根因仍应先用独立控制锁红，不把推导写成已经直接记录了每个JS事件。** 但它是明确可达的旧输入状态机缺口，不应简单通过给helper加等待summary文字来隐藏。

GoalPanel、use-tracking、support.selectGoal与B1测试在本CHECK相对HEAD均无diff。当前源码hash：GoalPanel `fd51c86f2d79e76ce20dd92303facd91a742ba782b1d938a8d5ff1bbc59d8790`；use-tracking `ef1ff1a6edd1f441441dfe6743696d8c7239e6b9f0be1c22e649049038501c86`；B1 spec `5a26a34b6626d012ab0a23059374831e58caa645aa153059c22a4a095bcf6a73`；support `e8d4a73c75b84343fcdb2cfb7656dc93dd8ee65006a8a075b6a0f9ffad74370e`。

本例只有IMPORT与只读目标操作，没有本页fresh CREATE／CHOOSE／入劫／END确认，故新增armStageFocus/confirmMilestone包装不在受理路径。新取消器只是撤空的UI请求并更新导航代次；它不写tracking quantity。trace未录activeElement事件全序，不能声称凭此捕获了所有focus转移，但所见原始值3→1、原生／响应式open脱节已有更直接的旧GoalPanel机理，当前没有证据把它归为新App阶段焦点抢夺。

`useTracking.select`只在emit后验证并写本地偏好，不写Game／Activity／DB。此失败没有到达读取localStorage的原断言，不能伪造其原值；也无证据说存档／Game数据损坏。

## 建议的最小有据修复顺序（尚未实施）

1. 主控先补本轮合同的实际缺口、预算和验收，再在原source5锁定可重复的**UI toggle交付**反控制：在真实目标管理details的native toggle到来时暂缓该消费者，公开重开后实际填3，恢复延后的toggle处理，再blur／收起，继续硬核×3、本地偏好quantity3、reload保持、新人生重置与全GameDB只读。若用重新dispatch交付，明确原捕获native事件和synthetic release的isTrusted身份，不冒DB故障；不sleep／改时限／加物／改Game。此处只提建议，没有插入监听或执行控制。
2. 窄修优先候选：summary通过`@click.prevent`同步切换managerOpen，open只由响应式`:open`驱动；原生键盘Enter／Space仍产生同一click。这样原生toggle稍后回到的是已经相同的值，不再在可编辑输入出现后用滞后的managerOpen触发额外重渲染。保原change校验、非法0／1.5回退、本地偏好／人生边界、全部18/14/44与目录能力。
3. 若实证还有其它重渲染也能覆盖编辑，则使用局部quantity字符串草案（input更新草案、change才正式parse/emit，按真正目标／人生改变校正）；不要把任意render回填props当编辑内容。这个方案改动更大，须按实际红再选，不能预防性扩大范围。
4. 原B1／B2全部断言保留；不能只在测试fill前等summary、改成目标×1、跳过blur或删掉偏好／GameDB责任来取得绿。修后先控制与原例同源真实检查，再由主控决定必要完整回归／新source身份。

此诊断不把同源叶子通过当源5完整绿。原full三红、A9慢因unknown和MF1另人调查保持；任何后续source6或前提补正须保原件和原强断言。当前不做414覆盖合成、最终review或真人／整体TA签字。

## 原件身份

- Full B1 trace：`artifacts/goal-4/check-matrix-01/full-source5-results/matrix-ui-boundaries-M03-B-b3da7-ithout-readonly-Game-writes-chromium/trace.zip`，SHA256 `f58bb28cbf1715035d468dfe9a57378a1bad60236b4c363ac45772800a566747`。
- Full raw：`artifacts/goal-4/check-matrix-01/full-source5-report.json`，SHA256 `bc879a3431ceec969f8d1773758c83e9c0ffd0925bf900a88b826de9d6e32d51`。
- B1原例叶子：`artifacts/goal-4/check-matrix-01/b1-source5-report.json`，SHA256 `ece359b6959e235e26766c63ae1650253525a3ee7ee91198f8ad0ec378aa2733`。
