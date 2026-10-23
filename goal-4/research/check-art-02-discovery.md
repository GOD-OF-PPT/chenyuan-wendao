# CHECK-ART-02：跨对象生命周期只读调查

2026-10-24。基线 `dc0dc97`，已交付运行源 `67ed71b9985f001fe959bb9932c7a2235cf94db58363a6226e9645e87fc9e4e5`。本次完整回读根 AGENTS、Goal4 input/plan/tasks 与 0025/0026/0027，追踪 ART03 配置/周期、ART04 补给与 ART05 叙事宿主以及 App 导航；未改生产、测试、存档或旧预算，未执行 UI/构建/测试，未接触用户 56884 存档。下文均是**静态风险与建议复现**，不是已经取得的浏览器红例。

## 1. 完整变化证明仍缺“晚交付之后当前视图归属”的组合验证

**高优先级，静态存在可疑路径，需真实组合红例裁定。**

`equipment-effects.ts:51–55` 在 Game 变化时仅保存上一 Game 供证明；清短演出的依赖包含对象 key、显隐、活动 id/generation/owner、停手，却不包含 `syncEpoch` 或后续 Game 变化。`LoadoutConstellation.vue:14` 的 key 只是人生和 mode；法宝/玉简也只是人生和所选物。

最小路径一：当前无 Activity，本页明确配置成功，1400ms 的槽位保存效果尚在；另一个已经打开的页面在同一人生明确应用另一项配置。正式 `configure` 可合法执行，Activity 仍为 null。本页 BC 刷新会更换真实 Game、清 lastResult，但 `null → null` 不触发活动身份清理，`loadedObservation` 也只被 tracker 拒绝，不撤去现存 effect。因此旧槽位“已保存”/旧玉简短效果可能继续贴在外页新配置后的实际槽上。这里不是新发奖或配置重复，而是旧演出归属于新对象的风险。

路径二进一步覆盖 ART03/04/05：本页的真实周期或即时配置事务已经提交，仅原生完成回调的交付被持有；另一页读取这个真实新 snapshot 后明确接管同 id 活动或配置；本页 busy 时收到真实 BC。`store.ts:186–191` 立即增加 `syncEpoch`、排队刷新，但 `performWrite:223–245` 仍先接收旧操作 outcome 并 emit，`finally:263–267` 才启动排队读取。当前完整 Game/result/Activity proof 能证明旧 transition 正确，不能单独证明 BC 之后仍是本页当前对象。共享 hook 没有同步代次见证，配置 hook 也没有这一边界，故晚到的旧本页成果可能先短演出，再由新 snapshot 清理。叙事子对象的同 render claim 防止晚导航补演，但不能替代宿主尚未撤销的旧周期见证。

建议实际验证：

- 两页先完成各自初始化；只持有**原生已经完成**事务的交付，不伪造 outcome/command/Game。
- 外页基于真实已提交 snapshot 明确接管/配置，保留真实 BC 到达与本页 `syncEpoch` 增加的证据，再释放原交付。
- 当前完整 Game/Activity/全库最终等于外页合法状态；旧命令回执仍仅一条，旧本页短演出在失去归属后为零，不借新 owner/新槽/新回应再演。
- 不把任意同步消息永久等同于“外页已写”，也不能仅因普通同活动周期 revision 改变就销毁下一周期的有效见证。修复若必要，应限定在只读演出归属，保留正常首次真实提交反馈与原意图重试。

已有覆盖：ART03-A8 配置 CAS、A10/A11 接管与历史；ART04-A10/A11 停手/接管/隐藏；ART05-A8/A11 预选/接管/角色；CHECK-ART-01-A3/A7 原生晚只读交付。它们分别有证，不等于新三玩法的“本页提交晚交付＋外页已更新＋原生 BC＋同 run/无活动配置”组合已经通过。当前调查没有重跑这些历史报告。

## 2. 有限安排已受理而后续连接失败时，原确认可能仍显示“尚未安排/请重选”

**中优先级，展示与恢复风险；没有发现可绕过 CAS 重复发奖的依据。**

START ActivityOutcome 没有 ActionResult，Game revision 可以不变，Activity CAS 已变化。`store.ts:225–243` 已把受理成功的 Activity 写入本页、清掉 pending 并标记已保存，再核对检查点；若后续实际连接关闭，`checkpointInfo:119/124` 的 `STORAGE_CLOSED` 会升级同步失败，保留已确认状态但 `canRetry=false`。`startPreparedMilestone:371–375` 因 error 不开启本页周期。

