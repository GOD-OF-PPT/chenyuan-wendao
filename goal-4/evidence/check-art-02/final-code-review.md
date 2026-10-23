# CHECK-ART-02 冻结源码代码与安全复核

2026-10-24。基线 `dc0dc97b6c8b9f9febe03e31b4588148e4906fa3`；合同为 0028。本次只读审查当前八处运行 diff、四份账本、正式仓库/共享 proof 的适用接线及实际报告。仅写本文件，没有改源码、测试、预算、存档或运行浏览器/构建/测试。审查者参与过 Risk9 的实现，本文件是另一轮只读复核，不是外部独立安全认证。

**当前八处改动未发现可定位的未修代码或安全阻断。此结论限 0028 工程范围。完整 293 UI 的本轮终态、代表像素、提交/HTTP 同源交付及用户整体游戏感仍由各自证据裁定，本文件不代签。**

## 输入身份与范围

- source1：`c5dac755a8e9aec198605eb31be33684ceecbc81b322f2f0234c233125664eea`。
- 当前 source2：`285091be48b81cc103960e0d9088ef15de90472a96ab4a5e3671b9f671d27c4d`；`build-source2.json` 的 226 runtimeSources 与当前文件逐 hash 相等，61 交付文件共 7,680,826B。这里只核本地输入；没有再次读取 HTTP 或操作用户试玩。
- source1 → source2 的 226 源中只有 FateCatalogue/LifeCatalogue/NarrativePanel 的三处 pendingError 提示不同；其余 223 源相同，尤其 Store、仓库、正式规则与全部周期 proof 相同。
- source1 保留的 174 个检查输入对当前仅 `web/e2e/check-art-02.spec.ts` 不同（C9 同步文案断言加强）；全部 native/Core 文件及支持代码相同。原保护 13 文件对 `protected13-before.json` 全部相同。

| 当前运行文件 | SHA-256 |
| --- | --- |
| web/src/ActionFeedbackStage.vue | 1b5b53e9ce98cc2c13e2bb7b9f08948daeb58e7ededb3c89a4048aba434cae8c |
| web/src/App.vue | ab412887ecbf2de0a66451f94dc306a20580aa5becae6d52289406e6fc07f662 |
| web/src/FateCatalogue.vue | 3889575449542f4b79c653a45a47ba773e15ffa5e4afef4aa7edc044577ae4d1 |
| web/src/LifeCatalogue.vue | 4c243e6f3a7d51814dee5a6966f95d5a88b7d891be04d9373eb13b30bb67f978 |
| web/src/NarrativePanel.vue | 9658dca23ab65de3d21d77833685faf3b1d4c9f4cf55bb4917315b10dc707273 |
| web/src/equipment-effects.ts | 28c3c58a677ad562593f8d23f73c186b62a1d67f80298b2ef0165e7d08b5cc14 |
| web/src/milestone-view.ts | c849797ee14366f00715ee9ab3999bcc3c293996251b4073c7cb4b504ca21022 |
| web/src/store.ts | 85546166dcb60d97311b9fe7facca056cce491cb717317c2a5f67aff37243df8 |

## 配装反馈归属

`equipment-effects.ts:51–54` 用实际 school/loadout 的规范指纹同步撤下本地配置 effect，而非对每个 Game revision 无条件清空。外页 A→B→A 的第一步即撤旧 sequence，回到 A 不会从缓存恢复旧 effect；本页之后真正新确认仍须经过原完整 transition/result/public facts 和 feedback seen/replay 守卫才能再演。完整原 `createConfigurationEchoTracker`、首次真实非重放、错对象/隐藏/错误/暂停与活动 id/generation/owner 边界均未放宽。

原显隐/active/停手与 eligibility 的重复清理合并到同一 watch。eligible 已包含 visible、document.hidden、active、available、error、activityPausing：任何一种由可用转不可用都撤 effect；已经不可用时该 effect 早已为空，不需依赖每个单独布尔再次清空。对象 key 和活动身份仍单独清理。

`ActionFeedbackStage.vue:27–28` 同样只在实际修法/槽变化或换人生时清旧全局印/actor/scene，不把学习经验、背包、普通周期 revision 变化做成泛清理，避免损伤末周期正常成果。当前配置变化会先撤旧表现，之后本次正式 observation 仍能产生自己的新表现。`mark` 到期统一调用既有 `unmark`，保留取消旧 timer、移除旧类/属性、32 项上限；删除了重复清理实现，没有删动效种类、改变时长或加入奖励逻辑。

当前没有以动画、DOM、timer 或 Map 参与 Game、费用、回执、装备或活动状态结算；共享完整 proof 默认域与显式版本准入均未改。

## 原 START 的精确确认与失败区分

`store.ts:46–48/226–233` 的本地确认 Map 只在原 operation 实际成功返回、原连接 `owns()` 仍成立之后记录 commandId 与 outcome.runId，最多保留 128 项；私有 Map 不在 Store 返回状态中，只暴露 `wasConfirmedFor(commandId,runId)` 布尔查询。后续 checkpoint CLOSED 不撤销真实已确认事实，亦没有清 error/saved/available/syncIssue 或改成新授权。

