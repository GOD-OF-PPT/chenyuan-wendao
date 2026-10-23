# ART04 交叉静态审查

2026-10-23，独立子审查。依据0026合同，检查InventoryStage/GoodsPanel、RecoveryRitual/RecoveryPlanner与useSupplyCycle及原App查看接线；对照既有idle-preparation/stage-r3/play-flow样式。起点为root冻结的fd8fd473首版，发现问题后复核root修正的当前文件。没有构建、运行测试、打开浏览器、读取用户档或代签像素/真人验收。MarketCounter为本审查者此前负责实现，市场修缮不称独立交叉审查。

## 发现与处理

**R1：真实saving误显示等待主动续接，已静态修正。** 原RecoveryRitual第31行只有running显示clock；进入owned saving时，后继`activity.status==='running'&&!error&&!activityPausing`仍为真，导致“调息已毕·保存后回元”下又出现“等待本页主动续接，不补离线”。可复现路径为正式服丹6秒或疗养30秒后持住原写入/元数据回应，使本地runtime仍saving；不是离线或新安排。已及时通知root，当前后继条件加入`!engaged`，saving不再落入该分支；保留原running倒计时、原周期和写入。此处是代码条件推导及修后静态复核，实际持写红绿与像素归root/verify，不能写成审查者已运行。

root另提供市场source1实际像素红：结果占位越入完整说明、来源按钮被截获、SVG被后载规则压小。经明确授权，本审查者仅修MarketCounter：去真实重复文案、短真实结果与方向互斥、累计归同一状态行，按内容高度留位并精确设置SVG尺寸。当前11515B/`caf2db035251c20bddd4fd5f7b255d521ffae1fa72a35276d58c7611f1c2325e`；原失败保存。此修正仍待当前统一构建与实际几何/像素复验，不能因CSS存在就判视觉已过。

## 当前代码边界

- **14物与用途未缩减。** GoodsPanel仍从完整`C.items`取行，保留全部/灵材/丹药/突破物四分类、未来目录与每页4项；已持有物不会因境界过滤消失，选择只改pick。InventoryStage对两丹同时保留USE与SELL查看入口；主用途为USE时另有SELL，主用途为来源时两个用途仍可达。五突破物由正式`sell===null`分支保留禁售文本，无出售入口。说明使用原description、真实库存和正式单价，没有虚构持有。
- **“查看”仍是查看。** InventoryStage只emit原Action/TrackingTarget。App.act对BUY/SELL/USE/REST先进入`inspectPreparation`，只建立有限草案和导航；正式执行仍经原`startPreparation → store.startPlannedActivity`，来源仍只追踪，不暗卖/用药/旅行。Recovery保留目标100%、最多3丹/保留0与疗养余寿1默认、完整数字对话及正式quote，旅行仍先抵洞府且不自动疗养。原参数恢复/草案与已保存标记逻辑未迁移。
- **预算与错误态未放宽。** RecoveryPlanner新执行按`error&&(canRetry||syncIssue)`、available/busy/running与正式quote/move共同禁用；未清原错误或同意图。显式取消后可再新确认的原API语义保留。RecoveryRitual所有error优先failed，working为假；只读来源与选项仍可查看。没有借展示失败把Game写入当作未发生，或因预计恢复数而发奖。
- **运行/保存/短效归属。** useSupplyCycle仅显式v5及当前kind/item活动匹配；冻结runtime处于running时的nextCommand，saving不借已前移命令给另一物演出。phase/working/progress还要求engaged，不使用第二周期钟。共享useActivityPresentation仍核对人生、活动id/generation、可见/hidden/active、available/error与activityPausing；暂停请求、同id接管、换对象/人生、隐藏和销毁清短效。当前result必须来自原完整proof消费，短effect按实际类型/物品再过滤，刷新/历史/外页不能凭库存变化重演。Source审查者另审完整proof与纯例，本审查不以这段静态链路代替其实际验证。
- **尺寸有明确规则，实际像素仍待验证。** Inventory对象正文18/辅助14/说明操作48，格内18，主对象DOM入口保留；新规则用较精确选择器覆盖旧格尺寸，目录原flex/分页仍继承。Recovery正文18/辅助14/按钮至少44，选项96及决定48；新对象显式flex，原cabinet的grid不再组织新内容，体魄条与vessel图标有更精确规则。旧`.immersive-stage .recovery-decision`仍可能覆盖局部gap，几何影响须以固定桌面错误态/运行态实测；没有静态证据将其单独认定为漏洞。没有内部滚动、裁切或缩字补丁。
- **Game/安全/隐私。** 本组组件无Game赋值、库存/货币插值计时、规则/Store/Repository/DB9修改、eval/v-html或新依赖；文本经Vue正常转义，图标沿已有同源SVG。旧正式费用/周期/累计预算/存档与原13在途不在审查写入范围。没有接触用户档。

## 被审文件身份与结论

本次复核文件SHA256：

| 文件 | SHA256 |
| --- | --- |
| InventoryStage.vue | bde073a8d3dd216eb8c76fb23ed6f1a4e917ea2ee7f42aa561dde37e897fd082 |
| GoodsPanel.vue | 60c92db3041bebc0052a74bcc45b69fc42b530996552691265897b12bc6eafb7 |
| RecoveryRitual.vue | facf11f3a29e6f42d8f7f242ae2f0a21b857e6a9f1c4fe672374befe9dfbf179 |
| RecoveryPlanner.vue | 53f0a3038baf13cd5432f20315734cf1015514ccecbfb38d21d1c70fdf1b3511 |
| supply-effects.ts | 6b11c6aab3e634831854d0c1723b76916bbb26fdbccf640e4adc6e043ee72a19 |
| use-activity-effect.ts | 7945d768908d12361720bdf4afaab73f3e1479f950f0e7dbe8690ec888c548c7 |

目前静态范围没有其他具体未修代码阻断；R1修法可核对，首版及市场红不可隐去。新统一源码的相关完整UI/原子保存/真实15、6、30秒/错误态和实际文字/图形边界尚须以root最终报告确认，本报告不宣称通过。当前工程改进也不等于整体游戏感、美术、长期平衡、全部矩阵或真实用户认可；兼容与环境性能未执行。


Root交付补记（2026-10-24）：以上为审查当时原记录，保留原输入hash/未执行边界；最终source8 e5560974同一独立86/86通过，声明逐项相等/0skip-retry-flaky，三旧前提与实际59/预计37、两宿主及错误态均当前实测。8当前代表图root已逐张实际审，217/220同源继承与当前9配置/供应7另记；实现92aa57c/实际HTTP与用户只读进度见verification.json和review.md。不代作者新增像素判断或整体艺术/真人验收。