`milestone-view.ts:29` 的 confirm 只在无 error 时关确认；原 review 仍是 `prepared`，没有改成已保存 Activity 的只读回看。`MilestoneReview.vue` 因此可继续写“已选内容 · 尚未安排”，并因 Activity CAS 与原确认不同而给出“进度或活动已变化，请取消后重新选择”。App 的 `confirmEnd` 与 `confirmAscension` 同样只以 error 判是否关闭。相比之下 `confirmConfiguration` 专门识别已确认配置结果，避免把 post-commit sync 问题当作未提交。

建议实际验证：在独立测试库中通过真实 START 保存一次拜访或收卷安排；持有原生检查点读取交付，再关闭实际受测连接/使用已有 lifecycle 故障接缝，使**后续**读取成为 CLOSED。不能拿普通 checkpoint abort 代替 CLOSED，因为普通可选读取失败只进入 warning。

关键断言：受理回执唯一、Activity plan/id/命令保持，Game 尚未产生周期成果；界面准确区分“安排已保存，当前同步待核对”与未受理，不诱导重新授权；重连不自动结算/代选/补演，原保存安排仍可只读查看并由玩家明确继续。不要为演出证明给 START 伪造 ActionResult，也不把已确认读取失败重新变成可执行旧 START 的业务重试。

已有覆盖：ART05-A14 是**确认之前**的 BC snapshot abort；A9 是安排真正未提交的 quota；A10 是周期未提交后首次真实重试。CHECK-ART-01-A4 是炼丹成果已提交后排队 snapshot abort。它们不等同于这个“有限安排已受理＋原确认仍开着＋后续连接关闭”组合。

## 不应静态误报的路径与保留的检查义务

根提出的“已打开配置比较后 BC 同步失败仍能 fresh 确认”目前不能仅凭缺少 `pendingStoryError` 判成可执行漏洞：`ConfigurationDialog` 已禁 `!available`，`applyConfiguration` 也拒绝 `!available`，而 `synchronizationFailed` 必置 `available=false`。局部 `configurationError` 没有实时接公共 error、fresh handler 没有显式 pending 门槛，属于一致性待核；要证明可执行必须先构造 `canRetry=true && available=true` 与旧比较同时存在的合法入口，不能直接注入 Store 状态。

原回执重试应另保留跨项组合：配置原提交丢回复后，同 run 的外页明确活动/配置取得更新状态，再点原意图 retry。`full-persistence.ts:643–646` receipt 优先返回**最新当前**状态和原 result；不得重新装备、撤掉外页活动或演旧奖励。新人生则 `configure:628` 明确 RUN_MISMATCH，不能要求旧 run 配置回执对新人生成功。暂停中切页/新人生原 intent/CAS 仍应检查，但本次静态阅读未发现能据此宣称的独立新漏洞，不把待覆盖组合冒称已修。

## 当前输入指纹

| 文件 | SHA-256 |
| --- | --- |
| web/src/equipment-effects.ts | 1a521bff38ab41a79ae1841ea534acb11dd6308daf7e101cce8e16c4b800e161 |
| web/src/use-activity-effect.ts | ede24a7b9f28034f6e1762786a89ad2db9c0537f351f632a0d94b62d4bdad3ff |
| web/src/narrative-effects.ts | 4e199ac596e33c89e3ab3f44a35d8c8fa56a11f09de7178f60210b114ee3905c |
| web/src/supply-effects.ts | 6b11c6aab3e634831854d0c1723b76916bbb26fdbccf640e4adc6e043ee72a19 |
| web/src/App.vue | 91391dd25e79e6091ae365d7abf3d59ccce44b6d5eb77e623eef05b1c5bcb391 |
| web/src/store.ts | 313c1a04a9f307e2e98e0dbed98fa2b3777670bf3255d8f8623ff7224effc056 |
| web/src/milestone-view.ts | 5fba4c0ecc689658539f56384cf69348208a2eb7444c7195a6d81287c402be92 |
| web/src/ConfigurationDialog.vue | 55bb14f266e4162bb0a75f5afdc70ce4a24a0344cb59d971d96a95b12e9a98ce |

研究、静态风险、真实红绿、像素、工程交付和整体用户验收分别记录。本次没有新增已通过案例/矩阵计数，也没有覆盖或推翻原用户对整体游戏感与美术的负面反馈。

## 0028 开工后：原生 CLOSED 接缝与最小修法备忘（仍未执行）