这证明的是该原请求已被正式仓库确认，不是“当前 Activity 恰好同计划所以已保存”。当前 Activity 没有 START commandId；本修没有据 plan/owner/random id 猜测原安排，也没有把 receipt replay 返回的最新 Activity 假转成原安排。原仓库仍先核精确 receipt fingerprint；回放成功可确认原请求，真正未提交或成功回复尚未收到都没有见证。

`milestone-view.ts:32` 和 App 的 life/trial/ascension fresh、原 retry 回调均在原 await 之后检查 prepared 对象仍相同，才按“无错误或该精确原请求已确认”退出旧确认。旧 callback 不会关闭新选择；不刷新 CAS、不复制命令、不修改原 retry、不代选问心/结尾/新人生。原 retry 入口的 `canRetryFor` 与 fresh 的 stale/busy/存储门槛保留。必要同类 START_TRIAL 只同步此确认退出语义，原 15 秒/检查点/门槛未变；恢复检查点这种不同写域没有借此改动。

新 native 三例的真实分支有效：原生 START 完成后通过 versionchange → 原 repo.close → abort 升级保 DB9 → checkpoint ensureOpen CLOSED；quota/丢回复没有见证，原 receipt retry 后才有；129 次真实配置验证 FIFO，已销毁 Store 的迟到原交付不向旧或替代 Store 写确认。这不是任意塞 Store 状态或拿裸 IDBDatabase.close 误称仓库 CLOSED。

三个叙事父组件当前只改提示：同步失败明确“请重新读取；已确认成果保留”；真正 canRetry 仍说明原安排重试/取消。执行门槛不变，历史错误已取消且无 pending 时不永久封锁新的明确确认。source1 的 C9 代码已退出原 prepared 窗口，但像素出现无可重试项仍说“先重试或取消”，此次三行文案修正没有把该可见问题隐去或改造成假保存。

## 实际覆盖及继承边界

以下是**读取既有报告和检查依赖**，不是本审查新执行：

- `native-coverage.json` 对 `native-full-source1.json`：24 文件，声明/实际 211，0 retry/skip/errors；211 已包括新增 3 例，不再另加 3。native 从 harness/Store/正式仓库进入，不导入本次三处叙事 SFC；这些依赖在 source1 → source2 未变，因此保留 source1 原报告，不能写成 source2 重新跑 211。
- `core-source1.log`：59 文件共 790 tests 全通过、0 fail/cancel/skip。其中全源身份配置母/子 9 已包含在 790 内。当前 `configuration-source2.log` 又实际执行 9/9；其余 781 不消费这三个 SFC，规则及检查依赖保持，故 781 继承＋当前 9 仍是 790 唯一，不是 799。
- `assets-negative-source1.log`：230/230，264.559s；当前 `assets-negative-source2.log`：230/230，163.836s，均 OK。当前四账本正向及类型/构建由主控原日志记录；本审查只核账本改动没有额外放宽。
- C8 原基线两种配置真实红及 C9 原确认红保留；当前 C9 source2 文案定向一例日志为 expected1/unexpected0。原 readonly 强制布局前提与随后“旧 fresh 确认退出、重连后明确查看原安排”补正保留在 premises，不拿改 selector 代替保存证明。
- C5 的晚 LEARN → 外页 USE、内存导出/全库/120 秒/noFX 在原 `67ed71b9` 已实际通过。本轮**没有**改 queued synchronize 或写时序，不能把该静态风险说成已被 Store 重构修复；结论限受测组合。更广泛交付时序仍由原恢复矩阵责任承接。
- 原声明 283＋新增 10 构成当前 293。审查时主控正在 source2 执行完整轮；本文件不把 source1 focused、定向一例或历史叶子拼成已经完成的本轮全绿，也不重复用循环次数增加业务覆盖。

## 安全、预算与残余责任

八处 diff 不改正式引擎、FullSaveRepository、DB9、价格、周期、命令/CAS、原子事务或公开脱敏 observation。没有新增网络/依赖/动态执行/HTML 注入通道，没有把确认 Map 写入 Game、存档、公开导出或回执；本地布尔查询也不是远端防作弊保证。原 commandId/runId 仅在既有受控写链中使用。原回执、原 failedIntent 和已提交成果读取失败语义保持。

四份 ledger 相对基线只有真实 bytes/hash 更新，剥离这些字段后全部内容相同：旧 cap、bindings、scope 与 userAcceptance=false 不变。当前 action-feedback 33992/34000B、ART03 44943/45000B、U7 15860/30000B、story 47931/48000B；没有新位图/字体、模块搬家、缩字、裁切或删正文能力。

当前仍待本轮完整 UI 终态、必要像素与发布身份收尾；本审查没有看图或点击用户存档。原整体工作台感/美术负面验收、长期平衡、剩余 ART06、完整矩阵、性能、兼容最后、干净候选包、最大评审与真人复验均不在此关闭。此前 native/CDP 原因 unknown、原失败/中断和所有旧未执行义务继续保留。
