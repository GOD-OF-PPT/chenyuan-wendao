# B1目标数量：真实toggle交付红绿

本证据承接 [原source5只读诊断](b1-source5-diagnosis.md)，落实0032已先登记的窄修。只执行新K14原源红例、一次build，以及原B1＋K14同源两例绿；没有全UI、兼容／性能或用户档操作。原source5 full×1失败和原例单独3.6秒绿保持，后者从未当作根因修复。

## 实际红

[k14-source6-red-report](../../../artifacts/goal-4/check-matrix-01/k14-source6-red-report.json) 原GoalPanel `fd51c86f…`／source6 `b8524269…`，独立K14实际exit1、×3期望收到×1。运行前快照08:01:20.335Z早于UI08:01:39.266Z，终态后675项精确相同，原60/8/15不变。

控制包住**实际goal-management上注册的原toggle监听**：真实键盘展开，持有原生Event对象而不调用其监听；实际fill3后，以原this直接调用原监听，Event仍`isTrusted=true/sourceTrusted=true/sameEvent=true/sameTarget=true`，target为真实goal-management、open=true。没有new Event／dispatchEvent，也没有假节点、Game／Store／存储注入或推钟来制造状态。红附件记录 `typed3 → afterDelivery1 → afterBlur1`，完整Game／Activity／原生全库在只读阶段未变。

## 最小修改

GoalPanel真实summary仅增加 `@click.prevent="managerOpen=!managerOpen"`，其余`:open`、原`@toggle`、数量`@change`／校验／默认1／追踪保存语义未改。模型在显示输入前同步更新，晚到的原toggle写回相同open值，不再因旧状态的额外render把待提交3回填1。键盘Enter／Space仍沿原生click执行。

GoalPanel18217→18259B，SHA `7a99f25c92348175866ef8ef6f0ff02f0b0ebddcb944f89d1d7774e1716a4c77`，原19000B cap不涨。仅真实whole-file记录`cultivation-objects.json.goalPanel`更新bytes/hash；immersive-ui只保GoalPanel的ProgressTrack binding而没有该源码identity行，未伪造行、未改变其字节／预算。

Build命令实际exit0。source7 `1451a50fd963676adba12396c67985f81ae74bb71d648f1841443182d39e5815`，236运行源、62文件／7,814,366B，Node24.19.0。[build-source7.json](../../../artifacts/goal-4/check-matrix-01/build-source7.json) SHA `17928b3ab65d7d223432669d06df414f569f6b9e46aba652b5867d6b4e07680f`。Build前后只有生成build-report/build.json变化，不能把生成输出重写当unexpectedsource drift；真正UI pre快照在build结束后重新实际保存。

## 实际绿与边界

[k14-b1-source7-report](../../../artifacts/goal-4/check-matrix-01/k14-b1-source7-report.json) **2 passed／0skip／0retry／0flaky**：新K14 5903ms，原B1 6346ms，总13384.405ms。原B1文件SHA仍`5a26a34b…`；新K14的键盘文件红绿都为`49d60985…`，没有通过改断言或等待summary吞race。

K14相同真实Event与target全部硬断言继续通过，绿附件为 `typed3 → afterDelivery3 → afterBlur3`，×3、本地偏好quantity3、reload与完整Game／Activity／全部object stores只读成立。原B1保持全部原约束，包括目标跨刷新及分别确认的新人生重置。监听与EventTarget原型在try/finally恢复；reload新文档的隔离包装也在finally恢复，未给其他context留下原型改动。

运行前08:07:35.080Z已保存完整675输入，早于UI08:07:53.009Z；终态后08:08:41.519Z再次675全部相同。红→绿runtime只GoalPanel改变，冻结输入只GoalPanel、真实ledger身份和build报告三项改变；无规则／Store／DB／周期／费用／预算改变。

根因范围现在有“自然失败trace＋同Event受控red＋只改summary后同测试green”的明确链，限此旧controlled-details／change输入丢失路径。它不宣称所有可能草案重渲染、A9 host慢因或native／CDP历史未知都已解决。

UI独占已交回主控，不再测试或改keyboard／生产。新K14只增加一个唯一声明，当前完整预期415／43文件，由主控重新freeze、补当前全局检查并实际完整执行；旧414预审保历史。本两例绿不代full415、整体TA／游戏感／长期节奏或HUMAN。