已回读真实合同 `docs/decisions/0028-art-02-cross-check-contract.md`。QA 独占新增组合 spec 和浏览器；本段只补只读设计，不抢写源码/测试。

### CLOSED 必须经过真实仓库生命周期

`FullSaveRepository` 构造器只把 `db.onversionchange` 接到 `repo.close()`；`ensureOpen()` 只检查私有 `closed`。裸 `primaryDB.close()` **不会**设置仓库私有标记。后续 native transaction 的 InvalidStateError 会被 `storageFailure` 映为 STORAGE_ABORTED，`checkpointInfo` 因而只产生可选读取 warning，不能把它称作已复现 CLOSED。

建议复用原生 checkpoint `tx.oncomplete` 交付持有：先确认真实 START transaction/receipt 已完成，再持有真实 checkpoint readonly transaction 完成回调；在**独立测试库**执行 `indexedDB.open(name, oldVersion + 1)`，让浏览器真正派发 versionchange、原仓库 handler 调用 `repo.close()`；`onupgradeneeded` 立即 abort 升级事务，并等待 request 的 AbortError，之后才释放原 checkpoint 回调。此时已完成的读取依然返回原值，但 await 之后的 `source.ensureOpen()` 真实得到 STORAGE_CLOSED。必须保留真实事件、原 handler 被调用、库版本仍 9、所有原记录完全相同的证据；关闭其它测试辅助连接以免 blocked。不对用户库执行。

如果测试改为直接调用捕获的原 onversionchange handler，虽能到达真实 repo.close 分支，也只能称 controlled lifecycle 接缝，不能冒称浏览器原生 versionchange。若只是 native readonly abort，则按 warning 分支验证，不为造红改变异常分类。上述接缝截至本段写入尚未实跑，真正结果以 QA 原始报告为准。

### 已受理 START 的证明不可从同计划猜测

`createActivity` 的 START `commandId` 只参与输入验证；实际 activity id 是仓库生成的随机 UUID，nextCommand 是 `cycle:<activity.id>:...`。Activity 本身没有保存 START commandId。相同 plan/owner/originGame/费用都不足以证明当前 Activity 来自原确认，不能据此把 prepared review 标成“已保存”。原 START receipt 则包含完整 mutation/plan/fingerprint，正式仓库只在 native commit 后返回，并对重放严格核原 fingerprint。

若真实红成立，最低风险显示方案是：在原仓库 operation 已成功返回、Store 的原连接归属仍成立的 `confirmed` 分支，留**本地只读确认见证**，至少绑定本次 commandId/runId；确认/原重试 await 返回后，只凭该精确见证认定“原意图已被正式仓库确认”并关闭 prepared 确认，继续保留全局同步待核对。它不表示当前 Activity 仍是原安排，更不能变成奖励或新授权，不能进入 Game/DB/公共记录或借用旧 lastResult。

若产品选择把确认转为原安排只读，则必须持有这次正式 START 返回的完整 activity/随机 id，核对当前实际归属后才可这样展示；receipt replay 返回的是**当前最新** Activity，可能已属于外页/后续安排，不能拿最新 plan 相同就冒认原安排。真正 quota/丢回复、尚未收到正式 outcome 时没有确认见证，原 command retry 继续保留；已确认之后的检查点失败不是重新执行 START 的理由。

### 同 v5 晚交付：表现归属与 Store await 分开裁定

`store.performWrite` 接收实际 outcome 后先发布 Game/Activity/result；本页 busy 期间原生 BC 仅排队；`finally` 的 `synchronize()` 当前为 fire-and-forget。因此除了短演出归属，调用者可能在排队读取前继续 `beginActivityRuntime()`、导出内存 Game 或读取旧安排。建议 A5 必须同时核真实 IDB 和页面可见导出的完整内存 Game，不能只看最终 DB 就认定没有回退。

若 A5 实际锁红，Store 最小候选是让原写 Promise 等待**已经排队**的 refresh，继续复用 `refresh`、`synchronizationFailed`、连接/read 序归属，完成核对后才让外层起下一钟；不改变原 confirmed/receipt/费用/周期、不得将已提交读取失败改为未提交重试。是否还须在发布前核最新 snapshot，应由实际红的内存与绘制顺序决定，不预防性重构。共享演出必须另证明同步代次变化后的当前对象归属，不能只依赖后来刷新把已经闪出的旧光清掉。必要源改后真实 native 回归应覆盖原丢回复 retry、排队读 abort、停手 await、销毁/新连接及新人生。
